const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

const SELECT_PARTIDOS = `
  SELECT
    p.id, p.grupo, p.fecha,
    p.local_id  AS localId,  l.nombre AS local,
    p.visita_id AS visitaId, v.nombre AS visita,
    p.goles_local AS golesLocal, p.goles_visita AS golesVisita,
    p.estado, p.updated_at AS updatedAt
  FROM partidos p
  JOIN equipos l ON l.id = p.local_id
  JOIN equipos v ON v.id = p.visita_id
`;

router.get('/', asyncHandler(async (req, res) => {
  const { grupo, fecha } = req.query;
  const condiciones = [];
  const params = [];
  if (grupo) { condiciones.push('p.grupo = ?'); params.push(grupo); }
  if (fecha) { condiciones.push('p.fecha = ?'); params.push(Number(fecha)); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const partidos = await db.all(`${SELECT_PARTIDOS} ${where} ORDER BY p.grupo, p.fecha, p.id`, params);
  res.json(partidos);
}));

router.get('/libres', asyncHandler(async (req, res) => {
  const { grupo, fecha } = req.query;
  const condiciones = [];
  const params = [];
  if (grupo) { condiciones.push('b.grupo = ?'); params.push(grupo); }
  if (fecha) { condiciones.push('b.fecha = ?'); params.push(Number(fecha)); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const libres = await db.all(`
    SELECT b.grupo, b.fecha, b.equipo_id AS equipoId, e.nombre
    FROM byes b JOIN equipos e ON e.id = b.equipo_id
    ${where}
    ORDER BY b.grupo, b.fecha
  `, params);
  res.json(libres);
}));

const ESTADOS_VALIDOS = ['programado', 'jugado', 'aplazado'];

// Cualquier usuario autenticado (admin o encargado) puede cargar/editar resultados.
router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const partido = await db.get('SELECT * FROM partidos WHERE id = ?', [id]);
  if (!partido) return res.status(404).json({ error: 'Partido no encontrado' });

  let { golesLocal, golesVisita, estado } = req.body || {};
  estado = estado || (golesLocal !== undefined && golesVisita !== undefined ? 'jugado' : partido.estado);

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  if (estado === 'jugado') {
    const gl = Number(golesLocal);
    const gv = Number(golesVisita);
    if (!Number.isInteger(gl) || gl < 0 || !Number.isInteger(gv) || gv < 0) {
      return res.status(400).json({ error: 'Los goles deben ser números enteros mayores o iguales a 0' });
    }
    await db.run(`
      UPDATE partidos SET goles_local = ?, goles_visita = ?, estado = 'jugado',
        updated_by = ?, updated_at = datetime('now') WHERE id = ?
    `, [gl, gv, req.usuario.id, id]);
  } else {
    // 'programado' o 'aplazado' -> no cuenta como jugado, se limpian los goles
    await db.run(`
      UPDATE partidos SET goles_local = NULL, goles_visita = NULL, estado = ?,
        updated_by = ?, updated_at = datetime('now') WHERE id = ?
    `, [estado, req.usuario.id, id]);
  }

  const actualizado = await db.get(`${SELECT_PARTIDOS} WHERE p.id = ?`, [id]);
  res.json(actualizado);
}));

module.exports = router;
