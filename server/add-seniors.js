/**
 * Migración segura para producción: agrega la serie SENIOR (equipos, fixture
 * y resultados de Fecha 1) a una base de datos que ya tiene datos reales de
 * la serie ADULTO cargados. No borra ni modifica nada de ADULTO ni usuarios
 * existentes. Es seguro correrlo más de una vez: si la serie SENIOR ya tiene
 * equipos cargados, no hace nada (para volver a generarla desde cero hay que
 * usar la pestaña Equipos > Regenerar Fixture, o borrar manualmente).
 *
 * Uso: node server/add-seniors.js   (con TURSO_DATABASE_URL/TURSO_AUTH_TOKEN
 * en el entorno o en .env, igual que el resto de los scripts del servidor)
 */
require('dotenv').config();
const db = require('./db');
const { seedSerieSenior, crearAdminSiNoExiste } = require('./seed');

async function main() {
  await db.init();

  const existente = await db.get("SELECT COUNT(*) AS n FROM equipos WHERE serie = 'SENIOR'");
  if (existente.n > 0) {
    console.log(`La serie SENIOR ya tiene ${existente.n} equipos cargados. No se hizo ningún cambio.`);
    return;
  }

  await seedSerieSenior();
  await crearAdminSiNoExiste(); // no-op si el admin ya existe

  console.log('Serie SENIOR agregada correctamente. La serie ADULTO no fue modificada.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
