import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logAudit } from './auditService.js';

let genAI = null;

function getClient() {
  if (!config.gemini.apiKey || config.gemini.apiKey.trim() === '') {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

export function isGeminiConfigured() {
  return Boolean(config.gemini.apiKey && config.gemini.apiKey.trim().length > 0);
}

export function getGeminiStatus() {
  const configured = isGeminiConfigured();
  return {
    configured,
    model: config.gemini.model,
    statusText: configured ? `Configurado (${config.gemini.model})` : 'Pendiente de configuración (clave GEMINI_API_KEY ausente en .env)'
  };
}

/**
 * Ejecuta una generación de contenido con reintento automático en caso de saturación temporal (503)
 */
async function generateWithModel(prompt) {
  const client = getClient();
  if (!client) return null;

  const primaryModelName = config.gemini.model || 'gemini-3.8-flash';
  const fallbackModels = [primaryModelName, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  const modelQueue = [...new Set(fallbackModels)];

  let lastError = null;

  for (const modelName of modelQueue) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return {
        text: result.response.text(),
        usedModel: modelName
      };
    } catch (err) {
      lastError = err;
      const isTemporaryDemand = err.message.includes('high demand') || err.message.includes('503') || err.message.includes('UNAVAILABLE');
      if (isTemporaryDemand) {
        console.warn(`[Gemini] Modelo ${modelName} saturado temporalmente (503). Probando modelo alternativo...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Resumen de documento oficial referenciando la fuente original
 */
export async function summarizeDocument({ title, text, sourceUrl, companyName }) {
  if (!isGeminiConfigured()) {
    return {
      success: false,
      configured: false,
      summary: `[Modo Heurístico / Clave Gemini no configurada]: Documento "${title}" de ${companyName || 'empresa'}. Fuente original: ${sourceUrl}. Se requiere configurar GEMINI_API_KEY en .env para análisis semántico profundo.`
    };
  }

  try {
    const prompt = `Actúa como un analista de inteligencia regulatoria financiera.
Analiza el siguiente documento oficial correspondiente a la empresa "${companyName || 'Entidad Financiera'}".
Título: ${title}
Fuente original: ${sourceUrl}

Contenido:
"""
${text.slice(0, 15000)}
"""

Instrucciones estrictas:
1. Genera un resumen ejecutivo objetivo y fáctico en 2-4 párrafos.
2. Identifica entidades jurídicas exactas, licencias y jurisdicciones mencionadas.
3. Señala explícitamente tarifas, costos o cambios si los hubiera.
4. Cita la fuente original (${sourceUrl}).
5. Si alguna parte es ambigua o falta evidencia, indícalo expresamente sin inventar datos.`;

    const gen = await generateWithModel(prompt);
    const responseText = gen.text;

    await logAudit('GEMINI_SUMMARIZE_DOC', 'SYSTEM', null, { title, sourceUrl, model: gen.usedModel });
    return {
      success: true,
      configured: true,
      modelUsed: gen.usedModel,
      summary: responseText
    };
  } catch (error) {
    console.error('Error en Gemini summarizeDocument:', error.message);
    await logAudit('GEMINI_ERROR', 'SYSTEM', null, { error: error.message, title }, 'ERROR');
    return {
      success: false,
      configured: true,
      error: error.message,
      summary: `Error al procesar con Gemini: ${error.message}. Fuente disponible en: ${sourceUrl}`
    };
  }
}

/**
 * Extracción estructurada de entidades, licencias, tarifas y condiciones
 */
export async function extractEntitiesAndLicenses({ text, companyName, sourceUrl }) {
  if (!isGeminiConfigured()) {
    return {
      success: false,
      configured: false,
      message: 'GEMINI_API_KEY no configurada. Configure la clave en el archivo .env para habilitar extracción semántica estructurada.'
    };
  }

  try {
    const prompt = `Analiza el siguiente texto oficial sobre la empresa "${companyName}".
Fuente: ${sourceUrl}

Texto:
"""
${text.slice(0, 15000)}
"""

Extrae en formato JSON válido con esta estructura exacta:
{
  "legal_entities": [
    { "name": "Nombre exacto", "type": "Matriz/Filial/etc", "jurisdiction": "País o estado", "registration_number": "N° registro si figura" }
  ],
  "licenses": [
    { "regulator": "Sigla o nombre del regulador", "license_number": "N° licencia", "jurisdiction": "País", "scope": "Alcance autorizado" }
  ],
  "costs_and_taxes": [
    { "category": "Comisiones / Impuestos / Custodia", "description": "Descripción fáctica", "value": "Valor o porcentaje" }
  ],
  "potential_contradictions_or_alerts": [
    "Detalle de contradicciones o advertencias si existen"
  ],
  "verification_notes": "Evaluación de la veracidad y completitud"
}

Responde ÚNICAMENTE con el bloque JSON, sin texto introductorio ni formato Markdown extra.`;

    const gen = await generateWithModel(prompt);
    const rawText = gen.text.trim();
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleanJson);

    await logAudit('GEMINI_EXTRACT_ENTITIES', 'SYSTEM', null, { companyName, sourceUrl, model: gen.usedModel });
    return {
      success: true,
      configured: true,
      modelUsed: gen.usedModel,
      data: parsed
    };
  } catch (error) {
    console.error('Error en Gemini extractEntitiesAndLicenses:', error.message);
    return {
      success: false,
      configured: true,
      error: error.message
    };
  }
}

/**
 * Comparación entre versión anterior y nueva de un documento
 */
export async function compareDocuments({ oldText, newText, companyName, sourceUrl }) {
  if (!isGeminiConfigured()) {
    return {
      success: false,
      configured: false,
      diffSummary: 'Diferencia detectada a nivel de contenido hash. Configure GEMINI_API_KEY para obtener un análisis semántico detallado de los cambios regulatorios.'
    };
  }

  try {
    const prompt = `Compara estas dos versiones del documento de la empresa "${companyName}".
Fuente: ${sourceUrl}

--- VERSIÓN ANTERIOR ---
${oldText.slice(0, 8000)}

--- VERSIÓN NUEVA ---
${newText.slice(0, 8000)}

Instrucciones:
1. Identifica qué cláusulas, tarifas, entidades o requisitos regulatorios han cambiado.
2. Determina si el cambio es sustancial o menor.
3. Señala si hay contradicciones o datos que requieran revisión humana inmediata.
4. Genera un reporte comparativo claro y estructurado con citas de referencia.`;

    const gen = await generateWithModel(prompt);
    const responseText = gen.text;

    await logAudit('GEMINI_COMPARE_DOCS', 'SYSTEM', null, { companyName, sourceUrl, model: gen.usedModel });
    return {
      success: true,
      configured: true,
      modelUsed: gen.usedModel,
      diffSummary: responseText
    };
  } catch (error) {
    console.error('Error en Gemini compareDocuments:', error.message);
    return {
      success: false,
      configured: true,
      error: error.message
    };
  }
}
