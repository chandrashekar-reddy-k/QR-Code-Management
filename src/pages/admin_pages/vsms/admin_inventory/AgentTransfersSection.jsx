import React, { useState, useEffect } from 'react';
import { Truck, Search, Barcode, ArrowUpCircle, Gift, Package, ArrowLeft, Loader2, History, Clock, CheckCircle2, RotateCcw, AlertTriangle, X, Check, ClipboardList, Info, FileDown, Printer } from 'lucide-react';
import { adminAPI } from '../services/adminService';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const AgentTransfersSection = ({ vehicles, items, can }) => {
  const [activeTab, setActiveTab] = useState('new');
  const [transfers, setTransfers] = useState([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Form states
  const [fromVehicleId, setFromVehicleId] = useState('');
  const [toVehicleId, setToVehicleId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [transferQuantities, setTransferQuantities] = useState({}); // { [productId]: quantity }
  const [sourceInventory, setSourceInventory] = useState([]);
  const [isLoadingSourceInventory, setIsLoadingSourceInventory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approval remarks
  const [approvalRemarks, setApprovalRemarks] = useState('');

  // Filters for History Tab
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Load transfers list
  const fetchTransfers = async () => {
    setIsLoadingTransfers(true);
    try {
      const res = await adminAPI.getAgentTransfers();
      const rawData = res.data;
      const list = Array.isArray(rawData) ? rawData : (rawData?.data && Array.isArray(rawData.data) ? rawData.data : []);
      setTransfers(list);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  // Fetch source vehicle inventory when fromVehicleId changes
  useEffect(() => {
    if (fromVehicleId) {
      setIsLoadingSourceInventory(true);
      setTransferQuantities({});
      adminAPI.getVehicleStock(fromVehicleId)
        .then(res => {
          // Format stock results - ONLY show products that are present in the vehicle (quantity > 0)
          const rawItems = res.data || [];
          const stockItems = rawItems
            .filter(item => (parseInt(item.quantity, 10) || 0) > 0)
            .map(item => {
              let prod = item.product;
              if (!prod && Array.isArray(items) && items.length > 0) {
                const matched = items.find(p => p.id === item.productId);
                if (matched) {
                  prod = {
                    id: matched.id,
                    name: matched.name,
                    skuCode: matched.sku || matched.skuCode || 'N/A',
                    unit: matched.unit?.name || matched.unit || 'pcs'
                  };
                }
              }
              return {
                ...item,
                product: prod
              };
            });
          setSourceInventory(stockItems);
        })
        .catch(err => console.error('Error loading source inventory:', err))
        .finally(() => setIsLoadingSourceInventory(false));
    } else {
      setSourceInventory([]);
    }
  }, [fromVehicleId, items]);

  // Active assigned vehicles only
  const activeVehicles = vehicles.filter(v => v.assignedUsers && v.assignedUsers.length > 0);

  // Destination vehicles list (excludes source vehicle)
  const destinationVehicles = activeVehicles.filter(v => v.id !== fromVehicleId);

  // Filter products by search - ONLY products with positive quantity
  const filteredProducts = sourceInventory.filter(item => {
    if ((parseInt(item.quantity, 10) || 0) <= 0) return false;
    const search = searchQuery.toLowerCase();
    const prodName = item.product?.name || item.productName || item.name || '';
    const sku = item.product?.skuCode || item.product?.sku || item.skuCode || item.sku || '';
    return prodName.toLowerCase().includes(search) || sku.toLowerCase().includes(search);
  });

  // Handle quantity changes
  const handleQuantityChange = (productId, val, maxVal) => {
    const parsed = parseInt(val, 10) || 0;
    const finalVal = Math.min(Math.max(0, parsed), maxVal);
    setTransferQuantities(prev => ({
      ...prev,
      [productId]: finalVal
    }));
  };

  // Create Transfer Request
  const handleCreateTransfer = async () => {
    if (!fromVehicleId || !toVehicleId) return;

    const itemsToTransfer = Object.entries(transferQuantities)
      .map(([productId, quantity]) => ({ productId, quantity: parseInt(quantity, 10) }))
      .filter(item => item.quantity > 0);

    if (itemsToTransfer.length === 0) {
      alert('Please specify at least one product quantity to transfer.');
      return;
    }

    const fromVehObj = activeVehicles.find(v => v.id === fromVehicleId);
    const toVehObj = activeVehicles.find(v => v.id === toVehicleId);

    const payload = {
      fromVehicleId,
      toVehicleId,
      fromUserId: fromVehObj.assignedUsers[0].id,
      toUserId: toVehObj.assignedUsers[0].id,
      remarks,
      items: itemsToTransfer
    };

    setIsSubmitting(true);
    try {
      await adminAPI.createAgentTransfer(payload);
      setFromVehicleId('');
      setToVehicleId('');
      setRemarks('');
      setTransferQuantities({});
      fetchTransfers();
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating transfer request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Transfer
  const handleApprove = async (id) => {
    setIsSubmitting(true);
    try {
      await adminAPI.approveAgentTransfer(id, { remarks: approvalRemarks });
      setApprovalRemarks('');
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error approving transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject Transfer
  const handleReject = async (id) => {
    setIsSubmitting(true);
    try {
      await adminAPI.rejectAgentTransfer(id, { remarks: approvalRemarks });
      setApprovalRemarks('');
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error rejecting transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date parsing safely
  const formatSafeDate = (dString, pattern = 'do MMM yyyy, hh:mm a') => {
    try {
      return format(new Date(dString), pattern);
    } catch (e) {
      return '---';
    }
  };

  // Filters logic
  const filteredTransfersList = transfers.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      if (new Date(t.createdAt) < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(t.createdAt) > end) return false;
    }
    return true;
  });

  // Excel Export helper
  const exportHistoryToExcel = () => {
    const flattenedData = [];
    filteredTransfersList.forEach(t => {
      t.items.forEach(item => {
        const matchedItem = Array.isArray(items) ? items.find(p => p.id === item.productId) : null;
        const displayName = item.product?.name || item.productName || item.name || matchedItem?.name || `Product (${item.productId?.slice(-6) || 'N/A'})`;
        const displaySku = item.product?.skuCode || item.product?.sku || item.skuCode || item.sku || matchedItem?.sku || '---';

        flattenedData.push({
          'Transfer ID': t.id,
          'Date': formatSafeDate(t.createdAt, 'yyyy-MM-dd HH:mm'),
          'Source Agent': t.fromUser?.name || 'N/A',
          'Source Vehicle': t.fromVehicle?.vehicleNumber || '---',
          'Dest Agent': t.toUser?.name || 'N/A',
          'Dest Vehicle': t.toVehicle?.vehicleNumber || '---',
          'Product Name': displayName,
          'SKU': displaySku,
          'Quantity': item.quantity,
          'Status': t.status,
          'Remarks': t.remarks || ''
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(flattenedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AgentTransfers");
    XLSX.writeFile(wb, `Agent_Transfers_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit no-print">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'new' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowUpCircle size={14} /> New Transfer
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
            activeTab === 'pending' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock size={14} /> Pending Approvals
          {transfers.filter(t => t.status === 'PENDING').length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[8px] font-bold w-4 h-4 flex items-center justify-center animate-bounce">
              {transfers.filter(t => t.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <History size={14} /> Transfer History
        </button>
      </div>

      {activeTab === 'new' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Routing targets</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Source Agent / Vehicle</label>
                <select
                  value={fromVehicleId}
                  onChange={(e) => {
                    setFromVehicleId(e.target.value);
                    setToVehicleId('');
                  }}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Source Agent</option>
                  {activeVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} - {v.assignedUsers[0].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Destination Agent / Vehicle</label>
                <select
                  value={toVehicleId}
                  onChange={(e) => setToVehicleId(e.target.value)}
                  disabled={!fromVehicleId}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                >
                  <option value="">Select Destination Agent</option>
                  {destinationVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} - {v.assignedUsers[0].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Remarks / Reason</label>
                <input
                  type="text"
                  placeholder="Enter reason for stock transfer..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                onClick={handleCreateTransfer}
                disabled={isSubmitting || !fromVehicleId || !toVehicleId}
                className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
                Request Transfer
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Agent Stock Transfer request</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Move products between active route vehicles</p>
              </div>
              {fromVehicleId && (
                <div className="flex items-center gap-2 bg-gray-50 border rounded-2xl px-3 py-2">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search source products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-bold text-gray-800"
                  />
                </div>
              )}
            </div>

            {!fromVehicleId ? (
              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <Truck size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Select a source agent/vehicle in target pane to view inventory</p>
              </div>
            ) : isLoadingSourceInventory ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
              </div>
            ) : sourceInventory.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <Package size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No products are currently loaded on this source vehicle</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto text-gray-200 mb-3" size={32} />
                <p className="text-sm font-bold text-gray-400">No products match search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-3xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-[9px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-6 py-4">Product Detail</th>
                      <th className="px-4 py-4 text-center">Available Stock</th>
                      <th className="px-4 py-4 text-center bg-indigo-50/30 text-indigo-600">Transfer Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.map(item => {
                      const matchedItem = Array.isArray(items) ? items.find(p => p.id === item.productId) : null;
                      const displayName = item.product?.name || item.productName || item.name || matchedItem?.name || `Product (${item.productId?.slice(-6) || 'N/A'})`;
                      const displaySku = item.product?.skuCode || item.product?.sku || item.skuCode || item.sku || matchedItem?.sku || 'N/A';
                      const displayUnit = item.product?.unit?.name || item.product?.unit || matchedItem?.unit?.name || matchedItem?.unit || 'pcs';

                      return (
                        <tr key={item.id || item.productId} className="hover:bg-gray-50/30 transition-all">
                          <td className="px-6 py-3.5">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-800 uppercase tracking-tight">
                                {displayName}
                              </span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                                {displaySku}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-gray-700">
                            {item.quantity} {displayUnit}
                          </td>
                          <td className="px-4 py-3.5 bg-indigo-50/10 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              placeholder="0"
                              className="w-16 bg-white border border-gray-250 rounded-lg py-1 px-1.5 text-center text-xs font-black text-gray-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                              value={transferQuantities[item.productId] || ''}
                              onChange={(e) => handleQuantityChange(item.productId, e.target.value, item.quantity)}
                            />
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
      )}

      {activeTab === 'pending' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Pending Approval Requests</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Review and approve agent stock transfer manifests</p>
            </div>
          </div>

          {transfers.filter(t => t.status === 'PENDING').length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-4" />
              <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No pending transfer requests found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {transfers
                .filter(t => t.status === 'PENDING')
                .map(t => (
                  <div key={t.id} className="bg-slate-55/30 border border-slate-100 rounded-3xl p-5 hover:border-emerald-200 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm">
                          {formatSafeDate(t.createdAt)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Transfer ID: {t.id.slice(-6).toUpperCase()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100/50">
                        <div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Source Agent</span>
                          <h5 className="font-black text-gray-800 text-xs truncate">{t.fromUser?.name}</h5>
                          <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-0.5"><Truck size={10} /> {t.fromVehicle?.vehicleNumber}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Destination Agent</span>
                          <h5 className="font-black text-gray-800 text-xs truncate">{t.toUser?.name}</h5>
                          <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-0.5"><Truck size={10} /> {t.toVehicle?.vehicleNumber}</span>
                        </div>
                      </div>

                      {t.remarks && (
                        <div className="my-3 p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                          <p className="text-[11px] font-bold text-amber-800 italic leading-tight">{t.remarks}</p>
                        </div>
                      )}

                      <div className="space-y-1.5 mt-3">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Transfer Manifest</span>
                        {t.items.map(item => {
                          const matchedItem = Array.isArray(items) ? items.find(p => p.id === item.productId) : null;
                          const displayName = item.product?.name || item.productName || item.name || matchedItem?.name || `Product (${item.productId?.slice(-6) || 'N/A'})`;
                          const displayUnit = item.product?.unit?.name || item.product?.unit || matchedItem?.unit?.name || matchedItem?.unit || 'pcs';
                          return (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-sm">
                              <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px]">{displayName}</span>
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{item.quantity} {displayUnit}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100/50 space-y-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Add approval/rejection remarks..."
                          value={selectedTransfer?.id === t.id ? approvalRemarks : ''}
                          onChange={(e) => {
                            setSelectedTransfer(t);
                            setApprovalRemarks(e.target.value);
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(t.id)}
                          disabled={isSubmitting}
                          className="flex-1 bg-rose-50 text-rose-600 border border-rose-100 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 active:scale-[0.98] transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(t.id)}
                          disabled={isSubmitting}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/10"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
          <div className="no-print bg-slate-50 p-5 rounded-2xl border border-gray-100 flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Start Date</span>
              <input type="date" className="bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">End Date</span>
              <input type="date" className="bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Transfer Status</span>
              <select className="bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex items-end self-end ml-auto">
              <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterStatus(''); }} className="text-xs font-black text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-widest py-2 px-3">Clear Filters</button>
            </div>
          </div>

          <div className="flex items-center justify-between no-print mb-4 pb-2 border-b border-gray-100">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest"><History size={18} className="text-emerald-500" /> Transfer logs ({filteredTransfersList.length} Sessions)</h4>
            <div className="flex items-center gap-2">
              <button onClick={exportHistoryToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"><FileDown size={14} /> Export Excel</button>
            </div>
          </div>

          {isLoadingTransfers ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
          ) : filteredTransfersList.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><Clock size={32} className="mx-auto text-gray-300 mb-3" /><p className="text-sm font-bold text-gray-400">No transfers match your criteria.</p></div>
          ) : (
            <div className="overflow-x-auto border rounded-3xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-4 py-4">Source Route (Agent)</th>
                    <th className="px-4 py-4">Destination Route (Agent)</th>
                    <th className="px-4 py-4 text-center">Items count</th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTransfersList.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/30 transition-all text-xs">
                      <td className="px-6 py-3.5 font-bold text-gray-600">{formatSafeDate(t.createdAt, 'dd MMM yy, hh:mm a')}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 uppercase tracking-tight">{t.fromVehicle?.vehicleNumber}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">{t.fromUser?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 uppercase tracking-tight">{t.toVehicle?.vehicleNumber}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">{t.toUser?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-black text-slate-700">
                        {t.items.reduce((sum, i) => sum + i.quantity, 0)} Units ({t.items.length} SKUs)
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                            t.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-250' :
                            t.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-250' :
                            'bg-rose-50 text-rose-600 border-rose-250'
                          }`}>
                            {t.status === 'PENDING' ? '⏳ Pending' : t.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
                          </span>
                          {t.approvalHistory?.[0] && (
                            <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
                              By: {t.approvalHistory[0].user?.name || 'Admin'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-gray-400 max-w-[200px] truncate" title={t.remarks}>
                        {t.remarks || '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentTransfersSection;
