import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Plus,
  Users,
  Package,
  TrendingUp,
  Filter,
  RotateCcw,
  ChevronDown,
  Trash2,
} from "lucide-react";
import {
  StatCard,
  SearchInput,
  SelectInput,
  PrimaryButton,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  Badge,
  ConfirmModal,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useGetDeliveryAgentsByWarehouse,
  useToggleDeliveryBoyStatus,
  useDeleteDeliveryBoy,
  useBulkDeleteDeliveryBoys,
} from "../../../hooks/deliveryBoy";
import {
  extractAgentsFromGetAllResponse,
  extractStatsFromGetAllResponse,
} from "../../../utils/deliveryAgentsGetAll";

// Define the actual API response type
interface ApiDeliveryAgentResponse {
  id: string;
  name: string;
  phone?: string;
  mobile?: string;
  email: string;
  city?: string;
  dob: string | null;
  bonusType: string | null;
  bankInfo?: {
    bankName?: string;
    ifscCode?: string;
    paymentInfo?: string;
    accountNumber?: string;
    accountHolderName?: string;
  } | null;
  isActive: boolean;
  approvalStatus?:
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DOCUMENT_VERIFICATION";
  address?: {
    id?: string;
    userId?: string;
    label?: string;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    pincode?: string;
    isDefault?: boolean;
    location?: {
      lat?: number;
      lng?: number;
    } | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  documents?: Array<Record<string, unknown>>;
  createdAt: string;
  role?: string;
}

// UI display type (mapped from API response)
interface ApiDeliveryAgent {
  id: string | number;
  name: string;
  phone: string;
  email: string;
  city: string;
  status: "Submitted" | "Document Verification" | "Approved";
  approvalStatus?:
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DOCUMENT_VERIFICATION";
  date: string;
  isActive: boolean;
  avatar?: string;
  bonus?: number;
  documents?: string[];
  dateOfBirth?: string;
  role?: string;
}

interface ApiStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const mapApiAgentToUiAgent = (
  apiAgent: ApiDeliveryAgentResponse,
): ApiDeliveryAgent => {
  let status: "Submitted" | "Document Verification" | "Approved" = "Submitted";

  if (apiAgent.isActive) {
    status = "Approved";
  } else if (apiAgent.documents && apiAgent.documents.length > 0) {
    status = "Document Verification";
  } else {
    status = "Submitted";
  }

  let bonus: number | undefined;
  if (apiAgent.bonusType) {
    const bonusMatch = apiAgent.bonusType.match(/(\d+(?:\.\d+)?)/);
    bonus = bonusMatch ? parseFloat(bonusMatch[1]) : undefined;
  }

  return {
    id: apiAgent.id,
    name: apiAgent.name || "",
    phone: apiAgent.phone || apiAgent.mobile || "",
    email: apiAgent.email || "",
    city: apiAgent.address?.city || (apiAgent as any).city || "",
    status,
    approvalStatus: apiAgent.approvalStatus,
    date: apiAgent.createdAt || "",
    isActive: apiAgent.isActive,
    avatar: undefined, // Not in API response
    bonus,
    documents: apiAgent.documents
      ? apiAgent.documents.map((doc) =>
        typeof doc === "string" ? doc : JSON.stringify(doc),
      )
      : [],
    dateOfBirth: apiAgent.dob || undefined,
    role: apiAgent.role || "DELIVERY_AGENT",
  };
};

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;

const ManageDeliveryBoys = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: toggleStatus, isPending } = useToggleDeliveryBoyStatus();
  const { mutate: deleteAgent, isPending: isDeletingSingle } = useDeleteDeliveryBoy();
  const { mutate: bulkDeleteAgents, isPending: isDeletingBulk } = useBulkDeleteDeliveryBoys();

  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const itemsPerPage = useMemo(() => {
    const l = parseInt(searchParams.get("limit") || "", 10);
    return ALLOWED_PAGE_SIZES.includes(l as (typeof ALLOWED_PAGE_SIZES)[number])
      ? l
      : 10;
  }, [searchParams]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null,
  );

  const handleDeleteSingle = () => {
    if (!deleteTargetId) return;
    deleteAgent(deleteTargetId, {
      onSuccess: () => {
        setShowSingleDeleteModal(false);
        setDeleteTargetId(null);
        setSelectedIds((prev) => prev.filter((id) => id !== deleteTargetId));
      },
    });
  };

  const handleDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    bulkDeleteAgents(selectedIds, {
      onSuccess: () => {
        setShowBulkDeleteModal(false);
        setSelectedIds([]);
      },
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, refetch, error } =
    useGetDeliveryAgentsByWarehouse(
      undefined,
      dateFilter,
      debouncedSearchTerm,
      statusFilter
    );

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    // Optionally, add tab focus as well:
    const onFocus = () => {
      if (refetch) refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  const rawAgents: ApiDeliveryAgentResponse[] = useMemo(
    () => extractAgentsFromGetAllResponse(data) as unknown as ApiDeliveryAgentResponse[],
    [data],
  );

  // Map API response to UI format
  const agents: ApiDeliveryAgent[] = useMemo(() => {
    return rawAgents.map((agent: ApiDeliveryAgentResponse) =>
      mapApiAgentToUiAgent(agent),
    );
  }, [rawAgents]);

  const stats: ApiStats = useMemo(() => {
    const apiStats = extractStatsFromGetAllResponse(data);
    if (apiStats) {
      return {
        total: apiStats.total,
        pending: apiStats.pending,
        accepted: apiStats.accepted ?? apiStats.approved ?? 0,
        rejected: apiStats.rejected,
      };
    }

    const total = rawAgents.length;
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    for (const a of rawAgents) {
      if (a.isActive) accepted += 1;
      else if (a.documents && a.documents.length > 0) rejected += 1;
      else pending += 1;
    }
    return { total, pending, accepted, rejected };
  }, [data, rawAgents]);

  const totalRequests = stats.total;
  const pendingRequests = stats.pending;
  const acceptedRequests = stats.accepted;
  const rejectedRequests = stats.rejected;

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = [...agents] as ApiDeliveryAgent[];

    // Status filter
    if (statusFilter) {
      const normalizedFilter = statusFilter.toUpperCase();
      filtered = filtered.filter((a) => {
        const agentApproval = (a.approvalStatus || "").toUpperCase();
        const agentStatus = (a.status || "").toUpperCase();
        if (normalizedFilter === "PENDING") {
          return agentApproval === "PENDING" || agentStatus === "PENDING" || agentStatus === "SUBMITTED" || agentStatus === "DOCUMENT VERIFICATION";
        }
        if (normalizedFilter === "APPROVED") {
          return agentApproval === "APPROVED" || agentStatus === "APPROVED";
        }
        if (normalizedFilter === "REJECTED") {
          return agentApproval === "REJECTED" || agentStatus === "REJECTED";
        }
        return agentApproval === normalizedFilter || agentStatus === normalizedFilter;
      });
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter((a) => (a.city || "") === cityFilter);
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a: ApiDeliveryAgent, b: ApiDeliveryAgent) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            // Handle both string and number IDs
            aValue =
              typeof a.id === "string" ? (a.id || "").toLowerCase() : a.id || 0;
            bValue =
              typeof b.id === "string" ? (b.id || "").toLowerCase() : b.id || 0;
            break;
          case "name":
            aValue = (a.name || "").toLowerCase();
            bValue = (b.name || "").toLowerCase();
            break;
          case "email":
            aValue = (a.email || "").toLowerCase();
            bValue = (b.email || "").toLowerCase();
            break;
          case "bonus":
            aValue = a.bonus || 0;
            bValue = b.bonus || 0;
            break;
          case "dateOfBirth":
            aValue = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : 0;
            bValue = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : 0;
            break;
          case "city":
            aValue = (a.city || "").toLowerCase();
            bValue = (b.city || "").toLowerCase();
            break;
          case "status":
            const order = {
              Submitted: 1,
              "Document Verification": 2,
              Approved: 3,
            };
            aValue = order[a.status];
            bValue = order[b.status];
            break;

          case "date":
            aValue = a.date ? new Date(a.date).getTime() : 0;
            bValue = b.date ? new Date(b.date).getTime() : 0;
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
  }, [agents, statusFilter, cityFilter, sortField, sortDirection]);

  const totalPages = useMemo(() => {
    const total = filteredAndSortedAgents.length;
    return Math.max(1, Math.ceil(total / itemsPerPage) || 1);
  }, [filteredAndSortedAgents.length, itemsPerPage]);

  const currentPage = useMemo(() => {
    const p = parseInt(searchParams.get("page") || "", 10);
    const raw = Number.isFinite(p) && p >= 1 ? p : 1;
    return Math.min(raw, totalPages);
  }, [searchParams, totalPages]);

  const pagination: ApiPagination = useMemo(() => {
    const total = filteredAndSortedAgents.length;
    const page = currentPage;
    return {
      page,
      limit: itemsPerPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }, [filteredAndSortedAgents.length, itemsPerPage, currentPage, totalPages]);

  // Pagination
  const paginatedAgents = filteredAndSortedAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

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
    setDateFilter("");
    setStatusFilter("");
    setCityFilter("");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const updatePageInUrl = (page: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (page <= 1) next.delete("page");
        else next.set("page", String(page));
        return next;
      },
      { replace: true },
    );
  };

  const handleToggleStatus = (id: string | number) => {
    setTogglingId(id);

    toggleStatus(String(id), {
      onSettled: () => {
        setTogglingId(null);
      },
    });
  };

  // Table columns
  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={
            paginatedAgents.length > 0 &&
            paginatedAgents.every((a) => selectedIds.includes(String(a.id)))
          }
          onChange={(e) => {
            if (e.target.checked) {
              const currentIds = paginatedAgents.map((a) => String(a.id));
              setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
            } else {
              const currentIds = new Set(paginatedAgents.map((a) => String(a.id)));
              setSelectedIds((prev) => prev.filter((id) => !currentIds.has(id)));
            }
          }}
          className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4 cursor-pointer"
        />
      ),
      sortable: false,
      render: (agent: ApiDeliveryAgent) => {
        const idStr = String(agent.id);
        const isChecked = selectedIds.includes(idStr);
        return (
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds((prev) => [...prev, idStr]);
                } else {
                  setSelectedIds((prev) => prev.filter((id) => id !== idStr));
                }
              }}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4 cursor-pointer"
            />
          </div>
        );
      },
    },
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => {
        const idString = String(agent.id || "");
        const truncatedId =
          idString.length > 8 ? `${idString.slice(0, 8)}...` : idString;
        return (
          <div className="text-center">
            <span className="text-xs sm:text-sm text-gray-800">
              {truncatedId}
            </span>
          </div>
        );
      },
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => {
        // Default avatar as data URI (simple SVG placeholder)
        const firstLetter = (agent.name || "?").charAt(0).toUpperCase();
        const defaultAvatar = `data:image/svg+xml;base64,${btoa(
          `<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
            <rect width="150" height="150" fill="#e5e7eb"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="50" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${firstLetter}</text>
          </svg>`,
        )}`;

        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src={agent.avatar || defaultAvatar}
                  alt={agent.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Prevent infinite loop by setting to default avatar
                    const target = e.target as HTMLImageElement;
                    if (target.src !== defaultAvatar) {
                      target.src = defaultAvatar;
                    }
                  }}
                />
              </div>
              <span className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                {agent.name || "N/A"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "phone",
      label: "MOBILE NUMBER",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-medium text-gray-800 whitespace-nowrap">
            {agent.phone || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "role",
      label: "PORTAL TYPE",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => {
        let label = "Delivery Agent";
        let colorClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
        if (agent.role === "VEHICLE_AGENT") {
          label = "VSMS Vehicle";
          colorClass = "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
        } else if (agent.role && ["SHOPKEEPER", "SHOPER"].includes(agent.role)) {
          label = "Shopkeeper";
          colorClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
        } else if (agent.role === "PACKING_OPERATOR") {
          label = "Packing Operator";
          colorClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
        } else if (agent.role === "QC_INSPECTOR") {
          label = "QC Inspector";
          colorClass = "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300";
        }
        return (
          <div className="text-center">
            <span className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold ${colorClass}`}>
              {label}
            </span>
          </div>
        );
      },
    },
    // {
    //   key: "bonus",
    //   label: "BONUS(%)",
    //   sortable: true,
    //   render: (agent: ApiDeliveryAgent) => (
    //     <div className="text-center">
    //       <div className="flex items-center justify-center gap-1.5">
    //         <Percent size={12} className="text-gray-400" />
    //         <span className="text-xs sm:text-sm text-gray-800">
    //           {agent.bonus || 0}%
    //         </span>
    //       </div>
    //     </div>
    //   ),
    // },
    // {
    //   key: "documents",
    //   label: "DOCUMENTS",
    //   sortable: false,
    //   render: (agent: ApiDeliveryAgent) => (
    //     <div className="text-center">
    //       <div className="flex items-center justify-center gap-1.5">
    //         <FileText size={12} className="text-gray-400" />
    //         <span className="text-xs sm:text-sm text-gray-800">
    //           {agent.documents?.length || 0}{" "}
    //           {agent.documents?.length === 1 ? "doc" : "docs"}
    //         </span>
    //       </div>
    //     </div>
    //   ),
    // },
    // {
    //   key: "dateOfBirth",
    //   label: "DATE OF BIRTH",
    //   sortable: true,
    //   render: (agent: ApiDeliveryAgent) => (
    //     <div className="text-center">
    //       <div className="flex items-center justify-center gap-1.5">
    //         <Calendar size={12} className="text-gray-400" />
    //         <span className="text-xs sm:text-sm text-gray-800 whitespace-nowrap">
    //           {agent.dateOfBirth
    //             ? formatDate(agent.dateOfBirth, "DD-MM-YYYY")
    //             : "N/A"}
    //         </span>
    //       </div>
    //     </div>
    //   ),
    // },
    {
      key: "city",
      label: "CITY",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {agent.city || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => {
        const approvalStatusLabelMap: Record<string, string> = {
          PENDING: "Pending",
          APPROVED: "Approved",
          REJECTED: "Rejected",
          DOCUMENT_VERIFICATION: "Document Verification",
        };

        const statusColorMap: Record<string, string> = {
          Pending:
            "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400",
          Submitted:
            "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400",
          "Document Verification":
            "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400",
          Approved:
            "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
          Rejected:
            "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400",
        };

        const normalizedStatus =
          approvalStatusLabelMap[agent.approvalStatus as string] || "N/A";

        return (
          <div className="text-center">
            <Badge
              status={normalizedStatus}
              size="sm"
              customColor={
                statusColorMap[normalizedStatus] ||
                "bg-gray-100 text-gray-800"
              }
              className="rounded"
            />
          </div>
        );
      },
    },
    {
      key: "date",
      label: "DATE",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 whitespace-nowrap">
            {agent.date || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "updateStatus",
      label: "UPDATE STATUS",
      sortable: false,
      render: (agent: ApiDeliveryAgent) => {
        const isActive = agent.isActive;

        return (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleStatus(agent.id)}
              disabled={togglingId === agent.id || isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
          ${isActive
                  ? "bg-green-600 dark:bg-green-500"
                  : "bg-gray-300 dark:bg-gray-600"
                }
          ${togglingId === agent.id
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
                }`}
              title={
                isActive
                  ? "Click to deactivate agent"
                  : "Click to activate agent"
              }
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isActive ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex items-center gap-1">
            <ViewIconButton
              onClick={() =>
                navigate(`/delivery-agents/view/${agent.id}`, {
                  state: {
                    fromManage: `${location.pathname}${location.search || ""}`,
                  },
                })
              }
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => navigate(`/delivery-boys/edit/${agent.id}`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => {
                setDeleteTargetId(String(agent.id));
                setShowSingleDeleteModal(true);
              }}
              size={12}
              tooltip="Delete"
            />
          </div>
        </div>
      ),
    },
  ];

  const startItem =
    filteredAndSortedAgents.length === 0
      ? 0
      : (currentPage - 1) * itemsPerPage + 1;

  const endItem = Math.min(
    currentPage * itemsPerPage,
    filteredAndSortedAgents.length,
  );


  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Delivery Agents
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <PrimaryButton
            onClick={() => navigate("/delivery-boys/create")}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Agent</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {error != null && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {(error as { message?: string }).message ||
            "Failed to load delivery agents for this warehouse."}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests.toLocaleString()}
          icon={Package}
          variant="yellow"
        />
        <StatCard
          title="Accepted Requests"
          value={acceptedRequests.toLocaleString()}
          icon={TrendingUp}
          variant="green"
        />
        <StatCard
          title="Rejected Requests"
          value={rejectedRequests.toLocaleString()}
          icon={Package}
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

          {/* Date Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: "", label: "Date" },
                  { value: "today", label: "Today" },
                  { value: "thisweek", label: "This Week" },
                  { value: "thismonth", label: "This Month" },
                ]}
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
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Status" },
                  { value: "PENDING", label: "Pending" },
                  { value: "APPROVED", label: "Approved" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* City Dropdown */}
          {/* <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                options={[
                  { value: "", label: "City" },
                  ...cities.map((city) => ({ value: city, label: city })),
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div> */}

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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedAgents}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(agent) => String(agent.id)}
            emptyMessage="No delivery agents found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedAgents.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-14 [&_select]:sm:w-16 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      const lim = Number(e.target.value);
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("limit", String(lim));
                          next.delete("page");
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                    ]}
                    className="w-14 sm:w-16 h-7 text-xs"
                  />
                </div>
                Showing{" "}
                <span className="text-orange-600 dark:text-orange-500 font-medium">
                  {startItem.toLocaleString()}
                </span>{" "}
                to{" "}
                <span className="text-orange-600 dark:text-orange-500 font-medium">
                  {endItem.toLocaleString()}
                </span>{" "}
                of{" "}
                <span className="text-orange-600 dark:text-orange-500 font-medium">
                  {filteredAndSortedAgents.length.toLocaleString()}
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={updatePageInUrl}
                  pagination={pagination}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showSingleDeleteModal}
        onClose={() => {
          setShowSingleDeleteModal(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteSingle}
        title="Delete Delivery Agent"
        message="Are you sure you want to permanently delete this delivery agent? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingSingle}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleDeleteBulk}
        title="Bulk Delete Delivery Agents"
        message={`Are you sure you want to permanently delete ${selectedIds.length} selected delivery agent(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.length} Agent(s)`}
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingBulk}
      />
    </div>
  );
};

export default ManageDeliveryBoys;
