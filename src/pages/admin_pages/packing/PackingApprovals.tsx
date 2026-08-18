import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
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

      let pendingWOs: any[] = [];
      try {
        const woRes = await workOrderService.getWorkOrders({ status: 'PENDING' });
        pendingWOs = (woRes.data || []).filter((w: any) => w.status === 'PENDING');
      } catch (e) {
        console.warn('Failed to fetch PENDING work orders:', e);
      }

      const woApprovalMap = new Map<string, ApprovalRequest>();

      for (const wo of pendingWOs) {
        const recipe = wo.recipe;
        const targetYield = recipe?.outputQty || 1;
        const woQty = wo.requiredQty || 100;

        const validationItems: InventoryValidationItem[] =
          recipe?.items?.map((item: any, idx: number) => {
            const reqQty = (item.requiredQty / targetYield) * woQty;
            const inputProd = item.inputProduct;
            const availableStock = (inputProd as any)?.stockQty ?? (inputProd as any)?.currentStock ?? 1000;
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
              uom: inputProd?.uom?.abbreviation || (item.isPackaging ? 'PCS' : 'KG'),
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
            uomName: wo.product?.uom?.name || 'Units',
            requestedBy: wo.supervisor?.name || wo.operator?.name || 'Store Manager',
            requestedDate: wo.createdAt || new Date().toISOString(),
            priority: (wo.priority as Priority) || 'MEDIUM',
            status: wo.status,
            warehouseName: 'Main Packing Warehouse',
          },
          history: [],
        });
      }

      const mergedList: ApprovalRequest[] = [];
      const addedWoIds = new Set<string>();

      for (const req of approvalReqs) {
        let finalReq = { ...req };
        if (req.type === 'WORK_ORDER' && req.relatedEntityId && woApprovalMap.has(req.relatedEntityId)) {
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
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<string>('ALL');

  // Selected Request for Full Page Approval Review
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [lastCheckedTime, setLastCheckedTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

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
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setTypeFilter('ALL');
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
    const start = (currentPage - 1) * pageSize;
    return filteredApprovals.slice(start, start + pageSize);
  }, [filteredApprovals, currentPage]);

  const totalPages = Math.ceil(filteredApprovals.length / pageSize);

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
      const updated = approvals.filter((a) => a.id !== selectedRequest.id);
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
      const updated = approvals.filter((a) => a.id !== selectedRequest.id);
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

  const renderInventoryStatusDot = (req: ApprovalRequest) => {
    const status = req.inventoryStatus || 'NOT_CHECKED';
    if (status === 'STOCK_AVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          Stock Available
        </span>
      );
    }
    if (status === 'STOCK_SHORTAGE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 whitespace-nowrap shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          Stock Shortage
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-slate-200 dark:border-gray-600 whitespace-nowrap shrink-0">
        <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
        Not Checked
      </span>
    );
  };

  // FULL PAGE REVIEW VIEW
  if (selectedRequest) {
    const validationItems = selectedRequest.inventoryValidation || [];
    const shortageItems = validationItems.filter(
      (item: InventoryValidationItem) =>
        item.status !== 'AVAILABLE' || item.shortage > 0
    );
    const hasShortage = shortageItems.length > 0;
    const isApprovalDisabled =
      hasShortage ||
      validationItems.some(
        (item: InventoryValidationItem) => item.status !== 'AVAILABLE'
      );

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
              <span>Back to Pending Work Orders</span>
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
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Details & Decision */}
          <div className="xl:col-span-5 space-y-6">
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
                    Output Product
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedRequest.woDetails?.outputProduct ||
                      selectedRequest.productName}
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
                    Product BOM
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedRequest.woDetails?.recipeCode || 'REC-BOM'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block mb-1">
                    Target Yield Qty
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedRequest.woDetails?.targetYieldQty || 1}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block mb-1">
                    Planned Quantity
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">
                    {selectedRequest.woDetails?.targetQty || 100} Packs
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400 block mb-1">
                    UOM
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedRequest.woDetails?.uomName || 'Pack'}
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
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 inline-flex items-center whitespace-nowrap">
                    Pending Approval
                  </span>
                </div>
              </div>
            </div>

            {/* Decision Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider border-b border-slate-100 dark:border-gray-700 pb-3">
                Approval Decision
              </h3>
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
                  disabled={isApprovalDisabled}
                  title={
                    isApprovalDisabled
                      ? 'Approval disabled due to stock shortages or unavailable inventory'
                      : 'Approve Work Order'
                  }
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  <Check size={16} />
                  Approve
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Inventory Validation Table */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-gray-700 pb-3 flex-wrap gap-2">
                <h3 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                  Inventory Validation
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
                  <span>Last Checked: {lastCheckedTime}</span>
                  <button
                    onClick={() => {
                      setLastCheckedTime(
                        new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      );
                      fetchApprovals();
                      showToast('Stock levels refreshed!');
                    }}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw size={13} />
                    Refresh Stock
                  </button>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="border border-slate-200 dark:border-gray-700 rounded-xl overflow-x-auto w-full shadow-2xs">
                <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                  <thead className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap">MATERIAL</th>
                      <th className="p-3.5 whitespace-nowrap">TYPE</th>
                      <th className="p-3.5 text-center whitespace-nowrap">
                        REQUIRED QTY
                      </th>
                      <th className="p-3.5 whitespace-nowrap">UOM</th>
                      <th className="p-3.5 text-center whitespace-nowrap">
                        AVAILABLE STOCK
                      </th>
                      <th className="p-3.5 text-center whitespace-nowrap">
                        SHORTAGE
                      </th>
                      <th className="p-3.5 text-center whitespace-nowrap">
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                    {validationItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-6 text-center text-slate-500 dark:text-gray-400 font-medium"
                        >
                          No materials listed in BOM.
                        </td>
                      </tr>
                    ) : (
                      validationItems.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30"
                        >
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <div>{item.materialName}</div>
                            {item.SKU && (
                              <div className="text-[10px] text-slate-400 dark:text-gray-500 font-mono font-normal">
                                {item.SKU}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded text-[10px] font-bold whitespace-nowrap inline-block ${
                                item.type === 'PACKAGING'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}
                            >
                              {item.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {item.requiredQty}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-gray-300 font-mono text-xs whitespace-nowrap">
                            {item.uom}
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {item.availableStock}
                          </td>
                          <td
                            className={`p-3.5 text-center font-bold text-sm whitespace-nowrap ${
                              item.shortage > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.shortage}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {item.status === 'AVAILABLE' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap shrink-0">
                                <Check size={12} /> Available
                              </span>
                            ) : item.status === 'OUT_OF_STOCK' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 whitespace-nowrap shrink-0">
                                <AlertTriangle size={12} /> Out of Stock
                              </span>
                            ) : item.status === 'INVENTORY_UNAVAILABLE' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-nowrap shrink-0">
                                <AlertTriangle size={12} /> Inventory Unavailable
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap shrink-0">
                                <AlertTriangle size={12} /> Insufficient
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Shortage Warning Box */}
              {hasShortage && (
                <div className="bg-orange-50/90 dark:bg-amber-950/30 border border-orange-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-4 text-orange-900 dark:text-amber-300">
                  <AlertTriangle
                    className="text-orange-600 dark:text-amber-400 shrink-0 mt-0.5"
                    size={24}
                  />
                  <div className="space-y-2 w-full">
                    <h4 className="text-sm font-bold text-orange-800 dark:text-amber-300">
                      Cannot approve this work order: Insufficient stock for{' '}
                      {shortageItems.length} material(s)
                    </h4>
                    <ul className="text-xs space-y-1.5 text-orange-700 dark:text-amber-400 font-medium list-disc pl-4">
                      {shortageItems.map((item: InventoryValidationItem) => (
                        <li key={item.id || item.materialName}>
                          <span className="font-bold text-orange-900 dark:text-amber-200">
                            {item.materialName}
                          </span>{' '}
                          {item.SKU ? `(${item.SKU})` : ''}:{' '}
                          {item.status === 'INVENTORY_UNAVAILABLE' ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              Inventory System Unavailable
                            </span>
                          ) : (
                            <span>
                              Short {item.shortage} {item.uom} (Required:{' '}
                              {item.requiredQty} {item.uom}, Available:{' '}
                              {item.availableStock} {item.uom})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
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

          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <select
            value={inventoryStatusFilter}
            onChange={(e) => {
              setInventoryStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[100px] shrink-0"
          >
            <option value="ALL" className="dark:bg-gray-800">Stock</option>
            <option value="STOCK_AVAILABLE" className="dark:bg-gray-800">Available</option>
            <option value="STOCK_SHORTAGE" className="dark:bg-gray-800">Shortage</option>
            <option value="NOT_CHECKED" className="dark:bg-gray-800">Not Checked</option>
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

        {/* Dynamic Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search WO, product, Product BOM..."
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
            <thead className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-4 whitespace-nowrap">WO NUMBER</th>
                <th className="p-4 whitespace-nowrap">OUTPUT PRODUCT</th>
                <th className="p-4 whitespace-nowrap">PRODUCT BOM</th>
                <th className="p-4 text-center whitespace-nowrap">TARGET QTY</th>
                <th className="p-4 whitespace-nowrap">PRIORITY</th>
                <th className="p-4 whitespace-nowrap">INVENTORY STATUS</th>
                <th className="p-4 whitespace-nowrap">REQUESTED ON</th>
                <th className="p-4 text-center whitespace-nowrap">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-gray-400">
                    Loading pending work orders...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-red-500">
                    ⚠️ {error}
                  </td>
                </tr>
              ) : paginatedApprovals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-gray-400">
                    No pending work orders found.
                  </td>
                </tr>
              ) : (
                paginatedApprovals.map((req) => {
                  const woNo =
                    req.woDetails?.woNumber || req.relatedEntityName || req.id;
                  const prodName =
                    req.woDetails?.outputProduct ||
                    req.productName ||
                    'Standard Product';
                  const recipeCode = req.woDetails?.recipeCode || 'REC-BOM';
                  const targetQty = req.woDetails?.targetQty || 100;
                  const requestedDate =
                    req.woDetails?.requestedDate || req.requestedDate;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {woNo}
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                        {prodName}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-gray-400 font-mono text-xs whitespace-nowrap">
                        {recipeCode}
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                        {targetQty} Packs
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {getPriorityBadge(req.priority)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {renderInventoryStatusDot(req)}
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
                          className="px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-gray-700 flex justify-between items-center text-xs text-slate-500 dark:text-gray-400 bg-slate-50/50 dark:bg-gray-800 flex-wrap gap-2">
          <span>
            Showing{' '}
            {filteredApprovals.length > 0
              ? (currentPage - 1) * pageSize + 1
              : 0}{' '}
            to {Math.min(currentPage * pageSize, filteredApprovals.length)} of{' '}
            {filteredApprovals.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2.5 py-1 border border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold rounded">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="p-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
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
