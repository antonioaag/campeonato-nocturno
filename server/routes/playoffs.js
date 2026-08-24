const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, authOpcional } = require('../auth');
const asyncHandler = require('../asyncHandler');
const { esSerieValida } = require('../series');
const { leerBooleano, escribir, clavePlayoffsPublicos } = require('../configuracion');
const {
  GRUPO_PLAYOFF, FASES, NOMBRE_FASE, LLAVES_POR_FASE, JORNADA_POR_FASE,
  armarCuartos, ganadorDe, necesitaDefinicion, cruzarGanadores, faseSiguiente,
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
  WHERE p.serie = ? AND p.fase != 'grupos'
  ORDER BY p.fecha, p.llave
`;

// Estado de visibilidad de la serie. Es liviano a propósito: el front lo
// consulta al cargar y al cambiar de serie para decidir si muestra la pestaña,
// sin traerse el cuadro entero.
router.get('/estado', authOpcional, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const publico = await leerBooleano(clavePlayoffsPublicos(serie), false);
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');
  res.json({ serie, publico, visible: publico || esAdmin });
}));

// Devuelve el cuadro completo agrupado por fase, más qué fase se puede generar
// a continuación (para que el front sepa si mostrar el botón y con qué texto).
// Mientras la serie no esté publicada, el cuadro solo se entrega al admin.
router.get('/', authOpcional, asyncHandler(async (req, res) => {
  const serie = req.query.serie || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  const publico = await leerBooleano(clavePlayoffsPublicos(serie), false);
  const esAdmin = !!(req.usuario && req.usuario.rol === 'admin');

  const vacio = {};
  FASES.forEach(f => { vacio[f] = []; });
  if (!publico && !esAdmin) {
    return res.json({
      serie, publico, visible: false,
      fases: vacio, nombresFase: NOMBRE_FASE,
      siguiente: { fase: null, puede: false, motivo: null },
    });
  }

  const partidos = await db.all(SELECT_PLAYOFFS, [serie]);
  const porFase = {};
  FASES.forEach(f => { porFase[f] = partidos.filter(p => p.fase === f); });

  res.json({
    serie,
    publico,
    visible: true,
    fases: porFase,
    nombresFase: NOMBRE_FASE,
    siguiente: await calcularSiguientePaso(serie, porFase),
  });
}));

// Publica u oculta el cuadro de la serie para el público. Solo admin.
router.post('/publicar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const serie = (req.body && req.body.serie) || 'ADULTO';
  const publico = !!(req.body && req.body.publico);
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });

  await escribir(clavePlayoffsPublicos(serie), publico ? '1' : '0');
  res.json({ ok: true, serie, publico });
}));

// Determina qué acción tiene disponible el admin: generar los cuartos, avanzar
// a la fase siguiente, o nada (porque falta jugar partidos o ya terminó).
async function calcularSiguientePaso(serie, porFase) {
  if (porFase.cuartos.length === 0) {
    const gruposCompletos = await faseDeGruposTerminada(serie);
    return {
      fase: 'cuartos',
      puede: gruposCompletos,
      motivo: gruposCompletos ? null : 'Todavía quedan partidos de la fase de grupos sin jugar',
    };
  }

  for (const fase of FASES) {
    const partidos = porFase[fase];
    if (partidos.length === 0) continue;

    const siguiente = faseSiguiente(fase);
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

async function faseDeGruposTerminada(serie) {
  const { pendientes } = await db.get(
    "SELECT COUNT(*) AS pendientes FROM partidos WHERE serie = ? AND fase = 'grupos' AND estado != 'jugado'",
    [serie]
  );
  return Number(pendientes) === 0;
}

// Genera la fase pedida. 'cuartos' se siembra desde la tabla de posiciones;
// el resto se arma con los ganadores de la fase anterior. Solo admin.
router.post('/generar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const serie = (req.body && req.body.serie) || 'ADULTO';
  const fase = req.body && req.body.fase;
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  if (!FASES.includes(fase)) return res.status(400).json({ error: `fase inválida: ${fase}` });

  const yaExiste = await db.all('SELECT id FROM partidos WHERE serie = ? AND fase = ?', [serie, fase]);
  if (yaExiste.length > 0 && !(req.body && req.body.regenerar)) {
    return res.status(409).json({ error: `${NOMBRE_FASE[fase]} ya está generada. Usa "regenerar" para rehacerla.` });
  }

  let cruces;
  if (fase === 'cuartos') {
    if (!(await faseDeGruposTerminada(serie))) {
      return res.status(400).json({ error: 'No se pueden generar los cuartos: faltan partidos de la fase de grupos por jugar' });
    }
    try {
      cruces = (await armarCuartos(serie)).map(c => ({ llave: c.llave, localId: c.local.id, visitaId: c.visita.id }));
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  } else {
    const indiceAnterior = FASES.indexOf(fase) - 1;
    const faseAnterior = FASES[indiceAnterior];
    const partidosAnteriores = await db.all(
      `SELECT id, llave, local_id, visita_id, goles_local, goles_visita,
              penales_local, penales_visita, estado
       FROM partidos WHERE serie = ? AND fase = ?`,
      [serie, faseAnterior]
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
    { sql: 'DELETE FROM partidos WHERE serie = ? AND fase = ?', args: [serie, fase] },
    ...cruces.map(c => ({
      sql: `INSERT INTO partidos (serie, grupo, fase, llave, fecha, local_id, visita_id, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'programado')`,
      args: [serie, GRUPO_PLAYOFF, fase, c.llave, jornada, c.localId, c.visitaId],
    })),
  ]);

  res.json({ ok: true, fase, partidosGenerados: cruces.length });
}));

// Borra toda la fase de eliminación directa de la serie. Solo admin.
router.post('/reiniciar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const serie = (req.body && req.body.serie) || 'ADULTO';
  if (!esSerieValida(serie)) return res.status(400).json({ error: `serie inválida: ${serie}` });
  const info = await db.run("DELETE FROM partidos WHERE serie = ? AND fase != 'grupos'", [serie]);
  res.json({ ok: true, partidosEliminados: info.changes });
}));

module.exports = router;
