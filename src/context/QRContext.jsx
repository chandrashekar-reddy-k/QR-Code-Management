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
    return saved ? JSON.parse(saved) : INITIAL_QR_CODES;
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
  const [wizardData, setWizardData] = useState({
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
    redirectCode: 'vk-promo-' + Math.floor(1000 + Math.random() * 9000),
    androidUrl: 'https://play.google.com/store/apps/details?id=com.villagkart.customer',
    androidDeepLink: 'villagkart://campaign/seasonal',
    iosUrl: 'https://apps.apple.com/in/app/villagkart-rural-fresh/id192837482',
    iosUniversalLink: 'https://villagkart.com/campaign/seasonal',
    fallbackUrl: 'https://villagkart.com/seasonal-produce',
    routingBehavior: 'auto',
    // Step 3 Design Studio
    template: 'VillagKart Branded',
    fgColor: '#176B45',
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

  // Save new or updated QR from wizard
  const publishWizardQR = (submitForApproval = false) => {
    const newId = 'QR-000' + String(qrCodes.length + 1).padStart(2, '0');
    const hub = INITIAL_HUBS.find((h) => h.id === wizardData.hubId) || INITIAL_HUBS[0];
    const initialStatus = submitForApproval ? 'Pending Approval' : 'Active';

    const newQR = {
      id: newId,
      name: wizardData.name,
      type: wizardData.type,
      status: initialStatus,
      campaign: wizardData.campaign,
      campaignId: wizardData.campaignId,
      owner: wizardData.owner,
      department: wizardData.department,
      hubId: wizardData.hubId,
      hubName: hub.name,
      village: wizardData.village,
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      expiryDate: wizardData.expiryDate,
      trackingEnabled: wizardData.trackingEnabled,
      approvalRequired: wizardData.approvalRequired,
      version: 'v1.0',
      destination: {
        redirectCode: wizardData.redirectCode,
        androidUrl: wizardData.androidUrl,
        androidDeepLink: wizardData.androidDeepLink,
        iosUrl: wizardData.iosUrl,
        iosUniversalLink: wizardData.iosUniversalLink,
        fallbackUrl: wizardData.fallbackUrl,
        routingBehavior: wizardData.routingBehavior,
      },
      design: {
        template: wizardData.template,
        fgColor: wizardData.fgColor,
        bgColor: wizardData.bgColor,
        showLogo: wizardData.showLogo,
        hasCtaFrame: wizardData.hasCtaFrame,
        ctaText: wizardData.ctaText,
        campaignTitle: wizardData.campaignTitle,
        supportingText: wizardData.supportingText,
        quietZone: wizardData.quietZone,
        errorCorrection: wizardData.errorCorrection,
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

    if (submitForApproval) {
      const newApproval = {
        id: 'APP-' + Math.floor(100 + Math.random() * 900),
        qrId: newId,
        qrName: wizardData.name,
        type: wizardData.type,
        requestingUser: `${wizardData.owner} (${wizardData.department})`,
        submittedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        configVersion: 'v1.0',
        riskClassification: wizardData.type === 'Payment' ? 'High (Payment Flow)' : 'Medium (Marketing Campaign)',
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
      addAuditLog('Submitted for Approval', `${newId} (${wizardData.name})`, 'Created new QR config');
      showToast(`QR Code ${newId} submitted for manager approval!`, 'warning');
    } else {
      addAuditLog('Published QR Code', `${newId} (${wizardData.name})`, 'Published live v1.0');
      showToast(`QR Code ${newId} published successfully! Live & routing active.`);
    }

    setActiveScreen('listing');
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
          const newRate = newScans > 0 ? ((newReg / newScans) * 100).toFixed(1) : 0;
          return {
            ...item,
            metrics: {
              ...item.metrics,
              scans: newScans,
              uniqueVisitors: newUnique,
              verifiedRegistrations: newReg,
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
    setApprovals((prev) =>
      prev.map((app) => {
        if (app.id === approvalId) {
          const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Changes Requested';
          
          // Also update QR code status
          setQrCodes((qrs) =>
            qrs.map((q) => {
              if (q.id === app.qrId) {
                return {
                  ...q,
                  status: action === 'approve' ? 'Active' : action === 'reject' ? 'Rejected' : 'Draft',
                };
              }
              return q;
            })
          );

          addAuditLog(
            `Approval Action: ${newStatus}`,
            `${app.qrId} (${app.qrName})`,
            comments || `Reviewer action: ${newStatus}`,
            newStatus
          );

          showToast(`Approval ${app.id} marked as ${newStatus}`);
          return { ...app, status: newStatus, reviewerComments: comments };
        }
        return app;
      })
    );
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
        publishWizardQR,
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
