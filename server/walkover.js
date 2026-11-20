// Walkover (WO): un equipo no se presenta a jugar, o se presenta con menos
// jugadores que la base mínima. El rival que sí se presentó gana 3-0 y el
// infractor queda descalificado del campeonato, aunque fuera puntero.
//
// Lo difícil de un WO no es el partido: es qué pasa con el resto de la fase,
// porque el infractor ya jugó contra algunos y contra otros no. La regla que
// fijó la asociación reparte según cuánto alcanzó a jugar:
//
//   - Alcanzó el corte de su grupo: lo jugado queda firme y los rivales que
//     todavía no lo habían enfrentado ganan 1-0.
//   - No lo alcanzó: se anulan TODOS sus partidos y nadie recibe puntos por
//     haberlo enfrentado. Con tan pocas fechas jugadas, dejar los resultados
//     repartiría ventajas según a quién le tocó enfrentarlo antes.
//
// El partido del WO es la excepción en los dos casos: el 3-0 del equipo que sí
// se presentó a la cancha no se le quita nunca, ni siquiera cuando se anula
// todo lo demás.
//
// Igual que las homologaciones, nada de esto toca los partidos guardados. Los
// efectos se derivan al calcular, y el marcador de cancha sigue diciendo lo que
// pasó.
const db = require('./db');

// Marcador con el que se homologa el partido donde ocurrió el WO.
const GOLES_WO = 3;
// Marcador con el que se homologan los partidos que el infractor ya no jugará.
const GOLES_PENDIENTE = 1;

// Cuántos partidos tiene que haber jugado el infractor para que sus resultados
// queden firmes. Lo fija la asociación grupo por grupo y NO sale de una fórmula:
// el grupo A juega 6 partidos y corta en 3, el B juega 5 y corta en 2 (después
// de la fecha 2), y los grupos de Senior juegan 3 y cortan en 2.
const CORTE_POR_GRUPO = {
  ADULTO: { A: 3, B: 2 },
  SENIOR: { 1: 2, 2: 2, 3: 2 },
};

// Para un grupo que no esté en la tabla (uno nuevo, o un cambio de formato) se
// cae a la mitad de sus partidos redondeada hacia arriba, que es de donde salió
// el criterio original.
function corteDelGrupo(serie, grupo, total) {
  const porSerie = CORTE_POR_GRUPO[serie];
  const corte = porSerie ? porSerie[grupo] : undefined;
  return corte !== undefined ? corte : Math.ceil(Number(total || 0) / 2);
}

// El corte viaja congelado en la resolución. Si viniera vacío (una resolución
// anterior a que el corte se guardara), se cae a la mitad hacia arriba.
function resultadosSiguenValidos(jugados, total, corte) {
  const partidos = Number(total || 0);
  if (partidos === 0) return false;
  const umbral = corte === null || corte === undefined ? Math.ceil(partidos / 2) : Number(corte);
  return Number(jugados || 0) >= umbral;
}

