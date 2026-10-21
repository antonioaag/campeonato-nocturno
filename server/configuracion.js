// Ajustes que el admin cambia desde la interfaz, sin necesidad de un deploy.
// Se guardan como texto en la tabla 'configuracion'.
const db = require('./db');

async function leer(clave, porDefecto = null) {
  const fila = await db.get('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return fila ? fila.valor : porDefecto;
}

async function escribir(clave, valor) {
  await db.run(`
    INSERT INTO configuracion (clave, valor, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at
  `, [clave, String(valor)]);
}

async function leerBooleano(clave, porDefecto = false) {
  const valor = await leer(clave, porDefecto ? '1' : '0');
  return valor === '1';
}

// Cada serie publica su cuadro de eliminatorias por separado, porque las
// series no terminan al mismo tiempo. Por defecto está oculto: el cuadro solo
// se muestra al público cuando el admin lo publica explícitamente. La clave
// lleva el campeonato porque una misma serie (SENIOR) se repite de un
// campeonato a otro, y publicar el cuadro de uno no puede publicar el del otro.
function clavePlayoffsPublicos(campeonatoId, serie) {
  return `campeonato_${campeonatoId}_playoffs_publicos_${serie}`;
}

// Mismo criterio para el registro de sanciones y reclamos: nace oculto y el
// admin decide cuándo mostrarlo.
function claveResolucionesPublicas(campeonatoId, serie) {
  return `campeonato_${campeonatoId}_resoluciones_publicas_${serie}`;
}

// Un campeonato en curso nace oculto: el admin lo carga y lo revisa antes de
// que lo vea el público.
function claveCampeonatoPublico(campeonatoId) {
  return `campeonato_${campeonatoId}_publico`;
}

// Año de nacimiento desde el cual se puede jugar una serie juvenil (Sub-13,
// Sub-15, Sub-17), para un campeonato puntual. Sube un año en cada temporada,
// así que se guarda editable por campeonato en vez de quedar fijo en código;
// series.js solo trae el valor de referencia del reglamento vigente al
// momento de escribir esto, para precargarlo si el admin no definió otro.
function claveCorteEdad(campeonatoId, serie) {
  return `campeonato_${campeonatoId}_corte_edad_${serie}`;
}

// Hasta qué fecha de la fase de grupos ve el público el fixture de un
// campeonato. Sin valor, se ven todas. Sirve para publicar la programación
// semana a semana sin mostrar todavía la de las fechas siguientes.
function claveFechasVisibles(campeonatoId) {
  return `campeonato_${campeonatoId}_fechas_visibles`;
}

module.exports = {
  leer, escribir, leerBooleano,
  clavePlayoffsPublicos, claveResolucionesPublicas, claveCampeonatoPublico, claveFechasVisibles, claveCorteEdad,
};
