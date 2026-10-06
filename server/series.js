// Catálogo de series que la liga puede usar. Los grupos ya no son una lista
// fija por serie (A/B, 1/2/3 del campeonato anterior): a partir de Clausura
// 2026 se arman por sorteo, así que cualquier código corto de grupo es válido
// mientras la serie exista en este catálogo. Qué series usa cada campeonato
// en concreto se desprende de sus propios equipos (campeonato_id), no hace
// falta declararlo aparte.
//
// SUB13/SUB15/SUB17/PRIMERA_ADULTO/SEGUNDA_ADULTO/SENIOR son las 6 series del
// reglamento de Liga Dávila (Clausura 2026). ADULTO/SENIOR (sin prefijo) son
// las series del campeonato anterior: quedan acá solo para que el historial
// de ese campeonato (ya finalizado) se siga pudiendo consultar y validar.
const SERIES = {
  ADULTO: {},
  SENIOR: {},
  SUB13: {},
  SUB15: {},
  SUB17: {},
  PRIMERA_ADULTO: {},
  SEGUNDA_ADULTO: {},
};

// Series con edad acotada por año de nacimiento (reglamento Liga Dávila,
// art. 13). El corte real se guarda en 'configuracion' por campeonato
// (clave claveCorteEdad) porque sube un año en cada temporada de las series
// juveniles; estos son solo los valores de referencia de la última
// modificación del reglamento (04/2025), para precargarlos si el admin no
// definió otros al crear el campeonato.
const CORTE_EDAD_REFERENCIA = {
  SUB13: { anioNacimientoDesde: 2012 },
  SUB15: { anioNacimientoDesde: 2010 },
  SUB17: { anioNacimientoDesde: 2007 },
};

// Primera y Segunda Adulto: 18 a 39 años. Senior: 40 en adelante.
const EDAD_ADULTO_MIN = 18;
const EDAD_ADULTO_MAX = 39;
const EDAD_SENIOR_MIN = 40;

function esSerieValida(serie) {
  return Object.prototype.hasOwnProperty.call(SERIES, serie);
}

// Sin lista fija de grupos: cualquier código corto y no vacío es válido. La
// composición real de grupos la define el sorteo, no este catálogo.
function esGrupoValido(serie, grupo) {
  return esSerieValida(serie) && typeof grupo === 'string' && grupo.trim().length > 0 && grupo.trim().length <= 10;
}

function esSerieJuvenil(serie) {
  return Object.prototype.hasOwnProperty.call(CORTE_EDAD_REFERENCIA, serie);
}

module.exports = {
  SERIES,
  CORTE_EDAD_REFERENCIA,
  EDAD_ADULTO_MIN,
  EDAD_ADULTO_MAX,
  EDAD_SENIOR_MIN,
  esSerieValida,
  esGrupoValido,
  esSerieJuvenil,
};
