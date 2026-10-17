// @ts-nocheck
import React from 'react';
import { ArrowLeft, CheckSquare, FileText, Truck, RefreshCw, Package, Gift, Search, Loader2, Printer, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const AuditsSection = ({
  selectedAuditId,
  setSelectedAuditId,
  auditHistory,
  loadingAudit,
  auditSearch,
  setAuditSearch,
  fetchData,
  loading
}) => {
  if (selectedAuditId) {
    const audit = auditHistory.find(a => a.id === selectedAuditId);
    if (!audit) {
      setSelectedAuditId(null);
      return null;
    }

    const activeAuditItems = (audit.items || []).filter(item => {
      if (item.product?.isActive === false) return false;
      if (item.product?.status === 'INACTIVE') return false;
      return true;
    });

    const exportAuditDetailToExcel = () => {
      const data = activeAuditItems.map(item => ({
        'Product Name': item.product?.name || item.productName || 'Product (' + (item.productId?.slice(-6) || 'Item') + ')',
        'Category': item.product?.category?.name || item.category || 'General',
        'SKU Code': item.product?.skuCode || item.product?.sku || 'N/A',
        'System Quantity': item.oldQuantity,
        'Audited Quantity': item.newQuantity,
        'Variance': (item.newQuantity || 0) - (item.oldQuantity || 0),
        'Unit': item.product?.unit?.name || item.product?.unit || 'pcs',
        'Remark': audit.remark || 'N/A',
        'Audited By': audit.user?.name,
        'Vehicle': audit.vehicle?.vehicleNumber,
        'Date': new Date(audit.createdAt).toLocaleString()
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AuditDetails");
      XLSX.writeFile(wb, `Audit_Details_${audit.vehicle?.vehicleNumber}_${new Date(audit.createdAt).toLocaleDateString()}.xlsx`);
    };

    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500 print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 10mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; }
            body * { visibility: hidden; }
            .print-section, .print-section * { visibility: visible; }
            .print-section { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              border: none !important; 
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print { display: none !important; }
            .print-header { display: block !important; margin-bottom: 20px; border-bottom: 3px solid #059669; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background-color: #f8fafc !important; color: #059669 !important; font-weight: 900 !important; text-transform: uppercase; letter-spacing: 0.05em; font-size: 8pt; }
            .variance-badge { border: 1px solid #e2e8f0 !important; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
          }
          .print-header { display: none; }
        `}} />
        
        {/* Detailed View Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 gap-4 no-print">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedAuditId(null)}
              className="p-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-emerald-600 transition-all border border-transparent hover:border-gray-200 active:scale-90"
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
              <CheckSquare size={24} strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase leading-none mb-1">Audit Details</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{audit.vehicle?.vehicleNumber} • {audit.vehicle?.vehicleName || 'General Vehicle'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportAuditDetailToExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
            >
              <FileDown size={16} /> Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200 shadow-sm"
            >
              <Printer size={16} /> Print
            </button>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Adjustment Date</span>
            <span className="text-sm font-bold text-emerald-600">{new Date(audit.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Detailed View Body */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden print-section">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 no-print"></div>

          <div className="print-header">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-emerald-600">STOCK AUDIT REPORT</h1>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">VillageKart Sales Tracker</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase">Report Generated</p>
                <p className="text-sm font-bold">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-x-12 gap-y-6 mb-8 pb-6 border-b border-gray-200 print-metadata">
            <div className="flex flex-col min-w-[120px]">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FileText size={10} className="text-emerald-400" /> Admin User</span>
              <span className="text-xs font-bold text-gray-800">{audit.user?.name}</span>
            </div>
            <div className="flex flex-col min-w-[120px]">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Truck size={10} className="text-emerald-400" /> Vehicle Type</span>
              <span className="text-xs font-bold text-gray-800 uppercase">{audit.vehicle?.vehicleName || 'Standard'}</span>
            </div>
            <div className="flex flex-col min-w-[120px]">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><RefreshCw size={10} className="text-emerald-400" /> Timestamp</span>
              <span className="text-xs font-bold text-gray-800">
                {new Date(audit.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
            <div className="flex flex-col min-w-[100px]">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Package size={10} className="text-emerald-400" /> Items</span>
              <span className="text-xs font-bold text-gray-800">{activeAuditItems.length} Products</span>
            </div>
            <div className="flex-1 min-w-[200px] bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><Gift size={10} /> Remark</span>
              <span className="text-xs font-bold text-emerald-950 italic leading-tight block truncate" title={audit.remark}>
                {audit.remark || 'No remarks provided.'}
              </span>
            </div>
          </div>

          {/* Summary Comparison KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {(() => {
              const totalBefore = activeAuditItems.reduce((acc, i) => acc + (Number(i.oldQuantity) || 0), 0);
              const totalAfter = activeAuditItems.reduce((acc, i) => acc + (Number(i.newQuantity) || 0), 0);
              const netVariance = totalAfter - totalBefore;
              const surplusItems = activeAuditItems.filter(i => (i.newQuantity || 0) > (i.oldQuantity || 0)).length;
              const deficitItems = activeAuditItems.filter(i => (i.newQuantity || 0) < (i.oldQuantity || 0)).length;
              const matchedItems = activeAuditItems.filter(i => (i.newQuantity || 0) === (i.oldQuantity || 0)).length;

              return (
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Before Audit (System)</span>
                    <div className="text-xl font-extrabold text-slate-800">{totalBefore.toLocaleString()} <span className="text-xs font-medium text-slate-400">units</span></div>
                  </div>
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-1">After Audit (Physical)</span>
                    <div className="text-xl font-extrabold text-emerald-800">{totalAfter.toLocaleString()} <span className="text-xs font-medium text-emerald-500">units</span></div>
                  </div>
                  <div className={`p-4 border rounded-xl ${netVariance > 0 ? 'bg-emerald-50 border-emerald-200' : netVariance < 0 ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${netVariance > 0 ? 'text-emerald-700' : netVariance < 0 ? 'text-rose-700' : 'text-gray-500'}`}>Net Variance</span>
                    <div className={`text-xl font-extrabold ${netVariance > 0 ? 'text-emerald-700' : netVariance < 0 ? 'text-rose-700' : 'text-gray-700'}`}>
                      {netVariance > 0 ? `+${netVariance}` : netVariance} <span className="text-xs font-medium opacity-70">units</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Accuracy Breakdown</span>
                    <div className="flex items-center gap-2 text-xs font-bold mt-1">
                      <span className="text-emerald-600" title="Matched items">{matchedItems} Match</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-emerald-600" title="Surplus items">+{surplusItems} Surplus</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-rose-600" title="Deficit items">-{deficitItems} Short</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Product Description</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center bg-slate-100/60">
                    Before Audit <span className="block text-[8px] font-normal text-slate-400">(System Recorded)</span>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-emerald-700 uppercase tracking-widest text-center bg-emerald-50/80">
                    After Audit <span className="block text-[8px] font-normal text-emerald-600">(Physical Count)</span>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-right">
                    Variance <span className="block text-[8px] font-normal text-gray-400">(Difference)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeAuditItems.map((item) => {
                  const diff = (item.newQuantity || 0) - (item.oldQuantity || 0);
                  const prodName = item.product?.name || item.productName || 'Product (' + (item.productId?.slice(-6) || 'Item') + ')';
                  const catName = item.product?.category?.name || item.category || 'General';
                  const unitName = item.product?.unit?.name || item.product?.unit || 'pcs';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-600 transition-colors uppercase leading-tight" title={prodName}>
                            {prodName}
                          </span>
                          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{catName} • {unitName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center bg-slate-50/50">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-bold border border-slate-200">
                          {item.oldQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center bg-emerald-50/20">
                        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md font-mono text-xs font-extrabold border border-emerald-200 shadow-sm">
                          {item.newQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[50px] px-2 py-1 rounded-lg text-xs font-bold border shadow-xs ${
                          diff > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : diff < 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? '0' : diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-20 hidden print:block">
            <div className="flex justify-between gap-20">
              <div className="text-center flex-1">
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Authorized Auditor</p>
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Warehouse In-Charge</p>
                </div>
              </div>
            </div>
            <div className="mt-8 text-center">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">This is a system generated audit report from VillageKart Sales Tracker.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const exportHistoryToExcel = () => {
    const data = auditHistory.map(audit => ({
      'Vehicle Number': audit.vehicle?.vehicleNumber,
      'Vehicle Name': audit.vehicle?.vehicleName || 'Standard Load',
      'Admin': audit.user?.name,
      'Date': new Date(audit.createdAt).toLocaleDateString(),
      'Time': new Date(audit.createdAt).toLocaleTimeString(),
      'Items Changed': audit.items.length,
      'Remark': audit.remark || 'N/A'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AuditHistory");
    XLSX.writeFile(wb, `Audit_History_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handlePrintHistory = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500 print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            border: none !important; 
            box-shadow: none !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-header { display: block !important; margin-bottom: 20px; border-bottom: 3px solid #059669; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background-color: #f8fafc !important; color: #059669 !important; font-weight: 900 !important; text-transform: uppercase; }
        }
        .print-header { display: none; }
      `}} />
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden print-section">
        <div className="print-header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-emerald-600">INVENTORY AUDIT LOGS</h1>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">VillageKart Sales Tracker • Complete History</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase">Export Date</p>
              <p className="text-sm font-bold">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
        {/* <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 no-print"></div> */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 border-b border-gray-200 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckSquare size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-2 uppercase">Audit History</h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-emerald-400" />
                Select a record to view detailed adjustments
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 no-print">
            <button
              onClick={exportHistoryToExcel}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <FileDown size={18} /> Export Excel
            </button>
            <button
              onClick={handlePrintHistory}
              className="flex items-center gap-2 px-5 py-3 bg-white text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 dark:bg-gray-900/50 transition-all border border-gray-200 shadow-sm"
            >
              <Printer size={18} /> Print History
            </button>
            <div className="w-[1px] h-10 bg-gray-100 mx-1 hidden md:block"></div>
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 shadow-sm"
            >
              <Loader2 size={24} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingAudit ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-white border border-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : auditHistory.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 dark:bg-gray-900/50/50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-200/50">
              <CheckSquare size={40} className="text-gray-200" />
            </div>
            <p className="text-lg font-bold text-gray-400 uppercase tracking-[0.2em]">No audit records found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Vehicle Name / Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Admin User</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right pr-12">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-[11px] font-bold">
                {auditHistory
                  .filter(a =>
                    a.vehicle?.vehicleNumber?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                    a.vehicle?.vehicleName?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                    a.user?.name?.toLowerCase().includes(auditSearch.toLowerCase())
                  )
                  .map((audit) => {
                    const totalBefore = audit.items?.reduce((acc, i) => acc + (Number(i.oldQuantity) || 0), 0) || 0;
                    const totalAfter = audit.items?.reduce((acc, i) => acc + (Number(i.newQuantity) || 0), 0) || 0;
                    const netDiff = totalAfter - totalBefore;

                    return (
                      <tr
                        key={audit.id}
                        onClick={() => setSelectedAuditId(audit.id)}
                        className="hover:bg-emerald-50/30 transition-all cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all shadow-inner">
                              <Truck size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white group-hover:text-emerald-600 uppercase tracking-tight transition-colors">{audit.vehicle?.vehicleNumber}</span>
                              <span className="text-[9px] text-gray-400 uppercase tracking-widest">{audit.vehicle?.vehicleName || 'Regular Load'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-1 rounded-lg border border-gray-200">{audit.user?.name}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col">
                            <span className="text-gray-800">{new Date(audit.createdAt).toLocaleDateString()}</span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-tighter">{new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex items-center gap-2 mr-2 text-[10px] font-bold">
                              <span className="text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded" title="Before Audit Stock">Sys: {totalBefore}</span>
                              <span className="text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded" title="After Audit Physical Stock">Aud: {totalAfter}</span>
                              <span className={`px-2 py-0.5 rounded font-mono ${netDiff > 0 ? 'bg-emerald-100 text-emerald-800' : netDiff < 0 ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-600'}`} title="Net Variance">
                                {netDiff > 0 ? `+${netDiff}` : netDiff}
                              </span>
                            </div>
                            <span className="text-gray-400 italic font-medium truncate max-w-[130px]">{audit.remark || 'N/A'}</span>
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-400 group-hover:translate-x-1 transition-all">
                              <Truck className="rotate-180" size={12} strokeWidth={3} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditsSection;
