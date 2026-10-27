import { useState, useEffect, useRef } from "react";
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
  const [chartLoading, setChartLoading] = useState(false);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalOrdersCount, setTotalOrdersCount] = useState(100);

  // Filter states
  const [filterPeriod, setFilterPeriod] = useState<string>("All Time");

  // Dynamic KPI states
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [totalOrderCount, setTotalOrderCount] = useState<number>(0);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);

  const [todayOrders, setTodayOrders] = useState<number>(0);
  const [todayOrdersTrend, setTodayOrdersTrend] = useState<number>(0);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [todayRevenueTrend, setTodayRevenueTrend] = useState<number>(0);
  const [activeSellers, setActiveSellers] = useState<string>("0");
  const [pendingOrders, setPendingOrders] = useState<number>(0);
  const [avgOrderValue, setAvgOrderValue] = useState<string>("0");
  const [returnRequests, setReturnRequests] = useState<number>(0);
  const [deliveryBoysPercent, setDeliveryBoysPercent] = useState<number>(100);
  const [categoriesPercent, setCategoriesPercent] = useState<number>(0);

  // Chart states
  const [timeFilter, setTimeFilter] = useState<
    "hourly" | "daily" | "weekly" | "monthly" | "yearly"
  >("weekly");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [ordersChartData, setOrdersChartData] = useState<any[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);

  // Track initial mount so timeFilter/deliveryFilter changes only refresh the chart
  const hasLoadedOnce = useRef(false);

  // Helper to extract and set chart data from warehouse-stats response
  const applyChartData = (data: any) => {
    const list = data?.chartData || [];
    setOrdersChartData(list);

    if (data?.chartTotalOrders !== undefined) {
      setTotalOrders(data.chartTotalOrders);
    } else if (list.length > 0) {
      const sum = list.reduce((acc: number, item: any) => acc + (Number(item?.orders) || 0), 0);
      setTotalOrders(sum);
    } else if (data?.totalOrders !== undefined) {
      setTotalOrders(data.totalOrders);
    } else {
      setTotalOrders(0);
    }
  };

  // Helper to get period query param
  const getPeriodParam = () => {
    if (filterPeriod === "Today") return "today";
    if (filterPeriod === "This Week") return "week";
    if (filterPeriod === "This Month") return "month";
    if (filterPeriod === "This Year") return "year";
    return "all";
  };

  // Fetch only the chart data when timeFilter or deliveryFilter changes (no page reset)
  const fetchChartData = async () => {
    try {
      setChartLoading(true);
      const periodParam = getPeriodParam();
      const statsRes = await fetchData<any>(
        `partner/orders/warehouse-stats?period=${periodParam}&timeFilter=${timeFilter}&deliveryFilter=${deliveryFilter}`,
        "GET"
      );
      if (statsRes?.data) {
        applyChartData(statsRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
    } finally {
      setChartLoading(false);
    }
  };

  // 1. Full dashboard reload when page, pagination, or filterPeriod changes
  useEffect(() => {
    fetchDashboardData();
  }, [currentPage, itemsPerPage, filterPeriod]);

  // 2. Chart-only reload when timeFilter or deliveryFilter changes (skip initial mount)
  useEffect(() => {
    if (!hasLoadedOnce.current) return;
    fetchChartData();
  }, [timeFilter, deliveryFilter]);

  // Open Business Settings automatically based on login data flag `categoriesPresent`
  useEffect(() => {
    const raw = localStorage.getItem("user");

    if (!raw) return;

    try {
      const loginData = JSON.parse(raw);
      const alreadyShown = localStorage.getItem("businessSettingsShown");

      if (loginData?.categoriesPresent === false && !alreadyShown) {
        setShowBusinessSettings(true);
        localStorage.setItem("businessSettingsShown", "true");
      }
    } catch (error) {
      console.error("Error reading loginData:", error);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const periodParam = getPeriodParam();

      // 1. Fetch warehouse stats with timeFilter, deliveryFilter, and period
      let stats: any = {};
      try {
        const statsRes = await fetchData<any>(
          `partner/orders/warehouse-stats?period=${periodParam}&timeFilter=${timeFilter}&deliveryFilter=${deliveryFilter}`,
          "GET"
        );
        if (statsRes?.data) {
          stats = statsRes.data;
          setTodayOrders(stats.todayOrders ?? 0);
          setTodayOrdersTrend(stats.todayOrdersTrend ?? 0);
          setPendingOrders(stats.pending ?? 0);
          setDeliveryBoysPercent(stats.slaSuccessRate ? Math.round(stats.slaSuccessRate) : 98);
          setTodayRevenue(stats.todayRevenue ?? 0);
          setTodayRevenueTrend(stats.todayRevenueTrend ?? 0);
          setAvgOrderValue(stats.avgOrderValue ? Number(stats.avgOrderValue).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : "0");
          setTotalCustomers(stats.totalCustomers ?? 0);
          setTotalSales(stats.totalSales ?? 0);

          // Map partner-specific stats
          setTotalOrderCount(stats.totalOrders ?? 0);
          setTotalProductsCount(stats.totalProducts ?? 0);
          setReturnRequests(stats.returnRequests ?? 0);
          setCategoriesPercent(stats.categoriesPercent ? Math.round(stats.categoriesPercent) : 0);
          setActiveSellers(stats.activeSellers !== undefined ? String(stats.activeSellers) : "0");

          applyChartData(stats);

          // Calculate status donut data directly from backend status counts
          if (stats.statusCounts) {
            const counts = stats.statusCounts;
            const delivered = counts.DELIVERED || 0;
            const cancelled = counts.CANCELLED || 0;
            const processing = (counts.PROCESSING || 0) + (counts.READY_FOR_PICKUP || 0);
            const pending = (counts.PENDING || 0) + (counts.PLACED || 0) + (counts.CONFIRMED || 0);
            const total = delivered + cancelled + processing + pending;

            if (total > 0) {
              setOrderStatusData([
                { name: "Delivered", value: Math.round((delivered / total) * 100), color: "#00891D" },
                { name: "Cancelled", value: Math.round((cancelled / total) * 100), color: "#FF0000" },
                { name: "Processing", value: Math.round((processing / total) * 100), color: "#F59E0B" },
                { name: "Pending", value: Math.round((pending / total) * 100), color: "#EF5A06" },
              ]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch warehouse stats:", err);
      }

      // 2. Fetch recent orders filtered by active period
      let orders: any[] = [];
      try {
        const ordersRes = await fetchData<any>(
          `partner/orders?page=${currentPage}&limit=${itemsPerPage}&view=shopkeeper&period=${periodParam}`,
          "GET"
        );
        if (ordersRes?.data?.orders) {
          orders = ordersRes.data.orders;
          const totalOrdersFromRes = ordersRes.pagination?.total !== undefined ? ordersRes.pagination.total : orders.length;
          setTotalOrdersCount(totalOrdersFromRes);

          // Map recent orders
          const mappedOrders = orders.map((o: any, idx: number) => ({
            id: o.orderNumber || o.id || idx + 1,
            user: o.consumer?.name || "Customer",
            phone: o.consumer?.phone || "-",
            deliveryAddress: o.address ? `${o.address.line1 || ""}, ${o.address.city || ""}, ${o.address.pincode || ""}` : (o.orderType === "POS" ? "POS Walk-in Store" : "Standard Delivery"),
            paymentMethod: o.payment?.method || o.paymentMode || "COD",
            deliveryPartner: o.assignedShopkeeper?.name || (o.orderType === "POS" ? "POS Counter" : "-"),
            status: o.status === "CONFIRMED" ? "New Order" : o.status === "PROCESSING" ? "Packed" : o.status === "READY_FOR_PICKUP" ? "Shipped" : o.status === "DELIVERED" ? "Delivered" : o.status,
            dateTime: o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-",
          }));
          setRecentOrders(mappedOrders);
        } else {
          setRecentOrders([]);
        }
      } catch (err) {
        console.error("Failed to fetch recent orders:", err);
        setRecentOrders([]);
      }

      // 3. Fallback product count if not present
      if (stats.totalProducts === undefined) {
        try {
          const productsRes = await fetchData<any>("productmanagement/product?page=1&limit=1", "GET");
          if (productsRes?.pagination?.total !== undefined) {
            setTotalProductsCount(productsRes.pagination.total);
          }
        } catch (err) {
          console.error("Failed to fetch products count:", err);
        }
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
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
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                <span className="text-gray-600">Active registered consumers</span>
              </span>
            </div>

            <div
              className={KPI_CARD_CLASSES}
              style={{ height: KPI_CARD_HEIGHT }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Total Orders
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
                <span className="text-orange-600 font-semibold">{pendingOrders}</span>
                <span className="text-gray-600">orders in pipeline</span>
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
                    ₹{totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <IconWrapper
                  iconSrc={kpiIcons.totalSales}
                  variant="green"
                  size="md"
                  />
              </div>
              <span className="text-[13px] font-medium flex items-center gap-1 h-5">
                <span className="text-green-600 font-semibold">Delivered</span>
                <span className="text-gray-600">fulfilled orders total</span>
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
                <span className="text-purple-600 font-semibold">Active catalog</span>
                <span className="text-gray-600">items in store</span>
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
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 w-full sm:w-auto"
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
            </div>

            {/* Additional KPI Cards - Second Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-full mb-4 sm:mb-6">
              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      {filterPeriod === "Today" ? "Today's Orders" :
                       filterPeriod === "This Week" ? "This Week's Orders" :
                       filterPeriod === "This Month" ? "This Month's Orders" :
                       filterPeriod === "This Year" ? "This Year's Orders" :
                       "Total Orders"}
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
                  {todayOrdersTrend >= 0 ? (
                    <>
                      <TrendingUp size={13} className="text-green-600" />
                      <span className="text-green-600">{Math.abs(todayOrdersTrend)}%</span>
                      <span className="text-gray-600">
                        {filterPeriod === "Today" ? "vs yesterday" :
                         filterPeriod === "This Week" ? "vs last week" :
                         filterPeriod === "This Month" ? "vs last month" :
                         filterPeriod === "This Year" ? "vs last year" :
                         "pipeline active"}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown size={13} className="text-red-600" />
                      <span className="text-red-600">{Math.abs(todayOrdersTrend)}%</span>
                      <span className="text-gray-600">
                        {filterPeriod === "Today" ? "vs yesterday" :
                         filterPeriod === "This Week" ? "vs last week" :
                         filterPeriod === "This Month" ? "vs last month" :
                         filterPeriod === "This Year" ? "vs last year" :
                         "pipeline active"}
                      </span>
                    </>
                  )}
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      {filterPeriod === "Today" ? "Today's Revenue" :
                       filterPeriod === "This Week" ? "This Week's Revenue" :
                       filterPeriod === "This Month" ? "This Month's Revenue" :
                       filterPeriod === "This Year" ? "This Year's Revenue" :
                       "Total Revenue"}
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalSales}
                    variant="orange"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  {todayRevenueTrend >= 0 ? (
                    <>
                      <TrendingUp size={13} className="text-green-600" />
                      <span className="text-green-600">{Math.abs(todayRevenueTrend)}%</span>
                      <span className="text-gray-600">
                        {filterPeriod === "Today" ? "vs yesterday" :
                         filterPeriod === "This Week" ? "vs last week" :
                         filterPeriod === "This Month" ? "vs last month" :
                         filterPeriod === "This Year" ? "vs last year" :
                         "period fulfilled"}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown size={13} className="text-red-600" />
                      <span className="text-red-600">{Math.abs(todayRevenueTrend)}%</span>
                      <span className="text-gray-600">
                        {filterPeriod === "Today" ? "vs yesterday" :
                         filterPeriod === "This Week" ? "vs last week" :
                         filterPeriod === "This Month" ? "vs last month" :
                         filterPeriod === "This Year" ? "vs last year" :
                         "period fulfilled"}
                      </span>
                    </>
                  )}
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Active Stores / Sellers
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
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  <span className="text-gray-600">Live operational locations</span>
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
                  <span className="text-orange-600 font-semibold">{pendingOrders}</span>
                  <span className="text-gray-600">awaiting pickup/fulfillment</span>
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
                      ₹{avgOrderValue}
                    </p>
                  </div>
                  <IconWrapper
                    iconSrc={kpiIcons.totalSales}
                    variant="purple"
                    size="sm"
                  />
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <span className="text-purple-600 font-semibold">Avg basket</span>
                  <span className="text-gray-600">per placed order</span>
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
                  <span className={returnRequests > 0 ? "text-amber-600 font-semibold" : "text-green-600 font-semibold"}>
                    {returnRequests === 0 ? "0 returns" : `${returnRequests} recorded`}
                  </span>
                  <span className="text-gray-600">customer returns</span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Delivery SLA Rate
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
                  <span className="text-blue-600 font-semibold">On-time rate</span>
                  <span className="text-gray-600">dispatch compliance</span>
                </span>
              </div>

              <div
                className={SECONDARY_KPI_CARD_CLASSES}
                style={{ height: SECONDARY_KPI_CARD_HEIGHT }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-[11px] font-medium text-gray-600 mb-2">
                      Active Categories
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
                  <span className="text-pink-600 font-semibold">Enabled</span>
                  <span className="text-gray-600">in warehouse catalog</span>
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
                    {totalOrders.toLocaleString()}
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
                    <button
                      onClick={() => setTimeFilter("yearly")}
                      className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs rounded transition-colors ${timeFilter === "yearly"
                          ? "bg-orange-500 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                    >
                      Yearly
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
                {timeFilter === "hourly" ? "Today's 24-Hour Activity" :
                 timeFilter === "daily" ? "Last 30 Days Activity Trends" :
                 timeFilter === "weekly" ? "Last 12 Weeks Activity Trends" :
                 timeFilter === "monthly" ? "Last 12 Months Activity Trends" :
                 "Last 5 Years Activity Trends"} (Live {deliveryFilter === "all" ? "All Orders" : deliveryFilter === "delivered" ? "Delivered Orders" : "Pending Orders"} & Revenue)
              </p>
              <div
                className="relative w-full min-w-[280px] min-h-[180px]"
                style={{ height: 220 }}
              >
                {chartLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-[1px] rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span>Updating chart...</span>
                    </div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={220} minWidth={0}>
                  <ComposedChart
                    data={ordersChartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="ordersGradientChart"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                        <stop
                          offset="100%"
                          stopColor="#f97316"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                      <linearGradient
                        id="revenueGradientChart"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#00891D" stopOpacity={0.8} />
                        <stop
                          offset="100%"
                          stopColor="#00891D"
                          stopOpacity={0.05}
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
                      tick={{ fontSize: 9, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      className="dark:[&_text]:fill-gray-400"
                    />
                    <YAxis
                      yAxisId="ordersAxis"
                      orientation="left"
                      tick={{ fontSize: 9, fill: "#f97316" }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                    />
                    <YAxis
                      yAxisId="revenueAxis"
                      orientation="right"
                      tick={{ fontSize: 9, fill: "#00891D" }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                      tickFormatter={(v) => `₹${Number(v) >= 1000 ? `${(Number(v)/1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                      wrapperStyle={{
                        backgroundColor: "transparent",
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === "Revenue") {
                          return [`₹${Number(value || 0).toLocaleString('en-IN')}`, name];
                        }
                        return [`${Number(value || 0).toLocaleString()}`, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
                      iconType="line"
                    />
                    <Area
                      yAxisId="ordersAxis"
                      type="monotone"
                      dataKey="orders"
                      fill="url(#ordersGradientChart)"
                      fillOpacity={1}
                      stroke="none"
                      connectNulls={true}
                    />
                    <Line
                      yAxisId="ordersAxis"
                      type="monotone"
                      dataKey="orders"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Orders"
                    />
                    <Line
                      yAxisId="revenueAxis"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#00891D"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
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
                      {totalOrders.toLocaleString()}
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
