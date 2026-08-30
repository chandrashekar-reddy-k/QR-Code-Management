import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  RotateCcw,
  Search,
} from 'lucide-react';
import { workOrderService, WorkOrder, WoStatus } from '../../../api/packing/workOrderService';
import DataTable from '../../../components/packing/ui/DataTable';
import ViewIconButton from '../../../components/ui/Button/ViewIconButton';

const formatStatus = (s: string, row?: WorkOrder) => {
  if (!s) return 'Draft';
  if (s === 'QC_PENDING') return 'QC Pending';
  if (s === 'QC_PASSED') return 'QC Passed';
  if (s === 'COMPLETED') return 'Packing Completed';
  if (s === 'LABEL_APPLICATION_ASSIGNED') return 'Labels Assigned';
  if (s === 'LABEL_APPLICATION_IN_PROGRESS') return 'Labeling In Progress';
  if (s === 'PACKING_STARTED' && row && (row.actualProduced || 0) > 0) {
    return 'Packing In Progress';
  }
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const getStatusColor = (statusLabel: string) => {
  switch (statusLabel.toUpperCase()) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'MATERIAL ISSUED':
    case 'MATERIAL_ISSUED':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'PACKING STARTED':
    case 'PACKING_STARTED':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'PACKING IN PROGRESS':
    case 'PACKING_IN_PROGRESS':
    case 'IN PROGRESS':
    case 'LABELING IN PROGRESS':
    case 'LABEL_APPLICATION_IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'PACKING COMPLETED':
    case 'PACKING_COMPLETED':
    case 'COMPLETED':
    case 'LABELS APPLIED':
    case 'LABELS_APPLIED':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'LABELS ASSIGNED':
    case 'LABEL_APPLICATION_ASSIGNED':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority?.toUpperCase()) {
    case 'LOW':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    case 'MEDIUM':
      return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
    case 'URGENT':
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

const fmtDateTime = (dStr?: string) => {
  if (!dStr) return '—';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day}-${month}-${year} ${time}`;
};

export const PackingExecution: React.FC = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await workOrderService.getWorkOrders();
      setWorkOrders(res.data || []);
    } catch (e) {
      console.error('Failed to fetch work orders for packing execution:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Queue Filtering: Display only MATERIAL_ISSUED, PACKING_STARTED, PACKING_IN_PROGRESS, PACKING_COMPLETED, LABEL_APPLICATION_ASSIGNED, LABEL_APPLICATION_IN_PROGRESS, LABELS_APPLIED, COMPLETED
  const eligibleWOs = useMemo(() => {
    const validStatuses: WoStatus[] = [
      'MATERIAL_ISSUED',
      'PACKING_STARTED',
      'PACKING_IN_PROGRESS',
      'PACKING_COMPLETED',
      'LABEL_APPLICATION_ASSIGNED',
      'LABEL_APPLICATION_IN_PROGRESS',
      'LABELS_APPLIED',
      'COMPLETED',
    ];
    return workOrders.filter((w) => validStatuses.includes(w.status));
  }, [workOrders]);

  // Apply filters and search
  const filteredData = useMemo(() => {
    return eligibleWOs.filter((item) => {
      const label = formatStatus(item.status, item);
      const matchesSearch =
        item.woNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.operator?.name || item.supervisor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter || label === statusFilter;
      const matchesPriority =
        priorityFilter === 'ALL' || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [eligibleWOs, searchTerm, statusFilter, priorityFilter]);

  // KPIs
  const totalJobs = eligibleWOs.length;
  const inProgressCount = eligibleWOs.filter(
    (w) => w.status === 'PACKING_STARTED' || w.status === 'PACKING_IN_PROGRESS'
  ).length;
  const completedTodayCount = eligibleWOs.filter((w) => {
    if (w.status !== 'PACKING_COMPLETED' && w.status !== 'COMPLETED') return false;
    if (!w.completedAt) return true;
    return new Date(w.completedAt).toDateString() === new Date().toDateString();
  }).length;
  const delayedCount = eligibleWOs.filter(
    (w) => w.priority === 'URGENT' || w.priority === 'HIGH'
  ).length;

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

  const columns = [
    {
      key: 'woNumber',
      label: 'WORK ORDER NO.',
      className: 'w-[10%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <span className="font-mono font-bold text-xs text-slate-800 dark:text-white">
          {row.woNumber}
        </span>
      ),
    },
    {
      key: 'product',
      label: 'PRODUCT',
      className: 'w-[16%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <span className="font-semibold text-xs text-slate-800 dark:text-gray-200 truncate block max-w-[180px]">
          {row.product?.name || '-'}
        </span>
      ),
    },
    {
      key: 'operator',
      label: 'OPERATOR',
      className: 'w-[12%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <span className="text-xs font-medium text-slate-700 dark:text-gray-300">
          {row.operator?.name || row.supervisor?.name || row.operatorId || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'requiredQty',
      label: 'REQ. QTY',
      className: 'w-[8%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <span className="font-bold text-xs text-slate-800 dark:text-white font-mono">
          {row.requiredQty}
        </span>
      ),
    },
    {
      key: 'packedQty',
      label: 'PACKED QTY',
      className: 'w-[8%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <span className="font-bold text-xs text-slate-800 dark:text-white font-mono">
          {row.actualProduced || 0}
        </span>
      ),
    },
    {
      key: 'progress',
      label: 'PROGRESS',
      className: 'w-[10%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => {
        const req = row.requiredQty || 1;
        const packed = row.actualProduced || 0;
        const pct = Math.min(100, Math.round((packed / req) * 100));

        return (
          <div className="flex items-center justify-center gap-2">
            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00891D]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'priority',
      label: 'PRIORITY',
      className: 'w-[8%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <div className="flex justify-center">
          <span
            className={`px-2 py-0.5 text-[11px] rounded-full font-semibold whitespace-nowrap ${getPriorityColor(
              row.priority
            )}`}
          >
            {row.priority}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      className: 'w-[10%] text-center whitespace-normal',
      render: (row: WorkOrder) => {
        const label = formatStatus(row.status, row);
        return (
          <div className="flex justify-center">
            <span
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${getStatusColor(
                label
              )}`}
            >
              {label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'startedAt',
      label: 'START DATE & TIME',
      className: 'w-[12%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <span className="font-mono text-xs text-slate-600 dark:text-gray-400">
          {fmtDateTime(row.startedAt || row.updatedAt || row.createdAt)}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'ACTION',
      className: 'w-[6%] text-center whitespace-nowrap',
      render: (row: WorkOrder) => (
        <div className="flex justify-center">
          <ViewIconButton
            onClick={() => navigate(`/packing-erp/packing-execution/${row.id}`)}
            title="View Details"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Packing Execution
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Home &gt; Packing Execution
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              Total Packing Jobs
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {totalJobs}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              In Progress
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {inProgressCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              Completed Today
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {completedTodayCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              Delayed Jobs
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {delayedCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-xs h-10 overflow-hidden w-full xl:w-auto">
          <div className="px-3 flex items-center justify-center text-slate-500 dark:text-gray-400 shrink-0">
            <Filter size={16} />
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[140px] shrink-0"
          >
            <option value="ALL" className="dark:bg-gray-800">Status</option>
            <option value="MATERIAL_ISSUED" className="dark:bg-gray-800">Material Issued</option>
            <option value="PACKING_STARTED" className="dark:bg-gray-800">Packing Started</option>
            <option value="PACKING_IN_PROGRESS" className="dark:bg-gray-800">Packing In Progress</option>
            <option value="PACKING_COMPLETED" className="dark:bg-gray-800">Packing Completed</option>
            <option value="LABEL_APPLICATION_ASSIGNED" className="dark:bg-gray-800">Labels Assigned</option>
            <option value="LABEL_APPLICATION_IN_PROGRESS" className="dark:bg-gray-800">Labeling In Progress</option>
            <option value="LABELS_APPLIED" className="dark:bg-gray-800">Labels Applied</option>
            <option value="COMPLETED" className="dark:bg-gray-800">Completed</option>
          </select>

          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[120px] shrink-0"
          >
            <option value="ALL" className="dark:bg-gray-800">Priority</option>
            <option value="LOW" className="dark:bg-gray-800">Low</option>
            <option value="MEDIUM" className="dark:bg-gray-800">Medium</option>
            <option value="HIGH" className="dark:bg-gray-800">High</option>
            <option value="URGENT" className="dark:bg-gray-800">Urgent</option>
          </select>

          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent cursor-pointer shrink-0"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>

        <div className="relative w-full xl:w-72">
          <Search
            className="absolute left-3 top-2.5 text-slate-400 dark:text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          emptyMessage="No work orders found"
          keyExtractor={(row: WorkOrder) => row.id}
        />
      </div>
    </div>
  );
};

export default PackingExecution;
