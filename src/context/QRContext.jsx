import React, { createContext, useContext, useState, useEffect } from 'react';
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
  INITIAL_VILLAGES,
} from '../data/mockData';

const QRContext = createContext(null);

// Factory for fresh wizard starting state
export const getInitialWizardData = () => ({
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
  expiryDate: '2026-12-31',
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

export const QRProvider = ({ children }) => {
  // Navigation & View Mode
  const [activeScreen, setActiveScreen] = useState('dashboard'); // 'dashboard', 'listing', 'wizard', 'details', 'scan-history', 'analytics', 'campaigns', 'campaign-detail', 'templates', 'referrals', 'permissions', 'settings'
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [currentRole, setCurrentRole] = useState('Admin'); // 'Admin' | 'Marketing' | 'Hub Manager' | 'VGE'
  const [selectedQrId, setSelectedQrId] = useState('QR-00001');
  const [selectedCampaignId, setSelectedCampaignId] = useState('CMP-001');

  // Master Data
  const [qrCodes, setQrCodes] = useState(() => {
    const saved = localStorage.getItem('vk_qr_codes');
    if (!saved) return INITIAL_QR_CODES;
    try {
      const parsed = JSON.parse(saved);
      const existingIds = new Set(parsed.map((q) => q.id));
      const missing = INITIAL_QR_CODES.filter((q) => !existingIds.has(q.id));
      const updated = parsed.map((item) => {
        if (item.id === 'QR-00013' && item.status === 'Changes Requested') {
          return { ...item, status: 'Active' };
        }
        return item;
      });
      return [...updated, ...missing];
    } catch {
      return INITIAL_QR_CODES;
    }
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
  const [approvals, setApprovals] = useState(INITIAL_APPROVALS);
  const [permissionsMatrix, setPermissionsMatrix] = useState(INITIAL_PERMISSIONS_MATRIX);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Global Toasts
  const [toasts, setToasts] = useState([]);

  // Create/Edit Wizard State (Screens 03, 04, 05, 06, 07)
  const [wizardStep, setWizardStep] = useState(1); // 1: Basic Details, 2: Destination, 3: Design Studio, 4: Export, 5: Review & Publish
  const [wizardData, setWizardData] = useState(getInitialWizardData);
  const [wizardNotification, setWizardNotification] = useState(null);

  // Reset wizard back to starting point (Step 1 with clean initial defaults)
  const resetWizard = (clearNotification = false) => {
    setWizardStep(1);
    setWizardData(getInitialWizardData());
    if (clearNotification) setWizardNotification(null);
  };

  // Start new QR code creation flow from beginning
  const startNewQRCode = () => {
    resetWizard(true);
    setActiveScreen('wizard');
  };

  // Test Scan Modal Simulator
  const [testScanModal, setTestScanModal] = useState({
    isOpen: false,
    qrCode: null,
  });

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
      expiryDate: wizardData.expiryDate || '2026-12-31',
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
      riskClassification: newQR.type === 'Payment' ? 'High (Payment Flow)' : 'Medium (Marketing Campaign)',
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
    addAuditLog('Submitted for Approval', `${newId} (${newQR.name})`, 'Created new QR config');
    showToast(`QR Code ${newId} generated! Submitted to Permissions & Approvals for review.`, 'warning');

    setSelectedQrId(newId);
    // Reset wizard back to starting point (Step 1 with clean initial defaults)
    resetWizard();
    setWizardNotification({
      type: 'submitted',
      qrId: newId,
      name: newQR.name,
      message: `QR Code ${newId} (${newQR.name}) generated & submitted for approval! Wizard is reset to Step 1 so you can create another QR code, or switch screens when you are ready.`,
      targetScreen: 'permissions',
      targetLabel: 'View in Permissions & Approvals',
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
      expiryDate: wizardData.expiryDate || '2026-12-31',
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
    addAuditLog('Saved Inactive Draft', `${newId} (${newQR.name})`, 'Saved as Draft in QR Inventory');
    showToast(`QR Code ${newId} saved as Inactive Draft in QR Inventory.`);

    setSelectedQrId(newId);
    // Reset wizard back to starting point (Step 1 with clean initial defaults)
    resetWizard();
    setWizardNotification({
      type: 'draft',
      qrId: newId,
      name: newQR.name,
      message: `QR Code ${newId} (${newQR.name}) saved as inactive draft! Wizard is reset to Step 1 so you can create another QR code, or switch screens when you are ready.`,
      targetScreen: 'listing',
      targetLabel: 'View in QR Inventory',
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

  // Approve / Reject in queue
  const handleApprovalAction = (approvalId, action, comments = '') => {
    let targetQrId = null;
    let targetQrName = '';
    const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Changes Requested';

    setApprovals((prev) =>
      prev.map((app) => {
        if (app.id === approvalId) {
          targetQrId = app.qrId;
          targetQrName = app.qrName;
          return { ...app, status: newStatus, reviewerComments: comments };
        }
        return app;
      })
    );

    // Update QR code status
    setQrCodes((qrs) =>
      qrs.map((q) => {
        if (q.id === targetQrId || (targetQrId === null && q.id === selectedQrId)) {
          const qrStatus = action === 'approve' ? 'Active' : action === 'reject' ? 'Rejected' : 'Changes Requested';
          return {
            ...q,
            status: qrStatus,
            reviewerComments: comments || (action === 'request_changes' ? 'Reviewer requested configuration or artwork changes.' : action === 'reject' ? 'Rejected by governance reviewer.' : ''),
            lastModified: new Date().toISOString().split('T')[0],
          };
        }
        return q;
      })
    );

    addAuditLog(
      `Approval Action: ${newStatus}`,
      `${targetQrId || approvalId} (${targetQrName || 'QR Code'})`,
      comments || `Reviewer action: ${newStatus}`,
      newStatus
    );

    if (action === 'approve') {
      showToast(`QR Code ${targetQrId || approvalId} approved! Now live in QR Inventory.`, 'success');
      if (targetQrId) setSelectedQrId(targetQrId);
    } else if (action === 'request_changes') {
      showToast(`Changes requested for ${targetQrId || approvalId}. Updated status in Details.`, 'warning');
      if (targetQrId) setSelectedQrId(targetQrId);
    } else if (action === 'reject') {
      showToast(`QR Code ${targetQrId || approvalId} rejected. Updated status in Details.`, 'error');
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
        wizardStep,
        setWizardStep,
        wizardData,
        setWizardData,
        wizardNotification,
        setWizardNotification,
        publishWizardQR,
        saveWizardDraft,
        resetWizard,
        startNewQRCode,
        getInitialWizardData,
        testScanModal,
        setTestScanModal,
        simulateScan,
        handleApprovalAction,
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
