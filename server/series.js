// Catálogo de series soportadas y sus grupos válidos. Adulto usa A/B (7+6
// equipos, con libre); Senior usa 1/2/3 (grupos de 4, sin libres).
const SERIES = {
  ADULTO: { grupos: ['A', 'B'] },
  SENIOR: { grupos: ['1', '2', '3'] },
};

function esSerieValida(serie) {
  return Object.prototype.hasOwnProperty.call(SERIES, serie);
}

function esGrupoValido(serie, grupo) {
  return esSerieValida(serie) && SERIES[serie].grupos.includes(grupo);
}

module.exports = { SERIES, esSerieValida, esGrupoValido };
