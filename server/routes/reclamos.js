const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');
const { leerBooleano, claveResolucionesPublicas } = require('../configuracion');

const router = express.Router();

const SELECT_RECLAMOS = `
  SELECT
    rc.id, rc.serie, rc.partido_id AS partidoId,
    rc.club_id AS clubId, c.nombre AS club,
    rc.motivo, rc.articulo,
    rc.fecha_presentacion AS fechaPresentacion, rc.estado,
    rc.resolucion_texto AS resolucionTexto,
    rc.fecha_resolucion AS fechaResolucion,
    rc.resolucion_id AS resolucionId,
    ur.nombre AS resueltoPor, uc.nombre AS ingresadoPor,
    rc.creado_at AS creadoAt,
    pl.nombre AS partidoLocal, pv.nombre AS partidoVisita,
    p.goles_local AS golesLocal, p.goles_visita AS golesVisita,
    p.fecha_partido AS fechaPartido
  FROM reclamos rc
  JOIN equipos c        ON c.id = rc.club_id
  LEFT JOIN usuarios ur ON ur.id = rc.resuelto_por
  LEFT JOIN usuarios uc ON uc.id = rc.creado_por
  LEFT JOIN partidos p  ON p.id = rc.partido_id
  LEFT JOIN equipos pl  ON pl.id = p.local_id
  LEFT JOIN equipos pv  ON pv.id = p.visita_id
`;

const ESTADOS = ['presentado', 'aceptado', 'rechazado'];

// Un reclamo rechazado también es información que da transparencia, así que
// una vez publicado el registro lo puede leer cualquiera. Mientras el registro
// de la serie siga oculto, solo lo ve el admin.
router.get('/', authOpcional, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const publico = await leerBooleano(claveResolucionesPublicas(serie), false);
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
  if (!publico && !esAdmin) return res.json([]);

  const condiciones = ['rc.serie = ?'];
  const params = [serie];
  if (req.query.estado) {
    if (!ESTADOS.includes(req.query.estado)) {
      return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS.join(', ')}` });
    }
    condiciones.push('rc.estado = ?');
    params.push(req.query.estado);
  }

  res.json(await db.all(
    `${SELECT_RECLAMOS} WHERE ${condiciones.join(' AND ')}
     ORDER BY rc.fecha_presentacion DESC, rc.id DESC`,
    params
  ));
}));

// Ingresar un reclamo. Basta con estar autenticado: los encargados reciben los
// reclamos de los clubes y los registran, aunque no puedan resolverlos.
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { serie, partidoId, clubId, motivo, articulo, fechaPresentacion } = req.body || {};
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  if (!motivo || !String(motivo).trim()) return res.status(400).json({ error: 'El motivo del reclamo es obligatorio' });
  if (!fechaPresentacion || !/^\d{4}-\d{2}-\d{2}$/.test(String(fechaPresentacion).trim())) {
    return res.status(400).json({ error: 'La fecha de presentación es obligatoria y debe tener formato YYYY-MM-DD' });
  }

  const club = await db.get('SELECT id, serie FROM equipos WHERE id = ?', [Number(clubId)]);
  if (!club) return res.status(400).json({ error: 'Club reclamante no encontrado' });
  if (club.serie !== serie) return res.status(400).json({ error: 'El club no pertenece a esa serie' });

  if (partidoId) {
    const partido = await db.get('SELECT id, serie FROM partidos WHERE id = ?', [Number(partidoId)]);
    if (!partido) return res.status(400).json({ error: 'Partido no encontrado' });
    if (partido.serie !== serie) return res.status(400).json({ error: 'El partido no pertenece a esa serie' });
  }

  const info = await db.run(`
    INSERT INTO reclamos (serie, partido_id, club_id, motivo, articulo, fecha_presentacion, estado, creado_por)
    VALUES (?, ?, ?, ?, ?, ?, 'presentado', ?)
  `, [
    serie, partidoId ? Number(partidoId) : null, Number(clubId),
    String(motivo).trim(), articulo ? String(articulo).trim() : null,
    String(fechaPresentacion).trim(), req.usuario.id,
  ]);

  res.status(201).json(await db.get(`${SELECT_RECLAMOS} WHERE rc.id = ?`, [Number(info.lastInsertRowid)]));
}));

// Resolver un reclamo (aceptarlo o rechazarlo). Solo admin.
// Aceptarlo no aplica la sanción por sí solo: la resolución se emite aparte y
// se enlaza aquí con resolucionId. Así queda explícito qué reclamo originó qué
// sanción, y un reclamo puede aceptarse sin que necesariamente cambie la tabla.
router.post('/:id/resolver', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { estado, resolucionTexto, fechaResolucion, resolucionId } = req.body || {};

  if (!['aceptado', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: "estado debe ser 'aceptado' o 'rechazado'" });
  }
  if (!resolucionTexto || !String(resolucionTexto).trim()) {
    return res.status(400).json({ error: 'Hay que escribir el fundamento de la resolución' });
  }
  if (!fechaResolucion || !/^\d{4}-\d{2}-\d{2}$/.test(String(fechaResolucion).trim())) {
    return res.status(400).json({ error: 'La fecha de la resolución es obligatoria y debe tener formato YYYY-MM-DD' });
  }

  const reclamo = await db.get('SELECT id, estado, serie FROM reclamos WHERE id = ?', [id]);
  if (!reclamo) return res.status(404).json({ error: 'Reclamo no encontrado' });
  if (reclamo.estado !== 'presentado') {
    return res.status(409).json({ error: `Ese reclamo ya fue ${reclamo.estado}` });
  }

  if (resolucionId) {
    const resolucion = await db.get('SELECT id, serie FROM resoluciones WHERE id = ?', [Number(resolucionId)]);
    if (!resolucion) return res.status(400).json({ error: 'La resolución enlazada no existe' });
    if (resolucion.serie !== reclamo.serie) {
      return res.status(400).json({ error: 'La resolución enlazada es de otra serie' });
    }
  }

  await db.run(`
    UPDATE reclamos
    SET estado = ?, resolucion_texto = ?, fecha_resolucion = ?, resuelto_por = ?, resolucion_id = ?
    WHERE id = ?
  `, [
    estado, String(resolucionTexto).trim(), String(fechaResolucion).trim(),
    req.usuario.id, resolucionId ? Number(resolucionId) : null, id,
  ]);

  res.json(await db.get(`${SELECT_RECLAMOS} WHERE rc.id = ?`, [id]));
}));

module.exports = router;
