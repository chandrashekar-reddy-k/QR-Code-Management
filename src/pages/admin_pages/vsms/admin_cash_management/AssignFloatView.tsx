// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import adminAPI from '../services/adminService';
import { adminSubmitOpeningCash } from '../services/cashService';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function AssignFloatView({ 
  onClose, 
  onBack, 
  onSuccess, 
  assignmentData: propsAssignmentData, 
  setAssignmentData: propsSetAssignmentData, 
  vehicles: propsVehicles, 
  agents: propsAgents, 
  summaries = [], 
  handleDenominationChange: propsHandleDenomChange, 
  handleAssignFloat: propsHandleAssignFloat, 
  isSubmitting: propsIsSubmitting 
}) {
  // If controlled by parent
  const isControlled = !!propsAssignmentData && !!propsSetAssignmentData;

  // Local state for standalone mode
  const [localAgents, setLocalAgents] = useState([]);
  const [localVehicles, setLocalVehicles] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submittingLocal, setSubmittingLocal] = useState(false);

  const [localData, setLocalData] = useState({
    shift: 1,
    agentId: '',
    vehicleId: '',
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  useEffect(() => {
    if (!isControlled) {
      const loadInitialData = async () => {
        setLoadingData(true);
        try {
          const [agRes, vehRes] = await Promise.all([
            adminAPI.getAgents().catch(() => ({ data: [] })),
            adminAPI.getVehicles().catch(() => ({ data: [] }))
          ]);
          setLocalAgents(agRes.data || []);
          setLocalVehicles(vehRes.data || []);
        } catch (err) {
          console.error('Error loading agents/vehicles in AssignFloatView:', err);
        } finally {
          setLoadingData(false);
        }
      };
      loadInitialData();
    }
  }, [isControlled]);

  const agents = isControlled ? (propsAgents || []) : localAgents;
  const vehicles = isControlled ? (propsVehicles || []) : localVehicles;
  const assignmentData = isControlled ? propsAssignmentData : localData;

  // Calculate total amount dynamically from denominations
  const denomsObj = assignmentData.denominations || {};
  const totalAmount = Object.entries(denomsObj).reduce((sum, [denom, count]) => {
    return sum + (Number(denom) * (Number(count) || 0));
  }, 0);

  const handleLocalDenomChange = (val, denom) => {
    const qty = Math.max(0, parseInt(val) || 0);
    if (isControlled && propsHandleDenomChange) {
      propsHandleDenomChange(val, denom, 'assign');
    } else {
      setLocalData(prev => ({
        ...prev,
        denominations: {
          ...prev.denominations,
          [denom]: qty
        }
      }));
    }
  };

  const handleShiftChange = (e) => {
    const shiftVal = parseInt(e.target.value);
    if (isControlled) {
      propsSetAssignmentData({ ...assignmentData, shift: shiftVal });
    } else {
      setLocalData(prev => ({ ...prev, shift: shiftVal }));
    }
  };

  const handleSelectAgentVehicle = (e) => {
    const selectedVal = e.target.value;
    const agentObj = agents.find(a => a.id === selectedVal);
    let agentId = '';
    let vehicleId = '';

    if (agentObj) {
      agentId = selectedVal;
      vehicleId = agentObj?.assignedVehicleId || agentObj?.assignedVehicle?.id || '';
    } else {
      const vehObj = vehicles.find(v => v.id === selectedVal);
      const agentOnVeh = vehObj?.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role));
      agentId = agentOnVeh?.id || selectedVal;
      vehicleId = vehObj?.id || selectedVal;
    }

    if (isControlled) {
      propsSetAssignmentData({ ...assignmentData, agentId, vehicleId });
    } else {
      setLocalData(prev => ({ ...prev, agentId, vehicleId }));
    }
  };

  const handleConfirmAssignment = async () => {
    if (isControlled && propsHandleAssignFloat) {
      propsHandleAssignFloat();
      return;
    }

    if (!assignmentData.agentId && !assignmentData.vehicleId) {
      toast.error('Please select a vehicle or agent');
      return;
    }

    setSubmittingLocal(true);
    try {
      await adminSubmitOpeningCash({
        shift: assignmentData.shift || 1,
        agentId: assignmentData.agentId,
        vehicleId: assignmentData.vehicleId,
        date: format(new Date(), 'yyyy-MM-dd'),
        denominations: assignmentData.denominations,
        openingCash: totalAmount,
        totalOpeningCash: totalAmount
      });
      toast.success('Float assigned successfully!');
      if (onSuccess) onSuccess();
      else handleBack();
    } catch (error) {
      console.error('Failed to assign float:', error);
      toast.error(error.response?.data?.message || 'Failed to assign float');
    } finally {
      setSubmittingLocal(false);
    }
  };

  const isSubmitting = isControlled ? propsIsSubmitting : submittingLocal;

  // Selected agent/vehicle value for controlled/uncontrolled select
  const currentSelectVal = assignmentData.agentId || assignmentData.vehicleId || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          type="button"
          className="text-gray-600 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-xl hover:bg-gray-200/60"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Assign Float</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Daily Opening Cash</p>
        </div>
      </div>

      {/* Main Form Card Container */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6">
        {/* Field 1: Select Shift */}
        <div>
          <label className="block text-xs font-bold text-gray-900 mb-2">Select Shift</label>
          <div className="relative">
            <select
              value={assignmentData.shift || 1}
              onChange={handleShiftChange}
              className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pr-10 shadow-2xs"
            >
              <option value={1}>Shift - 1</option>
              <option value={2}>Shift - 2</option>
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Field 2: Select Vehicle/Agent */}
        <div>
          <label className="block text-xs font-bold text-gray-900 mb-2">Select Vehicle/Agent</label>
          <div className="relative">
            <select
              required
              value={currentSelectVal}
              onChange={handleSelectAgentVehicle}
              className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pr-10 shadow-2xs"
            >
              <option value="">Select vehicle / agent...</option>
              {agents.filter(a => a.assignedVehicle || a.assignedVehicleId).map((a) => {
                const vehNum = a.assignedVehicle?.vehicleNumber || a.assignedVehicle?.vehicleName || '';
                return (
                  <option key={a.id} value={a.id}>
                    {vehNum ? `${vehNum} - ${a.name}` : a.name}
                  </option>
                );
              })}
              {/* Fallback vehicles if not mapped in agents array */}
              {vehicles.filter(v => !agents.some(a => (a.assignedVehicleId === v.id || a.assignedVehicle?.id === v.id))).map((v) => {
                const agent = v.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role));
                return (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber || v.vehicleName}{agent ? ` - ${agent.name}` : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Field 3: Denominations */}
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
                  const count = assignmentData.denominations?.[denom] ?? 0;
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
                          value={assignmentData.denominations?.[denom] !== undefined ? assignmentData.denominations[denom] : 0}
                          onChange={(e) => handleLocalDenomChange(e.target.value, denom)}
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
                    ₹{totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmAssignment}
          disabled={isSubmitting || (!assignmentData.agentId && !assignmentData.vehicleId)}
          className="px-8 py-3 bg-[#0e8345] hover:bg-[#0c6f3a] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm Assignment'}
        </button>
      </div>
    </div>
  );
}
