import React from 'react';
import { useQR } from '../context/QRContext';
import {
  Menu,
} from 'lucide-react';

export const TopHeader = ({ onMenuClick }) => {
  const {
    activeScreen,
  } = useQR();

  const titles = {
    dashboard: { title: 'Dashboard', sub: 'Overview, KPIs, Conversion Funnels & Hub Analytics' },
    listing: { title: 'QR Management', sub: 'Full QR Lifecycle: Create, Edit, Inspect, Approve, Filter, Export' },
    details: { title: 'QR Code Details & Lifecycle', sub: 'Overview, destinations, assets, scan event records and version audit log' },
    'scan-history': { title: 'Scan History Log', sub: 'Live Scan Activity Stream, device forensics and conversion attribution' },
    wizard: { title: 'Create New QR Code', sub: 'Configure target routing, brand styling, print/digital packaging and publish' },
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
        {/* Clean top header right area - Create QR is now localized exclusively to QR Management */}
      </div>
    </header>
  );
};
