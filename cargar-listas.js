/**
 * Carga las listas de jugadores de un club en el campeonato activo, a partir
 * de un archivo JSON transcrito de las planillas (fotos que el usuario manda
 * por el chat; prefiere esto a pagar la lectura automática de fotos).
 *
 *   node cargar-listas.js data/listas/pichanga-2026.json            simula, no escribe
 *   node cargar-listas.js data/listas/pichanga-2026.json --aplicar  escribe
 *
 * Usa la base que apunte el .env (¡producción!). Las listas van en
 * data/listas/, que no se versiona porque trae RUT y fechas de nacimiento.
 *
 * Formato del archivo:
 *   { "club": "PICHANGA", "crearEquipos": ["SUB13"],
 *     "listas": [ { "origen": "...", "serie": "PRIMERA_ADULTO", "fechaIngreso": "14/04/2026",
 *                   "jugadores": [ ["Nombre", "RUT", "Fecha nacimiento", "nota opcional"] ] } ] }
 *
 * Reglas acordadas con la asociación:
 * - Un jugador va una sola vez por club: si aparece en varias listas, queda
 *   la de fecha de ingreso más reciente. Si dos listas tienen la misma
 *   fecha, queda la primera del archivo y se marca para revisar.
 * - Si ya estaba cargado en el club con una fecha más reciente, no se toca.
 * - Lo que no cumple (RUT inválido, edad, nota de la transcripción) se guarda
 *   igual, marcado "a revisar", como en la carga desde la página.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./server/db');
const { limpiarRut } = require('./server/rut');
const { normalizarFecha } = require('./server/csv');
const { problemasDelJugador, rutParaGuardar, fechaIngresoValida } = require('./server/inscripcion');

const NOMBRE_SERIE = {
  SUB13: 'Sub-13', SUB15: 'Sub-15', SUB17: 'Sub-17', SENIOR: 'Seniors',
  SEGUNDA_ADULTO: 'Segunda', PRIMERA_ADULTO: 'Primera',
};

// Sin RUT legible no hay con qué comparar entre listas: se usa el nombre.
function claveJugador(rut, nombre) {
  const limpio = limpiarRut(rut);
  if (limpio.length >= 2) return 'rut:' + limpio;
  return 'nombre:' + String(nombre).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

async function main() {
  const archivo = process.argv[2];
  const aplicar = process.argv.includes('--aplicar');
  if (!archivo) throw new Error('Uso: node cargar-listas.js <archivo.json> [--aplicar]');
  const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const club = datos.club;
  await db.init();

  const campeonato = await db.get("SELECT id, nombre FROM campeonatos WHERE estado = 'activo'");
  if (!campeonato) throw new Error('No hay un campeonato activo');
  const informe = [];
  const log = (linea = '') => { console.log(linea); informe.push(linea); };
  log(`${club} en ${campeonato.nombre}${aplicar ? '' : '  — SIMULACIÓN, no se escribe nada (usa --aplicar)'}`);
  for (const n of datos.notas || []) log(`  · ${n}`);
  log();

  // Equipos del club; los que faltan solo se crean si el archivo lo pide.
  const equipos = {};
  for (const e of await db.all('SELECT id, serie FROM equipos WHERE campeonato_id = ? AND nombre = ?', [campeonato.id, club])) {
    equipos[e.serie] = { id: e.id, serie: e.serie, campeonatoId: campeonato.id };
  }
  for (const serie of new Set(datos.listas.map(l => l.serie))) {
    if (equipos[serie]) continue;
    if (!(datos.crearEquipos || []).includes(serie)) {
      log(`OJO: ${club} no está inscrito en ${NOMBRE_SERIE[serie]}; esa lista no se carga.`);
      continue;
    }
    log(`Se inscribe el equipo ${club} en ${NOMBRE_SERIE[serie]} (sin partidos en el fixture).`);
    let id = null;
    if (aplicar) {
      const { n } = await db.get('SELECT COUNT(*) AS n FROM equipos WHERE campeonato_id = ? AND serie = ?', [campeonato.id, serie]);
      id = (await db.run(
        'INSERT INTO equipos (nombre, serie, grupo, orden, campeonato_id) VALUES (?, ?, ?, ?, ?)',
        [club, serie, 'U', Number(n) + 1, campeonato.id]
      )).lastInsertRowid;
    }
    equipos[serie] = { id, serie, campeonatoId: campeonato.id, nuevo: true };
  }

  // Un jugador por club: gana la lista con la fecha de ingreso más reciente.
  const elegidos = new Map();
  const movimientos = [];
  for (const lista of datos.listas) {
    const fechaIngreso = fechaIngresoValida(lista.fechaIngreso);
    if (!fechaIngreso) throw new Error(`Fecha de ingreso inválida en "${lista.origen}": ${lista.fechaIngreso}`);
    if (!equipos[lista.serie]) continue;
    for (const [nombre, rut, fechaNacimiento, nota] of lista.jugadores) {
      const clave = claveJugador(rut, nombre);
      const fila = { nombre, rut, fechaNacimiento, notas: nota ? [nota] : [], serie: lista.serie, fechaIngreso, origen: lista.origen };
      const previo = elegidos.get(clave);
      if (!previo) { elegidos.set(clave, fila); continue; }
      if (previo.serie === fila.serie && previo.fechaIngreso === fila.fechaIngreso) continue; // repetido en la misma lista
      if (fila.fechaIngreso > previo.fechaIngreso) {
        movimientos.push(`${nombre}: queda en ${NOMBRE_SERIE[fila.serie]} (${fila.origen}); también en ${previo.origen}`);
        fila.notas.push(...previo.notas.filter(n => !fila.notas.includes(n)));
        elegidos.set(clave, fila);
      } else if (fila.fechaIngreso === previo.fechaIngreso) {
        previo.notas.push(`También figura en ${NOMBRE_SERIE[fila.serie]} con la misma fecha de ingreso`);
        movimientos.push(`${nombre}: en ${NOMBRE_SERIE[previo.serie]} y ${NOMBRE_SERIE[fila.serie]} con la misma fecha; queda en ${NOMBRE_SERIE[previo.serie]}, marcado a revisar`);
      } else {
        movimientos.push(`${nombre}: queda en ${NOMBRE_SERIE[previo.serie]} (${previo.origen}); también en ${fila.origen}`);
      }
    }
  }

  // Lo que ya está cargado del club en este campeonato.
  const existentes = new Map();
  for (const j of await db.all(
    `SELECT j.id, j.nombre, j.rut, j.fecha_ingreso AS fechaIngreso, e.serie
     FROM jugadores j JOIN equipos e ON e.id = j.equipo_id
     WHERE e.campeonato_id = ? AND e.nombre = ?`, [campeonato.id, club]
  )) existentes.set(claveJugador(j.rut, j.nombre), j);

  const porSerie = {};
  const marcados = [];
  const sinCambio = [];
  for (const [clave, f] of elegidos) {
    const equipo = equipos[f.serie];
    const problemas = await problemasDelJugador(f, equipo);
    problemas.push(...f.notas.map(n => `Observación: ${n}`));
    const datosFila = [
      f.nombre.trim(), rutParaGuardar(f.rut),
      normalizarFecha(f.fechaNacimiento) || String(f.fechaNacimiento || '').trim(),
      problemas.length ? 1 : 0, problemas.length ? problemas.join(' · ') : null, f.fechaIngreso,
    ];
    const previo = existentes.get(clave);
    if (previo && previo.fechaIngreso && previo.fechaIngreso > f.fechaIngreso) {
      sinCambio.push(`${f.nombre}: ya estaba en ${NOMBRE_SERIE[previo.serie]} con ingreso ${previo.fechaIngreso}, más reciente`);
      continue;
    }
    const s = (porSerie[f.serie] = porSerie[f.serie] || { nuevos: 0, actualizados: 0, marcados: 0 });
    if (previo) s.actualizados++; else s.nuevos++;
    if (problemas.length) { s.marcados++; marcados.push(`${NOMBRE_SERIE[f.serie]} · ${f.nombre} (${f.rut}): ${problemas.join(' · ')}`); }
    if (!aplicar) continue;
    if (previo) {
      await db.run(
        `UPDATE jugadores SET equipo_id = ?, nombre = ?, rut = ?, fecha_nacimiento = ?, revisar = ?, motivo_revision = ?,
           fecha_ingreso = ?, updated_at = datetime('now') WHERE id = ?`,
        [equipo.id, ...datosFila, previo.id]
      );
    } else {
      await db.run(
        `INSERT INTO jugadores (equipo_id, nombre, rut, fecha_nacimiento, revisar, motivo_revision, fecha_ingreso)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [equipo.id, ...datosFila]
      );
    }
  }

  log('Resumen por serie:');
  for (const [serie, s] of Object.entries(porSerie)) {
    log(`  ${NOMBRE_SERIE[serie]}: ${s.nuevos} nuevos, ${s.actualizados} actualizados, ${s.marcados} a revisar`);
  }
  if (movimientos.length) { log(); log('Jugadores en más de una lista del club (se cargan una sola vez):'); movimientos.forEach(m => log('  ' + m)); }
  if (sinCambio.length) { log(); log('No se tocaron:'); sinCambio.forEach(m => log('  ' + m)); }
  if (marcados.length) { log(); log(`Marcados "a revisar" (${marcados.length}):`); marcados.forEach(m => log('  ' + m)); }

  // Repetidos con otros clubes del campeonato (se permiten, pero se informan).
  const otros = await db.all(
    `SELECT j.nombre, j.rut, e.nombre AS club, e.serie FROM jugadores j JOIN equipos e ON e.id = j.equipo_id
     WHERE e.campeonato_id = ? AND e.nombre <> ?`, [campeonato.id, club]
  );
  const cruces = [];
  for (const o of otros) {
    const f = elegidos.get(claveJugador(o.rut, o.nombre));
    if (f) cruces.push(`${f.nombre} (${o.rut}): ${club} ${NOMBRE_SERIE[f.serie]} y ${o.club} ${NOMBRE_SERIE[o.serie] || o.serie}`);
  }
  log(); log(cruces.length ? `RUT repetidos con otros clubes (${cruces.length}):` : 'Ningún RUT repetido con otros clubes.');
  cruces.forEach(m => log('  ' + m));

  const salida = archivo.replace(/\.json$/, '') + (aplicar ? '-informe.txt' : '-simulacion.txt');
  fs.writeFileSync(salida, informe.join('\n') + '\n');
  console.log(`\nInforme guardado en ${path.normalize(salida)}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
