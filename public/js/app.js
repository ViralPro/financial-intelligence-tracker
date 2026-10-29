import { api } from './api.js';
import { renderCompanyCards } from './components/companyCards.js';
import { renderCompanyProfile } from './components/companyProfile.js';
import { renderRecentNewsAndChanges } from './components/newsFeed.js';
import { renderPendingList } from './components/pendingList.js';
import { renderArgentinaSection } from './components/argentinaSection.js';
import { setupResearchModal, populateSourceErrors } from './components/researchModal.js';
import { escapeHtml } from './utils.js';

// Estado de la aplicación en memoria de la UI
const state = {
  currentView: 'home', // 'home' | 'profile'
  currentCompanySlug: null,
  companies: [],
  news: [],
  changes: [],
  pending: null,
  argentinaData: null,
  geminiStatus: null,
  researchStatus: null,
  sourceErrors: []
};

// Elementos del DOM
const elements = {
  homeView: document.getElementById('home-view'),
  profileView: document.getElementById('profile-view'),
  companiesGrid: document.getElementById('companies-grid'),
  newsAndChangesContainer: document.getElementById('news-and-changes-container'),
  pendingContainer: document.getElementById('pending-container'),
  argentinaContainer: document.getElementById('argentina-container'),
  
  geminiIndicator: document.getElementById('gemini-indicator'),
  btnOpenResearchModal: document.getElementById('btn-open-research-modal'),
  btnRefreshData: document.getElementById('btn-refresh-data'),
  logoHome: document.getElementById('logo-home'),
  
  researchModal: document.getElementById('research-modal'),
  aiModal: document.getElementById('ai-modal'),
  aiModalTitle: document.getElementById('ai-modal-title'),
  aiModalBody: document.getElementById('ai-modal-body'),
  aiModalClose: document.getElementById('ai-modal-close'),
  aiModalFooterClose: document.getElementById('ai-modal-footer-close')
};

/**
 * Inicialización de la aplicación
 */
async function initApp() {
  console.log('[App] Inicializando Financial Intelligence Tracker...');
  setupEventListeners();
  setupModals();
  await loadInitialData();
}

/**
 * Muestra u oculta banner de error de base de datos
 */
function showDbErrorBanner(message) {
  let banner = document.getElementById('db-connection-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'db-connection-banner';
    banner.className = 'alert-banner error';
    banner.style.margin = '16px auto';
    banner.style.maxWidth = '1200px';
    const main = document.querySelector('.main-layout');
    if (main) main.insertBefore(banner, main.firstChild);
  }
  banner.innerHTML = `
    <div>
      <strong>Error de Conexión a la Base de Datos:</strong> ${escapeHtml(message)}<br>
      <span style="font-size: 12px;">Para solucionarlo: abre el panel de XAMPP y presiona <strong>Start</strong> en MySQL, o ejecuta <code>npm run mysql:start</code> en tu terminal, y luego haz clic en <strong>Actualizar</strong>.</span>
    </div>
  `;
  banner.style.display = 'block';
}

function hideDbErrorBanner() {
  const banner = document.getElementById('db-connection-banner');
  if (banner) banner.style.display = 'none';
}

/**
 * Carga de datos iniciales
 */
