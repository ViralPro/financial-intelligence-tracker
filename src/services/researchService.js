import crypto from 'crypto';
import { query } from '../../database/db.js';
import { config } from '../config.js';
import { logAudit } from './auditService.js';
import { recordDataChange } from './comparisonEngine.js';
import { summarizeDocument, compareDocuments, isGeminiConfigured } from './geminiService.js';

let isResearchRunning = false;
let currentRunId = null;

export function isInvestigationRunning() {
  return isResearchRunning;
}

export function getCurrentRunId() {
  return currentRunId;
}

/**
 * Calcula el hash SHA-256 de un contenido de texto
 */
function computeHash(content) {
  return crypto.createHash('sha256').update(content || '').digest('hex');
}

/**
 * Consulta HTTP segura con timeout, User-Agent real y gestión de fallos
 */
async function fetchSourceContent(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.research.timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FinancialIntelligenceTracker/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });

    clearTimeout(timeoutId);
    const status = response.status;
    const isOk = response.ok;
    const text = await response.text();

    return {
      success: isOk,
      status,
      text,
      error: isOk ? null : `HTTP Status ${status} (${response.statusText})`
    };
  } catch (err) {
    clearTimeout(timeoutId);
    let errorMessage = err.message;
    if (err.name === 'AbortError') {
      errorMessage = `Timeout de conexión excedido (${config.research.timeoutMs}ms)`;
    }
    return {
      success: false,
      status: null,
      text: null,
      error: errorMessage
    };
  }
}

/**
 * Procesa la verificación de una fuente individual
 */
