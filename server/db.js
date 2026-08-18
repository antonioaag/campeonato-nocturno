const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

// En producción (Render) estas variables apuntan a la base de datos remota en
// Turso. En desarrollo local, si no están definidas, se usa un archivo SQLite
// local en data/campeonato.db (mismo comportamiento de siempre).
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let clientConfig;
if (TURSO_URL) {
  clientConfig = { url: TURSO_URL, authToken: TURSO_TOKEN };
} else {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  clientConfig = { url: 'file:' + path.join(dataDir, 'campeonato.db') };
}

const client = createClient(clientConfig);

function toPlainRows(result) {
  return result.rows.map(row => ({ ...row }));
}

async function all(sql, params = []) {
  const result = await client.execute({ sql, args: params });
  return toPlainRows(result);
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0];
}

async function run(sql, params = []) {
  const result = await client.execute({ sql, args: params });
  return { lastInsertRowid: result.lastInsertRowid, changes: Number(result.rowsAffected) };
}

// Ejecuta varias sentencias SQL separadas por ';' de forma secuencial. Solo se
// usa para inicializar el esquema (las sentencias no contienen ';' en datos).
async function exec(sql) {
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await client.execute(statement);
  }
}

// Ejecuta varias sentencias como una sola transacción atómica.
// statements: [{ sql, args }]
async function batch(statements) {
  return client.batch(statements, 'write');
}

async function columnExists(table, column) {
  const rows = await all(`PRAGMA table_info(${table})`);
  return rows.some(r => r.name === column);
}

// Migra equipos/partidos/byes para agregar la columna 'serie' y permitir
// grupos '1'/'2'/'3' (Seniors) además de 'A'/'B' (Adultos). SQLite no permite
// cambiar un CHECK existente con ALTER TABLE, así que se reconstruyen las
// tablas (crear nueva -> copiar datos marcándolos como 'ADULTO' -> reemplazar).
// Es idempotente: si 'serie' ya existe, no hace nada. No borra ni modifica
// ninguna fila existente, solo le agrega la columna con su valor por defecto.
async function migrarSerie() {
  if (await columnExists('equipos', 'serie')) return;

  await exec('PRAGMA foreign_keys = OFF');

  await batch([
    { sql: `CREATE TABLE equipos_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      serie TEXT NOT NULL CHECK(serie IN ('ADULTO','SENIOR')),
      grupo TEXT NOT NULL,
      orden INTEGER NOT NULL
    )`, args: [] },
    { sql: `INSERT INTO equipos_new (id, nombre, serie, grupo, orden)
            SELECT id, nombre, 'ADULTO', grupo, orden FROM equipos`, args: [] },
    { sql: 'DROP TABLE equipos', args: [] },
    { sql: 'ALTER TABLE equipos_new RENAME TO equipos', args: [] },

    { sql: `CREATE TABLE partidos_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie TEXT NOT NULL CHECK(serie IN ('ADULTO','SENIOR')),
      grupo TEXT NOT NULL,
      fecha INTEGER NOT NULL,
      local_id INTEGER NOT NULL REFERENCES equipos(id),
      visita_id INTEGER NOT NULL REFERENCES equipos(id),
      goles_local INTEGER,
      goles_visita INTEGER,
      estado TEXT NOT NULL DEFAULT 'programado' CHECK(estado IN ('programado','jugado','aplazado')),
      updated_by INTEGER REFERENCES usuarios(id),
      updated_at TEXT
    )`, args: [] },
    { sql: `INSERT INTO partidos_new (id, serie, grupo, fecha, local_id, visita_id, goles_local, goles_visita, estado, updated_by, updated_at)
            SELECT id, 'ADULTO', grupo, fecha, local_id, visita_id, goles_local, goles_visita, estado, updated_by, updated_at FROM partidos`, args: [] },
    { sql: 'DROP TABLE partidos', args: [] },
    { sql: 'ALTER TABLE partidos_new RENAME TO partidos', args: [] },

    { sql: `CREATE TABLE byes_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie TEXT NOT NULL CHECK(serie IN ('ADULTO','SENIOR')),
      grupo TEXT NOT NULL,
      fecha INTEGER NOT NULL,
      equipo_id INTEGER NOT NULL REFERENCES equipos(id)
    )`, args: [] },
    { sql: `INSERT INTO byes_new (id, serie, grupo, fecha, equipo_id)
            SELECT id, 'ADULTO', grupo, fecha, equipo_id FROM byes`, args: [] },
    { sql: 'DROP TABLE byes', args: [] },
    { sql: 'ALTER TABLE byes_new RENAME TO byes', args: [] },
  ]);

  await exec('PRAGMA foreign_keys = ON');
}

let readyPromise = null;
function init() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          nombre TEXT NOT NULL,
          rol TEXT NOT NULL CHECK(rol IN ('admin','encargado')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS equipos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          serie TEXT NOT NULL DEFAULT 'ADULTO' CHECK(serie IN ('ADULTO','SENIOR')),
          grupo TEXT NOT NULL,
          orden INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS partidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serie TEXT NOT NULL DEFAULT 'ADULTO' CHECK(serie IN ('ADULTO','SENIOR')),
          grupo TEXT NOT NULL,
          fecha INTEGER NOT NULL,
          local_id INTEGER NOT NULL REFERENCES equipos(id),
          visita_id INTEGER NOT NULL REFERENCES equipos(id),
          goles_local INTEGER,
          goles_visita INTEGER,
          estado TEXT NOT NULL DEFAULT 'programado' CHECK(estado IN ('programado','jugado','aplazado')),
          updated_by INTEGER REFERENCES usuarios(id),
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS byes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serie TEXT NOT NULL DEFAULT 'ADULTO' CHECK(serie IN ('ADULTO','SENIOR')),
          grupo TEXT NOT NULL,
          fecha INTEGER NOT NULL,
          equipo_id INTEGER NOT NULL REFERENCES equipos(id)
        );

        CREATE TABLE IF NOT EXISTS jugadores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipo_id INTEGER NOT NULL REFERENCES equipos(id),
          nombre TEXT NOT NULL,
          rut TEXT NOT NULL,
          fecha_nacimiento TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS listas_inscripcion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipo_id INTEGER UNIQUE NOT NULL REFERENCES equipos(id),
          nombre_archivo TEXT NOT NULL,
          tipo_mime TEXT NOT NULL,
          tamano_bytes INTEGER NOT NULL,
          contenido BLOB NOT NULL,
          subido_por INTEGER REFERENCES usuarios(id),
          subido_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS castigos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          rut TEXT NOT NULL,
          equipo_id INTEGER NOT NULL REFERENCES equipos(id),
          infraccion TEXT NOT NULL,
          castigo TEXT NOT NULL,
          fecha_castigo TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'vigente' CHECK(estado IN ('vigente','cumplido')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT
        );
      `);
      await migrarSerie();
    })();
  }
  return readyPromise;
}

module.exports = { get, all, run, exec, batch, init };
