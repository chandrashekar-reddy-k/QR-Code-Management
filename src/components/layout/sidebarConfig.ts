import {
  Home,
  Package,
  ShoppingCart,
  Store,
  Image as ImageIcon,
  Tag,
  Ticket,
  Truck,
  Settings,
  Percent,
  MapPin,
  Navigation,
  Building2,
  Phone,
  Info,
  FileText,
  Shield,
  Upload,
  RefreshCw,
  Film,
  Users,
  Boxes,
  ClipboardList,
  Bell,
  UserCheck,
  Wallet,
  DollarSign,
  Sliders,
  Clock,
  CreditCard,
  Globe,
  BarChart3,
  Download,
  ShoppingBag,
  Map,
  Calendar,
  Car,
  Star as StarIcon,
  AlertTriangle,
  ScanLine,
  Printer,
  Receipt,
  Database,
  ArrowRightLeft,
  Wrench,
  HelpCircle,      // ← ADD
  BookOpen,   // ← ADD
  History,
  RotateCcw,
  CheckCircle,
  Link2,
  Banknote,
} from "lucide-react";
import { LucideIcon } from "lucide-react";


// Menu item types
export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  hidden?: boolean; // For commented out items
}

export interface SubMenuItem extends MenuItem {
  hidden?: boolean;
  /** When set, used instead of path match to determine if this sub-item is active */
  activeCheck?: (pathname: string) => boolean;
}

export interface MenuSection {
  type: "section" | "link" | "collapsible";
  sectionTitle?: string; // For section headers
  path?: string; // For direct links
  label?: string; // For direct links
  icon?: LucideIcon; // For direct links
  subItems?: SubMenuItem[]; // For collapsible menus
  stateKey?: string; // Key for managing open/close state
  activeCheck?: (pathname: string) => boolean; // Custom active state logic
  hidden?: boolean;
}

// Active state check functions
export const activeCheckers = {
  isUserManagementActive: (pathname: string) =>
    pathname.startsWith("/user-management"),
  isVendorManagementActive: (pathname: string) =>
    pathname.startsWith("/vendors") &&
    !pathname.startsWith("/vendors/requests") &&
    !pathname.startsWith("/vendors/create") &&
    !pathname.startsWith("/vendors/edit") &&
    !pathname.startsWith("/vendors/view"),
  isMyCategoryManagementActive: (pathname: string) =>
    pathname.startsWith("/my-categories") ||
    pathname.startsWith("/my-sub-categories"),
  isProductActive: (pathname: string) =>
    pathname.startsWith("/products") &&
    !pathname.startsWith("/products/brands") &&
    !pathname.startsWith("/products/units") &&
    !pathname.startsWith("/products/taxes"),
  /** Manage Products sub-item: active on manage list, create (add/edit variant), and product edit */
  isManageProductsActive: (pathname: string) =>
    pathname.startsWith("/products/manage") ||
    pathname === "/products/create" ||
    /^\/products\/[^/]+\/edit$/.test(pathname),
  isStockManagementActive: (pathname: string) =>
    pathname.startsWith("/stock") || pathname.startsWith("/inventory"),
  isOrderManagementActive: (pathname: string) =>
    pathname.startsWith("/orders") ||
    pathname.startsWith("/home-delivery-orders") ||
    pathname.startsWith("/self-pickup-orders") ||
    pathname.startsWith("/refunds") ||
    pathname.startsWith("/return-requests"),
  isStaffManagementActive: (pathname: string) =>
    pathname.startsWith("/delivery-boys") &&
    !pathname.startsWith("/delivery-boys/requests"),
};

