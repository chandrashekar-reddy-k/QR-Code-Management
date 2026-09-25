// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getStoreCashRegister, createSafeMovement } from '../services/cashService';
import { useCashSocket } from '../../../../hooks/useCashSocket';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function SafeMovementView({ 
  onBack, 
  onClose, 
  onSuccess,
  storeRegisterData: propsStoreRegisterData, 
  date = format(new Date(), 'yyyy-MM-dd'),
  storeFilterId 
}) {
  const [movementType, setMovementType] = useState('DEPOSIT_TO_SAFE'); // 'DEPOSIT_TO_SAFE' or 'WITHDRAW_TO_COUNTER'
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
  const [description, setDescription] = useState('');

  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  const fetchRegister = async () => {
    setLoadingRegister(true);
    try {
      const data = await getStoreCashRegister(date, storeFilterId);
      setStoreRegisterData(data);
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
    }
  }, [propsStoreRegisterData, date, storeFilterId]);

  // Metric balances
  const availableCounterCash = storeRegisterData?.liveMetrics?.availableCash || 0;
  const inSafeCash = storeRegisterData?.liveMetrics?.safeTotal || 0;

  // Calculate total movement amount dynamically from denominations
  const totalMovement = Object.entries(denominations).reduce((sum, [denom, count]) => {
    return sum + (Number(denom) * (Number(count) || 0));
  }, 0);

  const handleDenomChange = (val, denom) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setDenominations(prev => ({
      ...prev,
      [denom]: qty
    }));
  };

  const handleConfirmMovement = async () => {
    if (totalMovement <= 0) {
      toast.error('Please enter valid denomination counts for movement');
      return;
    }

    if (movementType === 'DEPOSIT_TO_SAFE' && totalMovement > availableCounterCash + 0.01) {
      toast.error('Movement amount cannot exceed available counter cash');
      return;
    }

    if (movementType === 'WITHDRAW_TO_COUNTER' && totalMovement > inSafeCash + 0.01) {
      toast.error('Movement amount cannot exceed available safe cash');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSafeMovement({
        date,
        amount: totalMovement,
        type: movementType,
        description: description || (movementType === 'DEPOSIT_TO_SAFE' ? 'Move to Safe' : 'Bring to Counter'),
        denominations,
        storeId: storeFilterId
      });

      toast.success(
        movementType === 'DEPOSIT_TO_SAFE' 
          ? 'Cash moved to safe successfully!' 
          : 'Cash brought to counter successfully!'
      );
      if (onSuccess) onSuccess();
      else handleBack();
    } catch (err) {
      console.error('Failed to execute safe movement:', err);
      toast.error(err.response?.data?.message || 'Failed to execute safe movement');
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Safe Movement</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Internal Cash Transfer</p>
        </div>
      </div>

      {/* Main Form Card Container */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6">
        {/* Direction Segmented Control */}
        <div className="inline-flex bg-white border border-gray-200 rounded-2xl p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setMovementType('DEPOSIT_TO_SAFE')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
              movementType === 'DEPOSIT_TO_SAFE'
                ? 'text-[#0e8345] bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Move to Safe
            {movementType === 'DEPOSIT_TO_SAFE' && (
              <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#0e8345] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMovementType('WITHDRAW_TO_COUNTER')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
              movementType === 'WITHDRAW_TO_COUNTER'
                ? 'text-[#0e8345] bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Bring to Counter
            {movementType === 'WITHDRAW_TO_COUNTER' && (
              <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#0e8345] rounded-full" />
            )}
          </button>
        </div>

        {/* Section: Denominations */}
        <div>
          <h4 className="text-xs font-bold text-gray-900 mb-3">Denominations</h4>
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
            </table>
          </div>
        </div>

        {/* Section: Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-900 mb-2">Notes</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter the reason for safe movement or ..."
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Bottom Summary Metrics and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-8 w-full sm:w-auto">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-0.5">Total Movement</p>
              <p className="text-base md:text-lg font-bold text-[#0e8345] tabular-nums">
                ₹{totalMovement.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-0.5">
                {movementType === 'DEPOSIT_TO_SAFE' ? 'Available Balance' : 'In Safe'}
              </p>
              <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums">
                ₹{(movementType === 'DEPOSIT_TO_SAFE' ? availableCounterCash : inSafeCash).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              onClick={handleConfirmMovement}
              disabled={isSubmitting || totalMovement <= 0}
              className="px-8 py-3 bg-[#0e8345] hover:bg-[#0c6f3a] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm & Move'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
