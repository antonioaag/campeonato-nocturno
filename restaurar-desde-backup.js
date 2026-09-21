#!/usr/bin/env node
/**
 * Script: Restaurar la BD desde un archivo de respaldo
 *
 * Uso: node restaurar-desde-backup.js backups/backup-2026-09-21T22-53-00-000Z.json
 *
 * Reemplaza el contenido de cada tabla del respaldo por el de la BD actual
 * (DELETE + INSERT fila por fila). No toca tablas que no estén en el archivo.
 */

require('dotenv').config();

const fs = require('fs');
const db = require('./server/db');

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error('\n❌ Falta el archivo de respaldo. Uso: node restaurar-desde-backup.js backups/backup-....json\n');
    process.exit(1);
  }
  if (!fs.existsSync(archivo)) {
    console.error(`\n❌ No existe el archivo: ${archivo}\n`);
    process.exit(1);
  }

  const respaldo = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║           Restaurando BD desde respaldo                   ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  console.log(`Respaldo creado el: ${respaldo.creadoAt}\n`);

  for (const [tabla, filas] of Object.entries(respaldo.tablas)) {
    if (filas.length === 0) {
      await db.run(`DELETE FROM ${tabla}`);
      console.log(`✓ ${tabla}: vaciada (0 filas en el respaldo)`);
      continue;
    }

    const columnas = Object.keys(filas[0]);
    const placeholders = columnas.map(() => '?').join(', ');
    const updates = [
      { sql: `DELETE FROM ${tabla}`, args: [] },
      ...filas.map(fila => ({
        sql: `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${placeholders})`,
        args: columnas.map(c => fila[c]),
      })),
    ];

    await db.batch(updates);
    console.log(`✓ ${tabla}: ${filas.length} filas restauradas`);
  }

  console.log(`\n═══════════════════════════════════════════════════════════\n`);
  console.log('✅ Restauración completada\n');
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}).finally(() => process.exit(0));
