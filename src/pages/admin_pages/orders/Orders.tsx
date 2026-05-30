import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  IndianRupee,
  Filter,
  ChevronDown,
  Store,
  Phone,
  Calendar,
  RotateCcw,
  Banknote,
} from "lucide-react";
import {
  SearchInput,
  SelectInput,
  DataTable,
  Pagination,
  Badge,
  StatCard,
  ViewIconButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatCurrency } from "../../../utils/formatters";

interface Order {
  id: number;
  user: string;
  image: string;
  productName: string;
  productSize: string;
  seller: string;
  mobile: string;
  total: number;
  paymentMethod: number;
  date: string; // DD-MM-YYYY
  time: string; // HH:mm AM/PM
  status: "Cancelled" | "Delivered" | "Processing" | "Shipped";
}

// Mock data as in your code
const mockOrders: Order[] = [
  {
    id: 1,
    user: "Premium Coffee Beans",
    image:
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop",
    productName: "Premium Coffee Beans",
    productSize: "1 kg Pouch",
    seller: "COFFEE-1KG-001",
    mobile: "Warehouse 1",
    total: 1,
    paymentMethod: 1,
    date: "12-11-2025",
    time: "10:00 AM",
    status: "Cancelled",
  },
  {
    id: 2,
    user: "Premium Coffee Beans",
    image:
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop",
    productName: "Premium Coffee Beans",
    productSize: "1 kg Pouch",
    seller: "COFFEE-1KG-001",
    mobile: "Warehouse 1",
    total: 2,
    paymentMethod: 2,
    date: "01-11-2025",
    time: "10:00 AM",
    status: "Delivered",
  },
  {
    id: 3,
    user: "Premium Coffee Beans",
    image:
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop",
    productName: "Premium Coffee Beans",
    productSize: "1 kg Pouch",
    seller: "COFFEE-1KG-001",
    mobile: "Warehouse 1",
    total: 3,
    paymentMethod: 3,
    date: "12-10-2025",
    time: "10:00 AM",
    status: "Processing",
  },
  {
    id: 4,
    user: "Premium Coffee Beans",
    image:
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop",
    productName: "Premium Coffee Beans",
    productSize: "1 kg Pouch",
    seller: "COFFEE-1KG-001",
    mobile: "Warehouse 1",
    total: 4,
    paymentMethod: 4,
    date: "12-10-2025",
    time: "10:00 AM",
    status: "Shipped",
  },
];

const getStatusColor = (status: Order["status"]) => {
  switch (status) {
    case "Cancelled":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
    case "Delivered":
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
    case "Processing":
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
    case "Shipped":
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200";
  }
};

const getPaymentMethodLabel = (method: number) => {
  switch (method) {
    case 1:
      return "COD";
    case 2:
      return "UPI";
    case 3:
      return "Card";
    case 4:
      return "Net Banking";
    default:
      return "Other";
  }
};

// Helper to sort by date + time (date is DD-MM-YYYY)
const parseOrderDateTime = (order: Order) => {
  const [day, month, year] = order.date.split("-").map(Number);
  return new Date(year, month - 1, day, ...to24Hour(order.time)).getTime();
};

const to24Hour = (time: string): [number, number] => {
  // "10:00 AM" / "07:30 PM"
  const [timePart, period] = time.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return [h, m];
};

