/**
 * Script para actualizar credenciales de admin en Turso (producción).
 * Requiere TURSO_DATABASE_URL y TURSO_AUTH_TOKEN como variables de entorno.
 */
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

async function main() {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_URL || !TURSO_TOKEN) {
    console.error('Error: TURSO_DATABASE_URL y TURSO_AUTH_TOKEN deben estar definidas');
    process.exit(1);
  }

  try {
    const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      console.error('Error: ADMIN_PASSWORD debe estar definida como variable de entorno');
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // Actualiza el admin en Turso
    const result = await client.execute({
      sql: 'UPDATE usuarios SET username = ?, password_hash = ? WHERE rol = ?',
      args: [username, passwordHash, 'admin']
    });

    if (result.rowsAffected > 0) {
      console.log('✓ Admin actualizado en Turso');
    } else {
      console.log('⚠ No se encontró admin para actualizar (intentando crear)');
      await client.execute({
        sql: 'INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
        args: [username, passwordHash, 'Administrador', 'admin']
      });
      console.log('✓ Admin creado en Turso');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
