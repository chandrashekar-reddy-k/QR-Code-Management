import { Check } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

interface Product {
  id: number;
  name: string;
  size: string;
  price: number;
  image: string;
}

const OrderDetails = () => {
  const orderStatus = "Shipped"; // Can be: 'Order Placed', 'Processing', 'Shipped', 'Delivered'

  const products: Product[] = [
    {
      id: 1,
      name: "Premium Coffee Beans",
      size: "1 kg Pouch",
      price: 450,
      image:
        "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop",
    },
    {
      id: 2,
      name: "Premium Coffee Beans",
      size: "1 kg Pouch",
      price: 450,
      image:
        "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop",
    },
  ];

  const getStatusLevel = (currentStatus: string) => {
    const statuses = ["Order Placed", "Processing", "Shipped", "Delivered"];
    return statuses.indexOf(currentStatus);
  };

  const currentLevel = getStatusLevel(orderStatus);

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 pb-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-[1400px] mx-auto pt-4 sm:pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Order ID #123
            </h1>
            <Breadcrumbs />
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 flex-shrink-0">
            <div className="px-4 sm:px-6 py-2 bg-orange-200 dark:bg-orange-900/30 rounded-lg">
              <span className="text-white dark:text-orange-300 font-semibold text-sm sm:text-base">
                {orderStatus}
              </span>
            </div>
            <BackButton to="/orders" />
          </div>
        </div>

        {/* Status Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 md:p-8 mb-6 relative z-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 sm:mb-8">
            Status
          </h2>

          <div className="relative overflow-x-auto z-0">
            <div className="flex items-center justify-between min-w-[600px] sm:min-w-0 relative z-0">
              {/* Order Placed */}
              <div className="flex flex-col items-center relative flex-shrink-0">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${
                    currentLevel >= 0 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  {currentLevel >= 0 && (
                    <Check
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                      strokeWidth={3}
                    />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2 sm:mt-3 font-medium text-center">
                  Order Placed
                </p>
              </div>

              {/* Line 1 */}
              <div
                className={`flex-1 h-1 -mx-1 sm:-mx-2 ${
                  currentLevel >= 1 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
                style={{ marginTop: "-24px" }}
              />

              {/* Processing */}
              <div className="flex flex-col items-center relative flex-shrink-0">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${
                    currentLevel >= 1 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  {currentLevel > 1 && (
                    <Check
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                      strokeWidth={3}
                    />
                  )}
                  {currentLevel === 1 && (
                    <div className="w-3 h-3 rounded-full bg-white dark:bg-gray-800"></div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2 sm:mt-3 font-medium text-center">
                  Processing
                </p>
              </div>

              {/* Line 2 */}
              <div
                className={`flex-1 h-1 -mx-1 sm:-mx-2 ${
                  currentLevel >= 2 ? "bg-green-500" : "bg-gray-300"
                }`}
                style={{ marginTop: "-24px" }}
              />

              {/* Shipped */}
              <div className="flex flex-col items-center relative flex-shrink-0">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${
                    currentLevel >= 2 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  {currentLevel === 2 && (
                    <div className="w-3 h-3 rounded-full bg-white dark:bg-gray-800"></div>
                  )}
                  {currentLevel > 2 && (
                    <Check
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                      strokeWidth={3}
                    />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2 sm:mt-3 font-medium text-center">
                  Shipped
                </p>
              </div>

              {/* Line 3 */}
              <div
                className={`flex-1 h-1 -mx-1 sm:-mx-2 ${
                  currentLevel >= 3 ? "bg-green-500" : "bg-gray-300"
                }`}
                style={{ marginTop: "-24px" }}
              />

              {/* Delivered */}
              <div className="flex flex-col items-center relative flex-shrink-0">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 ${
                    currentLevel >= 3
                      ? "bg-green-500 border-green-500"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {currentLevel >= 3 && (
                    <Check
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                      strokeWidth={3}
                    />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2 sm:mt-3 font-medium text-center">
                  Delivered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Order Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                Order Information
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    Order ID
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : 123
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    Order Date
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : 300
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    Delivery Date & Time
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : PAN00123
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                Customer Information
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    User ID
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : 123
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    Name
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : 300
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    Mobile Number
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : PAN00123
                  </span>
                </div>
              </div>
            </div>

            {/* Seller Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                Seller Information
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    Seller ID
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : 123
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <span className="text-gray-700 dark:text-gray-300 sm:w-48 mb-1 sm:mb-0 text-sm sm:text-base">
                    Name
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 text-sm sm:text-base">
                    : 300
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Products */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                Products
              </h2>
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-200 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs sm:text-sm text-green-500 dark:text-green-400">
                          {product.size}
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-900 dark:text-gray-200 font-medium text-sm sm:text-base flex-shrink-0 whitespace-nowrap">
                      ₹ {product.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                Payment
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
                  <span className="text-gray-900 dark:text-gray-200">: ₹ 2500.00</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-700 dark:text-gray-300">Delivery Charges</span>
                  <span className="text-gray-900 dark:text-gray-200">: ₹ 2500.00</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-700 dark:text-gray-300">Additional Charges</span>
                  <span className="text-gray-900 dark:text-gray-200">: ₹ 2500.00</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-700 dark:text-gray-300">Wallet Used</span>
                  <span className="text-gray-900 dark:text-gray-200">: -₹100.00</span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-900 dark:text-gray-200 font-semibold">
                      Final Total
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-bold">: ₹2475.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
