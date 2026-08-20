const bcrypt = require('bcryptjs');
const db = require('./server/db');

async function main() {
  try {
    await db.init();

    const username = 'admin';
    const password = 'Said.0512';
    const passwordHash = bcrypt.hashSync(password, 10);

    // Verifica si existe un admin
    const admin = await db.get('SELECT id FROM usuarios WHERE rol = ?', ['admin']);

    if (admin) {
      // Actualiza
      await db.run(
        'UPDATE usuarios SET username = ?, password_hash = ? WHERE rol = ?',
        [username, passwordHash, 'admin']
      );
      console.log('✓ Admin actualizado');
    } else {
      // Crea nuevo
      await db.run(
        'INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
        [username, passwordHash, 'Administrador', 'admin']
      );
      console.log('✓ Admin creado');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
