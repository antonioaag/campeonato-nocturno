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

// Cada serie publica su cuadro de eliminatorias por separado, porque los
// campeonatos no terminan al mismo tiempo. Por defecto está oculto: el cuadro
// solo se muestra al público cuando el admin lo publica explícitamente.
function clavePlayoffsPublicos(serie) {
  return `playoffs_publicos_${serie}`;
}

module.exports = { leer, escribir, leerBooleano, clavePlayoffsPublicos };
