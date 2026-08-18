const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esRutValido, formatearRut } = require('../rut');
const { csvAJugadores, normalizarFecha } = require('../csv');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const SELECT_JUGADORES = `
  SELECT j.id, j.equipo_id AS equipoId, e.nombre AS equipo, e.serie, e.grupo,
         j.nombre, j.rut, j.fecha_nacimiento AS fechaNacimiento
  FROM jugadores j JOIN equipos e ON e.id = j.equipo_id
`;

router.get('/', asyncHandler(async (req, res) => {
  const { serie, equipoId } = req.query;
  const condiciones = [];
  const params = [];
  if (serie) { condiciones.push('e.serie = ?'); params.push(serie); }
  if (equipoId) { condiciones.push('j.equipo_id = ?'); params.push(Number(equipoId)); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const jugadores = await db.all(`${SELECT_JUGADORES} ${where} ORDER BY e.nombre, j.nombre`, params);
  res.json(jugadores);
}));

function validarJugador({ nombre, rut, fechaNacimiento }) {
  if (!nombre || !nombre.trim()) return 'El nombre es obligatorio';
  if (!esRutValido(rut)) return `RUT inválido: ${rut}`;
  if (!normalizarFecha(fechaNacimiento)) return `Fecha de nacimiento inválida: ${fechaNacimiento}`;
  return null;
}

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { equipoId, nombre, rut, fechaNacimiento } = req.body || {};
  const equipo = await db.get('SELECT id FROM equipos WHERE id = ?', [Number(equipoId)]);
  if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });

  const error = validarJugador({ nombre, rut, fechaNacimiento });
  if (error) return res.status(400).json({ error });

  const info = await db.run(
    'INSERT INTO jugadores (equipo_id, nombre, rut, fecha_nacimiento) VALUES (?, ?, ?, ?)',
    [Number(equipoId), nombre.trim(), formatearRut(rut), normalizarFecha(fechaNacimiento)]
  );
  const creado = await db.get(`${SELECT_JUGADORES} WHERE j.id = ?`, [info.lastInsertRowid]);
  res.status(201).json(creado);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const jugador = await db.get('SELECT * FROM jugadores WHERE id = ?', [id]);
  if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' });

  const nombre = req.body.nombre !== undefined ? req.body.nombre : jugador.nombre;
  const rut = req.body.rut !== undefined ? req.body.rut : jugador.rut;
  const fechaNacimiento = req.body.fechaNacimiento !== undefined ? req.body.fechaNacimiento : jugador.fecha_nacimiento;

  const error = validarJugador({ nombre, rut, fechaNacimiento });
  if (error) return res.status(400).json({ error });

  await db.run(
    'UPDATE jugadores SET nombre = ?, rut = ?, fecha_nacimiento = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [nombre.trim(), formatearRut(rut), normalizarFecha(fechaNacimiento), id]
  );
  const actualizado = await db.get(`${SELECT_JUGADORES} WHERE j.id = ?`, [id]);
  res.json(actualizado);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const info = await db.run('DELETE FROM jugadores WHERE id = ?', [id]);
  if (info.changes === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
  res.json({ ok: true });
}));

// Carga masiva por CSV. Columnas esperadas: Nombre, RUT, Fecha Nacimiento.
// Si el RUT ya existe en ese equipo, actualiza el registro en vez de duplicar.
router.post('/bulk', requireAuth, requireAdmin, upload.single('archivo'), asyncHandler(async (req, res) => {
  const equipoId = Number(req.body.equipoId);
  const equipo = await db.get('SELECT id FROM equipos WHERE id = ?', [equipoId]);
  if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo CSV' });

  let filas;
  try {
    filas = csvAJugadores(req.file.buffer.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const resultado = { agregados: 0, actualizados: 0, errores: [] };

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numeroFila = i + 2; // +1 por índice 0, +1 por encabezado
    const error = validarJugador(fila);
    if (error) { resultado.errores.push(`Fila ${numeroFila}: ${error}`); continue; }

    const rutFormateado = formatearRut(fila.rut);
    const existente = await db.get('SELECT id FROM jugadores WHERE equipo_id = ? AND rut = ?', [equipoId, rutFormateado]);
    if (existente) {
      await db.run(
        'UPDATE jugadores SET nombre = ?, fecha_nacimiento = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [fila.nombre.trim(), normalizarFecha(fila.fechaNacimiento), existente.id]
      );
      resultado.actualizados++;
    } else {
      await db.run(
        'INSERT INTO jugadores (equipo_id, nombre, rut, fecha_nacimiento) VALUES (?, ?, ?, ?)',
        [equipoId, fila.nombre.trim(), rutFormateado, normalizarFecha(fila.fechaNacimiento)]
      );
      resultado.agregados++;
    }
  }

  res.json(resultado);
}));

module.exports = router;
