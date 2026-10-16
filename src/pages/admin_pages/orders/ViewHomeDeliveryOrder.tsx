import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Phone, MapPin, ChevronDown, Search, FileText, Printer } from "lucide-react";
import fetchData from "../../../helper";
import api from "../../../api/axios";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { formatDate, formatCurrency } from "../../../utils/formatters";
import { generateInvoicePDF, getInvoiceNumber } from "../../../utils/generateInvoicePDF";
import { printThermalReceipt } from "../../../utils/printThermalReceipt";
import {
  Button,
  SelectInput,
  Modal,
  SearchInput,
} from "../../../components/ui";
import {
  useGetOrderById,
  useUpdateOrderStatus,
  useGetDeliveryAgents,
  useAssignDeliveryAgent,
  OrderStatus,
  type DeliveryAgent,
  type PartnerPutOrderStatus,
} from "../../../hooks/order";
import { OmsStepper } from "../../../components/oms/OmsStepper";
import { AuditTrailViewer } from "../../../components/oms/AuditTrailViewer";

// Interface for API Response
interface ApiConsumer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface ApiAddress {
  id: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  location?: {
    lat: number;
    lng: number;
    label?: string;
  } | null;
}

interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  images: string[];
  price: number;
  mrp: number;
}

interface ApiOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  product: ApiProduct;
  [key: string]: unknown;
}

interface ApiOrderData {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryCharge: number;
  discount: number;
  deliveryDate?: string | null;
  specialInstructions?: string | null;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  agentId?: string | null;
  consumer: ApiConsumer;
  address: ApiAddress;
  items: ApiOrderItem[];
  payment?: unknown | null;
  delivery?: unknown | null;
  assignedShopkeeperId?: string | null;
  assignedShopkeeper?: { name: string } | null;
  [key: string]: unknown;
}

interface ApiOrderResponse {
  status: boolean;
  response: string;
  data?: ApiOrderData;
}

// Interface for Home Delivery Order View
interface HomeDeliveryOrderView {
  id: string;
  orderNumber?: string;
  userId: number;
  userName: string;
  mobile: string;
  deliveryAddress: string;
  orderDate: string;
  deliveryDate: string | null;   // scheduled
  deliveredAt?: string | null;   // actual delivered
  paymentMethod: string;
  paymentStatus: string;
  status: OrderStatus;
  deliveryAgent?: string | null;
  specialInstructions?: string | null;
  products: {
    id: string;
    name: string;
    variant: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  subtotal: number;
  deliveryCharges: number;
  additionalCharges: number;
  taxAmount: number;
  couponDiscount?: number;
  couponCode?: string | null;
  discount?: number;
  finalTotal: number;
  assignedShopkeeperId?: string | null;
  shopkeeper_name?: string | null;
  orderReturnHistory?: any[];
  refundTransactions?: any[];
}

// Helper to get user-friendly label from enum
const getStatusLabel = (status: OrderStatus | string): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return "Pending (Awaiting Approval)";
    case OrderStatus.PLACED:
      return "Placed";
    case OrderStatus.CONFIRMED:
      return "Confirmed";
    case "ACCEPTED":
      return "Accepted";
    case "PICKING":
      return "Picking";
    case "PACKING":
      return "Packing";
    case OrderStatus.PROCESSING:
      return "Processing";
    case OrderStatus.READY_FOR_PICKUP:
      return "Ready for Pickup";
    case OrderStatus.OUT_FOR_DELIVERY:
      return "Out for Delivery";
    case OrderStatus.PICKED_UP:
      return "Picked Up";
    case OrderStatus.IN_TRANSIT:
      return "In Transit";
    case OrderStatus.RETURN_INITIATED:
      return "Return Initiated";
    case OrderStatus.DELIVERED:
      return "Delivered";
    case OrderStatus.CANCELLED:
      return "Cancelled";
    case OrderStatus.RETURNED:
      return "Returned";
    case OrderStatus.FAILED:
      return "Failed";
    default:
      return status;
  }
};

/**
 * Dynamic allowed transitions map — mirrors backend PARTNER_ALLOWED_TRANSITIONS.
 * Only forward / valid transitions are listed; backward transitions are impossible.
 */
