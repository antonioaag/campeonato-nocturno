# GUÍA DE MIGRACIÓN A GOOGLE CLOUD

## PASO 1: CREAR PROYECTO EN GOOGLE CLOUD

### 1.1 Crear Proyecto
```bash
# Instalar Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

gcloud init
# Seleccionar crear nuevo proyecto
# Nombre: campeonato-nocturno
# ID: campeonato-nocturno-[TIMESTAMP]
```

### 1.2 Habilitar APIs Necesarias
```bash
gcloud services enable \
  run.googleapis.com \
  cloudsql.googleapis.com \
  cloudiam.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## PASO 2: SETUP DE CLOUD SQL (PostgreSQL)

### 2.1 Crear Instancia PostgreSQL
```bash
gcloud sql instances create campeonato-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --availability-type=ZONAL \
  --backup-start-time=03:00 \
  --enable-bin-log
```

### 2.2 Crear Base de Datos
```bash
gcloud sql databases create campeonato \
  --instance=campeonato-db

# Obtener IP pública de la instancia
gcloud sql instances describe campeonato-db --format='get(ipAddresses[0].ipAddress)'
```

### 2.3 Crear Usuario
```bash
gcloud sql users create campeonato \
  --instance=campeonato-db \
  --password  # Te pedirá ingresar contraseña
```

### 2.4 Obtener Connection String
```bash
# El connection string será:
# postgresql://campeonato:PASSWORD@[IP]:5432/campeonato
# O para Cloud Run (más seguro):
# postgresql://campeonato:PASSWORD@/campeonato?host=/cloudsql/[PROJECT:REGION:INSTANCE]
```

---

## PASO 3: MIGRAR DATABASE DE SQLite A PostgreSQL

### 3.1 Instalar herramientas
```bash
npm install --save-dev pg-migrate
npm install pg
```

### 3.2 Crear migration de estructura
```javascript
// migrations/001_initial_schema.js
const fs = require('fs');

