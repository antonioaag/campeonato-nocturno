/**
 * Script de siembra (seed). Se ejecuta una sola vez (o cada vez que se quiera
 * resetear el torneo desde cero) con: npm run seed
 *
 * - Crea los 13 equipos reales (Grupo A: 7, Grupo B: 6).
 * - El orden en que se listan aquí NO es cosmético: el algoritmo de round-robin
 *   usa ese orden para decidir los cruces de cada fecha, y fue elegido a propósito
 *   para que la Fecha 1 generada coincida exactamente con los partidos que ya se
 *   jugaron en la vida real. Si cambias el orden, la Fecha 1 generada ya no va a
 *   coincidir con los resultados reales cargados más abajo.
 * - Genera el fixture completo (7 fechas Grupo A, 5 fechas Grupo B).
 * - Carga los resultados reales de la Fecha 1 (incluye el partido aplazado por lluvia).
 * - Crea el usuario admin.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generarRoundRobin } = require('./fixtureGenerator');

const ADMIN_USERNAME = 'Squale0001';
const ADMIN_PASSWORD = 'Squale.0608';

// Orden especial: ver comentario arriba. La posición de cada equipo determina
// los cruces de la Fecha 1 mediante el método del círculo.
const GRUPO_A = ['PICHANGA', 'VECINAL', 'PLATENSE', 'CARDENAL CARO', '10 DE MARZO', 'CAUPOLICAN PEÑA', 'FLAMENGO'];
const GRUPO_B = ['SAO PAULO', 'ESTOCOLMO', 'INDEPENDIENTE', 'BOROA', 'CHAYAIHUE', 'J. OVALLE'];

async function limpiarTodo() {
  await db.run('DELETE FROM byes');
  await db.run('DELETE FROM partidos');
  await db.run('DELETE FROM equipos');
  await db.run('DELETE FROM usuarios');
  await db.run("DELETE FROM sqlite_sequence WHERE name IN ('byes','partidos','equipos','usuarios')");
}

async function insertarEquipos(nombres, grupo) {
  const ids = {};
  for (let i = 0; i < nombres.length; i++) {
    const nombre = nombres[i];
    const info = await db.run('INSERT INTO equipos (nombre, grupo, orden) VALUES (?, ?, ?)', [nombre, grupo, i]);
    ids[nombre] = info.lastInsertRowid;
  }
  return ids;
}

async function generarYGuardarFixture(idsPorNombre, nombresOrdenados, grupo) {
  const listaIds = nombresOrdenados.map(n => idsPorNombre[n]);
  if (listaIds.length % 2 !== 0) listaIds.push('LIBRE');

  const { partidos, byes } = generarRoundRobin(listaIds);

  for (const p of partidos) {
    await db.run(
      `INSERT INTO partidos (grupo, fecha, local_id, visita_id, estado) VALUES (?, ?, ?, ?, 'programado')`,
      [grupo, p.fecha, p.localId, p.visitaId]
    );
  }
  for (const b of byes) {
    await db.run('INSERT INTO byes (grupo, fecha, equipo_id) VALUES (?, ?, ?)', [grupo, b.fecha, b.equipoId]);
  }
}

async function marcarResultado(idsPorNombre, local, visita, golesLocal, golesVisita) {
  const localId = idsPorNombre[local];
  const visitaId = idsPorNombre[visita];
  const row = await db.get('SELECT id FROM partidos WHERE local_id = ? AND visita_id = ? AND fecha = 1', [localId, visitaId]);
  if (!row) throw new Error(`No se encontró el partido ${local} vs ${visita} en la Fecha 1. Revisa el orden de equipos.`);
  await db.run(`
    UPDATE partidos SET goles_local = ?, goles_visita = ?, estado = 'jugado', updated_at = datetime('now')
    WHERE id = ?
  `, [golesLocal, golesVisita, row.id]);
}

async function marcarAplazado(idsPorNombre, local, visita) {
  const localId = idsPorNombre[local];
  const visitaId = idsPorNombre[visita];
  const row = await db.get('SELECT id FROM partidos WHERE local_id = ? AND visita_id = ? AND fecha = 1', [localId, visitaId]);
  if (!row) throw new Error(`No se encontró el partido ${local} vs ${visita} en la Fecha 1. Revisa el orden de equipos.`);
  await db.run(`
    UPDATE partidos SET goles_local = NULL, goles_visita = NULL, estado = 'aplazado', updated_at = datetime('now')
    WHERE id = ?
  `, [row.id]);
}

async function crearAdmin() {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await db.run(`
    INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, 'admin')
  `, [ADMIN_USERNAME, hash, 'Administrador']);
}

async function seed() {
  await db.init();
  await limpiarTodo();

  const idsA = await insertarEquipos(GRUPO_A, 'A');
  const idsB = await insertarEquipos(GRUPO_B, 'B');

  await generarYGuardarFixture(idsA, GRUPO_A, 'A');
  await generarYGuardarFixture(idsB, GRUPO_B, 'B');

  // Resultados reales Fecha 1 - Grupo A (PICHANGA libre esa fecha)
  await marcarResultado(idsA, 'VECINAL', 'FLAMENGO', 4, 3);
  await marcarResultado(idsA, 'PLATENSE', 'CAUPOLICAN PEÑA', 1, 3);
  await marcarResultado(idsA, 'CARDENAL CARO', '10 DE MARZO', 6, 1);

  // Resultados reales Fecha 1 - Grupo B
  await marcarResultado(idsB, 'ESTOCOLMO', 'CHAYAIHUE', 0, 4);
  await marcarResultado(idsB, 'INDEPENDIENTE', 'BOROA', 4, 4);
  await marcarAplazado(idsB, 'SAO PAULO', 'J. OVALLE'); // aplazado por lluvia

  await crearAdmin();

  console.log('Seed completado.');
  console.log(`Usuario admin: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { seed };
