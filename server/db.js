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

let readyPromise = null;
function init() {
  if (!readyPromise) {
    readyPromise = exec(`
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
        grupo TEXT NOT NULL CHECK(grupo IN ('A','B')),
        orden INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS partidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo TEXT NOT NULL CHECK(grupo IN ('A','B')),
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
        grupo TEXT NOT NULL CHECK(grupo IN ('A','B')),
        fecha INTEGER NOT NULL,
        equipo_id INTEGER NOT NULL REFERENCES equipos(id)
      );
    `);
  }
  return readyPromise;
}

module.exports = { get, all, run, exec, batch, init };
