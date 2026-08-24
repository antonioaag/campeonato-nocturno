// Cálculo de tablas de posiciones y de quiénes clasifican a la fase de
// eliminación directa. Vive fuera de las rutas porque lo usan tanto
// /api/posiciones (para mostrar la tabla) como /api/playoffs (para sembrar
// el cuadro de cuartos de final).
const db = require('./db');
const { SERIES } = require('./series');

// Orden estándar de desempate: puntos, diferencia de gol, goles a favor,
// goles en contra (menos es mejor), y por último alfabético.
function compararEquipos(a, b) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.dg !== a.dg) return b.dg - a.dg;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (a.gc !== b.gc) return a.gc - b.gc;
  return a.nombre.localeCompare(b.nombre);
}

// Solo la fase de grupos cuenta para la tabla: los partidos de cuartos en
// adelante no suman puntos.
async function calcularTabla(serie, grupo) {
  const equipos = await db.all('SELECT * FROM equipos WHERE serie = ? AND grupo = ? ORDER BY orden', [serie, grupo]);
  const stats = {};
  equipos.forEach(e => {
    stats[e.id] = {
      id: e.id, nombre: e.nombre, serie: e.serie, grupo: e.grupo,
      pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0
    };
  });

  const jugados = await db.all(
    "SELECT * FROM partidos WHERE serie = ? AND grupo = ? AND estado = 'jugado' AND fase = 'grupos'",
    [serie, grupo]
  );
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
  const aplazados = await db.all(
    "SELECT local_id, visita_id FROM partidos WHERE serie = ? AND grupo = ? AND estado = 'aplazado' AND fase = 'grupos'",
    [serie, grupo]
  );
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

// SENIOR (3 grupos de 4): clasifican los 2 primeros de cada grupo más los 2
// mejores terceros comparados entre sí. Modifica tablasPorGrupo en el lugar.
function marcarClasificadosSenior(tablasPorGrupo) {
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

// ADULTO (grupos A de 7 y B de 6): clasifican los 4 primeros de cada grupo.
function marcarClasificadosAdulto(tablasPorGrupo) {
  Object.values(tablasPorGrupo).forEach(tabla => {
    tabla.forEach((eq, idx) => {
      eq.clasificado = idx < 4;
      eq.clasificaVia = idx < 4 ? 'grupo' : null;
    });
  });
  return tablasPorGrupo;
}

function marcarClasificados(serie, tablasPorGrupo) {
  return serie === 'SENIOR'
    ? marcarClasificadosSenior(tablasPorGrupo)
    : marcarClasificadosAdulto(tablasPorGrupo);
}

module.exports = {
  compararEquipos,
  calcularTabla,
  calcularTodasLasTablas,
  marcarClasificados,
};
