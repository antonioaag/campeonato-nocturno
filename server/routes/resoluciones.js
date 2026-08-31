const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');
const { listar, obtenerPorId, validar } = require('../resoluciones');
const { contarPartidosDeGrupo, efectosDeWalkover, explicarAlcance } = require('../walkover');
const { leerBooleano, escribir, claveResolucionesPublicas } = require('../configuracion');

const router = express.Router();

async function estadoDeVisibilidad(serie, usuario) {
  const publico = await leerBooleano(claveResolucionesPublicas(serie), false);
  const esAdmin = !!(usuario && usuario.rol === 'admin');
  return { publico, esAdmin, visible: publico || esAdmin };
}

// Estado de visibilidad, para que el front decida si muestra la pestaña.
router.get('/estado', authOpcional, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  const { publico, visible } = await estadoDeVisibilidad(serie, req.usuario);
  res.json({ serie, publico, visible });
}));

// El listado de resoluciones es lo que permite auditar la tabla, así que una
// vez publicado lo puede ver cualquiera, incluidas las revocadas. Mientras el
// registro no esté publicado, solo lo ve el admin.
router.get('/', authOpcional, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const { visible } = await estadoDeVisibilidad(serie, req.usuario);
  if (!visible) return res.json([]);

  const soloVigentes = req.query.vigentes === '1';
  res.json(await listar(serie, { soloVigentes }));
}));

// Publica u oculta el registro de sanciones y reclamos de la serie. Solo admin.
router.post('/publicar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const serie = (req.body && req.body.serie) || 'ADULTO';
  const publico = !!(req.body && req.body.publico);
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  await escribir(claveResolucionesPublicas(serie), publico ? '1' : '0');
  res.json({ ok: true, serie, publico });
}));

// Qué pasaría si se registra este WO. Un WO puede anular media fase de grupos,
// así que el admin tiene que poder verlo ANTES de confirmarlo y no descubrirlo
// después mirando la tabla. Solo admin, igual que el registro.
router.get('/walkover/previsualizar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  const partidoId = Number(req.query.partidoId);
  const equipoId = Number(req.query.equipoId);
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const problema = await revisarWalkover(serie, partidoId, equipoId);
  if (problema) return res.status(problema.status).json({ error: problema.error });

  const { jugados, total, corte } = await contarPartidosDeGrupo(equipoId);
  const efectos = await efectosDeWalkover({ equipoId, partidoId, woJugados: jugados, woTotal: total, woCorte: corte });

  // Se traducen los ids a nombres para que la previsualización se pueda leer
  // sin tener que cruzar números a mano.
  const ids = [...efectos.homologaciones.map(h => h.partidoId), ...efectos.anulados];
  const detalles = ids.length ? await db.all(`
    SELECT p.id, l.nombre AS local, v.nombre AS visita, p.estado,
           p.goles_local AS golesLocal, p.goles_visita AS golesVisita
    FROM partidos p
    JOIN equipos l ON l.id = p.local_id
    JOIN equipos v ON v.id = p.visita_id
    WHERE p.id IN (${ids.map(() => '?').join(',')})
  `, ids) : [];
  const porId = {};
  detalles.forEach(d => { porId[d.id] = d; });

  res.json({
    jugados,
    total,
    umbral: corte,
    resultadosValidos: efectos.validos,
    alcance: explicarAlcance(jugados, total, corte),
    homologaciones: efectos.homologaciones.map(h => ({ ...h, partido: porId[h.partidoId] || null })),
    anulados: efectos.anulados.map(id => porId[id] || { id }),
  });
}));

// Comprobaciones comunes a previsualizar y registrar un WO. Devuelve null si
// todo está en orden, o el error a responder.
async function revisarWalkover(serie, partidoId, equipoId) {
  const partido = await db.get('SELECT id, serie, fase, local_id, visita_id FROM partidos WHERE id = ?', [partidoId]);
  if (!partido) return { status: 400, error: 'Partido no encontrado' };
  if (partido.serie !== serie) return { status: 400, error: 'El partido no pertenece a esa serie' };
  if (partido.fase !== 'grupos') {
    return { status: 400, error: 'Por ahora el WO solo se registra en la fase de grupos. En una llave de eliminatorias, homologa el partido a favor del equipo que se presentó.' };
  }
  if (Number(partido.local_id) !== equipoId && Number(partido.visita_id) !== equipoId) {
    return { status: 400, error: 'El equipo que no se presentó tiene que ser uno de los dos de ese partido' };
  }

  const yaFuera = await db.get(
    "SELECT id FROM resoluciones WHERE tipo = 'walkover' AND equipo_id = ? AND estado = 'vigente'",
    [equipoId]
  );
  if (yaFuera) {
    return { status: 409, error: `Ese equipo ya está descalificado por la resolución N°${yaFuera.id}. Un equipo no se descalifica dos veces.` };
  }

  const yaResuelto = await db.get(
    "SELECT id, tipo FROM resoluciones WHERE partido_id = ? AND tipo IN ('partido_homologado','walkover') AND estado = 'vigente'",
    [partidoId]
  );
  if (yaResuelto) {
    return { status: 409, error: `Ese partido ya tiene una resolución vigente (N°${yaResuelto.id}). Revócala antes de emitir otra.` };
  }

  return null;
}

