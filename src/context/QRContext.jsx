import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ROUTES,
  getRouteForScreen,
  parsePathname,
  getPageTitle,
} from '../utils/routes';
import {
  INITIAL_QR_CODES,
  INITIAL_CAMPAIGNS,
  INITIAL_TEMPLATES,
  INITIAL_SCAN_EVENTS,
  INITIAL_PERMISSIONS_MATRIX,
  INITIAL_APPROVALS,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_HUBS,
} from '../data/mockData';

const QRContext = createContext(null);

// Factory for extracting wizard data from an existing QR code
const getWizardDataFromQR = (qr) => ({
  id: qr.id,
  name: qr.name || '',
  purpose: qr.purpose || '',
  type: qr.type || 'Campaign',
  owner: qr.owner || 'Anita Rao',
  department: qr.department || 'Marketing',
  campaign: qr.campaign || '',
  campaignId: qr.campaignId || 'CMP-001',
  hubId: qr.hubId || 'HUB-01',
  village: qr.village || '',
  trackingEnabled: qr.trackingEnabled ?? true,
  approvalRequired: qr.approvalRequired ?? false,
  vehicleId: qr.vehicleId || '',
  productId: qr.productId || '',
  referralCode: qr.referralCode || '',
  // Destination
  redirectCode: qr.destination?.redirectCode || '',
  androidUrl: qr.destination?.androidUrl || '',
  androidDeepLink: qr.destination?.androidDeepLink || '',
  iosUrl: qr.destination?.iosUrl || '',
  iosUniversalLink: qr.destination?.iosUniversalLink || '',
  fallbackUrl: qr.destination?.fallbackUrl || qr.destination?.androidUrl || '',
  routingBehavior: qr.destination?.routingBehavior || 'fallback_only',
  // Design
  template: qr.design?.template || 'VillagKart Branded',
  fgColor: qr.design?.fgColor || '#00891D',
  bgColor: qr.design?.bgColor || '#FFFFFF',
  showLogo: qr.design?.showLogo !== false,
  logoSrc: qr.design?.logoSrc || qr.design?.logoUrl || '',
  hasCtaFrame: qr.design?.hasCtaFrame !== false,
  ctaText: qr.design?.ctaText || 'SCAN FOR FRESH SAVINGS',
  campaignTitle: qr.design?.campaignTitle || '',
  supportingText: qr.design?.supportingText || '',
  quietZone: qr.design?.quietZone || 4,
  errorCorrection: qr.design?.errorCorrection || 'Q',
  // Export
  exportUnit: qr.exportUnit || 'cm',
  exportWidth: qr.exportWidth || 4,
  exportHeight: qr.exportHeight || 4,
  exportDpi: qr.exportDpi || 300,
  exportFormat: qr.exportFormat || 'SVG',
});

// Factory for fresh wizard starting state
const getInitialWizardData = () => ({
  name: 'New Phirangipuram Promo QR',
  type: 'Campaign',
  purpose: 'Promote seasonal fresh arrivals at village mandal collection hub',
  owner: 'Anita Rao',
  department: 'Marketing',
  campaignId: 'CMP-001',
  campaign: 'Phirangipuram Launch',
  hubId: 'HUB-01',
  village: 'Phirangipuram Village',
  startDate: new Date().toISOString().split('T')[0],
  neverEnding: true,
  expiryDate: 'Never Ending',
  trackingEnabled: true,
  approvalRequired: false,
  vehicleId: '',
  productId: '',
  referralCode: '',
  // Step 2 Destination
  redirectCode: 'vk-phr-promo',
  androidUrl: 'https://villagkart.com/campaign/phirangipuram-launch',
  androidDeepLink: 'villagkart://campaign/phirangipuram-launch?ref=vge901',
  iosUrl: 'https://apps.apple.com/in/app/villagkart-rural-fresh/id192837482',
  iosUniversalLink: 'https://villagkart.com/campaign/seasonal',
  fallbackUrl: 'https://villagkart.com/campaign/phirangipuram-launch',
  routingBehavior: 'fallback_only',
  // Step 3 Design Studio
  template: 'VillagKart Branded',
  fgColor: '#00891D',
  bgColor: '#FFFFFF',
  showLogo: true,
  hasCtaFrame: true,
  ctaText: 'SCAN FOR FRESH SAVINGS',
  campaignTitle: 'VillagKart Fresh Harvest',
  supportingText: 'Farm direct to your village doorstep',
  quietZone: 4,
  errorCorrection: 'Q',
  // Step 4 Export
  exportUnit: 'cm',
  exportWidth: 4,
  exportHeight: 4,
  exportDpi: 300,
  exportFormat: 'SVG',
});