// Cuántos partidos de grupo tiene el equipo, cuántos alcanzó a jugar de verdad
// y cuál es el corte de su grupo. Se consulta una sola vez, al registrar el WO,
// y los tres números se guardan en la resolución: son los datos de los que
// depende toda la regla y no pueden cambiar después sin que quede constancia.
// El corte va congelado por el mismo motivo que el resto: si la asociación lo
// modifica en otra temporada, las resoluciones ya emitidas tienen que seguir
// significando lo mismo.
async function contarPartidosDeGrupo(equipoId) {
  const equipo = await db.get('SELECT serie, grupo FROM equipos WHERE id = ?', [equipoId]);
  const fila = await db.get(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN estado = 'jugado' THEN 1 ELSE 0 END) AS jugados
    FROM partidos
    WHERE fase = 'grupos' AND (local_id = ? OR visita_id = ?)
  `, [equipoId, equipoId]);
  const total = Number(fila.total || 0);
  return {
    total,
    jugados: Number(fila.jugados || 0),
    corte: corteDelGrupo(equipo && equipo.serie, equipo && equipo.grupo, total),
  };
}

// Explica en una frase qué le va a pasar (o le pasó) a la fase, para mostrarlo
// antes de confirmar el WO y después en el registro. Sin esto el admin no tiene
// cómo saber que registrar un WO puede anular media tabla.
function explicarAlcance(jugados, total, corte) {
  const validos = resultadosSiguenValidos(jugados, total, corte);
  const umbral = corte === null || corte === undefined ? Math.ceil(Number(total || 0) / 2) : Number(corte);
  return validos
    ? `Jugó ${jugados} de ${total} partidos (el corte es ${umbral}), así que sus resultados quedan firmes y los equipos que aún no lo enfrentaban ganan ${GOLES_PENDIENTE}-0.`
    : `Jugó ${jugados} de ${total} partidos y el corte es ${umbral}, así que se anulan todos sus partidos y nadie recibe puntos por haberlo enfrentado.`;
}

// Traduce un WO vigente en efectos concretos sobre los partidos del infractor:
// qué se homologa y con qué marcador, y qué se anula. No decide precedencias
// entre resoluciones: de eso se encarga ajustesVigentes().
async function efectosDeWalkover(resolucion) {
  const equipoId = Number(resolucion.equipoId);
  const partidoDelWo = Number(resolucion.partidoId);
  const validos = resultadosSiguenValidos(resolucion.woJugados, resolucion.woTotal, resolucion.woCorte);

  const partidos = await db.all(`
    SELECT id, local_id, visita_id, estado
    FROM partidos
    WHERE fase = 'grupos' AND (local_id = ? OR visita_id = ?)
  `, [equipoId, equipoId]);

  const homologaciones = [];
  const anulados = [];

  partidos.forEach(p => {
    const infractorEsLocal = Number(p.local_id) === equipoId;
    const marcar = (goles, esElDelWo) => ({
      partidoId: Number(p.id),
      // El infractor siempre pierde: los goles van para el rival.
      golesLocal: infractorEsLocal ? 0 : goles,
      golesVisita: infractorEsLocal ? goles : 0,
      esElDelWo,
    });

    if (Number(p.id) === partidoDelWo) {
      homologaciones.push(marcar(GOLES_WO, true));
      return;
    }
    if (!validos) {
      anulados.push(Number(p.id));
      return;
    }
    if (p.estado !== 'jugado') homologaciones.push(marcar(GOLES_PENDIENTE, false));
  });

  return { validos, homologaciones, anulados };
}

// Retiro de serie: el tribunal saca al equipo del campeonato por un hecho grave
// (una batalla campal, por ejemplo), no por no presentarse. La regla de qué
// pasa con sus partidos es la misma del WO (ANFA art. 183, Liga art. 221):
// según cuántos alcanzó a jugar, lo jugado queda firme y los rivales que faltaban
// ganan 1-0, o se anula todo. Lo que cambia es que no hay un 3-0 para nadie.
//
// El partido donde ocurrió el hecho no se cuenta como jugado (terminó antes de
// tiempo) y no se le da 1-0 al rival: su resultado lo decide el tribunal con su
// propia resolución. Si en cambio se anula todo, ese partido se anula también.
async function contarPartidosParaRetiro(equipoId, partidoDelHecho) {
  const equipo = await db.get('SELECT serie, grupo FROM equipos WHERE id = ?', [equipoId]);
  const excluido = Number(partidoDelHecho) || 0;
  const fila = await db.get(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN estado = 'jugado' AND id != ? THEN 1 ELSE 0 END) AS jugados
    FROM partidos
    WHERE fase = 'grupos' AND (local_id = ? OR visita_id = ?)
  `, [excluido, equipoId, equipoId]);
  const total = Number(fila.total || 0);
  return {
    total,
    jugados: Number(fila.jugados || 0),
    corte: corteDelGrupo(equipo && equipo.serie, equipo && equipo.grupo, total),
  };
}

function explicarAlcanceRetiro(jugados, total, corte) {
  const validos = resultadosSiguenValidos(jugados, total, corte);
  const umbral = corte === null || corte === undefined ? Math.ceil(Number(total || 0) / 2) : Number(corte);
  return validos
    ? `Se retira habiendo jugado ${jugados} de ${total} partidos (la mitad es ${umbral}): sus resultados quedan firmes y los equipos que aún no lo enfrentaban ganan ${GOLES_PENDIENTE}-0.`
    : `Se retira habiendo jugado ${jugados} de ${total} partidos y la mitad es ${umbral}: se anulan todos sus partidos y nadie recibe puntos por haberlo enfrentado.`;
}

async function efectosDeRetiro(resolucion) {
  const equipoId = Number(resolucion.equipoId);
  const partidoDelHecho = Number(resolucion.partidoId) || 0;
  const validos = resultadosSiguenValidos(resolucion.woJugados, resolucion.woTotal, resolucion.woCorte);

  const partidos = await db.all(`
    SELECT id, local_id, estado
    FROM partidos
    WHERE fase = 'grupos' AND (local_id = ? OR visita_id = ?)
  `, [equipoId, equipoId]);

  const homologaciones = [];
  const anulados = [];
  partidos.forEach(p => {
    if (!validos) { anulados.push(Number(p.id)); return; }
    if (Number(p.id) === partidoDelHecho || p.estado === 'jugado') return;
    const retiradoEsLocal = Number(p.local_id) === equipoId;
    homologaciones.push({
      partidoId: Number(p.id),
      golesLocal: retiradoEsLocal ? 0 : GOLES_PENDIENTE,
      golesVisita: retiradoEsLocal ? GOLES_PENDIENTE : 0,
      esElDelWo: false,
    });
  });
  return { validos, homologaciones, anulados };
}

module.exports = {
  contarPartidosParaRetiro,
  explicarAlcanceRetiro,
  efectosDeRetiro,
  GOLES_WO,
  GOLES_PENDIENTE,
  CORTE_POR_GRUPO,
  corteDelGrupo,
  resultadosSiguenValidos,
  contarPartidosDeGrupo,
  explicarAlcance,
  efectosDeWalkover,
};