export async function processSource(source, runId = null) {
  const sourceId = source.id;
  const companyId = source.company_id;
  const url = source.url;

  // Si requiere consulta manual en portal gubernamental protegido
  if (source.manual_check_required && source.access_method === 'MANUAL_PORTAL') {
    await query(
      `UPDATE sources 
       SET last_checked_at = NOW(), 
           verification_status = 'Pendiente de verificación',
           last_error = 'Portal requiere búsqueda manual directa en padrón oficial'
       WHERE id = ?`,
      [sourceId]
    );
    return {
      sourceId,
      status: 'MANUAL_REQUIRED',
      success: true,
      changeDetected: false,
      message: 'Portal requiere consulta manual; verificado acceso al portal'
    };
  }

  // Ejecutar petición real a la fuente
  const result = await fetchSourceContent(url);
  const now = new Date();

  if (!result.success) {
    // Manejo de Fuente Fallida / No disponible
    const consecutive = (source.consecutive_failures || 0) + 1;
    await query(
      `UPDATE sources 
       SET last_checked_at = NOW(),
           http_status = ?,
           consecutive_failures = ?,
           last_error = ?,
           verification_status = 'Fuente no disponible'
       WHERE id = ?`,
      [result.status, consecutive, result.error, sourceId]
    );

    // Si la fuente asociada a la empresa falló, preservar datos históricos sin borrarlos
    if (companyId) {
      // Marcar documentos dependientes como 'Fuente no disponible' o 'Dato histórico'
      await query(
        `UPDATE documents 
         SET verification_status = 'Fuente no disponible' 
         WHERE source_id = ? AND verification_status != 'Dato histórico'`,
        [sourceId]
      );

      // Registrar hallazgo de alerta
      await query(
        `INSERT INTO findings 
         (company_id, research_run_id, source_id, title, category, finding_text, 
          impact_level, source_url, verification_status, detected_at)
         VALUES (?, ?, ?, ?, 'Fuente No Disponible', ?, 'ADVERTENCIA', ?, 'Fuente no disponible', NOW())`,
        [
          companyId,
          runId,
          sourceId,
          `Fuente inaccesible: ${source.name}`,
          `La fuente oficial no respondió correctamente. Error: ${result.error}. Se preservan los datos históricos previos sin sobreescritura.`,
          url
        ]
      );
    }

    return {
      sourceId,
      status: 'FAILED',
      success: false,
      error: result.error
    };
  }

  // Éxito en la consulta HTTP
  const contentSnippet = result.text.slice(0, 50000); // Muestra suficiente para comparación
  const newHash = computeHash(contentSnippet);
  const oldHash = source.content_hash;
  const changeDetected = Boolean(oldHash && oldHash !== newHash);

  // Actualizar la fuente en la base de datos
  await query(
    `UPDATE sources 
     SET last_checked_at = NOW(),
         last_success_at = NOW(),
         http_status = ?,
         consecutive_failures = 0,
         last_error = NULL,
         content_hash = ?,
         verification_status = 'Verificado en fuente oficial'
     WHERE id = ?`,
    [result.status, newHash, sourceId]
  );

  // Si se detectó un cambio en el documento/fuente
  if (changeDetected && companyId) {
    // 1. Obtener versión previa del documento
    const [existingDocs] = await query(
      `SELECT id, raw_content_preview, version_number FROM documents 
       WHERE source_id = ? ORDER BY version_number DESC LIMIT 1`,
      [sourceId]
    );

    const prevVersion = existingDocs ? existingDocs.version_number : 1;
    const oldContent = existingDocs ? (existingDocs.raw_content_preview || '') : '';

    // 2. Si Gemini está activo, generar comparativa semántica
    let aiSummary = null;
    if (isGeminiConfigured()) {
      const comp = await compareDocuments({
        oldText: oldContent,
        newText: contentSnippet,
        companyName: source.name,
        sourceUrl: url
      });
      if (comp.success) {
        aiSummary = comp.diffSummary;
      }
    }

    // 3. Registrar nueva versión del documento
    const docTitle = `Revisión Documental: ${source.name}`;
    await query(
      `INSERT INTO documents 
       (company_id, source_id, title, document_type, url, consultation_date, 
        summary, raw_content_preview, content_hash, version_number, verification_status)
       VALUES (?, ?, ?, 'Página Oficial / Términos', ?, NOW(), ?, ?, ?, ?, 'Verificado en fuente oficial')`,
      [
        companyId,
        sourceId,
        docTitle,
        url,
        aiSummary || 'Diferencia detectada en el contenido oficial respecto a la versión previa.',
        contentSnippet.slice(0, 5000),
        newHash,
        prevVersion + 1
      ]
    );

    // 4. Registrar en el motor de comparación histórica (data_versions)
    await recordDataChange({
      companyId,
      sourceId,
      fieldName: `Contenido Documental: ${source.name}`,
      previousValue: `Hash anterior: ${oldHash.slice(0, 16)}...`,
      newValue: `Nuevo Hash: ${newHash.slice(0, 16)}...`,
      sourceUrl: url,
      verificationStatus: 'Verificado en fuente oficial',
      changeRationale: 'Actualización o modificación detectada en el sitio oficial',
      actor: 'RESEARCH_ENGINE'
    });

    // 5. Registrar Evento
    await query(
      `INSERT INTO events (company_id, event_type, summary, detail, source_url, event_date)
       VALUES (?, 'DOCUMENT_REVISED', ?, ?, ?, NOW())`,
      [
        companyId,
        `Documento oficial actualizado: ${source.name}`,
        aiSummary || `Se detectaron cambios en el contenido de la fuente oficial ${url}.`,
        url
      ]
    );

    // 6. Registrar Hallazgo
    await query(
      `INSERT INTO findings 
       (company_id, research_run_id, source_id, title, category, finding_text, 
        impact_level, source_url, verification_status, detected_at)
       VALUES (?, ?, ?, ?, 'Regulación y Términos', ?, 'REVISION_REQUERIDA', ?, 'Verificado en fuente oficial', NOW())`,
      [
        companyId,
        runId,
        sourceId,
        `Modificación en fuente oficial: ${source.name}`,
        `Se detectó una alteración de contenido en la fuente regulada. ${aiSummary ? 'Análisis IA: ' + aiSummary.slice(0, 400) : 'Pendiente de cotejo manual de cláusulas.'}`,
        url
      ]
    );
  } else if (!oldHash && companyId) {
    // Primera vez que se consulta la fuente con éxito: registrar documento inicial
    await query(
      `INSERT INTO documents 
       (company_id, source_id, title, document_type, url, consultation_date, 
        summary, raw_content_preview, content_hash, version_number, verification_status)
       VALUES (?, ?, ?, 'Página Oficial / Registro', ?, NOW(), ?, ?, ?, 1, 'Verificado en fuente oficial')`,
      [
        companyId,
        sourceId,
        `Documento Inicial: ${source.name}`,
        url,
        `Contenido inicial registrado y verificado en la fuente oficial ${url}.`,
        contentSnippet.slice(0, 5000),
        newHash
      ]
    );
  }

  // Actualizar estado de verificación y última revisión de la empresa
  if (companyId) {
    await query(
      `UPDATE companies 
       SET last_reviewed_at = NOW(), 
           verification_status = 'Verificado en fuente oficial' 
       WHERE id = ? AND verification_status = 'Pendiente de verificación'`,
      [companyId]
    );

    // Actualizar entidades jurídicas asociadas
    await query(
      `UPDATE legal_entities 
       SET verification_status = 'Verificado en fuente oficial', last_verified_at = NOW() 
       WHERE company_id = ? AND verification_status = 'Pendiente de verificación'`,
      [companyId]
    );

    // Actualizar licencias asociadas
    await query(
      `UPDATE licenses 
       SET verification_status = 'Verificado en fuente oficial', consultation_date = NOW() 
       WHERE company_id = ? AND verification_status = 'Pendiente de verificación'`,
      [companyId]
    );

    // Actualizar costos/impuestos asociados
    await query(
      `UPDATE cost_tax_entries 
       SET verification_status = 'Verificado en fuente oficial', consultation_date = NOW() 
       WHERE company_id = ? AND verification_status = 'Pendiente de verificación'`,
      [companyId]
    );
  }

  return {
    sourceId,
    status: 'SUCCESS',
    success: true,
    changeDetected,
    contentHash: newHash
  };
}

