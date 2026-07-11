import { useState, useEffect, useMemo } from "react";
import { DataTable, Pagination, Badge } from "../../../components/ui";
import { useGetAllTransfersList  } from "../../../hooks/InventoryManagement/transfers";

/* ================= API TYPES ================= */

interface ApiTransfer {
  id: string;
  transferCode: string;
  fromLocation: string;
  toLocation: string;
  skuCount: number;
  status: "REQUESTED" | "IN_TRANSIT" | "RECEIVED";
  requestedBy: string;
  requestedAt: string;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    total: number;
    page: number;
    limit: number;
    transfers: ApiTransfer[];
  };
}

/* ================= COMPONENT ================= */

const Transfers = () => {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);


  /* ================= API ================= */

  const { data, isLoading, refetch } = useGetAllTransfersList(
    currentPage,
    itemsPerPage
  );

  useEffect(() => {
    refetch && refetch();
  }, [currentPage, itemsPerPage, refetch]);

  const apiData = data as ApiResponse | undefined;

  const transfers = apiData?.data?.transfers || [];

  const pagination = {
    page: apiData?.data?.page || 1,
    limit: apiData?.data?.limit || itemsPerPage,
    total: apiData?.data?.total || 0,
    totalPages: Math.ceil(
      (apiData?.data?.total || 0) / (apiData?.data?.limit || itemsPerPage)
    ),
    hasNext:
      (apiData?.data?.page || 1) <
      Math.ceil(
        (apiData?.data?.total || 0) /
        (apiData?.data?.limit || itemsPerPage)
      ),
    hasPrev: (apiData?.data?.page || 1) > 1,
  };

  /* ================= SORT ================= */

  const sortedTransfers = useMemo(() => {
    let sorted = [...transfers];

    if (sortField) {
      sorted.sort((a: any, b: any) => {
        const aValue = a[sortField] ?? "";
        const bValue = b[sortField] ?? "";

        if (sortDirection === "asc") return aValue > bValue ? 1 : -1;
        return aValue < bValue ? 1 : -1;
      });
    }

    return sorted;
  }, [transfers, sortField, sortDirection]);

  /* ================= HELPERS ================= */

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours() % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading transfers...</p>
      </div>
    );
  }


  return (
    <>
      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <DataTable
          data={sortedTransfers}
          columns={[
            {
              key: "transferCode",
              label: "TRANSFER ID",
              sortable: true,
              render: (t: ApiTransfer) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{t.transferCode}</span>
                </div>
              ),
            },
            {
              key: "fromLocation",
              label: "FROM LOCATION",
              sortable: true,
              render: (t: ApiTransfer) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">
                    {t.fromLocation}
                  </span>
                </div>
              ),
            },
            {
              key: "toLocation",
              label: "TO LOCATION",
              sortable: true,
              render: (t: ApiTransfer) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">
                    {t.toLocation}
                  </span>
                </div>
              ),
            },
            {
              key: "skuCount",
              label: "NO. OF SKUS",
              sortable: true,
              render: (t: ApiTransfer) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">
                    {t.skuCount}
                  </span>
                </div>
              ),
            },
            {
              key: "status",
              label: "STATUS",
              sortable: false,
              render: (t: ApiTransfer) => (
                <div className="text-center">
                  <Badge
                    status={(t.status || "").toLowerCase() as any}
                    size="sm"
                    customColor={
                      t.status?.toLowerCase() === "RECEIVED"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : t.status?.toLowerCase() === "IN_TRANSIT"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                    }
                    className="rounded"
                  >
                    {t.status}
                  </Badge>
                </div>
              ),
            },
            {
              key: "requestedBy",
              label: "REQUESTED BY",
              sortable: true,
              render: (t: ApiTransfer) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{t.requestedBy}</span>

                </div>
              ),
            },
            {
              key: "requestedAt",
              label: "DATE",
              sortable: true,
              render: (t: ApiTransfer) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">   {formatDate(t.requestedAt)}</span>

                </div>
              ),
            },
          ]}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          keyExtractor={(transfer) => transfer.id}
          emptyMessage="No transfers found. Create your first transfer."
        />

        {/* Pagination */}
        {sortedTransfers.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
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
                  Showing results{" "}
                  <strong>
                    {(currentPage - 1) * itemsPerPage + 1}
                  </strong>{" "}
                  to{" "}
                  <strong>
                    {Math.min(currentPage * itemsPerPage, pagination.total)}
                  </strong>{" "}
                  of{" "}
                  <strong>{pagination.total}</strong>
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
    </>
  );
};

export default Transfers;
