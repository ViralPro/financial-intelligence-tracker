import express from 'express';
import { query } from '../../database/db.js';
import { getChangeHistory } from '../services/comparisonEngine.js';

const router = express.Router();

/**
 * GET /api/news
 * Retorna las novedades y hallazgos recientes
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const companyId = req.query.companyId ? parseInt(req.query.companyId, 10) : null;

    let sql = `
      SELECT 
        f.id,
        f.company_id,
        c.name AS company_name,
        c.slug AS company_slug,
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
        s.name AS source_name
      FROM findings f
      JOIN companies c ON f.company_id = c.id
      LEFT JOIN sources s ON f.source_id = s.id
    `;

    const params = [];
    if (companyId) {
      sql += ` WHERE f.company_id = ? `;
      params.push(companyId);
    }

    sql += ` ORDER BY f.detected_at DESC LIMIT ? `;
    params.push(limit);

    const news = await query(sql, params);

    res.json({
      success: true,
      count: news.length,
      data: news
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/changes
 * Retorna cambios detectados con valor anterior y nuevo
 */
router.get('/changes', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const companyId = req.query.companyId ? parseInt(req.query.companyId, 10) : null;
    const history = await getChangeHistory({ companyId, limit });

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pending
 * Retorna todos los datos pendientes de verificar de las tres empresas
 */
router.get('/pending', async (req, res, next) => {
  try {
    const pendingLicenses = await query(`
      SELECT 
        'LICENSE' AS item_type,
        l.id,
        c.name AS company_name,
        c.slug AS company_slug,
        le.legal_name AS legal_entity_name,
        r.short_name AS regulator,
        l.license_number AS identifier,
        l.license_type AS description,
        l.official_record_url AS source_url,
        l.consultation_date,
        l.verification_status
      FROM licenses l
      JOIN companies c ON l.company_id = c.id
      JOIN legal_entities le ON l.legal_entity_id = le.id
      JOIN regulators r ON l.regulator_id = r.id
      WHERE l.verification_status = 'Pendiente de verificación'
      ORDER BY l.id ASC
    `);

    const pendingEntities = await query(`
      SELECT 
        'LEGAL_ENTITY' AS item_type,
        le.id,
        c.name AS company_name,
        c.slug AS company_slug,
        le.legal_name AS identifier,
        le.entity_type AS description,
        le.registered_address,
        le.source_url,
        le.consultation_date,
        le.verification_status
      FROM legal_entities le
      JOIN companies c ON le.company_id = c.id
      WHERE le.verification_status = 'Pendiente de verificación'
      ORDER BY le.id ASC
    `);

    const pendingCosts = await query(`
      SELECT 
        'COST_TAX' AS item_type,
        cte.id,
        c.name AS company_name,
        c.slug AS company_slug,
        cte.title AS identifier,
        cte.current_value AS description,
        cte.source_url,
        cte.consultation_date,
        cte.verification_status
      FROM cost_tax_entries cte
      JOIN companies c ON cte.company_id = c.id
      WHERE cte.verification_status = 'Pendiente de verificación'
      ORDER BY cte.id ASC
    `);

    const totalCount = pendingLicenses.length + pendingEntities.length + pendingCosts.length;

    res.json({
      success: true,
      totalPending: totalCount,
      data: {
        licenses: pendingLicenses,
        entities: pendingEntities,
        costsAndTaxes: pendingCosts
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