const normalizeLifecycleStatus = (rawStatus) => {
  if (!rawStatus) return 'Active';
  const s = String(rawStatus).trim();
  if (s === 'Draft') return 'Draft';
  if (s === 'Pending Approval' || s === 'Pending for Approval' || s === 'Pending' || s === 'Under Review') {
    return 'Pending Approval';
  }
  if (s === 'Paused' || s === 'Pause' || s === 'Archived' || s === 'Changes Requested') {
    return 'Paused';
  }
  if (s === 'Expired') {
    return 'Expired';
  }
  return 'Active';
};

export const QRProvider = ({ children }) => {
  // Navigation & View Mode derived from browser URL
  const initialRoute = parsePathname(typeof window !== 'undefined' ? window.location.pathname : '/dashboard');
  const [activeScreen, setActiveScreen] = useState(initialRoute.screen || 'dashboard');
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [currentRole, setCurrentRole] = useState('Admin'); // 'Admin' | 'Marketing' | 'Hub Manager' | 'VGE'
  const [selectedQrId, setSelectedQrId] = useState(initialRoute.qrId || 'QR-00001');
  const [selectedCampaignId, setSelectedCampaignId] = useState('CMP-001');
  const [detailsViewMode, setDetailsViewMode] = useState('detail'); // Default to full detail view
  const [listingStatusFilter, setListingStatusFilter] = useState('all');
  const [wizardMode, setWizardMode] = useState(initialRoute.wizardMode || 'create'); // 'create' | 'edit'
  const [editingQrId, setEditingQrId] = useState(initialRoute.editingQrId || null);

  const goToListingWithStatus = (status = 'all') => {
    setListingStatusFilter(status);
    setActiveScreen('listing');
  };

  // Master Data: 5 valid lifecycle statuses: 'Active', 'Draft', 'Pending Approval', 'Paused', 'Expired'
  const [qrCodes, setQrCodes] = useState(() => {
    const saved = localStorage.getItem('vk_qr_codes');
    let baseList = INITIAL_QR_CODES;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const existingIds = new Set(parsed.map((q) => q.id));
        const missing = INITIAL_QR_CODES.filter((q) => !existingIds.has(q.id));
        baseList = [...parsed, ...missing];
      } catch {
        baseList = INITIAL_QR_CODES;
      }
    }
    return baseList.map((item) => {
      const match = INITIAL_QR_CODES.find((m) => m.id === item.id);
      const rawStatus = match ? match.status : item.status;
      return {
        ...item,
        status: normalizeLifecycleStatus(rawStatus),
      };
    });
  });

  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem('vk_campaigns');
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });

  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [scanEvents, setScanEvents] = useState(() => {
    const saved = localStorage.getItem('vk_scan_events');
    return saved ? JSON.parse(saved) : INITIAL_SCAN_EVENTS;
  });
  const [approvals, setApprovals] = useState(() => {
    const saved = localStorage.getItem('vk_approvals');
    if (!saved) return INITIAL_APPROVALS;
    try {
      const parsed = JSON.parse(saved);
      const existingIds = new Set(parsed.map((a) => a.id));
      const initialMap = new Map(INITIAL_APPROVALS.map((a) => [a.id, a]));
      const missing = INITIAL_APPROVALS.filter((a) => !existingIds.has(a.id));
      const updated = parsed.map((a) => {
        const initial = initialMap.get(a.id);
        if (initial && initial.status === 'Rejected') {
          return { ...a, status: 'Rejected', reviewerComments: initial.reviewerComments || a.reviewerComments };
        }
        if (a.status === 'Changes Requested') {
          return { ...a, status: 'Rejected', reviewerComments: a.reviewerComments || 'Rejected by governance reviewer.' };
        }
        return a;
      });
      return [...updated, ...missing];
    } catch {
      return INITIAL_APPROVALS;
    }
  });
  const [permissionsMatrix, setPermissionsMatrix] = useState(INITIAL_PERMISSIONS_MATRIX);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Global Toasts
  const [toasts, setToasts] = useState([]);

  // Create/Edit Wizard State (Screens 03, 04, 05, 06, 07)
  const [wizardStep, setWizardStep] = useState(1); // 1: Basic Details, 2: Destination, 3: Design Studio, 4: Export, 5: Review & Publish
  const [wizardData, setWizardData] = useState(() => {
    if (initialRoute.wizardMode === 'edit' && initialRoute.editingQrId) {
      const match = INITIAL_QR_CODES.find((q) => q.id === initialRoute.editingQrId);
      if (match) return getWizardDataFromQR(match);
    }
    return getInitialWizardData();
  });
  const [wizardNotification, setWizardNotification] = useState(null);

  // Reset wizard back to starting point (Step 1 with clean initial defaults)
  const resetWizard = (clearNotification = false) => {
    setWizardMode('create');
    setEditingQrId(null);
    setWizardStep(1);
    setWizardData(getInitialWizardData());
    if (clearNotification) setWizardNotification(null);
  };

  // Create QR Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const openCreateQRModal = (initialData = null) => {
    resetWizard(true);
    if (initialData) {
      setWizardData((prev) => ({ ...prev, ...initialData }));
    }
    setIsCreateModalOpen(true);
  };

  const closeCreateQRModal = () => {
    setIsCreateModalOpen(false);
  };

  // Start new QR code creation flow from anywhere
  const startNewQRCode = (initialData = null) => {
    setWizardMode('create');
    setEditingQrId(null);
    resetWizard(true);
    if (initialData) {
      setWizardData((prev) => ({ ...prev, ...initialData }));
    }
    setWizardStep(1);
    setActiveScreen('wizard');
  };

  // Start edit flow for an existing QR code with all its details pre-populated
  const startEditQRCode = (qr) => {
    if (!qr) return;
    setWizardMode('edit');
    setEditingQrId(qr.id);
    setSelectedQrId(qr.id);
    setWizardStep(1);
    setWizardNotification(null);
    setWizardData(getWizardDataFromQR(qr));
    setActiveScreen('wizard');
  };

  // Synchronize browser URL and document title
  useEffect(() => {
    const targetUrl = getRouteForScreen(activeScreen, {
      qrId: selectedQrId,
      wizardMode,
      editingQrId,
    });

    const currentUrl = window.location.pathname;
    if (currentUrl !== targetUrl) {
      if (currentUrl === '/' || currentUrl === '') {
        window.history.replaceState({ activeScreen, selectedQrId, wizardMode, editingQrId }, '', targetUrl);
      } else {
        window.history.pushState({ activeScreen, selectedQrId, wizardMode, editingQrId }, '', targetUrl);
      }
    }

    const currentQr = qrCodes?.find((q) => q.id === (editingQrId || selectedQrId));
    document.title = getPageTitle(activeScreen, {
      qr: currentQr,
      qrId: editingQrId || selectedQrId,
      wizardMode,
    });
  }, [activeScreen, selectedQrId, wizardMode, editingQrId, qrCodes]);

  // Handle browser back and forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parsePathname(window.location.pathname);
      setActiveScreen(parsed.screen);
      if (parsed.qrId) setSelectedQrId(parsed.qrId);
      if (parsed.wizardMode) setWizardMode(parsed.wizardMode);
      if (parsed.editingQrId) {
        setEditingQrId(parsed.editingQrId);
        const match = qrCodes.find((q) => q.id === parsed.editingQrId);
        if (match) setWizardData(getWizardDataFromQR(match));
      }
      if (parsed.screen === 'details') setDetailsViewMode('detail');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [qrCodes]);

  const navigateTo = (screen, options = {}) => {
    if (options.qrId) setSelectedQrId(options.qrId);
    if (options.wizardMode) setWizardMode(options.wizardMode);
    if (options.editingQrId) setEditingQrId(options.editingQrId);
    if (screen === 'details') setDetailsViewMode('detail');
    setActiveScreen(screen);
  };

  // Update existing QR code in place (preserving ID and scan metrics)
  const updateWizardQR = () => {
    if (!editingQrId) return;

    setQrCodes((prev) =>
      prev.map((item) => {
        if (item.id === editingQrId) {
          const currentVer = parseFloat((item.version || 'v1.0').replace('v', '')) || 1.0;
          const nextVersion = `v${(currentVer + 0.1).toFixed(1)}`;

          return {
            ...item,
            name: wizardData.name || item.name,
            purpose: wizardData.purpose !== undefined ? wizardData.purpose : item.purpose,
            type: wizardData.type || item.type,
            owner: wizardData.owner || item.owner,
            department: wizardData.department || item.department,
            campaign: wizardData.campaign || item.campaign,
            campaignId: wizardData.campaignId || item.campaignId,
            hubId: wizardData.hubId || item.hubId,
            village: wizardData.village || item.village,
            trackingEnabled: wizardData.trackingEnabled !== false,
            version: nextVersion,
            lastModified: new Date().toISOString().split('T')[0],
            destination: {
              ...item.destination,
              redirectCode: wizardData.redirectCode || item.destination?.redirectCode,
              androidUrl: wizardData.androidUrl || item.destination?.androidUrl,
              androidDeepLink: wizardData.androidDeepLink || item.destination?.androidDeepLink,
              iosUrl: wizardData.iosUrl || item.destination?.iosUrl,
              iosUniversalLink: wizardData.iosUniversalLink || item.destination?.iosUniversalLink,
              fallbackUrl: wizardData.fallbackUrl || item.destination?.fallbackUrl,
              routingBehavior: wizardData.routingBehavior || item.destination?.routingBehavior || 'fallback_only',
            },
            design: {
              ...item.design,
              fgColor: wizardData.fgColor || item.design?.fgColor,
              bgColor: wizardData.bgColor || item.design?.bgColor,
              showLogo: wizardData.showLogo !== false,
              logoSrc: wizardData.logoSrc || item.design?.logoSrc,
              hasCtaFrame: wizardData.hasCtaFrame !== false,
              ctaText: wizardData.ctaText || item.design?.ctaText,
              campaignTitle: wizardData.campaignTitle || item.design?.campaignTitle,
              supportingText: wizardData.supportingText || item.design?.supportingText,
              quietZone: wizardData.quietZone || item.design?.quietZone || 4,
              errorCorrection: wizardData.errorCorrection || item.design?.errorCorrection || 'Q',
            },
          };
        }
        return item;
      })
    );

    addAuditLog(
      'Updated QR Code',
      `${editingQrId} (${wizardData.name})`,
      'Configuration updated via Wizard'
    );

    showToast(`QR Code ${editingQrId} updated successfully!`, 'success');
    setSelectedQrId(editingQrId);
    setWizardMode('create');
    setEditingQrId(null);
    resetWizard();
    setActiveScreen('listing');
  };

  // Test Scan Modal Simulator
  const [testScanModal, setTestScanModal] = useState({
    isOpen: false,
    qrCode: null,
  });

  // Neat Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    qr: null,
    onSuccess: null,
  });

  const requestDeleteQR = (qr, onSuccess = null) => {
    if (!qr) return;
    setDeleteModal({
      isOpen: true,
      qr,
      onSuccess,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      qr: null,
      onSuccess: null,
    });
  };

  const confirmDeleteQR = () => {
    if (!deleteModal.qr) return;
    const targetId = deleteModal.qr.id;
    const callback = deleteModal.onSuccess;
    deleteQR(targetId);
    closeDeleteModal();
    if (callback) callback();
  };

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('vk_qr_codes', JSON.stringify(qrCodes));
  }, [qrCodes]);

  useEffect(() => {
    localStorage.setItem('vk_scan_events', JSON.stringify(scanEvents));
  }, [scanEvents]);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Add Audit Log Entry
  const addAuditLog = (action, reference, versionDiff, decision = 'Executed', outcome = 'Success') => {
    const newLog = {
      id: 'AUD-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: `${currentRole} User`,
      action,
      reference,
      versionDiff,
      decision,
      outcome,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Check Role Permission Helper
  const hasPermission = (permissionName) => {
    const perm = permissionsMatrix.find((p) => p.permission === permissionName);
    if (!perm) return true;
    if (currentRole === 'Admin') return true;
    if (currentRole === 'Marketing') return perm.marketing;
    if (currentRole === 'Hub Manager') return perm.hubManager;
    if (currentRole === 'VGE') return perm.vge;
    return false;
  };

  // QR Code Operations
  const togglePauseQR = (id) => {
    setQrCodes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStatus = item.status === 'Active' ? 'Paused' : 'Active';
          addAuditLog(
            `Status Changed to ${newStatus}`,
            `${item.id} (${item.name})`,
            `${item.status} -> ${newStatus}`
          );
          showToast(`QR Code ${item.id} is now ${newStatus}`);
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
  };

  const archiveQR = (id) => {
    setQrCodes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          addAuditLog('Archived QR Code', `${item.id} (${item.name})`, 'Status -> Archived');
          showToast(`QR Code ${item.id} archived`);
          return { ...item, status: 'Archived' };
        }
        return item;
      })
    );
  };

  const restoreQR = (id) => {
    setQrCodes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          addAuditLog('Restored QR Code', `${item.id} (${item.name})`, 'Status -> Active');
          showToast(`QR Code ${item.id} restored to Active`);
          return { ...item, status: 'Active' };
        }
        return item;
      })
    );
  };

  const deleteQR = (id) => {
    setQrCodes((prev) => prev.filter((item) => item.id !== id));
    addAuditLog('Deleted QR Code', id, 'Permanently removed');
    showToast(`QR Code ${id} permanently deleted`);
  };

  // Save new QR from wizard and submit for approval
  const publishWizardQR = () => {
    const newId = 'QR-000' + String(qrCodes.length + 1).padStart(2, '0');
    const hub = INITIAL_HUBS.find((h) => h.id === wizardData.hubId) || INITIAL_HUBS[0];
    const initialStatus = 'Pending Approval';

    const newQR = {
      id: newId,
      name: wizardData.name || `QR Code ${newId}`,
      type: wizardData.type || 'Campaign',
      status: initialStatus,
      campaign: wizardData.campaign || 'Direct Routing',
      campaignId: wizardData.campaignId || 'CMP-001',
      owner: wizardData.owner || 'Anita Rao',
      department: wizardData.department || 'Marketing',
      hubId: wizardData.hubId || 'HUB-01',
      hubName: hub.name,
      village: wizardData.village || 'Phirangipuram Village',
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      expiryDate: (wizardData.neverEnding || wizardData.expiryDate === 'Never Ending') ? 'Never Ending' : (wizardData.expiryDate || 'Never Ending'),
      trackingEnabled: wizardData.trackingEnabled !== false,
      approvalRequired: true,
      version: 'v1.0',
      reviewerComments: 'Awaiting administrative governance review.',
      destination: {
        redirectCode: wizardData.redirectCode || `vk-${Math.floor(1000 + Math.random() * 9000)}`,
        androidUrl: wizardData.androidUrl || wizardData.fallbackUrl,
        androidDeepLink: wizardData.androidDeepLink || '',
        iosUrl: wizardData.iosUrl || wizardData.fallbackUrl,
        iosUniversalLink: wizardData.iosUniversalLink || '',
        fallbackUrl: wizardData.fallbackUrl || 'https://villagkart.com',
        routingBehavior: wizardData.routingBehavior || 'fallback_only',
      },
      design: {
        template: wizardData.template || 'VillagKart Branded',
        fgColor: wizardData.fgColor || '#00891D',
        bgColor: wizardData.bgColor || '#FFFFFF',
        showLogo: wizardData.showLogo !== false,
        hasCtaFrame: wizardData.hasCtaFrame !== false,
        ctaText: wizardData.ctaText || 'SCAN FOR FRESH SAVINGS',
        campaignTitle: wizardData.campaignTitle || 'VillagKart Fresh Harvest',
        supportingText: wizardData.supportingText || 'Farm direct to your village doorstep',
        quietZone: wizardData.quietZone || 4,
        errorCorrection: wizardData.errorCorrection || 'Q',
      },
      metrics: {
        scans: 0,
        uniqueVisitors: 0,
        verifiedRegistrations: 0,
        firstOrders: 0,
        conversionRate: 0,
      },
    };

    setQrCodes((prev) => [newQR, ...prev]);

    const newApproval = {
      id: 'APP-' + Math.floor(100 + Math.random() * 900),
      qrId: newId,
      qrName: newQR.name,
      type: newQR.type,
      requestingUser: `${newQR.owner} (${newQR.department})`,
      submittedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      configVersion: 'v1.0',
      riskClassification: newQR.type === 'Campaign' ? 'Medium (Marketing Campaign)' : 'Standard (Operational Dynamic QR)',
      validationResults: {
        qrDecodes: true,
        destinationsActive: true,
        contrastScore: 98,
        utmValid: true,
      },
      status: 'Pending',
      reviewerComments: '',
    };
    setApprovals((prev) => [newApproval, ...prev]);
    addAuditLog('Created & Published', `${newId} (${newQR.name})`, 'Created and published QR config');
    showToast(`QR Code ${newId} published successfully! Added to QR Management.`, 'success');

    setSelectedQrId(newId);
    // Reset wizard back to starting point (Step 1 with clean initial defaults)
    resetWizard();
    setIsCreateModalOpen(false);
    setActiveScreen('listing');
    setWizardNotification({
      type: 'submitted',
      qrId: newId,
      name: newQR.name,
      message: `QR Code ${newId} (${newQR.name}) published successfully to QR Management!`,
      targetScreen: 'listing',
      targetLabel: 'View in QR Management',
    });
    return newId;
  };

  // Save new QR as Inactive Draft - does NOT submit to permissions or create an approval entry
  const saveWizardDraft = () => {
    const newId = 'QR-000' + String(qrCodes.length + 1).padStart(2, '0');
    const hub = INITIAL_HUBS.find((h) => h.id === wizardData.hubId) || INITIAL_HUBS[0];
    const initialStatus = 'Draft';

    const newQR = {
      id: newId,
      name: wizardData.name || `Draft QR ${newId}`,
      type: wizardData.type || 'Campaign',
      status: initialStatus,
      campaign: wizardData.campaign || 'Direct Routing',
      campaignId: wizardData.campaignId || 'CMP-001',
      owner: wizardData.owner || 'Anita Rao',
      department: wizardData.department || 'Marketing',
      hubId: wizardData.hubId || 'HUB-01',
      hubName: hub.name,
      village: wizardData.village || 'Phirangipuram Village',
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      expiryDate: (wizardData.neverEnding || wizardData.expiryDate === 'Never Ending') ? 'Never Ending' : (wizardData.expiryDate || 'Never Ending'),
      trackingEnabled: wizardData.trackingEnabled !== false,
      approvalRequired: false,
      version: 'v1.0 (Draft)',
      reviewerComments: 'Saved as inactive draft. Not submitted for administrative review.',
      destination: {
        redirectCode: wizardData.redirectCode || `vk-draft-${Math.floor(1000 + Math.random() * 9000)}`,
        androidUrl: wizardData.androidUrl || wizardData.fallbackUrl,
        androidDeepLink: wizardData.androidDeepLink || '',
        iosUrl: wizardData.iosUrl || wizardData.fallbackUrl,
        iosUniversalLink: wizardData.iosUniversalLink || '',
        fallbackUrl: wizardData.fallbackUrl || 'https://villagkart.com',
        routingBehavior: wizardData.routingBehavior || 'fallback_only',
      },
      design: {
        template: wizardData.template || 'VillagKart Branded',
        fgColor: wizardData.fgColor || '#00891D',
        bgColor: wizardData.bgColor || '#FFFFFF',
        showLogo: wizardData.showLogo !== false,
        hasCtaFrame: wizardData.hasCtaFrame !== false,
        ctaText: wizardData.ctaText || 'SCAN FOR FRESH SAVINGS',
        campaignTitle: wizardData.campaignTitle || 'VillagKart Fresh Harvest',
        supportingText: wizardData.supportingText || 'Farm direct to your village doorstep',
        quietZone: wizardData.quietZone || 4,
        errorCorrection: wizardData.errorCorrection || 'Q',
      },
      metrics: {
        scans: 0,
        uniqueVisitors: 0,
        verifiedRegistrations: 0,
        firstOrders: 0,
        conversionRate: 0,
      },
    };

    setQrCodes((prev) => [newQR, ...prev]);

    // Note: Do NOT add to approvals list! Inactive drafts do NOT go to Permissions & Approvals.
    addAuditLog('Saved Inactive Draft', `${newId} (${newQR.name})`, 'Saved as Draft in QR Management');
    showToast(`QR Code ${newId} saved as Inactive Draft in QR Management.`);

    setSelectedQrId(newId);
    // Reset wizard back to starting point (Step 1 with clean initial defaults)
    resetWizard();
    setIsCreateModalOpen(false);
    setActiveScreen('listing');
    setWizardNotification({
      type: 'draft',
      qrId: newId,
      name: newQR.name,
      message: `QR Code ${newId} (${newQR.name}) saved as inactive draft!`,
      targetScreen: 'listing',
      targetLabel: 'View in QR Management',
    });
    return newId;
  };

  // Simulate Real Scan Event
  const simulateScan = (qr, simulatedDevice = 'Android 14 (Redmi 12 5G)', triggerConversion = false) => {
    const isBot = simulatedDevice.includes('Bot');
    const outcome = isBot ? 'Bot Filtered' : 'Redirected';
    let conversionText = 'None (Catalog Browsed)';
    if (!isBot && triggerConversion) {
      conversionText = `Verified Registration (#REG-${Math.floor(10000 + Math.random() * 90000)})`;
    }

    const newScan = {
      id: 'EVT-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      qrId: qr.id,
      qrName: qr.name,
      campaign: qr.campaign || 'Direct Routing',
      source: qr.type === 'Vehicle' ? 'Vehicle Van Vinyl' : 'Direct Print / Flyer',
      medium: 'QR Scan Event',
      hub: qr.hubName || 'Phirangipuram Hub',
      village: qr.village || 'Phirangipuram Village',
      device: simulatedDevice,
      outcome,
      conversion: conversionText,
      ipCountry: 'India (Andhra Pradesh)',
      durationMs: Math.floor(180 + Math.random() * 200),
    };

    setScanEvents((prev) => [newScan, ...prev]);

    // Increment QR metrics
    setQrCodes((prev) =>
      prev.map((item) => {
        if (item.id === qr.id) {
          const newScans = (item.metrics?.scans || 0) + (isBot ? 0 : 1);
          const newUnique = (item.metrics?.uniqueVisitors || 0) + (isBot ? 0 : 1);
          const newReg = (item.metrics?.verifiedRegistrations || 0) + (triggerConversion ? 1 : 0);
          const newOrders = (item.metrics?.firstOrders || 0) + (triggerConversion ? 1 : 0);
          const newRate = newScans > 0 ? ((newReg / newScans) * 100).toFixed(1) : 0;
          return {
            ...item,
            metrics: {
              ...item.metrics,
              scans: newScans,
              uniqueVisitors: newUnique,
              verifiedRegistrations: newReg,
              firstOrders: newOrders,
              conversionRate: parseFloat(newRate),
            },
          };
        }
        return item;
      })
    );

    showToast(`Simulated Scan processed for ${qr.id} (${simulatedDevice})`);
  };

  // Approve / Reject in queue (Strictly Active or Paused)
  const handleApprovalAction = (approvalOrQrId, action, comments = '') => {
    let targetQrId = approvalOrQrId;
    let targetQrName = '';
    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';

    const matchingApp = approvals.find((a) => a.id === approvalOrQrId || a.qrId === approvalOrQrId);
    if (matchingApp) {
      targetQrId = matchingApp.qrId;
      targetQrName = matchingApp.qrName;
    } else {
      const matchingQr = qrCodes.find((q) => q.id === approvalOrQrId);
      if (matchingQr) {
        targetQrName = matchingQr.name;
      }
    }

    setApprovals((prev) =>
      prev.map((app) => {
        if (app.id === approvalOrQrId || app.qrId === approvalOrQrId) {
          return { ...app, status: newStatus, reviewerComments: comments };
        }
        return app;
      })
    );

    // Update QR code status: strictly Active or Paused
    const nextQrStatus = action === 'approve' ? 'Active' : 'Paused';

    setQrCodes((qrs) =>
      qrs.map((q) => {
        if (q.id === targetQrId || q.id === approvalOrQrId || (targetQrId === null && q.id === selectedQrId)) {
          return {
            ...q,
            status: nextQrStatus,
            reviewerComments: comments || (action === 'reject' ? 'Reviewer paused pending QR.' : 'Accepted and activated.'),
            lastModified: new Date().toISOString().split('T')[0],
          };
        }
        return q;
      })
    );

    addAuditLog(
      `Approval Action: ${action === 'approve' ? 'Accepted & Activated' : 'Rejected to Paused'}`,
      `${targetQrId || approvalOrQrId} (${targetQrName || 'QR Code'})`,
      comments || `Status -> ${nextQrStatus}`,
      action === 'approve' ? 'Approved' : 'Paused'
    );

    if (action === 'approve') {
      showToast(`QR Code ${targetQrName ? `"${targetQrName}"` : targetQrId || approvalOrQrId} accepted & activated!`, 'success');
      if (targetQrId) setSelectedQrId(targetQrId);
    } else {
      showToast(`QR Code ${targetQrName ? `"${targetQrName}"` : targetQrId || approvalOrQrId} set to Paused.`, 'info');
      if (targetQrId) setSelectedQrId(targetQrId);
    }
  };

  return (
    <QRContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        viewMode,
        setViewMode,
        currentRole,
        setCurrentRole,
        selectedQrId,
        setSelectedQrId,
        detailsViewMode,
        setDetailsViewMode,
        selectedCampaignId,
        setSelectedCampaignId,
        qrCodes,
        setQrCodes,
        campaigns,
        setCampaigns,
        templates,
        setTemplates,
        scanEvents,
        approvals,
        permissionsMatrix,
        setPermissionsMatrix,
        settings,
        setSettings,
        auditLogs,
        toasts,
        showToast,
        addAuditLog,
        hasPermission,
        togglePauseQR,
        archiveQR,
        restoreQR,
        deleteQR,
        wizardStep,
        setWizardStep,
        wizardMode,
        setWizardMode,
        editingQrId,
        setEditingQrId,
        wizardData,
        setWizardData,
        wizardNotification,
        setWizardNotification,
        publishWizardQR,
        saveWizardDraft,
        resetWizard,
        startNewQRCode,
        startEditQRCode,
        updateWizardQR,
        isCreateModalOpen,
        setIsCreateModalOpen,
        openCreateQRModal,
        closeCreateQRModal,
        getInitialWizardData,
        testScanModal,
        setTestScanModal,
        simulateScan,
        handleApprovalAction,
        listingStatusFilter,
        setListingStatusFilter,
        goToListingWithStatus,
        deleteModal,
        setDeleteModal,
        requestDeleteQR,
        closeDeleteModal,
        confirmDeleteQR,
        ROUTES,
        navigateTo,
      }}
    >
      {children}
    </QRContext.Provider>
  );
};

export const useQR = () => {
  const context = useContext(QRContext);
  if (!context) throw new Error('useQR must be used within a QRProvider');
  return context;
};
