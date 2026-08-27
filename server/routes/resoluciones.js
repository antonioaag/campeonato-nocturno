const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');
const { listar, obtenerPorId, validar } = require('../resoluciones');
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
       fecha_resolucion, estado, creada_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'vigente', ?)
  `, [
    serie, tipo, origen,
    tipo === 'descuento_puntos' ? Number(equipoId) : null,
    tipo === 'partido_homologado' ? Number(partidoId) : null,
    tipo === 'descuento_puntos' ? Number(puntosAjuste) : null,
    tipo === 'partido_homologado' ? Number(golesLocalHom) : null,
    tipo === 'partido_homologado' ? Number(golesVisitaHom) : null,
    String(articulo).trim(), String(motivo).trim(),
    numeroActa ? String(numeroActa).trim() : null,
    String(fechaResolucion).trim(), req.usuario.id,
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
