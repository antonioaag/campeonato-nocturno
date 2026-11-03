// Un partido pertenece a una fecha del fixture (partidos.fecha), pero se
// puede jugar en el fin de semana de otra: un adelantado de la fecha 4 que se
// juega el sábado de la fecha 3. Para el público y para la hoja de resultados
// lo que importa es cuándo se juega, así que se agrupa por "jornada": la fecha
// a la que pertenece ese día del calendario.
//
// Cada día se asigna a la fecha que más partidos juega ese día. No se guarda
// en la base porque se deduce sola de la programación: si el adelantado
// vuelve a su fin de semana, vuelve a su fecha sin que nadie toque nada más.
const db = require('./db');

async function jornadasPorDia(campeonatoId) {
  const filas = await db.all(`
    SELECT p.fecha_partido AS dia, p.fecha, COUNT(*) AS n
    FROM partidos p JOIN equipos l ON l.id = p.local_id
    WHERE l.campeonato_id = ? AND p.fase = 'grupos' AND p.fecha_partido IS NOT NULL
    GROUP BY p.fecha_partido, p.fecha
  `, [campeonatoId]);
  const mejor = {};
  filas.forEach(f => {
    const n = Number(f.n);
    const actual = mejor[f.dia];
    if (!actual || n > actual.n || (n === actual.n && f.fecha < actual.fecha)) mejor[f.dia] = { fecha: f.fecha, n };
  });
  const porDia = {};
  Object.entries(mejor).forEach(([dia, m]) => { porDia[dia] = m.fecha; });
  return porDia;
}

// Acepta tanto filas crudas (fecha_partido) como las de la API (fechaPartido).
function jornadaDe(p, porDia) {
  const dia = p.fechaPartido !== undefined ? p.fechaPartido : p.fecha_partido;
  return (dia && porDia[dia]) || p.fecha;
}

module.exports = { jornadasPorDia, jornadaDe };