async function loadInitialData() {
  try {
    // 1. Cargar estado de Gemini
    try {
      const geminiRes = await api.getGeminiStatus();
      if (geminiRes.success) {
        state.geminiStatus = geminiRes.data;
        updateGeminiIndicator();
      }
    } catch (e) {
      console.warn('No se pudo verificar estado de Gemini:', e.message);
    }

    // 2. Cargar las 3 empresas
    try {
      const compRes = await api.getCompanies();
      if (compRes.success) {
        hideDbErrorBanner();
        state.companies = compRes.data;
        renderCompanyCards(state.companies, elements.companiesGrid, navigateToProfile);
      }
    } catch (err) {
      if (err.message && err.message.includes('MySQL')) {
        showDbErrorBanner(err.message);
      } else {
        showDbErrorBanner('No se pudo conectar al servicio de base de datos local en 127.0.0.1:3306.');
      }
      return;
    }

    // 3. Cargar novedades y cambios
    const [newsRes, changesRes] = await Promise.all([
      api.getNews(10).catch(() => ({ success: false, data: [] })),
      api.getChanges(10).catch(() => ({ success: false, data: [] }))
    ]);
    if (newsRes.success) state.news = newsRes.data;
    if (changesRes.success) state.changes = changesRes.data;
    renderRecentNewsAndChanges(state.news, state.changes, elements.newsAndChangesContainer);

    // 4. Cargar datos pendientes
    try {
      const pendingRes = await api.getPending();
      if (pendingRes.success) {
        state.pending = pendingRes;
        renderPendingList(state.pending, elements.pendingContainer);
      }
    } catch (e) {
      console.warn('Error al cargar pendientes:', e.message);
    }

    // 5. Cargar apartado argentino
    try {
      const argRes = await api.getArgentinaData();
      if (argRes.success) {
        state.argentinaData = argRes.data;
        renderArgentinaSection(state.argentinaData, elements.argentinaContainer, handleCheckArgentinaPortals);
      }
    } catch (e) {
      console.warn('Error al cargar datos de Argentina:', e.message);
    }

    // 6. Cargar errores de fuentes para el modal de investigación
    try {
      const errRes = await api.getSourceErrors();
      if (errRes.success) {
        state.sourceErrors = errRes.data;
        populateSourceErrors(state.sourceErrors, document.getElementById('modal-sources-errors'));
      }
    } catch (e) {
      console.warn('Error al cargar errores de fuentes:', e.message);
    }

  } catch (error) {
    console.error('Error al cargar datos de la aplicación:', error);
  }
}

/**
 * Actualiza la pastilla informativa de Gemini en la barra superior
 */
function updateGeminiIndicator() {
  if (!elements.geminiIndicator) return;
  if (state.geminiStatus && state.geminiStatus.configured) {
    elements.geminiIndicator.textContent = `IA: Gemini Activo (${state.geminiStatus.model})`;
    elements.geminiIndicator.className = 'gemini-indicator active';
    elements.geminiIndicator.title = 'Integración con Gemini lista para resúmenes y extracción regulatoria.';
  } else {
    elements.geminiIndicator.textContent = 'IA: Gemini (API Key pendiente en .env)';
    elements.geminiIndicator.className = 'gemini-indicator';
    elements.geminiIndicator.title = 'Configure GEMINI_API_KEY en el archivo .env para habilitar análisis semántico con IA.';
  }
}

/**
 * Navegación hacia la Ficha Completa de una empresa
 */
