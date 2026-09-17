// @ts-nocheck
import React from 'react';
import { Download, Printer } from 'lucide-react';
import { generateReportPDF, exportReportToExcel } from './ReportUtils';

export default function ReportLayout({ activeTab, reportData, isLoading, children }) {
  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex justify-end items-center gap-2 mb-2">
        <button
          onClick={() => exportReportToExcel(activeTab, reportData)}
          disabled={!reportData || isLoading}
          className="bg-white text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold text-xs shadow-sm hover:bg-emerald-50 transition-all disabled:opacity-40"
        >
          <Download size={14} /> Excel
        </button>
        <button
          onClick={() => generateReportPDF(activeTab, reportData, false)}
          disabled={!reportData || isLoading}
          className="bg-gray-900 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold text-xs shadow-sm hover:bg-gray-800 transition-all disabled:opacity-40"
        >
          <Download size={14} /> PDF
        </button>
        <button
          onClick={() => generateReportPDF(activeTab, reportData, true)}
          disabled={!reportData || isLoading}
          className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-40"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-xs font-medium">Loading report data...</p>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}
