import React, { useState } from 'react';
import { QRProvider, useQR } from './context/QRContext';
import { Sidebar, TopHeader, TestScanModal, ToastContainer, CreateQRModal } from './components';

// Screens
import {
  Dashboard,
  QRListing,
  QRWizard,
  DesignStudio,
  QRDetails,
  ScanHistory,
  Analytics,
  Campaigns,
  Templates,
  Referrals,
  Permissions,
  Settings,
  MobileFieldMode,
} from './screens';

const MainAppContent = () => {
  const { activeScreen, viewMode, setViewMode } = useQR();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'listing':
        return <QRListing />;
      case 'wizard':
        return <QRWizard />;
      case 'design-studio':
        return <DesignStudio />;
      case 'details':
        return <QRDetails />;
      case 'scan-history':
        return <ScanHistory />;
      case 'analytics':
        return <Analytics />;
      case 'campaigns':
        return <Campaigns />;
      case 'templates':
        return <Templates />;
      case 'referrals':
        return <Referrals />;
      case 'permissions':
        return <Permissions />;
      case 'settings':
        return <Settings />;
      case 'mobile':
        return <MobileFieldMode />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <TopHeader onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        <main className="content-container">
          {viewMode === 'mobile' ? (
            /* Mobile Simulator Viewport */
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="badge badge-active" style={{ fontSize: '12px' }}>
                  Mobile-Responsive Field Simulation Mode
                </span>
                <button
                  onClick={() => setViewMode('desktop')}
                  className="btn btn-secondary btn-sm"
                >
                  Exit Mobile Simulation
                </button>
              </div>

              <div className="mobile-simulator-wrapper">
                <div className="mobile-notch" />
                <div className="mobile-simulator-content">
                  <MobileFieldMode />
                </div>
              </div>
            </div>
          ) : (
            renderActiveScreen()
          )}
        </main>
      </div>

      {/* Interactive Scan Simulator Modal */}
      <TestScanModal />

      {/* In-Place Create QR Modal */}
      <CreateQRModal />

      {/* Global Toast Alerts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <QRProvider>
      <MainAppContent />
    </QRProvider>
  );
}
