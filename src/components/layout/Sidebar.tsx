<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarClock, Bike, Megaphone, Hash, Database, Image, Smile, Map, Users2, Smartphone, HelpCircle, Package, ShoppingCart, Store, Image as ImageIcon, Tag, RotateCcw, Star, Truck, ChevronDown, ChevronRight, Settings, FolderTree, Layers, Award, Ruler, Percent, MapPin, Navigation, Building2, Phone, Info, FileText, Shield, Upload, RefreshCw, CheckCircle, Film, Users, UserCog, Handshake, Boxes, Eye, AlertTriangle, ClipboardList, ArrowRightLeft, Receipt, ScanLine, Printer, Bell, UserCheck, Wallet, DollarSign, ShieldCheck, Maximize2, Monitor, Clock, CreditCard, Globe, Share2, X, Languages, BarChart3, Link2, BookOpen, Wrench, Activity, History, ShieldAlert, Landmark, MessageSquare, BarChart2 } from 'lucide-react';
=======
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import {
  sidebarConfig,
  initialStateCheckers,
  MenuSection,
  SubMenuItem,
} from "./sidebarConfig";

// Sidebar component props interface
>>>>>>> 3bf845b1c735cd8c4af68b6469fbe5279bd90e50
interface SidebarProps {
  isOpen?: boolean; // Whether sidebar is open or closed
  setIsOpen?: (open: boolean) => void; // Function to open/close sidebar
}

/**
 * Sidebar Component
 * This component displays the menu sidebar on the left side
 * It handles all menu items, submenus, and navigation
 */
const Sidebar = ({ isOpen = true, setIsOpen }: SidebarProps) => {
  // Get current page path
  const location = useLocation();

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

  // Missing config states
  const [isShopkeeperErpAdminOpen, setIsShopkeeperErpAdminOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);
  const [isVsmsOpen, setIsVsmsOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);

  // ============================================
  // STATE MAPS - For dynamic state access
  // ============================================

  /**
   * State Setters Map
   * This map stores functions to update state for each menu
   * Example: "isProductsOpen" key returns setIsProductsOpen function
   */
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
      isPricingOpen: setIsPricingOpen,
      isBarcodeOpen: setIsBarcodeOpen,
      isProcurementOpen: setIsProcurementOpen,
      isVsmsOpen: setIsVsmsOpen,
      isAssetsOpen: setIsAssetsOpen,
    }),
    []
  );

  /**
   * State Getters Map
   * This map is used to get current state for each menu
   * Example: "isProductsOpen" key returns current boolean value
   */
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
      isPricingOpen,
      isBarcodeOpen,
      isProcurementOpen,
      isVsmsOpen,
      isAssetsOpen,
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
      isPricingOpen,
      isBarcodeOpen,
      isProcurementOpen,
      isVsmsOpen,
      isAssetsOpen,
    ]
  );

  // ============================================
  // useEffect - Updates menu states when location changes
  // ============================================

<<<<<<< HEAD
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(
    location.pathname.startsWith('/delivery-settings')
  );

  const [isStaffOpen, setIsStaffOpen] = useState(
    location.pathname.startsWith('/staff-management')
  );


  const [isShopkeeperErpAdminOpen, setIsShopkeeperErpAdminOpen] = useState(
    location.pathname.startsWith('/shopkeeper-erp')
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
    { path: '/home-delivery-orders', label: 'Home Delivery Orders', icon: Home },
    { path: '/self-pickup-orders', label: 'Self Pickup Orders', icon: Store },
    { path: '/audit/logs', label: 'Audit Logs', icon: History },
    { path: '/notifications/logs', label: 'Notification Logs', icon: MessageSquare },
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
=======
  // jdsfhkjsd
  /**
   * 
   * useEffect Hook
   * Whenever user navigates to different page, this automatically
   * opens/closes menu items based on current page
   */
>>>>>>> 3bf845b1c735cd8c4af68b6469fbe5279bd90e50
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
  }, [location.pathname]);

<<<<<<< HEAD


=======
  // ============================================
  // HELPER FUNCTIONS - For checking active state
  // ============================================

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
    [location.pathname]
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
      const isOpen = stateGetters[section.stateKey] || false;
      const setIsOpen = stateSetters[section.stateKey];
      const isActive = isItemActive(section);
      const Icon = section.icon;

      // ============================================
      // SPECIAL ACTIVE STATE CHECKS
      // Some menus need special logic
      // ============================================

      // Special check for Promotions and Offers
      const isPromotionsActive =
        section.stateKey === "isPromotionsOffersOpen" &&
        (isOpen ||
          location.pathname.startsWith("/promo-codes") ||
          location.pathname.startsWith("/banners") ||
          location.pathname.startsWith("/campaigns") ||
          location.pathname.startsWith("/advertisement"));

      // Special check for Notifications
      const isNotificationsActive =
        section.stateKey === "isNotificationsOpen" &&
        (isOpen || location.pathname.startsWith("/notifications"));

      // Special check for Ratings and Reviews
      const isRatingsActive =
        section.stateKey === "isRatingsReviewsOpen" &&
        (isOpen ||
          location.pathname.startsWith("/ratings") ||
          location.pathname.startsWith("/reviews"));

      // Special check for Contact Us
      const isContactUsActive =
        section.stateKey === "isContactUsOpen" &&
        (isOpen || location.pathname.startsWith("/contact-us"));

      // Special check for Locations
      const isLocationsActive =
        section.stateKey === "isLocationsOpen" &&
        (isOpen ||
          location.pathname.startsWith("/locations") ||
          location.pathname.startsWith("/states") ||
          location.pathname.startsWith("/cities") ||
          location.pathname.startsWith("/zip-codes") ||
          location.pathname.startsWith("/areas"));

      // Special check for Order Management
      const isOrderManagementActive =
        section.stateKey === "isOrderManagementOpen" &&
        (isOpen ||
          location.pathname.startsWith("/orders") ||
          location.pathname.startsWith("/home-delivery-orders") ||
          location.pathname.startsWith("/self-pickup-orders"));

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
            onClick={() => setIsOpen && setIsOpen(!isOpen)}
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
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Submenu Items - Visible when expanded */}
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
                      className={`${isOpen ? "dropdown-item" : "dropdown-item-exit"
                        } flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                          ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
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
        <div className="flex items-center justify-between gap-2">
          {/* Logo only - wider, centered in sidebar, height unchanged */}
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
          {/* Close Button - Visible on mobile */}
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

      {/* Navigation Section - All menu items are rendered here */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden sidebar-scrollbar min-h-0">
        {sidebarConfig.map((section, index) => {
          if (section.hidden) return null;
          const key = section.sectionTitle || section.path || section.stateKey || `sidebar-${index}`;
          switch (section.type) {
            case "section":
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
