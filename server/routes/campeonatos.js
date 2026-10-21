const express = require('express');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const campeonatos = require('../campeonatos');

const router = express.Router();

// Pública: es la portada de la asociación. El visitante ve los campeonatos
// publicados; el admin ve también los que todavía están ocultos.
router.get('/', authOpcional, asyncHandler(async (req, res) => {
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
  res.json(await campeonatos.listar({ esAdmin }));
}));

router.get('/activo', authOpcional, asyncHandler(async (req, res) => {
  const activo = await campeonatos.obtenerActivo();
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
  if (!activo.publico && !esAdmin) return res.status(404).json({ error: 'Campeonato no encontrado' });
  res.json(activo);
}));

// Crea el campeonato nuevo y lo deja activo. Falla si ya hay uno activo:
// primero hay que finalizar el actual.
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const creado = await campeonatos.crear(req.body && req.body.nombre, req.body && req.body.formato);
  res.status(201).json(creado);
}));

// Hasta qué fecha ve el público el fixture (null = todas). Solo admin.
router.post('/:id/fechas-visibles', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await campeonatos.definirFechasVisibles(Number(req.params.id), req.body && req.body.hasta));
}));

// Publica u oculta un campeonato en curso. Mientras está oculto, solo el
// admin lo ve en la portada y puede consultar su fixture, tabla, etc.
router.post('/:id/publicar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await campeonatos.publicar(Number(req.params.id), !!(req.body && req.body.publico)));
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
