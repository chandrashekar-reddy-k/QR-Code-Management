import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Line,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { usePartnerRealtimeSocket } from "../../../hooks/usePartnerRealtimeSocket";
import BusinessSettingsModal from "../../../components/common/BusinessSettingsModal";
import { kpiIcons } from "../../../assets/icons";
import { IconWrapper } from "../../../components/ui/Icon";
import fetchData from "../../../helper";

// Global size constants for KPI cards (first 4 cards)
const KPI_CARD_HEIGHT = "135px";
const KPI_CARD_CLASSES = `bg-white rounded-xl shadow-md border border-gray-200 p-4 flex flex-col justify-between`;

// Global size constants for secondary KPI cards (8 cards in white container)
const SECONDARY_KPI_CARD_HEIGHT = "125px";
const SECONDARY_KPI_CARD_CLASSES = `bg-white rounded-xl shadow-md border border-gray-200 p-4 flex flex-col justify-between`;

const Dashboard = () => {
  usePartnerRealtimeSocket();
  const [loading, setLoading] = useState(true);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalOrdersCount, setTotalOrdersCount] = useState(100);

  // Dynamic KPI states
  const [totalCustomers, setTotalCustomers] = useState<number>(40689);
  const [totalOrderCount, setTotalOrderCount] = useState<number>(10293);
  const [totalSales, setTotalSales] = useState<number>(89000);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(2040);

  const [todayOrders, setTodayOrders] = useState<number>(250);
  const [todayRevenue, setTodayRevenue] = useState<number>(150);
  const [activeSellers, setActiveSellers] = useState<string>("₹86.50");
  const [pendingOrders, setPendingOrders] = useState<number>(320);
  const [avgOrderValue, setAvgOrderValue] = useState<string>("1,250");
  const [returnRequests, setReturnRequests] = useState<number>(430);
  const [deliveryBoysPercent, setDeliveryBoysPercent] = useState<number>(92);
  const [categoriesPercent, setCategoriesPercent] = useState<number>(18);

  // Chart states
  const [timeFilter, setTimeFilter] = useState<
    "hourly" | "daily" | "weekly" | "monthly"
  >("weekly");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [ordersChartData, setOrdersChartData] = useState<any[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(38);
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);



  const mockOrderStatusData = [
    { name: "Delivered", value: 45, color: "#00891D" },
    { name: "Cancelled", value: 25, color: "#FF0000" },
    { name: "Processing", value: 20, color: "#F59E0B" },
    { name: "Pending", value: 10, color: "#EF5A06" },
  ];

  // Orders chart data for October
  const mockOrdersChartData = [
    { date: "01 OCT", orders: 1, revenue: 4 },
    { date: "06 OCT", orders: 2, revenue: 4.5 },
    { date: "11 OCT", orders: 3, revenue: 5.5 },
    { date: "16 OCT", orders: 2.5, revenue: 4.8 },
    { date: "21 OCT", orders: 3, revenue: 5 },
    { date: "26 OCT", orders: 2.2, revenue: 4.6 },
    { date: "31 OCT", orders: 2, revenue: 4.5 },
  ];

  const mockRecentOrders = [
    {
      id: 1,
      user: "User",
      phone: "9087636388",
      deliveryAddress: "xyz colony,xyz pincode.....",
      paymentMethod: "UPI",
      deliveryPartner: "",
      status: "New Order",
      dateTime: "12-11-2025, 10:00 AM",
    },
    {
      id: 2,
      user: "User",
      phone: "9087636388",
      deliveryAddress: "xyz colony,xyz pincode....",
      paymentMethod: "COD",
      deliveryPartner: "John",
      status: "Delivered",
      dateTime: "12-11-2025, 10:00 AM",
    },
    {
      id: 3,
      user: "User",
      phone: "9087636388",
      deliveryAddress: "xyz colony,xyz pincode.....",
      paymentMethod: "UPI",
      deliveryPartner: "John",
      status: "Shipped",
      dateTime: "12-11-2025, 10:00 AM",
    },
    {
      id: 4,
      user: "User",
      phone: "9087636388",
      deliveryAddress: "xyz colony,xyz pincode.....",
      paymentMethod: "UPI",
      deliveryPartner: "John",
      status: "Packed",
      dateTime: "12-11-2025, 10:00 AM",
    },
  ];


  useEffect(() => {
    fetchDashboardData();
  }, [currentPage, itemsPerPage]);

  // Open Business Settings automatically based on login data flag `categoriesPresent`
  // If categoriesPresent === true  -> don't show popup
  // If categoriesPresent === false -> show popup
  useEffect(() => {
    const raw = localStorage.getItem("user");

    if (!raw) return;

    try {
      const loginData = JSON.parse(raw);

      const alreadyShown = localStorage.getItem("businessSettingsShown");

      if (loginData?.categoriesPresent === false && !alreadyShown) {
        setShowBusinessSettings(true);

        // mark as shown
        localStorage.setItem("businessSettingsShown", "true");
      }
    } catch (error) {
      console.error("Error reading loginData:", error);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch warehouse stats
      let stats: any = {};
      try {
        const statsRes = await fetchData<any>("partner/orders/warehouse-stats", "GET");
        if (statsRes?.data) {
          stats = statsRes.data;
          setTodayOrders(stats.todayOrders ?? 0);
          setPendingOrders(stats.pending ?? 0);
          setDeliveryBoysPercent(stats.slaSuccessRate ? Math.round(stats.slaSuccessRate) : 100);
          setTodayRevenue(stats.todayRevenue ?? 0);
          setAvgOrderValue(stats.avgOrderValue ? stats.avgOrderValue.toFixed(2) : "0");
          setTotalCustomers(stats.totalCustomers ?? 0);
          setTotalSales(stats.totalSales ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch warehouse stats:", err);
      }

      // 2. Fetch recent orders
      let orders: any[] = [];
      try {
        const ordersRes = await fetchData<any>(`partner/orders?page=${currentPage}&limit=${itemsPerPage}&view=shopkeeper`, "GET");
        if (ordersRes?.data?.orders) {
          orders = ordersRes.data.orders;
          setTotalOrders(ordersRes.pagination?.total || orders.length || 38);
          setTotalOrdersCount(ordersRes.pagination?.total || 100);
          setTotalOrderCount(ordersRes.pagination?.total || 0);

          // Map recent orders
          const mappedOrders = orders.map((o: any, idx: number) => ({
            id: o.orderNumber || o.id || idx + 1,
            user: o.consumer?.name || "Customer",
            phone: o.consumer?.phone || "-",
            deliveryAddress: o.address ? `${o.address.line1 || ""}, ${o.address.city || ""}, ${o.address.pincode || ""}` : "-",
            paymentMethod: o.payment?.method || "-",
            deliveryPartner: o.assignedShopkeeper?.name || "-",
            status: o.status === "CONFIRMED" ? "New Order" : o.status === "PROCESSING" ? "Packed" : o.status === "READY_FOR_PICKUP" ? "Shipped" : o.status === "DELIVERED" ? "Delivered" : o.status,
            dateTime: o.createdAt ? new Date(o.createdAt).toLocaleString() : "12-11-2025, 10:00 AM",
          }));
          setRecentOrders(mappedOrders);

          // Calculate dynamic orderStatusData from countByStatus if available
          if (ordersRes.data.statusCounts) {
            const counts = ordersRes.data.statusCounts;
            const delivered = counts.DELIVERED || 0;
            const cancelled = counts.CANCELLED || 0;
            const processing = (counts.PROCESSING || 0) + (counts.ACCEPTED || 0);
            const pending = (counts.PENDING || 0) + (counts.PLACED || 0) + (counts.CONFIRMED || 0);
            const total = delivered + cancelled + processing + pending;

            if (total > 0) {
              setOrderStatusData([
                { name: "Delivered", value: Math.round((delivered / total) * 100), color: "#00891D" },
                { name: "Cancelled", value: Math.round((cancelled / total) * 100), color: "#FF0000" },
                { name: "Processing", value: Math.round((processing / total) * 100), color: "#F59E0B" },
                { name: "Pending", value: Math.round((pending / total) * 100), color: "#EF5A06" },
              ]);
            } else {
              setOrderStatusData(mockOrderStatusData);
            }
          } else {
            setOrderStatusData(mockOrderStatusData);
          }
        } else {
          setRecentOrders(mockRecentOrders);
          setOrderStatusData(mockOrderStatusData);
        }
      } catch (err) {
        console.error("Failed to fetch recent orders:", err);
        setRecentOrders(mockRecentOrders);
        setOrderStatusData(mockOrderStatusData);
      }

      // 3. Fetch products list count
      try {
        const productsRes = await fetchData<any>("productmanagement/product?page=1&limit=1", "GET");
        if (productsRes?.pagination?.total) {
          setTotalProductsCount(productsRes.pagination.total);
        }
      } catch (err) {
        console.error("Failed to fetch products count:", err);
      }

      // Set default mock values for chart
      setOrdersChartData(mockOrdersChartData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setOrderStatusData(mockOrderStatusData);
      setRecentOrders(mockRecentOrders);
      setOrdersChartData(mockOrdersChartData);
      setTotalOrders(38);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
      case "New Order":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
      case "Shipped":
        return "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400";
      case "Packed":
        return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400";
      case "Pending":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
      case "Processing":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400";
      case "Cancelled":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };


  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Dashboard Header */}
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 mt-1">
        Dashboard
      </h1>

      {/* Welcome Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4 mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-orange-600 dark:text-orange-500 mb-1">
          Welcome Partner!
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
            Loading dashboard data...
          </p>
        </div>
      ) : (
        <>
          {/* Main Stats Cards - First Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-4">
            <div
              className={KPI_CARD_CLASSES}
              style={{ height: KPI_CARD_HEIGHT }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Total Customers
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCustomers.toLocaleString()}
                  </p>
                </div>
                <IconWrapper
                  iconSrc={kpiIcons.totalCustomers}
                  variant="purple"
                  size="md"
                  />
              </div>
              <span className="text-[13px] font-medium flex items-center gap-1 h-5">
                <TrendingUp size={15} className="text-green-600" />
                <span className="text-green-600">8.5%</span>
                <span className="text-gray-600">
                  Up from yesterday
                </span>
              </span>
            </div>

            <div
              className={KPI_CARD_CLASSES}
              style={{ height: KPI_CARD_HEIGHT }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Total Order
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalOrderCount.toLocaleString()}
                  </p>
                </div>
                <IconWrapper
                  iconSrc={kpiIcons.totalOrders}
                  variant="orange"
                  size="md"
                  />
              </div>
              <span className="text-[13px] font-medium flex items-center gap-1 h-5">
                <TrendingUp size={15} className="text-green-600" />
                <span className="text-green-600">1.3%</span>
                <span className="text-gray-600">Up from past week</span>
              </span>
            </div>

            <div
              className={KPI_CARD_CLASSES}
              style={{ height: KPI_CARD_HEIGHT }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Total Sales
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{totalSales.toLocaleString()}
                  </p>
                </div>
                <IconWrapper
                  iconSrc={kpiIcons.totalSales}
                  variant="green"
                  size="md"
                  />
              </div>
              <span className="text-[13px] font-medium flex items-center gap-1 h-5">
                <TrendingDown size={15} className="text-red-600" />
                <span className="text-red-600">4.3%</span>
                <span className="text-gray-600">
                  Down from yesterday
                </span>
              </span>
            </div>

            <div
              className={KPI_CARD_CLASSES}
              style={{ height: KPI_CARD_HEIGHT }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Total Products
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalProductsCount.toLocaleString()}
                  </p>
                </div>
                <IconWrapper
                  iconSrc={kpiIcons.totalProducts}
                  variant="pink"
                  size="md"
                  />
              </div>
              <span className="text-[13px] font-medium flex items-center gap-1 h-5">
                <TrendingUp size={15} className="text-green-600" />
                <span className="text-green-600">1.8%</span>
                <span className="text-gray-600">
                  Up from yesterday
                </span>
              </span>
            </div>
          </div>

          {/* KPI Cards Container */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 px-3 sm:px-4 pt-3 pb-4">
            {/* Filter By Dropdown */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Filter By:
              </label>
              <select className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 w-full sm:w-auto">
                <option>All Time</option>
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
            </div>             {/* Additional KPI Cards - Second Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-full mb-4 sm:mb-6">
              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Today's Orders
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {todayOrders.toLocaleString()}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalOrders}
                    variant="purple"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingUp size={13} className="text-green-600" />
                  <span className="text-green-600">3.2%</span>
                  <span className="text-gray-600">
                    Up from yesterday
                  </span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Today's Revenue
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{todayRevenue.toLocaleString()}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalSales}
                    variant="orange"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingDown size={13} className="text-red-600" />
                  <span className="text-red-600">2.0%</span>
                  <span className="text-gray-600">
                    Down from past week
                  </span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Active Sellers
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {activeSellers}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalCustomers}
                    variant="green"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingDown size={13} className="text-red-600" />
                  <span className="text-red-600">0.5%</span>
                  <span className="text-gray-600">
                    Down from yesterday
                  </span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Pending Orders
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {pendingOrders.toLocaleString()}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalOrders}
                    variant="red"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingUp size={13} className="text-green-600" />
                  <span className="text-green-600">5.1%</span>
                  <span className="text-gray-600">
                    Up from yesterday
                  </span>
                </span>
              </div>
            </div>

            {/* Third Row KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-full mt-0">
              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Average Order Value
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {avgOrderValue}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalSales}
                    variant="purple"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingUp size={13} className="text-green-600" />
                  <span className="text-green-600">10%</span>
                  <span className="text-gray-600">
                    Up from yesterday
                  </span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Return Requests
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {returnRequests.toLocaleString()}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalOrders}
                    variant="orange"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingUp size={13} className="text-green-600" />
                  <span className="text-green-600">15%</span>
                  <span className="text-gray-600">
                    Up from past week
                  </span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Delivery Boys
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {deliveryBoysPercent}%
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.deliveryBoys}
                    variant="blue"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingDown size={13} className="text-red-600" />
                  <span className="text-red-600">1%</span>
                  <span className="text-gray-600">
                    Down from yesterday
                  </span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Categories
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {categoriesPercent}%
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalProducts}
                    variant="pink"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <TrendingUp size={13} className="text-green-600" />
                  <span className="text-green-600">2%</span>
                  <span className="text-gray-600">
                    Down from yesterday
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-4 mt-6 sm:mt-8">
            {/* Orders Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-gray-800 mb-1">
                    Orders
                  </h2>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {totalOrders}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 flex-wrap">
                    <button
                      onClick={() => setTimeFilter("hourly")}
                      className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs rounded transition-colors ${timeFilter === "hourly"
                          ? "bg-orange-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                    >
                      Hourly
                    </button>
                    <button
                      onClick={() => setTimeFilter("daily")}
                      className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs rounded transition-colors ${timeFilter === "daily"
                          ? "bg-orange-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setTimeFilter("weekly")}
                      className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs rounded transition-colors ${timeFilter === "weekly"
                          ? "bg-orange-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setTimeFilter("monthly")}
                      className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs rounded transition-colors ${timeFilter === "monthly"
                          ? "bg-orange-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                    >
                      Monthly
                    </button>
                  </div>
                  <select
                    value={deliveryFilter}
                    onChange={(e) => setDeliveryFilter(e.target.value)}
                    className="px-2 py-1 text-[10px] sm:text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 w-full sm:w-auto"
                  >
                    <option value="all">Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
                Compare to: 01 Oct-30 Oct 2025
              </p>
              <div
                className="w-full min-w-[280px] min-h-[180px]"
                style={{ height: 220 }}
              >
                <ResponsiveContainer width="100%" height={220} minWidth={0}>
                  <ComposedChart
                    data={ordersChartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="ordersGradientChart"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                        <stop
                          offset="30%"
                          stopColor="#f97316"
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="70%"
                          stopColor="#f97316"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f97316"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="revenueGradientChart"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#00891D" stopOpacity={1} />
                        <stop
                          offset="30%"
                          stopColor="#00891D"
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="70%"
                          stopColor="#00891D"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#00891D"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      opacity={0.3}
                      className="dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      className="dark:[&_text]:fill-gray-400"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 6]}
                      className="dark:[&_text]:fill-gray-400"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        fontSize: "10px",
                      }}
                      wrapperStyle={{
                        backgroundColor: "transparent",
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === "Revenue") {
                          return [`₹${(value * 100).toFixed(1)}`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
                      iconType="line"
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      fill="url(#ordersGradientChart)"
                      fillOpacity={1}
                      stroke="none"
                      connectNulls={true}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      fill="url(#revenueGradientChart)"
                      fillOpacity={1}
                      stroke="none"
                      connectNulls={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Orders"
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#00891D"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Revenue"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Orders Status Chart */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4">
              <h2 className="text-xs sm:text-sm font-bold text-gray-800 mb-3 sm:mb-4">
                Orders Status
              </h2>
              <div
                className="relative flex w-full min-w-[280px] min-h-[180px] items-center justify-center"
                style={{ height: 200 }}
              >
                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `${value}%`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        fontSize: "10px",
                      }}
                      wrapperStyle={{
                        backgroundColor: "transparent",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {totalOrders}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      Total Orders
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 space-y-2">
                {orderStatusData.map((status, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[10px] sm:text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      ></div>
                      <span className="text-gray-700">
                        {status.name}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {status.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Latest Orders */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4 mt-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Latest Orders
            </h2>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1">
                        ID
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown
                            size={12}
                            className="text-gray-400 -mt-1"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1">
                        USER
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown
                            size={12}
                            className="text-gray-400 -mt-1"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1">
                        DELIVERY ADRESS
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown
                            size={12}
                            className="text-gray-400 -mt-1"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1">
                        P.METHOD
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown
                            size={12}
                            className="text-gray-400 -mt-1"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1">
                        DELIVERY PARTNER
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown
                            size={12}
                            className="text-gray-400 -mt-1"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1">
                        STATUS
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown
                            size={12}
                            className="text-gray-400 -mt-1"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-center gap-1">
                        DATE AND TIME
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown
                            size={12}
                            className="text-gray-400 -mt-1"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-700 uppercase">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-3 text-xs text-center font-semibold text-gray-700">
                        {order.id}
                      </td>
                      <td className="py-3 px-3 text-xs text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-gray-700">
                            {order.user}
                          </span>
                          <span className="text-green-600 dark:text-green-400">
                            {order.phone}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-center font-semibold text-gray-700">
                        {order.deliveryAddress}
                      </td>
                      <td className="py-3 px-3 text-xs text-center font-semibold text-gray-700">
                        {order.paymentMethod}
                      </td>
                      <td className="py-3 px-3 text-xs text-center font-semibold text-gray-700">
                        {order.deliveryPartner || "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-center font-semibold text-gray-700">
                        {order.dateTime}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          className="text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                          aria-label="View order"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">
                  Show
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 bg-white text-gray-900"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-600">
                  Showing results{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    {totalOrdersCount}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft
                    size={18}
                    className="text-gray-600"
                  />
                </button>
                {Array.from({ length: Math.ceil(totalOrdersCount / itemsPerPage) }, (_, idx) => idx + 1)
                  .slice(0, 5)
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${currentPage === page
                          ? "bg-orange-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={currentPage >= Math.ceil(totalOrdersCount / itemsPerPage)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight
                    size={18}
                    className="text-gray-600"
                  />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Business Settings Modal */}
      <BusinessSettingsModal
        isOpen={showBusinessSettings}
        onClose={() => setShowBusinessSettings(false)}
        onComplete={() => setShowBusinessSettings(false)}
      />
    </div>
  );
};

export default Dashboard;
