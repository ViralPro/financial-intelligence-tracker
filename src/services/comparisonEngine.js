import { query } from '../../database/db.js';
import { logAudit } from './auditService.js';

/**
 * Registra un cambio histórico preservando la versión anterior y nueva
 */
export async function recordDataChange({
  companyId,
  legalEntityId = null,
  jurisdictionId = null,
  sourceId = null,
  fieldName,
  previousValue,
  newValue,
  sourceUrl,
  documentDate = null,
  publicationDate = null,
  verificationStatus = 'Pendiente de verificación',
  changeRationale = null,
  actor = 'SYSTEM'
}) {
  // Evitar duplicados si el valor previo y el nuevo son idénticos
  if (previousValue === newValue) {
    return { recorded: false, reason: 'VALORES_IDENTICOS' };
  }

  // 1. Insertar en data_versions (Historial inmutable)
  const result = await query(
    `INSERT INTO data_versions 
     (company_id, legal_entity_id, jurisdiction_id, source_id, field_name, 
      previous_value, new_value, source_url, document_date, publication_date, 
      detection_date, verification_status, change_rationale)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
    [
      companyId,
      legalEntityId,
      jurisdictionId,
      sourceId,
      fieldName,
      previousValue !== undefined ? String(previousValue) : null,
      String(newValue),
      sourceUrl,
      documentDate,
      publicationDate,
      verificationStatus,
      changeRationale
    ]
  );

  const versionId = result.insertId;

  // 2. Registrar evento en la cronología de la empresa
  await query(
    `INSERT INTO events (company_id, event_type, summary, detail, source_url, event_date)
     VALUES (?, 'DATA_VERSION_CHANGED', ?, ?, ?, NOW())`,
    [
      companyId,
      `Modificación detectada en ${fieldName}`,
      `Valor anterior: ${previousValue || '(vacío)'} -> Nuevo valor: ${newValue}`,
      sourceUrl
    ]
  );

  // 3. Crear hallazgo si representa un cambio sustancial
  await query(
    `INSERT INTO findings 
     (company_id, source_id, legal_entity_id, jurisdiction_id, title, category, 
      finding_text, impact_level, source_url, document_date, publication_date, 
      verification_status, detected_at)
     VALUES (?, ?, ?, ?, ?, 'Cambio de Datos', ?, 'REVISION_REQUERIDA', ?, ?, ?, ?, NOW())`,
    [
      companyId,
      sourceId,
      legalEntityId,
      jurisdictionId,
      `Actualización detectada en campo: ${fieldName}`,
      `Se registró una variación entre la versión previa y la nueva en la fuente ${sourceUrl || 'oficial'}. Razón: ${changeRationale || 'Actualización periódica de datos'}.`,
      sourceUrl,
      documentDate,
      publicationDate,
      verificationStatus
    ]
  );

  // 4. Registro de auditoría
  await logAudit(
    'DATA_VERSION_RECORDED',
    actor,
    null,
    { companyId, fieldName, versionId, sourceUrl }
  );

  return { recorded: true, versionId };
}

/**
 * Obtener historial de cambios por empresa o general
 */
export async function getChangeHistory({ companyId = null, limit = 50 }) {
  let sql = `
    SELECT 
      dv.id,
      dv.company_id,
      c.name AS company_name,
      le.legal_name AS legal_entity_name,
      j.name AS jurisdiction_name,
      s.name AS source_name,
      dv.field_name,
      dv.previous_value,
      dv.new_value,
      dv.source_url,
      dv.document_date,
      dv.publication_date,
      dv.detection_date,
      dv.verification_status,
      dv.change_rationale
    FROM data_versions dv
    JOIN companies c ON dv.company_id = c.id
    LEFT JOIN legal_entities le ON dv.legal_entity_id = le.id
    LEFT JOIN jurisdictions j ON dv.jurisdiction_id = j.id
    LEFT JOIN sources s ON dv.source_id = s.id
  `;

  const params = [];
  if (companyId) {
    sql += ` WHERE dv.company_id = ? `;
    params.push(companyId);
  }

  sql += ` ORDER BY dv.detection_date DESC LIMIT ? `;
  params.push(limit);

  return await query(sql, params);
}
