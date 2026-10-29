/**
 * Utilidades generales para formato, sanitización y badges de estado
 */

export function formatDate(dateString) {
  if (!dateString) return 'No registrado / Pendiente';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch (e) {
    return String(dateString);
  }
}

export function formatDateShort(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    return String(dateString);
  }
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderVerificationBadge(status) {
  const s = (status || 'Pendiente de verificación').trim();
  let cssClass = 'pendiente';

  switch (s) {
    case 'Verificado en fuente oficial':
      cssClass = 'verificado-oficial';
      break;
    case 'Coincidente en varias fuentes':
      cssClass = 'coincidente';
      break;
    case 'Pendiente de verificación':
      cssClass = 'pendiente';
      break;
    case 'Información contradictoria':
      cssClass = 'contradictoria';
      break;
    case 'Fuente no disponible':
      cssClass = 'no-disponible';
      break;
    case 'Dato histórico':
      cssClass = 'historico';
      break;
    case 'Dato desactualizado':
      cssClass = 'desactualizado';
      break;
    default:
      cssClass = 'pendiente';
  }

  return `<span class="pill-status ${cssClass}">${escapeHtml(s)}</span>`;
}

export function truncate(text, length = 140) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}
