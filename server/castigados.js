// Registro de castigados de la asociación: cómo se lee una sanción escrita a
// mano ("3 fechas", "2 años", "Expulsado liga") y cuándo queda cumplida.
//
// Reglas acordadas con la asociación:
// - El castigado no juega en ninguna serie hasta cumplir.
// - Una sanción en fechas se cumple por fechas de competencia, no por partidos
//   de su club: cuenta aunque su club quede libre o se le aplace el partido.
//   Se cuenta cada fin de semana con partidos programados de la asociación,
//   de cualquier campeonato, desde el inicio del castigo.
// - Una sanción en tiempo vence en la fecha de calendario.
// - La expulsión de la liga no vence.
// - Con la multa pendiente sigue inhabilitado aunque haya cumplido.
const db = require('./db');

function parsearSancion(texto) {
  const t = String(texto || '').toLowerCase();
  if (/expuls/.test(t)) return { tipo: 'expulsion', cantidad: null };
  let m = t.match(/(\d+)\s*fecha/);
  if (m) return { tipo: 'fechas', cantidad: Number(m[1]) };
  m = t.match(/(\d+)\s*mes/);
  if (m) return { tipo: 'tiempo', cantidad: Number(m[1]) };
  m = t.match(/(\d+)\s*a[ñn]o/);
  if (m) return { tipo: 'tiempo', cantidad: Number(m[1]) * 12 };
  return { tipo: 'otro', cantidad: null };
}

// Las planillas escriben la serie de muchas formas ("1era", "Sub 17", "Adultos").
function normalizarSerie(texto) {
  const t = String(texto || '').trim().toLowerCase();
  if (!t) return null;
  if (/^1/.test(t) || t.includes('primera')) return 'Primera';
  if (/^2/.test(t) || t.includes('segunda')) return 'Segunda';
  const sub = t.match(/sub\s*-?\s*(\d+)/);
  if (sub) return `Sub-${sub[1]}`;
  if (t.startsWith('senior')) return 'Seniors';
  if (t.startsWith('adult')) return 'Adulto';
  return String(texto).trim();
}

// Día de hoy en Chile: el servidor corre en UTC y de noche ya sería mañana.
function hoyEnChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function sumarDiasIso(iso, dias) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function sumarMesesIso(iso, meses) {
  const [a, m, d] = iso.split('-').map(Number);
  const total = (m - 1) + meses;
  const anio = a + Math.floor(total / 12), mes = total % 12;
  // 31 de enero + 1 mes = último día de febrero, no 3 de marzo.
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}

// Lunes de la semana de un día: un fin de semana de competencia es una semana.
function lunesDe(iso) {
  const dow = new Date(iso + 'T00:00:00Z').getUTCDay();
  return sumarDiasIso(iso, -((dow + 6) % 7));
}

// Días con partidos programados en toda la asociación. Un aplazado sin día no
// cuenta: ese fin de semana no hubo competencia para ese partido.
async function diasDeCompetencia() {
  const filas = await db.all(`
    SELECT DISTINCT fecha_partido AS dia FROM partidos
    WHERE fecha_partido GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  `);
  return filas.map(f => f.dia);
}

// Fines de semana ya terminados (hasta el domingo anterior a hoy) con algún
// partido desde el inicio del castigo.
function fechasCumplidasDesde(inicio, dias, hoy) {
  const semanas = new Set();
  dias.forEach(dia => {
    if (dia < inicio) return;
    const lunes = lunesDe(dia);
    if (sumarDiasIso(lunes, 6) < hoy) semanas.add(lunes);
  });
  return semanas.size;
}

function evaluar(c, dias, hoy = hoyEnChile()) {
  let cumplida = false, hasta = null, avance = '';
  if (c.tipo === 'expulsion') {
    avance = 'Expulsado de la asociación';
  } else if (c.tipo === 'tiempo') {
    hasta = sumarMesesIso(c.fecha_inicio, c.cantidad);
    cumplida = hoy >= hasta;
    avance = `Hasta el ${hasta.split('-').reverse().join('/')}`;
  } else if (c.tipo === 'fechas') {
    const cumplidas = Math.min(c.cantidad, (c.fechas_previas || 0) + fechasCumplidasDesde(c.fecha_inicio, dias, hoy));
    cumplida = cumplidas >= c.cantidad;
    avance = `${cumplidas} de ${c.cantidad} ${c.cantidad === 1 ? 'fecha' : 'fechas'}`;
  } else {
    avance = 'Según resolución';
  }
  // El admin puede corregir el cálculo: una apelación, fechas cumplidas en
  // otra liga, un castigo que el tribunal levantó.
  if (c.estado_manual) cumplida = c.estado_manual === 'cumplido';
  const habilitado = cumplida && c.multa !== 'pendiente';
  const estado = habilitado ? 'cumplido' : (cumplida ? 'falta_pago' : 'vigente');
  return { cumplida, habilitado, estado, hasta, avance };
}

module.exports = { parsearSancion, normalizarSerie, hoyEnChile, diasDeCompetencia, evaluar, sumarMesesIso, fechasCumplidasDesde };
