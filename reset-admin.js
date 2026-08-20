/**
 * Script para resetear credenciales de admin.
 * Uso: node reset-admin.js
 * Luego ingresa el nuevo username y password cuando se solicite.
 */
const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('./server/db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  try {
    await db.init();

    const username = await question('Nuevo username para admin: ');
    const password = await question('Nueva contraseña: ');

    if (!username || !password) {
      console.log('Error: Username y contraseña son requeridos');
      process.exit(1);
    }

    if (password.length < 6) {
      console.log('Error: La contraseña debe tener al menos 6 caracteres');
      process.exit(1);
    }

    // Hash la contraseña
    const passwordHash = bcrypt.hashSync(password, 10);

    // Busca si ya existe un admin
    const adminExistente = await db.get('SELECT id FROM usuarios WHERE rol = ?', ['admin']);

    if (adminExistente) {
      // Actualiza el admin existente
      await db.run(
        'UPDATE usuarios SET username = ?, password_hash = ? WHERE rol = ?',
        [username, passwordHash, 'admin']
      );
      console.log('\n✓ Admin actualizado exitosamente');
    } else {
      // Crea un nuevo admin
      await db.run(
        'INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
        [username, passwordHash, 'Administrador', 'admin']
      );
      console.log('\n✓ Admin creado exitosamente');
    }

    console.log(`\n✓ Credenciales guardadas en la base de datos`);

    rl.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    rl.close();
    process.exit(1);
  }
}

main();
