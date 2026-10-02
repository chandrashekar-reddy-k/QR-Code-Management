// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Truck, Search, Barcode, ArrowUpCircle, Gift, Package, ArrowLeft, Loader2, History, Clock, Printer, FileDown, FileText, RefreshCw, Check, X, Camera } from 'lucide-react';
import { StockItemRow } from './SharedComponents';
import adminAPI from '.././services/adminService';
import * as XLSX from 'xlsx';
import { useLoadHistoryQuery } from '../hooks/useVsmsCache';
import BarcodeScannerOverlay from '../../../../components/BarcodeScannerOverlay';

const LoadingSection = ({
  groupedLoadingItems,
  itemsPerPage,
  currentPage,
  setCurrentPage,
  stockQuantities,
  handleQuantityChange,
  selectedVehicleId,
  setSelectedVehicleId,
  vehicles,
  opsSearch,
  setOpsSearch,
  setScannerTarget,
  setShowScanner,
  totalLoadingValue,
  handleInitiateLoad,
  isSubmitting,
  hasInvalidQuantities,
  vehicleInventoryMap,
  can
}) => {
  const [showLoadModal, setShowLoadModal] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [procurementGRNs, setProcurementGRNs] = useState([]);
  const [selectedGRNId, setSelectedGRNId] = useState('ALL');
  const [grnItemsMap, setGrnItemsMap] = useState({});

  useEffect(() => {
    adminAPI.getGRNs?.().then((res) => {
      const list = res.data?.data || res.data || [];
      setProcurementGRNs(list);
      const map = {};
      const updates = {};
      list.forEach((grn) => {
        if (grn.items && Array.isArray(grn.items)) {
          grn.items.forEach((item) => {
            const pid = item.productId || item.product?.id || item.id;
            if (pid) {
              map[pid] = grn.id;
              const qty = item.receivedQuantity ?? item.quantity ?? 0;
              if (qty > 0) {
                updates[pid] = qty;
              }
            }
          });
        }
      });
      setGrnItemsMap(map);
      if (handleQuantityChange) {
        Object.entries(updates).forEach(([pid, qty]) => {
          handleQuantityChange(pid, qty);
        });
      }
    }).catch(console.error);
  }, []);

  const handleGRNChange = (grnId) => {
    setSelectedGRNId(grnId);
    if (grnId === 'ALL') {
      return;
    }
    const grn = procurementGRNs.find(g => g.id === grnId);
    if (grn && grn.items && Array.isArray(grn.items)) {
      grn.items.forEach(item => {
        const pId = item.productId || item.product?.id || item.id;
        const qty = item.receivedQuantity ?? item.quantity ?? 0;
        if (pId && qty > 0 && handleQuantityChange) {
          handleQuantityChange(pId, qty);
        }
      });
    }
  };

  const { data: cachedHistory, isLoading: isLoadingHistory, isFetching: isFetchingHistory, refetch: fetchHistory } = useLoadHistoryQuery();
  const historyData = cachedHistory || [];

  const handlePrint = () => {
    window.print();
  };

  const exportHistoryToExcel = () => {
    const data = historyData.map(session => ({
      'Vehicle Number': session.vehicle?.vehicleNumber,
      'Vehicle Type': session.vehicle?.vehicleName || 'Standard Load',
      'Authorized By': session.user?.name || 'System Admin',
      'Date': new Date(session.date).toLocaleDateString(),
      'Time': new Date(session.date).toLocaleTimeString(),
      'SKUs Loaded': session.items.length,
      'Total Qty': session.items.reduce((acc, item) => acc + item.quantity, 0),
      'Timestamp': new Date(session.date).toISOString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LoadHistory");
    XLSX.writeFile(wb, `Load_History_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportLoadDetailToExcel = () => {
    if (!selectedSession) return;
    const data = selectedSession.items.map(item => ({
      'Product Name': item.product?.name,
      'Category': item.product?.category?.name || 'General',
      'SKU Code': item.product?.skuCode,
      'Rate': item.priceAtTime || item.product?.price,
      'Quantity Loaded': item.quantity,
      'Unit': item.product?.unit?.name || 'pcs',
      'Total Value': (item.quantity * (item.priceAtTime || item.product?.price)).toFixed(2),
      'Vehicle': selectedSession.vehicle?.vehicleNumber,
      'Date': new Date(selectedSession.date).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LoadDetails");
    XLSX.writeFile(wb, `Load_Details_${selectedSession.vehicle?.vehicleNumber}_${new Date(selectedSession.date).toLocaleDateString()}.xlsx`);
  };

  let allFiltered = [...groupedLoadingItems.regular, ...groupedLoadingItems.free];
  if (selectedGRNId !== 'ALL') {
    allFiltered = allFiltered.filter(i => grnItemsMap[i.id] === selectedGRNId);
  }
  const totalPages = Math.ceil(allFiltered.length / itemsPerPage);
  const paginatedItemsFromAll = allFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const regularItems = paginatedItemsFromAll.filter(i => !i.isFree);
  const freeItems = paginatedItemsFromAll.filter(i => i.isFree);

  const renderLoadingTable = (itemsToRender, isFreeGroup = false) => (
    <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50/50 text-[9px] font-bold uppercase tracking-widest text-gray-400">
            <th className="px-4 py-3 w-[25%]">Product Details</th>
            <th className="px-3 py-3 text-center w-[12%]">Rate</th>
            <th className="px-3 py-3 text-center bg-emerald-50/20 text-emerald-600 w-[28%]">VSM Availability</th>
            <th className="px-3 py-3 text-center bg-emerald-50/20 text-emerald-600 w-[15%]">Load Qty</th>
            <th className="pr-4 py-3 text-right w-[20%]">Net Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {itemsToRender.map((item) => {
            const qty = parseFloat(stockQuantities[item.id]) || 0;
            const price = parseFloat(item.vsmPrice || 0) || 0;
            const displayAmount = qty * price;
            return (
              <tr key={`load-table-${item.id}`} className={`hover:bg-gray-50 dark:bg-gray-900/50/30 transition-colors group ${isFreeGroup ? 'bg-emerald-50/10' : ''}`}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border shadow-inner shrink-0 ${item.isFree ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 text-gray-600'}`}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        item.isFree ? <Gift size={14} /> : <Package size={14} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-gray-800 leading-tight truncate">{item.name}</span>
                      {item.unit && (
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                          {item.unitValue || ''} {item.unit.type}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="text-[10px] font-bold text-gray-500">₹{Math.round(price)}</span>
                </td>
                <td className="px-3 py-2.5 bg-emerald-50/5">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-emerald-700">{item.warehouseStock ?? item.stock ?? 0}</span>
                      <span className="text-[7px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-0.5">In Store</span>
                    </div>
                    <div className="w-px h-4 bg-emerald-100" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-amber-600">
                        {selectedVehicleId ? (vehicleInventoryMap[item.id] || 0) : (item.loadedVehicleStock || 0)}
                      </span>
                      <span className="text-[7px] font-bold text-amber-500 uppercase tracking-widest leading-none mt-0.5">In Vehicle</span>
                    </div>
                    <div className="w-px h-4 bg-emerald-100" />
                    <div className="flex flex-col items-center bg-white px-1.5 py-0.5 rounded-lg border border-emerald-100 shadow-sm">
                      <span className="text-[10px] font-bold text-blue-600">
                        {item.vehicleStoreStock || 0}
                      </span>
                      <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">VSM</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 bg-emerald-50/5">
                  <div className="flex flex-col items-center gap-1">
                    {(() => {
                      const avail = item.vehicleStoreStock || 0;
                      const isExcess = qty > avail && avail > 0;
                      return (
                        <>
                          <input
                            type="number"
                            placeholder="0"
                            min="0"
                            onWheel={(e) => e.target.blur()}
                            className={`w-16 bg-white border ${isExcess ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-emerald-200'} rounded-lg px-2 py-1 text-[11px] text-center font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm`}
                            value={stockQuantities[item.id] || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              handleQuantityChange(item.id, val);
                            }}
                          />
                          {isExcess && (
                            <span className="text-[7px] font-bold text-rose-600 uppercase animate-pulse">Low Stock</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td className="pr-4 py-2.5 text-right">
                  <span className={`text-[10px] font-bold ${qty > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
                    ₹{Math.round(displayAmount).toLocaleString('en-IN')}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 print:p-0">
      <style dangerouslySetInnerHTML={{
        __html: `
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
        }
        .print-header { display: none; }
      `}} />

      {/* Render Load Stock Form in-page when active */}
      {showLoadModal ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 no-print">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowLoadModal(false)} 
                className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-500 hover:bg-gray-100 transition-all border border-gray-200"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">Vehicle Loading Operations</h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Load inventory stock to fleet vehicles</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Procurement GRN Filter */}
              <select 
                value={selectedGRNId} 
                onChange={(e) => handleGRNChange(e.target.value)}
                className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer min-w-[200px]"
              >
                <option value="ALL">All Procurements (GRN)</option>
                {procurementGRNs.map((grn) => {
                  const label = `${grn.displayId || grn.grnNumber || grn.id.slice(0, 8)} ${grn.po?.vendor?.vendorName ? `— ${grn.po.vendor.vendorName}` : ''}`;
                  return (
                    <option key={grn.id} value={grn.id}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search name, ID, SKU, barcode..." 
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner" 
                  value={opsSearch} 
                  onChange={(e) => setOpsSearch(e.target.value)} 
                />
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (setShowScanner && setScannerTarget) {
                    setScannerTarget('ops');
                    setShowScanner(true);
                  } else {
                    setIsScannerOpen(true);
                  }
                }} 
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg shadow-sm hover:shadow transition-all text-xs font-semibold whitespace-nowrap active:scale-95 h-9 shrink-0 cursor-pointer"
                title="Scan product barcode using camera"
              >
                <Camera size={15} />
                <span>Scan</span>
              </button>
            </div>
          </div>

          {isScannerOpen && (
            <BarcodeScannerOverlay
              onScan={(code) => {
                const cleanCode = String(code || '').trim();
                if (cleanCode) {
                  setOpsSearch(cleanCode);
                  setIsScannerOpen(false);
                }
              }}
              onClose={() => setIsScannerOpen(false)}
            />
          )}

          {/* Professional Header: Selected Vehicle and Total Value Side-by-Side */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between p-5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              <div className="flex items-center gap-2 text-gray-500 shrink-0">
                <Truck size={18} className="text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Select Target Vehicle:</span>
              </div>
              <select 
                className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-w-[280px]" 
                value={selectedVehicleId} 
                onChange={(e) => setSelectedVehicleId(e.target.value)}
              >
                <option value="">Select a Vehicle</option>
                {[...vehicles]
                  .map(v => {
                    const sortedAssigned = [...(v.assignedUsers || [])].sort(
                      (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
                    );
                    const activeAgent = sortedAssigned.find(u => u.assignedVehicleId === v.id) || sortedAssigned.find(u => !u.assignedVehicleId) || sortedAssigned[0];
                    const agentName = activeAgent?.name || v.assignedDriver?.name || v.driver?.name || v.driverName || v.assignedUser?.name;
                    return { v, agentName };
                  })
                  .filter(({ agentName }) => Boolean(agentName))
                  .sort((a, b) => new Date(b.v.updatedAt || b.v.createdAt || 0).getTime() - new Date(a.v.updatedAt || a.v.createdAt || 0).getTime())
                  .map(({ v, agentName }) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber ? `${v.vehicleNumber}${v.vehicleName ? ` (${v.vehicleName})` : ''}` : (v.vehicleName || 'Vehicle')} — {agentName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-6 self-end md:self-auto">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Load Value</span>
                <span className="text-xl font-black text-emerald-600">₹{Math.round(totalLoadingValue).toLocaleString('en-IN')}</span>
              </div>
              <button 
                onClick={async () => {
                  await handleInitiateLoad();
                  setShowLoadModal(false);
                  fetchHistory();
                }} 
                disabled={isSubmitting || !selectedVehicleId || !Object.values(stockQuantities).some(q => (parseFloat(q) || 0) > 0) || hasInvalidQuantities} 
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-md disabled:opacity-40 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                <span>Complete Load</span>
              </button>
            </div>
          </div>

          {regularItems.length > 0 && (
            <div className="space-y-4 text-left">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Regular Products</h4>
              {renderLoadingTable(regularItems)}
            </div>
          )}
          {freeItems.length > 0 && (
            <div className="mt-8 text-left">
              <div className="flex items-center gap-2 mb-4 px-2">
                <Gift size={16} className="text-emerald-500" />
                <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">Free / Promotional Items</h4>
              </div>
              {renderLoadingTable(freeItems, true)}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 py-4 border-t border-gray-200">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-emerald-600 disabled:opacity-30 transition-colors">Prev</button>
              <span className="text-[10px] font-bold text-emerald-600 px-4 py-2 bg-emerald-50 rounded-xl">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-emerald-600 disabled:opacity-30 transition-colors">Next</button>
            </div>
          )}
        </div>
      ) : (
        selectedSession ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 print:p-0">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 no-print">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedSession(null)} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-500 hover:bg-gray-100 transition-all border border-gray-200"><ArrowLeft size={18} /></button>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Loading Details</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Inventory Load Session</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportLoadDetailToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"><FileDown size={14} /> Excel</button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200 shadow-sm"><Printer size={14} /> Print</button>
              </div>
            </div>

            <div className="print-section">
              <div className="print-header">
                <div className="flex justify-between items-center text-left">
                  <div>
                    <h1 className="text-2xl font-bold text-emerald-600 uppercase">Load Session Report</h1>
                    <p className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">VillageKart Sales Tracker</p>
                  </div>
                  <div className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date: {new Date(selectedSession.date).toLocaleString()}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-x-12 gap-y-6 mb-8 pb-6 border-b border-gray-200 text-left">
                <div className="flex flex-col min-w-[150px]">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Truck size={10} className="text-emerald-400" /> Vehicle</span>
                  <span className="text-xs font-bold text-gray-800 uppercase">{selectedSession.vehicle?.vehicleNumber || 'Unknown'}</span>
                </div>
                <div className="flex flex-col min-w-[150px]">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Check size={10} className="text-emerald-400" /> Authorized By</span>
                  <span className="text-xs font-bold text-gray-800">{selectedSession.user?.name || 'System Admin'}</span>
                </div>
                <div className="flex flex-col min-w-[150px]">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><RefreshCw size={10} className="text-emerald-400" /> Timestamp</span>
                  <span className="text-xs font-bold text-gray-800">{new Date(selectedSession.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex flex-col min-w-[100px]">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Package size={10} className="text-emerald-400" /> Total Items</span>
                  <span className="text-xs font-bold text-emerald-600">{selectedSession.items.length} Products</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50/50">
                      <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Rate</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-emerald-600 uppercase tracking-widest text-right">Qty Loaded</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedSession.items.map((item, i) => (
                      <tr key={`det-load-${i}`} className="hover:bg-emerald-50/10 transition-colors group">
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col text-left">
                            <span className="text-[11px] font-bold text-gray-800 group-hover:text-emerald-600 transition-colors uppercase tracking-tight leading-none mb-0.5">{item.product?.name}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{item.product?.category?.name || 'General'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[10px] font-bold text-gray-400 text-center">₹{Math.round(item.priceAtTime || item.product?.price || 0)}</td>
                        <td className="px-4 py-2.5 text-right"><span className="text-[11px] font-bold text-emerald-600">+{item.quantity}</span><span className="text-[8px] font-bold text-gray-400 uppercase ml-1">{item.product?.unit?.name || 'pcs'}</span></td>
                        <td className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-900 dark:text-white">₹{Math.round(item.quantity * (item.priceAtTime || item.product?.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-20 hidden print:block">
                <div className="flex justify-between px-10 gap-20">
                  <div className="text-center flex-1">
                    <div className="border-t border-gray-400 pt-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Authorized Signatory</p>
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="border-t border-gray-400 pt-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Driver / Agent Signature</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">This is a system generated loading manifest from VillageKart Sales Tracker.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="print-section">
            <div className="print-header">
              <div className="flex justify-between items-center text-left">
                <div>
                  <h1 className="text-2xl font-bold text-emerald-600 uppercase">Loading History Logs</h1>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">VillageKart Sales Tracker</p>
                </div>
                <div className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Export Date: {new Date().toLocaleString()}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between no-print mb-6 pb-4 border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-widest"><History size={18} className="text-emerald-500" /> Loading History</h4>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowLoadModal(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <ArrowUpCircle size={14} /> Load Stock
                </button>
                <button 
                  onClick={() => fetchHistory()} 
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm cursor-pointer"
                >
                  <RefreshCw size={14} className={isFetchingHistory ? "animate-spin" : ""} /> Refresh
                </button>
                <button onClick={exportHistoryToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"><FileDown size={14} /> Export Excel</button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 dark:bg-gray-900/50 transition-all border border-gray-200 shadow-sm"><Printer size={14} /> Print History</button>
              </div>
            </div>

            {isFetchingHistory && (
              <div className="h-0.5 w-full bg-emerald-100 overflow-hidden mb-2 rounded-full">
                <div className="h-full bg-emerald-600 animate-pulse w-full" />
              </div>
            )}

            {isLoadingHistory && historyData.length === 0 ? (
              <div className="space-y-3 p-4 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200"><Clock size={32} className="mx-auto text-gray-300 mb-3" /><p className="text-sm font-bold text-gray-400">No loading history found.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 dark:bg-gray-900/50">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Date & Time</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Vehicle Number</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Authorized By</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Total SKU's</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {historyData.map((session, idx) => (
                      <tr key={`load-hist-tr-${idx}`} className="hover:bg-gray-50/40 dark:hover:bg-gray-700/20 transition-colors group">
                        <td className="px-6 py-4 text-xs text-gray-700">
                          {new Date(session.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-900 dark:text-white uppercase">
                          {session.vehicle?.vehicleNumber || 'Unspecified'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-700">
                          {session.user?.name || 'System Admin'}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-center text-emerald-600">
                          {session.items.length} Items
                        </td>
                        <td className="px-6 py-4 text-right no-print">
                          <button 
                            onClick={() => setSelectedSession(session)} 
                            className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                          >
                            View Manifest
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default LoadingSection;
