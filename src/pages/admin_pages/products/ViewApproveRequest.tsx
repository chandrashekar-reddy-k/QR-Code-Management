import { useParams, useNavigate } from "react-router-dom";
import {
  Edit,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { Badge } from "../../../components/ui";

interface Product {
  id: number;
  productId: string;
  sellerName: string;
  name: string;
  image: string;
  price: number;
  discountedPrice: number;
  status: "pending" | "approved" | "rejected";
  tax: string;
  tags: string;
  brands: string;
  description: string;
  metaTitle: string;
  schemaMarkup: string;
  metaKeywords: string;
  metaDescription: string;
  variantType: string;
  stockLimit: string;
  measurement: string;
  stock: string;
  unit: string;
  category: string;
  productType: string;
  madeIn: string;
  fssaiLicNo: string;
  barcode: string;
  isReturnable: boolean;
  isCancelable: boolean;
  isCodAllowed: boolean;
  totalAllowedQuantity: string;
  productStatus: string;
  otherImages: string[];
}

// Groceries approval request images
const approvalRequestImages = [
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop", // Fresh Bananas
  "https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=400&h=400&fit=crop", // Fresh Onions
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop", // Curd
  "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop", // Paneer
  "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=400&fit=crop", // Wheat Flour
  "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=400&fit=crop", // Moong Dal
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop", // Cumin Seeds
  "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", // Red Chili Powder
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=400&fit=crop", // Nescafe Coffee
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop", // Tropicana Juice
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=400&h=400&fit=crop", // Lays Chips
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop", // Oreo Cookies
];

// Mock data for pending groceries products - in real app, fetch from API using the ID
const mockPendingProducts: Product[] = [
  {
    id: 1,
    productId: "PROD101",
    sellerName: "Fresh Grocery Store",
    name: "Fresh Bananas (1kg)",
    image: approvalRequestImages[0],
    price: 79,
    discountedPrice: 69,
    status: "pending",
    tax: "GST 5%",
    tags: "bananas, fruits, fresh, potassium",
    brands: "Farm Fresh",
    description:
      "Fresh ripe bananas, handpicked and carefully packed. Rich in potassium and vitamins. Perfect for daily consumption.",
    metaTitle: "Fresh Bananas 1kg - Premium Quality | Fresh Grocery Store",
    schemaMarkup: '{"@type":"Product","name":"Fresh Bananas (1kg)"}',
    metaKeywords: "bananas, fresh fruits, potassium rich, healthy fruits",
    metaDescription:
      "Buy fresh premium quality bananas online. Handpicked, 1kg pack. Rich in potassium. Free delivery available.",
    variantType: "Bunch",
    stockLimit: "200",
    measurement: "1kg",
    stock: "50",
    unit: "1",
    category: "Fruits & Vegetables",
    productType: "Fresh Produce",
    madeIn: "India",
    fssaiLicNo: "FSSAI123456780",
    barcode: "8901234567800",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "10",
    productStatus: "Pending",
    otherImages: [approvalRequestImages[1]],
  },
  {
    id: 2,
    productId: "PROD102",
    sellerName: "Organic Farm",
    name: "Fresh Onions (1kg)",
    image: approvalRequestImages[1],
    price: 35,
    discountedPrice: 29,
    status: "pending",
    tax: "GST 5%",
    tags: "onions, vegetables, organic, fresh",
    brands: "Organic Farm",
    description:
      "Fresh organic onions, locally sourced. Perfect for cooking and daily use. Rich in antioxidants and vitamin C.",
    metaTitle: "Fresh Organic Onions 1kg | Organic Farm",
    schemaMarkup: '{"@type":"Product","name":"Fresh Onions (1kg)"}',
    metaKeywords:
      "onions, organic vegetables, fresh produce, cooking vegetables",
    metaDescription:
      "Buy fresh organic onions online. Locally sourced, 1kg pack. Perfect for cooking. Free delivery.",
    variantType: "Packet",
    stockLimit: "300",
    measurement: "1kg",
    stock: "100",
    unit: "1",
    category: "Fruits & Vegetables",
    productType: "Fresh Produce",
    madeIn: "India",
    fssaiLicNo: "FSSAI987654320",
    barcode: "8901234567801",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "15",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 3,
    productId: "PROD103",
    sellerName: "Dairy Delight",
    name: "Fresh Curd (500g)",
    image: approvalRequestImages[2],
    price: 45,
    discountedPrice: 42,
    status: "pending",
    tax: "GST 5%",
    tags: "curd, yogurt, dairy, probiotic",
    brands: "Dairy Delight",
    description:
      "Fresh homemade style curd, 500g pack. Rich in probiotics and calcium. Perfect for daily consumption.",
    metaTitle: "Fresh Curd 500g | Dairy Delight",
    schemaMarkup: '{"@type":"Product","name":"Fresh Curd (500g)"}',
    metaKeywords: "curd, yogurt, dairy products, probiotic, calcium",
    metaDescription:
      "Buy fresh curd 500g online. Rich in probiotics and calcium. Perfect for daily use. Free delivery.",
    variantType: "Pack",
    stockLimit: "400",
    measurement: "500g",
    stock: "60",
    unit: "1",
    category: "Dairy Products",
    productType: "Dairy",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233440",
    barcode: "8901234567802",
    isReturnable: false,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "20",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 4,
    productId: "PROD104",
    sellerName: "Dairy Delight",
    name: "Fresh Paneer (250g)",
    image: approvalRequestImages[3],
    price: 95,
    discountedPrice: 89,
    status: "pending",
    tax: "GST 5%",
    tags: "paneer, cheese, dairy, protein",
    brands: "Dairy Delight",
    description:
      "Fresh homemade paneer, 250g pack. Rich in protein and calcium. Perfect for cooking curries and snacks.",
    metaTitle: "Fresh Paneer 250g | Dairy Delight",
    schemaMarkup: '{"@type":"Product","name":"Fresh Paneer (250g)"}',
    metaKeywords: "paneer, fresh cheese, dairy products, protein rich",
    metaDescription:
      "Buy fresh paneer 250g online. Rich in protein and calcium. Perfect for cooking. Free delivery.",
    variantType: "Pack",
    stockLimit: "250",
    measurement: "250g",
    stock: "40",
    unit: "1",
    category: "Dairy Products",
    productType: "Dairy",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233441",
    barcode: "8901234567803",
    isReturnable: false,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "15",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 5,
    productId: "PROD105",
    sellerName: "Grain Mart",
    name: "Aashirvaad Wheat Flour (5kg)",
    image: approvalRequestImages[4],
    price: 249,
    discountedPrice: 229,
    status: "pending",
    tax: "GST 5%",
    tags: "wheat flour, atta, grains, staple",
    brands: "Aashirvaad",
    description:
      "Aashirvaad Whole Wheat Flour, 5kg pack. Made from premium quality wheat. Perfect for rotis and chapatis.",
    metaTitle: "Aashirvaad Wheat Flour 5kg | Grain Mart",
    schemaMarkup: '{"@type":"Product","name":"Aashirvaad Wheat Flour (5kg)"}',
    metaKeywords: "wheat flour, atta, aashirvaad, whole wheat, roti flour",
    metaDescription:
      "Buy Aashirvaad Wheat Flour 5kg online. Premium quality. Perfect for rotis. Free delivery.",
    variantType: "Pack",
    stockLimit: "100",
    measurement: "5kg",
    stock: "30",
    unit: "1",
    category: "Grains & Pulses",
    productType: "Flour",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233442",
    barcode: "8901234567804",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "5",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 6,
    productId: "PROD106",
    sellerName: "Grain Mart",
    name: "Moong Dal (1kg)",
    image: approvalRequestImages[5],
    price: 139,
    discountedPrice: 125,
    status: "pending",
    tax: "GST 5%",
    tags: "moong dal, pulses, protein, healthy",
    brands: "Tata Sampann",
    description:
      "Premium Moong Dal, 1kg pack. Rich in protein and fiber. Clean, sorted and ready to cook. Perfect for dal curry.",
    metaTitle: "Moong Dal 1kg - Premium Quality | Grain Mart",
    schemaMarkup: '{"@type":"Product","name":"Moong Dal (1kg)"}',
    metaKeywords: "moong dal, pulses, protein rich, dal curry, healthy",
    metaDescription:
      "Buy premium Moong Dal 1kg online. Rich in protein. Clean and sorted. Free delivery available.",
    variantType: "Pack",
    stockLimit: "200",
    measurement: "1kg",
    stock: "45",
    unit: "1",
    category: "Grains & Pulses",
    productType: "Pulses",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233443",
    barcode: "8901234567805",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "10",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 7,
    productId: "PROD107",
    sellerName: "Spice World",
    name: "Cumin Seeds (100g)",
    image: approvalRequestImages[6],
    price: 65,
    discountedPrice: 59,
    status: "pending",
    tax: "GST 5%",
    tags: "cumin, jeera, spices, digestive",
    brands: "Everest",
    description:
      "Everest Cumin Seeds, 100g pack. Pure and natural. Aromatic and flavorful. Essential spice for Indian cooking.",
    metaTitle: "Cumin Seeds 100g | Spice World",
    schemaMarkup: '{"@type":"Product","name":"Cumin Seeds (100g)"}',
    metaKeywords: "cumin seeds, jeera, spices, cooking spices, digestive",
    metaDescription:
      "Buy Everest Cumin Seeds 100g online. Pure and natural. Aromatic flavor. Free delivery.",
    variantType: "Pack",
    stockLimit: "500",
    measurement: "100g",
    stock: "80",
    unit: "1",
    category: "Spices & Condiments",
    productType: "Spices",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233444",
    barcode: "8901234567806",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "25",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 8,
    productId: "PROD108",
    sellerName: "Spice World",
    name: "Red Chili Powder (200g)",
    image: approvalRequestImages[7],
    price: 45,
    discountedPrice: 39,
    status: "pending",
    tax: "GST 5%",
    tags: "chili powder, spices, red chili, hot",
    brands: "Everest",
    description:
      "Everest Red Chili Powder, 200g pack. Pure and natural. Perfect spice for adding heat to dishes.",
    metaTitle: "Red Chili Powder 200g | Spice World",
    schemaMarkup: '{"@type":"Product","name":"Red Chili Powder (200g)"}',
    metaKeywords: "red chili powder, spices, hot spice, cooking spices",
    metaDescription:
      "Buy Everest Red Chili Powder 200g online. Pure and natural. Perfect for adding heat. Free delivery.",
    variantType: "Pack",
    stockLimit: "400",
    measurement: "200g",
    stock: "70",
    unit: "1",
    category: "Spices & Condiments",
    productType: "Spices",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233445",
    barcode: "8901234567807",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "20",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 9,
    productId: "PROD109",
    sellerName: "Beverage Corner",
    name: "Nescafe Coffee (200g)",
    image: approvalRequestImages[8],
    price: 245,
    discountedPrice: 229,
    status: "pending",
    tax: "GST 5%",
    tags: "coffee, nescafe, beverage, instant",
    brands: "Nescafe",
    description:
      "Nescafe Classic Instant Coffee, 200g jar. Rich and aromatic. Perfect for morning coffee. Made from premium coffee beans.",
    metaTitle: "Nescafe Coffee 200g | Beverage Corner",
    schemaMarkup: '{"@type":"Product","name":"Nescafe Coffee (200g)"}',
    metaKeywords: "nescafe coffee, instant coffee, beverage, morning coffee",
    metaDescription:
      "Buy Nescafe Coffee 200g online. Rich and aromatic. Perfect for morning. Free delivery available.",
    variantType: "Jar",
    stockLimit: "150",
    measurement: "200g",
    stock: "25",
    unit: "1",
    category: "Beverages",
    productType: "Coffee",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233446",
    barcode: "8901234567808",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "8",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 10,
    productId: "PROD110",
    sellerName: "Beverage Corner",
    name: "Tropicana Orange Juice (1L)",
    image: approvalRequestImages[9],
    price: 125,
    discountedPrice: 115,
    status: "pending",
    tax: "GST 5%",
    tags: "orange juice, tropicana, beverage, vitamin c",
    brands: "Tropicana",
    description:
      "Tropicana Orange Juice, 1 liter tetra pack. 100% pure juice. No added preservatives. Rich in vitamin C.",
    metaTitle: "Tropicana Orange Juice 1L | Beverage Corner",
    schemaMarkup: '{"@type":"Product","name":"Tropicana Orange Juice (1L)"}',
    metaKeywords: "tropicana juice, orange juice, fruit juice, vitamin c",
    metaDescription:
      "Buy Tropicana Orange Juice 1L online. 100% pure juice. Rich in vitamin C. Free delivery.",
    variantType: "Tetra Pack",
    stockLimit: "250",
    measurement: "1L",
    stock: "35",
    unit: "1",
    category: "Beverages",
    productType: "Juice",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233447",
    barcode: "8901234567809",
    isReturnable: false,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "12",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 11,
    productId: "PROD111",
    sellerName: "Snack Zone",
    name: "Lays Classic Chips (150g)",
    image: approvalRequestImages[10],
    price: 20,
    discountedPrice: 18,
    status: "pending",
    tax: "GST 5%",
    tags: "chips, lays, snacks, crispy",
    brands: "Lays",
    description:
      "Lays Classic Salted Chips, 150g pack. Crispy and delicious. Perfect snack for any time. Made from premium potatoes.",
    metaTitle: "Lays Classic Chips 150g | Snack Zone",
    schemaMarkup: '{"@type":"Product","name":"Lays Classic Chips (150g)"}',
    metaKeywords: "lays chips, potato chips, snacks, crispy snacks",
    metaDescription:
      "Buy Lays Classic Chips 150g online. Crispy and delicious. Perfect snack. Free delivery.",
    variantType: "Pack",
    stockLimit: "600",
    measurement: "150g",
    stock: "100",
    unit: "1",
    category: "Snacks & Sweets",
    productType: "Chips",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233448",
    barcode: "8901234567810",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "30",
    productStatus: "Pending",
    otherImages: [],
  },
  {
    id: 12,
    productId: "PROD112",
    sellerName: "Snack Zone",
    name: "Oreo Cookies (150g)",
    image: approvalRequestImages[11],
    price: 45,
    discountedPrice: 39,
    status: "pending",
    tax: "GST 5%",
    tags: "oreo, cookies, biscuits, snacks",
    brands: "Oreo",
    description:
      "Oreo Chocolate Cookies, 150g pack. Classic chocolate sandwich cookies. Perfect for tea time. Delicious and crunchy.",
    metaTitle: "Oreo Cookies 150g | Snack Zone",
    schemaMarkup: '{"@type":"Product","name":"Oreo Cookies (150g)"}',
    metaKeywords: "oreo cookies, chocolate cookies, biscuits, tea time snacks",
    metaDescription:
      "Buy Oreo Cookies 150g online. Classic chocolate cookies. Perfect for tea time. Free delivery available.",
    variantType: "Pack",
    stockLimit: "500",
    measurement: "150g",
    stock: "90",
    unit: "1",
    category: "Snacks & Sweets",
    productType: "Cookies",
    madeIn: "India",
    fssaiLicNo: "FSSAI112233449",
    barcode: "8901234567811",
    isReturnable: true,
    isCancelable: true,
    isCodAllowed: true,
    totalAllowedQuantity: "25",
    productStatus: "Pending",
    otherImages: [],
  },
];

const ViewApproveRequest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // In real app, fetch from API using the ID
  const product = mockPendingProducts.find((p) => p.id === parseInt(id || "0"));

  if (!product) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Product request not found
          </p>
          <button
            onClick={() => navigate("/products/approve")}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleApprove = () => {
    if (
      window.confirm("Are you sure you want to approve this product request?")
    ) {
      // In real app, call API to approve
      navigate("/products/approve");
    }
  };

  const handleReject = () => {
    if (
      window.confirm("Are you sure you want to reject this product request?")
    ) {
      // In real app, call API to reject
      navigate("/products/approve");
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Product Request ID #{product.id}
        </h1>
        <div className="flex items-center gap-2">
          <BackButton to="/products/approve" />
          <button
            onClick={handleApprove}
            className="p-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            title="Approve"
          >
            <CheckCircle2 size={16} />
          </button>
          <button
            onClick={handleReject}
            className="p-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            title="Reject"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Product Overview Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-4 sm:gap-6 w-full">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                <ImageIcon
                  size={20}
                  className="text-gray-400 dark:text-gray-500"
                />
              </div>
            )}
          </div>

          {/* Product Details - Side by Side */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Seller Name
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {product.sellerName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Product Name
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {product.name}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </p>
              <Badge
                status={product.status}
                size="sm"
                customColor={
                  product.status === "approved"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : product.status === "rejected"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                      : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                }
                className="rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Pricing Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Pricing Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Tax
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.tax}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Tags
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.tags}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Brands
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.brands}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.description}
                </p>
              </div>
            </div>
          </div>

          {/* Product Variants Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Product Variants
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Type
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.variantType}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Stock Limit
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.stockLimit}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Measurement
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.measurement}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Price
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  ₹{product.price}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Discount Price
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  ₹{product.discountedPrice}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Stock
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.stock}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Unit
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.unit}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Unit Status
                </p>
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Active
                </p>
              </div>
            </div>
          </div>

          {/* Images Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Images
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Main Image
                </p>
                {product.image ? (
                  <img
                    src={product.image}
                    alt="Main"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <ImageIcon
                      size={24}
                      className="text-gray-400 dark:text-gray-500"
                    />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Other images
                </p>
                {product.otherImages && product.otherImages.length > 0 ? (
                  <img
                    src={product.otherImages[0]}
                    alt="Other"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <ImageIcon
                      size={24}
                      className="text-gray-400 dark:text-gray-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* SEO Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Seo Settings
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Main Title
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.metaTitle}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Schema Markup
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.schemaMarkup}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Meta Keywords
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.metaKeywords}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Meta Description
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.metaDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Product Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Product Settings
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Category
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.category}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Product Type
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.productType}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Made In
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.madeIn}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  FSSAI Lic. No.
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.fssaiLicNo}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Barcode
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.barcode}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Is Returnable?
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.isReturnable ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Is Cancel-able?
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.isCancelable ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Is COD allowed?
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.isCodAllowed ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Total allowed quantity
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.totalAllowedQuantity}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Product Status
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {product.productStatus}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewApproveRequest;
