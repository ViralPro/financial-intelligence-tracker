import { formatDate, renderVerificationBadge, escapeHtml } from '../utils.js';

export function renderArgentinaSection(data, containerElement, onCheckPortals) {
  if (!containerElement || !data) return;

  const { sourcesInfo, entries } = data;

  containerElement.innerHTML = `
    <div class="content-box" style="margin-bottom: 24px;">
      <div class="box-header">
        <div>
          <h2 class="box-title">Apartado de Fuentes Oficiales Argentinas (CNV, ARCA, BCRA)</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
            Supervisión normativa aplicable a inversores residentes en la República Argentina que operan con intermediarios externos.
          </p>
        </div>
        <button class="btn btn-sm" id="btn-check-arg-portals">
          Comprobar Conectividad de Portales
        </button>
      </div>

      <!-- Tarjetas de Organismos Oficiales Argentinos -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
        ${sourcesInfo.map(src => `
          <div style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; background: var(--bg-secondary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="font-size: 15px;">${escapeHtml(src.code)}</strong>
              <span class="pill-status" style="font-size: 11px;">Oficial AR</span>
            </div>
            <div style="font-weight: 500; font-size: 13px; margin-bottom: 6px;">${escapeHtml(src.name)}</div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">${escapeHtml(src.role)}</p>
            <div style="font-size: 12px; color: var(--text-subtle); margin-bottom: 8px;">
              <em>${escapeHtml(src.status)}</em>
            </div>
            <div>
              <a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: var(--primary-blue);">
                Visitar Portal &nearr;
              </a>
              ${src.registryUrl ? ` | <a href="${escapeHtml(src.registryUrl)}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: var(--primary-blue);">Registro/Normativa &nearr;</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Alerta informativa de distinción de conceptos -->
      <div class="alert-banner warning" style="margin-bottom: 18px;">
        <div>
          <strong>Distinciones Normativas Críticas:</strong>
          <ul style="margin-left: 18px; margin-top: 4px; font-size: 12px;">
            <li><strong>Regulación Financiera (CNV):</strong> Ninguna de las 3 plataformas cuenta con matrícula ALYC local en CNV. La relación jurídica se establece bajo legislación foránea.</li>
            <li><strong>Régimen Cambiario y Transferencias (BCRA):</strong> Giros regulados por normas cambiarias (transferencias bancarias propias o Contado con Liquidación).</li>
            <li><strong>Obligaciones Fiscales Personales (ARCA / ex-AFIP):</strong> Responsabilidad tributaria personal del inversor (Bienes Personales y Ganancias fuente extranjera). La plataforma extranjera no retiene tributos locales.</li>
          </ul>
        </div>
      </div>

      <!-- Tabla de Normativas y Disposiciones Registradas -->
      <div class="table-responsive">
        <table class="clean-table">
          <thead>
            <tr>
              <th>Autoridad</th>
              <th>Clasificación Temática</th>
              <th>Normativa / Referencia</th>
              <th>Resumen y Alcance Fáctico</th>
              <th>Acceso Portal</th>
              <th>Método Consulta</th>
              <th>Estado Verificación</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(ent => `
              <tr>
                <td><strong>${escapeHtml(ent.authority)}</strong></td>
                <td><span class="pill-status">${escapeHtml(ent.category)}</span></td>
                <td style="font-weight: 500;">${escapeHtml(ent.norm_reference)}</td>
                <td style="max-width: 300px; font-size: 12px; color: var(--text-muted);">${escapeHtml(ent.summary)}</td>
                <td><a href="${escapeHtml(ent.official_url)}" target="_blank" rel="noopener noreferrer">Ver Portal &nearr;</a></td>
                <td style="font-size: 11px;">
                  ${ent.requires_manual_check ? '<span style="color: #b45309;">Requiere búsqueda interactiva</span>' : '<span style="color: #047857;">Consulta pública directa</span>'}
                </td>
                <td>${renderVerificationBadge(ent.verification_status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div id="arg-portals-live-status" style="margin-top: 16px;"></div>
    </div>
  `;

  const btnCheck = containerElement.querySelector('#btn-check-arg-portals');
  if (btnCheck && typeof onCheckPortals === 'function') {
    btnCheck.addEventListener('click', async () => {
      btnCheck.disabled = true;
      btnCheck.textContent = 'Comprobando respuesta...';
      const statusDiv = containerElement.querySelector('#arg-portals-live-status');
      statusDiv.innerHTML = '<p style="font-size: 13px; color: var(--text-muted);">Consultando servidores de CNV, ARCA y BCRA en tiempo real...</p>';

      try {
        const results = await onCheckPortals();
        statusDiv.innerHTML = `
          <div style="border-top: 1px solid var(--border-color); padding-top: 12px; font-size: 13px;">
            <strong>Resultado de conectividad en vivo:</strong>
            <div style="display: flex; gap: 20px; margin-top: 6px; flex-wrap: wrap;">
              ${results.map(r => `
                <div>
                  <strong>${escapeHtml(r.authority)}:</strong> 
                  ${r.reachable ? `<span style="color: #059669;">En línea (HTTP ${r.status || 200}, ${r.latencyMs}ms)</span>` : `<span style="color: #dc2626;">Inaccesible (${escapeHtml(r.error)})</span>`}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } catch (err) {
        statusDiv.innerHTML = `<p style="color: #dc2626; font-size: 13px;">Error al comprobar portales: ${escapeHtml(err.message)}</p>`;
      } finally {
        btnCheck.disabled = false;
        btnCheck.textContent = 'Comprobar Conectividad de Portales';
      }
    });
  }
}
