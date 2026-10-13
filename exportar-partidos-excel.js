#!/usr/bin/env node
/**
 * Script: Exportar a Excel todos los partidos del Campeonato Nocturno 2026
 *
 * Trae grupos + eliminatorias de ADULTO y SENIOR, con el marcador de cancha
 * y el homologado (si el tribunal resolvió algo) en columnas separadas.
 * Todo en una sola hoja.
 */

require('dotenv').config();

const db = require('./server/db');
const { ajustesVigentes } = require('./server/resoluciones');

const NOMBRE_FASE = { grupos: 'Grupos', cuartos: 'Cuartos de final', semifinal: 'Semifinal', final: 'Final' };

async function main() {
  let ExcelJS;
  try {
    ExcelJS = require('exceljs');
  } catch (e) {
    console.error('\n❌ Falta la librería exceljs. Ejecuta primero: npm install exceljs\n');
    process.exit(1);
  }

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║   Exportando partidos del Campeonato Nocturno 2026         ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const campeonato = await db.get(
    "SELECT id, nombre FROM campeonatos WHERE nombre = 'Campeonato Nocturno 2026'"
  );
  if (!campeonato) {
    console.error('❌ No se encontró el campeonato "Campeonato Nocturno 2026" en la base de datos.');
    process.exit(1);
  }
  console.log(`Campeonato: ${campeonato.nombre} (id ${campeonato.id})\n`);

  const SERIES = ['ADULTO', 'SENIOR'];
  const filas = [];

  for (const serie of SERIES) {
    const partidos = await db.all(
      `SELECT
         p.id, p.fase, p.grupo, p.llave, p.fecha, p.fecha_partido, p.hora, p.estadio,
         l.nombre AS local, v.nombre AS visita,
         p.goles_local, p.goles_visita,
         p.penales_local, p.penales_visita,
         p.estado
       FROM partidos p
       JOIN equipos l ON l.id = p.local_id
       JOIN equipos v ON v.id = p.visita_id
       WHERE l.campeonato_id = ? AND p.serie = ?
       ORDER BY p.fase, p.grupo, p.fecha, p.id`,
      [campeonato.id, serie]
    );

    const { porPartido, anulados } = await ajustesVigentes(serie);

    partidos.forEach(p => {
      const homologacion = porPartido[p.id] || null;
      const anulacion = anulados[p.id] || null;
      filas.push({
        serie,
        fase: NOMBRE_FASE[p.fase] || p.fase,
        grupoOLlave: p.fase === 'grupos' ? p.grupo : `Llave ${p.llave}`,
        jornada: p.fecha,
        fechaPartido: p.fecha_partido || '',
        hora: p.hora || '',
        estadio: p.estadio || '',
        local: p.local,
        visita: p.visita,
        golesLocalCancha: p.goles_local,
        golesVisitaCancha: p.goles_visita,
        penalesLocal: p.penales_local,
        penalesVisita: p.penales_visita,
        estado: p.estado,
        golesLocalHomologado: homologacion ? homologacion.golesLocal : '',
        golesVisitaHomologado: homologacion ? homologacion.golesVisita : '',
        motivoHomologacion: homologacion ? homologacion.motivo : (anulacion ? `ANULADO: ${anulacion.motivo}` : ''),
      });
    });

    console.log(`${serie}: ${partidos.length} partidos`);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Partidos');

  ws.columns = [
    { header: 'Serie', key: 'serie', width: 10 },
    { header: 'Fase', key: 'fase', width: 16 },
    { header: 'Grupo/Llave', key: 'grupoOLlave', width: 12 },
    { header: 'Jornada', key: 'jornada', width: 9 },
    { header: 'Fecha', key: 'fechaPartido', width: 12 },
    { header: 'Hora', key: 'hora', width: 8 },
    { header: 'Estadio', key: 'estadio', width: 14 },
    { header: 'Local', key: 'local', width: 20 },
    { header: 'Visita', key: 'visita', width: 20 },
    { header: 'Goles Local (cancha)', key: 'golesLocalCancha', width: 18 },
    { header: 'Goles Visita (cancha)', key: 'golesVisitaCancha', width: 18 },
    { header: 'Penales Local', key: 'penalesLocal', width: 14 },
    { header: 'Penales Visita', key: 'penalesVisita', width: 14 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Goles Local (homologado)', key: 'golesLocalHomologado', width: 22 },
    { header: 'Goles Visita (homologado)', key: 'golesVisitaHomologado', width: 22 },
    { header: 'Motivo homologación/anulación', key: 'motivoHomologacion', width: 40 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: 'A1', to: 'Q1' };
  filas.forEach(f => ws.addRow(f));
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const archivo = `Campeonato_Nocturno_2026_partidos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await wb.xlsx.writeFile(archivo);

  console.log(`\n═══════════════════════════════════════════════════════════\n`);
  console.log(`✅ Total: ${filas.length} partidos exportados`);
  console.log(`✅ Archivo guardado: ${archivo}\n`);
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}).finally(() => process.exit(0));
