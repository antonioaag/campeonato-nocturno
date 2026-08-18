/**
 * Script para resetear la contraseña del admin en cualquier base de datos (local o Turso).
 * Se ejecuta al iniciar el servidor si ADMIN_PASSWORD está definida.
 */
const bcrypt = require('bcryptjs');
const db = require('./db');

async function resetearAdminPassword() {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    return; // No hacer nada si no está definida
  }

  try {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

    // Busca si existe un admin
    const admin = await db.get('SELECT id FROM usuarios WHERE rol = ?', ['admin']);

    if (admin) {
      // Actualiza la contraseña del admin existente
      await db.run(
        'UPDATE usuarios SET username = ?, password_hash = ? WHERE rol = ?',
        [ADMIN_USERNAME, hash, 'admin']
      );
      console.log(`✓ Contraseña del admin actualizada: ${ADMIN_USERNAME}`);
    } else {
      // Crea uno nuevo
      await db.run(
        'INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
        [ADMIN_USERNAME, hash, 'Administrador', 'admin']
      );
      console.log(`✓ Admin creado: ${ADMIN_USERNAME}`);
    }
  } catch (err) {
    console.error('Error reseteando contraseña del admin:', err.message);
  }
}

module.exports = { resetearAdminPassword };
