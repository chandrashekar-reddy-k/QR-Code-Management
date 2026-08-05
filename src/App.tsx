import { useState, useEffect, Suspense } from "react";
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
import { sidebarConfig } from "./components/layout/sidebarConfig";

// Helper to check if a route is allowed based on active database permissions
const isRouteAllowed = (pathname: string, permissions: string[]) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  // Super admin / wildcard bypass
  if (permissions.includes('*') || permissions.includes('ALL') || permissions.includes('all')) return true;

  let targetItem: any = null;
  let parentCollapsible: any = null;

  // Search the sidebar config to map the current route to its configuration block
  for (const section of sidebarConfig) {
    if (section.type === "link" && section.path && pathname.split('?')[0] === section.path.split('?')[0]) {
      targetItem = section;
      break;
    }
    if (section.type === "collapsible" && section.subItems) {
      const matchedSub = section.subItems.find((sub: any) => {
        if (!sub.path) return false;
        return pathname.split('?')[0] === sub.path.split('?')[0];
      });
      if (matchedSub) {
        targetItem = matchedSub;
        parentCollapsible = section;
        break;
      }
    }
  }

  // If the page is not in the sidebar configuration (like common/unmapped routes, profile, etc.), let it pass
  if (!targetItem) return true;

  // The main Dashboard page is always visible to active users
  if (targetItem.label === "Dashboard" || pathname === "/") return true;

  // Slugs view check logic mimicking Sidebar.tsx
  const hasModuleViewPermission = (moduleName: string) => {
    const cleanName = moduleName.startsWith("Partner: ") ? moduleName.slice(9) : moduleName;
    const slugCode = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const expectedSlug = `partner_${slugCode}_view`;
    if (permissions.includes(expectedSlug)) return true;

    // Route Management fallback to VSMS Logistics
    if (slugCode === 'route_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_route_management_view')) return true;
    }

    // Vehicle Management fallback to VSMS Logistics
    if (slugCode === 'vehicle_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_vehicle_management_view')) return true;
    }

    // Cash Management fallback to VSMS Logistics
    if (slugCode === 'cash_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_cash_management_view')) return true;
    }

    // Inventory Management fallback to VSMS Logistics
    if (slugCode === 'inventory_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_inventory_management_view') || permissions.includes('partner_stock_history_view')) return true;
    }

    // Shopkeeper fallback — old slug was 'shopkeeper_erp_admin', keep supporting it
    if (slugCode === 'shopkeeper') {
      if (permissions.includes('partner_shopkeeper_erp_admin_view') || permissions.includes('partner_shopkeeper_erp_view') || permissions.includes('partner_shopkeeper_view')) return true;
    }

    if (slugCode.includes("barcode")) {
      return permissions.some(p => p.toLowerCase().includes("barcode") && p.toLowerCase().includes("view"));
    }
    if (slugCode.includes("pos") || slugCode.includes("point_of_sale")) {
      return permissions.some(p => (p.toLowerCase().includes("pos") || p.toLowerCase().includes("point_of_sale")) && p.toLowerCase().includes("view"));
    }
    if (slugCode === 'withdrawal_request' || slugCode === 'wallet_transactions' || slugCode === 'financial' || slugCode === 'financials') {
      return permissions.includes('partner_financial_view') || permissions.includes('partner_financials_view');
    }
    return false;
  };

  const hasSubPermission = (parent: string, label: string) => {
    const toSlugPart = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const portal = 'partner';
    const parentPart = toSlugPart(parent);
    const labelPart = toSlugPart(label);

    const candidates = [
      `${portal}_${parentPart}_${labelPart}_view`,
      `${parentPart}_${labelPart}_view`
    ];

    if (parentPart === 'route_management') {
      candidates.push(`partner_vsms_logistics_${labelPart}_view`);
      candidates.push(`vsms_logistics_${labelPart}_view`);
      if (labelPart === 'fleet_vehicles') {
        candidates.push('partner_vsms_logistics_vehicles_view');
        candidates.push('partner_vehicles_view');
        candidates.push('partner_fleet_vehicles_view');
        candidates.push('partner_vsms_vehicles_view');
      }
      if (labelPart === 'routes_coverage') {
        candidates.push('partner_vsms_logistics_routes_view');
        candidates.push('partner_routes_view');
        candidates.push('partner_routes_coverage_view');
        candidates.push('partner_vsms_routes_view');
      }
    }

    if (parentPart === 'vehicle_management') {
      candidates.push(`partner_vsms_logistics_${labelPart}_view`);
      candidates.push(`vsms_logistics_${labelPart}_view`);
      if (labelPart === 'fuel_maintenance') {
        candidates.push('partner_vsms_logistics_fuel_maintenance_view');
        candidates.push('partner_fuel_maintenance_view');
        candidates.push('partner_vsms_fuel_maintenance_view');
      }
      if (labelPart === 'vehicle_damages') {
        candidates.push('partner_vsms_logistics_damages_view');
        candidates.push('partner_damages_view');
        candidates.push('partner_vsms_damages_view');
      }
    }

    if (parentPart === 'inventory_management') {
      candidates.push(`partner_vsms_logistics_${labelPart}_view`);
      candidates.push(`vsms_logistics_${labelPart}_view`);
      // If user has module-level access, show all sub-items
      candidates.push('partner_inventory_management_view');
      candidates.push('partner_vsms_logistics_view');
      candidates.push('partner_vsms_view');
      if (labelPart === 'vehicle_stock_audits') {
        candidates.push('partner_vsms_stock_history_view');
        candidates.push('partner_stock_history_view');
        candidates.push('partner_vsms_logistics_stock_history_view');
        candidates.push('partner_inventory_management_vehicle_stock_audits_view');
      }
      if (labelPart === 'stock_management') {
        candidates.push('partner_stock_management_view');
        candidates.push('partner_stock_view');
        candidates.push('stock_management_view');
      }
    }

    if (labelPart === 'ready_for_dispatch') {
      candidates.push(`${portal}_${parentPart}_ready_dispatch_view`);
      candidates.push(`${parentPart}_ready_dispatch_view`);
      candidates.push(`${portal}_ready_dispatch_view`);
      candidates.push('ready_dispatch_view');
      candidates.push('partner_shopkeeper_erp_ready_dispatch_view');
      candidates.push('shopkeeper_erp_ready_dispatch_view');
    }

    if (labelPart === 'plm_settings') {
      candidates.push(`${portal}_${parentPart}_settings_view`);
      candidates.push(`${parentPart}_settings_view`);
      candidates.push(`${portal}_settings_view`);
      candidates.push('settings_view');
      candidates.push('partner_shopkeeper_erp_settings_view');
      candidates.push('shopkeeper_erp_settings_view');
    }

    if (labelPart !== 'dashboard') {
      candidates.push(`${portal}_text_${labelPart}_view`);
      candidates.push(`${portal}__${labelPart}_view`);
      candidates.push(`${portal}_${labelPart}_view`);
      candidates.push(`${labelPart}_view`);
    }

    const wordsInParent = parentPart.split('_');
    const wordsInLabel = labelPart.split('_');
    const cleanLabelPart = wordsInLabel.filter(w => !wordsInParent.includes(w)).join('_');
    if (cleanLabelPart && cleanLabelPart !== labelPart) {
      candidates.push(`${portal}_${parentPart}_${cleanLabelPart}_view`);
      candidates.push(`${parentPart}_${cleanLabelPart}_view`);
    }

    const cleanLabelWords = wordsInLabel.filter(w => !wordsInParent.includes(w) && !['asset', 'assets', 'vehicle', 'vehicles', 'agent', 'management', 'setup'].includes(w));
    const cleanLabelPart2 = cleanLabelWords.join('_');
    if (cleanLabelPart2 && cleanLabelPart2 !== cleanLabelPart && cleanLabelPart2 !== labelPart) {
      candidates.push(`${portal}_${parentPart}_${cleanLabelPart2}_view`);
      candidates.push(`${parentPart}_${cleanLabelPart2}_view`);
    }

    const cleanParentPart = parentPart.replace(/_admin|_partner/g, '');
    if (cleanParentPart !== parentPart) {
      candidates.push(`${portal}_${cleanParentPart}_${labelPart}_view`);
      candidates.push(`${portal}_${cleanParentPart}_${cleanLabelPart}_view`);
      candidates.push(`${cleanParentPart}_${labelPart}_view`);
      candidates.push(`${cleanParentPart}_${cleanLabelPart}_view`);
    }

    // Shopkeeper backward-compat: old DB slugs used 'shopkeeper_erp_admin' as parent
    if (parentPart === 'shopkeeper') {
      candidates.push(`partner_shopkeeper_erp_admin_${labelPart}_view`);
      candidates.push(`partner_shopkeeper_erp_${labelPart}_view`);
      candidates.push(`shopkeeper_erp_admin_${labelPart}_view`);
    }

    return candidates.some(candidate => permissions.includes(candidate));
  };

  if (parentCollapsible) {
    const isParentAllowed = hasModuleViewPermission(parentCollapsible.permission || parentCollapsible.label);
    if (parentCollapsible.hasSubPermissions) {
      return hasModuleViewPermission(targetItem.permission || targetItem.label) || hasSubPermission(parentCollapsible.label, targetItem.permission || targetItem.label);
    }
    return isParentAllowed;
  }

  return hasModuleViewPermission(targetItem.permission || targetItem.label);
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Reactive permissions state synchronized with local storage
  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      const permsStr = localStorage.getItem('permissions');
      return permsStr ? JSON.parse(permsStr) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'permissions' && e.newValue) {
        try { setPermissions(JSON.parse(e.newValue)); } catch { /* silent */ }
      }
    };
    
    // Periodically poll/sync state changes from local updates in the same window context
    const interval = setInterval(() => {
      try {
        const permsStr = localStorage.getItem('permissions');
        const currentPerms = permsStr ? JSON.parse(permsStr) : [];
        if (JSON.stringify(currentPerms) !== JSON.stringify(permissions)) {
          setPermissions(currentPerms);
        }
      } catch {}
    }, 1500);

    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [permissions]);

  const isShopkeeperPortal = location.pathname.startsWith('/shopkeeper') && !location.pathname.startsWith('/shopkeeper-erp');
  const token = isShopkeeperPortal ? sessionStorage.getItem('staffToken') : localStorage.getItem('partnerToken');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Parse user role from storage
  let role = "";
  try {
    const userStr = isShopkeeperPortal ? sessionStorage.getItem('staffUser') : localStorage.getItem('partnerUser');
    const user = userStr ? JSON.parse(userStr) : null;
    role = user?.role || "";
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
      return <Navigate to="/vsms/agent-portal/today-plan" replace />;
    }
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </ErrorBoundary>
    );
  }

  if (isAgentPortal) {
    if (isShopkeeperRole) {
      return <Navigate to="/shopkeeper" replace />;
    }
    return <Navigate to="/" replace />;
  }

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

  // Route Permission Authorization Guard: Auto-redirect unauthorized routes to Dashboard
  if (!isShopkeeperPortal && !isAgentPortal && !isRouteAllowed(location.pathname, permissions)) {
    return <Navigate to="/" replace />;
  }

  return (
    <NewOrderAlertProvider>
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
      <OmsNewOrderAlertOverlay />
    </NewOrderAlertProvider>
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
          <Router>
            <Routes>{renderRoutes()}</Routes>
          </Router>
          <ToastContainer />
        </Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
