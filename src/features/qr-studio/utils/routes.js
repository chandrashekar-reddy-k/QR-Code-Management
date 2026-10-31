// VillagKart QR Studio — Route & URL Management (Integrated with Partner Web)

export const ROUTES = {
  DASHBOARD: '/qr-studio/qr-dashboard',
  QR_MANAGEMENT: '/qr-studio/management',
  QR_CREATE: '/qr-studio/create',
  QR_DETAILS: (id) => `/qr-studio/details/${id}`,
  QR_EDIT: (id) => `/qr-studio/edit/${id}`,
  SCAN_HISTORY: '/qr-studio/scan-history',
  AUDIT_HISTORY: '/qr-studio/scan-history',
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
 * Supports both integrated /qr-studio paths and legacy standalone paths.
 */
export const parsePathname = (pathname = '') => {
  const clean = pathname.replace(/\/+$/, '') || '/';

  // 1. Dashboard
  if (
    clean === '/qr-studio/qr-dashboard' ||
    clean === '/qr-studio/dashboard' ||
    clean === '/qr-studio' ||
    clean === '/' ||
    clean === '/dashboard'
  ) {
    return { screen: 'dashboard' };
  }

  // 2. QR Management / Listing
  if (
    clean === '/qr-studio/management' ||
    clean === '/qr-studio/listing' ||
    clean === '/qr-studio/qrs' ||
    clean === '/qr-management' ||
    clean === '/qrs' ||
    clean === '/inventory'
  ) {
    return { screen: 'listing' };
  }

  // 3. Create Wizard
  if (
    clean === '/qr-studio/create' ||
    clean === '/qr-management/create' ||
    clean === '/create-qr'
  ) {
    return { screen: 'wizard', wizardMode: 'create' };
  }

  // 4. Edit Wizard
  const editMatch = clean.match(/^\/(?:qr-studio\/edit|qr-management\/edit)\/([A-Za-z0-9_-]+)/i);
  if (editMatch) {
    const id = editMatch[1];
    return { screen: 'wizard', wizardMode: 'edit', editingQrId: id, qrId: id };
  }

  // 5. Details
  const detailsMatch = clean.match(/^\/(?:qr-studio\/(?:details\/)?|qr-management\/(?:details\/)?)([A-Za-z0-9_-]+)/i);
  if (detailsMatch) {
    const id = detailsMatch[1];
    const reservedWords = ['create', 'edit', 'management', 'listing', 'dashboard', 'scan-history', 'audit-history', 'qrs'];
    if (!reservedWords.includes(id.toLowerCase())) {
      return { screen: 'details', qrId: id };
    }
  }

  // 6. Audit & Scan History Log
  if (
    clean === '/qr-studio/audit-history' ||
    clean === '/qr-studio/scan-history' ||
    clean === '/audit-history' ||
    clean === '/scan-history' ||
    clean === '/scans' ||
    clean === '/history' ||
    clean === '/audits'
  ) {
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
      return `Audit History — ${baseTitle}`;
    default:
      return baseTitle;
  }
};
