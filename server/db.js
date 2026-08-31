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
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          secret_2fa TEXT,
          totp_enabled INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
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

        -- Resoluciones del tribunal: descuentos de puntos y partidos ganados
        -- por secretaría. Son append-only a propósito: no se editan ni se
        -- borran, porque son el respaldo de por qué la tabla dice lo que dice.
        -- Si una resolución queda sin efecto (apelación, error), se marca
        -- 'revocada' con su motivo y se emite otra. Así el historial completo
        -- queda disponible para cualquiera que quiera auditarlo.
        CREATE TABLE IF NOT EXISTS resoluciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serie TEXT NOT NULL,
          tipo TEXT NOT NULL CHECK(tipo IN ('descuento_puntos','partido_homologado','walkover')),
          origen TEXT NOT NULL CHECK(origen IN ('oficio','reclamo')),
          equipo_id INTEGER REFERENCES equipos(id),
          partido_id INTEGER REFERENCES partidos(id),
          puntos_ajuste INTEGER,
          goles_local_hom INTEGER,
          goles_visita_hom INTEGER,
          articulo TEXT NOT NULL,
          motivo TEXT NOT NULL,
          numero_acta TEXT,
          fecha_resolucion TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'vigente' CHECK(estado IN ('vigente','revocada')),
          wo_jugados INTEGER,
          wo_total INTEGER,
          wo_corte INTEGER,
          creada_por INTEGER REFERENCES usuarios(id),
          creada_at TEXT NOT NULL DEFAULT (datetime('now')),
          revocada_por INTEGER REFERENCES usuarios(id),
          revocada_at TEXT,
          motivo_revocacion TEXT
        );

        -- Reclamos presentados por los clubes. Viven aparte de las
        -- resoluciones porque un reclamo puede rechazarse, y un rechazo
        -- también es información pública que conviene dejar registrada.
        CREATE TABLE IF NOT EXISTS reclamos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serie TEXT NOT NULL,
          partido_id INTEGER REFERENCES partidos(id),
          club_id INTEGER NOT NULL REFERENCES equipos(id),
          motivo TEXT NOT NULL,
          articulo TEXT,
          fecha_presentacion TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'presentado' CHECK(estado IN ('presentado','aceptado','rechazado')),
          resolucion_texto TEXT,
          fecha_resolucion TEXT,
          resuelto_por INTEGER REFERENCES usuarios(id),
          resolucion_id INTEGER REFERENCES resoluciones(id),
          creado_por INTEGER REFERENCES usuarios(id),
          creado_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS configuracion (
          clave TEXT PRIMARY KEY,
          valor TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      await migrar2FAYPasswordReset();
      await migrarPartidosDetalles();
      await migrarFasePlayoffs();
      await migrarWalkover();
    })();
  }
  return readyPromise;
}

