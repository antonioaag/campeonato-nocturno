const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Genera (una sola vez) y persiste un secreto para firmar los JWT, para que
// los tokens sigan siendo válidos aunque el servidor se reinicie.
const secretPath = path.join(__dirname, '..', 'data', '.jwt-secret');
let JWT_SECRET;
if (fs.existsSync(secretPath)) {
  JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
} else {
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, JWT_SECRET, { mode: 0o600 });
}

const TOKEN_EXPIRA_EN = '30d';

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRA_EN }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Se requiere rol de administrador' });
  }
  next();
}

module.exports = { firmarToken, requireAuth, requireAdmin };