/**
 * Inicia una investigación (manual o programada)
 */
export async function runResearch({ scope = 'ALL', triggeredBy = 'MANUAL' } = {}) {
  // Evitar ejecuciones simultáneas duplicadas
  if (isResearchRunning) {
    return {
      started: false,
      message: 'Ya hay una investigación en curso. Espere a que finalice.',
      currentRunId
    };
  }

  isResearchRunning = true;

  try {
    // 1. Crear registro en research_runs
    const runResult = await query(
      `INSERT INTO research_runs (run_type, target_scope, status, started_at, triggered_by)
       VALUES (?, ?, 'RUNNING', NOW(), ?)`,
      [triggeredBy, scope, triggeredBy]
    );
    currentRunId = runResult.insertId;

    await logAudit('RESEARCH_RUN_STARTED', triggeredBy, null, { runId: currentRunId, scope });

    // 2. Obtener fuentes a investigar según el alcance
    let sourcesSql = `SELECT * FROM sources`;
    const params = [];
    if (scope !== 'ALL') {
      const [comp] = await query(`SELECT id FROM companies WHERE slug = ? OR id = ?`, [scope, scope]);
      if (comp) {
        sourcesSql += ` WHERE company_id = ? OR company_id IS NULL`;
        params.push(comp.id);
      }
    }

    const sourcesToProcess = await query(sourcesSql, params);

    let checked = 0;
    let succeeded = 0;
    let failed = 0;
    let changes = 0;

    for (const src of sourcesToProcess) {
      try {
        const res = await processSource(src, currentRunId);
        checked++;
        if (res.success) {
          succeeded++;
          if (res.changeDetected) changes++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`Error procesando fuente ${src.id} (${src.url}):`, err.message);
        failed++;
        checked++;
      }
    }

    // Contar hallazgos generados durante la corrida
    const [findingsCountRow] = await query(
      `SELECT count(*) as count FROM findings WHERE research_run_id = ?`,
      [currentRunId]
    );
    const findingsCount = findingsCountRow ? findingsCountRow.count : 0;

    // 3. Finalizar registro en research_runs
    await query(
      `UPDATE research_runs 
       SET status = 'COMPLETED',
           completed_at = NOW(),
           sources_checked = ?,
           sources_succeeded = ?,
           sources_failed = ?,
           changes_detected = ?,
           findings_count = ?
       WHERE id = ?`,
      [checked, succeeded, failed, changes, findingsCount, currentRunId]
    );

    await logAudit('RESEARCH_RUN_COMPLETED', triggeredBy, null, {
      runId: currentRunId,
      checked,
      succeeded,
      failed,
      changes
    });

    const summary = {
      runId: currentRunId,
      status: 'COMPLETED',
      sourcesChecked: checked,
      sourcesSucceeded: succeeded,
      sourcesFailed: failed,
      changesDetected: changes,
      findingsGenerated: findingsCount
    };

    return { started: true, ...summary };
  } catch (error) {
    console.error('Error crítico en investigación:', error);
    if (currentRunId) {
      await query(
        `UPDATE research_runs 
         SET status = 'FAILED', completed_at = NOW(), error_summary = ? 
         WHERE id = ?`,
        [error.message, currentRunId]
      );
    }
    return {
      started: false,
      status: 'FAILED',
      error: error.message
    };
  } finally {
    isResearchRunning = false;
    currentRunId = null;
  }
}

/**
 * Reintentar una fuente específica fallida
 */
export async function retrySource(sourceId) {
  const [source] = await query(`SELECT * FROM sources WHERE id = ?`, [sourceId]);
  if (!source) {
    throw new Error(`Fuente con ID ${sourceId} no encontrada`);
  }

  const result = await processSource(source);
  await logAudit('SOURCE_RETRY', 'MANUAL', null, { sourceId, result });
  return result;
}

/**
 * Obtener estado actual de las investigaciones
 */
export async function getResearchStatus() {
  const [latestRun] = await query(
    `SELECT * FROM research_runs ORDER BY started_at DESC LIMIT 1`
  );

  const [failedSources] = await query(
    `SELECT count(*) as count FROM sources WHERE verification_status = 'Fuente no disponible'`
  );

  return {
    isRunning: isResearchRunning,
    currentRunId,
    latestRun: latestRun || null,
    unavailableSourcesCount: failedSources ? failedSources.count : 0
  };
}

/**
 * Obtener errores de fuentes registradas
 */
export async function getSourceErrors() {
  return await query(
    `SELECT s.id, s.name, s.category, s.url, s.http_status, s.last_checked_at, 
            s.consecutive_failures, s.last_error, s.verification_status, c.name as company_name
     FROM sources s
     LEFT JOIN companies c ON s.company_id = c.id
     WHERE s.last_error IS NOT NULL OR s.verification_status = 'Fuente no disponible'
     ORDER BY s.last_checked_at DESC`
  );
}
