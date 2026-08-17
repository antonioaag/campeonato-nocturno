const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { generarRoundRobin } = require('../fixtureGenerator');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Regenera el fixture completo de un grupo a partir del orden actual de los
// equipos (columna 'orden' en la tabla equipos). ATENCIÓN: borra todos los
// partidos y resultados existentes de ese grupo. Solo admin.
router.post('/generar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { grupo } = req.body || {};
  if (grupo !== 'A' && grupo !== 'B') {
    return res.status(400).json({ error: "grupo debe ser 'A' o 'B'" });
  }

  const equipos = await db.all('SELECT id FROM equipos WHERE grupo = ? ORDER BY orden', [grupo]);
  const listaIds = equipos.map(e => e.id);
  if (listaIds.length % 2 !== 0) listaIds.push('LIBRE');

  const { partidos, byes } = generarRoundRobin(listaIds);

  const statements = [
    { sql: 'DELETE FROM partidos WHERE grupo = ?', args: [grupo] },
    { sql: 'DELETE FROM byes WHERE grupo = ?', args: [grupo] },
    ...partidos.map(p => ({
      sql: `INSERT INTO partidos (grupo, fecha, local_id, visita_id, estado) VALUES (?, ?, ?, ?, 'programado')`,
      args: [grupo, p.fecha, p.localId, p.visitaId]
    })),
    ...byes.map(b => ({
      sql: 'INSERT INTO byes (grupo, fecha, equipo_id) VALUES (?, ?, ?)',
      args: [grupo, b.fecha, b.equipoId]
    })),
  ];
  await db.batch(statements);

  res.json({ ok: true, partidosGenerados: partidos.length, fechas: listaIds.length - 1 });
}));

// Deja todos los partidos de un grupo como 'programado' (sin resultado),
// sin tocar la estructura del fixture ni los nombres de equipos/usuarios.
// Útil si se cargó mal un resultado masivamente. Solo admin.
router.post('/reiniciar-resultados', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { grupo } = req.body || {};
  if (grupo !== 'A' && grupo !== 'B') {
    return res.status(400).json({ error: "grupo debe ser 'A' o 'B'" });
  }
  const info = await db.run(`
    UPDATE partidos SET goles_local = NULL, goles_visita = NULL, estado = 'programado',
      updated_by = NULL, updated_at = NULL WHERE grupo = ?
  `, [grupo]);
  res.json({ ok: true, partidosActualizados: info.changes });
}));

module.exports = router;
