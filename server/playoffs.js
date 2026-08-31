// Fase de eliminación directa: siembra de los 8 clasificados, armado de los
// cruces de cuartos y avance de fase. Todos los partidos son a PARTIDO ÚNICO.
const { compararEquipos, enCarrera, calcularTodasLasTablas, marcarClasificados } = require('./tablas');

// Los partidos de eliminación directa se guardan con grupo = 'PO' para que no
// aparezcan en las consultas por grupo (A/B/1/2/3) ni contaminen las tablas de
// posiciones, que además filtran por fase = 'grupos'.
const GRUPO_PLAYOFF = 'PO';

const FASES = ['cuartos', 'semifinal', 'final'];

const NOMBRE_FASE = {
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinales',
  final: 'Final',
};

// Cuántos cruces tiene cada fase y en qué jornada se guarda.
const LLAVES_POR_FASE = { cuartos: 4, semifinal: 2, final: 1 };
const JORNADA_POR_FASE = { cuartos: 1, semifinal: 2, final: 3 };

// --- SIEMBRA DE LOS 8 CLASIFICADOS ---

// ADULTO: 4 primeros del grupo A y 4 primeros del grupo B.
// Cruce cruzado entre grupos, repartido para que los dos líderes de grupo solo
// puedan encontrarse en la final:
//   Llave 1: 1ºA vs 4ºB      Llave 2: 2ºB vs 3ºA   -> Semifinal 1
//   Llave 3: 1ºB vs 4ºA      Llave 4: 2ºA vs 3ºB   -> Semifinal 2
function cruzarAdulto(tablas) {
  // Se siembra solo con los equipos en carrera: un descalificado por WO no
  // ocupa un lugar en el cuadro aunque hubiera terminado entre los cuatro
  // primeros, y el quinto pasa a cuartos en su lugar.
  const A = enCarrera(tablas['A'] || []);
  const B = enCarrera(tablas['B'] || []);
  if (A.length < 4 || B.length < 4) {
    throw new Error('Cada grupo de Adultos necesita al menos 4 equipos en carrera para armar los cuartos de final');
  }
  return [
    { llave: 1, local: A[0], visita: B[3] },
    { llave: 2, local: B[1], visita: A[2] },
    { llave: 3, local: B[0], visita: A[3] },
    { llave: 4, local: A[1], visita: B[2] },
  ];
}

// SENIOR: 3 grupos de 4. Se arma un ranking global de los 8 clasificados
// (los 3 líderes ocupan los puestos 1-3, los 3 segundos los puestos 4-6 y los
// 2 mejores terceros los puestos 7-8; dentro de cada nivel se ordenan con el
// mismo criterio de desempate de la tabla) y se cruza 1v8, 2v7, 3v6, 4v5.
// El reparto en el cuadro deja al 1 y al 2 en mitades opuestas:
//   Llave 1: 1 vs 8          Llave 2: 4 vs 5       -> Semifinal 1
//   Llave 3: 2 vs 7          Llave 4: 3 vs 6       -> Semifinal 2
function sembrarSenior(tablas) {
  // Igual que en Adultos: los descalificados por WO salen del ranking y los
  // puestos corren hacia arriba.
  const grupos = Object.values(tablas).map(enCarrera);
  const primeros = grupos.map(t => t[0]).filter(Boolean).sort(compararEquipos);
  const segundos = grupos.map(t => t[1]).filter(Boolean).sort(compararEquipos);
  const terceros = grupos.map(t => t[2]).filter(Boolean).sort(compararEquipos);

  const ranking = [...primeros, ...segundos, ...terceros.slice(0, 2)];
  if (ranking.length < 8) {
    throw new Error(`Seniors necesita 8 clasificados para armar los cuartos y solo hay ${ranking.length}`);
  }
  return ranking;
}

function cruzarSenior(tablas) {
  const r = sembrarSenior(tablas);
  return [
    { llave: 1, local: r[0], visita: r[7] },
    { llave: 2, local: r[3], visita: r[4] },
    { llave: 3, local: r[1], visita: r[6] },
    { llave: 4, local: r[2], visita: r[5] },
  ];
}

// Devuelve los 4 cruces de cuartos de final de la serie, ya sembrados.
async function armarCuartos(serie) {
  const tablas = marcarClasificados(serie, await calcularTodasLasTablas(serie));
  return serie === 'SENIOR' ? cruzarSenior(tablas) : cruzarAdulto(tablas);
}

// --- AVANCE DE FASE ---

// Acepta tanto las filas crudas de la base (goles_local) como las ya mapeadas
// para el front (golesLocal), porque ambas formas circulan por las rutas.
function marcador(partido) {
  return {
    local: partido.goles_local !== undefined ? partido.goles_local : partido.golesLocal,
    visita: partido.goles_visita !== undefined ? partido.goles_visita : partido.golesVisita,
    penalesLocal: partido.penales_local !== undefined ? partido.penales_local : partido.penalesLocal,
    penalesVisita: partido.penales_visita !== undefined ? partido.penales_visita : partido.penalesVisita,
    localId: partido.local_id !== undefined ? partido.local_id : partido.localId,
    visitaId: partido.visita_id !== undefined ? partido.visita_id : partido.visitaId,
  };
}

// A partido único: gana quien marcó más goles y, si empataron, quien ganó la
// definición por penales. Devuelve null si todavía no hay ganador (partido sin
// jugar, o empatado y sin penales cargados).
function ganadorDe(partido) {
  if (partido.estado !== 'jugado') return null;
  const m = marcador(partido);
  if (m.local > m.visita) return m.localId;
  if (m.visita > m.local) return m.visitaId;

  const pl = m.penalesLocal;
  const pv = m.penalesVisita;
  if (pl === null || pl === undefined || pv === null || pv === undefined) return null;
  if (pl > pv) return m.localId;
  if (pv > pl) return m.visitaId;
  return null; // penales también empatados: no define nada
}

// Un empate que ya quedó resuelto por penales no bloquea el avance de fase.
function necesitaDefinicion(partido) {
  if (partido.estado !== 'jugado') return false;
  const m = marcador(partido);
  return m.local === m.visita && ganadorDe(partido) === null;
}

// Empareja los ganadores de una fase para armar la siguiente: la llave 1 se
// cruza con la 2, la 3 con la 4, y así sucesivamente.
function cruzarGanadores(partidosFase) {
  const ordenados = [...partidosFase].sort((a, b) => a.llave - b.llave);
  const cruces = [];
  for (let i = 0; i < ordenados.length; i += 2) {
    const uno = ordenados[i];
    const otro = ordenados[i + 1];
    if (!otro) break;
    cruces.push({
      llave: cruces.length + 1,
      localId: ganadorDe(uno),
      visitaId: ganadorDe(otro),
      vienenDe: [uno.llave, otro.llave],
    });
  }
  return cruces;
}

function faseSiguiente(fase) {
  const i = FASES.indexOf(fase);
  return i === -1 || i === FASES.length - 1 ? null : FASES[i + 1];
}

module.exports = {
  GRUPO_PLAYOFF,
  FASES,
  NOMBRE_FASE,
  LLAVES_POR_FASE,
  JORNADA_POR_FASE,
  armarCuartos,
  ganadorDe,
  necesitaDefinicion,
  cruzarGanadores,
  faseSiguiente,
};
