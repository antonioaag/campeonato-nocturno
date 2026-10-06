const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida, esGrupoValido } = require('../series');
const campeonatos = require('../campeonatos');

const router = express.Router();

// Pública: lista los equipos del campeonato activo por defecto, o de un
// campeonato puntual si se pasa ?campeonatoId= (para consultar historial).
router.get('/', authOpcional, asyncHandler(async (req, res) => {
  const { grupo } = req.query;
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const campeonato = await campeonatos.resolverParaLectura(req.query.campeonatoId);

  let equipos;
  if (grupo) {
    equipos = await db.all(
      'SELECT * FROM equipos WHERE campeonato_id = ? AND serie = ? AND grupo = ? ORDER BY orden',
      [campeonato.id, serie, grupo]
    );
  } else {
    equipos = await db.all(
      'SELECT * FROM equipos WHERE campeonato_id = ? AND serie = ? ORDER BY grupo, orden',
      [campeonato.id, serie]
    );
  }
  res.json(equipos);
}));

// Inscribe un equipo nuevo en el campeonato activo. Solo admin: es el alta
// oficial de un club en una serie, no algo que deba poder hacer cualquiera.
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { nombre, serie, grupo } = req.body || {};
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: 'El nombre no puede estar vacío' });
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  if (!esGrupoValido(serie, grupo)) return res.status(400).json({ error: `grupo inválido: ${grupo}` });

  const activo = await campeonatos.obtenerActivo();

  const { siguiente } = await db.get(
    'SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM equipos WHERE campeonato_id = ? AND serie = ? AND grupo = ?',
    [activo.id, serie, grupo]
  );

  const info = await db.run(
    'INSERT INTO equipos (nombre, serie, grupo, orden, campeonato_id) VALUES (?, ?, ?, ?, ?)',
    [String(nombre).trim(), serie, grupo, siguiente, activo.id]
  );
  const creado = await db.get('SELECT * FROM equipos WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(creado);
}));

// Solo admin puede renombrar equipos (evita que cualquier encargado cambie
// el nombre oficial de un club por error).
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre no puede estar vacío' });

  const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [id]);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

  const campeonato = await campeonatos.obtenerPorId(equipo.campeonato_id);
  if (campeonato.estado === 'finalizado') {
    return res.status(403).json({ error: `${campeonato.nombre} ya está finalizado y es de solo lectura` });
  }

  await db.run('UPDATE equipos SET nombre = ? WHERE id = ?', [nombre.trim(), id]);
  res.json({ ...equipo, nombre: nombre.trim() });
}));

// Da de baja un equipo mal inscrito, antes de que tenga partidos o jugadores
// cargados. Una vez que participó de algo, ya no se borra (se corrige con
// una resolución, como todo lo demás): borrarlo dejaría huérfanos partidos,
// resoluciones o castigos que sí importa conservar.
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [id]);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

  const campeonato = await campeonatos.obtenerPorId(equipo.campeonato_id);
  if (campeonato.estado === 'finalizado') {
    return res.status(403).json({ error: `${campeonato.nombre} ya está finalizado y es de solo lectura` });
  }

  const [{ n: partidos }, { n: jugadores }] = await Promise.all([
    db.get('SELECT COUNT(*) AS n FROM partidos WHERE local_id = ? OR visita_id = ?', [id, id]),
    db.get('SELECT COUNT(*) AS n FROM jugadores WHERE equipo_id = ?', [id]),
  ]);
  if (partidos > 0 || jugadores > 0) {
    return res.status(409).json({ error: 'Este equipo ya tiene partidos o jugadores cargados: no se puede eliminar.' });
  }

  await db.run('DELETE FROM equipos WHERE id = ?', [id]);
  res.json({ ok: true });
}));

module.exports = router;
