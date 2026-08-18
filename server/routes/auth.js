const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { firmarToken, requireAuth } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { verificarToken } = require('../totp');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password, totp_code } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Falta username o password' });
  }
  const usuario = await db.get('SELECT * FROM usuarios WHERE username = ?', [username]);
  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return res.status(401).json({ error: 'Usuario o clave incorrectos' });
  }

  // Si el usuario tiene 2FA activo, pide el código TOTP
  if (usuario.totp_enabled) {
    if (!totp_code) {
      // Devuelve un token temporal válido solo para verificar TOTP (10 min de validez)
      const tempToken = crypto.randomBytes(32).toString('hex');
      await db.run(
        `INSERT INTO password_resets (usuario_id, token, expires_at)
         VALUES (?, ?, datetime('now', '+10 minutes'))`,
        [usuario.id, tempToken]
      );
      return res.status(200).json({
        needs_totp: true,
        temp_token: tempToken,
        mensaje: 'Ingresa el código de 6 dígitos de tu authenticator'
      });
    }

    // Verifica el código TOTP
    if (totp_code.length !== 6 || !/^\d+$/.test(totp_code)) {
      return res.status(400).json({ error: 'Código inválido (debe ser 6 dígitos)' });
    }
    if (!verificarToken(totp_code, usuario.secret_2fa)) {
      return res.status(401).json({ error: 'Código TOTP incorrecto' });
    }
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
