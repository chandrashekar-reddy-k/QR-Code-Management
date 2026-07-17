import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  User,
  LogOut,
  Bell,
  Settings,
  Menu,
  Clock,
  Sun,
  Moon,
  Package,
  ShoppingCart,
  Users,
  X,
  Store,
  Truck,
  Tag,
  Folder,
  FolderTree,
  Award,
  Receipt,
  UserCog,
  Handshake,
  Hash,
  ChevronDown,
  Pencil ,
  Key,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";

interface HeaderProps {
  onMenuClick?: () => void;
}

interface SearchResult {
  id: number;
  type:
  | "order"
  | "product"
  | "customer"
  | "seller"
  | "deliveryBoy"
  | "category"
  | "subcategory"
  | "brand"
  | "promoCode"
  | "tax"
  | "unit"
  | "admin"
  | "partner";
  title: string;
  subtitle?: string;
  image?: string;
  route: string;
}

// Mock data for comprehensive search - In production, these would come from API calls
const mockOrders = [
  {
    id: 1,
    user: "Premium Coffee Beans",
    productName: "Premium Coffee Beans",
    mobile: "9876543210",
    status: "Delivered",
  },
  {
    id: 2,
    user: "Rajesh Kumar",
    productName: "Fresh Mangoes",
    mobile: "9876543211",
    status: "Processing",
  },
  {
    id: 3,
    user: "Priya Sharma",
    productName: "Amul Milk",
    mobile: "9876543212",
    status: "Shipped",
  },
];

const mockProducts = [
  {
    id: 1,
    productId: "PROD001",
    name: "Fresh Mangoes (1kg)",
    sellerName: "Fresh Grocery Store",
  },
  {
    id: 2,
    productId: "PROD002",
    name: "Fresh Tomatoes (500g)",
    sellerName: "Organic Farm",
  },
  {
    id: 3,
    productId: "PROD003",
    name: "Amul Full Cream Milk (1L)",
    sellerName: "Dairy Delight",
  },
  {
    id: 4,
    productId: "PROD004",
    name: "Basmati Rice (5kg)",
    sellerName: "Grain Mart",
  },
  {
    id: 5,
    productId: "PROD005",
    name: "Premium Coffee Beans",
    sellerName: "Coffee Store",
  },
];

const mockCustomers = [
  {
    id: 1,
    name: "Rajesh Kumar",
    mobile: "9876543210",
    email: "rajesh@example.com",
  },
  {
    id: 2,
    name: "Priya Sharma",
    mobile: "9876543211",
    email: "priya@example.com",
  },
  {
    id: 3,
    name: "Amit Patel",
    mobile: "9876543212",
    email: "amit@example.com",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    mobile: "9876543213",
    email: "sneha@example.com",
  },
];

const mockSellers = [
  {
    id: 1,
    name: "Fresh Grocery Store",
    email: "fresh@example.com",
    mobile: "9876500001",
    city: "Mumbai",
  },
  {
    id: 2,
    name: "Organic Farm",
    email: "organic@example.com",
    mobile: "9876500002",
    city: "Delhi",
  },
  {
    id: 3,
    name: "Dairy Delight",
    email: "dairy@example.com",
    mobile: "9876500003",
    city: "Bangalore",
  },
  {
    id: 4,
    name: "Grain Mart",
    email: "grain@example.com",
    mobile: "9876500004",
    city: "Hyderabad",
  },
];

const mockDeliveryBoys = [
  {
    id: 1,
    name: "Ramesh Kumar",
    mobile: "9876600001",
    email: "ramesh@example.com",
    city: "Mumbai",
  },
  {
    id: 2,
    name: "Suresh Patel",
    mobile: "9876600002",
    email: "suresh@example.com",
    city: "Delhi",
  },
  {
    id: 3,
    name: "Rajesh Singh",
    mobile: "9876600003",
    email: "rajesh@example.com",
    city: "Bangalore",
  },
];

