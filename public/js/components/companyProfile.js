import { formatDate, formatDateShort, renderVerificationBadge, escapeHtml, truncate } from '../utils.js';

export function renderCompanyProfile(profileData, containerElement, onBack, onTriggerAI) {
  if (!containerElement || !profileData || !profileData.company) return;

  const { company, tabs } = profileData;

  containerElement.innerHTML = `
    <div class="nav-breadcrumbs">
      <a href="#" id="profile-back-link">&larr; Volver a las 3 empresas</a>
      <span>/</span>
      <span>${escapeHtml(company.name)}</span>
    </div>

    <!-- Encabezado de la Ficha -->
    <header class="profile-header">
      <div class="profile-header-top">
        <div>
          <h1 class="profile-name">${escapeHtml(company.name)}</h1>
          <p class="profile-type">${escapeHtml(company.company_type)}</p>
        </div>
        <div>
          ${renderVerificationBadge(company.verification_status)}
        </div>
      </div>

      <div class="profile-meta-grid">
        <div>
          <div class="profile-meta-label">Sede Global / Origen</div>
          <div class="profile-meta-value">${escapeHtml(company.global_hq || 'No declarada')}</div>
        </div>
        <div>
          <div class="profile-meta-label">Año de Fundación</div>
          <div class="profile-meta-value">${company.founded_year || 'No especificado'}</div>
        </div>
        <div>
          <div class="profile-meta-label">Sitio Web Oficial</div>
          <div class="profile-meta-value"><a href="${escapeHtml(company.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(company.website)}</a></div>
        </div>
        <div>
          <div class="profile-meta-label">Última Revisión</div>
          <div class="profile-meta-value">${formatDate(company.last_reviewed_at)}</div>
        </div>
      </div>
    </header>

    <!-- Navegación de las 9 Pestañas -->
    <nav class="tabs-navigation" role="tablist">
      <button class="tab-btn active" data-tab="tab-resumen" role="tab" aria-selected="true">1. Resumen</button>
      <button class="tab-btn" data-tab="tab-identidad" role="tab" aria-selected="false">2. Identidad y Entidades Jurídicas</button>
      <button class="tab-btn" data-tab="tab-regulacion" role="tab" aria-selected="false">3. Regulación y Licencias</button>
      <button class="tab-btn" data-tab="tab-jurisdicciones" role="tab" aria-selected="false">4. Países y Jurisdicciones</button>
      <button class="tab-btn" data-tab="tab-impuestos-costos" role="tab" aria-selected="false">5. Impuestos y Costos</button>
      <button class="tab-btn" data-tab="tab-documentos-fuentes" role="tab" aria-selected="false">6. Documentos y Fuentes Oficiales</button>
      <button class="tab-btn" data-tab="tab-novedades" role="tab" aria-selected="false">7. Novedades (${tabs.novedades.length})</button>
      <button class="tab-btn" data-tab="tab-historial-cambios" role="tab" aria-selected="false">8. Historial de Cambios (${tabs.historial_cambios.dataVersions.length})</button>
      <button class="tab-btn" data-tab="tab-pendientes" role="tab" aria-selected="false">9. Datos Pendientes de Verificar</button>
    </nav>

    <!-- Contenido de las Pestañas -->
    <div class="tabs-content">
      
      <!-- Pestaña 1: Resumen -->
      <section id="tab-resumen" class="tab-pane active" role="tabpanel">
        <div class="content-box">
          <h2 class="box-title" style="margin-bottom: 12px;">Descripción y Alcance Operativo</h2>
          <p style="margin-bottom: 18px; line-height: 1.6; color: var(--text-muted);">${escapeHtml(company.description)}</p>
          
          <div class="profile-meta-grid" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; background: var(--bg-secondary);">
            <div>
              <div class="profile-meta-label">Entidades Jurídicas Registradas</div>
              <div class="profile-meta-value" style="font-size: 16px;">${tabs.resumen.stats.legalEntitiesCount}</div>
            </div>
            <div>
              <div class="profile-meta-label">Licencias Regulatorias</div>
              <div class="profile-meta-value" style="font-size: 16px;">${tabs.resumen.stats.licensesCount}</div>
            </div>
            <div>
              <div class="profile-meta-label">Jurisdicciones con Presencia</div>
              <div class="profile-meta-value" style="font-size: 16px;">${tabs.resumen.stats.jurisdictionsCount}</div>
            </div>
            <div>
              <div class="profile-meta-label">Datos Pendientes de Validación</div>
              <div class="profile-meta-value" style="font-size: 16px; color: ${tabs.resumen.stats.pendingVerificationCount > 0 ? 'var(--status-pending-text)' : 'inherit'};">
                ${tabs.resumen.stats.pendingVerificationCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Pestaña 2: Identidad y Entidades Jurídicas (Distingue Matrices y Filiales) -->
      <section id="tab-identidad" class="tab-pane" role="tabpanel">
        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Estructura Corporativa: Casas Matrices y Filiales Operativas</h2>
          </div>
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Rol Corporativo</th>
                  <th>Razón Social Exacta</th>
                  <th>Jurisdicción</th>
                  <th>N° Registro / CIK</th>
                  <th>Domicilio Legal</th>
                  <th>Fuente Original</th>
                  <th>Consulta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.identidad.map(item => `
                  <tr>
                    <td>
                      <span style="font-weight: 600; color: ${item.is_parent ? 'var(--primary-blue)' : 'var(--text-main)'};">
                        ${item.is_parent ? '★ Matriz (Holding)' : escapeHtml(item.entity_type)}
                      </span>
                    </td>
                    <td style="font-weight: 500;">${escapeHtml(item.legal_name)}</td>
                    <td>${escapeHtml(item.jurisdiction_name)} (${escapeHtml(item.jurisdiction_code)})</td>
                    <td><code>${escapeHtml(item.registration_number || 'N/A')}</code></td>
                    <td style="max-width: 220px; font-size: 12px; color: var(--text-muted);">${escapeHtml(item.registered_address || '-')}</td>
                    <td>
                      ${item.source_url ? `<a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">Enlace Fuente &nearr;</a>` : '-'}
                    </td>
                    <td>${formatDateShort(item.consultation_date)}</td>
                    <td>${renderVerificationBadge(item.verification_status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Pestaña 3: Regulación y Licencias (No generaliza licencias a todos los países) -->
      <section id="tab-regulacion" class="tab-pane" role="tabpanel">
        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Licencias y Autorizaciones Regulatorias por Entidad</h2>
          </div>
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Regulador</th>
                  <th>N° Licencia / Registro</th>
                  <th>Entidad Titular</th>
                  <th>Jurisdicción</th>
                  <th>Alcance Autorizado</th>
                  <th>Países con Cobertura</th>
                  <th>Registro Oficial</th>
                  <th>Fecha Consulta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.regulacion.map(lic => `
                  <tr>
                    <td>
                      <strong title="${escapeHtml(lic.regulator_full_name)}">${escapeHtml(lic.regulator_name)}</strong>
                    </td>
                    <td><code>${escapeHtml(lic.license_number)}</code></td>
                    <td>${escapeHtml(lic.legal_entity_name)}</td>
                    <td>${escapeHtml(lic.jurisdiction_name)}</td>
                    <td style="max-width: 200px;">${escapeHtml(lic.scope_description || lic.license_type)}</td>
                    <td style="max-width: 180px; font-size: 12px; color: var(--text-muted);">
                      ${escapeHtml(lic.authorized_countries || 'Jurisdicción del regulador')}
                    </td>
                    <td>
                      ${lic.official_record_url ? `<a href="${escapeHtml(lic.official_record_url)}" target="_blank" rel="noopener noreferrer">Padrón Oficial &nearr;</a>` : '-'}
                    </td>
                    <td>${formatDateShort(lic.consultation_date)}</td>
                    <td>${renderVerificationBadge(lic.verification_status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Pestaña 4: Países y Jurisdicciones -->
      <section id="tab-jurisdicciones" class="tab-pane" role="tabpanel">
        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Jurisdicciones Reguladas y Niveles de Supervisión</h2>
          </div>
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>País / Territorio</th>
                  <th>Región</th>
                  <th>Nivel Regulatorio</th>
                  <th>Filiales Locales</th>
                  <th>Licencias Activas</th>
                  <th>Marco Normativo y Protecciones</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.jurisdicciones.map(jur => `
                  <tr>
                    <td><code>${escapeHtml(jur.code)}</code></td>
                    <td style="font-weight: 500;">${escapeHtml(jur.name)}</td>
                    <td>${escapeHtml(jur.region || '-')}</td>
                    <td><span class="pill-status">${escapeHtml(jur.regulatory_tier || 'Estándar')}</span></td>
                    <td style="text-align: center;">${jur.entities_count}</td>
                    <td style="text-align: center;">${jur.licenses_count}</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${escapeHtml(jur.notes || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Pestaña 5: Impuestos y Costos -->
      <section id="tab-impuestos-costos" class="tab-pane" role="tabpanel">
        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Estructura de Tarifas, Comisiones y Consideraciones Fiscales</h2>
          </div>
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Concepto</th>
                  <th>Valor / Término Actual</th>
                  <th>Entidad Correspondiente</th>
                  <th>Jurisdicción</th>
                  <th>Fuente Original</th>
                  <th>Fecha Consulta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.impuestos_costos.map(item => `
                  <tr>
                    <td><strong>${escapeHtml(item.category)}</strong></td>
                    <td style="font-weight: 500;">${escapeHtml(item.title)}</td>
                    <td style="max-width: 250px;">${escapeHtml(item.current_value)}</td>
                    <td>${escapeHtml(item.legal_entity_name || 'Nivel Corporativo')}</td>
                    <td>${escapeHtml(item.jurisdiction_name || '-')}</td>
                    <td>
                      ${item.source_url ? `<a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">Fuente Oficial &nearr;</a>` : '-'}
                    </td>
                    <td>${formatDateShort(item.consultation_date)}</td>
                    <td>${renderVerificationBadge(item.verification_status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Pestaña 6: Documentos y Fuentes Oficiales -->
      <section id="tab-documentos-fuentes" class="tab-pane" role="tabpanel">
        <div class="content-box" style="margin-bottom: 20px;">
          <div class="box-header">
            <h2 class="box-title">Documentos Normativos y Registros Auditados</h2>
          </div>
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Título Documento</th>
                  <th>Tipo</th>
                  <th>Versión</th>
                  <th>Hash SHA-256</th>
                  <th>Fuente Oficial</th>
                  <th>Última Consulta</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.documentos_fuentes.documents.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: var(--text-subtle);">No hay documentos registrados para esta empresa. Inicie una investigación manual para recolectar registros.</td></tr>
                ` : tabs.documentos_fuentes.documents.map(doc => `
                  <tr>
                    <td style="font-weight: 500;">${escapeHtml(doc.title)}</td>
                    <td>${escapeHtml(doc.document_type)}</td>
                    <td>v${doc.version_number}</td>
                    <td><code>${escapeHtml(doc.content_hash ? doc.content_hash.slice(0, 10) + '...' : '-')}</code></td>
                    <td><a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.source_name || 'Enlace Oficial')} &nearr;</a></td>
                    <td>${formatDateShort(doc.consultation_date)}</td>
                    <td>${renderVerificationBadge(doc.verification_status)}</td>
                    <td>
                      <button class="btn btn-sm btn-ai-summary" data-doc-title="${escapeHtml(doc.title)}" data-doc-url="${escapeHtml(doc.url)}" data-company="${escapeHtml(company.name)}" data-summary="${escapeHtml(doc.summary || '')}">
                        Ver Resumen
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Fuentes Públicas y Reguladores Asignados</h2>
          </div>
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Nombre de la Fuente</th>
                  <th>Categoría</th>
                  <th>URL</th>
                  <th>Método de Acceso</th>
                  <th>Estado HTTP</th>
                  <th>Última Comprobación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.documentos_fuentes.sources.map(src => `
                  <tr>
                    <td style="font-weight: 500;">${escapeHtml(src.name)}</td>
                    <td>${escapeHtml(src.category)}</td>
                    <td><a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(truncate(src.url, 45))}</a></td>
                    <td><code>${escapeHtml(src.access_method)}</code></td>
                    <td>${src.http_status ? `HTTP ${src.http_status}` : (src.manual_check_required ? 'Manual' : 'Pendiente')}</td>
                    <td>${formatDate(src.last_checked_at)}</td>
                    <td>${renderVerificationBadge(src.verification_status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Pestaña 7: Novedades -->
      <section id="tab-novedades" class="tab-pane" role="tabpanel">
        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Hallazgos Regulatorios y Novedades Detectadas</h2>
          </div>
          ${tabs.novedades.length === 0 ? `
            <p style="color: var(--text-subtle); padding: 16px 0;">No se han detectado novedades o alertas regulatorias para esta empresa.</p>
          ` : tabs.novedades.map(item => `
            <div class="news-item">
              <div class="news-item-header">
                <span class="news-item-title">${escapeHtml(item.title)}</span>
                ${renderVerificationBadge(item.verification_status)}
              </div>
              <p class="news-item-desc">${escapeHtml(item.finding_text)}</p>
              <div class="news-item-footer">
                <span>Categoría: <strong>${escapeHtml(item.category)}</strong></span>
                <span>Impacto: <strong>${escapeHtml(item.impact_level)}</strong></span>
                <span>Detectado: ${formatDate(item.detected_at)}</span>
                ${item.source_url ? `<span>Fuente: <a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">Ver documento &nearr;</a></span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Pestaña 8: Historial de Cambios (Motor de Comparación Histórica) -->
      <section id="tab-historial-cambios" class="tab-pane" role="tabpanel">
        <div class="content-box" style="margin-bottom: 20px;">
          <div class="box-header">
            <h2 class="box-title">Motor de Comparación: Diferencias Detectadas entre Versiones</h2>
          </div>
          ${tabs.historial_cambios.dataVersions.length === 0 ? `
            <p style="color: var(--text-subtle); padding: 16px 0;">No se han registrado modificaciones o variaciones entre versiones documentales para esta empresa.</p>
          ` : tabs.historial_cambios.dataVersions.map(ver => `
            <div class="news-item">
              <div class="news-item-header">
                <strong>Campo modificado: ${escapeHtml(ver.field_name)}</strong>
                ${renderVerificationBadge(ver.verification_status)}
              </div>
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">
                Razón del cambio: ${escapeHtml(ver.change_rationale || 'Actualización periódica')}
              </p>
              
              <div class="diff-container">
                <div class="diff-box old">
                  <span style="font-weight: 600; color: #dc2626;">Versión Anterior:</span>
                  <pre>${escapeHtml(ver.previous_value || '(Sin registro previo)')}</pre>
                </div>
                <div class="diff-box new">
                  <span style="font-weight: 600; color: #16a34a;">Versión Nueva:</span>
                  <pre>${escapeHtml(ver.new_value)}</pre>
                </div>
              </div>

              <div class="news-item-footer" style="margin-top: 8px;">
                <span>Fecha de detección: ${formatDate(ver.detection_date)}</span>
                ${ver.source_url ? `<span>Fuente: <a href="${escapeHtml(ver.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ver.source_url)}</a></span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Cronología de Eventos</h2>
          </div>
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo Evento</th>
                  <th>Resumen</th>
                  <th>Detalle</th>
                  <th>Fuente</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.historial_cambios.timelineEvents.length === 0 ? `
                  <tr><td colspan="5" style="text-align: center; color: var(--text-subtle);">No hay eventos cronológicos registrados.</td></tr>
                ` : tabs.historial_cambios.timelineEvents.map(ev => `
                  <tr>
                    <td>${formatDate(ev.event_date)}</td>
                    <td><code>${escapeHtml(ev.event_type)}</code></td>
                    <td style="font-weight: 500;">${escapeHtml(ev.summary)}</td>
                    <td style="font-size: 12px; color: var(--text-muted); max-width: 250px;">${escapeHtml(ev.detail || '-')}</td>
                    <td>
                      ${ev.source_url ? `<a href="${escapeHtml(ev.source_url)}" target="_blank" rel="noopener noreferrer">Enlace &nearr;</a>` : '-'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Pestaña 9: Datos Pendientes de Verificar -->
      <section id="tab-pendientes" class="tab-pane" role="tabpanel">
        <div class="content-box">
          <div class="box-header">
            <h2 class="box-title">Registros con Verificación Pendiente</h2>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Estos elementos requieren confirmación contra los padrones oficiales correspondientes o están a la espera de la ejecución de una ronda de verificación.
          </p>
          
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Tipo Registro</th>
                  <th>Identificador / Concepto</th>
                  <th>Detalle</th>
                  <th>Fuente Reguladora</th>
                  <th>Fecha Consulta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tabs.pendientes.licenses.map(lic => `
                  <tr>
                    <td><span class="pill-status">Licencia</span></td>
                    <td style="font-weight: 500;">${escapeHtml(lic.license_number)}</td>
                    <td>${escapeHtml(lic.license_type)} (${escapeHtml(lic.legal_entity_name)})</td>
                    <td><a href="${escapeHtml(lic.official_record_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(lic.regulator_name)} &nearr;</a></td>
                    <td>${formatDateShort(lic.consultation_date)}</td>
                    <td>${renderVerificationBadge(lic.verification_status)}</td>
                  </tr>
                `).join('')}

                ${tabs.pendientes.entities.map(ent => `
                  <tr>
                    <td><span class="pill-status">Entidad Jurídica</span></td>
                    <td style="font-weight: 500;">${escapeHtml(ent.legal_name)}</td>
                    <td>${escapeHtml(ent.entity_type)}</td>
                    <td><a href="${escapeHtml(ent.source_url)}" target="_blank" rel="noopener noreferrer">Registro &nearr;</a></td>
                    <td>${formatDateShort(ent.consultation_date)}</td>
                    <td>${renderVerificationBadge(ent.verification_status)}</td>
                  </tr>
                `).join('')}

                ${tabs.pendientes.costsAndTaxes.map(ct => `
                  <tr>
                    <td><span class="pill-status">Impuesto / Costo</span></td>
                    <td style="font-weight: 500;">${escapeHtml(ct.title)}</td>
                    <td>${escapeHtml(ct.current_value)}</td>
                    <td><a href="${escapeHtml(ct.source_url)}" target="_blank" rel="noopener noreferrer">Fuente &nearr;</a></td>
                    <td>${formatDateShort(ct.consultation_date)}</td>
                    <td>${renderVerificationBadge(ct.verification_status)}</td>
                  </tr>
                `).join('')}

                ${tabs.pendientes.licenses.length === 0 && tabs.pendientes.entities.length === 0 && tabs.pendientes.costsAndTaxes.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; color: var(--text-subtle);">No hay datos pendientes de verificación para esta empresa. Todos los registros han sido confirmados o procesados.</td></tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  `;

  // Listeners para cambio de pestañas
  const tabButtons = containerElement.querySelectorAll('.tab-btn');
  const tabPanes = containerElement.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPane = containerElement.querySelector(`#${targetId}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Botón volver
  const backLink = containerElement.querySelector('#profile-back-link');
  if (backLink && typeof onBack === 'function') {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      onBack();
    });
  }

  // Botones de resumen IA
  const aiButtons = containerElement.querySelectorAll('.btn-ai-summary');
  aiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.getAttribute('data-doc-title');
      const url = btn.getAttribute('data-doc-url');
      const company = btn.getAttribute('data-company');
      const summary = btn.getAttribute('data-summary');
      if (typeof onTriggerAI === 'function') {
        onTriggerAI({ title, url, company, summary });
      }
    });
  });
}
