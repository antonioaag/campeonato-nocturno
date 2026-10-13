# Estado de sesión — Campeonato Nocturno 2026

Última actualización: 2026-10-13. Leer esto al retomar en vez de re-explorar todo el historial del chat.

## Contexto del proyecto
App de gestión de un campeonato de fútbol amateur (Liga Dávila / Francisco Moraga Gallegos).
Backend Node/Express + Turso (libSQL), frontend un solo `public/index.html`. Deploy automático
en Render al hacer push a `main`. El `.env` local apunta a producción real — cuidado.
Reglas completas del campeonato en `CLAUDE.md` del repo (leerlo siempre al empezar).

## Qué se hizo esta sesión (en orden)
1. **Arreglos de UX/seguridad en el frontend** (ya en prod): se quitó un parche que
   interceptaba `document.getElementById` y enmascaraba errores — la causa real eran dos
   modales de 2FA que faltaban en el HTML (ya agregados, el backend ya estaba completo).
   `JWT_SECRET` ahora es obligatoria en producción (antes caía a un secreto en disco que se
   perdía en cada deploy de Render). Se reemplazaron los 70 `alert()`/`confirm()` nativos por
   un sistema de toasts + modal de confirmación propios.
2. **Reordenó el cruce de semifinal de ADULTO** (Chayaihue-Pichanga / Boroa-Independiente) a
   pedido del usuario, sin tocar resultados de cuartos ya jugados.
3. **Respaldos**: `backup-bd.js` / `restaurar-desde-backup.js` (dump/restore completo de todas
   las tablas vía JSON) y un branch de GitHub `backup-adulto-actualizado-20260921` como
   respaldo de código.
4. **Migración a multi-campeonato (Fase 1, ya en prod)**: el Campeonato Nocturno 2026 (jugado
   completo, ambas series con campeón) se envolvió como campeonato histórico `finalizado`
   (solo lectura, candado aplicado en el backend). Se creó "Campeonato Clausura 2026" vacío y
   `activo`. Basado en el reglamento de Liga Dávila (PDF que el usuario subió): 6 series nuevas
   para Clausura 2026 — SUB13, SUB15, SUB17, PRIMERA_ADULTO, SEGUNDA_ADULTO, SENIOR — con
   validación de edad por serie (año de corte configurable por campeonato, no hardcodeado,
   porque sube cada temporada). Se agregó CRUD completo de equipos (antes no existía forma de
   inscribir un equipo nuevo desde la web). `server/campeonatos.js` + `server/routes/campeonatos.js`
   nuevos. Detalle de diseño importante: los grupos ya NO son una lista fija por serie — se
   descubren dinámicamente desde los equipos cargados (`tablas.js`), porque la composición real
   la define un sorteo que el usuario todavía no definió (no se sabe si será por serie o por
   equipo — **pendiente, bloquea seguir con fixture/partidos de Clausura 2026**).
5. **Bug de migración en producción, ya arreglado**: SQLite rechaza
   `ALTER TABLE ADD COLUMN NOT NULL DEFAULT REFERENCES` cuando la tabla ya tiene filas (nunca
   apareció en pruebas locales porque la tabla estaba vacía). Esto dejó la BD de producción a
   medio migrar (tabla `campeonatos` creada pero `equipos`/`resoluciones`/`castigos` sin
   `campeonato_id`), probablemente causando que Render sirviera una versión vieja del código.
   Se arregló `migrarCampeonatos()` en `server/db.js` (agregar columna nullable + UPDATE de
   relleno en vez de ALTER con default) y se corrió `completar-migraciones.js` manualmente
   contra producción — confirmado con `diagnostico-esquema.js` que quedó completo.
6. **Exportar a Excel**: `exportar-partidos-excel.js` (usa `exceljs`, ya en package.json) saca
   todos los partidos (grupos + eliminatorias, ADULTO y SENIOR) del Campeonato Nocturno 2026 en
   una sola hoja, con goles de cancha y homologados por el tribunal en columnas separadas.

## Decisiones de diseño a NO repetir/re-discutir
- Equipos: independientes por campeonato (no se reinscribe el mismo club automáticamente).
- Castigos/sanciones: las suspensiones activas SÍ se trasladan entre campeonatos (vía RUT,
  pendiente de implementar el mecanismo real — ver Fase 3 abajo).
- Campeonato finalizado = solo lectura, forzado en el backend.
- Solo un campeonato `activo` a la vez.
- WO en Clausura 2026 (reglamento Liga Dávila, no inventar): 2 WO seguidos por serie o 3 por
  rueda → el equipo **desciende de serie** (no se descalifica como en el torneo anterior). Se
  decidió modelarlo como una resolución más (`tipo = 'descenso_serie'`), sin tabla nueva: se
  actualiza `equipos.serie`/`grupo` hacia adelante, los partidos ya jugados en la serie vieja
  quedan intactos (principio ya establecido: el resultado de cancha es intocable). **Todavía no
  implementado**, es la Fase 3.

## Pendiente inmediato (lo último que se pidió, sin confirmar resultado)
- El usuario estaba por correr `node exportar-partidos-excel.js` en producción (ya reparada) y
  verificar que el sitio web cargara bien tras el redeploy. **No se confirmó el resultado de
  ninguna de las dos cosas** — preguntar primero si el Excel salió bien y si el sitio está OK.

## Fases pendientes de multi-campeonato (no empezadas)
- **Fase 2**: partidos/fixture/tabla de posiciones escopados correctamente por campeonato
  (hoy `tablas.js`/`playoffs.js`/`resoluciones.js` reciben solo `serie`, no `campeonato_id` —
  funciona hoy porque Clausura 2026 usa series con nombres distintos a las del histórico, pero
  es frágil).
- **Fase 3**: descenso de serie por WO (ver arriba) + traslado de castigos por RUT entre
  campeonatos.
- **Fase 4**: selector de campeonato en el frontend (hoy solo existe el switch Adultos/Seniors).
- **Bloqueante real**: el formato del sorteo de grupos para Clausura 2026 (por serie o por
  equipo) — el usuario dijo que aún no está decidido. Sin esto no se puede generar el fixture
  de Clausura 2026.

## Scripts de una sola vez creados esta sesión (quedaron en el repo, uso puntual)
`backup-bd.js`, `restaurar-desde-backup.js`, `reordenar-semifinal-adulto.js`,
`exportar-partidos-excel.js`, `diagnostico-esquema.js`, `completar-migraciones.js`,
`generar-cuartos-senior.js`, `restaurar-bd.js`. No hace falta tocarlos salvo que se pida algo
relacionado.
