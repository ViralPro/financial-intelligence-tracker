import express from 'express';
import { query } from '../../database/db.js';

const router = express.Router();

/**
 * GET /api/companies
 * Retorna exactamente las tres empresas monitoreadas con conteo de novedades y estado de verificación
 */
router.get('/', async (req, res, next) => {
  try {
    const companies = await query(`
      SELECT 
        c.id,
        c.slug,
        c.name,
        c.company_type,
        c.description,
        c.founded_year,
        c.global_hq,
        c.website,
        c.verification_status,
        c.last_reviewed_at,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM findings f WHERE f.company_id = c.id) AS findings_count,
        (SELECT COUNT(*) FROM data_versions dv WHERE dv.company_id = c.id) AS changes_count,
        (SELECT COUNT(*) FROM licenses l WHERE l.company_id = c.id AND l.verification_status = 'Pendiente de verificación') +
        (SELECT COUNT(*) FROM legal_entities le WHERE le.company_id = c.id AND le.verification_status = 'Pendiente de verificación') +
        (SELECT COUNT(*) FROM cost_tax_entries cte WHERE cte.company_id = c.id AND cte.verification_status = 'Pendiente de verificación') AS pending_count
      FROM companies c
      ORDER BY c.id ASC
    `);

    res.json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/companies/:identifier
 * Retorna la ficha completa con las 9 pestañas estructuradas
 */
router.get('/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const isId = /^\d+$/.test(identifier);

    // 1. Datos básicos de la empresa
    const companyRows = await query(
      `SELECT * FROM companies WHERE ${isId ? 'id = ?' : 'slug = ?'}`,
      [identifier]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Empresa con identificador '${identifier}' no encontrada`
      });
    }

    const company = companyRows[0];
    const companyId = company.id;

    // 2. Identidad y entidades jurídicas (Pestaña 2)
    const legalEntities = await query(`
      SELECT 
        le.id,
        le.company_id,
        le.legal_name,
        le.entity_type,
        le.registration_number,
        le.registered_address,
        le.incorporation_date,
        le.operational_status,
        le.is_parent,
        le.verification_status,
        le.last_verified_at,
        le.source_url,
        le.consultation_date,
        j.code AS jurisdiction_code,
        j.name AS jurisdiction_name,
        j.regulatory_tier
      FROM legal_entities le
      JOIN jurisdictions j ON le.jurisdiction_id = j.id
      WHERE le.company_id = ?
      ORDER BY le.is_parent DESC, le.id ASC
    `, [companyId]);

    // 3. Regulación y licencias (Pestaña 3)
    const licenses = await query(`
      SELECT 
        l.id,
        l.license_number,
        l.license_type,
        l.scope_description,
        l.authorized_countries,
        l.official_record_url,
        l.verification_status,
        l.granted_date,
        l.expiry_date,
        l.document_date,
        l.publication_date,
        l.consultation_date,
        le.legal_name AS legal_entity_name,
        r.short_name AS regulator_name,
        r.full_name AS regulator_full_name,
        r.official_website AS regulator_website,
        j.name AS jurisdiction_name,
        j.code AS jurisdiction_code
      FROM licenses l
      JOIN legal_entities le ON l.legal_entity_id = le.id
      JOIN regulators r ON l.regulator_id = r.id
      JOIN jurisdictions j ON l.jurisdiction_id = j.id
      WHERE l.company_id = ?
      ORDER BY l.id ASC
    `, [companyId]);

    // 4. Países y jurisdicciones involucradas (Pestaña 4)
    const jurisdictions = await query(`
      SELECT DISTINCT 
        j.id,
        j.code,
        j.name,
        j.region,
        j.regulatory_tier,
        j.notes,
        (SELECT COUNT(*) FROM legal_entities le WHERE le.jurisdiction_id = j.id AND le.company_id = ?) AS entities_count,
        (SELECT COUNT(*) FROM licenses lic WHERE lic.jurisdiction_id = j.id AND lic.company_id = ?) AS licenses_count
      FROM jurisdictions j
      WHERE j.id IN (
        SELECT jurisdiction_id FROM legal_entities WHERE company_id = ?
        UNION
        SELECT jurisdiction_id FROM licenses WHERE company_id = ?
      )
      ORDER BY j.regulatory_tier ASC, j.name ASC
    `, [companyId, companyId, companyId, companyId]);

    // 5. Impuestos y costos (Pestaña 5)
    const costsAndTaxes = await query(`
      SELECT 
        cte.id,
        cte.category,
        cte.title,
        cte.current_value,
        cte.source_url,
        cte.document_date,
        cte.publication_date,
        cte.consultation_date,
        cte.verification_status,
        cte.notes,
        le.legal_name AS legal_entity_name,
        j.name AS jurisdiction_name
      FROM cost_tax_entries cte
      LEFT JOIN legal_entities le ON cte.legal_entity_id = le.id
      LEFT JOIN jurisdictions j ON cte.jurisdiction_id = j.id
      WHERE cte.company_id = ?
      ORDER BY cte.id ASC
    `, [companyId]);

    // 6. Documentos y fuentes oficiales (Pestaña 6)
    const documents = await query(`
      SELECT 
        d.id,
        d.title,
        d.document_type,
        d.url,
        d.document_date,
        d.publication_date,
        d.consultation_date,
        d.summary,
        d.content_hash,
        d.version_number,
        d.verification_status,
        s.name AS source_name,
        s.category AS source_category,
        s.http_status,
        s.last_checked_at
      FROM documents d
      LEFT JOIN sources s ON d.source_id = s.id
      WHERE d.company_id = ?
      ORDER BY d.consultation_date DESC, d.version_number DESC
    `, [companyId]);

    const companySources = await query(`
      SELECT * FROM sources WHERE company_id = ? OR company_id IS NULL ORDER BY is_official DESC, id ASC
    `, [companyId]);

    // 7. Novedades y hallazgos detectados (Pestaña 7)
    const findings = await query(`
      SELECT 
        f.id,
        f.title,
        f.category,
        f.finding_text,
        f.impact_level,
        f.source_url,
        f.document_date,
        f.publication_date,
        f.consultation_date,
        f.verification_status,
        f.detected_at,
        s.name AS source_name,
        le.legal_name AS legal_entity_name
      FROM findings f
      LEFT JOIN sources s ON f.source_id = s.id
      LEFT JOIN legal_entities le ON f.legal_entity_id = le.id
      WHERE f.company_id = ?
      ORDER BY f.detected_at DESC
    `, [companyId]);

    // 8. Historial de cambios y cronología (Pestaña 8)
    const changeHistory = await query(`
      SELECT 
        dv.id,
        dv.field_name,
        dv.previous_value,
        dv.new_value,
        dv.source_url,
        dv.document_date,
        dv.publication_date,
        dv.detection_date,
        dv.verification_status,
        dv.change_rationale,
        le.legal_name AS legal_entity_name,
        j.name AS jurisdiction_name
      FROM data_versions dv
      LEFT JOIN legal_entities le ON dv.legal_entity_id = le.id
      LEFT JOIN jurisdictions j ON dv.jurisdiction_id = j.id
      WHERE dv.company_id = ?
      ORDER BY dv.detection_date DESC
    `, [companyId]);

    const timelineEvents = await query(`
      SELECT * FROM events WHERE company_id = ? ORDER BY event_date DESC
    `, [companyId]);

    // 9. Datos pendientes de verificar (Pestaña 9)
    const pendingEntities = legalEntities.filter(e => e.verification_status === 'Pendiente de verificación');
    const pendingLicenses = licenses.filter(l => l.verification_status === 'Pendiente de verificación');
    const pendingCosts = costsAndTaxes.filter(c => c.verification_status === 'Pendiente de verificación');
    const pendingDocs = documents.filter(d => d.verification_status === 'Pendiente de verificación');
    const pendingFindings = findings.filter(f => f.verification_status === 'Pendiente de verificación');

    res.json({
      success: true,
      data: {
        company,
        tabs: {
          resumen: {
            company,
            stats: {
              legalEntitiesCount: legalEntities.length,
              licensesCount: licenses.length,
              jurisdictionsCount: jurisdictions.length,
              documentsCount: documents.length,
              findingsCount: findings.length,
              changesCount: changeHistory.length,
              pendingVerificationCount: pendingEntities.length + pendingLicenses.length + pendingCosts.length + pendingDocs.length
            }
          },
          identidad: legalEntities,
          regulacion: licenses,
          jurisdicciones: jurisdictions,
          impuestos_costos: costsAndTaxes,
          documentos_fuentes: {
            documents,
            sources: companySources
          },
          novedades: findings,
          historial_cambios: {
            dataVersions: changeHistory,
            timelineEvents
          },
          pendientes: {
            entities: pendingEntities,
            licenses: pendingLicenses,
            costsAndTaxes: pendingCosts,
            documents: pendingDocs,
            findings: pendingFindings
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
