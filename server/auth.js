const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Secreto con el que se firman los JWT. Si cambia, todas las sesiones abiertas
// dejan de ser válidas y los usuarios tienen que iniciar sesión de nuevo.
//
// En producción DEBE venir de la variable de entorno JWT_SECRET: si falta, el
// servidor ni siquiera arranca. Antes caía a un secreto guardado en disco, pero
// el disco de Render es efímero y se borra en cada deploy, así que ese secreto
// se regeneraba solo y cerraba la sesión de todo el mundo sin avisar — un fallo
// silencioso que solo se notaba cuando los usuarios ya estaban afuera.
// El fallback a disco se mantiene como comodidad, pero solo fuera de producción.
const secretPath = path.join(__dirname, '..', 'data', '.jwt-secret');
let JWT_SECRET = (process.env.JWT_SECRET || '').trim();

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET no está definida. En producción es obligatoria: sin ella, cada\n' +
      'reinicio del servidor generaría un secreto distinto y cerraría la sesión de\n' +
      'todos los usuarios. Definila en las variables de entorno del servicio.'
    );
  }
  if (fs.existsSync(secretPath)) {
    JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
  } else {
    JWT_SECRET = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, JWT_SECRET, { mode: 0o600 });
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
