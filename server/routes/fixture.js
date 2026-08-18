const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { generarRoundRobin } = require('../fixtureGenerator');
const asyncHandler = require('../asyncHandler');
const { esGrupoValido } = require('../series');

const router = express.Router();

// Regenera el fixture completo de un grupo a partir del orden actual de los
// equipos (columna 'orden' en la tabla equipos). ATENCIÓN: borra todos los
// partidos y resultados existentes de ese grupo (misma serie). Solo admin.
router.post('/generar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { grupo } = req.body || {};
  const serie = (req.body && req.body.serie) || 'ADULTO';
  if (!esGrupoValido(serie, grupo)) {
    return res.status(400).json({ error: `grupo '${grupo}' inválido para la serie '${serie}'` });
  }

  const equipos = await db.all('SELECT id FROM equipos WHERE serie = ? AND grupo = ? ORDER BY orden', [serie, grupo]);
  const listaIds = equipos.map(e => e.id);
  if (listaIds.length % 2 !== 0) listaIds.push('LIBRE');

  const { partidos, byes } = generarRoundRobin(listaIds);

  const statements = [
    { sql: 'DELETE FROM partidos WHERE serie = ? AND grupo = ?', args: [serie, grupo] },
    { sql: 'DELETE FROM byes WHERE serie = ? AND grupo = ?', args: [serie, grupo] },
    ...partidos.map(p => ({
      sql: `INSERT INTO partidos (serie, grupo, fecha, local_id, visita_id, estado) VALUES (?, ?, ?, ?, ?, 'programado')`,
      args: [serie, grupo, p.fecha, p.localId, p.visitaId]
    })),
    ...byes.map(b => ({
      sql: 'INSERT INTO byes (serie, grupo, fecha, equipo_id) VALUES (?, ?, ?, ?)',
      args: [serie, grupo, b.fecha, b.equipoId]
    })),
  ];
  await db.batch(statements);

  res.json({ ok: true, partidosGenerados: partidos.length, fechas: listaIds.length - 1 });
}));

// Deja todos los partidos de un grupo (misma serie) como 'programado' (sin
// resultado), sin tocar la estructura del fixture ni los nombres de
// equipos/usuarios. Solo admin.
router.post('/reiniciar-resultados', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { grupo } = req.body || {};
  const serie = (req.body && req.body.serie) || 'ADULTO';
  if (!esGrupoValido(serie, grupo)) {
    return res.status(400).json({ error: `grupo '${grupo}' inválido para la serie '${serie}'` });
  }
  const info = await db.run(`
    UPDATE partidos SET goles_local = NULL, goles_visita = NULL, estado = 'programado',
      updated_by = NULL, updated_at = NULL WHERE serie = ? AND grupo = ?
  `, [serie, grupo]);
  res.json({ ok: true, partidosActualizados: info.changes });
}));

module.exports = router;
