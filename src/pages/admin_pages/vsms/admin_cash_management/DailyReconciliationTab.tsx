import React, { useState, useRef } from 'react';
import { 
  User, Eye, Pencil, Trash2, Coins, ChevronLeft, ChevronRight, Calendar, ChevronDown, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import ShiftStatusBadge from './ShiftStatusBadge';

const DailyReconciliationTab = ({ 
  loading, filteredSummaries, storeRegisterData, 
  handleOpenView, handleOpenEdit, setDeletingSummary, setShowDeleteModal, 
  can, setViewingAgentDenoms, posToday, date, setDate
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalRecords = filteredSummaries.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const dateInputRef = useRef(null);

  const openDatePicker = () => {
    if (dateInputRef.current) {
      if (dateInputRef.current.showPicker) {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const formattedDateString = date ? format(new Date(date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');

  const paginatedData = filteredSummaries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="space-y-6">
      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">Agent / Vehicle</th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">S1 Open</th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">S1 Close</th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">S2 Open</th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">S2 Close</th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">S1 Status</th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">S2 Status</th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900">Day Exp</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-900 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scanning Records for {formattedDateString}...</p>
                    </div>
                  </td>
                </tr>
              ) : totalRecords === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Coins size={38} className="text-gray-300" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        No matching records found for <span className="text-emerald-700">{formattedDateString}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={openDatePicker}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0e8345] rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Calendar size={14} />
                          <span>Select Another Date</span>
                        </button>
                        {date !== format(new Date(), 'yyyy-MM-dd') && (
                          <button
                            type="button"
                            onClick={() => setDate && setDate(format(new Date(), 'yyyy-MM-dd'))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <RotateCcw size={14} />
                            <span>Reset to Today</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((summary) => {
                  const s1 = summary.shiftDetails?.shift1;
                  const s2 = summary.shiftDetails?.shift2;
                  const s1Open = s1?.opening?.totalOpeningCash || 0;
                  const s1Close = s1?.closing?.actualCash || 0;
                  const s2Open = s2?.opening?.totalOpeningCash || 0;
                  const s2Close = s2?.closing?.actualCash || 0;
                  const agent = summary.vehicle?.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role));
                  const vehicleName = summary.vehicle?.vehicleName || summary.vehicle?.vehicleNumber || 'Standard';

                  return (
                    <tr key={summary.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <User size={18} strokeWidth={2} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900">
                              {agent?.name || 'Unassigned'}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              {vehicleName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-800">₹{s1Open.toFixed(2)}</td>
                      <td className="px-4 py-4 font-bold text-gray-800">₹{s1Close.toFixed(2)}</td>
                      <td className="px-4 py-4 font-bold text-gray-800">₹{s2Open.toFixed(2)}</td>
                      <td className="px-4 py-4 font-bold text-gray-800">
                        {s2Close > 0 ? `₹${s2Close.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
                      </td>
                      <td className="px-4 py-4">
                        <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-800">
                        ₹{(((s1?.live?.expenses || 0) + (s2?.live?.expenses || 0))).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {can('CASH', 'UPDATE', 'RECONCILIATION') && (
                            <button 
                              onClick={() => handleOpenEdit(summary)} 
                              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 transition-all bg-white shadow-xs" 
                              title="Edit Float"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {can('CASH', 'DELETE', 'RECONCILIATION') && (
                            <button 
                              onClick={() => { setDeletingSummary(summary); setShowDeleteModal(true); }} 
                              className="w-8 h-8 rounded-full border border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-all bg-white shadow-xs" 
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenView(summary)} 
                            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all bg-white shadow-xs" 
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 gap-4 text-xs font-semibold text-gray-500">
            <div>
              Showing {startRecord}–{endRecord} of {totalRecords} records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                    currentPage === page
                      ? 'bg-[#ea580c] text-white'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReconciliationTab;
