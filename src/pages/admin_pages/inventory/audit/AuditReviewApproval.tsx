import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, ArrowLeft, CheckCircle2, AlertTriangle, 
  RefreshCw, Check, X, ShieldAlert, FileText, ArrowRight
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { auditService } from './auditService';
import toast from 'react-hot-toast';

export default function AuditReviewApproval() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [audit, setAudit] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAudit = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await auditService.getAuditById(id);
      if (res?.data?.success) {
        setAudit(res.data.data);
        setItems(res.data.data.items || []);
        if (res.data.data.reviewNotes) {
          setReviewNotes(res.data.data.reviewNotes);
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

  const handleApproveAndReconcile = async () => {
    if (!id) return;
    if (!window.confirm('Post verified adjustments to authoritative stock ledgers? This will adjust on-hand inventory and close the audit.')) {
      return;
    }

    setIsApproving(true);
    try {
      const res = await auditService.approveAudit(id, { reviewNotes });
      if (res?.data?.success) {
        toast.success('Audit approved and stock ledgers reconciled successfully!');
        loadAudit();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve audit');
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
        <RefreshCw size={28} className="animate-spin text-emerald-600" />
        <p className="text-xs font-semibold">Loading variance review...</p>
      </div>
    );
  }

  const isClosed = audit?.status === 'CLOSED';
  const discrepancyItems = items.filter(i => (i.varianceQuantity || 0) !== 0);
  const matchingItems = items.filter(i => (i.varianceQuantity || 0) === 0);

  return (
    <div className="w-full px-2 sm:px-4 pb-12 space-y-6">
      {/* Header */}
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
                Audit Variance Review: {audit?.auditNumber}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                isClosed
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isClosed ? 'CLOSED (RECONCILED)' : 'PENDING MANAGER SIGN-OFF'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Scope: <strong>{audit?.scope?.replace('_', ' ')}</strong> • Auditor: {audit?.auditor?.name}
            </p>
          </div>
        </div>

        {!isClosed && (
          <button
            onClick={handleApproveAndReconcile}
            disabled={isApproving}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all self-start sm:self-auto disabled:opacity-60"
          >
            <Check size={16} />
            <span>{isApproving ? 'Posting Ledger Adjustments...' : 'Approve & Reconcile Stock'}</span>
          </button>
        )}
      </div>

      {/* Screen 3: Variance KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Verified Items</span>
          <div className="text-2xl font-black text-gray-900">{items.length}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">{matchingItems.length} zero variance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Discrepancy Lines</span>
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

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Net Valuation Impact</span>
          <div className="text-2xl font-black text-gray-900">
            ₹{Math.abs(Math.round(audit?.totalVarianceVal || 0)).toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-400 font-semibold">Calculated at unit selling price</span>
        </div>
      </div>

      {/* Manager Sign-off Notes Box */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
          Manager Review Sign-Off & Justification Notes
        </label>
        <textarea
          rows={2}
          disabled={isClosed}
          placeholder="Enter investigation notes, unrecorded movement explanations, or adjustment rationale..."
          value={reviewNotes}
          onChange={e => setReviewNotes(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:border-emerald-500 disabled:opacity-75"
        />
        {isClosed && audit?.reviewer && (
          <div className="text-[11px] text-gray-500 font-medium">
            Reviewed & Reconciled by: <strong className="text-gray-800">{audit.reviewer.name}</strong> on {new Date(audit.reviewedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Discrepancy Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Detailed Variance & Discrepancy Breakdown
          </h2>
          <span className="text-xs text-gray-400">
            {discrepancyItems.length} items requiring investigation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4 text-center">Expected Book Stock</th>
                <th className="py-3 px-4 text-center">Physical Count</th>
                <th className="py-3 px-4 text-center">Stock Variance</th>
                <th className="py-3 px-4 text-center">Variance %</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Valuation Impact</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const diff = item.varianceQuantity || 0;
                const isDiscrepant = diff !== 0;
                const displaySku = item.product?.sku || item.product?.variants?.[0]?.sku || item.product?.masterProduct?.sku || 'N/A';
                const displayUnit = item.product?.unit || '';

                return (
                  <tr key={item.id} className={isDiscrepant ? 'bg-amber-50/20' : 'hover:bg-gray-50/40'}>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{item.product?.name}</div>
                      <div className="text-[11px] font-mono text-gray-400">SKU: {displaySku}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                      {item.expectedQuantity} {displayUnit && <span className="text-[10px] text-gray-400 font-normal">{displayUnit}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                      {item.countedQuantity !== null ? item.countedQuantity : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                        diff < 0 ? 'bg-red-50 text-red-700 border border-red-200' :
                        diff > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                      {item.variancePercent ? `${item.variancePercent}%` : '0%'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                      ₹{item.unitPrice || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                      ₹{Math.abs(Math.round(item.varianceValue || 0)).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                      {item.remarks || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
