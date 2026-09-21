#!/usr/bin/env node
/**
 * Script: Respaldo completo de la base de datos
 *
 * Exporta todas las tablas a un archivo JSON con timestamp, para poder
 * restaurar el estado exacto de hoy si algo sale mal más adelante.
 * Solo lectura: no modifica nada en la BD.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const db = require('./server/db');

const TABLAS = [
  'usuarios',
  'equipos',
  'partidos',
  'byes',
  'jugadores',
  'listas_inscripcion',
  'resoluciones',
  'reclamos',
  'configuracion',
  'castigos',
];

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║                Respaldo completo de la BD                 ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const respaldo = { creadoAt: new Date().toISOString(), tablas: {} };

  for (const tabla of TABLAS) {
    try {
      const filas = await db.all(`SELECT * FROM ${tabla}`);
      respaldo.tablas[tabla] = filas;
      console.log(`✓ ${tabla}: ${filas.length} filas`);
    } catch (e) {
      console.log(`⚠ ${tabla}: no existe o falló (${e.message})`);
    }
  }

  const carpeta = path.join(__dirname, 'backups');
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivo = path.join(carpeta, `backup-${timestamp}.json`);
  fs.writeFileSync(archivo, JSON.stringify(respaldo, null, 2));

  console.log(`\n═══════════════════════════════════════════════════════════\n`);
  console.log(`✅ Respaldo guardado en: ${archivo}\n`);
  console.log('Guarda este archivo en un lugar seguro (fuera de la carpeta del');
  console.log('proyecto), por ejemplo en Google Drive o OneDrive.\n');
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}).finally(() => process.exit(0));
