#!/usr/bin/env node
/**
 * Script: Restaurar BD al estado anterior
 *
 * Revierte los cambios hechos por sincronizar-resoluciones.js y marcar-partidos-pendientes.js
 * - Pone estado 'programado' y limpia goles
 */

require('dotenv').config();

const db = require('./server/db');

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║              Restaurando BD al estado anterior            ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const serie = 'ADULTO';

  console.log('🔍 Buscando partidos modificados...\n');

  // Buscar partidos jugados (sin resoluciones) para revertir
  const partidosJugados = await db.all(
    `SELECT p.id, p.grupo, l.nombre AS local, v.nombre AS visita, p.estado
     FROM partidos p
     JOIN equipos l ON l.id = p.local_id
     JOIN equipos v ON v.id = p.visita_id
     WHERE p.serie = ? AND p.fase = 'grupos' AND p.estado = 'jugado'
       AND p.id NOT IN (
         SELECT partido_id FROM resoluciones
         WHERE estado = 'vigente' AND partido_id IS NOT NULL
       )
     ORDER BY p.grupo, p.id`,
    [serie]
  );

  if (partidosJugados.length === 0) {
    console.log('✓ No hay partidos para restaurar\n');
    process.exit(0);
  }

  console.log(`Encontrados ${partidosJugados.length} partidos a restaurar:\n`);
  partidosJugados.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.grupo}] ${p.local} vs ${p.visita}`);
  });

  // Restaurar a estado 'programado' sin goles
  console.log(`\n📝 Restaurando ${partidosJugados.length} partido(s) a estado 'programado'...\n`);

  const updates = [];
  partidosJugados.forEach(p => {
    updates.push({
      sql: `UPDATE partidos SET estado = 'programado', goles_local = NULL, goles_visita = NULL WHERE id = ?`,
      args: [p.id]
    });
  });

  await db.batch(updates);

  console.log('✓ Restauración completada\n');
  console.log(`═══════════════════════════════════════════════════════════\n`);
  console.log('✅ La BD ha sido restaurada');
  console.log('✅ Los partidos volvieron a estado "programado"\n');
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}).finally(() => process.exit(0));
