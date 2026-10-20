const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { generarRoundRobin } = require('../fixtureGenerator');
const { sortearYGuardar } = require('../sorteo');
const asyncHandler = require('../asyncHandler');
const { esGrupoValido, esSerieValida } = require('../series');
const { campeonatoDeLaPeticion, exigirEditable, DEL_CAMPEONATO, LIBRE_DEL_CAMPEONATO } = require('../campeonatos');

const router = express.Router();

// Todas las rutas de este archivo escriben: solo admin y nunca sobre un
// campeonato finalizado.
router.use(requireAuth, requireAdmin, campeonatoDeLaPeticion, (req, res, next) => {
  try {
    exigirEditable(req.campeonato);
    next();
  } catch (e) {
    next(e);
  }
});

// Regenera el fixture completo de un grupo a partir del orden actual de los
// equipos (columna 'orden' en la tabla equipos). ATENCIÓN: borra todos los
// partidos y resultados existentes de ese grupo (misma serie y campeonato).
router.post('/generar', asyncHandler(async (req, res) => {
  const { grupo } = req.body || {};
  const serie = (req.body && req.body.serie) || 'ADULTO';
  if (!esGrupoValido(serie, grupo)) {
    return res.status(400).json({ error: `grupo '${grupo}' inválido para la serie '${serie}'` });
  }
  const campeonatoId = req.campeonato.id;

  const equipos = await db.all(
    'SELECT id FROM equipos WHERE campeonato_id = ? AND serie = ? AND grupo = ? ORDER BY orden',
    [campeonatoId, serie, grupo]
  );
  const listaIds = equipos.map(e => e.id);
  if (listaIds.length % 2 !== 0) listaIds.push('LIBRE');

  const { partidos, byes } = generarRoundRobin(listaIds);

  const statements = [
    { sql: `DELETE FROM partidos WHERE ${DEL_CAMPEONATO} AND serie = ? AND grupo = ?`, args: [campeonatoId, serie, grupo] },
    { sql: `DELETE FROM byes WHERE ${LIBRE_DEL_CAMPEONATO} AND serie = ? AND grupo = ?`, args: [campeonatoId, serie, grupo] },
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

// Sorteo de Liga Dávila: cada equipo juega una cantidad fija de partidos (no
// todos contra todos) y queda libre una fecha. Ver server/sorteo.js. La
// semilla queda en la respuesta para poder publicarla junto al fixture.
router.post('/sortear', asyncHandler(async (req, res) => {
  const { serie, fechaInicio, semilla } = req.body || {};
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  res.json(await sortearYGuardar(req.campeonato.id, serie, { fechaInicio, semilla }));
}));

// Corre el calendario cuando se suspende un día (lluvia, cancha): todo lo
// que no se jugó desde 'desde' en adelante, en todas las series del
// campeonato, se mueve 'dias' días. Va por día calendario y no por número de
// fecha porque la suspensión es del día: afecta a todas las series que
// jugaban ese viernes. Los partidos jugados no se mueven: su día es historia.
router.post('/correr-dias', asyncHandler(async (req, res) => {
  const { desde } = req.body || {};
  const dias = Number((req.body && req.body.dias) || 7);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(desde || ''))) {
    return res.status(400).json({ error: 'desde debe tener formato YYYY-MM-DD' });
  }
  if (!Number.isInteger(dias) || dias < 1 || dias > 60) {
    return res.status(400).json({ error: 'dias debe ser un entero entre 1 y 60' });
  }
  // Solo las fechas en formato ISO: las escritas a mano de otra forma no se
  // pueden comparar ni sumar con seguridad, y se dejan como están.
  const info = await db.run(`
    UPDATE partidos SET fecha_partido = date(fecha_partido, ?)
    WHERE ${DEL_CAMPEONATO} AND estado != 'jugado'
      AND fecha_partido GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND fecha_partido >= ?
  `, [`+${dias} days`, req.campeonato.id, desde]);
  res.json({ ok: true, partidosMovidos: info.changes });
}));

// Deja todos los partidos de un grupo (misma serie) como 'programado' (sin
// resultado), sin tocar la estructura del fixture ni los nombres de
// equipos/usuarios.
router.post('/reiniciar-resultados', asyncHandler(async (req, res) => {
  const { grupo } = req.body || {};
  const serie = (req.body && req.body.serie) || 'ADULTO';
  if (!esGrupoValido(serie, grupo)) {
    return res.status(400).json({ error: `grupo '${grupo}' inválido para la serie '${serie}'` });
  }
  const info = await db.run(`
    UPDATE partidos SET goles_local = NULL, goles_visita = NULL, estado = 'programado',
      updated_by = NULL, updated_at = NULL WHERE ${DEL_CAMPEONATO} AND serie = ? AND grupo = ?
  `, [req.campeonato.id, serie, grupo]);
  res.json({ ok: true, partidosActualizados: info.changes });
}));

module.exports = router;
