import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Phone, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { formatDate, formatCurrency } from "../../../utils/formatters";
import { Button, SelectInput, } from "../../../components/ui";
import {
  useGetOrderById,
  useUpdateOrderStatus,
  OrderStatus,
  type PartnerPutOrderStatus,
} from "../../../hooks/order";

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
  finalTotal: number;
  deliveryDate: string;
  payment?: {
    id: string;
    amount: number;
    method: string;
    status: string;
  }
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

    const paymentMethod = orderData.payment?.method || "N/A";
    const paymentStatus = orderData.payment?.status || "N/A";


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
      taxAmount: orderData.taxAmount || 0,
      walletUsed: 0, // Not in API response
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
    } as SelfPickupOrderView;
  }, [data, id]);

  useEffect(() => {
    if (transformedOrder) {
      setOrder(transformedOrder);
      setSelectedStatus(transformedOrder.status);
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

    try {
      await updateStatusMutation.mutateAsync({
        status: selectedStatus as PartnerPutOrderStatus,
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
        return "text-gray-600 dark:text-gray-400";
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
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (isLoading || !order) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-400">Loading order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {order.orderNumber || `Order ID #${order.id.slice(0, 8)}`}
            </h1>
            <Breadcrumbs />
          </div>
          <BackButton to="/self-pickup-orders" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Order Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
              Order Information
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {order.orderNumber && (
                <div className="flex flex-col sm:flex-row">
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                    Order Number
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                    {order.orderNumber}
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Order ID
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {order.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Order Date
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {formatDate(order.orderDate, "DD-MM-YYYY, HH:mm A")}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Delivery Date & Time
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {order.deliveryDate
                    ? formatDate(order.deliveryDate, "DD-MM-YYYY, HH:mm A")
                    : "Not Delivered Yet"}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Customer Information
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Call Customer"
                >
                  <Phone size={16} className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  User ID
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {order.userId}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Name
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {order.userName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Mobile Number
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {order.mobile}
                </span>
              </div>
            </div>
          </div>

          {/* Vendor Information */}
          {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Store size={16} className="text-gray-500 dark:text-gray-400" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Vendor Information
              </h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Vendor ID
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {order.vendorId}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Vendor Name
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {order.vendorName}
                </span>
              </div>
            </div>
          </div> */}

          {/* Payment Method Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
              Payment Method details
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Payment Type
                </span>
                <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                  {order.paymentMethod}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 sm:mb-0 sm:w-48">
                  Payment Status
                </span>
                <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
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
                    // Helper: get next status in flow
                    const getNextStatus = (status: OrderStatus) => {
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

                    const statusOptions = [
                      { value: OrderStatus.PLACED, label: "Placed" },
                      { value: OrderStatus.CONFIRMED, label: "Confirmed" },
                      { value: OrderStatus.PROCESSING, label: "Processing" },
                      { value: OrderStatus.READY_FOR_PICKUP, label: "Ready for Pickup" },
                      { value: OrderStatus.DELIVERED, label: "Delivered" },
                      { value: OrderStatus.CANCELLED, label: "Cancelled" },
                    ].map((opt) => {
                      const isCurrent = order.status === opt.value;
                      const isNext = getNextStatus(order.status) === opt.value;

                      let disabled = false;

                      // Once delivered, disable everything
                      if (order.status === OrderStatus.DELIVERED) {
                        disabled = true;
                      } else {
                        // Allow only current + next status
                        disabled = !(isCurrent || isNext);

                        // Cancel allowed until delivered
                        if (opt.value === OrderStatus.CANCELLED) {
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
                              ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 cursor-not-allowed"
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
                          <div className="absolute right-0 mt-2 w-[150px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                            <div className="p-3">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
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

        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Products
              </h2>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                No. of Products: {order.products && order.products.length > 0 ? order.products.length.toString().padStart(2, "0") : "00"}
              </span>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {order.products && order.products.length > 0 ? (
                order.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 sm:gap-4"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-200 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                        {product.variant}
                      </p>
                    </div>
                    <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-200 flex-shrink-0 whitespace-nowrap">
                      {product.quantity} × {formatCurrency(product.price)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No products available
                </p>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
              Payment
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
                <span className="text-gray-900 dark:text-gray-200 font-semibold">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700 dark:text-gray-300">Additional Charges</span>
                <span className="text-gray-900 dark:text-gray-200 font-semibold">
                  {formatCurrency(order.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-700 dark:text-gray-300">Wallet Used</span>
                <span className="text-gray-900 dark:text-gray-200 font-semibold">
                  {formatCurrency(order.walletUsed)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-900 dark:text-gray-200 font-bold">Final Total</span>
                  <span className="text-gray-900 dark:text-gray-200 font-bold">
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
