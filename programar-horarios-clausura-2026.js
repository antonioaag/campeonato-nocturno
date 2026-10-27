/**
 * Carga el día y la hora de cada partido de la fase de grupos de Clausura
 * 2026, desde fixtures/clausura-2026-horarios.json. Uso puntual, contra la
 * base que apunte el .env (¡producción!).
 *
 *   node programar-horarios-clausura-2026.js           muestra lo que haría
 *   node programar-horarios-clausura-2026.js --aplicar guarda los horarios
 *
 * Cada fecha se juega de viernes a domingo en los horarios del estadio, y
 * cada horario admite solo ciertas series. La programación se armó para que
 * ningún equipo repita horario en dos fechas seguidas y para que cada club
 * juegue lo más agrupado posible (pocos días y sin horarios salteados).
 *
 * Solo cambia fecha_partido y hora: no toca equipos, rivales ni resultados.
 * La excepción son los marcados "pendiente" (suspendidos sin nueva fecha):
 * quedan como aplazados y sin día ni hora, para que nadie los lea como
 * programados en el horario que tenían. Al reprogramarlos se les quita la
 * marca en el archivo y se vuelven a 'programado' desde la web.
 * Si algún partido del archivo no existe en la base (por ejemplo, porque
 * todavía está cargado el fixture anterior), no guarda nada.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./server/db');
const { sumarDias } = require('./server/sorteo');

const CAMPEONATO = 'Campeonato Clausura 2026';
const PRIMER_VIERNES = '2026-10-23';
const DESDE_VIERNES = { VIERNES: 0, SABADO: 1, DOMINGO: 2 };

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const { partidos } = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'clausura-2026-horarios.json'), 'utf8'));
  await db.init();

  const c = await db.get('SELECT id, estado FROM campeonatos WHERE nombre = ?', [CAMPEONATO]);
  if (!c) throw new Error(`No existe "${CAMPEONATO}"`);
  if (c.estado !== 'activo') throw new Error(`"${CAMPEONATO}" no está activo`);
  console.log(`${CAMPEONATO} (#${c.id})${aplicar ? '' : '  — SIMULACIÓN, no se escribe nada (usa --aplicar)'}\n`);

  const enBase = await db.all(`
    SELECT p.id, p.serie, p.fecha, p.estado, l.nombre AS local, v.nombre AS visita
    FROM partidos p JOIN equipos l ON l.id = p.local_id JOIN equipos v ON v.id = p.visita_id
    WHERE l.campeonato_id = ? AND p.fase = 'grupos'
  `, [c.id]);
  const clave = (serie, fecha, a, b) => `${serie}|${fecha}|${[a, b].sort().join('|')}`;
  const porClave = new Map(enBase.map(p => [clave(p.serie, p.fecha, p.local, p.visita), p]));

  const faltan = partidos.filter(p => !porClave.has(clave(p.serie, p.fecha, p.local, p.visita)));
  if (faltan.length) {
    throw new Error(`${faltan.length} partido(s) del archivo no están en la base. ¿Ya corriste reemplazar-fixture-clausura-2026.js --aplicar? Primero: ${faltan[0].serie} fecha ${faltan[0].fecha} ${faltan[0].local} vs ${faltan[0].visita}`);
  }
  if (partidos.length !== enBase.length) {
    throw new Error(`El archivo trae ${partidos.length} partidos y la base tiene ${enBase.length}: no coinciden`);
  }

  // Los ya jugados conservan su día: lo que pasó no se reprograma.
  const sentencias = [];
  let jugados = 0;
  let fechaActual = null;
  for (const p of [...partidos].sort((a, b) => a.fecha - b.fecha)) {
    const enLaBase = porClave.get(clave(p.serie, p.fecha, p.local, p.visita));
    if (enLaBase.estado === 'jugado') { jugados++; continue; }
    if (p.fecha !== fechaActual) { fechaActual = p.fecha; console.log(`Fecha ${p.fecha}`); }
    if (p.pendiente) {
      sentencias.push({ sql: "UPDATE partidos SET fecha_partido = NULL, hora = NULL, estado = 'aplazado' WHERE id = ?", args: [enLaBase.id] });
      console.log(`  PENDIENTE         ${p.serie.padEnd(15)} ${p.local} vs ${p.visita}  (era ${p.dia.toLowerCase()} ${p.hora})`);
      continue;
    }
    const dia = sumarDias(PRIMER_VIERNES, (p.fecha - 1) * 7 + DESDE_VIERNES[p.dia]);
    sentencias.push({ sql: 'UPDATE partidos SET fecha_partido = ?, hora = ? WHERE id = ?', args: [dia, p.hora, enLaBase.id] });
    console.log(`  ${dia} ${p.hora}  ${p.serie.padEnd(15)} ${p.local} vs ${p.visita}`);
  }
  const pendientes = partidos.filter(p => p.pendiente && porClave.get(clave(p.serie, p.fecha, p.local, p.visita)).estado !== 'jugado').length;
  console.log(`\n${sentencias.length - pendientes} partidos a programar${pendientes ? `, ${pendientes} pendientes quedan aplazados sin día` : ''}${jugados ? `, ${jugados} ya jugados quedan como están` : ''}.`);

  if (!aplicar) return;
  await db.batch(sentencias);
  console.log('✅ Horarios guardados.');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
