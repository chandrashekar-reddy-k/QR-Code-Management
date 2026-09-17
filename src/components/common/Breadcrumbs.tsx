import { useLocation, Link } from "react-router-dom";

// Map path segments to readable labels
const pathLabelMap: Record<string, string> = {
  "user-management": "User Management",
  "delivery-boys": "Delivery Agents",
  requests: "Delivery Agents",
  create: "Create",
  edit: "Edit",
  view: "View",
  vendors: "Vendors",
  admins: "Admins",
  partners: "Partners",
  products: "Products",
  inventory: "Inventory Management",
  operations: "Operations",
  monitoring: "Monitoring",
  orders: "Orders",
  "home-delivery-orders": "Home Delivery Orders",
  "self-pickup-orders": "Self Pickup Orders",
  categories: "Categories",
  dashboard: "Dashboard",
  settings: "Settings",
  system: "System",
  "master-setup": "Master Setup",
  "home-sliders": "Home Sliders",
  "offer-images": "Offer Images",
  "promotions-and-offers": "Promotions and Offers",
  "promo-codes": "Promo Codes",
  banners: "Banners",
  campaigns: "Campaigns",
  attributes: "Attributes",
  countries: "Countries",
  states: "States",
  districts: "Districts",
  areas: "Areas/Cities",
  "about-us": "About Us",
  "terms-conditions": "Terms and Conditions",
  "privacy-policy": "Privacy Policy",
  "delivery-settings": "Delivery Settings",
  "delivery-types": "Delivery Types",
  "scheduled-delivery": "Scheduled Delivery",
  "resource-management": "Resource Management",
  "administration-report": "Resource Management",
  vsms: "Order Management",
  sales: "Sales History",
};

// Format a path segment to a readable label
const formatLabel = (segment: string): string => {
  // Check if we have a direct mapping
  if (pathLabelMap[segment]) {
    return pathLabelMap[segment];
  }

  // Handle dynamic IDs (numbers or UUIDs)
  if (
    /^\d+$/.test(segment) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment
    )
  ) {
    return segment;
  }

  // Convert kebab-case to Title Case
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Map of parent routes for navigation
const parentRouteMap: Record<string, string> = {
  "user-management": "/user-management/admins",
  "delivery-boys": "/delivery-boys/manage",
  vendors: "/vendors/manage",
  products: "/products/manage",
  categories: "/categories/manage",
  orders: "/orders",
  "home-delivery-orders": "/home-delivery-orders",
  "self-pickup-orders": "/self-pickup-orders",
  inventory: "/inventory/overview",
  "home-sliders": "/home-sliders/manage",
  "offer-images": "/offer-images/manage",
  "promotions-and-offers": "/promo-codes/manage",
  "promo-codes": "/promo-codes/manage",
  banners: "/banners",
  campaigns: "/campaigns",
  "featured-sections": "/featured-sections",
  attributes: "/attributes",
  countries: "/master-setup/countries",
  states: "/master-setup/states",
  districts: "/master-setup/districts",
  areas: "/master-setup/areas",
  system: "/system/store-settings",
  "delivery-settings": "/delivery-settings/delivery-types",
  "delivery-types": "/delivery-settings/delivery-types",
  "scheduled-delivery": "/delivery-settings/scheduled-delivery",
};

