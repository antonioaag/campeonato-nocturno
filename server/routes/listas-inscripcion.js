const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/csv', 'text/plain'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten archivos PDF, JPG, PNG, WEBP o CSV'));
    }
    cb(null, true);
  },
});

// El mimetype que manda el navegador en el multipart es solo una declaración
// (se puede falsear renombrando un archivo). Esto confirma que el contenido
// real empieza con la "firma" de bytes esperada para ese tipo de archivo,
// para que no se pueda subir, por ejemplo, un HTML disfrazado de imagen.
function tipoRealCoincide(buffer, mimetype) {
  // CSV y texto plano no tienen magic bytes confiables, permitir sin validación
  if (mimetype === 'text/csv' || mimetype === 'text/plain') return true;

  const firmas = {
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // 'RIFF' (WEBP se confirma en offset 8, se chequea abajo)
  };
  const candidatos = firmas[mimetype];
  if (!candidatos) return false;
  const coincideAlgunaFirma = candidatos.some(firma => firma.every((byte, i) => buffer[i] === byte));
  if (!coincideAlgunaFirma) return false;
  if (mimetype === 'image/webp') {
    return buffer.slice(8, 12).toString('ascii') === 'WEBP';
  }
  return true;
}

// Deja el nombre de archivo seguro para usarlo en la cabecera Content-Disposition
// (sin comillas ni caracteres de control que permitirían inyectar otra cabecera).
function nombreArchivoSeguro(nombre) {
  // eslint-disable-next-line no-control-regex
  return String(nombre).replace(/["\r\n\x00-\x1f]/g, '').slice(0, 200) || 'archivo';
}

// Metadata del documento (sin el contenido) para saber si existe y mostrarlo en la UI.
// Solo usuarios logueados pueden ver metadatos
router.get('/:equipoId/info', requireAuth, asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const doc = await db.get(
    'SELECT nombre_archivo AS nombreArchivo, tipo_mime AS tipoMime, tamano_bytes AS tamanoBytes, subido_at AS subidoAt FROM listas_inscripcion WHERE equipo_id = ?',
    [equipoId]
  );
  res.json(doc || null);
}));

// Descarga el documento tal cual fue subido.
// Solo usuarios logueados pueden descargar
router.get('/:equipoId', requireAuth, asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const doc = await db.get(
    'SELECT nombre_archivo AS nombreArchivo, tipo_mime AS tipoMime, contenido FROM listas_inscripcion WHERE equipo_id = ?',
    [equipoId]
  );
  if (!doc) return res.status(404).json({ error: 'Este equipo no tiene un documento de inscripción cargado' });

  res.setHeader('Content-Type', doc.tipoMime);
  res.setHeader('Content-Disposition', `inline; filename="${nombreArchivoSeguro(doc.nombreArchivo)}"`);
  res.send(Buffer.from(doc.contenido));
}));

// Sube o reemplaza el documento de un equipo. Solo admin.
router.post('/:equipoId', requireAuth, requireAdmin, upload.single('archivo'), asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const equipo = await db.get('SELECT id FROM equipos WHERE id = ?', [equipoId]);
  if (!equipo) return res.status(400).json({ error: 'Equipo no encontrado' });
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });
  if (!tipoRealCoincide(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({ error: 'El contenido del archivo no coincide con su tipo (¿está corrupto o mal renombrado?)' });
  }

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
  `, [equipoId, nombreArchivoSeguro(req.file.originalname), req.file.mimetype, req.file.size, req.file.buffer, req.usuario.id]);

  res.json({ ok: true });
}));

router.delete('/:equipoId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  await db.run('DELETE FROM listas_inscripcion WHERE equipo_id = ?', [equipoId]);
  res.json({ ok: true });
}));

module.exports = router;
