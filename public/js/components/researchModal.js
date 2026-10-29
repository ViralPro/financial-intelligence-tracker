import { formatDate, renderVerificationBadge, escapeHtml } from '../utils.js';

export function setupResearchModal({
  modalOverlay,
  onRunResearch,
  onRetrySource,
  onRefresh
}) {
  if (!modalOverlay) return;

  const closeBtn = modalOverlay.querySelector('.modal-close');
  const cancelBtn = modalOverlay.querySelector('#btn-modal-close');
  const runBtn = modalOverlay.querySelector('#btn-modal-run-research');
  const scopeSelect = modalOverlay.querySelector('#modal-research-scope');
  const modalStatusArea = modalOverlay.querySelector('#modal-research-status');
  const errorsContainer = modalOverlay.querySelector('#modal-sources-errors');

  const closeModal = () => {
    modalOverlay.classList.remove('active');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      const scope = scopeSelect ? scopeSelect.value : 'ALL';
      runBtn.disabled = true;
      runBtn.textContent = 'Investigando fuentes...';
      modalStatusArea.innerHTML = `
        <div class="alert-banner info">
          Iniciando investigación en fuentes públicas y registros oficiales. Tiempo estimado: 5-15 segundos...
        </div>
      `;

      try {
        const response = await onRunResearch(scope);
        if (response.success && response.data) {
          const d = response.data;
          modalStatusArea.innerHTML = `
            <div class="alert-banner ${d.sourcesFailed > 0 ? 'warning' : 'info'}">
              <div>
                <strong>Investigación completada (Run ID: ${d.runId})</strong>
                <ul style="margin-left: 18px; margin-top: 4px;">
                  <li>Fuentes verificadas: ${d.sourcesChecked} (${d.sourcesSucceeded} exitosas, ${d.sourcesFailed} fallidas)</li>
                  <li>Cambios detectados vs versión previa: ${d.changesDetected}</li>
                  <li>Hallazgos y alertas generadas: ${d.findingsGenerated}</li>
                </ul>
              </div>
            </div>
          `;
        } else {
          modalStatusArea.innerHTML = `
            <div class="alert-banner error">
              ${escapeHtml(response.data ? response.data.message : 'Error al ejecutar investigación')}
            </div>
          `;
        }

        if (typeof onRefresh === 'function') {
          await onRefresh();
        }
      } catch (err) {
        modalStatusArea.innerHTML = `
          <div class="alert-banner error">
            Error de conexión: ${escapeHtml(err.message)}
          </div>
        `;
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Iniciar Nueva Ronda';
      }
    });
  }

  // Delegación de eventos para botón Reintentar Fuente
  if (errorsContainer) {
    errorsContainer.addEventListener('click', async (e) => {
      if (e.target && e.target.classList.contains('btn-retry-src')) {
        const sourceId = e.target.getAttribute('data-source-id');
        e.target.disabled = true;
        e.target.textContent = 'Reintentando...';

        try {
          const res = await onRetrySource(sourceId);
          if (res.success) {
            e.target.parentElement.innerHTML = '<span style="color: #059669; font-weight: 500;">✓ Fuente restablecida</span>';
            if (typeof onRefresh === 'function') await onRefresh();
          } else {
            e.target.disabled = false;
            e.target.textContent = 'Reintentar';
            alert(`Error al reintentar: ${res.error || 'La fuente no respondió'}`);
          }
        } catch (err) {
          e.target.disabled = false;
          e.target.textContent = 'Reintentar';
          alert(`Error de red: ${err.message}`);
        }
      }
    });
  }
}

/**
 * Llena el modal de investigación con la lista de errores actuales de fuentes
 */
export function populateSourceErrors(errors, containerElement) {
  if (!containerElement) return;

  if (!errors || errors.length === 0) {
    containerElement.innerHTML = `
      <div style="font-size: 13px; color: var(--text-muted); padding: 8px 0;">
        ✓ No hay fuentes reportando fallos de conexión en este momento.
      </div>
    `;
    return;
  }

  containerElement.innerHTML = `
    <h3 style="font-size: 14px; font-weight: 600; margin: 14px 0 8px;">Fuentes con Fallas o Inaccesibles (${errors.length})</h3>
    <div class="table-responsive">
      <table class="clean-table">
        <thead>
          <tr>
            <th>Fuente</th>
            <th>Empresa</th>
            <th>Último Error</th>
            <th>Reintentos Fallidos</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${errors.map(err => `
            <tr>
              <td>
                <div style="font-weight: 500;">${escapeHtml(err.name)}</div>
                <div style="font-size: 11px; color: var(--text-subtle);">${escapeHtml(err.url)}</div>
              </td>
              <td>${escapeHtml(err.company_name || 'General')}</td>
              <td style="color: #dc2626; font-size: 12px;">${escapeHtml(err.last_error || 'Timeout / Inaccesible')}</td>
              <td style="text-align: center;">${err.consecutive_failures}</td>
              <td>
                <button class="btn btn-sm btn-retry-src" data-source-id="${err.id}">
                  Reintentar
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
