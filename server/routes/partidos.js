const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');
const { ajustesVigentes } = require('../resoluciones');

const router = express.Router();

const SELECT_PARTIDOS = `
  SELECT
    p.id, p.serie, p.grupo, p.fecha,
    p.local_id  AS localId,  l.nombre AS local,
    p.visita_id AS visitaId, v.nombre AS visita,
    p.goles_local AS golesLocal, p.goles_visita AS golesVisita,
    p.estado, p.updated_at AS updatedAt,
    p.fecha_partido AS fechaPartido, p.hora, p.estadio, p.turno
  FROM partidos p
  JOIN equipos l ON l.id = p.local_id
  JOIN equipos v ON v.id = p.visita_id
`;

router.get('/', asyncHandler(async (req, res) => {
  const { grupo, fecha } = req.query;
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  // Solo fase de grupos: el cuadro de eliminación directa se sirve por
  // /api/playoffs y no debe mezclarse con las jornadas de los grupos.
  const condiciones = ['p.serie = ?', "p.fase = 'grupos'"];
  const params = [serie];
  if (grupo) { condiciones.push('p.grupo = ?'); params.push(grupo); }
  if (fecha) { condiciones.push('p.fecha = ?'); params.push(Number(fecha)); }
  const where = `WHERE ${condiciones.join(' AND ')}`;
  const partidos = await db.all(`${SELECT_PARTIDOS} ${where} ORDER BY p.grupo, p.fecha, p.id`, params);

  // Se adjunta la homologación vigente, si la hay. El marcador de cancha viaja
  // intacto en golesLocal/golesVisita; el resuelto por el tribunal va aparte,
  // para que la interfaz pueda mostrar los dos y explicar la diferencia.
  const { porPartido } = await ajustesVigentes(serie);
  partidos.forEach(p => { p.homologacion = porPartido[p.id] || null; });

  res.json(partidos);
}));

router.get('/libres', asyncHandler(async (req, res) => {
  const { grupo, fecha } = req.query;
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const condiciones = ['b.serie = ?'];
  const params = [serie];
  if (grupo) { condiciones.push('b.grupo = ?'); params.push(grupo); }
  if (fecha) { condiciones.push('b.fecha = ?'); params.push(Number(fecha)); }
  const where = `WHERE ${condiciones.join(' AND ')}`;
  const libres = await db.all(`
    SELECT b.serie, b.grupo, b.fecha, b.equipo_id AS equipoId, e.nombre
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

  let { golesLocal, golesVisita, estado, penalesLocal, penalesVisita } = req.body || {};
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

    // Penales: solo tienen sentido en eliminación directa y con el partido
    // empatado. El marcador de los 90 minutos se guarda igual.
    const hayPenales = penalesLocal !== undefined && penalesLocal !== null && penalesLocal !== ''
      && penalesVisita !== undefined && penalesVisita !== null && penalesVisita !== '';
    let pl = null;
    let pv = null;
    if (hayPenales) {
      if (partido.fase === 'grupos') {
        return res.status(400).json({ error: 'Los penales solo se usan en la fase de eliminación directa' });
      }
      if (gl !== gv) {
        return res.status(400).json({ error: 'Solo se cargan penales cuando el partido termina empatado' });
      }
      pl = Number(penalesLocal);
      pv = Number(penalesVisita);
      if (!Number.isInteger(pl) || pl < 0 || !Number.isInteger(pv) || pv < 0) {
        return res.status(400).json({ error: 'Los penales deben ser números enteros mayores o iguales a 0' });
      }
      if (pl === pv) {
        return res.status(400).json({ error: 'La definición por penales no puede quedar empatada' });
      }
    }

    await db.run(`
      UPDATE partidos SET goles_local = ?, goles_visita = ?, penales_local = ?, penales_visita = ?,
        estado = 'jugado', updated_by = ?, updated_at = datetime('now') WHERE id = ?
    `, [gl, gv, pl, pv, req.usuario.id, id]);
  } else {
    // 'programado' o 'aplazado' -> no cuenta como jugado, se limpian los goles
    await db.run(`
      UPDATE partidos SET goles_local = NULL, goles_visita = NULL,
        penales_local = NULL, penales_visita = NULL, estado = ?,
        updated_by = ?, updated_at = datetime('now') WHERE id = ?
    `, [estado, req.usuario.id, id]);
  }

  const actualizado = await db.get(`${SELECT_PARTIDOS} WHERE p.id = ?`, [id]);
  res.json(actualizado);
}));

// Actualizar detalles del partido (fecha, hora, estadio, turno) - solo admin
const { requireAdmin } = require('../auth');
router.patch('/:id/detalles', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const partido = await db.get('SELECT * FROM partidos WHERE id = ?', [id]);
  if (!partido) return res.status(404).json({ error: 'Partido no encontrado' });

  const { fechaPartido, hora, estadio, turno } = req.body || {};
  const updates = [];
  const params = [];

  if (fechaPartido !== undefined) {
    updates.push('fecha_partido = ?');
    params.push(fechaPartido || null);
  }
  if (hora !== undefined) {
    updates.push('hora = ?');
    params.push(hora || null);
  }
  if (estadio !== undefined) {
    updates.push('estadio = ?');
    params.push(estadio || null);
  }
  if (turno !== undefined) {
    updates.push('turno = ?');
    params.push(turno || null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  params.push(id);
  await db.run(`UPDATE partidos SET ${updates.join(', ')} WHERE id = ?`, params);

  const actualizado = await db.get(`${SELECT_PARTIDOS} WHERE p.id = ?`, [id]);
  res.json(actualizado);
}));

module.exports = router;
