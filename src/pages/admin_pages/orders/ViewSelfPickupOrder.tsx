import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Phone, ChevronDown, FileText } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { formatDate, formatCurrency } from "../../../utils/formatters";
import { generateInvoicePDF, getInvoiceNumber } from "../../../utils/generateInvoicePDF";
import { Button, SelectInput, } from "../../../components/ui";
import {
  useGetOrderById,
  useUpdateOrderStatus,
  OrderStatus,
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
  deliveryCharge?: number;
  deliveredAt?: string | null;
  deliveryDate?: string | null;
  discount: number;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string | null;
  pickedUpAt?: string | null;
  cancelledAt?: string | null;
  consumer: ApiConsumer;
  items: ApiOrderItem[];
  payment?: unknown | null;
  delivery?: unknown | null;
  agentId?: string | null;
  pickupStoreId?: string | null;
  [key: string]: unknown;
}

interface ApiOrderResponse {
  status: boolean;
  response: string;
  data?: ApiOrderData;
}

// Extended interface for Self Pickup Order View with products
interface SelfPickupOrderView {
  id: string;
  orderNumber?: string;
  userId: number;
  userName: string;
  vendorId: number;
  vendorName: string;
  mobile: string;
  total: number;
  additionalCharges: number;
  taxAmount: number;
  walletUsed: number;
  couponDiscount?: number;
  couponCode?: string | null;
  discount?: number;
  finalTotal: number;
  deliveryDate: string;
  payment?: {
    id: string;
    amount: number;
    method: string;
    status: string;
  }
  paymentMethod?: string;
  paymentStatus?: string;
  status: OrderStatus;
  orderDate: string;
  products?: {
    id: string;
    name: string;
    variant: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  orderReturnHistory?: any[];
  refundTransactions?: any[];
}

// Helper to get user-friendly label from enum
const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PLACED:
      return "Placed";
    case OrderStatus.CONFIRMED:
      return "Confirmed";
    case OrderStatus.PROCESSING:
      return "Processing";
    case OrderStatus.READY_FOR_PICKUP:
      return "Ready for Pickup";
    case OrderStatus.DELIVERED:
      return "Delivered";
    case OrderStatus.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
};

const ViewSelfPickupOrder = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useGetOrderById(id);
  const updateStatusMutation = useUpdateOrderStatus(id);
  const [order, setOrder] = useState<SelfPickupOrderView | null>(null);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Transform API data to component formats
  const transformedOrder = useMemo(() => {
    const apiData = data as ApiOrderResponse | undefined;
    const orderData = apiData?.data;

    if (!orderData) return null;

    // Transform items to products format
    const transformedProducts = (orderData.items || []).map((item) => ({
      id: item.id || item.productId || "",
      name: item.product?.name || "Unknown Product",
      variant: item.unit || "N/A",
      quantity: item.quantity || 0,
      price: item.unitPrice || 0,
      image: item.product?.images?.[0] || "",
    }));

    const paymentMethod = (orderData as any).paymentMethod || (orderData.payment as any)?.method || "N/A";
    const paymentStatus = (orderData as any).paymentStatus || (orderData.payment as any)?.status || "PENDING";


    return {
      id: orderData.id || id || "",
      orderNumber: orderData.orderNumber,
      userId: orderData.consumer?.id
        ? parseInt(orderData.consumer.id.slice(0, 8), 16) || 0
        : 0,
      userName: orderData.consumer?.name || "N/A",
      vendorId: 0, // Not in API response
      vendorName: "N/A", // Not in API response
      mobile: orderData.consumer?.phone || "N/A",
      total: orderData.totalAmount || 0,
      additionalCharges: 0, // Not in API response
      taxAmount: (orderData.taxAmount as number) || 0,
      walletUsed: 0, // Not in API response
      couponDiscount: Number(orderData.couponDiscount || (orderData.couponCode ? orderData.discount : 0) || 0),
      couponCode: orderData.couponCode || null,
      discount: orderData.discount || 0,
      finalTotal: orderData.totalAmount || 0,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      status: (orderData.status as OrderStatus) || OrderStatus.PLACED,
      orderDate: orderData.createdAt || new Date().toISOString(),
      deliveryDate:
        orderData.deliveredAt ||
        orderData.deliveryDate ||
        null,
      products: transformedProducts,
      orderReturnHistory: orderData.orderReturnHistory || [],
      refundTransactions: orderData.refundTransactions || [],
    } as SelfPickupOrderView;
  }, [data, id]);

