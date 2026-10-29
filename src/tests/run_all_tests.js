import { runDbTests } from './test_db.js';
import { runApiTests } from './test_api.js';
import { runResearchTests } from './test_research.js';
import { runGeminiTests } from './test_gemini.js';
import { closePool } from '../../database/db.js';
import { stopScheduler } from '../services/schedulerService.js';

async function runAll() {
  console.log('###############################################################');
  console.log('   FINANCIAL INTELLIGENCE TRACKER - SUITE COMPLETA DE PRUEBAS  ');
  console.log('###############################################################\n');

  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Pruebas de DB
  const dbRes = await runDbTests();
  totalPassed += dbRes.passed;
  totalFailed += dbRes.failed;

  // 2. Pruebas de API
  const apiRes = await runApiTests();
  totalPassed += apiRes.passed;
  totalFailed += apiRes.failed;

  // 3. Pruebas de Investigación y Motor de Comparación
  const resRes = await runResearchTests();
  totalPassed += resRes.passed;
  totalFailed += resRes.failed;

  // 4. Pruebas de Gemini
  const gemRes = await runGeminiTests();
  totalPassed += gemRes.passed;
  totalFailed += gemRes.failed;

  // Finalizar procesos y conexiones
  stopScheduler();
  await closePool();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('===============================================================');
  console.log(` REPORTE FINAL CONSOLIDADO (${durationSec}s)`);
  console.log(` Pruebas Pasadas:  ${totalPassed}`);
  console.log(` Pruebas Fallidas: ${totalFailed}`);
  console.log('===============================================================');

  if (totalFailed > 0) {
    console.error('Se detectaron fallos en las pruebas.');
    process.exit(1);
  } else {
    console.log('✓ TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO.');
    process.exit(0);
  }
}

runAll();
