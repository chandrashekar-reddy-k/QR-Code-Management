import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ChevronDown, Loader2, CheckCircle2, AlertTriangle, Info, RotateCcw, Coins } from 'lucide-react';
import toast from 'react-hot-toast';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function AssignFloatView({ 
  onClose, assignmentData, setAssignmentData, vehicles = [], agents = [], summaries = [], 
  handleDenominationChange, handleAssignFloat, isSubmitting 
}) {
  const currentShift = assignmentData.shift || 1;
  const currentSelectVal = assignmentData.agentId || assignmentData.vehicleId || '';

  const selectedAgent = agents.find(a => a.id === currentSelectVal || a.id === assignmentData.agentId);
  const selectedVehicle = vehicles.find(v => 
    v.id === currentSelectVal || 
    v.id === assignmentData.vehicleId || 
    v.id === selectedAgent?.assignedVehicleId || 
    v.id === selectedAgent?.assignedVehicle?.id
  );

  const effectiveAgentId = assignmentData.agentId || selectedAgent?.id || (currentSelectVal !== selectedVehicle?.id ? currentSelectVal : '');
  const effectiveVehicleId = assignmentData.vehicleId || selectedVehicle?.id || selectedAgent?.assignedVehicleId || selectedAgent?.assignedVehicle?.id || '';

  // Look up existing summary for the selected agent / vehicle
  const existingSummary = summaries.find(s => {
    if (effectiveVehicleId && (s.vehicleId === effectiveVehicleId || s.vehicle?.id === effectiveVehicleId)) {
      return true;
    }
    if (effectiveAgentId) {
      if (s.vehicle?.assignedUsers?.some(u => u.id === effectiveAgentId)) return true;
      if (s.user?.id === effectiveAgentId) return true;
      if (s.shiftDetails?.shift1?.opening?.userId === effectiveAgentId) return true;
      if (s.shiftDetails?.shift2?.opening?.userId === effectiveAgentId) return true;
      if (s.shiftDetails?.shift1?.opening?.user?.id === effectiveAgentId) return true;
      if (s.shiftDetails?.shift2?.opening?.user?.id === effectiveAgentId) return true;
    }
    return false;
  });

  const shiftKey = `shift${currentShift}`;
  const existingShiftData = existingSummary?.shiftDetails?.[shiftKey];
  const existingOpening = existingShiftData?.opening;
  const isAlreadyAssigned = !!existingOpening && !existingOpening.isNoService;
  const alreadyAssignedAmount = existingOpening ? (Number(existingOpening.totalOpeningCash) || 0) : 0;
  const alreadyAssignedDenoms = existingOpening?.denominations || {};

  const alreadyAssignedBreakdown = denominationsList
    .filter(d => (parseInt(alreadyAssignedDenoms[d]) || 0) > 0)
    .map(d => ({ denom: d, count: parseInt(alreadyAssignedDenoms[d]) }));

  const isShift1Closed = !!existingSummary?.shiftDetails?.shift1?.closing;
  const isShift2Blocked = currentShift === 2 && !isShift1Closed;

  const denomsObj = assignmentData.denominations || {};
  const totalAmount = Object.entries(denomsObj).reduce((sum, [denom, count]) => {
    return sum + (Number(denom) * (Number(count) || 0));
  }, 0);

  const diffAmount = totalAmount - alreadyAssignedAmount;

  const lastLoadedRef = useRef('');

  useEffect(() => {
    if (!currentSelectVal) {
      lastLoadedRef.current = '';
      return;
    }

    const targetKey = `${currentSelectVal}_s${currentShift}_${existingOpening?.id || 'none'}_${alreadyAssignedAmount}`;
    if (lastLoadedRef.current !== targetKey) {
      lastLoadedRef.current = targetKey;

      if (isAlreadyAssigned && existingOpening?.denominations) {
        const newDenoms = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
        Object.entries(existingOpening.denominations).forEach(([d, c]) => {
          newDenoms[d] = parseInt(c) || 0;
        });
        const assignedTotal = Number(existingOpening.totalOpeningCash) || 0;

        setAssignmentData(prev => ({
          ...prev,
          denominations: newDenoms,
          amount: assignedTotal
        }));
      }
    }
  }, [currentSelectVal, currentShift, isAlreadyAssigned, existingOpening?.id, alreadyAssignedAmount]);

  const handleResetToAssigned = () => {
    if (!isAlreadyAssigned || !existingOpening?.denominations) return;
    const newDenoms = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
    Object.entries(existingOpening.denominations).forEach(([d, c]) => {
      newDenoms[d] = parseInt(c) || 0;
    });
    setAssignmentData(prev => ({
      ...prev,
      denominations: newDenoms,
      amount: Number(existingOpening.totalOpeningCash) || 0
    }));
    toast.success('Reset to assigned values');
  };

  const getAssignedFloatForOption = (agentId, vehicleId, targetShift) => {
    const sKey = `shift${targetShift}`;
    const sum = summaries.find(s => {
      if (vehicleId && (s.vehicleId === vehicleId || s.vehicle?.id === vehicleId)) return true;
      if (agentId) {
        if (s.vehicle?.assignedUsers?.some(u => u.id === agentId)) return true;
        if (s.user?.id === agentId) return true;
        if (s.shiftDetails?.[sKey]?.opening?.userId === agentId) return true;
      }
      return false;
    });
    const op = sum?.shiftDetails?.[sKey]?.opening;
    if (op && !op.isNoService && op.totalOpeningCash !== undefined) {
      return Number(op.totalOpeningCash);
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1 rounded-lg"
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Assign Float</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Daily Opening Cash</p>
          </div>
        </div>
        {isAlreadyAssigned && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
            <Coins size={14} className="text-amber-600" />
            <span>Assigned: ₹{alreadyAssignedAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
        {/* Field 1: Select Shift */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Select Shift</label>
          <div className="relative">
            <select
              value={currentShift}
              onChange={(e) => {
                lastLoadedRef.current = '';
                setAssignmentData({ ...assignmentData, shift: parseInt(e.target.value) });
              }}
              className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors pr-10"
            >
              <option value={1}>Shift - 1</option>
              <option value={2}>Shift - 2</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Field 2: Select Vehicle/Agent */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Select Vehicle/Agent</label>
          <div className="relative">
            <select
              required
              value={currentSelectVal}
              onChange={(e) => {
                const selectedVal = e.target.value;
                lastLoadedRef.current = '';
                const agentObj = agents.find(a => a.id === selectedVal);
                if (agentObj) {
                  setAssignmentData({ 
                    ...assignmentData, 
                    agentId: selectedVal, 
                    vehicleId: agentObj?.assignedVehicleId || agentObj?.assignedVehicle?.id || '' 
                  });
                } else {
                  const vehObj = vehicles.find(v => v.id === selectedVal);
                  const agentOnVeh = vehObj?.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role));
                  setAssignmentData({
                    ...assignmentData,
                    agentId: agentOnVeh?.id || selectedVal,
                    vehicleId: vehObj?.id || selectedVal
                  });
                }
              }}
              className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors pr-10"
            >
              <option value="">Select vehicle / agent...</option>
              {agents.filter(a => a.assignedVehicle || a.assignedVehicleId).map((a) => {
                const vehNum = a.assignedVehicle?.vehicleNumber || a.assignedVehicle?.vehicleName || '';
                const vId = a.assignedVehicleId || a.assignedVehicle?.id;
                const assignedAmt = getAssignedFloatForOption(a.id, vId, currentShift);
                const label = vehNum ? `${vehNum} - ${a.name}` : a.name;
                return (
                  <option key={a.id} value={a.id}>
                    {assignedAmt !== null ? `${label} • (Assigned: ₹${assignedAmt.toFixed(2)})` : label}
                  </option>
                );
              })}
              {vehicles.filter(v => !agents.some(a => (a.assignedVehicleId === v.id || a.assignedVehicle?.id === v.id))).map((v) => {
                const agent = v.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role));
                const assignedAmt = getAssignedFloatForOption(agent?.id, v.id, currentShift);
                const label = `${v.vehicleNumber || v.vehicleName}${agent ? ` - ${agent.name}` : ''}`;
                return (
                  <option key={v.id} value={v.id}>
                    {assignedAmt !== null ? `${label} • (Assigned: ₹${assignedAmt.toFixed(2)})` : label}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Float Assignment Status Banner */}
        {currentSelectVal && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {isAlreadyAssigned ? (
              <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200/90 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <CheckCircle2 size={16} className="text-amber-600 shrink-0" />
                    <span>Float Already Assigned for Shift {currentShift}</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-800 bg-amber-100/90 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Assigned: ₹{alreadyAssignedAmount.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-amber-900/80 font-medium leading-relaxed">
                  This agent / vehicle was already assigned a float of <strong className="text-amber-950 font-bold">₹{alreadyAssignedAmount.toFixed(2)}</strong> for Shift {currentShift} today.
                </p>

                {alreadyAssignedBreakdown.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200/60">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mr-1">
                      Assigned Breakdown:
                    </span>
                    {alreadyAssignedBreakdown.map(({ denom, count }) => (
                      <span 
                        key={denom} 
                        className="text-[10px] font-bold bg-white/90 border border-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md shadow-2xs tabular-nums"
                      >
                        ₹{denom} × {count}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800">
                  <span className="font-medium">
                    You can adjust the denominations below to update this float assignment.
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToAssigned}
                    className="font-bold underline hover:no-underline text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Reset to Assigned
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/70 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Info size={15} className="text-gray-400 shrink-0" />
                  <span>No float currently assigned for <strong>Shift {currentShift}</strong> today.</span>
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Unassigned
                </span>
              </div>
            )}

            {isShift2Blocked && (
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200/90 flex items-center gap-2.5 text-xs font-semibold text-rose-700">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>Shift 1 has not been closed yet. Agent must close Shift 1 before Shift 2 float can be assigned.</span>
              </div>
            )}
          </div>
        )}

        {/* Field 3: Denominations Table */}
        <div>
          <h4 className="text-xs font-bold text-gray-900 mb-3">Denominations</h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-gray-200">
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">DENOMINATION</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">COUNT</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {denominationsList.map((denom) => {
                  const count = assignmentData.denominations?.[denom] ?? 0;
                  const rowAmount = (Number(count) || 0) * denom;
                  const prevCount = alreadyAssignedDenoms?.[denom] ?? 0;
                  return (
                    <tr key={denom} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-medium text-gray-800">
                        ₹{denom}.00
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={assignmentData.denominations?.[denom] !== undefined ? assignmentData.denominations[denom] : 0}
                            onChange={(e) => handleDenominationChange(e.target.value, denom, 'assign')}
                            className="w-28 text-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                          {isAlreadyAssigned && prevCount > 0 && Number(count) !== Number(prevCount) && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 tabular-nums">
                              was {prevCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-gray-900 text-right tabular-nums">
                        ₹{rowAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-white">
                  <td className="px-6 py-4 text-xs font-medium text-gray-900">
                    Total Float Amount
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isAlreadyAssigned && (
                      <span className="text-xs font-semibold text-gray-500">
                        {diffAmount === 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            No Change (₹{alreadyAssignedAmount.toFixed(2)})
                          </span>
                        ) : diffAmount > 0 ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +₹{diffAmount.toFixed(2)} Increase
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            -₹{Math.abs(diffAmount).toFixed(2)} Decrease
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[#0e8345] text-right tabular-nums">
                    ₹{totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons below card */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onClose}
          className="px-8 py-2.5 bg-[#e5e7eb] hover:bg-[#d1d5db] text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAssignFloat}
          disabled={isSubmitting || (!assignmentData.agentId && !assignmentData.vehicleId) || isShift2Blocked}
          className={`px-8 py-2.5 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
            isAlreadyAssigned ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0e8345] hover:bg-[#0c6f3a]'
          }`}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={16} />
          ) : isAlreadyAssigned ? (
            'Update Assignment'
          ) : (
            'Confirm Assignment'
          )}
        </button>
      </div>
    </div>
  );
}
