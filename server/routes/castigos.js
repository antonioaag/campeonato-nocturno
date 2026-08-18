const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esRutValido, formatearRut } = require('../rut');
const { normalizarFecha } = require('../csv');

const router = express.Router();

const SELECT_CASTIGOS = `
  SELECT c.id, c.nombre, c.rut, c.equipo_id AS equipoId, e.nombre AS equipo, e.serie, e.grupo,
         c.infraccion, c.castigo, c.fecha_castigo AS fechaCastigo, c.estado
  FROM castigos c JOIN equipos e ON e.id = c.equipo_id
`;

// Pública: cualquiera puede ver el listado de castigados.
router.get('/', asyncHandler(async (req, res) => {
  const { serie, equipoId, estado } = req.query;
  const condiciones = [];
  const params = [];
  if (serie) { condiciones.push('e.serie = ?'); params.push(serie); }
  if (equipoId) { condiciones.push('c.equipo_id = ?'); params.push(Number(equipoId)); }
  if (estado) { condiciones.push('c.estado = ?'); params.push(estado); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const castigos = await db.all(`${SELECT_CASTIGOS} ${where} ORDER BY c.fecha_castigo DESC, c.id DESC`, params);
  res.json(castigos);
}));

function validarCastigo({ nombre, rut, infraccion, castigo, fechaCastigo }) {
  if (!nombre || !nombre.trim()) return 'El nombre es obligatorio';
  if (!esRutValido(rut)) return `RUT inválido: ${rut}`;
  if (!infraccion || !infraccion.trim()) return 'La infracción es obligatoria';
  if (!castigo || !castigo.trim()) return 'El castigo es obligatorio';
  if (!normalizarFecha(fechaCastigo)) return `Fecha de castigo inválida: ${fechaCastigo}`;
  return null;
}

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { equipoId, nombre, rut, infraccion, castigo, fechaCastigo } = req.body || {};
  const equipo = await db.get('SELECT id FROM equipos WHERE id = ?', [Number(equipoId)]);
  if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });

  const error = validarCastigo({ nombre, rut, infraccion, castigo, fechaCastigo });
  if (error) return res.status(400).json({ error });

  const info = await db.run(`
    INSERT INTO castigos (nombre, rut, equipo_id, infraccion, castigo, fecha_castigo, estado)
    VALUES (?, ?, ?, ?, ?, ?, 'vigente')
  `, [nombre.trim(), formatearRut(rut), Number(equipoId), infraccion.trim(), castigo.trim(), normalizarFecha(fechaCastigo)]);

  const creado = await db.get(`${SELECT_CASTIGOS} WHERE c.id = ?`, [info.lastInsertRowid]);
  res.status(201).json(creado);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const actual = await db.get('SELECT * FROM castigos WHERE id = ?', [id]);
  if (!actual) return res.status(404).json({ error: 'Castigo no encontrado' });

  const nombre = req.body.nombre !== undefined ? req.body.nombre : actual.nombre;
  const rut = req.body.rut !== undefined ? req.body.rut : actual.rut;
  const infraccion = req.body.infraccion !== undefined ? req.body.infraccion : actual.infraccion;
  const castigo = req.body.castigo !== undefined ? req.body.castigo : actual.castigo;
  const fechaCastigo = req.body.fechaCastigo !== undefined ? req.body.fechaCastigo : actual.fecha_castigo;
  const estado = req.body.estado !== undefined ? req.body.estado : actual.estado;

  if (!['vigente', 'cumplido'].includes(estado)) {
    return res.status(400).json({ error: "estado debe ser 'vigente' o 'cumplido'" });
  }
  const error = validarCastigo({ nombre, rut, infraccion, castigo, fechaCastigo });
  if (error) return res.status(400).json({ error });

  await db.run(`
    UPDATE castigos SET nombre = ?, rut = ?, infraccion = ?, castigo = ?, fecha_castigo = ?, estado = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [nombre.trim(), formatearRut(rut), infraccion.trim(), castigo.trim(), normalizarFecha(fechaCastigo), estado, id]);

  const actualizado = await db.get(`${SELECT_CASTIGOS} WHERE c.id = ?`, [id]);
  res.json(actualizado);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const info = await db.run('DELETE FROM castigos WHERE id = ?', [id]);
  if (info.changes === 0) return res.status(404).json({ error: 'Castigo no encontrado' });
  res.json({ ok: true });
}));

module.exports = router;
