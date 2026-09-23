import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  XCircle,
  TrendingDown,
  RefreshCw,
  Eye,
  ArrowRight
} from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  StatCard,
  Badge,
  DataTable,
  Pagination,
} from "../../../components/ui";
import { useGetPartnerRefundStats, useGetPartnerRefunds } from "../../../hooks/refund";
import { formatCurrency, formatDate } from "../../../utils/formatters";

const ManageRefunds = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"queue" | "history" | "failed">("queue");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Fetch KPI Stats
  const { data: statsData } = useGetPartnerRefundStats();
  
  // Fetch Refund Lists based on Tab
  const { data: refundsData, isLoading: loadingRefunds } = useGetPartnerRefunds({
    page,
    limit,
    queue: activeTab
  });

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const stats = statsData?.data?.stats || statsData?.data || {};
  const refundsList = refundsData?.data || [];
  const pagination = refundsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const kpiData = [
    {
      title: "Pending Returns",
      value: stats.pendingReturns || 0,
      icon: Clock,
      variant: "yellow" as const,
    },
    {
      title: "Approved Returns",
      value: stats.approvedReturns || 0,
      icon: CheckCircle,
      variant: "blue" as const,
    },
    {
      title: "Rejected Returns",
      value: stats.rejectedReturns || 0,
      icon: XCircle,
      variant: "red" as const,
    },
    {
      title: "Refunded Orders",
      value: stats.refundedOrders || 0,
      icon: RefreshCw,
      variant: "green" as const,
    },
    {
      title: "Settlement Deductions",
      value: formatCurrency(stats.settlementDeductions || 0),
      icon: TrendingDown,
      variant: "red" as const,
    },
  ];

  const queueColumns = [
    { label: "Return ID", key: "id", render: (row: any) => (
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
        #{row.id?.slice(0, 8)}…
      </span>
    )},
    { label: "Order #", key: "orderId", render: (row: any) => (
      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
        {row.order?.orderNumber || row.orderId?.slice(0, 8) || "N/A"}
      </span>
    )},
    { label: "Requested Amount", key: "requestedAmount", render: (row: any) => (
      <span className="font-bold text-slate-900 dark:text-white">
        {formatCurrency(row.metadata?.requestedAmount || row.requestedAmount || row.order?.totalAmount || 0)}
      </span>
    )},
    {
      label: "Phase",
      key: "status",
      render: (row: any) => {
        const phase = row.toPhase || row.status || '';
        return (
          <div className="flex flex-col gap-1">
            <Badge status={phase} />
            {phase === 'RETURN_RECEIVED_AT_WAREHOUSE' && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ✅ Warehouse Verified
              </span>
            )}
            {['APPROVED', 'PARTIALLY_APPROVED'].includes(phase) && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                ⚠️ Pickup Pending
              </span>
            )}
          </div>
        );
      }
    },
    { label: "Action", key: "action", render: (row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/return-requests/view/${row.id}`)}
            className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            title="View Details"
          >
            <Eye size={15} />
            <span>View</span>
          </button>
        </div>
      )
    },
  ];

  const historyColumns = [
    { label: "Refund / Return ID", key: "id", render: (row: any) => (
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
        #{row.id?.slice(0, 8)}…
      </span>
    )},
    { label: "Order #", key: "orderId", render: (row: any) => (
      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
        {row.order?.orderNumber || row.orderId?.slice(0, 8) || "N/A"}
      </span>
    )},
    { label: "Amount", key: "amount", render: (row: any) => (
      <span className="font-bold text-emerald-600 dark:text-emerald-400">
        {formatCurrency(row.amount || row.metadata?.requestedAmount || row.order?.totalAmount || 0)}
      </span>
    )},
    { label: "Status", key: "status", render: (row: any) => <Badge status={row.status || "COMPLETED"} /> },
    { label: "Date", key: "createdAt", render: (row: any) => formatDate(row.createdAt) },
    { label: "Action", key: "action", render: (row: any) => (
        <button
          onClick={() => navigate(`/return-requests/view/${row.id}`)}
          className="p-1.5 text-slate-600 hover:text-slate-800 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
        >
          <Eye size={15} />
          <span>Details</span>
        </button>
      )
    },
  ];

  const failedColumns = [
    { label: "Refund / Return ID", key: "id", render: (row: any) => (
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
        #{row.id?.slice(0, 8)}…
      </span>
    )},
    { label: "Order #", key: "orderId", render: (row: any) => (
      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
        {row.order?.orderNumber || row.orderId?.slice(0, 8) || "N/A"}
      </span>
    )},
    { label: "Amount", key: "amount", render: (row: any) => formatCurrency(row.amount || 0) },
    { label: "Status", key: "status", render: (row: any) => <Badge status={row.status || "REJECTED"} /> },
    { label: "Reason / Notes", key: "reason", render: (row: any) => (
        <span className="text-xs text-rose-500 font-medium">
          {row.reason || "Rejected by store/partner"}
        </span>
      )
    },
    { label: "Action", key: "action", render: (row: any) => (
        <button
          onClick={() => navigate(`/return-requests/view/${row.id}`)}
          className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      )
    },
  ];

  const getColumnsForTab = () => {
    switch (activeTab) {
      case "queue": return queueColumns;
      case "history": return historyColumns;
      case "failed": return failedColumns;
      default: return queueColumns;
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Refund Monitoring
        </h1>
        <p className="text-sm text-gray-500">Track refunds for your fulfilled orders</p>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
            size="sm"
            valueSize="lg"
          />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "queue"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("queue")}
        >
          Refund Queue
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Refund History
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "failed"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("failed")}
        >
          Failed Refunds
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <DataTable
          columns={getColumnsForTab()}
          data={refundsList}
          keyExtractor={(item: any) => item.id}
          loading={loadingRefunds}
        />
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={page}
              pagination={pagination}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageRefunds;
