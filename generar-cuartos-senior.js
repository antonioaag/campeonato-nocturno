#!/usr/bin/env node
/**
 * Script: Generar cuartos de final SENIOR
 *
 * Genera los cruces de cuartos de final para la serie SENIOR
 * basados en las posiciones de la tabla de grupos
 */

require('dotenv').config();

const db = require('./server/db');
const { marcarClasificados, calcularTodasLasTablas } = require('./server/tablas');
const { JORNADA_POR_FASE, GRUPO_PLAYOFF } = require('./server/playoffs');

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║              Generando cuartos de final SENIOR            ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const serie = 'SENIOR';

  // Verificar si ya existen cuartos
  const cuartosExistentes = await db.all(
    'SELECT id FROM partidos WHERE serie = ? AND fase = ?',
    [serie, 'cuartos']
  );

  if (cuartosExistentes.length > 0) {
    console.log('⚠️  Los cuartos de SENIOR ya existen. Eliminando...\n');
    await db.run('DELETE FROM partidos WHERE serie = ? AND fase = ?', [serie, 'cuartos']);
  }

  // Obtener tablas de grupos
  console.log('🔍 Calculando tabla de posiciones...\n');
  const tablas = marcarClasificados(serie, await calcularTodasLasTablas(serie));

  // Mostrar los 8 equipos clasificados
  console.log('Equipos clasificados a cuartos:\n');
  let ranking = [];
  Object.entries(tablas).forEach(([grupo, equipos]) => {
    equipos.forEach((eq, idx) => {
      if (idx < 2) {
        ranking.push({ grupo, ...eq });
      }
    });
  });

  // Ordenar por puntos, diferencia, goles a favor
  ranking.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if ((b.goles_favor - b.goles_contra) !== (a.goles_favor - a.goles_contra)) {
      return (b.goles_favor - b.goles_contra) - (a.goles_favor - a.goles_contra);
    }
    if (b.goles_favor !== a.goles_favor) return b.goles_favor - a.goles_favor;
    return a.nombre.localeCompare(b.nombre);
  });

  ranking.slice(0, 8).forEach((eq, idx) => {
    console.log(`${idx + 1}. [${eq.grupo}] ${eq.nombre} - ${eq.puntos}pts, ${eq.goles_favor - eq.goles_contra}dg`);
  });

  // Armar los cruces: 1v8, 2v7, 3v6, 4v5
  const cruces = [
    { llave: 1, local: ranking[0], visita: ranking[7] },
    { llave: 2, local: ranking[1], visita: ranking[6] },
    { llave: 3, local: ranking[2], visita: ranking[5] },
    { llave: 4, local: ranking[3], visita: ranking[4] },
  ];

  console.log('\n📋 Cruces de cuartos:\n');
  cruces.forEach(c => {
    console.log(`Llave ${c.llave}: ${c.local.nombre} vs ${c.visita.nombre}`);
  });

  // Generar en BD
  console.log('\n📝 Generando cuartos en la BD...\n');
  const jornada = JORNADA_POR_FASE['cuartos'];
  const updates = cruces.map(c => ({
    sql: `INSERT INTO partidos (serie, grupo, fase, llave, fecha, local_id, visita_id, estado)
          VALUES (?, ?, 'cuartos', ?, ?, ?, ?, 'programado')`,
    args: [serie, GRUPO_PLAYOFF, c.llave, jornada, c.local.id, c.visita.id],
  }));

  await db.batch(updates);

  console.log(`✓ ${cruces.length} partidos de cuartos generados\n`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  console.log('✅ Los cuartos de SENIOR están listos\n');
  console.log('Próximo paso: Ingresa los resultados en la web\n');
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}).finally(() => process.exit(0));
