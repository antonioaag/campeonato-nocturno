const express = require('express');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');
const { calcularTodasLasTablas, marcarClasificados } = require('../tablas');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { grupo } = req.query;
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  // Las marcas de clasificado dependen de comparar los grupos entre sí (los
  // mejores terceros en Senior), así que siempre se calculan todas las tablas
  // y recién después se filtra el grupo pedido.
  const tablas = marcarClasificados(serie, await calcularTodasLasTablas(serie));
  res.json(grupo ? (tablas[grupo] || []) : tablas);
}));

module.exports = router;
