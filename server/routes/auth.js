const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { firmarToken, requireAuth } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Falta username o password' });
  }
  const usuario = await db.get('SELECT * FROM usuarios WHERE username = ?', [username]);
  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return res.status(401).json({ error: 'Usuario o clave incorrectos' });
  }
  const token = firmarToken(usuario);
  res.json({
    token,
    usuario: { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol: usuario.rol }
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const usuario = await db.get('SELECT id, username, nombre, rol FROM usuarios WHERE id = ?', [req.usuario.id]);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
}));

router.post('/cambiar-clave', requireAuth, asyncHandler(async (req, res) => {
  const { claveActual, claveNueva } = req.body || {};
  if (!claveActual || !claveNueva) return res.status(400).json({ error: 'Falta claveActual o claveNueva' });
  if (claveNueva.length < 6) return res.status(400).json({ error: 'La clave nueva debe tener al menos 6 caracteres' });

  const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
  if (!bcrypt.compareSync(claveActual, usuario.password_hash)) {
    return res.status(401).json({ error: 'La clave actual no es correcta' });
  }
  const nuevoHash = bcrypt.hashSync(claveNueva, 10);
  await db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [nuevoHash, usuario.id]);
  res.json({ ok: true });
}));

module.exports = router;
