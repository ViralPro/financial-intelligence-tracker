import { query } from '../../database/db.js';

export async function logAudit(action, actor = 'SYSTEM', ip = null, details = null, status = 'SUCCESS') {
  try {
    const detailsJson = details ? JSON.stringify(details) : null;
    await query(
      `INSERT INTO audit_logs (action, actor, ip_address, details, status, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [action, actor, ip, detailsJson, status]
    );
  } catch (error) {
    console.error('Error al guardar log de auditoría:', error.message);
  }
}

export async function getRecentAuditLogs(limit = 50) {
  return await query(
    `SELECT id, action, actor, ip_address, details, status, created_at
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
}
