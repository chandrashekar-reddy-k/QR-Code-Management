import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
// import { ChevronDown, ChevronRight, X } from "lucide-react";
import {
  sidebarConfig,
  initialStateCheckers,
  MenuSection,
  SubMenuItem,
} from "./sidebarConfig";
// import { useState, useEffect, useCallback } from 'react';
// import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarClock, Bike, Megaphone, Hash, Database, Image, Smile, Map, Users2, Smartphone, HelpCircle, Package, ShoppingCart, Store, Image as ImageIcon, Tag, RotateCcw, Star, Truck, ChevronDown, ChevronRight, Settings, FolderTree, Layers, Award, Ruler, Percent, MapPin, Navigation, Building2, Phone, Info, FileText, Shield, Upload, RefreshCw, CheckCircle, Film, Users, UserCog, Handshake, Boxes, Eye, AlertTriangle, ClipboardList, ArrowRightLeft, Receipt, ScanLine, Printer, Bell, UserCheck, Wallet, DollarSign, ShieldCheck, Maximize2, Monitor, Clock, CreditCard, Globe, Share2, X, Languages, BarChart3, Link2, BookOpen, Wrench, Activity, History, ShieldAlert, Landmark, MessageSquare, BarChart2, Radio } from 'lucide-react';

// Sidebar component props interface
interface SidebarProps {
  isOpen?: boolean; // Whether sidebar is open or closed
  setIsOpen?: (open: boolean) => void; // Function to open/close sidebar
}



