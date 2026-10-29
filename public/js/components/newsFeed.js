import { formatDate, renderVerificationBadge, escapeHtml, truncate } from '../utils.js';

/**
 * Renderiza las novedades recientes y los cambios detectados (con valores previos y nuevos)
 */
export function renderRecentNewsAndChanges(newsList, changesList, containerElement) {
  if (!containerElement) return;

  const newsHtml = (!newsList || newsList.length === 0) ? `
    <p style="color: var(--text-subtle); padding: 12px 0;">No se han registrado novedades recientemente. Ejecute una investigación para actualizar las fuentes.</p>
  ` : newsList.slice(0, 5).map(item => `
    <div class="news-item">
      <div class="news-item-header">
        <span class="news-item-title">${escapeHtml(item.title)}</span>
        ${renderVerificationBadge(item.verification_status)}
      </div>
      <p class="news-item-desc">${escapeHtml(truncate(item.finding_text, 160))}</p>
      <div class="news-item-footer">
        <span>Empresa: <strong>${escapeHtml(item.company_name)}</strong></span>
        <span>Impacto: <strong>${escapeHtml(item.impact_level)}</strong></span>
        <span>Fecha: ${formatDate(item.detected_at)}</span>
        ${item.source_url ? `<span><a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">Fuente &nearr;</a></span>` : ''}
      </div>
    </div>
  `).join('');

  const changesHtml = (!changesList || changesList.length === 0) ? `
    <p style="color: var(--text-subtle); padding: 12px 0;">No se registran cambios entre versiones anteriores y actuales. Las versiones históricas se preservan automáticamente al detectar diferencias.</p>
  ` : changesList.slice(0, 5).map(ver => `
    <div class="news-item">
      <div class="news-item-header">
        <span class="news-item-title">${escapeHtml(ver.company_name)}: ${escapeHtml(ver.field_name)}</span>
        ${renderVerificationBadge(ver.verification_status)}
      </div>
      <div class="diff-container" style="margin-bottom: 8px;">
        <div class="diff-box old">
          <span style="font-weight: 600; color: #dc2626;">Versión Anterior:</span>
          <pre>${escapeHtml(ver.previous_value || '(Sin registro previo)')}</pre>
        </div>
        <div class="diff-box new">
          <span style="font-weight: 600; color: #16a34a;">Nueva Versión:</span>
          <pre>${escapeHtml(ver.new_value)}</pre>
        </div>
      </div>
      <div class="news-item-footer">
        <span>Detectado: ${formatDate(ver.detection_date)}</span>
        ${ver.source_url ? `<span><a href="${escapeHtml(ver.source_url)}" target="_blank" rel="noopener noreferrer">Fuente de Respaldo &nearr;</a></span>` : ''}
      </div>
    </div>
  `).join('');

  containerElement.innerHTML = `
    <!-- Bloque 1: Novedades Recientes -->
    <div class="content-box">
      <div class="box-header">
        <h2 class="box-title">Novedades y Hallazgos Recientes</h2>
        <span style="font-size: 12px; color: var(--text-subtle);">Últimos eventos</span>
      </div>
      ${newsHtml}
    </div>

    <!-- Bloque 2: Cambios Detectados (Anterior vs Nuevo) -->
    <div class="content-box">
      <div class="box-header">
        <h2 class="box-title">Cambios Detectados (Versión Anterior vs Nueva)</h2>
        <span style="font-size: 12px; color: var(--text-subtle);">Historial inmutable</span>
      </div>
      ${changesHtml}
    </div>
  `;
}
