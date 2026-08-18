/**
 * Script de siembra (seed). Ejecutado directamente (`npm run seed`) resetea
 * TODO desde cero: ambas series (Adulto y Senior), su fixture, los resultados
 * reales de la Fecha 1 y el usuario admin. Pensado para desarrollo local o
 * para el primer arranque de un deploy nuevo con base de datos vacía.
 *
 * Para agregar la serie Senior a una base de datos que YA tiene datos reales
 * de Adulto cargados (por ejemplo, producción), no se debe llamar a seed()
 * completo (borraría todo). En su lugar se usa seedSerieSenior(), que solo
 * inserta si esa serie todavía no existe, sin tocar nada más. Ver
 * server/add-seniors.js.
 *
 * El orden en que se listan los equipos de cada grupo NO es cosmético: el
 * algoritmo de round-robin usa ese orden para decidir los cruces de cada
 * fecha, y fue elegido a propósito para que la Fecha 1 generada coincida
 * exactamente con los partidos que ya se jugaron en la vida real.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generarRoundRobin } = require('./fixtureGenerator');

// El usuario/clave del admin NUNCA se hardcodean: se toman de variables de
// entorno (ADMIN_USERNAME / ADMIN_PASSWORD). Si no están definidas (primer
// arranque sin configurarlas), se genera una clave aleatoria segura y se
// imprime UNA sola vez en el log del servidor para que se pueda copiar y
// guardar de inmediato.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');

// --- Serie ADULTO: 13 equipos, Grupo A (7, uno libre por fecha) y B (6) ---
const ADULTO_GRUPO_A = ['PICHANGA', 'VECINAL', 'PLATENSE', 'CARDENAL CARO', '10 DE MARZO', 'CAUPOLICAN PEÑA', 'FLAMENGO'];
const ADULTO_GRUPO_B = ['SAO PAULO', 'ESTOCOLMO', 'INDEPENDIENTE', 'BOROA', 'CHAYAIHUE', 'J. OVALLE'];

// --- Serie SENIOR: 12 equipos, 3 grupos de 4 (sin libres) ---
const SENIOR_GRUPO_1 = ['FLAMENGO', 'INDEPENDIENTE', 'PLATENSE', 'VECINAL'];
const SENIOR_GRUPO_2 = ['10 DE MARZO', 'SAO PAULO', 'J. OVALLE', 'ESTOCOLMO'];
const SENIOR_GRUPO_3 = ['BOROA', 'CHAYAIHUE', 'PICHANGA', 'JORGE MONTT'];

async function limpiarSerie(serie) {
  await db.run('DELETE FROM byes WHERE serie = ?', [serie]);
  await db.run('DELETE FROM partidos WHERE serie = ?', [serie]);
  await db.run('DELETE FROM equipos WHERE serie = ?', [serie]);
}

async function insertarEquipos(nombres, serie, grupo) {
  const ids = {};
  for (let i = 0; i < nombres.length; i++) {
    const nombre = nombres[i];
    const info = await db.run('INSERT INTO equipos (nombre, serie, grupo, orden) VALUES (?, ?, ?, ?)', [nombre, serie, grupo, i]);
    ids[nombre] = info.lastInsertRowid;
  }
  return ids;
}

async function generarYGuardarFixture(idsPorNombre, nombresOrdenados, serie, grupo) {
  const listaIds = nombresOrdenados.map(n => idsPorNombre[n]);
  if (listaIds.length % 2 !== 0) listaIds.push('LIBRE');

  const { partidos, byes } = generarRoundRobin(listaIds);

  for (const p of partidos) {
    await db.run(
      `INSERT INTO partidos (serie, grupo, fecha, local_id, visita_id, estado) VALUES (?, ?, ?, ?, ?, 'programado')`,
      [serie, grupo, p.fecha, p.localId, p.visitaId]
    );
  }
  for (const b of byes) {
    await db.run('INSERT INTO byes (serie, grupo, fecha, equipo_id) VALUES (?, ?, ?, ?)', [serie, grupo, b.fecha, b.equipoId]);
  }
}

async function buscarPartidoFecha1(serie, idsPorNombre, local, visita) {
  const localId = idsPorNombre[local];
  const visitaId = idsPorNombre[visita];
  const row = await db.get(
    'SELECT id FROM partidos WHERE serie = ? AND local_id = ? AND visita_id = ? AND fecha = 1',
    [serie, localId, visitaId]
  );
  if (!row) throw new Error(`No se encontró el partido ${local} vs ${visita} (${serie}) en la Fecha 1. Revisa el orden de equipos.`);
  return row.id;
}

async function marcarResultado(serie, idsPorNombre, local, visita, golesLocal, golesVisita) {
  const id = await buscarPartidoFecha1(serie, idsPorNombre, local, visita);
  await db.run(`
    UPDATE partidos SET goles_local = ?, goles_visita = ?, estado = 'jugado', updated_at = datetime('now')
    WHERE id = ?
  `, [golesLocal, golesVisita, id]);
}

async function marcarAplazado(serie, idsPorNombre, local, visita) {
  const id = await buscarPartidoFecha1(serie, idsPorNombre, local, visita);
  await db.run(`
    UPDATE partidos SET goles_local = NULL, goles_visita = NULL, estado = 'aplazado', updated_at = datetime('now')
    WHERE id = ?
  `, [id]);
}

async function crearAdminSiNoExiste() {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  const existe = await db.get('SELECT id FROM usuarios WHERE rol = ?', ['admin']);

  if (existe) {
    // Si admin existe, actualiza su contraseña
    await db.run('UPDATE usuarios SET username = ?, password_hash = ? WHERE rol = ?',
      [ADMIN_USERNAME, hash, 'admin']);
  } else {
    // Si no existe, crea uno nuevo
    await db.run(`
      INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, 'admin')
    `, [ADMIN_USERNAME, hash, 'Administrador']);
  }
}

async function seedSerieAdulto() {
  await limpiarSerie('ADULTO');

  const idsA = await insertarEquipos(ADULTO_GRUPO_A, 'ADULTO', 'A');
  const idsB = await insertarEquipos(ADULTO_GRUPO_B, 'ADULTO', 'B');

  await generarYGuardarFixture(idsA, ADULTO_GRUPO_A, 'ADULTO', 'A');
  await generarYGuardarFixture(idsB, ADULTO_GRUPO_B, 'ADULTO', 'B');

  // Resultados reales Fecha 1 - Grupo A (PICHANGA libre esa fecha)
  await marcarResultado('ADULTO', idsA, 'VECINAL', 'FLAMENGO', 4, 3);
  await marcarResultado('ADULTO', idsA, 'PLATENSE', 'CAUPOLICAN PEÑA', 1, 3);
  await marcarResultado('ADULTO', idsA, 'CARDENAL CARO', '10 DE MARZO', 6, 1);

  // Resultados reales Fecha 1 - Grupo B
  await marcarResultado('ADULTO', idsB, 'ESTOCOLMO', 'CHAYAIHUE', 0, 4);
  await marcarResultado('ADULTO', idsB, 'INDEPENDIENTE', 'BOROA', 4, 4);
  await marcarAplazado('ADULTO', idsB, 'SAO PAULO', 'J. OVALLE'); // aplazado por lluvia
}

async function seedSerieSenior() {
  await limpiarSerie('SENIOR');

  const ids1 = await insertarEquipos(SENIOR_GRUPO_1, 'SENIOR', '1');
  const ids2 = await insertarEquipos(SENIOR_GRUPO_2, 'SENIOR', '2');
  const ids3 = await insertarEquipos(SENIOR_GRUPO_3, 'SENIOR', '3');

  await generarYGuardarFixture(ids1, SENIOR_GRUPO_1, 'SENIOR', '1');
  await generarYGuardarFixture(ids2, SENIOR_GRUPO_2, 'SENIOR', '2');
  await generarYGuardarFixture(ids3, SENIOR_GRUPO_3, 'SENIOR', '3');

  // Resultados reales Fecha 1: solo se jugó Vecinal-Flamengo (Vecinal 1 -
  // Flamengo 2), el resto se reprogramó (aplazado) y se juega a partir del
  // día siguiente. El fixture generado pone a Flamengo como local del cruce.
  await marcarResultado('SENIOR', ids1, 'FLAMENGO', 'VECINAL', 2, 1);
  await marcarAplazado('SENIOR', ids1, 'INDEPENDIENTE', 'PLATENSE');
  await marcarAplazado('SENIOR', ids2, '10 DE MARZO', 'ESTOCOLMO');
  await marcarAplazado('SENIOR', ids2, 'SAO PAULO', 'J. OVALLE');
  await marcarAplazado('SENIOR', ids3, 'BOROA', 'JORGE MONTT');
  await marcarAplazado('SENIOR', ids3, 'CHAYAIHUE', 'PICHANGA');
}

async function seed() {
  await db.init();
  // Reseteo completo: primero se limpian equipos/partidos (así se sueltan las
  // referencias updated_by hacia usuarios) y recién después se borran los
  // usuarios también (a diferencia de seedSerieSenior, que se usa para
  // agregar Senior sin tocar nada existente).
  await seedSerieAdulto();
  await seedSerieSenior();
  await db.run('DELETE FROM usuarios');
  await crearAdminSiNoExiste();

  console.log('Seed completado (Adulto + Senior).');
  if (process.env.ADMIN_PASSWORD) {
    console.log(`Usuario admin creado: ${ADMIN_USERNAME} (clave: la que pusiste en ADMIN_PASSWORD)`);
  } else {
    console.log('⚠️  No definiste ADMIN_PASSWORD: se generó una clave aleatoria. GUÁRDALA AHORA, no se vuelve a mostrar:');
    console.log(`   Usuario: ${ADMIN_USERNAME}`);
    console.log(`   Clave:   ${ADMIN_PASSWORD}`);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { seed, seedSerieAdulto, seedSerieSenior, crearAdminSiNoExiste };
