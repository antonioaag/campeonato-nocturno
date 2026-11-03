const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const { campeonatoDeLaPeticion, exigirEditable, deEquipo } = require('../campeonatos');
const asyncHandler = require('../asyncHandler');
const { esRutValido, formatearRut, limpiarRut } = require('../rut');
const { csvAJugadores, normalizarFecha } = require('../csv');
const { validarEdadParaSerie, problemasDelJugador, rutParaGuardar, fechaIngresoValida } = require('../inscripcion');
const lector = require('../lectorPlanillas');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_FOTO.includes(file.mimetype)) return cb(new Error('Solo se aceptan fotos JPG, PNG o WEBP'));
    cb(null, true);
  },
});

const SELECT_JUGADORES = `
  SELECT j.id, j.equipo_id AS equipoId, e.nombre AS equipo, e.serie, e.grupo,
         j.nombre, j.rut, j.fecha_nacimiento AS fechaNacimiento,
         j.revisar, j.motivo_revision AS motivoRevision, j.fecha_ingreso AS fechaIngreso
  FROM jugadores j JOIN equipos e ON e.id = j.equipo_id
`;

router.get('/', authOpcional, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const { serie, equipoId, revisar } = req.query;
  const condiciones = ['e.campeonato_id = ?'];
  const params = [req.campeonato.id];
  if (serie) { condiciones.push('e.serie = ?'); params.push(serie); }
  if (equipoId) { condiciones.push('j.equipo_id = ?'); params.push(Number(equipoId)); }
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
  if (revisar && esAdmin) condiciones.push('j.revisar = 1');
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const jugadores = await db.all(`${SELECT_JUGADORES} ${where} ORDER BY e.nombre, j.nombre`, params);
  if (esAdmin) return res.json(jugadores);
  // El campeonato es público, pero la lista trae RUT y fecha de nacimiento
  // (muchos son menores de edad) y los avisos internos de revisión. Quien no
  // es admin ve solo quién juega en cada equipo. El filtro es del servidor:
  // ocultar las columnas en la página no basta, la API las entregaría igual.
  res.json(jugadores.map(j => ({
    id: j.id, equipoId: j.equipoId, equipo: j.equipo, serie: j.serie, grupo: j.grupo, nombre: j.nombre,
  })));
}));

function validarJugador({ nombre, rut, fechaNacimiento }) {
  if (!nombre || !nombre.trim()) return 'El nombre es obligatorio';
  if (!esRutValido(rut)) return `RUT inválido: ${rut}`;
  if (!normalizarFecha(fechaNacimiento)) return `Fecha de nacimiento inválida: ${fechaNacimiento}`;
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

  // "Dar por revisado": la asociación aceptó el caso tal como está (por
  // ejemplo, una excepción de edad acordada en asamblea).
  if (req.body.revisado === true) {
    await db.run(`UPDATE jugadores SET revisar = 0, motivo_revision = NULL, updated_at = datetime('now') WHERE id = ?`, [id]);
    return res.json(await db.get(`${SELECT_JUGADORES} WHERE j.id = ?`, [id]));
  }

  // La fecha de ingreso se corrige sola, sin pasar por la validación del
  // resto: no cambia si el jugador puede o no jugar en la serie.
  if (req.body.fechaIngreso !== undefined) {
    const fechaIngreso = fechaIngresoValida(req.body.fechaIngreso);
    if (!fechaIngreso) return res.status(400).json({ error: 'Fecha de ingreso inválida (no puede ser futura)' });
    await db.run(`UPDATE jugadores SET fecha_ingreso = ?, updated_at = datetime('now') WHERE id = ?`, [fechaIngreso, id]);
    return res.json(await db.get(`${SELECT_JUGADORES} WHERE j.id = ?`, [id]));
  }

  const nombre = req.body.nombre !== undefined ? req.body.nombre : jugador.nombre;
  const rut = req.body.rut !== undefined ? req.body.rut : jugador.rut;
  const fechaNacimiento = req.body.fechaNacimiento !== undefined ? req.body.fechaNacimiento : jugador.fecha_nacimiento;

  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const problemas = await problemasDelJugador(
    { rut, fechaNacimiento },
    { campeonatoId: jugador.equipoCampeonatoId, serie: jugador.equipoSerie }
  );
  // Un jugador sin marca no puede quedar con datos inválidos por una edición;
  // uno que ya estaba marcado sí se puede ir corrigiendo de a un campo.
  if (problemas.length && !jugador.revisar) return res.status(400).json({ error: problemas[0] });

  await db.run(
    `UPDATE jugadores SET nombre = ?, rut = ?, fecha_nacimiento = ?, revisar = ?, motivo_revision = ?,
       updated_at = datetime('now') WHERE id = ?`,
    [String(nombre).trim(), rutParaGuardar(rut), normalizarFecha(fechaNacimiento) || String(fechaNacimiento).trim(),
      problemas.length ? 1 : 0, problemas.length ? problemas.join(' · ') : null, id]
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

// Qué formas de carga están disponibles. La lectura de fotos depende de
// tener una API key de pago; sin ella la página ofrece solo pegar la lista.
router.get('/carga-config', requireAuth, requireAdmin, (req, res) => {
  res.json({ lectorFotos: lector.disponible() });
});

// Revisa filas sin guardarlas: devuelve los equipos del campeonato y, si se
// indica el equipo, los problemas de cada fila contra su serie. La usa la
// vista previa al pegar una lista y al cambiar el equipo de destino, para
// que los avisos se vean antes de guardar y no recién después.
router.post('/validar', requireAuth, requireAdmin, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const { equipoId, jugadores } = req.body || {};
  const equipos = await db.all(
    'SELECT id, nombre, serie, campeonato_id AS campeonatoId FROM equipos WHERE campeonato_id = ? ORDER BY nombre, serie',
    [req.campeonato.id]
  );
  const equipo = equipos.find(e => e.id === Number(equipoId)) || null;
  const problemas = [];
  for (const fila of Array.isArray(jugadores) ? jugadores : []) {
    problemas.push(equipo ? await problemasDelJugador(fila || {}, equipo) : []);
  }
  res.json({ equipos: equipos.map(e => ({ id: e.id, nombre: e.nombre, serie: e.serie })), problemas });
}));

