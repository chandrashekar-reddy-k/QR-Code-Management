// VillagKart QR Studio — Professional Route & URL Management

export const ROUTES = {
  DASHBOARD: '/dashboard',
  QR_MANAGEMENT: '/qr-management',
  QR_CREATE: '/qr-management/create',
  QR_DETAILS: (id) => `/qr-management/${id}`,
  QR_EDIT: (id) => `/qr-management/edit/${id}`,
  SCAN_HISTORY: '/scan-history',
};

/**
 * Returns canonical URL for a given internal screen and its state params.
 */
export const getRouteForScreen = (screen, { qrId, wizardMode, editingQrId } = {}) => {
  switch (screen) {
    case 'dashboard':
      return ROUTES.DASHBOARD;
    case 'listing':
      return ROUTES.QR_MANAGEMENT;
    case 'wizard':
      if (wizardMode === 'edit' && editingQrId) {
        return ROUTES.QR_EDIT(editingQrId);
      }
      return ROUTES.QR_CREATE;
    case 'details':
      return qrId ? ROUTES.QR_DETAILS(qrId) : ROUTES.QR_MANAGEMENT;
    case 'scan-history':
      return ROUTES.SCAN_HISTORY;
    default:
      return ROUTES.DASHBOARD;
  }
};

/**
 * Parses browser pathname into internal screen state.
 */
export const parsePathname = (pathname = '') => {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/' || clean === '/dashboard') {
    return { screen: 'dashboard' };
  }

  if (clean === '/qr-management' || clean === '/qrs' || clean === '/inventory') {
    return { screen: 'listing' };
  }

  if (clean === '/qr-management/create' || clean === '/create-qr') {
    return { screen: 'wizard', wizardMode: 'create' };
  }

  const editMatch = clean.match(/^\/qr-management\/edit\/([A-Za-z0-9_-]+)/i);
  if (editMatch) {
    const id = editMatch[1];
    return { screen: 'wizard', wizardMode: 'edit', editingQrId: id, qrId: id };
  }

  const detailsMatch = clean.match(/^\/qr-management\/(?:details\/)?([A-Za-z0-9_-]+)/i);
  if (detailsMatch) {
    const id = detailsMatch[1];
    if (id !== 'create') {
      return { screen: 'details', qrId: id };
    }
  }

  if (clean === '/scan-history' || clean === '/scans' || clean === '/history') {
    return { screen: 'scan-history' };
  }

  // Fallback to dashboard
  return { screen: 'dashboard' };
};

/**
 * Generates professional HTML document titles for each screen.
 */
export const getPageTitle = (screen, { qr, qrId, wizardMode } = {}) => {
  const baseTitle = 'VillagKart QR Studio';
  switch (screen) {
    case 'dashboard':
      return `Dashboard — ${baseTitle}`;
    case 'listing':
      return `QR Management — ${baseTitle}`;
    case 'wizard':
      return wizardMode === 'edit'
        ? `Edit ${qr?.name || qrId || 'QR Code'} — ${baseTitle}`
        : `Create New QR Code — ${baseTitle}`;
    case 'details':
      return qr
        ? `${qr.name} (${qr.id}) — QR Details — ${baseTitle}`
        : `${qrId || 'QR Details'} — ${baseTitle}`;
    case 'scan-history':
      return `Scan History Log — ${baseTitle}`;
    default:
      return baseTitle;
  }
};
