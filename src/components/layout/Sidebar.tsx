import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarClock, Bike, Megaphone, Hash, Database, Image, Smile, Map, Users2, Smartphone, HelpCircle, Package, ShoppingCart, Store, Image as ImageIcon, Tag, RotateCcw, Star, Truck, ChevronDown, ChevronRight, Settings, FolderTree, Layers, Award, Ruler, Percent, MapPin, Navigation, Building2, Phone, Info, FileText, Shield, Upload, RefreshCw, CheckCircle, Film, Users, UserCog, Handshake, Boxes, Eye, AlertTriangle, ClipboardList, ArrowRightLeft, Receipt, ScanLine, Printer, Bell, UserCheck, Wallet, DollarSign, ShieldCheck, Maximize2, Monitor, Clock, CreditCard, Globe, Share2, X, Languages, BarChart3, Link2, BookOpen, Wrench, Activity, History, ShieldAlert, Landmark, MessageSquare, BarChart2 } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

const Sidebar = ({ isOpen = true, setIsOpen }: SidebarProps) => {
  const location = useLocation();
  // const [isCategoriesOpen, setIsCategoriesOpen] = useState(
  //   location.pathname.startsWith('/categories')
  // );
  const [isProductsOpen, setIsProductsOpen] = useState(
    location.pathname.startsWith('/products')
  );
  const [isProductMasterDataOpen, setIsProductMasterDataOpen] = useState(
    location.pathname.startsWith('/product-master-data')
  );
  const [isPricingOpen, setIsPricingOpen] = useState(
    location.pathname.startsWith('/pricing')
  );
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(
    location.pathname.startsWith('/vsms/barcodes')
  );


  const [isSellersOpen, setIsSellersOpen] = useState(
    location.pathname.startsWith('/vendors') &&
    !location.pathname.startsWith('/vendors/requests') &&
    !location.pathname.startsWith('/vendors/edit') &&
    !location.pathname.startsWith('/vendors/view')
  );
  const [isOfferImagesOpen, setIsOfferImagesOpen] = useState(
    location.pathname.startsWith('/offer-images')
  );
  const [isDeliveryBoysOpen, setIsDeliveryBoysOpen] = useState(
    location.pathname.startsWith('/delivery-boys') &&
    !location.pathname.startsWith('/delivery-boys/requests')
  );
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(
    location.pathname.startsWith('/delivery-boys/requests') ||
    location.pathname.startsWith('/delivery-boys/create') ||
    location.pathname.startsWith('/delivery-boys/edit') ||
    location.pathname.startsWith('/delivery-boys/view') ||
    location.pathname.startsWith('/vendors/requests') ||
    location.pathname.startsWith('/vendors/create') ||
    location.pathname.startsWith('/vendors/edit') ||
    location.pathname.startsWith('/vendors/view') ||
    (location.pathname.startsWith('/user-management') &&
      !location.pathname.startsWith('/user-management/partners'))
  );
  const [isMasterSetupOpen, setIsMasterSetupOpen] = useState(
    location.pathname.startsWith('/categories') ||
    location.pathname.startsWith('/categories/sub-categories') ||
    location.pathname.startsWith('/products/brands') ||
    location.pathname.startsWith('/products/units') ||
    location.pathname.startsWith('/products/taxes') ||
    (location.pathname.startsWith('/master-setup') &&
      !location.pathname.startsWith('/master-setup/countries') &&
      !location.pathname.startsWith('/master-setup/districts')) ||
    location.pathname.startsWith('/master-setup/contact-us')
  );
  const [isInventoryOpen, setIsInventoryOpen] = useState(
    location.pathname.startsWith('/inventory')
  );
  const [isWebSettingsOpen, setIsWebSettingsOpen] = useState(
    location.pathname.startsWith('/web-settings')
  );
  // Removed submenu state variables as they are now direct menu items
  const [isSystemOpen, setIsSystemOpen] = useState(
    location.pathname.startsWith('/system')
  );
  const [isVsmsOpen, setIsVsmsOpen] = useState(location.pathname.startsWith('/vsms'));
  const [isAssetsOpen, setIsAssetsOpen] = useState(location.pathname.startsWith('/vsms/assets'));
  const [isReportsOpen, setIsReportsOpen] = useState(
    location.pathname.startsWith('/reports')
  );


  const [isOrdersOpen, setIsOrdersOpen] = useState(
    location.pathname.startsWith('/orders') &&
    !location.pathname.startsWith('/self-pickup-orders')
  );
  const [isPromotionsOpen, setIsPromotionsOpen] = useState(
    location.pathname.startsWith('/promotions')
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname.startsWith('/settings')
  );
  const [isRatingsOpen, setIsRatingsOpen] = useState(
    location.pathname.startsWith('/ratings')
  );
  const [isLocationsOpen, setIsLocationsOpen] = useState(
    location.pathname.startsWith('/locations') ||
    location.pathname.startsWith('/master-setup/countries') ||
    location.pathname.startsWith('/master-setup/districts')
  );
  const [isResourcesOpen, setIsResourcesOpen] = useState(
    location.pathname.startsWith('/resource-management')
  );

  const [isPartnersOpen, setIsPartnersOpen] = useState(
    location.pathname.startsWith('/partner-management') ||
    location.pathname.startsWith('/user-management/partners')
  );

  const [isActivityLogOpen, setIsActivityLogOpen] = useState(
    location.pathname.startsWith('/activity-log')
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


  const [isShopkeeperErpAdminOpen, setIsShopkeeperErpAdminOpen] = useState(
    location.pathname.startsWith('/shopkeeper-erp')
  );

  const [isShopkeeperOpen, setIsShopkeeperOpen] = useState(
    location.pathname.startsWith('/shopkeeper')
  );

  const [isProcurementOpen, setIsProcurementOpen] = useState(
    location.pathname.startsWith('/procurement')
  );
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
  ];

  const shopkeeperErpAdminSubItems = [
    { path: '/shopkeeper-erp?tab=dashboard', label: 'Dashboard', icon: Home },
    { path: '/shopkeeper-erp?tab=picking-queue', label: 'Picking Queue', icon: Package },
    { path: '/shopkeeper-erp?tab=packing-queue', label: 'Packing Queue', icon: Boxes },
    { path: '/shopkeeper-erp?tab=ready-orders', label: 'Ready for Dispatch', icon: CheckCircle },
    { path: '/shopkeeper-erp?tab=self-pickup', label: 'Self Pickup', icon: Store },
    { path: '/shopkeeper-erp?tab=returns', label: 'Returns', icon: RotateCcw },
    { path: '/shopkeeper-erp?tab=sla-monitoring', label: 'SLA Monitoring', icon: BarChart3 },
    { path: '/shopkeeper-erp?tab=all-orders', label: 'Order History', icon: History },
    { path: '/shopkeeper-erp?tab=staff-tracker', label: 'Staff Tracker', icon: Users },
    { path: '/shopkeeper-erp?tab=settings', label: 'Settings', icon: Settings }
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
    { path: '/shopkeeper?tab=dashboard', label: 'Dashboard', icon: Home },
    { path: '/shopkeeper?tab=picking-queue', label: 'Picking Queue', icon: Package },
    { path: '/shopkeeper?tab=packing-queue', label: 'Packing Queue', icon: Boxes },
    { path: '/shopkeeper?tab=ready-orders', label: 'Ready for Dispatch', icon: CheckCircle },
    { path: '/shopkeeper?tab=self-pickup', label: 'Self Pickup', icon: Store },
    { path: '/shopkeeper?tab=returns', label: 'Returns', icon: RotateCcw },
    { path: '/shopkeeper?tab=sla-monitoring', label: 'SLA Monitoring', icon: BarChart3 },
    { path: '/shopkeeper?tab=all-orders', label: 'Order History', icon: History },
    { path: '/shopkeeper?tab=staff-tracker', label: 'Staff Tracker', icon: Users },
    { path: '/shopkeeper?tab=settings', label: 'Settings', icon: Settings }
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
    { path: '/products/manage', label: 'Partner Manage Products', icon: Package },
    { path: '/products/approve', label: 'Partner Approve Requests', icon: CheckCircle },
    { path: '/products/ratings', label: 'Partner Product Ratings', icon: Star },
    { path: '/products/media', label: 'Partner Media', icon: Film },
    // { path: '/products/import-products', label: 'Import Products', icon: ArrowDownToLine },
    // { path: '/products/export-products', label: 'Export Products', icon: ArrowUpFromLine },
    // { path: '/products/order', label: 'Products Order' },
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
      location.pathname.startsWith('/delivery-boys/requests') ||
      location.pathname.startsWith('/delivery-boys/create') ||
      location.pathname.startsWith('/delivery-boys/edit') ||
      location.pathname.startsWith('/delivery-boys/view') ||
      location.pathname.startsWith('/vendors/requests') ||
      location.pathname.startsWith('/vendors/create') ||
      location.pathname.startsWith('/vendors/edit') ||
      location.pathname.startsWith('/vendors/view') ||
      (location.pathname.startsWith('/user-management') &&
        !location.pathname.startsWith('/user-management/partners'))
    );

    setIsPartnersOpen(
      location.pathname.startsWith('/partner-management') ||
      location.pathname.startsWith('/user-management/partners')
    );

    setIsSellersOpen(
      location.pathname.startsWith('/vendors') &&
      !location.pathname.startsWith('/vendors/requests') &&
      !location.pathname.startsWith('/vendors/create') &&
      !location.pathname.startsWith('/vendors/edit') &&
      !location.pathname.startsWith('/vendors/view')
    );


    setIsMasterSetupOpen(
      location.pathname.startsWith('/categories') ||
      location.pathname.startsWith('/categories/sub-categories') ||
      location.pathname.startsWith('/products/brands') ||
      location.pathname.startsWith('/products/units') ||
      location.pathname.startsWith('/products/taxes') ||
      (location.pathname.startsWith('/master-setup') &&
        !location.pathname.startsWith('/master-setup/countries') &&
        !location.pathname.startsWith('/master-setup/districts')) ||
      location.pathname.startsWith('/master-setup/contact-us')
    );

    setIsVsmsOpen(
      location.pathname.startsWith('/vsms')
    );
    setIsAssetsOpen(
      location.pathname.startsWith('/vsms/assets')
    );
    setIsLocationsOpen(
      location.pathname.startsWith('/locations') ||
      location.pathname.startsWith('/master-setup/countries') ||
      location.pathname.startsWith('/master-setup/districts')
    );
  }, [location.pathname]);


  /**
   * isItemActive Function
   * Checks if a menu item is currently active
   * Active means user is on that page
   *
   * @param section - Menu section object
   * @returns boolean - true if active, false otherwise
   */
  const isItemActive = useCallback(
    (section: MenuSection): boolean => {
      // If custom active check function exists, use it
      if (section.activeCheck) {
        return section.activeCheck(location.pathname);
      }

      // If path exists, check it
      if (section.path) {
        // For "/" (Dashboard) and "/product" we need exact match
        if (section.path === "/" || section.path === "/product") {
          return location.pathname === section.path;
        }
        // For others, use startsWith check
        return location.pathname.startsWith(section.path);
      }

      return false;
    },
    [location.pathname]
  );

  /**
   * isSubItemActive Function
   * Checks if submenu item is active
   *
   * @param path - Submenu item path
   * @returns boolean - true if active
   */
  const isSubItemActive = useCallback(
    (path: string): boolean => {
      // Handle query-param based paths (e.g. /procurement?tab=vendors)
      if (path.includes("?")) {
        const [itemPathname, itemSearch] = path.split("?");
        const currentSearch = location.search.startsWith("?")
          ? location.search.slice(1)
          : location.search;
        const itemParams = new URLSearchParams(itemSearch);
        const currentParams = new URLSearchParams(currentSearch);
        // Pathname must match AND every param in item path must match current
        if (location.pathname !== itemPathname) return false;
        for (const [key, value] of itemParams.entries()) {
          if (currentParams.get(key) !== value) return false;
        }
        return true;
      }

      const normalizedPath = path.endsWith("/manage")
        ? path.slice(0, -"/manage".length)
        : path;

      return (
        location.pathname === path ||
        location.pathname.startsWith(path + "/") ||
        location.pathname === normalizedPath ||
        location.pathname.startsWith(normalizedPath + "/")
      );
    },
    [location.pathname, location.search]
  );

  // ============================================
  // RENDER FUNCTIONS - For rendering UI
  // ============================================

  /**
   * renderSectionHeader Function
   * Renders section header (like "PRODUCT & STOCK", "ORDERS & DELIVERY")
   *
   * @param title - Section title
   * @returns JSX - Section header element
   */
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

  /**
   * renderLinkItem Function
   * Renders simple link menu item (clickable and navigates to page directly)
   * Example: Dashboard, Stock Management, etc.
   *
   * @param section - Menu section object
   * @returns JSX - Link element or null
   */
  const renderLinkItem = useCallback(
    (section: MenuSection) => {
      // Validation - return null if required fields are missing
      if (!section.path || !section.label || !section.icon) return null;

      const isActive = isItemActive(section);
      const Icon = section.icon;

      return (
        <div className="mt-1" key={section.path}>
          <Link
            to={section.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isActive
                ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400"
              }`}
          >
            <Icon size={16} />
            <span>{section.label}</span>
          </Link>
        </div>
      );
    },
    [isItemActive]
  );

  /**
   * renderCollapsibleItem Function
   * Renders collapsible menu item (can expand/collapse)
   * Example: Product Management, Order Management, etc.
   *
   * @param section - Menu section object
   * @returns JSX - Collapsible menu element or null
   */
  const renderCollapsibleItem = useCallback(
    (section: MenuSection) => {
      // Validation - return null if required fields are missing
      if (
        !section.label ||
        !section.icon ||
        !section.stateKey ||
        !section.subItems
      )
        return null;

      // Get current state (open or closed)
      const isSectionOpen = stateGetters[section.stateKey] || false;
      const setSectionOpen = stateSetters[section.stateKey];
      const isActive = isItemActive(section);
      const Icon = section.icon;

      // ============================================
      // SPECIAL ACTIVE STATE CHECKS
      // Some menus need special logic
      // ============================================

      // Special check for Promotions and Offers
      const isPromotionsActive =
        section.stateKey === "isPromotionsOffersOpen" &&
        (isSectionOpen ||
          location.pathname.startsWith("/promo-codes") ||
          location.pathname.startsWith("/banners") ||
          location.pathname.startsWith("/campaigns") ||
          location.pathname.startsWith("/advertisement"));

      // Special check for Notifications
      const isNotificationsActive =
        section.stateKey === "isNotificationsOpen" &&
        (isSectionOpen || location.pathname.startsWith("/notifications"));

      // Special check for Ratings and Reviews
      const isRatingsActive =
        section.stateKey === "isRatingsReviewsOpen" &&
        (isSectionOpen ||
          location.pathname.startsWith("/ratings") ||
          location.pathname.startsWith("/reviews"));

      // Special check for Contact Us
      const isContactUsActive =
        section.stateKey === "isContactUsOpen" &&
        (isSectionOpen || location.pathname.startsWith("/contact-us"));

      // Special check for Locations
      const isLocationsActive =
        section.stateKey === "isLocationsOpen" &&
        (isSectionOpen ||
          location.pathname.startsWith("/locations") ||
          location.pathname.startsWith("/states") ||
          location.pathname.startsWith("/cities") ||
          location.pathname.startsWith("/zip-codes") ||
          location.pathname.startsWith("/areas"));

      // Special check for Order Management
      const isOrderManagementActive =
        section.stateKey === "isOrderManagementOpen" &&
        (isSectionOpen ||
          location.pathname.startsWith("/orders") ||
          location.pathname.startsWith("/home-delivery-orders") ||
          location.pathname.startsWith("/self-pickup-orders") ||
          location.pathname.startsWith("/refunds") ||
          location.pathname.startsWith("/return-requests"));

      // Determine final active state (checking all conditions)
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
          location.pathname.startsWith("/system"));

      // Filter out hidden sub-items
      const visibleSubItems = section.subItems.filter((item) => !item.hidden);

      return (
        <div className="mt-1" key={section.stateKey}>
          {/* Main Menu Button - Expands/collapses on click */}
          <button
            onClick={() => setSectionOpen?.(!isSectionOpen)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalActive
                ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400"
              }`}
          >
            {/* Icon and Label */}
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
            {/* Expand/Collapse Icon */}
            {isSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Submenu Items - Visible when expanded */}
          <div
            className={`overflow-hidden ${isSectionOpen ? "dropdown-enter" : "dropdown-exit"
              }`}
            style={{
              maxHeight: isSectionOpen ? "500px" : "0",
              transition:
                section.stateKey === "isUserManagementOpen" && isSectionOpen
                  ? "max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Render sub-items if they exist */}
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
                      className={`${isSectionOpen ? "dropdown-item" : "dropdown-item-exit"
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400"
                        }`}
                      style={{
                        animationDelay: isSectionOpen
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
  const isOfferImageActive = location.pathname.startsWith('/offer-images');
  const isSystemActive = location.pathname.startsWith('/system');
  const isWebSettingsActive = location.pathname.startsWith('/web-settings');

  return (
    <aside
      className={`w-72 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 h-screen flex flex-col fixed left-0 top-0 z-50 overflow-hidden transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 ${isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      style={{ fontFamily: "'Segoe UI', sans-serif" }}
    >
      {/* Header Section - Logo and Close Button */}
      <div className="py-4 pl-5 pr-3 flex-shrink-0">
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 h-12 flex items-center justify-center overflow-hidden">
            <img
              src="/villagekart_svg_icon-2.svg"
              alt="VillagKart Logo"
              className="max-w-[260px] w-full h-full object-contain object-center"
              onError={(e) => {
                // Fallback to icon if image doesn't exist
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
                  parent.appendChild(icon);
                }
              }}
            />
          </div>
          {setIsOpen && (
            <button
              onClick={() => setIsOpen?.(false)}
              className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Close menu"
            >
              <X size={18} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden sidebar-scrollbar min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}



        {/* User & Vendor Management Section */}
        <div className="mt-1">
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              USER & VENDOR MANAGEMENT
            </span>
          </div>

          {/* User Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsUserManagementOpen(!isUserManagementOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isUserManagementActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>User Management</span>
              </div>
              {isUserManagementOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isUserManagementOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isUserManagementOpen ? '500px' : '0',
                transition: isUserManagementOpen
                  ? 'max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  : 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {userManagementSubItems.map((subItem, index) => {
                  // Check if current path matches or starts with the subItem path (for nested routes)
                  let isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');

                  // Special handling for delivery-boys routes
                  // /delivery-boys/create, /delivery-boys/edit, /delivery-boys/view should be active for /delivery-boys/requests
                  if (subItem.path === '/delivery-boys/requests') {
                    isActive = location.pathname === '/delivery-boys/requests' ||
                      location.pathname.startsWith('/delivery-boys/create') ||
                      location.pathname.startsWith('/delivery-boys/edit') ||
                      location.pathname.startsWith('/delivery-boys/view');
                  }

                  // Special handling for vendors routes
                  // /vendors/create, /vendors/edit, /vendors/view should be active for /vendors/requests
                  if (subItem.path === '/vendors/requests') {
                    isActive = location.pathname === '/vendors/requests' ||
                      location.pathname.startsWith('/vendors/create') ||
                      location.pathname.startsWith('/vendors/edit') ||
                      location.pathname.startsWith('/vendors/view');
                  }

                  // Special handling for user-management routes
                  // /user-management/admins/create, /user-management/admins/edit, /user-management/admins/view should be active for /user-management/admins
                  if (subItem.path === '/user-management/admins') {
                    isActive = location.pathname === '/user-management/admins' ||
                      location.pathname.startsWith('/user-management/admins/create') ||
                      location.pathname.startsWith('/user-management/admins/edit') ||
                      location.pathname.startsWith('/user-management/admins/view');
                  }

                  // Special handling for partners routes
                  if (subItem.path === '/user-management/partners') {
                    isActive = location.pathname === '/user-management/partners' ||
                      location.pathname.startsWith('/user-management/partners/create') ||
                      location.pathname.startsWith('/user-management/partners/edit') ||
                      location.pathname.startsWith('/user-management/partners/view');
                  }

                  if (subItem.path === '/user-management/customers') {
                    isActive = location.pathname === '/user-management/customers' ||
                      location.pathname.startsWith('/user-management/customers/view');
                  }

                  const Icon = subItem.icon;
                  const totalItems = userManagementSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isUserManagementOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isUserManagementOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>


        </div>

        {/* Product & Inventory Section */}
        <div className="mt-1">
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              PRODUCT & STOCK
            </span>
          </div>

          {/* Master Setup Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsMasterSetupOpen(!isMasterSetupOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isMasterSetupActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Settings size={16} />
                <span>Master Setup</span>
              </div>
              {isMasterSetupOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isMasterSetupOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isMasterSetupOpen ? '1000px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {masterSetupSubItems.map((subItem, index) => {
                  // Make 'Categories' active for nested routes like view/edit/etc
                  let isActive = location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/');
                  // Special handling for Categories
                  if (subItem.path === '/categories/manage') {
                    isActive = location.pathname.startsWith('/categories') && !location.pathname.startsWith('/categories/sub-categories');
                  }
                  // Special handling for Sub-Categories
                  if (subItem.path === '/categories/sub-categories') {
                    isActive = location.pathname.startsWith('/categories/sub-categories');
                  }
                  const Icon = subItem.icon;
                  const totalItems = masterSetupSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isMasterSetupOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isMasterSetupOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Product Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsProductsOpen(!isProductsOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isProductActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap truncate text-sm">Partner Product Management</span>
              </div>
              {isProductsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isProductsOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isProductsOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {productSubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = productSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isProductsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isProductsOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pricing Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsPricingOpen(!isPricingOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isPricingActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <DollarSign size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap truncate text-sm">Pricing Engine</span>
              </div>
              {isPricingOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isPricingOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isPricingOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {pricingSubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = pricingSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isPricingOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isPricingOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Product Master Data Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsProductMasterDataOpen(!isProductMasterDataOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isProductMasterDataActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap truncate text-sm">Product Master Data</span>
              </div>
              {isProductMasterDataOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isProductMasterDataOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isProductMasterDataOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {productMasterDataSubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = productMasterDataSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isProductMasterDataOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isProductMasterDataOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Barcode Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsBarcodeOpen(!isBarcodeOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isBarcodeActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ScanLine size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap truncate text-sm">Barcode Management</span>
              </div>
              {isBarcodeOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isBarcodeOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isBarcodeOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {barcodeSubItems.map((subItem, index) => {
                  const isActive = (location.pathname + location.search) === subItem.path;
                  const Icon = subItem.icon;
                  const totalItems = barcodeSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isBarcodeOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isBarcodeOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* <div className="mt-1">
            <button
              onClick={() => setIsPartnerCategoryOpen(!isPartnerCategoryOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isPartnerCategoryActive
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap truncate text-sm">
                  Partner Category Mapping
                </span>
              </div>
              {isPartnerCategoryOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isPartnerCategoryOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isPartnerCategoryOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {partnerCategorySubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = partnerCategorySubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isPartnerCategoryOpen
                          ? 'dropdown-item'
                          : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isPartnerCategoryOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div> */}

          {/* Purchase Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsProcurementOpen(!isProcurementOpen)}
              className={`w-full flex items-center justify-between gap-1 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/procurement')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <ShoppingCart size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap text-sm">Purchase Management</span>
              </div>
              <div className="flex-shrink-0">
                {isProcurementOpen ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${isProcurementOpen ? 'max-h-[800px] opacity-100 mb-2' : 'max-h-0 opacity-0'
                }`}
            >
              <div className="ml-7 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-1 mt-1 relative before:absolute before:top-0 before:left-[-1px] before:w-[2px] before:h-full before:bg-gradient-to-b before:from-green-500/0 before:via-green-500/30 before:to-green-500/0">
                {procurementSubItems.map((subItem, index) => {
                  const Icon = subItem.icon;
                  const isExactTabMatch = location.search === `?tab=${subItem.path.split('=')[1]}`;
                  const isFallbackMatch = index === 0 && !location.search && location.pathname === '/procurement';
                  const isActive = isExactTabMatch || isFallbackMatch;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs ${isActive
                        ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10 font-medium translate-x-1 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isProcurementOpen
                          ? `${index * 0.05}s`
                          : `${(procurementSubItems.length - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inventory Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsInventoryOpen(!isInventoryOpen)}
              className={`w-full flex items-center justify-between gap-1 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isInventoryActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Boxes size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap text-sm">Stock Management</span>
              </div>
              <div className="flex-shrink-0">
                {isInventoryOpen ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </div>
            </button>

            <div
              className={`overflow-hidden ${isInventoryOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isInventoryOpen ? '800px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {/* Inventory Overview - Direct Menu Item */}
                <Link
                  to="/inventory/overview"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname === '/inventory/overview'
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                    }`}
                >
                  <Eye size={14} />
                  <span>Stock Overview</span>
                </Link>

                {/* Operations - Direct Menu Item */}
                <Link
                  to="/inventory/operations"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/inventory/operations')
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                    }`}
                >
                  <ClipboardList size={14} />
                  <span>Operations</span>
                </Link>

                {/* Monitoring - Direct Menu Item */}
                <Link
                  to="/inventory/monitoring"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/inventory/monitoring')
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                    }`}
                >
                  <Bell size={14} />
                  <span>Monitoring</span>
                </Link>

                {/* Inventory Settings - Direct Menu Item */}
                <Link
                  to="/inventory/settings"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname === '/inventory/settings'
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                    }`}
                >
                  <Settings size={14} />
                  <span>Stock Settings</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Purchase Management */}
          {/* <div className="mt-1">
            <Link
              to="/purchase-management"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/purchase')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShoppingCart size={16} />
              <span>Purchase Management</span>
            </Link>
          </div> */}
        </div>

        {/* Orders & Delivery Section */}
        <div className="mt-1">
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              ORDERS & DELIVERY
            </span>
          </div>

          {/* Partner Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsPartnersOpen(!isPartnersOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalPartnersActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>Partner Management</span>
              </div>
              {isPartnersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <div
              className={`overflow-hidden ${isPartnersOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isPartnersOpen ? '400px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {partnerSubItems.map((subItem, index) => {
                  let isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');

                  // Special handling for partners routes
                  if (subItem.path === '/user-management/partners') {
                    isActive = location.pathname === '/user-management/partners' ||
                      location.pathname.startsWith('/user-management/partners/create') ||
                      location.pathname.startsWith('/user-management/partners/edit') ||
                      location.pathname.startsWith('/user-management/partners/view');
                  }

                  const Icon = subItem.icon;

                  return (
                    <Link
                      key={`partner-management-${index}`}   // ✅ SAFE KEY
                      to={subItem.path}
                      className={`${isPartnersOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isPartnersOpen
                          ? `${index * 0.05}s`
                          : `${(partnerSubItems.length - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>



          {/* Orders Management Menu */}
          {/* <div className="mt-1">
            <Link
              to="/orders"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/orders') && !location.pathname.startsWith('/self-pickup-orders')
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShoppingCart size={16} />
              <span>Orders Management</span>
            </Link>
          </div> */}

          {/* Orders Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsOrdersOpen(!isOrdersOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalOrdersActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} />
                <span>Orders Management</span>
              </div>
              {isOrdersOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isOrdersOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isOrdersOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {ordersSubItems.map((subItem, index) => {
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = ordersSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isOrdersOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isOrdersOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vendor Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsSellersOpen(!isSellersOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalSellerActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Store size={16} />
                <span>Vendor Management</span>
              </div>
              {isSellersOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isSellersOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isSellersOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {sellerSubItems.map((subItem, index) => {
                  // Check if current path matches or starts with the subItem path (for nested routes)
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = sellerSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isSellersOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isSellersOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Staff Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsStaffOpen(!isStaffOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalStaffActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>Staff Management</span>
              </div>
              {isStaffOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isStaffOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isStaffOpen ? '300px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {staffSubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');


                  const Icon = subItem.icon;

                  return (
                    <Link
                      key={`staff-${index}`}
                      to={subItem.path}
                      className={`${isStaffOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isStaffOpen
                          ? `${index * 0.05}s`
                          : `${(staffSubItems.length - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Shopkeeper ERP Menu */}
          {/* <div className="mt-1">
            <button
              onClick={() => setIsShopkeeperOpen(!isShopkeeperOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/shopkeeper')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Store size={16} />
                <span>Shopkeeper ERP</span>
              </div>
              {isShopkeeperOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isShopkeeperOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isShopkeeperOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {shopkeeperSubItems.map((subItem, index) => {
                  const isActive = location.pathname + location.search === subItem.path;
                  const Icon = subItem.icon;
                  const totalItems = shopkeeperSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isShopkeeperOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isShopkeeperOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div> */}

          {/* Shopkeeper ERP (Admin) Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsShopkeeperErpAdminOpen(!isShopkeeperErpAdminOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/shopkeeper-erp')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Store size={16} />
                <span>Shopkeeper ERP (Admin)</span>
              </div>
              {isShopkeeperErpAdminOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isShopkeeperErpAdminOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isShopkeeperErpAdminOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {shopkeeperErpAdminSubItems.map((subItem, index) => {
                  const isActive = location.pathname + location.search === subItem.path;
                  const Icon = subItem.icon;
                  const totalItems = shopkeeperErpAdminSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isShopkeeperErpAdminOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isShopkeeperErpAdminOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>


          {/* Delivery Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsDeliveryBoysOpen(!isDeliveryBoysOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalDeliveryBoyActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Truck size={16} />
                <span>Delivery Management</span>
              </div>
              {isDeliveryBoysOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isDeliveryBoysOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isDeliveryBoysOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {deliveryBoySubItems.map((subItem, index) => {
                  // Check if current path matches or starts with the subItem path (for nested routes)
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = deliveryBoySubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isDeliveryBoysOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isDeliveryBoysOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Delivery Settings Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsDeliveryOpen(!isDeliveryOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalDeliveryActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Bike size={16} />
                <span>Delivery Settings</span>
              </div>
              {isDeliveryOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isDeliveryOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isDeliveryOpen ? '300px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {deliverySubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');

                  const Icon = subItem.icon;

                  return (
                    <Link
                      key={`delivery-${index}`}
                      to={subItem.path}
                      className={`${isDeliveryOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isDeliveryOpen
                          ? `${index * 0.05}s`
                          : `${(deliverySubItems.length - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Return Requests Menu */}
          <div className="mt-1">
            <Link
              to="/return-requests"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/return-requests')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <RotateCcw size={16} />
              <span>Return Requests</span>
            </Link>
          </div>


          {/* Points of Sales */}

          <div className="mt-1">
            <Link
              to="/vsms/pos"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/point-of-sales')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShoppingCart size={16} />
              <span>Point of Sales</span>
            </Link>
          </div>



          {/* Self Pickup Orders Menu */}
          {/* <div className="mt-1">
            <Link
              to="/self-pickup-orders"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/self-pickup-orders')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShoppingCart size={16} />
              <span>Self Pickup Orders</span>
            </Link>
          </div> */}
        </div>



        {/* FINANACIAL */}
        <div className="mt-1">
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              FINANCIAL
            </span>
          </div>

          {/* Withdrawal Request */}

          <div className="mt-1">
            <Link
              to="/withdrawal-request"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/withdrawal-request')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShoppingCart size={16} />
              <span>Withdrawal Request</span>
            </Link>
          </div>

          {/* Wallet Transactions*/}

          <div className="mt-1">
            <Link
              to="/wallet-transactions"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/wallet-transactions')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShoppingCart size={16} />
              <span>Wallet Transactions</span>
            </Link>
          </div>

          {/* Featured Sections Menu */}
          <div className="mt-1">
            <Link
              to="/featured-sections"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname === '/featured-sections'
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <Star size={16} />
              <span>Featured Sections</span>
            </Link>
          </div>


          {/* Promotions and Offers Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsPromotionsOpen(!isPromotionsOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalPromotionsActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Megaphone size={16} />
                <span>Promotions and Offers</span>
              </div>
              {isPromotionsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isPromotionsOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isPromotionsOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {promotionsSubItems.map((subItem, index) => {
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = promotionsSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isPromotionsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isPromotionsOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>





        {/* Fleet & VSMS Logistics */}
        <div className="mt-1">
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              VSMS LOGISTICS
            </span>
          </div>

          <div className="mt-1">
            <button
              onClick={() => setIsVsmsOpen(!isVsmsOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/vsms')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Truck size={16} />
                <span>VSMS Logistics</span>
              </div>
              {isVsmsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isVsmsOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isVsmsOpen ? '1000px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {vsmsSubItems.map((subItem, index) => {
                  const isActive = subItem.path.includes('?')
                    ? (location.pathname + location.search) === subItem.path
                    : (location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/'));
                  const Icon = subItem.icon;
                  const totalItems = vsmsSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isVsmsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isVsmsOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}

                {/* Fleet Assets nested dropdown */}
                <div className="mt-1">
                  <button
                    onClick={() => setIsAssetsOpen(!isAssetsOpen)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/vsms/assets')
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Database size={14} />
                      <span>Fleet Assets</span>
                    </div>
                    {isAssetsOpen ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>

                  <div
                    className={`overflow-hidden ${isAssetsOpen ? 'dropdown-enter' : 'dropdown-exit'
                      }`}
                    style={{
                      maxHeight: isAssetsOpen ? '500px' : '0',
                      transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div className="ml-4 space-y-1">
                      {assetSubItems.map((subItem, index) => {
                        const isActive = location.pathname + location.search === subItem.path;
                        const Icon = subItem.icon;
                        const totalItems = assetSubItems.length;
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`${isAssetsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                              } flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm ${isActive
                                ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10 font-medium translate-x-1 shadow-sm'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                              }`}
                            style={{
                              animationDelay: isAssetsOpen
                                ? `${index * 0.05}s`
                                : `${(totalItems - index - 1) * 0.03}s`,
                            }}
                          >
                            <Icon size={14} />
                            <span>{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="mt-1">
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Reports
            </span>
          </div>


          {/* Reports Menu */}
          <div className="mt-2">
            <button
              onClick={() => setIsReportsOpen(!isReportsOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/reports')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={16} />
                <span>Reports</span>
              </div>
              {isReportsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isReportsOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isReportsOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {[
                  { path: '/reports/product-sales-reports', label: 'Product Sales Reports', icon: BarChart3 },
                  { path: '/reports/sales-reports', label: 'Sales Reports', icon: BarChart3 },
                  { path: '/reports/pos-reports', label: 'POS Reports', icon: BarChart3 },
                ].map((item, index) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  const Icon = item.icon;
                  const totalItems = 3;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${isReportsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isReportsOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Settings Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalSettingsActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Map size={16} />
                <span>Settings</span>
              </div>
              {isSettingsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isSettingsOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isSettingsOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {settingsSubItems.map((subItem, index) => {
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = settingsSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isSettingsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isSettingsOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notifications - single link; tabs (Customer, Warehouse, etc.) are on the page */}
          <div className="mt-1">
            <Link
              to="/notifications/customer-notifications"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalNotificationsActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </Link>
          </div>

          {/* Ratings and Reviews Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsRatingsOpen(!isRatingsOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalRatingsActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Star size={16} />
                <span>Ratings and Reviews</span>
              </div>
              {isRatingsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isRatingsOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isRatingsOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {ratingsSubItems.map((subItem, index) => {
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = ratingsSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isRatingsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isRatingsOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contact Us Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsContactOpen(!isContactOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalContactActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>Contact Us</span>
              </div>
              {isContactOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <div
              className={`overflow-hidden ${isContactOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isContactOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {contactSubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;

                  return (
                    <Link
                      key={`contact-${index}`}   // ✅ SAFE KEY (no warnings)
                      to={subItem.path}
                      className={`${isContactOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isContactOpen
                          ? `${index * 0.05}s`
                          : `${(contactSubItems.length - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Access Management */}
          <div className="mt-1">
            <Link
              to="/reports/access-management"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/reports/access-management')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShieldCheck size={16} />
              <span>Access Management</span>
            </Link>
          </div>

          {/* Resource Management Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsResourcesOpen(!isResourcesOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalResourcesActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Database size={16} />
                <span>Resource Management</span>
              </div>
              {isResourcesOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isResourcesOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isResourcesOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {resourcesSubItems.map((subItem, index) => {
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = resourcesSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isResourcesOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isResourcesOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>



          {/* Vehicles*/}

          <div className="mt-1">
            <Link
              to="/vehicles"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/vehicles')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ShoppingCart size={16} />
              <span>Vehicles</span>
            </Link>
          </div>

          {/* Activity Log Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsActivityLogOpen(!isActivityLogOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalActivityLogActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList size={16} />
                <span>Activity Log</span>
              </div>
              {isActivityLogOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <div
              className={`overflow-hidden ${isActivityLogOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isActivityLogOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {activityLogSubItems.map((subItem, index) => {
                  const isActive =
                    location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;

                  return (
                    <Link
                      key={`activity-log-${index}`}   // ✅ SAFE KEY
                      to={subItem.path}
                      className={`${isActivityLogOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isActivityLogOpen
                          ? `${index * 0.05}s`
                          : `${(activityLogSubItems.length - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>


          {/* Locations Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsLocationsOpen(!isLocationsOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${finalLocationsActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>Locations</span>
              </div>
              {isLocationsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isLocationsOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
              style={{
                maxHeight: isLocationsOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {locationsSubItems.map((subItem, index) => {
                  const isActive = location.pathname === subItem.path ||
                    location.pathname.startsWith(subItem.path + '/');
                  const Icon = subItem.icon;
                  const totalItems = locationsSubItems.length;

                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isLocationsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isLocationsOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>


        </div>


        {/* Marketing & Promotions Section */}
        <div className="mt-1">
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              MARKETING & PROMOTIONS
            </span>
          </div>

          {/* Home Sliders Menu */}
          <div className="mt-1">
            <Link
              to="/home-sliders/manage"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/home-sliders')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <ImageIcon size={16} />
              <span>Home Sliders</span>
            </Link>
          </div>

          {/* Offer Images Menu */}
          <div className="mt-1">
            <button
              onClick={() => setIsOfferImagesOpen(!isOfferImagesOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isOfferImageActive
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <Tag size={16} />
                <span>Offer Image</span>
              </div>
              {isOfferImagesOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            <div
              className={`overflow-hidden ${isOfferImagesOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
              style={{
                maxHeight: isOfferImagesOpen ? '500px' : '0',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="ml-4 space-y-1">
                {offerImageSubItems.map((subItem, index) => {
                  const isActive = location.pathname === subItem.path;
                  const Icon = subItem.icon;
                  const totalItems = offerImageSubItems.length;
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${isOfferImagesOpen ? 'dropdown-item' : 'dropdown-item-exit'
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                      style={{
                        animationDelay: isOfferImagesOpen
                          ? `${index * 0.05}s`
                          : `${(totalItems - index - 1) * 0.03}s`,
                      }}
                    >
                      <Icon size={14} />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Promo Code Menu */}
          {/* <div className="mt-1">
            <Link
              to="/promo-codes/manage"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname.startsWith('/promo-codes')
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
              <Ticket size={16} />
              <span>Promo Code</span>
            </Link>
          </div> */}
        </div>

        {/* System Menu */}
        <div className="mt-2">
          <button
            onClick={() => setIsSystemOpen(!isSystemOpen)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isSystemActive
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
              }`}
          >
            <div className="flex items-center gap-2">
              <Monitor size={16} />
              <span>System</span>
            </div>
            {isSystemOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>

          <div
            className={`overflow-hidden ${isSystemOpen ? 'dropdown-enter' : 'dropdown-exit'
              }`}
            style={{
              maxHeight: isSystemOpen ? '500px' : '0',
              transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="ml-4 space-y-1">
              {systemSubItems.map((subItem, index) => {
                const isActive = location.pathname === subItem.path;
                const Icon = subItem.icon;
                const totalItems = systemSubItems.length;
                return (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    className={`${isSystemOpen ? 'dropdown-item' : 'dropdown-item-exit'
                      } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                      }`}
                    style={{
                      animationDelay: isSystemOpen
                        ? `${index * 0.05}s`
                        : `${(totalItems - index - 1) * 0.03}s`,
                    }}
                  >
                    <Icon size={14} />
                    <span>{subItem.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Web Settings Menu */}
        <div className="mt-2">
          <button
            onClick={() => setIsWebSettingsOpen(!isWebSettingsOpen)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${isWebSettingsActive
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
              }`}
          >
            <div className="flex items-center gap-2">
              <Monitor size={16} />
              <span>Web Settings</span>
            </div>
            {isWebSettingsOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>

          <div
            className={`overflow-hidden ${isWebSettingsOpen ? 'dropdown-enter' : 'dropdown-exit'
              }`}
            style={{
              maxHeight: isWebSettingsOpen ? '500px' : '0',
              transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="ml-4 space-y-1">
              {webSettingsSubItems.map((subItem, index) => {
                const isActive = location.pathname === subItem.path;
                const Icon = subItem.icon;
                const totalItems = webSettingsSubItems.length;
                return (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    className={`${isWebSettingsOpen ? 'dropdown-item' : 'dropdown-item-exit'
                      } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                      }`}
                    style={{
                      animationDelay: isWebSettingsOpen
                        ? `${index * 0.05}s`
                        : `${(totalItems - index - 1) * 0.03}s`,
                    }}
                  >
                    <Icon size={14} />
                    <span>{subItem.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>


        {/* Languages Menu */}
        <div className="mt-2">
          <Link
            to="/languages"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-sm ${location.pathname === '/languages'
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
              }`}
          >
            <Languages size={16} />
            <span>Languages</span>
          </Link>
        </div>


      </nav>
    </aside>
  );
};

export default Sidebar;