const OrderManagement = () => {
  const navigate = useNavigate();

  const [orders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );

  // KPI metrics
  const kpiData = useMemo(() => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(
      (o) => o.status === "Delivered"
    ).length;
    const pendingOrders = orders.filter(
      (o) => o.status === "Processing" || o.status === "Shipped"
    ).length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    return [
      {
        title: "Total Orders",
        value: totalOrders.toLocaleString(),
        icon: Package,
        variant: "purple" as const,
      },
      {
        title: "Pending Orders",
        value: pendingOrders.toLocaleString(),
        icon: Package,
        variant: "yellow" as const,
      },
      {
        title: "Delivered Orders",
        value: deliveredOrders.toLocaleString(),
        icon: Package,
        variant: "red" as const,
      },
      {
        title: "Total Revenue",
        value: `₹ ${totalRevenue.toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })}`,
        icon: Banknote,
        variant: "green" as const,
      },
      {
        title: "Avg Order Value",
        value: Math.round(avgOrderValue).toString(),
        icon: Package,
        variant: "green" as const,
      },
    ];
  }, [orders]);

  // Unique sellers for filter options
  const sellerOptions = useMemo(
    () => [
      { value: "", label: "Sellers" },
      ...Array.from(new Set(orders.map((o) => o.seller))).map((seller) => ({
        value: seller,
        label: seller,
      })),
    ],
    [orders]
  );

  // Filter + sort
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toString().includes(term) ||
          o.user.toLowerCase().includes(term) ||
          o.productName.toLowerCase().includes(term) ||
          o.seller.toLowerCase().includes(term) ||
          o.mobile.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Seller filter
    if (sellerFilter) {
      filtered = filtered.filter((o) => o.seller === sellerFilter);
    }

    // Payment method filter
    if (paymentFilter) {
      filtered = filtered.filter(
        (o) => o.paymentMethod.toString() === paymentFilter
      );
    }

    // Date filter (basic example)
    if (dateFilter) {
      const now = new Date();
      filtered = filtered.filter((o) => {
        const orderTime = parseOrderDateTime(o);
        const diffDays = (now.getTime() - orderTime) / (1000 * 60 * 60 * 24);

        if (dateFilter === "today") {
          const orderDate = new Date(orderTime);
          return (
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );
        }
        if (dateFilter === "week") {
          return diffDays <= 7;
        }
        if (dateFilter === "month") {
          return diffDays <= 30;
        }
        return true;
      });
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "user":
            aValue = a.user.toLowerCase();
            bValue = b.user.toLowerCase();
            break;
          case "seller":
            aValue = a.seller.toLowerCase();
            bValue = b.seller.toLowerCase();
            break;
          case "mobile":
            aValue = a.mobile.toLowerCase();
            bValue = b.mobile.toLowerCase();
            break;
          case "total":
            aValue = a.total;
            bValue = b.total;
            break;
          case "paymentMethod":
            aValue = a.paymentMethod;
            bValue = b.paymentMethod;
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "dateTime":
            aValue = parseOrderDateTime(a);
            bValue = parseOrderDateTime(b);
            break;
          default:
            return 0;
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [
    orders,
    searchTerm,
    statusFilter,
    sellerFilter,
    paymentFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = filteredAndSortedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setStatusFilter("");
    setSellerFilter("");
    setPaymentFilter("");
    setCurrentPage(1);
  };

  // Table columns using common DataTable
  const columns = [
    {
      key: "id",
      label: "ORDER ID",
      sortable: true,
      render: (order: Order) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{order.id}</span>
        </div>
      ),
    },
    {
      key: "user",
      label: "USER",
      sortable: true,
      render: (order: Order) => (
        <div className="flex items-center justify-center gap-3">
          <img
            src={order.image}
            alt={order.productName}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
          />
          <div className="text-left">
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
              {order.productName}
            </p>
            <p className="text-[11px] sm:text-xs text-green-500">
              {order.productSize}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "seller",
      label: "SELLER",
      sortable: true,
      render: (order: Order) => (
        <div className="flex items-center justify-center gap-1.5">
          <Store size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {order.seller}
          </span>
        </div>
      ),
    },
    {
      key: "mobile",
      label: "MOBILE",
      sortable: true,
      render: (order: Order) => (
        <div className="flex items-center justify-center gap-1.5">
          <Phone size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {order.mobile}
          </span>
        </div>
      ),
    },
    {
      key: "total",
      label: "TOTAL (₹)",
      sortable: true,
      render: (order: Order) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
            {formatCurrency(order.total)}
          </span>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "P. METHOD",
      sortable: true,
      render: (order: Order) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {getPaymentMethodLabel(order.paymentMethod)}
          </span>
        </div>
      ),
    },
    {
      key: "dateTime",
      label: "DATE & TIME",
      sortable: true,
      render: (order: Order) => (
        <div className="flex items-center justify-center gap-1.5">
          <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
            {order.date}, {order.time}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (order: Order) => (
        <div className="text-center">
          <Badge
            status={order.status}
            size="sm"
            customColor={getStatusColor(order.status)}
            className="rounded"
          />
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (order: Order) => (
        <div className="flex items-center justify-center">
          <ViewIconButton
            onClick={() => navigate(`/orders/view/${order.id}`)}
            size={14}
            tooltip="View"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Order Management
        </h1>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
            size="md"
            valueSize="2xl"
          />
        ))}
      </div>

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-[720px] overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* From & to Date Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: "", label: "From & to Date" },
                  { value: "today", label: "Today" },
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Status" },
                  { value: "Processing", label: "Processing" },
                  { value: "Shipped", label: "Shipped" },
                  { value: "Delivered", label: "Delivered" },
                  { value: "Cancelled", label: "Cancelled" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Seller Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                options={sellerOptions}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedOrders}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(order) => order.id.toString()}
            emptyMessage="No orders found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedOrders.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-400 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:text-gray-900 dark:[&_select]:text-gray-200 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                    ]}
                    className="w-16 sm:w-20 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing results{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {filteredAndSortedOrders.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedOrders.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
