import React from 'react';
import { useQR } from '../context/QRContext';
import {
  LayoutDashboard,
  QrCode,
  PlusCircle,
  History,
  BarChart3,
  Megaphone,
  Layers,
  Users,
  ShieldCheck,
  Settings,
  ChevronRight,
  Sparkles,
  Palette,
  FileText,
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const {
    activeScreen,
    setActiveScreen,
    setDetailsViewMode,
    approvals,
    qrCodes,
    currentRole,
    startNewQRCode,
  } = useQR();

  const pendingApprovalsCount = approvals.filter((a) => {
    if (a.status !== 'Pending') return false;
    const matchingQr = qrCodes?.find((q) => q.id === a.qrId);
    if (matchingQr && matchingQr.status === 'Draft') return false;
    return true;
  }).length;

  const navSections = [
    {
      group: 'QR Studio Core',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'listing', label: 'QR Management', icon: QrCode },
        { id: 'design-studio', label: 'Design Studio', icon: Palette },
        { id: 'details', label: 'QR Code Details', icon: FileText },
      ],
    },
    {
      group: 'Analytics & Tracking',
      items: [
        { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
        { id: 'scan-history', label: 'Scan History Log', icon: History },
        { id: 'campaigns', label: 'Campaign Management', icon: Megaphone },
      ],
    },
    {
      group: 'Distribution & Assets',
      items: [
        { id: 'templates', label: 'Templates Library', icon: Layers },
        { id: 'referrals', label: 'Referral QR (VGE)', icon: Users },
      ],
    },
    {
      group: 'Governance & Rules',
      items: [
        {
          id: 'permissions',
          label: 'Permissions & Approvals',
          icon: ShieldCheck,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          badgeAlert: true,
        },
        { id: 'settings', label: 'Settings & Audit Logs', icon: Settings },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header with Official VillagKart Logo */}
      <div className="sidebar-header">
        <div
          className="sidebar-logo-container"
          onClick={() => {
            setActiveScreen('dashboard');
            if (setMobileOpen) setMobileOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveScreen('dashboard');
              if (setMobileOpen) setMobileOpen(false);
            }
          }}
          title="VillagKart — Dashboard"
          role="button"
          tabIndex={0}
        >
          <img
            src="/villagekart_logo.svg"
            alt="VillagKart"
            className="sidebar-logo-img"
            onError={(e) => {
              // Fallback if SVG fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Navigation Scroll */}
      <div className="sidebar-nav-scroll">
        {navSections.map((sec, idx) => (
          <div key={idx} style={{ marginBottom: '6px' }}>
            <div className="sidebar-section-label">{sec.group}</div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'details') {
                      setDetailsViewMode('grid');
                    }
                    setActiveScreen(item.id);
                    if (setMobileOpen) setMobileOpen(false);
                  }}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-item-content">
                    <Icon size={16} color={isActive ? '#00891D' : '#6B7280'} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`nav-badge ${item.badgeAlert ? 'alert' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Info Footer (VillagKart ERP Style) */}
      <div className="sidebar-footer">
        <div className="sidebar-user-pill">
          <div className="sidebar-avatar">
            {currentRole.substring(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentRole} Role
            </div>
            <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
              VillagKart Operations
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
