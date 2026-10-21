import React, { useState, useMemo } from "react";
import { Users, UserCheck, UserX, RefreshCw, Eye, X, MapPin, Phone, Mail, Calendar, CheckCircle2, XCircle } from "lucide-react";
import {
  StatCard,
  SearchInput,
  DataTable,
  Pagination,
  Badge,
  Button,
  ViewIconButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatDate } from "../../../utils/formatters";
import { useGetCustomersList, type CustomerUser } from "../../../hooks/customer";

const truncateText = (text: string | null | undefined, maxLength: number = 10): string => {
  if (!text) return "—";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const ManageCustomers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);

  const { data, isLoading, isFetching, refetch } = useGetCustomersList(
    currentPage,
    itemsPerPage,
    searchTerm
  );

  const customers: CustomerUser[] = useMemo(() => {
    return data?.data || [];
  }, [data?.data]);

  const pagination = useMemo(() => {
    return (
      data?.pagination || {
        page: currentPage,
        limit: itemsPerPage,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }
    );
  }, [data?.pagination, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    const total = pagination.total || customers.length;
    const active = customers.filter((c) => c.isActive).length;
    const inactive = customers.filter((c) => !c.isActive).length;
    return { total, active, inactive };
  }, [pagination.total, customers]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
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

  const sortedCustomers = useMemo(() => {
    if (!sortField) return customers;
    return [...customers].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      switch (sortField) {
        case "name":
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
          break;
        case "email":
          aVal = (a.email || "").toLowerCase();
          bVal = (b.email || "").toLowerCase();
          break;
        case "phone":
          aVal = a.phone || "";
          bVal = b.phone || "";
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      if (sortDirection === "asc") return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
  }, [customers, sortField, sortDirection]);

  const columns = [
    {
      key: "id",
      label: "CUSTOMER ID",
      sortable: false,
      render: (row: CustomerUser) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-mono text-gray-700 dark:text-gray-300" title={row.id}>
            {truncateText(row.id, 10)}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "CUSTOMER NAME",
      sortable: true,
      render: (row: CustomerUser) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
            {row.name || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "phone",
      label: "PHONE",
      sortable: true,
      render: (row: CustomerUser) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400">
            {row.phone || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      label: "EMAIL",
      sortable: true,
      render: (row: CustomerUser) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-words" title={row.email || ""}>
            {row.email || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "location",
      label: "CITY / STATE",
      sortable: false,
      render: (row: CustomerUser) => {
        const addr = row.addresses?.find((a) => a.isDefault) || row.addresses?.[0];
        const locationText = addr
          ? [addr.city, addr.state].filter(Boolean).join(", ") || addr.line1 || "—"
          : "—";
        return (
          <div className="text-center">
            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300" title={locationText}>
              {locationText}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "STATUS",
      sortable: false,
      render: (row: CustomerUser) => (
        <div className="text-center">
          <Badge
            status={row.isActive ? "active" : "inactive"}
            size="sm"
            customColor={
              row.isActive
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            }
            className="rounded capitalize"
          />
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "JOINED DATE",
      sortable: true,
      render: (row: CustomerUser) => (
        <div className="text-center whitespace-nowrap">
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {formatDate(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (row: CustomerUser) => (
        <div className="text-center">
          <ViewIconButton
            onClick={() => setSelectedCustomer(row)}
            size={12}
            tooltip="View customer details"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-6">
      {/* Page Header */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Registered customer accounts from User directory
          </p>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Customers"
          value={stats.total.toLocaleString()}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Active Customers"
          value={stats.active.toLocaleString()}
          icon={UserCheck}
          variant="green"
        />
        <StatCard
          title="Inactive Customers"
          value={stats.inactive.toLocaleString()}
          icon={UserX}
          variant="yellow"
        />
      </div>

      {/* Controls & Search */}
      <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setCurrentPage(1);
              refetch();
            }}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium bg-white dark:bg-gray-800"
            title="Reset search & reload"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            <span>Reset</span>
          </Button>
        </div>

        <div className="w-full sm:w-auto sm:ml-auto lg:min-w-[260px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={sortedCustomers}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(row) => row.id}
            emptyMessage="No customer users found in database"
          />
        </div>

        {/* Pagination */}
        {!isLoading && pagination.total > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Show
                </span>
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, pagination.total)} of{" "}
                  {pagination.total} entries
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

      {/* Customer Quick View Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {selectedCustomer.name || "Customer Details"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    ID: {selectedCustomer.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Phone size={14} /> Mobile Phone
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                  {selectedCustomer.phone || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Mail size={14} /> Email
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedCustomer.email || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Status
                </span>
                <Badge
                  status={selectedCustomer.isActive ? "active" : "inactive"}
                  size="sm"
                  className="rounded capitalize"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Calendar size={14} /> Joined Date
                </span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {formatDate(selectedCustomer.createdAt)}
                </span>
              </div>

              <div className="pt-2">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2 font-medium text-xs uppercase tracking-wider">
                  <MapPin size={14} /> Saved Addresses ({(selectedCustomer.addresses || []).length})
                </span>
                {(selectedCustomer.addresses && selectedCustomer.addresses.length > 0) ? (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {selectedCustomer.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200 mb-0.5">
                          <span>{addr.label || "Address"}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.2 rounded font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                          {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No address on file</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCustomers;
