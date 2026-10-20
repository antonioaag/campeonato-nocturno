const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');
const { leerBooleano, escribir, clavePlayoffsPublicos } = require('../configuracion');
const { marcarClasificados, calcularTodasLasTablas } = require('../tablas');
const { campeonatoDeLaPeticion, exigirEditable, DEL_CAMPEONATO } = require('../campeonatos');
const { ajustesVigentes } = require('../resoluciones');
const {
  GRUPO_PLAYOFF, FASES, fasesDe, NOMBRE_FASE, LLAVES_POR_FASE, JORNADA_POR_FASE,
  armarPrimeraFase, ganadorDe, necesitaDefinicion, cruzarGanadores, faseSiguiente,
} = require('../playoffs');

const router = express.Router();


const SELECT_PLAYOFFS = `
  SELECT
    p.id, p.serie, p.fase, p.llave, p.fecha,
    p.local_id  AS localId,  l.nombre AS local,
    p.visita_id AS visitaId, v.nombre AS visita,
    p.goles_local AS golesLocal, p.goles_visita AS golesVisita,
    p.penales_local AS penalesLocal, p.penales_visita AS penalesVisita,
    p.estado, p.fecha_partido AS fechaPartido, p.hora, p.estadio
  FROM partidos p
  JOIN equipos l ON l.id = p.local_id
  JOIN equipos v ON v.id = p.visita_id
  WHERE l.campeonato_id = ? AND p.serie = ? AND p.fase != 'grupos'
  ORDER BY p.fecha, p.llave
`;

// Estado de visibilidad de la serie. Es liviano a propósito: el front lo
// consulta al cargar y al cambiar de serie para decidir si muestra la pestaña,
// sin traerse el cuadro entero.
router.get('/estado', authOpcional, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const publico = await leerBooleano(clavePlayoffsPublicos(req.campeonato.id, serie), false);
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
  res.json({ serie, publico, visible: publico || esAdmin });
}));

// Devuelve el cuadro completo agrupado por fase, más qué fase se puede generar
// a continuación (para que el front sepa si mostrar el botón y con qué texto).
// Mientras la serie no esté publicada, el cuadro solo se entrega al admin.
router.get('/', authOpcional, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  const campeonato = req.campeonato;

  const publico = await leerBooleano(clavePlayoffsPublicos(campeonato.id, serie), false);
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');

  // Se mandan siempre las tres fases (vacías si no corresponden) para que el
  // front no tenga que saber de formatos; 'ordenFases' dice cuáles se juegan.
  const ordenFases = fasesDe(campeonato.formato);
  const vacio = {};
  FASES.forEach(f => { vacio[f] = []; });
  if (!publico && !esAdmin) {
    return res.json({
      serie, publico, visible: false,
      fases: vacio, ordenFases, nombresFase: NOMBRE_FASE,
      siguiente: { fase: null, puede: false, motivo: null },
    });
  }

  const partidos = await db.all(SELECT_PLAYOFFS, [campeonato.id, serie]);
  const porFase = {};
  FASES.forEach(f => { porFase[f] = partidos.filter(p => p.fase === f); });

  // Incluir info de descalificados para cada equipo
  const tablas = marcarClasificados(campeonato.formato, serie, await calcularTodasLasTablas(campeonato.id, serie));
  const descalificadosPorNombre = {};
  Object.values(tablas).forEach(tabla => {
    tabla.forEach(eq => {
      if (eq.descalificado) {
        descalificadosPorNombre[eq.nombre] = eq.descalificacion;
      }
    });
  });

  res.json({
    serie,
    publico,
    visible: true,
    fases: porFase,
    ordenFases,
    nombresFase: NOMBRE_FASE,
    siguiente: await calcularSiguientePaso(campeonato, serie, porFase),
    descalificados: descalificadosPorNombre,
  });
}));

// Publica u oculta el cuadro de la serie para el público. Solo admin.
// Se permite también en un campeonato finalizado: publicar u ocultar no
// cambia ningún resultado.
router.post('/publicar', requireAuth, requireAdmin, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const serie = (req.body && req.body.serie) || 'ADULTO';
  const publico = !!(req.body && req.body.publico);
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  await escribir(clavePlayoffsPublicos(req.campeonato.id, serie), publico ? '1' : '0');
  res.json({ ok: true, serie, publico });
}));

// Determina qué acción tiene disponible el admin: generar la primera fase,
// avanzar a la siguiente, o nada (porque falta jugar partidos o ya terminó).
async function calcularSiguientePaso(campeonato, serie, porFase) {
  const fases = fasesDe(campeonato.formato);
  const primera = fases[0];
  if (porFase[primera].length === 0) {
    const gruposCompletos = await faseDeGruposTerminada(campeonato.id, serie);
    return {
      fase: primera,
      puede: gruposCompletos,
      motivo: gruposCompletos ? null : 'Todavía quedan partidos de la fase de grupos sin jugar',
    };
  }

  for (const fase of fases) {
    const partidos = porFase[fase];
    if (partidos.length === 0) continue;

    const siguiente = faseSiguiente(campeonato.formato, fase);
    if (!siguiente) return { fase: null, puede: false, motivo: 'El campeonato ya tiene su final definida' };
    if (porFase[siguiente].length > 0) continue;

    const sinJugar = partidos.filter(p => p.estado !== 'jugado');
    if (sinJugar.length > 0) {
      return {
        fase: siguiente,
        puede: false,
        motivo: `Faltan ${sinJugar.length} partido(s) de ${NOMBRE_FASE[fase].toLowerCase()} por jugar`,
      };
    }
    const sinDefinir = partidos.filter(necesitaDefinicion);
    if (sinDefinir.length > 0) {
      const llaves = sinDefinir.map(p => p.llave).join(', ');
      return {
        fase: siguiente,
        puede: false,
        motivo: `La llave ${llaves} terminó empatada. Carga la definición por penales para saber quién avanza`,
      };
    }
    return { fase: siguiente, puede: true, motivo: null };
  }

  return { fase: null, puede: false, motivo: null };
}

