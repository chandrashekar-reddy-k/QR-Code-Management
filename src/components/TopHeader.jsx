import React from 'react';
import { useQR } from '../context/QRContext';
import {
  Menu,
  Plus,
  ShieldAlert,
} from 'lucide-react';

export const TopHeader = ({ onMenuClick }) => {
  const {
    activeScreen,
    setActiveScreen,
    approvals,
    qrCodes,
    startNewQRCode,
  } = useQR();

  const pendingCount = approvals.filter((a) => {
    if (a.status !== 'Pending') return false;
    const matchingQr = qrCodes?.find((q) => q.id === a.qrId);
    if (matchingQr && matchingQr.status === 'Draft') return false;
    return true;
  }).length;

  const titles = {
    dashboard: { title: 'QR Operations Dashboard', sub: 'Performance overview, live scan trends and quick actions' },
    listing: { title: 'QR Management', sub: 'Central operations catalog, dynamic routing, batch operations & quick creation' },
    'design-studio': { title: 'Design Studio & Export', sub: 'Brand templates, real-time contrast safeguards, vector print layouts & digital packages' },
    details: { title: 'QR Code Details & Lifecycle', sub: 'Overview, destinations, assets, scan event records and version audit log' },
    'scan-history': { title: 'Scan History & Event Log', sub: 'Operational investigation tool, device forensics and conversion attribution' },
    analytics: { title: 'Analytics Dashboard', sub: 'Scan volume, funnel conversion, hub/village breakdown & device routing' },
    campaigns: { title: 'Campaign Management', sub: 'Marketing initiatives, budget tracking, CPA metrics and asset grouping' },
    templates: { title: 'QR Templates Library', sub: 'Standardized approved designs, dimensions, brand protections and presets' },
    referrals: { title: 'Referral QR Management', sub: 'Village Gramin Executive (VGE) incentives and verified customer acquisition' },
    permissions: { title: 'Permissions & Approvals', sub: 'Role permission matrix and publication approval queue' },
    settings: { title: 'Settings & Audit Logs', sub: 'System redirect domains, retention policies, abuse detection & immutable logs' },
    mobile: { title: 'Mobile Field Mode', sub: 'Compact field pocket interface for VGEs and Hub Managers on the move' },
  };

  const currentMeta = titles[activeScreen] || { title: 'VillagKart QR Studio', sub: 'Enterprise Management' };

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          onClick={onMenuClick}
          className="btn btn-ghost"
          style={{ display: 'none', padding: '6px' }}
          id="mobileMenuBtn"
        >
          <Menu size={22} />
        </button>
        <div className="header-title-group">
          <h1>{currentMeta.title}</h1>
          <p>{currentMeta.sub}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Pending approvals alert badge */}
        {pendingCount > 0 && (
          <button
            onClick={() => setActiveScreen('permissions')}
            className="btn btn-sm"
            style={{
              borderColor: '#FED7AA',
              background: '#FFEDD5',
              color: '#C2410C',
              padding: '6px 10px',
              fontSize: '12px',
            }}
            title={`${pendingCount} QR codes awaiting approval`}
          >
            <ShieldAlert size={14} color="#EA580C" />
            <span>{pendingCount} Pending</span>
          </button>
        )}

        {/* Quick Create QR Button (accessible from all pages) */}
        <button
          onClick={() => startNewQRCode()}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          <span>Create QR</span>
        </button>
      </div>
    </header>
  );
};
