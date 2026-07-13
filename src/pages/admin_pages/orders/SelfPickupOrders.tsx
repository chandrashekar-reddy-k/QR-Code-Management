import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Package, Filter, RotateCcw, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import {
  SearchInput,
  DataTable,
  Pagination,
  SelectInput,
  StatCard,
  ViewIconButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { useGetPickupOrders, useBulkTransitionOrders, useGeneratePickingList } from "../../../hooks/order";
import { toast } from "react-toastify";

// Interface for Self Pickup Order from API
interface ApiSelfPickupOrder {
  id: number | string;
  
  consumer: {
    id: string;
    name: string;
    phone: string;
  };
  vendorId?: number;
  vendorName?: string;
  sellerId?: number;
  sellerName?: string;
  total?: number;
  additionalCharges?: number;
  walletUsed?: number;
  finalTotal?: number;
  payment: {
    status: string;
    method: string;
  };
  orderDate: string;
  availability?: boolean | string;
  [key: string]: unknown;
}

interface ApiStats {
  totalOrders?: number;
  newOrders?: number;
  packedOrders?: number;
  completedOrders?: number;
  totalRevenue?: number;
}

interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    stats?: ApiStats;
    orders?: ApiSelfPickupOrder[];
    [key: string]: unknown;
  };
  pagination?: ApiPagination;
}

// Table order type for internal use
interface TableOrder {
  id: number | string;
  userId: number;
  userName: string;
  sellerId: number;
  sellerName: string;
  mobile: string;
  total: number;
  additionalCharges: number;
  walletUsed: number;
  finalTotal: number;
  paymentMethod: string;
  status: string;
  orderDate: string;
}

const SelfPickupOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const { mutate: bulkTransition, isPending: isBulkTransitioning } = useBulkTransitionOrders();
  const { mutateAsync: generatePickingList, isPending: isGeneratingPickingList } = useGeneratePickingList();

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [currentPage, itemsPerPage, selectedStatus, dateFilter]);

  const handleBulkAction = (status: string) => {
    if (selectedOrderIds.length === 0) return;
    bulkTransition(
      { orderIds: selectedOrderIds, status },
      {
        onSuccess: () => {
          setSelectedOrderIds([]);
        },
      }
    );
  };

  const handlePrintPickingList = async () => {
    if (selectedOrderIds.length === 0) return;
    try {
      const res = await generatePickingList({ orderIds: selectedOrderIds });
      const pickList = res?.data;
      if (!pickList || !pickList.pickLines || pickList.pickLines.length === 0) {
        toast.error("No picking lines found");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const linesHtml = pickList.pickLines.map((line: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: 600; color: #1e293b; text-align: left;">${line.productName}</td>
          <td style="padding: 12px; font-family: monospace; color: #475569; text-align: left;">${line.sku}</td>
          <td style="padding: 12px; font-family: monospace; color: #475569; text-align: left;">${line.barcode}</td>
          <td style="padding: 12px; font-weight: 700; color: #4f46e5; text-align: center;">${line.quantity}</td>
          <td style="padding: 12px; font-weight: 600; color: #10b981; text-align: right;">${line.shelfLocation}</td>
        </tr>
      `).join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Consolidated Picking List - ${pickList.warehouseName}</title>
            <style>
              body { font-family: 'Outfit', 'Inter', sans-serif; padding: 40px; color: #334155; }
              .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: 800; color: #1e1b4b; }
              .meta { text-align: right; font-size: 13px; color: #64748b; line-height: 1.5; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #f8fafc; padding: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">CONSOLIDATED PICKING LIST</div>
                <div style="font-weight: 600; color: #4f46e5; margin-top: 4px;">${pickList.warehouseName}</div>
              </div>
              <div class="meta">
                <div>Generated: ${new Date(pickList.generatedAt).toLocaleString('en-IN')}</div>
                <div>Orders Selected: ${selectedOrderIds.length}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Product Name</th>
                  <th style="text-align: left;">SKU</th>
                  <th style="text-align: left;">Barcode</th>
                  <th style="text-align: center;">Pick Qty</th>
                  <th style="text-align: right;">Shelf Location</th>
                </tr>
              </thead>
              <tbody>
                ${linesHtml}
              </tbody>
            </table>
            <div style="margin-top: 40px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background-color: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px -1px rgb(79 70 229 / 0.1);">
                Print Document
              </button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate picking list");
    }
  };

  // Use API hook with filters
  const { data, isLoading, refetch } = useGetPickupOrders({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    status: selectedStatus === "all" ? "" : selectedStatus,
    dateFilter: dateFilter,
  });

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    // Optionally, add tab focus as well:
    const onFocus = () => {
      if (refetch) {
        refetch();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;

  const orders: ApiSelfPickupOrder[] = useMemo(
    () => apiData?.data?.orders || [],
    [apiData?.data?.orders]
  );

  const pagination: ApiPagination = apiData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Transform API orders to table format
  const tableOrders: TableOrder[] = useMemo(() => {
    return orders.map((order) => ({
      id: order.id,

  userId: order.consumer?.id || 0,
    userName: order.consumer?.name || "N/A",
     mobile: order.consumer?.phone || "N/A",

      sellerId: order.sellerId || order.vendorId || 0,
      sellerName: order.sellerName || order.vendorName || "N/A",

  total: order.totalAmount || 0,
    additionalCharges: order.deliveryCharge || 0,
      walletUsed: order.walletUsed || 0,
  finalTotal: order.totalAmount || 0,

   paymentMethod: order.payment?.method || "N/A",
      status: order.status || "pending",
        orderDate: order.createdAt || new Date().toISOString(),
    }));
  }, [orders]);

  // Client-side sorting (if needed)
  const sortedOrders: TableOrder[] = useMemo(() => {
    if (!sortField || !sortDirection) {
      return tableOrders;
    }

    return [...tableOrders].sort((a: TableOrder, b: TableOrder) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "id":
          aValue = typeof a.id === "string" ? parseInt(a.id) || 0 : a.id;
          bValue = typeof b.id === "string" ? parseInt(b.id) || 0 : b.id;
          break;
        case "userName":
          aValue = a.userName.toLowerCase();
          bValue = b.userName.toLowerCase();
          break;
        case "paymentMethod":
          aValue = a.paymentMethod.toLowerCase();
          bValue = b.paymentMethod.toLowerCase();
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "orderDate":
          aValue = new Date(a.orderDate).getTime();
          bValue = new Date(b.orderDate).getTime();
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
  }, [tableOrders, sortField, sortDirection]);

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
    setSelectedStatus("");
    setDateFilter("");
    setCurrentPage(1);
  };

  // Calculate KPI metrics from API stats or fallback to orders data
  const kpiData = useMemo(() => {
    const stats = apiData?.data?.stats;
    const allOrders = orders;

    const totalOrders = stats?.totalOrders || allOrders.length;
    const newOrders =
      stats?.newOrders ||
      allOrders.filter(
        (o) =>
          o.status?.toLowerCase() === "pending" ||
          o.status?.toLowerCase() === "confirmed"
      ).length;
    const packedOrders =
      stats?.packedOrders ||
      allOrders.filter((o) => o.status?.toLowerCase() === "ready").length;
    const completedOrders =
      stats?.completedOrders ||
      allOrders.filter((o) => o.status?.toLowerCase() === "picked").length;
    const totalRevenue =
      stats?.totalRevenue ||
      allOrders.reduce(
        (sum, o) => sum + (o.finalTotal || o.total || 0),
        0
      );

    return [
      {
        title: "Total Orders",
        value: totalOrders.toLocaleString(),
        icon: Package,
        variant: "purple" as const,
      },
      {
        title: "New Orders",
        value: newOrders.toLocaleString(),
        icon: Package,
        variant: "yellow" as const,
      },
      {
        title: "Packed Orders",
        value: packedOrders.toLocaleString(),
        icon: Package,
        variant: "green" as const,
      },
      {
        title: "Completed Orders",
        value: completedOrders.toLocaleString(),
        icon: Package,
        variant: "red" as const,
      },
      {
        title: "Total Reve",
        value: formatCurrency(totalRevenue),
        icon: Wallet,
        variant: "purple" as const,
      },
    ];
  }, [apiData?.data?.stats, orders]);

  // Get status display and color
 const getStatusDisplay = (status: string) => {
  const statusLower = status.toLowerCase();

  switch (statusLower) {
    case "placed":
      return "Placed";

    case "confirmed":
      return "Confirmed";

    case "processing":
      return "Processing";

    case "ready_for_pickup":
      return "Ready For Pickup";

    case "delivered":
      return "Delivered";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
};

 const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();

  switch (statusLower) {
    case "placed":
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";

    case "confirmed":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";

    case "processing":
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";

    case "ready_for_pickup":
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";

    case "delivered":
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";

    case "cancelled":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

  // Table columns
  const columns = [
    {
      key: "select",
      label: (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={tableOrders.length > 0 && selectedOrderIds.length === tableOrders.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedOrderIds(tableOrders.map(o => o.id.toString()));
              } else {
                setSelectedOrderIds([]);
              }
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          />
        </div>
      ),
      sortable: false,
      render: (order: TableOrder) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedOrderIds.includes(order.id.toString())}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedOrderIds(prev => [...prev, order.id.toString()]);
              } else {
                setSelectedOrderIds(prev => prev.filter(id => id !== order.id.toString()));
              }
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          />
        </div>
      ),
    },
    {
      key: "id",
      label: "Order id",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {typeof order.id === "string"
              ? order.id.slice(0, 8)
              : order.id}
          </span>
        </div>
      ),
    },
    {
      key: "userName",
      label: "USER",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <div className="text-xs sm:text-sm text-gray-800">
            {order.userName}
          </div>
          <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
            {order.mobile}
          </div>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "PAYMENT METHOD",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {order.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (order: TableOrder) => {
        const statusDisplay = getStatusDisplay(order.status);

        return (
          <div className="text-center">
            <span
              className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full font-medium ${getStatusColor(
                order.status
              )}`}
            >
              {statusDisplay}
            </span>
          </div>
        );
      },
    },
    {
      key: "orderDate",
      label: "DATE AND TIME",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatDate(order.orderDate, "DD-MM-YYYY, HH:mm A")}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (order: TableOrder) => (
        <div className="flex items-center justify-center">
          <ViewIconButton
            onClick={() => navigate(`/self-pickup-orders/view/${order.id}`)}
            size={14}
            tooltip="View"
            className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
          Self Pickup Orders
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
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full sm:w-auto overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* Date Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[120px] sm:w-[130px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Date" },
                  { value: "today", label: "Today" },
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[140px] sm:w-[150px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Status" },
                  { value: "placed", label: "Placed" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "processing", label: "Processing" },
                  { value: "ready_for_pickup", label: "Ready For Pickup" },
                  { value: "delivered", label: "Delivered" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400 w-full sm:w-auto justify-center"
            >
              <RotateCcw
                size={14}
                className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400"
              />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={sortedOrders}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(order) =>
              typeof order.id === "string" ? order.id : order.id.toString()
            }
            emptyMessage="No orders found"
            loading={isLoading}
          />
        </div>

        {/* Pagination */}
        {sortedOrders.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
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
                <span className="text-gray-600 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, pagination.total)} of{" "}
                  {pagination.total}
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  pagination={pagination}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/50 rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4 sm:gap-6 shadow-2xl z-50 max-w-[90%] sm:max-w-2xl text-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs font-bold font-mono">
              {selectedOrderIds.length}
            </span>
            <span className="text-sm font-semibold text-slate-200">
              orders selected
            </span>
          </div>

          <div className="h-6 w-px bg-slate-700/50 hidden sm:block" />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkAction("CONFIRMED")}
              disabled={isBulkTransitioning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <span>{isBulkTransitioning ? "Accepting..." : "Bulk Accept"}</span>
            </button>

            <button
              onClick={() => handleBulkAction("PROCESSING")}
              disabled={isBulkTransitioning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <span>{isBulkTransitioning ? "Packing..." : "Bulk Pack"}</span>
            </button>

            <button
              onClick={handlePrintPickingList}
              disabled={isGeneratingPickingList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <span>{isGeneratingPickingList ? "Compiling..." : "Print Picking Sheet"}</span>
            </button>

            <button
              onClick={() => setSelectedOrderIds([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfPickupOrders;
