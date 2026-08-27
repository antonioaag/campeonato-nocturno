// Traduce las resoluciones del tribunal en ajustes concretos sobre la tabla de
// posiciones y sobre los partidos.
//
// Idea central: el resultado de cancha nunca se toca. Lo que se guardó es lo
// que pasó. Cuando hay una resolución, se aplica ENCIMA al momento de calcular,
// y siempre se acompaña del motivo, el artículo y el acta. Cualquiera puede ver
// el marcador real y el homologado uno al lado del otro.
const db = require('./db');

const TIPOS = ['descuento_puntos', 'partido_homologado'];
const ORIGENES = ['oficio', 'reclamo'];

const SELECT_RESOLUCIONES = `
  SELECT
    r.id, r.serie, r.tipo, r.origen,
    r.equipo_id AS equipoId, e.nombre AS equipo,
    r.partido_id AS partidoId,
    r.puntos_ajuste AS puntosAjuste,
    r.goles_local_hom AS golesLocalHom, r.goles_visita_hom AS golesVisitaHom,
    r.articulo, r.motivo, r.numero_acta AS numeroActa,
    r.fecha_resolucion AS fechaResolucion, r.estado,
    r.creada_at AS creadaAt, u.nombre AS creadaPor,
    r.revocada_at AS revocadaAt, r.motivo_revocacion AS motivoRevocacion,
    ur.nombre AS revocadaPor,
    pl.nombre AS partidoLocal, pv.nombre AS partidoVisita,
    p.goles_local AS golesLocalCancha, p.goles_visita AS golesVisitaCancha,
    p.local_id AS partidoLocalId, p.visita_id AS partidoVisitaId
  FROM resoluciones r
  LEFT JOIN equipos e   ON e.id = r.equipo_id
  LEFT JOIN usuarios u  ON u.id = r.creada_por
  LEFT JOIN usuarios ur ON ur.id = r.revocada_por
  LEFT JOIN partidos p  ON p.id = r.partido_id
  LEFT JOIN equipos pl  ON pl.id = p.local_id
  LEFT JOIN equipos pv  ON pv.id = p.visita_id
`;

async function listar(serie, { soloVigentes = false } = {}) {
  const condiciones = ['r.serie = ?'];
  const params = [serie];
  if (soloVigentes) condiciones.push("r.estado = 'vigente'");
  return db.all(
    `${SELECT_RESOLUCIONES} WHERE ${condiciones.join(' AND ')}
     ORDER BY r.fecha_resolucion DESC, r.id DESC`,
    params
  );
}

async function obtenerPorId(id) {
  return db.get(`${SELECT_RESOLUCIONES} WHERE r.id = ?`, [id]);
}

// Devuelve las resoluciones vigentes ya organizadas para consumirlas al
// calcular la tabla: los descuentos agrupados por equipo y las homologaciones
// indexadas por partido.
async function ajustesVigentes(serie) {
  const vigentes = await listar(serie, { soloVigentes: true });

  const porEquipo = {};
  const porPartido = {};

  vigentes.forEach(r => {
    if (r.tipo === 'descuento_puntos' && r.equipoId) {
      if (!porEquipo[r.equipoId]) porEquipo[r.equipoId] = { puntos: 0, detalle: [] };
      porEquipo[r.equipoId].puntos += r.puntosAjuste || 0;
      porEquipo[r.equipoId].detalle.push({
        id: r.id,
        puntos: r.puntosAjuste,
        articulo: r.articulo,
        motivo: r.motivo,
        numeroActa: r.numeroActa,
        fechaResolucion: r.fechaResolucion,
        origen: r.origen,
      });
    }

    if (r.tipo === 'partido_homologado' && r.partidoId) {
      // Si por error hubiera dos homologaciones vigentes del mismo partido,
      // manda la más reciente (listar viene ordenado por fecha descendente).
      if (porPartido[r.partidoId]) return;
      porPartido[r.partidoId] = {
        id: r.id,
        golesLocal: r.golesLocalHom,
        golesVisita: r.golesVisitaHom,
        articulo: r.articulo,
        motivo: r.motivo,
        numeroActa: r.numeroActa,
        fechaResolucion: r.fechaResolucion,
        origen: r.origen,
      };
    }
  });

  return { porEquipo, porPartido };
}

// Valida los datos de una resolución nueva. Devuelve un mensaje de error o
// null. El artículo del reglamento y el motivo son obligatorios siempre: una
// sanción sin fundamento escrito no se puede auditar ni defender.
function validar({ tipo, origen, equipoId, partidoId, puntosAjuste, golesLocalHom, golesVisitaHom, articulo, motivo, fechaResolucion }) {
  if (!TIPOS.includes(tipo)) return `tipo debe ser uno de: ${TIPOS.join(', ')}`;
  if (!ORIGENES.includes(origen)) return `origen debe ser uno de: ${ORIGENES.join(', ')}`;
  if (!articulo || !String(articulo).trim()) return 'El artículo del reglamento es obligatorio';
  if (!motivo || !String(motivo).trim()) return 'El motivo es obligatorio';
  if (!fechaResolucion || !/^\d{4}-\d{2}-\d{2}$/.test(String(fechaResolucion).trim())) {
    return 'La fecha de la resolución es obligatoria y debe tener formato YYYY-MM-DD';
  }

  if (tipo === 'descuento_puntos') {
    if (!equipoId) return 'Hay que indicar a qué equipo se le descuentan los puntos';
    const p = Number(puntosAjuste);
    if (!Number.isInteger(p) || p === 0) return 'Los puntos deben ser un número entero distinto de 0';
    if (p > 0) return 'Un descuento debe ser negativo (por ejemplo -3)';
    if (p < -100) return 'El descuento no puede superar los 100 puntos';
  }

  if (tipo === 'partido_homologado') {
    if (!partidoId) return 'Hay que indicar qué partido se homologa';
    const gl = Number(golesLocalHom);
    const gv = Number(golesVisitaHom);
    if (!Number.isInteger(gl) || gl < 0 || !Number.isInteger(gv) || gv < 0) {
      return 'El marcador homologado debe tener números enteros mayores o iguales a 0';
    }
    if (gl > 50 || gv > 50) return 'El marcador homologado no parece válido';
  }

  return null;
}

module.exports = { TIPOS, ORIGENES, listar, obtenerPorId, ajustesVigentes, validar, SELECT_RESOLUCIONES };
