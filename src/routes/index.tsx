import React, { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const ShopkeeperERP = lazy(() => import("../pages/ShopkeeperERP"));
const ShopkeeperAdminERP = lazy(() => import("../pages/admin_pages/orders/ShopkeeperAdminERP"));

// Packing ERP (Admin)
const PackingDashboard = lazy(() => import("../pages/admin_pages/packing/PackingDashboard"));
const PackingMasterData = lazy(() => import("../pages/admin_pages/packing/PackingMasterData"));
const PackingProductBOM = lazy(() => import("../pages/admin_pages/packing/PackingProductBOM"));
const PackingWorkOrders = lazy(() => import("../pages/admin_pages/packing/PackingWorkOrders"));
const PackingApprovals = lazy(() => import("../pages/admin_pages/packing/PackingApprovals"));
const PackingMaterialIssue = lazy(() => import("../pages/admin_pages/packing/PackingMaterialIssue"));
const PackingMaterialIssueDetails = lazy(() => import("../pages/admin_pages/packing/PackingMaterialIssueDetails"));
const PackingExecution = lazy(() => import("../pages/admin_pages/packing/PackingExecution"));
const PackingExecutionDetails = lazy(() => import("../pages/admin_pages/packing/PackingExecutionDetails"));
const PackingBarcodesLabels = lazy(() => import("../pages/admin_pages/packing/PackingBarcodesLabels"));
const PackingQualityCheck = lazy(() => import("../pages/admin_pages/packing/PackingQualityCheck"));
const PackingFinishedGoods = lazy(() => import("../pages/admin_pages/packing/PackingFinishedGoods"));
const PackingRepacking = lazy(() => import("../pages/admin_pages/packing/PackingRepacking"));
const PackingReports = lazy(() => import("../pages/admin_pages/packing/PackingReports"));

// Packing Operator Portal
const OperatorLayout = lazy(() => import("../pages/operator_pages/packing/OperatorLayout"));
const OperatorDashboard = lazy(() => import("../pages/operator_pages/packing/OperatorDashboard"));
const OperatorMyJobs = lazy(() => import("../pages/operator_pages/packing/MyJobs"));
const OperatorActivePacking = lazy(() => import("../pages/operator_pages/packing/ActivePacking"));
const OperatorLabelApplication = lazy(() => import("../pages/operator_pages/packing/LabelApplication"));
const OperatorPackingHistory = lazy(() => import("../pages/operator_pages/packing/PackingHistory"));
const OperatorReportIssue = lazy(() => import("../pages/operator_pages/packing/ReportIssue"));
const OperatorProfile = lazy(() => import("../pages/operator_pages/packing/Profile"));

// QC Checker Portal
const QCLayout = lazy(() => import("../pages/qc_pages/packing/QCLayout"));
const QCDashboard = lazy(() => import("../pages/qc_pages/packing/QCDashboard"));
const MyQCTasks = lazy(() => import("../pages/qc_pages/packing/MyQCTasks"));
const ActiveQCInspection = lazy(() => import("../pages/qc_pages/packing/ActiveQCInspection"));
const QCHistory = lazy(() => import("../pages/qc_pages/packing/QCHistory"));
const QCReportIssue = lazy(() => import("../pages/qc_pages/packing/ReportIssue"));
const QCProfile = lazy(() => import("../pages/qc_pages/packing/Profile"));

export const OperatorPortalWrapper: React.FC = () => {
  return (
    <Routes>
      <Route element={<OperatorLayout />}>
        <Route path="dashboard" element={<OperatorDashboard />} />
        <Route path="jobs" element={<OperatorMyJobs />} />
        <Route path="jobs/:id" element={<OperatorMyJobs />} />
        <Route path="active-packing" element={<OperatorActivePacking />} />
        <Route path="label-application" element={<OperatorLabelApplication />} />
        <Route path="history" element={<OperatorPackingHistory />} />
        <Route path="history/:id" element={<OperatorPackingHistory />} />
        <Route path="report-issue" element={<OperatorReportIssue />} />
        <Route path="profile" element={<OperatorProfile />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export const QCPortalWrapper: React.FC = () => {
  return (
    <Routes>
      <Route element={<QCLayout />}>
        <Route path="dashboard" element={<QCDashboard />} />
        <Route path="tasks" element={<MyQCTasks />} />
        <Route path="tasks/:id" element={<MyQCTasks />} />
        <Route path="active-inspection" element={<ActiveQCInspection />} />
        <Route path="history" element={<QCHistory />} />
        <Route path="history/:id" element={<QCHistory />} />
        <Route path="report-issue" element={<QCReportIssue />} />
        <Route path="profile" element={<QCProfile />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};



// Lazy load all components for better performance
const Login = lazy(() => import("../pages/public_pages/login_page/Login"));
const UnderDevelopment = lazy(
  () => import("../components/common/UnderDevelopment")
);
const ForgotPassword = lazy(
  () => import("../pages/public_pages/login_page/ForgotPassword")
);
const CreatePassword = lazy(
  () => import("../pages/public_pages/login_page/CreatePassword")
);
const ChangePassword = lazy(
  () => import("../pages/public_pages/login_page/ChangePassword")
);
const Dashboard = lazy(
  () => import("../pages/admin_pages/dashboard/Dashboard")
);

// Pricing Engine
const PriceBooks = lazy(() => import("../pages/admin_pages/pricing/PriceBooks"));
const ProductPricing = lazy(() => import("../pages/admin_pages/pricing/ProductPricing"));
const PriceComparison = lazy(() => import("../pages/admin_pages/pricing/PriceComparison"));




// Categories
const ManageCategories = lazy(
  () => import("../pages/admin_pages/categories/ManageCategories")
);
const AddCategory = lazy(
  () => import("../pages/admin_pages/categories/AddCategory")
);
const OrderCategories = lazy(
  () => import("../pages/admin_pages/categories/OrderCategories")
);
const ManageSubCategories = lazy(
  () => import("../pages/admin_pages/subCategories/ManageSubCategories")
);
const AddSubCategory = lazy(
  () => import("../pages/admin_pages/subCategories/AddSubCategory")
);
const ViewCategory = lazy(
  () => import("../pages/admin_pages/categories/ViewCategory")
);
const ViewSubCategory = lazy(
  () => import("../pages/admin_pages/subCategories/ViewSubCategory")
);

// Products
const ManageProducts = lazy(
  () => import("../pages/admin_pages/products/ManageProducts")
);
const BarcodeMappingScreen = lazy(
  () => import("../pages/admin_pages/products/BarcodeMappingScreen")
);
const OnlineStockManagement = lazy(
  () => import("../pages/admin_pages/products/OnlineStockManagement")
);
const PosStockManagement = lazy(
  () => import("../pages/admin_pages/products/PosStockManagement")
);
const VehicleStockManagement = lazy(
  () => import("../pages/admin_pages/products/VehicleStockManagement")
);
const AddProduct = lazy(
  () => import("../pages/admin_pages/products/AddProducts")
);
const ApproveRequests = lazy(
  () => import("../pages/admin_pages/products/ApproveRequests")
);
const ManageUnits = lazy(
  () => import("../pages/admin_pages/units/ManageUnits")
);
const AddUnit = lazy(() => import("../pages/admin_pages/units/AddUnit"));
const ProductRatings = lazy(
  () => import("../pages/admin_pages/products/ProductRatings")
);
const Media = lazy(() => import("../pages/admin_pages/products/Media"));
const BulkUpload = lazy(
  () => import("../pages/admin_pages/products/BulkUpload")
);
const BulkUpdate = lazy(
  () => import("../pages/admin_pages/products/BulkUpdate")
);
const ZipImport = lazy(
  () => import("../pages/admin_pages/products/ZipImport")
);
const BundleDeals = lazy(
  () => import("../pages/admin_pages/products/BundleDeals")
);
const HomepagePromos = lazy(
  () => import("../pages/admin_pages/products/HomepagePromos")
);
const ImportProducts = lazy(
  () => import("../pages/admin_pages/products/ImportProducts")
);
const ViewImportProduct = lazy(
  () => import("../pages/admin_pages/products/ViewImportProduct")
);
const ExportProducts = lazy(
  () => import("../pages/admin_pages/products/ExportProducts")
);
const ManageTaxes = lazy(
  () => import("../pages/admin_pages/products/ManageTaxes")
);
const AddTax = lazy(() => import("../pages/admin_pages/products/AddTax"));
const ManageBrands = lazy(
  () => import("../pages/admin_pages/brands/ManageBrands")
);
const AddBrand = lazy(() => import("../pages/admin_pages/brands/AddBrand"));
const ProductsOrder = lazy(
  () => import("../pages/admin_pages/products/ProductsOrder")
);
const ViewProduct = lazy(
  () => import("../pages/admin_pages/products/ViewProduct")
);
const ViewVariant = lazy(
  () => import("../pages/admin_pages/products/ViewVariant")
);
const ViewApproveRequest = lazy(
  () => import("../pages/admin_pages/products/ViewApproveRequest")
);
const ViewProductRating = lazy(
  () => import("../pages/admin_pages/products/ViewProductRating")
);
const ViewMedia = lazy(() => import("../pages/admin_pages/products/ViewMedia"));
const ViewBrand = lazy(() => import("../pages/admin_pages/brands/ViewBrand"));
const ViewTax = lazy(() => import("../pages/admin_pages/products/ViewTax"));
const ViewUnit = lazy(() => import("../pages/admin_pages/units/ViewUnit"));

// Orders
const HomeDeliveryOrders = lazy(
  () => import("../pages/admin_pages/orders/HomeDeliveryOrders")
);
const ViewHomeDeliveryOrder = lazy(
  () => import("../pages/admin_pages/orders/ViewHomeDeliveryOrder")
);
const SelfPickupOrders = lazy(
  () => import("../pages/admin_pages/orders/SelfPickupOrders")
);
const ViewSelfPickupOrder = lazy(
  () => import("../pages/admin_pages/orders/ViewSelfPickupOrder")
);

// Categories
const MyCategories = lazy(
  () => import("../pages/admin_pages/myCategoryManagement/MyCategories")
);
const RequestCategory = lazy(
  () => import("../pages/admin_pages/myCategoryManagement/RequestCategory")
);
const MySubCategories = lazy(
  () => import("../pages/admin_pages/myCategoryManagement/MySubCategories")
);
const RequestSubCategory = lazy(
  () => import("../pages/admin_pages/myCategoryManagement/RequestSubCategory")
);
// Stock
const StockManagement = lazy(
  () => import("../pages/admin_pages/stock/StockManagement")
);
const AdminProcurement = lazy(
  // @ts-ignore
  () => import("../pages/admin_pages/procurement/AdminProcurement")
);

// Sellers
const SellerRequests = lazy(
  () => import("../pages/admin_pages/sellers/SellerRequests")
);
const AddSeller = lazy(() => import("../pages/admin_pages/sellers/AddSeller"));

const ManageSellers = lazy(
  () => import("../pages/admin_pages/sellers/ManageSellers")
);
const SellerWalletTransactions = lazy(
  () => import("../pages/admin_pages/sellers/SellerWalletTransactions")
);
const AddWalletTransaction = lazy(
  () => import("../pages/admin_pages/sellers/AddWalletTransaction")
);
const EditWalletTransaction = lazy(
  () => import("../pages/admin_pages/sellers/EditWalletTransaction")
);
const ViewWalletTransaction = lazy(
  () => import("../pages/admin_pages/sellers/ViewWalletTransaction")
);
const SellerPolicies = lazy(
  () => import("../pages/admin_pages/sellers/SellerPolicies")
);
const ViewSeller = lazy(
  () => import("../pages/admin_pages/sellers/ViewSeller")
);

// Home Sliders
const ManageHomeSliders = lazy(
  () => import("../pages/admin_pages/homeSliders/ManageHomeSliders")
);
const AddHomeSlider = lazy(
  () => import("../pages/admin_pages/homeSliders/AddHomeSlider")
);
const ViewHomeSlider = lazy(
  () => import("../pages/admin_pages/homeSliders/ViewHomeSlider")
);

// Offer Images
const ManageOfferImages = lazy(
  () => import("../pages/admin_pages/offerImages/ManageOfferImages")
);
const AddOfferImage = lazy(
  () => import("../pages/admin_pages/offerImages/AddOfferImage")
);
const ViewOfferImage = lazy(
  () => import("../pages/admin_pages/offerImages/ViewOfferImage")
);
const ManagePopupOffer = lazy(
  () => import("../pages/admin_pages/offerImages/ManagePopupOffer")
);

// Promo Codes
const ManagePromoCodes = lazy(
  () => import("../pages/admin_pages/promoCodes/ManagePromoCodes")
);
const AddPromoCode = lazy(
  () => import("../pages/admin_pages/promoCodes/AddPromoCode")
);
const ViewPromoCode = lazy(
  () => import("../pages/admin_pages/promoCodes/ViewPromoCode")
);

// Banners
const ManageBanners = lazy(
  () => import("../pages/admin_pages/banners/ManageBanners")
);
const AddBanner = lazy(() => import("../pages/admin_pages/banners/AddBanner"));

// Campaigns
const ManageCampaigns = lazy(
  () => import("../pages/admin_pages/campaigns/ManageCampaigns")
);
const AddCampaign = lazy(
  () => import("../pages/admin_pages/campaigns/AddCampaign")
);

// Return Requests
const ManageReturnRequests = lazy(
  () => import("../pages/admin_pages/returnRequests/ManageReturnRequests")
);
const EditReturnRequest = lazy(
  () => import("../pages/admin_pages/returnRequests/EditReturnRequest")
);
const ViewReturnRequest = lazy(
  () => import("../pages/admin_pages/returnRequests/ViewReturnRequest")
);

// Refunds
const ManageRefunds = lazy(
  () => import("../pages/admin_pages/refunds/ManageRefunds")
);

// Featured Sections
const ManageFeaturedSections = lazy(
  () => import("../pages/admin_pages/featuredSections/ManageFeaturedSections")
);
const AddFeaturedSection = lazy(
  () => import("../pages/admin_pages/featuredSections/AddFeaturedSection")
);
const ViewFeaturedSection = lazy(
  () => import("../pages/admin_pages/featuredSections/ViewFeaturedSection")
);

// Delivery Boys
const DeliveryBoyRequests = lazy(
  () => import("../pages/admin_pages/deliveryBoys/DeliveryBoyRequests")
);
const DeliveryAgentOnboarding = lazy(
  () => import("../pages/admin_pages/deliveryBoys/DeliveryAgentOnboarding")
);

const AddDeliveryAgent = lazy(
  () => import("../pages/admin_pages/sellers/AddDeliveryAgent")
);
const ViewDeliveryAgent = lazy(() =>
  import("../pages/admin_pages/deliveryBoys/ViewDeliveryAgent")
);

const ManageDeliveryBoys = lazy(
  () => import("../pages/admin_pages/deliveryBoys/ManageDeliveryBoys")
);
const ManageFundTransfers = lazy(
  () => import("../pages/admin_pages/deliveryBoys/ManageFundTransfers")
);
const AddFundTransfer = lazy(
  () => import("../pages/admin_pages/deliveryBoys/AddFundTransfer")
);
const ManageCashCollections = lazy(
  () => import("../pages/admin_pages/deliveryBoys/ManageCashCollections")
);
const AddCashCollection = lazy(
  () => import("../pages/admin_pages/deliveryBoys/AddCashCollection")
);
const DeliveryBoyPolicies = lazy(
  () => import("../pages/admin_pages/deliveryBoys/DeliveryBoyPolicies")
);
const ViewDeliveryBoyPolicy = lazy(
  () => import("../pages/admin_pages/deliveryBoys/ViewDeliveryBoyPolicy")
);
const ViewDeliveryBoy = lazy(
  () => import("../pages/admin_pages/deliveryBoys/ViewDeliveryBoy")
);

// Master Setup
const ManageStates = lazy(
  () => import("../pages/admin_pages/state/ManageStates")
);
const AddState = lazy(() => import("../pages/admin_pages/state/AddState"));
const EditState = lazy(() => import("../pages/admin_pages/state/EditState"));
const ViewState = lazy(() => import("../pages/admin_pages/state/ViewState"));
const ManageCountries = lazy(
  () => import("../pages/admin_pages/country/ManageCountries")
);
const AddCountry = lazy(
  () => import("../pages/admin_pages/country/AddCountry")
);
const EditCountry = lazy(
  () => import("../pages/admin_pages/country/EditCountry")
);
const ViewCountry = lazy(
  () => import("../pages/admin_pages/country/ViewCountry")
);
const ManageDistricts = lazy(
  () => import("../pages/admin_pages/masterSetup/districts/ManageDistricts")
);
const AddDistrict = lazy(
  () => import("../pages/admin_pages/masterSetup/districts/AddDistrict")
);
const EditDistrict = lazy(
  () => import("../pages/admin_pages/masterSetup/districts/EditDistrict")
);
const ViewDistrict = lazy(
  () => import("../pages/admin_pages/masterSetup/districts/ViewDistrict")
);
const ManageAreas = lazy(
  () => import("../pages/admin_pages/masterSetup/areas/ManageAreas")
);
const AddArea = lazy(
  () => import("../pages/admin_pages/masterSetup/areas/AddArea")
);
const EditArea = lazy(
  () => import("../pages/admin_pages/masterSetup/areas/EditArea")
);
const ViewArea = lazy(
  () => import("../pages/admin_pages/masterSetup/areas/ViewArea")
);
const ManageRoles = lazy(
  () => import("../pages/admin_pages/masterSetup/roles/ManageRoles")
);
const AccessManagement = lazy(
  () => import("../pages/admin_pages/masterSetup/roles/AccessManagement")
);
const AddRole = lazy(
  () => import("../pages/admin_pages/masterSetup/roles/AddRole")
);
const ViewRole = lazy(
  () => import("../pages/admin_pages/masterSetup/roles/ViewRole")
);
const Settings = lazy(
  () => import("../pages/admin_pages/masterSetup/settings/Settings")
);
const Attributes = lazy(
  () => import("../pages/admin_pages/masterSetup/attributes/Attributes")
);
const ViewAttribute = lazy(
  () => import("../pages/admin_pages/masterSetup/attributes/ViewAttribute")
);
const AddAttribute = lazy(
  () => import("../pages/admin_pages/masterSetup/attributes/AddAttribute")
);
const EditAttribute = lazy(
  () => import("../pages/admin_pages/masterSetup/attributes/EditAttribute")
);
const ContactUs = lazy(
  () => import("../pages/admin_pages/masterSetup/content/ContactUs")
);
const AboutUs = lazy(
  () => import("../pages/admin_pages/masterSetup/content/AboutUs")
);
const TermsAndConditions = lazy(
  () => import("../pages/admin_pages/masterSetup/content/TermsAndConditions")
);
const PrivacyPolicy = lazy(
  () => import("../pages/admin_pages/masterSetup/content/PrivacyPolicy")
);

// User Management
const ManageAdmins = lazy(
  () => import("../pages/admin_pages/userManagement/ManageAdmins")
);
const ManagePartners = lazy(
  () => import("../pages/admin_pages/userManagement/ManagePartners")
);
const ViewAdmin = lazy(
  () => import("../pages/admin_pages/userManagement/ViewAdmin")
);
const AddEditAdmin = lazy(
  () => import("../pages/admin_pages/userManagement/AddEditAdmin")
);
const ViewPartner = lazy(
  () => import("../pages/admin_pages/userManagement/ViewPartner")
);
const AddEditPartner = lazy(
  () => import("../pages/admin_pages/userManagement/AddEditPartner")
);

// Inventory
const ReserveStock = lazy(
  () => import("../pages/admin_pages/inventory/ReserveStock")
);
const ReadyInventory = lazy(
  () => import("../pages/admin_pages/inventory/ReadyInventory")
);
const ConfigureStock = lazy(
  () => import("../pages/admin_pages/inventory/ConfigureStock")
);
const RawInventory = lazy(
  () => import("../pages/admin_pages/inventory/RawInventory")
);
const InventoryDashboard = lazy(
  () => import("../pages/admin_pages/inventory/InventoryDashboard")
);
const InventoryOverview = lazy(
  () => import("../pages/admin_pages/inventory/InventoryOverview")
);
const SkuDetail = lazy(
  () => import("../pages/admin_pages/inventory/SkuDetail")
);
const AdjustStock = lazy(
  () => import("../pages/admin_pages/inventory/AdjustStock")
);
const CreateTransfer = lazy(
  () => import("../pages/admin_pages/inventory/CreateTransfer")
);
const Operations = lazy(
  () => import("../pages/admin_pages/inventory/Operations")
);
const Monitoring = lazy(
  () => import("../pages/admin_pages/inventory/Monitoring")
);
const InventorySettings = lazy(
  () => import("../pages/admin_pages/inventory/InventorySettings")
);

// System
const StoreSettings = lazy(
  () => import("../pages/admin_pages/system/StoreSettings")
);
const BusinessSettings = lazy(
  () => import("../pages/admin_pages/system/BusinessSettings")
);
const DeliverySettings = lazy(
  () => import("../pages/admin_pages/system/DeliverySettings")
);
const DeliveryTypes = lazy(
  () => import("../pages/admin_pages/deliverySettings/DeliveryTypes")
);
const ScheduledDelivery = lazy(
  () => import("../pages/admin_pages/deliverySettings/ScheduledDelivery")
);
const CreateSlot = lazy(
  () => import("../pages/admin_pages/deliverySettings/CreateSlot")
);
const CreateStorePickupSlot = lazy(
  () => import("../pages/admin_pages/deliverySettings/CreateStorePickupSlot")
);
const CreatePickupAtVehicleSlot = lazy(
  () => import("../pages/admin_pages/deliverySettings/CreatePickupAtVehicleSlot")
);

const StorePickup = lazy(
  () => import("../pages/admin_pages/deliverySettings/StorePickup")
);
const PickAtVehicle = lazy(
  () => import("../pages/admin_pages/deliverySettings/PickAtVehicle")
);
// const StorePickupCreateSlot = lazy(
//   () => import("../pages/admin_pages/deliverySettings/StorePickupCreateSlot")
// );
const CreateRouteMap = lazy(
  () => import("../pages/admin_pages/deliverySettings/CreateRouteMap")
);
const PaymentMethods = lazy(
  () => import("../pages/admin_pages/system/PaymentMethods")
);
const SEOSettings = lazy(
  () => import("../pages/admin_pages/system/SEOSettings")
);
const AddSEOSetting = lazy(
  () => import("../pages/admin_pages/system/AddSEOSetting")
);
const ViewTimeSlot = lazy(
  () => import("../pages/admin_pages/system/ViewTimeSlot")
);

// Web Settings
const GeneralWebSettings = lazy(
  () => import("../pages/admin_pages/webSettings/GeneralWebSettings")
);
const SocialMedia = lazy(
  () => import("../pages/admin_pages/webSettings/SocialMedia")
);
const AddSocialMedia = lazy(
  () => import("../pages/admin_pages/webSettings/AddSocialMedia")
);

//Languages
const ManageLanguages = lazy(
  () => import("../pages/admin_pages/languages/ManageLanguages")
);

//Reports
const ProductSalesReports = lazy(
  () => import("../pages/admin_pages/reports/ProductSalesReports")
);
const SalesReports = lazy(
  () => import("../pages/admin_pages/reports/SalesReports")
);
const PosReports = lazy(
  () => import("../pages/admin_pages/reports/PosReports")
);

// Resource Management
const ResourceManagement = lazy(
  () => import("../pages/admin_pages/resources/ResourceManagement")
);
const ViewResource = lazy(
  () => import("../pages/admin_pages/resources/ViewResource")
);
const AddResource = lazy(
  () => import("../pages/admin_pages/resources/AddResource")
);

// Notifications
const Notifications = lazy(
  () => import("../pages/admin_pages/notifications/Notifications")
);

// VSMS Pages
const AdminVehicles = lazy(() => import("../pages/admin_pages/vsms/AdminVehicles"));
const AdminExpenses = lazy(() => import("../pages/admin_pages/vsms/AdminExpenses"));
const AdminDamage = lazy(() => import("../pages/admin_pages/vsms/AdminDamage"));
const AdminRoutes = lazy(() => import("../pages/admin_pages/vsms/AdminRoutes"));
const AdminInventory = lazy(() => import("../pages/admin_pages/vsms/AdminInventory"));
const AdminCashManagement = lazy(() => import("../pages/admin_pages/vsms/AdminCashManagement"));
const AdminPOS = lazy(() => import("../pages/admin_pages/vsms/AdminPOS"));
const BarcodeManagement = lazy(() => import("../pages/admin_pages/vsms/BarcodeManagement"));
const AdminSalesPage = lazy(() => import("../pages/admin_pages/vsms/AdminSales"));
const AdminAssets = lazy(() => import("../pages/admin_pages/vsms/AdminAssets"));
const AdminReports = lazy(() => import("../pages/admin_pages/vsms/AdminReports"));



const PartnerScheduledOrders = lazy(() => import("../pages/admin_pages/vsms/PartnerScheduledOrders"));
const PreOrdersManagement = lazy(() => import("../pages/admin_pages/vsms/PreOrdersManagement"));

// VSMS Agent Portal Pages
const AgentPortalLayout = lazy(() => import("../pages/admin_pages/vsms/agent/AgentPortalLayout"));
const AgentPreOrders = lazy(() => import("../pages/admin_pages/vsms/agent/AgentPreOrders"));
const AgentHome = lazy(() => import("../pages/admin_pages/vsms/agent/AgentHome"));
const TodayPlan = lazy(() => import("../pages/admin_pages/vsms/agent/TodayPlan"));
const ScheduledDeliveries = lazy(() => import("../pages/admin_pages/vsms/agent/ScheduledDeliveries"));
const SalesEntry = lazy(() => import("../pages/admin_pages/vsms/agent/SalesEntry"));
const CashWallet = lazy(() => import("../pages/admin_pages/vsms/agent/CashWallet"));
const AgentAttendance = lazy(() => import("../pages/admin_pages/vsms/agent/AgentAttendance"));
const Reports = lazy(() => import("../pages/admin_pages/vsms/agent/Reports"));
const SalesHistory = lazy(() => import("../pages/admin_pages/vsms/agent/SalesHistory"));
const VgeTargets = lazy(() => import("../pages/admin_pages/vsms/agent/VgeTargets"));
const AgentAssets = lazy(() => import("../pages/admin_pages/vsms/agent/AgentAssets"));
const AgentActivityLogs = lazy(() => import("../pages/admin_pages/vsms/agent/AgentActivityLogs"));
const ReportDamage = lazy(() => import("../pages/admin_pages/vsms/agent/ReportDamage"));
const CreateExpense = lazy(() => import("../pages/admin_pages/vsms/agent/CreateExpense"));
const Profile = lazy(() => import("../pages/admin_pages/vsms/agent/Profile"));
const OrderDetail = lazy(() => import("../pages/admin_pages/vsms/agent/OrderDetail"));
const AgentInventoryPage = lazy(() => import("../pages/admin_pages/vsms/agent/AgentInventory"));
const PaymentScreen = lazy(() => import("../pages/admin_pages/vsms/agent/PaymentScreen"));
const SuccessScreen = lazy(() => import("../pages/admin_pages/vsms/agent/SuccessScreen"));
const OpeningCashEntry = lazy(() => import("../pages/admin_pages/vsms/agent/OpeningCashEntry"));
const ClosingCashEntry = lazy(() => import("../pages/admin_pages/vsms/agent/ClosingCashEntry"));
const AgentStockTransfer = lazy(() => import("../pages/admin_pages/vsms/agent/AgentStockTransfer"));


// Route configuration interface
export interface RouteConfig {
  path: string;
  component: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>;
  requiresAuth?: boolean;
}

// Public routes (no authentication required)
export const publicRoutes: RouteConfig[] = [
  {
    path: "/login",
    component: Login,
    requiresAuth: false,
  },
  {
    path: "/forgot-password",
    component: ForgotPassword,
    requiresAuth: false,
  },
  {
    path: "/create-password",
    component: CreatePassword,
    requiresAuth: false,
  },
];

// Protected routes (authentication required)
export const protectedRoutes: RouteConfig[] = [
  // Packing Operator Portal
  {
    path: "/packer/operator/*",
    component: OperatorPortalWrapper,
    requiresAuth: true,
  },

  // QC Checker Portal
  {
    path: "/packer/qc/*",
    component: QCPortalWrapper,
    requiresAuth: true,
  },
  // Packing ERP (Admin)
  {
    path: "/packing-erp/dashboard",
    component: PackingDashboard,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/master-data",
    component: PackingMasterData,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/product-bom",
    component: PackingProductBOM,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/work-orders",
    component: PackingWorkOrders,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/approvals",
    component: PackingApprovals,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/material-issue",
    component: PackingMaterialIssue,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/material-issue/:id",
    component: PackingMaterialIssueDetails,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/packing-execution",
    component: PackingExecution,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/packing-execution/:id",
    component: PackingExecutionDetails,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/barcodes-labels",
    component: PackingBarcodesLabels,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/quality-check",
    component: PackingQualityCheck,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/finished-goods",
    component: PackingFinishedGoods,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/repacking",
    component: PackingRepacking,
    requiresAuth: true,
  },
  {
    path: "/packing-erp/reports",
    component: PackingReports,
    requiresAuth: true,
  },
  // Shopkeeper ERP
  {
    path: "/shopkeeper",
    component: ShopkeeperERP,
    requiresAuth: true,
  },
  // Dashboard
  {
    path: "/",
    component: Dashboard,
    requiresAuth: true,
  },
  {
    path: "/change-password",
    component: ChangePassword,
    requiresAuth: true,
  },



  // Notifications
  {
    path: "/notifications",
    component: Notifications,
    requiresAuth: true,
  },
  // Orders
  {
    path: "/home-delivery-orders",
    component: HomeDeliveryOrders,
    requiresAuth: true,
  },
  {
    path: "/home-delivery-orders/view/:id",
    component: ViewHomeDeliveryOrder,
    requiresAuth: true,
  },
  {
    path: "/self-pickup-orders",
    component: SelfPickupOrders,
    requiresAuth: true,
  },
  {
    path: "/self-pickup-orders/view/:id",
    component: ViewSelfPickupOrder,
    requiresAuth: true,
  },
  // Categories
  {
    path: "/categories/manage",
    component: ManageCategories,
    requiresAuth: true,
  },
  {
    path: "/categories/create",
    component: AddCategory,
    requiresAuth: true,
  },
  {
    path: "/categories/:id/edit",
    component: AddCategory,
    requiresAuth: true,
  },
  {
    path: "/categories/order",
    component: OrderCategories,
    requiresAuth: true,
  },
  {
    path: "/categories/sub-categories",
    component: ManageSubCategories,
    requiresAuth: true,
  },
  {
    path: "/categories/sub-categories/create",
    component: AddSubCategory,
    requiresAuth: true,
  },
  {
    path: "/categories/sub-categories/:id/edit",
    component: AddSubCategory,
    requiresAuth: true,
  },
  {
    path: "/categories/view/:id",
    component: ViewCategory,
    requiresAuth: true,
  },
  {
    path: "/categories/sub-categories/view/:id",
    component: ViewSubCategory,
    requiresAuth: true,
  },
  // Products
  {
    path: "/products/manage",
    component: ManageProducts,
    requiresAuth: true,
  },
  {
    path: "/inventory/online",
    component: OnlineStockManagement,
    requiresAuth: true,
  },
  {
    path: "/inventory/pos",
    component: PosStockManagement,
    requiresAuth: true,
  },
  {
    path: "/inventory/vehicle",
    component: VehicleStockManagement,
    requiresAuth: true,
  },
  {
    path: "/inventory/vehicles",
    component: VehicleStockManagement,
    requiresAuth: true,
  },
  {
    path: "/products/bundles",
    component: BundleDeals,
    requiresAuth: true,
  },
  {
    path: "/products/barcode-mapping",
    component: BarcodeMappingScreen,
    requiresAuth: true,
  },
  {
    path: "/marketing/promos",
    component: HomepagePromos,
    requiresAuth: true,
  },
  {
    path: "/products/create",
    component: AddProduct,
    requiresAuth: true,
  },
  {
    path: "/products/:id/edit",
    component: AddProduct,
    requiresAuth: true,
  },
  {
    path: "/products/approve",
    component: ApproveRequests,
    requiresAuth: true,
  },
  {
    path: "/products/units",
    component: ManageUnits,
    requiresAuth: true,
  },
  {
    path: "/products/units/create",
    component: AddUnit,
    requiresAuth: true,
  },
  {
    path: "/products/units/:id/edit",
    component: AddUnit,
    requiresAuth: true,
  },
  {
    path: "/products/ratings",
    component: ProductRatings,
    requiresAuth: true,
  },
  {
    path: "/products/media",
    component: Media,
    requiresAuth: true,
  },
  {
    path: "/products/bulk-upload",
    component: BulkUpload,
    requiresAuth: true,
  },
  {
    path: "/products/bulk-update",
    component: BulkUpdate,
    requiresAuth: true,
  },
  {
    path: "/products/zip-import",
    component: ZipImport,
    requiresAuth: true,
  },
  {
    path: "/products/taxes",
    component: ManageTaxes,
    requiresAuth: true,
  },
  {
    path: "/products/taxes/create",
    component: AddTax,
    requiresAuth: true,
  },
  {
    path: "/products/taxes/:id/edit",
    component: AddTax,
    requiresAuth: true,
  },
  {
    path: "/products/brands",
    component: ManageBrands,
    requiresAuth: true,
  },
  {
    path: "/products/brands/create",
    component: AddBrand,
    requiresAuth: true,
  },
  {
    path: "/products/brands/:id/edit",
    component: AddBrand,
    requiresAuth: true,
  },
  {
    path: "/products/order",
    component: ProductsOrder,
    requiresAuth: true,
  },
  {
    path: "/products/manage/view/:productId/variant/:variantId",
    component: ViewVariant,
    requiresAuth: true,
  },
  {
    path: "/products/manage/view/:id",
    component: ViewProduct,
    requiresAuth: true,
  },
  {
    path: "/products/approve/view/:id",
    component: ViewApproveRequest,
    requiresAuth: true,
  },
  {
    path: "/products/ratings/view/:id",
    component: ViewProductRating,
    requiresAuth: true,
  },
  {
    path: "/products/media/view/:id",
    component: ViewMedia,
    requiresAuth: true,
  },
  {
    path: "/products/brands/view/:id",
    component: ViewBrand,
    requiresAuth: true,
  },
  {
    path: "/products/taxes/view/:id",
    component: ViewTax,
    requiresAuth: true,
  },
  {
    path: "/products/units/view/:id",
    component: ViewUnit,
    requiresAuth: true,
  },
  // My Category Management
  {
    path: "/my-categories",
    component: MyCategories,
    requiresAuth: true,
  },
  {
    path: "/my-categories/requests",
    component: RequestCategory,
    requiresAuth: true,
  },
  {
    path: "/my-sub-categories",
    component: MySubCategories,
    requiresAuth: true,
  },
  {
    path: "/my-sub-categories/requests",
    component: RequestSubCategory,
    requiresAuth: true,
  },
  // Stock
  {
    path: "/stock-management",
    component: StockManagement,
    requiresAuth: true,
  },
  {
    path: "/procurement",
    component: AdminProcurement,
    requiresAuth: true,
  },
  // Sellers
  {
    path: "/vendors/manage",
    component: ManageSellers,
    requiresAuth: true,
  },
  {
    path: "/vendors/requests",
    component: SellerRequests,
    requiresAuth: true,
  },
  {
    path: "/vendors/create",
    component: AddSeller,
    requiresAuth: true,
  },

  {
    path: "/vendors/:id/edit",
    component: AddSeller,
    requiresAuth: true,
  },
  {
    path: "/vendors/wallet-transactions",
    component: SellerWalletTransactions,
    requiresAuth: true,
  },
  {
    path: "/vendors/wallet-transactions/create",
    component: AddWalletTransaction,
    requiresAuth: true,
  },
  {
    path: "/vendors/wallet-transactions/edit/:id",
    component: EditWalletTransaction,
    requiresAuth: true,
  },
  {
    path: "/vendors/wallet-transactions/view/:id",
    component: ViewWalletTransaction,
    requiresAuth: true,
  },
  {
    path: "/vendors/policies",
    component: SellerPolicies,
    requiresAuth: true,
  },
  {
    path: "/vendors/view/:id",
    component: ViewSeller,
    requiresAuth: true,
  },
  // Home Sliders
  {
    path: "/home-sliders/manage",
    component: ManageHomeSliders,
    requiresAuth: true,
  },
  {
    path: "/home-sliders/create",
    component: AddHomeSlider,
    requiresAuth: true,
  },
  {
    path: "/home-sliders/edit/:id",
    component: AddHomeSlider,
    requiresAuth: true,
  },
  {
    path: "/home-sliders/view/:id",
    component: ViewHomeSlider,
    requiresAuth: true,
  },
  // Offer Images
  {
    path: "/offer-images/manage",
    component: ManageOfferImages,
    requiresAuth: true,
  },
  {
    path: "/offer-images/create",
    component: AddOfferImage,
    requiresAuth: true,
  },
  {
    path: "/offer-images/edit/:id",
    component: AddOfferImage,
    requiresAuth: true,
  },
  {
    path: "/offer-images/view/:id",
    component: ViewOfferImage,
    requiresAuth: true,
  },
  {
    path: "/offer-images/popup",
    component: ManagePopupOffer,
    requiresAuth: true,
  },
  // Promo Codes
  {
    path: "/promo-codes/manage",
    component: ManagePromoCodes,
    requiresAuth: true,
  },
  {
    path: "/promo-codes/create",
    component: AddPromoCode,
    requiresAuth: true,
  },
  {
    path: "/promo-codes/edit/:id",
    component: AddPromoCode,
    requiresAuth: true,
  },
  {
    path: "/promo-codes/view/:id",
    component: ViewPromoCode,
    requiresAuth: true,
  },
  // Banners
  {
    path: "/banners",
    component: ManageBanners,
    requiresAuth: true,
  },
  {
    path: "/banners/create",
    component: AddBanner,
    requiresAuth: true,
  },
  {
    path: "/banners/edit/:id",
    component: AddBanner,
    requiresAuth: true,
  },
  // Return Requests
  {
    path: "/return-requests",
    component: ManageReturnRequests,
    requiresAuth: true,
  },
  {
    path: "/return-requests/edit/:id",
    component: EditReturnRequest,
    requiresAuth: true,
  },
  {
    path: "/return-requests/view/:id",
    component: ViewReturnRequest,
    requiresAuth: true,
  },
  // Refunds
  {
    path: "/refunds",
    component: ManageRefunds,
    requiresAuth: true,
  },
  // Featured Sections
  {
    path: "/featured-sections",
    component: ManageFeaturedSections,
    requiresAuth: true,
  },
  {
    path: "/featured-sections/create",
    component: AddFeaturedSection,
    requiresAuth: true,
  },
  {
    path: "/featured-sections/edit/:id",
    component: AddFeaturedSection,
    requiresAuth: true,
  },
  {
    path: "/featured-sections/view/:id",
    component: ViewFeaturedSection,
    requiresAuth: true,
  },
  // Delivery Boys
  {
    path: "/delivery-boys/requests",
    component: DeliveryBoyRequests,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/create",
    component: DeliveryAgentOnboarding,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/manage",
    component: ManageDeliveryBoys,
    requiresAuth: true,
  },
  {
    path: "/delivery-agents/create",
    component: AddDeliveryAgent,
    requiresAuth: true,
  },
    {
  path: "/delivery-agents/view/:id",
  component: ViewDeliveryAgent,
  requiresAuth: true,
},
  {
    path: "/delivery-boys/edit/:id",
    component: DeliveryAgentOnboarding,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/fund-transfers",
    component: ManageFundTransfers,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/fund-transfers/add",
    component: AddFundTransfer,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/cash-collections",
    component: ManageCashCollections,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/cash-collections/add",
    component: AddCashCollection,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/policies",
    component: DeliveryBoyPolicies,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/policies/view/:type",
    component: ViewDeliveryBoyPolicy,
    requiresAuth: true,
  },
  {
    path: "/delivery-boys/view/:id",
    component: ViewDeliveryBoy,
    requiresAuth: true,
  },
  // Master Setup
  {
    path: "/master-setup/countries",
    component: ManageCountries,
    requiresAuth: true,
  },
  {
    path: "/master-setup/countries/create",
    component: AddCountry,
    requiresAuth: true,
  },
  {
    path: "/master-setup/countries/edit/:id",
    component: EditCountry,
    requiresAuth: true,
  },
  {
    path: "/master-setup/countries/view/:id",
    component: ViewCountry,
    requiresAuth: true,
  },
  {
    path: "/master-setup/states",
    component: ManageStates,
    requiresAuth: true,
  },
  {
    path: "/master-setup/states/create",
    component: AddState,
    requiresAuth: true,
  },
  {
    path: "/master-setup/states/edit/:id",
    component: EditState,
    requiresAuth: true,
  },
  {
    path: "/master-setup/states/view/:id",
    component: ViewState,
    requiresAuth: true,
  },
  {
    path: "/master-setup/districts",
    component: ManageDistricts,
    requiresAuth: true,
  },
  {
    path: "/master-setup/districts/create",
    component: AddDistrict,
    requiresAuth: true,
  },
  {
    path: "/master-setup/districts/edit/:id",
    component: EditDistrict,
    requiresAuth: true,
  },
  {
    path: "/master-setup/districts/view/:id",
    component: ViewDistrict,
    requiresAuth: true,
  },
  {
    path: "/master-setup/areas",
    component: ManageAreas,
    requiresAuth: true,
  },
  {
    path: "/master-setup/areas/create",
    component: AddArea,
    requiresAuth: true,
  },
  {
    path: "/master-setup/areas/edit/:id",
    component: EditArea,
    requiresAuth: true,
  },
  {
    path: "/master-setup/areas/view/:id",
    component: ViewArea,
    requiresAuth: true,
  },
  {
    path: "/master-setup/roles",
    component: ManageRoles,
    requiresAuth: true,
  },
  {
    path: "/master-setup/roles/create",
    component: AddRole,
    requiresAuth: true,
  },
  {
    path: "/master-setup/roles/:id/edit",
    component: AddRole,
    requiresAuth: true,
  },
  {
    path: "/master-setup/roles/view/:id",
    component: ViewRole,
    requiresAuth: true,
  },
  {
    path: "/master-setup/settings",
    component: Settings,
    requiresAuth: true,
  },
  {
    path: "/master-setup/attributes",
    component: Attributes,
    requiresAuth: true,
  },
  {
    path: "/master-setup/attributes/view/:id",
    component: ViewAttribute,
    requiresAuth: true,
  },
  {
    path: "/master-setup/attributes/create",
    component: AddAttribute,
    requiresAuth: true,
  },
  {
    path: "/master-setup/attributes/edit/:id",
    component: EditAttribute,
    requiresAuth: true,
  },
  {
    path: "/master-setup/contact-us",
    component: ContactUs,
    requiresAuth: true,
  },
  {
    path: "/master-setup/about-us",
    component: AboutUs,
    requiresAuth: true,
  },
  {
    path: "/master-setup/terms-conditions",
    component: TermsAndConditions,
    requiresAuth: true,
  },
  {
    path: "/master-setup/privacy-policy",
    component: PrivacyPolicy,
    requiresAuth: true,
  },
  // User Management
  {
    path: "/user-management/admins",
    component: ManageAdmins,
    requiresAuth: true,
  },
  {
    path: "/user-management/partners",
    component: ManagePartners,
    requiresAuth: true,
  },
  {
    path: "/user-management/admins/view/:id",
    component: ViewAdmin,
    requiresAuth: true,
  },
  {
    path: "/user-management/admins/create",
    component: AddEditAdmin,
    requiresAuth: true,
  },
  {
    path: "/user-management/admins/edit/:id",
    component: AddEditAdmin,
    requiresAuth: true,
  },
  {
    path: "/user-management/partners/view/:id",
    component: ViewPartner,
    requiresAuth: true,
  },
  {
    path: "/user-management/partners/create",
    component: AddEditPartner,
    requiresAuth: true,
  },
  {
    path: "/user-management/partners/edit/:id",
    component: AddEditPartner,
    requiresAuth: true,
  },
  // Inventory
  {
    path: "/inventory/ready/reserve",
    component: ReserveStock,
    requiresAuth: true,
  },
  {
    path: "/inventory/ready",
    component: ReadyInventory,
    requiresAuth: true,
  },
  {
    path: "/inventory/raw/configure",
    component: ConfigureStock,
    requiresAuth: true,
  },
  {
    path: "/inventory/raw",
    component: RawInventory,
    requiresAuth: true,
  },
  {
    path: "/inventory/dashboard",
    component: InventoryDashboard,
    requiresAuth: true,
  },
  {
    path: "/inventory/overview",
    component: InventoryOverview,
    requiresAuth: true,
  },
  {
    path: "/inventory/sku/:variantId",
    component: SkuDetail,
    requiresAuth: true,
  },
  {
    path: "/inventory/adjust/:variantId/:locationCode",
    component: AdjustStock,
    requiresAuth: true,
  },
  {
    path: "/inventory/operations/transfers/create",
    component: CreateTransfer,
    requiresAuth: true,
  },
  {
    path: "/inventory/operations/transfers",
    component: Operations,
    requiresAuth: true,
  },
  {
    path: "/inventory/operations/grn",
    component: Operations,
    requiresAuth: true,
  },
  {
    path: "/inventory/operations/cycle-counts",
    component: Operations,
    requiresAuth: true,
  },
  {
    path: "/inventory/operations",
    component: Operations,
    requiresAuth: true,
  },
  {
    path: "/inventory/monitoring",
    component: Monitoring,
    requiresAuth: true,
  },
  {
    path: "/inventory/monitoring/reservations",
    component: Monitoring,
    requiresAuth: true,
  },
  {
    path: "/inventory/monitoring/alerts",
    component: Monitoring,
    requiresAuth: true,
  },
  {
    path: "/inventory/settings",
    component: InventorySettings,
    requiresAuth: true,
  },
  // System
  {
    path: "/system/store-settings",
    component: StoreSettings,
    requiresAuth: true,
  },
  {
    path: "/system/business-settings",
    component: BusinessSettings,
    requiresAuth: true,
  },
  {
    path: "/system/delivery-settings",
    component: DeliverySettings,
    requiresAuth: true,
  },
  {
    path: "/system/delivery-settings/view/:id",
    component: ViewTimeSlot,
    requiresAuth: true,
  },
  {
    path: "/system/payment-methods",
    component: PaymentMethods,
    requiresAuth: true,
  },
  {
    path: "/system/seo-settings",
    component: SEOSettings,
    requiresAuth: true,
  },
  {
    path: "/system/seo-settings/add",
    component: AddSEOSetting,
    requiresAuth: true,
  },
  {
    path: "/system/seo-settings/edit/:id",
    component: AddSEOSetting,
    requiresAuth: true,
  },
  {
    path: "/system/contact-us",
    component: ContactUs,
    requiresAuth: true,
  },
  {
    path: "/system/about-us",
    component: AboutUs,
    requiresAuth: true,
  },
  // Web Settings
  {
    path: "/web-settings/general",
    component: GeneralWebSettings,
    requiresAuth: true,
  },
  {
    path: "/web-settings/social-media",
    component: SocialMedia,
    requiresAuth: true,
  },
  {
    path: "/web-settings/social-media/add",
    component: AddSocialMedia,
    requiresAuth: true,
  },
  {
    path: "/web-settings/social-media/edit/:id",
    component: AddSocialMedia,
    requiresAuth: true,
  },

  // Languages
  {
    path: "/languages",
    component: ManageLanguages,
    requiresAuth: true,
  },
  // Reports
  {
    path: "/reports/product-sales-reports",
    component: ProductSalesReports,
    requiresAuth: true,
  },
  {
    path: "/reports/sales-reports",
    component: SalesReports,
    requiresAuth: true,
  },
  {
    path: "/reports/pos-reports",
    component: PosReports,
    requiresAuth: true,
  },
  // Under Development Routes - Pages not yet implemented
  {
    path: "/stock",
    component: StockManagement,
    requiresAuth: true,
  },
  {
    path: "/purchase-management",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/products/import",
    component: ImportProducts,
    requiresAuth: true,
  },
  {
    path: "/products/import/view/:id",
    component: ViewImportProduct,
    requiresAuth: true,
  },
  {
    path: "/products/export",
    component: ExportProducts,
    requiresAuth: true,
  },
  {
    path: "/user-management/customers",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/user-management/customer-categories",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/banners",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/campaigns",
    component: ManageCampaigns,
    requiresAuth: true,
  },
  {
    path: "/shopkeeper-erp",
    component: ShopkeeperAdminERP,
    requiresAuth: true,
  },
  {
    path: "/campaigns/create",
    component: AddCampaign,
    requiresAuth: true,
  },
  {
    path: "/campaigns/edit/:id",
    component: AddCampaign,
    requiresAuth: true,
  },
  {
    path: "/notifications/customer",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/notifications/warehouse",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/notifications/vendor",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/notifications/staff",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/notifications/delivery-agent",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/delivery-types",
    component: DeliveryTypes,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/scheduled-delivery",
    component: ScheduledDelivery,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/scheduled-delivery/create-route-map",
    component: CreateRouteMap,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/scheduled-delivery/edit/:id",
    component: CreateRouteMap,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/scheduled-delivery/create-slot",
    component: CreateSlot,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/scheduled-delivery/edit-slot/:id",
    component: CreateSlot,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/store-pickup/create-slot",
    component: CreateStorePickupSlot,
    requiresAuth: true,
  },
  { 
    path: "/delivery-settings/store-pickup/edit-slot/:id",
    component: CreateStorePickupSlot,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/store-pickup",
    component: StorePickup,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/pick-at-vehicle/create-slot",
    component: CreatePickupAtVehicleSlot,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/pick-at-vehicle/edit-slot/:id",
    component: CreatePickupAtVehicleSlot,
    requiresAuth: true,
  },
  {
    path: "/delivery-settings/pick-at-vehicle",
    component: PickAtVehicle,
    requiresAuth: true,
  },
  // {
  //   path: "/delivery-settings/store-pickup/create-slot",
  //   component: StorePickupCreateSlot,
  //   requiresAuth: true,
  // },
  // {
  //   path: "/delivery-settings/store-pickup/edit-slot/:id",
  //   component: StorePickupCreateSlot,
  //   requiresAuth: true,
  // },
  {
    path: "/point-of-sales",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/withdrawal-request",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/wallet-transactions",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/root-map-creation",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/slot-management",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/delivery-zone-management",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/referral-notification",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/ratings",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/reviews",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/contact-us",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/product",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/service",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/access-management",
    component: AccessManagement,
    requiresAuth: true,
  },
  {
    path: "/resource-management",
    component: ResourceManagement,
    requiresAuth: true,
  },
  {
    path: "/resource-management/resources/create",
    component: AddResource,
    requiresAuth: true,
  },
  {
    path: "/resource-management/resources/:id/edit",
    component: AddResource,
    requiresAuth: true,
  },
  {
    path: "/resource-management/resources/:id/view",
    component: ViewResource,
    requiresAuth: true,
  },
  {
    path: "/locations/states",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/locations/cities",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/locations/zip-codes",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/locations/areas",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  {
    path: "/vehicles",
    component: UnderDevelopment,
    requiresAuth: true,
  },
  // VSMS Routes
  {
    path: "/vsms/vehicles",
    component: AdminVehicles,
    requiresAuth: true,
  },
  {
    path: "/vsms/assets",
    component: AdminAssets,
    requiresAuth: true,
  },
  {
    path: "/vsms/fuel-maintenance",
    component: AdminExpenses,
    requiresAuth: true,
  },
  {
    path: "/vsms/damages",
    component: AdminDamage,
    requiresAuth: true,
  },
  {
    path: "/vsms/live-tracking",
    component: AdminRoutes,
    requiresAuth: true,
  },
  {
    path: "/vsms/routes-coverage",
    component: AdminRoutes,
    requiresAuth: true,
  },
  {
    path: "/vsms/stock-history",
    component: AdminInventory,
    requiresAuth: true,
  },
  {
    path: "/vsms/cash-management",
    component: AdminCashManagement,
    requiresAuth: true,
  },
  {
    path: "/vsms/pos",
    component: AdminPOS,
    requiresAuth: true,
  },
  {
    path: "/vsms/barcodes",
    component: BarcodeManagement,
    requiresAuth: true,
  },
  {
    path: "/vsms/sales",
    component: AdminSalesPage,
    requiresAuth: true,
  },
  {
    path: "/vsms/reports",
    component: AdminReports,
    requiresAuth: true,
  },

  {
    path: "/vsms/scheduled-deliveries",
    component: PartnerScheduledOrders,
    requiresAuth: true,
  },
  {
    path: "/vsms/pre-orders",
    component: PreOrdersManagement,
    requiresAuth: true,
  },
  // VSMS Agent Portal Routes
  {
    path: "/vsms/agent-portal",
    component: () => <AgentPortalLayout><AgentHome /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/home",
    component: () => <AgentPortalLayout><AgentHome /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/pre-orders",
    component: () => <AgentPortalLayout><AgentPreOrders /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/today-plan",
    component: () => <AgentPortalLayout><TodayPlan /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/scheduled-deliveries",
    component: () => <AgentPortalLayout><ScheduledDeliveries /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/sales",
    component: () => <AgentPortalLayout><SalesEntry /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/wallet",
    component: () => <AgentPortalLayout><CashWallet /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/attendance",
    component: () => <AgentPortalLayout><AgentAttendance /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/reports",
    component: () => <AgentPortalLayout><Reports /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/sales-history",
    component: () => <AgentPortalLayout><SalesHistory /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/targets",
    component: () => <AgentPortalLayout><VgeTargets /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/assets",
    component: () => <AgentPortalLayout><AgentAssets /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/activity-logs",
    component: () => <AgentPortalLayout><AgentActivityLogs /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/report-damage",
    component: () => <AgentPortalLayout><ReportDamage /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/create-expense",
    component: () => <AgentPortalLayout><CreateExpense /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/profile",
    component: () => <AgentPortalLayout><Profile /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/order/:id",
    component: () => <AgentPortalLayout><OrderDetail /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/inventory",
    component: () => <AgentPortalLayout><AgentInventoryPage /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/payment",
    component: PaymentScreen,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/success/:id",
    component: SuccessScreen,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/opening-cash",
    component: () => <AgentPortalLayout><OpeningCashEntry /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/closing-cash",
    component: () => <AgentPortalLayout><ClosingCashEntry /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/vsms/agent-portal/stock-transfer",
    component: () => <AgentPortalLayout><AgentStockTransfer /></AgentPortalLayout>,
    requiresAuth: true,
  },
  {
    path: "/pricing/price-books",
    component: PriceBooks,
    requiresAuth: true,
  },
  {
    path: "/pricing/product-pricing",
    component: ProductPricing,
    requiresAuth: true,
  },
  {
    path: "/pricing/price-comparison",
    component: PriceComparison,
    requiresAuth: true,
  },
];
