import { query, closePool } from '../../database/db.js';
import { runResearch, processSource, retrySource, isInvestigationRunning } from '../services/researchService.js';
import { recordDataChange, getChangeHistory } from '../services/comparisonEngine.js';
import { checkAndRecoverIncompleteRuns } from '../services/schedulerService.js';

async function runResearchTests() {
  console.log('========================================');
  console.log(' TEST SUITE: Módulo de Investigación y Comparación Histórica');
  console.log('========================================');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Motor de Comparación Histórica - Preservación Inmutable de Versiones
    console.log('\n[Test 1] Verificando Motor de Comparación Histórica (data_versions)...');
    const changeResult = await recordDataChange({
      companyId: 1, // Interactive Brokers
      fieldName: 'Comisiones IBKR Pro Acciones US',
      previousValue: 'Tarifa Fija: USD 0.005 por acción (mínimo USD 1.00)',
      newValue: 'Tarifa Fija: USD 0.005 por acción (mínimo USD 1.00, bonificación por volumen extendida)',
      sourceUrl: 'https://www.interactivebrokers.com/en/pricing/commissions-home.php',
      verificationStatus: 'Verificado en fuente oficial',
      changeRationale: 'Revisión trimestral de condiciones de corretaje',
      actor: 'TEST_SUITE'
    });

    if (changeResult.recorded && changeResult.versionId) {
      console.log(`✓ [PASS] Cambio registrado con versionId: ${changeResult.versionId}`);
      passed++;

      // Verificar que el registro existe con ambos valores (anterior y nuevo)
      const [versionRecord] = await query(
        `SELECT * FROM data_versions WHERE id = ?`,
        [changeResult.versionId]
      );

      if (versionRecord && 
          versionRecord.previous_value.includes('USD 0.005') && 
          versionRecord.new_value.includes('bonificación por volumen')) {
        console.log('✓ [PASS] data_versions conserva versión previa y nueva intactas');
        passed++;
      } else {
        console.error('✗ [FAIL] Registro de versión incompleto:', versionRecord);
        failed++;
      }

      // Verificar que se haya emitido el evento correspondiente
      const [ev] = await query(
        `SELECT * FROM events WHERE company_id = 1 ORDER BY id DESC LIMIT 1`
      );
      if (ev && ev.summary.includes('Comisiones IBKR Pro')) {
        console.log('✓ [PASS] Evento cronológico emitido exitosamente');
        passed++;
      } else {
        console.error('✗ [FAIL] Evento cronológico no encontrado');
        failed++;
      }
    } else {
      console.error('✗ [FAIL] Error al registrar cambio histórico:', changeResult);
      failed++;
    }

    // Test 2: Prevención de Duplicados en Modificaciones Idénticas
    console.log('\n[Test 2] Verificando prevención de versiones duplicadas idénticas...');
    const duplicateCheck = await recordDataChange({
      companyId: 1,
      fieldName: 'Test Idéntico',
      previousValue: 'Mismo Valor',
      newValue: 'Mismo Valor',
      sourceUrl: 'https://example.com'
    });

    if (!duplicateCheck.recorded && duplicateCheck.reason === 'VALORES_IDENTICOS') {
      console.log('✓ [PASS] Prevención de duplicados cuando valores son idénticos');
      passed++;
    } else {
      console.error('✗ [FAIL] Falló prevención de duplicado:', duplicateCheck);
      failed++;
    }

    // Test 3: Manejo Seguro de Fuentes No Disponibles (Sin Pérdida de Historial)
    console.log('\n[Test 3] Verificando gestión de fuentes caídas o con error...');
    
    // Insertar fuente temporal apuntando a un puerto inalcanzable
    const insertSrc = await query(
      `INSERT INTO sources (company_id, name, category, url, is_official, verification_status)
       VALUES (2, 'Fuente Test Caída', 'Regulador de Prueba', 'http://127.0.0.1:59999/down-test', 1, 'Pendiente de verificación')`
    );
    const testSourceId = insertSrc.insertId;

    // Procesar la fuente caída
    const [createdSource] = await query(`SELECT * FROM sources WHERE id = ?`, [testSourceId]);
    const processResult = await processSource(createdSource);

    if (!processResult.success && processResult.status === 'FAILED') {
      console.log('✓ [PASS] Fuente inalcanzable detectada y procesada como fallida');
      passed++;

      // Verificar estado en DB
      const [updatedSource] = await query(`SELECT * FROM sources WHERE id = ?`, [testSourceId]);
      if (updatedSource.verification_status === 'Fuente no disponible' && updatedSource.consecutive_failures > 0) {
        console.log('✓ [PASS] Estado actualizado a "Fuente no disponible" y fallas consecutivas registradas');
        passed++;
      } else {
        console.error('✗ [FAIL] Estado de fuente no actualizado correctamente:', updatedSource);
        failed++;
      }

      // Verificar que se generó un hallazgo de advertencia
      const [finding] = await query(
        `SELECT * FROM findings WHERE source_id = ? AND impact_level = 'ADVERTENCIA'`,
        [testSourceId]
      );
      if (finding && finding.verification_status === 'Fuente no disponible') {
        console.log('✓ [PASS] Hallazgo de alerta generado sin declarar falsos positivos');
        passed++;
      } else {
        console.error('✗ [FAIL] Hallazgo de alerta no generado:', finding);
        failed++;
      }
    } else {
      console.error('✗ [FAIL] La fuente caída debió fallar:', processResult);
      failed++;
    }

    // Test 4: Reintento de Fuente Fallida
    console.log('\n[Test 4] Verificando mecanismo de reintento de fuente...');
    try {
      const retryRes = await retrySource(testSourceId);
      // Debe intentar y registrar el intento
      const [retriedSource] = await query(`SELECT consecutive_failures FROM sources WHERE id = ?`, [testSourceId]);
      if (retriedSource.consecutive_failures >= 2) {
        console.log('✓ [PASS] Reintento ejecutado y contador de fallos actualizado a 2');
        passed++;
      } else {
        console.error('✗ [FAIL] Contador de reintentos incorrecto:', retriedSource);
        failed++;
      }
    } catch (e) {
      console.error('✗ [FAIL] Error en retrySource:', e.message);
      failed++;
    }

    // Limpiar fuente temporal de prueba
    await query(`DELETE FROM findings WHERE source_id = ?`, [testSourceId]);
    await query(`DELETE FROM sources WHERE id = ?`, [testSourceId]);

    // Test 5: Ejecución Real de Investigación sobre Fuentes Públicas
    console.log('\n[Test 5] Ejecutando investigación real (alcance: TradingView)...');
    const researchRun = await runResearch({ scope: 'tradingview', triggeredBy: 'TEST_SUITE' });
    if (researchRun.started && researchRun.status === 'COMPLETED') {
      console.log(`✓ [PASS] Investigación completada: ${researchRun.sourcesChecked} fuentes revisadas (${researchRun.sourcesSucceeded} OK, ${researchRun.sourcesFailed} fallidas)`);
      passed++;

      // Verificar que se guardó en research_runs
      const [savedRun] = await query(
        `SELECT * FROM research_runs WHERE id = ?`,
        [researchRun.runId]
      );
      if (savedRun && savedRun.status === 'COMPLETED' && savedRun.completed_at !== null) {
        console.log('✓ [PASS] Registro en research_runs persistido con marcas temporales completas');
        passed++;
      } else {
        console.error('✗ [FAIL] Registro research_runs inválido:', savedRun);
        failed++;
      }
    } else {
      console.error('✗ [FAIL] Falló la ejecución de runResearch:', researchRun);
      failed++;
    }

    // Test 6: Detección y Recuperación de Revisiones Incompletas
    console.log('\n[Test 6] Verificando recuperación de revisiones colgadas (INCOMPLETE)...');
    // Insertar simulación de corrida interrumpida hace 45 minutos
    const staleRun = await query(
      `INSERT INTO research_runs (run_type, target_scope, status, started_at, triggered_by)
       VALUES ('SCHEDULED', 'ALL', 'RUNNING', DATE_SUB(NOW(), INTERVAL 45 MINUTE), 'CRASH_SIMULATION')`
    );
    const staleId = staleRun.insertId;

    await checkAndRecoverIncompleteRuns();

    const [recoveredRun] = await query(`SELECT status, error_summary FROM research_runs WHERE id = ?`, [staleId]);
    if (recoveredRun && recoveredRun.status === 'INCOMPLETE') {
      console.log('✓ [PASS] Corrida interrumpida detectada y marcada como INCOMPLETE');
      passed++;
    } else {
      console.error('✗ [FAIL] Falló recuperación de corrida inconclusa:', recoveredRun);
      failed++;
    }

    // Limpiar simulación
    await query(`DELETE FROM research_runs WHERE id = ?`, [staleId]);

  } catch (err) {
    console.error('Error general en prueba de investigación:', err);
    failed++;
  }

  console.log(`\nResultado Suite Investigación: ${passed} pasadas, ${failed} fallidas\n`);
  return { passed, failed };
}

if (process.argv[1].endsWith('test_research.js')) {
  runResearchTests().then(() => closePool()).then(() => process.exit(0));
}

export { runResearchTests };
