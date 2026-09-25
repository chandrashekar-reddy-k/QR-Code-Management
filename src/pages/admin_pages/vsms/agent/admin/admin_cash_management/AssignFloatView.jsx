import React from 'react';
import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function AssignFloatView({ 
  onClose, assignmentData, setAssignmentData, vehicles = [], agents = [], summaries = [], 
  handleDenominationChange, handleAssignFloat, isSubmitting 
}) {
  const totalAmount = assignmentData.amount || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
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

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
        {/* Field 1: Select Shift */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Select Shift</label>
          <div className="relative">
            <select
              value={assignmentData.shift || 1}
              onChange={(e) => setAssignmentData({ ...assignmentData, shift: parseInt(e.target.value) })}
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
              value={assignmentData.agentId || ''}
              onChange={(e) => {
                const selectedVal = e.target.value;
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
                return (
                  <option key={a.id} value={a.id}>
                    {vehNum ? `${vehNum}` : a.name}
                  </option>
                );
              })}
              {vehicles.filter(v => !agents.some(a => (a.assignedVehicleId === v.id || a.assignedVehicle?.id === v.id))).map((v) => {
                const agent = v.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role));
                return (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber || v.vehicleName}{agent ? ` - ${agent.name}` : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

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
                  return (
                    <tr key={denom} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-medium text-gray-800">
                        ₹{denom}.00
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={assignmentData.denominations?.[denom] !== undefined ? assignmentData.denominations[denom] : 0}
                          onChange={(e) => handleDenominationChange(e.target.value, denom, 'assign')}
                          className="w-28 text-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
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
                  <td></td>
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
          className="px-8 py-2.5 bg-[#e5e7eb] hover:bg-[#d1d5db] text-gray-700 rounded-lg text-xs font-bold transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAssignFloat}
          disabled={isSubmitting || !assignmentData.agentId}
          className="px-8 py-2.5 bg-[#0e8345] hover:bg-[#0c6f3a] text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm Assignment'}
        </button>
      </div>
    </div>
  );
}
