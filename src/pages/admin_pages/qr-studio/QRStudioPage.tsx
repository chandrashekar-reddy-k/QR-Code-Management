import React, { Suspense, lazy } from 'react';
import LoadingFallback from '../../../components/common/LoadingFallback';
import { ErrorBoundary } from '../../../components/common/ErrorBoundary';

// Lazy-load QR Studio to keep bundle split clean
const QRStudioApp = lazy(() => import('../../../features/qr-studio/QRStudioApp'));

/**
 * QRStudioPage
 * Integrates VillagKart QR Studio into the partner-web layout.
 * The partner-web Sidebar and Header are already rendered by ProtectedRoute/App.tsx.
 * QRStudioApp renders only the content area (no duplicate sidebar/header).
 */
const QRStudioPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <QRStudioApp />
      </Suspense>
    </ErrorBoundary>
  );
};

export default QRStudioPage;
