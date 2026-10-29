import express from 'express';
import { checkArgentinePortals, getArgentineRegulatoryEntries } from '../services/argentinaService.js';

const router = express.Router();

/**
 * GET /api/argentina
 * Retorna el apartado de fuentes oficiales argentinas y sus disposiciones normativas
 */
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId, 10) : null;
    const entries = await getArgentineRegulatoryEntries(companyId);

    res.json({
      success: true,
      data: {
        sourcesInfo: [
          {
            code: 'CNV',
            name: 'Comisión Nacional de Valores',
            url: 'https://www.argentina.gob.ar/cnv',
            registryUrl: 'https://www.argentina.gob.ar/cnv/registro-publico-alyc',
            role: 'Regulación del mercado de capitales argentino. Supervisa que sólo entidades registradas (ALYC/AN) puedan intermediar localmente.',
            status: 'Verificación activa; consulta al Padrón de ALYC requiere búsqueda interactiva manual.'
          },
          {
            code: 'ARCA',
            name: 'Agencia de Recaudación y Control Aduanero (ex-AFIP)',
            url: 'https://www.arca.gob.ar',
            registryUrl: 'https://www.arca.gob.ar',
            role: 'Control tributario nacional. Aplica Bienes Personales sobre activos en el exterior e Impuesto a las Ganancias sobre rentas foráneas.',
            status: 'Portal oficial en línea; determinaciones tributarias individuales requieren autenticación con CUIT y Clave Fiscal.'
          },
          {
            code: 'BCRA',
            name: 'Banco Central de la República Argentina',
            url: 'https://www.bcra.gob.ar',
            registryUrl: 'https://www.bcra.gob.ar/Normativa/comunicaciones.asp',
            role: 'Regulación cambiaria. Dicta normas sobre giro de divisas al exterior y operaciones de contado con liquidación (CCL).',
            status: 'Boletín de Comunicaciones "A" accesible públicamente.'
          }
        ],
        entries
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/argentina/check-portals
 * Comprueba en tiempo real la conectividad de los portales argentinos
 */
router.get('/check-portals', async (req, res, next) => {
  try {
    const portalStatus = await checkArgentinePortals();
    res.json({
      success: true,
      data: portalStatus
    });
  } catch (error) {
    next(error);
  }
});

export default router;
