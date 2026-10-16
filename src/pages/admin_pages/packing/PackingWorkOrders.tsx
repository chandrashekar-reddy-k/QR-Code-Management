import React, { useState, useEffect, useMemo } from 'react';
import {
  workOrderService,
  WoStatus,
  WoPriority,
  WorkOrder,
} from '../../../api/packing/workOrderService';
import { masterDataService } from '../../../api/packing/masterDataService';
import { resolveProductAndSku } from './PackingExecutionDetails';
import { authService, User } from '../../../api/packing/authService';
import { CreateWorkOrderFlow } from './CreateWorkOrderFlow';
import {
  Plus,
  Search,
  X,
  Check,
  Clipboard,
  LayoutGrid,
  Table as TableIcon,
  Edit,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Eye,
  Loader2,
  Trash2,
  CheckCircle,
  UserCheck,
} from 'lucide-react';

const KANBAN_COLUMNS: WoStatus[] = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'LABELS_PRINTED',
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

const resolveProductUnit = (product: any): string => {
  if (!product) return 'Units';
  let rawUnit =
    product.uom?.abbreviation ||
    product.uom?.name ||
    (typeof product.unit === 'object'
      ? product.unit?.name || product.unit?.type
      : product.unit);
  if (
    !rawUnit ||
    /^[0-9a-f-]{36}$/i.test(String(rawUnit).trim()) ||
    /^\d+$/.test(String(rawUnit).trim()) ||
    String(rawUnit).length > 20
  ) {
    const textToSearch = `${product.sku || ''} ${product.variantName || ''} ${product.name || ''}`.toUpperCase();
    if (textToSearch.includes('KG') || textToSearch.includes('KILOGRAM')) {
      return 'kg';
    } else if (
      textToSearch.includes('GRAM') ||
      textToSearch.includes(' GM') ||
      textToSearch.includes(' G')
    ) {
      return 'gm';
    } else if (
      textToSearch.includes('ML') ||
      textToSearch.includes('MILLILITRE')
    ) {
      return 'ml';
    } else if (
      textToSearch.includes('LITRE') ||
      textToSearch.includes(' LTR') ||
      textToSearch.includes(' L')
    ) {
      return 'L';
    } else if (
      textToSearch.includes('PACKET') ||
      textToSearch.includes('PCS') ||
      textToSearch.includes('PIECE')
    ) {
      return 'pcs';
    }
    return product.unitName || product.uom || 'Units';
  }
  return String(rawUnit);
};

export const resolveDisplayStatus = (wo?: WorkOrder | null): WoStatus => {
  if (!wo) return 'DRAFT';
  if (wo.status === 'PACKING_STARTED' && (wo.actualProduced || 0) > 0) {
    return 'PACKING_IN_PROGRESS';
  }
  return wo.status;
};