const mockCategories = [
  {
    id: 1,
    name: "Fruits & Vegetables",
    description: "Fresh fruits and vegetables",
  },
  { id: 2, name: "Dairy Products", description: "Milk, cheese, butter" },
  { id: 3, name: "Grains & Pulses", description: "Rice, dal, wheat" },
  { id: 4, name: "Spices & Masala", description: "Spices and masala mixes" },
];

const mockSubCategories = [
  { id: 1, name: "Fresh Fruits", categoryName: "Fruits & Vegetables" },
  { id: 2, name: "Fresh Vegetables", categoryName: "Fruits & Vegetables" },
  { id: 3, name: "Milk Products", categoryName: "Dairy Products" },
  { id: 4, name: "Rice", categoryName: "Grains & Pulses" },
];

const mockBrands = [
  { id: 1, name: "Amul", description: "Dairy products brand" },
  { id: 2, name: "MDH", description: "Spices brand" },
  { id: 3, name: "Tata", description: "Tea and beverages" },
  { id: 4, name: "Britannia", description: "Biscuits and snacks" },
];

const mockPromoCodes = [
  {
    id: 1,
    code: "WELCOME10",
    discount: "10%",
    description: "Welcome discount",
  },
  { id: 2, code: "SAVE50", discount: "₹50", description: "Flat discount" },
  { id: 3, code: "FREESHIP", discount: "Free", description: "Free shipping" },
];

const mockTaxes = [
  { id: 1, name: "GST 5%", rate: 5, description: "GST tax rate" },
  { id: 2, name: "GST 12%", rate: 12, description: "GST tax rate" },
  { id: 3, name: "GST 18%", rate: 18, description: "GST tax rate" },
];

const mockUnits = [
  { id: 1, name: "Kilogram", shortCode: "kg", description: "Weight unit" },
  { id: 2, name: "Gram", shortCode: "g", description: "Weight unit" },
  { id: 3, name: "Liter", shortCode: "L", description: "Volume unit" },
];

const mockAdmins = [
  {
    id: 1,
    name: "Partner User",
    email: "partner@villagkart.com",
    role: "Super Admin",
  },
  { id: 2, name: "Manager", email: "manager@villagkart.com", role: "Manager" },
];

const mockPartners = [
  {
    id: 1,
    name: "Business Partner",
    email: "partner@example.com",
    company: "Partner Corp",
  },
];

interface User {
  id: string;
  phone: string;
  name: string;
  email: string;
  role: string;
  displayName: string;
  avatar: string | null;
  store: unknown | null;
  supplier: unknown | null;
}

let hrmsWindowRef: Window | null = null;

