#!/usr/bin/env node
/**
 * Script: Diagnóstico del esquema de la base de datos
 *
 * Solo lectura. Muestra qué columnas tiene realmente cada tabla relevante,
 * para diagnosticar si una migración quedó a mitad de camino.
 */

require('dotenv').config();

const db = require('./server/db');

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║              Diagnóstico de esquema                        ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const tablas = ['campeonatos', 'equipos', 'partidos', 'byes', 'resoluciones', 'castigos'];

  for (const tabla of tablas) {
    try {
      const existe = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tabla]);
      if (!existe) {
        console.log(`❌ Tabla '${tabla}': NO EXISTE\n`);
        continue;
      }
      const columnas = await db.all(`PRAGMA table_info(${tabla})`);
      console.log(`✓ Tabla '${tabla}': ${columnas.map(c => c.name).join(', ')}`);
    } catch (e) {
      console.log(`⚠ Error revisando '${tabla}': ${e.message}`);
    }
  }

  console.log('');
  try {
    const campeonatos = await db.all('SELECT id, nombre, estado FROM campeonatos');
    console.log('Campeonatos:', JSON.stringify(campeonatos, null, 2));
  } catch (e) {
    console.log('No se pudo leer campeonatos:', e.message);
  }

  console.log(`\n═══════════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}).finally(() => process.exit(0));
