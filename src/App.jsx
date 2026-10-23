import React, { useState } from 'react';
import { QRProvider, useQR } from './context/QRContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { TestScanModal } from './components/TestScanModal';
import { ToastContainer } from './components/ToastContainer';

// Screens
import { Screen01_Dashboard } from './screens/Screen01_Dashboard';
import { Screen02_Listing } from './screens/Screen02_Listing';
import { Screen03_07_Wizard } from './screens/Screen03_07_Wizard';
import { Screen05_DesignStudio } from './screens/Screen05_DesignStudio';
import { Screen08_Details } from './screens/Screen08_Details';
import { Screen09_ScanHistory } from './screens/Screen09_ScanHistory';
import { Screen10_Analytics } from './screens/Screen10_Analytics';
import { Screen11_Campaigns } from './screens/Screen11_Campaigns';
import { Screen12_Templates } from './screens/Screen12_Templates';
import { Screen13_Referrals } from './screens/Screen13_Referrals';
import { Screen14_Permissions } from './screens/Screen14_Permissions';
import { Screen15_Settings } from './screens/Screen15_Settings';
import { Screen18_MobileFieldMode } from './screens/Screen18_MobileFieldMode';

const MainAppContent = () => {
  const { activeScreen, viewMode, setViewMode } = useQR();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Screen01_Dashboard />;
      case 'listing':
        return <Screen02_Listing />;
      case 'wizard':
        return <Screen03_07_Wizard />;
      case 'design-studio':
        return <Screen05_DesignStudio />;
      case 'details':
        return <Screen08_Details />;
      case 'scan-history':
        return <Screen09_ScanHistory />;
      case 'analytics':
        return <Screen10_Analytics />;
      case 'campaigns':
        return <Screen11_Campaigns />;
      case 'templates':
        return <Screen12_Templates />;
      case 'referrals':
        return <Screen13_Referrals />;
      case 'permissions':
        return <Screen14_Permissions />;
      case 'settings':
        return <Screen15_Settings />;
      case 'mobile':
        return <Screen18_MobileFieldMode />;
      default:
        return <Screen01_Dashboard />;
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
                  <Screen18_MobileFieldMode />
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
