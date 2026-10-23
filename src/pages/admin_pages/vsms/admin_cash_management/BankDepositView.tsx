// @ts-nocheck
import React, { useState } from 'react';
import { ArrowLeft, Upload, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { addBankDeposit } from '../services/cashService';
import adminAPI from '../services/adminService';
import { useUserStore } from '../store/userStore';

export default function BankDepositView({ 
  onBack, 
  onClose, 
  onSuccess,
  storeRegisterData,
  date = format(new Date(), 'yyyy-MM-dd'),
  storeFilterId 
}) {
  const user = useUserStore(s => s.user);
  const [amount, setAmount] = useState('');
  const [branchName, setBranchName] = useState('');
  const [depositedBy, setDepositedBy] = useState(user?.name || user?.fullName || 'Suresh Reddy');
  const [verifiedBy, setVerifiedBy] = useState(user?.name || user?.fullName || 'Suresh Reddy');
  const [receiptImage, setReceiptImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available in safe cash
  const safeBalance = Math.max(0, storeRegisterData?.liveMetrics?.safeBalance || 0);

  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await adminAPI.uploadImage(formData);
      if (data?.url) {
        setReceiptImage(data.url);
        toast.success('Deposit slip uploaded successfully');
      }
    } catch (err) {
      console.error('File upload error:', err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmTransfer = async (e) => {
    e?.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      toast.error('Please enter a valid amount to transfer');
      return;
    }

    if (numAmount > safeBalance) {
      toast.error(`Transfer amount exceeds Available Safe Cash (Max: ₹${safeBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addBankDeposit({
        date,
        amount: numAmount,
        branchName,
        depositedBy,
        verifiedBy,
        receiptImage,
        adminId: user?.id,
        storeId: storeFilterId
      });

      toast.success('Bank deposit created successfully from safe!');
      if (onSuccess) onSuccess();
      else handleBack();
    } catch (err) {
      console.error('Failed to create bank deposit:', err);
      toast.error(err.response?.data?.message || 'Failed to create bank deposit');
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Bank Deposit</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Transfer cash from safe to Account</p>
        </div>
      </div>

      {/* Main Form Card Container */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Safe Balance Info Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0e8345] text-white flex items-center justify-center font-bold shadow-xs">
              ₹
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Available Safe Balance</p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                Bank transfers can only be processed from available safe funds
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-[#0e8345] tabular-nums">
              ₹{safeBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Amount to Transfer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-900">Amount to Transfer</label>
              <span className="text-[10px] font-semibold text-gray-400">
                Max: ₹{safeBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <input
              type="number"
              min="0"
              max={safeBalance}
              step="any"
              placeholder="₹0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full bg-white border rounded-2xl px-4 py-3.5 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-2xs placeholder:text-gray-400 ${
                parseFloat(amount) > safeBalance
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 text-rose-600'
                  : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
            />
            {parseFloat(amount) > safeBalance && (
              <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                ⚠️ Transfer amount exceeds available safe balance (₹{safeBalance.toFixed(2)})
              </p>
            )}
          </div>

          {/* Branch to Transfer */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">Branch to Transfer</label>
            <input
              type="text"
              placeholder="Eg: HDFC MAIN BRANCH"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs placeholder:text-gray-400"
            />
          </div>

          {/* Deposited By */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">Deposited By</label>
            <input
              type="text"
              value={depositedBy}
              onChange={(e) => setDepositedBy(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
            />
          </div>

          {/* Verified By */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">Verified By</label>
            <input
              type="text"
              value={verifiedBy}
              onChange={(e) => setVerifiedBy(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Deposit Slip Section */}
        <div>
          <label className="block text-xs font-bold text-gray-900 mb-2">Deposit Slip</label>
          <label className="border-2 border-dashed border-gray-200 rounded-3xl p-8 bg-gray-50/50 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/20 transition-all relative group">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploading ? (
              <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
            ) : receiptImage ? (
              <div className="flex items-center gap-2 text-[#0e8345] font-bold text-xs">
                <CheckCircle2 size={24} />
                <span>Deposit Slip Uploaded Successfully</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100/80 text-[#0e8345] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={22} />
                </div>
                <p className="text-xs font-bold text-gray-900">Click to Upload or Drag & Drop</p>
                <p className="text-[10px] font-semibold text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
              </>
            )}
          </label>
        </div>

        {/* Bottom Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmTransfer}
            disabled={isSubmitting || uploading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > safeBalance || safeBalance <= 0}
            className="px-8 py-3 bg-[#0e8345] hover:bg-[#0c6f3a] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm Bank Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
