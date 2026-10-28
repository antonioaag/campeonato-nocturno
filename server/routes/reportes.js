// Material que el admin saca del sistema: la hoja de resultados de cada fecha
// (para armar las imágenes de redes) y el respaldo del campeonato.
const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { ajustesVigentes, listar: listarResoluciones } = require('../resoluciones');
const { calcularTodasLasTablas, marcarClasificados } = require('../tablas');
const { leerBooleano, claveResolucionesPublicas } = require('../configuracion');
const { campeonatoDeLaPeticion, DEL_CAMPEONATO } = require('../campeonatos');

const router = express.Router();
router.use(requireAuth, requireAdmin, campeonatoDeLaPeticion);

const ORDEN_SERIES = ['SUB13', 'SUB15', 'SUB17', 'SENIOR', 'SEGUNDA_ADULTO', 'PRIMERA_ADULTO', 'ADULTO'];
const seriesDe = c => (c.series || []).map(s => s.serie)
  .sort((a, b) => (ORDEN_SERIES.indexOf(a) + 1 || 99) - (ORDEN_SERIES.indexOf(b) + 1 || 99));

const SELECT_PARTIDOS = `
  SELECT p.id, p.serie, p.grupo, p.fecha, p.estado, p.fecha_partido AS fechaPartido, p.hora,
    l.nombre AS local, v.nombre AS visita, p.goles_local AS golesLocal, p.goles_visita AS golesVisita
  FROM partidos p JOIN equipos l ON l.id = p.local_id JOIN equipos v ON v.id = p.visita_id
`;

// Todo lo que lleva la hoja de una fecha, serie por serie. La tabla es la que
// quedó al cerrar esa fecha, no la de hoy: la hoja de la fecha 2 tiene que
// seguir diciendo lo mismo aunque ya se haya jugado la 3.
router.get('/fecha/:n', asyncHandler(async (req, res) => {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 1) return res.status(400).json({ error: 'fecha inválida' });
  const c = req.campeonato;

  const series = [];
  for (const serie of seriesDe(c)) {
    const ajustes = await ajustesVigentes(c.id, serie);
    const conAjustes = p => ({ ...p, homologacion: ajustes.porPartido[p.id] || null, anulacion: ajustes.anulados[p.id] || null });

    const partidos = (await db.all(
      `${SELECT_PARTIDOS} WHERE l.campeonato_id = ? AND p.serie = ? AND p.fase = 'grupos' AND p.fecha = ?
       ORDER BY p.fecha_partido IS NULL, p.fecha_partido, p.hora, p.id`,
      [c.id, serie, n]
    )).map(conAjustes);
    if (!partidos.length) continue;

    // Los aplazados de fechas anteriores siguen debiéndose: van en la hoja
    // hasta que se jueguen o el tribunal los resuelva.
    const pendientes = (await db.all(
      `${SELECT_PARTIDOS} WHERE l.campeonato_id = ? AND p.serie = ? AND p.fase = 'grupos'
         AND p.fecha <= ? AND p.estado = 'aplazado' ORDER BY p.fecha, p.id`,
      [c.id, serie, n]
    )).filter(p => !ajustes.porPartido[p.id] && !ajustes.anulados[p.id]);

    const libres = (await db.all(
      `SELECT e.nombre FROM byes b JOIN equipos e ON e.id = b.equipo_id
       WHERE e.campeonato_id = ? AND b.serie = ? AND b.fecha = ? ORDER BY e.nombre`,
      [c.id, serie, n]
    )).map(x => x.nombre);

    // Las sanciones salen solo si su registro está publicado: la imagen va a
    // redes y no puede adelantar lo que la pestaña Resoluciones todavía oculta.
    const publicas = await leerBooleano(claveResolucionesPublicas(c.id, serie), false);
    const sanciones = publicas ? await listarResoluciones(c.id, serie, { soloVigentes: true }) : [];

    const tablas = marcarClasificados(c.formato, serie, await calcularTodasLasTablas(c.id, serie, n));
    series.push({ serie, partidos, pendientes, libres, sanciones, sancionesPublicas: publicas, tablas });
  }
  res.json({ campeonato: { id: c.id, nombre: c.nombre, formato: c.formato }, fecha: n, series });
}));