export const PackingWorkOrders: React.FC = () => {
  const [apiWorkOrders, setApiWorkOrders] = useState<WorkOrder[]>([]);
  const [apiWorkOrdersLoading, setApiWorkOrdersLoading] = useState(true);

  const [apiOperators, setApiOperators] = useState<User[]>([]);
  const [apiRecipes, setApiRecipes] = useState<any[]>([]);

  useEffect(() => {
    // Keep recipes in sync for creation flows
    if (apiRecipes.length > 0) {
      // recipes active
    }
  }, [apiRecipes]);


  // View mode state
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  // Selected KPI Filter
  const [kpiFilter, setKpiFilter] = useState<string>('all');

  // Drawer / Details state
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [deleteConfirmWO, setDeleteConfirmWO] = useState<WorkOrder | null>(null);
  const [assignPoWO, setAssignPoWO] = useState<WorkOrder | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [isAssigningPO, setIsAssigningPO] = useState<boolean>(false);

  // Inline edit state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

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
      const rawList = res.data || [];
      const parsedList = rawList.map((wo: any) => {
        let sourceItems = wo.sourceItems;
        if (typeof sourceItems === 'string') {
          try { sourceItems = JSON.parse(sourceItems); } catch (e) { sourceItems = null; }
        }
        let outputAllocations = wo.outputAllocations;
        if (typeof outputAllocations === 'string') {
          try { outputAllocations = JSON.parse(outputAllocations); } catch (e) { outputAllocations = null; }
        }
        return {
          ...wo,
          sourceItems: Array.isArray(sourceItems) ? sourceItems : null,
          outputAllocations: Array.isArray(outputAllocations) ? outputAllocations : null,
        };
      });
      setApiWorkOrders(parsedList);
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
    try {
      const data = await masterDataService.getRecipes();
      setApiRecipes(data || []);
      if (data && data.length > 0) {
        // Recipes loaded for work order creation
      }
    } catch (err: any) {
      console.error('Failed to load recipes:', err);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchOperators();
    fetchRecipes();
  }, []);


  const workOrders = useMemo(() => {
    return [...apiWorkOrders].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [apiWorkOrders]);

  // Filter staff agents who have the PACKING_OPERATOR role created under Packing Operator Portal
  const packingOperators = useMemo(() => {
    const poStaff = apiOperators.filter((op) => op.role === 'PACKING_OPERATOR');
    if (poStaff.length > 0) return poStaff;
    return apiOperators;
  }, [apiOperators]);

  // Filter application
  const filteredWOs = useMemo(() => {
    return workOrders.filter((wo) => {
      const displayStatus = resolveDisplayStatus(wo);
      const matchesSearch =
        (wo.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (wo.woNumber || wo.id).toLowerCase().includes(search.toLowerCase()) ||
        (wo.recipe?.code || wo.recipeId || '')
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        filterStatus === 'All' ||
        wo.status === filterStatus ||
        displayStatus === filterStatus;
      const matchesPriority =
        filterPriority === 'All' || wo.priority === filterPriority;
      const woDatePrefix = wo.expectedDate ? wo.expectedDate.substring(0, 10) : '';
      const matchesDate = !filterDate || woDatePrefix === filterDate;

      let matchesKpi = true;
      if (kpiFilter === 'draft') matchesKpi = wo.status === 'DRAFT';
      else if (kpiFilter === 'pending') matchesKpi = wo.status === 'PENDING';
      else if (kpiFilter === 'approved') matchesKpi = wo.status === 'APPROVED';
      else if (kpiFilter === 'packing_started')
        matchesKpi = displayStatus === 'PACKING_STARTED' || displayStatus === 'PACKING_IN_PROGRESS';
      else if (kpiFilter === 'qc_pending') matchesKpi = wo.status === 'QC_PENDING';
      else if (kpiFilter === 'completed') matchesKpi = wo.status === 'COMPLETED';

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesDate &&
        matchesKpi
      );
    });
  }, [
    workOrders,
    search,
    filterStatus,
    filterPriority,
    filterDate,
    kpiFilter,
  ]);

  // Pagination logic
  const paginatedWOs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredWOs.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredWOs, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredWOs.length / rowsPerPage);

  // Status colors utility
  const getStatusColor = (status: WorkOrder['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
      case 'PENDING':
        return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'APPROVED':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'LABELS_PRINTED':
        return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
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
      default:
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };
  const getSourceItemsArray = (wo: any): any[] => {
    let items = wo?.sourceItems;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) {}
    }
    return Array.isArray(items) ? items : [];
  };

  const getOutputAllocationsArray = (wo: any): any[] => {
    let allocs = wo?.outputAllocations;
    if (typeof allocs === 'string') {
      try { allocs = JSON.parse(allocs); } catch (e) {}
    }
    return Array.isArray(allocs) ? allocs : [];
  };

  // Helper to render product column with Primary Product + Counter Badge & Product Names Hover Popover
  const renderProductColumn = (wo: any) => {
    const items = getSourceItemsArray(wo);

    if (items.length > 1) {
      const primaryName = items[0].product || 'Product 1';
      const extraCount = items.length - 1;

      return (
        <div className="relative group inline-flex items-center gap-1.5 max-w-[200px]">
          <span className="font-semibold text-gray-900 dark:text-white truncate cursor-default max-w-[130px]" title={primaryName}>
            {primaryName}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shrink-0 cursor-default">
            +{extraCount} more
          </span>

          {/* Floating Hover Popover listing ONLY product names */}
          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 min-w-[220px] max-w-[320px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-3 space-y-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="font-bold text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-1.5">
              Source Products ({items.length})
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-gray-900 dark:text-white">
                  <span className="text-gray-400 font-mono text-[11px] shrink-0">{idx + 1}.</span>
                  <span>{item.product}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const singleName = wo?.product?.name || items[0]?.product || '-';
    return (
      <span className="font-semibold text-gray-900 dark:text-white truncate block max-w-[180px]" title={singleName}>
        {singleName}
      </span>
    );
  };


  const normalizeUnit = (u?: string) => {
    if (!u) return '';
    const trimmed = String(u).trim().toUpperCase();
    if (trimmed === 'KILOGRAMS' || trimmed === 'KILOGRAM') return 'KG';
    if (trimmed === 'GRAMS' || trimmed === 'GRAM') return 'GM';
    if (trimmed === 'LITRES' || trimmed === 'LITRE' || trimmed === 'LITERS' || trimmed === 'LITER') return 'L';
    if (trimmed === 'MILLILITRES' || trimmed === 'MILLILITRE' || trimmed === 'MILLILITERS' || trimmed === 'MILLILITER') return 'ML';
    return trimmed;
  };

  const getWOUnit = (wo: any) => {
    // Unit fetched strictly from Eligible Source Inventory (wo.sourceItems)
    const items = getSourceItemsArray(wo);
    const sourceUom = items[0]?.uom;
    return sourceUom ? normalizeUnit(sourceUom) : '';
  };

  // Utility to format work order required quantity based on source inventory UOM
  const formatRequiredQty = (wo: any) => {
    if (!wo) return '0';
    const invUnit = getWOUnit(wo);
    const outputAllocations = getOutputAllocationsArray(wo);
    if (outputAllocations.length > 0) {
      const totalAllocated = outputAllocations.reduce((sum: number, alloc: any) => {
        return sum + (Number(alloc.totalQtyKg) || (Number(alloc.plannedUnits) || 0) * (alloc.packSizeKg || 1));
      }, 0);
      if (totalAllocated > 0) {
        return `${parseFloat(totalAllocated.toFixed(3))} ${invUnit}`;
      }
    }
    return `${parseFloat(Number(wo.requiredQty || 0).toFixed(3))} ${invUnit}`;
  };

  const renderSkuColumn = (wo: any) => {
    const items = getSourceItemsArray(wo);

    if (items.length > 1) {
      const primarySku = items[0].sku || items[0].itemCode || wo?.product?.sku || 'SKU-1';
      const extraCount = items.length - 1;

      return (
        <div className="relative group inline-flex items-center gap-1.5 max-w-[160px]">
          <span className="font-mono font-bold text-gray-700 dark:text-gray-200 truncate cursor-default max-w-[100px]" title={primarySku}>
            {primarySku}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shrink-0 cursor-default">
            +{extraCount}
          </span>

          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 min-w-[200px] max-w-[300px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-3 space-y-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="font-bold text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-1.5">
              Source SKUs ({items.length})
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-mono font-bold text-gray-900 dark:text-white">
                  <span className="text-gray-400 text-[11px] shrink-0">{idx + 1}.</span>
                  <span>{item.sku || item.itemCode || 'SKU-' + (idx + 1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const allocs = getOutputAllocationsArray(wo);
    const allocSku = allocs[0]?.sku || allocs[0]?.skuCode || allocs[0]?.sourceProductSku;
    const variantSku = wo?.product?.variants?.find((v: any) => {
      const vText = `${v.measurement || ''} ${v.unit || ''}`.trim().toLowerCase();
      const pTextLower = (allocs[0]?.packSizeText || '').trim().toLowerCase();
      return pTextLower && vText === pTextLower;
    })?.sku || wo?.product?.variants?.[0]?.sku;

    const validSourceSku = items[0]?.sku && items[0]?.sku !== '—' && items[0]?.sku !== 'N/A' ? items[0].sku : null;
    const validAllocSku = allocSku && allocSku !== '—' && allocSku !== 'N/A' ? allocSku : null;
    const validProductSku = wo?.product?.sku && wo?.product?.sku !== '—' && wo?.product?.sku !== 'N/A' ? wo.product.sku : null;
    const validVariantSku = variantSku && variantSku !== '—' && variantSku !== 'N/A' ? variantSku : null;

    let derivedVariantSku: string | null = null;
    if (allocs.length > 0 && allocs[0]?.packSizeText) {
      const pName = (allocs[0].sourceProductName || allocs[0].productName || allocs[0].product || wo?.product?.name || '').trim();
      if (pName) {
        derivedVariantSku = `${pName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()}-${allocs[0].packSizeText.replace(/\s+/g, '-').toUpperCase()}`;
      }
    }

    const singleSku = validAllocSku || validVariantSku || validProductSku || validSourceSku || items[0]?.itemCode || derivedVariantSku || wo?.sku || wo?.recipe?.code || '—';
    return (
      <span className="font-mono font-bold text-gray-700 dark:text-gray-200 truncate block max-w-[140px]" title={singleSku}>
        {singleSku}
      </span>
    );
  };

  // Utility to format actual produced quantity based on source inventory UOM
  const formatActualProduced = (wo: any) => {
    if (!wo) return '0';
    const invUnit = getWOUnit(wo);
    const actual = wo.actualProduced || 0;
    const outputAllocations = getOutputAllocationsArray(wo);

    if (outputAllocations.length > 0) {
      const totalReq = wo.requiredQty || 1;
      let totalPacked = 0;

      outputAllocations.forEach((alloc: any) => {
        const targetQty = Number(alloc.totalQtyKg) || (Number(alloc.plannedUnits) || 0) * (alloc.packSizeKg || 1);
        const packedQty = alloc.packedUnits !== undefined && alloc.packedUnits !== null
          ? Number(alloc.packedUnits) * (alloc.packSizeKg || 1)
          : (alloc.packedQty !== undefined && alloc.packedQty !== null ? Number(alloc.packedQty) : Math.round((actual * (targetQty / totalReq)) * 100) / 100);

        totalPacked += (packedQty || 0);
      });

      return `${parseFloat(totalPacked.toFixed(3))} ${invUnit}`;
    }

    return `${parseFloat(Number(actual).toFixed(3))} ${invUnit}`;
  };

  // Edit WO Handler
  const handleOpenEdit = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setEditQty(wo.requiredQty);
    setEditPriority(wo.priority);
    setEditSupervisor(wo.operatorId || wo.operator?.id || '');
    setEditExpectedCompletion(
      wo.expectedDate
        ? new Date(wo.expectedDate).toISOString().substring(0, 10)
        : ''
    );
    setIsEditing(true);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedWO) return;
    const editingId = selectedWO.id;
    setIsSavingEdit(true);
    try {
      await workOrderService.updateWorkOrder(editingId, {
        requiredQty: editQty,
        priority: editPriority,
        operatorId: editSupervisor || undefined,
        expectedDate: editExpectedCompletion
          ? new Date(editExpectedCompletion).toISOString()
          : undefined,
      });
      setIsEditing(false);
      showToast('Work order updated successfully.');
      const res = await workOrderService.getWorkOrders();
      const updatedList = res.data || [];
      setApiWorkOrders(updatedList);
      const updatedWo = updatedList.find((w: any) => w.id === editingId);
      if (updatedWo) setSelectedWO(updatedWo);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error updating Work Order');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Assign Packing Operator (PO) Handler
  const handleOpenAssignPO = (wo: WorkOrder) => {
    setAssignPoWO(wo);
    setSelectedOperatorId(wo.operatorId || wo.operator?.id || '');
    fetchOperators();
  };

  const handleAssignPO = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!assignPoWO) return;
    if (!selectedOperatorId) {
      showToast('Please select a packing operator.');
      return;
    }

    setIsAssigningPO(true);
    try {
      await workOrderService.updateWorkOrder(assignPoWO.id, {
        operatorId: selectedOperatorId,
      });

      const assignedOp = apiOperators.find((op) => op.id === selectedOperatorId);
      const opName = assignedOp?.name || 'Operator';
      showToast(`Work order ${assignPoWO.woNumber || assignPoWO.id} assigned to ${opName} successfully.`);

      setAssignPoWO(null);
      await fetchWorkOrders();

      if (selectedWO && selectedWO.id === assignPoWO.id) {
        const updated = await workOrderService.getWorkOrderById(assignPoWO.id);
        if (updated) setSelectedWO(updated);
      }
    } catch (err: any) {
      console.error('Failed to assign operator:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to assign operator');
    } finally {
      setIsAssigningPO(false);
    }
  };

  // Delete Draft Handler
  const handleDeleteDraft = (wo: WorkOrder) => {
    setDeleteConfirmWO(wo);
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
          to === 'LABELS_PRINTED' || to === 'MATERIAL_ISSUED' || to === 'PACKING_STARTED' || to === 'CANCELLED'
        );
      case 'LABELS_PRINTED':
        return (
          to === 'MATERIAL_ISSUED' || to === 'PACKING_STARTED' || to === 'LABEL_APPLICATION_ASSIGNED' || to === 'CANCELLED'
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
        desc: `Created on ${selectedWO.createdAt
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

  if (isCreateOpen) {
    return (
      <CreateWorkOrderFlow
        onClose={() => {
          setIsCreateOpen(false);
          fetchWorkOrders();
        }}
        onSuccess={() => {
          showToast('Work order created successfully.');
        }}
      />
    );
  }

  if (selectedWO) {
    const currentWO = selectedWO as WorkOrder;
    return (
      <div className="space-y-6 text-left font-sans select-none pb-12">
        {/* Toast popup */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-55 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg">
            {toastMessage}
          </div>
        )}

        {/* TOP BAR / BACK NAVIGATION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedWO(null)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#00891D] uppercase tracking-wider block">
                {currentWO.woNumber}
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Work Order Details
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => handleSaveEdit()}
                  className="flex items-center gap-1.5 bg-[#00891D] hover:bg-[#007518] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {['DRAFT', 'PENDING'].includes(currentWO.status) && (
                  <button
                    onClick={() => handleOpenEdit(currentWO)}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                )}

                {['DRAFT', 'PENDING'].includes(currentWO.status) && (
                  <button
                    onClick={() => {
                      handleDeleteDraft(currentWO);
                    }}
                    className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}

                {currentWO.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      workOrderService
                        .updateWorkOrderStatus(currentWO.id, 'PENDING')
                        .then(() => {
                          showToast('Work order submitted for approval.');
                          setSelectedWO(null);
                          fetchWorkOrders();
                        })
                        .catch(console.error);
                    }}
                    className="flex items-center gap-1.5 bg-[#00891D] hover:bg-[#007518] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Check size={14} />
                    <span>Submit for Approval</span>
                  </button>
                )}

                {currentWO.status === 'PENDING' && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3.5 py-2 rounded-lg">
                    Pending Approval in Approvals Module
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* MAIN DETAILS GRID: 2 COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: WORK ORDER METADATA CARD */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-150 dark:border-gray-700 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    General Information
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Product specification, target batch size, and assignment metadata
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(
                    resolveDisplayStatus(currentWO)
                  )}`}
                >
                  {resolveDisplayStatus(currentWO).replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 dark:text-gray-400 block text-[11px] font-medium uppercase tracking-wide mb-1">
                    Work Order Number
                  </span>
                  <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                    {currentWO.woNumber}
                  </span>
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 dark:text-gray-400 block text-[11px] font-medium uppercase tracking-wide mb-1">
                    Priority Level
                  </span>
                  {isEditing ? (
                    <select
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as WoPriority)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold border ${getPriorityStyle(
                        currentWO.priority
                      )}`}
                    >
                      {currentWO.priority}
                    </span>
                  )}
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700 sm:col-span-2">
                  {(() => {
                    const detailSourceItems = getSourceItemsArray(currentWO);
                    return (
                      <>
                        <span className="text-gray-400 dark:text-gray-400 block text-[11px] font-medium uppercase tracking-wide mb-1">
                          Source Products ({detailSourceItems.length > 0 ? detailSourceItems.length : 1})
                        </span>
                        {detailSourceItems.length > 0 ? (
                          <div className="space-y-1.5 mt-1">
                            {detailSourceItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-100 dark:border-gray-700">
                                <span className="font-bold text-gray-900 dark:text-white">{item.product}</span>
                                <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                                  Batch: <strong className="text-gray-700 dark:text-gray-300">{item.batch}</strong> ({item.availableQty} {item.uom})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {currentWO.product?.name || '-'}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 dark:text-gray-400 block text-[11px] font-medium uppercase tracking-wide mb-1">
                    Required Quantity
                  </span>
                  {isEditing && (getOutputAllocationsArray(currentWO).length === 0) ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                        value={editQty}
                        onChange={(e) => setEditQty(Number(e.target.value))}
                      />
                      <span className="font-bold text-gray-500 text-xs">{resolveProductUnit(currentWO.product)}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {formatRequiredQty(currentWO)}
                    </span>
                  )}
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 dark:text-gray-400 block text-[11px] font-medium uppercase tracking-wide mb-1">
                    Actual Produced
                  </span>
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {formatActualProduced(currentWO)}
                  </span>
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 dark:text-gray-400 block text-[11px] font-medium uppercase tracking-wide">
                      Assigned Staff
                    </span>
                    {!isEditing && ['APPROVED', 'LABELS_PRINTED', 'LABEL_APPLICATION_ASSIGNED'].includes(currentWO.status) && (
                      <button
                        onClick={() => handleOpenAssignPO(currentWO)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        title="Assign or reassign packing operator"
                      >
                        <UserCheck size={12} />
                        <span>{currentWO.operator ? 'Reassign PO' : 'Assign PO'}</span>
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <select
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                      value={editSupervisor}
                      onChange={(e) => setEditSupervisor(e.target.value)}
                    >
                      <option value="">Select staff member...</option>
                      {packingOperators.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.name} {op.phone ? `(${op.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {currentWO.operator?.name || 'Unassigned'}
                    </span>
                  )}
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 dark:text-gray-400 block text-[11px] font-medium uppercase tracking-wide mb-1">
                    Expected Completion
                  </span>
                  {isEditing ? (
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                      value={editExpectedCompletion}
                      onChange={(e) => setEditExpectedCompletion(e.target.value)}
                    />
                  ) : (
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {currentWO.expectedDate
                        ? new Date(String(currentWO.expectedDate)).toLocaleDateString()
                        : '-'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {getOutputAllocationsArray(currentWO).length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-gray-150 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Target Output Plan
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 border-b border-gray-150 dark:border-gray-700">
                        <th className="py-2.5 px-4">TARGET SKU</th>
                        <th className="py-2.5 px-4">PACK SIZE</th>
                        <th className="py-2.5 px-4 text-center">PLANNED UNITS</th>
                        <th className="py-2.5 px-4 text-right">TOTAL REQ QUANTITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 font-medium">
                      {getOutputAllocationsArray(currentWO).map((alloc: any, idx: number) => {
                        const allocUom = getWOUnit(currentWO);

                        const val = typeof alloc.totalQtyKg === 'number' || !isNaN(Number(alloc.totalQtyKg))
                          ? parseFloat(Number(alloc.totalQtyKg).toFixed(4))
                          : (alloc.totalQtyKg || 0);

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                            <td className="py-2.5 px-4 font-bold text-gray-900 dark:text-white">
                              {alloc.skuName}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300">
                              {alloc.packSizeText}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-gray-800 dark:text-gray-200">
                              {alloc.plannedUnits}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-gray-900 dark:text-white font-mono">
                              {val} {allocUom}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* INVENTORY ALLOCATION DETAILS (WHEN COMPLETED) */}
            {(currentWO.status === 'COMPLETED' || (currentWO.status as string) === 'FINISHED_GOODS' || (Array.isArray((currentWO as any).finishedGoods) && (currentWO as any).finishedGoods.length > 0)) && (
              <div className="bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/60 rounded-xl shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-150 dark:border-gray-700 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[#00891D]" size={18} />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Inventory Allocation Details
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                    Synced to Inventory
                  </span>
                </div>

                {Array.isArray((currentWO as any).finishedGoods) && (currentWO as any).finishedGoods.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-emerald-50/50 dark:bg-emerald-950/30 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-b border-gray-200 dark:border-gray-700">
                          <th className="py-2.5 px-3.5">FG NUMBER</th>
                          <th className="py-2.5 px-3.5">PRODUCT / DESTINATION</th>
                          <th className="py-2.5 px-3.5 text-center">POSTED QTY</th>
                          <th className="py-2.5 px-3.5">BATCH NUMBER</th>
                          <th className="py-2.5 px-3.5 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 font-medium">
                        {(currentWO as any).finishedGoods.map((fg: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                            <td className="py-2.5 px-3.5 font-mono font-bold text-gray-900 dark:text-white">
                              {fg.fgNumber || `FG-${idx + 1}`}
                            </td>
                            <td className="py-2.5 px-3.5 font-semibold text-gray-800 dark:text-gray-200">
                              {fg.destination || 'Ready Inventory'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {fg.postedQty} units
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-gray-600 dark:text-gray-300">
                              {fg.batchNumber || currentWO.batchNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              Completed
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : getOutputAllocationsArray(currentWO).length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-emerald-50/50 dark:bg-emerald-950/30 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-b border-gray-200 dark:border-gray-700">
                          <th className="py-2.5 px-3.5">SKU</th>
                          <th className="py-2.5 px-3.5">PRODUCT NAME</th>
                          <th className="py-2.5 px-3.5">PACK SIZE</th>
                          <th className="py-2.5 px-3.5 text-center">ALLOCATED QTY</th>
                          <th className="py-2.5 px-3.5">DESTINATION STORE</th>
                          <th className="py-2.5 px-3.5 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 font-medium">
                        {getOutputAllocationsArray(currentWO).map((alloc: any, idx: number) => {
                          const resolved = resolveProductAndSku(alloc, currentWO, []);
                          const postedQty = alloc.packedUnits ?? alloc.packedQty ?? alloc.plannedUnits ?? 0;
                          return (
                            <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                              <td className="py-2.5 px-3.5 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                {resolved.sku}
                              </td>
                              <td className="py-2.5 px-3.5 font-bold text-gray-900 dark:text-white">
                                {resolved.productName}
                              </td>
                              <td className="py-2.5 px-3.5 text-gray-600 dark:text-gray-300">
                                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[11px] font-semibold">
                                  {alloc.packSizeText || (alloc.packSizeKg ? `${alloc.packSizeKg} KG` : '—')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {postedQty} units
                              </td>
                              <td className="py-2.5 px-3.5 text-gray-700 dark:text-gray-300 font-medium">
                                Ready Inventory (Central Warehouse)
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                Allocated
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/30 rounded-lg border border-emerald-150 dark:border-emerald-800">
                      <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase">Product Name</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{currentWO.product?.name || '—'}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/30 rounded-lg border border-emerald-150 dark:border-emerald-800">
                      <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase">Total Allocated</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">{currentWO.actualProduced || currentWO.requiredQty || 0} units</span>
                    </div>
                    <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/30 rounded-lg border border-emerald-150 dark:border-emerald-800">
                      <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase">Destination</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">Ready Inventory (Warehouse)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: WORK ORDER TIMELINE CARD */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide border-b border-gray-150 dark:border-gray-700 pb-3">
                Work Order Progress Timeline
              </h3>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl space-y-5 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-600">
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
                  const woLevel = getTimelineLevel(currentWO.status);
                  const stepLevel = getTimelineLevel(step.status);
                  const isActive = woLevel === stepLevel;
                  const isPast = woLevel >= stepLevel;

                  return (
                    <div key={idx} className="flex gap-3 relative z-10 text-xs">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-gray-800 shrink-0 ${isActive
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
                          className={`font-bold block ${isActive
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
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
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
        </div>
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

          <button
            onClick={() => {
              setFilterStatus('All');
              setFilterPriority('All');
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
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-semibold cursor-pointer ${viewMode === 'table'
                ? 'bg-white dark:bg-gray-700 shadow-xs text-[#00891D] dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <TableIcon size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-semibold cursor-pointer ${viewMode === 'kanban'
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
      {apiWorkOrdersLoading ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-16 text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-[#00891D]">
            <Loader2 className="animate-spin" size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Loading Work Orders...
            </h3>
            <p className="text-xs text-gray-400">
              Please wait while we fetch the latest packing work order data.
            </p>
          </div>
        </div>
      ) : filteredWOs.length === 0 ? (
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
          <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  <th className="py-2.5 px-2.5 whitespace-nowrap">WO No</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">SKU</th>
                  <th className="py-2.5 px-2.5">Product</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Required Qty</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Packed Qty</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Assigned Staff</th>
                  <th className="py-2.5 px-2.5">Priority</th>
                  <th className="py-2.5 px-2.5">Status</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Actions</th>
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
                  paginatedWOs.map((wo, index) => (
                    <tr
                      key={`${wo.id}-${index}`}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-2.5 px-2.5 font-mono font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {wo.woNumber || wo.id}
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {renderSkuColumn(wo)}
                      </td>
                      <td className="py-2.5 px-2.5">
                        {renderProductColumn(wo)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatRequiredQty(wo)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatActualProduced(wo)}
                      </td>
                      <td className="py-2.5 px-2.5 text-gray-600 dark:text-gray-300 font-medium">
                        {wo.operator?.name || 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityStyle(
                            wo.priority
                          )}`}
                        >
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-normal whitespace-nowrap ${getStatusColor(
                            resolveDisplayStatus(wo)
                          )}`}
                        >
                          {resolveDisplayStatus(wo).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {['APPROVED', 'LABELS_PRINTED', 'LABEL_APPLICATION_ASSIGNED'].includes(wo.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssignPO(wo);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs whitespace-nowrap"
                              title={wo.operator?.name ? `Assigned to: ${wo.operator.name} (Click to reassign)` : 'Assign Packing Operator'}
                            >
                              <UserCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                              <span>{wo.operator?.name ? 'Reassign PO' : 'Assign PO'}</span>
                            </button>
                          )}
                          {['DRAFT', 'PENDING'].includes(wo.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDraft(wo);
                              }}
                              className="text-rose-600 hover:text-rose-800 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer inline-flex items-center justify-center"
                              title="Delete Work Order"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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
              const columnWOs = filteredWOs.filter((w) => resolveDisplayStatus(w) === column);

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
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] font-bold text-gray-400 dark:text-gray-400">
                            {wo.woNumber || wo.id}
                          </span>
                          <div className="flex items-center gap-1">
                            {['DRAFT', 'PENDING'].includes(wo.status) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDraft(wo);
                                }}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1 rounded cursor-pointer transition-colors"
                                title="Delete Work Order"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${getPriorityStyle(
                                wo.priority
                              )}`}
                            >
                              {wo.priority}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs">
                          {renderProductColumn(wo)}
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
                          {['APPROVED', 'LABELS_PRINTED', 'LABEL_APPLICATION_ASSIGNED'].includes(wo.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssignPO(wo);
                              }}
                              className="w-full mt-2 py-1 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 rounded transition-colors inline-flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                            >
                              <UserCheck size={12} />
                              <span>{wo.operator?.name ? 'Reassign PO' : 'Assign PO'}</span>
                            </button>
                          )}
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



      {/* CREATE PACKING WORK ORDER MODAL / OVERLAY */}
      {isCreateOpen && (
        <CreateWorkOrderFlow onClose={() => setIsCreateOpen(false)} />
      )}



      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmWO && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isDeleting && setDeleteConfirmWO(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl max-w-md w-full p-6 space-y-5 text-left relative overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={isDeleting}
              onClick={() => setDeleteConfirmWO(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-800/50 flex-shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1.5 pr-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Work Order
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                  Are you sure you want to delete work order{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    {deleteConfirmWO?.woNumber || deleteConfirmWO?.id}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-700">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteConfirmWO(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  if (!deleteConfirmWO) return;
                  const targetWo = deleteConfirmWO;
                  setIsDeleting(true);
                  try {
                    await workOrderService.deleteWorkOrder(targetWo.id);
                    showToast(`Work order ${targetWo.woNumber || targetWo.id} deleted successfully.`);
                    if ((selectedWO as any)?.id === targetWo.id) {
                      setSelectedWO(null);
                    }
                    setDeleteConfirmWO(null);
                    fetchWorkOrders();
                  } catch (err: any) {
                    showToast(err.response?.data?.message || err.message || 'Error deleting Work Order');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs active:scale-98"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete Work Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN PACKING OPERATOR (PO) MODAL */}
      {assignPoWO && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isAssigningPO && setAssignPoWO(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl max-w-md w-full p-6 space-y-5 text-left relative overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              disabled={isAssigningPO}
              onClick={() => setAssignPoWO(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <UserCheck size={22} />
              </div>
              <div className="space-y-0.5 pr-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Assign Packing Operator (PO)
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Select a staff member with packing operator role to execute this work order.
                </p>
              </div>
            </div>

            {/* Work Order Info Card */}
            <div className="bg-slate-50 dark:bg-gray-700/40 rounded-xl p-3.5 border border-slate-200/80 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Work Order No:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200/70 dark:bg-gray-600 px-2 py-0.5 rounded">
                  {assignPoWO.woNumber || assignPoWO.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Product:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={assignPoWO.product?.name}>
                  {assignPoWO.product?.name || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Required Qty:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatRequiredQty(assignPoWO)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Currently Assigned:</span>
                <span className={`font-semibold ${assignPoWO.operator ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {assignPoWO.operator?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Dropdown Section */}
            <div className="space-y-2">
              <label
                htmlFor="assign-po-select"
                className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider"
              >
                Packing Operator Staff <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="assign-po-select"
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                  disabled={isAssigningPO}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-transparent transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Packing Operator --</option>
                  {packingOperators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} {op.phone ? `(${op.phone})` : op.email ? `(${op.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                Staff agents created under the Packing Operator Portal in Staff Management.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-gray-700">
              <button
                type="button"
                disabled={isAssigningPO}
                onClick={() => setAssignPoWO(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAssigningPO || !selectedOperatorId}
                onClick={handleAssignPO}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00891D] hover:bg-[#007518] shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isAssigningPO ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    <span>Confirm Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingWorkOrders;
