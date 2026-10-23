import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  Menu,
  Plus,
  Monitor,
  Smartphone,
  ShieldAlert,
  Bell,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';

export const TopHeader = ({ onMenuClick }) => {
  const {
    activeScreen,
    setActiveScreen,
    currentRole,
    setCurrentRole,
    viewMode,
    setViewMode,
    approvals,
    showToast,
  } = useQR();

  const [headerSearch, setHeaderSearch] = useState('');
  const pendingCount = approvals.filter((a) => a.status === 'Pending').length;

  const titles = {
    dashboard: { title: 'QR Operations Dashboard', sub: 'Performance overview, live scan trends and quick actions' },
    listing: { title: 'QR Code Inventory', sub: 'Central management table, multifaceted filtering and batch operations' },
    wizard: { title: 'Create QR Code', sub: 'Configure destination, customize branding, export print/digital & publish' },
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
        {/* Role Selector Pill */}
        <div className="role-pill-selector" title="Switch active user role to test role-based access matrix">
          <span style={{ color: '#00891D', fontSize: '11.5px', fontWeight: 700 }}>Role:</span>
          <select
            className="role-select"
            value={currentRole}
            onChange={(e) => {
              setCurrentRole(e.target.value);
              showToast(`Switched active role to: ${e.target.value}`);
            }}
          >
            <option value="Admin">Admin (Full Access)</option>
            <option value="Marketing">Marketing Manager</option>
            <option value="Hub Manager">Hub Manager (Hub Scope)</option>
            <option value="VGE">VGE (Field Executive)</option>
          </select>
        </div>

        {/* View Mode Toggle (Screen 18 Mobile Field Simulator) */}
        <div style={{ display: 'flex', gap: '3px', background: '#F3F4F6', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setViewMode('desktop')}
            className={`device-toggle-btn ${viewMode === 'desktop' ? 'active' : ''}`}
            title="Desktop ERP View"
          >
            <Monitor size={14} />
            <span style={{ fontSize: '12px' }}>Desktop</span>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`device-toggle-btn ${viewMode === 'mobile' ? 'active' : ''}`}
            title="Mobile Responsive Field Mode"
          >
            <Smartphone size={14} />
            <span style={{ fontSize: '12px' }}>Field Pocket</span>
          </button>
        </div>

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

        {/* Quick Create QR Button */}
        {activeScreen !== 'wizard' && (
          <button
            onClick={() => setActiveScreen('wizard')}
            className="btn btn-primary btn-sm"
          >
            <Plus size={15} />
            <span>Create QR</span>
          </button>
        )}
      </div>
    </header>
  );
};