// Copia de todo lo del campeonato, para guardarla fuera del sistema después
// de cada fecha. Las listas de inscripción van sin el archivo escaneado: pesan
// demasiado para descargarlas cada semana y no cambian durante el torneo.
router.get('/respaldo', asyncHandler(async (req, res) => {
  const c = req.campeonato;
  const id = c.id;
  const datos = {
    generado: new Date().toISOString(),
    campeonato: await db.get('SELECT * FROM campeonatos WHERE id = ?', [id]),
    equipos: await db.all('SELECT * FROM equipos WHERE campeonato_id = ? ORDER BY id', [id]),
    partidos: await db.all(`SELECT * FROM partidos WHERE ${DEL_CAMPEONATO} ORDER BY id`, [id]),
    byes: await db.all('SELECT b.* FROM byes b JOIN equipos e ON e.id = b.equipo_id WHERE e.campeonato_id = ? ORDER BY b.id', [id]),
    jugadores: await db.all('SELECT j.* FROM jugadores j JOIN equipos e ON e.id = j.equipo_id WHERE e.campeonato_id = ? ORDER BY j.id', [id]),
    listas_inscripcion: await db.all(`SELECT li.id, li.equipo_id, li.nombre_archivo, li.tipo_mime, li.tamano_bytes, li.subido_por, li.subido_at
      FROM listas_inscripcion li JOIN equipos e ON e.id = li.equipo_id WHERE e.campeonato_id = ? ORDER BY li.id`, [id]),
    resoluciones: await db.all('SELECT * FROM resoluciones WHERE campeonato_id = ? ORDER BY id', [id]),
    reclamos: await db.all('SELECT r.* FROM reclamos r JOIN equipos e ON e.id = r.club_id WHERE e.campeonato_id = ? ORDER BY r.id', [id]),
    castigos: await db.all('SELECT * FROM castigos WHERE campeonato_id = ? ORDER BY id', [id]),
    configuracion: await db.all('SELECT * FROM configuracion WHERE clave LIKE ? ORDER BY clave', [`campeonato_${id}_%`]),
  };
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(c, 'respaldo')}.json"`);
  res.json(datos);
}));

// Los mismos resultados en Excel, para leerlos sin el sistema: una hoja con
// todos los partidos y una con la tabla de cada serie.
router.get('/respaldo.xlsx', asyncHandler(async (req, res) => {
  const ExcelJS = require('exceljs');
  const c = req.campeonato;
  const wb = new ExcelJS.Workbook();
  const MORADO = 'FF3D1656';
  const cabecera = fila => fila.eachCell(x => {
    x.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MORADO } };
  });

  const res1 = wb.addWorksheet('Resultados', { views: [{ state: 'frozen', ySplit: 1 }] });
  res1.columns = [
    { header: 'Fase', width: 12 }, { header: 'Fecha', width: 7 }, { header: 'Serie', width: 16 },
    { header: 'Día', width: 12 }, { header: 'Hora', width: 7 }, { header: 'Local', width: 20 },
    { header: 'GL', width: 5 }, { header: 'GV', width: 5 }, { header: 'Visita', width: 20 },
    { header: 'Estado', width: 11 }, { header: 'Homologado', width: 12 }, { header: 'Observación', width: 40 },
  ];
  cabecera(res1.getRow(1));
  for (const serie of seriesDe(c)) {
    const ajustes = await ajustesVigentes(c.id, serie);
    const partidos = await db.all(
      `${SELECT_PARTIDOS.replace('SELECT p.id,', 'SELECT p.id, p.fase, p.penales_local AS penalesLocal, p.penales_visita AS penalesVisita,')}
       WHERE l.campeonato_id = ? AND p.serie = ? ORDER BY p.fase != 'grupos', p.fecha, p.fecha_partido, p.hora, p.id`,
      [c.id, serie]
    );
    for (const p of partidos) {
      const h = ajustes.porPartido[p.id];
      const a = ajustes.anulados[p.id];
      const jugado = p.estado === 'jugado';
      const obs = [
        p.penalesLocal != null ? `Penales ${p.penalesLocal}-${p.penalesVisita}` : '',
        h ? `Homologado ${h.golesLocal}-${h.golesVisita}${h.articulo ? `, ${h.articulo}` : ''}` : '',
        a ? 'Sin efecto por WO' : '',
      ].filter(Boolean).join(' · ');
      res1.addRow([p.fase, p.fecha, serie, p.fechaPartido || '', p.hora || '', p.local,
        jugado ? p.golesLocal : '', jugado ? p.golesVisita : '', p.visita, p.estado,
        h ? `${h.golesLocal}-${h.golesVisita}` : '', obs]);
    }
  }

  for (const serie of seriesDe(c)) {
    const tablas = marcarClasificados(c.formato, serie, await calcularTodasLasTablas(c.id, serie));
    for (const [grupo, tabla] of Object.entries(tablas)) {
      const ws = wb.addWorksheet(`Tabla ${serie}${grupo === 'U' ? '' : ' ' + grupo}`.slice(0, 31));
      ws.columns = [
        { header: '#', width: 4 }, { header: 'Equipo', width: 22 }, { header: 'PJ', width: 5 },
        { header: 'PG', width: 5 }, { header: 'PE', width: 5 }, { header: 'PP', width: 5 },
        { header: 'GF', width: 5 }, { header: 'GC', width: 5 }, { header: 'DG', width: 5 },
        { header: 'Pts', width: 6 }, { header: 'Ajuste', width: 7 }, { header: 'Pendientes', width: 10 },
      ];
      cabecera(ws.getRow(1));
      tabla.forEach((e, i) => ws.addRow([i + 1, e.nombre + (e.descalificado ? ' (descalificado)' : ''),
        e.pj, e.pg, e.pe, e.pp, e.gf, e.gc, e.dg, e.pts, e.ajustePuntos || '', e.pa || '']));
    }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(c, 'resultados')}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}));

function nombreArchivo(c, que) {
  const nombre = c.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
  return `${nombre}_${que}_${new Date().toISOString().slice(0, 10)}`;
}

module.exports = router;
