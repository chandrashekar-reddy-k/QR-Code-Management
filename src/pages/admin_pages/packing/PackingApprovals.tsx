import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { approvalService } from '../../../api/packing/approvalService';
import { workOrderService } from '../../../api/packing/workOrderService';
import type {
  ApprovalRequest,
  ApprovalType,
  ApprovalStatus,
  Priority,
  InventoryValidationItem,
} from '../../../types/packing/approvals';

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

export const PackingApprovals: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let approvalReqs: ApprovalRequest[] = [];
      try {
        approvalReqs = await approvalService.getApprovals();
      } catch (e) {
        console.warn('Approvals API failed:', e);
      }

      let allWOs: any[] = [];
      try {
        const woRes = await workOrderService.getWorkOrders({ limit: 1000 });
        allWOs = woRes.data || [];
      } catch (e) {
        console.warn('Failed to fetch work orders:', e);
      }

      const woApprovalMap = new Map<string, ApprovalRequest>();

      for (const wo of allWOs) {
        if (wo.status === 'DRAFT') continue;
        const recipe = wo.recipe;
        const targetYield = recipe?.outputQty || 1;
        const woQty = wo.requiredQty || 100;

        const validationItems: InventoryValidationItem[] =
          recipe?.items?.map((item: any, idx: number) => {
            const reqQty = (item.requiredQty / targetYield) * woQty;
            const inputProd = item.inputProduct;
            const availableStock = inputProd?.productionStock?.inProductionQty ?? (inputProd as any)?.stockQty ?? (inputProd as any)?.currentStock ?? (inputProd as any)?.stock ?? 0;
            const shortage = Math.max(0, reqQty - availableStock);
            const status: InventoryValidationItem['status'] =
              availableStock === 0
                ? 'OUT_OF_STOCK'
                : shortage > 0
                ? 'INSUFFICIENT'
                : 'AVAILABLE';

            return {
              id: item.id || `item-${idx}`,
              materialId: item.inputProductId,
              SKU: inputProd?.sku,
              materialName: inputProd?.name || 'Input Material',
              type: (inputProd?.type as any) || (item.isPackaging ? 'PACKAGING' : 'RAW_MATERIAL'),
              requiredQty: Math.round(reqQty * 100) / 100,
              uom: resolveProductUnit(inputProd),
              availableStock,
              shortage: Math.round(shortage * 100) / 100,
              status,
            };
          }) || [];

        const hasShortage = validationItems.some((i) => i.status !== 'AVAILABLE');
        const inventoryStatus = hasShortage ? 'STOCK_SHORTAGE' : 'STOCK_AVAILABLE';

        woApprovalMap.set(wo.id, {
          id: wo.id,
          type: 'WORK_ORDER' as ApprovalType,
          relatedEntityId: wo.id,
          relatedEntityName: wo.woNumber || wo.id,
          productName: wo.product?.name,
          requestedBy: wo.supervisor?.name || wo.operator?.name || 'Store Manager',
          requestedDate: wo.createdAt || new Date().toISOString(),
          reason: 'Work Order Approval Request',
          priority: (wo.priority as Priority) || 'MEDIUM',
          status: 'PENDING' as ApprovalStatus,
          inventoryStatus,
          inventoryValidation: validationItems,
          woDetails: {
            woNumber: wo.woNumber || wo.id,
            outputProduct: wo.product?.name || 'Finished Product',
            recipeCode: recipe?.code || wo.recipeId,
            targetQty: woQty,
            targetYieldQty: targetYield,
            uomName: resolveProductUnit(wo.product),
            requestedBy: wo.supervisor?.name || wo.operator?.name || 'Store Manager',
            requestedDate: wo.createdAt || new Date().toISOString(),
            priority: (wo.priority as Priority) || 'MEDIUM',
            status: wo.status,
            warehouseName: 'Main Packing Warehouse',
            availableQty: wo.product?.stock ?? (wo.product as any)?.availableStock ?? 0,
            sourceItems: Array.isArray(wo.sourceItems) ? wo.sourceItems : [],
            outputAllocations: Array.isArray(wo.outputAllocations) ? wo.outputAllocations : [],
            requiredQty: wo.requiredQty,
          },
          history: [],
        });
      }

      const mergedList: ApprovalRequest[] = [];
      const addedWoIds = new Set<string>();

      for (const req of approvalReqs) {
        let finalReq = { ...req };
        if (req.type === 'WORK_ORDER' && req.relatedEntityId) {
          if (!woApprovalMap.has(req.relatedEntityId)) {
            // Skip orphan WORK_ORDER approval request if underlying WorkOrder was deleted
            continue;
          }
          const enriched = woApprovalMap.get(req.relatedEntityId)!;
          finalReq = {
            ...enriched,
            id: req.id,
            status: req.status || enriched.status,
            history: req.history || enriched.history,
          };
          addedWoIds.add(req.relatedEntityId);
        }
        mergedList.push(finalReq);
      }

      for (const [woId, woApproval] of woApprovalMap.entries()) {
        if (!addedWoIds.has(woId)) {
          mergedList.push(woApproval);
        }
      }

      setApprovals(mergedList);
      if (selectedRequest) {
        const fresh = mergedList.find(
          (a: any) => a.id === selectedRequest.id || a.relatedEntityId === selectedRequest.relatedEntityId
        );
        if (fresh) {
          setSelectedRequest(fresh);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch approvals:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to load approvals'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ApprovalType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<string>('ALL');

  // Selected Request for Full Page Approval Review
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filtered approvals list
  const filteredApprovals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return approvals.filter((a) => {
      const woNum = (
        a.woDetails?.woNumber ||
        a.relatedEntityName ||
        a.id
      ).toLowerCase();
      const prodName = (
        a.woDetails?.outputProduct ||
        a.productName ||
        ''
      ).toLowerCase();
      const reqByObj = a.woDetails?.requestedBy || a.requestedBy;
      const reqBy = (
        typeof reqByObj === 'string'
          ? reqByObj
          : typeof reqByObj === 'object' && reqByObj !== null
          ? ((reqByObj as any).name || (reqByObj as any).email || '')
          : ''
      ).toLowerCase();
      const recipe = (a.woDetails?.recipeCode || '').toLowerCase();
      const priority = (a.priority || '').toLowerCase();
      const status = (a.status || '').toLowerCase();
      const invStatus = (a.inventoryStatus || '').toLowerCase();

      const matchesSearch =
        !query ||
        woNum.includes(query) ||
        prodName.includes(query) ||
        reqBy.includes(query) ||
        recipe.includes(query) ||
        priority.includes(query) ||
        status.includes(query) ||
        invStatus.includes(query);

      const matchesType = typeFilter === 'ALL' || a.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'ALL' || a.priority === priorityFilter;
      const matchesInventory =
        inventoryStatusFilter === 'ALL' ||
        a.inventoryStatus === inventoryStatusFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesPriority &&
        matchesInventory
      );
    });
  }, [
    approvals,
    searchTerm,
    typeFilter,
    statusFilter,
    priorityFilter,
    inventoryStatusFilter,
  ]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setStatusFilter('PENDING');
    setPriorityFilter('ALL');
    setInventoryStatusFilter('ALL');
    setCurrentPage(1);
  };

  useEffect(() => {
    if (
      selectedRequest &&
      !filteredApprovals.find((a) => a.id === selectedRequest.id)
    ) {
      setSelectedRequest(null);
    }
  }, [filteredApprovals, selectedRequest]);

  const paginatedApprovals = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredApprovals.slice(start, start + rowsPerPage);
  }, [filteredApprovals, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredApprovals.length / rowsPerPage);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      try {
        await approvalService.processApproval(selectedRequest.id, 'APPROVE');
      } catch (e) {
        // Fallback: update status via workOrderService
        await workOrderService.updateWorkOrderStatus(
          selectedRequest.relatedEntityId || selectedRequest.id,
          'APPROVED'
        );
      }

      showToast(
        `Work Order ${
          selectedRequest.woDetails?.woNumber || selectedRequest.relatedEntityName
        } approved!`
      );
      const updated = approvals.map((a) => a.id === selectedRequest.id ? { ...a, status: 'APPROVED' as ApprovalStatus } : a);
      setApprovals(updated);
      setSelectedRequest(null);
    } catch (err: any) {
      console.error('Failed to approve request:', err);
      showToast(
        `Failed to approve: ${err.response?.data?.message || err.message}`
      );
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      showToast('Please enter a rejection reason.');
      return;
    }
    try {
      try {
        await approvalService.processApproval(
          selectedRequest.id,
          'REJECT',
          rejectionReason
        );
      } catch (e) {
        // Fallback: update status via workOrderService to CANCELLED
        await workOrderService.updateWorkOrderStatus(
          selectedRequest.relatedEntityId || selectedRequest.id,
          'CANCELLED'
        );
      }

      showToast(
        `Work Order ${
          selectedRequest.woDetails?.woNumber || selectedRequest.relatedEntityName
        } rejected.`
      );
      setRejectionReason('');
      const updated = approvals.map((a) => a.id === selectedRequest.id ? { ...a, status: 'REJECTED' as ApprovalStatus } : a);
      setApprovals(updated);
      setSelectedRequest(null);
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      showToast(`Failed to reject: ${err.response?.data?.message || err.message}`);
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'URGENT':
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 whitespace-nowrap inline-flex items-center">
            High
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 whitespace-nowrap inline-flex items-center">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap inline-flex items-center">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 whitespace-nowrap inline-flex items-center">
            Low
          </span>
        );
    }
  };



  const resolveApprovalAvailableQty = (req: ApprovalRequest) => {
    const sourceItems = (req.woDetails as any)?.sourceItems;
    if (Array.isArray(sourceItems) && sourceItems.length > 0) {
      const map: Record<string, number> = {};
      sourceItems.forEach((i: any) => {
        const uom = (i.uom || 'KG').toUpperCase();
        map[uom] = (map[uom] || 0) + (Number(i.availableQty) || 0);
      });
      return Object.entries(map)
        .map(([uom, qty]) => `${qty} ${uom}`)
        .join(', ');
    }
    return `${req.woDetails?.availableQty ?? 0} ${req.woDetails?.uomName || 'KG'}`;
  };



  // Helper to render SKU column with popover for multi-product approval requests
  const renderApprovalSkuColumn = (req: ApprovalRequest) => {
    const sourceItems = (req.woDetails as any)?.sourceItems;
    const items = Array.isArray(sourceItems) && sourceItems.length > 0 ? sourceItems : null;

    if (items && items.length > 1) {
      const primarySku = items[0].sku || items[0].itemCode || 'SKU-1';
      const extraCount = items.length - 1;

      return (
        <div className="relative group inline-flex items-center gap-1.5 max-w-[160px]">
          <span className="font-mono font-bold text-slate-700 dark:text-gray-300 truncate cursor-default max-w-[100px]" title={primarySku}>
            {primarySku}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shrink-0 cursor-default">
            +{extraCount}
          </span>

          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 min-w-[200px] max-w-[300px] bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl p-3 space-y-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="font-bold text-slate-400 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-gray-700 pb-1.5">
              Source SKUs ({items.length})
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white">
                  <span className="text-slate-400 text-[11px] shrink-0">{idx + 1}.</span>
                  <span>{item.sku || item.itemCode || 'SKU-' + (idx + 1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const singleSku = items?.[0]?.sku || items?.[0]?.itemCode || (req.woDetails as any)?.sku || (req as any)?.sku || '—';
    return (
      <span className="font-mono font-bold text-slate-700 dark:text-gray-300 truncate block max-w-[140px]" title={singleSku}>
        {singleSku}
      </span>
    );
  };

  // Helper to render product column with hover popover for multi-product approval requests
  const renderApprovalProductColumn = (req: ApprovalRequest) => {
    const sourceItems = (req.woDetails as any)?.sourceItems;
    const items = Array.isArray(sourceItems) && sourceItems.length > 0 ? sourceItems : null;

    if (items && items.length > 1) {
      const primaryName = items[0].product || 'Product 1';
      const extraCount = items.length - 1;

      return (
        <div className="relative group inline-flex items-center gap-1.5 max-w-[200px]">
          <span className="font-semibold text-slate-900 dark:text-white truncate cursor-default max-w-[130px]" title={primaryName}>
            {primaryName}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shrink-0 cursor-default">
            +{extraCount} more
          </span>

          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 min-w-[220px] max-w-[320px] bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl p-3 space-y-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="font-bold text-slate-400 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-gray-700 pb-1.5">
              Source Products ({items.length})
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">{idx + 1}.</span>
                  <span>{item.product}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const singleName = req.woDetails?.outputProduct || req.productName || items?.[0]?.product || '-';
    return (
      <span className="font-semibold text-slate-900 dark:text-white truncate block max-w-[180px]" title={singleName}>
        {singleName}
      </span>
    );
  };

  // FULL PAGE REVIEW VIEW
  if (selectedRequest) {
    return (
      <div className="space-y-6 text-left select-none pb-12">
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-55 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg">
            {toastMessage}
          </div>
        )}

        {/* Top Action Bar */}
        <div className="flex flex-wrap justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setSelectedRequest(null)}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-gray-700 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Work Order Approval</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  (
                  {selectedRequest.woDetails?.woNumber ||
                    selectedRequest.relatedEntityName}
                  )
                </span>
              </h1>
            </div>
          </div>
          <button
            onClick={() => setSelectedRequest(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-1.5 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Review Grid */}
        <div className="max-w-4xl space-y-6">
          {/* Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider border-b border-slate-100 dark:border-gray-700 pb-3">
              Work Order Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-slate-500 dark:text-gray-400 block mb-1">
                  WO Number
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {selectedRequest.woDetails?.woNumber ||
                    selectedRequest.relatedEntityName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-gray-400 block mb-1">
                  Requested By
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm truncate block">
                  {typeof selectedRequest.requestedBy === 'object' && selectedRequest.requestedBy !== null
                    ? ((selectedRequest.requestedBy as any).name || (selectedRequest.requestedBy as any).email || 'Supervisor')
                    : selectedRequest.woDetails?.requestedBy || selectedRequest.requestedBy || 'Supervisor'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-gray-400 block mb-1">
                  Requested On
                </span>
                <span className="font-medium text-slate-800 dark:text-gray-200 text-xs whitespace-nowrap">
                  {new Date(
                    selectedRequest.woDetails?.requestedDate ||
                      selectedRequest.requestedDate
                  ).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-gray-400 block mb-1">
                  Priority
                </span>
                <div>{getPriorityBadge(selectedRequest.priority)}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-gray-400 block mb-1">
                  Status
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full inline-flex items-center whitespace-nowrap border ${
                  selectedRequest.status === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                  selectedRequest.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}>
                  {selectedRequest.status === 'APPROVED' ? 'Approved' : selectedRequest.status === 'REJECTED' ? 'Rejected' : 'Pending Approval'}
                </span>
              </div>
            </div>

            {/* Dedicated Source Products Table */}
            <div className="pt-4 border-t border-slate-100 dark:border-gray-700 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider block">
                Source Products ({Array.isArray((selectedRequest.woDetails as any)?.sourceItems) ? (selectedRequest.woDetails as any).sourceItems.length : 1})
              </span>

              {Array.isArray((selectedRequest.woDetails as any)?.sourceItems) && (selectedRequest.woDetails as any).sourceItems.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-gray-700/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                        <th className="py-2.5 px-3">BATCH</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">PRODUCT NAME</th>
                        <th className="py-2.5 px-3 text-right">AVAILABLE QTY</th>
                        <th className="py-2.5 px-3 text-center">STOCK STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                      {(selectedRequest.woDetails as any).sourceItems.map((item: any, idx: number) => {
                        const availNum = Number(item.availableQty) || 0;
                        const isSufficient = availNum > 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-gray-200 text-[11px]">
                              {item.batch || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-gray-300 text-[11px]">
                              {item.sku || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {item.product}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {item.availableQty} {item.uom || 'KG'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full inline-block ${
                                isSufficient
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                              }`}>
                                {isSufficient ? 'Sufficient' : 'Shortage'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-gray-700/40 rounded-lg border border-slate-200 dark:border-gray-700 flex flex-wrap justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{selectedRequest.woDetails?.outputProduct || selectedRequest.productName || '-'}</span>
                    <span className="text-slate-500 dark:text-gray-400 text-[11px]">UOM: <strong>{selectedRequest.woDetails?.uomName || 'KG'}</strong></span>
                  </div>
                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase">Available Stock</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{resolveApprovalAvailableQty(selectedRequest)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Output Plan Table */}
          {Array.isArray((selectedRequest.woDetails as any)?.outputAllocations) && (selectedRequest.woDetails as any).outputAllocations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider border-b border-slate-100 dark:border-gray-700 pb-3">
                Target Output Plan
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-gray-700">
                      <th className="py-2.5 px-4">TARGET SKU</th>
                      <th className="py-2.5 px-4">PACK SIZE</th>
                      <th className="py-2.5 px-4 text-center">PLANNED UNITS</th>
                      <th className="py-2.5 px-4 text-right">REQ QTY</th>
                      <th className="py-2.5 px-4 text-center">STOCK STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                    {(selectedRequest.woDetails as any).outputAllocations.map((alloc: any, idx: number) => {
                      const parts = alloc.packSizeText ? alloc.packSizeText.trim().split(' ') : [];
                      const unit = parts.length > 1 ? parts.slice(1).join(' ') : 'KG';
                      const reqQtyVal = alloc.totalQtyKg ?? ((Number(alloc.plannedUnits) || 0) * (alloc.packSizeKg || 1));

                      const sourceItems = (selectedRequest.woDetails as any)?.sourceItems || [];
                      const matchedSourceItem = sourceItems.find(
                        (s: any) =>
                          (alloc.sourceProductName && s.product && s.product.trim().toLowerCase() === alloc.sourceProductName.trim().toLowerCase()) ||
                          (alloc.sourceProductId && s.id === alloc.sourceProductId)
                      ) || sourceItems[0];

                      const availQty = matchedSourceItem ? Number(matchedSourceItem.availableQty) || 0 : ((selectedRequest.woDetails as any)?.availableQty ?? 0);
                      const isSufficient = availQty >= reqQtyVal;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/20">
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            {alloc.skuName}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-gray-300">
                            {alloc.packSizeText}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-800 dark:text-gray-200">
                            {alloc.plannedUnits}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                            {reqQtyVal} {unit}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full inline-block ${
                              isSufficient
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}>
                              {isSufficient ? 'Sufficient' : 'Shortage'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Decision Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider border-b border-slate-100 dark:border-gray-700 pb-3">
              Approval Decision
            </h3>
            {selectedRequest.status !== 'PENDING' ? (
              <div className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-lg text-center border border-slate-100 dark:border-gray-700">
                 <p className="text-sm font-semibold text-slate-600 dark:text-gray-400">
                   This request has already been {selectedRequest.status.toLowerCase()}.
                 </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                    Rejection Reason{' '}
                    <span className="text-slate-400 font-normal">
                      (Required if rejecting)
                    </span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="w-full border border-slate-200 dark:border-gray-700 rounded-xl p-3 text-xs bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 h-24 shadow-2xs resize-none"
                  />
                </div>
                <div className="flex justify-end items-center gap-3 pt-2">
                  <button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <X size={16} />
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    title="Approve Work Order"
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    <Check size={16} />
                    Approve
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT PENDING APPROVALS LIST VIEW
  return (
    <div className="space-y-4 text-left select-none pb-10">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-55 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Work Order Approvals
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
          Review inventory feasibility and authorize pending work orders.
        </p>
      </div>

      {/* SEARCH & FILTERS SECTION */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        {/* Filters Group */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-xs h-10 overflow-hidden w-full xl:w-auto">
          <div className="px-3 flex items-center justify-center text-slate-500 dark:text-gray-400 shrink-0">
            <Filter size={16} />
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[100px] shrink-0"
          >
            <option value="ALL" className="dark:bg-gray-800">Status</option>
            <option value="PENDING" className="dark:bg-gray-800">Pending</option>
            <option value="APPROVED" className="dark:bg-gray-800">Approved</option>
            <option value="REJECTED" className="dark:bg-gray-800">Rejected</option>
          </select>

          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[100px] shrink-0"
          >
            <option value="ALL" className="dark:bg-gray-800">Priority</option>
            <option value="LOW" className="dark:bg-gray-800">Low</option>
            <option value="MEDIUM" className="dark:bg-gray-800">Medium</option>
            <option value="HIGH" className="dark:bg-gray-800">High</option>
            <option value="URGENT" className="dark:bg-gray-800">Urgent</option>
            <option value="CRITICAL" className="dark:bg-gray-800">Critical</option>
          </select>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent cursor-pointer shrink-0"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>

        {/* Dynamic Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search WO, product..."
            className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-xs"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition-colors p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Pending Work Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full min-h-[420px]">
          <table className="w-full text-left text-xs border-collapse min-w-[840px]">
            <thead className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              <tr>
                <th className="p-4 whitespace-nowrap">WO NUMBER</th>
                <th className="p-4 whitespace-nowrap">SKU</th>
                <th className="p-4 whitespace-nowrap">OUTPUT PRODUCT</th>
                <th className="p-4 whitespace-nowrap">PRIORITY</th>
                <th className="p-4 text-slate-500 dark:text-gray-400 text-xs whitespace-nowrap">REQUESTED ON</th>
                <th className="p-4 text-center whitespace-nowrap">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-gray-400">
                    Loading pending work orders...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-red-500">
                    ⚠️ {error}
                  </td>
                </tr>
              ) : paginatedApprovals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-gray-400">
                    No pending work orders found.
                  </td>
                </tr>
              ) : (
                paginatedApprovals.map((req, index) => {
                  const woNo =
                    req.woDetails?.woNumber || req.relatedEntityName || req.id;
                  const requestedDate =
                    req.woDetails?.requestedDate || req.requestedDate;

                  return (
                    <tr
                      key={`${req.id}-${index}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {woNo}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {renderApprovalSkuColumn(req)}
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                        {renderApprovalProductColumn(req)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {getPriorityBadge(req.priority)}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {new Date(requestedDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className={`px-4 py-1.5 text-xs font-semibold border rounded-lg transition-colors shadow-2xs cursor-pointer whitespace-nowrap ${
                            req.status === 'PENDING'
                              ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                              : 'text-slate-600 dark:text-gray-300 border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {req.status === 'PENDING' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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
              Showing {filteredApprovals.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} -{' '}
              {Math.min(currentPage * rowsPerPage, filteredApprovals.length)} of{' '}
              {filteredApprovals.length} records
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
    </div>
  );
};

export default PackingApprovals;
