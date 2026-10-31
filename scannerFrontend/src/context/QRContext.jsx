import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ROUTES,
  parsePathname,
} from '../utils/routes';
import {
  INITIAL_HUBS,
  INITIAL_SETTINGS,
  INITIAL_QR_CODES,
  INITIAL_CAMPAIGNS,
  INITIAL_SCAN_EVENTS,
  INITIAL_APPROVALS,
  INITIAL_AUDIT_LOGS,
  INITIAL_TEMPLATES,
} from '../data/mockData';
import { qrApi } from '../services/api';

const QRContext = createContext(null);

export const getWizardDataFromQR = (qr) => ({
  id: qr.id,
  name: qr.name || '',
  purpose: qr.purpose || '',
  type: qr.type || 'Campaign',
  owner: qr.owner || 'Anita Rao',
  department: qr.department || 'Marketing',
  campaign: qr.campaign || '',
  campaignId: qr.campaignId || 'CMP-001',
  hubId: qr.hubId || (INITIAL_HUBS[0]?.id || 'HUB-01'),
  village: qr.village || '',
  trackingEnabled: qr.trackingEnabled ?? true,
  approvalRequired: qr.approvalRequired ?? false,
  vehicleId: qr.vehicleId || '',
  productId: qr.productId || '',
  referralCode: qr.referralCode || '',
  startDate: qr.startDate || (qr.createdAt ? qr.createdAt.substring(0, 10) : new Date().toISOString().split('T')[0]),
  neverEnding: qr.neverEnding !== false && (!qr.expiryDate || qr.expiryDate === 'Never Ending'),
  expiryDate: qr.expiryDate || 'Never Ending',
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

export const getInitialWizardData = () => ({
  name: '',
  type: 'Campaign',
  purpose: '',
  owner: '',
  department: '',
  campaignId: '',
  campaign: '',
  hubId: INITIAL_HUBS[0]?.id || '',
  village: '',
  startDate: new Date().toISOString().split('T')[0],
  neverEnding: true,
  expiryDate: 'Never Ending',
  trackingEnabled: true,
  approvalRequired: false,
  vehicleId: '',
  productId: '',
  referralCode: '',
  // Step 2 Destination
  redirectCode: '',
  androidUrl: '',
  androidDeepLink: '',
  iosUrl: '',
  iosUniversalLink: '',
  fallbackUrl: '',
  routingBehavior: 'fallback_only',
  // Step 3 Design Studio
  template: 'VillagKart Branded',
  fgColor: '#00891D',
  bgColor: '#FFFFFF',
  showLogo: true,
  hasCtaFrame: true,
  ctaText: 'SCAN TO DOWNLOAD',
  campaignTitle: '',
  supportingText: '',
  quietZone: 4,
  errorCorrection: 'Q',
  // Step 4 Export
  exportUnit: 'cm',
  exportWidth: 4,
  exportHeight: 4,
  exportDpi: 300,
  exportFormat: 'SVG',
});

export const normalizeLifecycleStatus = (rawStatus) => {
  if (!rawStatus) return 'Pending Approval';
  const s = String(rawStatus).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (s === 'DRAFT') return 'Draft';
  if (s === 'PENDING' || s === 'PENDING_APPROVAL' || s === 'PENDING_FOR_APPROVAL' || s === 'UNDER_REVIEW') {
    return 'Pending Approval';
  }
  if (s === 'PAUSED' || s === 'PAUSE' || s === 'ARCHIVED' || s === 'CHANGES_REQUESTED') {
    return 'Paused';
  }
  if (s === 'REJECTED' || s === 'REJECT') {
    return 'Rejected';
  }
  if (s === 'EXPIRED') {
    return 'Expired';
  }
  if (s === 'ACTIVE' || s === 'ACCEPTED' || s === 'APPROVED') {
    return 'Active';
  }
  return 'Pending Approval';
};

export const QRProvider = ({ children }) => {
  const initialRoute = parsePathname(typeof window !== 'undefined' ? window.location.pathname : '/dashboard');
  const [activeScreen, setActiveScreen] = useState(initialRoute.screen || 'dashboard');
  const [viewMode, setViewMode] = useState('desktop');
  const [currentRole, setCurrentRole] = useState('Admin');
  const [selectedQrId, setSelectedQrId] = useState(initialRoute.qrId || null);
  const [detailsViewMode, setDetailsViewMode] = useState('detail');
  const [listingStatusFilter, setListingStatusFilter] = useState('all');
  const [wizardMode, setWizardMode] = useState(initialRoute.wizardMode || 'create');
  const [editingQrId, setEditingQrId] = useState(initialRoute.editingQrId || null);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Hubs state
  const [hubs, setHubs] = useState(INITIAL_HUBS);

  // Master Data
  const [qrCodes, setQrCodes] = useState(() => {
    const saved = localStorage.getItem('vk_qr_codes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((item) => ({
          ...item,
          status: normalizeLifecycleStatus(item.status),
        }));
      } catch {
        // Fall back to empty
      }
    }
    return INITIAL_QR_CODES;
  });

  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem('vk_campaigns');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_CAMPAIGNS;
  });

  const [templates] = useState(INITIAL_TEMPLATES);
  const [scanEvents, setScanEvents] = useState(() => {
    const saved = localStorage.getItem('vk_scan_events');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_SCAN_EVENTS;
  });

  const [approvals, setApprovals] = useState(() => {
    const saved = localStorage.getItem('vk_approvals');
    if (!saved) return INITIAL_APPROVALS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_APPROVALS;
    }
  });

  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('vk_audit_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [toasts, setToasts] = useState([]);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState(() => {
    if (initialRoute.wizardMode === 'edit' && initialRoute.editingQrId) {
      const match = qrCodes.find((q) => q.id === initialRoute.editingQrId);
      if (match) return getWizardDataFromQR(match);
    }
    return getInitialWizardData();
  });
  const [wizardNotification, setWizardNotification] = useState(null);

  const [testScanModal, setTestScanModal] = useState({
    isOpen: false,
    qrCode: null,
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    qr: null,
    onSuccess: null,
  });

  // Fetch initial hubs and QR data from API with clean fallback
  const fetchHubs = useCallback(async () => {
    try {
      const res = await qrApi.getHubs();
      if (res?.data && Array.isArray(res.data)) {
        setHubs(res.data);
      }
    } catch (err) {
      // Keep existing hubs without crashing
      console.warn('[QRStudio] Failed to load hubs from API:', err.message);
    }
  }, []);

  const fetchQRCodes = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await qrApi.getQRCodes();
      if (res?.data && Array.isArray(res.data)) {
        setQrCodes(res.data.map((q) => ({
          ...q,
          status: normalizeLifecycleStatus(q.status),
        })));
      }
    } catch (err) {
      console.warn('[QRStudio] Failed to fetch QR codes from API, using persisted store:', err.message);
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchScanEvents = useCallback(async () => {
    try {
      const res = await qrApi.getScanEvents();
      if (res?.data && Array.isArray(res.data)) {
        setScanEvents(res.data);
      }
    } catch (err) {
      console.warn('[QRStudio] Failed to load scan events from API:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchHubs();
    fetchQRCodes();
    fetchScanEvents();
  }, [fetchHubs, fetchQRCodes, fetchScanEvents]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vk_qr_codes', JSON.stringify(qrCodes));
    } catch {
      // LocalStorage full
    }
  }, [qrCodes]);

  useEffect(() => {
    try {
      localStorage.setItem('vk_scan_events', JSON.stringify(scanEvents));
    } catch {
      // LocalStorage full
    }
  }, [scanEvents]);

  useEffect(() => {
    try {
      localStorage.setItem('vk_audit_logs', JSON.stringify(auditLogs));
    } catch {
      // LocalStorage full
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('vk_approvals', JSON.stringify(approvals));
    } catch {
      // LocalStorage full
    }
  }, [approvals]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const addAuditLog = useCallback((action, reference, versionDiff, decision = 'Executed', outcome = 'Success') => {
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
  }, [currentRole]);

  const resetWizard = useCallback((clearNotification = false) => {
    setWizardMode('create');
    setEditingQrId(null);
    setWizardStep(1);
    setWizardData(getInitialWizardData());
    if (clearNotification) setWizardNotification(null);
  }, []);

  const startNewQRCode = useCallback((initialData = null) => {
    resetWizard(true);
    if (initialData) {
      setWizardData((prev) => ({ ...prev, ...initialData }));
    }
    setActiveScreen('wizard');
  }, [resetWizard]);

  const startEditQRCode = useCallback((qr) => {
    if (!qr) return;
    setWizardMode('edit');
    setEditingQrId(qr.id);
    setWizardStep(1);
    setWizardData(getWizardDataFromQR(qr));
    setWizardNotification(null);
    setActiveScreen('wizard');
  }, []);

  const goToListingWithStatus = useCallback((status = 'all') => {
    setListingStatusFilter(status);
    setActiveScreen('listing');
  }, []);

  const togglePauseQR = useCallback((id) => {
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
          qrApi.updateQRCode(id, { status: newStatus }).catch((err) => {
            console.warn('[QRStudio] Failed updating status in backend DB:', err.message);
          });
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
  }, [addAuditLog, showToast]);

  const deleteQR = useCallback((id) => {
    setQrCodes((prev) => prev.filter((item) => item.id !== id));
    addAuditLog('Deleted QR Code', id, 'Permanently removed');
    showToast(`QR Code ${id} permanently deleted`);
    qrApi.deleteQRCode(id).catch((err) => {
      console.warn('[QRStudio] Failed deleting QR from backend DB:', err.message);
    });
  }, [addAuditLog, showToast]);

  const requestDeleteQR = useCallback((qr, onSuccess = null) => {
    if (!qr) return;
    setDeleteModal({
      isOpen: true,
      qr,
      onSuccess,
    });
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      qr: null,
      onSuccess: null,
    });
  }, []);

  const confirmDeleteQR = useCallback(() => {
    if (!deleteModal.qr) return;
    const targetId = deleteModal.qr.id;
    const callback = deleteModal.onSuccess;
    deleteQR(targetId);
    closeDeleteModal();
    if (callback) callback();
  }, [deleteModal, deleteQR, closeDeleteModal]);

  const publishWizardQR = useCallback(() => {
    const newId = 'QR-' + Date.now();
    const hub = hubs.find((h) => h.id === wizardData.hubId) || hubs[0] || { name: 'Phirangipuram Warehouse', id: 'HUB-01' };
    const initialStatus = 'Pending Approval';

    const isNeverEnding = wizardData.neverEnding !== false && (!wizardData.expiryDate || wizardData.expiryDate === 'Never Ending');
    const resolvedExpiry = isNeverEnding ? 'Never Ending' : (wizardData.expiryDate || 'Never Ending');

    const newQR = {
      id: newId,
      name: wizardData.name || `QR Code ${newId}`,
      purpose: wizardData.purpose || '',
      type: wizardData.type || 'Campaign',
      status: initialStatus,
      campaign: wizardData.campaign || 'Direct Routing',
      campaignId: wizardData.campaignId || 'CMP-001',
      owner: wizardData.owner || 'Anita Rao',
      department: wizardData.department || 'Marketing',
      hubId: wizardData.hubId || hub.id,
      hubName: hub.name,
      village: wizardData.village || 'Phirangipuram Village',
      startDate: wizardData.startDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      neverEnding: isNeverEnding,
      expiryDate: resolvedExpiry,
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

    // Persist to PostgreSQL database via backend API
    qrApi.createQRCode(newQR).catch((err) => {
      console.warn('[QRStudio] Failed saving QR to backend DB:', err.message);
    });

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
    resetWizard();
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
  }, [wizardData, hubs, addAuditLog, showToast, resetWizard]);

  const saveWizardDraft = useCallback(() => {
    const newId = 'QR-' + Date.now();
    const hub = hubs.find((h) => h.id === wizardData.hubId) || hubs[0] || { name: 'Phirangipuram Warehouse', id: 'HUB-01' };
    const initialStatus = 'Draft';

    const isNeverEnding = wizardData.neverEnding !== false && (!wizardData.expiryDate || wizardData.expiryDate === 'Never Ending');
    const resolvedExpiry = isNeverEnding ? 'Never Ending' : (wizardData.expiryDate || 'Never Ending');

    const newQR = {
      id: newId,
      name: wizardData.name || `Draft QR ${newId}`,
      purpose: wizardData.purpose || '',
      type: wizardData.type || 'Campaign',
      status: initialStatus,
      campaign: wizardData.campaign || 'Direct Routing',
      campaignId: wizardData.campaignId || 'CMP-001',
      owner: wizardData.owner || 'Anita Rao',
      department: wizardData.department || 'Marketing',
      hubId: wizardData.hubId || hub.id,
      hubName: hub.name,
      village: wizardData.village || 'Phirangipuram Village',
      startDate: wizardData.startDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      neverEnding: isNeverEnding,
      expiryDate: resolvedExpiry,
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

    // Persist to PostgreSQL database via backend API
    qrApi.createQRCode(newQR).catch((err) => {
      console.warn('[QRStudio] Failed saving QR to backend DB:', err.message);
    });
    addAuditLog('Saved Inactive Draft', `${newId} (${newQR.name})`, 'Saved as Draft in QR Management');
    showToast(`QR Code ${newId} saved as Inactive Draft in QR Management.`);

    setSelectedQrId(newId);
    resetWizard();
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
  }, [wizardData, hubs, addAuditLog, showToast, resetWizard]);

  const updateWizardQR = useCallback(() => {
    if (!editingQrId) return;

    setQrCodes((prev) =>
      prev.map((item) => {
        if (item.id === editingQrId) {
          const isNeverEnding = wizardData.neverEnding !== false && (!wizardData.expiryDate || wizardData.expiryDate === 'Never Ending');
          const resolvedExpiry = isNeverEnding ? 'Never Ending' : (wizardData.expiryDate || item.expiryDate || 'Never Ending');
          return {
            ...item,
            name: wizardData.name || item.name,
            purpose: wizardData.purpose || item.purpose,
            type: wizardData.type || item.type,
            owner: wizardData.owner || item.owner,
            department: wizardData.department || item.department,
            campaign: wizardData.campaign || item.campaign,
            campaignId: wizardData.campaignId || item.campaignId,
            hubId: wizardData.hubId || item.hubId,
            village: wizardData.village || item.village,
            trackingEnabled: wizardData.trackingEnabled !== false,
            startDate: wizardData.startDate || item.startDate,
            neverEnding: isNeverEnding,
            expiryDate: resolvedExpiry,
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

    // Persist to PostgreSQL database via backend API
    qrApi.updateQRCode(editingQrId, {
      name: wizardData.name,
      purpose: wizardData.purpose,
      type: wizardData.type,
      owner: wizardData.owner,
      department: wizardData.department,
      campaign: wizardData.campaign,
      hubId: wizardData.hubId,
      village: wizardData.village,
      trackingEnabled: wizardData.trackingEnabled !== false,
      neverEnding: wizardData.neverEnding !== false,
      startDate: wizardData.startDate,
      expiryDate: (wizardData.neverEnding || wizardData.expiryDate === 'Never Ending') ? 'Never Ending' : (wizardData.expiryDate || 'Never Ending'),
      destination: {
        redirectCode: wizardData.redirectCode,
        androidUrl: wizardData.androidUrl,
        iosUrl: wizardData.iosUrl,
        fallbackUrl: wizardData.fallbackUrl,
        routingBehavior: wizardData.routingBehavior || 'fallback_only',
      },
      design: {
        fgColor: wizardData.fgColor,
        bgColor: wizardData.bgColor,
        showLogo: wizardData.showLogo !== false,
        hasCtaFrame: wizardData.hasCtaFrame !== false,
        ctaText: wizardData.ctaText,
        campaignTitle: wizardData.campaignTitle,
        supportingText: wizardData.supportingText,
      },
    }).catch((err) => {
      console.warn('[QRStudio] Failed to sync QR update to DB:', err.message);
    });

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
  }, [editingQrId, wizardData, addAuditLog, showToast, resetWizard]);

  const simulateScan = useCallback((qr, simulatedDevice = 'Desktop', triggerConversion = false) => {
    const isBot = simulatedDevice.includes('Bot');
    const outcome = isBot ? 'Bot Filtered' : 'Redirected';
    let conversionText = 'None (Catalog Browsed)';
    if (!isBot && triggerConversion) {
      conversionText = `Verified Registration (#REG-${Math.floor(10000 + Math.random() * 90000)})`;
    }

    const eventId = 'EVT-' + Math.floor(1000 + Math.random() * 9000);
    const purposeText = `${qr.purpose || ''} ${qr.design?.purpose || ''} ${qr.type || ''} ${qr.name || ''}`.toLowerCase();
    let resolvedSource = 'Direct Print / Flyer';
    if (purposeText.includes('vehicle') || purposeText.includes('van') || purposeText.includes('vinyl')) {
      resolvedSource = 'Vehicle Vinyl Sticker';
    } else if (purposeText.includes('product') || purposeText.includes('label') || purposeText.includes('crate')) {
      resolvedSource = 'Product Label';
    } else if (purposeText.includes('hub') || purposeText.includes('banner') || purposeText.includes('facade')) {
      resolvedSource = 'Hub Facade Banner';
    } else if (purposeText.includes('poster') || purposeText.includes('reatchall')) {
      resolvedSource = 'Direct Print / Poster';
    } else if (purposeText.includes('flyer') || purposeText.includes('leaflet')) {
      resolvedSource = 'Direct Print / Flyer';
    }

    const newScan = {
      id: eventId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      qrId: qr.id,
      qrName: qr.name,
      campaign: qr.campaign || 'Direct Routing',
      source: resolvedSource,
      medium: 'QR Scan Event',
      hub: qr.hubName || qr.hub || hubs[0]?.name || 'Phirangipuram Warehouse',
      village: qr.village || 'Phirangipuram Village',
      device: simulatedDevice,
      outcome,
      conversion: conversionText,
      triggerConversion: !isBot && triggerConversion,
      ipCountry: 'India (Andhra Pradesh)',
      durationMs: Math.floor(180 + Math.random() * 200),
    };

    setScanEvents((prev) => [newScan, ...prev.filter((e) => e.id !== eventId)]);

    // Persist scan event directly into PostgreSQL database via backend API
    qrApi.recordScan(newScan).catch((err) => {
      console.warn('[QRStudio] Failed to record scan event in DB:', err.message);
    });

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

    addAuditLog(
      'Simulated QR Scan',
      `${qr.id} (${qr.name})`,
      `Outcome: ${outcome} | Conversion: ${conversionText}`
    );
  }, [hubs, addAuditLog]);

  const handleApprovalAction = useCallback((approvalOrQrId, action, comments = '') => {
    let targetApproval = approvals.find((a) => a.id === approvalOrQrId || a.qrId === approvalOrQrId);
    let targetQrId = targetApproval ? targetApproval.qrId : approvalOrQrId;
    let targetQr = qrCodes.find((q) => q.id === targetQrId);
    const targetQrName = targetQr?.name || targetApproval?.qrName || '';

    const newApprovalStatus = action === 'approve' ? 'Approved' : 'Rejected';
    const nextQrStatus = action === 'approve' ? 'Active' : 'Rejected';

    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id === approvalOrQrId || a.qrId === approvalOrQrId) {
          return {
            ...a,
            status: newApprovalStatus,
            reviewerComments: comments || (action === 'approve' ? 'Governance checks passed.' : 'Rejected by governance reviewer.'),
          };
        }
        return a;
      })
    );

    setQrCodes((prev) =>
      prev.map((q) => {
        if (q.id === targetQrId || q.id === approvalOrQrId) {
          return {
            ...q,
            status: nextQrStatus,
            reviewerComments: comments || (action === 'approve' ? 'Approved by admin governance.' : 'Rejected by admin governance.'),
          };
        }
        return q;
      })
    );

    if (targetQrId) {
      qrApi.updateQRCode(targetQrId, { status: nextQrStatus, reviewerComments: comments }).catch((err) => {
        console.warn('[QRStudio] Failed to sync approval status to backend:', err.message);
      });
    }

    addAuditLog(
      `Approval Action: ${action === 'approve' ? 'Accepted & Activated' : 'Rejected'}`,
      `${targetQrId || approvalOrQrId} (${targetQrName || 'QR Code'})`,
      comments || `Status -> ${nextQrStatus}`,
      action === 'approve' ? 'Approved' : 'Rejected'
    );

    if (action === 'approve') {
      showToast(`QR Code ${targetQrName ? `"${targetQrName}"` : targetQrId || approvalOrQrId} accepted & activated!`, 'success');
      if (targetQrId) setSelectedQrId(targetQrId);
    } else {
      showToast(`QR Code ${targetQrName ? `"${targetQrName}"` : targetQrId || approvalOrQrId} rejected.`, 'error');
      if (targetQrId) setSelectedQrId(targetQrId);
    }
  }, [approvals, qrCodes, addAuditLog, showToast]);

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
        qrCodes,
        setQrCodes,
        campaigns,
        setCampaigns,
        templates,
        scanEvents,
        approvals,
        settings,
        setSettings,
        auditLogs,
        hubs,
        isLoading,
        apiError,
        fetchQRCodes,
        fetchScanEvents,
        toasts,
        showToast,
        addAuditLog,
        togglePauseQR,
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
