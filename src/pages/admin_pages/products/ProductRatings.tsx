import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Star, Filter, RotateCcw, ChevronDown } from "lucide-react";
import {
  SearchInput,
  StatCard,
  ViewIconButton,
  DataTable,
  Pagination,
  SelectInput,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { useGetAllRatingList } from "../../../hooks/rating";

// Define the API response type
interface ApiRating {
  id: string;
  rating: number; // API uses "rating" not "rate"
  review: string | null;
  userId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface ApiStats {
  allRatingCount: number;
  avgRating: number;
  total5StarRatings: number;
  total1StarRatings: number;
}

interface ApiPagination {
  page: number;
  limit: number;
  totalPages: number;
  total?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    stats: ApiStats;
    pagination: ApiPagination;
    ratings: ApiRating[];
  };
}

// Table rating type for internal use
interface TableRating {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  productId: string;
  productName?: string | null;
  rate: number;
  review: string;
  image?: string | null;
  date: string;
}

const ProductRatings = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, refetch } = useGetAllRatingList(
    currentPage,
    itemsPerPage
  );

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

  const ratings: ApiRating[] = apiData?.data?.ratings || [];
  const stats: ApiStats = apiData?.data?.stats || {
    allRatingCount: 0,
    avgRating: 0,
    total5StarRatings: 0,
    total1StarRatings: 0,
  };
  const apiPagination = apiData?.data?.pagination || {
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  // Transform API ratings to table format
  const tableRatings: TableRating[] = useMemo(() => {
    return ratings.map((rating) => {
      // Extract user info from nested user object
      const userName = rating.user?.name || "N/A";
      const userPhone = rating.user?.phone || null;

      // Extract product info from nested product object
      const productName = rating.product?.name || "N/A";
      const productImage =
        rating.product?.images && rating.product.images.length > 0
          ? rating.product.images[0]
          : null;

      return {
        id: rating.id,
        userId: rating.userId,
        userName: userName,
        userEmail: userPhone, // Use phone as email display
        productId: rating.productId,
        productName: productName,
        rate: rating.rating, // Map "rating" to "rate"
        review: rating.review || "", // Handle null review
        image: productImage,
        date: rating.createdAt,
      };
    });
  }, [ratings]);

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
    setRatingFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

  // Filter and sort ratings
  const filteredAndSortedRatings: TableRating[] = useMemo(() => {
    let filtered = tableRatings;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((rating) => {
        return (
          rating.userName.toLowerCase().includes(searchLower) ||
          rating.review.toLowerCase().includes(searchLower) ||
          rating.id.toLowerCase().includes(searchLower) ||
          rating.productName?.toLowerCase().includes(searchLower) ||
          false
        );
      });
    }

    // Rating filter
    if (ratingFilter) {
      filtered = filtered.filter(
        (rating) => rating.rate === parseInt(ratingFilter)
      );
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      filtered = filtered.filter((rating) => {
        const ratingDate = new Date(rating.date);
        switch (dateFilter) {
          case "today":
            return ratingDate.toDateString() === now.toDateString();
          case "week": {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return ratingDate >= weekAgo;
          }
          case "month": {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return ratingDate >= monthAgo;
          }
          default:
            return true;
        }
      });
    }

    if (sortField) {
      filtered = [...filtered].sort((a: TableRating, b: TableRating) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "rate":
            aValue = a.rate;
            bValue = b.rate;
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
    tableRatings,
    searchTerm,
    ratingFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  // Create compatible pagination object for Pagination component (after filteredAndSortedRatings is defined)
  const pagination = {
    page: apiPagination.page,
    limit: apiPagination.limit,
    totalPages: apiPagination.totalPages,
    total: filteredAndSortedRatings.length, // Use filtered count for display
    hasNext: apiPagination.page < apiPagination.totalPages,
    hasPrev: apiPagination.page > 1,
  };

  // Pagination - use API pagination for server-side, client-side filtering for display
  const paginatedRatings = filteredAndSortedRatings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const renderStars = (rate: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            className={
              star <= rate
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }
          />
        ))}
        <span className="ml-1 text-xs text-gray-600">
          ({rate})
        </span>
      </div>
    );
  };

  const handleView = (rating: TableRating) => {
    navigate(`/products/ratings/view/${rating.id}`);
  };

  // Calculate KPI metrics from API stats
  const totalRatings = stats.allRatingCount;
  const averageRating =
    stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "0.0";
  const fiveStarRatings = stats.total5StarRatings;
  const oneStarRatings = stats.total1StarRatings;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading ratings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Product Ratings
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Ratings"
          value={totalRatings}
          icon={Star}
          variant="blue"
        />
        <StatCard
          title="Average Rating"
          value={averageRating}
          icon={Star}
          variant="green"
        />
        <StatCard
          title="5 Star Ratings"
          value={fiveStarRatings}
          icon={Star}
          variant="yellow"
        />
        <StatCard
          title="1 Star Ratings"
          value={oneStarRatings}
          icon={Star}
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

          {/* Ratings Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Ratings" },
                  { value: "5", label: "5 Stars" },
                  { value: "4", label: "4 Stars" },
                  { value: "3", label: "3 Stars" },
                  { value: "2", label: "2 Stars" },
                  { value: "1", label: "1 Star" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Date Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
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

      {/* Ratings Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedRatings}
            columns={[
              {
                key: "id",
                label: "ID",
                sortable: true,
                render: (rating: TableRating) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800">
                      {rating.id.slice(0, 8)}...
                    </span>
                  </div>
                ),
              },
              {
                key: "user",
                label: "USER",
                sortable: false,
                render: (rating: TableRating) => (
                  <div className="text-center">
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">
                        {rating.userName}
                      </span>
                      {rating.userEmail && (
                        <span className="text-[10px] text-gray-500">
                          {rating.userEmail}
                        </span>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "rate",
                label: "RATE",
                sortable: true,
                render: (rating: TableRating) => (
                  <div className="text-center">{renderStars(rating.rate)}</div>
                ),
              },
              {
                key: "review",
                label: "REVIEW",
                sortable: false,
                render: (rating: TableRating) => (
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 max-w-xs mx-auto">
                      {rating.review || "No review"}
                    </p>
                  </div>
                ),
              },
              {
                key: "image",
                label: "IMAGE",
                sortable: false,
                render: (rating: TableRating) => (
                  <div className="text-center">
                    {rating.image ? (
                      <img
                        src={rating.image}
                        alt="Review"
                        className="w-10 h-10 object-cover rounded mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (
                            e.target as HTMLImageElement
                          ).parentElement!.innerHTML =
                            '<span class="text-[10px] text-gray-400">No image</span>';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        No image
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: "date",
                label: "DATE",
                sortable: false,
                render: (rating: TableRating) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {formatDate(rating.date)}
                    </span>
                  </div>
                ),
              },
              {
                key: "actions",
                label: "ACTIONS",
                sortable: false,
                render: (rating: TableRating) => (
                  <div className="text-center">
                    <ViewIconButton
                      onClick={() => handleView(rating)}
                      size={12}
                      tooltip="View"
                    />
                  </div>
                ),
              },
            ]}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(rating) => rating.id}
            emptyMessage="No ratings found"
            loading={isLoading}
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedRatings.length > 0 && (
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
                    filteredAndSortedRatings.length
                  )}{" "}
                  of {filteredAndSortedRatings.length}
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
    </div>
  );
};

export default ProductRatings;
