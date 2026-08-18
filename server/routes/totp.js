const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { generarSecret, verificarToken } = require('../totp');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Inicia el setup de 2FA: genera QR y lo devuelve
// El usuario lo escanea con Google Authenticator, y luego verifica con /verify
router.post('/setup', requireAuth, asyncHandler(async (req, res) => {
  const usuarioId = req.usuario.id;

  const { secret, qrCode } = await generarSecret(req.usuario.username);

  // Guarda temporalmente el secret (no lo activa hasta verificación)
  await db.run(
    'UPDATE usuarios SET secret_2fa = ? WHERE id = ?',
    [secret, usuarioId]
  );

  res.json({ qrCode, secret });
}));

// Verifica el código TOTP y activa 2FA
router.post('/verify', requireAuth, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const usuarioId = req.usuario.id;

  if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
    return res.status(400).json({ error: 'Código inválido (debe ser 6 dígitos)' });
  }

  const usuario = await db.get('SELECT secret_2fa FROM usuarios WHERE id = ?', [usuarioId]);
  if (!usuario || !usuario.secret_2fa) {
    return res.status(400).json({ error: 'No hay un setup de 2FA pendiente' });
  }

  if (!verificarToken(token, usuario.secret_2fa)) {
    return res.status(401).json({ error: 'Código incorrecto' });
  }

  // Activa 2FA
  await db.run(
    'UPDATE usuarios SET totp_enabled = 1 WHERE id = ?',
    [usuarioId]
  );

  res.json({ ok: true, mensaje: '2FA activado correctamente' });
}));

// Desactiva 2FA (el usuario debe pasar su código actual como confirmación)
router.post('/disable', requireAuth, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const usuarioId = req.usuario.id;

  if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
    return res.status(400).json({ error: 'Código inválido' });
  }

  const usuario = await db.get('SELECT secret_2fa, totp_enabled FROM usuarios WHERE id = ?', [usuarioId]);
  if (!usuario || !usuario.totp_enabled) {
    return res.status(400).json({ error: 'Este usuario no tiene 2FA activo' });
  }

  if (!verificarToken(token, usuario.secret_2fa)) {
    return res.status(401).json({ error: 'Código incorrecto' });
  }

  // Desactiva 2FA
  await db.run(
    'UPDATE usuarios SET totp_enabled = 0, secret_2fa = NULL WHERE id = ?',
    [usuarioId]
  );

  res.json({ ok: true });
}));

module.exports = router;
