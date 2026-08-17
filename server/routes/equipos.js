const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { grupo } = req.query;
  let equipos;
  if (grupo) {
    equipos = await db.all('SELECT * FROM equipos WHERE grupo = ? ORDER BY orden', [grupo]);
  } else {
    equipos = await db.all('SELECT * FROM equipos ORDER BY grupo, orden');
  }
  res.json(equipos);
}));

// Solo admin puede renombrar equipos (evita que cualquier encargado cambie
// el nombre oficial de un club por error).
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre no puede estar vacío' });

  const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [id]);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

  await db.run('UPDATE equipos SET nombre = ? WHERE id = ?', [nombre.trim(), id]);
  res.json({ ...equipo, nombre: nombre.trim() });
}));

module.exports = router;
