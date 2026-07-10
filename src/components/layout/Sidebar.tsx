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
  const [isVsmsOpen, setIsVsmsOpen] = useState(
    initialStateCheckers.isVsmsOpen(location.pathname)
  );
  const [isAssetsOpen, setIsAssetsOpen] = useState(
    initialStateCheckers.isAssetsOpen(location.pathname)
  );
  const [isProcurementOpen, setIsProcurementOpen] = useState(
    initialStateCheckers.isProcurementOpen(location.pathname)
  );
  const [isPricingOpen, setIsPricingOpen] = useState(
    initialStateCheckers.isPricingOpen(location.pathname)
  );
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(
    initialStateCheckers.isBarcodeOpen(location.pathname)
  );
  const [isShopkeeperOpen, setIsShopkeeperOpen] = useState(
    location.pathname.startsWith("/shopkeeper")
  );
  const [isShopkeeperErpAdminOpen, setIsShopkeeperErpAdminOpen] = useState(
    location.pathname.startsWith("/shopkeeper-erp")
  );

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
      isVsmsOpen: setIsVsmsOpen,
      isAssetsOpen: setIsAssetsOpen,
      isProcurementOpen: setIsProcurementOpen,
      isPricingOpen: setIsPricingOpen,
      isBarcodeOpen: setIsBarcodeOpen,
      isShopkeeperOpen: setIsShopkeeperOpen,
      isShopkeeperErpAdminOpen: setIsShopkeeperErpAdminOpen,
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
      isVsmsOpen,
      isAssetsOpen,
      isProcurementOpen,
      isPricingOpen,
      isBarcodeOpen,
      isShopkeeperOpen,
      isShopkeeperErpAdminOpen,
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
      isVsmsOpen,
      isAssetsOpen,
      isProcurementOpen,
      isPricingOpen,
      isBarcodeOpen,
      isShopkeeperOpen,
      isShopkeeperErpAdminOpen,
    ]
  );

  // ============================================
  // useEffect - Updates menu states when location changes
  // ============================================

  /**
   * useEffect Hook
   * Whenever user navigates to different page, this automatically
   * opens/closes menu items based on current page
   */
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
    setIsVsmsOpen(initialStateCheckers.isVsmsOpen(location.pathname));
    setIsAssetsOpen(initialStateCheckers.isAssetsOpen(location.pathname));
    setIsProcurementOpen(initialStateCheckers.isProcurementOpen(location.pathname));
    setIsPricingOpen(initialStateCheckers.isPricingOpen(location.pathname));
    setIsBarcodeOpen(initialStateCheckers.isBarcodeOpen(location.pathname));
    setIsShopkeeperErpAdminOpen(location.pathname.startsWith("/shopkeeper-erp"));
  }, [location.pathname]);

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

  return (
    <aside
      className={`w-72 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 h-screen flex flex-col fixed left-0 top-0 z-50 overflow-hidden transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 ${isOpen ? "translate-x-0" : "-translate-x-full"
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