// Lee la foto de una planilla y devuelve una vista previa: no guarda nada.
// El club y la serie se proponen a partir de la hoja y el admin los confirma.
router.post('/leer-foto', requireAuth, requireAdmin, campeonatoDeLaPeticion, uploadFoto.single('foto'), asyncHandler(async (req, res) => {
  exigirEditable(req.campeonato);
  if (!lector.disponible()) {
    return res.status(503).json({ error: 'La lectura de fotos no está configurada (falta ANTHROPIC_API_KEY en el servidor).' });
  }
  if (!req.file) return res.status(400).json({ error: 'Falta la foto' });

  const equipos = await db.all(
    'SELECT id, nombre, serie, campeonato_id AS campeonatoId FROM equipos WHERE campeonato_id = ? ORDER BY nombre, serie',
    [req.campeonato.id]
  );
  const clubes = [...new Set(equipos.map(e => e.nombre))];

  let leido;
  try {
    leido = await lector.leerPlanilla({ imagen: req.file.buffer, tipoMime: req.file.mimetype, clubes });
  } catch (e) {
    console.error('Error leyendo planilla:', e);
    // Los errores propios del lector traen un mensaje para el usuario; los de
    // la API (con status) no, y no conviene mostrarle detalles técnicos.
    return res.status(502).json({ error: e.status ? 'No se pudo leer la foto. Intenta de nuevo en un rato.' : e.message });
  }

  const equipo = equipos.find(e => e.nombre === leido.club && e.serie === leido.serie) || null;
  const jugadores = [];
  for (const j of leido.jugadores) {
    const fechaNacimiento = j.fechaNacimiento || j.fechaTexto;
    const problemas = equipo ? await problemasDelJugador({ rut: j.rut, fechaNacimiento }, equipo) : [];
    jugadores.push({
      nombre: j.nombre,
      rut: j.rut,
      fechaNacimiento,
      fechaTexto: j.fechaTexto,
      nota: j.dudoso ? (j.nota || 'Lectura dudosa') : '',
      problemas,
    });
  }

  res.json({
    clubTexto: leido.clubTexto,
    serieTexto: leido.serieTexto,
    equipoId: equipo ? equipo.id : null,
    equipos: equipos.map(e => ({ id: e.id, nombre: e.nombre, serie: e.serie })),
    jugadores,
  });
}));

