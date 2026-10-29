import app, { startServer } from '../server.js';
import { closePool } from '../../database/db.js';
import { stopScheduler } from '../services/schedulerService.js';

async function runApiTests() {
  console.log('========================================');
  console.log(' TEST SUITE: API REST y Endpoints');
  console.log('========================================');

  let passed = 0;
  let failed = 0;

  await startServer();
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

  async function checkEndpoint(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, options);
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  try {
    // 1. Health check
    const health = await checkEndpoint('/api/health');
    if (health.ok && health.data.status === 'HEALTHY') {
      console.log('✓ [PASS] GET /api/health responde HEALTHY');
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/health falló:', health);
      failed++;
    }

    // 2. GET /api/companies (Debe retornar exactamente 3 empresas)
    const comp = await checkEndpoint('/api/companies');
    if (comp.ok && comp.data.count === 3 && comp.data.data.length === 3) {
      console.log('✓ [PASS] GET /api/companies retorna exactamente 3 empresas con conteos');
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/companies no devolvió 3 empresas:', comp);
      failed++;
    }

    // 3. GET /api/companies/:identifier (Fichas completas con 9 pestañas)
    const testSlugs = ['interactive-brokers', 'exness', 'tradingview'];
    for (const slug of testSlugs) {
      const profile = await checkEndpoint(`/api/companies/${slug}`);
      if (profile.ok && profile.data.data && profile.data.data.tabs) {
        const tabs = profile.data.data.tabs;
        const requiredTabKeys = [
          'resumen',
          'identidad',
          'regulacion',
          'jurisdicciones',
          'impuestos_costos',
          'documentos_fuentes',
          'novedades',
          'historial_cambios',
          'pendientes'
        ];

        let hasAllTabs = true;
        for (const t of requiredTabKeys) {
          if (!tabs[t]) {
            hasAllTabs = false;
            console.error(`Pestaña faltante ${t} en ${slug}`);
          }
        }

        if (hasAllTabs) {
          console.log(`✓ [PASS] GET /api/companies/${slug} contiene las 9 pestañas obligatorias`);
          passed++;
        } else {
          console.error(`✗ [FAIL] Faltan pestañas en ficha de ${slug}`);
          failed++;
        }
      } else {
        console.error(`✗ [FAIL] Error al cargar ficha de ${slug}:`, profile);
        failed++;
      }
    }

    // 4. GET /api/news
    const news = await checkEndpoint('/api/news');
    if (news.ok && Array.isArray(news.data.data)) {
      console.log('✓ [PASS] GET /api/news responde array válido de novedades');
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/news error:', news);
      failed++;
    }

    // 5. GET /api/news/changes
    const changes = await checkEndpoint('/api/news/changes');
    if (changes.ok && Array.isArray(changes.data.data)) {
      console.log('✓ [PASS] GET /api/news/changes responde historial de versiones');
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/news/changes error:', changes);
      failed++;
    }

    // 6. GET /api/news/pending
    const pending = await checkEndpoint('/api/news/pending');
    if (pending.ok && pending.data.data && typeof pending.data.totalPending === 'number') {
      console.log(`✓ [PASS] GET /api/news/pending responde con ${pending.data.totalPending} datos pendientes`);
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/news/pending error:', pending);
      failed++;
    }

    // 7. GET /api/sources
    const sources = await checkEndpoint('/api/sources');
    if (sources.ok && sources.data.count > 0) {
      console.log(`✓ [PASS] GET /api/sources retorna ${sources.data.count} fuentes registradas`);
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/sources error:', sources);
      failed++;
    }

    // 8. GET /api/argentina
    const arg = await checkEndpoint('/api/argentina');
    if (arg.ok && arg.data.data && arg.data.data.sourcesInfo && arg.data.data.entries) {
      console.log(`✓ [PASS] GET /api/argentina retorna apartado de CNV, ARCA y BCRA con ${arg.data.data.entries.length} normativas`);
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/argentina error:', arg);
      failed++;
    }

    // 9. GET /api/gemini/status
    const gemini = await checkEndpoint('/api/gemini/status');
    if (gemini.ok && typeof gemini.data.data.configured === 'boolean') {
      console.log(`✓ [PASS] GET /api/gemini/status reporta estado seguro (Configurado: ${gemini.data.data.configured})`);
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/gemini/status error:', gemini);
      failed++;
    }

    // 10. GET /api/research/status
    const rStatus = await checkEndpoint('/api/research/status');
    if (rStatus.ok && typeof rStatus.data.data.isRunning === 'boolean') {
      console.log('✓ [PASS] GET /api/research/status responde estado de ejecución');
      passed++;
    } else {
      console.error('✗ [FAIL] GET /api/research/status error:', rStatus);
      failed++;
    }

    // 11. Validación de 404 en endpoint inexistente
    const notFound = await checkEndpoint('/api/ruta-inexistente-xyz');
    if (notFound.status === 404 && notFound.data.success === false) {
      console.log('✓ [PASS] Endpoint inexistente responde 404 estructurado');
      passed++;
    } else {
      console.error('✗ [FAIL] 404 no manejado adecuadamente:', notFound);
      failed++;
    }

  } catch (err) {
    console.error('Error general en prueba de API:', err.message);
    failed++;
  }

  console.log(`\nResultado Suite API: ${passed} pasadas, ${failed} fallidas\n`);
  return { passed, failed };
}

if (process.argv[1].endsWith('test_api.js')) {
  runApiTests()
    .then(() => stopScheduler())
    .then(() => closePool())
    .then(() => process.exit(0));
}

export { runApiTests };