// Migra usuarios para agregar 2FA y password_resets si no existen
async function migrar2FAYPasswordReset() {
  try {
    const has2FA = await columnExists('usuarios', 'secret_2fa');
    if (!has2FA) {
      await exec(`
        ALTER TABLE usuarios ADD COLUMN secret_2fa TEXT;
        ALTER TABLE usuarios ADD COLUMN totp_enabled INTEGER DEFAULT 0;
      `);
    }
  } catch (e) {
    console.log('2FA columns already exist or error:', e.message);
  }

  try {
    const hasPasswordResets = await all("SELECT name FROM sqlite_master WHERE type='table' AND name='password_resets'").then(r => r.length > 0);
    if (!hasPasswordResets) {
      await exec(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        );
      `);
    }
  } catch (e) {
    console.log('password_resets table already exists or error:', e.message);
  }
}

// Migra partidos para agregar fecha_partido, hora, estadio, turno
async function migrarPartidosDetalles() {
  try {
    const hasFechaPartido = await columnExists('partidos', 'fecha_partido');
    const hasHora = await columnExists('partidos', 'hora');
    const hasEstadio = await columnExists('partidos', 'estadio');
    const hasTurno = await columnExists('partidos', 'turno');

    if (!hasFechaPartido || !hasHora || !hasEstadio || !hasTurno) {
      const columnsToAdd = [];
      if (!hasFechaPartido) columnsToAdd.push('ALTER TABLE partidos ADD COLUMN fecha_partido TEXT');
      if (!hasHora) columnsToAdd.push('ALTER TABLE partidos ADD COLUMN hora TEXT');
      if (!hasEstadio) columnsToAdd.push('ALTER TABLE partidos ADD COLUMN estadio TEXT');
      if (!hasTurno) columnsToAdd.push('ALTER TABLE partidos ADD COLUMN turno TEXT');

      await exec(columnsToAdd.join(';'));
      console.log('✓ Columnas de partidos agregadas: fecha_partido, hora, estadio, turno');
    }
  } catch (e) {
    console.log('Partidos columns already exist or error:', e.message);
  }
}

// Migra partidos para soportar las fases de eliminación directa (cuartos,
// semifinal, final). Los partidos de fase de grupos quedan con fase='grupos',
// que es el valor por defecto, así que ninguna fila existente cambia de
// comportamiento. 'llave' numera los cruces dentro de una fase (1..4 en
// cuartos, 1..2 en semis, 1 en la final) y permite saber qué ganador alimenta
// qué cruce de la fase siguiente.
async function migrarFasePlayoffs() {
  try {
    const columnas = [];
    if (!(await columnExists('partidos', 'fase'))) {
      columnas.push("ALTER TABLE partidos ADD COLUMN fase TEXT NOT NULL DEFAULT 'grupos'");
    }
    if (!(await columnExists('partidos', 'llave'))) {
      columnas.push('ALTER TABLE partidos ADD COLUMN llave INTEGER');
    }
    // Definición por penales. Solo se usan en eliminación directa y cuando el
    // partido termina empatado; el marcador de los 90 minutos se conserva tal
    // cual en goles_local / goles_visita.
    if (!(await columnExists('partidos', 'penales_local'))) {
      columnas.push('ALTER TABLE partidos ADD COLUMN penales_local INTEGER');
    }
    if (!(await columnExists('partidos', 'penales_visita'))) {
      columnas.push('ALTER TABLE partidos ADD COLUMN penales_visita INTEGER');
    }
    if (columnas.length) {
      await exec(columnas.join(';'));
      console.log('✓ Columnas de playoffs agregadas a partidos: fase, llave, penales');
    }
  } catch (e) {
    console.log('Columnas de playoffs ya existen o error:', e.message);
  }
}

// Migra 'resoluciones' para aceptar el tipo 'walkover' (WO) y guardar cuántos
// partidos había jugado el infractor cuando se le registró.
//
// SQLite no permite ampliar un CHECK con ALTER TABLE, así que hay que
// reconstruir la tabla igual que en migrarSerie: crear la nueva -> copiar TODAS
// las filas tal cual -> reemplazar. No se pierde ninguna resolución ni cambia
// el contenido de las existentes; solo se amplía lo que la tabla acepta a
// futuro. Es idempotente: si el CHECK ya nombra 'walkover', no hace nada.
//
// El conteo se congela en la fila (wo_jugados / wo_total / wo_corte) en vez de
// calcularse cada vez, porque de él depende si los resultados del infractor
// siguen valiendo. Si se recalculara, cargar un resultado atrasado podría dar
// vuelta media tabla en silencio, meses después de la resolución. El corte va
// congelado por el mismo motivo: si la asociación lo cambia en otra temporada,
// las resoluciones ya emitidas tienen que seguir significando lo mismo.
async function migrarWalkover() {
  const tabla = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='resoluciones'");
  if (!tabla) return; // todavía no existe: init() la crea ya con walkover

  if (!/walkover/.test(tabla.sql)) {
    await exec('PRAGMA foreign_keys = OFF');
    await batch([
      { sql: `CREATE TABLE resoluciones_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serie TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('descuento_puntos','partido_homologado','walkover')),
        origen TEXT NOT NULL CHECK(origen IN ('oficio','reclamo')),
        equipo_id INTEGER REFERENCES equipos(id),
        partido_id INTEGER REFERENCES partidos(id),
        puntos_ajuste INTEGER,
        goles_local_hom INTEGER,
        goles_visita_hom INTEGER,
        articulo TEXT NOT NULL,
        motivo TEXT NOT NULL,
        numero_acta TEXT,
        fecha_resolucion TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'vigente' CHECK(estado IN ('vigente','revocada')),
        wo_jugados INTEGER,
        wo_total INTEGER,
        wo_corte INTEGER,
        creada_por INTEGER REFERENCES usuarios(id),
        creada_at TEXT NOT NULL DEFAULT (datetime('now')),
        revocada_por INTEGER REFERENCES usuarios(id),
        revocada_at TEXT,
        motivo_revocacion TEXT
      )`, args: [] },
      { sql: `INSERT INTO resoluciones_new
                (id, serie, tipo, origen, equipo_id, partido_id, puntos_ajuste,
                 goles_local_hom, goles_visita_hom, articulo, motivo, numero_acta,
                 fecha_resolucion, estado, creada_por, creada_at,
                 revocada_por, revocada_at, motivo_revocacion)
              SELECT id, serie, tipo, origen, equipo_id, partido_id, puntos_ajuste,
                 goles_local_hom, goles_visita_hom, articulo, motivo, numero_acta,
                 fecha_resolucion, estado, creada_por, creada_at,
                 revocada_por, revocada_at, motivo_revocacion
              FROM resoluciones`, args: [] },
      { sql: 'DROP TABLE resoluciones', args: [] },
      { sql: 'ALTER TABLE resoluciones_new RENAME TO resoluciones', args: [] },
    ]);
    await exec('PRAGMA foreign_keys = ON');
    console.log('\u2713 resoluciones acepta ahora el tipo walkover');
    return;
  }

  // La tabla ya acepta walkover: solo faltaría el conteo si viene de una
  // versión intermedia.
  const columnas = [];
  if (!(await columnExists('resoluciones', 'wo_jugados'))) {
    columnas.push('ALTER TABLE resoluciones ADD COLUMN wo_jugados INTEGER');
  }
  if (!(await columnExists('resoluciones', 'wo_total'))) {
    columnas.push('ALTER TABLE resoluciones ADD COLUMN wo_total INTEGER');
  }
  if (!(await columnExists('resoluciones', 'wo_corte'))) {
    columnas.push('ALTER TABLE resoluciones ADD COLUMN wo_corte INTEGER');
  }
  if (columnas.length) await exec(columnas.join(';'));
}

module.exports = { get, all, run, exec, batch, init };
