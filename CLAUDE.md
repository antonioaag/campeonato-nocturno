# Campeonato Nocturno 2026 — guía para Claude

App de gestión de un campeonato de fútbol amateur: fixture, resultados, tabla de
posiciones, eliminatorias y sanciones. Backend Node/Express, frontend en un solo
HTML con Tailwind por CDN. Sin build: se edita `public/index.html` y listo.

## Infraestructura (leer antes de opinar sobre la arquitectura)

- **Producción:** https://campeonato-nocturno.onrender.com (sin sufijos en el nombre).
- **Hosting:** Render, despliega solo al hacer `git push` a `main`.
- **Base de datos: Turso** (libSQL en la nube), NO SQLite local. Ver `server/db.js`:
  si existe `TURSO_DATABASE_URL` usa Turso, si no cae a `data/campeonato.db`.
  Turso ya resuelve nube, réplicas y backups — **no proponer migrar a otro
  hosting o motor de base de datos** salvo que el usuario lo pida.
- **El `.env` local apunta a la base de PRODUCCIÓN.** Correr `npm start` en la
  máquina del usuario lee y escribe datos reales del campeonato.
- El disco de Render es efímero: `data/` se borra en cada deploy. Por eso
  `JWT_SECRET` va en variables de entorno, no en disco.

### Probar sin tocar producción

```bash
TURSO_DATABASE_URL= TURSO_AUTH_TOKEN= PORT=3100 ADMIN_PASSWORD=testpass123 JWT_SECRET=fijo123 node server/server.js
```

Levanta en el puerto 3100 con una base local que se auto-siembra con los equipos
y el fixture completo. Al terminar, borrar `data/campeonato.db*`.

## Estructura

```
server/
  server.js         monta las rutas y sirve public/
  db.js             conexión (Turso o local) + migraciones idempotentes en init()
  auth.js           JWT. requireAuth / requireAdmin / authOpcional
  series.js         catálogo de series y sus grupos
  tablas.js         cálculo de posiciones y de clasificados
  playoffs.js       siembra y cruces de la eliminación directa
  resoluciones.js   sanciones -> ajustes sobre la tabla
  walkover.js       regla del WO: 3-0, descalificación y qué pasa con el resto
  configuracion.js  ajustes clave/valor que el admin cambia sin deploy
  fixtureGenerator.js  round robin
  routes/           una por recurso
public/index.html   TODO el frontend (HTML + CSS + JS en un archivo)
```

## Reglas del campeonato (definidas por la asociación, no inventar)

- **Series:** `ADULTO` (grupos A de 7 equipos y B de 6) y `SENIOR` (grupos 1, 2 y 3, de 4).
- **Clasificación a cuartos:**
  - ADULTO: los 4 primeros de cada grupo. Cruce cruzado: 1ºA-4ºB, 2ºB-3ºA, 1ºB-4ºA, 2ºA-3ºB.
  - SENIOR: 2 primeros de cada grupo + 2 mejores terceros. Ranking global de los 8
    (líderes 1-3, segundos 4-6, terceros 7-8) y cruce 1v8, 2v7, 3v6, 4v5.
- **Eliminatorias a partido único.** Si empatan, se define por penales
  (`penales_local` / `penales_visita`), conservando el marcador de los 90 minutos.
- **Desempate en la tabla:** puntos, diferencia de gol, goles a favor, goles en
  contra (menos es mejor), alfabético.
- **WO (walkover):** el equipo que no se presenta, o llega sin la base mínima de
  jugadores, pierde 3-0 y queda **descalificado del campeonato**. Deja de contar
  para la clasificación aunque fuera puntero, y los que venían detrás corren un
  puesto. Con él fuera, el resto de sus partidos se resuelve según cuánto
  alcanzó a jugar. El corte es la mitad de sus partidos de grupo redondeada
  hacia arriba: 3 en Adulto (grupos A y B) y 2 en Senior.
  - Jugó el corte o más: lo jugado queda firme y los rivales que todavía no lo
    enfrentaban ganan 1-0.
  - Jugó menos: se anulan todos sus partidos y nadie recibe puntos por haberlo
    enfrentado, porque con tan pocas fechas repartiría ventajas según a quién le
    tocó enfrentarlo antes.

  El 3-0 del partido del WO no se toca en ninguno de los dos casos: el equipo
  que sí fue a la cancha no pierde lo que ganó ahí. Por ahora el WO solo se
  registra en fase de grupos; en una llave de eliminatorias se homologa el
  partido a mano.

## Principio de diseño: el resultado de cancha es intocable

Las sanciones del tribunal (descuentos de puntos, partidos ganados por
secretaría) **no editan el marcador**. Lo que se jugó queda guardado tal cual y
la resolución se aplica encima al calcular, con su artículo, motivo y acta.

Un partido que terminó 5-3 sigue diciendo 5-3, y aparte muestra "homologado
0-3, Art. 78". Si se pudiera editar el marcador, nadie podría distinguir una
sanción de un error de carga.

Las resoluciones son **append-only**: no hay UPDATE de contenido ni DELETE. Si
una queda sin efecto se marca `revocada` con su motivo y se emite otra.

Si alguna vez se pide "dejar que el admin corrija el marcador de un partido
sancionado", esa es justamente la funcionalidad que este diseño evita: proponer
una resolución en su lugar.

El WO sigue la misma regla y es una resolución más (`tipo = 'walkover'`): no
edita ningún partido. Un partido anulado por WO conserva su marcador en el
fixture y aparece tachado con el motivo. Como de cuántos partidos había jugado
el infractor depende que se anule media fase, ese conteo se **congela** en la
resolución (`wo_jugados` / `wo_total`) en vez de recalcularse: si se recalculara,
cargar un resultado atrasado podría dar vuelta la tabla en silencio meses
después. Por lo mismo, una vez descalificado un equipo, sus partidos ya no
aceptan resultados.

## Pestañas que se publican

`Eliminatorias` y `Resoluciones` nacen ocultas y el admin las publica cuando
quiere, por serie, desde un interruptor en la propia pestaña. El filtrado es
del servidor: quien no sea admin recibe vacío. Se guarda en la tabla
`configuracion` (`playoffs_publicos_<serie>`, `resoluciones_publicas_<serie>`).

Ojo: el interruptor oculta el **registro**, no el efecto. Un descuento se aplica
a la tabla apenas se registra, esté publicado o no.

## Convenciones

- Comentarios y textos de interfaz **en español**.
- Migraciones: funciones idempotentes en `db.js` llamadas desde `init()`, siempre
  aditivas (`ALTER TABLE ... ADD COLUMN` con default). Nunca borrar columnas ni datos.
- Los comentarios explican **por qué**, no qué hace la línea.
- El frontend cachea los partidos en `PARTIDOS_CACHE` por id. **No leer datos
  raspando celdas del DOM** — eso causó bugs intermitentes en el pasado.
- Las rutas públicas que cambian según el rol usan `authOpcional`, que nunca
  rechaza: un token vencido se atiende como visitante anónimo.

## Al terminar un cambio

1. Probar contra el puerto 3100 (nunca escribir en producción para probar).
2. Borrar `data/campeonato.db*` al terminar.
3. Commit y push solo si el usuario lo pide; Render despliega automáticamente.
4. Si el cambio agrega algo visible al público, preguntar antes si debe nacer oculto.
