import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import DataTable from '../../../components/packing/ui/DataTable';
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  RotateCcw,
  Eye,
} from 'lucide-react';

export const PackingMaterialIssue: React.FC = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('APPROVED');

  const fetchWO = async () => {
    try {
      setLoading(true);
      const res = await workOrderService.getWorkOrders();
      setWorkOrders(res.data || []);
    } catch (e) {
      console.error('Failed to fetch Work Orders for Material Issue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWO();
  }, []);

  // Filter to eligible Material Issue work orders (APPROVED or MATERIAL_ISSUED)
  const eligibleIssues = useMemo(() => {
    return workOrders.filter(
      (w) => w.status === 'APPROVED' || w.status === 'MATERIAL_ISSUED'
    );
  }, [workOrders]);

  // KPIs
  const totalRequests = eligibleIssues.length;
  const pendingCount = eligibleIssues.filter((w) => w.status === 'APPROVED').length;
  const issuedToday = eligibleIssues.filter((w) => w.status === 'MATERIAL_ISSUED').length;
  const delayed = 0;

  // Apply filters and search
  const filteredData = useMemo(() => {
    return eligibleIssues.filter((item) => {
      const matchesSearch =
        item.woNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.recipe?.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.operator?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [eligibleIssues, searchQuery, statusFilter]);

  const columns = [
    {
      key: 'woNumber',
      label: 'WO No',
      className: 'w-[12%] text-center p-3',
      render: (row: WorkOrder) => (
        <span className="font-mono text-slate-800 dark:text-white font-bold">
          {row.woNumber}
        </span>
      ),
    },
    {
      key: 'product',
      label: 'Output Product',
      className: 'w-[18%] text-left p-3',
      render: (row: WorkOrder) => (
        <span className="font-semibold text-slate-800 dark:text-gray-200 truncate block max-w-[180px]">
          {row.product?.name || '-'}
        </span>
      ),
    },
    {
      key: 'recipe',
      label: 'Product BOM',
      className: 'w-[14%] text-left p-3',
      render: (row: WorkOrder) => (
        <span className="font-mono text-slate-600 dark:text-gray-300">
          {row.recipe?.code || row.recipeId || '-'}
        </span>
      ),
    },
    {
      key: 'reqQty',
      label: 'Planned Qty',
      className: 'w-[10%] text-center p-3',
      render: (row: WorkOrder) => (
        <span className="font-bold text-slate-800 dark:text-white">
          {row.requiredQty}
        </span>
      ),
    },
    {
      key: 'rawMaterials',
      label: 'Raw Materials',
      className: 'w-[10%] text-center p-3',
      render: (row: WorkOrder) => {
        const rawCount =
          row.recipe?.items?.filter((i) => !i.isPackaging).length || 0;
        return (
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {rawCount} items
          </span>
        );
      },
    },
    {
      key: 'packagingMaterials',
      label: 'Packaging',
      className: 'w-[10%] text-center p-3',
      render: (row: WorkOrder) => {
        const pkgCount =
          row.recipe?.items?.filter((i) => i.isPackaging).length || 0;
        return (
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {pkgCount} items
          </span>
        );
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      className: 'w-[10%] text-center p-3',
      render: (row: WorkOrder) => (
        <div className="flex justify-center">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              row.priority === 'URGENT'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : row.priority === 'HIGH'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
            }`}
          >
            {row.priority}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      className: 'w-[10%] text-center p-3',
      render: (row: WorkOrder) => {
        let displayStatus = 'PENDING';
        let colorClass =
          'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-800';

        if (row.status === 'MATERIAL_ISSUED') {
          displayStatus = 'ISSUED';
          colorClass =
            'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        }

        return (
          <div className="flex justify-center">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-normal whitespace-nowrap ${colorClass}`}
            >
              {displayStatus}
            </span>
          </div>
        );
      },
    },
    {
      key: 'action',
      label: 'Action',
      className: 'w-[6%] text-center p-3',
      render: (row: WorkOrder) => (
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/packing-erp/material-issue/${row.id}`)}
            className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
            title="View & Issue Materials"
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
            Material Issue Queue
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Dispatch raw materials and packaging for approved work orders.
          </p>
        </div>
        <button
          onClick={fetchWO}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Total Requests
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {totalRequests}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Pending Issues
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {pendingCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Issued Today
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {issuedToday}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Calendar size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Delayed Requests
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {delayed}
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
            <option value="APPROVED" className="dark:bg-gray-800">Pending (Approved WOs)</option>
            <option value="MATERIAL_ISSUED" className="dark:bg-gray-800">Issued</option>
            <option value="ALL" className="dark:bg-gray-800">All Eligible</option>
          </select>

          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <button
            onClick={() => {
              setStatusFilter('APPROVED');
              setSearchQuery('');
            }}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          emptyMessage="No approved work orders pending material issue."
          keyExtractor={(row: WorkOrder) => row.id}
        />
      </div>
    </div>
  );
};

export default PackingMaterialIssue;
