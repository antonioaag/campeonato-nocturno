/**
 * Reemplaza el fixture de fase de grupos de Clausura 2026 por el fixture
 * conjunto guardado en fixtures/clausura-2026.json. Uso puntual, contra la
 * base que apunte el .env (¡producción!).
 *
 *   node reemplazar-fixture-clausura-2026.js           muestra lo que haría
 *   node reemplazar-fixture-clausura-2026.js --aplicar reemplaza
 *
 * Por qué existe: el primer sorteo se hizo serie por serie, y eso dejaba a
 * un club enfrentando a un rival distinto en cada serie la misma noche y con
 * libres en fechas seguidas. El fixture conjunto se armó con todas las
 * series a la vez (ver el comentario en el JSON): cada noche un club enfrenta
 * en lo posible al mismo club en todas las series que comparten, y ningún
 * club tiene libres en dos fechas seguidas.
 *
 * Se niega si alguna serie ya tiene un resultado o una resolución: reemplazar
 * el fixture borraría partidos ya jugados. Los equipos no se tocan.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./server/db');
const { validarFixture, sumarDias } = require('./server/sorteo');

const CAMPEONATO = 'Campeonato Clausura 2026';
const FECHA_INICIO = '2026-10-23';
const DIAS_ENTRE_FECHAS = 7;
const PARTIDOS_POR_EQUIPO = 6;

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const archivo = path.join(__dirname, 'fixtures', 'clausura-2026.json');
  const { series } = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  await db.init();

  const c = await db.get('SELECT id, estado FROM campeonatos WHERE nombre = ?', [CAMPEONATO]);
  if (!c) throw new Error(`No existe "${CAMPEONATO}"`);
  if (c.estado !== 'activo') throw new Error(`"${CAMPEONATO}" no está activo`);
  console.log(`${CAMPEONATO} (#${c.id})${aplicar ? '' : '  — SIMULACIÓN, no se escribe nada (usa --aplicar)'}\n`);

  const delCampeonato = 'local_id IN (SELECT id FROM equipos WHERE campeonato_id = ?)';
  const sentencias = [];

  for (const [serie, fechas] of Object.entries(series)) {
    const equipos = await db.all(
      'SELECT id, nombre, grupo FROM equipos WHERE campeonato_id = ? AND serie = ?', [c.id, serie]
    );
    const id = Object.fromEntries(equipos.map(e => [e.nombre, e.id]));
    const nombres = equipos.map(e => e.nombre).sort();
    const delArchivo = [...new Set(fechas.flatMap(f => [...f.partidos.flat(), ...f.libres]))].sort();
    if (nombres.join('|') !== delArchivo.join('|')) {
      throw new Error(`${serie}: los equipos inscritos no coinciden con los del fixture`);
    }

    // Mismas reglas que el sorteo, comprobadas otra vez antes de escribir.
    // La localía no se exige: la asociación pidió no preocuparse de ella.
    const problema = validarFixture(
      nombres,
      fechas.map(f => ({ numero: f.numero, partidos: f.partidos.map(([local, visita]) => ({ local, visita })), libres: f.libres })),
      PARTIDOS_POR_EQUIPO,
      { exigirLocalia: false }
    );
    if (problema) throw new Error(`${serie}: ${problema}`);

    const { jugados } = await db.get(
      `SELECT COUNT(*) AS jugados FROM partidos WHERE ${delCampeonato} AND serie = ? AND estado = 'jugado'`,
      [c.id, serie]
    );
    if (Number(jugados) > 0) throw new Error(`${serie} ya tiene ${jugados} partido(s) jugados: no se reemplaza nada`);
    const { resoluciones } = await db.get(
      `SELECT COUNT(*) AS resoluciones FROM resoluciones r JOIN partidos p ON p.id = r.partido_id
       WHERE p.${delCampeonato} AND p.serie = ?`, [c.id, serie]
    );
    if (Number(resoluciones) > 0) throw new Error(`${serie} tiene resoluciones sobre sus partidos: no se reemplaza nada`);

    const grupo = equipos[0].grupo;
    sentencias.push(
      { sql: `DELETE FROM partidos WHERE ${delCampeonato} AND serie = ? AND fase = 'grupos'`, args: [c.id, serie] },
      { sql: 'DELETE FROM byes WHERE equipo_id IN (SELECT id FROM equipos WHERE campeonato_id = ?) AND serie = ?', args: [c.id, serie] },
    );
    console.log(`${serie}: ${nombres.length} equipos`);
    for (const f of fechas) {
      const dia = sumarDias(FECHA_INICIO, (f.numero - 1) * DIAS_ENTRE_FECHAS);
      for (const [local, visita] of f.partidos) {
        sentencias.push({
          sql: `INSERT INTO partidos (serie, grupo, fecha, local_id, visita_id, estado, fecha_partido)
                VALUES (?, ?, ?, ?, ?, 'programado', ?)`,
          args: [serie, grupo, f.numero, id[local], id[visita], dia],
        });
      }
      for (const libre of f.libres) {
        sentencias.push({
          sql: 'INSERT INTO byes (serie, grupo, fecha, equipo_id) VALUES (?, ?, ?, ?)',
          args: [serie, grupo, f.numero, id[libre]],
        });
      }
      console.log(`  Fecha ${f.numero} (${dia}): ${f.partidos.map(p => p.join(' vs ')).join(' · ')}  | Libre: ${f.libres.join(', ')}`);
    }
  }

  if (!aplicar) return;
  // Todo en una sola transacción: o queda el fixture nuevo completo o
  // queda el anterior intacto, nunca la mitad de cada uno.
  await db.batch(sentencias);
  console.log('\n✅ Fixture reemplazado en las 6 series.');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