// Initial state check functions for useEffect
export const initialStateCheckers = {
  isProductsOpen: (pathname: string) => pathname.startsWith("/products"),
  isOrderManagementOpen: (pathname: string) =>
    pathname.startsWith("/orders") ||
    pathname.startsWith("/home-delivery-orders") ||
    pathname.startsWith("/self-pickup-orders") ||
    pathname.startsWith("/refunds") ||
    pathname.startsWith("/return-requests"),
  isMyCategoryManagementOpen: (pathname: string) =>
    pathname.startsWith("/my-categories") ||
    pathname.startsWith("/my-sub-categories"),
  isVendorManagementOpen: (pathname: string) =>
    pathname.startsWith("/vendors") &&
    !pathname.startsWith("/vendors/requests") &&
    !pathname.startsWith("/vendors/create") &&
    !pathname.startsWith("/vendors/edit") &&
    !pathname.startsWith("/vendors/view"),
  isStaffManagementOpen: (pathname: string) =>
    pathname.startsWith("/delivery-boys") &&
    !pathname.startsWith("/delivery-boys/requests"),
  isUserManagementOpen: (pathname: string) =>
    pathname.startsWith("/user-management"),
  isPromotionsOffersOpen: (pathname: string) =>
    pathname.startsWith("/promo-codes") ||
    pathname.startsWith("/banners") ||
    pathname.startsWith("/campaigns"),
  isReportsOpen: (pathname: string) => pathname.startsWith("/reports"),
  isSystemOpen: (pathname: string) => pathname.startsWith("/system"),
  isNotificationsOpen: (pathname: string) =>
    pathname.startsWith("/notifications"),
  isRatingsReviewsOpen: (pathname: string) =>
    pathname.startsWith("/ratings") || pathname.startsWith("/reviews"),
  isContactUsOpen: (pathname: string) => pathname.startsWith("/contact-us"),
  isResourceManagementOpen: (pathname: string) =>
    pathname.startsWith("/resource-management") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/administration-report") ||
    pathname.startsWith("/human-resource"),
  isLocationsOpen: (pathname: string) =>
    pathname.startsWith("/locations") ||
    pathname.startsWith("/states") ||
    pathname.startsWith("/cities") ||
    pathname.startsWith("/zip-codes") ||
    pathname.startsWith("/areas"),
  isDeliverySettingsOpen: (pathname: string) =>
    pathname.startsWith("/delivery-settings") ||
    pathname.startsWith("/delivery-types") ||
    pathname.startsWith("/scheduled-delivery"),
  isVsmsOpen: (pathname: string) =>
    pathname.startsWith("/vsms") && !pathname.startsWith("/vsms/assets"),
  isAssetsOpen: (pathname: string) =>
    pathname.startsWith("/vsms/assets"),
  isProcurementOpen: (pathname: string) =>
    pathname.startsWith("/procurement"),
  isPricingOpen: (pathname: string) =>
    pathname.startsWith("/pricing"),
  isBarcodeOpen: (pathname: string) =>
    pathname.startsWith("/vsms/barcodes"),
};

