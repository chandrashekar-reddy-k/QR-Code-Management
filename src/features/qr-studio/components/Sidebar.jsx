import React from 'react';
import { useQR } from '../context/QRContext';
import {
  LayoutDashboard,
  QrCode,
  History,
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const {
    activeScreen,
    setActiveScreen,
    setDetailsViewMode,
    approvals,
    qrCodes,
    currentRole,
  } = useQR();

  const pendingApprovalsCount = approvals.filter((a) => {
    if (a.status !== 'Pending') return false;
    const matchingQr = qrCodes?.find((q) => q.id === a.qrId);
    if (matchingQr && matchingQr.status === 'Draft') return false;
    return true;
  }).length;

  const navSections = [
    {
      group: 'QR STUDIO',
      items: [
        { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'listing',
          path: '/qr-management',
          label: 'QR Management',
          icon: QrCode,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          badgeAlert: true,
        },
        { id: 'scan-history', path: '/scan-history', label: 'Audit History', icon: History },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header with Official VillagKart Logo */}
      <div className="sidebar-header">
        <a
          href="/dashboard"
          className="sidebar-logo-container"
          onClick={(e) => {
            e.preventDefault();
            setActiveScreen('dashboard');
            if (setMobileOpen) setMobileOpen(false);
          }}
          title="VillagKart — Dashboard"
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
        </a>
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
                <a
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.id === 'details') {
                      setDetailsViewMode('detail');
                    }
                    setActiveScreen(item.id);
                    if (setMobileOpen) setMobileOpen(false);
                  }}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
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
                </a>
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
