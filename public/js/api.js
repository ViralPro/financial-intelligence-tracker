/**
 * Cliente API REST para Financial Intelligence Tracker
 */

const API_BASE = '/api';

async function fetchJson(endpoint, options = {}) {
  const defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({
    success: false,
    error: `Error al procesar respuesta del servidor (HTTP ${response.status})`
  }));

  if (!response.ok) {
    const errorMsg = data && data.error ? data.error : `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Empresas
  getCompanies: () => fetchJson('/companies'),
  getCompany: (identifier) => fetchJson(`/companies/${encodeURIComponent(identifier)}`),

  // Novedades, Cambios y Pendientes
  getNews: (limit = 20, companyId = null) => {
    let url = `/news?limit=${limit}`;
    if (companyId) url += `&companyId=${companyId}`;
    return fetchJson(url);
  },
  getChanges: (limit = 20, companyId = null) => {
    let url = `/news/changes?limit=${limit}`;
    if (companyId) url += `&companyId=${companyId}`;
    return fetchJson(url);
  },
  getPending: () => fetchJson('/news/pending'),

  // Fuentes y Documentos
  getSources: () => fetchJson('/sources'),
  getSourceDocuments: (sourceId) => fetchJson(`/sources/${sourceId}/documents`),

  // Fuentes Oficiales Argentinas
  getArgentinaData: (companyId = null) => {
    let url = '/argentina';
    if (companyId) url += `?companyId=${companyId}`;
    return fetchJson(url);
  },
  checkArgentinaPortals: () => fetchJson('/argentina/check-portals'),

  // Módulo de Investigación y Auditoría
  triggerResearch: (scope = 'ALL') => fetchJson('/research/run', {
    method: 'POST',
    body: JSON.stringify({ scope, triggeredBy: 'MANUAL_WEB_UI' })
  }),
  getResearchStatus: () => fetchJson('/research/status'),
  getSourceErrors: () => fetchJson('/research/errors'),
  retrySource: (sourceId) => fetchJson('/research/retry-source', {
    method: 'POST',
    body: JSON.stringify({ sourceId })
  }),

  // Planificador
  getSchedulerStatus: () => fetchJson('/research/scheduler'),
  toggleScheduler: (enabled) => fetchJson('/research/scheduler/toggle', {
    method: 'POST',
    body: JSON.stringify({ enabled })
  }),

  // Gemini
  getGeminiStatus: () => fetchJson('/gemini/status'),
  summarizeDoc: (payload) => fetchJson('/gemini/summarize', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
