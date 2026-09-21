#!/usr/bin/env node
/**
 * Script: Reordenar el cruce de semifinales de ADULTO
 *
 * Los 4 semifinalistas ya están definidos por los resultados de cuartos
 * (que no se tocan). Este script solo cambia QUIÉN se enfrenta a quién en
 * las dos semifinales, que todavía están "pendiente" (sin jugar):
 *   Llave 1: CHAYAIHUE (local) vs PICHANGA (visita)
 *   Llave 2: BOROA (local) vs INDEPENDIENTE (visita)
 */

require('dotenv').config();

const db = require('./server/db');

const CRUCES = [
  { llave: 1, local: 'CHAYAIHUE', visita: 'PICHANGA' },
  { llave: 2, local: 'BOROA', visita: 'INDEPENDIENTE' },
];

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║        Reordenando semifinales de ADULTO                  ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const serie = 'ADULTO';

  const semis = await db.all(
    "SELECT id, llave, estado, goles_local, goles_visita FROM partidos WHERE serie = ? AND fase = 'semifinal' ORDER BY llave",
    [serie]
  );

  if (semis.length !== 2) {
    console.error(`❌ Se esperaban 2 partidos de semifinal y se encontraron ${semis.length}. Aborto.`);
    process.exit(1);
  }

  const yaJugado = semis.find(s => s.estado === 'jugado');
  if (yaJugado) {
    console.error(`❌ La llave ${yaJugado.llave} de semifinal ya está jugada. No se puede reordenar sin tocar un resultado.`);
    process.exit(1);
  }

  const equipos = await db.all('SELECT id, nombre FROM equipos WHERE serie = ?', [serie]);
  const idPorNombre = {};
  equipos.forEach(e => { idPorNombre[e.nombre.toUpperCase()] = e.id; });

  const updates = [];
  for (const cruce of CRUCES) {
    const localId = idPorNombre[cruce.local.toUpperCase()];
    const visitaId = idPorNombre[cruce.visita.toUpperCase()];
    if (!localId || !visitaId) {
      console.error(`❌ No se encontró el equipo "${cruce.local}" o "${cruce.visita}" en ADULTO. Aborto.`);
      process.exit(1);
    }
    const partido = semis.find(s => s.llave === cruce.llave);
    console.log(`Llave ${cruce.llave}: ${cruce.local} vs ${cruce.visita}`);
    updates.push({
      sql: 'UPDATE partidos SET local_id = ?, visita_id = ? WHERE id = ?',
      args: [localId, visitaId, partido.id],
    });
  }

  console.log('\n📝 Aplicando cambios...\n');
  await db.batch(updates);

  console.log('✓ Semifinales reordenadas\n');
  console.log(`═══════════════════════════════════════════════════════════\n`);
  console.log('✅ Listo. Los cuartos de final no fueron modificados.\n');
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}).finally(() => process.exit(0));