exports.up = async (pgm) => {
  // Crear tabla usuarios
  pgm.createTable('usuarios', {
    id: { type: 'serial', primaryKey: true },
    username: { type: 'varchar(50)', unique: true, notNull: true },
    email: { type: 'varchar(100)', unique: true, notNull: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    rol: { type: 'varchar(20)', notNull: true, default: 'encargado' },
    totp_secret: { type: 'varchar(100)' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    updated_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  pgm.createIndex('usuarios', 'username');
  pgm.createIndex('usuarios', 'email');

  // Crear tabla series
  pgm.createTable('series', {
    id: { type: 'serial', primaryKey: true },
    nombre: { type: 'varchar(50)', notNull: true },
    descripcion: { type: 'text' },
    año: { type: 'integer' },
    created_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  // Crear tabla equipos
  pgm.createTable('equipos', {
    id: { type: 'serial', primaryKey: true },
    serie: { type: 'varchar(20)', notNull: true },
    nombre: { type: 'varchar(100)', notNull: true },
    grupo: { type: 'varchar(10)' },
    created_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  pgm.createIndex('equipos', ['serie', 'nombre']);

  // Crear tabla partidos
  pgm.createTable('partidos', {
    id: { type: 'serial', primaryKey: true },
    serie: { type: 'varchar(20)', notNull: true },
    grupo: { type: 'varchar(10)', notNull: true },
    fecha: { type: 'smallint' },
    local_id: { type: 'integer', references: 'equipos(id)' },
    visita_id: { type: 'integer', references: 'equipos(id)' },
    goles_local: { type: 'integer' },
    goles_visita: { type: 'integer' },
    estado: { type: 'varchar(20)', default: 'programado' },
    fecha_partido: { type: 'date' },
    hora: { type: 'time' },
    estadio: { type: 'varchar(100)' },
    turno: { type: 'varchar(20)' },
    updated_by: { type: 'integer', references: 'usuarios(id)' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    updated_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  pgm.createIndex('partidos', ['serie', 'grupo']);
  pgm.createIndex('partidos', 'estado');
  pgm.createIndex('partidos', 'fecha_partido');
};

exports.down = (pgm) => {
  pgm.dropTable('partidos');
  pgm.dropTable('equipos');
  pgm.dropTable('series');
  pgm.dropTable('usuarios');
};
```

### 3.3 Ejecutar migrations
```bash
npx node-pg-migrate up
```

### 3.4 Migrar datos (script)
```javascript
// migrate-data.js
const sqlite3 = require('sqlite3');
const { Client } = require('pg');

const sqliteDb = new sqlite3.Database('./db/campeonato.db');
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
});

async function migrateData() {
  await pgClient.connect();

  // Migrar usuarios
  const usuarios = await new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM usuarios', (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });

  for (const user of usuarios) {
    await pgClient.query(
      'INSERT INTO usuarios (id, username, email, password_hash, rol) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.usuario, user.usuario + '@local', user.password, user.rol]
    );
  }

  console.log(`✓ ${usuarios.length} usuarios migrados`);
  
  // Similar para otras tablas...

  await pgClient.end();
}

migrateData().catch(console.error);
```

---

## PASO 4: ACTUALIZAR CÓDIGO NODE.JS

### 4.1 Actualizar dependencias
```bash
npm install pg --save
npm uninstall sqlite3
npm install dotenv
```

### 4.2 Actualizar db.js
```javascript
// server/db.js
const { Pool } = require('pg');

let pool;

async function init() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    application_name: 'campeonato-nocturno',
    // Para Cloud Run con socket:
    // host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
    // database: 'campeonato',
    // user: 'campeonato',
    // password: process.env.DB_PASSWORD
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  console.log('✓ PostgreSQL conectado');
}

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database error', { text, error });
    throw error;
  }
}

async function get(text, params) {
  const res = await query(text, params);
  return res.rows[0];
}

async function all(text, params) {
  const res = await query(text, params);
  return res.rows;
}

async function run(text, params) {
  return query(text, params);
}

module.exports = {
  init,
  query,
  get,
  all,
  run
};
```

### 4.3 Actualizar queries SQL
```javascript
// ANTES (SQLite)
'SELECT * FROM partidos WHERE id = ?'

// DESPUÉS (PostgreSQL)
'SELECT * FROM partidos WHERE id = $1'

// CAMBIAR TODOS LOS ? POR $1, $2, etc.
```

---

## PASO 5: DOCKERFILE PARA CLOUD RUN

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código
COPY . .

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Startup
CMD ["node", "server/server.js"]
```

---

## PASO 6: DEPLOY A CLOUD RUN

### 6.1 Crear servicio Cloud Run
```bash
# Opción 1: Desde archivo local
gcloud run deploy campeonato-nocturno \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 512M \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 10 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://campeonato:PASSWORD@[CLOUD_SQL_IP]:5432/campeonato,JWT_SECRET=your-secret-key,NODE_ENV=production"

# Opción 2: Desde Artifact Registry (más automatizado)
gcloud builds submit --tag gcr.io/PROJECT_ID/campeonato-nocturno
gcloud run deploy campeonato-nocturno \
  --image gcr.io/PROJECT_ID/campeonato-nocturno \
  --platform managed \
  --region us-central1 \
  --set-env-vars="DATABASE_URL=..."
```

### 6.2 Configurar dominio personalizado
```bash
# Mapear dominio
gcloud run domain-mappings create \
  --service campeonato-nocturno \
  --domain campeonato-nocturno.com

# Obtener CNAME
gcloud run domain-mappings describe campeonato-nocturno.com

# Agregar a DNS del dominio:
# campeonato-nocturno.com CNAME ghs.googleusercontent.com
```

---

## PASO 7: CI/CD CON GITHUB ACTIONS

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      
      - name: Build and Deploy
        run: |
          gcloud builds submit \
            --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/campeonato-nocturno \
            --region us-central1
          
          gcloud run deploy campeonato-nocturno \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/campeonato-nocturno \
            --region us-central1 \
            --platform managed
      
      - name: Run Tests
        run: npm test
```

---

## PASO 8: MONITOREO Y LOGGING

### 8.1 Instalar Cloud Logging
```bash
npm install @google-cloud/logging
```

### 8.2 Configurar logging
```javascript
// server/logger.js
const logging = require('@google-cloud/logging');
const winston = require('winston');

const loggingWinston = new logging.LoggingWinston();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console(),
    loggingWinston
  ]
});

module.exports = logger;
```

### 8.3 Crear alertas
```bash
# Alerta para errores
gcloud alpha monitoring policies create \
  --notification-channels=[CHANNEL_ID] \
  --display-name="Campeonato API Errors" \
  --condition-display-name="High error rate"
```

---

## PASO 9: BACKUP Y DISASTER RECOVERY

### 9.1 Backups automáticos
```bash
gcloud sql backups create \
  --instance=campeonato-db \
  --description="Manual backup"

# Configurar backups automáticos (ya está por defecto)
# Retenidos por 7 días
```

### 9.2 Restore desde backup
```bash
gcloud sql backups restore BACKUP_ID \
  --backup-instance=campeonato-db \
  --target-instance=campeonato-db-restored
```

---

## PASO 10: OPTIMIZACIÓN DE COSTOS

### 10.1 Configuración recomendada
```
Cloud Run:
- CPU: 1 (suficiente para 50-100 req/s)
- Memory: 512MB (suficiente para Node.js)
- Max instances: 5-10 (según picos)
- Timeout: 3600s (máximo)

Cloud SQL:
- Tier: db-f1-micro ($15/mes)
- Storage: 100GB ($1.70/mes)
- Backups: Automáticos (incluidos)
```

### 10.2 Monitoreo de costos
```bash
gcloud billing budgets create \
  --billing-account=ACCOUNT_ID \
  --display-name="Campeonato Budget" \
  --budget-amount=50 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=100
```

---

## COSTOS MENSUALES ESTIMADOS

| Servicio | Costo |
|----------|-------|
| Cloud Run (1000 req/día) | $1-3 USD |
| Cloud SQL (db-f1-micro) | $15 USD |
| Cloud Storage (logs, archivos) | $1-5 USD |
| **Total** | **$17-23 USD/mes** |

Comparar con Render: $7-12/mes pero con BD limitada
**Con Google Cloud tendrás:** BD robusta, backups automáticos, escalabilidad infinita

---

## TROUBLESHOOTING

### Error: "Connection refused"
```bash
# Verificar firewall de Cloud SQL
gcloud sql instances patch campeonato-db \
  --enable-public-ip \
  --allowed-networks=0.0.0.0/0
```

### Error: "Cloud SQL Socket not found"
```bash
# Asegurarse de que el Cloud SQL Proxy está corriendo
# En Cloud Run, usar connectionString con socket
```

### Logs no aparecen
```bash
# Revisar en Cloud Logging
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

---

## RESUMEN DE MIGRACIÓN

✅ Proyecto Google Cloud creado
✅ PostgreSQL configurado
✅ Database migrada
✅ Código actualizado
✅ Dockerfile creado
✅ CI/CD configurado
✅ Dominio mapeado
✅ Monitoreo activo
✅ Backups automáticos
✅ Costo optimizado

**Tiempo estimado:** 4-6 horas
**Complejidad:** Media
**Beneficios:** Estabilidad, escalabilidad, backups automáticos
