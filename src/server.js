import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { testConnection } from '../database/db.js';
import { startScheduler, stopScheduler } from './services/schedulerService.js';
import { logAudit } from './services/auditService.js';

// Rutas
import companiesRouter from './routes/companies.js';
import newsRouter from './routes/news.js';
import sourcesRouter from './routes/sources.js';
import argentinaRouter from './routes/argentina.js';
import researchRouter from './routes/research.js';
import geminiRouter from './routes/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();

// Configuración de Seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate Limiting para protección contra abusos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas solicitudes desde esta IP, por favor intente nuevamente en unos minutos.'
  }
});
app.use('/api/', limiter);

// Parsing de JSON y datos urlencoded
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Servir frontend estático puro (HTML, CSS, JS)
app.use(express.static(publicDir));

// Rutas API
app.use('/api/companies', companiesRouter);
app.use('/api/news', newsRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/argentina', argentinaRouter);
app.use('/api/research', researchRouter);
app.use('/api/gemini', geminiRouter);

// Endpoint de diagnóstico y salud del sistema
app.get('/api/health', async (req, res) => {
  const dbHealth = await testConnection();
  res.json({
    status: dbHealth.success ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbHealth,
    geminiConfigured: Boolean(config.gemini.apiKey)
  });
});

// Manejo de errores de rutas no encontradas en /api
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint no encontrado: ${req.method} ${req.originalUrl}`
  });
});

// Manejador centralizado de errores con detección amigable de caídas de MySQL
app.use((err, req, res, next) => {
  if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
    console.error(`[MySQL Desconectado] Error al procesar ${req.method} ${req.originalUrl}: MySQL no responde en ${config.db.host}:${config.db.port}`);
    return res.status(503).json({
      success: false,
      code: 'DATABASE_UNAVAILABLE',
      error: `No se puede conectar a la base de datos MySQL (${config.db.host}:${config.db.port}). Inicia MySQL desde el Panel de XAMPP o ejecuta 'npm run mysql:start'.`
    });
  }

  console.error('Error en la aplicación:', err.message || err);
  const status = err.status || 500;
  const message = config.nodeEnv === 'production' 
    ? 'Ha ocurrido un error interno en el servidor' 
    : err.message || 'Error interno del servidor';

  res.status(status).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Fallback para SPA en frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Iniciar servidor solo si es ejecutado directamente o si el puerto está libre
let server = null;

export async function startServer(port = config.port) {
  return new Promise((resolve, reject) => {
    server = app.listen(port, async () => {
      console.log(`=======================================================`);
      console.log(` Financial Intelligence Tracker`);
      console.log(` Servidor activo en http://localhost:${port}`);
      console.log(` Entorno: ${config.nodeEnv}`);
      console.log(`=======================================================`);

      const dbCheck = await testConnection();
      if (dbCheck.success) {
        console.log('✓ Conexión a base de datos MySQL validada.');
        if (config.research.scheduleEnabled) {
          startScheduler();
        }
        await logAudit('SERVER_STARTED', 'SYSTEM', null, { port });
      } else {
        console.warn('\n*******************************************************');
        console.warn(' ATENCIÓN: El servidor MySQL no está en ejecución');
        console.warn(` Destino configurado: ${config.db.host}:${config.db.port}`);
        console.warn(' Para iniciarlo:');
        console.warn('   1. Abre el panel de XAMPP y haz clic en "Start" junto a MySQL');
        console.warn('   2. O ejecuta en otra terminal: npm run mysql:start');
        console.warn('*******************************************************\n');
      }
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Servidor] El puerto ${port} ya está en uso (instancia previa activa).`);
        resolve(server);
      } else {
        reject(err);
      }
    });
  });
}

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));
if (isDirectRun) {
  startServer();
}

// Cierre elegante
function gracefulShutdown(signal) {
  console.log(`\nRecibida señal ${signal}. Cerrando servidor y tareas...`);
  stopScheduler();
  if (server) {
    server.close(() => {
      console.log('Servidor HTTP cerrado.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
