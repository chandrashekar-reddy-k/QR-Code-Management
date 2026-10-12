import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../../api/packing/axios';
import toast from 'react-hot-toast';
import {
  Filter,
  Download,
  GitCommit,
  CheckCircle,
  RefreshCw,
  UserCheck,
  DollarSign,
  AlertTriangle,
  Trash2,
  Info,
  Search,
  RotateCcw,
} from 'lucide-react';

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export const PackingReports: React.FC = () => {
  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);
  const [repackings, setRepackings] = useState<any[]>([]);
  const [qualityChecks, setQualityChecks] = useState<any[]>([]);
  const [loadingFG, setLoadingFG] = useState(true);
  const [loadingRP, setLoadingRP] = useState(true);
  const [loadingQC, setLoadingQC] = useState(true);

  useEffect(() => {
    apiClient
      .get('/workflows/finished-goods?limit=500')
      .then((res) => {
        setFinishedGoods(res.data.data?.data || res.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingFG(false));

    apiClient
      .get('/workflows/repacking?limit=500')
      .then((res) => {
        setRepackings(res.data.data?.data || res.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingRP(false));

    apiClient
      .get('/workflows/quality-checks?limit=500')
      .then((res) => {
        setQualityChecks(res.data.data?.data || res.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingQC(false));
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'packing';
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
    setCurrentPage(1);
  };

  // Filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  const resetFilters = () => {
    setFilterStatus('All');
    setSearch('');
    setCurrentPage(1);
  };

  // Derived filter options from real data
  const productOptions = useMemo(() => {
    const names = new Set<string>();
    finishedGoods.forEach((fg) => {
      if (fg.product?.name) names.add(fg.product.name);
    });
    qualityChecks.forEach((qc) => {
      if (qc.workOrder?.product?.name) names.add(qc.workOrder.product.name);
    });
    return Array.from(names).sort();
  }, [finishedGoods, qualityChecks]);

  const batchOptions = useMemo(() => {
    const batches = new Set<string>();
    finishedGoods.forEach((fg) => {
      if (fg.batchNumber) batches.add(fg.batchNumber);
    });
    return Array.from(batches).sort();
  }, [finishedGoods]);

  // Filtered datasets
  const filteredFG = useMemo(
    () =>
      finishedGoods.filter((fg) => {
        if (filterStatus !== 'All' && fg.status !== filterStatus) return false;
        if (search) {
          const s = search.toLowerCase();
          const match = (
            fg.product?.name?.toLowerCase().includes(s) ||
            fg.batchNumber?.toLowerCase().includes(s) ||
            fg.workOrder?.woNumber?.toLowerCase().includes(s) ||
            fg.id?.toLowerCase().includes(s)
          );
          if (!match) return false;
        }
        return true;
      }),
    [finishedGoods, filterStatus, search]
  );

  const filteredRP = useMemo(
    () =>
      repackings.filter((rp) => {
        if (filterStatus !== 'All' && rp.status !== filterStatus) return false;
        if (search) {
          const s = search.toLowerCase();
          const match = (
            rp.sourceWorkOrder?.product?.name?.toLowerCase().includes(s) ||
            rp.batchNumber?.toLowerCase().includes(s) ||
            rp.repackingNumber?.toLowerCase().includes(s) ||
            rp.id?.toLowerCase().includes(s)
          );
          if (!match) return false;
        }
        return true;
      }),
    [repackings, filterStatus, search]
  );

  const rejectedQCs = useMemo(
    () =>
      qualityChecks.filter((qc) => {
        if (!['REJECT', 'REWORK', 'DISCARD'].includes(qc.result)) return false;
        if (filterStatus !== 'All' && qc.result !== filterStatus) return false;
        if (search) {
          const s = search.toLowerCase();
          const match = (
            qc.workOrder?.product?.name?.toLowerCase().includes(s) ||
            qc.qcNumber?.toLowerCase().includes(s) ||
            qc.workOrder?.woNumber?.toLowerCase().includes(s) ||
            qc.id?.toLowerCase().includes(s)
          );
          if (!match) return false;
        }
        return true;
      }),
    [qualityChecks, filterStatus, search]
  );

  const reportsList = [
    { id: 'packing', label: 'Packing Report', icon: CheckCircle },
    { id: 'repacking', label: 'Repacking Report', icon: RefreshCw },
    { id: 'employee', label: 'Employee Productivity', icon: UserCheck },
    { id: 'traceability', label: 'Batch Traceability', icon: GitCommit },
    { id: 'cost', label: 'Cost Report', icon: DollarSign },
    { id: 'rejected', label: 'Rejected Report', icon: AlertTriangle },
    { id: 'waste', label: 'Waste Report', icon: Trash2 },
  ];

  const handleExport = (type: 'Excel' | 'PDF') => {
    toast.success(`Exporting current report (${activeTab.toUpperCase()}) as ${type}. Feature coming soon.`);
  };

  const EmptyRow = ({ cols, message = 'No records found.' }: { cols: number; message?: string }) => (
    <tr>
      <td colSpan={cols} className="p-6 text-center text-slate-400 dark:text-gray-500 text-xs">
        {message}
      </td>
    </tr>
  );

  const LoadingRow = ({ cols }: { cols: number }) => (
    <tr>
      <td colSpan={cols} className="p-6 text-center text-slate-400 dark:text-gray-500 text-xs animate-pulse">
        Loading...
      </td>
    </tr>
  );

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-xs text-slate-500 dark:text-gray-400">
        <div>
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} entries
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded disabled:opacity-50 cursor-pointer"
          >
            Prev
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    switch (activeTab) {
      case 'packing':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Packing Production Log — Finished Goods Posted
              </h3>
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {filteredFG.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3 whitespace-nowrap">FG Date</th>
                    <th className="p-3 whitespace-nowrap">FG No</th>
                    <th className="p-3 whitespace-nowrap">Work Order</th>
                    <th className="p-3 whitespace-nowrap">Product Name</th>
                    <th className="p-3 whitespace-nowrap">Batch Number</th>
                    <th className="p-3 text-center whitespace-nowrap">Posted Qty</th>
                    <th className="p-3 whitespace-nowrap">Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                  {loadingFG ? (
                    <LoadingRow cols={7} />
                  ) : filteredFG.length === 0 ? (
                    <EmptyRow cols={7} />
                  ) : (
                    filteredFG
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((fg) => (
                        <tr key={fg.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40">
                          <td className="p-3 text-slate-500 dark:text-gray-400 whitespace-nowrap">
                            {fmt(fg.createdAt)}
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">
                            {fg.fgNumber || '—'}
                          </td>
                          <td className="p-3 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {fg.workOrder?.woNumber || '—'}
                          </td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                            {fg.product?.name || '—'}
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-gray-300 whitespace-nowrap">
                            {fg.batchNumber || '—'}
                          </td>
                          <td className="p-3 text-center font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {fg.postedQty}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 text-[10px] font-bold">
                              {fg.destination}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
              {renderPagination(filteredFG.length)}
            </div>
          </div>
        );

      case 'repacking':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Repacking Recovery Summary
              </h3>
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {filteredRP.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3 whitespace-nowrap">RP No</th>
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Product</th>
                    <th className="p-3 whitespace-nowrap">Type</th>
                    <th className="p-3 text-center whitespace-nowrap">Recovered Qty</th>
                    <th className="p-3 text-center whitespace-nowrap">Waste Qty</th>
                    <th className="p-3 whitespace-nowrap">New Batch No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                  {loadingRP ? (
                    <LoadingRow cols={7} />
                  ) : filteredRP.length === 0 ? (
                    <EmptyRow cols={7} />
                  ) : (
                    filteredRP
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((rp) => (
                        <tr key={rp.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40">
                          <td className="p-3 font-mono font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">
                            {rp.rpNumber}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-gray-400 whitespace-nowrap">
                            {fmt(rp.createdAt)}
                          </td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                            {rp.sourceWorkOrder?.product?.name || '—'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-gray-300 whitespace-nowrap">
                            {rp.repackType}
                          </td>
                          <td className="p-3 text-center font-bold text-green-700 dark:text-green-400 whitespace-nowrap">
                            +{rp.recoverableQty}
                          </td>
                          <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            -{rp.wasteQty}
                          </td>
                          <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                            {rp.newBatchNumber || '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
              {renderPagination(filteredRP.length)}
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                QC Rejections Log
              </h3>
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {rejectedQCs.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3 whitespace-nowrap">QC No</th>
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Product</th>
                    <th className="p-3 whitespace-nowrap">Work Order</th>
                    <th className="p-3 text-center whitespace-nowrap">Inspected Qty</th>
                    <th className="p-3 whitespace-nowrap">Result</th>
                    <th className="p-3 whitespace-nowrap">Failure Reason</th>
                    <th className="p-3 whitespace-nowrap">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                  {loadingQC ? (
                    <LoadingRow cols={8} />
                  ) : rejectedQCs.length === 0 ? (
                    <EmptyRow cols={8} message="No rejection records found." />
                  ) : (
                    rejectedQCs
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((qc) => (
                        <tr key={qc.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40">
                          <td className="p-3 font-mono font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">
                            {qc.qcNumber}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-gray-400 whitespace-nowrap">
                            {fmt(qc.createdAt)}
                          </td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                            {qc.workOrder?.product?.name || '—'}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            {qc.workOrder?.woNumber || '—'}
                          </td>
                          <td className="p-3 text-center font-bold whitespace-nowrap">
                            {qc.checkedQty}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                qc.result === 'REJECT'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                                  : qc.result === 'REWORK'
                                  ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {qc.result}
                            </span>
                          </td>
                          <td
                            className="p-3 text-slate-600 dark:text-gray-300 max-w-[150px] truncate whitespace-nowrap"
                            title={qc.failureReason || '—'}
                          >
                            {qc.failureReason || '—'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-gray-300 whitespace-nowrap">
                            {typeof qc.inspector === 'string' ? qc.inspector : qc.inspector?.name || '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
              {renderPagination(rejectedQCs.length)}
            </div>
          </div>
        );

      case 'traceability':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-gray-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Batch Genealogy &amp; Traceability Drill-down
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">Trace Batch:</span>
                <input
                  type="text"
                  placeholder="Enter Batch No..."
                  className="px-2 py-1 border border-slate-200 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-1 focus:ring-green-600 outline-none"
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-5 font-mono text-xs space-y-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold">
                <GitCommit size={16} />
                <span>Genealogy Path for: {filterBatch || 'Enter a batch number above'}</span>
              </div>
              {filterBatch ? (
                (() => {
                  const fg = finishedGoods.find((f) => f.batchNumber === filterBatch);
                  const rp = repackings.find((r) => r.newBatchNumber === filterBatch);
                  const qc = qualityChecks.find((q) => q.workOrder?.batchNumber === filterBatch);
                  if (!fg && !rp && !qc)
                    return (
                      <div className="text-slate-400 dark:text-gray-500 py-4">
                        No matching batch found in the system.
                      </div>
                    );
                  return (
                    <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800 ml-2">
                      {fg && (
                        <div className="space-y-1">
                          <div className="text-green-600 dark:text-green-400 font-bold">
                            ✓ Finished Goods Entry
                          </div>
                          <div className="text-slate-600 dark:text-gray-300">
                            FG No: {fg.fgNumber} | Posted: {fg.postedQty} units | Destination: {fg.destination}
                          </div>
                        </div>
                      )}
                      {qc && (
                        <div className="space-y-1">
                          <div className="text-blue-600 dark:text-blue-400 font-bold">
                            ⚙ Quality Check Record
                          </div>
                          <div className="text-slate-600 dark:text-gray-300">
                            QC No: {qc.qcNumber} | Result: {qc.result} | Inspector:{' '}
                            {typeof qc.inspector === 'string' ? qc.inspector : qc.inspector?.name}
                          </div>
                        </div>
                      )}
                      {rp && (
                        <div className="space-y-1">
                          <div className="text-orange-600 dark:text-orange-400 font-bold">
                            ↺ Repacking Origin
                          </div>
                          <div className="text-slate-600 dark:text-gray-300">
                            RP No: {rp.rpNumber} | Recovered: {rp.recoverableQty} | Waste: {rp.wasteQty}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-400 dark:text-gray-500 py-4">
                  Enter a batch number above to trace its full history.
                </div>
              )}
            </div>
          </div>
        );

      case 'cost':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Packing Cost Analysis — from Finished Goods Records
              </h3>
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {filteredFG.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3 whitespace-nowrap">FG Date</th>
                    <th className="p-3 whitespace-nowrap">Product Name</th>
                    <th className="p-3 whitespace-nowrap">Batch Number</th>
                    <th className="p-3 text-center whitespace-nowrap">Posted Qty</th>
                    <th className="p-3 whitespace-nowrap">Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                  {loadingFG ? (
                    <LoadingRow cols={5} />
                  ) : filteredFG.length === 0 ? (
                    <EmptyRow
                      cols={5}
                      message="No cost records found. Post batches to Finished Goods first."
                    />
                  ) : (
                    filteredFG
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((fg) => (
                        <tr key={fg.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40">
                          <td className="p-3 text-slate-500 dark:text-gray-400 whitespace-nowrap">
                            {fmt(fg.createdAt)}
                          </td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                            {fg.product?.name || '—'}
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-gray-300 whitespace-nowrap">
                            {fg.batchNumber || '—'}
                          </td>
                          <td className="p-3 text-center font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {fg.postedQty}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 text-[10px] font-bold">
                              {fg.destination}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
              {renderPagination(filteredFG.length)}
            </div>
          </div>
        );

      case 'employee':
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Employee Productivity — QC Inspectors
            </h3>
            {(() => {
              const byInspector: Record<string, { name: string; count: number; passed: number; failed: number }> = {};
              qualityChecks.forEach((qc) => {
                const name = typeof qc.inspector === 'string' ? qc.inspector : qc.inspector?.name || 'Unknown';
                if (!byInspector[name]) byInspector[name] = { name, count: 0, passed: 0, failed: 0 };
                byInspector[name].count++;
                if (['PASS', 'PARTIAL_PASS'].includes(qc.result)) byInspector[name].passed++;
                else byInspector[name].failed++;
              });
              const rows = Object.values(byInspector);
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                        <th className="p-3 whitespace-nowrap">Inspector Name</th>
                        <th className="p-3 text-center whitespace-nowrap">Total QC Sessions</th>
                        <th className="p-3 text-center whitespace-nowrap">Passed</th>
                        <th className="p-3 text-center whitespace-nowrap">Failed / Rework</th>
                        <th className="p-3 text-center whitespace-nowrap">Pass Rate %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                      {loadingQC ? (
                        <LoadingRow cols={5} />
                      ) : rows.length === 0 ? (
                        <EmptyRow cols={5} />
                      ) : (
                        rows
                          .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                          .map((row) => (
                            <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40">
                              <td className="p-3 font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                                {row.name}
                              </td>
                              <td className="p-3 text-center font-bold whitespace-nowrap">{row.count}</td>
                              <td className="p-3 text-center font-bold text-green-700 dark:text-green-400 whitespace-nowrap">
                                {row.passed}
                              </td>
                              <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                {row.failed}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    row.count > 0 && row.passed / row.count >= 0.8
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  }`}
                                >
                                  {row.count > 0 ? Math.round((row.passed / row.count) * 100) : 0}%
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                  {renderPagination(rows.length)}
                </div>
              );
            })()}
          </div>
        );

      case 'waste':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Spillage &amp; Scrap Waste Analysis — from Repacking Logs
              </h3>
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {filteredRP.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3 whitespace-nowrap">RP No</th>
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 whitespace-nowrap">Product</th>
                    <th className="p-3 whitespace-nowrap">Repack Type</th>
                    <th className="p-3 text-center whitespace-nowrap">Recovered</th>
                    <th className="p-3 text-center whitespace-nowrap">Waste Qty</th>
                    <th className="p-3 text-center whitespace-nowrap">Waste Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                  {loadingRP ? (
                    <LoadingRow cols={7} />
                  ) : filteredRP.length === 0 ? (
                    <EmptyRow cols={7} message="No waste records. Repacking not yet logged." />
                  ) : (
                    filteredRP
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((rp) => {
                        const total = (rp.recoverableQty || 0) + (rp.wasteQty || 0);
                        const wasteRate = total > 0 ? Math.round((rp.wasteQty / total) * 100) : 0;
                        return (
                          <tr key={rp.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40">
                            <td className="p-3 font-mono font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">
                              {rp.rpNumber}
                            </td>
                            <td className="p-3 text-slate-500 dark:text-gray-400 whitespace-nowrap">
                              {fmt(rp.createdAt)}
                            </td>
                            <td className="p-3 font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                              {rp.sourceWorkOrder?.product?.name || '—'}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-gray-300 whitespace-nowrap">
                              {rp.repackType}
                            </td>
                            <td className="p-3 text-center font-bold text-green-700 dark:text-green-400 whitespace-nowrap">
                              {rp.recoverableQty}
                            </td>
                            <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              {rp.wasteQty}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  wasteRate > 20
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                }`}
                              >
                                {wasteRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
              {renderPagination(filteredRP.length)}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 text-center text-slate-400 dark:text-gray-500">
            <Info size={24} className="mx-auto text-slate-300 dark:text-gray-600 mb-2" />
            <p className="text-xs font-semibold">Select a report from the left panel.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 text-left pb-10 w-full">
      {/* Page Title */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Packing & Operations Reports
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
          Comprehensive production, repacking, cost, and traceability logs.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        {/* Filter controls */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs h-10 overflow-x-auto w-full xl:w-auto">
          <div className="px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
            <Filter size={16} />
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[120px] shrink-0"
          >
            <option value="All" className="dark:bg-gray-800">All Status</option>
            <option value="COMPLETED" className="dark:bg-gray-800">COMPLETED</option>
            <option value="APPROVED" className="dark:bg-gray-800">APPROVED</option>
            <option value="QC_PENDING" className="dark:bg-gray-800">QC_PENDING</option>
            <option value="PACKING_STARTED" className="dark:bg-gray-800">PACKING_STARTED</option>
          </select>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

          <button
            onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent cursor-pointer shrink-0"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>

        {/* Search bar & Exports */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-stretch">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] transition-all shadow-xs"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 h-10">
            <button
              onClick={() => handleExport('Excel')}
              className="flex items-center justify-center gap-1.5 bg-[#00891D] hover:bg-[#006b17] text-white px-4 h-full rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex-1"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={() => handleExport('PDF')}
              className="flex items-center justify-center gap-1.5 bg-[#0F172A] hover:bg-slate-900 text-white px-4 h-full rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex-1"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 shadow-xs space-y-2 h-fit">
          <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider px-3 pb-3 border-b border-slate-100 dark:border-gray-700 mb-2">
            AVAILABLE REPORTS
          </h3>
          <div className="space-y-1.5">
            {reportsList.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800'
                      : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon
                    size={15}
                    className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-gray-500'}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs min-h-[400px]">
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
};

export default PackingReports;
