// Walkover (WO): un equipo no se presenta a jugar, o se presenta con menos
// jugadores que la base mínima. El rival que sí se presentó gana 3-0 y el
// infractor queda descalificado del campeonato, aunque fuera puntero.
//
// Lo difícil de un WO no es el partido: es qué pasa con el resto de la fase,
// porque el infractor ya jugó contra algunos y contra otros no. La regla que
// fijó la asociación reparte según cuánto alcanzó a jugar:
//
//   - Jugó la mitad o más de sus partidos de grupo: lo jugado queda firme y
//     los rivales que todavía no lo habían enfrentado ganan 1-0.
//   - Jugó menos de la mitad: se anulan TODOS sus partidos y nadie recibe
//     puntos por haberlo enfrentado. Con tan pocas fechas jugadas, dejar los
//     resultados repartiría ventajas según a quién le tocó enfrentarlo antes.
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

// La mitad de los partidos del grupo, redondeando hacia arriba. Da 3 en el
// grupo A de Adultos (6 partidos), 3 en el B (5 partidos) y 2 en Senior (3
// partidos), que es el corte que definió la asociación para cada serie.
function umbralPartidosValidos(total) {
  return Math.ceil(Number(total || 0) / 2);
}

function resultadosSiguenValidos(jugados, total) {
  const partidos = Number(total || 0);
  if (partidos === 0) return false;
  return Number(jugados || 0) >= umbralPartidosValidos(partidos);
}

// Cuántos partidos de grupo tiene el equipo en total y cuántos alcanzó a jugar
// de verdad. Se consulta una sola vez, al registrar el WO, y el resultado se
// guarda en la resolución: es el dato del que depende toda la regla y no puede
// cambiar después sin que quede constancia.
async function contarPartidosDeGrupo(equipoId) {
  const fila = await db.get(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN estado = 'jugado' THEN 1 ELSE 0 END) AS jugados
    FROM partidos
    WHERE fase = 'grupos' AND (local_id = ? OR visita_id = ?)
  `, [equipoId, equipoId]);
  return { total: Number(fila.total || 0), jugados: Number(fila.jugados || 0) };
}

// Explica en una frase qué le va a pasar (o le pasó) a la fase, para mostrarlo
// antes de confirmar el WO y después en el registro. Sin esto el admin no tiene
// cómo saber que registrar un WO puede anular media tabla.
function explicarAlcance(jugados, total) {
  const validos = resultadosSiguenValidos(jugados, total);
  const umbral = umbralPartidosValidos(total);
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
  const validos = resultadosSiguenValidos(resolucion.woJugados, resolucion.woTotal);

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

module.exports = {
  GOLES_WO,
  GOLES_PENDIENTE,
  umbralPartidosValidos,
  resultadosSiguenValidos,
  contarPartidosDeGrupo,
  explicarAlcance,
  efectosDeWalkover,
};
