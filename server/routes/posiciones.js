const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');
const { SERIES, esSerieValida } = require('../series');

const router = express.Router();

// Orden estándar de desempate: puntos, diferencia de gol, goles a favor,
// goles en contra (menos es mejor), y por último alfabético.
function compararEquipos(a, b) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.dg !== a.dg) return b.dg - a.dg;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (a.gc !== b.gc) return a.gc - b.gc;
  return a.nombre.localeCompare(b.nombre);
}

async function calcularTabla(serie, grupo) {
  const equipos = await db.all('SELECT * FROM equipos WHERE serie = ? AND grupo = ? ORDER BY orden', [serie, grupo]);
  const stats = {};
  equipos.forEach(e => {
    stats[e.id] = {
      id: e.id, nombre: e.nombre, serie: e.serie, grupo: e.grupo,
      pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0
    };
  });

  const jugados = await db.all("SELECT * FROM partidos WHERE serie = ? AND grupo = ? AND estado = 'jugado'", [serie, grupo]);
  jugados.forEach(p => {
    const L = stats[p.local_id];
    const V = stats[p.visita_id];
    if (!L || !V) return; // por si acaso
    L.pj++; V.pj++;
    L.gf += p.goles_local; L.gc += p.goles_visita;
    V.gf += p.goles_visita; V.gc += p.goles_local;
    if (p.goles_local > p.goles_visita) { L.pg++; L.pts += 3; V.pp++; }
    else if (p.goles_local < p.goles_visita) { V.pg++; V.pts += 3; L.pp++; }
    else { L.pe++; V.pe++; L.pts += 1; V.pts += 1; }
    L.dg = L.gf - L.gc;
    V.dg = V.gf - V.gc;
  });

  // Partidos aplazados pendientes de reprogramar (informativo).
  const aplazados = await db.all("SELECT local_id, visita_id FROM partidos WHERE serie = ? AND grupo = ? AND estado = 'aplazado'", [serie, grupo]);
  aplazados.forEach(p => {
    if (stats[p.local_id]) stats[p.local_id].pa = (stats[p.local_id].pa || 0) + 1;
    if (stats[p.visita_id]) stats[p.visita_id].pa = (stats[p.visita_id].pa || 0) + 1;
  });
  Object.values(stats).forEach(e => { if (!e.pa) e.pa = 0; });

  return Object.values(stats).sort(compararEquipos);
}

async function calcularTodasLasTablas(serie) {
  const resultado = {};
  for (const grupo of SERIES[serie].grupos) {
    resultado[grupo] = await calcularTabla(serie, grupo);
  }
  return resultado;
}

// Marca clasificado=true en los 2 primeros de cada grupo, más los 2 mejores
// terceros comparados entre sí (mismo criterio de desempate). Pensado para
// Senior (grupos de 4); modifica tablasPorGrupo en el lugar.
function marcarClasificados(tablasPorGrupo) {
  Object.values(tablasPorGrupo).forEach(tabla => {
    tabla.forEach((eq, idx) => {
      eq.clasificado = idx < 2;
      eq.clasificaVia = idx < 2 ? 'grupo' : null;
    });
  });

  const terceros = Object.values(tablasPorGrupo)
    .map(tabla => tabla[2])
    .filter(Boolean)
    .sort(compararEquipos);

  terceros.slice(0, 2).forEach(eq => {
    eq.clasificado = true;
    eq.clasificaVia = 'mejor-tercero';
  });

  return tablasPorGrupo;
}

router.get('/', asyncHandler(async (req, res) => {
  const { grupo } = req.query;
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  if (serie === 'SENIOR') {
    const tablas = marcarClasificados(await calcularTodasLasTablas(serie));
    return res.json(grupo ? (tablas[grupo] || []) : tablas);
  }

  if (grupo) return res.json(await calcularTabla(serie, grupo));
  res.json(await calcularTodasLasTablas(serie));
}));

module.exports = router;
