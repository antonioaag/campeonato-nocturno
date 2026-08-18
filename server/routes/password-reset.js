const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Solicita un reset de contraseña (envía token por correo en el futuro, ahora lo devolvemos)
router.post('/request', asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Falta el usuario' });
  }

  const usuario = await db.get('SELECT id FROM usuarios WHERE username = ?', [username]);
  if (!usuario) {
    // Por seguridad, no decimos si el usuario existe o no
    return res.status(200).json({
      ok: true,
      mensaje: 'Si el usuario existe, recibirá un link de reset por correo',
    });
  }

  // Genera un token aleatorio válido por 1 hora
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hora

  await db.run(
    'INSERT INTO password_resets (usuario_id, token, expires_at) VALUES (?, ?, ?)',
    [usuario.id, token, expiresAt]
  );

  // TODO: Enviar correo con el link: /reset-password?token=XXX
  // Por ahora, devolvemos el token en dev (no hacer en producción)
  const isDev = !process.env.TURSO_DATABASE_URL;
  if (isDev) {
    res.json({
      ok: true,
      mensaje: 'Token generado (dev mode)',
      token, // SOLO EN DESARROLLO
    });
  } else {
    res.json({
      ok: true,
      mensaje: 'Si el usuario existe, recibirá un link de reset por correo',
    });
  }
}));

// Valida el token y cambia la contraseña
router.post('/confirm', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({
      error: 'Token y contraseña nueva (mín. 6 caracteres) son requeridos',
    });
  }

  // Busca el token válido
  const reset = await db.get(`
    SELECT pr.usuario_id, pr.expires_at
    FROM password_resets pr
    WHERE pr.token = ? AND pr.expires_at > datetime('now')
  `, [token]);

  if (!reset) {
    return res.status(400).json({ error: 'Link de reset inválido o expirado' });
  }

  // Cambia la contraseña
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, reset.usuario_id]);

  // Elimina el token usado
  await db.run('DELETE FROM password_resets WHERE token = ?', [token]);

  res.json({ ok: true, mensaje: 'Contraseña cambiada correctamente' });
}));

module.exports = router;
