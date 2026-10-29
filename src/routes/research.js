import express from 'express';
import { runResearch, getResearchStatus, getSourceErrors, retrySource } from '../services/researchService.js';
import { getSchedulerStatus, setSchedulerEnabled } from '../services/schedulerService.js';
import { config } from '../config.js';

const router = express.Router();

// Middleware de protección para endpoints de escritura
function requireWriteAuth(req, res, next) {
  // En modo desarrollo local se permite si no se provee cabecera especial
  const clientKey = req.headers['x-api-key'] || req.query.api_key;
  if (config.nodeEnv === 'production' && clientKey !== config.security.writeApiKey) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado. Se requiere x-api-key válida para operaciones de investigación.'
    });
  }
  next();
}

/**
 * POST /api/research/run
 * Inicia una investigación manual (completa o por empresa)
 */
router.post('/run', requireWriteAuth, async (req, res, next) => {
  try {
    const scope = req.body.scope || 'ALL';
    const result = await runResearch({
      scope,
      triggeredBy: req.body.triggeredBy || 'MANUAL_USER'
    });

    res.json({
      success: result.started,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/research/status
 * Retorna el estado actual de la investigación y última ejecución
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await getResearchStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/research/errors
 * Retorna la lista de fuentes con errores o inaccesibles
 */
router.get('/errors', async (req, res, next) => {
  try {
    const errors = await getSourceErrors();
    res.json({
      success: true,
      count: errors.length,
      data: errors
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/research/retry-source
 * Reintenta una fuente específica fallida
 */
router.post('/retry-source', requireWriteAuth, async (req, res, next) => {
  try {
    const sourceId = parseInt(req.body.sourceId, 10);
    if (!sourceId || isNaN(sourceId)) {
      return res.status(400).json({
        success: false,
        error: 'sourceId numérico es requerido'
      });
    }

    const result = await retrySource(sourceId);
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/research/scheduler
 * Retorna el estado del planificador periódico
 */
router.get('/scheduler', async (req, res, next) => {
  try {
    const sched = getSchedulerStatus();
    res.json({
      success: true,
      data: sched
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/research/scheduler/toggle
 * Activa o desactiva el planificador periódico
 */
router.post('/scheduler/toggle', requireWriteAuth, async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const result = setSchedulerEnabled(enabled);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
