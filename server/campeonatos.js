// Administración de campeonatos (ediciones del torneo: Apertura 2026,
// Clausura 2026, etc.). Siempre hay como máximo un campeonato 'activo' a la
// vez; el resto queda 'finalizado' y de solo lectura.
const db = require('./db');
const { leerBooleano, escribir, claveCampeonatoPublico } = require('./configuracion');

// Formato de la fase final. Va guardado en el campeonato y no se deduce del
// nombre de la serie: SENIOR existe en el Nocturno 2026 (3 grupos, cuartos con
// mejores terceros) y en Clausura 2026 (grupo único, semifinales), y la misma
// serie no puede clasificar de dos maneras según quién pregunte.
//   'cuartos': Nocturno 2026. 8 clasificados a cuartos, cruces por serie.
//   'semis':   Liga Dávila desde Clausura 2026. Los 4 primeros de la tabla a
//              semifinales (1º vs 4º y 2º vs 3º) y después la final.
const FORMATOS = ['cuartos', 'semis'];

function error(status, mensaje) {
  return Object.assign(new Error(mensaje), { status });
}

// Condición SQL para quedarse con los partidos (o libres) de un campeonato.
// partidos y byes no guardan el campeonato: se sabe por el equipo. Sin alias
// de tabla para que sirva igual en un SELECT que en un DELETE; en byes la
// columna equivalente es equipo_id.
const DEL_CAMPEONATO = 'local_id IN (SELECT id FROM equipos WHERE campeonato_id = ?)';
const LIBRE_DEL_CAMPEONATO = 'equipo_id IN (SELECT id FROM equipos WHERE campeonato_id = ?)';

const SELECT_CAMPEONATO = `
  SELECT id, nombre, estado, formato, creado_at AS creadoAt, finalizado_at AS finalizadoAt
  FROM campeonatos
`;

// Se adjunta si está publicado y qué series tiene. Las series salen de los
// equipos inscritos, igual que los grupos: no hay una lista aparte que pueda
// quedar desactualizada.
async function completar(c) {
  if (!c) return c;
  const series = await db.all(
    'SELECT serie, COUNT(*) AS equipos FROM equipos WHERE campeonato_id = ? GROUP BY serie',
    [c.id]
  );
  return {
    ...c,
    publico: await esPublico(c),
    series: series.map(s => ({ serie: s.serie, equipos: Number(s.equipos) })),
  };
}

// Un campeonato finalizado ya se jugó a la vista de todos: siempre es
// público. Uno en curso nace oculto y el admin lo publica cuando está listo.
async function esPublico(c) {
  if (c.estado === 'finalizado') return true;
  return leerBooleano(claveCampeonatoPublico(c.id), false);
}

async function listar({ esAdmin = false } = {}) {
  const todos = await Promise.all((await db.all(`${SELECT_CAMPEONATO} ORDER BY id DESC`)).map(completar));
  return esAdmin ? todos : todos.filter(c => c.publico);
}

async function obtenerPorId(id) {
  return completar(await db.get(`${SELECT_CAMPEONATO} WHERE id = ?`, [id]));
}

async function obtenerActivo() {
  const activo = await db.get(`${SELECT_CAMPEONATO} WHERE estado = 'activo'`);
  if (!activo) throw error(409, 'No hay un campeonato activo. Un admin debe crear uno.');
  return completar(activo);
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

// Middleware: deja en req.campeonato el campeonato sobre el que se pregunta.
// El front lo manda en la cabecera X-Campeonato-Id en cada llamada (también
// se acepta ?campeonatoId=); sin ninguno de los dos se usa el activo.
//
// Va después de authOpcional o requireAuth, porque un campeonato oculto
// solo existe para el admin: para cualquier otro se responde 404, igual que
// si no existiera, y así no se filtra ni el fixture ni la tabla por una ruta
// que alguien olvidó proteger.
async function campeonatoDeLaPeticion(req, res, next) {
  try {
    const pedido = req.get('X-Campeonato-Id') || req.query.campeonatoId;
    const c = await resolverParaLectura(pedido);
    const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
    if (!c.publico && !esAdmin) throw error(404, 'Campeonato no encontrado');
    req.campeonato = c;
    next();
  } catch (e) {
    next(e);
  }
}

// Un campeonato finalizado es de solo lectura. Se comprueba en el backend en
// cada escritura, no solo escondiendo botones: el resultado de un torneo ya
// terminado no puede cambiar por un clic en la pestaña equivocada.
function exigirEditable(campeonato) {
  if (!campeonato) throw error(404, 'Campeonato no encontrado');
  if (campeonato.estado === 'finalizado') {
    throw error(403, `${campeonato.nombre} ya está finalizado y es de solo lectura`);
  }
}

// Campeonato al que pertenece un equipo, para las escrituras que llegan con
// el id de un partido o de un equipo y no con el campeonato.
async function deEquipo(equipoId) {
  const fila = await db.get('SELECT campeonato_id AS id FROM equipos WHERE id = ?', [equipoId]);
  return fila ? obtenerPorId(fila.id) : null;
}

async function publicar(id, publico) {
  const c = await obtenerPorId(id);
  if (!c) throw error(404, 'Campeonato no encontrado');
  if (c.estado === 'finalizado') throw error(409, 'Un campeonato finalizado es siempre público');
  await escribir(claveCampeonatoPublico(id), publico ? '1' : '0');
  return obtenerPorId(id);
}

async function crear(nombre, formato = 'semis') {
  if (!nombre || !String(nombre).trim()) throw error(400, 'El nombre del campeonato es obligatorio');
  if (!FORMATOS.includes(formato)) throw error(400, `formato debe ser uno de: ${FORMATOS.join(', ')}`);
  const yaActivo = await db.get("SELECT id FROM campeonatos WHERE estado = 'activo'");
  if (yaActivo) throw error(409, 'Ya hay un campeonato activo. Hay que finalizarlo antes de crear uno nuevo.');
  const info = await db.run("INSERT INTO campeonatos (nombre, estado, formato) VALUES (?, 'activo', ?)", [String(nombre).trim(), formato]);
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

module.exports = {
  FORMATOS, DEL_CAMPEONATO, LIBRE_DEL_CAMPEONATO, listar, obtenerPorId, obtenerActivo, resolverParaLectura, campeonatoDeLaPeticion,
  exigirEditable, deEquipo, publicar, crear, finalizar, renombrar,
};
