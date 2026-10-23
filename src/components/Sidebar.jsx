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
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { activeScreen, setActiveScreen, approvals, currentRole } = useQR();

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'Pending').length;

  const navSections = [
    {
      group: 'QR Studio Core',
      items: [
        { id: 'dashboard', label: '01 · QR Dashboard', icon: LayoutDashboard },
        { id: 'listing', label: '02 · QR Inventory', icon: QrCode },
        { id: 'wizard', label: '03-07 · Create QR Studio', icon: PlusCircle, isHighlight: true },
      ],
    },
    {
      group: 'Analytics & Tracking',
      items: [
        { id: 'scan-history', label: '09 · Scan History Log', icon: History },
        { id: 'analytics', label: '10 · Analytics Dashboard', icon: BarChart3 },
        { id: 'campaigns', label: '11 · Campaign Management', icon: Megaphone },
      ],
    },
    {
      group: 'Distribution & Assets',
      items: [
        { id: 'templates', label: '12 · Templates Library', icon: Layers },
        { id: 'referrals', label: '13 · Referral QR (VGE)', icon: Users },
      ],
    },
    {
      group: 'Governance & Rules',
      items: [
        {
          id: 'permissions',
          label: '14 · Approvals & Access',
          icon: ShieldCheck,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          badgeAlert: true,
        },
        { id: 'settings', label: '15 · Settings & Audit', icon: Settings },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header with Official VillagKart Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo-container">
          <img
            src="/villagekart_logo.svg"
            alt="VillagKart"
            className="sidebar-logo-img"
            onError={(e) => {
              // Fallback if SVG fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="sidebar-brand-badge">QR Studio</span>
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
