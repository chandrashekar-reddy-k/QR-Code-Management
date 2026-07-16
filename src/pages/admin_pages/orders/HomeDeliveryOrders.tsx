import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Filter, ChevronDown, RotateCcw } from "lucide-react";
import {
  SearchInput,
  SelectInput,
  DataTable,
  Pagination,
  ViewIconButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatDate } from "../../../utils/formatters";
import { useGetDeliveryOrders, useBulkTransitionOrders, useGeneratePickingList } from "../../../hooks/order";
import { useGetRouteMaps, type RouteMapItem } from "../../../hooks/deliverySettings";
import { toast } from "react-toastify";

// Interface for Home Delivery Order from API
interface ApiConsumer {
  id: string;
  name: string;
  phone: string;
}

interface ApiAddress {
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

interface ApiPayment {
  status: string;
  method: string;
}

interface ApiHomeDeliveryOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryCharge: number;
  discount: number;
  createdAt: string;
  consumer: ApiConsumer;
  address: ApiAddress;
  agentId: string | null;
  payment?: ApiPayment; 
  [key: string]: unknown;
}

interface ApiStatusCounts {
  PENDING?: number;
  CONFIRMED?: number;
  PROCESSING?: number;
  READY_FOR_PICKUP?: number;
  OUT_FOR_DELIVERY?: number;
  RETURN_INITIATED?: number;
  PICKED_UP?: number;
  IN_TRANSIT?: number;
  DELIVERED?: number;
  CANCELLED?: number;
  FAILED?: number;
  RETURNED?: number;
  [key: string]: number | undefined;
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
    orders: ApiHomeDeliveryOrder[];
    statusCounts: ApiStatusCounts;
    [key: string]: unknown;
  };
  pagination: ApiPagination;
}

// Table order type for internal use
interface TableOrder {
  id: string;
  userId: number;
  userName: string;
  mobile: string;
  deliveryAddress: string;
  PaymentMethod: string;
  deliveryPartner: string | null;
  deliveryType: string;
  status: string;
  paymentStatus: string;
  orderDate: string;
}

const HomeDeliveryOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string>("");
  const [cartTypeFilter, setCartTypeFilter] = useState<string>("");
  const [routeFilter, setRouteFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const { mutate: bulkTransition, isPending: isBulkTransitioning } = useBulkTransitionOrders();
  const { mutateAsync: generatePickingList, isPending: isGeneratingPickingList } = useGeneratePickingList();

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [currentPage, itemsPerPage, statusFilter, dateFilter, deliveryTypeFilter, cartTypeFilter, routeFilter]);

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

  // Restore pagination from URL query (e.g. ?page=3&limit=10)
  useEffect(() => {
    const pageParam = Number(searchParams.get("page") || "1");
    const limitParam = Number(searchParams.get("limit") || "10");
    if (Number.isFinite(pageParam) && pageParam > 0 && pageParam !== currentPage) {
      setCurrentPage(pageParam);
    }
    if (Number.isFinite(limitParam) && limitParam > 0 && limitParam !== itemsPerPage) {
      setItemsPerPage(limitParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep pagination in URL so view/back preserves current page.
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(currentPage));
      next.set("limit", String(itemsPerPage));
      return next;
    });
  }, [currentPage, itemsPerPage, setSearchParams]);

  // Use API hook with filters
  const { data, isLoading, refetch } = useGetDeliveryOrders({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    status: statusFilter,
    dateFilter: dateFilter,
    deliveryType: deliveryTypeFilter,
    cartType: cartTypeFilter,
    routeMapId: deliveryTypeFilter === "scheduled" ? routeFilter : "",
  });

  // Load route maps when Scheduled delivery is selected
  const { data: routeMapsRes } = useGetRouteMaps({
    page: 1,
    limit: 200,
    enabled: deliveryTypeFilter === "scheduled",
  });

  const routeMapList: RouteMapItem[] = useMemo(() => {
    const raw = routeMapsRes?.data;
    if (Array.isArray(raw)) return raw as RouteMapItem[];
    if (raw && typeof raw === "object" && "routeMaps" in raw) {
      return ((raw as { routeMaps?: RouteMapItem[] }).routeMaps ?? []) as RouteMapItem[];
    }
    return [];
  }, [routeMapsRes?.data]);

  // When delivery type is changed away from SCHEDULED, clear route filter
  useEffect(() => {
    if (deliveryTypeFilter !== "scheduled" && routeFilter) {
      setRouteFilter("");
    }
  }, [deliveryTypeFilter, routeFilter]);

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

  const orders: ApiHomeDeliveryOrder[] = useMemo(
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

  // Apply client-side date filter on createdAt
  const filteredOrdersByDate: ApiHomeDeliveryOrder[] = useMemo(() => {
    if (!dateFilter) return orders;

    const now = new Date();

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (Number.isNaN(orderDate.getTime())) return false;

      switch (dateFilter) {
        case "today": {
          return (
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getDate() === now.getDate()
          );
        }
        case "week": {
          const diffMs = now.getTime() - orderDate.getTime();
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          return diffMs >= 0 && diffMs <= sevenDaysMs;
        }
        case "month": {
          return (
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth()
          );
        }
        default:
          return true;
      }
    });
  }, [orders, dateFilter]);

  // Transform API orders to table format
  const tableOrders: TableOrder[] = useMemo(() => {
    return filteredOrdersByDate.map((order) => {
      // Format address
      const addressParts = [
        order.address?.line1,
        order.address?.city,
        order.address?.state,
        order.address?.pincode,
      ].filter(Boolean);
      const deliveryAddress = addressParts.length > 0 
        ? addressParts.join(", ") 
        : "N/A";

      return {
        id: order.id,
        userId: order.consumer?.id ? parseInt(order.consumer.id.slice(0, 8), 16) || 0 : 0,
        userName: order.consumer?.name || "N/A",
        mobile: order.consumer?.phone || "N/A",
        deliveryAddress: deliveryAddress,
        PaymentMethod: order.payment?.method || "N/A",// Payment method not in API response
        deliveryPartner: order.agentId ? "Assigned" : null,
        deliveryType: (order as { deliveryType?: string })?.deliveryType || "N/A",
        status: order.payment?.status === "REFUNDED" 
          ? "REFUNDED" 
          : order.payment?.status === "REFUND_PENDING" 
            ? "REFUND_PENDING" 
            : (order.status || "PENDING"),
        paymentStatus: order.payment?.status || "N/A",
        orderDate: order.createdAt || new Date().toISOString(),
      };
    });
  }, [filteredOrdersByDate]);

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
          // Compare as strings for UUID
          aValue = a.id;
          bValue = b.id;
          break;
        case "userName":
          aValue = a.userName.toLowerCase();
          bValue = b.userName.toLowerCase();
          break;
        case "deliveryAddress":
          aValue = a.deliveryAddress.toLowerCase();
          bValue = b.deliveryAddress.toLowerCase();
          break;
        case "PaymentMethod":
          aValue = a.PaymentMethod.toLowerCase();
          bValue = b.PaymentMethod.toLowerCase();
          break;
        case "deliveryPartner":
          aValue = (a.deliveryPartner || "").toLowerCase();
          bValue = (b.deliveryPartner || "").toLowerCase();
          break;
        case "deliveryType":
          aValue = a.deliveryType.toLowerCase();
          bValue = b.deliveryType.toLowerCase();
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
    setStatusFilter("");
    setDateFilter("");
    setDeliveryTypeFilter("");
    setCartTypeFilter("");
    setRouteFilter("");
    setCurrentPage(1);
  };


  // Get status badge color
  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === "PENDING") {
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200";
    }
    if (statusUpper === "CONFIRMED") {
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
    }
    if (statusUpper === "PROCESSING") {
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
    }
    if (statusUpper === "READY_FOR_PICKUP") {
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
    }
    if (statusUpper === "OUT_FOR_DELIVERY" || statusUpper === "ASSIGNED_TO_AGENT") {
      return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300";
    }
    if (statusUpper === "RETURN_INITIATED") {
      return "bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200";
    }
    if (statusUpper === "PICKED_UP") {
      return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300";
    }
    if (statusUpper === "IN_TRANSIT") {
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
    }
    if (statusUpper === "DELIVERED") {
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
    }
    if (statusUpper === "CANCELLED" || statusUpper === "CANCELED") {
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
    }
    if (statusUpper === "FAILED") {
      return "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200";
    }
    if (statusUpper === "RETURNED") {
      return "bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200";
    }
    if (statusUpper === "REFUNDED") {
      return "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-300";
    }
    if (statusUpper === "REFUND_PENDING") {
      return "bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300";
    }
    return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200";
  };

  // Format status for display
  const formatStatus = (status: string) => {
    const statusUpper = status.toUpperCase();
    const statusMap: Record<string, string> = {
      PENDING: "Pending",
      CONFIRMED: "Confirmed",
      PROCESSING: "Processing",
      READY_FOR_PICKUP: "Ready for Pickup",
      OUT_FOR_DELIVERY: "Out for Delivery",
      RETURN_INITIATED: "Return Initiated",
      ASSIGNED_TO_AGENT: "Out for Delivery",
      PICKED_UP: "Picked Up",
      IN_TRANSIT: "In Transit",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
      CANCELED: "Cancelled",
      FAILED: "Failed",
      RETURNED: "Returned",
      REFUNDED: "Refunded",
      REFUND_PENDING: "Refund Pending",
    };
    return statusMap[statusUpper] || status;
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
                setSelectedOrderIds(tableOrders.map(o => o.id));
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
            checked={selectedOrderIds.includes(order.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedOrderIds(prev => [...prev, order.id]);
              } else {
                setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
              }
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          />
        </div>
      ),
    },
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
            {order.id.slice(0, 8)}
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
          <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {order.userName}
          </div>
          <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
            {order.mobile}
          </div>
        </div>
      ),
    },
    {
      key: "deliveryAddress",
      label: "DELIVERY ADRESS",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {order.deliveryAddress}
          </span>
        </div>
      ),
    },
    {
      key: "PaymentMethod",
      label: "P.METHOD",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {order.PaymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: "deliveryPartner",
      label: "DELIVERY PARTNER",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {order.deliveryPartner || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "deliveryType",
      label: "DELIVERY TYPE",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {order.deliveryType}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span
            className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full font-medium ${getStatusColor(
              order.status
            )}`}
          >
            {formatStatus(order.status)}
          </span>
        </div>
      ),
    },
    {
      key: "orderDate",
      label: "DATE AND TIME",
      sortable: true,
      render: (order: TableOrder) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {formatDate(order.orderDate, "DD-MM-YYYY, HH:mm A")}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTION",
      sortable: false,
      render: (order: TableOrder) => (
        <div className="flex items-center justify-center">
          <ViewIconButton
            onClick={() =>
              navigate(
                `/home-delivery-orders/view/${order.id}?page=${currentPage}&limit=${itemsPerPage}`
              )
            }
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
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Home Delivery Orders
        </h1>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
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
      </div> */}

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full sm:w-auto overflow-x-auto">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[140px] sm:w-[150px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Status" },
                  { value: "PLACED", label: "Placed" },
                  { value: "CONFIRMED", label: "Confirmed" },
                  { value: "PROCESSING", label: "Processing" },
                  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
                   { value: "PICKED_UP", label: "Picked Up" },
                  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
                  // { value: "RETURN_INITIATED", label: "Return Initiated" },
        
                  { value: "IN_TRANSIT", label: "In Transit" },
                  { value: "DELIVERED", label: "Delivered" },
                  { value: "CANCELLED", label: "Cancelled" },
                  // { value: "FAILED", label: "Failed" },
                  { value: "RETURNED", label: "Returned" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
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
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Delivery Type Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={deliveryTypeFilter}
                onChange={(e) => {
                  setDeliveryTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Delivery Type" },
                  { value: "scheduled", label: "Scheduled" },
                  // { value: "express", label: "Express" },
                  { value: "fast", label: "Fast" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Route Filter - only visible for Scheduled delivery type */}
          {deliveryTypeFilter === "scheduled" && (
            <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
              <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                <SelectInput
                  value={routeFilter}
                  onChange={(e) => {
                    setRouteFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "", label: "Route" },
                    ...routeMapList.map((rm) => ({
                      value: String(rm.id),
                      label: rm.area,
                    })),
                  ]}
                />
              </div>
              <ChevronDown
                size={16}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
              />
            </div>
          )}

          {/* Cart Type Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={cartTypeFilter}
                onChange={(e) => {
                  setCartTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Cart Type" },
                  { value: "single", label: "Single Cart" },
                  { value: "group", label: "Group Cart" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={sortedOrders}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(order) => order.id}
            emptyMessage="No orders found"
            loading={isLoading}
          />
        </div>

        {/* Pagination */}
        {sortedOrders.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
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
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
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

export default HomeDeliveryOrders;