const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING]:          [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.PLACED]:           [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]:        [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]:       [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.RETURN_INITIATED, OrderStatus.CANCELLED],
  [OrderStatus.IN_TRANSIT]:       [OrderStatus.DELIVERED, OrderStatus.RETURN_INITIATED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]:        [OrderStatus.RETURN_INITIATED],
  [OrderStatus.RETURN_INITIATED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]:        [],
  [OrderStatus.RETURNED]:         [],
  [OrderStatus.FAILED]:           [OrderStatus.RETURN_INITIATED],
};

/**
 * UI-derived statuses (ACCEPTED, PICKING, PACKING) are display-only.
 * Map them back to the real API status for transition lookup.
 */
const resolveApiStatus = (uiStatus: OrderStatus | string): string => {
  switch (uiStatus) {
    case "ACCEPTED":  return OrderStatus.CONFIRMED;
    case "PICKING":   return OrderStatus.PROCESSING;
    case "PACKING":   return OrderStatus.PROCESSING;
    default:          return uiStatus;
  }
};

/** Get allowed next statuses for a given (potentially UI-derived) status */
const getAllowedNextStatuses = (currentStatus: OrderStatus | string): OrderStatus[] => {
  const apiStatus = resolveApiStatus(currentStatus);
  return ALLOWED_TRANSITIONS[apiStatus] || [];
};

/** Get the primary (happy-path) next status */
const getNextStatus = (status: OrderStatus): OrderStatus | null => {
  const allowed = getAllowedNextStatuses(status);
  // Return the first non-cancel option, or null if terminal
  return allowed.find(s => s !== OrderStatus.CANCELLED && s !== OrderStatus.FAILED) || null;
};