// Registrar una resolución. Solo admin.
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const {
    serie, tipo, origen, equipoId, partidoId, puntosAjuste,
    golesLocalHom, golesVisitaHom, articulo, motivo, numeroActa, fechaResolucion,
  } = req.body || {};

  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const error = validar({
    tipo, origen, equipoId, partidoId, puntosAjuste,
    golesLocalHom, golesVisitaHom, articulo, motivo, fechaResolucion,
  });
  if (error) return res.status(400).json({ error });

  // El equipo o el partido tienen que existir y pertenecer a la serie, para
  // que no se pueda sancionar a un equipo de otro campeonato por error.
  if (tipo === 'descuento_puntos') {
    const equipo = await db.get('SELECT id, serie FROM equipos WHERE id = ?', [Number(equipoId)]);
    if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });
    if (equipo.serie !== serie) return res.status(400).json({ error: 'El equipo no pertenece a esa serie' });
  }

  // El WO congela acá cuántos partidos había jugado el infractor: de ese número
  // depende si sus resultados siguen valiendo, y no puede cambiar después.
  let conteoWo = { jugados: null, total: null, corte: null };
  if (tipo === 'walkover') {
    const problema = await revisarWalkover(serie, Number(partidoId), Number(equipoId));
    if (problema) return res.status(problema.status).json({ error: problema.error });
    conteoWo = await contarPartidosDeGrupo(Number(equipoId));
  }

  let partido = null;
  if (tipo === 'partido_homologado') {
    partido = await db.get('SELECT id, serie FROM partidos WHERE id = ?', [Number(partidoId)]);
    if (!partido) return res.status(400).json({ error: 'Partido no encontrado' });
    if (partido.serie !== serie) return res.status(400).json({ error: 'El partido no pertenece a esa serie' });

    const yaHomologado = await db.get(
      "SELECT id FROM resoluciones WHERE partido_id = ? AND tipo = 'partido_homologado' AND estado = 'vigente'",
      [Number(partidoId)]
    );
    if (yaHomologado) {
      return res.status(409).json({
        error: `Ese partido ya tiene una homologación vigente (resolución N°${yaHomologado.id}). Revócala antes de emitir otra.`,
      });
    }
  }

  const info = await db.run(`
    INSERT INTO resoluciones
      (serie, tipo, origen, equipo_id, partido_id, puntos_ajuste,
       goles_local_hom, goles_visita_hom, articulo, motivo, numero_acta,
       fecha_resolucion, estado, wo_jugados, wo_total, wo_corte, creada_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'vigente', ?, ?, ?, ?)
  `, [
    serie, tipo, origen,
    tipo === 'descuento_puntos' || tipo === 'walkover' ? Number(equipoId) : null,
    tipo === 'partido_homologado' || tipo === 'walkover' ? Number(partidoId) : null,
    tipo === 'descuento_puntos' ? Number(puntosAjuste) : null,
    tipo === 'partido_homologado' ? Number(golesLocalHom) : null,
    tipo === 'partido_homologado' ? Number(golesVisitaHom) : null,
    String(articulo).trim(), String(motivo).trim(),
    numeroActa ? String(numeroActa).trim() : null,
    String(fechaResolucion).trim(),
    conteoWo.jugados, conteoWo.total, conteoWo.corte, req.usuario.id,
  ]);

  res.status(201).json(await obtenerPorId(Number(info.lastInsertRowid)));
}));

// Revocar. No hay PUT ni DELETE a propósito: una resolución no se edita ni se
// borra, se deja sin efecto dejando constancia de quién y por qué.
router.post('/:id/revocar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { motivoRevocacion } = req.body || {};
  if (!motivoRevocacion || !String(motivoRevocacion).trim()) {
    return res.status(400).json({ error: 'Hay que indicar el motivo de la revocación' });
  }

  const actual = await db.get('SELECT id, estado FROM resoluciones WHERE id = ?', [id]);
  if (!actual) return res.status(404).json({ error: 'Resolución no encontrada' });
  if (actual.estado === 'revocada') return res.status(409).json({ error: 'Esa resolución ya está revocada' });

  await db.run(`
    UPDATE resoluciones
    SET estado = 'revocada', revocada_por = ?, revocada_at = datetime('now'), motivo_revocacion = ?
    WHERE id = ?
  `, [req.usuario.id, String(motivoRevocacion).trim(), id]);

  res.json(await obtenerPorId(id));
}));

module.exports = router;
