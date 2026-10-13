#!/usr/bin/env node
/**
 * Script: Completar migraciones pendientes
 *
 * Llama a la misma rutina de inicialización que usa el servidor
 * (db.init()), que aplica cada migración solo si todavía no se aplicó.
 * Sirve para terminar una migración que quedó a medias (por ejemplo, si
 * el servidor se cayó a mitad de camino en un deploy anterior).
 */

require('dotenv').config();

const db = require('./server/db');

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║           Completando migraciones pendientes               ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  await db.init();

  console.log(`\n═══════════════════════════════════════════════════════════\n`);
  console.log('✅ Migraciones al día\n');
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  console.error(err);
  process.exit(1);
}).finally(() => process.exit(0));
