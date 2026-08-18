const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten archivos PDF, JPG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

// Metadata del documento (sin el contenido) para saber si existe y mostrarlo en la UI.
router.get('/:equipoId/info', asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const doc = await db.get(
    'SELECT nombre_archivo AS nombreArchivo, tipo_mime AS tipoMime, tamano_bytes AS tamanoBytes, subido_at AS subidoAt FROM listas_inscripcion WHERE equipo_id = ?',
    [equipoId]
  );
  res.json(doc || null);
}));

// Descarga el documento tal cual fue subido.
router.get('/:equipoId', asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const doc = await db.get(
    'SELECT nombre_archivo AS nombreArchivo, tipo_mime AS tipoMime, contenido FROM listas_inscripcion WHERE equipo_id = ?',
    [equipoId]
  );
  if (!doc) return res.status(404).json({ error: 'Este equipo no tiene un documento de inscripción cargado' });

  res.setHeader('Content-Type', doc.tipoMime);
  res.setHeader('Content-Disposition', `inline; filename="${doc.nombreArchivo.replace(/"/g, '')}"`);
  res.send(Buffer.from(doc.contenido));
}));

// Sube o reemplaza el documento de un equipo. Solo admin.
router.post('/:equipoId', requireAuth, requireAdmin, upload.single('archivo'), asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const equipo = await db.get('SELECT id FROM equipos WHERE id = ?', [equipoId]);
  if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });

  await db.run(`
    INSERT INTO listas_inscripcion (equipo_id, nombre_archivo, tipo_mime, tamano_bytes, contenido, subido_por, subido_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(equipo_id) DO UPDATE SET
      nombre_archivo = excluded.nombre_archivo,
      tipo_mime = excluded.tipo_mime,
      tamano_bytes = excluded.tamano_bytes,
      contenido = excluded.contenido,
      subido_por = excluded.subido_por,
      subido_at = excluded.subido_at
  `, [equipoId, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer, req.usuario.id]);

  res.json({ ok: true });
}));

router.delete('/:equipoId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  await db.run('DELETE FROM listas_inscripcion WHERE equipo_id = ?', [equipoId]);
  res.json({ ok: true });
}));

module.exports = router;
