// Sorteo del fixture de una serie cuando NO se juega todos contra todos: cada
// equipo tiene asegurada una cantidad fija de partidos (6 en Clausura 2026)
// repartidos en una cantidad fija de fechas (7), y las fechas que le sobran
// las queda libre.
//
// Por qué no sirve el round robin de fixtureGenerator.js: con 8 equipos el
// todos contra todos son 7 partidos y con 11 son 10. Cortarlo a las 6 primeras
// fechas tampoco sirve, porque con 9 u 11 equipos dejaría a unos con 6 y a
// otros con 5 (el libre del círculo cae en fechas distintas para cada uno).
//
// El sorteo es reproducible a propósito: el mismo texto de semilla produce
// siempre el mismo fixture. Así se puede publicar la semilla junto con el
// fixture y cualquier club puede comprobar que no se armó a mano.

// Generador pseudoaleatorio con semilla (mulberry32). Math.random() no sirve
// porque no se puede repetir.
function crearAzar(semilla) {
  let h = 1779033703 ^ semilla.length;
  for (let i = 0; i < semilla.length; i++) {
    h = Math.imul(h ^ semilla.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let estado = h >>> 0;
  return function () {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajar(lista, azar) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Cuántos equipos quedan libres en cada fecha. En una fecha juegan de a dos,
// así que la cantidad de libres tiene que tener la misma paridad que la
// cantidad de equipos; dentro de eso se reparten lo más parejo posible.
//   8 equipos: 2,2,2,2,0,0,0   9 equipos: 3,1,1,1,1,1,1   11: 3,3,1,1,1,1,1
function libresPorFecha(cantidadEquipos, fechas, totalLibres) {
  const minimo = cantidadEquipos % 2;
  const tamanos = Array(fechas).fill(minimo);
  let restantes = totalLibres - minimo * fechas;
  if (restantes < 0 || restantes % 2 !== 0) {
    throw new Error(`No se pueden repartir ${totalLibres} libres de ${cantidadEquipos} equipos en ${fechas} fechas`);
  }
  for (let i = 0; restantes > 0; i = (i + 1) % fechas) {
    tamanos[i] += 2;
    restantes -= 2;
  }
  return tamanos;
}

function clavePar(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Empareja a todos los equipos de la lista sin repetir un cruce ya usado.
// Backtracking simple: con 11 equipos como máximo es instantáneo.
function emparejar(equipos, usados, azar) {
  if (equipos.length === 0) return [];
  const [primero, ...resto] = equipos;
  for (const rival of barajar(resto, azar)) {
    if (usados.has(clavePar(primero, rival))) continue;
    const sinRival = resto.filter(x => x !== rival);
    const demas = emparejar(sinRival, usados, azar);
    if (demas) return [[primero, rival], ...demas];
  }
  return null;
}

// Decide quién es local en cada partido de modo que todos sean local en la
// mitad de sus partidos. Con 6 partidos por equipo cada uno tiene grado par
// en el grafo de cruces, y un grafo así siempre se puede recorrer en circuitos
// de Euler: orientar cada arista en el sentido del recorrido deja a cada
// equipo exactamente 3 veces local y 3 de visita.
function orientarLocalias(partidos) {
  const adyacencia = new Map();
  partidos.forEach((p, i) => {
    for (const [desde, hacia] of [[p[0], p[1]], [p[1], p[0]]]) {
      if (!adyacencia.has(desde)) adyacencia.set(desde, []);
      adyacencia.get(desde).push({ hacia, i });
    }
  });
  const usada = Array(partidos.length).fill(false);
  const orientados = Array(partidos.length);
  for (const inicio of adyacencia.keys()) {
    // Hierholzer iterativo: cada arista se orienta cuando se la recorre.
    const pila = [inicio];
    while (pila.length) {
      const actual = pila[pila.length - 1];
      const aristas = adyacencia.get(actual);
      while (aristas.length && usada[aristas[aristas.length - 1].i]) aristas.pop();
      if (!aristas.length) { pila.pop(); continue; }
      const { hacia, i } = aristas.pop();
      usada[i] = true;
      orientados[i] = { local: actual, visita: hacia };
      pila.push(hacia);
    }
  }
  return orientados;
}

// equipos: lista de ids (o nombres). Devuelve
//   [{ numero, partidos: [{ local, visita }], libres: [id] }]
function sortearFixture(equipos, { partidosPorEquipo, fechas, semilla }) {
  const n = equipos.length;
  if (new Set(equipos).size !== n) throw new Error('Hay equipos repetidos en la serie');
  if (partidosPorEquipo >= n) throw new Error(`Con ${n} equipos nadie puede jugar ${partidosPorEquipo} partidos sin repetir rival`);
  if ((n * partidosPorEquipo) % 2 !== 0) throw new Error(`${n} equipos no pueden jugar ${partidosPorEquipo} partidos cada uno: queda un partido sin rival`);
  const libresCadaUno = fechas - partidosPorEquipo;
  if (libresCadaUno !== 1) {
    // El reparto de abajo asume un solo libre por equipo, que es el formato
    // de Clausura 2026. Otro formato necesita repensar cómo se reparten.
    throw new Error('El sorteo está preparado para que cada equipo quede libre exactamente una vez');
  }

  const azar = crearAzar(semilla);
  const tamanos = barajar(libresPorFecha(n, fechas, n * libresCadaUno), azar);

  for (let intento = 0; intento < 5000; intento++) {
    const orden = barajar(equipos, azar);
    const libres = [];
    let desde = 0;
    tamanos.forEach(t => { libres.push(orden.slice(desde, desde + t)); desde += t; });

    const usados = new Set();
    const cruces = [];
    let ok = true;
    for (let f = 0; f < fechas && ok; f++) {
      const juegan = barajar(equipos.filter(e => !libres[f].includes(e)), azar);
      const pares = emparejar(juegan, usados, azar);
      if (!pares) { ok = false; break; }
      pares.forEach(([a, b]) => { usados.add(clavePar(a, b)); cruces.push({ fecha: f + 1, par: [a, b] }); });
    }
    if (!ok) continue;

    const orientados = orientarLocalias(cruces.map(c => c.par));
    return Array.from({ length: fechas }, (_, f) => ({
      numero: f + 1,
      partidos: cruces.map((c, i) => ({ ...orientados[i], fecha: c.fecha }))
        .filter(p => p.fecha === f + 1)
        .map(({ local, visita }) => ({ local, visita })),
      libres: libres[f],
    }));
  }
  throw new Error('No se encontró un fixture válido. Prueba con otra semilla.');
}

// Comprueba que un fixture cumpla las reglas. Se usa en las pruebas y antes
// de guardar, para no confiar a ciegas en el sorteo.
// exigirLocalia en false sirve para un fixture armado a mano o con todas las
// series a la vez, donde la asociación decidió no equilibrar la localía.
function validarFixture(equipos, fixture, partidosPorEquipo, { exigirLocalia = true } = {}) {
  const jugados = new Map(equipos.map(e => [e, 0]));
  const locales = new Map(equipos.map(e => [e, 0]));
  const libres = new Map(equipos.map(e => [e, 0]));
  const pares = new Set();
  for (const fecha of fixture) {
    const enFecha = new Set();
    for (const { local, visita } of fecha.partidos) {
      for (const e of [local, visita]) {
        if (enFecha.has(e)) return `${e} juega dos veces en la fecha ${fecha.numero}`;
        enFecha.add(e);
        jugados.set(e, jugados.get(e) + 1);
      }
      locales.set(local, locales.get(local) + 1);
      const clave = clavePar(local, visita);
      if (pares.has(clave)) return `${local} y ${visita} se enfrentan dos veces`;
      pares.add(clave);
    }
    for (const e of fecha.libres) {
      if (enFecha.has(e)) return `${e} juega y está libre en la fecha ${fecha.numero}`;
      enFecha.add(e);
      libres.set(e, libres.get(e) + 1);
    }
    if (enFecha.size !== equipos.length) return `En la fecha ${fecha.numero} falta algún equipo`;
  }
  for (const e of equipos) {
    if (jugados.get(e) !== partidosPorEquipo) return `${e} juega ${jugados.get(e)} partidos`;
    if (libres.get(e) !== 1) return `${e} queda libre ${libres.get(e)} veces`;
    if (exigirLocalia && locales.get(e) !== partidosPorEquipo / 2) return `${e} es local ${locales.get(e)} veces`;
  }
  return null;
}

// Suma días a una fecha 'YYYY-MM-DD' sin pasar por la zona horaria del
// servidor (Render corre en UTC y un viernes no puede volverse jueves).
function sumarDias(fechaISO, dias) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

const DIAS_ENTRE_FECHAS = 7;

// Sortea el fixture de una serie de un campeonato y lo guarda, reemplazando
// el que hubiera. Se niega si la serie ya tiene algún resultado cargado o
// alguna resolución: volver a sortear borraría partidos ya jugados.
//
// Cada fecha se programa una semana después de la anterior a partir de
// fechaInicio. Si una fecha se suspende, el admin corre los días a mano
// desde "Editar" en cada partido.
async function sortearYGuardar(campeonatoId, serie, { fechaInicio, semilla, partidosPorEquipo = 6, fechas = 7 }) {
  const db = require('./db');
  const error = (status, mensaje) => Object.assign(new Error(mensaje), { status });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fechaInicio || ''))) throw error(400, 'fechaInicio debe tener formato YYYY-MM-DD');
  if (!semilla || !String(semilla).trim()) throw error(400, 'La semilla del sorteo es obligatoria');

  const equipos = await db.all(
    'SELECT id, nombre, grupo FROM equipos WHERE campeonato_id = ? AND serie = ? ORDER BY nombre',
    [campeonatoId, serie]
  );
  if (equipos.length < partidosPorEquipo + 1) {
    throw error(400, `${serie} tiene ${equipos.length} equipos inscritos: se necesitan al menos ${partidosPorEquipo + 1}`);
  }
  const grupos = [...new Set(equipos.map(e => e.grupo))];
  if (grupos.length !== 1) throw error(400, `El sorteo es para un grupo único y ${serie} tiene ${grupos.length} grupos`);
  const grupo = grupos[0];

  const delCampeonato = 'local_id IN (SELECT id FROM equipos WHERE campeonato_id = ?)';
  const { jugados } = await db.get(
    `SELECT COUNT(*) AS jugados FROM partidos WHERE ${delCampeonato} AND serie = ? AND estado = 'jugado'`,
    [campeonatoId, serie]
  );
  if (Number(jugados) > 0) throw error(409, `${serie} ya tiene ${jugados} partido(s) jugados: no se puede volver a sortear`);
  const { resoluciones } = await db.get(
    `SELECT COUNT(*) AS resoluciones FROM resoluciones r JOIN partidos p ON p.id = r.partido_id
     WHERE p.${delCampeonato} AND p.serie = ?`,
    [campeonatoId, serie]
  );
  if (Number(resoluciones) > 0) throw error(409, `${serie} ya tiene resoluciones sobre sus partidos: no se puede volver a sortear`);

  // El sorteo se hace sobre los ids ordenados por nombre, así la misma
  // semilla da el mismo fixture aunque los equipos se hayan inscrito en
  // otro orden.
  const ids = equipos.map(e => e.id);
  const fixture = sortearFixture(ids, { partidosPorEquipo, fechas, semilla: String(semilla).trim() });
  const problema = validarFixture(ids, fixture, partidosPorEquipo);
  if (problema) throw new Error(`El sorteo salió inválido: ${problema}`);

  const sentencias = [
    { sql: `DELETE FROM partidos WHERE ${delCampeonato} AND serie = ?`, args: [campeonatoId, serie] },
    { sql: 'DELETE FROM byes WHERE equipo_id IN (SELECT id FROM equipos WHERE campeonato_id = ?) AND serie = ?', args: [campeonatoId, serie] },
  ];
  fixture.forEach(f => {
    const dia = sumarDias(fechaInicio, (f.numero - 1) * DIAS_ENTRE_FECHAS);
    f.partidos.forEach(p => sentencias.push({
      sql: `INSERT INTO partidos (serie, grupo, fecha, local_id, visita_id, estado, fecha_partido)
            VALUES (?, ?, ?, ?, ?, 'programado', ?)`,
      args: [serie, grupo, f.numero, p.local, p.visita, dia],
    }));
    f.libres.forEach(id => sentencias.push({
      sql: 'INSERT INTO byes (serie, grupo, fecha, equipo_id) VALUES (?, ?, ?, ?)',
      args: [serie, grupo, f.numero, id],
    }));
  });
  await db.batch(sentencias);

  const nombre = Object.fromEntries(equipos.map(e => [e.id, e.nombre]));
  return {
    serie,
    semilla: String(semilla).trim(),
    fechas: fixture.map(f => ({
      numero: f.numero,
      dia: sumarDias(fechaInicio, (f.numero - 1) * DIAS_ENTRE_FECHAS),
      partidos: f.partidos.map(p => ({ local: nombre[p.local], visita: nombre[p.visita] })),
      libres: f.libres.map(id => nombre[id]),
    })),
  };
}

module.exports = { sortearFixture, validarFixture, crearAzar, sumarDias, sortearYGuardar };
