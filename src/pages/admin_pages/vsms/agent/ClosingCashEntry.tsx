// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sun,
  Moon,
  Wallet,
  CreditCard,
  Smartphone,
  Banknote,
  MinusCircle,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { submitClosingCash, getCashStatus } from '../services/cashService';
import toast from 'react-hot-toast';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function ClosingCashEntry() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [counts, setCounts] = useState(
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: 0 }), {})
  );
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [remark, setRemark] = useState('');
  const [activeShift, setActiveShift] = useState(1);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageReason, setDamageReason] = useState('');

  useEffect(() => {
    loadStatus();
  }, [user]);

  const loadStatus = async () => {
    try {
      setFetching(true);
      const data = await getCashStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load cash status:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleCountChange = (denom: number, value: string) => {
    const parsed = parseInt(value, 10);
    const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setCounts((prev) => ({ ...prev, [denom]: val }));
  };

  const actualCash = DENOMINATIONS.reduce((sum, d) => {
    return sum + d * (counts[d] || 0);
  }, 0);

  const currentShift = activeShift === 1 ? status?.shifts?.shift1 : status?.shifts?.shift2;
  const isOpeningAssigned = Boolean(currentShift?.openingAssigned);
  const shiftOpening = isOpeningAssigned ? Number(currentShift?.openingCash || 0) : 0;
  const shiftSales = Number(currentShift?.cashSales || 0);
  const shiftUpi = Number(currentShift?.upiSales || 0);
  const shiftCard = Number(currentShift?.cardSales || 0);
  const shiftExpenses = Number(currentShift?.expenses || 0);
  const expectedCash = shiftOpening + shiftSales - shiftExpenses;
  const openingDenoms = currentShift?.openingDenominations || {};
  const isClosingSubmitted = Boolean(currentShift?.closingSubmitted);

  const handleSubmit = async () => {
    if (!isOpeningAssigned) {
      toast.error(`Shift ${activeShift} cannot be closed because no opening float was assigned by the store manager yet.`);
      return;
    }
    setLoading(true);
    try {
      await submitClosingCash({
        vehicleId: user?.assignedVehicle?.id || user?.assignedVehicleId || 'v1',
        actualCash,
        denominations: counts,
        remark,
        shift: activeShift,
      });
      toast.success(`Shift ${activeShift} reconciliation submitted successfully`);
      loadStatus();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || `Failed to submit Shift ${activeShift} cash reconciliation`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Cash Reconciliation
            </h1>
          </div>
          <button
            onClick={loadStatus}
            disabled={fetching}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh from DB"
          >
            <RefreshCw size={16} className={fetching ? 'animate-spin text-[#00891D]' : ''} />
          </button>
        </div>

        {/* 2-Shift Switcher Pill */}
        <div className="bg-white rounded-2xl p-1.5 border border-gray-200/80 shadow-2xs grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveShift(1)}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeShift === 1
                ? 'bg-[#E8F5E9] text-[#00891D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Sun size={15} strokeWidth={2} />
            <span>Shift 1</span>
          </button>
          <button
            onClick={() => setActiveShift(2)}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeShift === 2
                ? 'bg-[#E8F5E9] text-[#00891D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Moon size={15} strokeWidth={2} />
            <span>Shift 2</span>
          </button>
        </div>

        {/* 6 Top KPI Metrics Card */}
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs grid grid-cols-6 gap-1 text-center divide-x divide-gray-50">
          {/* Opening */}
          <div className="px-0.5 space-y-1">
            <div className="w-7 h-7 mx-auto rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center">
              <ShoppingBag size={14} strokeWidth={2} />
            </div>
            <p className="text-[9px] font-bold text-gray-400">Opening</p>
            <p className="text-[10px] font-black text-gray-900 leading-none">
              ₹{shiftOpening.toFixed(2)}
            </p>
          </div>

          {/* Cash */}
          <div className="px-0.5 space-y-1">
            <div className="w-7 h-7 mx-auto rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center">
              <Banknote size={14} strokeWidth={2} />
            </div>
            <p className="text-[9px] font-bold text-gray-400">Cash</p>
            <p className="text-[10px] font-black text-gray-900 leading-none">
              ₹{shiftSales.toFixed(2)}
            </p>
          </div>

          {/* UPI */}
          <div className="px-0.5 space-y-1">
            <div className="w-7 h-7 mx-auto rounded-xl bg-[#FFF3E0] text-[#E65100] flex items-center justify-center">
              <Smartphone size={14} strokeWidth={2} />
            </div>
            <p className="text-[9px] font-bold text-gray-400">UPI</p>
            <p className="text-[10px] font-black text-gray-900 leading-none">
              ₹{shiftUpi.toFixed(2)}
            </p>
          </div>

          {/* Card */}
          <div className="px-0.5 space-y-1">
            <div className="w-7 h-7 mx-auto rounded-xl bg-[#E3F2FD] text-[#1E88E5] flex items-center justify-center">
              <CreditCard size={14} strokeWidth={2} />
            </div>
            <p className="text-[9px] font-bold text-gray-400">Card</p>
            <p className="text-[10px] font-black text-gray-900 leading-none">
              ₹{shiftCard.toFixed(2)}
            </p>
          </div>

          {/* Expenses */}
          <div className="px-0.5 space-y-1">
            <div className="w-7 h-7 mx-auto rounded-xl bg-[#FFEBEE] text-[#E53935] flex items-center justify-center">
              <MinusCircle size={14} strokeWidth={2} />
            </div>
            <p className="text-[9px] font-bold text-gray-400">Expenses</p>
            <p className="text-[10px] font-black text-gray-900 leading-none">
              ₹{shiftExpenses.toFixed(2)}
            </p>
          </div>

          {/* Expected */}
          <div className="px-0.5 space-y-1">
            <div className="w-7 h-7 mx-auto rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center">
              <CheckCircle2 size={14} strokeWidth={2} />
            </div>
            <p className="text-[9px] font-bold text-gray-400">Expected</p>
            <p className="text-[10px] font-black text-[#00891D] leading-none">
              ₹{expectedCash.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Assigned Float Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <Wallet size={20} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400">Assigned Float</p>
                <h3 className="text-xl font-black text-gray-900 mt-0.5">
                  ₹{shiftOpening.toFixed(2)}
                </h3>
              </div>
            </div>

            <div className="text-right">
              {isOpeningAssigned ? (
                <span className="text-[10px] font-extrabold text-[#00891D] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Assigned
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Not Assigned
                </span>
              )}
              <p className="text-[10px] font-semibold text-gray-400 mt-1">
                For Shift {activeShift}
              </p>
            </div>
          </div>

          {!isOpeningAssigned && (
            <div className="text-[11px] font-medium text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-2">
              No opening cash float has been assigned for Shift {activeShift} in the database yet.
            </div>
          )}

          {isClosingSubmitted && (
            <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded-xl px-3 py-2 flex items-center justify-between">
              <span>Shift {activeShift} Closing Already Submitted</span>
              <span className="font-extrabold text-xs">₹{Number(currentShift?.closingActual || 0).toFixed(2)}</span>
            </div>
          )}

          {/* Assigned Float Denominations */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500">
                Assigned Float Denominations
              </p>
              {isOpeningAssigned && (
                <span className="text-[10px] font-bold text-[#00891D]">
                  Live from DB
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {DENOMINATIONS.map((denom) => {
                const count = Number(openingDenoms[denom] || openingDenoms[String(denom)] || 0);
                const active = count > 0;
                return (
                  <div
                    key={denom}
                    className={`rounded-xl p-2 text-center border transition-all ${
                      active
                        ? 'border-[#00891D] bg-[#E8F5E9] text-[#00891D]'
                        : 'border-gray-100 bg-gray-50/60 text-gray-700'
                    }`}
                  >
                    <p className="text-[11px] font-extrabold">₹{denom}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${active ? 'text-[#00891D]' : 'text-gray-400'}`}>
                      × {count}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enter Cash Denominations Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3.5">
          <h3 className="text-sm font-extrabold text-gray-900">
            Enter Cash Denominations
          </h3>

          <div className="space-y-3">
            {DENOMINATIONS.map((denom) => (
              <div
                key={denom}
                className="flex items-center justify-between gap-3"
              >
                {/* Denom Pill */}
                <div className="flex items-center gap-2">
                  <span className="w-14 py-1.5 rounded-xl bg-[#E8F5E9] text-[#00891D] font-bold text-xs text-center border border-emerald-100/80">
                    ₹{denom}
                  </span>
                  <span className="text-xs font-bold text-gray-400">×</span>
                </div>

                {/* Input Box */}
                <div className="w-24 bg-white border border-gray-200 rounded-xl px-2 py-1.5 flex items-center justify-center shadow-2xs">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    min="0"
                    value={counts[denom] === 0 ? '0' : counts[denom]}
                    onChange={(e) => handleCountChange(denom, e.target.value)}
                    className="w-full text-center text-xs font-extrabold text-gray-900 bg-transparent outline-none"
                  />
                </div>

                {/* Line Total */}
                <div className="w-20 text-right">
                  <span className="text-xs font-bold text-gray-900">
                    ₹{((counts[denom] || 0) * denom).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Actual Total Cost Section */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Actual Total Cost</span>
            <span className="text-lg font-black text-gray-900">
              ₹{actualCash.toFixed(2)}
            </span>
          </div>

          {/* Explain Difference Section */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-gray-900">
              Explain Difference <span className="text-red-500">*</span>
            </label>
            <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs">
              <textarea
                rows={3}
                placeholder="Why is there a difference?"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
              />
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowDamageModal(true)}
              className="py-3.5 bg-[#FF0000] hover:bg-[#D90000] text-white rounded-2xl text-xs font-extrabold shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              Report Damage
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                `Submit Shift -${activeShift}`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── REPORT DAMAGE MODAL ── */}
      {showDamageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDamageModal(false)}
        >
          <div
            className="bg-white w-full max-w-[320px] rounded-3xl p-5 space-y-4 shadow-xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-extrabold text-gray-900 leading-snug">
              Enter the Reason for No Service / Damage<br />
              <span className="text-[11px] font-semibold text-gray-500">
                (Flat Tyre, Vehicle Damage, etc.)
              </span>
            </h3>

            <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs">
              <textarea
                rows={3}
                placeholder="Enter the reason for damage"
                value={damageReason}
                onChange={(e) => setDamageReason(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowDamageModal(false)}
                className="py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl text-xs font-bold shadow-2xs active:scale-98 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.error(`Shift ${activeShift} marked with damage report`);
                  setShowDamageModal(false);
                  setDamageReason('');
                }}
                className="py-3 bg-[#FF0000] hover:bg-[#D90000] text-white rounded-2xl text-xs font-extrabold shadow-2xs active:scale-98 transition-all cursor-pointer"
              >
                Submit Damage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