// Guarda las filas confirmadas en la vista previa. A diferencia del CSV, una
// fila con problemas no se descarta: se guarda marcada "a revisar" con el
// motivo. Solo se salta una fila sin nombre, porque no hay nada que revisar.
router.post('/lote', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { equipoId, jugadores } = req.body || {};
  const equipo = await db.get('SELECT id, serie, campeonato_id AS campeonatoId FROM equipos WHERE id = ?', [Number(equipoId)]);
  if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });
  exigirEditable(await deEquipo(equipo.id));
  if (!Array.isArray(jugadores) || jugadores.length === 0) return res.status(400).json({ error: 'No hay jugadores para guardar' });
  const fechaIngreso = fechaIngresoValida(req.body.fechaIngreso);
  if (!fechaIngreso) return res.status(400).json({ error: 'Indica la fecha de ingreso de la lista (no puede ser futura)' });

  const resultado = { agregados: 0, actualizados: 0, marcados: 0, errores: [] };
  for (let i = 0; i < jugadores.length; i++) {
    const fila = jugadores[i] || {};
    const nombre = String(fila.nombre || '').trim();
    if (!nombre) { resultado.errores.push(`Fila ${i + 1}: sin nombre, no se guardó`); continue; }

    const problemas = await problemasDelJugador(fila, equipo);
    if (fila.nota && String(fila.nota).trim()) problemas.push(`Observación: ${String(fila.nota).trim()}`);
    const rut = rutParaGuardar(fila.rut);
    const fecha = normalizarFecha(fila.fechaNacimiento) || String(fila.fechaNacimiento || '').trim();
    const revisar = problemas.length ? 1 : 0;
    const motivo = problemas.length ? problemas.join(' · ') : null;

    const existente = await db.get('SELECT id FROM jugadores WHERE equipo_id = ? AND rut = ?', [equipo.id, rut]);
    if (existente) {
      // La fecha de ingreso de un jugador que ya estaba no se pisa: es la
      // base del control de pases, y volver a subir la lista (por ejemplo,
      // para corregir un RUT) no lo vuelve a inscribir.
      await db.run(
        `UPDATE jugadores SET nombre = ?, fecha_nacimiento = ?, revisar = ?, motivo_revision = ?,
           fecha_ingreso = COALESCE(fecha_ingreso, ?), updated_at = datetime('now') WHERE id = ?`,
        [nombre, fecha, revisar, motivo, fechaIngreso, existente.id]
      );
      resultado.actualizados++;
    } else {
      await db.run(
        'INSERT INTO jugadores (equipo_id, nombre, rut, fecha_nacimiento, revisar, motivo_revision, fecha_ingreso) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [equipo.id, nombre, rut, fecha, revisar, motivo, fechaIngreso]
      );
      resultado.agregados++;
    }
    if (revisar) resultado.marcados++;
  }
  res.json(resultado);
}));

function normalizarNombre(nombre) {
  return String(nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Informe de repetidos del campeonato. Un mismo RUT puede inscribirse más de
// una vez (puede estar bien, por ejemplo un juvenil que también juega en
// adultos); el informe es para que la asociación lo vea y decida.
router.get('/repetidos', requireAuth, requireAdmin, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const jugadores = await db.all(`${SELECT_JUGADORES} WHERE e.campeonato_id = ? ORDER BY e.nombre, e.serie, j.nombre`, [req.campeonato.id]);

  const porRut = new Map();
  const porNombre = new Map();
  for (const j of jugadores) {
    const rut = limpiarRut(j.rut);
    if (rut) { if (!porRut.has(rut)) porRut.set(rut, []); porRut.get(rut).push(j); }
    const nombre = normalizarNombre(j.nombre);
    if (nombre) { if (!porNombre.has(nombre)) porNombre.set(nombre, []); porNombre.get(nombre).push(j); }
  }

  const mismoRut = [];
  for (const grupo of porRut.values()) {
    if (grupo.length < 2) continue;
    const tipos = [];
    if (new Set(grupo.map(j => j.equipo)).size > 1) tipos.push('En otro club');
    if (grupo.some(a => grupo.some(b => a.equipo === b.equipo && a.serie !== b.serie))) tipos.push('En otra serie del mismo club');
    if (new Set(grupo.map(j => j.equipoId)).size < grupo.length) tipos.push('Dos veces en el mismo equipo');
    mismoRut.push({ rut: grupo[0].rut, tipos, jugadores: grupo });
  }

  const mismoNombre = [];
  for (const grupo of porNombre.values()) {
    if (new Set(grupo.map(j => limpiarRut(j.rut))).size > 1) mismoNombre.push({ nombre: grupo[0].nombre, jugadores: grupo });
  }

  res.json({ mismoRut, mismoNombre, totalJugadores: jugadores.length });
}));

module.exports = router;
