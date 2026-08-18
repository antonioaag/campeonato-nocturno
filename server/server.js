require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();

// Cabeceras de seguridad HTTP (HSTS, X-Content-Type-Options, X-Frame-Options,
// Referrer-Policy, oculta X-Powered-By, etc). El CSP permite 'unsafe-inline'
// en script/style porque el frontend es una sola página con <script>/<style>
// inline (sin dependencias externas) — sigue bloqueando que el sitio sea
// embebido en un iframe ajeno y que cargue recursos de otros orígenes.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

// Limita intentos de login: máximo 10 por IP cada 15 minutos, para dificultar
// ataques de fuerza bruta contra las cuentas de admin/encargado.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Espera unos minutos e intenta de nuevo.' },
});

app.use(express.json());

async function start() {
  await db.init();

  // Si la base de datos está vacía (primera vez que se levanta el servidor sin
  // haber corrido "npm run seed" manualmente), la sembramos automáticamente.
  const { n } = await db.get('SELECT COUNT(*) AS n FROM usuarios');
  if (n === 0) {
    console.log('No hay datos aún: ejecutando seed inicial automáticamente...');
    await require('./seed').seed();
  }

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/2fa', require('./routes/totp'));
  app.use('/api/password-reset', require('./routes/password-reset'));
  app.use('/api/usuarios', require('./routes/usuarios'));
  app.use('/api/equipos', require('./routes/equipos'));
  app.use('/api/partidos', require('./routes/partidos'));
  app.use('/api/posiciones', require('./routes/posiciones'));
  app.use('/api/fixture', require('./routes/fixture'));
  app.use('/api/jugadores', require('./routes/jugadores'));
  app.use('/api/listas-inscripcion', require('./routes/listas-inscripcion'));
  app.use('/api/castigos', require('./routes/castigos'));

  // Frontend estático
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // Manejador de errores genérico
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const mensaje = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo es demasiado grande' : err.message;
      return res.status(400).json({ error: mensaje });
    }
    if (err && /Solo se permiten archivos/.test(err.message || '')) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Campeonato nocturno 2026 escuchando en http://localhost:${PORT}`);
  });
}

start().catch(e => {
  console.error('No se pudo iniciar el servidor:', e);
  process.exit(1);
});
