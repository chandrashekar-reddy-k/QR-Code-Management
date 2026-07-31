import { useState, Suspense } from "react";
// Force rebuild and clear cache trigger: 1722080000000
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import LoadingFallback from "./components/common/LoadingFallback";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { publicRoutes, protectedRoutes } from "./routes";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastContainer } from "react-toastify";
import { NewOrderAlertProvider } from "./contexts/NewOrderAlertContext";
import { OmsNewOrderAlertOverlay } from "./components/common/OmsNewOrderAlertOverlay";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isShopkeeperPortal = location.pathname.startsWith('/shopkeeper') && !location.pathname.startsWith('/shopkeeper-erp');
  const token = isShopkeeperPortal ? sessionStorage.getItem('staffToken') : localStorage.getItem('partnerToken');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Parse user role and permissions from storage/localStorage
  let role = "";
  let permissions: string[] = [];
  try {
    const userStr = isShopkeeperPortal ? sessionStorage.getItem('staffUser') : localStorage.getItem('partnerUser');
    const user = userStr ? JSON.parse(userStr) : null;
    role = user?.role || "";

    const permsStr = localStorage.getItem('permissions');
    permissions = permsStr ? JSON.parse(permsStr) : [];
  } catch (e) { }

  const hasAgentPermissions = permissions.some((p: string) => p.startsWith("vsms_agent_"));
  const hasShopkeeperPermissions = permissions.some((p: string) => p.startsWith("shopkeeper_") || p.startsWith("partner_shopkeeper_erp_"));
  const hasPartnerPermissions = permissions.some((p: string) => p.startsWith("partner_") && !p.startsWith("partner_shopkeeper_erp_"));
  const hasAdminPerms = permissions.some((p: string) => p.startsWith("admin_"));

  // Block admin/super-admin accounts by ROLE — always redirect regardless of permissions,
  // since SUPER_ADMIN can carry all permission slugs.
  const isAdminRole = ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"].includes(role.toUpperCase());
  const isAdminOnlyPerms = hasAdminPerms && !hasPartnerPermissions && !hasAgentPermissions && !hasShopkeeperPermissions;
  if (isAdminRole || isAdminOnlyPerms) {
    // Clear stale token so they land on login cleanly
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('permissions');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  // Dynamically determine classification based strictly on active permissions (modules)
  const isShopkeeperRole = hasShopkeeperPermissions && !hasPartnerPermissions;
  const isAgentRole = hasAgentPermissions && !hasPartnerPermissions && !isShopkeeperRole;

  const isAgentPortal = location.pathname.startsWith('/vsms/agent-portal');

  if (isAgentRole) {
    if (!isAgentPortal) {
      // Prevent agents from loading partner views; redirect to agent portal
      return <Navigate to="/vsms/agent-portal/today-plan" replace />;
    }
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </ErrorBoundary>
    );
  }

  // If a partner/admin/shopkeeper attempts to access the agent portal, redirect them
  if (isAgentPortal) {
    if (isShopkeeperRole) {
      return <Navigate to="/shopkeeper" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // If accessing the Shopkeeper portal directly or classified as shopkeeper role
  if (isShopkeeperPortal || (isShopkeeperRole && location.pathname === "/")) {
    if (!isShopkeeperPortal) {
      return <Navigate to="/shopkeeper" replace />;
    }
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden relative">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 md:ml-72 min-w-0 overflow-x-hidden h-screen overflow-y-auto bg-gray-100 dark:bg-gray-900">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-2 md:p-4 overflow-x-hidden bg-gray-100 dark:bg-gray-900 min-h-screen">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Single function to render routes
const renderRoutes = () => {
  return (
    <>
      {/* Public routes */}
      {publicRoutes.map((route) => {
        const Component = route.component;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Component />
                </Suspense>
              </ErrorBoundary>
            }
          />
        );
      })}

      {/* Protected routes */}
      {protectedRoutes.map((route) => {
        const Component = route.component;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute>
                <Component />
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </>
  );
};

// Create QueryClient outside component to avoid recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <NewOrderAlertProvider>
            <Router>
              <Routes>{renderRoutes()}</Routes>
              <OmsNewOrderAlertOverlay />
            </Router>
            <ToastContainer />
          </NewOrderAlertProvider>
        </Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
