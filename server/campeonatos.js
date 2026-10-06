// Administración de campeonatos (ediciones del torneo: Apertura 2026,
// Clausura 2026, etc.). Siempre hay como máximo un campeonato 'activo' a la
// vez; el resto queda 'finalizado' y de solo lectura.
const db = require('./db');

function error(status, mensaje) {
  return Object.assign(new Error(mensaje), { status });
}

async function listar() {
  return db.all('SELECT id, nombre, estado, creado_at AS creadoAt, finalizado_at AS finalizadoAt FROM campeonatos ORDER BY id DESC');
}

async function obtenerPorId(id) {
  return db.get('SELECT id, nombre, estado, creado_at AS creadoAt, finalizado_at AS finalizadoAt FROM campeonatos WHERE id = ?', [id]);
}

async function obtenerActivo() {
  const activo = await db.get("SELECT id, nombre, estado FROM campeonatos WHERE estado = 'activo'");
  if (!activo) throw error(409, 'No hay un campeonato activo. Un admin debe crear uno.');
  return activo;
}

// Resuelve qué campeonato usar para una lectura: el que se pida por query
// param, o el activo por defecto si no se especifica ninguno.
async function resolverParaLectura(campeonatoIdQuery) {
  if (campeonatoIdQuery === undefined || campeonatoIdQuery === null || campeonatoIdQuery === '') {
    return obtenerActivo();
  }
  const id = Number(campeonatoIdQuery);
  const c = await obtenerPorId(id);
  if (!c) throw error(404, 'Campeonato no encontrado');
  return c;
}

async function crear(nombre) {
  if (!nombre || !String(nombre).trim()) throw error(400, 'El nombre del campeonato es obligatorio');
  const yaActivo = await db.get("SELECT id FROM campeonatos WHERE estado = 'activo'");
  if (yaActivo) throw error(409, 'Ya hay un campeonato activo. Hay que finalizarlo antes de crear uno nuevo.');
  const info = await db.run("INSERT INTO campeonatos (nombre, estado) VALUES (?, 'activo')", [String(nombre).trim()]);
  return obtenerPorId(info.lastInsertRowid);
}

async function finalizar(id) {
  const c = await obtenerPorId(id);
  if (!c) throw error(404, 'Campeonato no encontrado');
  if (c.estado === 'finalizado') throw error(409, 'Ese campeonato ya está finalizado');
  await db.run("UPDATE campeonatos SET estado = 'finalizado', finalizado_at = datetime('now') WHERE id = ?", [id]);
  return obtenerPorId(id);
}

async function renombrar(id, nombre) {
  if (!nombre || !String(nombre).trim()) throw error(400, 'El nombre del campeonato es obligatorio');
  const c = await obtenerPorId(id);
  if (!c) throw error(404, 'Campeonato no encontrado');
  await db.run('UPDATE campeonatos SET nombre = ? WHERE id = ?', [String(nombre).trim(), id]);
  return obtenerPorId(id);
}

module.exports = { listar, obtenerPorId, obtenerActivo, resolverParaLectura, crear, finalizar, renombrar };
