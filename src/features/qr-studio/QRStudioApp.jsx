import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRProvider, useQR } from './context/QRContext';
import { TestScanModal, ToastContainer, DeleteConfirmModal } from './components';
import { parsePathname, ROUTES } from './utils/routes';
import './qr-studio.css';

// Screens
import {
  Dashboard,
  QRListing,
  QRWizard,
  QRDetails,
  ScanHistory,
} from './screens';

/**
 * QR Studio Content — manages screen rendering and syncs with react-router.
 */
const QRStudioContent = () => {
  const { activeScreen, setActiveScreen, setSelectedQrId, setWizardMode, setEditingQrId } = useQR();
  const location = useLocation();
  const navigate = useNavigate();

  // Sync internal screen state with URL location
  useEffect(() => {
    if (location.pathname === '/qr-studio' || location.pathname === '/qr-studio/') {
      navigate('/qr-studio/qr-dashboard', { replace: true });
      return;
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const route = parsePathname(location.pathname);
    if (route.screen && route.screen !== activeScreen) {
      setActiveScreen(route.screen);
    }
    if (route.qrId) {
      setSelectedQrId(route.qrId);
    }
    if (route.wizardMode) {
      setWizardMode(route.wizardMode);
    }
    if (route.editingQrId) {
      setEditingQrId(route.editingQrId);
    }
  }, [location.pathname]);

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
    <div className="qr-studio-root">
      {/* Content area */}
      <div className="qr-studio-content">
        {renderActiveScreen()}
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

/**
 * QR Studio App — isolated context wrapper.
 */
export default function QRStudioApp() {
  return (
    <QRProvider>
      <QRStudioContent />
    </QRProvider>
  );
}
