// Reglas de inscripción de jugadores compartidas por las rutas de la API y
// por los scripts de carga de listas (cargar-listas.js), para que una lista
// cargada por cualquiera de los dos caminos quede validada igual.

const { esRutValido, formatearRut, limpiarRut } = require('./rut');
const { normalizarFecha } = require('./csv');
const { esSerieJuvenil, CORTE_EDAD_REFERENCIA, EDAD_ADULTO_MIN, EDAD_SENIOR_MIN } = require('./series');
const { leer, claveCorteEdad } = require('./configuracion');

// Edad contra la serie del equipo (reglamento Liga Dávila, art. 13). Las
// series del campeonato anterior (ADULTO/SENIOR, sin prefijo) ya están
// cerradas y no reciben inscripciones nuevas, así que no se validan acá.
async function validarEdadParaSerie(campeonatoId, serie, fechaNacimiento) {
  const anioNacimiento = Number(String(fechaNacimiento).slice(0, 4));

  if (esSerieJuvenil(serie)) {
    const corteConfigurado = await leer(claveCorteEdad(campeonatoId, serie));
    const corte = corteConfigurado ? Number(corteConfigurado) : CORTE_EDAD_REFERENCIA[serie].anioNacimientoDesde;
    if (anioNacimiento < corte) {
      return `Para ${serie} el jugador debe haber nacido en ${corte} o después (nació en ${anioNacimiento})`;
    }
    return null;
  }

  const hoy = new Date();
  const edad = hoy.getUTCFullYear() - anioNacimiento;

  if (serie === 'SENIOR') {
    if (edad < EDAD_SENIOR_MIN) return `Para Senior el jugador debe tener al menos ${EDAD_SENIOR_MIN} años (tiene ${edad})`;
    return null;
  }
  if (serie === 'PRIMERA_ADULTO' || serie === 'SEGUNDA_ADULTO') {
    if (edad < EDAD_ADULTO_MIN) return `Para ${serie} el jugador debe tener al menos ${EDAD_ADULTO_MIN} años (tiene ${edad})`;
    // Mayores de 39 solo pueden jugar Adulto si vienen de Senior (40+); el
    // reglamento lo permite, así que no se bloquea por edad máxima acá.
    return null;
  }
  return null;
}

// Todo lo que impediría inscribir al jugador, en una lista. La carga desde
// foto no rechaza por esto: guarda la fila marcada para que alguien la
// corrija, porque perder la fila entera es peor que tenerla pendiente.
async function problemasDelJugador({ rut, fechaNacimiento }, equipo) {
  const problemas = [];
  if (!esRutValido(rut)) problemas.push(`RUT inválido: ${rut || '(vacío)'}`);
  const fecha = normalizarFecha(fechaNacimiento);
  if (!fecha) {
    problemas.push(`Fecha de nacimiento inválida: ${fechaNacimiento || '(vacía)'}`);
  } else {
    const errorEdad = await validarEdadParaSerie(equipo.campeonatoId, equipo.serie, fecha);
    if (errorEdad) problemas.push(errorEdad);
  }
  return problemas;
}

// Un RUT mal escrito se guarda igual (es lo que dice la planilla), pero en el
// formato canónico cuando se puede, para que el informe de repetidos lo
// compare contra los demás.
function rutParaGuardar(rut) {
  return limpiarRut(rut).length >= 2 ? formatearRut(rut) : String(rut || '').trim();
}

// Fecha en que la lista se entregó a la asociación. La escribe quien sube la
// planilla (no se deduce del día de la carga, que puede ser semanas después)
// y se usa para el control de pases.
function fechaIngresoValida(valor) {
  const fecha = normalizarFecha(valor);
  if (!fecha) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  return fecha <= hoy ? fecha : null;
}

module.exports = { validarEdadParaSerie, problemasDelJugador, rutParaGuardar, fechaIngresoValida };
