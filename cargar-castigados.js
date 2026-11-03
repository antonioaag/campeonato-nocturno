/**
 * Carga el informe de castigos de la asociación (el Excel que lleva el
 * comité de disciplina) en el registro de castigados.
 *
 *   node cargar-castigados.js "Informe_castigos.xlsx"            simula, no escribe
 *   node cargar-castigados.js "Informe_castigos.xlsx" --aplicar  escribe
 *
 * Usa la base que apunte el .env (¡producción!). El Excel no se versiona:
 * trae RUT. Columnas esperadas en la primera fila: RUT, NOMBRE, CLUB, SERIE,
 * ARTICULO, SANCION, FECHA INICIO CASTIGO, FECHA CAMP CASTIGO, CUMPLIO
 * CASTIGO, PAGO CASTIGO, OBSERVACION. Las filas sin nombre o sin sanción,
 * y las notas al pie (celdas combinadas), se saltan.
 *
 * - Volver a correrlo no duplica: un castigo con el mismo nombre, fecha de
 *   inicio y sanción ya cargado se salta.
 * - PAGO CASTIGO "No" = multa pendiente, "Sí" = pagada, vacío = sin multa.
 * - CUMPLIO CASTIGO "Sí" se respeta como cumplido; "No" no se fuerza: lo
 *   calcula el sistema, que es el punto de llevar el registro acá.
 * - Un castigo en fechas anterior a los datos del sistema no puede contarse
 *   solo: el informe lo avisa para completar "fechas ya cumplidas".
 */
require('dotenv').config();
const ExcelJS = require('exceljs');
const db = require('./server/db');
const { esRutValido, formatearRut } = require('./server/rut');
const { parsearSancion, normalizarSerie, diasDeCompetencia, evaluar } = require('./server/castigados');

// Nombres de club como los escribe el informe -> como están en el sistema.
const CLUBES = { 'JUVENTUD OVALLE': 'J. OVALLE', 'J OVALLE': 'J. OVALLE' };
const club = t => { const u = String(t || '').trim().toUpperCase().replace(/\s+/g, ' '); return CLUBES[u] || u; };
const texto = v => (v === null || v === undefined ? '' : (typeof v === 'object' && v.richText ? v.richText.map(r => r.text).join('') : String(v))).trim();
const siNo = v => { const t = texto(v).toLowerCase(); return t.startsWith('s') ? 'si' : (t.startsWith('n') ? 'no' : ''); };

function fechaIso(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = texto(v).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

async function main() {
  const archivo = process.argv[2];
  const aplicar = process.argv.includes('--aplicar');
  if (!archivo) throw new Error('Falta el archivo: node cargar-castigados.js "Informe.xlsx" [--aplicar]');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  const ws = wb.worksheets[0];

  const cab = {};
  ws.getRow(1).eachCell((c, i) => { cab[texto(c.value).toUpperCase()] = i; });
  for (const col of ['NOMBRE', 'CLUB', 'SANCION', 'FECHA INICIO CASTIGO']) {
    if (!cab[col]) throw new Error(`No encuentro la columna "${col}" en la primera fila`);
  }
  const celda = (fila, col) => (cab[col] ? fila.getCell(cab[col]).value : null);

  await db.init();
  const dias = await diasDeCompetencia();
  const primerDia = dias.slice().sort()[0];
  console.log(`${aplicar ? 'CARGANDO' : 'SIMULACIÓN (usa --aplicar para guardar)'}: ${archivo}\n`);

  let nuevos = 0, repetidos = 0;
  const avisos = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const f = ws.getRow(r);
    // Las notas al pie van en celdas combinadas: no son castigos.
    if (f.getCell(cab.NOMBRE).isMerged || f.getCell(cab.SANCION).isMerged) continue;
    const nombre = texto(celda(f, 'NOMBRE'));
    const sancion = texto(celda(f, 'SANCION'));
    const inicio = fechaIso(celda(f, 'FECHA INICIO CASTIGO'));
    if (!nombre || !sancion) continue;
    if (!inicio) { avisos.push(`Fila ${r} (${nombre}): sin fecha de inicio, no se carga`); continue; }

    const rutTexto = texto(celda(f, 'RUT'));
    const rut = rutTexto && esRutValido(rutTexto) ? formatearRut(rutTexto) : (rutTexto || null);
    if (rutTexto && !esRutValido(rutTexto)) avisos.push(`Fila ${r} (${nombre}): RUT "${rutTexto}" no es válido, se guarda tal cual`);
    const pago = siNo(celda(f, 'PAGO CASTIGO'));
    const c = {
      rut, nombre, club: club(celda(f, 'CLUB')), serie: normalizarSerie(texto(celda(f, 'SERIE'))),
      articulo: texto(celda(f, 'ARTICULO')) || null, sancion, ...parsearSancion(sancion), fecha_inicio: inicio,
      origen: texto(celda(f, 'FECHA CAMP CASTIGO')) || null, fechas_previas: 0,
      multa: pago === 'no' ? 'pendiente' : (pago === 'si' ? 'pagada' : 'no_aplica'),
      estado_manual: siNo(celda(f, 'CUMPLIO CASTIGO')) === 'si' ? 'cumplido' : null,
      observacion: texto(celda(f, 'OBSERVACION')) || null,
    };

    const ya = await db.get('SELECT id FROM castigados WHERE lower(nombre) = lower(?) AND fecha_inicio = ? AND sancion = ?', [c.nombre, c.fecha_inicio, c.sancion]);
    const ev = evaluar(c, dias);
    console.log(`${ya ? '= ya estaba' : '+ nuevo   '}  ${c.nombre.padEnd(28)} ${c.club.padEnd(14)} ${String(c.serie || '').padEnd(8)} ${c.sancion.padEnd(15)} desde ${c.fecha_inicio}  → ${ev.estado === 'cumplido' ? 'cumplido' : ev.estado === 'falta_pago' ? 'cumplido, falta multa' : 'VIGENTE'} (${ev.avance})`);
    if (c.tipo === 'otro') avisos.push(`Fila ${r} (${nombre}): no entiendo la sanción "${sancion}"; queda vigente hasta que se marque cumplida`);
    if (c.tipo === 'fechas' && (!primerDia || c.fecha_inicio < primerDia)) {
      avisos.push(`Fila ${r} (${nombre}): ${sancion} desde ${c.fecha_inicio}, antes de los partidos del sistema; completar "fechas ya cumplidas"`);
    }
    if (ya) { repetidos++; continue; }
    nuevos++;
    if (aplicar) {
      await db.run(`
        INSERT INTO castigados (rut, nombre, club, serie, articulo, sancion, tipo, cantidad, fecha_inicio, origen, fechas_previas, multa, estado_manual, observacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [c.rut, c.nombre, c.club, c.serie, c.articulo, c.sancion, c.tipo, c.cantidad, c.fecha_inicio, c.origen, c.fechas_previas, c.multa, c.estado_manual, c.observacion]);
    }
  }
  console.log(`\n${nuevos} nuevos, ${repetidos} ya estaban.${aplicar ? ' ✅ Guardado.' : ''}`);
  if (avisos.length) console.log(`\nPara revisar:\n- ${avisos.join('\n- ')}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
