const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Configurar Ethereal (sin credenciales)
let transporter;
(async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (e) {
    console.error('Error configurando Ethereal:', e.message);
    // Fallback: transporter dummy
    transporter = null;
  }
})();

// Solicita recuperación de contraseña por email
router.post('/request', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  const usuario = await db.get('SELECT id, username, email FROM usuarios WHERE email = ?', [email]);
  if (!usuario) {
    return res.status(200).json({
      ok: true,
      mensaje: 'Si el correo existe, recibirá una contraseña temporal',
    });
  }

  // Generar contraseña temporal aleatoria (8 caracteres)
  const tempPassword = crypto.randomBytes(4).toString('hex').substring(0, 8);
  const hash = bcrypt.hashSync(tempPassword, 10);

  // Actualizar usuario con contraseña temporal
  await db.run(
    'UPDATE usuarios SET password_hash = ?, is_temporary_password = 1 WHERE id = ?',
    [hash, usuario.id]
  );

  // Enviar email con contraseña temporal
  try {
    if (transporter) {
      const info = await transporter.sendMail({
        from: '"Campeonato Nocturno" <noreply@campeonato.com>',
        to: email,
        subject: 'Recuperación de Contraseña - Campeonato Nocturno',
        html: `
          <h2>Hola ${usuario.username}</h2>
          <p>Tu contraseña temporal es:</p>
          <p style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px; border-radius: 5px;">
            ${tempPassword}
          </p>
          <p>Usa esta contraseña para iniciar sesión. Al entrar, se te pedirá que cambies por una contraseña nueva.</p>
          <p style="color: #999; font-size: 12px;">Por seguridad, esta contraseña temporal expira en 24 horas.</p>
        `,
      });
      console.log('Email enviado. Vista previa en:', nodemailer.getTestMessageUrl(info));
    }
  } catch (e) {
    console.error('Error enviando email:', e.message);
  }

  res.json({
    ok: true,
    mensaje: 'Contraseña temporal enviada al correo registrado',
  });
}));

// Cambia contraseña temporal por una permanente
router.post('/change-temporary', asyncHandler(async (req, res) => {
  const { username, newPassword } = req.body;

  if (!username || !newPassword || newPassword.length < 6) {
    return res.status(400).json({
      error: 'Usuario y contraseña nueva (mín. 6 caracteres) son requeridos',
    });
  }

  const usuario = await db.get(
    'SELECT id, is_temporary_password FROM usuarios WHERE username = ?',
    [username]
  );

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (!usuario.is_temporary_password) {
    return res.status(400).json({ error: 'No hay contraseña temporal pendiente' });
  }

  // Cambia la contraseña y marca como permanente
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run(
    'UPDATE usuarios SET password_hash = ?, is_temporary_password = 0 WHERE id = ?',
    [hash, usuario.id]
  );

  res.json({ ok: true, mensaje: 'Contraseña cambiada correctamente' });
}));

module.exports = router;
