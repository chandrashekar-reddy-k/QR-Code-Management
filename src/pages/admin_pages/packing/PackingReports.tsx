import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../../api/packing/axios';
import toast from 'react-hot-toast';
import {
  Filter, Download, GitCommit,
  RefreshCw, UserCheck, AlertTriangle,
  Trash2, Info, BarChart2, Tag, Package, RotateCcw,
  ShieldCheck
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtFull = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

// Date range helpers
const todayStr = () => new Date().toISOString().split('T')[0];
const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; };
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

const isInRange = (dateStr: string | undefined, from: string, to: string): boolean => {
  if (!dateStr) return false;
  const d = dateStr.split('T')[0];
  return d >= from && d <= to;
};

// ─── Component ────────────────────────────────────────────────────────────────
export const PackingReports: React.FC = () => {
  const [workOrders,     setWorkOrders]     = useState<any[]>([]);
  const [finishedGoods,  setFinishedGoods]  = useState<any[]>([]);
  const [repackings,     setRepackings]     = useState<any[]>([]);
  const [qualityChecks,  setQualityChecks]  = useState<any[]>([]);
  const [printJobs,      setPrintJobs]      = useState<any[]>([]);

  const [loadingWO, setLoadingWO]   = useState(true);
  const [loadingFG, setLoadingFG]   = useState(true);
  const [loadingRP, setLoadingRP]   = useState(true);
  const [loadingQC, setLoadingQC]   = useState(true);
  const [loadingBR, setLoadingBR]   = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  // Map old dashboard tab aliases to new tab IDs
  const rawTab = searchParams.get('tab') || 'production';
  const TAB_ALIASES: Record<string, string> = {
    packing: 'production',
    conversion: 'production',
    consumption: 'production',
    employee: 'productivity',
  };
  const activeTab = TAB_ALIASES[rawTab] ?? rawTab;

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ── Date preset ────────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(todayStr());

  const applyPreset = (preset: typeof datePreset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    if (preset === 'today')  { setDateFrom(todayStr()); setDateTo(todayStr()); }
    if (preset === 'week')   { setDateFrom(weekStart()); setDateTo(todayStr()); }
    if (preset === 'month')  { setDateFrom(monthStart()); setDateTo(todayStr()); }
  };

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterProduct,   setFilterProduct]   = useState('All');
  const [filterBatch,     setFilterBatch]     = useState('');
  const [filterStatus,    setFilterStatus]    = useState('All');
  const [filterOperator,  setFilterOperator]  = useState('All');
  const [filterInspector, setFilterInspector] = useState('All');
  const [filterWO,        setFilterWO]        = useState('All');

  const handleTabChange = (tabId: string) => { setSearchParams({ tab: tabId }); setCurrentPage(1); };

  const resetFilters = () => {
    setFilterProduct('All'); setFilterBatch(''); setFilterStatus('All');
    setFilterOperator('All'); setFilterInspector('All'); setFilterWO('All');
    setCurrentPage(1);
  };

  // ── Data Fetch ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoadingWO(true); setLoadingFG(true); setLoadingRP(true);
    setLoadingQC(true); setLoadingBR(true);

    const safe = async (fn: () => Promise<any[]>, setter: (d: any[]) => void, done: (v: boolean) => void) => {
      try { setter(await fn()); } catch { /* silent */ } finally { done(false); }
    };

    const fetchList = async (url: string): Promise<any[]> => {
      const res = await apiClient.get(url);
      const d = res.data.data;
      if (d && Array.isArray(d.data)) return d.data;
      if (Array.isArray(d)) return d;
      return [];
    };

    await Promise.all([
      safe(() => fetchList('/work-orders?limit=500&include=qualityChecks,operator,supervisor,product'), setWorkOrders, setLoadingWO),
      safe(() => fetchList('/workflows/finished-goods?limit=500'), setFinishedGoods, setLoadingFG),
      safe(() => fetchList('/workflows/repacking?limit=500'),      setRepackings,    setLoadingRP),
      safe(() => fetchList('/workflows/quality-checks?limit=500'), setQualityChecks, setLoadingQC),
      safe(async () => {
        try { return await fetchList('/barcodes/history?limit=500'); } catch { return []; }
      }, setPrintJobs, setLoadingBR)
    ]);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived filter options from real data ──────────────────────────────────
  const productOptions = useMemo(() => {
    const s = new Set<string>();
    workOrders.forEach(w => { if (w.product?.name) s.add(w.product.name); });
    finishedGoods.forEach(f => { if (f.product?.name) s.add(f.product.name); });
    return Array.from(s).sort();
  }, [workOrders, finishedGoods]);

  const woOptions = useMemo(() => {
    const s = new Set<string>();
    workOrders.forEach(w => { if (w.woNumber) s.add(w.woNumber); });
    return Array.from(s).sort();
  }, [workOrders]);

  const operatorOptions = useMemo(() => {
    const s = new Set<string>();
    workOrders.forEach(w => { if (w.operator?.name) s.add(w.operator.name); });
    return Array.from(s).sort();
  }, [workOrders]);

  const inspectorOptions = useMemo(() => {
    const s = new Set<string>();
    qualityChecks.forEach(q => {
      const name = typeof q.inspector === 'string' ? q.inspector : q.inspector?.name;
      if (name) s.add(name);
    });
    return Array.from(s).sort();
  }, [qualityChecks]);

  // ── Range-filtered datasets ────────────────────────────────────────────────
  const filteredWOs = useMemo(() => workOrders.filter(w => {
    if (!isInRange(w.createdAt, dateFrom, dateTo)) return false;
    if (filterProduct !== 'All' && w.product?.name !== filterProduct) return false;
    if (filterStatus  !== 'All' && w.status !== filterStatus) return false;
    if (filterOperator !== 'All' && w.operator?.name !== filterOperator) return false;
    if (filterWO !== 'All' && w.woNumber !== filterWO) return false;
    return true;
  }), [workOrders, dateFrom, dateTo, filterProduct, filterStatus, filterOperator, filterWO]);

  const filteredFG = useMemo(() => finishedGoods.filter(f => {
    if (!isInRange(f.createdAt, dateFrom, dateTo)) return false;
    if (filterProduct !== 'All' && f.product?.name !== filterProduct) return false;
    if (filterBatch && !f.batchNumber?.includes(filterBatch)) return false;
    return true;
  }), [finishedGoods, dateFrom, dateTo, filterProduct, filterBatch]);

  const filteredRP = useMemo(() => repackings.filter(r => {
    if (!isInRange(r.createdAt, dateFrom, dateTo)) return false;
    if (filterProduct !== 'All' && r.sourceWorkOrder?.product?.name !== filterProduct) return false;
    return true;
  }), [repackings, dateFrom, dateTo, filterProduct]);

  const filteredQC = useMemo(() => qualityChecks.filter(q => {
    if (!isInRange(q.createdAt, dateFrom, dateTo)) return false;
    if (filterProduct !== 'All' && q.workOrder?.product?.name !== filterProduct) return false;
    const inspectorName = typeof q.inspector === 'string' ? q.inspector : q.inspector?.name || '';
    if (filterInspector !== 'All' && inspectorName !== filterInspector) return false;
    if (filterWO !== 'All' && q.workOrder?.woNumber !== filterWO) return false;
    return true;
  }), [qualityChecks, dateFrom, dateTo, filterProduct, filterInspector, filterWO]);

  const filteredPrintJobs = useMemo(() => printJobs.filter(j => {
    if (!isInRange(j.createdAt ?? j.printedAt, dateFrom, dateTo)) return false;
    if (filterProduct !== 'All' && j.workOrder?.product?.name !== filterProduct) return false;
    return true;
  }), [printJobs, dateFrom, dateTo, filterProduct]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const productionKPIs = useMemo(() => {
    const total        = filteredWOs.length;
    const completed    = filteredWOs.filter(w => w.status === 'COMPLETED').length;
    const plannedQty   = filteredWOs.reduce((s, w) => s + (w.requiredQty || 0), 0);
    const packedQty    = filteredWOs.reduce((s, w) => s + (w.actualProduced || 0), 0);
    const fgQty        = filteredFG.reduce((s, f) => s + (f.postedQty || 0), 0);
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, plannedQty, packedQty, fgQty, completionPct };
  }, [filteredWOs, filteredFG]);

  const qcKPIs = useMemo(() => {
    const total      = filteredQC.length;
    const passed     = filteredQC.filter(q => ['PASS', 'PARTIAL_PASS'].includes(q.result)).length;
    const failed     = filteredQC.filter(q => ['REJECT', 'REWORK', 'DISCARD'].includes(q.result)).length;
    const onHold     = filteredQC.filter(q => q.result === 'ON_HOLD').length;
    const passRate   = total > 0 ? Math.round((passed / total) * 100) : 0;
    const reworkRate = total > 0 ? Math.round((filteredQC.filter(q => q.result === 'REWORK').length / total) * 100) : 0;
    return { total, passed, failed, onHold, passRate, reworkRate };
  }, [filteredQC]);

  const repackingKPIs = useMemo(() => {
    const total           = filteredRP.length;
    const repackedQty     = filteredRP.reduce((s, r) => s + (r.recoverableQty || 0), 0);
    const wastageQty      = filteredRP.reduce((s, r) => s + (r.wasteQty || 0), 0);
    const totalFailed     = filteredRP.reduce((s, r) => s + (r.recoverableQty || 0) + (r.wasteQty || 0), 0);
    const recoveryPct     = totalFailed > 0 ? Math.round((repackedQty / totalFailed) * 100) : 0;
    const relabelRequired = filteredRP.filter(r => r.requiresRelabeling).length;
    const returnedToQC    = filteredRP.filter(r => r.status === 'REPACKING_COMPLETED').length;
    return { total, repackedQty, wastageQty, recoveryPct, relabelRequired, returnedToQC };
  }, [filteredRP]);

  const wastageKPIs = useMemo(() => {
    // Packing rejected qty: from WOs actualRejected (before repacking stage)
    const packingRejected = filteredWOs.reduce((s, w) => {
      // Only count WOs that did NOT go to repacking to avoid double-count
      const wasRepacked = repackings.some(r => r.sourceWoId === w.id);
      return wasRepacked ? s : s + (w.actualRejected || 0);
    }, 0);
    // Repacking wastage
    const repackingWastage = filteredRP.reduce((s, r) => s + (r.wasteQty || 0), 0);
    const totalPacked      = filteredWOs.reduce((s, w) => s + (w.actualProduced || 0), 0);
    const overallWastage   = packingRejected + repackingWastage;
    const totalProduced    = totalPacked + overallWastage;
    const wastagePct       = totalProduced > 0 ? Math.round((overallWastage / totalProduced) * 100) : 0;
    return { packingRejected, repackingWastage, overallWastage, wastagePct };
  }, [filteredWOs, filteredRP, repackings]);

  const fgKPIs = useMemo(() => {
    const total    = filteredFG.reduce((s, f) => s + (f.postedQty || 0), 0);
    const today    = filteredFG.filter(f => isInRange(f.createdAt, todayStr(), todayStr())).reduce((s, f) => s + (f.postedQty || 0), 0);
    const pending  = filteredFG.filter(f => {
      const cp = f.costPayload;
      return cp && (cp.inventoryStatus === 'PENDING' || !cp.inventoryStatus);
    }).length;
    return { total, today, pending };
  }, [filteredFG]);

  const barcodeKPIs = useMemo(() => {
    const initial  = filteredPrintJobs.filter(j => j.jobType === 'INITIAL' || j.type === 'INITIAL').length;
    const reprints = filteredPrintJobs.filter(j => j.jobType === 'REPRINT'  || j.type === 'REPRINT').length;
    const applied  = filteredPrintJobs.filter(j => j.status === 'COMPLETED').length;
    return { initial, reprints, applied, total: filteredPrintJobs.length };
  }, [filteredPrintJobs]);

  // ── Report menu ──────────────────────────────────────────────────────────
  const reportsList = [
    { id: 'production',   label: 'Production Report',      icon: BarChart2 },
    { id: 'productivity', label: 'Packing Productivity',   icon: UserCheck },
    { id: 'qc',           label: 'QC Report',              icon: ShieldCheck },
    { id: 'repacking',    label: 'Repacking Report',       icon: RotateCcw },
    { id: 'waste',        label: 'Wastage Metrics',        icon: Trash2 },
    { id: 'fg',           label: 'Finished Goods',         icon: Package },
    { id: 'barcode',      label: 'Barcode & Labels',       icon: Tag },
    { id: 'traceability', label: 'Batch Traceability',     icon: GitCommit },
    { id: 'rejected',     label: 'QC Rejections',          icon: AlertTriangle },
  ];

  const handleExport = (type: 'Excel' | 'PDF') => {
    toast.success(`Export as ${type} — feature in pipeline. Use browser print for PDF now.`);
  };

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginate = <T,>(arr: T[]) =>
    arr.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const EmptyRow = ({ cols, msg = 'No records found.' }: { cols: number; msg?: string }) => (
    <tr><td colSpan={cols} className="p-6 text-center text-slate-400 text-xs">{msg}</td></tr>
  );
  const LoadingRow = ({ cols }: { cols: number }) => (
    <tr><td colSpan={cols} className="p-6 text-center text-slate-400 text-xs animate-pulse">Loading data from backend…</td></tr>
  );
  const Pagination = ({ total }: { total: number }) => {
    const pages = Math.ceil(total / ITEMS_PER_PAGE);
    if (pages <= 1) return null;
    return (
      <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
        <div>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total}</div>
        <div className="flex gap-1">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-2 py-1 bg-white border border-slate-200 rounded disabled:opacity-40 cursor-pointer">Prev</button>
          <button onClick={() => setCurrentPage(p => Math.min(pages, p + 1))} disabled={currentPage === pages}
            className="px-2 py-1 bg-white border border-slate-200 rounded disabled:opacity-40 cursor-pointer">Next</button>
        </div>
      </div>
    );
  };

  const KpiCard = ({ label, value, sub, color = 'green' }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className={`bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-100 dark:border-${color}-900 rounded-xl p-4`}>
      <div className={`text-2xl font-black text-${color}-700 dark:text-${color}-400`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );

  // ── Report content ────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {

      // ── 1. PRODUCTION ───────────────────────────────────────────────────
      case 'production':
        return (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Production Report</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Total Work Orders"    value={productionKPIs.total}         />
              <KpiCard label="Completed WOs"        value={productionKPIs.completed}      />
              <KpiCard label="Completion %"         value={`${productionKPIs.completionPct}%`} color="blue" />
              <KpiCard label="Planned Qty"          value={productionKPIs.plannedQty}    color="slate" />
              <KpiCard label="Total Packed Qty"     value={productionKPIs.packedQty}     color="indigo" />
              <KpiCard label="FG Posted Qty"        value={productionKPIs.fgQty}         color="emerald" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">WO No</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Planned Qty</th>
                    <th className="p-3 text-center">Packed Qty</th>
                    <th className="p-3 text-center">Rejected</th>
                    <th className="p-3">Started</th>
                    <th className="p-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingWO ? <LoadingRow cols={8} /> : filteredWOs.length === 0 ? <EmptyRow cols={8} /> :
                    paginate(filteredWOs).map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                        <td className="p-3 font-mono font-semibold text-slate-700 dark:text-slate-300">{w.woNumber}</td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{w.product?.name || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            w.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' :
                            w.status === 'QC_FAILED' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>{w.status}</span>
                        </td>
                        <td className="p-3 text-center font-mono">{w.requiredQty}</td>
                        <td className="p-3 text-center font-mono font-bold text-green-700">{w.actualProduced ?? '—'}</td>
                        <td className="p-3 text-center font-mono text-rose-600">{w.actualRejected ?? '—'}</td>
                        <td className="p-3 text-slate-500">{fmt(w.startedAt ?? w.createdAt)}</td>
                        <td className="p-3 text-slate-600">{w.operator?.name || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <Pagination total={filteredWOs.length} />
            </div>
          </div>
        );

      // ── 2. PRODUCTIVITY ─────────────────────────────────────────────────
      case 'productivity': {
        const byOperator: Record<string, { name: string; assigned: number; completed: number; packedQty: number; rejectedQty: number }> = {};
        filteredWOs.forEach(w => {
          const name = w.operator?.name || 'Unassigned';
          if (!byOperator[name]) byOperator[name] = { name, assigned: 0, completed: 0, packedQty: 0, rejectedQty: 0 };
          byOperator[name].assigned++;
          if (w.status === 'COMPLETED') byOperator[name].completed++;
          byOperator[name].packedQty   += w.actualProduced   || 0;
          byOperator[name].rejectedQty += w.actualRejected   || 0;
        });
        const rows = Object.values(byOperator);
        return (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Packing Productivity — Operator Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">Operator</th>
                    <th className="p-3 text-center">Assigned</th>
                    <th className="p-3 text-center">Completed</th>
                    <th className="p-3 text-center">Packed Qty</th>
                    <th className="p-3 text-center">Rejected Qty</th>
                    <th className="p-3 text-center">Productivity %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingWO ? <LoadingRow cols={6} /> : rows.length === 0 ? <EmptyRow cols={6} /> :
                    paginate(rows).map(row => {
                      const pct = row.assigned > 0 ? Math.round((row.completed / row.assigned) * 100) : 0;
                      return (
                        <tr key={row.name} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{row.name}</td>
                          <td className="p-3 text-center font-bold">{row.assigned}</td>
                          <td className="p-3 text-center font-bold text-green-700">{row.completed}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-700">{row.packedQty}</td>
                          <td className="p-3 text-center font-mono font-bold text-rose-600">{row.rejectedQty}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${pct >= 80 ? 'bg-green-100 text-green-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <Pagination total={rows.length} />
            </div>
          </div>
        );
      }

      // ── 3. QC REPORT ────────────────────────────────────────────────────
      case 'qc':
        return (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Quality Check Report</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Total Inspections" value={qcKPIs.total}          />
              <KpiCard label="Passed"            value={qcKPIs.passed}         color="green" />
              <KpiCard label="Failed"            value={qcKPIs.failed}         color="red" />
              <KpiCard label="On Hold"           value={qcKPIs.onHold}         color="amber" />
              <KpiCard label="Pass Rate"         value={`${qcKPIs.passRate}%`}  color="blue" />
              <KpiCard label="Rework Rate"       value={`${qcKPIs.reworkRate}%`} color="orange" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">QC No</th>
                    <th className="p-3">Work Order</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Inspector</th>
                    <th className="p-3">Result</th>
                    <th className="p-3 text-center">Checked Qty</th>
                    <th className="p-3">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingQC ? <LoadingRow cols={8} /> : filteredQC.length === 0 ? <EmptyRow cols={8} /> :
                    paginate(filteredQC).map(qc => (
                      <tr key={qc.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                        <td className="p-3 font-mono font-semibold text-slate-500">{qc.qcNumber}</td>
                        <td className="p-3 font-mono">{qc.workOrder?.woNumber || '—'}</td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{qc.workOrder?.product?.name || '—'}</td>
                        <td className="p-3 font-mono text-slate-500">{qc.workOrder?.batchNumber || '—'}</td>
                        <td className="p-3">{typeof qc.inspector === 'string' ? qc.inspector : qc.inspector?.name || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            ['PASS','PARTIAL_PASS'].includes(qc.result) ? 'bg-green-100 text-green-800 border-green-200' :
                            ['REJECT','REWORK','DISCARD'].includes(qc.result) ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>{qc.result}</span>
                        </td>
                        <td className="p-3 text-center font-bold">{qc.checkedQty}</td>
                        <td className="p-3 text-slate-500">{fmt(qc.updatedAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <Pagination total={filteredQC.length} />
            </div>
          </div>
        );

      // ── 4. REPACKING ────────────────────────────────────────────────────
      case 'repacking':
        return (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Repacking Report</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Total Repacking Jobs" value={repackingKPIs.total}           />
              <KpiCard label="Repacked Qty"          value={repackingKPIs.repackedQty}    color="green" />
              <KpiCard label="Wastage Qty"           value={repackingKPIs.wastageQty}     color="red" />
              <KpiCard label="Recovery %"            value={`${repackingKPIs.recoveryPct}%`} color="blue" />
              <KpiCard label="Relabel Required"      value={repackingKPIs.relabelRequired} color="orange" />
              <KpiCard label="Returned to QC"        value={repackingKPIs.returnedToQC}   color="emerald" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">RP No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-center">Recovered Qty</th>
                    <th className="p-3 text-center">Waste Qty</th>
                    <th className="p-3 text-center">Recovery %</th>
                    <th className="p-3">New Batch</th>
                    <th className="p-3">Relabel?</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingRP ? <LoadingRow cols={10} /> : filteredRP.length === 0 ? <EmptyRow cols={10} /> :
                    paginate(filteredRP).map(rp => {
                      const total = (rp.recoverableQty || 0) + (rp.wasteQty || 0);
                      const pct   = total > 0 ? Math.round((rp.recoverableQty / total) * 100) : 0;
                      return (
                        <tr key={rp.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                          <td className="p-3 font-mono font-semibold text-slate-500">{rp.rpNumber}</td>
                          <td className="p-3 text-slate-500">{fmt(rp.createdAt)}</td>
                          <td className="p-3 font-semibold">{rp.sourceWorkOrder?.product?.name || '—'}</td>
                          <td className="p-3 text-slate-600">{rp.repackType || '—'}</td>
                          <td className="p-3 text-center font-bold text-green-700">+{rp.recoverableQty}</td>
                          <td className="p-3 text-center font-bold text-rose-600">-{rp.wasteQty}</td>
                          <td className="p-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${pct >= 70 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{pct}%</span>
                          </td>
                          <td className="p-3 font-mono text-[11px]">{rp.newBatchNumber || '—'}</td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold ${rp.requiresRelabeling ? 'text-orange-600' : 'text-slate-400'}`}>
                              {rp.requiresRelabeling ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              rp.status === 'REPACKING_COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' :
                              rp.status === 'REPACKING_IN_PROGRESS' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>{rp.status || '—'}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <Pagination total={filteredRP.length} />
            </div>
          </div>
        );

      // ── 5. WASTAGE ──────────────────────────────────────────────────────
      case 'waste':
        return (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Wastage Metrics — Calculated from Workflow Data (No Double-Counting)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Packing Rejected Qty"  value={wastageKPIs.packingRejected}  color="orange" />
              <KpiCard label="Repacking Wastage Qty" value={wastageKPIs.repackingWastage} color="red"    />
              <KpiCard label="Overall Wastage Qty"   value={wastageKPIs.overallWastage}   color="rose"   />
              <KpiCard label="Wastage %"             value={`${wastageKPIs.wastagePct}%`}  color="amber"  />
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-[10px] font-semibold text-blue-700 dark:text-blue-400">
              ℹ Calculation: Packing Rejected = WOs with actualRejected (excluding repacked WOs to avoid double-count). Repacking Wastage = sum of RepackingLog.wasteQty. No quantity counted in both buckets.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">Source</th>
                    <th className="p-3">RP No / WO No</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">Wastage Qty</th>
                    <th className="p-3 text-center">Waste Rate</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {/* Repacking wastage rows */}
                  {loadingRP ? <LoadingRow cols={7} /> :
                    paginate(filteredRP.filter(r => r.wasteQty > 0)).map(rp => {
                      const total = (rp.recoverableQty || 0) + (rp.wasteQty || 0);
                      const rate  = total > 0 ? Math.round((rp.wasteQty / total) * 100) : 0;
                      return (
                        <tr key={`rp-${rp.id}`} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                          <td className="p-3"><span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-bold">Repacking</span></td>
                          <td className="p-3 font-mono">{rp.rpNumber}</td>
                          <td className="p-3 font-semibold">{rp.sourceWorkOrder?.product?.name || '—'}</td>
                          <td className="p-3 text-slate-500">{fmt(rp.createdAt)}</td>
                          <td className="p-3 text-center font-bold text-rose-600">{rp.wasteQty}</td>
                          <td className="p-3 text-center"><span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${rate > 20 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{rate}%</span></td>
                          <td className="p-3 text-slate-500">{rp.remarks || '—'}</td>
                        </tr>
                      );
                    })}
                  {/* WO packing rejected rows (not repacked) */}
                  {loadingWO ? null :
                    paginate(filteredWOs.filter(w => w.actualRejected > 0 && !repackings.some(r => r.sourceWoId === w.id))).map(w => {
                      const total = (w.actualProduced || 0) + (w.actualRejected || 0);
                      const rate  = total > 0 ? Math.round((w.actualRejected / total) * 100) : 0;
                      return (
                        <tr key={`wo-${w.id}`} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                          <td className="p-3"><span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">Packing</span></td>
                          <td className="p-3 font-mono">{w.woNumber}</td>
                          <td className="p-3 font-semibold">{w.product?.name || '—'}</td>
                          <td className="p-3 text-slate-500">{fmt(w.updatedAt)}</td>
                          <td className="p-3 text-center font-bold text-rose-600">{w.actualRejected}</td>
                          <td className="p-3 text-center"><span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${rate > 20 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{rate}%</span></td>
                          <td className="p-3 text-slate-500">—</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        );

      // ── 6. FINISHED GOODS ───────────────────────────────────────────────
      case 'fg':
        return (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Finished Goods Report</h3>
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Total FG Qty"     value={fgKPIs.total}   color="green"  />
              <KpiCard label="Posted Today"     value={fgKPIs.today}   color="blue"   />
              <KpiCard label="Pending Sync"     value={fgKPIs.pending} color="amber"  />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">FG No</th>
                    <th className="p-3">Work Order</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3 text-center">Posted Qty</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Inventory Sync</th>
                    <th className="p-3">Posted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingFG ? <LoadingRow cols={8} /> : filteredFG.length === 0 ? <EmptyRow cols={8} /> :
                    paginate(filteredFG).map(fg => {
                      const sync = fg.costPayload?.inventoryStatus || 'PENDING';
                      return (
                        <tr key={fg.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                          <td className="p-3 font-mono font-semibold text-slate-500">{fg.fgNumber || '—'}</td>
                          <td className="p-3 font-mono">{fg.workOrder?.woNumber || '—'}</td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{fg.product?.name || '—'}</td>
                          <td className="p-3 font-mono text-slate-500">{fg.batchNumber || '—'}</td>
                          <td className="p-3 text-center font-bold">{fg.postedQty}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">{fg.destination || '—'}</span></td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sync === 'SYNCED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>{sync}</span>
                          </td>
                          <td className="p-3 text-slate-500">{fmtFull(fg.createdAt)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <Pagination total={filteredFG.length} />
            </div>
          </div>
        );

      // ── 7. BARCODE & LABELS ─────────────────────────────────────────────
      case 'barcode':
        return (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Barcode &amp; Label Report</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Print Jobs"     value={barcodeKPIs.total}   />
              <KpiCard label="Initial Labels"       value={barcodeKPIs.initial} color="blue"   />
              <KpiCard label="Reprint Jobs"         value={barcodeKPIs.reprints} color="orange" />
              <KpiCard label="Application Done"     value={barcodeKPIs.applied} color="green"  />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">Job No</th>
                    <th className="p-3">Work Order</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3 text-center">Printed Qty</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Printed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingBR ? <LoadingRow cols={8} /> : filteredPrintJobs.length === 0 ? <EmptyRow cols={8} msg="No print job records found." /> :
                    paginate(filteredPrintJobs).map(j => (
                      <tr key={j.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                        <td className="p-3 font-mono text-slate-500">{j.jobNumber || j.id?.slice(0, 8) || '—'}</td>
                        <td className="p-3 font-mono">{j.workOrder?.woNumber || j.batchNumber?.split('-')[0] || '—'}</td>
                        <td className="p-3 font-semibold">{j.workOrder?.product?.name || '—'}</td>
                        <td className="p-3 font-mono text-slate-500">{j.batchNumber || '—'}</td>
                        <td className="p-3 text-center font-bold">{j.printedQty || j.quantity || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(j.jobType || j.type) === 'REPRINT' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{j.jobType || j.type || 'INITIAL'}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${j.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{j.status || '—'}</span>
                        </td>
                        <td className="p-3 text-slate-500">{fmtFull(j.createdAt ?? j.printedAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <Pagination total={filteredPrintJobs.length} />
            </div>
          </div>
        );

      // ── 8. TRACEABILITY ─────────────────────────────────────────────────
      case 'traceability': {
        const traceWO = filteredWOs.find(w =>
          filterBatch && (w.batchNumber === filterBatch || w.woNumber === filterBatch)
        );
        const traceFG = finishedGoods.find(f => f.batchNumber === filterBatch);
        const traceRP = repackings.find(r => r.newBatchNumber === filterBatch || r.sourceWorkOrder?.batchNumber === filterBatch);
        const traceQC = qualityChecks.filter(q => q.workOrder?.batchNumber === filterBatch || (traceWO && q.woId === traceWO.id));
        const Step = ({ color, label, detail }: { color: string; label: string; detail: string }) => (
          <div className="flex gap-3">
            <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 bg-${color}-500 ring-2 ring-${color}-200`} />
            <div>
              <div className={`font-bold text-${color}-700 dark:text-${color}-400 text-xs`}>{label}</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">{detail}</div>
            </div>
          </div>
        );
        return (
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-gray-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Batch Genealogy &amp; Traceability</h3>
              <input
                type="text"
                placeholder="Enter Batch No or WO No…"
                className="px-3 py-1.5 border border-slate-200 dark:border-gray-600 rounded-lg text-xs focus:ring-1 focus:ring-green-600 focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 w-56"
                value={filterBatch}
                onChange={e => { setFilterBatch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            {!filterBatch ? (
              <div className="p-6 text-center text-slate-400 text-xs">Enter a batch number or WO number above to trace its full history.</div>
            ) : (!traceWO && !traceFG && !traceRP) ? (
              <div className="p-6 text-center text-slate-400 text-xs">No matching batch/WO found: <strong>{filterBatch}</strong>. Check spelling or date range.</div>
            ) : (
              <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-5 font-mono text-xs space-y-4">
                <div className="font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                  <GitCommit size={16} /> Traceability chain for: <span className="ml-1">{filterBatch}</span>
                </div>
                <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800 ml-2">
                  {traceWO && (
                    <Step color="indigo" label="Work Order"
                      detail={`${traceWO.woNumber} | ${traceWO.product?.name || '—'} | Status: ${traceWO.status} | Planned: ${traceWO.requiredQty} | Packed: ${traceWO.actualProduced ?? '—'}`} />
                  )}
                  {traceQC.map((qc, i) => (
                    <Step key={i} color={['PASS','PARTIAL_PASS'].includes(qc.result) ? 'green' : 'rose'} label={`QC Inspection #${i + 1}`}
                      detail={`${qc.qcNumber} | Result: ${qc.result} | Inspector: ${typeof qc.inspector === 'string' ? qc.inspector : qc.inspector?.name || '—'} | Checked: ${qc.checkedQty} | Reason: ${qc.failureReason || '—'}`} />
                  ))}
                  {traceRP && (
                    <Step color="orange" label="Repacking"
                      detail={`${traceRP.rpNumber} | Recovered: ${traceRP.recoverableQty} | Wastage: ${traceRP.wasteQty} | New Batch: ${traceRP.newBatchNumber || '—'} | Relabel: ${traceRP.requiresRelabeling ? 'Yes' : 'No'}`} />
                  )}
                  {traceFG && (
                    <Step color="green" label="Finished Goods"
                      detail={`${traceFG.fgNumber} | Posted: ${traceFG.postedQty} units | Destination: ${traceFG.destination || '—'} | ${fmtFull(traceFG.createdAt)}`} />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── 9. QC REJECTIONS ────────────────────────────────────────────────
      case 'rejected': {
        const rejectedQCs = filteredQC.filter(q => ['REJECT', 'REWORK', 'DISCARD'].includes(q.result));
        return (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">QC Rejections Log</h3>
              <span className="text-xs text-slate-500 font-medium">{rejectedQCs.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700 text-[10px] uppercase">
                    <th className="p-3">QC No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Work Order</th>
                    <th className="p-3 text-center">Checked Qty</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Failure Reason</th>
                    <th className="p-3">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingQC ? <LoadingRow cols={8} /> : rejectedQCs.length === 0 ? <EmptyRow cols={8} msg="No rejection records in this period." /> :
                    paginate(rejectedQCs).map(qc => (
                      <tr key={qc.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/40">
                        <td className="p-3 font-mono font-semibold text-slate-500">{qc.qcNumber}</td>
                        <td className="p-3 text-slate-500">{fmt(qc.createdAt)}</td>
                        <td className="p-3 font-semibold">{qc.workOrder?.product?.name || '—'}</td>
                        <td className="p-3 font-mono">{qc.workOrder?.woNumber || '—'}</td>
                        <td className="p-3 text-center font-bold">{qc.checkedQty}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${qc.result === 'REJECT' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>{qc.result}</span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-[140px] truncate" title={qc.failureReason || ''}>{qc.failureReason || '—'}</td>
                        <td className="p-3 text-slate-600">{typeof qc.inspector === 'string' ? qc.inspector : qc.inspector?.name || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <Pagination total={rejectedQCs.length} />
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-6 text-center text-slate-400">
            <Info size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold">Select a report from the left panel.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="flex items-center gap-2">
          <BarChart2 className="text-green-600" size={26} />
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Packing ERP Reports</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">All data fetched in real-time from backend database — no mock values</p>
          </div>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 text-xs font-bold bg-slate-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-xl cursor-pointer">
          <RefreshCw size={14} /> Refresh All
        </button>
      </div>

      {/* Date Range Bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Filter size={12} /> Date Range</span>
          {(['today','week','month','custom'] as const).map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${datePreset === p ? 'bg-green-600 text-white' : 'bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-200'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs bg-white dark:bg-gray-900 dark:text-gray-200" />
              <span className="text-gray-400">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs bg-white dark:bg-gray-900 dark:text-gray-200" />
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Product</label>
            <select value={filterProduct} onChange={e => { setFilterProduct(e.target.value); setCurrentPage(1); }} className="text-xs bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-green-600 focus:outline-none dark:text-gray-200">
              <option value="All">All Products</option>
              {productOptions.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Work Order</label>
            <select value={filterWO} onChange={e => { setFilterWO(e.target.value); setCurrentPage(1); }} className="text-xs bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-green-600 focus:outline-none dark:text-gray-200">
              <option value="All">All WOs</option>
              {woOptions.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="text-xs bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-green-600 focus:outline-none dark:text-gray-200">
              <option value="All">All Statuses</option>
              <option>COMPLETED</option><option>QC_PASSED</option><option>QC_FAILED</option>
              <option>QC_PENDING</option><option>PACKING_COMPLETED</option>
              <option>REPACKING_COMPLETED</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Operator</label>
            <select value={filterOperator} onChange={e => { setFilterOperator(e.target.value); setCurrentPage(1); }} className="text-xs bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-green-600 focus:outline-none dark:text-gray-200">
              <option value="All">All Operators</option>
              {operatorOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">QC Inspector</label>
            <select value={filterInspector} onChange={e => { setFilterInspector(e.target.value); setCurrentPage(1); }} className="text-xs bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-green-600 focus:outline-none dark:text-gray-200">
              <option value="All">All Inspectors</option>
              {inspectorOptions.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Batch No</label>
            <input type="text" value={filterBatch} onChange={e => { setFilterBatch(e.target.value); setCurrentPage(1); }}
              placeholder="Search batch…" className="text-xs bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-green-600 focus:outline-none dark:text-gray-200" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-gray-700">
          <button onClick={resetFilters} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 rounded-lg cursor-pointer">
            Reset Filters
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('Excel')} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer">
              <Download size={14} /> Export Excel
            </button>
            <button onClick={() => handleExport('PDF')} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer">
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xs space-y-2 h-fit">
          <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider px-3 pb-3 border-b border-slate-100 dark:border-gray-700 mb-2">Available Reports</h3>
          <div className="space-y-1">
            {reportsList.map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${isSelected ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200/60 dark:border-green-800' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-800 dark:hover:text-gray-200'}`}>
                  <Icon size={15} className={isSelected ? 'text-green-600' : 'text-slate-400 dark:text-gray-500'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xs min-h-[400px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PackingReports;
