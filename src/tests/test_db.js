import { query, testConnection, closePool } from '../../database/db.js';

async function runDbTests() {
  console.log('========================================');
  console.log(' TEST SUITE: Base de Datos MySQL');
  console.log('========================================');

  let passed = 0;
  let failed = 0;

  // Test 1: Conexión
  try {
    const conn = await testConnection();
    if (conn.success) {
      console.log('✓ [PASS] Conexión a MySQL exitosa');
      passed++;
    } else {
      console.error('✗ [FAIL] Error de conexión:', conn.error);
      failed++;
    }
  } catch (e) {
    console.error('✗ [FAIL] Excepción en conexión:', e.message);
    failed++;
  }

  // Test 2: Verificación de tablas obligatorias
  const requiredTables = [
    'companies',
    'legal_entities',
    'regulators',
    'jurisdictions',
    'licenses',
    'sources',
    'documents',
    'research_runs',
    'findings',
    'events',
    'data_versions',
    'verification_records',
    'audit_logs',
    'cost_tax_entries',
    'argentina_regulatory_entries'
  ];

  try {
    const tables = await query(`SHOW TABLES;`);
    const tableNames = tables.map(t => Object.values(t)[0]);

    for (const reqTable of requiredTables) {
      if (tableNames.includes(reqTable)) {
        console.log(`✓ [PASS] Tabla '${reqTable}' verificada`);
        passed++;
      } else {
        console.error(`✗ [FAIL] Tabla requerida '${reqTable}' no encontrada`);
        failed++;
      }
    }
  } catch (e) {
    console.error('✗ [FAIL] Error al listar tablas:', e.message);
    failed++;
  }

  // Test 3: Exactamente tres empresas registradas
  try {
    const companies = await query(`SELECT slug, name, company_type FROM companies ORDER BY id ASC;`);
    if (companies.length === 3) {
      console.log(`✓ [PASS] Exactamente 3 empresas registradas en DB`);
      passed++;

      const slugs = companies.map(c => c.slug);
      if (slugs.includes('interactive-brokers') && slugs.includes('exness') && slugs.includes('tradingview')) {
        console.log(`✓ [PASS] Slugs coinciden: ${slugs.join(', ')}`);
        passed++;
      } else {
        console.error(`✗ [FAIL] Slugs inesperados: ${slugs.join(', ')}`);
        failed++;
      }
    } else {
      console.error(`✗ [FAIL] Se esperaban 3 empresas, se encontraron: ${companies.length}`);
      failed++;
    }
  } catch (e) {
    console.error('✗ [FAIL] Error al consultar empresas:', e.message);
    failed++;
  }

  // Test 4: Entidades jurídicas y distinción matriz/filial
  try {
    const parents = await query(`SELECT legal_name, company_id FROM legal_entities WHERE is_parent = 1;`);
    if (parents.length >= 2) {
      console.log(`✓ [PASS] Matrices holding identificadas correctamente (${parents.length} matrices)`);
      passed++;
    } else {
      console.error(`✗ [FAIL] No se encontraron suficientes matrices holding`);
      failed++;
    }
  } catch (e) {
    console.error('✗ [FAIL] Error al consultar matrices:', e.message);
    failed++;
  }

  // Test 5: Fuentes oficiales argentinas presentes
  try {
    const argEntries = await query(`SELECT authority, count(*) as count FROM argentina_regulatory_entries GROUP BY authority;`);
    const authorities = argEntries.map(a => a.authority);
    if (authorities.includes('CNV') && authorities.includes('ARCA') && authorities.includes('BCRA')) {
      console.log(`✓ [PASS] Fuentes oficiales argentinas presentes (CNV, ARCA, BCRA)`);
      passed++;
    } else {
      console.error(`✗ [FAIL] Faltan autoridades argentinas en registros: ${authorities.join(', ')}`);
      failed++;
    }
  } catch (e) {
    console.error('✗ [FAIL] Error al verificar entradas argentinas:', e.message);
    failed++;
  }

  console.log(`\nResultado Suite DB: ${passed} pasadas, ${failed} fallidas\n`);
  return { passed, failed };
}

if (process.argv[1].endsWith('test_db.js')) {
  runDbTests().then(() => closePool()).then(() => process.exit(0));
}

export { runDbTests };
