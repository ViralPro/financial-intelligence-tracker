import mysql from 'mysql2/promise';
import { config } from '../src/config.js';

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(config.db);
  }
  return pool;
}

export async function query(sql, params = []) {
  const p = getPool();
  const [rows, fields] = await p.execute(sql, params);
  return rows;
}

export async function queryRaw(sql) {
  const p = getPool();
  const [rows] = await p.query(sql);
  return rows;
}

export async function getConnection() {
  const p = getPool();
  return await p.getConnection();
}

export async function testConnection() {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT 1 as connected');
    return { success: true, result: rows[0].connected === 1 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
