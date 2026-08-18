// Parser de CSV mínimo pero correcto: soporta campos entre comillas dobles
// (incluyendo comas y saltos de línea dentro de las comillas, y comillas
// escapadas como "").

function parseCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let dentroComillas = false;
  const s = String(texto).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dentroComillas) {
      if (c === '"') {
        if (s[i + 1] === '"') { campo += '"'; i++; }
        else dentroComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroComillas = true;
    } else if (c === ',' || c === ';') {
      fila.push(campo); campo = '';
    } else if (c === '\n') {
      fila.push(campo); campo = '';
      filas.push(fila); fila = [];
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) { fila.push(campo); filas.push(fila); }

  return filas.filter(f => f.some(v => v.trim() !== ''));
}

// Convierte filas de CSV (con encabezado) en objetos {nombre, rut, fechaNacimiento}.
// Acepta encabezados en español con o sin tildes/mayúsculas, en cualquier orden.
function csvAJugadores(texto) {
  const filas = parseCsv(texto);
  if (filas.length === 0) return [];

  const normalizar = h => h.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

  const encabezado = filas[0].map(normalizar);
  const idxNombre = encabezado.findIndex(h => h.includes('nombre'));
  const idxRut = encabezado.findIndex(h => h === 'rut');
  const idxFecha = encabezado.findIndex(h => h.includes('fecha'));

  if (idxNombre === -1 || idxRut === -1 || idxFecha === -1) {
    throw new Error('El CSV debe tener columnas: Nombre, RUT, Fecha Nacimiento');
  }

  return filas.slice(1).map(fila => ({
    nombre: (fila[idxNombre] || '').trim(),
    rut: (fila[idxRut] || '').trim(),
    fechaNacimiento: (fila[idxFecha] || '').trim(),
  }));
}

// Normaliza una fecha en varios formatos comunes (DD-MM-YYYY, DD/MM/YYYY,
// YYYY-MM-DD) a formato ISO YYYY-MM-DD. Devuelve null si no es una fecha válida.
function normalizarFecha(valor) {
  const v = String(valor || '').trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return validarFecha(m[1], m[2], m[3]);

  m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return validarFecha(m[3], m[2].padStart(2, '0'), m[1].padStart(2, '0'));

  return null;
}

function validarFecha(anio, mes, dia) {
  const a = Number(anio), me = Number(mes), d = Number(dia);
  if (me < 1 || me > 12 || d < 1 || d > 31) return null;
  const fecha = new Date(Date.UTC(a, me - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== me - 1 || fecha.getUTCDate() !== d) return null;
  if (a < 1920 || a > new Date().getFullYear()) return null;
  return `${String(a).padStart(4, '0')}-${String(me).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

module.exports = { parseCsv, csvAJugadores, normalizarFecha };