async function navigateToProfile(companySlug) {
  state.currentView = 'profile';
  state.currentCompanySlug = companySlug;

  elements.homeView.style.display = 'none';
  elements.profileView.style.display = 'block';
  elements.profileView.innerHTML = `
    <div style="padding: 40px; text-align: center; color: var(--text-muted);">
      Cargando ficha completa de ${escapeHtml(companySlug)}...
    </div>
  `;

  try {
    const profileRes = await api.getCompany(companySlug);
    if (profileRes.success && profileRes.data) {
      renderCompanyProfile(profileRes.data, elements.profileView, navigateToHome, handleOpenAIModal);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      elements.profileView.innerHTML = `
        <div class="alert-banner error">
          Error al cargar la empresa solicitada.
          <button class="btn btn-sm" onclick="window.location.reload()">Recargar</button>
        </div>
      `;
    }
  } catch (err) {
    elements.profileView.innerHTML = `
      <div class="alert-banner error">
        Error de conexión: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

/**
 * Navegación hacia la Vista Principal (las 3 empresas)
 */
function navigateToHome() {
  state.currentView = 'home';
  state.currentCompanySlug = null;
  elements.profileView.style.display = 'none';
  elements.homeView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Comprobación en vivo de los portales de Argentina
 */
async function handleCheckArgentinaPortals() {
  const res = await api.checkArgentinaPortals();
  if (res.success) {
    return res.data;
  }
  throw new Error(res.error || 'Fallo en la consulta');
}

/**
 * Apertura del modal de análisis IA con Gemini
 */
function handleOpenAIModal({ title, url, company, summary }) {
  if (!elements.aiModal) return;

  elements.aiModalTitle.textContent = `Análisis de Documento: ${title}`;
  elements.aiModalBody.innerHTML = `
    <div style="margin-bottom: 14px;">
      <strong>Empresa:</strong> ${escapeHtml(company)}<br>
      <strong>Fuente oficial:</strong> <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)} &nearr;</a>
    </div>

    <div style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; background: var(--bg-secondary); margin-bottom: 16px;">
      <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Resumen Fáctico del Documento:</h4>
      <div style="font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(summary || 'No hay un resumen previo generado para este documento.')}</div>
    </div>

    <div style="text-align: right;">
      <button class="btn btn-primary btn-sm" id="btn-request-gemini-deep" ${state.geminiStatus && state.geminiStatus.configured ? '' : 'disabled'}>
        ${state.geminiStatus && state.geminiStatus.configured ? 'Profundizar Análisis con Gemini' : 'Gemini no configurado en .env'}
      </button>
    </div>
    <div id="ai-deep-result" style="margin-top: 14px;"></div>
  `;

  elements.aiModal.classList.add('active');

  const btnDeep = elements.aiModalBody.querySelector('#btn-request-gemini-deep');
  if (btnDeep) {
    btnDeep.addEventListener('click', async () => {
      btnDeep.disabled = true;
      btnDeep.textContent = 'Consultando a Gemini...';
      const resultDiv = elements.aiModalBody.querySelector('#ai-deep-result');
      resultDiv.innerHTML = '<p style="font-size: 13px; color: var(--text-muted);">Generando extracción estructurada y análisis de contradicciones...</p>';

      try {
        const res = await api.summarizeDoc({
          title,
          text: summary || title,
          sourceUrl: url,
          companyName: company
        });

        if (res.success && res.data) {
          resultDiv.innerHTML = `
            <div class="alert-banner info" style="white-space: pre-wrap; font-size: 13px; line-height: 1.6;">
              ${escapeHtml(res.data.summary)}
            </div>
          `;
        } else {
          resultDiv.innerHTML = `<div class="alert-banner warning">${escapeHtml(res.data ? res.data.summary : 'Error en consulta Gemini')}</div>`;
        }
      } catch (err) {
        resultDiv.innerHTML = `<div class="alert-banner error">Error: ${escapeHtml(err.message)}</div>`;
      } finally {
        btnDeep.disabled = false;
        btnDeep.textContent = 'Actualizar Análisis';
      }
    });
  }
}

/**
 * Configuración de modales y listeners
 */
function setupModals() {
  setupResearchModal({
    modalOverlay: elements.researchModal,
    onRunResearch: async (scope) => {
      return await api.triggerResearch(scope);
    },
    onRetrySource: async (sourceId) => {
      return await api.retrySource(sourceId);
    },
    onRefresh: async () => {
      await loadInitialData();
      if (state.currentView === 'profile' && state.currentCompanySlug) {
        await navigateToProfile(state.currentCompanySlug);
      }
    }
  });

  const closeAiModal = () => {
    if (elements.aiModal) elements.aiModal.classList.remove('active');
  };
  if (elements.aiModalClose) elements.aiModalClose.addEventListener('click', closeAiModal);
  if (elements.aiModalFooterClose) elements.aiModalFooterClose.addEventListener('click', closeAiModal);
}

/**
 * Asignación de listeners de botones principales
 */
function setupEventListeners() {
  if (elements.btnOpenResearchModal) {
    elements.btnOpenResearchModal.addEventListener('click', async () => {
      try {
        const errRes = await api.getSourceErrors();
        if (errRes.success) {
          state.sourceErrors = errRes.data;
          populateSourceErrors(state.sourceErrors, document.getElementById('modal-sources-errors'));
        }
      } catch (e) {
        console.warn('Error al refrescar errores:', e);
      }
      elements.researchModal.classList.add('active');
    });
  }

  if (elements.btnRefreshData) {
    elements.btnRefreshData.addEventListener('click', async () => {
      elements.btnRefreshData.textContent = 'Actualizando...';
      await loadInitialData();
      if (state.currentView === 'profile' && state.currentCompanySlug) {
        await navigateToProfile(state.currentCompanySlug);
      }
      elements.btnRefreshData.textContent = 'Actualizar';
    });
  }

  if (elements.logoHome) {
    elements.logoHome.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToHome();
    });
  }
}

document.addEventListener('DOMContentLoaded', initApp);
