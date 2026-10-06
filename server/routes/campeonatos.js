const express = require('express');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');
const campeonatos = require('../campeonatos');

const router = express.Router();

// Pública: cualquiera puede ver qué campeonatos existen (para elegir cuál
// consultar). La lista es liviana a propósito.
router.get('/', asyncHandler(async (req, res) => {
  res.json(await campeonatos.listar());
}));

router.get('/activo', asyncHandler(async (req, res) => {
  res.json(await campeonatos.obtenerActivo());
}));

// Crea el campeonato nuevo y lo deja activo. Falla si ya hay uno activo:
// primero hay que finalizar el actual.
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const creado = await campeonatos.crear(req.body && req.body.nombre);
  res.status(201).json(creado);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const actualizado = await campeonatos.renombrar(Number(req.params.id), req.body && req.body.nombre);
  res.json(actualizado);
}));

// Cierra el campeonato: a partir de acá queda de solo lectura.
router.post('/:id/finalizar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const finalizado = await campeonatos.finalizar(Number(req.params.id));
  res.json(finalizado);
}));

module.exports = router;
