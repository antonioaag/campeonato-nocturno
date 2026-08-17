# Campeonato nocturno 2026 — "Francisco Moraga Gallegos"

Aplicación web (backend Node.js/Express + SQLite, frontend HTML/Tailwind) para gestionar
el fixture, los resultados y la tabla de posiciones del campeonato. A diferencia de la
versión original (que guardaba todo en el navegador con `localStorage`), esta versión
guarda los datos en un servidor: todas las personas que entren ven la misma información
actualizada, y solo quienes tengan una cuenta pueden cargar resultados.

## Requisitos

- Node.js 18 o superior instalado en el computador/servidor donde se va a correr.

## Instalación y primer arranque

```bash
npm install
npm run seed      # crea la base de datos con los 13 equipos reales, el fixture completo
                   # y los resultados de la Fecha 1 ya cargados
npm start          # levanta el servidor en http://localhost:3000
```

Si por algún motivo no corres `npm run seed` a mano, el servidor lo hace automáticamente
la primera vez que detecta que la base de datos está vacía.

Abre `http://localhost:3000` en el navegador. Ahí puedes ver equipos, partidos y posiciones
sin necesidad de iniciar sesión. Para cargar resultados hace falta una cuenta.

## Cuenta de administrador

```
Usuario: Squale0001
Clave:   Squale.0608
```

El administrador puede, desde la pestaña **Usuarios** dentro de la aplicación (no hace
falta tocar la base de datos a mano):

- Crear cuentas para las personas de confianza que van a cargar resultados (rol
  "Encargado") o para otros administradores.
- Cambiar la clave de cualquier usuario.
- Eliminar usuarios.

Recomendación: cambia la clave del admin apenas la app esté funcionando, desde la pestaña
Usuarios ("Cambiar clave").

## Qué cambia respecto al archivo HTML original

- **Los datos ya no viven en el navegador de cada persona.** Antes, cada quien tenía su
  propia copia en `localStorage`; ahora todos ven la misma tabla de posiciones porque
  los datos están en el servidor (`data/campeonato.db`, SQLite).
- **Login individual.** Cada encargado tiene su propio usuario y clave, en vez de que
  cualquiera con el link pueda editar resultados.
- **Estado de partido explícito.** Cada partido puede estar "Pendiente", "Jugado" o
  "Aplazado" — así se puede reflejar un partido suspendido (por ejemplo, por lluvia) sin
  que cuente como jugado ni sume 0-0 a la tabla.
- **Columna PA (Partidos Aplazados)** en la tabla de posiciones, para ver de un vistazo
  quién tiene partidos pendientes de reprogramar.
- **Validación real de resultados** en el servidor (no solo en el HTML): no se pueden
  guardar goles negativos ni resultados incompletos.
- **Fecha 1 ya cargada** con los resultados reales que se jugaron, incluyendo el partido
  SAO PAULO vs J. OVALLE marcado como aplazado por lluvia.
- **CSS de Tailwind compilado localmente** (`public/styles.css`) en vez de cargarlo desde
  internet en cada visita — más rápido y no depende de que el CDN esté disponible.

## Cómo se armó la Fecha 1 / el fixture

El campeonato usa el método del círculo para el round-robin (igual que el archivo
original). El **orden** en que aparecen los equipos en `server/seed.js` no es cosmético:
se eligió a propósito para que, al generar el fixture completo, la Fecha 1 resultante
coincida exactamente con los partidos que ya se jugaron en la vida real (Vecinal-Flamengo,
Platense-Caupolicán Peña, Cardenal Caro-10 de Marzo, con Pichanga libre; y en el Grupo B,
Estocolmo-Chayaihue, Independiente-Boroa, con Sao Paulo-J. Ovalle aplazado).

Las fechas 2 en adelante se generaron automáticamente a partir de ese punto de partida.
Si el campeonato ya tiene un calendario oficial fijado para esas fechas (por ejemplo,
publicado por la organización) y no coincide con lo que generó el sistema, avísame para
ajustarlo — el sistema no tiene forma de saberlo por sí solo.

## Herramientas de administrador en la pestaña "Equipos"

- **Regenerar Fixture Grupo A/B**: vuelve a generar todos los cruces de ese grupo desde
  cero. Borra todos los resultados cargados de ese grupo. Pide confirmación.
- **Reiniciar Resultados A/B**: deja todos los partidos de ese grupo como "Pendiente"
  (sin resultado), pero mantiene el fixture (los cruces) tal como está. Pide confirmación.

## Desplegar la app para que la usen varias personas desde internet

Tal como está ahora, la app corre en tu propio computador y solo se puede ver
desde ese computador (`localhost`). Para que las personas de confianza puedan entrar
desde sus celulares o desde otras casas, hay que subirla a un servidor con una URL
pública. Algunas opciones simples y con plan gratuito:

- **Render.com**: conecta un repositorio de GitHub con este código, elige "Web Service",
  build command `npm install && npm run build:css`, start command `npm start`. Hay que
  usar un "disco persistente" (Render lo llama "Persistent Disk") para que la carpeta
  `data/` (donde vive la base SQLite) no se borre en cada despliegue.
- **Railway.app**: similar a Render, también con volumen persistente para `data/`.
- Cualquier VPS propio (DigitalOcean, un servidor en casa, etc.) con Node.js instalado.

Puedo ayudarte a dejarlo desplegado en cualquiera de estas opciones si me confirmas cuál
prefieres y me das acceso a la cuenta correspondiente (o me guías tú mismo con mis
instrucciones paso a paso).

## Estructura del proyecto

```
campeonato-nocturno/
├── package.json
├── tailwind.config.js
├── data/                    # se crea sola; contiene campeonato.db (no se sube a git)
├── public/
│   ├── index.html           # frontend (una sola página)
│   ├── tailwind-input.css   # fuente de Tailwind
│   └── styles.css           # CSS compilado (generado con "npm run build:css")
└── server/
    ├── server.js            # arranque del servidor Express
    ├── db.js                # conexión SQLite + esquema de tablas
    ├── seed.js               # datos iniciales (equipos, fixture, Fecha 1, admin)
    ├── auth.js               # JWT y middlewares de autenticación
    ├── fixtureGenerator.js  # algoritmo de round-robin (método del círculo)
    └── routes/
        ├── auth.js           # login, /me, cambiar clave
        ├── usuarios.js       # CRUD de usuarios (solo admin)
        ├── equipos.js        # listar equipos, renombrar (solo admin)
        ├── partidos.js       # listar partidos y cargar resultados/estado
        ├── posiciones.js     # cálculo de tablas de posiciones
        └── fixture.js        # regenerar fixture / reiniciar resultados (solo admin)
```
