import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, RotateCcw, Package, Clock, CheckCircle, AlertTriangle, Eye, Play, Pause, RefreshCw, Search } from 'lucide-react';
import { workOrderService, WorkOrder, WoStatus } from '../../../api/packing/workOrderService';
import DataTable from '../../../components/packing/ui/DataTable';

const getStatusBadge = (status: WoStatus) => {
  switch (status) {
    case 'MATERIAL_ISSUED':
      return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">Material Issued</span>;
    case 'PACKING_STARTED':
      return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap">Packing Started</span>;
    case 'PACKING_IN_PROGRESS':
      return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">In Progress</span>;
    case 'PACKING_COMPLETED':
      return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">Packing Completed</span>;
    default:
      return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-gray-100 text-gray-700">{status}</span>;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgent</span>;
    case 'HIGH':
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">High</span>;
    case 'MEDIUM':
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Medium</span>;
    default:
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-300">Low</span>;
  }
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

  // Queue Filtering: Display only MATERIAL_ISSUED, PACKING_STARTED, PACKING_IN_PROGRESS, PACKING_COMPLETED
  const eligibleWOs = useMemo(() => {
    const validStatuses: WoStatus[] = [
      'MATERIAL_ISSUED',
      'PACKING_STARTED',
      'PACKING_IN_PROGRESS',
      'PACKING_COMPLETED',
    ];
    return workOrders.filter((w) => validStatuses.includes(w.status));
  }, [workOrders]);

  // Apply filters and search
  const filteredData = useMemo(() => {
    return eligibleWOs.filter((item) => {
      const matchesSearch =
        item.woNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.batchNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.operator?.name || item.supervisor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;
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
    if (w.status !== 'PACKING_COMPLETED') return false;
    if (!w.completedAt) return true;
    return new Date(w.completedAt).toDateString() === new Date().toDateString();
  }).length;
  const highPriorityCount = eligibleWOs.filter(
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
      label: 'WO NUMBER',
      className: 'w-[12%] text-center p-3',
      render: (row: WorkOrder) => (
        <span className="font-mono font-bold text-slate-800 dark:text-white">
          {row.woNumber}
        </span>
      ),
    },
    {
      key: 'product',
      label: 'PRODUCT',
      className: 'w-[18%] text-left p-3',
      render: (row: WorkOrder) => (
        <span className="font-semibold text-slate-800 dark:text-gray-200 truncate block max-w-[180px]">
          {row.product?.name || '-'}
        </span>
      ),
    },
    {
      key: 'batchNumber',
      label: 'BATCH NO.',
      className: 'w-[12%] text-center p-3',
      render: (row: WorkOrder) => (
        <span className="font-mono text-xs text-slate-600 dark:text-gray-300 font-semibold">
          {row.batchNumber || `BATCH-${row.woNumber}`}
        </span>
      ),
    },
    {
      key: 'operator',
      label: 'ASSIGNED OPERATOR',
      className: 'w-[14%] text-left p-3',
      render: (row: WorkOrder) => (
        <span className="font-medium text-slate-700 dark:text-gray-300">
          {row.operator?.name || row.supervisor?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'requiredQty',
      label: 'REQ QTY',
      className: 'w-[8%] text-center p-3',
      render: (row: WorkOrder) => (
        <span className="font-bold text-slate-800 dark:text-white">
          {row.requiredQty}
        </span>
      ),
    },
    {
      key: 'packedQty',
      label: 'PACKED QTY',
      className: 'w-[8%] text-center p-3',
      render: (row: WorkOrder) => (
        <span className="font-bold text-slate-800 dark:text-white">
          {row.actualProduced || 0}
        </span>
      ),
    },
    {
      key: 'progress',
      label: 'PROGRESS',
      className: 'w-[12%] text-center p-3',
      render: (row: WorkOrder) => {
        const req = row.requiredQty || 1;
        const packed = row.actualProduced || 0;
        const pct = Math.min(100, Math.round((packed / req) * 100));

        return (
          <div className="flex items-center justify-center gap-2">
            <div className="w-16 h-2 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
      className: 'w-[8%] text-center p-3',
      render: (row: WorkOrder) => (
        <div className="flex justify-center">{getPriorityBadge(row.priority)}</div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      className: 'w-[10%] text-center p-3',
      render: (row: WorkOrder) => (
        <div className="flex justify-center">{getStatusBadge(row.status)}</div>
      ),
    },
    {
      key: 'action',
      label: 'ACTION',
      className: 'w-[8%] text-center p-3',
      render: (row: WorkOrder) => (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => navigate(`/packing-erp/packing-execution/${row.id}`)}
            className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
            title="View Details & Execute Packing"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Packing Execution Workspace
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Monitor and execute floor packing jobs for issued materials.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
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
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
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
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
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
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              High Priority Jobs
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {highPriorityCount}
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
            <option value="ALL" className="dark:bg-gray-800">All Stages</option>
            <option value="MATERIAL_ISSUED" className="dark:bg-gray-800">Material Issued</option>
            <option value="PACKING_STARTED" className="dark:bg-gray-800">Packing Started</option>
            <option value="PACKING_IN_PROGRESS" className="dark:bg-gray-800">In Progress</option>
            <option value="PACKING_COMPLETED" className="dark:bg-gray-800">Completed</option>
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
            placeholder="Search WO No, product, or operator..."
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
          emptyMessage="No packing execution jobs found."
          keyExtractor={(row: WorkOrder) => row.id}
        />
      </div>
    </div>
  );
};

export default PackingExecution;
