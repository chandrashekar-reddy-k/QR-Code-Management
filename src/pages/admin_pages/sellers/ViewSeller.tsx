import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Filter, RotateCcw, X } from "lucide-react";
import { formatDate } from "../../../utils/formatters";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { SearchInput, SelectInput } from "../../../components/ui";
// import { useGetVendorDetailsById } from "../../../hooks/vendor";

// Interface matching API response structure
interface ApiVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isOnline?: boolean;
  avatar?: string;
  store?: {
    id?: string;
    name: string;
    description?: string;
    categoryIds?: number[];
    commission?: number;
    logoUrl?: string;
    nationalIdUrl?: string;
    addressProofUrl?: string;
    taxName?: string;
    taxNumber?: string;
    panNumber?: string;
    status?: string;
    [key: string]: any;
  };
  address?: {
    id?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode?: string;
    location?: {
      lat: number;
      lng: number;
    };
    [key: string]: any;
  };
  bankInfo?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;
    [key: string]: any;
  };
  settings?: {
    requireProductApproval?: boolean;
    selfPickupMode?: boolean;
    [key: string]: any;
  };
  balance?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// interface ApiResponse {
//   status: boolean;
//   response: string;
//   data: ApiVendor;
// }

// Mock vendor data - matching ManageSellers mock data
const mockVendors: ApiVendor[] = [
  {
    id: "1",
    name: "Agent 1",
    email: "123@gmail.com",
    phone: "9087636388",
    isActive: false,
    isOnline: false,
    store: {
      id: "store1",
      name: "Company 1",
      description: "A leading grocery store providing fresh products",
      categoryIds: [1],
      commission: 10,
      logoUrl: "https://i.pravatar.cc/150?img=1",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST123456789",
      panNumber: "ABCDE1234F",
      status: "pending",
    },
    address: {
      id: "addr1",
      line1: "123 Main Street",
      line2: "Near Park",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      location: {
        lat: 19.0760,
        lng: 72.8777,
      },
    },
    bankInfo: {
      accountHolderName: "Agent 1",
      accountNumber: "1234567890",
      ifsc: "BANK0001234",
      bankName: "State Bank of India",
      branch: "Mumbai Main Branch",
    },
    settings: {
      requireProductApproval: true,
      selfPickupMode: false,
    },
    balance: 5000,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Agent 2",
    email: "123456@gmail.com",
    phone: "9087636388",
    isActive: false,
    isOnline: true,
    store: {
      id: "store2",
      name: "Company 1",
      description: "Premium organic products store",
      categoryIds: [1],
      commission: 12,
      logoUrl: "https://i.pravatar.cc/150?img=2",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST987654321",
      panNumber: "FGHIJ5678K",
      status: "approved",
    },
    address: {
      id: "addr2",
      line1: "456 Park Avenue",
      line2: "Sector 5",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      location: {
        lat: 28.6139,
        lng: 77.2090,
      },
    },
    bankInfo: {
      accountHolderName: "Agent 2",
      accountNumber: "9876543210",
      ifsc: "BANK0005678",
      bankName: "HDFC Bank",
      branch: "Delhi Central",
    },
    settings: {
      requireProductApproval: false,
      selfPickupMode: true,
    },
    balance: 3200,
    createdAt: "2024-01-16T11:20:00Z",
    updatedAt: "2024-01-16T11:20:00Z",
  },
  {
    id: "3",
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    phone: "9876543210",
    isActive: true,
    isOnline: true,
    store: {
      id: "store3",
      name: "Fresh Grocery Store",
      description: "Fresh fruits and vegetables daily",
      categoryIds: [2],
      commission: 15,
      logoUrl: "https://i.pravatar.cc/150?img=3",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST111222333",
      panNumber: "LMNOP9012Q",
      status: "approved",
    },
    address: {
      id: "addr3",
      line1: "789 Market Road",
      line2: "Block A",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      location: {
        lat: 12.9716,
        lng: 77.5946,
      },
    },
    bankInfo: {
      accountHolderName: "Rajesh Kumar",
      accountNumber: "1122334455",
      ifsc: "BANK0009012",
      bankName: "ICICI Bank",
      branch: "Bangalore South",
    },
    settings: {
      requireProductApproval: true,
      selfPickupMode: true,
    },
    balance: 8900,
    createdAt: "2024-01-10T09:15:00Z",
    updatedAt: "2024-01-10T09:15:00Z",
  },
  {
    id: "4",
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "9876543211",
    isActive: true,
    isOnline: false,
    store: {
      id: "store4",
      name: "Organic Farm",
      description: "100% organic certified products",
      categoryIds: [2, 3],
      commission: 18,
      logoUrl: "https://i.pravatar.cc/150?img=4",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST444555666",
      panNumber: "RSTUV3456W",
      status: "approved",
    },
    address: {
      id: "addr4",
      line1: "321 Garden Street",
      line2: "Phase 2",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500001",
      location: {
        lat: 17.3850,
        lng: 78.4867,
      },
    },
    bankInfo: {
      accountHolderName: "Priya Sharma",
      accountNumber: "5566778899",
      ifsc: "BANK0003456",
      bankName: "Axis Bank",
      branch: "Hyderabad Main",
    },
    settings: {
      requireProductApproval: false,
      selfPickupMode: false,
    },
    balance: 12000,
    createdAt: "2024-01-12T14:45:00Z",
    updatedAt: "2024-01-12T14:45:00Z",
  },
  {
    id: "5",
    name: "Amit Patel",
    email: "amit@example.com",
    phone: "9876543212",
    isActive: false,
    isOnline: true,
    store: {
      id: "store5",
      name: "Dairy Delight",
      description: "Fresh dairy products",
      categoryIds: [3],
      commission: 20,
      logoUrl: "https://i.pravatar.cc/150?img=5",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST777888999",
      panNumber: "XYZAB7890C",
      status: "pending",
    },
    address: {
      id: "addr5",
      line1: "654 Dairy Lane",
      line2: "Unit 3",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      location: {
        lat: 18.5204,
        lng: 73.8567,
      },
    },
    bankInfo: {
      accountHolderName: "Amit Patel",
      accountNumber: "9988776655",
      ifsc: "BANK0007890",
      bankName: "Kotak Mahindra Bank",
      branch: "Pune Central",
    },
    settings: {
      requireProductApproval: true,
      selfPickupMode: true,
    },
    balance: 7500,
    createdAt: "2024-01-18T16:30:00Z",
    updatedAt: "2024-01-18T16:30:00Z",
  },
  {
    id: "6",
    name: "Sneha Reddy",
    email: "sneha@example.com",
    phone: "9876543213",
    isActive: true,
    isOnline: true,
    store: {
      id: "store6",
      name: "Grain Mart",
      description: "Premium grains and pulses",
      categoryIds: [1, 3],
      commission: 14,
      logoUrl: "https://i.pravatar.cc/150?img=6",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST000111222",
      panNumber: "DEFGH1234I",
      status: "approved",
    },
    address: {
      id: "addr6",
      line1: "987 Grain Street",
      line2: "Building 5",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600001",
      location: {
        lat: 13.0827,
        lng: 80.2707,
      },
    },
    bankInfo: {
      accountHolderName: "Sneha Reddy",
      accountNumber: "4433221100",
      ifsc: "BANK0001234",
      bankName: "Punjab National Bank",
      branch: "Chennai Main",
    },
    settings: {
      requireProductApproval: false,
      selfPickupMode: false,
    },
    balance: 15600,
    createdAt: "2024-01-14T12:00:00Z",
    updatedAt: "2024-01-14T12:00:00Z",
  },
  {
    id: "7",
    name: "Vikram Singh",
    email: "vikram@example.com",
    phone: "9876543214",
    isActive: true,
    isOnline: false,
    store: {
      id: "store7",
      name: "Spice World",
      description: "Authentic Indian spices",
      categoryIds: [4],
      commission: 16,
      logoUrl: "https://i.pravatar.cc/150?img=7",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST333444555",
      panNumber: "JKLMN5678O",
      status: "approved",
    },
    address: {
      id: "addr7",
      line1: "147 Spice Road",
      line2: "Shop 12",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      location: {
        lat: 26.9124,
        lng: 75.7873,
      },
    },
    bankInfo: {
      accountHolderName: "Vikram Singh",
      accountNumber: "3322110099",
      ifsc: "BANK0005678",
      bankName: "Union Bank of India",
      branch: "Jaipur Central",
    },
    settings: {
      requireProductApproval: true,
      selfPickupMode: false,
    },
    balance: 9800,
    createdAt: "2024-01-11T08:20:00Z",
    updatedAt: "2024-01-11T08:20:00Z",
  },
  {
    id: "8",
    name: "Anjali Mehta",
    email: "anjali@example.com",
    phone: "9876543215",
    isActive: false,
    isOnline: true,
    store: {
      id: "store8",
      name: "Bakery Corner",
      description: "Fresh baked goods daily",
      categoryIds: [2],
      commission: 22,
      logoUrl: "https://i.pravatar.cc/150?img=8",
      nationalIdUrl: "https://via.placeholder.com/300x200",
      addressProofUrl: "https://via.placeholder.com/300x200",
      taxName: "GST",
      taxNumber: "GST666777888",
      panNumber: "PQRST9012U",
      status: "rejected",
    },
    address: {
      id: "addr8",
      line1: "258 Bakery Street",
      line2: "Floor 2",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380001",
      location: {
        lat: 23.0225,
        lng: 72.5714,
      },
    },
    bankInfo: {
      accountHolderName: "Anjali Mehta",
      accountNumber: "2211009988",
      ifsc: "BANK0009012",
      bankName: "Bank of Baroda",
      branch: "Ahmedabad Main",
    },
    settings: {
      requireProductApproval: false,
      selfPickupMode: true,
    },
    balance: 4200,
    createdAt: "2024-01-19T10:10:00Z",
    updatedAt: "2024-01-19T10:10:00Z",
  },
];

