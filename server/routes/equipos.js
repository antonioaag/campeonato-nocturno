const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { grupo } = req.query;
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  let equipos;
  if (grupo) {
    equipos = await db.all('SELECT * FROM equipos WHERE serie = ? AND grupo = ? ORDER BY orden', [serie, grupo]);
  } else {
    equipos = await db.all('SELECT * FROM equipos WHERE serie = ? ORDER BY grupo, orden', [serie]);
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
