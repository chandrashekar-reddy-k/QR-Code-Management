import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Package,
  Filter,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  SearchInput,
  ConfirmModal,
  StatCard,
  ViewIconButton,
  DataTable,
  Pagination,
  Badge,
  SelectInput,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { useGetPendingProductList } from "../../../hooks/product";

// API response types (based on pending products API)
interface ApiProduct {
  id: string;
  name: string;
  price: number;
  mrp: number;
  images: string[];
  unit: string;
  stock: number;
  status: string;
  warehouse?: {
    name: string;
  };
  supplier?: Array<{
    id: string;
    companyName: string;
  }>;
}

interface ApiCounts {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalRequested: number;
}

interface ApiPagination {
  page: number;
  limit: number;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    counts: ApiCounts;
    pagination: ApiPagination;
    products: ApiProduct[];
  };
}

interface Product {
  id: string;
  productId: string;
  sellerName: string;
  name: string;
  image: string;
  price: number;
  discountedPrice: number;
  measurement: string;
  stock: number;
  availability: string;
  status: "pending" | "approved" | "rejected";
}

const ApproveRequests = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [sellerFilter, setSellerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [approveConfirm, setApproveConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [rejectConfirm, setRejectConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch pending products from API
  const { data, isLoading } = useGetPendingProductList(
    currentPage,
    itemsPerPage
  );

  // Get unique sellers for filters
  const sellers = useMemo(() => {
    const uniqueSellers = Array.from(
      new Set(products.map((p) => p.sellerName))
    );
    return [
      { value: "", label: "Store Name/Seller Name" },
      ...uniqueSellers.map((seller) => ({ value: seller, label: seller })),
    ];
  }, [products]);

  useEffect(() => {
    const apiData = data as ApiResponse | undefined;
    const apiProducts: ApiProduct[] = apiData?.data?.products || [];

    if (!apiProducts || apiProducts.length === 0) {
      setProducts([]);
      return;
    }

    const mapped: Product[] = apiProducts.map((product) => {
      const sellerName =
        product.supplier && product.supplier.length > 0
          ? product.supplier[0].companyName
          : product.warehouse?.name || "N/A";

      const image =
        product.images && product.images.length > 0 ? product.images[0] : "";

      return {
        id: product.id,
        productId: product.id.slice(0, 8).toUpperCase(),
        sellerName,
        name: product.name,
        image,
        price: product.price,
        discountedPrice: product.mrp,
        measurement: product.unit,
        stock: product.stock,
        availability: product.stock > 0 ? "In Stock" : "Out of Stock",
        status:
          (product.status?.toLowerCase() as Product["status"]) || "pending",
      };
    });

    setProducts(mapped);
  }, [data]);

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

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Seller filter
    if (sellerFilter) {
      filtered = filtered.filter((p) => p.sellerName === sellerFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((product) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.productId.toLowerCase().includes(searchLower) ||
          product.sellerName.toLowerCase().includes(searchLower) ||
          product.id.toString().includes(searchLower)
        );
      });
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "productId":
            aValue = a.productId.toLowerCase();
            bValue = b.productId.toLowerCase();
            break;
          case "sellerName":
            aValue = a.sellerName.toLowerCase();
            bValue = b.sellerName.toLowerCase();
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "price":
            aValue = a.price;
            bValue = b.price;
            break;
          case "discountedPrice":
            aValue = a.discountedPrice;
            bValue = b.discountedPrice;
            break;
          case "measurement":
            aValue = a.measurement.toLowerCase();
            bValue = b.measurement.toLowerCase();
            break;
          case "stock":
            aValue = a.stock;
            bValue = b.stock;
            break;
          case "availability":
            aValue = a.availability.toLowerCase();
            bValue = b.availability.toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
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
    products,
    sellerFilter,
    statusFilter,
    searchTerm,
    sortField,
    sortDirection,
  ]);

  const handleResetFilters = () => {
    setSellerFilter("");
    setStatusFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pagination = {
    page: currentPage,
    limit: itemsPerPage,
    total: filteredAndSortedProducts.length,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };

  const handleApproveClick = (id: string) => {
    setApproveConfirm({ isOpen: true, id });
  };

  const handleApproveConfirm = async () => {
    if (approveConfirm.id === null) return;

    try {
      // TODO: Integrate approve API when available
      setProducts(products.filter((p) => p.id !== approveConfirm.id));
      alert("Product approved successfully!");
    } catch (error: unknown) {
      console.error("Error approving product:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error approving product. Please try again.";
      alert(message);
    } finally {
      setApproveConfirm({ isOpen: false, id: null });
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectConfirm({ isOpen: true, id });
  };

  const handleRejectConfirm = async () => {
    if (rejectConfirm.id === null) return;

    try {
      // TODO: Integrate reject API when available
      setProducts(products.filter((p) => p.id !== rejectConfirm.id));
      alert("Product rejected successfully!");
    } catch (error: unknown) {
      console.error("Error rejecting product:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error rejecting product. Please try again.";
      alert(message);
    } finally {
      setRejectConfirm({ isOpen: false, id: null });
    }
  };

  const handleView = (product: Product) => {
    navigate(`/products/approve/view/${product.id}`);
  };

  // Calculate KPI stats (prefer API counts, fallback to local)
  const apiCounts: ApiCounts | undefined = (data as ApiResponse | undefined)
    ?.data?.counts;
  const totalRequests =
    apiCounts?.totalRequested !== undefined
      ? apiCounts.totalRequested
      : products.length;
  const pendingRequests =
    apiCounts?.totalPending !== undefined
      ? apiCounts.totalPending
      : products.filter((p) => p.status === "pending").length;
  const approvedRequests =
    apiCounts?.totalApproved !== undefined
      ? apiCounts.totalApproved
      : products.filter((p) => p.status === "approved").length;
  const rejectedRequests =
    apiCounts?.totalRejected !== undefined
      ? apiCounts.totalRejected
      : products.filter((p) => p.status === "rejected").length;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Approve Requests
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Requests"
          value={totalRequests}
          icon={Package}
          variant="blue"
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          icon={Package}
          variant="yellow"
        />
        <StatCard
          title="Approved Requests"
          value={approvedRequests}
          icon={CheckCircle2}
          variant="green"
        />
        <StatCard
          title="Rejected Requests"
          value={rejectedRequests}
          icon={XCircle}
          variant="red"
        />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* Store Name/Seller Name Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={sellerFilter}
                onChange={(e) => {
                  setSellerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={sellers}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Status" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Reset Filter Button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center sm:justify-start"
            >
              <RotateCcw
                size={14}
                className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-500"
              />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search - Beside filters */}
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

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedProducts}
            columns={[
              {
                key: "productId",
                label: "PRODUCT ID",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800">
                      {product.productId}
                    </span>
                  </div>
                ),
              },
              {
                key: "image",
                label: "IMAGE",
                sortable: false,
                render: (product: Product) => (
                  <div className="flex items-center gap-2">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-gray-400">
                          No image
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                        {product.name}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: "sellerName",
                label: "SELLER",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {product.sellerName}
                    </span>
                  </div>
                ),
              },
              {
                key: "price",
                label: "PRICE (₹)",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800">
                      ₹{product.price.toFixed(2)}
                    </span>
                  </div>
                ),
              },
              {
                key: "discountedPrice",
                label: "DISCOUNTED PRICE (₹)",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      ₹{product.discountedPrice.toFixed(2)}
                    </span>
                  </div>
                ),
              },
              {
                key: "measurement",
                label: "MEASUREMENT",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {product.measurement}
                    </span>
                  </div>
                ),
              },
              {
                key: "stock",
                label: "STOCK",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {product.stock}
                    </span>
                  </div>
                ),
              },
              {
                key: "availability",
                label: "AVAILABILITY",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {product.availability}
                    </span>
                  </div>
                ),
              },
              {
                key: "status",
                label: "STATUS",
                sortable: true,
                render: (product: Product) => (
                  <div className="text-center">
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
                ),
              },
              {
                key: "actions",
                label: "ACTIONS",
                sortable: false,
                render: (product: Product) => (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <ViewIconButton
                        onClick={() => handleView(product)}
                        size={12}
                        tooltip="View"
                      />
                      <button
                        onClick={() => handleApproveClick(product.id)}
                        className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                        title="Approve"
                      >
                        <CheckCircle2 size={12} />
                      </button>
                      <button
                        onClick={() => handleRejectClick(product.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Reject"
                      >
                        <XCircle size={12} />
                      </button>
                    </div>
                  </div>
                ),
              },
            ]}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(product) => product.id.toString()}
            emptyMessage="No pending products found"
            loading={isLoading}
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedProducts.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedProducts.length
                  )}{" "}
                  of {filteredAndSortedProducts.length}
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                pagination={pagination}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={approveConfirm.isOpen}
        onClose={() => setApproveConfirm({ isOpen: false, id: null })}
        onConfirm={handleApproveConfirm}
        title="Approve Product"
        message="Are you sure you want to approve this product?"
        confirmText="Approve"
        cancelText="Cancel"
        variant="info"
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={rejectConfirm.isOpen}
        onClose={() => setRejectConfirm({ isOpen: false, id: null })}
        onConfirm={handleRejectConfirm}
        title="Reject Product"
        message="Are you sure you want to reject this product? This action cannot be undone."
        confirmText="Reject"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ApproveRequests;
