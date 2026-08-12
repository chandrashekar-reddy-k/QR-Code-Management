import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  X,
  Eye,
  Building,
  MapPin,
  Layers,
  ArrowRight
} from 'lucide-react';
import { finishedGoodsService, FinishedGoodsRecord } from '../../../api/packing/finishedGoodsService';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { qualityCheckService, QCRecord } from '../../../api/packing/qualityCheckService';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

interface UnifiedFGRow {
  _type: 'PENDING' | 'POSTED';
  id: string;
  fgNumber?: string;
  woId: string;
  woNumber: string;
  productName: string;
  sku: string;
  batchNumber: string;
  packedQty: number;
  acceptedQty: number;
  uom: string;
  mrp: number;
  expiryDate: string;
  storageLocation: string;
  destination: string;
  postedBy: string;
  postedAt: string;
  inventorySyncStatus: 'PENDING' | 'SYNCHRONIZED';
  rawWO?: WorkOrder;
  rawQC?: QCRecord;
  rawFG?: FinishedGoodsRecord;
}

export const PackingFinishedGoods: React.FC = () => {
  const [pendingWOs, setPendingWOs] = useState<WorkOrder[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QCRecord[]>([]);
  const [postedFGs, setPostedFGs] = useState<FinishedGoodsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  // Inward Modal State
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Inward Form Data
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formAcceptedQty, setFormAcceptedQty] = useState(0);
  const [formUom, setFormUom] = useState('KG');
  const [formMrp, setFormMrp] = useState(150);
  const [formMfgDate, setFormMfgDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [formExpiryDate, setFormExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 12);
    return d.toISOString().substring(0, 10);
  });
  const [formLocation, setFormLocation] = useState('Rack A-12 (Main Bay)');
  const [formDestination, setFormDestination] = useState('Main Warehouse Distribution Hub');
  const [formRemarks, setFormRemarks] = useState('');

  // Detail Modal State
  const [selectedRow, setSelectedRow] = useState<UnifiedFGRow | null>(null);

  // ─── Data Loading ───────────────────────────────────────────────────────────
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [woRes, qcRes, fgRes] = await Promise.all([
        workOrderService.getWorkOrders({ limit: 500 }),
        qualityCheckService.getQualityChecks({ limit: 500 }),
        finishedGoodsService.getFinishedGoods({ limit: 500 }),
      ]);

      const allWOs = woRes.data || [];
      const allQCs = qcRes.data || [];
      const allFGs = fgRes.data || [];

      // ENTRY RULE: Strictly filter for QC_PASSED work orders for Pending Inward
      const qcPassedWOs = allWOs.filter((w) => w.status === 'QC_PASSED');
      setPendingWOs(qcPassedWOs);
      setQualityChecks(allQCs);
      setPostedFGs(allFGs);
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

  // ─── Unified Data Rows ─────────────────────────────────────────────────────
  const unifiedRows = useMemo<UnifiedFGRow[]>(() => {
    const rows: UnifiedFGRow[] = [];

    // 1. Pending FG Inward Queue (Strictly QC_PASSED)
    pendingWOs.forEach((wo) => {
      const qc = qualityChecks.find((q) => q.woId === wo.id && (q.result === 'PASS' || q.result === 'PARTIAL_PASS'));
      const qcAcceptedQty = qc?.checkedQty || wo.actualProduced || wo.requiredQty;

      rows.push({
        _type: 'PENDING',
        id: `PENDING-${wo.id}`,
        woId: wo.id,
        woNumber: wo.woNumber,
        productName: wo.product?.name || 'Product',
        sku: wo.product?.sku || 'N/A',
        batchNumber: wo.batchNumber || qc?.workOrder?.batchNumber || `BATCH-${wo.woNumber.split('-').pop()}`,
        packedQty: wo.actualProduced || wo.requiredQty,
        acceptedQty: qcAcceptedQty,
        uom: (wo.product as any)?.uom || 'KG',
        mrp: (wo.product as any)?.mrp || 150,
        expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().substring(0, 10),
        storageLocation: 'Rack A-12 (Pending Inward)',
        destination: 'Main Warehouse',
        postedBy: '—',
        postedAt: wo.updatedAt,
        inventorySyncStatus: 'PENDING',
        rawWO: wo,
        rawQC: qc,
      });
    });

    // 2. Posted Finished Goods History
    postedFGs.forEach((fg) => {
      const payload = fg.costPayload || {};

      rows.push({
        _type: 'POSTED',
        id: fg.id,
        fgNumber: fg.fgNumber,
        woId: fg.woId,
        woNumber: fg.workOrder?.woNumber || `WO-${fg.woId.substring(0, 6)}`,
        productName: fg.product?.name || fg.workOrder?.product?.name || 'Product',
        sku: fg.product?.sku || fg.workOrder?.product?.sku || 'N/A',
        batchNumber: fg.batchNumber,
        packedQty: fg.workOrder?.actualProduced || fg.postedQty,
        acceptedQty: fg.postedQty,
        uom: payload.uom || (fg.product as any)?.uom || 'KG',
        mrp: payload.mrp || (fg.product as any)?.mrp || 150,
        expiryDate: payload.expiryDate || '—',
        storageLocation: payload.storageLocation || 'Zone B-04',
        destination: fg.destination,
        postedBy: payload.postedBy || 'Admin Manager',
        postedAt: fg.createdAt,
        inventorySyncStatus: payload.inventorySyncStatus || 'PENDING',
        rawFG: fg,
      });
    });

    return rows.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [pendingWOs, qualityChecks, postedFGs]);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      if (filterStatus) {
        if (filterStatus === 'PENDING' && r._type !== 'PENDING') return false;
        if (filterStatus === 'POSTED' && r._type !== 'POSTED') return false;
      }
      if (filterLocation && !r.storageLocation.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      if (filterProduct && !r.productName.toLowerCase().includes(filterProduct.toLowerCase())) return false;

      if (search) {
        const s = search.toLowerCase();
        const matchesFg = r.fgNumber?.toLowerCase().includes(s);
        const matchesWo = r.woNumber.toLowerCase().includes(s);
        const matchesProd = r.productName.toLowerCase().includes(s);
        const matchesBatch = r.batchNumber.toLowerCase().includes(s);
        if (!matchesFg && !matchesWo && !matchesProd && !matchesBatch) return false;
      }
      return true;
    });
  }, [unifiedRows, filterStatus, filterLocation, filterProduct, search]);

  // Open Inward Modal
  const handleOpenInwardModal = (row: UnifiedFGRow) => {
    if (!row.rawWO) return;
    const wo = row.rawWO;
    const qc = row.rawQC || null;

    setSelectedWO(wo);
    setMatchingQC(qc);

    // Quantity Rule: Pre-populate final QC accepted quantity
    const finalAcceptedQty = qc?.checkedQty || wo.actualProduced || wo.requiredQty;
    const computedBatch = wo.batchNumber || qc?.workOrder?.batchNumber || `BATCH-2026-${wo.woNumber.split('-').pop()}`;

    setFormBatchNo(computedBatch);
    setFormAcceptedQty(finalAcceptedQty);
    setFormUom((wo.product as any)?.uom || 'KG');
    setFormMrp((wo.product as any)?.mrp || 150);
    setFormMfgDate(new Date().toISOString().substring(0, 10));
    setFormExpiryDate(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().substring(0, 10));
    setFormLocation('Rack A-12 (Main Bay)');
    setFormDestination('Main Warehouse Distribution Hub');
    setFormRemarks('');
  };

  // Submit Finished Goods Inward
  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO || !formBatchNo || formAcceptedQty <= 0) return;

    try {
      setIsPosting(true);

      const costPayloadData = {
        uom: formUom,
        mrp: formMrp,
        manufacturingDate: formMfgDate,
        expiryDate: formExpiryDate,
        storageLocation: formLocation,
        remarks: formRemarks,
        inventorySyncStatus: 'PENDING',
        postedBy: 'Admin Manager',
        postedAt: new Date().toISOString(),
      };

      await finishedGoodsService.postFinishedGoods({
        woId: selectedWO.id,
        batchNumber: formBatchNo,
        postedQty: formAcceptedQty,
        destination: formDestination,
        costPayload: costPayloadData,
      });

      toast.success(`Batch ${formBatchNo} successfully posted to Finished Goods! Work Order #${selectedWO.woNumber} completed.`);
      setSelectedWO(null);
      loadData(false);
    } catch (err: any) {
      console.error('Failed to post Finished Goods:', err);
      toast.error(err?.response?.data?.message || 'Failed to post Finished Goods batch.');
    } finally {
      setIsPosting(false);
    }
  };

  const pendingCount = unifiedRows.filter((r) => r._type === 'PENDING').length;
  const postedCount = unifiedRows.filter((r) => r._type === 'POSTED').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Package className="text-green-600" size={28} />
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Finished Goods Inward & Inventory</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Inward QC-passed batches into warehouse inventory and monitor posted finished goods history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-2 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-600 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Inward */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending FG Inward (QC Passed)</span>
            <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl border border-amber-100">
            <Clock size={24} />
          </div>
        </div>

        {/* Posted FG Batches */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Posted FG Batches</span>
            <h3 className="text-3xl font-black text-green-600 dark:text-green-400 mt-1">{postedCount}</h3>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-600 rounded-xl border border-green-100">
            <CheckCircle size={24} />
          </div>
        </div>

        {/* Total Inward Quantity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Posted Units</span>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
              {unifiedRows.filter((r) => r._type === 'POSTED').reduce((acc, r) => acc + r.acceptedQty, 0)}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl border border-blue-100">
            <Layers size={24} />
          </div>
        </div>

        {/* Inventory Sync Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Inventory Sync Status</span>
            <h3 className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mt-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span> PENDING EXT. SYNC
            </h3>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 rounded-xl border border-yellow-100">
            <Building size={24} />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by FG No, WO No, Product Name, or Batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl"
            >
              <option value="">All Queue Records</option>
              <option value="PENDING">Pending FG Inward (QC Passed)</option>
              <option value="POSTED">Posted Finished Goods</option>
            </select>

            {/* Storage Location Filter */}
            <input
              type="text"
              placeholder="Filter Storage Location..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl text-xs"
            />

            {/* Product Filter */}
            <input
              type="text"
              placeholder="Filter by Product..."
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* FINISHED GOODS TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/50">
          <h2 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
            Finished Goods Inward Queue & History ({filteredRows.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Package size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-bold text-sm">No Finished Goods records matching criteria.</p>
            <p className="text-xs text-gray-400 mt-1">QC Passed batches will appear here for inward posting.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Ref / FG No</th>
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Finished Product</th>
                  <th className="py-3 px-4">Batch No</th>
                  <th className="py-3 px-4">QC Accepted Qty</th>
                  <th className="py-3 px-4">MRP & UOM</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4">Status & Sync</th>
                  <th className="py-3 px-4">Posted Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                      {row.fgNumber || '—'}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.woNumber}
                    </td>

                    <td className="py-3 px-4 font-semibold">
                      <div>{row.productName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">SKU: {row.sku}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                      {row.batchNumber}
                    </td>

                    <td className="py-3 px-4 font-bold text-green-700 dark:text-green-400 font-mono">
                      {row.acceptedQty} {row.uom}
                    </td>

                    <td className="py-3 px-4 font-semibold">
                      ₹{row.mrp} / {row.uom}
                    </td>

                    <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        {row.storageLocation}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {row._type === 'PENDING' ? (
                        <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Ready for FG Inward
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
                            <CheckCircle size={12} /> Posted to FG
                          </span>
                          <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 ml-1">
                            Inventory Sync: PENDING
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                      {fmtDate(row.postedAt)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {row._type === 'PENDING' ? (
                          <button
                            onClick={() => handleOpenInwardModal(row)}
                            className="p-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <ArrowRight size={14} /> Post to FG
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedRow(row)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-slate-200 font-bold border border-gray-200 dark:border-gray-600 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={14} /> Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FINISHED GOODS INWARD MODAL */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900 sticky top-0 z-10">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-xs uppercase">
                  Finished Goods Inward — {selectedWO.woNumber}
                </h3>
                <p className="text-[10px] font-bold text-green-600">QC Status: QC_PASSED ✓</p>
              </div>
              <button onClick={() => setSelectedWO(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="p-5 space-y-4 text-xs">
              {/* Pre-populated Work Order Summary */}
              <div className="p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Product Name</span>
                    <p className="font-bold text-gray-800 dark:text-white">{selectedWO.product?.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">SKU</span>
                    <p className="font-mono font-bold text-gray-800 dark:text-white">{selectedWO.product?.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Packed Target</span>
                    <p className="font-mono font-bold text-gray-600">{selectedWO.actualProduced || selectedWO.requiredQty} units</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">QC Accepted Quantity</span>
                    <p className="font-mono font-bold text-green-600">{formAcceptedQty} {formUom}</p>
                  </div>
                </div>
              </div>

              {/* Form Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Batch Number *</label>
                  <input
                    type="text"
                    value={formBatchNo}
                    onChange={(e) => setFormBatchNo(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-mono font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Inward Quantity ({formUom}) *</label>
                  <input
                    type="number"
                    value={formAcceptedQty}
                    onChange={(e) => setFormAcceptedQty(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-mono font-bold text-xs text-green-600"
                    required
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    value={formUom}
                    onChange={(e) => setFormUom(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">MRP (₹ per unit)</label>
                  <input
                    type="number"
                    value={formMrp}
                    onChange={(e) => setFormMrp(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-mono font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Manufacturing Date</label>
                  <input
                    type="date"
                    value={formMfgDate}
                    onChange={(e) => setFormMfgDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-medium text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Storage / Shelf Location *</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-bold text-xs"
                  placeholder="e.g. Rack A-12, Zone B"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Destination Hub / Warehouse</label>
                <input
                  type="text"
                  value={formDestination}
                  onChange={(e) => setFormDestination(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-bold text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Inward Remarks</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-medium text-xs h-16 resize-none"
                  placeholder="Optional inward notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWO(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPosting}
                  className="px-6 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isPosting ? 'Posting Batch...' : 'Post to Finished Goods'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FINISHED GOODS DETAILS MODAL */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-xs uppercase">
                  Finished Goods Record — {selectedRow.fgNumber || selectedRow.woNumber}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">Work Order: {selectedRow.woNumber}</p>
              </div>
              <button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Product Name</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedRow.productName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Batch Number</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedRow.batchNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Inward Accepted Qty</span>
                  <p className="font-mono font-bold text-green-600">{selectedRow.acceptedQty} {selectedRow.uom}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">MRP</span>
                  <p className="font-bold text-gray-900 dark:text-white">₹{selectedRow.mrp}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Storage Location</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedRow.storageLocation}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Destination Hub</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedRow.destination}</p>
                </div>
                <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Inventory Sync Status</span>
                  <p className="font-bold text-yellow-600 dark:text-yellow-400">PENDING (Truthful status pending external sync API)</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedRow(null)}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingFinishedGoods;
