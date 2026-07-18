import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  TrendingDown,
  RefreshCw,
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
    { label: "Return ID", key: "id", render: (row: any) => row.id?.slice(0, 8) + '…' },
    { label: "Order #", key: "orderId", render: (row: any) => row.order?.orderNumber || "N/A" },
    { label: "Requested Amount", key: "requestedAmount", render: (row: any) => formatCurrency(row.metadata?.requestedAmount || row.requestedAmount || row.order?.totalAmount || 0) },
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
    { label: "Action", key: "action", render: (row: any) => {
        const phase = row.toPhase || '';
        if (phase === 'RETURN_RECEIVED_AT_WAREHOUSE') {
          return <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Ready for Refund</span>;
        }
        return <span className="text-xs font-medium text-gray-500 italic">Awaiting Warehouse Receipt</span>;
      }
    },
  ];

  const historyColumns = [
    { label: "Refund ID", key: "id", render: (row: any) => row.id },
    { label: "Order ID", key: "orderId", render: (row: any) => row.order?.orderNumber || "N/A" },
    { label: "Amount", key: "amount", render: (row: any) => formatCurrency(row.amount || 0) },
    { label: "Status", key: "status", render: (row: any) => <Badge status={row.status} /> },
    { label: "Date", key: "createdAt", render: (row: any) => formatDate(row.createdAt) },
  ];

  const failedColumns = [
    { label: "Refund ID", key: "id", render: (row: any) => row.id },
    { label: "Order ID", key: "orderId", render: (row: any) => row.order?.orderNumber || "N/A" },
    { label: "Amount", key: "amount", render: (row: any) => formatCurrency(row.amount || 0) },
    { label: "Status", key: "status", render: (row: any) => <Badge status={row.status} /> },
    { label: "Action", key: "action", render: () => (
        <span className="text-xs font-medium text-red-500 italic">Admin Intervention Required</span>
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