const ViewHomeDeliveryOrder = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data, isLoading } = useGetOrderById(id, { refetchInterval: 5000 });
  const { data: agentsData, isLoading: isLoadingAgents } = useGetDeliveryAgents();
  const updateStatusMutation = useUpdateOrderStatus(id);
  const assignAgentMutation = useAssignDeliveryAgent(id);
  const [order, setOrder] = useState<HomeDeliveryOrderView | null>(null);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [shopkeepers, setShopkeepers] = useState<any[]>([]);
  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState<string | undefined>(undefined);
  const [isAllocatingShopkeeper, setIsAllocatingShopkeeper] = useState(false);

  useEffect(() => {
    const fetchShopkeepers = async () => {
      try {
        const res = await api.get("/shopkeepers");
        const list = Array.isArray(res.data) ? res.data : (res.data?.data && Array.isArray(res.data.data)) ? res.data.data : [];
        setShopkeepers(list);
      } catch (err) {
        console.error("Failed to fetch shopkeepers", err);
      }
    };
    fetchShopkeepers();
  }, []);

  const handleAllocateShopkeeper = async () => {
    if (!selectedShopkeeperId) return;
    setIsAllocatingShopkeeper(true);
    try {
      await api.post(`/orders/${id}/allocate-shopkeeper`, {
        shopkeeperId: selectedShopkeeperId,
      });
      window.location.reload();
    } catch (err) {
      console.error("Failed to allocate shopkeeper", err);
    } finally {
      setIsAllocatingShopkeeper(false);
    }
  };

  // Get delivery agents from API
  const deliveryAgents: DeliveryAgent[] = useMemo(() => {
    return agentsData?.data || [];
  }, [agentsData]);

  // Transform API data to component format
  const transformedOrder = useMemo(() => {
    const apiData = data as ApiOrderResponse | undefined;
    const orderData = apiData?.data;

    if (!orderData) return null;

    // Transform items to products format
    const transformedProducts = (orderData.items || []).map((item) => {
      const prod = item.product || {};
      const unitP = Number(item.unitPrice || 0);
      const prodP = Number(prod.sellingPrice || prod.finalPrice || prod.price || 0);
      const sellingP = unitP > 0 ? unitP : (prodP > 0 ? prodP : Number(item.totalPrice || 0) / (item.quantity || 1));
      const mrpP = Number(item.mrp || prod.mrp || sellingP);
      const gstVal = Number(item.gst || item.taxRate || prod.gst || prod.taxRate || 0);
      return {
        ...item,
        id: item.id || item.productId || "",
        productId: item.productId,
        name: prod.name || item.name || (item as any).productName || "Product",
        variant: item.unit || prod.unit || "N/A",
        quantity: item.quantity || 1,
        qty: item.quantity || 1,
        unitPrice: sellingP,
        price: sellingP,
        sellingPrice: sellingP,
        mrp: mrpP,
        gst: gstVal,
        taxRate: gstVal,
        taxAmount: item.taxAmount,
        cgst: item.cgst,
        sgst: item.sgst,
        image: prod.images?.[0] || "",
        product: prod,
      };
    });

    // Format address
    const addressParts = [
      orderData.address?.line1,
      orderData.address?.line2,
      orderData.address?.city,
      orderData.address?.state,
      orderData.address?.pincode,
    ].filter(Boolean);
    const deliveryAddress = addressParts.length > 0
      ? addressParts.join(", ")
      : "N/A";

    // Calculate subtotal (totalAmount - deliveryCharge - discount)
    const subtotal = orderData.totalAmount - (orderData.deliveryCharge || 0) - (orderData.discount || 0);

    // Find agent name from deliveryAgents list using agentId or assignment snapshot
    const assignedAgent = orderData.agentId
      ? deliveryAgents.find((agent) => agent.id === orderData.agentId)
      : null;
    const agentName = assignedAgent?.name || (orderData as any).assignment?.agent?.name || (orderData as any).agent?.name || (orderData.agentId ? `Agent (${String(orderData.agentId).slice(0, 8)})` : null);

    // Payment method and status mapping
    let paymentMethod = (orderData as any).paymentMethod || "N/A";
    let paymentStatus = (orderData as any).paymentStatus || "N/A";
    if (orderData.payment && typeof orderData.payment === "object") {
      const payment = orderData.payment as { method?: string; status?: string };

      if (payment.method) {
        paymentMethod = payment.method;
      }

      if (payment.status) {
        paymentStatus = payment.status; // direct API value
      }
    }

    const isDeliveredStatus = ((orderData as any).status || "").toUpperCase() === "DELIVERED";
    const isCodMethod = (paymentMethod || "").toUpperCase() === "COD";

    // If order is delivered and payment method is COD, payment is collected upon delivery -> Successful / SUCCESS
    if (isDeliveredStatus && isCodMethod && (paymentStatus === "PENDING" || paymentStatus === "N/A" || !paymentStatus)) {
      paymentStatus = "SUCCESS";
    }

    return {
      id: orderData.id || id || "",
      orderNumber: orderData.orderNumber,
      userId: orderData.consumer?.id
        ? parseInt(orderData.consumer.id.slice(0, 8), 16) || 0
        : 0,
      userName: orderData.consumer?.name || "N/A",
      mobile: orderData.consumer?.phone || "N/A",
      deliveryAddress: deliveryAddress,
      orderDate: orderData.createdAt || new Date().toISOString(),
      deliveryDate: orderData.deliveryDate || null,
      deliveredAt: orderData.deliveredAt || null,
      paymentMethod,
      paymentStatus,
      status: (() => {
        const rawStatus = ((orderData as any).status || "").toUpperCase();
        const isAcceptedBySk = Boolean(
          (orderData as any).shopkeeperAcceptedAt ||
          (orderData as any).acceptedByShopkeeperAt ||
          (orderData as any).allocationStatus === "Accepted"
        );
        if (rawStatus === "CONFIRMED" && isAcceptedBySk) return "ACCEPTED" as OrderStatus;
        if (rawStatus === "PROCESSING") {
          if ((orderData as any).pickingCompletedAt || (orderData as any).packingStartedAt) return "PACKING" as OrderStatus;
          return "PICKING" as OrderStatus;
        }
        return (orderData.status as OrderStatus) || OrderStatus.PLACED;
      })(),
      deliveryAgent: agentName,
      specialInstructions: orderData.specialInstructions || null,
      products: transformedProducts,
      items: transformedProducts,
      totalAmount: orderData.totalAmount || 0,
      subtotal: subtotal,
      deliveryCharges: orderData.deliveryCharge || 0,
      additionalCharges: 0, // Not in API response
      taxAmount: orderData.taxAmount || 0,
      couponDiscount: Number(orderData.couponDiscount || (orderData.couponCode ? orderData.discount : 0) || 0),
      couponCode: orderData.couponCode || null,
      discount: orderData.discount || 0,
      finalTotal: orderData.totalAmount || 0,
      assignedShopkeeperId: orderData.assignedShopkeeperId || null,
      shopkeeper_name: orderData.assignedShopkeeper?.name || null,
      orderReturnHistory: orderData.orderReturnHistory || [],
      refundTransactions: orderData.refundTransactions || [],
    } as HomeDeliveryOrderView;
  }, [data, id, deliveryAgents]);

  useEffect(() => {
    if (transformedOrder) {
      setOrder(transformedOrder);
      const nextStatus = getNextStatus(transformedOrder.status);
      setSelectedStatus(nextStatus || transformedOrder.status);
    }
  }, [transformedOrder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setStatusUpdateOpen(false);
      }
    };

    if (statusUpdateOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [statusUpdateOpen]);

  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [printingThermal, setPrintingThermal] = useState(false);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      setDownloadingInvoice(true);
      const apiOrder = (data as any)?.data || order;
      const pdf = await generateInvoicePDF(apiOrder as any);
      if (pdf) {
        pdf.save(`Invoice_VK-${getInvoiceNumber(apiOrder as any)}.pdf`);
      }
    } catch (err) {
      console.error("Error generating invoice PDF:", err);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handlePrintThermalReceipt = () => {
    if (!order) return;
    try {
      setPrintingThermal(true);
      const apiOrder = (data as any)?.data || order;
      printThermalReceipt(apiOrder as any);
    } catch (err) {
      console.error("Error printing thermal receipt:", err);
    } finally {
      setPrintingThermal(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !id) return;

    if (order?.status === OrderStatus.PROCESSING && selectedStatus === OrderStatus.READY_FOR_PICKUP) {
      const allPacked = order.products.every(p => packedItems[p.id]);
      if (!allPacked) {
        alert("Please verify and pack all items before setting status to Ready for Pickup!");
        return;
      }
    }

    const apiOrder = (data as any)?.data;
    const fulfillmentOrderId = apiOrder?.fulfillmentOrders?.[0]?.id;

    // Update status via API
    try {
      await updateStatusMutation.mutateAsync({
        status: selectedStatus as PartnerPutOrderStatus,
        fulfillmentOrderId,
      });
      setStatusUpdateOpen(false);
      // The order will be refetched automatically via query invalidation
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId || !id) return;

    try {
      await assignAgentMutation.mutateAsync({ agentId: selectedAgentId });
      setShowAssignAgentModal(false);
      setSelectedAgentId(null);
      setAgentSearchTerm("");
    } catch (error) {
      console.error("Error assigning delivery agent:", error);
    }
  };

  const filteredAgents = deliveryAgents.filter((agent) =>
    agent.name.toLowerCase().includes(agentSearchTerm.toLowerCase())
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PLACED:
        return "text-gray-600";
      case OrderStatus.CONFIRMED:
        return "text-blue-600 dark:text-blue-400";
      case OrderStatus.PROCESSING:
        return "text-yellow-600 dark:text-yellow-400";
      case OrderStatus.READY_FOR_PICKUP:
        return "text-purple-600 dark:text-purple-400";
      case OrderStatus.OUT_FOR_DELIVERY:
        return "text-indigo-600 dark:text-indigo-400";
      case OrderStatus.PICKED_UP:
        return "text-indigo-600 dark:text-indigo-400";
      case OrderStatus.IN_TRANSIT:
        return "text-orange-600 dark:text-orange-400";
      case OrderStatus.RETURN_INITIATED:
        return "text-orange-600 dark:text-orange-500";
      case OrderStatus.DELIVERED:
        return "text-green-600 dark:text-green-400";
      case OrderStatus.CANCELLED:
        return "text-red-600 dark:text-red-400";
      case OrderStatus.FAILED:
        return "text-red-700 dark:text-red-500";
      case OrderStatus.RETURNED:
        return "text-orange-600 dark:text-orange-500";
      default:
        return "text-gray-600";
    }
  };

  if (isLoading || !order) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const backToOrders = `/home-delivery-orders${pageParam || limitParam
    ? `?${new URLSearchParams(
      Object.fromEntries(
        Object.entries({
          ...(pageParam ? { page: pageParam } : {}),
          ...(limitParam ? { limit: limitParam } : {}),
        }).filter(([, v]) => Boolean(v))
      )
    ).toString()}`
    : ""}`;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
              {order.orderNumber || `Order ID #${order.id.slice(0, 8)}`}
            </h1>
            <Breadcrumbs />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              onClick={handlePrintThermalReceipt}
              disabled={printingThermal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Printer size={16} />
              {printingThermal ? "Printing..." : "Thermal Receipt"}
            </Button>
            <Button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <FileText size={16} />
              {downloadingInvoice ? "Generating..." : "Download Invoice PDF"}
            </Button>
            <BackButton to={backToOrders} />
          </div>
        </div>
      </div>

      {/* OMS Stepper */}
      <OmsStepper orderId={order.id} currentStatus={order.status} returnHistory={order.orderReturnHistory} refundTransactions={order.refundTransactions} paymentMethod={order.paymentMethod} />

      {/* Return & Refund Information */}
      {order.orderReturnHistory && order.orderReturnHistory.length > 0 && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                      <span className="material-icons">assignment_return</span> Return & Refund Information
                  </h2>
              </div>
              <div className="space-y-4">
                  {order.orderReturnHistory.map((returnEntry) => (
                      <div key={returnEntry.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-100 dark:border-red-900/30">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {formatDate(returnEntry.createdAt, "DD-MM-YYYY, HH:mm A")}
                                  </p>
                              </div>
                              <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                                  <p className={`text-sm font-bold ${returnEntry.toPhase === 'APPROVED' ? 'text-green-600' : returnEntry.toPhase === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}`}>
                                      {returnEntry.toPhase}
                                  </p>
                              </div>
                              <div className="col-span-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Reason</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {returnEntry.reason || "No reason provided"}
                                  </p>
                              </div>
                          </div>
                          {returnEntry.metadata && Array.isArray(returnEntry.metadata.items) && (
                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Returned Items</p>
                                  <div className="space-y-2">
                                      {returnEntry.metadata.items.map((item: any, idx: number) => {
                                          const product = order.products.find(p => p.id === item.orderItemId);
                                          return (
                                              <div key={idx} className="flex items-center justify-between text-sm">
                                                  <span className="text-gray-800 dark:text-gray-200 truncate pr-4">
                                                      {item.quantity}x {product?.name || 'Unknown Item'}
                                                  </span>
                                                  <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                      ₹{((product?.price || 0) * item.quantity).toFixed(2)}
                                                  </span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Order Information */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              Order Information
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {order.orderNumber && (
                <div className="flex flex-col sm:flex-row">
                  <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                    Order Number
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-gray-800">
                    {order.orderNumber}
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Order ID
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {order.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Current Status
                </span>
                <span
                  className={`px-3 py-1 text-xs rounded-full font-semibold ${
                    (order.status as string) === "PICKING"
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      : (order.status as string) === "PACKING"
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                      : (order.status as string) === "ACCEPTED"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Order Date
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {formatDate(order.orderDate, "DD-MM-YYYY, HH:mm A")}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Delivery Date & Time
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {order.deliveredAt
                    ? formatDate(order.deliveredAt, "DD-MM-YYYY, HH:mm A")
                    : "Not Delivered Yet"}
                </span>
              </div>
              {order.specialInstructions && (
                <div className="flex flex-col sm:flex-row">
                  <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                    Special Instructions
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-gray-800">
                    {order.specialInstructions}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Customer Information
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Call Customer"
                >
                  <Phone
                    size={16}
                    className="text-gray-700"
                  />
                </button>
                <button
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="View Location"
                >
                  <MapPin
                    size={16}
                    className="text-gray-700"
                  />
                </button>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  User ID
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {order.userId}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Name
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {order.userName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Mobile Number
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {order.mobile}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Address
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 flex-1 break-words">
                  {order.deliveryAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              Payment Method details
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Payment Type
                </span>
                <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                  {order.paymentMethod}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Payment Status
                </span>
                <span className={`text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-full w-fit ${
                  order.paymentStatus === "SUCCESS" || order.paymentStatus === "PAID"
                    ? "bg-green-100 text-green-700"
                    : order.paymentStatus === "REFUNDED" || order.paymentStatus === "REFUND_PENDING"
                    ? "bg-purple-100 text-purple-700"
                    : order.paymentStatus === "FAILED"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Shopkeeper Allocation - Conditional Rendering (Paid or Confirmed/Placed orders) */}
          {(order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PLACED || (order.status as string) === "PENDING") && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase">
                  Shopkeeper Allocation
                </h3>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">
                    {order.assignedShopkeeperId ? "Assigned Shopkeeper" : "Allocate to Shopkeeper"}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedShopkeeperId !== undefined ? selectedShopkeeperId : (order.assignedShopkeeperId || "")}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setSelectedShopkeeperId(val);
                        if (!val && order.assignedShopkeeperId) {
                          // Automatically trigger unassignment when empty option is selected
                          setIsAllocatingShopkeeper(true);
                          try {
                            await fetchData(`orders/${id}/allocate-shopkeeper`, "POST", {
                              shopkeeperId: "",
                            });
                            window.location.reload();
                          } catch (err) {
                            console.error("Failed to unallocate shopkeeper", err);
                          } finally {
                            setIsAllocatingShopkeeper(false);
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-xs text-gray-900"
                    >
                      <option value="">Select Shopkeeper...</option>
                      {shopkeepers.map((sk) => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name} ({sk.phone})
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAllocateShopkeeper}
                      variant={!selectedShopkeeperId && order.assignedShopkeeperId ? "secondary" : "primary"}
                      size="sm"
                      disabled={isAllocatingShopkeeper || (selectedShopkeeperId === (order.assignedShopkeeperId || ""))}
                    >
                      {isAllocatingShopkeeper 
                        ? "Allocating..." 
                        : !selectedShopkeeperId && order.assignedShopkeeperId 
                          ? "Unassign" 
                          : order.assignedShopkeeperId 
                            ? "Reassign" 
                            : "Allocate"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Status */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-gray-700 uppercase">
                    Current Status
                  </span>

                  <span
                    className={`text-sm sm:text-base font-semibold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="relative" ref={dropdownRef}>
                  {/* Dynamic Status Flow — only allowed forward transitions shown */}
                  {(() => {
                    const allowedNext = getAllowedNextStatuses(order.status);
                    const isTerminal = allowedNext.length === 0;

                    // Build dropdown options from allowed transitions only
                    const statusOptions = allowedNext.map((s) => ({
                      value: s,
                      label: s === OrderStatus.CONFIRMED
                        ? "Approve (Confirm)"
                        : s === OrderStatus.CANCELLED
                        ? "Reject (Cancel)"
                        : getStatusLabel(s),
                      disabled: false,
                    }));

                    return (
                      <>
                        <button
                          onClick={() => {
                            if (!isTerminal) {
                              setStatusUpdateOpen(!statusUpdateOpen);
                            }
                          }}
                          disabled={isTerminal}
                          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-xs sm:text-sm font-medium ${isTerminal
                            ? "bg-gray-100 border-gray-300 dark:border-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-green-50 dark:bg-green-900/20 border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                            }`}
                        >
                          Update Status
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${statusUpdateOpen ? "rotate-180" : ""
                              }`}
                          />
                        </button>
                        {statusUpdateOpen && (
                          <div className="absolute right-0 mt-2 w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="p-3">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Select Next Status
                              </label>
                              <SelectInput
                                value={selectedStatus}
                                onChange={(e) => {
                                  const val = e.target.value as OrderStatus | "";
                                  if (val) setSelectedStatus(val);
                                }}
                                options={statusOptions}
                                className="w-full text-xs mb-3"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleStatusUpdate}
                                  variant="primary"
                                  size="sm"
                                  className="flex-1"
                                  disabled={updateStatusMutation.isPending || !selectedStatus}
                                >
                                  {updateStatusMutation.isPending ? "Updating..." : "Update"}
                                </Button>
                                <Button
                                  onClick={() => setStatusUpdateOpen(false)}
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Agent - show assign dropdown only when Ready for Pickup; otherwise show assigned agent name as plain text */}
          {(order.status === OrderStatus.READY_FOR_PICKUP ||
            order.status === OrderStatus.OUT_FOR_DELIVERY ||
            order.deliveryAgent) && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    Delivery Agent :
                  </span>
                  {order.status === OrderStatus.READY_FOR_PICKUP ? (
                    <button
                      onClick={() => setShowAssignAgentModal(true)}
                      className="flex items-center justify-between gap-2 px-3 py-2 border border-green-500 dark:border-green-400 rounded-lg bg-white text-left w-full sm:w-auto min-w-[200px] hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="text-xs sm:text-sm text-gray-500">
                        {order.deliveryAgent || "Assign Delivery Agent"}
                      </span>
                      <ChevronDown
                        size={14}
                        className="text-gray-500"
                      />
                    </button>
                  ) : (
                    <span className="text-xs sm:text-sm text-gray-700">
                      {order.deliveryAgent || "-"}
                    </span>
                  )}
                </div>
              </div>
            )}

          {/* OMS Audit Trail */}
          <AuditTrailViewer orderId={order.id} />
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Products */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Products
              </h2>
              <span className="text-xs sm:text-sm text-gray-600">
                No. of Products:{" "}
                {order.products.length.toString().padStart(2, "0")}
              </span>
            </div>

            {/* Packing Progress */}
            {order.status === OrderStatus.PROCESSING && (
              <div className="mb-6 p-4 rounded-xl border border-yellow-250 bg-yellow-50/40 dark:border-yellow-900/30 dark:bg-yellow-950/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm font-semibold text-yellow-800 dark:text-yellow-400">
                    Packing Progress Verification
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-yellow-850 dark:text-yellow-405">
                    {order.products.filter(p => packedItems[p.id]).length} / {order.products.length} Packed
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-yellow-500 h-full transition-all duration-300"
                    style={{ width: `${(order.products.filter(p => packedItems[p.id]).length / order.products.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              {order.products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-100/50 rounded-xl gap-3"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {order.status === OrderStatus.PROCESSING && (
                      <input
                        type="checkbox"
                        checked={!!packedItems[product.id]}
                        onChange={() => setPackedItems(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                      />
                    )}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                        {product.variant}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    {/* Weight/Verifications */}
                    {order.status === OrderStatus.PROCESSING && packedItems[product.id] && (
                      <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded-md border border-green-205 dark:border-green-900/30">
                        {['KG', 'GRAM', 'LITRE'].some(u => (product.variant ?? '').toUpperCase().includes(u)) ? (
                          <>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Weight"
                              className="w-20 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-green-500 bg-white"
                              defaultValue={product.quantity}
                            />
                            <span className="text-[10px] text-green-700 dark:text-green-400 font-medium uppercase">
                              {product.variant} verified
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-green-700 dark:text-green-400 font-medium">
                            ✓ Count Verified
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="text-sm sm:text-base font-medium text-gray-900 whitespace-nowrap">
                        {product.quantity} × {formatCurrency(product.price)}
                      </div>

                      {order.status === OrderStatus.PROCESSING && (
                        <button
                          onClick={() => {
                            setPackedItems(prev => ({ ...prev, [product.id]: true }));
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                            packedItems[product.id]
                              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                          }`}
                        >
                          {packedItems[product.id] ? "✓ Verified" : "Scan SKU"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              Payment
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700">
                  Subtotal
                </span>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700">
                  Delivery Charges
                </span>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(order.deliveryCharges)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700">
                  Additional Charges
                </span>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(order.taxAmount)}
                </span>
              </div>
              {((order.couponDiscount && order.couponDiscount > 0) || (order.discount && order.discount > 0)) && (
                <div className="flex justify-between text-sm sm:text-base text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>
                    Coupon Discount {order.couponCode ? `(${order.couponCode.toUpperCase()})` : ''}
                  </span>
                  <span>
                    - {formatCurrency(order.couponDiscount || order.discount || 0)}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-900 font-bold">
                    Final Total
                  </span>
                  <span className="text-gray-900 font-bold">
                    {formatCurrency(order.finalTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Delivery Agent Modal */}
      <Modal
        isOpen={showAssignAgentModal}
        onClose={() => {
          setShowAssignAgentModal(false);
          setSelectedAgentId(null);
          setAgentSearchTerm("");
        }}
        title="Assign Delivery Agent"
        size="sm"
        showCloseButton={true}
      >
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <SearchInput
              placeholder="Search"
              value={agentSearchTerm}
              onChange={(e) => setAgentSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Delivery Agents List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoadingAgents ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Loading agents...
              </p>
            ) : filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <label
                  key={agent.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {agent.avatar ? (
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {agent.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {agent.name}
                        </span>
                        {agent.isOnline && (
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {agent.phone} • {agent.vehicleType}
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="deliveryAgent"
                    value={agent.id}
                    checked={selectedAgentId === agent.id}
                    onChange={() => setSelectedAgentId(agent.id)}
                    className="w-4 h-4 text-gray-600 border-0 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-2 bg-white cursor-pointer"
                  />
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray400 text-center py-4">
                No delivery agents found
              </p>
            )}
          </div>

          {/* Assign Button */}
          <Button
            onClick={handleAssignAgent}
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!selectedAgentId || assignAgentMutation.isPending}
          >
            {assignAgentMutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ViewHomeDeliveryOrder;