const Sidebar = ({ isOpen = true, setIsOpen }: SidebarProps) => {
  const location = useLocation();
  // Permission state — synced from localStorage (written by login + Identity Service refresh)
  const [permissions, setPermissions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('permissions') || '[]'); } catch { return []; }
  });

  // Fetch full role-based permissions from Identity Service and update state
  const refreshPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('partnerToken') || sessionStorage.getItem('staffToken') || localStorage.getItem('staffToken') || localStorage.getItem('token');
      if (!token) return;
      const baseUrl = (import.meta.env.VITE_IDENTITY_SERVICE_URL || "https://identity.villagkart.com").replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/v1/auth/me?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('partnerToken');
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('staffToken');
          sessionStorage.removeItem('staffToken');
          localStorage.removeItem('permissions');
        }
        return;
      }
      const data = await res.json();
      if (data.data?.accessToken) {
        localStorage.setItem('partnerToken', data.data.accessToken);
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('authToken', data.data.accessToken);
        localStorage.setItem('staffToken', data.data.accessToken);
        sessionStorage.setItem('staffToken', data.data.accessToken);
      }
      // Identity Service may return permissions as: flat array, nested user.permissions array, or object map
      const raw = data.data?.flatPermissions || data.data?.permissions || data.data?.user?.permissions || data.flatPermissions || data.permissions;
      let newPermissions: string[] | null = null;
      if (Array.isArray(raw)) {
        newPermissions = raw;
      } else if (raw && typeof raw === 'object') {
        // Permissions returned as an object map — flatten all values into a single array
        newPermissions = Object.values(raw).flat() as string[];
      }
      if (newPermissions && Array.isArray(newPermissions)) {
        localStorage.setItem('permissions', JSON.stringify(newPermissions));
        setPermissions(newPermissions);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    // Fetch full permissions on mount
    refreshPermissions();
    // Re-fetch every 30 seconds to stay fresh
    const interval = setInterval(refreshPermissions, 30000);
    // Sync from storage events (cross-tab updates)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'permissions' && e.newValue) {
        try { setPermissions(JSON.parse(e.newValue)); } catch { /* silent */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshPermissions]);

  // Also sync permissions from localStorage on every route transition (handles post-login redirects)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('permissions');
      if (stored) {
        setPermissions(JSON.parse(stored));
      }
    } catch { /* silent */ }
  }, [location.pathname]);

  // Permission check using live state with dynamic keyword-root matching
  const hasModuleViewPermission = useCallback((moduleName: string) => {
    if (!permissions || !Array.isArray(permissions)) return false;
    
    // Super Admins, Tenant Owners or wildcard permission holders pass everything
    if (permissions.includes('*') || permissions.includes('ALL') || permissions.includes('all')) return true;

    // 1. Direct Slug matching from DB
    const cleanName = moduleName.startsWith("Partner: ") ? moduleName.slice(9) : moduleName;
    const slugCode = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const expectedSlug = `partner_${slugCode}_view`;
    if (permissions.includes('partner_*') && expectedSlug.startsWith('partner_')) return true;
    if (permissions.includes(expectedSlug)) return true;

    // Route Management fallback to VSMS Logistics
    if (slugCode === 'route_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_route_management_view')) return true;
    }

    // Vehicle Management fallback to VSMS Logistics
    if (slugCode === 'vehicle_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_vehicle_management_view')) return true;
    }

    // Expense Management fallback
    if (slugCode === 'expense_management' || slugCode === 'expenses') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_expense_management_view') || permissions.includes('partner_expenses_view') || permissions.includes('partner_vehicle_management_view')) return true;
    }

    // Cash Management fallback to VSMS Logistics
    if (slugCode === 'cash_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_cash_management_view')) return true;
    }

    // Inventory Management fallback to VSMS Logistics
    if (slugCode === 'inventory_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_inventory_management_view') || permissions.includes('partner_stock_history_view')) return true;
    }    
    
    // Delivery Settings fallback
    if (slugCode === 'delivery_management') {
      if (permissions.includes('partner_vsms_logistics_view') || permissions.includes('partner_vsms_view') || permissions.includes('partner_delivery_management_view') || permissions.includes('partner_route_management_view')) return true;
    }

    // Shopkeeper fallback — old slug was 'shopkeeper_erp_admin', keep supporting it
    if (slugCode === 'shopkeeper') {
      if (permissions.includes('partner_shopkeeper_erp_admin_view') || 
          permissions.includes('partner_shopkeeper_erp_view') || 
          permissions.includes('partner_shopkeeper_view') ||
          permissions.includes('shopkeeper_erp_admin_view') ||
          permissions.includes('shopkeeper_erp_view') ||
          permissions.includes('shopkeeper_view')) return true;
    }

    // Expense Management fallback
    if (slugCode === 'expense_management' || slugCode === 'expenses') {
      return true;
    }

    // Packing ERP fallback
    if (slugCode === 'packing_erp' || slugCode === 'packing') {
      return true;
    }

    // Handle dynamically-coded modules (like barcode_management mapping to barcode_master)
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
  }, [permissions]);

  const hasSubPermission = useCallback((parent: string, label: string) => {
    if (!permissions || !Array.isArray(permissions)) return false;
    if (permissions.includes('*') || permissions.includes('ALL') || permissions.includes('all')) return true;
    if (permissions.includes('partner_*')) return true;

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
      if (labelPart === 'scheduled_deliveries') {
        candidates.push('partner_vsms_logistics_view');
        candidates.push('partner_vsms_view');
        candidates.push('partner_route_management_view');
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

    if (parentPart === 'expense_management' || parentPart === 'expenses') {
      return true;
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

    if (parentPart === 'product_management') {
      candidates.push('partner_product_management_view');
      candidates.push('partner_product_view');
      candidates.push('partner_products_view');
      candidates.push('product_management_view');
      if (labelPart === 'barcode_mapping' || labelPart.includes('barcode')) {
        return true;
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

    if (labelPart === 'order_processing') {
      candidates.push('partner_shopkeeper_erp_admin_view');
      candidates.push('partner_shopkeeper_view');
      candidates.push('partner_order_processing_view');
      candidates.push('order_processing_view');
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

    // Strip duplicate parent words from the sub-item name dynamically (e.g. "asset" in "fleet_assets" and "asset_assignment")
    const wordsInParent = parentPart.split('_');
    const wordsInLabel = labelPart.split('_');
    const cleanLabelPart = wordsInLabel.filter(w => !wordsInParent.includes(w)).join('_');
    if (cleanLabelPart && cleanLabelPart !== labelPart) {
      candidates.push(`${portal}_${parentPart}_${cleanLabelPart}_view`);
      candidates.push(`${parentPart}_${cleanLabelPart}_view`);
    }

    // Strip redundant words like 'vehicle', 'asset' or 'management' dynamically to prevent mismatches
    const cleanLabelWords = wordsInLabel.filter(w => !wordsInParent.includes(w) && !['asset', 'assets', 'vehicle', 'vehicles', 'agent', 'management', 'setup'].includes(w));
    const cleanLabelPart2 = cleanLabelWords.join('_');
    if (cleanLabelPart2 && cleanLabelPart2 !== cleanLabelPart && cleanLabelPart2 !== labelPart) {
      candidates.push(`${portal}_${parentPart}_${cleanLabelPart2}_view`);
      candidates.push(`${parentPart}_${cleanLabelPart2}_view`);
    }

    // Strip generic portal keywords from parent name (e.g. "admin" in "shopkeeper_erp_admin")
    const cleanParentPart = parentPart.replace(/_admin|_partner/g, '');
    if (cleanParentPart !== parentPart) {
      candidates.push(`${portal}_${cleanParentPart}_${labelPart}_view`);
      candidates.push(`${portal}_${cleanParentPart}_${cleanLabelPart}_view`);
      candidates.push(`${cleanParentPart}_${labelPart}_view`);
      candidates.push(`${cleanParentPart}_${cleanLabelPart}_view`);
    }

    if (parentPart === 'shopkeeper') {
      if (permissions.includes('shopkeeper_view') || 
          permissions.includes('shopkeeper_erp_view') || 
          permissions.includes('shopkeeper_erp_admin_view') ||
          permissions.includes('partner_shopkeeper_view') ||
          permissions.includes('partner_shopkeeper_erp_view') ||
          permissions.includes('partner_shopkeeper_erp_admin_view')) {
        return true;
      }
      candidates.push(`partner_shopkeeper_erp_admin_${labelPart}_view`);
      candidates.push(`partner_shopkeeper_erp_${labelPart}_view`);
      candidates.push(`shopkeeper_erp_admin_${labelPart}_view`);
    }

    // Packing ERP fallback
    if (parentPart === 'packing_erp' || parentPart === 'packing') {
      return true;
    }

    return candidates.some(candidate => permissions.includes(candidate));
  }, [permissions]);

  // ============================================
  // STATE MANAGEMENT - For menu items open/close
  // ============================================

  // Separate state for each menu item - tracks if menu is open or closed
  const [isProductsOpen, setIsProductsOpen] = useState(
    initialStateCheckers.isProductsOpen(location.pathname)
  );
  const [isOrderManagementOpen, setIsOrderManagementOpen] = useState(
    initialStateCheckers.isOrderManagementOpen(location.pathname)
  );
  const [isMyCategoryManagementOpen, setIsMyCategoryManagementOpen] = useState(
    initialStateCheckers.isMyCategoryManagementOpen(location.pathname)
  );
  const [isVendorManagementOpen, setIsVendorManagementOpen] = useState(
    initialStateCheckers.isVendorManagementOpen(location.pathname)
  );
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(
    initialStateCheckers.isStaffManagementOpen(location.pathname)
  );
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(
    initialStateCheckers.isUserManagementOpen(location.pathname)
  );
  const [isPromotionsOffersOpen, setIsPromotionsOffersOpen] = useState(
    initialStateCheckers.isPromotionsOffersOpen(location.pathname)
  );
  const [isReportsOpen, setIsReportsOpen] = useState(
    initialStateCheckers.isReportsOpen(location.pathname)
  );
  const [isSystemOpen, setIsSystemOpen] = useState(
    initialStateCheckers.isSystemOpen(location.pathname)
  );
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(
    initialStateCheckers.isNotificationsOpen(location.pathname)
  );
  const [isRatingsReviewsOpen, setIsRatingsReviewsOpen] = useState(
    initialStateCheckers.isRatingsReviewsOpen(location.pathname)
  );
  const [isContactUsOpen, setIsContactUsOpen] = useState(
    initialStateCheckers.isContactUsOpen(location.pathname)
  );
  const [isResourceManagementOpen, setIsResourceManagementOpen] = useState(
    initialStateCheckers.isResourceManagementOpen(location.pathname)
  );
  const [isLocationsOpen, setIsLocationsOpen] = useState(
    initialStateCheckers.isLocationsOpen(location.pathname)
  );
  const [isDeliverySettingsOpen, setIsDeliverySettingsOpen] = useState(
    initialStateCheckers.isDeliverySettingsOpen(location.pathname)
  );

  // Additional config states
  const [isShopkeeperErpAdminOpen, setIsShopkeeperErpAdminOpen] = useState(
    location.pathname.startsWith('/shopkeeper-erp')
  );
  const [isPackingErpOpen, setIsPackingErpOpen] = useState(
    location.pathname.startsWith('/packing-erp')
  );
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isProcurementOpen, setIsProcurementOpen] = useState(
    location.pathname.startsWith('/procurement')
  );
  const [isMasterSetupOpen, setIsMasterSetupOpen] = useState(
    location.pathname.startsWith('/master-setup') || location.pathname.startsWith('/categories')
  );
  const [isProductMasterDataOpen, setIsProductMasterDataOpen] = useState(
    location.pathname.startsWith('/product-master-data')
  );
  const [isInventoryOpen, setIsInventoryOpen] = useState(
    location.pathname.startsWith('/inventory')
  );
  const [isPartnersOpen, setIsPartnersOpen] = useState(
    location.pathname.startsWith('/partner-management') || location.pathname.startsWith('/user-management/partners')
  );
  const [isOrdersOpen, setIsOrdersOpen] = useState(
    location.pathname.startsWith('/orders') || location.pathname.startsWith('/home-delivery-orders') || location.pathname.startsWith('/self-pickup-orders')
  );
  const [isSellersOpen, setIsSellersOpen] = useState(
    location.pathname.startsWith('/vendors')
  );
  const [isDeliveryBoysOpen, setIsDeliveryBoysOpen] = useState(
    location.pathname.startsWith('/delivery-boys')
  );
  const [isPromotionsOpen, setIsPromotionsOpen] = useState(
    location.pathname.startsWith('/promo-codes') || location.pathname.startsWith('/promotions')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname.startsWith('/system/settings') || location.pathname.startsWith('/delivery-charges')
  );
  const [isRatingsOpen, setIsRatingsOpen] = useState(
    location.pathname.startsWith('/ratings')
  );
  const [isResourcesOpen, setIsResourcesOpen] = useState(
    location.pathname.startsWith('/resource-management') || location.pathname.startsWith('/assets') || location.pathname.startsWith('/administration-report') || location.pathname.startsWith('/human-resource')
  );
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(
    location.pathname.startsWith('/activity-log')
  );
  const [isOfferImagesOpen, setIsOfferImagesOpen] = useState(
    location.pathname.startsWith('/offer-images')
  );
  const [isWebSettingsOpen, setIsWebSettingsOpen] = useState(
    location.pathname.startsWith('/web-settings')
  );
  const [isVsmsOpen, setIsVsmsOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isRouteManagementOpen, setIsRouteManagementOpen] = useState(
    location.pathname === '/vsms/vehicles' || location.pathname === '/vsms/routes-coverage' || location.pathname === '/vsms/live-tracking'
  );
  const [isVehicleManagementOpen, setIsVehicleManagementOpen] = useState(
    location.pathname === '/vsms/fuel-maintenance' || location.pathname === '/vsms/damages'
  );
  const [isExpenseManagementOpen, setIsExpenseManagementOpen] = useState(
    location.pathname.startsWith('/expenses')
  );
  const [isInventoryManagementOpen, setIsInventoryManagementOpen] = useState(
    location.pathname === '/vsms/stock-history'
  );
  const [isCashManagementOpen, setIsCashManagementOpen] = useState(
    location.pathname === '/vsms/cash-management'
  );

  // ============================================
  // STATE MAPS - For dynamic state access
  // ============================================

  const stateSetters: Record<string, (value: boolean) => void> = useMemo(
    () => ({
      isProductsOpen: setIsProductsOpen,
      isOrderManagementOpen: setIsOrderManagementOpen,
      isMyCategoryManagementOpen: setIsMyCategoryManagementOpen,
      isVendorManagementOpen: setIsVendorManagementOpen,
      isStaffManagementOpen: setIsStaffManagementOpen,
      isUserManagementOpen: setIsUserManagementOpen,
      isPromotionsOffersOpen: setIsPromotionsOffersOpen,
      isReportsOpen: setIsReportsOpen,
      isSystemOpen: setIsSystemOpen,
      isNotificationsOpen: setIsNotificationsOpen,
      isRatingsReviewsOpen: setIsRatingsReviewsOpen,
      isContactUsOpen: setIsContactUsOpen,
      isResourceManagementOpen: setIsResourceManagementOpen,
      isLocationsOpen: setIsLocationsOpen,
      isDeliverySettingsOpen: setIsDeliverySettingsOpen,
      isShopkeeperErpAdminOpen: setIsShopkeeperErpAdminOpen,
      isPackingErpOpen: setIsPackingErpOpen,
      isPricingOpen: setIsPricingOpen,
      isBarcodeOpen: setIsBarcodeOpen,
      isProcurementOpen: setIsProcurementOpen,
      isVsmsOpen: setIsVsmsOpen,
      isAssetsOpen: setIsAssetsOpen,
      isRouteManagementOpen: setIsRouteManagementOpen,
      isVehicleManagementOpen: setIsVehicleManagementOpen,
      isExpenseManagementOpen: setIsExpenseManagementOpen,
      isInventoryManagementOpen: setIsInventoryManagementOpen,
      isCashManagementOpen: setIsCashManagementOpen,
    }),
    []
  );

  const stateGetters: Record<string, boolean> = useMemo(
    () => ({
      isProductsOpen,
      isOrderManagementOpen,
      isMyCategoryManagementOpen,
      isVendorManagementOpen,
      isStaffManagementOpen,
      isUserManagementOpen,
      isPromotionsOffersOpen,
      isReportsOpen,
      isSystemOpen,
      isNotificationsOpen,
      isRatingsReviewsOpen,
      isContactUsOpen,
      isResourceManagementOpen,
      isLocationsOpen,
      isDeliverySettingsOpen,
      isShopkeeperErpAdminOpen,
      isPackingErpOpen,
      isPricingOpen,
      isBarcodeOpen,
      isProcurementOpen,
      isVsmsOpen,
      isAssetsOpen,
      isRouteManagementOpen,
      isVehicleManagementOpen,
      isExpenseManagementOpen,
      isInventoryManagementOpen,
      isCashManagementOpen,
    }),
    [
      isProductsOpen,
      isOrderManagementOpen,
      isMyCategoryManagementOpen,
      isVendorManagementOpen,
      isStaffManagementOpen,
      isUserManagementOpen,
      isPromotionsOffersOpen,
      isReportsOpen,
      isSystemOpen,
      isNotificationsOpen,
      isRatingsReviewsOpen,
      isContactUsOpen,
      isResourceManagementOpen,
      isLocationsOpen,
      isDeliverySettingsOpen,
      isShopkeeperErpAdminOpen,
      isPackingErpOpen,
      isPricingOpen,
      isBarcodeOpen,
      isProcurementOpen,
      isVsmsOpen,
      isAssetsOpen,
      isRouteManagementOpen,
      isVehicleManagementOpen,
      isExpenseManagementOpen,
      isInventoryManagementOpen,
      isCashManagementOpen,
    ]
  );

  const [isContactOpen, setIsContactOpen] = useState(
    location.pathname.startsWith('/contact-us')
  );

  const [isDeliveryOpen, setIsDeliveryOpen] = useState(
    location.pathname.startsWith('/delivery-settings')
  );

  const [isStaffOpen, setIsStaffOpen] = useState(
    location.pathname.startsWith('/staff-management')
  );
  const [isShopkeeperOpen, setIsShopkeeperOpen] = useState(
    location.pathname.startsWith('/shopkeeper')
  );
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
  ];

  const shopkeeperErpAdminSubItems = [
    { path: '/shopkeeper-erp?tab=order-processing', label: 'Order Processing', icon: ClipboardList },
    { path: '/shopkeeper-erp?tab=sla-monitoring', label: 'SLA Monitoring', icon: BarChart3 },
    { path: '/shopkeeper-erp?tab=staff-tracker', label: 'Staff Tracker', icon: Users },
    { path: '/shopkeeper-erp?tab=settings', label: 'Storage Operations', icon: Package, permission: 'PLM Settings' }
  ];

  // const categorySubItems = [
  //   { path: '/categories/order', label: 'Order Categories' },
  // ];


  const ordersSubItems = [
    { path: '/orders/live-dashboard', label: 'Live OMS Dashboard', icon: Activity },
    { path: '/home-delivery-orders', label: 'Home Delivery Orders', icon: Home },
    { path: '/self-pickup-orders', label: 'Self Pickup Orders', icon: Store },
    { path: '/orders/sla', label: 'SLA Center', icon: Clock },
    { path: '/orders/breached', label: 'Breached SLA', icon: Clock },
    { path: '/orders/escalated', label: 'Escalated SLA', icon: AlertTriangle },
    { path: '/audit/logs', label: 'Audit Logs', icon: History },
    { path: '/fraud/risk-queue', label: 'Fraud Queue', icon: ShieldAlert },
    { path: '/settlements/dashboard', label: 'Settlement Dashboard', icon: Landmark },
    { path: '/settlements/commission-rules', label: 'Commission Rules', icon: Settings },
    { path: '/notifications/logs', label: 'Notification Logs', icon: MessageSquare },
    { path: '/analytics/dashboard', label: 'OMS Analytics', icon: BarChart2 },
  ];


  const promotionsSubItems = [
    { path: '/promo-codes/manage', label: 'Promo Codes', icon: Tag },
    { path: '/promo-codes/banners', label: 'Banners', icon: Image },
    { path: '/promo-codes/campaigns', label: 'Campaigns', icon: Megaphone },
  ];

  const settingsSubItems = [
    { path: '/settings/root-map-creation', label: 'Root Map Creation', icon: MapPin },
    { path: '/settings/slot-management', label: 'Slot Management', icon: Clock },
    { path: '/settings/delivery-zone-management', label: 'Delivery Zone Management', icon: Map },
  ];

  const ratingsSubItems = [
    { path: '/products/ratings', label: 'Product Ratings', icon: Star },
    { path: '/service-ratings', label: 'Service Ratings', icon: Smile },
  ];

  const locationsSubItems = [
    { path: '/master-setup/countries', label: 'Countries', icon: MapPin },
    { path: '/master-setup/states', label: 'State', icon: MapPin },
    { path: '/master-setup/districts', label: 'District', icon: Navigation },
    { path: '/master-setup/areas', label: 'Areas/Cities', icon: Building2 },
    { path: '/master-setup/zip-codes', label: 'Zip Codes', icon: Hash },
    // { path: '/locations/areas', label: 'Areas', icon: Grid },
  ];


  const resourcesSubItems = [
    { path: '/resource-management/assets', label: 'Assets', icon: Database },
    { path: '/resource-management/adminstation', label: 'Administration Report', icon: FileText },
    { path: '/resource-management/humen', label: 'Humen Resource', icon: FileText },
  ];

  const partnerSubItems = [
    {
      path: '/user-management/partners',
      label: 'Manage Partners',
      icon: Handshake,
    },
    {
      path: '/partner-management/partner-wallet',
      label: 'Partner Wallet Transactions',
      icon: Wallet,
    },
    {
      path: '/partner-management/partner-policies',
      label: 'Partner Policies',
      icon: FileText,
    },
  ]


  const activityLogSubItems = [
    { path: '/activity-log/policies', label: 'Policies', icon: FileText },
    { path: '/activity-log/customer', label: 'Customer', icon: Users },
    { path: '/activity-log/partner', label: 'Partner', icon: UserCheck },
    { path: '/activity-log/vendor', label: 'Vendor', icon: Store },
    { path: '/activity-log/hr-policies', label: 'HR Policies', icon: Shield },
    { path: '/activity-log/app-links', label: 'App Links', icon: Smartphone },
    { path: '/activity-log/faqs', label: "FAQ's", icon: HelpCircle },
  ];

  const shopkeeperSubItems = [
    { path: '/shopkeeper?tab=order-processing', label: 'Order Processing', icon: ClipboardList },
    { path: '/shopkeeper?tab=sla-monitoring', label: 'SLA Monitoring', icon: BarChart3 },
    { path: '/shopkeeper?tab=staff-tracker', label: 'Staff Tracker', icon: Users }
  ];

  const contactSubItems = [
    { path: '/contact-us/customer', label: 'Customer', icon: Users },
    { path: '/contact-us/partner', label: 'Partner', icon: UserCheck },
    { path: '/contact-us/vendor', label: 'Vendor', icon: Store },
    { path: '/contact-us/staff', label: 'Staff / Human Resources', icon: Users2 },
    { path: '/contact-us/social-media', label: 'Social Media Links', icon: Share2 },
    { path: '/contact-us/app-links', label: 'App Links', icon: Smartphone },
    { path: '/contact-us/faqs', label: "FAQ's", icon: HelpCircle },
  ];



  const deliverySubItems = [
    {
      path: '/delivery-settings/delivery-types',
      label: 'Delivery Types',
      icon: Truck,
    },
    {
      path: '/delivery-settings/scheduled-delivery',
      label: 'Scheduled Delivery',
      icon: CalendarClock,
    },
    {
      path: "/delivery-settings/store-pickup",
      label: "Store Pickup",
      icon: CalendarClock,
    },
  ];

  const staffSubItems = [
    {
      path: '/staff-management/delivery-agents',
      label: 'Delivery Agents',
      icon: UserCheck,
    },
  ];

  const masterSetupSubItems = [
    { path: '/master-setup/centrals', label: 'States', icon: Building2 },
    { path: '/master-setup/zones', label: 'Zones', icon: MapPin },
    { path: '/master-setup/clusters', label: 'Clusters', icon: Users },
    { path: '/master-setup/stores', label: 'Stores', icon: Store },
    { path: '/master-setup/mobileStores', label: 'Mobile Stores', icon: Truck },
    { path: '/categories/manage', label: 'Categories', icon: FolderTree },
    // { path: '/vsms/assets?tab=categories', label: 'Asset Categories', icon: FolderTree },
    { path: '/categories/sub-categories', label: 'Sub-Categories', icon: Layers },
    { path: '/products/brands', label: 'Brands', icon: Award },

    { path: '/master-setup/attributes', label: 'Attributes', icon: Tag },
    { path: '/master-setup/unit-types', label: 'Unit Types', icon: Layers },
    { path: '/products/units', label: 'Units', icon: Ruler },
    { path: '/products/taxes', label: 'Taxes', icon: Percent },
    { path: '/master-setup/role-management', label: 'Role Management', icon: ShieldCheck },
    { path: '/master-setup/settings', label: 'Settings', icon: Settings },
    { path: '/master-setup/inventory-management', label: 'Inventory Management', icon: Package },
    { path: '/master-setup/expense-management', label: 'Expense Management', icon: Receipt },
    { path: '/master-setup/asset-management', label: 'Asset Management', icon: Tag },
    { path: '/master-setup/business-profile', label: 'Business Profile', icon: Store },
    { path: '/master-setup/tax-settings', label: 'Tax Settings', icon: Percent },
    { path: '/master-setup/shift-management', label: 'Shift Management', icon: Clock },
    { path: '/products/bundles', label: 'Bundle Deals', icon: Tag },
    { path: '/marketing/promos', label: 'Homepage Promos', icon: Percent },
    { path: '/master-setup/delivery-fee-slabs', label: 'Delivery Fee Slabs', icon: Truck },
    { path: '/master-setup/time-slots', label: 'Time Slots Management', icon: Clock },
    { path: '/master-setup/radius-enforcement', label: 'Radius Enforcement', icon: MapPin },
    // { path: '/master-setup/countries', label: 'Countries', icon: MapPin }, // Moved to Locations
    // { path: '/master-setup/states', label: 'State', icon: MapPin },
    // { path: '/master-setup/districts', label: 'District', icon: Navigation }, // Moved to Locations
    // { path: '/master-setup/areas', label: 'Areas/Cities', icon: Building2 },
    { path: '/master-setup/about-us', label: 'About Us', icon: Info },
    { path: '/master-setup/contact-us', label: 'Contact Us', icon: Phone },
    { path: '/master-setup/terms-conditions', label: 'Terms and Conditions', icon: FileText },
    { path: '/master-setup/privacy-policy', label: 'Privacy and Policy', icon: Shield },
  ];

  const procurementSubItems = [
    { path: '/procurement?tab=vendors', label: 'Vendors', icon: Users },
    { path: '/procurement?tab=mapping', label: 'Item Mapping', icon: Link2 },
    { path: '/procurement?tab=po', label: 'Purchase Orders', icon: ClipboardList },
    { path: '/procurement?tab=grn', label: 'Goods Receipt', icon: Truck },
    { path: '/procurement?tab=purchases', label: 'Purchases', icon: ShoppingCart },
    { path: '/procurement?tab=ledger', label: 'Stock Ledger', icon: BookOpen },
    { path: '/procurement?tab=payments', label: 'Payments', icon: CreditCard },
    { path: '/procurement?tab=reports', label: 'Reports', icon: BarChart3 },
  ];

  const productSubItems = [
    { path: '/products/manage', label: 'Manage Products', icon: Package },
    { path: '/products/approve', label: 'Partner Approve Requests', icon: CheckCircle },
    { path: '/products/ratings', label: 'Partner Product Ratings', icon: Star },
    { path: '/products/media', label: 'Partner Media', icon: Film },
  ];
  const pricingSubItems = [
    { path: '/pricing/price-books', label: 'Price Books', icon: BookOpen },
    { path: '/pricing/product-pricing', label: 'Product Pricing', icon: Tag },
    { path: '/pricing/price-comparison', label: 'Price Comparison', icon: BarChart2 }
  ];
  const productMasterDataSubItems = [
    { path: '/product-master-data/manage', label: 'Manage Products', icon: Package },
    { path: '/product-master-data/ratings', label: 'Product Ratings', icon: Star },
    { path: '/product-master-data/media', label: 'Media', icon: Film },
    { path: '/product-master-data/bulk-upload', label: 'Bulk Upload', icon: Upload },
    { path: '/product-master-data/bulk-update', label: 'Bulk Update', icon: RefreshCw },
    // { path: '/product-master-data/import-products', label: 'Import Products', icon: ArrowDownToLine },
    // { path: '/product-master-data/export-products', label: 'Export Products', icon: ArrowUpFromLine },
  ];

  // const partnerCategorySubItems = [
  //   { path: '/partner-category-mapping/partner-categories', label: 'Partner Categories', icon: Package },
  //   { path: '/partner-category-mapping/partner-special-categories', label: 'Partner Special Categories', icon: Package },
  //   { path: '/partner-category-mapping/approve-request', label: 'Approve Requests', icon: Package },
  // ];


  const userManagementSubItems = [
    // { path: '/delivery-boys/requests', label: 'Delivery agent', icon: Truck },
    // { path: '/vendors/requests', label: 'Vendors', icon: Store },
    { path: '/user-management/admins', label: 'Admins', icon: UserCog },
    // { path: '/user-management/partners', label: 'Partners', icon: Handshake }, // Moved to Partner Management
    { path: '/user-management/customers', label: 'Customers', icon: Users },
    { path: '/user-management/customers-categories', label: 'Customers Categories', icon: Handshake },
  ];

  const sellerSubItems = [
    { path: '/vendors/manage', label: 'Manage Vendors', icon: UserCheck },
    { path: '/vendors/wallet-transactions', label: 'Vendor Wallet Transactions', icon: Wallet },
    { path: '/vendors/policies', label: 'Vendor Policies', icon: FileText },
  ];



  const offerImageSubItems = [
    { path: '/offer-images/manage', label: 'Manage Offer Images', icon: ImageIcon },
    { path: '/offer-images/popup', label: 'Manage Popup Offer', icon: Maximize2 },
  ];



  const systemSubItems = [
    { path: '/system/store-settings', label: 'Store Settings', icon: Settings },
    // { path: '/system/delivery-settings', label: 'Delivery Settings', icon: Clock },
    { path: '/system/payment-methods', label: 'Payment Methods', icon: CreditCard },
    // { path: '/system/contact-us', label: 'Contact Us', icon: Phone }, // Moved to Master Setup
    { path: '/system/about-us', label: 'About Us', icon: Info },
    { path: '/system/seo-settings', label: 'SEO Settings', icon: Globe },
  ];

  const webSettingsSubItems = [
    { path: '/web-settings/general', label: 'General Web Settings', icon: Settings },
    { path: '/web-settings/social-media', label: 'Social Media', icon: Share2 },
  ];


  const vsmsSubItems = [
    { path: '/vsms/live-tracking', label: 'Live Agent Tracking', icon: Radio },
    { path: '/vsms/vehicles', label: 'Fleet Vehicles', icon: Truck },
    { path: '/vsms/fuel-maintenance', label: 'Fuel & Maintenance', icon: RefreshCw },
    { path: '/vsms/damages', label: 'Vehicle Damages', icon: AlertTriangle },
    { path: '/vsms/routes-coverage', label: 'Routes & Coverage', icon: MapPin },
    { path: '/vsms/stock-history', label: 'Vehicle Stock & Audits', icon: Boxes },
    { path: '/vsms/cash-management', label: 'Cash Management', icon: Wallet },
    { path: '/vsms/pos', label: 'Point of Sale', icon: ScanLine },
    { path: '/vsms/sales', label: 'Sales History', icon: Receipt },
  ];

  const barcodeSubItems = [
    { path: '/vsms/barcodes?tab=master', label: 'Barcode Master', icon: ScanLine },
    { path: '/vsms/barcodes?tab=printing', label: 'Barcode Printing', icon: Printer },
  ];

  const assetSubItems = [
    { path: '/vsms/assets?tab=master', label: 'Assets Registry', icon: Package },
    { path: '/vsms/assets?tab=tracking', label: 'Asset Assignment', icon: Users },
    { path: '/vsms/assets?tab=transfers', label: 'Asset Transfers', icon: ArrowRightLeft },
    { path: '/vsms/assets?tab=vehicle-mapping', label: 'Vehicle Mapping', icon: Truck },
    { path: '/vsms/assets?tab=issues', label: 'Asset Maintenance', icon: Wrench },
    { path: '/vsms/assets?tab=depreciation', label: 'Depreciation', icon: Percent },
    { path: '/vsms/assets?tab=audit', label: 'Asset Audit', icon: ClipboardList },
    { path: '/vsms/assets?tab=requests', label: 'Asset Requests', icon: HelpCircle },
    { path: '/vsms/assets?tab=reports', label: 'Asset Reports', icon: BarChart3 },
  ];

  const deliveryBoySubItems = [
    { path: '/delivery-boys/manage', label: 'Manage Delivery agents', icon: UserCheck },
    { path: '/delivery-boys/fund-transfers', label: 'Fund Transfers', icon: ArrowRightLeft },
    { path: '/delivery-boys/cash-collections', label: 'Cash Collection', icon: DollarSign },
    { path: '/delivery-boys/policies', label: 'Delivery boy policies', icon: FileText },
  ];

  // const isCategoryActive = location.pathname.startsWith('/categories/order');

  // Dynamic permission filters
  const filteredUserManagementSubItems = userManagementSubItems.filter(() => hasModuleViewPermission("User Management"));
  const filteredMasterSetupSubItems = masterSetupSubItems.filter(() => hasModuleViewPermission("Master Setup"));
  const filteredProductSubItems = productSubItems.filter(() => hasModuleViewPermission("Product Management"));
  const filteredPricingSubItems = pricingSubItems.filter(() => hasModuleViewPermission("Pricing Engine"));
  const filteredProductMasterDataSubItems = productMasterDataSubItems.filter(() => hasModuleViewPermission("Product Management"));
  const filteredBarcodeSubItems: any[] = [];
  const filteredProcurementSubItems = procurementSubItems.filter(() => hasModuleViewPermission("Procurement Management"));
  const filteredPartnerSubItems = partnerSubItems.filter(() => hasModuleViewPermission("Partner Management"));
  const filteredOrdersSubItems = ordersSubItems.filter(() => hasModuleViewPermission("Orders Management"));
  const filteredSellerSubItems = sellerSubItems.filter(() => hasModuleViewPermission("Vendor Management"));
  const filteredStaffSubItems = staffSubItems.filter(() => hasModuleViewPermission("Staff Management"));
  const filteredShopkeeperSubItems = (typeof shopkeeperSubItems !== 'undefined' ? shopkeeperSubItems : []).filter(item => hasSubPermission("Shopkeeper", item.label));
  const filteredShopkeeperErpAdminSubItems = shopkeeperErpAdminSubItems.filter(item => hasSubPermission("Shopkeeper", item.label));
  const filteredDeliveryBoySubItems = deliveryBoySubItems.filter(() => hasModuleViewPermission("Delivery Management"));
  const filteredPromotionsSubItems = promotionsSubItems.filter(() => hasModuleViewPermission("Promotions & Offers"));
  const filteredVsmsSubItems = vsmsSubItems.filter(item => {
    if (item.label === "Point of Sale") {
      return hasModuleViewPermission("Point of Sales");
    }
    return hasSubPermission("VSMS Logistics", item.label);
  });
  const filteredAssetSubItems = assetSubItems.filter(item => hasSubPermission("Fleet Assets", item.label));
  const filteredSettingsSubItems = settingsSubItems.filter(() => hasModuleViewPermission("Settings"));
  const filteredRatingsSubItems = ratingsSubItems.filter(() => hasModuleViewPermission("Ratings & Reviews"));
  const filteredResourcesSubItems = resourcesSubItems.filter(() => hasModuleViewPermission("Resource Management"));
  const filteredSystemSubItems = systemSubItems.filter(() => hasModuleViewPermission("System Settings"));
  const filteredWebSettingsSubItems = webSettingsSubItems.filter(() => hasModuleViewPermission("System Settings"));
  const filteredLocationsSubItems = locationsSubItems.filter(() => hasModuleViewPermission("Master Setup"));
  const filteredContactSubItems = contactSubItems.filter(() => hasModuleViewPermission("Contact Us"));
  const filteredOfferImageSubItems = offerImageSubItems.filter(() => hasModuleViewPermission("Offer Images"));
  const filteredDeliverySubItems = deliverySubItems.filter(() => hasModuleViewPermission("Delivery Management"));

  const isUserManagementActive =
    location.pathname.startsWith('/delivery-boys/requests') ||
    location.pathname.startsWith('/delivery-boys/create') ||
    location.pathname.startsWith('/delivery-boys/edit') ||
    location.pathname.startsWith('/delivery-boys/view') ||
    location.pathname.startsWith('/vendors/requests') ||
    location.pathname.startsWith('/vendors/create') ||
    location.pathname.startsWith('/vendors/edit') ||
    location.pathname.startsWith('/vendors/view') ||
    (location.pathname.startsWith('/user-management') &&
      !location.pathname.startsWith('/user-management/partners'));
  const isMasterSetupActive =
    location.pathname.startsWith('/categories') ||
    location.pathname.startsWith('/categories/sub-categories') ||
    location.pathname.startsWith('/products/brands') ||
    location.pathname.startsWith('/products/units') ||
    location.pathname.startsWith('/products/taxes') ||
    (location.pathname.startsWith('/master-setup') &&
      !location.pathname.startsWith('/master-setup/countries') &&
      !location.pathname.startsWith('/master-setup/districts')) ||
    location.pathname.startsWith('/master-setup/contact-us');

  const isProductActive = location.pathname.startsWith('/products') &&
    !location.pathname.startsWith('/products/brands') &&
    !location.pathname.startsWith('/products/units') &&
    !location.pathname.startsWith('/products/taxes');
  const isProductMasterDataActive = location.pathname.startsWith('/product-master-data');
  const isPricingActive = location.pathname.startsWith('/pricing');
  const isBarcodeActive = location.pathname.startsWith('/vsms/barcodes');
  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isOfferImageActive = location.pathname.startsWith('/offer-images');
  const isSystemActive = location.pathname.startsWith('/system');
  const isWebSettingsActive = location.pathname.startsWith('/web-settings');
  const isSellerActive = location.pathname.startsWith('/vendors') &&
    !location.pathname.startsWith('/vendors/requests') &&
    !location.pathname.startsWith('/vendors/create') &&
    !location.pathname.startsWith('/vendors/edit') &&
    !location.pathname.startsWith('/vendors/view');
  const isDeliveryBoyActive = location.pathname.startsWith('/delivery-boys') &&
    !location.pathname.startsWith('/delivery-boys/requests') &&
    !location.pathname.startsWith('/delivery-boys/view') &&
    !location.pathname.startsWith('/delivery-boys/create') &&
    !location.pathname.startsWith('/delivery-boys/edit');

  // Check if we're on a view page that should be under Delivery Boys or Sellers
  const isDeliveryBoyViewPage = location.pathname.startsWith('/delivery-boys/view');
  const isSellerViewPage = location.pathname.startsWith('/vendors/view');

  // Adjust active states for view pages
  const finalDeliveryBoyActive = isDeliveryBoyActive || isDeliveryBoyViewPage;
  const finalSellerActive = isSellerActive || isSellerViewPage;

  const finalOrdersActive =
    location.pathname.startsWith('/orders') ||
    location.pathname.startsWith("/home-delivery-orders") ||
    location.pathname.startsWith('/self-pickup-orders');
  const finalPromotionsActive = location.pathname.startsWith('/promotions');
  const finalSettingsActive = location.pathname.startsWith('/settings');
  const finalNotificationsActive = location.pathname.startsWith('/notifications');
  const finalRatingsActive = location.pathname.startsWith('/ratings');
  const finalLocationsActive = location.pathname.startsWith('/locations') ||
    location.pathname.startsWith('/master-setup/countries') ||
    location.pathname.startsWith('/master-setup/districts');
  const finalResourcesActive = location.pathname.startsWith('/resource-management');
  const finalPartnersActive = location.pathname.startsWith('/partner-management') ||
    location.pathname.startsWith('/user-management/partners');
  const finalActivityLogActive =
    location.pathname.startsWith('/activity-log');
  const finalContactActive = location.pathname.startsWith('/contact-us');
  const finalDeliveryActive =
    location.pathname.startsWith('/delivery-settings');
  const finalStaffActive =
    location.pathname.startsWith('/staff-management');

  // Update menu open states when location changes
  useEffect(() => {
    setIsUserManagementOpen(
      initialStateCheckers.isUserManagementOpen(location.pathname)
    );
    setIsVendorManagementOpen(
      initialStateCheckers.isVendorManagementOpen(location.pathname)
    );
    setIsOrderManagementOpen(
      initialStateCheckers.isOrderManagementOpen(location.pathname)
    );
    setIsMyCategoryManagementOpen(
      initialStateCheckers.isMyCategoryManagementOpen(location.pathname)
    );
    setIsStaffManagementOpen(
      initialStateCheckers.isStaffManagementOpen(location.pathname)
    );
    setIsPromotionsOffersOpen(
      initialStateCheckers.isPromotionsOffersOpen(location.pathname)
    );
    setIsNotificationsOpen(
      initialStateCheckers.isNotificationsOpen(location.pathname)
    );
    setIsRatingsReviewsOpen(
      initialStateCheckers.isRatingsReviewsOpen(location.pathname)
    );
    setIsContactUsOpen(initialStateCheckers.isContactUsOpen(location.pathname));
    setIsResourceManagementOpen(
      initialStateCheckers.isResourceManagementOpen(location.pathname)
    );
    setIsLocationsOpen(initialStateCheckers.isLocationsOpen(location.pathname));
    setIsDeliverySettingsOpen(
      initialStateCheckers.isDeliverySettingsOpen(location.pathname)
    );
    setIsPackingErpOpen(location.pathname.startsWith('/packing-erp'));
  }, [location.pathname]);

  // ============================================
  // HELPER FUNCTIONS - For checking active state
  // ============================================

  const isItemActive = useCallback(
    (section: MenuSection): boolean => {
      if (section.path) {
        if (section.path === "/") {
          return location.pathname === "/";
        }
        return location.pathname.startsWith(section.path);
      }

      if (section.subItems) {
        return section.subItems.some((item) => {
          if (item.activeCheck) {
            return item.activeCheck(location.pathname);
          }
          return location.pathname.startsWith(item.path);
        });
      }

      return false;
    },
    [location.pathname]
  );

  const isSubItemActive = useCallback(
    (path: string): boolean => {
      if (path === "/") {
        return location.pathname === "/";
      }
      // Handle paths with query strings (e.g., /vsms/cash-management?tab=reconciliation)
      if (path.includes('?')) {
        const [basePath, queryString] = path.split('?');
        return location.pathname === basePath && location.search === '?' + queryString;
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname, location.search]
  );

  // ============================================
  // RENDER HELPER FUNCTIONS
  // ============================================

  const renderSectionHeader = useCallback((title: string) => {
    return (
      <div className="mt-1">
        <div className="px-3 py-2 mb-2">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {title}
          </span>
        </div>
      </div>
    );
  }, []);

  const renderLinkItem = useCallback(
    (section: MenuSection) => {
      if (!section.path || !section.label || !section.icon) return null;

      // Permission gate for link items
      if (!hasModuleViewPermission(section.permission || section.label)) {
        return null;
      }

      const isActive = isItemActive(section);
      const Icon = section.icon;

      return (
        <div className="mt-1" key={section.path}>
          <Link
            to={section.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isActive
              ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400"
              }`}
          >
            <Icon size={16} />
            <span>{section.label}</span>
          </Link>
        </div>
      );
    },
    [isItemActive, hasModuleViewPermission]
  );

  const renderCollapsibleItem = useCallback(
    (section: MenuSection) => {
      if (
        !section.label ||
        !section.icon ||
        !section.stateKey ||
        !section.subItems
      )
        return null;

      const isParentAllowed = hasModuleViewPermission(section.permission || section.label);

      // Filter sub-items by permissions
      const visibleSubItems = section.subItems.filter((item) => {
        if (item.hidden) return false;
        // If parent module does not have granular sub-permissions, render all its children if the parent is allowed
        if (!section.hasSubPermissions) {
          return isParentAllowed;
        }
        return hasModuleViewPermission(item.permission || item.label) || hasSubPermission(section.label || "", item.permission || item.label);
      });

      // Permission gate: Hide collapsible menu if parent module is denied AND no sub-items are allowed
      if (!isParentAllowed && visibleSubItems.length === 0) {
        return null;
      }

      const isOpen = stateGetters[section.stateKey] || false;
      const setIsOpen = stateSetters[section.stateKey];
      const isActive = isItemActive(section);
      const Icon = section.icon;

      const isPromotionsActive =
        section.stateKey === "isPromotionsOffersOpen" &&
        (isOpen ||
          location.pathname.startsWith("/promo-codes") ||
          location.pathname.startsWith("/banners") ||
          location.pathname.startsWith("/campaigns") ||
          location.pathname.startsWith("/advertisement"));

      const isNotificationsActive =
        section.stateKey === "isNotificationsOpen" &&
        (isOpen || location.pathname.startsWith("/notifications"));

      const isRatingsActive =
        section.stateKey === "isRatingsReviewsOpen" &&
        (isOpen ||
          location.pathname.startsWith("/ratings") ||
          location.pathname.startsWith("/reviews"));

      const isContactUsActive =
        section.stateKey === "isContactUsOpen" &&
        (isOpen || location.pathname.startsWith("/contact-us"));

      const isLocationsActive =
        section.stateKey === "isLocationsOpen" &&
        (isOpen ||
          location.pathname.startsWith("/locations") ||
          location.pathname.startsWith("/states") ||
          location.pathname.startsWith("/cities") ||
          location.pathname.startsWith("/zip-codes") ||
          location.pathname.startsWith("/areas"));

      const isOrderManagementActive =
        section.stateKey === "isOrderManagementOpen" &&
        (isOpen ||
          location.pathname.startsWith("/orders") ||
          location.pathname.startsWith("/home-delivery-orders") ||
          location.pathname.startsWith("/self-pickup-orders"));

      const finalActive =
        isActive ||
        isPromotionsActive ||
        isNotificationsActive ||
        isRatingsActive ||
        isContactUsActive ||
        isLocationsActive ||
        isOrderManagementActive ||
        (section.stateKey === "isReportsOpen" &&
          location.pathname.startsWith("/reports")) ||
        (section.stateKey === "isSystemOpen" &&
          location.pathname.startsWith("/system")) ||
        (section.stateKey === "isExpenseManagementOpen" &&
          location.pathname.startsWith("/expenses")) ||
        (section.stateKey === "isCashManagementOpen" &&
          (location.pathname === "/vsms/cash-management" || location.pathname.startsWith("/vsms/cash-reconciliation")));

      return (
        <div className="mt-1" key={section.stateKey}>
          <button
            onClick={() => setIsOpen && setIsOpen(!isOpen)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalActive
              ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400"
              }`}
          >
            <div
              className={`flex items-center gap-2 ${section.stateKey === "isProductsOpen" ? "min-w-0" : ""
                }`}
            >
              <Icon
                size={16}
                className={
                  section.stateKey === "isProductsOpen" ? "flex-shrink-0" : ""
                }
              />
              <span
                className={
                  section.stateKey === "isProductsOpen"
                    ? "whitespace-nowrap truncate text-sm"
                    : ""
                }
              >
                {section.label}
              </span>
            </div>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <div
            className={`overflow-hidden ${isOpen ? "dropdown-enter" : "dropdown-exit"
              }`}
            style={{
              maxHeight: isOpen ? "500px" : "0",
              transition:
                section.stateKey === "isUserManagementOpen" && isOpen
                  ? "max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {visibleSubItems.length > 0 && (
              <div className="ml-4 space-y-1">
                {visibleSubItems.map((subItem: SubMenuItem, index) => {
                  const isActive = subItem.activeCheck
                    ? subItem.activeCheck(location.pathname)
                    : isSubItemActive(subItem.path);
                  const SubIcon = subItem.icon;
                  const totalItems = visibleSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isOpen ? "dropdown-item" : "dropdown-item-exit"
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400"
                        }`}
                      style={{
                        animationDelay: isOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <SubIcon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    },
    [
      stateGetters,
      stateSetters,
      isItemActive,
      isSubItemActive,
      location.pathname,
    ]
  );

  // ============================================
  // MAIN RENDER - Complete sidebar UI
  // ============================================

  return (
    <aside
      className={`w-72 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 h-screen flex flex-col fixed left-0 top-0 z-50 overflow-hidden transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 ${isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      style={{ fontFamily: "'Segoe UI', sans-serif" }}
    >
      {/* Header Section - Logo and Close Button */}
      <div className="py-4 pl-5 pr-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 h-12 flex items-center justify-center overflow-hidden">
            <img
              src="/villagekart_svg_icon-2.svg"
              alt="VillagKart"
              className="max-w-[260px] w-full h-full object-contain object-center"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  const icon = document.createElement("div");
                  icon.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
                  parent.appendChild(icon);
                }
              }}
            />
          </div>
          {setIsOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Close menu"
            >
              <X size={18} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden sidebar-scrollbar min-h-0">
        {sidebarConfig.map((section, index) => {
          if (section.hidden) return null;

          // Helper to check if a specific menu section/item is allowed to be visible
          const checkItemVisible = (item: typeof section) => {
            if (item.hidden) return false;
            if (item.type === "link") {
              if (!item.path || !item.label) return false;
              if (item.label === "Dashboard") {
                return hasModuleViewPermission(item.permission || item.label);
              }
              return hasModuleViewPermission(item.permission || item.label);
            }
            if (item.type === "collapsible") {
              if (!item.label || !item.subItems) return false;
              const isParentAllowed = hasModuleViewPermission(item.permission || item.label);
              const visibleSubItems = item.subItems.filter((sub) => {
                if (sub.hidden) return false;
                if (!item.hasSubPermissions) {
                  return isParentAllowed;
                }
                return hasModuleViewPermission(sub.permission || sub.label) || hasSubPermission(item.label || "", sub.permission || sub.label);
              });
              return isParentAllowed || visibleSubItems.length > 0;
            }
            return false;
          };

          const key =
            section.sectionTitle ||
            section.path ||
            section.stateKey ||
            `sidebar-${index}`;
          switch (section.type) {
            case "section":
              // Check if there are any visible items in this section before the next section starts
              let hasVisibleItems = false;
              for (let i = index + 1; i < sidebarConfig.length; i++) {
                const nextItem = sidebarConfig[i];
                if (nextItem.type === "section") break;
                if (checkItemVisible(nextItem)) {
                  hasVisibleItems = true;
                  break;
                }
              }
              if (!hasVisibleItems) return null;

              return section.sectionTitle ? (
                <div key={key}>{renderSectionHeader(section.sectionTitle)}</div>
              ) : null;
            case "link":
              return <div key={key}>{renderLinkItem(section)}</div>;
            case "collapsible":
              return <div key={key}>{renderCollapsibleItem(section)}</div>;
            default:
              return null;
          }
        })}

      </nav>
    </aside>
  );
};

export default Sidebar;