const STATUS_OPTIONS = [
  "Draft",
  "Incomplete registration",
  "Submitted",
  "Awaiting verification",
  "Under Review",
  "Ops verification",
  "Approved",
  "Vendor activated",
  "Rejected",
  "Registration failed",
  "On Hold",
  "Additional info required",
];

const ViewSeller = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Products");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [transactionFilters, setTransactionFilters] = useState({
    date: "",
    status: "",
    type: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [productFilters, setProductFilters] = useState({
    category: "",
    status: "",
    unitType: "",
  });
  const [vendorStatus, setVendorStatus] = useState<string>("Pending");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<string>("Pending");
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Find vendor from mock data
  const vendor = useMemo(() => {
    return mockVendors.find((v) => v.id === id);
  }, [id]);

  // Mock product data - generate more products for pagination
  const allMockProducts = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    image: index % 2 === 0
      ? "https://images.unsplash.com/photo-1605027990121-cbae87354932?w=100&h=100&fit=crop"
      : "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop",
    productName: "Fresh Mangoes(1kg)",
    units: 500,
    unitType: index % 2 === 0 ? "KG" : "LTR",
    variants: (index % 3) + 2,
    actualPrice: "₹199.00",
    dPrice: "₹199.00",
    fPrice: "₹199.00",
    sku: "₹199.0",
  }));

  // Calculate pagination
  const totalPages = Math.ceil(allMockProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = allMockProducts.slice(startIndex, endIndex);

  if (!vendor) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Vendor not found</p>
          <button
            onClick={() => navigate("/vendors/manage")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }


  const tabs = [
    "Products",
    "Transactions",
    "Business Details",
    "Contact and operations",
    "Product and category mapping",
    "Bank and settlement Data",
    "Business Documents",
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Header Section */}
      <div className="mb-4 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Vendor ID #{vendor.id}
            </h1>
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this vendor?")) {
                  // Delete will be handled later
                  navigate("/vendors/manage");
                }
              }}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Partner 1</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Surname:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Something</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mobile Number:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{vendor.phone}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                EmailID:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{vendor.email}</p>
            </div>
          </div>
          {/* Right Column */}
          <div className="space-y-3">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor designation:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Something</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Location (warehouse):
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {vendor.address?.line1 || "Something"}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Location (Registered):
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {vendor.address?.line1 || "Something"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map((tab, index) => (
            <div key={tab} className="flex items-center">
              <button
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap relative ${
                  activeTab === tab
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500"></span>
                )}
              </button>
              {index < tabs.length - 1 && (
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Tab */}
      {activeTab === "Transactions" && (
        <>
          {/* Filters and Search */}
          <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
              {/* Filter Icon */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
                <Filter size={18} className="text-gray-700 dark:text-gray-300" />
              </div>

              {/* Date Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={transactionFilters.date}
                    onChange={(e) =>
                      setTransactionFilters({ ...transactionFilters, date: e.target.value })
                    }
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
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
                />
              </div>

              {/* Status Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={transactionFilters.status}
                    onChange={(e) =>
                      setTransactionFilters({ ...transactionFilters, status: e.target.value })
                    }
                    options={[
                      { value: "", label: "Status" },
                      { value: "completed", label: "Completed" },
                      { value: "pending", label: "Pending" },
                      { value: "failed", label: "Failed" },
                      { value: "cancelled", label: "Cancelled" },
                    ]}
                  />
                </div>
                <ChevronDown
                  size={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
                />
              </div>

              {/* Type Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={transactionFilters.type}
                    onChange={(e) =>
                      setTransactionFilters({ ...transactionFilters, type: e.target.value })
                    }
                    options={[
                      { value: "", label: "Type" },
                      { value: "credit", label: "Credit" },
                      { value: "debit", label: "Debit" },
                      { value: "refund", label: "Refund" },
                    ]}
                  />
                </div>
                <ChevronDown
                  size={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
                />
              </div>

              {/* Reset Filter Button */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setTransactionFilters({ date: "", status: "", type: "" });
                    setSearchTerm("");
                  }}
                  className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 w-full sm:w-auto justify-center sm:justify-start"
                >
                  <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600" />
                  <span>Reset Filter</span>
                </button>
              </div>
            </div>

            {/* Search - Beside filters */}
            <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
              <SearchInput
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        ID
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        VENDOR NAME
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        ORDER ID
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        PRODUCT NAME
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        QTY.
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        TYPE
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        AMOUNT
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        STATUS
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        MESSAGE
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-center gap-1">
                        CREATED
                        <div className="flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Business Details Section */}
      {activeTab === "Business Details" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
            Business Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Legal Business/Registered Name:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Something</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Owner Name:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{vendor.name}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GST Number:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {vendor.store?.taxNumber || "Something"}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PAN Number:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {vendor.store?.panNumber || "Something"}
                </p>
              </div>
            </div>
            {/* Right Column */}
            <div className="space-y-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Store Name/Brand Name/Display Name:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {vendor.store?.name || "Something"}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nature Of Business:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Something</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Sub Category:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Something</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date of IncorporationR:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {vendor.createdAt ? formatDate(vendor.createdAt) : "Something"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact and operations Section */}
      {activeTab === "Contact and operations" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
            Contact and operationss
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Primary Contact Name
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {vendor.name || "Something"}
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alternate Contact*
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {vendor.email || "Something"}
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Delivery Capability
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone*
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {vendor.phone || "Something"}
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Operating Regions
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lead Time
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product and Category Mapping Section */}
      {activeTab === "Product and category mapping" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
            Product and Category Mapping
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categories Supplied
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Brands / Products
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price Type (Fixed / Dynamic)
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sub Categories Supplied
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  MOQ (Minimum Order Quantity)
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>

              <div className="flex items-baseline gap-2">
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tax Slab (GST %)
                </p>
                <span className="text-gray-500 dark:text-gray-400">:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank and settlement Data Section */}
      {activeTab === "Bank and settlement Data" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
            Bank settlement Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,_200px)_minmax(0,_1fr)] gap-6 text-sm items-start">
            {/* Cancelled Cheque Placeholder */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600" />
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Cancelled Cheque
              </p>
            </div>

            {/* Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Holder Name
                  </p>
                  <span className="text-gray-500 dark:text-gray-400">:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {vendor.name || "Something"}
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Branch Name
                  </p>
                  <span className="text-gray-500 dark:text-gray-400">:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bank IFSC Code
                  </p>
                  <span className="text-gray-500 dark:text-gray-400">:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bank Name
                  </p>
                  <span className="text-gray-500 dark:text-gray-400">:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bank Account Number
                  </p>
                  <span className="text-gray-500 dark:text-gray-400">:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Something</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Documents Section */}
      {activeTab === "Business Documents" && (
        <>
          {/* Documents Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Business Documents
            </h2>

            <div className="flex flex-wrap gap-6">
              {/* Pan Card */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" />
                <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                  Pan Card
                </p>
              </div>

              {/* GST Registered */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" />
                <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300 text-center">
                  GST Registered
                </p>
              </div>

              {/* Company Registration Certificate */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" />
                <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300 text-center leading-tight">
                  Company Registration
                  <br />
                  Certificate
                </p>
              </div>

              {/* FSSAI License */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" />
                <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                  FSSAI License
                </p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-5 inline-flex items-center gap-6">
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Current Status :</span>{" "}
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {vendorStatus}
              </span>
            </p>

            <div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(true)}
                className="relative inline-flex items-center border border-green-500 text-xs sm:text-sm rounded-md px-3 py-1.5 pr-8 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Update Status
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600"
                />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Update Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Update Status
              </h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {/* Status Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Update Status
                </label>
                <div className="relative">
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-green-500 rounded-md text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none pr-8"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <ChevronUp
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>

              {/* Status Options List */}
              <div className="mb-4">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {STATUS_OPTIONS.map((status) => (
                    <div
                      key={status}
                      onClick={() => setModalStatus(status)}
                      className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                        modalStatus === status
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {status}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setVendorStatus(modalStatus);
                  setIsStatusModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "Products" && (
        <>
          {/* Add Product Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => navigate(`/products/create`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          </div>

          {/* Filters and Search */}
          <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
              {/* Filter Icon */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
                <Filter size={18} className="text-gray-700 dark:text-gray-300" />
              </div>

              {/* Category Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={productFilters.category}
                    onChange={(e) =>
                      setProductFilters({ ...productFilters, category: e.target.value })
                    }
                    options={[
                      { value: "", label: "Category" },
                      { value: "fruits", label: "Fruits" },
                      { value: "vegetables", label: "Vegetables" },
                      { value: "dairy", label: "Dairy" },
                      { value: "grains", label: "Grains" },
                    ]}
                  />
                </div>
                <ChevronDown
                  size={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
                />
              </div>

              {/* Status Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={productFilters.status}
                    onChange={(e) =>
                      setProductFilters({ ...productFilters, status: e.target.value })
                    }
                    options={[
                      { value: "", label: "Status" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "pending", label: "Pending" },
                    ]}
                  />
                </div>
                <ChevronDown
                  size={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
                />
              </div>

              {/* Unit Type Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={productFilters.unitType}
                    onChange={(e) =>
                      setProductFilters({ ...productFilters, unitType: e.target.value })
                    }
                    options={[
                      { value: "", label: "Unit Type" },
                      { value: "KG", label: "KG" },
                      { value: "LTR", label: "LTR" },
                      { value: "PCS", label: "PCS" },
                    ]}
                  />
                </div>
                <ChevronDown
                  size={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
                />
              </div>

              {/* Reset Filter Button */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setProductFilters({ category: "", status: "", unitType: "" });
                    setProductSearchTerm("");
                  }}
                  className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 w-full sm:w-auto justify-center sm:justify-start"
                >
                  <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600" />
                  <span>Reset Filter</span>
                </button>
              </div>
            </div>

            {/* Search - Beside filters */}
            <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
              <SearchInput
                placeholder="Search"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      ID
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      IMAGE
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      PRODUCT NAME
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      UNITS
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      UNIT TYPE
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      VARIANTS
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      ACTUAL PRICE
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      D.PRICE
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      F.PRICE
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-center gap-1">
                      SKU
                      <div className="flex flex-col">
                        <ChevronUp size={12} className="text-gray-400" />
                        <ChevronDown size={12} className="text-gray-400 -mt-1" />
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.id}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <img
                        src={product.image}
                        alt={product.productName}
                        className="w-12 h-12 object-cover rounded mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
                        }}
                      />
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.productName}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.units}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.unitType}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.variants}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.actualPrice}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.dPrice}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.fPrice}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-gray-700 dark:text-gray-300">
                      {product.sku}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Showing results{" "}
                <span className="text-orange-600 dark:text-orange-400 font-semibold">
                  {currentProducts.length}
                </span>{" "}
                of{" "}
                <span className="text-orange-600 dark:text-orange-400 font-semibold">
                  {allMockProducts.length}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                      currentPage === pageNum
                        ? "bg-orange-500 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default ViewSeller;