const getSelfPickupNextStatus = (status: OrderStatus): OrderStatus | null => {
  switch (status) {
    case OrderStatus.PLACED:
      return OrderStatus.CONFIRMED;
    case OrderStatus.CONFIRMED:
      return OrderStatus.PROCESSING;
    case OrderStatus.PROCESSING:
      return OrderStatus.READY_FOR_PICKUP;
    case OrderStatus.READY_FOR_PICKUP:
      return OrderStatus.DELIVERED;
    default:
      return null;
  }
};

  useEffect(() => {
    if (transformedOrder) {
      setOrder(transformedOrder);
      const nextStatus = getSelfPickupNextStatus(transformedOrder.status);
      setSelectedStatus(nextStatus || transformedOrder.status);
    }
  }, [transformedOrder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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


  const handleStatusUpdate = async () => {
    if (!selectedStatus || !id) return;

    if (order?.status === OrderStatus.PROCESSING && selectedStatus === OrderStatus.READY_FOR_PICKUP) {
      const allPacked = order.products && order.products.every(p => packedItems[p.id]);
      if (!allPacked) {
        alert("Please verify and pack all items before setting status to Ready for Pickup!");
        return;
      }
    }

    const apiOrder = (data as any)?.data;
    const fulfillmentOrderId = apiOrder?.fulfillmentOrders?.[0]?.id;

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
      case OrderStatus.DELIVERED:
        return "text-green-600 dark:text-green-400";
      case OrderStatus.CANCELLED:
        return "text-red-600 dark:text-red-400";
      // Removed Failed and Returned
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

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      setDownloadingInvoice(true);
      const pdf = await generateInvoicePDF(order as any);
      if (pdf) {
        pdf.save(`Invoice_VK-${getInvoiceNumber(order as any)}.pdf`);
      }
    } catch (err) {
      console.error("Error generating invoice PDF:", err);
    } finally {
      setDownloadingInvoice(false);
    }
  };

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
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <FileText size={16} />
              {downloadingInvoice ? "Generating..." : "Download Invoice PDF"}
            </Button>
            <BackButton to="/self-pickup-orders" />
          </div>
        </div>
      </div>

      {/* OMS Stepper */}
      <OmsStepper orderId={order.id} currentStatus={order.status} returnHistory={order.orderReturnHistory} refundTransactions={order.refundTransactions} paymentMethod={order.paymentMethod} />

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
                  {order.deliveryDate
                    ? formatDate(order.deliveryDate, "DD-MM-YYYY, HH:mm A")
                    : "Not Delivered Yet"}
                </span>
              </div>
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
                  <Phone size={16} className="text-gray-700" />
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
            </div>
          </div>

          {/* Vendor Information */}
          {/* <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Store size={16} className="text-gray-500" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Vendor Information
              </h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Vendor ID
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {order.vendorId}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-1 sm:mb-0 sm:w-48">
                  Vendor Name
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800">
                  {order.vendorName}
                </span>
              </div>
            </div>
          </div> */}

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
                <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase">
                    Current Status
                  </span>
                  <span
                    className={`text-base sm:text-lg font-bold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="relative" ref={dropdownRef}>
                  {/* Status Flow Logic (same as ViewHomeDeliveryOrder) */}
                  {(() => {
                    const statusOptions = [
                      { value: OrderStatus.PLACED, label: "Placed" },
                      { value: OrderStatus.CONFIRMED, label: "Confirmed" },
                      { value: OrderStatus.PROCESSING, label: "Processing" },
                      { value: OrderStatus.READY_FOR_PICKUP, label: "Ready for Pickup" },
                      { value: OrderStatus.DELIVERED, label: "Delivered" },
                      { value: OrderStatus.CANCELLED, label: "Cancelled" },
                    ].map((opt) => {
                      const isCurrent = order.status === opt.value;
                      const isNext = getSelfPickupNextStatus(order.status) === opt.value;

                      let disabled = isCurrent || order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED;
                      if (!disabled) {
                        disabled = !isNext;
                        if (opt.value === OrderStatus.CANCELLED && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) {
                          disabled = false;
                        }
                      }

                      return {
                        ...opt,
                        disabled,
                      };
                    });
                    let updateButtonDisabled = false;
                    if (
                      order.status === OrderStatus.DELIVERED
                    ) {
                      updateButtonDisabled = true;
                    }

                    return (
                      <>
                        <button
                          onClick={() => {
                            if (!updateButtonDisabled) {
                              setStatusUpdateOpen(!statusUpdateOpen);
                            }
                          }}
                          disabled={updateButtonDisabled}
                          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-xs sm:text-sm font-medium ${updateButtonDisabled
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
                          <div className="absolute right-0 mt-2 w-[150px] bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="p-3">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Select Status
                              </label>
                              <SelectInput
                                value={selectedStatus}
                                onChange={(e) => {
                                  // Only allow selecting enabled options
                                  const val = e.target.value as OrderStatus | "";
                                  const found = statusOptions.find((opt) => opt.value === val);
                                  if (found && !found.disabled) {
                                    setSelectedStatus(val);
                                  }
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
                                  disabled={updateStatusMutation.isPending || updateButtonDisabled}
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
                No. of Products: {order.products && order.products.length > 0 ? order.products.length.toString().padStart(2, "0") : "00"}
              </span>
            </div>

            {/* Packing Progress */}
            {order.status === OrderStatus.PROCESSING && order.products && order.products.length > 0 && (
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
              {order.products && order.products.length > 0 ? (
                order.products.map((product) => (
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
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No products available
                </p>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              Payment
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700">Subtotal</span>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700">Additional Charges</span>
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
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700">Wallet Used</span>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(order.walletUsed)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-900 font-bold">Final Total</span>
                  <span className="text-gray-900 font-bold">
                    {formatCurrency(order.finalTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewSelfPickupOrder;
