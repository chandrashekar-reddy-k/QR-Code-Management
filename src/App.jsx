import React, { useState } from 'react';
import { QRProvider, useQR } from './context/QRContext';
import { Sidebar, TopHeader, TestScanModal, ToastContainer, DeleteConfirmModal } from './components';

// Screens
import {
  Dashboard,
  QRListing,
  QRWizard,
  QRDetails,
  ScanHistory,
} from './screens';

const MainAppContent = () => {
  const { activeScreen } = useQR();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'listing':
        return <QRListing />;
      case 'wizard':
        return <QRWizard />;
      case 'details':
        return <QRDetails />;
      case 'scan-history':
        return <ScanHistory />;
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
          {renderActiveScreen()}
        </main>
      </div>

      {/* Interactive Scan Simulator Modal */}
      <TestScanModal />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal />

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
