const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Todas las rutas de este archivo requieren estar autenticado Y ser admin.
router.use(requireAuth, requireAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const usuarios = await db.all('SELECT id, username, nombre, rol, created_at FROM usuarios ORDER BY id');
  res.json(usuarios);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { username, password, nombre, rol } = req.body || {};
  if (!username || !password || !nombre) {
    return res.status(400).json({ error: 'Falta username, password o nombre' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La clave debe tener al menos 6 caracteres' });
  }
  const rolFinal = rol === 'admin' ? 'admin' : 'encargado';

  const existe = await db.get('SELECT id FROM usuarios WHERE username = ?', [username]);
  if (existe) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(`
    INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)
  `, [username, hash, nombre, rolFinal]);

  res.status(201).json({ id: info.lastInsertRowid, username, nombre, rol: rolFinal });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { nombre, rol, password } = req.body || {};

  if (rol && rol !== usuario.rol && usuario.rol === 'admin') {
    const otrosAdmins = (await db.get("SELECT COUNT(*) as n FROM usuarios WHERE rol = 'admin' AND id != ?", [id])).n;
    if (otrosAdmins === 0) {
      return res.status(400).json({ error: 'No puedes quitarle el rol admin al único administrador que queda' });
    }
  }

  const nombreFinal = nombre || usuario.nombre;
  const rolFinal = rol === 'admin' || rol === 'encargado' ? rol : usuario.rol;
  let hashFinal = usuario.password_hash;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'La clave debe tener al menos 6 caracteres' });
    hashFinal = bcrypt.hashSync(password, 10);
  }

  await db.run('UPDATE usuarios SET nombre = ?, rol = ?, password_hash = ? WHERE id = ?',
    [nombreFinal, rolFinal, hashFinal, id]);

  res.json({ id, username: usuario.username, nombre: nombreFinal, rol: rolFinal });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta mientras estás conectado con ella' });
  }
  const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (usuario.rol === 'admin') {
    const otrosAdmins = (await db.get("SELECT COUNT(*) as n FROM usuarios WHERE rol = 'admin' AND id != ?", [id])).n;
    if (otrosAdmins === 0) {
      return res.status(400).json({ error: 'No puedes eliminar al único administrador que queda' });
    }
  }

  await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
  res.json({ ok: true });
}));

module.exports = router;
