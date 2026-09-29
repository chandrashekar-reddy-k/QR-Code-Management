import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  CheckCircle,
  Clock,
  DollarSign,
  Archive,
  Calculator,
  Filter,
  Search,
  RotateCcw,
  X,
  Loader2,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { finishedGoodsService, FinishedGoodsRecord } from '../../../api/packing/finishedGoodsService';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { qualityCheckService, QCRecord } from '../../../api/packing/qualityCheckService';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${day}-${month}-${year} ${time}`;
};

interface UnifiedFGRow {
  _type: 'PENDING' | 'POSTED';
  id: string;
  woNo: string;
  woId: string;
  productName: string;
  batchNo: string;
  postedQty: number;
  destination: string;
  costPerUnit: number;
  status: 'Pending Post' | 'Posted';
  rawWoNo?: string;
  rawWO?: WorkOrder;
  rawFG?: FinishedGoodsRecord;
  costs?: {
    rawMaterial: number;
    packaging: number;
    employee: number;
    electricity: number;
    machine: number;
    transportation: number;
    miscellaneous: number;
    total: number;
    costPerUnit: number;
    profitMargin: number;
  };
}

export const PackingFinishedGoods: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QCRecord[]>([]);
  const [postedFGs, setPostedFGs] = useState<FinishedGoodsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Post Modal state
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [formWoNo, setFormWoNo] = useState('');
  const [allocations, setAllocations] = useState({ ready: 0 });
  const [maxPostedQty, setMaxPostedQty] = useState<number>(0);
  const [isPosting, setIsPosting] = useState(false);

  // Cost Detail Modal state
  const [selectedFGRow, setSelectedFGRow] = useState<UnifiedFGRow | null>(null);

  // Costs calculation state
  const [rawCost, setRawCost] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [employeeCost, setEmployeeCost] = useState(0);
  const [electricity, setElectricity] = useState(0);
  const [machineCost, setMachineCost] = useState(0);
  const [transportation, setTransportation] = useState(0);
  const [miscellaneous, setMiscellaneous] = useState(0);

  // Data Loading
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [woRes, qcRes, fgRes] = await Promise.all([
        workOrderService.getWorkOrders({ limit: 500 }),
        qualityCheckService.getQualityChecks({ limit: 500 }),
        finishedGoodsService.getFinishedGoods({ limit: 500 }),
      ]);

      setWorkOrders(woRes.data || []);
      setQualityChecks(qcRes.data || []);
      setPostedFGs(fgRes.data || []);
    } catch (err) {
      console.error('Failed to load Finished Goods data:', err);
      toast.error('Failed to fetch Finished Goods records.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // QC Passed WOs pending FG posting
  const pendingFG_WOs = useMemo(() => {
    return workOrders.filter((w) =>
      ['QC Passed', 'QC_PASSED', 'Completed', 'PACKING_COMPLETED'].includes(w.status || '')
    );
  }, [workOrders]);

  // Unified Data Rows
  const unifiedData = useMemo<UnifiedFGRow[]>(() => {
    const rows: UnifiedFGRow[] = [];

    // 1. Pending Post WOs
    pendingFG_WOs.forEach((wo) => {
      // Check if already posted
      const alreadyPosted = postedFGs.some((fg) => fg.woId === wo.id || fg.workOrder?.woNumber === wo.woNumber);
      if (!alreadyPosted) {
        const qcRecords = qualityChecks.filter((q) => q.woId === wo.id && ['PASS', 'PARTIAL_PASS', 'Pass', 'Partial Pass'].includes(q.result));
        let totalApproved = qcRecords.reduce((sum, q) => sum + (q.checkedQty || 0), 0);
        if (qcRecords.length === 0) {
          totalApproved = wo.actualProduced || wo.requiredQty || 0;
        }
        if (wo.actualProduced && totalApproved > wo.actualProduced) {
          totalApproved = wo.actualProduced;
        }
        const alreadyPostedFGs = postedFGs.filter(fg => fg.woId === wo.id);
        const woAlreadyPosted = alreadyPostedFGs.reduce((sum, fg) => sum + (fg.postedQty || 0), 0);
        const approvedQty = Math.max(0, totalApproved - woAlreadyPosted);
        const batchNo = wo.batchNumber || (qcRecords[0]?.workOrder?.batchNumber) || `BATCH-2026-${wo.woNumber.split('-').pop()}`;

        rows.push({
          _type: 'PENDING',
          id: `FG-PENDING-${wo.woNumber}`,
          woNo: wo.woNumber,
          woId: wo.id,
          productName: wo.product?.name || 'Product',
          batchNo: batchNo,
          postedQty: approvedQty,
          destination: '-',
          costPerUnit: 0,
          status: 'Pending Post',
          rawWoNo: wo.woNumber,
          rawWO: wo,
        });
      }
    });

    // 2. Posted FG Records
    postedFGs.forEach((fg) => {
      const payload = fg.costPayload || {};
      const costs = payload.costs || {
        rawMaterial: payload.rawMaterial || 3000,
        packaging: payload.packaging || 400,
        employee: payload.employee || 250,
        electricity: payload.electricity || 30,
        machine: payload.machine || 120,
        transportation: payload.transportation || 80,
        miscellaneous: payload.miscellaneous || 50,
        total: payload.total || 3930,
        costPerUnit: payload.costPerUnit || (fg.postedQty > 0 ? Number((3930 / fg.postedQty).toFixed(2)) : 0),
        profitMargin: payload.profitMargin || 18.5,
      };

      rows.push({
        _type: 'POSTED',
        id: fg.id,
        woNo: fg.workOrder?.woNumber || `WO-${fg.woId?.substring(0, 6) || '0000'}`,
        woId: fg.woId,
        productName: fg.product?.name || fg.workOrder?.product?.name || 'Product',
        batchNo: fg.batchNumber,
        postedQty: fg.postedQty,
        destination: fg.destination || 'Warehouse',
        costPerUnit: costs.costPerUnit || 0,
        status: 'Posted',
        rawFG: fg,
        costs,
      });
    });

    return rows;
  }, [pendingFG_WOs, postedFGs, qualityChecks]);

  // Filtered & Sorted Rows
  const filteredData = useMemo(() => {
    let result = unifiedData;
    if (statusFilter && statusFilter !== '') {
      result = result.filter((row) => row.status === statusFilter);
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (row) =>
          row.productName.toLowerCase().includes(term) ||
          row.woNo.toLowerCase().includes(term) ||
          row.batchNo.toLowerCase().includes(term) ||
          row.id.toLowerCase().includes(term)
      );
    }
    if (sortField && sortDirection) {
      result = [...result].sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [unifiedData, search, statusFilter, sortField, sortDirection]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Total KPIs
  const totalUnitsPosted = useMemo(
    () => postedFGs.reduce((acc, fg) => acc + (fg.postedQty || 0), 0),
    [postedFGs]
  );

  const avgCostPerUnit = useMemo(() => {
    if (postedFGs.length === 0) return '0.00';
    const totalCostSum = postedFGs.reduce((acc, fg) => {
      const cpu = fg.costPayload?.costs?.costPerUnit || (fg.postedQty > 0 ? 3930 / fg.postedQty : 0);
      return acc + cpu;
    }, 0);
    return (totalCostSum / postedFGs.length).toFixed(2);
  }, [postedFGs]);

  // Handle Post Form open & WO selection
  const handleSelectWO = (woNo: string) => {
    setFormWoNo(woNo);
    const wo = workOrders.find((w) => w.woNumber === woNo);
    if (wo) {
      // Find the QC records for this WO to get the total approved quantity
      const qcRecords = qualityChecks.filter((q) => q.woId === wo.id && ['PASS', 'PARTIAL_PASS', 'Pass', 'Partial Pass'].includes(q.result));
      let totalApproved = qcRecords.reduce((sum, q) => sum + (q.checkedQty || 0), 0);
      if (qcRecords.length === 0) {
        totalApproved = wo.actualProduced || wo.requiredQty || 0;
      }
      if (wo.actualProduced && totalApproved > wo.actualProduced) {
        totalApproved = wo.actualProduced;
      }
      
      const alreadyPostedFGs = postedFGs.filter(fg => fg.woId === wo.id);
      const alreadyPosted = alreadyPostedFGs.reduce((sum, fg) => sum + (fg.postedQty || 0), 0);
      const maxQty = Math.max(0, totalApproved - alreadyPosted);
      
      setMaxPostedQty(maxQty);
      setAllocations({ ready: maxQty });
      setRawCost(3000);
      setPackagingCost(400);
      setEmployeeCost(250);
      setElectricity(30);
      setMachineCost(120);
      setTransportation(80);
      setMiscellaneous(50);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWoNo) {
      toast.error('Please select an approved batch.');
      return;
    }
    
    const totalAllocated = allocations.ready;
    if (totalAllocated <= 0) {
      toast.error('Please allocate quantity to at least one destination.');
      return;
    }
    
    if (totalAllocated > maxPostedQty) {
      toast.error('Total allocated quantity cannot exceed approved quantity.');
      return;
    }

    const wo = workOrders.find((w) => w.woNumber === formWoNo);
    if (!wo) {
      toast.error('Selected Work Order not found.');
      return;
    }

    const batchNumber = wo.batchNumber || `BATCH-2026-${wo.woNumber.split('-').pop()}`;
    const totalCost = rawCost + packagingCost + employeeCost + electricity + machineCost + transportation + miscellaneous;
    const costPerUnit = totalAllocated > 0 ? Number((totalCost / totalAllocated).toFixed(2)) : 0;
    const simulatedSellingPrice = 48;
    const profitMargin = costPerUnit > 0 ? Number((((simulatedSellingPrice - costPerUnit) / simulatedSellingPrice) * 100).toFixed(1)) : 0;

    try {
      setIsPosting(true);
      
      const payloadAllocations: { destination: string, qty: number }[] = [];
      if (allocations.ready > 0) payloadAllocations.push({ destination: 'Ready Inventory', qty: allocations.ready });

      await finishedGoodsService.postFinishedGoods({
        woId: wo.id,
        batchNumber: batchNumber,
        allocations: payloadAllocations,
        costPayload: {
          costs: {
            rawMaterial: rawCost,
            packaging: packagingCost,
            employee: employeeCost,
            electricity,
            machine: machineCost,
            transportation,
            miscellaneous,
            total: totalCost,
            costPerUnit,
            profitMargin,
          },
          postedBy: 'Admin User',
          postedAt: new Date().toISOString(),
        },
      });

      toast.success('Batch has been successfully posted to Finished Goods.');
      setIsPostOpen(false);
      setFormWoNo('');
      loadData(false);
    } catch (err: any) {
      console.error('Failed to post finished goods:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to post finished goods.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') setSortField(null);
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-6 text-left">
      {/* Title & Subtitle */}
      <div className="mb-4 mt-3 flex justify-between items-end">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
            Finished Goods
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Home &gt; <span className="text-orange-600 dark:text-orange-400 font-semibold">Finished Goods</span>
          </p>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Pending Postings */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Pending Postings
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {unifiedData.filter((r) => r._type === 'PENDING').length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* Total Posted Logs */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Total Posted Logs
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {postedFGs.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
            <CheckCircle size={22} />
          </div>
        </div>

        {/* Total Units Posted */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Total Units Posted
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalUnitsPosted}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
            <Package size={22} />
          </div>
        </div>

        {/* Avg Cost / Unit */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Avg Cost / Unit
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ₹{avgCostPerUnit}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center mb-6">
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs h-10 overflow-x-auto w-full xl:w-auto">
          <div className="px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
            <Filter size={16} />
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[120px] shrink-0"
          >
            <option value="" className="dark:bg-gray-800">All Status</option>
            <option value="Pending Post" className="dark:bg-gray-800">Pending Post</option>
            <option value="Posted" className="dark:bg-gray-800">Posted</option>
          </select>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setSortField(null);
              setSortDirection(null);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent cursor-pointer shrink-0"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-stretch">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search FG ledger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] transition-all shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 dark:text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading Finished Goods...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <th
                    onClick={() => handleSort('woNo')}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      WO NO <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('productName')}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      PRODUCT NAME <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('batchNo')}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      BATCH NO <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('postedQty')}
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1">
                      QTY <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1">
                      STATUS <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      No Finished Goods records found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr
                      key={`${row.id}-${index}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="py-0.5 flex flex-col justify-start min-h-[32px]">
                          {row._type === 'POSTED' && (
                            <div className="font-mono text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">
                              {row.id}
                            </div>
                          )}
                          <div className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                            {row.woNo}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-xs text-gray-900 dark:text-white max-w-[220px] truncate">
                          {row.productName}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200/60 dark:border-gray-700">
                          {row.batchNo}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="font-bold text-xs text-gray-900 dark:text-white">
                          {row.postedQty}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                              row._type === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                row._type === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            {row.status}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                        <div className="flex justify-end">
                          {row._type === 'PENDING' ? (
                            <button
                              onClick={() => {
                                handleSelectWO(row.rawWoNo || row.woNo);
                                setIsPostOpen(true);
                              }}
                              className="bg-[#00891D] hover:bg-[#006b17] text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Archive size={14} /> Post
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedFGRow(row)}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Calculator size={14} /> Costs
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && (
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
                {Math.min(currentPage * rowsPerPage, filteredData.length)} of{' '}
                {filteredData.length} records
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
        )}
      </div>

      {/* Cost Detail Modal */}
      {selectedFGRow && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 w-full max-w-lg shadow-2xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-gray-700 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400 dark:text-gray-500">
                  {selectedFGRow.id}
                </span>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  {selectedFGRow.productName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFGRow(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 flex justify-between text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              <span>Post Destination: {selectedFGRow.destination}</span>
              <span>Yield: {selectedFGRow.postedQty} units</span>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Calculator size={14} />
                <span>Cost Calculation Breakdown</span>
              </h4>

              <div className="border border-slate-200 dark:border-gray-700 rounded-lg divide-y divide-slate-150 dark:divide-gray-700 text-xs">
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-500 dark:text-gray-400">Raw Material Cost</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                    ₹{selectedFGRow.costs?.rawMaterial ?? 3000}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-500 dark:text-gray-400">Packaging Materials Cost</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                    ₹{selectedFGRow.costs?.packaging ?? 400}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-500 dark:text-gray-400">Labor / Employee Cost</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                    ₹{selectedFGRow.costs?.employee ?? 250}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-500 dark:text-gray-400">Electricity Utility Allocation</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                    ₹{selectedFGRow.costs?.electricity ?? 30}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-500 dark:text-gray-400">Machine Utilization Cost</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                    ₹{selectedFGRow.costs?.machine ?? 120}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-500 dark:text-gray-400">Transportation / Routing Cost</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                    ₹{selectedFGRow.costs?.transportation ?? 80}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-500 dark:text-gray-400">Miscellaneous Costs</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                    ₹{selectedFGRow.costs?.miscellaneous ?? 50}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-gray-900 font-bold text-slate-900 dark:text-white">
                  <span>Total Production Cost</span>
                  <span>₹{selectedFGRow.costs?.total ?? 3930}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-700 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 dark:text-gray-400 block font-bold uppercase">
                  Cost Per Unit
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-white">
                  ₹{selectedFGRow.costs?.costPerUnit ?? selectedFGRow.costPerUnit}
                </span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 p-3 rounded-lg">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold uppercase">
                  Profit Margin
                </span>
                <span className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                  {selectedFGRow.costs?.profitMargin ?? 18.5}%
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedFGRow(null)}
                className="bg-slate-800 dark:bg-gray-700 hover:bg-slate-900 dark:hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posting Dialog Form */}
      {isPostOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-900 text-white rounded-t-xl sticky top-0 z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Archive size={18} />
                <span>Post Finished Goods</span>
              </h3>
              <button
                onClick={() => setIsPostOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="p-6 space-y-4 flex-1 text-left text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Select QC Passed Batch *
                </label>
                <div className="relative">
                  <select
                    required
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D] appearance-none"
                    value={formWoNo}
                    onChange={(e) => handleSelectWO(e.target.value)}
                  >
                    <option value="" className="dark:bg-gray-800">-- Choose Approved Batch --</option>
                    {pendingFG_WOs.map((w) => (
                      <option key={w.id} value={w.woNumber} className="dark:bg-gray-800">
                        {w.woNumber} - {w.product?.name || 'Product'} ({w.actualProduced || w.requiredQty} units)
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-gray-700 pb-3">
                  <span className="text-xs font-bold text-slate-600 dark:text-gray-300">
                    Approved Quantity: <span className="text-gray-900 dark:text-white bg-slate-200 dark:bg-gray-800 px-2 py-0.5 rounded ml-1">{maxPostedQty}</span>
                  </span>
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-slate-600 dark:text-gray-300">
                      Allocated: <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded ml-1">{allocations.ready}</span>
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-gray-300">
                      Remaining: <span className={`px-2 py-0.5 rounded ml-1 ${maxPostedQty - allocations.ready < 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {maxPostedQty - allocations.ready}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                    <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      Ready Inventory (Warehouse) Allocation
                    </span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                      {allocations.ready} units (Auto-allocated)
                    </span>
                  </div>
                </div>
              </div>

              {/* Posting Summary */}
              <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-lg border border-slate-200 dark:border-gray-700 space-y-3">
                <span className="font-bold text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wide block">
                  Posting Summary
                </span>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">
                      Total Allocated
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {allocations.ready} units
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">
                      Destinations
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white text-xs flex gap-2 flex-wrap">
                      {allocations.ready > 0 && <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">Ready Inventory ({allocations.ready})</span>}
                      {allocations.ready === 0 && <span className="text-gray-400">-</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">
                      Posting Date
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {formatDateTime(new Date().toISOString())}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">
                      Posted By
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      Admin User
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase mb-0.5">
                      Current Status
                    </span>
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 rounded-full font-bold text-[10px]">
                      Ready for Inventory Sync
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-gray-700 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPostOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPosting}
                  className="px-5 py-2 bg-[#00891D] hover:bg-[#006b17] text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  <span>{isPosting ? 'Posting...' : 'Post Finished Goods'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingFinishedGoods;
