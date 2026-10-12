// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminReconciliation, createStoreDeposit } from '../services/cashService';
import { format } from 'date-fns';
import { useCashSocket } from '../../../../hooks/useCashSocket';

export default function DepositShiftCashReportView({ 
  onBack, 
  onClose, 
  summaries: propsSummaries, 
  date = format(new Date(), 'yyyy-MM-dd'),
  storeFilterId,
  isGlobalRole = true,
  fetchSummaries: propsFetchSummaries,
  fetchStoreRegister: propsFetchStoreRegister
}) {
  const [selectedShift, setSelectedShift] = useState(1);
  const [summaries, setSummaries] = useState(propsSummaries || []);
  const [loading, setLoading] = useState(!propsSummaries);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useCashSocket({
    date,
    storeId: storeFilterId,
    onUpdate: () => loadData()
  });

  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminReconciliation(date, storeFilterId);
      setSummaries(data);
    } catch (err) {
      console.error('Error fetching reconciliation for shift report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!propsSummaries) {
      loadData();
    } else {
      setSummaries(propsSummaries);
    }
  }, [propsSummaries, date, storeFilterId]);

  const shiftKey = `shift${selectedShift}`;
  
  // Filter agents who had opening cash for this shift
  const shiftAgents = summaries.filter(s => s.shiftDetails?.[shiftKey]?.opening);

  // Check if this shift has already been deposited
  const firstWithDep = shiftAgents.find(s => s.shiftDetails?.[shiftKey]?.deposit);
  const isDeposited = !!firstWithDep?.shiftDetails?.[shiftKey]?.deposit;

  // Calculate total cash collected for this shift
  const totalCashCollected = shiftAgents.reduce((sum, s) => {
    return sum + (Number(s.shiftDetails?.[shiftKey]?.closing?.actualCash) || 0);
  }, 0);

  const handleDepositShiftToSafe = async () => {
    if (totalCashCollected <= 0) {
      toast.error('No cash collected for this shift');
      return;
    }
    setIsSubmitting(true);
    try {
      const totalDenoms = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
      shiftAgents.forEach(s => {
        const closingDenoms = s.shiftDetails?.[shiftKey]?.closing?.denominations;
        if (closingDenoms) {
          Object.keys(closingDenoms).forEach(d => {
            totalDenoms[d] = (totalDenoms[d] || 0) + (parseInt(closingDenoms[d]) || 0);
          });
        }
      });

      await createStoreDeposit({
        shift: selectedShift,
        amount: totalCashCollected,
        denominations: totalDenoms,
        description: `Shift ${selectedShift} Cash Safe Deposit`,
        date,
        storeId: storeFilterId
      });

      toast.success(`Shift ${selectedShift} cash deposited to safe successfully!`);
      if (propsFetchSummaries) propsFetchSummaries();
      if (propsFetchStoreRegister) propsFetchStoreRegister();
      loadData();
    } catch (err) {
      console.error('Failed to deposit shift cash:', err);
      toast.error(err.response?.data?.message || 'Failed to deposit shift cash');
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Deposit Shift Cash Report</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Review agent collections & submit to store safe</p>
        </div>
      </div>

      {/* Segmented Shift Tabs */}
      <div className="inline-flex bg-white border border-gray-200 rounded-2xl p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setSelectedShift(1)}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
            selectedShift === 1
              ? 'text-[#0e8345] bg-white'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Shift - 1
          {selectedShift === 1 && (
            <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#0e8345] rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setSelectedShift(2)}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
            selectedShift === 2
              ? 'text-[#0e8345] bg-white'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Shift - 2
          {selectedShift === 2 && (
            <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#0e8345] rounded-full" />
          )}
        </button>
      </div>

      {/* Main Content Card Container */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6">
        {/* Card Header Row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">
              Shift-{selectedShift} Collection Report
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {isDeposited ? 'Finalized and deposited to safe' : 'Review collections and submit to store safe'}
            </p>
          </div>

          {/* Status Badge */}
          {isDeposited ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full text-xs font-bold text-[#0e8345]">
              <CheckCircle2 size={13} />
              <span>Completed</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/60 rounded-full text-xs font-bold text-amber-600">
              <span>Pending</span>
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100/80 border-b border-gray-200">
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider text-left">
                  AGENT INFO
                </th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">
                  CASH COLLECTED
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-xs text-gray-400 font-medium">
                    Loading collections data...
                  </td>
                </tr>
              ) : shiftAgents.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-xs text-gray-400 font-medium">
                    No collection records found for Shift {selectedShift}
                  </td>
                </tr>
              ) : (
                shiftAgents.map((agentSum) => {
                  const details = agentSum.shiftDetails?.[shiftKey];
                  const agentName = agentSum.vehicle?.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role))?.name 
                    || agentSum.agent?.name 
                    || 'Agent';
                  const vehicleNum = agentSum.vehicle?.vehicleNumber || agentSum.vehicle?.vehicleName || 'TATA ACE';
                  const cashCollected = Number(details?.closing?.actualCash) || 0;

                  return (
                    <tr key={agentSum.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-[#0e8345] border border-emerald-100 flex items-center justify-center flex-shrink-0">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{agentName}</p>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{vehicleNum}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="text-xs font-bold text-gray-900 tabular-nums">
                          ₹{cashCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-emerald-100 bg-emerald-50/50">
                <td className="px-6 py-4 text-xs font-bold text-gray-900">
                  Total Float Amount
                </td>
                <td className="px-6 py-4 text-base md:text-lg font-bold text-[#0e8345] text-right tabular-nums">
                  ₹{totalCashCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Deposit Action if not yet deposited */}
        {!isDeposited && shiftAgents.length > 0 && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleDepositShiftToSafe}
              disabled={isSubmitting || totalCashCollected <= 0}
              className="px-8 py-3 bg-[#0e8345] hover:bg-[#0c6f3a] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : `Deposit Shift ${selectedShift} Cash to Store Safe`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
