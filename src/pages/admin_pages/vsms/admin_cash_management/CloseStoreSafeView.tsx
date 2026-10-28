import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Vault, Wallet, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getStoreCashRegister, closeStoreCashRegister, updateStoreCashRegister } from '../services/cashService';
import { useCashSocket } from '../../../../hooks/useCashSocket';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function CloseStoreSafeView({ 
  onBack, 
  onClose, 
  onSuccess,
  storeRegisterData: propsStoreRegisterData, 
  date = format(new Date(), 'yyyy-MM-dd'),
  storeFilterId 
}) {
  const [storeRegisterData, setStoreRegisterData] = useState(propsStoreRegisterData || null);
  const [loadingRegister, setLoadingRegister] = useState(!propsStoreRegisterData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useCashSocket({
    date,
    storeId: storeFilterId,
    onUpdate: () => fetchRegister()
  });

  const [denominations, setDenominations] = useState({
    "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
  });
  const [remarks, setRemarks] = useState('');

  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  const applyInitialDenominations = (data) => {
    const reg = data?.storeRegister;
    if (reg?.closingDenominations && typeof reg.closingDenominations === 'object') {
      const merged = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
      Object.entries(reg.closingDenominations).forEach(([k, v]) => {
        merged[k] = parseInt(v) || 0;
      });
      setDenominations(merged);
      if (reg.closingRemarks) setRemarks(reg.closingRemarks);
    } else if (reg?.openingDenominations && typeof reg.openingDenominations === 'object') {
      const merged = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
      Object.entries(reg.openingDenominations).forEach(([k, v]) => {
        merged[k] = parseInt(v) || 0;
      });
      setDenominations(merged);
    }
  };

  const fetchRegister = async () => {
    setLoadingRegister(true);
    try {
      const data = await getStoreCashRegister(date, storeFilterId);
      setStoreRegisterData(data);
      applyInitialDenominations(data);
    } catch (err) {
      console.error('Failed to fetch store cash register:', err);
    } finally {
      setLoadingRegister(false);
    }
  };

  useEffect(() => {
    if (!propsStoreRegisterData) {
      fetchRegister();
    } else {
      setStoreRegisterData(propsStoreRegisterData);
      applyInitialDenominations(propsStoreRegisterData);
    }
  }, [propsStoreRegisterData, date, storeFilterId]);

  const expectedCash = storeRegisterData?.liveMetrics?.availableCash || 0;
  const safeCash = storeRegisterData?.liveMetrics?.safeBalance || 0;
  const totalStoreCash = storeRegisterData?.liveMetrics?.totalStoreCash || (expectedCash + safeCash);

  const openingDenoms = storeRegisterData?.storeRegister?.openingDenominations || null;

  const handleFillOpeningDenoms = () => {
    if (!openingDenoms) return;
    const merged = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
    Object.entries(openingDenoms).forEach(([k, v]) => {
      merged[k] = parseInt(v) || 0;
    });
    setDenominations(merged);
    toast.success('Filled with opening denominations');
  };

  const handleClearDenoms = () => {
    setDenominations({ "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 });
    toast.success('Denominations reset to zero');
  };

  // Compute total counted value dynamically from denominations
  const totalCounted = Object.entries(denominations).reduce((sum, [denom, count]) => {
    return sum + (Number(denom) * (Number(count) || 0));
  }, 0);

  const variance = totalCounted - expectedCash;
  const isVariance = Math.abs(variance) > 0.01;

  const handleDenomChange = (val, denom) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setDenominations(prev => ({
      ...prev,
      [denom]: qty
    }));
  };

  const handleConfirmClose = async () => {
    if (isVariance && !remarks.trim()) {
      toast.error('Description required for cash variance');
      return;
    }

    setIsSubmitting(true);
    try {
      if (storeRegisterData?.storeRegister?.status === 'CLOSED') {
        await updateStoreCashRegister({ 
          date, 
          actualClosingCash: totalCounted, 
          denominations, 
          remarks, 
          isClosingUpdate: true, 
          storeId: storeFilterId 
        });
      } else {
        await closeStoreCashRegister({ 
          date, 
          actualClosingCash: totalCounted, 
          denominations, 
          remarks, 
          storeId: storeFilterId 
        });
      }

      toast.success('Store safe closed successfully!');
      if (onSuccess) onSuccess();
      else handleBack();
    } catch (err) {
      console.error('Failed to close store safe:', err);
      toast.error(err.response?.data?.message || 'Failed to close store safe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          type="button"
          className="text-gray-600 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-xl hover:bg-gray-200/60 cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Close Store Safe</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Final physical end of day count</p>
        </div>
      </div>

      {/* Main Form Card Container */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6">
        {/* Cash Holding Breakdown: Counter Cash, Persistent Safe, and Combined Store Cash */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Expected Counter Cash</span>
              <Wallet size={16} className="text-emerald-600" />
            </div>
            <span className="text-xl font-black text-[#0e8345] tabular-nums mt-2">
              ₹{expectedCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium mt-1">To count physically below</span>
          </div>

          <div className="bg-blue-50/80 border border-blue-200/60 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">Safe Balance (Persistent)</span>
              <Vault size={16} className="text-blue-600" />
            </div>
            <span className="text-xl font-black text-blue-700 tabular-nums mt-2">
              ₹{safeCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-blue-600 font-medium mt-1">Stays inside safe across days</span>
          </div>

          <div className="bg-gray-50/80 border border-gray-200/60 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Total Store Cash</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Counter + Safe</span>
            </div>
            <span className="text-xl font-black text-gray-900 tabular-nums mt-2">
              ₹{totalStoreCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-500 font-medium mt-1">Combined store cash holding</span>
          </div>
        </div>

        {/* Section: Active Physical Denominations */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Active Physical Denominations</h4>
              <p className="text-[11px] text-gray-400 font-medium">Count each note/coin in the counter cash drawer</p>
            </div>
            <div className="flex items-center gap-2">
              {openingDenoms && (
                <button
                  type="button"
                  onClick={handleFillOpeningDenoms}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0e8345] text-xs font-bold rounded-xl border border-emerald-200 transition-all cursor-pointer active:scale-95"
                  title="Populate table with the opening cash denominations"
                >
                  <Sparkles size={13} />
                  <span>Use Opening Denominations</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClearDenoms}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-95"
                title="Reset all counts to 0"
              >
                <RefreshCw size={12} />
                <span>Reset</span>
              </button>
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/80 border-b border-gray-200">
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">DENOMINATION</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">COUNT</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {denominationsList.map((denom) => {
                  const count = denominations[denom] ?? 0;
                  const rowAmount = (Number(count) || 0) * denom;
                  return (
                    <tr key={denom} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-semibold text-gray-800">
                        ₹{denom}.00
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={denominations[denom] !== undefined ? denominations[denom] : 0}
                          onChange={(e) => handleDenomChange(e.target.value, denom)}
                          className="w-28 text-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </td>
                      <td className="px-6 py-3.5 text-xs font-bold text-gray-900 text-right tabular-nums">
                        ₹{rowAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <td className="px-6 py-4 text-xs font-bold text-gray-900">
                    Total Float Amount
                  </td>
                  <td></td>
                  <td className="px-6 py-4 text-sm font-bold text-[#0e8345] text-right tabular-nums">
                    ₹{totalCounted.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section: Remarks */}
        <div>
          <label className="block text-xs font-bold text-gray-900 mb-2">
            Remarks {isVariance && <span className="text-rose-500">*</span>}
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter the reason for variance or closing notes..."
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Bottom Summary Metrics and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-6 w-full sm:w-auto">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-0.5">Total Counted Value</p>
              <p className="text-base font-bold text-[#0e8345] tabular-nums">
                ₹{totalCounted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-0.5">Total Variance</p>
              <p className={`text-base font-bold tabular-nums ${variance < 0 ? 'text-rose-600' : variance > 0 ? 'text-amber-600' : 'text-[#0e8345]'}`}>
                {variance === 0 ? '₹0.00' : variance > 0 ? `+₹${variance.toFixed(2)}` : `-₹${Math.abs(variance).toFixed(2)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleBack}
              className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClose}
              disabled={isSubmitting || (isVariance && !remarks.trim())}
              className="px-8 py-3 bg-[#0e8345] hover:bg-[#0c6f3a] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm & Close Store'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
