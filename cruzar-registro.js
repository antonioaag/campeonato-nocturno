/**
 * Cruza el registro de jugadores de un club que no juega el campeonato
 * (por ejemplo, uno sancionado) con todos los jugadores inscritos en la
 * base, para detectar si alguno se está inscribiendo en otro club.
 *
 *   node cruzar-registro.js data/listas/jose-pistono-registro.json
 *
 * Solo lee: no escribe nada. Usa la base que apunte el .env (producción).
 * El registro va en data/listas/, que no se versiona porque trae RUT.
 *
 * Reglamento ANFA art. 203: un club sancionado por un año o más no puede
 * tramitar jugadores; inscribir a uno de sus jugadores en otro club requiere
 * autorización del directorio, previa solicitud de los interesados.
 *
 * Compara por RUT y, para quienes no tienen RUT legible o lo tienen distinto,
 * también por nombre completo (sin tildes ni mayúsculas), que puede ser
 * coincidencia y se marca aparte.
 */
require('dotenv').config();
const fs = require('fs');
const db = require('./server/db');
const { limpiarRut } = require('./server/rut');

const sinTildes = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

async function main() {
  const archivo = process.argv[2];
  if (!archivo) throw new Error('Falta el archivo: node cruzar-registro.js data/listas/<club>-registro.json');
  const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const registro = datos.listas.flatMap(l => l.jugadores.map(([nombre, rut]) => ({ nombre, rut, rutLimpio: limpiarRut(rut), clave: sinTildes(nombre), origen: l.origen })));

  await db.init();
  const inscritos = await db.all(`
    SELECT j.nombre, j.rut, e.nombre AS club, e.serie, c.nombre AS campeonato
    FROM jugadores j JOIN equipos e ON e.id = j.equipo_id JOIN campeonatos c ON c.id = e.campeonato_id
  `);
  const porRut = new Map(), porNombre = new Map();
  inscritos.forEach(i => {
    const r = limpiarRut(i.rut);
    if (r) (porRut.get(r) || porRut.set(r, []).get(r)).push(i);
    const n = sinTildes(i.nombre);
    (porNombre.get(n) || porNombre.set(n, []).get(n)).push(i);
  });

  const club = sinTildes(datos.club);
  const otroClub = i => sinTildes(i.club) !== club;
  const porRutHallados = [], porNombreHallados = [];
  registro.forEach(r => {
    const mismoRut = (porRut.get(r.rutLimpio) || []).filter(otroClub);
    mismoRut.forEach(i => porRutHallados.push({ r, i }));
    const mismoNombre = (porNombre.get(r.clave) || []).filter(otroClub).filter(i => limpiarRut(i.rut) !== r.rutLimpio);
    mismoNombre.forEach(i => porNombreHallados.push({ r, i }));
  });

  console.log(`${datos.club}: ${registro.length} jugadores en el registro, cruzados con ${inscritos.length} inscritos en la base.\n`);
  if (!porRutHallados.length && !porNombreHallados.length) {
    console.log('✅ Ninguno aparece inscrito en otro club.');
    return;
  }
  if (porRutHallados.length) {
    console.log(`⚠ Mismo RUT inscrito en otro club (${porRutHallados.length}) — requiere autorización del directorio:`);
    porRutHallados.forEach(({ r, i }) => console.log(`  ${r.nombre} (${r.rut}, ${r.origen}) → ${i.club} ${i.serie}, ${i.campeonato}, como "${i.nombre}"`));
  }
  if (porNombreHallados.length) {
    console.log(`\nMismo nombre con otro RUT (${porNombreHallados.length}) — revisar, puede ser otra persona:`);
    porNombreHallados.forEach(({ r, i }) => console.log(`  ${r.nombre} (${r.rut}) → ${i.club} ${i.serie}, ${i.campeonato}, RUT ${i.rut || 'sin RUT'}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