const getBreadcrumbs = (
  pathname: string
): Array<{ label: string; path?: string }> => {
  const breadcrumbs: Array<{ label: string; path?: string }> = [];

  // Always start with Home
  breadcrumbs.push({ label: "Home", path: "/" });

  // Split pathname into segments
  const segments = pathname.split("/").filter(Boolean);

  // Custom handling for Resource Management routes
  if (pathname.startsWith("/resource-management")) {
    breadcrumbs.push({
      label: "Resource Management",
      path: "/resource-management",
    });

    const idIndex = segments.findIndex(
      (segment, index) => segment && segments[index - 1] === "resources"
    );

    if (idIndex !== -1) {
      const idSegment = segments[idIndex];
      breadcrumbs.push({
        label: `ID #${idSegment}`,
      });
    }

    return breadcrumbs;
  }

  // Routes that belong to User Management (delivery-boys is under Staff Management, not User Management)
  const userManagementRoutes = ["user-management"];
  const isUserManagementRoute = userManagementRoutes.some((route) =>
    pathname.startsWith(`/${route}`)
  );

  // Add User Management if route belongs to it (but not for vendors or delivery-boys)
  if (isUserManagementRoute) {
    breadcrumbs.push({
      label: "User Management",
      path: "/user-management/admins",
    });
  }

  // Delivery-boys (Delivery Agents) is under Staff Management in sidebar - add Staff Management as parent
  if (pathname.startsWith("/delivery-boys")) {
    breadcrumbs.push({
      label: "Staff Management",
      path: "/delivery-boys/manage",
    });
  }

  // Check if this is a vendor route
  const isVendorRoute = pathname.startsWith("/vendors");

  // Add Vendor Management as parent for all vendor routes
  if (isVendorRoute) {
    breadcrumbs.push({ label: "Vendor Management", path: "/vendors/manage" });
  }

  // Check if this is an order management route (home-delivery-orders or self-pickup-orders)
  const isOrderManagementRoute =
    pathname.startsWith("/home-delivery-orders") ||
    pathname.startsWith("/self-pickup-orders");

  // Add Order Management as parent for all order routes
  if (isOrderManagementRoute) {
    breadcrumbs.push({
      label: "Order Management",
      path: "/home-delivery-orders",
    });
  }

  const promotionsAndOffersRoutes = ["promo-codes", "banners", "campaigns"];
  const isPromotionsAndOffersRoute = segments.some((segment) =>
    promotionsAndOffersRoutes.includes(segment),
  );

  if (isPromotionsAndOffersRoute) {
    breadcrumbs.push({
      label: "Promotions and Offers",
      path: "/promo-codes/manage",
    });
  }

  // Build breadcrumb path incrementally
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Special handling for delivery-boys routes
    if (segment === "delivery-boys") {
      // Skip the segment itself, we'll handle it in the next segment
      return;
    }

    if (segment === "requests" && segments[index - 1] === "delivery-boys") {
      // For delivery-boys/requests, show as "Delivery Agents"
      breadcrumbs.push({
        label: "Delivery Agents",
        path: "/delivery-boys/requests",
      });
      return;
    }

    // Handle delivery-boys/manage and other delivery-boys routes
    if (
      segments[index - 1] === "delivery-boys" &&
      segment !== "delivery-boys"
    ) {
      // Add "Delivery Agents" as parent before the current segment
      if (segment === "manage") {
        breadcrumbs.push({
          label: "Delivery Agents",
          path: "/delivery-boys/manage",
        });
      } else if (segment !== "requests") {
        // For other delivery-boys routes (create, view, etc.), show Delivery Agents pointing to manage
        breadcrumbs.push({
          label: "Delivery Agents",
          path: "/delivery-boys/manage",
        });
      }
    }

    // Skip 'user-management' segment since we already added it
    if (segment === "user-management") {
      // Determine which sub-route to use
      if (segments[index + 1] === "admins") {
        breadcrumbs.push({
          label: "Admins",
          path: "/user-management/admins",
        });
        return;
      } else if (segments[index + 1] === "partners") {
        breadcrumbs.push({
          label: "Partners",
          path: "/user-management/partners",
        });
        return;
      }
      return;
    }

    // Skip 'vendors' segment since we already added "Vendor Management"
    if (segment === "vendors") {
      return;
    }

    // Special handling for home-delivery-orders and self-pickup-orders
    // Since we already added "Order Management" as parent, we just need to add the specific order type
    if (
      segment === "home-delivery-orders" ||
      segment === "self-pickup-orders"
    ) {
      breadcrumbs.push({
        label: formatLabel(segment),
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Special handling for vendors/manage - show as "Manage Vendors"
    if (segment === "manage" && segments[index - 1] === "vendors") {
      breadcrumbs.push({
        label: "Manage Vendors",
        path: "/vendors/manage",
      });
      return;
    }

    // Special handling for vendors/view - show ID #123 format
    if (
      segment === "view" &&
      segments[index - 1] === "vendors" &&
      segments[index + 1]
    ) {
      breadcrumbs.push({
        label: `ID #${segments[index + 1]}`,
        path: undefined,
      });
      return;
    }

    // Special handling for vendors/requests - show as "New Registered Vendors"
    if (segment === "requests" && segments[index - 1] === "vendors") {
      breadcrumbs.push({
        label: "New Registered Vendors",
        path: "/vendors/requests",
      });
      return;
    }

    // Special handling for vendors/wallet-transactions - show as "Wallet Transactions"
    if (
      segment === "wallet-transactions" &&
      segments[index - 1] === "vendors"
    ) {
      // If next segment is 'view' or 'edit' or 'create', don't add it here, let it be handled by the action handler
      if (
        segments[index + 1] &&
        ["view", "edit", "create"].includes(segments[index + 1])
      ) {
        breadcrumbs.push({
          label: "Wallet Transactions",
          path: "/vendors/wallet-transactions",
        });
        return;
      }
      breadcrumbs.push({
        label: "Wallet Transactions",
        path: "/vendors/wallet-transactions",
      });
      return;
    }

    // Special handling for vendors/policies - show as "Vendor Policies"
    if (segment === "policies" && segments[index - 1] === "vendors") {
      breadcrumbs.push({
        label: "Vendor Policies",
        path: "/vendors/policies",
      });
      return;
    }

    // delivery-boys/manage: show only "Delivery Agents" (Manage not needed in breadcrumb)
    if (segment === "manage" && segments[index - 1] === "delivery-boys") {
      return;
    }

    // Promotions and offers manage pages: hide trailing "manage"
    if (
      segment === "manage" &&
      ["promo-codes", "banners", "campaigns"].includes(segments[index - 1])
    ) {
      return;
    }

    // Special handling for user-management/admins - show as "Admins"
    if (segment === "admins" && segments[index - 1] === "user-management") {
      breadcrumbs.push({
        label: "Admins",
        path: "/user-management/admins",
      });
      return;
    }

    // Special handling for user-management/partners - show as "Partners"
    if (segment === "partners" && segments[index - 1] === "user-management") {
      breadcrumbs.push({
        label: "Partners",
        path: "/user-management/partners",
      });
      return;
    }

    // Special handling for attributes view - just show "View" without ID
    if (segment === "view" && segments[index - 1] === "attributes") {
      breadcrumbs.push({
        label: "View",
        path: isLast ? undefined : currentPath,
      });
      // Skip the next segment (ID) by returning here
      return;
    }

    // Special handling for countries view - show ID #123 format
    if (
      segment === "view" &&
      segments[index - 1] === "countries" &&
      segments[index + 1]
    ) {
      breadcrumbs.push({
        label: `ID #${segments[index + 1]}`,
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Special handling for states view - show ID #123 format
    if (
      segment === "view" &&
      segments[index - 1] === "states" &&
      segments[index + 1]
    ) {
      breadcrumbs.push({
        label: `ID #${segments[index + 1]}`,
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Special handling for districts view - show ID #123 format
    if (
      segment === "view" &&
      segments[index - 1] === "districts" &&
      segments[index + 1]
    ) {
      breadcrumbs.push({
        label: `ID #${segments[index + 1]}`,
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Special handling for areas view - show ID #123 format
    if (
      segment === "view" &&
      segments[index - 1] === "areas" &&
      segments[index + 1]
    ) {
      breadcrumbs.push({
        label: `ID #${segments[index + 1]}`,
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Special handling for home-delivery-orders view - show ID #123 format
    if (
      segment === "view" &&
      segments[index - 1] === "home-delivery-orders" &&
      segments[index + 1]
    ) {
      breadcrumbs.push({
        label: `ID #${segments[index + 1]}`,
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Special handling for self-pickup-orders view - show ID #123 format
    if (
      segment === "view" &&
      segments[index - 1] === "self-pickup-orders" &&
      segments[index + 1]
    ) {
      breadcrumbs.push({
        label: `ID #${segments[index + 1]}`,
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Special handling for "manage" segment - link to the manage page
    if (segment === "manage") {
      const parentSegment = segments[index - 1];
      const managePath = parentSegment
        ? `/${parentSegment}/manage`
        : currentPath;
      breadcrumbs.push({
        label: "Manage",
        path: isLast ? undefined : managePath,
      });
      return;
    }

    // For create/edit/view pages, show the action
    if (["create", "edit", "view"].includes(segment)) {
      breadcrumbs.push({
        label: formatLabel(segment),
        path: isLast ? undefined : currentPath,
      });
      return;
    }

    // Skip numeric IDs and UUIDs in breadcrumbs (they're not user-friendly)
    if (
      /^\d+$/.test(segment) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      )
    ) {
      return;
    }

    // Get parent route if available
    const parentRoute = parentRouteMap[segment];

    // Add the segment
    breadcrumbs.push({
      label: formatLabel(segment),
      path: isLast ? undefined : parentRoute || currentPath,
    });
  });

  return breadcrumbs;
};

const Breadcrumbs = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-1 mb-3">
      {breadcrumbs.map((crumb, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="mx-1">&gt;</span>}
          {crumb.path && index < breadcrumbs.length - 1 ? (
            <Link
              to={crumb.path}
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span
              className={
                index === breadcrumbs.length - 1
                  ? "font-medium text-orange-600 dark:text-orange-500"
                  : "font-medium text-gray-700 dark:text-gray-300"
              }
            >
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
