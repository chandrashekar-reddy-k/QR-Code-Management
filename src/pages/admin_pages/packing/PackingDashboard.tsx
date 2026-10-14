import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Package,
  ShieldCheck,
  Clock,
  CheckCircle,
  Filter,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Activity,
  Printer,
  Boxes,
  PackageCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  workOrderService,
  qualityCheckService,
  repackingService,
  WorkOrder,
  QCRecord,
  RepackingLog,
} from "../../../api/packing";

export const PackingDashboard: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QCRecord[]>([]);
  const [, setRepackings] = useState<RepackingLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Tab navigation state (Active Work Orders selected by default)
  const [activeTab, setActiveTab] = useState<
    'active_wo' | 'material_issue' | 'packing_exec' | 'qc' | 'finished_goods'
  >('active_wo');

  // Search & Filter state for Active Work Orders
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Pagination state for Active Work Orders table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const fetchDashboardData = async () => {
    try {
      const [woRes, qcRes, rpRes] = await Promise.allSettled([
        workOrderService.getWorkOrders({ limit: 500 }),
        qualityCheckService.getQualityChecks({ limit: 500 }),
        repackingService.getRepackingLogs({ limit: 500 }),
      ]);

      if (woRes.status === "fulfilled" && woRes.value?.data) {
        setWorkOrders(woRes.value.data);
      }
      if (qcRes.status === "fulfilled" && qcRes.value?.data) {
        setQualityChecks(qcRes.value.data);
      }
      if (rpRes.status === "fulfilled" && rpRes.value?.data) {
        setRepackings(rpRes.value.data);
      }
    } catch (err) {
      console.error("Failed to fetch Packing Dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // DERIVE PACKING & REPACKING ERP DATA DYNAMICALY FROM API
  const totalWorkOrders = workOrders.length;

  // Row 1 — Workflow KPIs
  const pendingWorkOrders = useMemo(
    () => workOrders.filter((w) => ["DRAFT", "PENDING"].includes(w.status)).length,
    [workOrders]
  );

  const materialIssuePending = useMemo(
    () => workOrders.filter((w) => ["APPROVED"].includes(w.status)).length,
    [workOrders]
  );

  const activePacking = useMemo(
    () => workOrders.filter((w) => ["MATERIAL_ISSUED", "PACKING_STARTED", "PACKING_IN_PROGRESS"].includes(w.status)).length,
    [workOrders]
  );

  const pendingLabelPrinting = useMemo(
    () => workOrders.filter((w) => ["PACKING_COMPLETED", "LABEL_APPLICATION_ASSIGNED", "LABEL_APPLICATION_IN_PROGRESS", "LABEL_PENDING"].includes(w.status)).length,
    [workOrders]
  );

  // Row 2 — Output & Quality KPIs
  const qcPending = useMemo(
    () => workOrders.filter((w) => ["LABELS_APPLIED", "QC_PENDING", "QC_ASSIGNED", "QC_IN_PROGRESS"].includes(w.status)).length,
    [workOrders]
  );

  const completedWorkOrders = useMemo(
    () => workOrders.filter((w) => ["COMPLETED"].includes(w.status)).length,
    [workOrders]
  );


  const totalInputQty = useMemo(
    () => workOrders.reduce((sum, item) => sum + (item.requiredQty || 0), 0),
    [workOrders]
  );

  const totalOutputQty = useMemo(
    () => workOrders.reduce((sum, item) => sum + (item.actualProduced || 0), 0),
    [workOrders]
  );

  const totalWastage = useMemo(
    () =>
      workOrders.reduce((sum, item) => sum + (item.actualRejected || 0), 0) +
      qualityChecks
        .filter((q) => ["REJECT", "REWORK", "DISCARD", "FAIL"].includes(q.result))
        .reduce((sum, q) => sum + (q.checkedQty || 0), 0),
    [workOrders, qualityChecks]
  );

  // Tab 1: Active work orders
  const activeWOs = useMemo(() => {
    return workOrders.filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELLED" && w.status !== "DRAFT");
  }, [workOrders]);

  // Tab 2: Material Issue work orders
  const materialIssueWOs = useMemo(() => {
    return workOrders.filter((w) => ["APPROVED"].includes(w.status));
  }, [workOrders]);

  // Tab 3: Packing Execution work orders
  const packingExecWOs = useMemo(() => {
    return workOrders.filter((w) =>
      ["MATERIAL_ISSUED", "PACKING_STARTED", "PACKING_IN_PROGRESS", "LABELS_PRINTED", "LABEL_APPLICATION_ASSIGNED", "LABEL_APPLICATION_IN_PROGRESS", "PACKING_COMPLETED"].includes(w.status)
    );
  }, [workOrders]);

  // Tab 4: Quality Check work orders
  const qcWOs = useMemo(() => {
    return workOrders.filter((w) => ["LABELS_APPLIED", "QC_PENDING", "QC_IN_PROGRESS"].includes(w.status));
  }, [workOrders]);

  // Tab 5: Finished Goods work orders
  const finishedGoodsWOs = useMemo(() => {
    return workOrders.filter((w) => ["QC_PASSED"].includes(w.status));
  }, [workOrders]);

  // Helper to render product column with Primary Product + Counter Badge & Hover Popover for multi-product orders
  const renderProductColumn = (wo: any) => {
    const items = Array.isArray(wo?.sourceItems) && wo.sourceItems.length > 0 ? wo.sourceItems : null;

    if (items && items.length > 1) {
      const primaryName = items[0].product || 'Product 1';
      const extraCount = items.length - 1;

      return (
        <div className="relative group inline-flex items-center gap-1.5 max-w-[220px]">
          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate cursor-default max-w-[140px]" title={primaryName}>
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

    const singleName = wo?.product?.name || items?.[0]?.product || 'Product';
    return (
      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block max-w-[220px]" title={singleName}>
        {singleName}
      </span>
    );
  };

  const isUuidString = (str?: string) => {
    if (!str) return false;
    const s = String(str).trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || s.length > 20;
  };

  const getWOUnit = (wo: any) => {
    const uomObj = wo?.product?.uom;
    if (uomObj && typeof uomObj === 'object') {
      if (uomObj.abbreviation && !isUuidString(uomObj.abbreviation)) return String(uomObj.abbreviation).trim().toUpperCase();
      if (uomObj.name && !isUuidString(uomObj.name)) return String(uomObj.name).trim().toUpperCase();
    }
    const sourceUom = wo?.sourceItems?.[0]?.uom;
    if (sourceUom && !isUuidString(sourceUom)) return String(sourceUom).trim().toUpperCase();

    const prodUnit = wo?.product?.unit;
    if (prodUnit && !isUuidString(prodUnit)) return String(prodUnit).trim().toUpperCase();

    return 'KG';
  };

  // Helper to format required quantity per UOM
  const formatRequiredQty = (wo: any) => {
    if (!wo) return '0';
    if (Array.isArray(wo.outputAllocations) && wo.outputAllocations.length > 0) {
      const map: Record<string, number> = {};
      wo.outputAllocations.forEach((alloc: any) => {
        const parts = alloc.packSizeText ? alloc.packSizeText.trim().split(' ') : [];
        const fallbackUnit = getWOUnit(wo);
        let unit = parts.length > 1 ? parts.slice(1).join(' ').toUpperCase() : fallbackUnit;
        if (isUuidString(unit)) unit = fallbackUnit;
        const qty = Number(alloc.totalQtyKg) || (Number(alloc.plannedUnits) || 0) * (alloc.packSizeKg || 1);
        map[unit] = (map[unit] || 0) + qty;
      });
      const entries = Object.entries(map);
      if (entries.length > 0) {
        return entries.map(([uom, qty]) => `${parseFloat(qty.toFixed(3))} ${uom}`).join(', ');
      }
    }
    const unit = getWOUnit(wo);
    return `${parseFloat(Number(wo.requiredQty || 0).toFixed(3))} ${unit}`;
  };

  // Helper to format packed quantity per UOM
  const formatPackedQty = (wo: any) => {
    if (!wo) return '0';
    const actual = wo.actualProduced || 0;
    if (actual === 0) return '0';

    if (Array.isArray(wo.outputAllocations) && wo.outputAllocations.length > 0) {
      const map: Record<string, number> = {};
      const totalReq = wo.requiredQty || 1;

      wo.outputAllocations.forEach((alloc: any) => {
        const parts = alloc.packSizeText ? alloc.packSizeText.trim().split(' ') : [];
        const fallbackUnit = getWOUnit(wo);
        let unit = parts.length > 1 ? parts.slice(1).join(' ').toUpperCase() : fallbackUnit;
        if (isUuidString(unit)) unit = fallbackUnit;

        const targetQty = Number(alloc.totalQtyKg) || (Number(alloc.plannedUnits) || 0) * (alloc.packSizeKg || 1);
        const packedQty = alloc.packedUnits !== undefined && alloc.packedUnits !== null
          ? Number(alloc.packedUnits) * (alloc.packSizeKg || 1)
          : Math.round((actual * (targetQty / totalReq)) * 100) / 100;

        map[unit] = (map[unit] || 0) + packedQty;
      });

      const entries = Object.entries(map);
      if (entries.length > 0) {
        return entries.map(([uom, qty]) => `${parseFloat(qty.toFixed(3))} ${uom}`).join(', ');
      }
    }

    const unit = getWOUnit(wo);
    return `${parseFloat(Number(actual).toFixed(3))} ${unit}`;
  };

  // Filter dataset for current activeTab
  const currentTabWOs = useMemo(() => {
    let sourceData = activeWOs;
    if (activeTab === "material_issue") sourceData = materialIssueWOs;
    else if (activeTab === "packing_exec") sourceData = packingExecWOs;
    else if (activeTab === "qc") sourceData = qcWOs;
    else if (activeTab === "finished_goods") sourceData = finishedGoodsWOs;

    return sourceData.filter((w) => {
      const sourceProductsText = Array.isArray((w as any).sourceItems)
        ? (w as any).sourceItems.map((i: any) => i.product).join(' ')
        : '';
      const matchesSearch =
        !searchQuery ||
        (w.woNumber || w.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.product?.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        sourceProductsText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeTab, activeWOs, materialIssueWOs, packingExecWOs, qcWOs, finishedGoodsWOs, searchQuery, statusFilter]);

  // Reset page when filter/search/tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  const totalPages = Math.ceil(currentTabWOs.length / itemsPerPage);

  const paginatedWOs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return currentTabWOs.slice(startIndex, startIndex + itemsPerPage);
  }, [currentTabWOs, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Page Title */}
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Packing & Repacking Dashboard
        </h2>
      </div>

      {/* TOP SECTION: 2-ROW, 5-COLUMN COMPACT KPI GRID */}
      <div className="space-y-2">
        {/* ROW 1 — WORKFLOW KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* 1. Total Work Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Total Work Orders
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Layers size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {totalWorkOrders}
            </div>
          </div>

          {/* 2. Pending Work Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Pending Work Orders
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Clock size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {pendingWorkOrders}
            </div>
          </div>

          {/* 3. Material Issue Pending */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Material Issue Pending
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <FileText size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {materialIssuePending}
            </div>
          </div>

          {/* 4. Active Packing */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Active Packing
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <Activity size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {activePacking}
            </div>
          </div>

          {/* 5. Pending Barcode/Label Printing */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate" title="Pending Barcode/Label Printing">
                Pending Barcode/Labels
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Printer size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {pendingLabelPrinting}
            </div>
          </div>
        </div>

        {/* ROW 2 — OUTPUT & QUALITY KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* 6. QC Pending */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                QC Pending
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <ShieldCheck size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {qcPending}
            </div>
          </div>

          {/* 7. Completed */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Completed
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {completedWorkOrders}
            </div>
          </div>

          {/* 8. Total Input Quantity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Total Input Quantity
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <Boxes size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {totalInputQty}
            </div>
          </div>

          {/* 9. Total Output Quantity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Total Output Quantity
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                <PackageCheck size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
              {totalOutputQty}
            </div>
          </div>

          {/* 10. Total Wastage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between h-[58px] relative overflow-hidden transition-all">
            <div className="flex justify-between items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] leading-none truncate">
                Total Wastage
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 leading-none">
              {totalWastage}
            </div>
          </div>
        </div>
      </div>

      {/* OPERATIONAL SECTION */}
      <div className="space-y-4 pt-2">
        {/* Search & Filter Bar (Positioned above table card) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs h-11 overflow-hidden w-full sm:w-auto">
            <div className="px-4 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <Filter size={18} />
            </div>

            <div className="w-52 border-r border-gray-200 dark:border-gray-700 h-full relative flex items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-full bg-transparent border-none px-4 pr-10 py-0 text-sm font-bold text-gray-900 dark:text-gray-100 focus:ring-0 focus:outline-none cursor-pointer appearance-none bg-none [webkit-appearance:none] [moz-appearance:none]"
              >
                <option value="All" className="dark:bg-gray-800">All Statuses</option>
                <option value="APPROVED" className="dark:bg-gray-800">Approved</option>
                <option value="MATERIAL_ISSUED" className="dark:bg-gray-800">Material Issued</option>
                <option value="PACKING_STARTED" className="dark:bg-gray-800">Packing Started</option>
                <option value="PACKING_IN_PROGRESS" className="dark:bg-gray-800">Packing In Progress</option>
                <option value="PACKING_COMPLETED" className="dark:bg-gray-800">Packing Completed</option>
                <option value="LABELS_PRINTED" className="dark:bg-gray-800">Labels Printed</option>
                <option value="LABEL_APPLICATION_ASSIGNED" className="dark:bg-gray-800">Label Assigned</option>
                <option value="LABEL_APPLICATION_IN_PROGRESS" className="dark:bg-gray-800">Labels In Progress</option>
                <option value="LABELS_APPLIED" className="dark:bg-gray-800">Labels Applied</option>
                <option value="QC_PENDING" className="dark:bg-gray-800">QC Pending</option>
                <option value="QC_IN_PROGRESS" className="dark:bg-gray-800">QC In Progress</option>
                <option value="QC_PASSED" className="dark:bg-gray-800">QC Passed</option>
                <option value="COMPLETED" className="dark:bg-gray-800">Completed</option>
                <option value="CANCELLED" className="dark:bg-gray-800">Cancelled</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
              }}
              className="flex items-center gap-1.5 text-[#EF5A06] hover:bg-orange-50 dark:hover:bg-orange-900/20 px-4 h-full transition-colors font-semibold text-xs shrink-0 cursor-pointer"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search WO No, Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Main Table & Tab Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden flex flex-col">
          {/* Tabs Header Bar (Shopkeeper Order Processing style) */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-2 justify-between items-center overflow-x-auto scrollbar-none">
            <div className="flex gap-8">
              {[
                { id: 'active_wo', label: 'Active Work Orders', count: activeWOs.length, color: 'bg-green-700' },
                { id: 'material_issue', label: 'Material Issue', count: materialIssueWOs.length, color: 'bg-purple-600' },
                { id: 'packing_exec', label: 'Packing Execution', count: packingExecWOs.length, color: 'bg-[#EF5A06]' },
                { id: 'qc', label: 'QC', count: qcWOs.length, color: 'bg-orange-500' },
                { id: 'finished_goods', label: 'Finished Goods', count: finishedGoodsWOs.length, color: 'bg-emerald-600' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 pb-4 pt-2 px-1 relative font-semibold text-[14px] transition-colors cursor-pointer whitespace-nowrap ${isActive
                      ? 'text-[#00891D] dark:text-green-400 font-bold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${tab.color}`}>
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00891D] dark:bg-green-400 rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* OPERATIONAL WORK ORDERS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 h-[52px] text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  <th className="py-3 px-5">WORK ORDER NO</th>
                  <th className="py-3 px-5">SKU</th>
                  <th className="py-3 px-5">PRODUCT</th>
                  <th className="py-3 px-5 text-center">REQUIRED QTY</th>
                  <th className="py-3 px-5 text-center">PACKED QTY</th>
                  <th className="py-3 px-5 text-center">STATUS</th>
                  <th className="py-3 px-5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 px-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 text-[#00891D] animate-spin" />
                        <span className="text-sm font-medium">Loading active work orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentTabWOs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 px-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-gray-400 stroke-1" />
                        <span className="text-sm font-medium">No work orders available for this section.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedWOs.map((wo) => {
                    let badgeStyle = "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
                    if (wo.status === "COMPLETED" || wo.status === "QC_PASSED") {
                      badgeStyle = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800";
                    } else if (wo.status === "MATERIAL_ISSUED") {
                      badgeStyle = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800";
                    } else if (
                      wo.status === "LABELS_PRINTED" ||
                      wo.status === "LABEL_APPLICATION_ASSIGNED" ||
                      wo.status === "LABEL_APPLICATION_IN_PROGRESS" ||
                      wo.status === "LABELS_APPLIED"
                    ) {
                      badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
                    } else if (
                      wo.status === "PACKING_STARTED" ||
                      wo.status === "PACKING_IN_PROGRESS"
                    ) {
                      badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800";
                    } else if (
                      wo.status === "QC_PENDING" ||
                      wo.status === "QC_IN_PROGRESS"
                    ) {
                      badgeStyle = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800";
                    } else if ((wo.status as string) === "CANCELLED" || (wo.status as string) === "REJECTED") {
                      badgeStyle = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
                    }

                    return (
                      <tr
                        key={wo.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-[64px]"
                      >
                        <td className="px-5 py-3.5 font-mono font-bold text-[13px] text-gray-900 dark:text-gray-100">
                          {wo.woNumber}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-semibold text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {wo.product?.sku || (Array.isArray((wo as any).sourceItems) && (wo as any).sourceItems[0]?.sku) || "—"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {renderProductColumn(wo)}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-[13px] text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {formatRequiredQty(wo)}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-[13px] text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {formatPackedQty(wo)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border whitespace-nowrap inline-block ${badgeStyle}`}>
                            {wo.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {(wo.status === "PENDING" || wo.status === "APPROVED") && (
                            <Link
                              to={`/packing-erp/material-issue/${wo.id}`}
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors px-3.5 py-1.5 rounded-lg shadow-xs whitespace-nowrap"
                            >
                              <span>Issue</span>
                            </Link>
                          )}
                          {(wo.status === "MATERIAL_ISSUED" ||
                            wo.status === "PACKING_STARTED" ||
                            wo.status === "PACKING_IN_PROGRESS" ||
                            wo.status === "LABELS_PRINTED" ||
                            wo.status === "LABEL_APPLICATION_ASSIGNED" ||
                            wo.status === "LABEL_APPLICATION_IN_PROGRESS") && (
                              <Link
                                to={`/packing-erp/packing-execution/${wo.id}`}
                                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#00891D] hover:bg-[#007518] transition-colors px-3.5 py-1.5 rounded-lg shadow-xs whitespace-nowrap"
                              >
                                <span>Pack</span>
                              </Link>
                            )}
                          {(wo.status === "LABELS_APPLIED" || wo.status === "QC_PENDING" || wo.status === "QC_IN_PROGRESS") && (
                            <Link
                              to={`/packing-erp/quality-check/${wo.id}`}
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#EF5A06] hover:bg-[#d44e05] transition-colors px-3.5 py-1.5 rounded-lg shadow-xs whitespace-nowrap"
                            >
                              <span>Start QC</span>
                            </Link>
                          )}
                          {(wo.status === "PACKING_COMPLETED") && (
                            <Link
                              to={`/packing-erp/barcodes-labels/${wo.id}`}
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3.5 py-1.5 rounded-lg shadow-xs whitespace-nowrap"
                            >
                              <span>Print Labels</span>
                            </Link>
                          )}
                          {wo.status === "QC_PASSED" && (
                            <Link
                              to={`/packing-erp/finished-goods/${wo.id}`}
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors px-3.5 py-1.5 rounded-lg shadow-xs whitespace-nowrap"
                            >
                              <span>Post FG</span>
                            </Link>
                          )}
                          {(wo.status === "DRAFT" || wo.status === "COMPLETED" || wo.status === "CANCELLED") && (
                            <Link
                              to="/packing-erp/work-orders"
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors px-3 py-1.5 rounded-lg whitespace-nowrap"
                            >
                              <span>View</span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer - Only displays when currentTabWOs has more than 10 rows */}
          {currentTabWOs.length > 10 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, currentTabWOs.length)} of {currentTabWOs.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[14px] font-semibold text-gray-700 dark:text-gray-300 px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackingDashboard;
