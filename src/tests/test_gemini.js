import { isGeminiConfigured, getGeminiStatus, summarizeDocument, extractEntitiesAndLicenses, compareDocuments } from '../services/geminiService.js';
import { closePool } from '../../database/db.js';

async function runGeminiTests() {
  console.log('========================================');
  console.log(' TEST SUITE: Integración con Google Gemini');
  console.log('========================================');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Comprobación de estado sin fugas de secretos
    const status = getGeminiStatus();
    console.log(`Estado Gemini: ${status.statusText} (Modelo: ${status.model})`);

    if (typeof status.configured === 'boolean' && status.statusText && !status.apiKey) {
      console.log('✓ [PASS] getGeminiStatus() reporta estado seguro sin exponer credenciales');
      passed++;
    } else {
      console.error('✗ [FAIL] getGeminiStatus() inválido o inseguro:', status);
      failed++;
    }

    // Test 2: Comportamiento ante clave no configurada (o modo real si está configurada)
    if (!isGeminiConfigured()) {
      console.log('\n[Modo: Clave No Configurada - Verificando Degradación Elegante]');
      
      const summaryResult = await summarizeDocument({
        title: 'Reporte Financiero Anual',
        text: 'Interactive Brokers LLC reportó ingresos netos operacionales bajo regulación SEC y FINRA.',
        sourceUrl: 'https://www.sec.gov/edgar/browse/?CIK=0001381197',
        companyName: 'Interactive Brokers'
      });

      if (summaryResult.configured === false && summaryResult.summary.includes('Fuente original')) {
        console.log('✓ [PASS] summarizeDocument maneja ausencia de API key con fallback informativo y cita de fuente');
        passed++;
      } else {
        console.error('✗ [FAIL] Comportamiento inesperado en summarizeDocument:', summaryResult);
        failed++;
      }

      const extractResult = await extractEntitiesAndLicenses({
        text: 'Exness (Cy) Ltd opera bajo licencia CySEC 178/12 en Chipre.',
        companyName: 'Exness',
        sourceUrl: 'https://www.cysec.gov.cy'
      });

      if (extractResult.configured === false && extractResult.message.includes('GEMINI_API_KEY')) {
        console.log('✓ [PASS] extractEntitiesAndLicenses instruye configuración clara sin falsos datos');
        passed++;
      } else {
        console.error('✗ [FAIL] Comportamiento inesperado en extractEntitiesAndLicenses:', extractResult);
        failed++;
      }

      const compResult = await compareDocuments({
        oldText: 'Comisión fija USD 1.00',
        newText: 'Comisión fija USD 0.50',
        companyName: 'Interactive Brokers',
        sourceUrl: 'https://www.interactivebrokers.com'
      });

      if (compResult.configured === false && compResult.diffSummary) {
        console.log('✓ [PASS] compareDocuments provee resumen fáctico básico sin simular IA falsa');
        passed++;
      } else {
        console.error('✗ [FAIL] Comportamiento inesperado en compareDocuments:', compResult);
        failed++;
      }
    } else {
      console.log('\n[Modo: Clave GEMINI_API_KEY Configurada - Ejecutando Pruebas en Vivo con API de Google]');
      
      const summaryResult = await summarizeDocument({
        title: 'Disclosures de Regulación',
        text: 'Interactive Brokers LLC is registered with the SEC and a member of FINRA and SIPC.',
        sourceUrl: 'https://www.interactivebrokers.com',
        companyName: 'Interactive Brokers'
      });

      if (summaryResult.success && summaryResult.summary.length > 20) {
        console.log('✓ [PASS] Resumen semántico generado con Gemini exitosamente');
        passed++;
      } else {
        console.warn('! Advertencia en summarizeDocument con Gemini:', summaryResult.error);
        failed++;
      }
    }

  } catch (err) {
    console.error('Error general en prueba de Gemini:', err.message);
    failed++;
  }

  console.log(`\nResultado Suite Gemini: ${passed} pasadas, ${failed} fallidas\n`);
  return { passed, failed };
}

if (process.argv[1].endsWith('test_gemini.js')) {
  runGeminiTests().then(() => closePool()).then(() => process.exit(0));
}

export { runGeminiTests };
