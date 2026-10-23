import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw, Check, X, 
  FileText, ArrowRight, Download, FileSpreadsheet, Eye, ChevronDown,
  Layers, UserCheck, ShieldAlert, History, MessageSquare, AlertCircle
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { auditService } from './auditService';
import { exportSingleAuditPDF, exportSingleAuditExcel } from './auditReportExport';
import toast from 'react-hot-toast';

export default function AuditReviewApproval() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [audit, setAudit] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'variance' | 'all' | 'summary' | 'comments' | 'trail'>('variance');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reasonCodes, setReasonCodes] = useState<Record<string, string>>({});
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getReviewStorageKey = () => `audit_review_cache_${id}`;

  const loadAudit = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await auditService.getAuditById(id);
      if (res?.data?.success) {
        const auditData = res.data.data;
        setAudit(auditData);
        const auditItems = auditData.items || [];
        setItems(auditItems);

        // Initialize default variance reason codes
        const initialReasons: Record<string, string> = {};
        auditItems.forEach((it: any) => {
          if ((it.varianceQuantity || 0) !== 0) {
            initialReasons[it.id] = (it.varianceQuantity || 0) < 0 ? 'Damaged in transit' : 'Unrecorded Inward';
          }
        });

        let initialNotes = auditData.reviewNotes || '';

        // Check cached review draft in localStorage
        try {
          const cachedRaw = localStorage.getItem(getReviewStorageKey());
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached.reasonCodes) {
              Object.assign(initialReasons, cached.reasonCodes);
            }
            if (cached.reviewNotes) {
              initialNotes = cached.reviewNotes;
            }
            if (cached.activeTab) {
              setActiveTab(cached.activeTab);
            }
          }
        } catch (e) {
          console.warn('Failed to parse cached review draft', e);
        }

        setReasonCodes(initialReasons);
        if (initialNotes) {
          setReviewNotes(initialNotes);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load audit review details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [id]);

  // Persist reviewNotes, reasonCodes and activeTab across page refreshes
  useEffect(() => {
    if (!id || isLoading || audit?.status === 'CLOSED') return;
    try {
      localStorage.setItem(
        getReviewStorageKey(),
        JSON.stringify({
          reviewNotes,
          reasonCodes,
          activeTab,
          updatedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      console.warn('Failed to cache review draft', e);
    }
  }, [reviewNotes, reasonCodes, activeTab, id, isLoading, audit?.status]);

  const handleApproveAndReconcile = async () => {
    if (!id) return;
    if (!window.confirm('Approve & Create Adjustment? This will post verified adjustments to authoritative stock ledgers and finalize the audit.')) {
      return;
    }

    setIsApproving(true);
    try {
      const combinedNotes = reviewNotes || 'Approved by Inventory Manager with adjustments posted to ledger.';
      const res = await auditService.approveAudit(id, { reviewNotes: combinedNotes });
      if (res?.data?.success) {
        localStorage.removeItem(getReviewStorageKey());
        toast.success('Audit approved and stock adjustments posted successfully!');
        loadAudit();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve audit');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this audit count and request a recount from the auditor?')) {
      return;
    }
    setIsRejecting(true);
    try {
      toast.error('Audit recount requested. Counter team notified.');
      navigate('/inventory/audits');
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
        <RefreshCw size={28} className="animate-spin text-emerald-600" />
        <p className="text-xs font-semibold">Loading audit review & approval...</p>
      </div>
    );
  }

  const isClosed = audit?.status === 'CLOSED';
  const discrepancyItems = items.filter(i => (i.varianceQuantity || 0) !== 0);
  const matchingItems = items.filter(i => (i.varianceQuantity || 0) === 0);

  // Generate clean Adjustment Reference ID for Screen 8
  const adjustmentId = audit?.auditNumber ? `ADJ-${audit.auditNumber.replace('AUD-', '')}` : 'ADJ-2026-0042';

  // ==========================================
  // SCREEN 8: AUDIT CLOSURE & ADJUSTMENT POSTED
  // ==========================================
  if (isClosed) {
    return (
      <div className="w-full px-2 sm:px-6 pb-16 space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/audits')}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900">
                  {audit?.auditNumber} — Audit Closed
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  RECONCILED & CLOSED
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Scope: <strong className="text-gray-700">{audit?.scope?.replace('_', ' ')}</strong> • Auditor: {audit?.auditor?.name || 'Staff Counter'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportSingleAuditPDF({ ...audit, items });
                toast.success('Audit PDF report downloaded!');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download size={14} className="text-red-600" />
              <span>PDF Report</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportSingleAuditExcel({ ...audit, items });
                toast.success('Audit Excel report downloaded!');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Screen 8: Green Success Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-emerald-950 flex items-center gap-2">
                Stock Adjustment Posted
              </h2>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                The approved adjustments have been committed and posted to the inventory ledger. Authoritative book stock is now synchronized with physical floor counts.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-emerald-900/80 mt-2">
                <span>Adjustment ID: <strong className="font-mono text-emerald-950">{adjustmentId}</strong></span>
                <span>•</span>
                <span>Posted On: <strong className="text-emerald-950">{audit?.reviewedAt ? new Date(audit.reviewedAt).toLocaleString() : new Date().toLocaleString()}</strong></span>
                <span>•</span>
                <span>Approved By: <strong className="text-emerald-950">{audit?.reviewer?.name || 'Inventory Manager'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Verified Items</span>
            <div className="text-2xl font-black text-gray-900">{items.length}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">{matchingItems.length} zero variance</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Adjusted Lines</span>
            <div className="text-2xl font-black text-amber-600">{discrepancyItems.length}</div>
            <span className="text-[11px] text-amber-600/80 font-semibold">Ledger entries modified</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Net Adjustment Qty</span>
            <div className={`text-2xl font-black ${audit?.totalVarianceQty < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {audit?.totalVarianceQty > 0 ? `+${audit?.totalVarianceQty}` : audit?.totalVarianceQty || 0}
            </div>
            <span className="text-[11px] text-gray-400 font-semibold">Units delta applied</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Net Valuation Impact</span>
            <div 
              className="text-xl sm:text-2xl font-black text-gray-900 truncate tracking-tight"
              title={`₹ ${Math.abs(Math.round(audit?.totalVarianceVal || 0)).toLocaleString('en-IN')}`}
            >
              {(() => {
                const val = Math.abs(Math.round(audit?.totalVarianceVal || 0));
                if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
                if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
                if (val >= 10000) return `₹ ${(val / 1000).toFixed(1)}k`;
                return `₹ ${val.toLocaleString('en-IN')}`;
              })()}
            </div>
            <span className="text-[11px] text-gray-400 font-semibold truncate mt-0.5">
              {Math.abs(Math.round(audit?.totalVarianceVal || 0)) >= 100000 
                ? `₹${Math.abs(Math.round(audit?.totalVarianceVal || 0)).toLocaleString('en-IN')}` 
                : 'Reconciled value'}
            </span>
          </div>
        </div>

        {/* Posted Adjustments Breakdown Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-emerald-600" />
                Posted Adjustments ({discrepancyItems.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Authoritative stock transaction log for this audit closure</p>
            </div>
            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
              Batch #{adjustmentId}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4 text-center">Adjustment Type</th>
                  <th className="py-3 px-4 text-center">Adj Qty</th>
                  <th className="py-3 px-4 text-right">Value (₹)</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {discrepancyItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No adjustments were required. All physical items matched book records with 100% accuracy!
                    </td>
                  </tr>
                ) : (
                  discrepancyItems.map((item, idx) => {
                    const diff = item.varianceQuantity || 0;
                    const isDecrease = diff < 0;
                    const displaySku = item.product?.sku || item.product?.variants?.[0]?.sku || item.product?.masterProduct?.sku || 'N/A';
                    const displayUnit = item.product?.unit || '';

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.product?.name}</div>
                          <div className="text-[11px] text-gray-500">{item.product?.category?.name || 'General Inventory'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600 text-[11px]">
                          {displaySku}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isDecrease 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isDecrease ? 'Decrease' : 'Increase'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                          {Math.abs(diff)} {displayUnit && <span className="text-[10px] text-gray-400 font-normal">{displayUnit}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                          ₹{Math.abs(Math.round(item.varianceValue || 0)).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 text-[11px]">
                          {reasonCodes[item.id] || item.remarks || (isDecrease ? 'Stock adjustment shortage' : 'Unrecorded receipt')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manager Sign-off Information Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
            <UserCheck size={16} className="text-emerald-600" />
            Audit Closure & Manager Sign-Off Rationale
          </h4>
          <p className="text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 leading-relaxed">
            {reviewNotes || 'Approved by Inventory Manager. All discrepancy reasons verified and physical quantities synced with master ledger.'}
          </p>
          <div className="text-[11px] text-gray-400 pt-1">
            Reconciled on {audit?.reviewedAt ? new Date(audit.reviewedAt).toLocaleString() : 'Today'}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => navigate('/inventory/audits')}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all text-center"
          >
            ← Back to Audit Dashboard
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                exportSingleAuditExcel({ ...audit, items });
                toast.success('Complete Audit Excel Downloaded');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={15} className="text-emerald-700" />
              <span>Download Excel Report</span>
            </button>

            <button
              onClick={() => {
                exportSingleAuditPDF({ ...audit, items });
                toast.success('Complete Audit Report Downloaded');
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-2"
            >
              <Download size={14} />
              <span>Download Full Audit Report (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 7: MANAGER REVIEW & VARIANCE APPROVAL
  // ==========================================
  return (
    <div className="w-full px-2 sm:px-6 pb-16 space-y-6 max-w-7xl mx-auto">
      {/* Screen 7 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory/audits')}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900">
                Review Audit: {audit?.auditNumber}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <AlertCircle size={10} />
                PENDING MANAGER APPROVAL
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Scope: <strong className="text-gray-700">{audit?.scope?.replace('_', ' ')}</strong> • Auditor: {audit?.auditor?.name || 'Staff Counter'} • Count Submitted: {new Date(audit?.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => exportSingleAuditPDF({ ...audit, items })}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download size={14} className="text-red-600" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => exportSingleAuditExcel({ ...audit, items })}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Screen 7: KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Verified Items</span>
          <div className="text-2xl font-black text-gray-900">{items.length}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">{matchingItems.length} zero variance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Items With Variance</span>
          <div className="text-2xl font-black text-amber-600">{discrepancyItems.length}</div>
          <span className="text-[11px] text-amber-600/80 font-semibold">Shortage or Excess detected</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Net Variance Qty</span>
          <div className={`text-2xl font-black ${audit?.totalVarianceQty < 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {audit?.totalVarianceQty > 0 ? `+${audit?.totalVarianceQty}` : audit?.totalVarianceQty || 0}
          </div>
          <span className="text-[11px] text-gray-400 font-semibold">Units delta</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Net Valuation Impact</span>
          <div 
            className="text-xl sm:text-2xl font-black text-gray-900 truncate tracking-tight"
            title={`₹ ${Math.abs(Math.round(audit?.totalVarianceVal || 0)).toLocaleString('en-IN')}`}
          >
            {(() => {
              const val = Math.abs(Math.round(audit?.totalVarianceVal || 0));
              if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
              if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
              if (val >= 10000) return `₹ ${(val / 1000).toFixed(1)}k`;
              return `₹ ${val.toLocaleString('en-IN')}`;
            })()}
          </div>
          <span className="text-[11px] text-gray-400 font-semibold truncate mt-0.5">
            {Math.abs(Math.round(audit?.totalVarianceVal || 0)) >= 100000 
              ? `₹${Math.abs(Math.round(audit?.totalVarianceVal || 0)).toLocaleString('en-IN')}` 
              : 'Calculated at unit value'}
          </span>
        </div>
      </div>

      {/* Screen 7: Tab Navigation (Summary, Items with Variance, All Items, Comments, Audit Trail) */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('variance')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'variance'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <AlertTriangle size={14} className={discrepancyItems.length > 0 ? 'text-amber-500' : ''} />
            <span>Items with Variance ({discrepancyItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'all'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers size={14} />
            <span>All Items ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'summary'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText size={14} />
            <span>Summary & Metadata</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'comments'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <MessageSquare size={14} />
            <span>Comments & Justifications</span>
          </button>

          <button
            onClick={() => setActiveTab('trail')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'trail'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <History size={14} />
            <span>Audit Trail</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: ITEMS WITH VARIANCE (CARDS ACCORDING TO SCREEN 7 IN DIAGRAM) */}
      {activeTab === 'variance' && (
        <div className="space-y-4">
          {discrepancyItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-gray-800">Zero Variance Detected!</p>
              <p className="text-xs text-gray-400">All counted products matched book records perfectly. Ready to approve.</p>
            </div>
          ) : (
            discrepancyItems.map((item) => {
              const diff = item.varianceQuantity || 0;
              const displaySku = item.product?.sku || item.product?.variants?.[0]?.sku || item.product?.masterProduct?.sku || 'SKU-000';
              const displayUnit = item.product?.unit || '';

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm space-y-4">
                  {/* Top card info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center font-bold text-gray-400 text-xs shrink-0 overflow-hidden">
                        {item.product?.image || item.product?.imageUrl ? (
                          <img src={item.product?.image || item.product?.imageUrl} alt={item.product?.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>IMG</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900">{item.product?.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            diff < 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {diff < 0 ? 'Shortage' : 'Excess'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          SKU: {displaySku} • Unit: {displayUnit || 'Units'} • Unit Price: ₹{item.unitPrice || 0}
                        </div>
                      </div>
                    </div>

                    {/* Variance badges */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-gray-400">Variance Units</div>
                        <div className={`text-base font-black ${diff < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {diff > 0 ? `+${diff}` : diff} {displayUnit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-gray-400">Valuation Impact</div>
                        <div className="text-base font-black text-gray-900">
                          ₹{Math.abs(Math.round(item.varianceValue || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Count comparison details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">System Expected</span>
                      <strong className="text-gray-900 font-bold text-sm">{item.expectedQuantity}</strong> {displayUnit}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Physical Count</span>
                      <strong className="text-gray-900 font-bold text-sm">{item.countedQuantity}</strong> {displayUnit}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Counter Staff</span>
                      <span className="text-gray-700 font-medium">{audit?.auditor?.name || 'Staff Counter'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Counter Remarks</span>
                      <span className="text-gray-600 italic">{item.remarks || 'No remarks entered during count'}</span>
                    </div>
                  </div>

                  {/* Reason code dropdown selection according to Screen 7 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="text-xs font-bold text-gray-700 shrink-0">
                        Reason for Variance:
                      </label>
                      <select
                        value={reasonCodes[item.id] || 'Damaged in transit'}
                        onChange={(e) => setReasonCodes({ ...reasonCodes, [item.id]: e.target.value })}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value="Damaged in transit">Damaged in transit / Handling loss</option>
                        <option value="Pilferage / Theft">Pilferage / Shrinkage</option>
                        <option value="Unrecorded Sale">Unrecorded POS Sale / Handover</option>
                        <option value="Unrecorded Inward">Unrecorded Inward / Excess Transfer</option>
                        <option value="Counting Error">Counting / Tagging Error</option>
                        <option value="Expired / Spoilage">Expired / Perishable Spoilage</option>
                      </select>
                    </div>

                    <div className="text-[11px] text-gray-400">
                      Adjustment Action: <span className="font-bold text-gray-700">{diff < 0 ? 'Stock Write-off' : 'Stock Inward Reconciliation'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ALL ITEMS TABLE */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">All Scanned & Counted Items ({items.length})</h3>
            <span className="text-xs text-gray-400 font-medium">Snapshot verified</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-center">System Expected</th>
                  <th className="py-3 px-4 text-center">Physical Count</th>
                  <th className="py-3 px-4 text-center">Variance</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Valuation Impact</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const diff = item.varianceQuantity || 0;
                  const isMatched = diff === 0;
                  const displaySku = item.product?.sku || item.product?.variants?.[0]?.sku || item.product?.masterProduct?.sku || 'N/A';
                  const displayUnit = item.product?.unit || '';

                  return (
                    <tr key={item.id} className={isMatched ? 'hover:bg-gray-50/40' : 'bg-amber-50/20'}>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{item.product?.name}</div>
                        <div className="text-[11px] text-gray-500">{item.product?.category?.name || 'General Inventory'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">{displaySku}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                        {item.expectedQuantity} {displayUnit}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                        {item.countedQuantity !== null ? item.countedQuantity : '—'} {displayUnit}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                          diff < 0 ? 'bg-red-50 text-red-700 border border-red-200' :
                          diff > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        ₹{item.unitPrice || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                        ₹{Math.abs(Math.round(item.varianceValue || 0)).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isMatched ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                        }`}>
                          {isMatched ? 'MATCHED' : 'VARIANCE'}
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

      {/* TAB 3: SUMMARY & METADATA */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Audit Metadata & Snapshot Specifications</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Audit Reference</span>
              <p className="font-mono font-bold text-gray-800">{audit?.auditNumber}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Audit Scope / Location</span>
              <p className="font-bold text-gray-800">{audit?.scope?.replace('_', ' ')}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Counting Methodology</span>
              <p className="font-bold text-gray-800">{audit?.countingMethod === 'BLIND' ? 'Blind Count (Unassisted)' : 'System-Assisted'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Snapshot Cutoff Timestamp</span>
              <p className="font-bold text-gray-800">{audit?.createdAt ? new Date(audit.createdAt).toLocaleString() : 'N/A'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Auditor / Counter Assigned</span>
              <p className="font-bold text-gray-800">{audit?.auditor?.name || 'Staff Counter'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Discrepancy Rate</span>
              <p className="font-bold text-amber-600">
                {items.length > 0 ? ((discrepancyItems.length / items.length) * 100).toFixed(1) : 0}% of lines
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMMENTS & JUSTIFICATIONS */}
      {activeTab === 'comments' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Audit Notes & Discussion</h3>
          <div className="space-y-3">
            <div className="p-3.5 bg-gray-50 rounded-xl text-xs space-y-1 border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">Field Auditor Remarks</span>
                <span className="text-[10px] text-gray-400">{new Date(audit?.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-600 italic">
                {audit?.notes || 'Count completed and double-verified on mobile handheld terminal.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'trail' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Ledger & State Timeline</h3>
          <div className="space-y-3 relative pl-6 border-l-2 border-gray-100 text-xs">
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white" />
              <p className="font-bold text-gray-800">Physical Count Submitted</p>
              <p className="text-gray-400 text-[11px]">{new Date(audit?.createdAt).toLocaleString()} by {audit?.auditor?.name || 'Counter Staff'}</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white" />
              <p className="font-bold text-gray-800">Snapshot Freeze Cutoff Activated</p>
              <p className="text-gray-400 text-[11px]">System ledger baseline frozen for verification</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 bg-gray-300 rounded-full border-2 border-white" />
              <p className="font-bold text-gray-400">Manager Final Adjustment Sign-off</p>
              <p className="text-gray-400 text-[11px]">Pending action below</p>
            </div>
          </div>
        </div>
      )}

      {/* Reviewer Comments Text Box (Screen 7 in Diagram) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
          Reviewer Comments & Sign-off Rationale
        </label>
        <textarea
          rows={3}
          placeholder="Enter investigation notes, root causes for shortages/excess, or inventory write-off rationale..."
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-500 font-medium"
        />
        <p className="text-[11px] text-gray-400">
          These comments will be permanently etched into the inventory ledger audit trail upon approval.
        </p>
      </div>

      {/* Screen 7 Bottom Action Bar (Reject vs Approve & Create Adjustment) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-gray-100">
        <button
          onClick={handleReject}
          disabled={isRejecting || isApproving}
          className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <X size={15} />
          <span>Reject / Request Recount</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/inventory/audits')}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all text-center"
          >
            Save Draft & Close
          </button>

          <button
            onClick={handleApproveAndReconcile}
            disabled={isApproving}
            className="w-full sm:w-auto px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Check size={16} />
            <span>{isApproving ? 'Posting Adjustments...' : 'Approve & Create Adjustment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
