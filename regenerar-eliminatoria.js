#!/usr/bin/env node
require('dotenv').config();
const db = require('./server/db');
const { armarCuartos, GRUPO_PLAYOFF, JORNADA_POR_FASE } = require('./server/playoffs');

(async () => {
  try {
    await db.init();
    console.log('Conectado a la base de datos...\n');

    // 1. Borrar cuartos existentes
    const resultado = await db.run(
      "DELETE FROM partidos WHERE serie = 'SENIOR' AND fase != 'grupos'"
    );
    console.log(`✓ Eliminadas las eliminatorias anteriores (${resultado.changes} filas)\n`);

    // 2. Regenerar cuartos
    const cruces = (await armarCuartos('SENIOR')).map(c => ({
      llave: c.llave,
      local: c.local.nombre,
      localId: c.local.id,
      visita: c.visita.nombre,
      visitaId: c.visita.id
    }));

    console.log('Bracket regenerado:');
    cruces.forEach(c => {
      console.log(`  Llave ${c.llave}: ${c.local} (${c.localId}) vs ${c.visita} (${c.visitaId})`);
    });

    // 3. Insertar en la base de datos
    const jornada = JORNADA_POR_FASE['cuartos'];
    const inserts = cruces.map(c => ({
      sql: `INSERT INTO partidos (serie, grupo, fase, llave, fecha, local_id, visita_id, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'programado')`,
      args: ['SENIOR', GRUPO_PLAYOFF, 'cuartos', c.llave, jornada, c.localId, c.visitaId],
    }));

    await db.batch(inserts);
    console.log(`\n✓ Cuartos generados: ${cruces.length} llaves insertadas`);

    // 4. Modificar LLAVE 1 a PICHANGA vs INDEPENDIENTE
    await db.run(
      "UPDATE partidos SET local_id = ?, visita_id = ? WHERE serie = 'SENIOR' AND fase = 'cuartos' AND llave = 1",
      [24, 15]
    );
    console.log('✓ LLAVE 1 modificada: PICHANGA (24) vs INDEPENDIENTE (15)\n');

    // 5. Verificar resultado final
    const partidos = await db.all(
      "SELECT llave, local_id, visita_id FROM partidos WHERE serie = 'SENIOR' AND fase = 'cuartos' ORDER BY llave"
    );

    const equipos = await db.all('SELECT id, nombre FROM equipos WHERE serie = ?', ['SENIOR']);
    const equipoMap = {};
    equipos.forEach(e => { equipoMap[e.id] = e.nombre; });

    console.log('=== BRACKET FINAL SENIOR ===');
    partidos.forEach(p => {
      console.log(`Llave ${p.llave}: ${equipoMap[p.local_id]} vs ${equipoMap[p.visita_id]}`);
    });

    console.log('\n✓ Los cambios se aplicaron correctamente a tu base de datos de producción.');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
