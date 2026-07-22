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

  // Additional config states
  const [isShopkeeperErpAdminOpen, setIsShopkeeperErpAdminOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);
  const [isVsmsOpen, setIsVsmsOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);

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
      isPricingOpen: setIsPricingOpen,
      isBarcodeOpen: setIsBarcodeOpen,
      isProcurementOpen: setIsProcurementOpen,
      isVsmsOpen: setIsVsmsOpen,
      isAssetsOpen: setIsAssetsOpen,
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
      return location.pathname.startsWith(path);
    },
    [location.pathname]
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
    [isItemActive]
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
          location.pathname.startsWith("/system"));

      const visibleSubItems = section.subItems.filter((item) => !item.hidden);

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
              className={`flex items-center gap-2 ${
                section.stateKey === "isProductsOpen" ? "min-w-0" : ""
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
            className={`overflow-hidden ${
              isOpen ? "dropdown-enter" : "dropdown-exit"
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
        } md:translate-x-0` }
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
          const key =
            section.sectionTitle ||
            section.path ||
            section.stateKey ||
            `sidebar-${index}`;
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
