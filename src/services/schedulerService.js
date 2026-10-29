import { config } from '../config.js';
import { query } from '../../database/db.js';
import { runResearch, isInvestigationRunning } from './researchService.js';
import { logAudit } from './auditService.js';

let schedulerInterval = null;
let lastScheduledRunTime = null;
let isEnabled = config.research.scheduleEnabled;

/**
 * Detecta y marca ejecuciones que quedaron incompletas (por reinicio intempestivo del servidor)
 */
export async function checkAndRecoverIncompleteRuns() {
  try {
    const staleRuns = await query(
      `SELECT id, started_at FROM research_runs 
       WHERE status = 'RUNNING' AND started_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
    );

    for (const run of staleRuns) {
      console.warn(`[Planificador] Detectada ejecución inconclusa previa ID: ${run.id}. Marcando como INCOMPLETE.`);
      await query(
        `UPDATE research_runs 
         SET status = 'INCOMPLETE', completed_at = NOW(), error_summary = 'Ejecución interrumpida por reinicio o corte de proceso'
         WHERE id = ?`,
        [run.id]
      );
      await logAudit('RUN_MARKED_INCOMPLETE', 'SCHEDULER', null, { runId: run.id }, 'WARNING');
    }
  } catch (err) {
    console.error('Error al verificar ejecuciones incompletas:', err.message);
  }
}

/**
 * Inicia el planificador periódico de investigación
 */
export function startScheduler() {
  if (schedulerInterval) {
    return { running: true, message: 'El planificador ya está en ejecución' };
  }

  // Comprobar corridas colgadas al iniciar
  checkAndRecoverIncompleteRuns();

  const intervalMs = (config.research.scheduleMinutes || 60) * 60 * 1000;
  console.log(`[Planificador] Activado. Intervalo de ejecución programada: cada ${config.research.scheduleMinutes} minutos (${intervalMs}ms).`);

  schedulerInterval = setInterval(async () => {
    if (!isEnabled) {
      console.log('[Planificador] Deshabilitado temporalmente; omitiendo revisión.');
      return;
    }

    if (isInvestigationRunning()) {
      console.warn('[Planificador] Se omitió revisión programada porque ya existe una investigación en curso.');
      return;
    }

    console.log('[Planificador] Iniciando ciclo de investigación programada...');
    lastScheduledRunTime = new Date();
    try {
      await runResearch({ scope: 'ALL', triggeredBy: 'SCHEDULED' });
    } catch (err) {
      console.error('[Planificador] Error en investigación programada:', err.message);
    }
  }, intervalMs);

  return {
    running: true,
    intervalMinutes: config.research.scheduleMinutes,
    enabled: isEnabled
  };
}

/**
 * Detiene el planificador
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Planificador] Detenido.');
    return { running: false, message: 'Planificador detenido exitosamente' };
  }
  return { running: false, message: 'El planificador no estaba activo' };
}

/**
 * Obtener estado actual del planificador
 */
export function getSchedulerStatus() {
  return {
    active: Boolean(schedulerInterval),
    enabled: isEnabled,
    intervalMinutes: config.research.scheduleMinutes,
    lastScheduledRunTime,
    scheduleEnabledEnv: config.research.scheduleEnabled
  };
}

/**
 * Cambia el estado de activación sin detener el timer
 */
export function setSchedulerEnabled(enabled) {
  isEnabled = Boolean(enabled);
  return { enabled: isEnabled };
}
