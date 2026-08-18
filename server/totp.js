const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Genera un nuevo secret TOTP y devuelve el secret + QR en base64
async function generarSecret(username) {
  const secret = speakeasy.generateSecret({
    name: `Campeonato Nocturno (${username})`,
    issuer: 'Campeonato Nocturno 2026',
    length: 32,
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode,
  };
}

// Verifica si un token TOTP es válido para un secret dado
function verificarToken(token, secret) {
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // permite ±2 ventanas de 30 segundos (60 segundos de margen)
  });
  return isValid;
}

module.exports = { generarSecret, verificarToken };
