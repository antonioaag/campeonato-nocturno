/**
 * Quién ya está clasificado a semifinales (o a cuartos) en cada serie, quién
 * está eliminado y quién sigue dependiendo de los partidos que faltan.
 *
 *   node analisis-clasificacion.js
 *   node analisis-clasificacion.js --retirados "PRIMERA_ADULTO:PLATENSE;PRIMERA_ADULTO:J. OVALLE;SUB15:10 DE MARZO"
 *
 * Solo lee la base (la que apunte el .env: producción). Parte de la tabla
 * oficial, con las resoluciones vigentes ya aplicadas, y recorre todos los
 * resultados posibles (ganar, empatar o perder) de los partidos que faltan.
 *
 * --retirados simula retiros de serie que el tribunal ya decidió pero que
 * todavía no están registrados en la pestaña Resoluciones, con la misma regla
 * de la mitad que aplica el sistema (ANFA art. 183). Un partido entre dos
 * equipos retirados se toma como el partido del hecho: no cuenta como jugado.
 * Si el retiro ya está registrado, la opción no hace nada para ese equipo.
 *
 * Criterio, solo por puntos (los goles de los partidos que faltan no se
 * pueden adivinar):
 * - Clasificado: en cualquier resultado posible termina entre los cupos, aun
 *   perdiendo todos los desempates.
 * - Clasificado salvo desempate: solo un empate en puntos podría dejarlo
 *   fuera (lo define la diferencia de gol).
 * - Eliminado: en cualquier resultado posible terminan más equipos que cupos
 *   con más puntos que él.
 * - En carrera: depende de los resultados.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./server/db');
const { ajustesVigentes } = require('./server/resoluciones');
const { calcularTabla } = require('./server/tablas');
const { contarPartidosParaRetiro, efectosDeRetiro, GOLES_PENDIENTE } = require('./server/walkover');

const SERIES = { SUB13: 'Sub-13', SUB15: 'Sub-15', SUB17: 'Sub-17', SENIOR: 'Seniors', SEGUNDA_ADULTO: 'Segunda', PRIMERA_ADULTO: 'Primera', ADULTO: 'Adulto' };
const ORDEN = Object.keys(SERIES);
// Recorrer 3^n resultados es exacto pero crece rápido: sobre este número de
// partidos se usa una cota (más prudente, pero nunca da un clasificado falso).
const MAX_EXACTO = 13;

function leerRetirados() {
  const i = process.argv.indexOf('--retirados');
  if (i < 0 || !process.argv[i + 1]) return [];
  return process.argv[i + 1].split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const [serie, ...club] = s.split(':');
    return { serie: serie.trim().toUpperCase(), club: club.join(':').trim().toUpperCase() };
  });
}

// Agrega a los ajustes oficiales un retiro que aún no está registrado, con el
// mismo orden que usa ajustesVigentes: anulaciones antes que los 1-0.
async function simularRetiros(ajustes, equipos, retiros) {
  const simulados = [];
  const ids = retiros.map(r => equipos.find(e => e.nombre.toUpperCase() === r.club)).filter(Boolean);
  for (const eq of ids) {
    if (ajustes.descalificados[eq.id]) continue; // ya registrado: manda la resolución
    // El partido entre dos retirados es el del hecho: no cuenta como jugado.
    const delHecho = await db.get(
      `SELECT id FROM partidos WHERE fase = 'grupos' AND ((local_id = ? AND visita_id IN (${ids.map(() => '?').join(',')}))
        OR (visita_id = ? AND local_id IN (${ids.map(() => '?').join(',')})))`,
      [eq.id, ...ids.map(x => x.id), eq.id, ...ids.map(x => x.id)]
    );
    const partidoId = delHecho ? delHecho.id : 0;
    const conteo = await contarPartidosParaRetiro(eq.id, partidoId);
    const efectos = await efectosDeRetiro({ equipoId: eq.id, partidoId, woJugados: conteo.jugados, woTotal: conteo.total, woCorte: conteo.corte });
    ajustes.descalificados[eq.id] = { retiro: true, simulado: true };
    efectos.anulados.forEach(id => { if (!ajustes.porPartido[id]) ajustes.anulados[id] = { simulado: true }; });
    efectos.homologaciones.forEach(h => {
      if (ajustes.porPartido[h.partidoId] || ajustes.anulados[h.partidoId]) return;
      ajustes.porPartido[h.partidoId] = { golesLocal: h.golesLocal, golesVisita: h.golesVisita, simulado: true };
    });
    simulados.push(`${eq.nombre}: jugó ${conteo.jugados} de ${conteo.total} (la mitad es ${conteo.corte}) → ${efectos.validos
      ? `sus resultados quedan firmes y sus rivales pendientes ganan ${GOLES_PENDIENTE}-0`
      : 'se anulan todos sus partidos'}`);
  }
  return simulados;
}

// Recorre todos los resultados de los partidos que faltan y anota, para cada
// equipo, el peor y el mejor caso de cuántos rivales terminan arriba.
function recorrer(equipos, faltan) {
  const n = equipos.length;
  const idx = new Map(equipos.map((e, i) => [e.id, i]));
  const pts = equipos.map(e => e.pts);
  const peorMayorIgual = new Array(n).fill(0);  // máx. de otros con pts >= los suyos
  const peorMayor = new Array(n).fill(0);       // máx. de otros con pts > los suyos
  const mejorMayor = new Array(n).fill(Infinity); // mín. de otros con pts > los suyos
  const pares = faltan.map(p => [idx.get(p.local_id), idx.get(p.visita_id)]);
  const hoja = () => {
    for (let i = 0; i < n; i++) {
      let mayorIgual = 0, mayor = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        if (pts[j] >= pts[i]) mayorIgual++;
        if (pts[j] > pts[i]) mayor++;
      }
      if (mayorIgual > peorMayorIgual[i]) peorMayorIgual[i] = mayorIgual;
      if (mayor > peorMayor[i]) peorMayor[i] = mayor;
      if (mayor < mejorMayor[i]) mejorMayor[i] = mayor;
    }
  };
  const paso = k => {
    if (k === pares.length) return hoja();
    const [l, v] = pares[k];
    pts[l] += 3; paso(k + 1); pts[l] -= 3;
    pts[l] += 1; pts[v] += 1; paso(k + 1); pts[l] -= 1; pts[v] -= 1;
    pts[v] += 3; paso(k + 1); pts[v] -= 3;
  };
  paso(0);
  return { peorMayorIgual, peorMayor, mejorMayor };
}

// Cota cuando hay demasiados partidos para recorrerlos todos: compara los
// puntos actuales de cada uno con el máximo que pueden alcanzar los demás.
function acotar(equipos, faltan) {
  const restan = new Map(equipos.map(e => [e.id, 0]));
  faltan.forEach(p => { restan.set(p.local_id, restan.get(p.local_id) + 1); restan.set(p.visita_id, restan.get(p.visita_id) + 1); });
  const max = e => e.pts + 3 * restan.get(e.id);
  return {
    peorMayorIgual: equipos.map(e => equipos.filter(o => o !== e && max(o) >= e.pts).length),
    peorMayor: equipos.map(e => equipos.filter(o => o !== e && max(o) > e.pts).length),
    mejorMayor: equipos.map(e => equipos.filter(o => o !== e && o.pts > max(e)).length),
  };
}

async function main() {
  await db.init();
  const campeonato = await db.get("SELECT id, nombre, formato FROM campeonatos WHERE estado = 'activo' ORDER BY id DESC LIMIT 1");
  if (!campeonato) throw new Error('No hay un campeonato activo');
  const retiros = leerRetirados();
  const cupos = 4; // Clausura: 4 a semifinales. ADULTO del Nocturno: 4 por grupo a cuartos.
  const salida = [];
  const log = (t = '') => { salida.push(t); console.log(t); };
  log(`${campeonato.nombre} — análisis de clasificación al ${new Date().toLocaleDateString('es-CL')}`);
  log(`Clasifican los ${cupos} primeros. Análisis solo por puntos: un empate en puntos lo define la diferencia de gol.`);

  const series = (await db.all('SELECT DISTINCT serie FROM equipos WHERE campeonato_id = ?', [campeonato.id]))
    .map(r => r.serie).sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b));
  for (const serie of series) {
    const ajustes = await ajustesVigentes(campeonato.id, serie);
    const grupos = (await db.all('SELECT DISTINCT grupo FROM equipos WHERE campeonato_id = ? AND serie = ? ORDER BY grupo', [campeonato.id, serie])).map(r => r.grupo);
    for (const grupo of grupos) {
      const equipos = await db.all('SELECT id, nombre FROM equipos WHERE campeonato_id = ? AND serie = ? AND grupo = ?', [campeonato.id, serie, grupo]);
      const simulados = await simularRetiros(ajustes, equipos, retiros.filter(r => r.serie === serie));
      const tabla = await calcularTabla(campeonato.id, serie, grupo, ajustes);
      const enCarrera = tabla.filter(e => !e.descalificado);
      const fuera = new Set(tabla.filter(e => e.descalificado).map(e => e.id));
      const partidos = await db.all(
        `SELECT p.id, p.fecha, p.estado, p.local_id, p.visita_id, l.nombre AS local, v.nombre AS visita
         FROM partidos p JOIN equipos l ON l.id = p.local_id JOIN equipos v ON v.id = p.visita_id
         WHERE l.campeonato_id = ? AND p.serie = ? AND p.grupo = ? AND p.fase = 'grupos' ORDER BY p.fecha`,
        [campeonato.id, serie, grupo]
      );
      const faltan = partidos.filter(p => p.estado !== 'jugado' && !ajustes.porPartido[p.id] && !ajustes.anulados[p.id]
        && !(ajustes.mutuos && ajustes.mutuos[p.id]) && !fuera.has(p.local_id) && !fuera.has(p.visita_id));
      const exacto = faltan.length <= MAX_EXACTO;
      const r = exacto ? recorrer(enCarrera, faltan) : acotar(enCarrera, faltan);
      const restan = id => faltan.filter(p => p.local_id === id || p.visita_id === id).length;

      log();
      log(`═══ ${SERIES[serie] || serie}${grupos.length > 1 ? ` grupo ${grupo}` : ''} — faltan ${faltan.length} partidos${exacto ? '' : ' (análisis aproximado: demasiados partidos para recorrerlos todos)'}`);
      simulados.forEach(s => log(`  Retiro simulado (no registrado): ${s}`));
      log('  Pos  Equipo            PJ  Pts  Faltan  Máx  Situación');
      enCarrera.forEach((e, i) => {
        let estado;
        if (enCarrera.length <= cupos) estado = 'CLASIFICADO (no hay más equipos que cupos)';
        else if (r.peorMayorIgual[i] < cupos) estado = r.peorMayorIgual[i] === 0 ? 'CLASIFICADO y asegura el 1º lugar' : 'CLASIFICADO';
        else if (r.peorMayor[i] < cupos) estado = 'CLASIFICADO salvo desempate (diferencia de gol)';
        else if (r.mejorMayor[i] >= cupos) estado = 'ELIMINADO';
        else estado = 'En carrera';
        const pa = restan(e.id);
        log(`  ${String(i + 1).padStart(2)}º  ${e.nombre.padEnd(16)} ${String(e.pj).padStart(3)} ${String(e.pts).padStart(4)} ${String(pa).padStart(6)} ${String(e.pts + 3 * pa).padStart(5)}  ${estado}`);
      });
      tabla.filter(e => e.descalificado).forEach(e => log(`   —   ${e.nombre.padEnd(16)} retirado / descalificado${ajustes.descalificados[e.id] && ajustes.descalificados[e.id].simulado ? ' (simulado)' : ''}`));
      if (faltan.length) log(`  Faltan: ${faltan.map(p => `F${p.fecha} ${p.local}-${p.visita}${p.estado === 'aplazado' ? ' (pendiente)' : ''}`).join(' · ')}`);
    }
  }
  const dir = path.join(__dirname, 'informes');
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `clasificacion-${new Date().toISOString().slice(0, 10)}.txt`);
  fs.writeFileSync(archivo, salida.join('\n') + '\n');
  console.log(`\n✅ Guardado en ${archivo}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
