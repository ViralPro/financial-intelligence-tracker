import express from 'express';
import { getGeminiStatus, summarizeDocument, extractEntitiesAndLicenses, compareDocuments } from '../services/geminiService.js';

const router = express.Router();

/**
 * GET /api/gemini/status
 * Retorna si Gemini está configurado y el modelo seleccionado
 */
router.get('/status', (req, res) => {
  const status = getGeminiStatus();
  res.json({
    success: true,
    data: status
  });
});

/**
 * POST /api/gemini/summarize
 * Genera un resumen oficial de documento con citas a la fuente
 */
router.post('/summarize', async (req, res, next) => {
  try {
    const { title, text, sourceUrl, companyName } = req.body;
    if (!text || !sourceUrl) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "text" y "sourceUrl" son obligatorios'
      });
    }

    const result = await summarizeDocument({
      title: title || 'Documento Regulatorio',
      text,
      sourceUrl,
      companyName
    });

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/gemini/extract
 * Extrae entidades, licencias y costos en formato estructurado
 */
router.post('/extract', async (req, res, next) => {
  try {
    const { text, companyName, sourceUrl } = req.body;
    if (!text || !sourceUrl) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "text" y "sourceUrl" son obligatorios'
      });
    }

    const result = await extractEntitiesAndLicenses({
      text,
      companyName: companyName || 'Entidad Financiera',
      sourceUrl
    });

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/gemini/compare
 * Compara dos versiones de un documento regulatorio
 */
router.post('/compare', async (req, res, next) => {
  try {
    const { oldText, newText, companyName, sourceUrl } = req.body;
    if (!oldText || !newText) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "oldText" y "newText" son obligatorios'
      });
    }

    const result = await compareDocuments({
      oldText,
      newText,
      companyName: companyName || 'Entidad Financiera',
      sourceUrl: sourceUrl || 'Fuente Oficial'
    });

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
