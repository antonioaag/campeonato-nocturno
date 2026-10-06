const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esRutValido, formatearRut } = require('../rut');
const { csvAJugadores, normalizarFecha } = require('../csv');
const { esSerieJuvenil, CORTE_EDAD_REFERENCIA, EDAD_ADULTO_MIN, EDAD_ADULTO_MAX, EDAD_SENIOR_MIN } = require('../series');
const { leer, claveCorteEdad } = require('../configuracion');

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

// Edad contra la serie del equipo (reglamento Liga Dávila, art. 13). Las
// series del campeonato anterior (ADULTO/SENIOR, sin prefijo) ya están
// cerradas y no reciben inscripciones nuevas, así que no se validan acá.
async function validarEdadParaSerie(campeonatoId, serie, fechaNacimiento) {
  const anioNacimiento = Number(String(fechaNacimiento).slice(0, 4));

  if (esSerieJuvenil(serie)) {
    const corteConfigurado = await leer(claveCorteEdad(campeonatoId, serie));
    const corte = corteConfigurado ? Number(corteConfigurado) : CORTE_EDAD_REFERENCIA[serie].anioNacimientoDesde;
    if (anioNacimiento < corte) {
      return `Para ${serie} el jugador debe haber nacido en ${corte} o después (nació en ${anioNacimiento})`;
    }
    return null;
  }

  const hoy = new Date();
  const edad = hoy.getUTCFullYear() - anioNacimiento;

  if (serie === 'SENIOR') {
    if (edad < EDAD_SENIOR_MIN) return `Para Senior el jugador debe tener al menos ${EDAD_SENIOR_MIN} años (tiene ${edad})`;
    return null;
  }
  if (serie === 'PRIMERA_ADULTO' || serie === 'SEGUNDA_ADULTO') {
    if (edad < EDAD_ADULTO_MIN) return `Para ${serie} el jugador debe tener al menos ${EDAD_ADULTO_MIN} años (tiene ${edad})`;
    // Mayores de 39 solo pueden jugar Adulto si vienen de Senior (40+); el
    // reglamento lo permite, así que no se bloquea por edad máxima acá.
    return null;
  }
  return null;
}

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { equipoId, nombre, rut, fechaNacimiento } = req.body || {};
  const equipo = await db.get('SELECT id, serie, campeonato_id AS campeonatoId FROM equipos WHERE id = ?', [Number(equipoId)]);
  if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });

  const error = validarJugador({ nombre, rut, fechaNacimiento });
  if (error) return res.status(400).json({ error });

  const errorEdad = await validarEdadParaSerie(equipo.campeonatoId, equipo.serie, normalizarFecha(fechaNacimiento));
  if (errorEdad) return res.status(400).json({ error: errorEdad });

  const info = await db.run(
    'INSERT INTO jugadores (equipo_id, nombre, rut, fecha_nacimiento) VALUES (?, ?, ?, ?)',
    [Number(equipoId), nombre.trim(), formatearRut(rut), normalizarFecha(fechaNacimiento)]
  );
  const creado = await db.get(`${SELECT_JUGADORES} WHERE j.id = ?`, [info.lastInsertRowid]);
  res.status(201).json(creado);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const jugador = await db.get(
    'SELECT j.*, e.serie AS equipoSerie, e.campeonato_id AS equipoCampeonatoId FROM jugadores j JOIN equipos e ON e.id = j.equipo_id WHERE j.id = ?',
    [id]
  );
  if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' });

  const nombre = req.body.nombre !== undefined ? req.body.nombre : jugador.nombre;
  const rut = req.body.rut !== undefined ? req.body.rut : jugador.rut;
  const fechaNacimiento = req.body.fechaNacimiento !== undefined ? req.body.fechaNacimiento : jugador.fecha_nacimiento;

  const error = validarJugador({ nombre, rut, fechaNacimiento });
  if (error) return res.status(400).json({ error });

  const errorEdad = await validarEdadParaSerie(jugador.equipoCampeonatoId, jugador.equipoSerie, normalizarFecha(fechaNacimiento));
  if (errorEdad) return res.status(400).json({ error: errorEdad });

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
  const equipo = await db.get('SELECT id, serie, campeonato_id AS campeonatoId FROM equipos WHERE id = ?', [equipoId]);
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

    const errorEdad = await validarEdadParaSerie(equipo.campeonatoId, equipo.serie, normalizarFecha(fila.fechaNacimiento));
    if (errorEdad) { resultado.errores.push(`Fila ${numeroFila}: ${errorEdad}`); continue; }

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
