/**
 * Informe en Excel de los jugadores inscritos en el campeonato activo, para
 * que la asociación revise inscripciones dudosas:
 *
 *   node informe-jugadores.js
 *
 * Solo lee la base (la que apunte el .env: producción). El Excel queda en
 * informes/, que no se versiona porque trae RUT.
 *
 * Hojas:
 * - Resumen: jugadores por club y serie, y cuántos casos hay de cada tipo.
 * - Otro club: el mismo documento inscrito en dos o más clubes.
 * - Otra serie: el mismo documento en dos series del mismo club (puede estar
 *   bien: un juvenil que también juega en adultos; se informa para decidir).
 * - Mismo nombre: igual nombre con distinto documento (puede ser otra
 *   persona, o un RUT mal escrito en una de las listas).
 * - RUT inválido: el dígito verificador no cuadra. Pasaportes y documentos
 *   extranjeros NO cuentan como inválidos (acuerdo de la asociación).
 * - Extranjeros: pasaportes y documentos extranjeros, solo para conocimiento.
 * - A revisar: lo que la carga dejó marcado (edad fuera de serie, fecha
 *   ilegible, notas de la transcripción).
 * - Club sancionado: si hay registros en data/listas/*-registro.json, sus
 *   jugadores que aparecen inscritos en otro club (ANFA art. 203).
 * - Todos: la lista completa.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const db = require('./server/db');
const { esRutValido, esDocumentoExtranjero, claveDocumento, limpiarRut } = require('./server/rut');

const SERIES = { SUB13: 'Sub-13', SUB15: 'Sub-15', SUB17: 'Sub-17', SENIOR: 'Seniors', SEGUNDA_ADULTO: 'Segunda', PRIMERA_ADULTO: 'Primera', ADULTO: 'Adulto' };
const ORDEN = Object.keys(SERIES);
const MORADO = 'FF3D1656', ROJO = 'FFFDE2E2', AMARILLO = 'FFFFF2CC', GRIS = 'FFF2F2F2';
const sinTildes = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
const fechaCl = iso => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : (iso || ''));

// Dígito verificador que correspondería: ayuda a ver si fue un error de tipeo
// en el dígito o si el número entero está mal.
function dvEsperado(rut) {
  const cuerpo = limpiarRut(rut).slice(0, -1);
  if (!/^\d{7,8}$/.test(cuerpo)) return '';
  let suma = 0, m = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (suma % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}

function hoja(wb, nombre, titulo, columnas, filas, { relleno, nota } = {}) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: nota ? 3 : 2 }] });
  ws.mergeCells(1, 1, 1, columnas.length);
  ws.getCell(1, 1).value = `${titulo} (${filas.length})`;
  ws.getCell(1, 1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MORADO } };
  let fila = 2;
  if (nota) {
    ws.mergeCells(2, 1, 2, columnas.length);
    ws.getCell(2, 1).value = nota;
    ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF555555' } };
    ws.getCell(2, 1).alignment = { wrapText: true };
    ws.getRow(2).height = 30;
    fila = 3;
  }
  ws.getRow(fila).values = columnas.map(c => c[0]);
  ws.getRow(fila).font = { bold: true };
  ws.getRow(fila).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6D9F0' } }; });
  columnas.forEach((c, i) => { ws.getColumn(i + 1).width = c[1]; });
  filas.forEach((valores, i) => {
    const r = ws.getRow(fila + 1 + i);
    r.values = valores;
    const color = relleno ? relleno(valores, i) : (i % 2 ? GRIS : null);
    if (color) r.eachCell({ includeEmpty: true }, c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }; });
  });
  if (!filas.length) ws.getRow(fila + 1).values = ['Sin casos.'];
  return ws;
}

async function main() {
  await db.init();
  const campeonato = await db.get("SELECT id, nombre FROM campeonatos WHERE estado = 'activo' ORDER BY id DESC LIMIT 1");
  if (!campeonato) throw new Error('No hay un campeonato activo');
  const jugadores = await db.all(`
    SELECT j.id, j.nombre, j.rut, j.fecha_nacimiento AS nacimiento, j.fecha_ingreso AS ingreso,
           j.revisar, j.motivo_revision AS motivo, e.nombre AS club, e.serie
    FROM jugadores j JOIN equipos e ON e.id = j.equipo_id
    WHERE e.campeonato_id = ?
    ORDER BY e.nombre, e.serie, j.nombre
  `, [campeonato.id]);
  jugadores.forEach(j => {
    j.serieNombre = SERIES[j.serie] || j.serie;
    j.extranjero = esDocumentoExtranjero(j.rut);
    j.rutValido = j.extranjero || esRutValido(j.rut);
    j.clave = claveDocumento(j.rut);
  });
  const ficha = j => [j.club, j.serieNombre, j.nombre, j.rut, fechaCl(j.nacimiento), fechaCl(j.ingreso)];
  const colFicha = [['Club', 16], ['Serie', 10], ['Nombre', 34], ['Documento', 15], ['Nacimiento', 12], ['Ingreso', 12]];

  // Agrupa por documento (los vacíos o ilegibles no se pueden comparar).
  const porDoc = new Map();
  jugadores.filter(j => j.clave.length >= 5).forEach(j => (porDoc.get(j.clave) || porDoc.set(j.clave, []).get(j.clave)).push(j));
  const otroClub = [], otraSerie = [], mismoEquipo = [];
  let grupo = 0;
  for (const g of porDoc.values()) {
    if (g.length < 2) continue;
    grupo++;
    const clubes = new Set(g.map(j => j.club));
    if (clubes.size > 1) g.forEach(j => otroClub.push([grupo, ...ficha(j)]));
    else if (new Set(g.map(j => j.serie)).size > 1) g.forEach(j => otraSerie.push([grupo, ...ficha(j)]));
    else g.forEach(j => mismoEquipo.push([grupo, ...ficha(j)]));
  }

  const porNombre = new Map();
  jugadores.forEach(j => { const n = sinTildes(j.nombre); if (n) (porNombre.get(n) || porNombre.set(n, []).get(n)).push(j); });
  const mismoNombre = [];
  grupo = 0;
  for (const g of porNombre.values()) {
    if (new Set(g.map(j => j.clave)).size < 2) continue;
    grupo++;
    g.forEach(j => mismoNombre.push([grupo, ...ficha(j)]));
  }

  const invalidos = jugadores.filter(j => !j.rutValido).map(j => {
    const dv = dvEsperado(j.rut);
    const obs = !limpiarRut(j.rut) ? 'Sin documento'
      : dv ? `El dígito verificador no cuadra: con ese número debería ser ${dv}. Revisar si es error de tipeo en el dígito o en el número.`
      : 'No tiene formato de RUT (7 u 8 dígitos y dígito verificador).';
    return [...ficha(j), obs];
  });
  const extranjeros = jugadores.filter(j => j.extranjero).map(ficha);
  // Lo de RUT ya tiene su hoja: acá queda lo demás que dejó marcado la carga.
  const aRevisar = jugadores.filter(j => j.revisar).map(j => {
    const sinRut = String(j.motivo || '').split(' · ').filter(m => m && !/^RUT inválido/.test(m));
    return sinRut.length ? [...ficha(j), sinRut.join(' · ')] : null;
  }).filter(Boolean);

  // Registros de clubes sancionados (no inscritos): quién aparece en otro club.
  const sancionados = [];
  const dirListas = path.join(__dirname, 'data', 'listas');
  const registros = fs.existsSync(dirListas) ? fs.readdirSync(dirListas).filter(f => f.endsWith('-registro.json')) : [];
  for (const archivo of registros) {
    const reg = JSON.parse(fs.readFileSync(path.join(dirListas, archivo), 'utf8'));
    for (const l of reg.listas) {
      for (const [nombre, rut] of l.jugadores) {
        const clave = claveDocumento(rut);
        (porDoc.get(clave) || []).filter(j => sinTildes(j.club) !== sinTildes(reg.club))
          .forEach(j => sancionados.push([reg.club, nombre, rut, l.origen, j.club, j.serieNombre, j.nombre]));
      }
    }
  }

  const wb = new ExcelJS.Workbook();
  // Resumen primero: es lo que se mira antes de bajar al detalle.
  const clubes = [...new Set(jugadores.map(j => j.club))].sort();
  const series = ORDEN.filter(s => jugadores.some(j => j.serie === s));
  const resumen = clubes.map(c => [c, ...series.map(s => jugadores.filter(j => j.club === c && j.serie === s).length || ''), jugadores.filter(j => j.club === c).length]);
  resumen.push(['TOTAL', ...series.map(s => jugadores.filter(j => j.serie === s).length), jugadores.length]);
  const ws = hoja(wb, 'Resumen', `${campeonato.nombre} — jugadores inscritos`, [['Club', 18], ...series.map(s => [SERIES[s], 9]), ['Total', 8]], resumen,
    { nota: `Generado el ${new Date().toLocaleDateString('es-CL')}. Conteo de casos más abajo; el detalle está en cada hoja.` });
  const casos = [
    ['Mismo documento en otro club', otroClub.length ? new Set(otroClub.map(f => f[0])).size : 0],
    ['Mismo documento en otra serie del mismo club', otraSerie.length ? new Set(otraSerie.map(f => f[0])).size : 0],
    ['Dos veces en el mismo equipo', mismoEquipo.length ? new Set(mismoEquipo.map(f => f[0])).size : 0],
    ['Mismo nombre con distinto documento', mismoNombre.length ? new Set(mismoNombre.map(f => f[0])).size : 0],
    ['RUT inválido', invalidos.length],
    ['Pasaporte / documento extranjero (válido)', extranjeros.length],
    ['Otras observaciones (edad, fecha, notas)', aRevisar.length],
    ['Jugadores de club sancionado en otro club', sancionados.length],
  ];
  let r = resumen.length + 6;
  ws.getRow(r - 1).values = ['Casos', 'Cantidad'];
  ws.getRow(r - 1).font = { bold: true };
  casos.forEach(([t, n], i) => { ws.getRow(r + i).values = [t, n]; if (n && i !== 5) ws.getRow(r + i).getCell(2).font = { bold: true, color: { argb: 'FFC00000' } }; });

  const colGrupo = [['Caso', 6], ...colFicha];
  const alterno = (v) => (v[0] % 2 ? AMARILLO : null);
  hoja(wb, 'Otro club', 'Mismo documento inscrito en dos o más clubes', colGrupo, otroClub,
    { relleno: alterno, nota: 'Cada "Caso" agrupa las inscripciones del mismo documento. Un jugador no puede estar en dos clubes: hay que ver cuál vale (fecha de ingreso, pase).' });
  hoja(wb, 'Otra serie', 'Mismo documento en dos series del mismo club', colGrupo, otraSerie,
    { relleno: alterno, nota: 'Puede estar bien (por ejemplo, un juvenil que también juega en adultos). Se informa para que la asociación decida.' });
  hoja(wb, 'Mismo equipo', 'Dos veces en el mismo equipo', colGrupo, mismoEquipo, { relleno: alterno });
  hoja(wb, 'Mismo nombre', 'Mismo nombre con distinto documento', colGrupo, mismoNombre,
    { relleno: alterno, nota: 'Puede ser otra persona con el mismo nombre, o un RUT mal escrito en una de las listas.' });
  hoja(wb, 'RUT inválido', 'RUT con dígito verificador que no cuadra', [...colFicha, ['Observación', 60]], invalidos,
    { relleno: () => ROJO, nota: 'Pasaportes y documentos extranjeros no se incluyen acá: son válidos.' });
  hoja(wb, 'Extranjeros', 'Pasaportes y documentos extranjeros (válidos)', colFicha, extranjeros);
  hoja(wb, 'A revisar', 'Otras observaciones de la carga', [...colFicha, ['Observación', 60]], aRevisar);
  hoja(wb, 'Club sancionado', 'Jugadores de un club sancionado inscritos en otro club', [['Club sancionado', 16], ['Nombre en su registro', 30], ['Documento', 15], ['Planilla', 30], ['Inscrito en', 16], ['Serie', 10], ['Como', 30]], sancionados,
    { relleno: () => ROJO, nota: registros.length ? `Registros revisados: ${registros.join(', ')}. ANFA art. 203: inscribirlo en otro club requiere autorización del directorio.` : 'No hay registros de clubes sancionados en data/listas/.' });
  hoja(wb, 'Todos', 'Todos los jugadores inscritos', [...colFicha, ['Documento OK', 12], ['Observación de la carga', 50]],
    jugadores.map(j => [...ficha(j), j.extranjero ? 'Extranjero' : (j.rutValido ? 'Sí' : 'NO'), j.motivo || '']));

  const dir = path.join(__dirname, 'informes');
  fs.mkdirSync(dir, { recursive: true });
  const salida = path.join(dir, `jugadores-${new Date().toISOString().slice(0, 10)}.xlsx`);
  await wb.xlsx.writeFile(salida);
  console.log(`${campeonato.nombre}: ${jugadores.length} jugadores.`);
  casos.forEach(([t, n]) => console.log(`  ${String(n).padStart(4)}  ${t}`));
  console.log(`\n✅ Informe guardado en ${salida}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