// Un partido anulado o resuelto por el tribunal no se va a jugar, pero sigue
// figurando como pendiente en el fixture. Por eso no alcanza con contar los
// 'programado': cuentan como resueltos los que tienen una resolución encima.
async function faseDeGruposTerminada(campeonatoId, serie) {
  const sinJugar = await db.all(
    `SELECT id FROM partidos
     WHERE ${DEL_CAMPEONATO} AND serie = ? AND fase = 'grupos' AND estado != 'jugado'`,
    [campeonatoId, serie]
  );
  if (sinJugar.length === 0) return true;
  const { porPartido, anulados } = await ajustesVigentes(campeonatoId, serie);
  return sinJugar.every(p => porPartido[p.id] || anulados[p.id]);
}

// Genera la fase pedida. La primera (cuartos o semifinal, según el formato)
// se siembra desde la tabla de posiciones; el resto se arma con los ganadores
// de la fase anterior. Solo admin.
router.post('/generar', requireAuth, requireAdmin, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const serie = (req.body && req.body.serie) || 'ADULTO';
  const fase = req.body && req.body.fase;
  const campeonato = req.campeonato;
  exigirEditable(campeonato);
  const fases = fasesDe(campeonato.formato);
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  if (!fases.includes(fase)) return res.status(400).json({ error: `fase inválida para este campeonato: ${fase}` });

  const yaExiste = await db.all(
    `SELECT id FROM partidos WHERE ${DEL_CAMPEONATO} AND serie = ? AND fase = ?`,
    [campeonato.id, serie, fase]
  );
  if (yaExiste.length > 0 && !(req.body && req.body.regenerar)) {
    return res.status(409).json({ error: `${NOMBRE_FASE[fase]} ya está generada. Usa "regenerar" para rehacerla.` });
  }

  let cruces;
  if (fase === fases[0]) {
    if (!(await faseDeGruposTerminada(campeonato.id, serie))) {
      return res.status(400).json({ error: `No se puede generar ${NOMBRE_FASE[fase].toLowerCase()}: faltan partidos de la fase de grupos por jugar` });
    }
    try {
      cruces = (await armarPrimeraFase(campeonato, serie)).map(c => ({ llave: c.llave, localId: c.local.id, visitaId: c.visita.id }));
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  } else {
    const faseAnterior = fases[fases.indexOf(fase) - 1];
    const partidosAnteriores = await db.all(
      `SELECT id, llave, local_id, visita_id, goles_local, goles_visita,
              penales_local, penales_visita, estado
       FROM partidos WHERE ${DEL_CAMPEONATO} AND serie = ? AND fase = ?`,
      [campeonato.id, serie, faseAnterior]
    );
    if (partidosAnteriores.length !== LLAVES_POR_FASE[faseAnterior]) {
      return res.status(400).json({ error: `Primero hay que generar ${NOMBRE_FASE[faseAnterior].toLowerCase()}` });
    }
    if (partidosAnteriores.some(p => ganadorDe(p) === null)) {
      return res.status(400).json({ error: `Todas las llaves de ${NOMBRE_FASE[faseAnterior].toLowerCase()} deben estar jugadas y con un ganador definido. Si alguna terminó empatada, carga la definición por penales.` });
    }
    cruces = cruzarGanadores(partidosAnteriores);
  }

  const jornada = JORNADA_POR_FASE[fase];
  await db.batch([
    { sql: `DELETE FROM partidos WHERE ${DEL_CAMPEONATO} AND serie = ? AND fase = ?`, args: [campeonato.id, serie, fase] },
    ...cruces.map(c => ({
      sql: `INSERT INTO partidos (serie, grupo, fase, llave, fecha, local_id, visita_id, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'programado')`,
      args: [serie, GRUPO_PLAYOFF, fase, c.llave, jornada, c.localId, c.visitaId],
    })),
  ]);

  res.json({ ok: true, fase, partidosGenerados: cruces.length });
}));

// Borra toda la fase de eliminación directa de la serie. Solo admin.
router.post('/reiniciar', requireAuth, requireAdmin, campeonatoDeLaPeticion, asyncHandler(async (req, res) => {
  const serie = (req.body && req.body.serie) || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  exigirEditable(req.campeonato);
  const info = await db.run(
    `DELETE FROM partidos WHERE ${DEL_CAMPEONATO} AND serie = ? AND fase != 'grupos'`,
    [req.campeonato.id, serie]
  );
  res.json({ ok: true, partidosEliminados: info.changes });
}));

module.exports = router;
