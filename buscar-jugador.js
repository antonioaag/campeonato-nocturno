/**
 * Busca jugadores por nombre aproximado o por RUT en todos los campeonatos,
 * para ubicar a alguien que aparece mal escrito en un informe arbitral.
 *
 *   node buscar-jugador.js anael caldera
 *   node buscar-jugador.js 21568254
 *
 * Solo lee la base (la que apunte el .env: producción). Cada palabra se
 * compara con cada palabra del nombre, sin tildes, y se aceptan parecidos
 * (Caldera ~ Calderón); se ordena por cuántas palabras calzan.
 */
require('dotenv').config();
const db = require('./server/db');
const { limpiarRut } = require('./server/rut');

const sinTildes = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Distancia de edición: cuántas letras hay que cambiar para pasar de una palabra a otra.
function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

// Una palabra buscada calza si es igual, es el comienzo de la otra, o se
// parece (hasta 2 letras distintas en palabras largas, 1 en cortas).
function calza(buscada, palabra) {
  if (palabra.startsWith(buscada) || buscada.startsWith(palabra)) return true;
  return distancia(buscada, palabra) <= (buscada.length >= 6 ? 2 : 1);
}

async function main() {
  const terminos = process.argv.slice(2).map(sinTildes).filter(Boolean);
  if (!terminos.length) throw new Error('Uso: node buscar-jugador.js <nombre o RUT>');
  await db.init();
  const jugadores = await db.all(`
    SELECT j.nombre, j.rut, j.fecha_nacimiento AS nacimiento, j.fecha_ingreso AS ingreso, j.revisar,
           e.nombre AS club, e.serie, c.nombre AS campeonato
    FROM jugadores j JOIN equipos e ON e.id = j.equipo_id JOIN campeonatos c ON c.id = e.campeonato_id
  `);

  const rutBuscado = limpiarRut(terminos.join(''));
  const porRut = /^\d{6,}[\dk]?$/i.test(rutBuscado)
    ? jugadores.filter(j => limpiarRut(j.rut).startsWith(rutBuscado)).map(j => ({ j, puntos: 99 }))
    : [];
  const porNombre = porRut.length ? [] : jugadores.map(j => {
    const palabras = sinTildes(j.nombre).split(/\s+/);
    const puntos = terminos.filter(t => palabras.some(p => calza(t, p))).length;
    return { j, puntos };
  }).filter(r => r.puntos > 0);

  const resultados = [...porRut, ...porNombre].sort((a, b) => b.puntos - a.puntos || a.j.club.localeCompare(b.j.club));
  if (!resultados.length) { console.log('No se encontró a nadie parecido.'); return; }
  const mejor = resultados[0].puntos;
  console.log(`Resultados para "${process.argv.slice(2).join(' ')}":\n`);
  resultados.filter(r => r.puntos === mejor || resultados.length <= 15).slice(0, 30).forEach(({ j, puntos }) => {
    const marca = puntos === 99 ? 'RUT' : `${puntos}/${terminos.length}`;
    console.log(`  [${marca}] ${j.nombre} — ${j.rut || 'sin RUT'} — nac. ${j.nacimiento || '?'} — ${j.club} ${j.serie} (${j.campeonato})${j.revisar ? ' — a revisar' : ''}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
