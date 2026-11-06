// Validación y formateo de RUT chileno (con dígito verificador).

function limpiarRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

function calcularDv(cuerpo) {
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

function esRutValido(rut) {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d{7,8}$/.test(cuerpo)) return false;
  return calcularDv(cuerpo) === dv;
}

// Pasaporte o documento extranjero: lleva letras (fuera de la K final del
// RUT) o es un número largo sin guion. Para la asociación es un documento
// válido: no se le calcula dígito verificador ni se marca como RUT inválido.
// Hay que reconocerlo antes de limpiar, porque limpiarRut le borra las letras
// y "AZ923543" terminaba guardado como "92354-3".
function esDocumentoExtranjero(doc) {
  const t = String(doc || '').trim().toUpperCase();
  if (!t) return false;
  if (/[A-JL-Z]/.test(t)) return true;
  return !t.includes('-') && /^\d{10,}$/.test(t.replace(/\./g, ''));
}

// Documento válido para inscribir: RUT con dígito verificador correcto, o
// documento extranjero.
function esDocumentoValido(doc) {
  return esRutValido(doc) || esDocumentoExtranjero(doc);
}

// Clave para comparar documentos entre listas: un RUT sin puntos ni guion, un
// documento extranjero tal como viene (solo letras y números).
function claveDocumento(doc) {
  if (esDocumentoExtranjero(doc)) return 'EXT:' + String(doc).toUpperCase().replace(/[^0-9A-Z]/g, '');
  return limpiarRut(doc);
}

// Formato canónico de almacenamiento: 12345678-9 (sin puntos).
function formatearRut(rut) {
  const limpio = limpiarRut(rut);
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo}-${dv}`;
}

module.exports = { limpiarRut, esRutValido, formatearRut, esDocumentoExtranjero, esDocumentoValido, claveDocumento };
