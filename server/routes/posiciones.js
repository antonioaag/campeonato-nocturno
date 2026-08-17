const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

async function calcularTabla(grupo) {
  const equipos = await db.all('SELECT * FROM equipos WHERE grupo = ? ORDER BY orden', [grupo]);
  const stats = {};
  equipos.forEach(e => {
    stats[e.id] = {
      id: e.id, nombre: e.nombre, grupo: e.grupo,
      pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0
    };
  });

  const jugados = await db.all("SELECT * FROM partidos WHERE grupo = ? AND estado = 'jugado'", [grupo]);
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
  const aplazados = await db.all("SELECT local_id, visita_id FROM partidos WHERE grupo = ? AND estado = 'aplazado'", [grupo]);
  aplazados.forEach(p => {
    if (stats[p.local_id]) stats[p.local_id].pa = (stats[p.local_id].pa || 0) + 1;
    if (stats[p.visita_id]) stats[p.visita_id].pa = (stats[p.visita_id].pa || 0) + 1;
  });
  Object.values(stats).forEach(e => { if (!e.pa) e.pa = 0; });

  const tabla = Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (a.gc !== b.gc) return a.gc - b.gc;
    return a.nombre.localeCompare(b.nombre);
  });

  return tabla;
}

router.get('/', asyncHandler(async (req, res) => {
  const { grupo } = req.query;
  if (grupo) {
    return res.json(await calcularTabla(grupo));
  }
  const [A, B] = await Promise.all([calcularTabla('A'), calcularTabla('B')]);
  res.json({ A, B });
}));

module.exports = router;
