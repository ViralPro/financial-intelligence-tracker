import { formatDateShort, renderVerificationBadge, escapeHtml, truncate } from '../utils.js';

/**
 * Renderiza la sección de datos pendientes de verificación en la vista principal
 */
export function renderPendingList(pendingData, containerElement) {
  if (!containerElement) return;

  const total = pendingData ? pendingData.totalPending : 0;
  const licenses = (pendingData && pendingData.data && pendingData.data.licenses) || [];
  const entities = (pendingData && pendingData.data && pendingData.data.entities) || [];
  const costs = (pendingData && pendingData.data && pendingData.data.costsAndTaxes) || [];

  if (total === 0) {
    containerElement.innerHTML = `
      <div class="content-box">
        <div class="box-header">
          <h2 class="box-title">Datos Pendientes de Verificar</h2>
          <span class="pill-status verificado-oficial">0 pendientes</span>
        </div>
        <p style="color: var(--text-subtle); padding: 12px 0;">Todos los datos e indicadores actuales han sido verificados contra fuentes oficiales o comprobadas.</p>
      </div>
    `;
    return;
  }

  containerElement.innerHTML = `
    <div class="content-box">
      <div class="box-header">
        <h2 class="box-title">Datos Pendientes de Verificar</h2>
        <span class="pill-status pendiente">${total} elementos por contrastar</span>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
        Los siguientes elementos se hallan en estado preliminar sin validación de doble fuente o aguardan ejecución de investigación manual/programada.
      </p>

      <div class="table-responsive">
        <table class="clean-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Tipo Dato</th>
              <th>Identificador / Concepto</th>
              <th>Descripción</th>
              <th>Fuente Asociada</th>
              <th>Fecha Consulta</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${licenses.map(l => `
              <tr>
                <td><strong>${escapeHtml(l.company_name)}</strong></td>
                <td><span class="pill-status">Licencia</span></td>
                <td><code>${escapeHtml(l.identifier)}</code></td>
                <td>${escapeHtml(l.description)} (${escapeHtml(l.legal_entity_name)})</td>
                <td>
                  ${l.source_url ? `<a href="${escapeHtml(l.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.regulator || 'Enlace')} &nearr;</a>` : '-'}
                </td>
                <td>${formatDateShort(l.consultation_date)}</td>
                <td>${renderVerificationBadge(l.verification_status)}</td>
              </tr>
            `).join('')}

            ${entities.map(e => `
              <tr>
                <td><strong>${escapeHtml(e.company_name)}</strong></td>
                <td><span class="pill-status">Entidad Jurídica</span></td>
                <td>${escapeHtml(e.identifier)}</td>
                <td>${escapeHtml(e.description)}</td>
                <td>
                  ${e.source_url ? `<a href="${escapeHtml(e.source_url)}" target="_blank" rel="noopener noreferrer">Registro &nearr;</a>` : '-'}
                </td>
                <td>${formatDateShort(e.consultation_date)}</td>
                <td>${renderVerificationBadge(e.verification_status)}</td>
              </tr>
            `).join('')}

            ${costs.map(c => `
              <tr>
                <td><strong>${escapeHtml(c.company_name)}</strong></td>
                <td><span class="pill-status">Impuesto / Costo</span></td>
                <td>${escapeHtml(c.identifier)}</td>
                <td>${escapeHtml(truncate(c.description, 80))}</td>
                <td>
                  ${c.source_url ? `<a href="${escapeHtml(c.source_url)}" target="_blank" rel="noopener noreferrer">Tarifario &nearr;</a>` : '-'}
                </td>
                <td>${formatDateShort(c.consultation_date)}</td>
                <td>${renderVerificationBadge(c.verification_status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
