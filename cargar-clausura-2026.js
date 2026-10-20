/**
 * Inscribe los equipos del Campeonato Clausura 2026 y sortea el fixture de
 * sus 6 series. Uso puntual: se corre una vez, contra la base que apunte el
 * .env (¡producción!).
 *
 *   node cargar-clausura-2026.js           muestra lo que haría, sin escribir
 *   node cargar-clausura-2026.js --aplicar inscribe y sortea
 *
 * Formato acordado con la asociación: cada equipo juega 6 partidos en 7
 * fechas y queda libre una sola vez; una fecha por semana desde el viernes
 * 23/10/2026; los 4 primeros de cada serie van a semifinales (1º-4º, 2º-3º)
 * y después la final.
 *
 * Es reproducible: con las mismas semillas el sorteo da exactamente el mismo
 * fixture, que es el que se revisó antes de cargarlo. Es seguro correrlo dos
 * veces: un equipo ya inscrito no se duplica y una serie que ya tiene
 * fixture no se vuelve a sortear.
 */
require('dotenv').config();
const db = require('./server/db');
const { sortearYGuardar } = require('./server/sorteo');

const CAMPEONATO = 'Campeonato Clausura 2026';
const FECHA_INICIO = '2026-10-23';
const GRUPO = 'U'; // grupo único por serie

// Planilla de inscripción entregada por la asociación (una X = tiene la serie).
// "PATENSE" en la planilla es PLATENSE, el mismo club del Nocturno 2026.
const EQUIPOS = {
  SUB13: ['INDEPENDIENTE', 'CHAYAIHUE', 'FLAMENGO', 'VECINAL', 'ESTOCOLMO', 'BOROA', 'PLATENSE', '10 DE MARZO'],
  SUB15: ['INDEPENDIENTE', 'CHAYAIHUE', 'FLAMENGO', 'VECINAL', 'ESTOCOLMO', 'BOROA', 'PICHANGA', '10 DE MARZO'],
  SUB17: ['INDEPENDIENTE', 'CHAYAIHUE', 'FLAMENGO', 'SAO PAULO', 'J. OVALLE', 'ESTOCOLMO', 'PLATENSE', '10 DE MARZO'],
  SENIOR: ['INDEPENDIENTE', 'CHAYAIHUE', 'FLAMENGO', 'VECINAL', 'SAO PAULO', 'J. OVALLE', 'ESTOCOLMO', 'BOROA', 'PICHANGA', 'PLATENSE', '10 DE MARZO'],
  SEGUNDA_ADULTO: ['INDEPENDIENTE', 'CHAYAIHUE', 'FLAMENGO', 'VECINAL', 'SAO PAULO', 'J. OVALLE', 'ESTOCOLMO', 'BOROA', 'PICHANGA', 'PLATENSE', '10 DE MARZO'],
  PRIMERA_ADULTO: ['INDEPENDIENTE', 'CHAYAIHUE', 'FLAMENGO', 'SAO PAULO', 'J. OVALLE', 'BOROA', 'PICHANGA', 'PLATENSE', '10 DE MARZO'],
};

function semilla(serie) {
  return `Liga Dávila · Clausura 2026 · ${serie}`;
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  await db.init();

  const c = await db.get("SELECT id, nombre, estado FROM campeonatos WHERE nombre = ?", [CAMPEONATO]);
  if (!c) throw new Error(`No existe "${CAMPEONATO}"`);
  if (c.estado !== 'activo') throw new Error(`"${CAMPEONATO}" no está activo (estado: ${c.estado})`);
  console.log(`${CAMPEONATO} (#${c.id})${aplicar ? '' : '  — SIMULACIÓN, no se escribe nada (usa --aplicar)'}\n`);

  for (const [serie, nombres] of Object.entries(EQUIPOS)) {
    const actuales = await db.all(
      'SELECT id, nombre, grupo FROM equipos WHERE campeonato_id = ? AND serie = ?', [c.id, serie]
    );
    // Si la serie ya tiene equipos que no están en la planilla, algo no
    // cuadra (una prueba anterior, un nombre mal escrito): mejor parar que
    // sortear con un equipo de más.
    const sobran = actuales.filter(e => !nombres.includes(e.nombre));
    if (sobran.length) {
      throw new Error(`${serie} ya tiene equipos que no están en la planilla: ${sobran.map(e => e.nombre).join(', ')}`);
    }
    const faltan = nombres.filter(n => !actuales.some(e => e.nombre === n));

    const { n: partidos } = await db.get(
      `SELECT COUNT(*) AS n FROM partidos
       WHERE local_id IN (SELECT id FROM equipos WHERE campeonato_id = ?) AND serie = ?`,
      [c.id, serie]
    );

    console.log(`${serie}: ${nombres.length} equipos (${faltan.length} por inscribir), ${partidos} partidos cargados`);
    if (!aplicar) continue;

    for (const [i, nombre] of faltan.entries()) {
      await db.run(
        'INSERT INTO equipos (nombre, serie, grupo, orden, campeonato_id) VALUES (?, ?, ?, ?, ?)',
        [nombre, serie, GRUPO, actuales.length + i + 1, c.id]
      );
    }

    if (Number(partidos) > 0) {
      console.log('  ya tiene fixture: no se vuelve a sortear');
      continue;
    }
    const resultado = await sortearYGuardar(c.id, serie, { fechaInicio: FECHA_INICIO, semilla: semilla(serie) });
    resultado.fechas.forEach(f => {
      console.log(`  Fecha ${f.numero} (${f.dia}): ${f.partidos.map(p => `${p.local} vs ${p.visita}`).join(' · ')}  | Libre: ${f.libres.join(', ')}`);
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
