// Castigados de la asociación (ver server/castigados.js). Es un solo registro
// para todos los campeonatos: un castigo largo sigue vigente de un campeonato
// a otro sin traspasarlo a mano.
const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esRutValido, formatearRut } = require('../rut');
const { normalizarFecha } = require('../csv');
const { parsearSancion, normalizarSerie, diasDeCompetencia, evaluar, hoyEnChile } = require('../castigados');

const router = express.Router();
const MULTAS = ['no_aplica', 'pendiente', 'pagada'];

function aRespuesta(c, ev) {
  return {
    id: c.id, rut: c.rut, nombre: c.nombre, club: c.club, serie: c.serie, articulo: c.articulo,
    sancion: c.sancion, tipo: c.tipo, cantidad: c.cantidad, fechaInicio: c.fecha_inicio, origen: c.origen,
    fechasPrevias: c.fechas_previas, multa: c.multa, estadoManual: c.estado_manual, observacion: c.observacion,
    ...ev,
  };
}

// El público ve solo a quienes hoy no pueden jugar, y sin RUT, observación ni
// multa: la lista sirve para que los turnos controlen quién no puede firmar.
// "Falta pago" se le muestra como "pendiente de habilitación", sin detalle.
router.get('/', authOpcional, asyncHandler(async (req, res) => {
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
  const filas = await db.all('SELECT * FROM castigados ORDER BY fecha_inicio DESC, id DESC');
  const dias = await diasDeCompetencia();
  const hoy = hoyEnChile();
  const todos = filas.map(c => aRespuesta(c, evaluar(c, dias, hoy)));
  if (esAdmin) return res.json(todos);
  res.json(todos.filter(c => !c.habilitado).map(c => ({
    id: c.id, nombre: c.nombre, club: c.club, serie: c.serie, articulo: c.articulo, sancion: c.sancion,
    fechaInicio: c.fechaInicio, avance: c.avance, estado: c.estado === 'falta_pago' ? 'pendiente_habilitacion' : c.estado,
  })));
}));

function leerDatos(body, actual = {}) {
  const v = (campo, col) => (body[campo] !== undefined ? body[campo] : actual[col]);
  const datos = {
    nombre: String(v('nombre', 'nombre') || '').trim(),
    rut: String(v('rut', 'rut') || '').trim(),
    club: String(v('club', 'club') || '').trim().toUpperCase(),
    serie: normalizarSerie(v('serie', 'serie')),
    articulo: String(v('articulo', 'articulo') || '').trim() || null,
    sancion: String(v('sancion', 'sancion') || '').trim(),
    fechaInicio: normalizarFecha(v('fechaInicio', 'fecha_inicio')),
    origen: String(v('origen', 'origen') || '').trim() || null,
    fechasPrevias: Number(v('fechasPrevias', 'fechas_previas') || 0),
    multa: v('multa', 'multa') || 'no_aplica',
    estadoManual: v('estadoManual', 'estado_manual') || null,
    observacion: String(v('observacion', 'observacion') || '').trim() || null,
  };
  if (!datos.nombre) return { error: 'El nombre es obligatorio' };
  if (!datos.club) return { error: 'El club es obligatorio' };
  if (!datos.sancion) return { error: 'La sanción es obligatoria' };
  if (!datos.fechaInicio) return { error: 'Fecha de inicio inválida' };
  // El RUT es opcional: hay castigados antiguos registrados sin él.
  if (datos.rut && !esRutValido(datos.rut)) return { error: `RUT inválido: ${datos.rut}` };
  if (!MULTAS.includes(datos.multa)) return { error: 'multa inválida' };
  if (datos.estadoManual && !['vigente', 'cumplido'].includes(datos.estadoManual)) return { error: 'estado inválido' };
  if (!Number.isInteger(datos.fechasPrevias) || datos.fechasPrevias < 0) return { error: 'Fechas ya cumplidas inválidas' };
  datos.rut = datos.rut ? formatearRut(datos.rut) : null;
  Object.assign(datos, parsearSancion(datos.sancion));
  return { datos };
}

const COLUMNAS = 'rut = ?, nombre = ?, club = ?, serie = ?, articulo = ?, sancion = ?, tipo = ?, cantidad = ?, fecha_inicio = ?, origen = ?, fechas_previas = ?, multa = ?, estado_manual = ?, observacion = ?';
const valores = d => [d.rut, d.nombre, d.club, d.serie, d.articulo, d.sancion, d.tipo, d.cantidad, d.fechaInicio, d.origen, d.fechasPrevias, d.multa, d.estadoManual, d.observacion];

async function responderUno(res, id, status = 200) {
  const c = await db.get('SELECT * FROM castigados WHERE id = ?', [id]);
  res.status(status).json(aRespuesta(c, evaluar(c, await diasDeCompetencia())));
}

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { datos, error } = leerDatos(req.body || {});
  if (error) return res.status(400).json({ error });
  const info = await db.run(`
    INSERT INTO castigados (rut, nombre, club, serie, articulo, sancion, tipo, cantidad, fecha_inicio, origen, fechas_previas, multa, estado_manual, observacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, valores(datos));
  await responderUno(res, info.lastInsertRowid, 201);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const actual = await db.get('SELECT * FROM castigados WHERE id = ?', [id]);
  if (!actual) return res.status(404).json({ error: 'Castigo no encontrado' });
  const { datos, error } = leerDatos(req.body || {}, actual);
  if (error) return res.status(400).json({ error });
  await db.run(`UPDATE castigados SET ${COLUMNAS}, updated_at = datetime('now') WHERE id = ?`, [...valores(datos), id]);
  await responderUno(res, id);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = await db.run('DELETE FROM castigados WHERE id = ?', [Number(req.params.id)]);
  if (info.changes === 0) return res.status(404).json({ error: 'Castigo no encontrado' });
  res.json({ ok: true });
}));

module.exports = router;