const Header = ({ onMenuClick }: HeaderProps) => {
  // Hook to close HRMS window if the partner portal tab is closed/unloaded
  useEffect(() => {
    const handleUnload = () => {
      if (hrmsWindowRef && !hrmsWindowRef.closed) {
        try {
          hrmsWindowRef.close();
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dummyImageError, setDummyImageError] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user data from localStorage
  const getUserData = (): User | null => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr) as User;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };

  const user = getUserData();

  // Dummy profile image fallback
  const dummyProfileImage = "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.name || "User") + "&background=10b981&color=fff&size=128&bold=true";

  // Determine which image to use
  // If user has avatar and no error yet, use it; otherwise use dummy
  const profileImageSrc = (user?.avatar && !imageError) ? user.avatar : dummyProfileImage;

  const notifications = [
    {
      id: 1,
      text: "Order Item #Dairy Milk Chocolate has been Cancelled",
      timeAgo: "a month ago",
    },
    {
      id: 2,
      text: "Order Item #5-star chocolate has been Cancelled",
      timeAgo: "2 months ago",
    },
    {
      id: 3,
      text: "Order Item #5-star chocolate has been Cancelled",
      timeAgo: "2 months ago",
    },
    {
      id: 4,
      text: "Order Item #5-star chocolate has been Cancelled",
      timeAgo: "2 months ago",
    },
  ];

  const handleLogout = () => {
    if (hrmsWindowRef && !hrmsWindowRef.closed) {
      try {
        hrmsWindowRef.close();
      } catch (err) {
        console.error('Failed to close HRMS window:', err);
      }
    }
    logout();
    navigate("/login");
  };

  // Comprehensive search functionality
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search orders
    mockOrders.forEach((order) => {
      if (
        order.id.toString().includes(query) ||
        order.user.toLowerCase().includes(query) ||
        order.productName.toLowerCase().includes(query) ||
        order.mobile.includes(query) ||
        order.status.toLowerCase().includes(query)
      ) {
        results.push({
          id: order.id,
          type: "order",
          title: `Order #${order.id}`,
          subtitle: `${order.productName} - ${order.user}`,
          route: `/orders/view/${order.id}`,
        });
      }
    });

    // Search products
    mockProducts.forEach((product) => {
      if (
        product.id.toString().includes(query) ||
        product.productId.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        product.sellerName.toLowerCase().includes(query)
      ) {
        results.push({
          id: product.id,
          type: "product",
          title: product.name,
          subtitle: `ID: ${product.productId} - ${product.sellerName}`,
          route: `/products/${product.id}/edit`,
        });
      }
    });

    // Search customers
    mockCustomers.forEach((customer) => {
      if (
        customer.id.toString().includes(query) ||
        customer.name.toLowerCase().includes(query) ||
        customer.mobile.includes(query) ||
        customer.email.toLowerCase().includes(query)
      ) {
        results.push({
          id: customer.id,
          type: "customer",
          title: customer.name,
          subtitle: `${customer.mobile} - ${customer.email}`,
          route: `/orders?search=${encodeURIComponent(customer.mobile)}`,
        });
      }
    });

    // Search sellers/vendors
    mockSellers.forEach((seller) => {
      if (
        seller.id.toString().includes(query) ||
        seller.name.toLowerCase().includes(query) ||
        seller.email.toLowerCase().includes(query) ||
        seller.mobile.includes(query) ||
        seller.city.toLowerCase().includes(query)
      ) {
        results.push({
          id: seller.id,
          type: "seller",
          title: seller.name,
          subtitle: `${seller.city} - ${seller.mobile}`,
          route: `/vendors/manage?search=${encodeURIComponent(seller.name)}`,
        });
      }
    });

    // Search delivery boys
    mockDeliveryBoys.forEach((deliveryBoy) => {
      if (
        deliveryBoy.id.toString().includes(query) ||
        deliveryBoy.name.toLowerCase().includes(query) ||
        deliveryBoy.mobile.includes(query) ||
        deliveryBoy.email.toLowerCase().includes(query) ||
        deliveryBoy.city.toLowerCase().includes(query)
      ) {
        results.push({
          id: deliveryBoy.id,
          type: "deliveryBoy",
          title: deliveryBoy.name,
          subtitle: `${deliveryBoy.city} - ${deliveryBoy.mobile}`,
          route: `/delivery-boys/manage?search=${encodeURIComponent(
            deliveryBoy.name
          )}`,
        });
      }
    });

    // Search categories
    mockCategories.forEach((category) => {
      if (
        category.id.toString().includes(query) ||
        category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query)
      ) {
        results.push({
          id: category.id,
          type: "category",
          title: category.name,
          subtitle: category.description,
          route: `/categories/manage?search=${encodeURIComponent(
            category.name
          )}`,
        });
      }
    });

    // Search subcategories
    mockSubCategories.forEach((subCategory) => {
      if (
        subCategory.id.toString().includes(query) ||
        subCategory.name.toLowerCase().includes(query) ||
        subCategory.categoryName.toLowerCase().includes(query)
      ) {
        results.push({
          id: subCategory.id,
          type: "subcategory",
          title: subCategory.name,
          subtitle: `Category: ${subCategory.categoryName}`,
          route: `/categories/sub-categories?search=${encodeURIComponent(
            subCategory.name
          )}`,
        });
      }
    });

    // Search brands
    mockBrands.forEach((brand) => {
      if (
        brand.id.toString().includes(query) ||
        brand.name.toLowerCase().includes(query) ||
        brand.description.toLowerCase().includes(query)
      ) {
        results.push({
          id: brand.id,
          type: "brand",
          title: brand.name,
          subtitle: brand.description,
          route: `/products/brands?search=${encodeURIComponent(brand.name)}`,
        });
      }
    });

    // Search promo codes
    mockPromoCodes.forEach((promoCode) => {
      if (
        promoCode.id.toString().includes(query) ||
        promoCode.code.toLowerCase().includes(query) ||
        promoCode.description.toLowerCase().includes(query) ||
        promoCode.discount.toLowerCase().includes(query)
      ) {
        results.push({
          id: promoCode.id,
          type: "promoCode",
          title: promoCode.code,
          subtitle: `Discount: ${promoCode.discount} - ${promoCode.description}`,
          route: `/promo-codes/manage?search=${encodeURIComponent(
            promoCode.code
          )}`,
        });
      }
    });

    // Search taxes
    mockTaxes.forEach((tax) => {
      if (
        tax.id.toString().includes(query) ||
        tax.name.toLowerCase().includes(query) ||
        tax.rate.toString().includes(query) ||
        tax.description.toLowerCase().includes(query)
      ) {
        results.push({
          id: tax.id,
          type: "tax",
          title: tax.name,
          subtitle: `Rate: ${tax.rate}% - ${tax.description}`,
          route: `/products/taxes?search=${encodeURIComponent(tax.name)}`,
        });
      }
    });

    // Search units
    mockUnits.forEach((unit) => {
      if (
        unit.id.toString().includes(query) ||
        unit.name.toLowerCase().includes(query) ||
        unit.shortCode.toLowerCase().includes(query) ||
        unit.description.toLowerCase().includes(query)
      ) {
        results.push({
          id: unit.id,
          type: "unit",
          title: unit.name,
          subtitle: `Code: ${unit.shortCode} - ${unit.description}`,
          route: `/products/units?search=${encodeURIComponent(unit.name)}`,
        });
      }
    });

    // Search admins
    mockAdmins.forEach((admin) => {
      if (
        admin.id.toString().includes(query) ||
        admin.name.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query) ||
        admin.role.toLowerCase().includes(query)
      ) {
        results.push({
          id: admin.id,
          type: "admin",
          title: admin.name,
          subtitle: `${admin.role} - ${admin.email}`,
          route: `/user-management/admins?search=${encodeURIComponent(
            admin.name
          )}`,
        });
      }
    });

    // Search partners
    mockPartners.forEach((partner) => {
      if (
        partner.id.toString().includes(query) ||
        partner.name.toLowerCase().includes(query) ||
        partner.email.toLowerCase().includes(query) ||
        partner.company.toLowerCase().includes(query)
      ) {
        results.push({
          id: partner.id,
          type: "partner",
          title: partner.name,
          subtitle: `${partner.company} - ${partner.email}`,
          route: `/user-management/partners?search=${encodeURIComponent(
            partner.name
          )}`,
        });
      }
    });

    return results.slice(0, 15); // Limit to 15 results for comprehensive search
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(e.target.value.trim().length > 0);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    navigate(result.route);
    setSearchQuery("");
    setShowSearchResults(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    setShowSearchResults(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingCart size={16} className="text-blue-500" />;
      case "product":
        return <Package size={16} className="text-green-500" />;
      case "customer":
        return <Users size={16} className="text-purple-500" />;
      case "seller":
        return <Store size={16} className="text-orange-500" />;
      case "deliveryBoy":
        return <Truck size={16} className="text-green-500" />;
      case "category":
        return <Folder size={16} className="text-indigo-500" />;
      case "subcategory":
        return <FolderTree size={16} className="text-indigo-400" />;
      case "brand":
        return <Award size={16} className="text-yellow-500" />;
      case "promoCode":
        return <Tag size={16} className="text-pink-500" />;
      case "tax":
        return <Receipt size={16} className="text-red-500" />;
      case "unit":
        return <Hash size={16} className="text-gray-500" />;
      case "admin":
        return <UserCog size={16} className="text-violet-500" />;
      case "partner":
        return <Handshake size={16} className="text-green-500" />;
    }
  };

  const getResultTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "order":
        return "Order";
      case "product":
        return "Product";
      case "customer":
        return "Customer";
      case "seller":
        return "Seller";
      case "deliveryBoy":
        return "Delivery Boy";
      case "category":
        return "Category";
      case "subcategory":
        return "Subcategory";
      case "brand":
        return "Brand";
      case "promoCode":
        return "Promo Code";
      case "tax":
        return "Tax";
      case "unit":
        return "Unit";
      case "admin":
        return "Admin";
      case "partner":
        return "Partner";
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 py-4 px-2 md:px-4 flex items-center justify-between sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 md:gap-3 flex-1">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={22} className="text-gray-600 dark:text-gray-300" />
        </button>
        {/* Search Bar */}
        <div ref={searchRef} className="relative max-w-sm flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10"
            size={18}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search orders, customers, products..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() =>
              searchQuery.trim().length > 0 && setShowSearchResults(true)
            }
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={16} />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
              <div className="p-2">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="mt-0.5">{getResultIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {getResultTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {showSearchResults &&
            searchQuery.trim().length > 0 &&
            searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No results found
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Try searching for orders, products, customers, sellers,
                    delivery boys, categories, brands, promo codes, taxes,
                    units, admins, or partners
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
          onClick={toggleTheme}
        >
          {theme === "light" ? (
            <Moon size={20} className="text-gray-600 dark:text-gray-300" />
          ) : (
            <Sun size={20} className="text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            onClick={() => setShowNotifications((prev) => !prev)}
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {showNotifications && (
            <>
              {/* Backdrop to close on outside click */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-3 w-[320px] sm:w-[380px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Notifications
                  </h3>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-snug">
                        {item.text}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <Clock
                          size={12}
                          className="text-gray-400 dark:text-gray-500"
                        />
                        <span>{item.timeAgo}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate("/notifications");
                  }}
                  className="w-full text-center text-xs sm:text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium py-2.5 border-t border-gray-100 dark:border-gray-700"
                >
                  See all notification
                </button>
              </div>
            </>
          )}
        </div>

        {/* HRMS SSO Link */}
        <button
          className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium text-xs transition-all border border-green-200 dark:border-green-800"
          title="Open HRMS Portal"
          onClick={() => {
            const token = localStorage.getItem('token');
            const hrmsUrl = import.meta.env.VITE_HRMS_URL || "http://localhost:8088";
            if (token) {
              hrmsWindowRef = window.open(`${hrmsUrl}/login?sso_token=${token}`, '_blank');
            } else {
              hrmsWindowRef = window.open(`${hrmsUrl}/login`, '_blank');
            }
          }}
        >
          <UserCog size={16} />
          <span>HRMS</span>
        </button>

        {/* Settings */}
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Settings"
          onClick={() => navigate("/system/business-settings")}
        >
          <Settings size={20} className="text-gray-600 dark:text-gray-300" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
          >
            {/* Avatar */}
            <div className="relative w-9 h-9">
              {!dummyImageError ? (
                <img
                  src={profileImageSrc}
                  alt={user?.name || "User"}
                  className="w-9 h-9 rounded-full object-cover"
                  onError={() => {
                    if (user?.avatar && !imageError) {
                      setImageError(true);
                    } else {
                      setDummyImageError(true);
                    }
                  }}
                />
              ) : (
                <div className="w-9 h-9 bg-pink-400 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>

            {/* Name + Role */}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-none">
                {user?.displayName || "John"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.role || "Partner"}
              </p>
            </div>

            {/* Chevron inside circle */}
            <div className={`flex items-center justify-center w-6 h-6 border border-gray-300 dark:border-gray-600 rounded-full transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}>
              <ChevronDown size={14} className="text-gray-500" />
            </div>
          </button>
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-20">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {user?.name || 'Partner User'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {user?.email || 'partner@villagkart.com'}
                  </p>
                  {user?.phone && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {user.phone}
                    </p>
                  )}
                </div>
                {/* My Account */}
{/* My Account */}
<button
  onClick={() => {
    setShowDropdown(false);
    navigate("/my-account");
  }}
  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
>
  <div className="relative w-5 h-5">
    <User size={18} strokeWidth={1.8} />
  </div>

  My Account
</button>
                {/* Change Password */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate("/change-password");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Key size={16} />
                  Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
