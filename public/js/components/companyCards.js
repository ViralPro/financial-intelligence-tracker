import { formatDate, renderVerificationBadge, escapeHtml } from '../utils.js';

/**
 * Renderiza exclusivamente las 3 tarjetas de empresas en la vista principal
 */
export function renderCompanyCards(companies, containerElement, onSelectCompany) {
  if (!containerElement) return;

  if (!companies || companies.length === 0) {
    containerElement.innerHTML = `
      <div class="content-box" style="grid-column: 1 / -1; text-align: center; padding: 30px;">
        <p>No se encontraron empresas registradas. Verifique la inicialización de la base de datos.</p>
      </div>
    `;
    return;
  }

  containerElement.innerHTML = companies.map(company => {
    return `
      <article class="company-card" data-slug="${escapeHtml(company.slug)}" data-id="${company.id}" tabindex="0" role="button" aria-label="Ver ficha de ${escapeHtml(company.name)}">
        <div>
          <div class="card-header">
            <h2 class="card-title">${escapeHtml(company.name)}</h2>
            ${renderVerificationBadge(company.verification_status)}
          </div>
          <p class="card-type">${escapeHtml(company.company_type)}</p>
        </div>

        <div>
          <div class="card-meta-list">
            <div class="card-meta-item">
              <span class="card-meta-label">Última revisión:</span>
              <span class="card-meta-value">${formatDate(company.last_reviewed_at)}</span>
            </div>
            <div class="card-meta-item">
              <span class="card-meta-label">Novedades detectadas:</span>
              <span class="card-meta-value" style="font-weight: 600;">${company.findings_count || 0}</span>
            </div>
            <div class="card-meta-item">
              <span class="card-meta-label">Cambios históricos:</span>
              <span class="card-meta-value">${company.changes_count || 0}</span>
            </div>
            <div class="card-meta-item">
              <span class="card-meta-label">Datos por verificar:</span>
              <span class="card-meta-value">${company.pending_count || 0}</span>
            </div>
          </div>

          <div class="card-action">
            Ver ficha completa &rarr;
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Asociar evento de clic y teclado a cada tarjeta
  const cardElements = containerElement.querySelectorAll('.company-card');
  cardElements.forEach(card => {
    const slug = card.getAttribute('data-slug');
    const handleOpen = () => {
      if (typeof onSelectCompany === 'function') {
        onSelectCompany(slug);
      }
    };

    card.addEventListener('click', handleOpen);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
    });
  });
}
