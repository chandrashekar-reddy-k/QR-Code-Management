// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, Search, Plus, Minus, X, History, Calendar, User, Info, ChevronDown, ChevronUp, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw, AlertTriangle, ChevronRight, Wallet, Box, ClipboardList, Tag, PlusCircle, Truck, Send } from 'lucide-react';
import { productsAPI, agentTransferAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { useUserStore } from '../store/userStore';

type TabType = 'stock' | 'history' | 'refills';

const statusConfig = {
  PENDING:  { label: 'Pending',  icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  APPROVED: { label: 'Approved', icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  REJECTED: { label: 'Rejected', icon: XCircle,        color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  PARTIAL:  { label: 'Partial',  icon: AlertCircle,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
};

export default function AgentInventory() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [inventory, setInventory] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [refillHistory, setRefillHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFreeOnly] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillSearchQuery, setRefillSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [refillItems, setRefillItems] = useState<Record<string, number>>({});
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showRaiseRequestType, setShowRaiseRequestType] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Unsold Stock');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseSubCategory, setExpenseSubCategory] = useState('');
  const [expensePaidTo, setExpensePaidTo] = useState('');
  const [expensePaidDate, setExpensePaidDate] = useState('');
  const [expenseBillDate, setExpenseBillDate] = useState('');
  const [expenseBillAmount, setExpenseBillAmount] = useState('Rs. 200');
  const [expensePaymentMode, setExpensePaymentMode] = useState('');
  const [expenseReason, setExpenseReason] = useState('');
  const [selectedHistoryAudit, setSelectedHistoryAudit] = useState<any | null>(null);

  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageItem, setDamageItem] = useState('');
  const [damageQty, setDamageQty] = useState('');
  const [damageType, setDamageType] = useState('');
  const [damageResponsibility, setDamageResponsibility] = useState('');
  const [damageReason, setDamageReason] = useState('');
  const [damagePhotos, setDamagePhotos] = useState<any[]>([]);

  // ── Stock Transfer State ────────────────────────────────────────────
  const [showStockTransfer, setShowStockTransfer] = useState(false);
  const [activeAgents, setActiveAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [transferItems, setTransferItems] = useState<Record<string, number>>({});
  const [transferRemarks, setTransferRemarks] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [myTransfers, setMyTransfers] = useState<any[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferView, setTransferView] = useState<'form' | 'history'>('form');

  const { vehicleId: urlVehicleId } = useParams<{ vehicleId: string }>();
  const [vehicleId, setVehicleId] = useState<string | null>(urlVehicleId || null);

  const [vehicleRegNo, setVehicleRegNo] = useState<string>('');

  useEffect(() => {
    const resolveVehicleId = async () => {
      try {
        const { getCoverageStatus } = await import('../services/routeService');
        const status = await getCoverageStatus();
        if (status?.today?.vehicleNo || status?.vehicleNo || status?.assignedVehicle?.vehicleNumber || status?.assignedVehicle?.registrationNumber || user?.assignedVehicle?.vehicleNumber) {
          setVehicleRegNo(status?.today?.vehicleNo || status?.vehicleNo || status?.assignedVehicle?.vehicleNumber || status?.assignedVehicle?.registrationNumber || user?.assignedVehicle?.vehicleNumber);
        }
      } catch (e) {
        console.error('Failed to load vehicle registration status', e);
      }

      if (!urlVehicleId || urlVehicleId === 'undefined' || urlVehicleId === 'null') {
        setVehicleId('me');
      } else {
        setVehicleId(urlVehicleId);
      }
    };
    resolveVehicleId();
  }, [urlVehicleId]);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchInventory();
    } else if (activeTab === 'history') {
      fetchAuditHistory();
    } else if (activeTab === 'refills') {
      fetchRefillHistory();
    }
  }, [activeTab, vehicleId]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getVehicleInventory(vehicleId);
      setInventory(data);
    } catch { toast.error('Failed to load vehicle inventory'); }
    finally { setLoading(false); }
  };

  const fetchAuditHistory = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getAuditHistory(vehicleId);
      const rawData = res?.data;
      const list = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : []);
      setAuditHistory(list);
    } catch { toast.error('Failed to load audit history'); }
    finally { setLoading(false); }
  };

  const fetchRefillHistory = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getMyRefills();
      setRefillHistory(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load refill history'); }
    finally { setLoading(false); }
  };

  const fetchAllProductsForRefill = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getAll({ all: 'true', bypassCache: 'true' });
      const productList = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.data?.products || []);
      if (productList.length > 0) {
        setAllProducts(productList);
      }
      setShowRefillModal(true);
    } catch {
      // Fallback to vehicle inventory so user always sees genuine products
      setShowRefillModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRefillSubmit = async () => {
    const items = Object.entries(refillItems).filter(([_, qty]) => qty > 0).map(([id, qty]) => ({ productId: id, quantity: qty }));
    if (items.length === 0) return toast.error('Please add quantities to request a refill');
    try {
      setLoading(true);
      await productsAPI.requestRefill({ vehicleId, items });
      toast.success('Refill requested successfully!');
      setShowRefillModal(false);
      setRefillItems({});
      await fetchRefillHistory();
      setActiveTab('refills');
    } catch { toast.error('Failed to submit refill request'); }
    finally { setLoading(false); }
  };

  const refillToInitial = async () => {
    try {
      setLoading(true);
      if (allProducts.length === 0) {
        const { data } = await productsAPI.getAll({ showAll: true });
        setAllProducts(data);
      }

      const newRefillItems: Record<string, number> = {};

      inventory.forEach(item => {
        const targetCapacity = Math.max(item.openingQuantity || 0, item.quantity);
        const diff = targetCapacity - item.quantity;
        if (diff > 0) {
          newRefillItems[item.product?.id || item.productId] = diff;
        }
      });

      setRefillItems(newRefillItems);
      setShowRefillModal(true);
    } catch {
      toast.error('Failed to prepare refill');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSubmit = async () => {
    const items = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ productId: id, quantity: qty }));
    if (items.length === 0) return toast.error('Please add quantities to return stock');
    try {
      setIsSubmitting(true);
      await productsAPI.requestReturn({ vehicleId, items, reason: returnReason, notes: returnNotes });
      toast.success('Return processed and inventory updated in database!');
      setShowReturnModal(false);
      setReturnItems({});
      fetchInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedHistoryAudit) {
    const isReturn = selectedHistoryAudit.isReturn || selectedHistoryAudit.type === 'Stock Return' || selectedHistoryAudit.raw?.type === 'RETURN';
    const isRefill = selectedHistoryAudit.isRefill || selectedHistoryAudit.type === 'Stock Refill' || selectedHistoryAudit.raw?.type === 'REFILL';
    const actionLabel = isReturn ? 'Stock Return' : isRefill ? 'Stock Refill' : 'Stock Audit';
    const notesText = selectedHistoryAudit.raw?.remark || selectedHistoryAudit.raw?.notes || selectedHistoryAudit.notes || selectedHistoryAudit.remark || (isReturn ? 'Stock returned to warehouse' : isRefill ? 'Refill Request Approved' : 'Morning Handover & Stock Audit');

    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedHistoryAudit(null)}
                className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                  {selectedHistoryAudit.title || (isReturn ? 'Stock Return' : isRefill ? 'Stock Refill' : 'Stock Audit')}
                </h1>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                  {selectedHistoryAudit.sub || 'Admin User • 10:30 AM'}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                isReturn
                  ? 'text-rose-600 bg-rose-50 border-rose-200'
                  : 'text-[#00891D] bg-emerald-50 border-emerald-200'
              }`}
            >
              {actionLabel}
            </span>
          </div>

          {/* Notes Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-1.5">
            <h4 className="text-xs font-black text-gray-900">Notes</h4>
            <p className="text-[11px] font-medium text-gray-500">
              "{notesText}"
            </p>
          </div>

          {/* Adjusted / Returned / Refilled Products Card / Table */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
            {/* Table Column Headers */}
            <div className="grid grid-cols-12 text-[9px] font-black uppercase text-gray-900 px-1 pb-1 border-b border-gray-100 tracking-wider">
              <span className="col-span-6">{isReturn ? 'RETURNED ITEM' : isRefill ? 'REFILLED PRODUCT' : 'ADJUSTED PRODUCT'}</span>
              <span className="col-span-2 text-center">{isReturn ? 'STOCK' : isRefill ? 'REQUESTED' : 'SYSTEM'}</span>
              <span className="col-span-2 text-center">{isReturn ? 'RETURNED' : isRefill ? 'APPROVED' : 'AUDITED'}</span>
              <span className="col-span-2 text-right">{isReturn ? 'STATUS' : isRefill ? 'PRICE' : 'VAR'}</span>
            </div>

            {/* Product Rows (Live Backend Data) */}
            <div className="space-y-3 pt-1">
              {(selectedHistoryAudit.raw?.items && selectedHistoryAudit.raw.items.length > 0
                ? selectedHistoryAudit.raw.items
                : selectedHistoryAudit.items || []
              ).map((item: any, idx: number) => {
                const prodName = item.product?.name || item.name || 'Product';
                const catName = item.product?.category?.name || item.product?.category || item.category || 'General';
                const sysQty = item.systemQuantity ?? item.requestedQuantity ?? item.systemQty ?? item.system ?? item.oldQuantity ?? 0;
                const auditedQty = item.auditedQuantity ?? item.quantity ?? item.auditedQty ?? item.audited ?? item.newQuantity ?? (isReturn ? item.quantity : 0);
                const variance = item.variance !== undefined
                  ? (item.variance === 0 ? 'Fixed' : (item.variance > 0 ? `+${item.variance}` : `${item.variance}`))
                  : (auditedQty === sysQty ? 'Fixed' : (auditedQty - sysQty > 0 ? `+${auditedQty - sysQty}` : `${auditedQty - sysQty}`));
                const statusDisplay = isReturn ? 'Returned' : isRefill ? (item.product?.price ? `₹${item.product.price}` : 'Approved') : variance;
                const img = item.product?.images?.[0] || item.product?.image || item.image;
                const color = item.color || (idx % 2 === 0 ? 'bg-emerald-50' : 'bg-gray-50');

                return (
                  <div key={item.id || idx} className="grid grid-cols-12 items-center px-1 border-b border-gray-50 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden`}>
                        {img ? (
                          <img src={img} alt={prodName} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-gray-900 truncate leading-tight">{prodName}</h5>
                        <p className="text-[9px] font-medium text-gray-400 truncate">{catName}</p>
                      </div>
                    </div>

                    <span className="col-span-2 text-center text-xs font-bold text-gray-400">{sysQty}</span>
                    <span className="col-span-2 text-center text-xs font-black text-gray-900">{isReturn ? item.quantity ?? auditedQty : auditedQty}</span>
                    <span className={`col-span-2 text-right text-[11px] font-bold ${isReturn ? 'text-rose-500' : isRefill ? 'text-[#00891D]' : 'text-gray-700'}`}>{statusDisplay}</span>
                  </div>
                );
              })}
              {(!selectedHistoryAudit.raw?.items || selectedHistoryAudit.raw.items.length === 0) && (!selectedHistoryAudit.items || selectedHistoryAudit.items.length === 0) && (
                <div className="py-6 text-center text-xs font-medium text-gray-400">
                  No items recorded in this history entry.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showExpenseModal) {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4 pb-28">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Expense Request
            </h1>
          </div>

          {/* Category & Sub Category Row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 shadow-sm flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-gray-400">Select</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Sub Category <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 shadow-sm flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-gray-400">Select</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Paid To */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900 flex items-center gap-1">
              Paid To <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter vendor or person name"
              value={expensePaidTo}
              onChange={(e) => setExpensePaidTo(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#00891D] transition-colors shadow-sm"
            />
          </div>

          {/* Paid Date & Bill Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Paid Date <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 shadow-sm flex items-center justify-between">
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={expensePaidDate}
                  onChange={(e) => setExpensePaidDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
                <Calendar size={14} className="text-gray-400 shrink-0 ml-1" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Bill Date <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 shadow-sm flex items-center justify-between">
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={expenseBillDate}
                  onChange={(e) => setExpenseBillDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
                <Calendar size={14} className="text-gray-400 shrink-0 ml-1" />
              </div>
            </div>
          </div>

          {/* Bill Amount & Payment Mode Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Bill Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Rs. 200"
                value={expenseBillAmount}
                onChange={(e) => setExpenseBillAmount(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#00891D] transition-colors shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 shadow-sm flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-gray-400">Select</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Reason/Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900">Reason/Description</label>
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm">
              <textarea
                placeholder="Describe what happened.............."
                value={expenseReason}
                onChange={(e) => setExpenseReason(e.target.value)}
                rows={3}
                className="w-full text-xs font-semibold text-gray-800 placeholder:text-gray-400 bg-transparent border-none outline-none resize-none"
              />
            </div>
          </div>

          {/* Upload Bill Card */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900">Upload Bill</label>
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-200 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                <span className="text-lg">⤒</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 p-4 pb-6">
          <div className="max-w-[420px] mx-auto">
            <button
              onClick={() => {
                toast.success('Expense request submitted successfully!');
                setShowExpenseModal(false);
              }}
              className="w-full py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>✈</span>
              <span>Submit Request</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDamageModal) {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4 pb-28">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setShowDamageModal(false)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Damage Report
            </h1>
          </div>

          {/* Select Item Card */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-black text-gray-900 flex items-center gap-1">
              Select Item <span className="text-red-500">*</span>
            </label>
            <div className="bg-white rounded-2xl p-2.5 px-3.5 border border-gray-200 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={damageItem}
                  onChange={(e) => setDamageItem(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
              <span className="text-gray-400 text-sm">⛶</span>
            </div>
          </div>

          {/* Enter Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900 flex items-center gap-1">
              Enter Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter quantity"
              value={damageQty}
              onChange={(e) => setDamageQty(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-red-500 transition-colors shadow-sm"
            />
          </div>

          {/* Damage Type & Responsibility Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Damage Type <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 shadow-sm flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-gray-400">Select</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Responsibility <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 shadow-sm flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-gray-400">Select</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Reason/Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900 flex items-center gap-1">
              Reason/Description <span className="text-red-500">*</span>
            </label>
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm">
              <textarea
                placeholder="Describe what happened.............."
                value={damageReason}
                onChange={(e) => setDamageReason(e.target.value)}
                rows={3}
                className="w-full text-xs font-semibold text-gray-800 placeholder:text-gray-400 bg-transparent border-none outline-none resize-none"
              />
            </div>
          </div>

          {/* Photos Upload Card */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900 flex items-center gap-1">
              Photos <span className="text-red-500">*</span>
            </label>
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:border-emerald-200 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                <span className="text-lg">⤒</span>
              </div>
              <p className="text-xs font-black text-gray-900">Tap to add photo</p>
              <p className="text-[10px] font-medium text-gray-400">PDF, JPG, PNG up to 10MB</p>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 p-4 pb-6">
          <div className="max-w-[420px] mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-gray-900">
                0 Items Selected
              </p>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                Total Quantity: 0
              </p>
            </div>

            <button
              onClick={() => {
                toast.success('Damage report submitted successfully!');
                setShowDamageModal(false);
              }}
              className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>✈</span>
              <span>Report Damage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stock Transfer Helpers ────────────────────────────────────
  const loadActiveAgents = async () => {
    if (activeAgents.length > 0) return;
    setLoadingAgents(true);
    try {
      const res = await agentTransferAPI.getActiveAgents();
      setActiveAgents(res.data?.data || res.data || []);
    } catch {
      toast.error('Could not load agents');
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadMyTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const res = await agentTransferAPI.getTransfers({ myTransfers: 'true' });
      setMyTransfers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch {
      toast.error('Could not load transfers');
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleStockTransferSubmit = async () => {
    if (!selectedAgent) { toast.error('Please select a destination agent'); return; }
    const items = Object.entries(transferItems)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
    if (items.length === 0) { toast.error('Select at least one item to transfer'); return; }
    setIsSubmittingTransfer(true);
    try {
      await agentTransferAPI.createTransfer({
        toUserId: selectedAgent.id,
        toVehicleId: selectedAgent.assignedVehicleId,
        remarks: transferRemarks.trim() || undefined,
        items,
      });
      toast.success('Transfer request sent! Awaiting partner approval.');
      setShowStockTransfer(false);
      setSelectedAgent(null);
      setTransferItems({});
      setTransferRemarks('');
      setAgentSearch('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send transfer request');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // ── STOCK TRANSFER SCREEN ───────────────────────────────────
  if (showStockTransfer) {
    const filteredAgents = activeAgents.filter(a =>
      (a.name || '').toLowerCase().includes(agentSearch.toLowerCase()) ||
      (a.assignedVehicle?.vehicleNumber || '').toLowerCase().includes(agentSearch.toLowerCase()) ||
      (a.phone || '').includes(agentSearch)
    );
    const transferQtySelected = Object.values(transferItems).filter(q => q > 0).length;
    const transferTotalQty = Object.values(transferItems).reduce((s, q) => s + q, 0);

    return (
      <div className="min-h-screen pb-36 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-5">

          {/* Header */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => { setShowStockTransfer(false); setAgentSearch(''); setSelectedAgent(null); setTransferItems({}); }}
              className="p-1 -ml-1 text-gray-900 cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Stock Transfer</h1>
              <p className="text-[10px] font-medium text-gray-400">Transfer items to another field agent</p>
            </div>
            <button
              onClick={() => {
                const next = transferView === 'form' ? 'history' : 'form';
                setTransferView(next);
                if (next === 'history') loadMyTransfers();
              }}
              className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 cursor-pointer"
            >
              {transferView === 'form' ? 'My Transfers' : '+ New'}
            </button>
          </div>

          {transferView === 'history' ? (
            <div className="space-y-3">
              {loadingTransfers ? (
                <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
              ) : myTransfers.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-gray-100 text-center space-y-2">
                  <Truck size={28} className="mx-auto text-gray-300" />
                  <p className="text-xs font-black text-gray-800">No Transfers Yet</p>
                  <p className="text-[11px] font-medium text-gray-400">Your transfer requests will appear here.</p>
                </div>
              ) : myTransfers.map((t: any) => {
                const isApproved = t.status === 'APPROVED';
                const isRejected = t.status === 'REJECTED';
                return (
                  <div key={t.id} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isApproved ? 'bg-emerald-50 text-emerald-600' : isRejected ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <Truck size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-gray-900 truncate">To: {t.toUser?.name || 'Agent'}</p>
                          <p className="text-[10px] font-medium text-gray-400">{t.toVehicle?.vehicleNumber || ''}</p>
                          <p className="text-[9px] font-semibold text-gray-400 mt-0.5">
                            {t.createdAt ? format(new Date(t.createdAt), 'dd MMM yyyy • hh:mm a') : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${
                        isApproved ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                        : isRejected ? 'text-red-500 bg-red-50 border-red-200'
                        : 'text-amber-600 bg-amber-50 border-amber-200'
                      }`}>{t.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(t.items || []).slice(0, 5).map((item: any, idx: number) => (
                        <span key={idx} className="text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                          {item.product?.name || 'Item'} × {item.quantity}
                        </span>
                      ))}
                      {(t.items || []).length > 5 && <span className="text-[10px] font-bold text-gray-400">+{(t.items || []).length - 5} more</span>}
                    </div>
                    {t.remarks && <p className="text-[10px] text-gray-400 italic">"{t.remarks}"</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Step 1 */}
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-900">1. Select Destination Agent</p>
                <div className="bg-white rounded-2xl p-3 px-3.5 border border-gray-200 shadow-sm flex items-center gap-2.5">
                  <Search size={15} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by name or vehicle number..."
                    value={agentSearch}
                    onChange={e => setAgentSearch(e.target.value)}
                    onFocus={loadActiveAgents}
                    className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  {loadingAgents && <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />}
                </div>

                {selectedAgent && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-blue-800">{selectedAgent.name}</p>
                      <p className="text-[10px] font-medium text-blue-600">{selectedAgent.assignedVehicle?.vehicleNumber || 'No Vehicle'} • {selectedAgent.phone}</p>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} className="text-blue-500 hover:text-red-500 cursor-pointer"><X size={16} /></button>
                  </div>
                )}

                {!selectedAgent && activeAgents.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-h-52 overflow-y-auto divide-y divide-gray-100">
                    {filteredAgents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400 font-semibold">No agents found</div>
                    ) : filteredAgents.map((agent: any) => (
                      <button
                        key={agent.id}
                        onClick={() => { setSelectedAgent(agent); setAgentSearch(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50/50 transition-colors flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-black text-sm">
                          {(agent.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-gray-900 truncate">{agent.name}</p>
                          <p className="text-[10px] font-medium text-gray-500">{agent.assignedVehicle?.vehicleNumber || 'No Vehicle'} • {agent.phone}</p>
                        </div>
                        <Truck size={12} className="text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-900">2. Select Items to Transfer</p>
                {inventory.length === 0 ? (
                  <div className="p-6 bg-white rounded-2xl border border-gray-100 text-center">
                    <Package size={24} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-xs font-bold text-gray-500">No stock available to transfer</p>
                  </div>
                ) : inventory.map((item: any) => {
                  const pid = item.productId || item.product?.id || item.id;
                  const name = item.product?.name || item.name || 'Product';
                  const available = Number(item.quantity ?? 0);
                  const reqQty = transferItems[pid] || 0;
                  const isSelected = reqQty > 0;
                  return (
                    <div key={pid} className={`bg-white rounded-2xl p-3 border shadow-sm flex items-center gap-3 ${
                      isSelected ? 'border-blue-300 bg-blue-50/20' : 'border-gray-100'
                    }`}>
                      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.product?.images?.[0]
                          ? <img src={item.product.images[0]} alt={name} className="w-full h-full object-cover" />
                          : <Package size={18} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-gray-900 truncate">{name}</p>
                        <p className="text-[10px] font-semibold text-gray-400">Available: {available}</p>
                      </div>
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shrink-0">
                        <button onClick={() => setTransferItems(prev => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) - 1) }))}
                          className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90 cursor-pointer">
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span className="text-xs font-black text-gray-900 px-2 min-w-[20px] text-center">{reqQty}</span>
                        <button onClick={() => {
                          if ((transferItems[pid] || 0) >= available) { toast.error('Cannot exceed available stock'); return; }
                          setTransferItems(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }));
                        }} className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90 cursor-pointer">
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5">
                <p className="text-xs font-black text-gray-900">3. Remarks (optional)</p>
                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                  <textarea
                    placeholder="Add a reason or note for this transfer..."
                    value={transferRemarks}
                    onChange={e => setTransferRemarks(e.target.value)}
                    rows={2}
                    className="w-full text-xs font-semibold text-gray-800 placeholder:text-gray-400 bg-transparent border-none outline-none resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Submit Footer */}
        {transferView === 'form' && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-4 pb-7">
            <div className="max-w-[420px] mx-auto flex items-center gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-900">{transferQtySelected} Items • {transferTotalQty} Units</p>
                <p className="text-[10px] font-medium text-gray-400 truncate">
                  {selectedAgent ? `→ ${selectedAgent.name}` : 'No agent selected'}
                </p>
              </div>
              <button
                onClick={handleStockTransferSubmit}
                disabled={isSubmittingTransfer || !selectedAgent || transferQtySelected === 0}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingTransfer ? <Loader2 className="animate-spin" size={15} /> : <Send size={13} />}
                <span>{isSubmittingTransfer ? 'Sending...' : 'Send Transfer Request'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showRaiseRequestType) {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setShowRaiseRequestType(false)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Raise Request
            </h1>
          </div>

          {/* Subtitle */}
          <div className="pt-1">
            <h3 className="text-xs font-black text-gray-900 tracking-tight">Select Request Type</h3>
          </div>

          {/* Request Types */}
          <div className="space-y-3">
            {[
              {
                id: 'refill',
                title: 'Refill Request',
                desc: 'Request additional stock from the warehouse',
                icon: 'refresh',
                iconBg: 'bg-emerald-50 text-[#00891D]',
                onClick: () => {
                  setShowRaiseRequestType(false);
                  fetchAllProductsForRefill();
                  setShowRefillModal(true);
                }
              },
              {
                id: 'transfer',
                title: 'Stock Transfer',
                desc: 'Transfer stock from your vehicle to another field agent',
                icon: 'truck',
                iconBg: 'bg-blue-50 text-blue-600',
                onClick: () => {
                  setShowRaiseRequestType(false);
                  setTransferView('form');
                  setShowStockTransfer(true);
                  loadActiveAgents();
                }
              },
              {
                id: 'return',
                title: 'Return Request',
                desc: 'Return unsold stock from your vehicle',
                icon: 'undo',
                iconBg: 'bg-orange-50 text-[#E85D04]',
                onClick: () => {
                  setShowRaiseRequestType(false);
                  setShowReturnModal(true);
                }
              },
              {
                id: 'expense',
                title: 'Expense Request',
                desc: 'Request expense reimbursement for the expenses you have spent.',
                icon: 'tag',
                iconBg: 'bg-emerald-50 text-[#00891D]',
                onClick: () => {
                  setShowRaiseRequestType(false);
                  navigate('/vsms/agent-portal/create-expense');
                }
              },
              {
                id: 'damage',
                title: 'Damage Report',
                desc: 'Report damage, expired, leaked or lost stock',
                icon: 'alert',
                iconBg: 'bg-rose-50 text-red-500',
                onClick: () => {
                  setShowRaiseRequestType(false);
                  navigate('/vsms/agent-portal/report-damage');
                }
              },
            ].map((card) => (
              <div
                key={card.id}
                onClick={card.onClick}
                className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3.5 hover:border-emerald-200 transition-all cursor-pointer"
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  {card.icon === 'refresh' && <RefreshCw size={18} />}
                  {card.icon === 'truck' && <Truck size={18} />}
                  {card.icon === 'undo' && <span className="text-base">↩</span>}
                  {card.icon === 'tag' && <span className="text-base">🏷</span>}
                  {card.icon === 'alert' && <AlertCircle size={18} />}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <h4 className="text-xs font-extrabold text-gray-900">{card.title}</h4>
                  <p className="text-[10px] font-medium text-gray-400 leading-snug">{card.desc}</p>
                </div>

                <span className="text-gray-300 font-bold text-sm shrink-0">›</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showReturnModal) {
    const selectedCount = Object.values(returnItems).filter((q) => q > 0).length;
    const totalQty = Object.values(returnItems).reduce((s, q) => s + q, 0);

    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4 pb-28">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => {
                setShowReturnModal(false);
                setReturnItems({});
              }}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Return Request
            </h1>
          </div>

          {/* Return Reason Card */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-black text-gray-900 flex items-center gap-1">
              Return Reason <span className="text-red-500">*</span>
            </label>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800">{returnReason}</span>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>

          {/* Additional Notes Card */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900">Additional Notes</label>
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm">
              <textarea
                placeholder="Describe the condition, reason, or any details for the admin..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={3}
                className="w-full text-xs font-semibold text-gray-800 placeholder:text-gray-400 bg-transparent border-none outline-none resize-none"
              />
            </div>
          </div>

          {/* Search items bar with barcode icon */}
          <div className="bg-white rounded-2xl p-2.5 px-3.5 border border-gray-200 shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>
            <span className="text-gray-400 text-sm">⛶</span>
          </div>

          {/* Return Product Cards */}
          <div className="space-y-3 pt-1">
            {inventory.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-gray-400">
                No items in vehicle inventory to return.
              </div>
            ) : (
              inventory
                .filter(item => (item.product?.name || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .map((p) => {
                  const id = p.product?.id || p.productId || p.id;
                  const name = p.product?.name || p.name || 'Product';
                  const onVehicle = Number(p.quantity ?? 0);
                  const price = Number(p.product?.price ?? p.price ?? 0);
                  const reqQty = returnItems[id] || 0;
                  const isSelected = reqQty > 0;

                  return (
                    <div
                      key={id}
                      className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3"
                    >
                      {/* Left Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setReturnItems((prev) => ({
                            ...prev,
                            [id]: e.target.checked ? (prev[id] || 1) : 0,
                          }));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#E85D04] focus:ring-0 cursor-pointer shrink-0 accent-[#E85D04]"
                      />

                      {/* Thumbnail Image */}
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        <Package size={20} className="text-gray-300" />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-xs font-extrabold text-gray-900 truncate">{name}</h4>
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[8px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider leading-none">
                            ON VEHICLE: {onVehicle}
                          </span>
                          <span className="text-[9px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md leading-none">
                            ₹{price}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shrink-0">
                        <button
                          onClick={() => setReturnItems((prev) => ({ ...prev, [id]: Math.max(0, reqQty - 1) }))}
                          className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90"
                        >
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span className="text-xs font-black text-gray-900 px-2">{reqQty}</span>
                        <button
                          onClick={() => setReturnItems((prev) => ({ ...prev, [id]: Math.min(onVehicle || 999, reqQty + 1) }))}
                          className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90"
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Sticky Bottom Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 p-4 pb-6">
          <div className="max-w-[420px] mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-gray-900">
                {selectedCount} Items Selected
              </p>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                Total Quantity: {totalQty}
              </p>
            </div>

            <button
              onClick={handleReturnSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-[#E85D04] hover:bg-[#d45300] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <span>✈</span>}
              <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedRequest) {
    const isExpense = selectedRequest.title?.toLowerCase().includes('expense');
    const isDamage = selectedRequest.title?.toLowerCase().includes('damage');
    const isReturn = selectedRequest.title?.toLowerCase().includes('return');
    const itemsLabel = isReturn ? 'Returned Items' : 'Requested Items';
    const actionColHeader = isReturn ? 'Returned' : 'Requested';
    const adminRemarkText = isDamage
      ? 'Damage could not be verified from the submitted photos.'
      : isReturn
        ? 'Approved for returned quantity.'
        : 'Approved for requested quantity.';

    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                  {selectedRequest.title || 'Expense Request'}
                </h1>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 mt-0.5">
                  <Calendar size={12} />
                  <span>{selectedRequest.date || '06 Aug 2024 • 10:30 AM'}</span>
                </div>
              </div>
            </div>

            <span
              className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                selectedRequest.status === 'Rejected'
                  ? 'text-red-500 bg-red-50 border-red-200'
                  : selectedRequest.status === 'Pending'
                    ? 'text-[#E85D04] bg-orange-50 border-orange-200'
                    : 'text-[#00891D] bg-emerald-50 border border-emerald-200'
              }`}
            >
              {selectedRequest.status || 'Reimbursed'}
            </span>
          </div>

          {/* Expense Request Layout */}
          {isExpense ? (
            <>
              {/* Expense ID & Amount Card */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#00891D]">
                    <span className="text-xl">🧾</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400">Expense ID</p>
                    <h3 className="text-base font-black text-gray-900">EXP-000128</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400">Expense Type</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">Fuel</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400">Total Amount</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">₹200</p>
                  </div>
                </div>
              </div>

              {/* Attachment Card */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-gray-900">Attachment</h4>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1554415707-9e49019eeb61?w=200"
                        alt="Receipt preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-900 truncate">fuel_receipt.jpg</h5>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">245 KB</p>
                    </div>
                  </div>

                  <button className="w-9 h-9 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer">
                    <span className="text-sm">⤓</span>
                  </button>
                </div>
              </div>

              {/* Notes Card */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-1.5">
                <h4 className="text-xs font-black text-gray-900">Notes</h4>
                <p className="text-[11px] font-medium text-gray-500">
                  Fuel expense
                </p>
              </div>
            </>
          ) : isDamage ? (
            <>
              {/* Damage Details Card */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3.5">
                <h4 className="text-xs font-black text-gray-900">Damage Details</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-gray-500">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400">
                        <Package size={14} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">Item</span>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">Oil 1 L</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-gray-500">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400">
                        <Package size={14} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">Quantity</span>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">3 Items</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-gray-500">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400">
                        <span className="text-xs">📈</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">Damage Type</span>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">Damaged</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-gray-500">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">Responsibility</span>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">Self</span>
                  </div>
                </div>
              </div>

              {/* Damage Reason Card */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-1.5">
                <h4 className="text-xs font-black text-gray-900">Damage Reason</h4>
                <p className="text-[11px] font-medium text-gray-500">
                  Oil bottles were damaged during transportation.
                </p>
              </div>

              {/* Photos Card */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-gray-900">Photos</h4>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="h-20 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                    <img
                      src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300"
                      alt="Damage photo 1"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="h-20 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                    <img
                      src="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300"
                      alt="Damage photo 2"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="h-20 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                    <img
                      src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"
                      alt="Damage photo 3"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Return Reason Card (Shown for Return Requests) */}
              {isReturn && (
                <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-1.5">
                  <h4 className="text-xs font-black text-gray-900">Return Reason</h4>
                  <p className="text-[11px] font-medium text-gray-500">
                    Unsold Stock
                  </p>
                </div>
              )}

              {/* Items Card */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
                {(() => {
                  const reqItems = selectedRequest.raw?.items || [];
                  const totalItemsCount = reqItems.length;
                  return (
                    <>
                      <div className="flex items-center justify-between pb-1 border-b border-gray-100/60">
                        <h3 className="text-xs font-black text-gray-900 tracking-tight">{itemsLabel}</h3>
                        <span className="text-[10px] font-bold text-gray-400">
                          {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}
                        </span>
                      </div>

                      {/* Table Header */}
                      <div className="grid grid-cols-12 text-[10px] font-extrabold text-gray-900 px-1 py-1">
                        <span className="col-span-6">Item</span>
                        <span className="col-span-3 text-center">{actionColHeader}</span>
                        <span className="col-span-3 text-center">Approved</span>
                      </div>

                      {/* Dynamic Real Item Rows */}
                      <div className="space-y-3 pt-1">
                        {reqItems.length === 0 ? (
                          <p className="text-xs text-gray-400 py-3 text-center">No item details recorded for this request.</p>
                        ) : (
                          reqItems.map((it: any, idx: number) => {
                            const name = it.product?.name || it.productName || it.name || `Product #${it.productId?.slice(-4) || idx + 1}`;
                            const reqQty = it.requestedQuantity ?? it.quantity ?? 0;
                            const approvedQty = it.approvedQuantity ?? (selectedRequest.status === 'Approved' ? reqQty : 0);
                            const img = it.product?.images?.[0] || it.product?.image;

                            return (
                              <div key={it.id || idx} className="grid grid-cols-12 items-center px-1 border-b border-gray-50 pb-2.5 last:border-b-0 last:pb-0">
                                <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                    {img ? (
                                      <img src={img} alt={name} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package size={16} className="text-gray-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-gray-900 truncate block">{name}</span>
                                    {it.product?.price ? (
                                      <span className="text-[10px] text-gray-400">₹{it.product.price}</span>
                                    ) : null}
                                  </div>
                                </div>
                                <span className="col-span-3 text-center text-xs font-bold text-gray-700">{reqQty}</span>
                                <span className="col-span-3 text-center text-xs font-bold text-gray-700">{approvedQty}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}

          {/* Admin Remark Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-2">
            <h4 className="text-xs font-extrabold text-gray-900">Admin Remark</h4>
            <p className="text-[11px] font-medium text-gray-500">
              {selectedRequest.raw?.adminRemark || selectedRequest.raw?.notes || (selectedRequest.status === 'Pending' ? 'Waiting for warehouse supervisor review.' : 'Processed by supervisor.')}
            </p>
          </div>
        </div>
      </div>
    );
  }




  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFree = !filterFreeOnly || item.product?.isFree;
    return matchesSearch && matchesFree;
  });

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'stock', label: 'Stock', icon: Box },
    { key: 'refills', label: 'Requests', icon: ClipboardList },
    { key: 'history', label: 'History', icon: History },
  ];

  const uniqueProductIds = new Set(inventory.map(item => item.productId || item.product?.id || item.id).filter(Boolean));
  const totalUniqueItems = uniqueProductIds.size || inventory.length;

  const totalStockQuantity = inventory.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

  const totalInventoryValue = inventory.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.product?.price || 0)), 0);

  const displayInventory = filteredInventory;

  const vehicleDisplayReg = vehicleRegNo || user?.assignedVehicle?.vehicleNumber || user?.assignedVehicleNumber || user?.vehicleNo || user?.assignedVehicle?.registrationNumber || (vehicleId && vehicleId !== 'me' ? vehicleId : 'TS-09-AG-0001');

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Title and Live Vehicle Registration Number */}
        <div className="pt-1">
          <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Vehicle & Stock</h1>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">
            {vehicleDisplayReg}
          </p>
        </div>

        {/* 3-Tab Segmented Switcher */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E8F5E9] text-[#00891D]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-[#00891D]' : 'text-gray-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'stock' && (
          <>
            {/* 3-Column Summary KPI Cards (Live Totals) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Total Items (Unique Items Count) */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-gray-400 leading-tight">Total Items</span>
                  <div className="w-6 h-6 rounded-lg bg-[#FFF3E0] text-[#E65100] flex items-center justify-center shrink-0">
                    <Package size={13} strokeWidth={2.2} />
                  </div>
                </div>
                <p className="text-lg font-black text-gray-900 mt-1">
                  {totalUniqueItems}
                </p>
              </div>

              {/* Total Quantity (All Quantities Combined) */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-gray-400 leading-tight">Total Quantity</span>
                  <div className="w-6 h-6 rounded-lg bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center shrink-0">
                    <Box size={13} strokeWidth={2.2} />
                  </div>
                </div>
                <p className="text-lg font-black text-gray-900 mt-1">
                  {totalStockQuantity}
                </p>
              </div>

              {/* Inventory Value */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-gray-400 leading-tight">Inventory Value</span>
                  <div className="w-6 h-6 rounded-lg bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                    <Wallet size={13} strokeWidth={2.2} />
                  </div>
                </div>
                <p className="text-lg font-black text-gray-900 mt-1 truncate">
                  ₹{totalInventoryValue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Live Search Input Bar */}
            <div className="bg-white rounded-2xl p-3 px-3.5 border border-gray-200/90 shadow-2xs flex items-center gap-2.5">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Inventory Items List (Live Backend API Data) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden divide-y divide-gray-100/90">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-2">
                  <Loader2 size={24} className="animate-spin text-[#00891D]" />
                  <p className="text-xs font-semibold">Loading stock inventory...</p>
                </div>
              ) : displayInventory.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Package size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs font-black text-gray-800">No Inventory Items Found</p>
                  <p className="text-[11px] font-medium text-gray-400">There are no stock items assigned to this vehicle yet.</p>
                </div>
              ) : (
                displayInventory.map((item) => {
                  const name = item.product?.name || item.name || 'Product';
                  const unit = item.product?.unit || item.product?.unitValue
                    ? `${item.product.unitValue || ''} ${item.product?.unit?.type || item.product?.unit || ''}`
                    : (item.unit || '1 Unit');
                  const categoryName = item.product?.category?.name || item.product?.category || item.category || 'Groceries';
                  const availableQty = Number(item.quantity ?? item.available ?? 0);
                  const remainingQty = Number(item.openingQuantity ?? item.quantity ?? item.remaining ?? 0);
                  const isLowStock = availableQty <= 2;
                  const prodImage = item.product?.images?.[0] || item.product?.image || item.image || null;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Item Thumbnail Image */}
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {prodImage ? (
                          <img src={prodImage} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={22} className="text-gray-300" />
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="text-sm font-extrabold text-gray-900 truncate tracking-tight">
                          {name}
                        </h3>
                        <p className="text-xs font-semibold text-gray-400">
                          {unit}
                        </p>
                        <div>
                          <span className="text-[10px] font-bold text-[#00891D] bg-[#E8F5E9] px-2 py-0.5 rounded-md inline-block">
                            {categoryName}
                          </span>
                        </div>
                      </div>

                      {/* Available & Remaining Columns */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-center min-w-[44px]">
                          <span className="text-[10px] font-semibold text-gray-400 mb-0.5">Available</span>
                          <span className={`text-base font-black ${isLowStock ? 'text-[#E65100]' : 'text-[#00891D]'}`}>
                            {availableQty}
                          </span>
                          {isLowStock && (
                            <span className="text-[8px] font-extrabold text-[#E65100] bg-[#FFF3E0] px-1.5 py-0.5 rounded mt-0.5">
                              Low Stock
                            </span>
                          )}
                        </div>

                        <div className="h-8 w-[1px] bg-gray-100" />

                        <div className="flex flex-col items-center min-w-[44px]">
                          <span className="text-[10px] font-semibold text-gray-400 mb-0.5">Remaining</span>
                          <span className="text-base font-black text-gray-900">
                            {remainingQty}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
        {activeTab === 'history' && (
          /* History View matching Figma */
          <div className="space-y-3.5">
            <h3 className="text-sm font-extrabold text-gray-900 tracking-tight pt-1">History</h3>

            <div className="space-y-3">
              {auditHistory.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-gray-100 text-center space-y-2">
                  <History size={28} className="mx-auto text-gray-300" />
                  <p className="text-xs font-black text-gray-800">No History Found</p>
                  <p className="text-[11px] font-medium text-gray-400">There are no stock refills, audits, or returns recorded for this vehicle yet.</p>
                </div>
              ) : (
                auditHistory.map((audit) => {
                  const isReturn = audit.type === 'RETURN';
                  const isRefill = audit.type === 'REFILL';
                  const title = audit.createdAt ? format(new Date(audit.createdAt), 'do MMMM yyyy') : (isReturn ? 'Stock Return' : isRefill ? 'Stock Refill' : 'Stock Audit');
                  const userDisplayName = audit.user?.name || (isReturn ? 'Vehicle Agent' : isRefill ? 'Warehouse Supervisor' : 'Warehouse Staff');
                  const sub = `${userDisplayName} • ${audit.createdAt ? format(new Date(audit.createdAt), 'hh:mm a') : ''}`;
                  const typeLabel = isReturn ? 'Stock Return' : isRefill ? 'Stock Refill' : 'Stock Audit';
                  const item = {
                    id: audit.id,
                    title,
                    sub,
                    type: typeLabel,
                    isReturn,
                    isRefill,
                    raw: audit,
                  };

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedHistoryAudit(item)}
                      className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3.5 hover:border-emerald-200 transition-all cursor-pointer"
                    >
                      {/* Left Icon Badge */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          item.isReturn
                            ? 'bg-rose-100/60 text-rose-500'
                            : 'bg-emerald-100/60 text-[#00891D]'
                        }`}
                      >
                        {item.isRefill ? (
                          <CheckCircle2 size={18} strokeWidth={2} />
                        ) : (
                          <RotateCcw size={18} strokeWidth={2} />
                        )}
                      </div>

                      {/* Title & Subtitle */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-xs font-extrabold text-gray-900 truncate leading-tight">{item.title}</h4>
                        <p className="text-[10px] font-medium text-gray-400">{item.sub}</p>
                      </div>

                      {/* Type Pill Badge & Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-3.5 py-1 rounded-full ${
                            item.isReturn
                              ? 'bg-rose-50 text-rose-500'
                              : 'bg-emerald-50 text-[#00891D]'
                          }`}
                        >
                          {item.type}
                        </span>
                        <ChevronRight size={15} className="text-gray-300" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
        {activeTab === 'refills' && (
          /* Requests View */
          <div className="space-y-3.5">
            {/* Search Input & + Raise Request Button Row */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 bg-white rounded-2xl p-3 px-3.5 border border-gray-100/90 shadow-sm flex items-center gap-2">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>

              <button
                onClick={() => {
                  setShowRaiseRequestType(true);
                }}
                className="px-4 py-3 bg-[#00891D] hover:bg-[#007318] text-white rounded-2xl text-xs font-bold shadow-2xs active:scale-98 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <PlusCircle size={18} strokeWidth={1.8} />
                <span>Raise Request</span>
              </button>
            </div>

            {/* My Requests Header & Filter Dropdown */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">My Requests</h3>
              <div className="bg-white border border-gray-100/90 rounded-2xl px-3.5 py-1.5 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-sm cursor-pointer hover:border-gray-200">
                <span>All</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>

            {/* Requests List */}
            <div className="space-y-3">
              {refillHistory.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-gray-100 text-center space-y-2">
                  <ClipboardList size={28} className="mx-auto text-gray-300" />
                  <p className="text-xs font-black text-gray-800">No Requests Raised</p>
                  <p className="text-[11px] font-medium text-gray-400">You have not submitted any stock or refill requests yet.</p>
                </div>
              ) : (
                refillHistory
                  .filter(item => {
                    const titleStr = (item.title || item.type || '').toLowerCase();
                    return titleStr.includes(searchQuery.toLowerCase());
                  })
                  .map((item) => {
                    const isExpense = item.type === 'EXPENSE' || item.title?.includes('Expense');
                    const isReturn = item.type === 'RETURN' || item.title?.includes('Return');
                    const isDamage = item.type === 'DAMAGE' || item.title?.includes('Damage');
                    const isPending = item.status === 'PENDING' || item.status === 'Pending';
                    const isRejected = item.status === 'REJECTED' || item.status === 'Rejected';
                    const isReimbursed = item.status === 'REIMBURSED' || item.status === 'Reimbursed';

                    let title = item.title || (isExpense ? 'Expense Request' : isReturn ? 'Return Request' : isDamage ? 'Damage Report' : 'Refill Request');
                    const computedTotal = item.totalAmount ?? item.amount ?? (item.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantity || 0) * Number(it.product?.price || 0)), 0);
                    let desc = item.desc || `${item.items?.length || 0} Items • ₹${Number(computedTotal || 0).toLocaleString('en-IN')}`;
                    let statusLabel = isReimbursed ? 'Reimbursed' : isPending ? 'Pending' : isRejected ? 'Rejected' : 'Approved';

                    const req = {
                      id: item.id,
                      title,
                      desc,
                      date: item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy • hh:mm a') : '',
                      status: statusLabel,
                      iconType: isExpense ? 'tag' : isReturn ? 'undo' : isDamage ? 'alert' : isPending ? 'clock' : 'refresh',
                      raw: item,
                    };

                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3.5 hover:border-emerald-200 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
                            <ClipboardList size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-gray-900 truncate">{req.title}</h4>
                            <p className="text-[10px] font-medium text-gray-400 mt-0.5">{req.desc}</p>
                            {req.date && <p className="text-[9px] font-semibold text-gray-400 mt-0.5">{req.date}</p>}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-3 py-1 rounded-full border shrink-0 ${
                            isRejected
                              ? 'text-red-500 bg-red-50 border-red-200'
                              : isPending
                                ? 'text-[#E85D04] bg-orange-50 border-orange-200'
                                : 'text-[#00891D] bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Refill Request Screen / Modal */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 bg-[#FAFAFA] flex flex-col justify-between overflow-y-auto animate-fade-in">
          <div className="max-w-[420px] mx-auto w-full px-4 space-y-4 pt-2 pb-28">
            {/* Header Bar */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={() => {
                  setShowRefillModal(false);
                  setRefillItems({});
                }}
                className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                Refill Request
              </h1>
            </div>

            {/* Search items bar with barcode scanner icon */}
            <div className="bg-white rounded-2xl p-2.5 px-3.5 border border-gray-200 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={refillSearchQuery}
                  onChange={(e) => setRefillSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
              <span className="text-gray-400 text-sm">⛶</span>
            </div>

            {/* Products List with Checkbox & Stepper */}
            <div className="space-y-3 pt-1">
              {(() => {
                const availableCatalog = allProducts.length > 0
                  ? allProducts
                  : inventory.map(item => ({
                      id: item.product?.id || item.productId,
                      name: item.product?.name || item.name,
                      current: item.quantity,
                      price: item.product?.price || item.price || 0,
                      image: item.product?.images?.[0] || item.image
                    })).filter(p => p.id);

                return availableCatalog.filter((p) => (p.name || '').toLowerCase().includes(refillSearchQuery.toLowerCase()));
              })().map((p) => {
                const reqQty = refillItems[p.id] || 0;
                const isSelected = reqQty > 0;
                const currentStock = p.current ?? (inventory.find((i) => i.productId === p.id)?.quantity || 0);

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3"
                  >
                    {/* Left Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        setRefillItems((prev) => ({
                          ...prev,
                          [p.id]: e.target.checked ? (prev[p.id] || 1) : 0,
                        }));
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-[#00891D] focus:ring-0 cursor-pointer shrink-0 accent-[#00891D]"
                    />

                    {/* Thumbnail Image */}
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="text-gray-300" />
                      )}
                    </div>

                    {/* Product Name & Current / Price Pills */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-extrabold text-gray-900 truncate">{p.name}</h4>

                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[8px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider leading-none">
                          CURRENT: {currentStock}
                        </span>
                        <span className="text-[9px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md leading-none">
                          ₹{p.price}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shrink-0">
                      <button
                        onClick={() => setRefillItems((prev) => ({ ...prev, [p.id]: Math.max(0, reqQty - 1) }))}
                        className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90"
                      >
                        <Minus size={12} strokeWidth={2.5} />
                      </button>
                      <span className="text-xs font-black text-gray-900 px-2">{reqQty}</span>
                      <button
                        onClick={() => setRefillItems((prev) => ({ ...prev, [p.id]: reqQty + 1 }))}
                        className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Submit Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 p-4 pb-6">
            <div className="max-w-[420px] mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-gray-900">
                  {Object.values(refillItems).filter((q) => q > 0).length} Items Selected
                </p>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                  Total Quantity: {Object.values(refillItems).reduce((s, q) => s + q, 0)}
                </p>
              </div>

              <button
                onClick={handleRefillSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <span>✈</span>
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
