import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { config } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('--- Inicializando Base de Datos MySQL: Financial Intelligence Tracker ---');
  
  // Conectar inicialmente sin base de datos seleccionada
  const adminConnection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  });

  try {
    console.log(`Conectado al servidor MySQL en ${config.db.host}:${config.db.port}`);
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Base de datos '${config.db.database}' confirmada o creada.`);
  } finally {
    await adminConnection.end();
  }

  // Conectar ahora a la base de datos específica con soporte multipleStatements
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    // 1. Ejecutar schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Leyendo esquema desde: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('✓ Tablas del esquema creadas exitosamente.');

    // 2. Ejecutar seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    console.log(`Leyendo datos iniciales desde: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('✓ Datos iniciales (Seed) insertados exitosamente.');

    // 3. Verificación de conteo de tablas
    const [companies] = await connection.query('SELECT count(*) as count FROM companies;');
    const [entities] = await connection.query('SELECT count(*) as count FROM legal_entities;');
    const [licenses] = await connection.query('SELECT count(*) as count FROM licenses;');
    const [sources] = await connection.query('SELECT count(*) as count FROM sources;');

    console.log(`Resumen de inicialización:
  - Empresas: ${companies[0].count}
  - Entidades Jurídicas: ${entities[0].count}
  - Licencias: ${licenses[0].count}
  - Fuentes Registradas: ${sources[0].count}`);

    console.log('--- Inicialización Completada con Éxito ---');
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();