// Menu configuration
export const sidebarConfig: MenuSection[] = [
  // Dashboard
  {
    type: "link",
    path: "/",
    label: "Dashboard",
    icon: Home,
  },

  {
    type: "collapsible",
    permission: "Partner: Shopkeeper ERP (Admin)",
    label: "Shopkeeper ERP (Admin)",
    icon: Store,
    stateKey: "isShopkeeperErpAdminOpen",
    hasSubPermissions: true,
    subItems: [
      { path: '/shopkeeper-erp?tab=dashboard', label: 'Dashboard', icon: Home },
      { path: '/shopkeeper-erp?tab=picking-queue', label: 'Picking Queue', icon: Package },
      { path: '/shopkeeper-erp?tab=packing-queue', label: 'Packing Queue', icon: Boxes },
      { path: '/shopkeeper-erp?tab=ready-orders', label: 'Ready for Dispatch', icon: CheckCircle },
      { path: '/shopkeeper-erp?tab=self-pickup', label: 'Self Pickup', icon: Store },
      { path: '/shopkeeper-erp?tab=returns', label: 'Returns', icon: RotateCcw },
      { path: '/shopkeeper-erp?tab=sla-monitoring', label: 'SLA Monitoring', icon: BarChart3 },
      { path: '/shopkeeper-erp?tab=orderhistory', label: 'Order History', icon: History },
      { path: '/shopkeeper-erp?tab=staff-tracker', label: 'Staff Tracker', icon: Users },
      { path: '/shopkeeper-erp?tab=settings', label: 'Location Settings', icon: Settings }
    ]
  },


  // PRODUCT & STOCK Section
  {
    type: "section",
    sectionTitle: "PRODUCT & STOCK",
  },
  {
    type: "collapsible",
    permission: "Partner: Product Management",
    label: "Product Management",
    icon: Package,
    stateKey: "isProductsOpen",
    hasSubPermissions: true,
    activeCheck: activeCheckers.isProductActive,
    subItems: [
      { path: "/products/manage", label: "Manage Products", icon: Package, activeCheck: activeCheckers.isManageProductsActive },
      { path: "/products/bundles", label: "Bundle Deals", icon: Tag },
      { path: "/marketing/promos", label: "Homepage Promos", icon: Percent },
      { path: "/products/media", label: "Media", icon: Film },
      { path: "/products/bulk-upload", label: "Bulk Upload", icon: Upload },
      { path: "/products/bulk-update", label: "Bulk Update", icon: RefreshCw },
      { path: "/products/import", label: "Import Products", icon: Download },
      { path: "/products/export", label: "Export Products", icon: Upload },
      // Hidden as per sidebar screenshots
      // { path: '/products/approve', label: 'Approve Requests', icon: CheckCircle, hidden: true },
      // { path: '/products/ratings', label: 'Product Ratings', icon: Star, hidden: true },
    ],
  },
  {
    type: "link",
    permission: "Partner: Stock Management",
    path: "/stock",
    label: "Stock Management",
    icon: Boxes,
    activeCheck: activeCheckers.isStockManagementActive,
  },

  {
    type: "link",
    permission: "Partner: Reservations",
    path: "/inventory/monitoring/reservations",
    label: "Reservations",
    icon: Clock,
  },
  {
    type: "collapsible",
    permission: "Partner: Pricing Engine",
    label: "Pricing Engine",
    icon: DollarSign,
    stateKey: "isPricingOpen",
    activeCheck: (pathname: string) => pathname.startsWith("/pricing"),
    subItems: [
      { path: "/pricing/price-books", label: "Price Books", icon: BookOpen },
      { path: "/pricing/product-pricing", label: "Product Pricing", icon: Tag },
      { path: "/pricing/price-comparison", label: "Price Comparison", icon: BarChart3 }
    ]
  },
  {
    type: "collapsible",
    permission: "Partner: Barcode Management",
    label: "Barcode Management",
    icon: ScanLine,
    stateKey: "isBarcodeOpen",
    hasSubPermissions: true,
    activeCheck: (pathname: string) => pathname.startsWith("/vsms/barcodes"),
    subItems: [
      { path: '/vsms/barcodes?tab=master', label: 'Barcode Master', icon: ScanLine },
      { path: '/vsms/barcodes?tab=printing', label: 'Barcode Printing', icon: Printer },
    ],
  },

  // ORDERS & DELIVERY Section
  {
    type: "section",
    sectionTitle: "ORDERS & DELIVERY",
  },
  {
    type: "collapsible",
    permission: "Partner: Purchase Management",
    label: "Purchase Management",
    icon: ShoppingCart,
    stateKey: "isProcurementOpen",
    hasSubPermissions: true,
    activeCheck: (pathname: string) => pathname.startsWith("/procurement"),
    subItems: [
      { path: "/procurement?tab=vendors", label: "Vendors", icon: Users },
      { path: "/procurement?tab=mapping", label: "Item Mapping", icon: Link2 },
      { path: "/procurement?tab=po", label: "Purchase Orders", icon: ClipboardList },
      { path: "/procurement?tab=grn", label: "Goods Receipt", icon: Truck },
      { path: "/procurement?tab=purchases", label: "Purchases", icon: ShoppingCart },
      { path: "/procurement?tab=ledger", label: "Stock Ledger", icon: BookOpen },
      { path: "/procurement?tab=payments", label: "Payments", icon: CreditCard },
      { path: "/procurement?tab=reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    type: "collapsible",
    permission: "Partner: My Category Management",
    label: "My Category Management",
    icon: Tag, // Or any icon you prefer
    stateKey: "isMyCategoryManagementOpen",  // Use this stateKey to manage open/close
    activeCheck: activeCheckers.isMyCategoryManagementActive,  // Use the active state check
    subItems: [
      { path: "/my-categories", label: "My Categories", icon: Tag },
      { path: "/my-sub-categories", label: "My Sub Categories", icon: Tag },
    ],
  },
  {
    type: "collapsible",
    permission: "Partner: Orders Management",
    label: "Order Management",
    icon: ShoppingCart,
    stateKey: "isOrderManagementOpen",
    activeCheck: activeCheckers.isOrderManagementActive,
    subItems: [
      {
        path: "/home-delivery-orders",
        label: "Home delivery Orders",
        icon: ShoppingCart,
      },
      {
        path: "/self-pickup-orders",
        label: "Self Pickup Orders",
        icon: ShoppingBag,
      },

      {
        path: "/return-requests",
        label: "Return Requests",
        icon: RefreshCw,
      },
      {
        path: "/refunds",
        label: "Refunds",
        icon: Banknote,
      },
    ],
  },
  {
    type: "collapsible",
    permission: "Partner: Vendor Management",
    label: "Vendor Management",
    icon: Store,
    stateKey: "isVendorManagementOpen",
    activeCheck: activeCheckers.isVendorManagementActive,
    subItems: [
      { path: "/vendors/manage", label: "Manage Vendors", icon: UserCheck },
      {
        path: "/vendors/wallet-transactions",
        label: "Vendors Wallet Transactions",
        icon: Wallet,
      },
      { path: "/vendors/policies", label: "Vendors Policies", icon: FileText },
    ],
  },

  // Staff Management
  {
    type: "collapsible",
    permission: "Partner: Staff Management",
    label: "Staff Management",
    icon: Users,
    stateKey: "isStaffManagementOpen",
    activeCheck: activeCheckers.isStaffManagementActive,
    subItems: [
      {
        path: "/delivery-boys/manage",
        label: "Delivery Agents",
        icon: Truck,
      },
    ],
  },

  // User Management
  {
    type: "collapsible",
    permission: "Partner: User Management",
    label: "User Management",
    icon: Users,
    stateKey: "isUserManagementOpen",
    activeCheck: activeCheckers.isUserManagementActive,
    subItems: [
      {
        path: "/user-management/customers",
        label: "Customers",
        icon: Users,
      },
      {
        path: "/user-management/customer-categories",
        label: "Customer Categories",
        icon: Tag,
      },
      // Hidden as per sidebar screenshots
      // { path: '/delivery-boys/requests', label: 'Delivery agent', icon: Truck, hidden: true },
      // { path: '/vendors/requests', label: 'Vendors', icon: Store, hidden: true },
      // { path: '/user-management/admins', label: 'Admins', icon: UserCog, hidden: true },
      // { path: '/user-management/partners', label: 'Partners', icon: Handshake, hidden: true },
    ],
  },

  // Delivery Settings
  {
    type: "collapsible",
    permission: "Partner: Delivery Management",
    label: "Delivery Settings",
    icon: Truck,
    stateKey: "isDeliverySettingsOpen",
    activeCheck: (pathname: string) =>
      pathname.startsWith("/delivery-settings") ||
      pathname.startsWith("/delivery-types") ||
      pathname.startsWith("/scheduled-delivery") ||
      pathname.startsWith("/delivery-settings/store-pickup") ||
      pathname.startsWith("/delivery-settings/pick-at-vehicle"),
    subItems: [
      {
        path: "/delivery-settings/delivery-types",
        label: "Delivery Types",
        icon: Truck,
      },
      {
        path: "/delivery-settings/scheduled-delivery",
        label: "Scheduled Delivery",
        icon: Calendar,
      },
      {
        path: "/delivery-settings/store-pickup",
        label: "Store Pickup",
        icon: Calendar,
      },
      {
        path: "/delivery-settings/pick-at-vehicle",
        label: "Pickup At Vehicle",
        icon: Calendar,
      },
    ],
  },

  // Point of Sales
  {
    type: "link",
    permission: "Partner: Point of Sales",
    path: "/point-of-sales",
    label: "Point of Sales",
    icon: Percent,
  },

  // FINANCIAL Section
  {
    type: "section",
    sectionTitle: "FINANCIAL",
  },
  {
    type: "link",
    permission: "Partner: Withdrawal Request",
    path: "/withdrawal-request",
    label: "Withdrawal Request",
    icon: DollarSign,
  },
  {
    type: "link",
    permission: "Partner: Wallet Transactions",
    path: "/wallet-transactions",
    label: "Wallet Transactions",
    icon: Wallet,
  },

  // Promotions and Offers
  {
    type: "collapsible",
    permission: "Partner: Promotions & Offers",
    label: "Promotions and Offers",
    icon: ClipboardList,
    stateKey: "isPromotionsOffersOpen",
    subItems: [
      { path: "/promo-codes/manage", label: "Promo Codes", icon: Ticket },
      { path: "/banners", label: "Banners", icon: ImageIcon },
      { path: "/campaigns", label: "Campaigns", icon: Sliders },
    ],
  },

  // REPORTS Section
  {
    type: "section",
    sectionTitle: "REPORTS",
  },
  {
    type: "collapsible",
    permission: "Partner: Reports",
    label: "Reports",
    icon: BarChart3,
    stateKey: "isReportsOpen",
    subItems: [
      {
        path: "/reports/product-sales-reports",
        label: "Product Sales Report",
        icon: BarChart3,
      },
      {
        path: "/reports/sales-reports",
        label: "Sales Reports",
        icon: BarChart3,
      },
      { path: "/reports/pos-reports", label: "POS Reports", icon: BarChart3 },
    ],
  },

  // VSMS Logistics Section
  {
    type: "section",
    sectionTitle: "VSMS LOGISTICS",
  },
  {
    type: "collapsible",
    permission: "Partner: VSMS Logistics",
    label: "VSMS Logistics",
    icon: Truck,
    stateKey: "isVsmsOpen",
    hasSubPermissions: true,
    subItems: [
      { path: '/vsms/vehicles', label: 'Fleet Vehicles', icon: Truck },
      { path: '/vsms/fuel-maintenance', label: 'Fuel & Maintenance', icon: RefreshCw },
      { path: '/vsms/damages', label: 'Vehicle Damages', icon: AlertTriangle },
      { path: '/vsms/routes-coverage', label: 'Routes & Coverage', icon: MapPin },
      { path: '/vsms/stock-history', label: 'Vehicle Stock & Audits', icon: Boxes },
      { path: '/vsms/cash-management', label: 'Cash Management', icon: Wallet },
      { path: '/vsms/pos', label: 'Point of Sale', icon: ScanLine },
      { path: '/vsms/sales', label: 'Sales History', icon: Receipt },
    ],
  },
  {
    type: "collapsible",
    permission: "Partner: Fleet Assets",
    label: "Fleet Assets",
    icon: Database,
    stateKey: "isAssetsOpen",
    hasSubPermissions: true,
    subItems: [
      { path: '/vsms/assets?tab=master', label: 'Assets Registry', icon: Package },
      { path: '/vsms/assets?tab=tracking', label: 'Asset Assignment', icon: Users },
      { path: '/vsms/assets?tab=transfers', label: 'Asset Transfers', icon: ArrowRightLeft },
      { path: '/vsms/assets?tab=vehicle-mapping', label: 'Vehicle Mapping', icon: Truck },
      { path: '/vsms/assets?tab=issues', label: 'Asset Maintenance', icon: Wrench },
      { path: '/vsms/assets?tab=depreciation', label: 'Depreciation', icon: Percent },
      { path: '/vsms/assets?tab=audit', label: 'Asset Audit', icon: ClipboardList },
      { path: '/vsms/assets?tab=requests', label: 'Asset Requests', icon: HelpCircle },
      { path: '/vsms/assets?tab=reports', label: 'Asset Reports', icon: BarChart3 },
    ],
  },

  // Settings
  {
    type: "collapsible",
    permission: "Partner: Settings",
    label: "Settings",
    icon: Settings,
    stateKey: "isSystemOpen",
    subItems: [
      {
        path: "/system/store-settings",
        label: "Store Settings",
        icon: Settings,
      },
      {
        path: "/system/delivery-settings",
        label: "Delivery Settings",
        icon: Clock,
      },
      {
        path: "/system/payment-methods",
        label: "Payment Methods",
        icon: CreditCard,
      },
      { path: "/system/contact-us", label: "Contact Us", icon: Phone },
      { path: "/system/about-us", label: "About Us", icon: Info },
      { path: "/system/seo-settings", label: "SEO Settings", icon: Globe },
    ],
  },

  // Root Map Creation
  {
    type: "link",
    permission: "Partner: Root Map Creation",
    path: "/root-map-creation",
    label: "Root Map Creation",
    icon: Map,
  },

  // Slot Management
  {
    type: "link",
    permission: "Partner: Slot Management",
    path: "/slot-management",
    label: "Slot Management",
    icon: Calendar,
  },

  // Delivery Zone Management
  {
    type: "link",
    permission: "Partner: Delivery Zone Management",
    path: "/delivery-zone-management",
    label: "Delivery Zone Management",
    icon: MapPin,
  },

  // Notifications
  {
    type: "collapsible",
    permission: "Partner: Notifications",
    label: "Notifications",
    icon: Bell,
    stateKey: "isNotificationsOpen",
    subItems: [
      {
        path: "/notifications/customer",
        label: "Customer Notification",
        icon: Bell,
      },
      {
        path: "/notifications/warehouse",
        label: "Warehouse Notification",
        icon: Bell,
      },
      {
        path: "/notifications/vendor",
        label: "Vendor Notification",
        icon: Bell,
      },
      { path: "/notifications/staff", label: "Staff Notification", icon: Bell },
      {
        path: "/notifications/delivery-agent",
        label: "Delivery Agent Notification",
        icon: Bell,
      },
    ],
  },

  // Referral Notification
  {
    type: "link",
    permission: "Partner: Referral Notifications",
    path: "/referral-notification",
    label: "Referral Notification",
    icon: Bell,
  },

  // Ratings and Reviews
  {
    type: "collapsible",
    permission: "Partner: Ratings & Reviews",
    label: "Ratings and Reviews",
    icon: StarIcon,
    stateKey: "isRatingsReviewsOpen",
    subItems: [], // Empty submenu as per screenshot
  },

  // Product
  {
    type: "link",
    permission: "Partner: Product Management",
    path: "/product",
    label: "Product",
    icon: Package,
  },

  // Service
  {
    type: "link",
    permission: "Partner: Service",
    path: "/service",
    label: "Service",
    icon: Settings,
  },

  // Contact Us
  {
    type: "collapsible",
    permission: "Partner: Contact Us",
    label: "Contact Us",
    icon: Phone,
    stateKey: "isContactUsOpen",
    subItems: [], // Empty submenu as per screenshot
  },

  // Access Management
  {
    type: "link",
    permission: "Partner: Access Management",
    path: "/access-management",
    label: "Access Management",
    icon: Shield,
  },

  // Resource Management
  {
    type: "link",
    permission: "Partner: Resource Management",
    path: "/resource-management",
    label: "Resource Management",
    icon: FileText,
  },

  // Vehicles
  {
    type: "link",
    permission: "Partner: Resource Management",
    path: "/vehicles",
    label: "Vehicles",
    icon: Car,
  },

  // Locations
  {
    type: "collapsible",
    permission: "Partner: Locations",
    label: "Locations",
    icon: MapPin,
    stateKey: "isLocationsOpen",
    subItems: [
      { path: "/locations/states", label: "States", icon: MapPin },
      { path: "/locations/cities", label: "Cities", icon: Building2 },
      { path: "/locations/zip-codes", label: "Zip Codes", icon: MapPin },
      { path: "/locations/areas", label: "Areas", icon: Navigation },
    ],
  },
];
