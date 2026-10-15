// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ChevronDown, Loader2, CheckCircle2, 
  AlertTriangle, Info, RotateCcw, Coins, ShieldCheck, Sun, Moon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import adminAPI from '../services/adminService';
import { adminSubmitOpeningCash, getAdminReconciliation } from '../services/cashService';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function AssignFloatView({ 
  onClose, 
  onBack, 
  onSuccess, 
  assignmentData: propsAssignmentData, 
  setAssignmentData: propsSetAssignmentData, 
  vehicles: propsVehicles, 
  agents: propsAgents, 
  summaries: propsSummaries = [], 
  handleDenominationChange: propsHandleDenomChange, 
  handleAssignFloat: propsHandleAssignFloat, 
  isSubmitting: propsIsSubmitting,
  date,
  storeFilterId
}) {
  // If controlled by parent
  const isControlled = !!propsAssignmentData && !!propsSetAssignmentData;

  // Local state for standalone mode or fallback
  const [localAgents, setLocalAgents] = useState([]);
  const [localVehicles, setLocalVehicles] = useState([]);
  const [localSummaries, setLocalSummaries] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submittingLocal, setSubmittingLocal] = useState(false);

  const [localData, setLocalData] = useState({
    shift: 1,
    agentId: '',
    vehicleId: '',
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  const effectiveDate = date || format(new Date(), 'yyyy-MM-dd');
  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  // Fetch initial/fallback data if not provided via props
  useEffect(() => {
    const needAgents = !propsAgents || propsAgents.length === 0;
    const needVehicles = !propsVehicles || propsVehicles.length === 0;
    const needSummaries = !propsSummaries || propsSummaries.length === 0;

    if (needAgents || needVehicles || needSummaries) {
      const loadInitialData = async () => {
        setLoadingData(true);
        try {
          const promises = [];
          if (needAgents) {
            promises.push(adminAPI.getAgents({ storeId: storeFilterId }).catch(() => ({ data: [] })));
          } else {
            promises.push(Promise.resolve({ data: propsAgents }));
          }

          if (needVehicles) {
            promises.push(adminAPI.getVehicles({ storeId: storeFilterId }).catch(() => ({ data: [] })));
          } else {
            promises.push(Promise.resolve({ data: propsVehicles }));
          }

          if (needSummaries) {
            promises.push(getAdminReconciliation(effectiveDate, storeFilterId).catch(() => []));
          } else {
            promises.push(Promise.resolve(propsSummaries));
          }

          const [agRes, vehRes, sumRes] = await Promise.all(promises);

          if (needAgents) {
            setLocalAgents(Array.isArray(agRes.data) ? agRes.data : (agRes.data?.data || []));
          }
          if (needVehicles) {
            setLocalVehicles(Array.isArray(vehRes.data) ? vehRes.data : (vehRes.data?.data || []));
          }
          if (needSummaries) {
            setLocalSummaries(Array.isArray(sumRes) ? sumRes : (sumRes?.data || []));
          }
        } catch (err) {
          console.error('Error loading initial data in AssignFloatView:', err);
        } finally {
          setLoadingData(false);
        }
      };
      loadInitialData();
    }
  }, [propsAgents, propsVehicles, propsSummaries, effectiveDate, storeFilterId]);

  const agents = (propsAgents && propsAgents.length > 0) ? propsAgents : localAgents;
  const vehicles = (propsVehicles && propsVehicles.length > 0) ? propsVehicles : localVehicles;
  const summaries = (propsSummaries && propsSummaries.length > 0) ? propsSummaries : localSummaries;
  const assignmentData = isControlled ? propsAssignmentData : localData;

  const currentShift = assignmentData.shift || 1;
  const currentSelectVal = assignmentData.agentId || assignmentData.vehicleId || '';

  // Resolve target agent & vehicle objects
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

  // Formatted breakdown of already assigned denominations
  const alreadyAssignedBreakdown = denominationsList
    .filter(d => (parseInt(alreadyAssignedDenoms[d]) || 0) > 0)
    .map(d => ({ denom: d, count: parseInt(alreadyAssignedDenoms[d]) }));

  // Shift 2 prerequisite: Shift 1 must be closed
  const isShift1Closed = !!existingSummary?.shiftDetails?.shift1?.closing;
  const isShift2Blocked = currentShift === 2 && !isShift1Closed;

  // Calculate current total amount dynamically from denominations
  const denomsObj = assignmentData.denominations || {};
  const totalAmount = Object.entries(denomsObj).reduce((sum, [denom, count]) => {
    return sum + (Number(denom) * (Number(count) || 0));
  }, 0);

  const diffAmount = totalAmount - alreadyAssignedAmount;

  // Track the target we loaded for to avoid repeatedly overwriting user input on re-renders
  const lastLoadedRef = useRef('');

  // Auto-fill or reset denominations when agent/vehicle or shift selection changes
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

        if (isControlled) {
          propsSetAssignmentData(prev => ({
            ...prev,
            denominations: newDenoms,
            amount: assignedTotal
          }));
        } else {
          setLocalData(prev => ({
            ...prev,
            denominations: newDenoms
          }));
        }
      } else if (!isAlreadyAssigned) {
        const emptyDenoms = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
        if (isControlled) {
          propsSetAssignmentData(prev => ({
            ...prev,
            denominations: emptyDenoms,
            amount: 0
          }));
        } else {
          setLocalData(prev => ({
            ...prev,
            denominations: emptyDenoms
          }));
        }
      }
    }
  }, [currentSelectVal, currentShift, isAlreadyAssigned, existingOpening?.id, alreadyAssignedAmount]);

  const handleResetToAssigned = () => {
    if (!isAlreadyAssigned || !existingOpening?.denominations) return;
    const newDenoms = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
    Object.entries(existingOpening.denominations).forEach(([d, c]) => {
      newDenoms[d] = parseInt(c) || 0;
    });
    const assignedTotal = Number(existingOpening.totalOpeningCash) || 0;

    if (isControlled) {
      propsSetAssignmentData(prev => ({
        ...prev,
        denominations: newDenoms,
        amount: assignedTotal
      }));
    } else {
      setLocalData(prev => ({
        ...prev,
        denominations: newDenoms
      }));
    }
    toast.success('Reset to currently assigned denominations');
  };

  const handleClearAll = () => {
    const emptyDenoms = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };
    if (isControlled) {
      propsSetAssignmentData(prev => ({
        ...prev,
        denominations: emptyDenoms,
        amount: 0
      }));
    } else {
      setLocalData(prev => ({
        ...prev,
        denominations: emptyDenoms
      }));
    }
  };

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
    lastLoadedRef.current = ''; // force re-evaluation of target for the new shift
    if (isControlled) {
      propsSetAssignmentData(prev => ({ ...prev, shift: shiftVal }));
    } else {
      setLocalData(prev => ({ ...prev, shift: shiftVal }));
    }
  };

  const handleSelectAgentVehicle = (e) => {
    const selectedVal = e.target.value;
    lastLoadedRef.current = ''; // force re-evaluation of target for newly selected agent
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
      propsSetAssignmentData(prev => ({ ...prev, agentId, vehicleId }));
    } else {
      setLocalData(prev => ({ ...prev, agentId, vehicleId }));
    }
  };

  const handleConfirmAssignment = async () => {
    if (isShift2Blocked) {
      toast.error('Cannot assign Shift 2 until Shift 1 has been closed by the agent.');
      return;
    }

    if (isControlled && propsHandleAssignFloat) {
      propsHandleAssignFloat();
      return;
    }

    if (!assignmentData.agentId && !assignmentData.vehicleId) {
      toast.error('Please select a vehicle or agent');
      return;
    }

    if (totalAmount <= 0) {
      toast.error('Please enter valid denominations (amount must be greater than 0)');
      return;
    }

    setSubmittingLocal(true);
    try {
      await adminSubmitOpeningCash({
        shift: assignmentData.shift || 1,
        agentId: assignmentData.agentId,
        userId: assignmentData.agentId,
        vehicleId: assignmentData.vehicleId,
        date: effectiveDate,
        denominations: assignmentData.denominations,
        openingCash: totalAmount,
        totalOpeningCash: totalAmount,
        storeId: storeFilterId
      });
      toast.success(isAlreadyAssigned ? 'Float updated successfully!' : 'Float assigned successfully!');
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

  // Helper to check existing float amount for any agent/vehicle option
  const getAssignedFloatForOption = (agentId, vehicleId, targetShift) => {
    const sKey = `shift${targetShift}`;
    const sum = summaries.find(s => {
      if (vehicleId && (s.vehicleId === vehicleId || s.vehicle?.id === vehicleId)) return true;
      if (agentId) {
        if (s.vehicle?.assignedUsers?.some(u => u.id === agentId)) return true;
        if (s.user?.id === agentId) return true;
        if (s.shiftDetails?.[sKey]?.opening?.userId === agentId) return true;
        if (s.shiftDetails?.[sKey]?.opening?.user?.id === agentId) return true;
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
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Assign Float</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Daily Opening Cash • {format(new Date(effectiveDate), 'dd MMM yyyy')}
            </p>
          </div>
        </div>

        {isAlreadyAssigned && (
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-bold text-amber-800">
            <Coins size={14} className="text-amber-600" />
            <span>Assigned: ₹{alreadyAssignedAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Main Form Card Container */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6">
        {/* Field 1: Select Shift */}
        <div>
          <label className="block text-xs font-bold text-gray-900 mb-2">Select Shift</label>
          <div className="relative">
            <select
              value={currentShift}
              onChange={handleShiftChange}
              className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pr-10 shadow-2xs"
            >
              <option value={1}>
                Shift - 1 (Morning / Day)
                {currentSelectVal && getAssignedFloatForOption(effectiveAgentId, effectiveVehicleId, 1) !== null 
                  ? ` • (Assigned: ₹${getAssignedFloatForOption(effectiveAgentId, effectiveVehicleId, 1).toFixed(2)})` 
                  : ''}
              </option>
              <option value={2}>
                Shift - 2 (Evening / Night)
                {currentSelectVal && getAssignedFloatForOption(effectiveAgentId, effectiveVehicleId, 2) !== null 
                  ? ` • (Assigned: ₹${getAssignedFloatForOption(effectiveAgentId, effectiveVehicleId, 2).toFixed(2)})` 
                  : (currentSelectVal && !isShift1Closed ? ' • (Shift 1 Not Closed)' : '')}
              </option>
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
                const vId = a.assignedVehicleId || a.assignedVehicle?.id;
                const assignedAmt = getAssignedFloatForOption(a.id, vId, currentShift);
                const baseLabel = vehNum ? `${vehNum} - ${a.name}` : a.name;
                return (
                  <option key={a.id} value={a.id}>
                    {assignedAmt !== null ? `${baseLabel} • (Assigned: ₹${assignedAmt.toFixed(2)})` : baseLabel}
                  </option>
                );
              })}
              {/* Fallback vehicles if not mapped in agents array */}
              {vehicles.filter(v => !agents.some(a => (a.assignedVehicleId === v.id || a.assignedVehicle?.id === v.id))).map((v) => {
                const agent = v.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role));
                const assignedAmt = getAssignedFloatForOption(agent?.id, v.id, currentShift);
                const baseLabel = `${v.vehicleNumber || v.vehicleName}${agent ? ` - ${agent.name}` : ''}`;
                return (
                  <option key={v.id} value={v.id}>
                    {assignedAmt !== null ? `${baseLabel} • (Assigned: ₹${assignedAmt.toFixed(2)})` : baseLabel}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Float Assignment Status Banner (Shows whether already assigned and how much) */}
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
                  This agent / vehicle was already assigned a float of <strong className="text-amber-950 font-bold">₹{alreadyAssignedAmount.toFixed(2)}</strong> for Shift {currentShift} on this date.
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
                    You can adjust the denominations below to update or modify this float assignment.
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetToAssigned}
                      className="font-bold underline hover:no-underline text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                      title="Reset denominations back to original assigned values"
                    >
                      <RotateCcw size={12} /> Reset to Assigned
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="font-bold underline hover:no-underline text-amber-900 hover:text-amber-950 cursor-pointer"
                      title="Clear denominations to 0"
                    >
                      Clear
                    </button>
                  </div>
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

            {/* Shift 2 Prerequisite Warning */}
            {isShift2Blocked && (
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200/90 flex items-center gap-2.5 text-xs font-semibold text-rose-700 animate-in fade-in">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>Shift 1 has not been closed yet. The agent must close Shift 1 before Shift 2 float can be assigned.</span>
              </div>
            )}

            {/* Shift already closed by agent notice */}
            {existingShiftData?.closing && (
              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200/80 flex items-center justify-between text-xs text-blue-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="shrink-0 text-blue-600" />
                  <span>
                    Shift {currentShift} closing was already submitted by the agent (Reported actual cash: <strong>₹{(existingShiftData.closing.actualCash || 0).toFixed(2)}</strong>).
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {existingShiftData.closing.status || 'CLOSED'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Field 3: Denominations Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900">Denominations</h4>
            {totalAmount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-gray-400 hover:text-gray-600 underline cursor-pointer"
              >
                Clear All
              </button>
            )}
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
                  const count = assignmentData.denominations?.[denom] ?? 0;
                  const rowAmount = (Number(count) || 0) * denom;
                  const prevCount = alreadyAssignedDenoms?.[denom] ?? 0;
                  return (
                    <tr key={denom} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-semibold text-gray-800">
                        ₹{denom}.00
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={assignmentData.denominations?.[denom] !== undefined ? assignmentData.denominations[denom] : 0}
                            onChange={(e) => handleLocalDenomChange(e.target.value, denom)}
                            className="w-24 text-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 tabular-nums shadow-2xs"
                          />
                          {isAlreadyAssigned && prevCount > 0 && Number(count) !== Number(prevCount) && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 tabular-nums" title={`Originally assigned count: ${prevCount}`}>
                              was {prevCount}
                            </span>
                          )}
                        </div>
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
                  <td className="px-6 py-4 text-center">
                    {isAlreadyAssigned && (
                      <span className="text-xs font-semibold text-gray-500">
                        {diffAmount === 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            No Change (₹{alreadyAssignedAmount.toFixed(2)})
                          </span>
                        ) : diffAmount > 0 ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            +₹{diffAmount.toFixed(2)} Increase
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                            -₹{Math.abs(diffAmount).toFixed(2)} Decrease
                          </span>
                        )}
                      </span>
                    )}
                  </td>
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
          className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmAssignment}
          disabled={isSubmitting || (!assignmentData.agentId && !assignmentData.vehicleId) || isShift2Blocked}
          className={`px-8 py-3 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
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
