import { query } from '../../database/db.js';
import { logAudit } from './auditService.js';

const ARGENTINE_PORTALS = [
  {
    authority: 'CNV',
    name: 'Comisión Nacional de Valores',
    url: 'https://www.argentina.gob.ar/cnv',
    registryUrl: 'https://www.argentina.gob.ar/cnv/registro-publico-alyc',
    category: 'Regulación Financiera',
    accessType: 'PORTAL_PUBLICO_Y_BUSCADOR_MANUAL',
    manualRequired: true,
    requiresAuth: false,
    description: 'Organismo oficial regulador del mercado de capitales en Argentina. Supervisa Agentes de Liquidación y Compensación (ALYC) y ofertas públicas.',
    notes: 'No posee API REST pública abierta sin token para consulta directa de firmas extranjeras. La verificación del padrón de ALYC matriculadas requiere consulta interactiva en su portal web oficial.'
  },
  {
    authority: 'ARCA',
    name: 'Agencia de Recaudación y Control Aduanero (ex-AFIP)',
    url: 'https://www.arca.gob.ar',
    registryUrl: 'https://www.arca.gob.ar',
    category: 'Impuestos y Obligaciones Fiscales Personales',
    accessType: 'PORTAL_TRIBUTARIO_Y_CLAVE_FISCAL',
    manualRequired: true,
    requiresAuth: true,
    description: 'Ente autárquico de control fiscal y aduanero de la República Argentina. Administra el Impuesto sobre los Bienes Personales y el Impuesto a las Ganancias sobre tenencias en el exterior.',
    notes: 'Las declaraciones juradas impositivas requieren autenticación individual con CUIT y Clave Fiscal. La normativa general y tablas de alícuotas son públicas pero de interpretación casuística por contador matriculado.'
  },
  {
    authority: 'BCRA',
    name: 'Banco Central de la República Argentina',
    url: 'https://www.bcra.gob.ar',
    registryUrl: 'https://www.bcra.gob.ar/Normativa/comunicaciones.asp',
    category: 'Régimen Cambiario y Transferencias de Divisas',
    accessType: 'PORTAL_NORMATIVO_COMUNICACIONES',
    manualRequired: false,
    requiresAuth: false,
    description: 'Autoridad monetaria y cambiaria. Emite las Comunicaciones "A" que regulan el acceso al mercado de cambios (MULC), transferencias hacia el exterior y operaciones con títulos valores (CCL/MEP).',
    notes: 'Publica diariamente las Comunicaciones normativas. Las operaciones de giro a brokers externos se rigen por las disposiciones sobre transferencias de títulos valores y cuentas propias en el exterior.'
  }
];

/**
 * Realiza una comprobación de conectividad real a los tres portales oficiales
 */
export async function checkArgentinePortals() {
  const results = [];

  for (const portal of ARGENTINE_PORTALS) {
    let reachable = false;
    let status = null;
    let latencyMs = 0;
    let error = null;

    const start = Date.now();
    try {
      const res = await fetch(portal.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FinancialIntelligenceTracker/1.0'
        }
      });
      latencyMs = Date.now() - start;
      status = res.status;
      reachable = res.ok || (status >= 200 && status < 400);
    } catch (err) {
      latencyMs = Date.now() - start;
      error = err.message;
    }

    results.push({
      ...portal,
      checkedAt: new Date(),
      status,
      reachable,
      latencyMs,
      error
    });
  }

  await logAudit('ARGENTINA_PORTALS_CHECKED', 'SYSTEM', null, { checkedCount: results.length });
  return results;
}

/**
 * Obtiene todas las entradas normativas argentinas registradas en la base de datos
 */
export async function getArgentineRegulatoryEntries(companyId = null) {
  let sql = `
    SELECT 
      are.id,
      are.authority,
      are.company_id,
      c.name AS company_name,
      are.category,
      are.norm_reference,
      are.summary,
      are.official_url,
      are.requires_manual_check,
      are.status_note,
      are.verification_status,
      are.last_checked_at
    FROM argentina_regulatory_entries are
    LEFT JOIN companies c ON are.company_id = c.id
  `;

  const params = [];
  if (companyId) {
    sql += ` WHERE are.company_id = ? OR are.company_id IS NULL `;
    params.push(companyId);
  }

  sql += ` ORDER BY are.authority ASC, are.id ASC `;
  return await query(sql, params);
}
