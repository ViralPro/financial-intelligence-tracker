import express from 'express';
import { query } from '../../database/db.js';

const router = express.Router();

/**
 * GET /api/sources
 * Retorna las fuentes registradas y su estado de disponibilidad
 */
router.get('/', async (req, res, next) => {
  try {
    const sources = await query(`
      SELECT 
        s.id,
        s.company_id,
        c.name AS company_name,
        c.slug AS company_slug,
        s.name,
        s.category,
        s.url,
        s.is_official,
        s.http_status,
        s.last_checked_at,
        s.last_success_at,
        s.consecutive_failures,
        s.last_error,
        s.verification_status,
        s.manual_check_required,
        s.access_method,
        (SELECT COUNT(*) FROM documents d WHERE d.source_id = s.id) AS documents_count
      FROM sources s
      LEFT JOIN companies c ON s.company_id = c.id
      ORDER BY s.is_official DESC, s.last_checked_at DESC, s.id ASC
    `);

    res.json({
      success: true,
      count: sources.length,
      data: sources
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sources/:id/documents
 * Retorna documentos asociados a una fuente
 */
router.get('/:id/documents', async (req, res, next) => {
  try {
    const sourceId = parseInt(req.params.id, 10);
    const docs = await query(`
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
        d.verification_status
      FROM documents d
      WHERE d.source_id = ?
      ORDER BY d.version_number DESC
    `, [sourceId]);

    res.json({
      success: true,
      count: docs.length,
      data: docs
    });
  } catch (error) {
    next(error);
  }
});

export default router;
