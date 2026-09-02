import React, { useState, useEffect, useMemo } from 'react';
import {
  workOrderService,
  WoStatus,
  WoPriority,
  WorkOrder,
} from '../../../api/packing/workOrderService';
import { masterDataService, Recipe } from '../../../api/packing/masterDataService';
import { authService, User } from '../../../api/packing/authService';
import {
  Plus,
  Search,
  Calendar,
  X,
  Check,
  Clipboard,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Edit,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Eye,
  Loader2,
  ClipboardList,
  FileEdit,
  Clock,
  CheckCircle2,
  Package,
  Shield,
  CheckCircle,
} from 'lucide-react';

const KANBAN_COLUMNS: WoStatus[] = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'MATERIAL_ISSUED',
  'PACKING_STARTED',
  'PACKING_IN_PROGRESS',
  'PACKING_COMPLETED',
  'LABEL_APPLICATION_ASSIGNED',
  'LABEL_APPLICATION_IN_PROGRESS',
  'LABELS_APPLIED',
  'QC_PENDING',
  'QC_IN_PROGRESS',
  'QC_PASSED',
  'COMPLETED',
  'CANCELLED',
];

interface TimelineStep {
  status: WoStatus;
  label: string;
  desc: string;
}

export const PackingWorkOrders: React.FC = () => {
  const [apiWorkOrders, setApiWorkOrders] = useState<WorkOrder[]>([]);
  const [apiWorkOrdersLoading, setApiWorkOrdersLoading] = useState(true);

  const [apiOperators, setApiOperators] = useState<User[]>([]);
  const [apiRecipes, setApiRecipes] = useState<Recipe[]>([]);
  const [apiRecipesLoading, setApiRecipesLoading] = useState(false);
  const [apiRecipesError, setApiRecipesError] = useState('');

  // View mode state
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterSupervisor, setFilterSupervisor] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  // Selected KPI Filter
  const [kpiFilter, setKpiFilter] = useState<string>('all');

  // Drawer / Details state
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<WorkOrder | null>(null);

  // Create Form states
  const [formRecipeId, setFormRecipeId] = useState('');
  const [formQty, setFormQty] = useState(100);
  const [formPriority, setFormPriority] = useState<WoPriority>('MEDIUM');
  const [formOperatorName, setFormOperatorName] = useState<string>('');
  const [formExpectedCompletion, setFormExpectedCompletion] = useState('');

  // Edit Form states
  const [editQty, setEditQty] = useState(100);
  const [editPriority, setEditPriority] = useState<WoPriority>('MEDIUM');
  const [editSupervisor, setEditSupervisor] = useState('');
  const [editExpectedCompletion, setEditExpectedCompletion] = useState('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchWorkOrders = async () => {
    setApiWorkOrdersLoading(true);
    try {
      const res = await workOrderService.getWorkOrders();
      setApiWorkOrders(res.data || []);
    } catch (e) {
      console.error('Failed to fetch work orders:', e);
    } finally {
      setApiWorkOrdersLoading(false);
    }
  };

  const fetchOperators = async () => {
    try {
      const ops = await authService.getOperators();
      setApiOperators(ops || []);
    } catch (e) {
      console.error('Failed to fetch operators:', e);
    }
  };

  const fetchRecipes = async () => {
    setApiRecipesLoading(true);
    setApiRecipesError('');
    try {
      const data = await masterDataService.getRecipes();
      setApiRecipes(data || []);
    } catch (err: any) {
      setApiRecipesError(
        err.response?.data?.message || 'Failed to load recipes from server.'
      );
    } finally {
      setApiRecipesLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchOperators();
    fetchRecipes();
  }, []);

  const handleRefresh = () => {
    fetchWorkOrders();
    showToast('Work orders list refreshed successfully!');
  };

  const workOrders = apiWorkOrders;

  const supervisors = useMemo(
    () =>
      Array.from(
        new Set(
          workOrders.map(
            (wo) => wo.operator?.name || wo.supervisor?.name || wo.supervisorId
          )
        )
      ).filter(Boolean),
    [workOrders]
  );

  // Derived summaries for KPI Cards
  const summary = useMemo(() => {
    return {
      total: workOrders.length,
      draft: workOrders.filter((w) => w.status === 'DRAFT').length,
      pending: workOrders.filter((w) => w.status === 'PENDING').length,
      approved: workOrders.filter((w) => w.status === 'APPROVED').length,
      packingStarted: workOrders.filter((w) => w.status === 'PACKING_STARTED')
        .length,
      qcPending: workOrders.filter((w) => w.status === 'QC_PENDING').length,
      completed: workOrders.filter((w) => w.status === 'COMPLETED').length,
    };
  }, [workOrders]);

  // Filter application
  const filteredWOs = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchesSearch =
        (wo.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (wo.woNumber || wo.id).toLowerCase().includes(search.toLowerCase()) ||
        (wo.recipe?.code || wo.recipeId || '')
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus = filterStatus === 'All' || wo.status === filterStatus;
      const matchesPriority =
        filterPriority === 'All' || wo.priority === filterPriority;
      const matchesSupervisor =
        filterSupervisor === 'All' ||
        (wo.operator?.name || wo.supervisor?.name || '') === filterSupervisor;
      const woDatePrefix = wo.expectedDate ? wo.expectedDate.substring(0, 10) : '';
      const matchesDate = !filterDate || woDatePrefix === filterDate;

      let matchesKpi = true;
      if (kpiFilter === 'draft') matchesKpi = wo.status === 'DRAFT';
      else if (kpiFilter === 'pending') matchesKpi = wo.status === 'PENDING';
      else if (kpiFilter === 'approved') matchesKpi = wo.status === 'APPROVED';
      else if (kpiFilter === 'packing_started')
        matchesKpi = wo.status === 'PACKING_STARTED';
      else if (kpiFilter === 'qc_pending') matchesKpi = wo.status === 'QC_PENDING';
      else if (kpiFilter === 'completed') matchesKpi = wo.status === 'COMPLETED';

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesSupervisor &&
        matchesDate &&
        matchesKpi
      );
    });
  }, [
    workOrders,
    search,
    filterStatus,
    filterPriority,
    filterSupervisor,
    filterDate,
    kpiFilter,
  ]);

  // Pagination logic
  const paginatedWOs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredWOs.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredWOs, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredWOs.length / rowsPerPage);

  const selectedRecipe = apiRecipes.find((r) => r.id === formRecipeId);

  // Status colors utility
  const getStatusColor = (status: WorkOrder['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
      case 'PENDING':
        return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'APPROVED':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'MATERIAL_ISSUED':
        return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'PACKING_STARTED':
      case 'PACKING_IN_PROGRESS':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'PACKING_COMPLETED':
        return 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'LABEL_APPLICATION_ASSIGNED':
      case 'LABEL_APPLICATION_IN_PROGRESS':
      case 'LABELS_APPLIED':
        return 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'QC_PENDING':
        return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'QC_PASSED':
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'COMPLETED':
        return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700';
      case 'CANCELLED':
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  // Priority colors utility
  const getPriorityStyle = (p: WorkOrder['priority']) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 font-bold';
      case 'HIGH':
        return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'MEDIUM':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'LOW':
        return 'bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-600';
    }
  };

  // Create Form Handler
  const handleCreateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecipeId) return;

    const recipe = apiRecipes.find((r) => r.id === formRecipeId);
    if (!recipe) return;

    try {
      await workOrderService.createWorkOrder({
        productId: recipe.outputProductId,
        recipeId: formRecipeId,
        requiredQty: Number(formQty),
        priority: formPriority,
        expectedDate: formExpectedCompletion
          ? new Date(formExpectedCompletion).toISOString()
          : undefined,
        operatorId: formOperatorName || undefined,
      });
      setIsCreateOpen(false);
      showToast('Work order created successfully as DRAFT.');
      fetchWorkOrders();
      setFormRecipeId('');
      setFormQty(100);
      setFormPriority('MEDIUM');
      setFormOperatorName('');
      setFormExpectedCompletion('');
    } catch (err: any) {
      showToast(
        err.response?.data?.message || err.message || 'Error creating Work Order'
      );
    }
  };

  // Edit WO Handler
  const handleOpenEdit = (wo: WorkOrder) => {
    setIsEditOpen(wo);
    setEditQty(wo.requiredQty);
    setEditPriority(wo.priority);
    setEditSupervisor(wo.operatorId || wo.operator?.id || '');
    setEditExpectedCompletion(
      wo.expectedDate
        ? new Date(wo.expectedDate).toISOString().substring(0, 10)
        : ''
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditOpen) return;
    try {
      await workOrderService.updateWorkOrderStatus(isEditOpen.id, isEditOpen.status, {
        requiredQty: editQty,
        priority: editPriority,
        operatorId: editSupervisor || undefined,
        expectedDate: editExpectedCompletion
          ? new Date(editExpectedCompletion).toISOString()
          : undefined,
      });
      setIsEditOpen(null);
      showToast('Work order updated successfully.');
      fetchWorkOrders();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || err.message || 'Error updating Work Order'
      );
    }
  };

  // Workflow transition helper
  const canTransition = (from: WorkOrder['status'], to: WorkOrder['status']) => {
    if (from === to) return true;
    if (from === 'COMPLETED' || from === 'CANCELLED') return false;

    switch (from) {
      case 'DRAFT':
        return to === 'PENDING' || to === 'APPROVED' || to === 'CANCELLED';
      case 'PENDING':
        return to === 'APPROVED' || to === 'CANCELLED';
      case 'APPROVED':
        return (
          to === 'MATERIAL_ISSUED' || to === 'PACKING_STARTED' || to === 'CANCELLED'
        );
      case 'MATERIAL_ISSUED':
        return to === 'PACKING_STARTED' || to === 'CANCELLED';
      case 'PACKING_STARTED':
        return to === 'QC_PENDING' || to === 'CANCELLED';
      case 'QC_PENDING':
        return to === 'COMPLETED' || to === 'CANCELLED';
      default:
        return false;
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, woId: string) => {
    e.dataTransfer.setData('text/plain', woId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: WorkOrder['status']) => {
    e.preventDefault();
    const woId = e.dataTransfer.getData('text/plain');
    const wo = workOrders.find((w) => w.id === woId);

    if (wo) {
      if (canTransition(wo.status, targetStatus)) {
        workOrderService
          .updateWorkOrderStatus(woId, targetStatus)
          .then(fetchWorkOrders)
          .catch(console.error);
        showToast(
          `Workflow status updated: ${wo.woNumber || wo.id} is now ${targetStatus}.`
        );
      } else {
        showToast(`Transition not allowed from ${wo.status} to ${targetStatus}.`);
      }
    }
  };

  // Detail Drawer timeline list
  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (!selectedWO) return [];
    return [
      {
        status: 'DRAFT',
        label: 'Work Order Drafted',
        desc: `Created on ${
          selectedWO.createdAt
            ? new Date(selectedWO.createdAt).toLocaleDateString()
            : 'N/A'
        }.`,
      },
      {
        status: 'PENDING',
        label: 'Submitted for Approval',
        desc: `Awaiting store manager authorization in Approvals module.`,
      },
      {
        status: 'APPROVED',
        label: 'Authorized & Approved',
        desc: selectedWO.operator?.name
          ? `Assigned to operator ${selectedWO.operator.name}.`
          : 'Work order authorized & approved for material issue.',
      },
      {
        status: 'MATERIAL_ISSUED',
        label: 'Raw Materials Issued',
        desc: `BOM inventory dispatched to packing line.`,
      },
      {
        status: 'PACKING_STARTED',
        label: 'Packing Execution Started',
        desc: `Currently active on floor.`,
      },
      {
        status: 'QC_PENDING',
        label: 'QC Audit Verification',
        desc: `Quality checks pending evaluation.`,
      },
      {
        status: 'COMPLETED',
        label: 'COMPLETED',
        desc: `Finished goods safely posted.`,
      },
    ];
  }, [selectedWO]);

  return (
    <div className="space-y-5 text-left font-sans select-none pb-12">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-55 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clipboard className="text-[#00891D]" size={20} />
            <span>Packing Work Orders</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Create, approve, assign and monitor packing work orders across all workflow stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-[#00891D] hover:bg-[#007518] text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Work Order</span>
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {[
          {
            key: 'all',
            title: 'Total Work Orders',
            count: summary.total,
            icon: ClipboardList,
            color: 'text-gray-500',
          },
          {
            key: 'draft',
            title: 'DRAFT',
            count: summary.draft,
            icon: FileEdit,
            color: 'text-gray-400',
          },
          {
            key: 'pending',
            title: 'PENDING',
            count: summary.pending,
            icon: Clock,
            color: 'text-amber-500',
          },
          {
            key: 'approved',
            title: 'APPROVED',
            count: summary.approved,
            icon: CheckCircle2,
            color: 'text-blue-500',
          },
          {
            key: 'packing_started',
            title: 'PACKING STARTED',
            count: summary.packingStarted,
            icon: Package,
            color: 'text-indigo-500',
          },
          {
            key: 'qc_pending',
            title: 'QC PENDING',
            count: summary.qcPending,
            icon: Shield,
            color: 'text-orange-500',
          },
          {
            key: 'completed',
            title: 'COMPLETED',
            count: summary.completed,
            icon: CheckCircle,
            color: 'text-emerald-500',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              onClick={() =>
                setKpiFilter((prev) => (prev === card.key ? 'all' : card.key))
              }
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                kpiFilter === card.key
                  ? 'border-[#00891D] bg-green-50/30 dark:bg-green-900/20 ring-1 ring-[#00891D]'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate block">
                  {card.title}
                </span>
                <Icon size={14} className={card.color} />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white block">
                {card.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* SEARCH & FILTERS SECTION */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        {/* Filters Group */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs h-10 overflow-hidden w-full xl:w-auto">
          <div className="px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
            <Filter size={16} />
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[100px] shrink-0"
          >
            <option value="All" className="dark:bg-gray-800">Status</option>
            {KANBAN_COLUMNS.map((col) => (
              <option key={col} value={col} className="dark:bg-gray-800">
                {col}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[100px] shrink-0"
          >
            <option value="All" className="dark:bg-gray-800">Priority</option>
            <option value="LOW" className="dark:bg-gray-800">Low</option>
            <option value="MEDIUM" className="dark:bg-gray-800">Medium</option>
            <option value="HIGH" className="dark:bg-gray-800">High</option>
            <option value="URGENT" className="dark:bg-gray-800">Urgent</option>
          </select>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <select
            value={filterSupervisor}
            onChange={(e) => setFilterSupervisor(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[110px] shrink-0"
          >
            <option value="All" className="dark:bg-gray-800">Operator</option>
            {supervisors.map((s) => (
              <option key={s} value={s} className="dark:bg-gray-800">
                {s}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <button
            onClick={() => {
              setFilterStatus('All');
              setFilterPriority('All');
              setFilterSupervisor('All');
              setFilterDate('');
              setSearch('');
              setKpiFilter('all');
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent cursor-pointer shrink-0"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>

        {/* Right side: Search & View Switcher */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search WO, Product, BOM..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] transition-all shadow-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg p-1 bg-gray-50 dark:bg-gray-800 h-[38px] w-full sm:w-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-700 shadow-xs text-[#00891D] dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <TableIcon size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-700 shadow-xs text-[#00891D] dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* DATA VIEWS CONTAINER */}
      {filteredWOs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-16 text-center space-y-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Clipboard size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              No Work Orders Found
            </h3>
            <p className="text-xs text-gray-400">
              There are no work orders matching the selected criteria.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#00891D] hover:bg-[#007518] text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Create Work Order
          </button>
        </div>
      ) : viewMode === 'table' ? (
        // TABLE VIEW
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-hidden max-h-[60vh]">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-gray-500 dark:text-gray-300 font-bold uppercase">
                  <th className="p-3">Work Order No</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Product BOM</th>
                  <th className="p-3 text-right">Required Quantity</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expected Completion</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {apiWorkOrdersLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        <span>Loading work orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedWOs.map((wo) => (
                    <tr
                      key={wo.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-gray-700 dark:text-gray-200">
                        {wo.woNumber || wo.id}
                      </td>
                      <td className="p-3 font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                        {wo.product?.name || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300 font-medium">
                        {wo.recipe?.code || wo.recipeId || '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                        {wo.requiredQty}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300 font-medium">
                        {wo.operator?.name || 'Unassigned'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityStyle(
                            wo.priority
                          )}`}
                        >
                          {wo.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-normal whitespace-nowrap ${getStatusColor(
                            wo.status
                          )}`}
                        >
                          {wo.status ? wo.status.replace(/_/g, ' ') : ''}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300 font-mono">
                        {wo.expectedDate
                          ? new Date(wo.expectedDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedWO(wo)}
                            className="text-gray-400 hover:text-[#00891D] transition-colors p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer inline-flex items-center justify-center"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 dark:text-white focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {(currentPage - 1) * rowsPerPage + 1} -{' '}
                {Math.min(currentPage * rowsPerPage, filteredWOs.length)} of{' '}
                {filteredWOs.length} orders
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-bold dark:text-white">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        // KANBAN VIEW
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-[1800px]">
            {KANBAN_COLUMNS.map((column) => {
              const columnWOs = filteredWOs.filter((w) => w.status === column);

              return (
                <div
                  key={column}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column)}
                  className="flex-1 min-w-[220px] max-w-[260px] bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex flex-col max-h-[70vh]"
                >
                  <div className="flex justify-between items-center mb-3 px-1 text-left">
                    <span className="font-bold text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {column}
                    </span>
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {columnWOs.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                    {columnWOs.map((wo) => (
                      <div
                        key={wo.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, wo.id)}
                        onClick={() => setSelectedWO(wo)}
                        className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs hover:border-[#00891D] hover:shadow-sm transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2 relative text-left"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[9px] font-bold text-gray-400 dark:text-gray-400">
                            {wo.woNumber || wo.id}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${getPriorityStyle(
                              wo.priority
                            )}`}
                          >
                            {wo.priority}
                          </span>
                        </div>

                        <div className="text-xs">
                          <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                            {wo.product?.name || '-'}
                          </h4>
                          <span className="text-[9px] text-gray-400 dark:text-gray-400 block font-medium mt-0.5">
                            Product BOM: {wo.recipe?.code || wo.recipeId}
                          </span>
                        </div>

                        <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between">
                            <span>Req Qty:</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              {wo.requiredQty}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Operator:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                              {wo.operator?.name || 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Due Date:</span>
                            <span className="font-mono font-bold text-gray-600 dark:text-gray-300">
                              {wo.expectedDate
                                ? new Date(wo.expectedDate).toLocaleDateString()
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {columnWOs.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-gray-400 dark:text-gray-400 bg-white/40 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <span>No orders</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selectedWO && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md h-screen overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6 text-left">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold text-[#00891D] uppercase tracking-widest">
                    {selectedWO.woNumber}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Work Order Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedWO(null)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Work Order Information Grid */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-150 dark:divide-gray-700 overflow-hidden bg-white dark:bg-gray-800 text-xs">
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Work Order No
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedWO.woNumber}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Product
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white text-right max-w-[220px]">
                    {selectedWO.product?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Product BOM
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedWO.recipe?.code || selectedWO.recipeId}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Required Quantity
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedWO.requiredQty} Units
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Operator
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedWO.operator?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Priority
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityStyle(
                      selectedWO.priority
                    )}`}
                  >
                    {selectedWO.priority}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Status
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(
                      selectedWO.status
                    )}`}
                  >
                    {selectedWO.status ? selectedWO.status.replace(/_/g, ' ') : ''}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Expected Completion
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedWO.expectedDate
                      ? new Date(selectedWO.expectedDate).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Work Order Timeline
                </h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-600">
                  {timelineSteps.map((step, idx) => {
                    const getTimelineLevel = (s: string): number => {
                      switch (s) {
                        case 'DRAFT':
                          return 0;
                        case 'PENDING':
                        case 'PENDING_APPROVAL':
                          return 1;
                        case 'APPROVED':
                          return 2;
                        case 'MATERIAL_ISSUED':
                          return 3;
                        case 'PACKING_STARTED':
                        case 'PACKING_IN_PROGRESS':
                          return 4;
                        case 'PACKING_COMPLETED':
                        case 'LABELS_PRINTED':
                        case 'QC_PENDING':
                          return 5;
                        case 'QC_PASSED':
                        case 'FINISHED_GOODS':
                        case 'COMPLETED':
                          return 6;
                        default:
                          return 0;
                      }
                    };
                    const woLevel = getTimelineLevel(selectedWO.status);
                    const stepLevel = getTimelineLevel(step.status);
                    const isActive = woLevel === stepLevel;
                    const isPast = woLevel >= stepLevel;

                    return (
                      <div key={idx} className="flex gap-3 relative z-10 text-xs">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-gray-800 ${
                            isActive
                              ? 'bg-[#00891D] ring-2 ring-[#00891D]/20'
                              : isPast
                              ? 'bg-[#00891D]'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          {isPast ? (
                            <Check size={8} />
                          ) : (
                            <span className="text-[7px]">{idx + 1}</span>
                          )}
                        </div>
                        <div>
                          <span
                            className={`font-bold block ${
                              isActive
                                ? 'text-[#00891D] dark:text-green-400'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-400 block mt-0.5">
                            {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 -mx-6 -mb-6 rounded-b-lg">
              <div className="flex gap-2">
                {selectedWO.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={() => {
                        handleOpenEdit(selectedWO);
                        setSelectedWO(null);
                      }}
                      className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg font-bold cursor-pointer text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        workOrderService
                          .updateWorkOrderStatus(selectedWO.id, 'PENDING')
                          .then(() => {
                            showToast('Work order submitted for approval.');
                            setSelectedWO(null);
                            fetchWorkOrders();
                          })
                          .catch(console.error);
                      }}
                      className="bg-[#00891D] hover:bg-[#007518] text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer text-xs"
                    >
                      Submit for Approval
                    </button>
                  </>
                )}

                {selectedWO.status === 'PENDING' && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-lg">
                    Pending Approval in Approvals Module
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedWO(null)}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORK ORDER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-900 text-white rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Calendar size={16} />
                <span>Create Packing Work Order</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateWO}
              className="p-5 space-y-4 flex-1 text-left text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex justify-between items-center">
                  <span>Select Product BOM *</span>
                  <button
                    type="button"
                    onClick={fetchRecipes}
                    className="text-[#00891D] dark:text-green-400 hover:underline"
                    disabled={apiRecipesLoading}
                  >
                    {apiRecipesLoading ? 'Loading...' : 'Refresh BOMs'}
                  </button>
                </label>
                {apiRecipesError ? (
                  <div className="text-red-600 text-xs py-2">{apiRecipesError}</div>
                ) : apiRecipes.length === 0 && !apiRecipesLoading ? (
                  <div className="text-gray-500 dark:text-gray-400 text-xs py-2">
                    No eligible BOMs available. Create one in Product BOM first.
                  </div>
                ) : (
                  <select
                    required
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg bg-white focus:ring-1 focus:ring-[#00891D] focus:outline-none"
                    value={formRecipeId}
                    onChange={(e) => setFormRecipeId(e.target.value)}
                  >
                    <option value="" className="dark:bg-gray-800">
                      {apiRecipesLoading
                        ? 'Loading BOMs...'
                        : '-- Choose Product BOM Configuration --'}
                    </option>
                    {apiRecipes
                      .filter((r) => r.isActive !== false)
                      .map((r) => (
                        <option key={r.id} value={r.id} className="dark:bg-gray-800">
                          {r.code} - {r.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Required Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Priority *
                  </label>
                  <select
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none"
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(e.target.value as WoPriority)
                    }
                  >
                    <option value="LOW" className="dark:bg-gray-800">Low</option>
                    <option value="MEDIUM" className="dark:bg-gray-800">Medium</option>
                    <option value="HIGH" className="dark:bg-gray-800">High</option>
                    <option value="URGENT" className="dark:bg-gray-800">Urgent</option>
                  </select>
                </div>
              </div>

              {selectedRecipe && (
                <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1 text-[11px]">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block mb-1">
                    BOM Raw Materials & Packaging Requirements
                  </span>
                  {selectedRecipe.items?.map((item, idx) => {
                    const reqQty =
                      (item.requiredQty / (selectedRecipe.outputQty || 1)) * formQty;
                    return (
                      <div
                        key={idx}
                        className="flex justify-between text-gray-600 dark:text-gray-300 font-medium"
                      >
                        <span>
                          {item.inputProduct?.name || item.inputProductId}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {reqQty.toFixed(1)}{' '}
                          {item.isPackaging ? 'Units' : 'kg'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Expected Completion *
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none"
                  value={formExpectedCompletion}
                  onChange={(e) => setFormExpectedCompletion(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Assigned Operator
                </label>
                <select
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none"
                  value={formOperatorName}
                  onChange={(e) => setFormOperatorName(e.target.value)}
                >
                  <option value="" className="dark:bg-gray-800">Select an operator...</option>
                  {apiOperators.map((op) => (
                    <option key={op.id} value={op.id} className="dark:bg-gray-800">
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800 p-3 -mx-5 -mb-5 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00891D] hover:bg-[#007518] text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORK ORDER MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-900 text-white rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Edit size={16} />
                <span>Edit Work Order {isEditOpen.woNumber}</span>
              </h3>
              <button
                onClick={() => setIsEditOpen(null)}
                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveEdit}
              className="p-5 space-y-4 flex-1 text-left text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Product Configuration
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-lg"
                  value={`${isEditOpen.product?.name || ''} (${
                    isEditOpen.recipe?.code || isEditOpen.recipeId
                  })`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Required Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Priority *
                  </label>
                  <select
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none"
                    value={editPriority}
                    onChange={(e) =>
                      setEditPriority(e.target.value as WoPriority)
                    }
                  >
                    <option value="LOW" className="dark:bg-gray-800">Low</option>
                    <option value="MEDIUM" className="dark:bg-gray-800">Medium</option>
                    <option value="HIGH" className="dark:bg-gray-800">High</option>
                    <option value="URGENT" className="dark:bg-gray-800">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Expected Completion *
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none"
                  value={editExpectedCompletion}
                  onChange={(e) => setEditExpectedCompletion(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Operator
                </label>
                <select
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none"
                  value={editSupervisor}
                  onChange={(e) => setEditSupervisor(e.target.value)}
                >
                  <option value="" className="dark:bg-gray-800">Select an operator...</option>
                  {apiOperators.map((op) => (
                    <option key={op.id} value={op.id} className="dark:bg-gray-800">
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800 p-3 -mx-5 -mb-5 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00891D] hover:bg-[#007518] text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingWorkOrders;
