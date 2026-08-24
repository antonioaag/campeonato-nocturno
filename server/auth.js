const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Secreto con el que se firman los JWT. Si cambia, todas las sesiones abiertas
// dejan de ser válidas y los usuarios tienen que iniciar sesión de nuevo.
//
// En producción DEBE venir de la variable de entorno JWT_SECRET. El disco de
// Render es efímero: se borra en cada despliegue, así que un secreto guardado
// en data/ se regeneraba en cada deploy y echaba a todo el mundo. El archivo
// queda solo como comodidad para desarrollo local.
const secretPath = path.join(__dirname, '..', 'data', '.jwt-secret');
let JWT_SECRET = (process.env.JWT_SECRET || '').trim();

if (!JWT_SECRET) {
  if (fs.existsSync(secretPath)) {
    JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
  } else {
    JWT_SECRET = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, JWT_SECRET, { mode: 0o600 });
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠ JWT_SECRET no está definida. Se está usando un secreto en disco, que en\n' +
      '  Render se borra en cada despliegue y cierra la sesión de todos los usuarios.\n' +
      '  Define JWT_SECRET en las variables de entorno del servicio.'
    );
  }
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

// Para rutas públicas cuyo contenido cambia si quien mira es admin. A
// diferencia de requireAuth, nunca rechaza: si no hay token o es inválido,
// simplemente deja req.usuario sin definir y sigue.
function authOpcional(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.usuario = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // token vencido o corrupto: se atiende la petición como anónima
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Se requiere rol de administrador' });
  }
  next();
}

module.exports = { firmarToken, requireAuth, requireAdmin, authOpcional };
