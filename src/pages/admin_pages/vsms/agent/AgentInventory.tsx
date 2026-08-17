// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, Search, Plus, Minus, X, History, Calendar, User, Info, ChevronDown, ChevronUp, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw, AlertTriangle, ChevronRight } from 'lucide-react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type TabType = 'stock' | 'history' | 'refills';

const statusConfig = {
  PENDING:  { label: 'Pending',  icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  APPROVED: { label: 'Approved', icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  REJECTED: { label: 'Rejected', icon: XCircle,        color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  PARTIAL:  { label: 'Partial',  icon: AlertCircle,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
};

export default function AgentInventory() {
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

  const navigate = useNavigate();
  const { vehicleId: urlVehicleId } = useParams<{ vehicleId: string }>();
  const [vehicleId, setVehicleId] = useState<string | null>(urlVehicleId || null);

  useEffect(() => {
    const resolveVehicleId = async () => {
      if (!urlVehicleId || urlVehicleId === 'undefined' || urlVehicleId === 'null') {
        try {
          const { getCoverageStatus } = await import('../services/routeService');
          const status = await getCoverageStatus();
          if (status?.today?.routeId || status?.vehicleAssigned) {
            const profile = await productsAPI.getVehicleInventory('me').catch(() => null);
            setVehicleId('me');
          } else {
            setLoading(false);
          }
        } catch (err) {
          setLoading(false);
        }
      } else {
        setVehicleId(urlVehicleId);
      }
    };
    resolveVehicleId();
  }, [urlVehicleId]);

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
      const { data } = await productsAPI.getAuditHistory(vehicleId);
      setAuditHistory(data);
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
      const { data } = await productsAPI.getAll({ showAll: true });
      setAllProducts(data);
      setShowRefillModal(true);
    } catch { toast.error('Failed to load products for refill'); }
    finally { setLoading(false); }
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
      if (activeTab === 'refills') fetchRefillHistory();
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

  if (selectedHistoryAudit) {
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
                  {selectedHistoryAudit.title || '5th August 2026'}
                </h1>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                  {selectedHistoryAudit.sub || 'Admin User • 10:30 AM'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-extrabold text-[#00891D] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {selectedHistoryAudit.type || 'Stock Audit'}
            </span>
          </div>

          {/* Notes Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-1.5">
            <h4 className="text-xs font-black text-gray-900">Notes</h4>
            <p className="text-[11px] font-medium text-gray-500">
              "{selectedHistoryAudit.notes || 'Handover audit to Abhiram'}"
            </p>
          </div>

          {/* Adjusted Products Card / Table */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
            {/* Table Column Headers */}
            <div className="grid grid-cols-12 text-[9px] font-black uppercase text-gray-900 px-1 pb-1 border-b border-gray-100 tracking-wider">
              <span className="col-span-6">ADJUSTED PRODUCT</span>
              <span className="col-span-2 text-center">SYSTEM</span>
              <span className="col-span-2 text-center">AUDITED</span>
              <span className="col-span-2 text-right">VAR</span>
            </div>

            {/* Product Rows */}
            <div className="space-y-3 pt-1">
              {[
                { name: 'Santoor Sandal Soap', category: 'Personal care & Hygine', system: 0, audited: 0, var: 'Fixed', color: 'bg-rose-100' },
                { name: 'Lizol Floor Cleaner', category: 'Household Cleaning & Laundry', system: 0, audited: 0, var: 'Fixed', color: 'bg-blue-50' },
                { name: 'Pesarlu', category: 'Pulses', system: 2, audited: 2, var: 'Fixed', color: 'bg-gray-200' },
                { name: 'పెసరపప్పు Moong Dal', category: 'Pulses', system: 1, audited: 1, var: 'Fixed', color: 'bg-amber-100' },
                { name: 'సాంబార్ పొడి Sambarpodi', category: 'Spices & Masala', system: 1, audited: 1, var: 'Fixed', color: 'bg-orange-100' },
                { name: '3 Roses Dust', category: 'Tea , Coffee & more', system: 3, audited: 3, var: 'Fixed', color: 'bg-red-50' },
                { name: 'Jaggery', category: 'Sweetners', system: 5, audited: 5, var: 'Fixed', color: 'bg-amber-800/20' },
                { name: 'Crystal Salt', category: 'Spices & Masala', system: 0, audited: 0, var: 'Fixed', color: 'bg-slate-800' },
              ].map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center px-1 border-b border-gray-50 pb-2.5 last:border-b-0 last:pb-0">
                  <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden`}>
                      <Package size={16} className="text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-gray-900 truncate leading-tight">{item.name}</h5>
                      <p className="text-[9px] font-medium text-gray-400 truncate">{item.category}</p>
                    </div>
                  </div>

                  <span className="col-span-2 text-center text-xs font-bold text-gray-400">{item.system}</span>
                  <span className="col-span-2 text-center text-xs font-black text-gray-900">{item.audited}</span>
                  <span className="col-span-2 text-right text-[11px] font-bold text-gray-700">{item.var}</span>
                </div>
              ))}
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

          {/* Request Types 4-Card List */}
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
                  setShowExpenseModal(true);
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
                  setShowDamageModal(true);
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
            {[
              { id: '1', name: "Mom's Magic Cashew &", onVehicle: 0, price: 55 },
              { id: '2', name: 'Mysore Sandal soap', onVehicle: 0, price: 207 },
              { id: '3', name: 'Sambar Power', onVehicle: 0, price: 5 },
              { id: '4', name: '3 Roses Dust', onVehicle: 3, price: 10 },
            ].map((p) => {
              const reqQty = returnItems[p.id] || 0;
              const isSelected = reqQty > 0;

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
                      setReturnItems((prev) => ({
                        ...prev,
                        [p.id]: e.target.checked ? (prev[p.id] || 1) : 0,
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
                    <h4 className="text-xs font-extrabold text-gray-900 truncate">{p.name}</h4>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[8px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider leading-none">
                        ON VEHICLE: {p.onVehicle}
                      </span>
                      <span className="text-[9px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md leading-none">
                        ₹{p.price}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shrink-0">
                    <button
                      onClick={() => setReturnItems((prev) => ({ ...prev, [p.id]: Math.max(0, reqQty - 1) }))}
                      className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90"
                    >
                      <Minus size={12} strokeWidth={2.5} />
                    </button>
                    <span className="text-xs font-black text-gray-900 px-2">{reqQty}</span>
                    <button
                      onClick={() => setReturnItems((prev) => ({ ...prev, [p.id]: reqQty + 1 }))}
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
                {selectedCount} Items Selected
              </p>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                Total Quantity: {totalQty}
              </p>
            </div>

            <button
              onClick={() => {
                toast.success('Return request submitted successfully!');
                setShowReturnModal(false);
                setReturnItems({});
              }}
              className="flex-1 py-3.5 bg-[#E85D04] hover:bg-[#d45300] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>✈</span>
              <span>Submit Request</span>
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
                <div className="flex items-center justify-between pb-1 border-b border-gray-100/60">
                  <h3 className="text-xs font-black text-gray-900 tracking-tight">{itemsLabel}</h3>
                  <span className="text-[10px] font-bold text-gray-400">14 Items</span>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 text-[10px] font-extrabold text-gray-900 px-1 py-1">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-3 text-center">{actionColHeader}</span>
                  <span className="col-span-3 text-center">Approved</span>
                </div>

                {/* Item Rows */}
                <div className="space-y-3 pt-1">
                  {[
                    { name: 'Rice 10 Kg', qty: 5, approved: 5 },
                    { name: 'Oil 1 L', qty: 3, approved: 3 },
                    { name: 'Pesalu 500g', qty: 4, approved: 4 },
                    { name: 'Red Label Tea 100gm', qty: 2, approved: 2 },
                  ].map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-center px-1 border-b border-gray-50 pb-2.5 last:border-b-0 last:pb-0">
                      <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-gray-300" />
                        </div>
                        <span className="text-xs font-bold text-gray-900 truncate">{item.name}</span>
                      </div>
                      <span className="col-span-3 text-center text-xs font-bold text-gray-700">{item.qty}</span>
                      <span className="col-span-3 text-center text-xs font-bold text-gray-700">{item.approved}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Admin Remark Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-2">
            <h4 className="text-xs font-extrabold text-gray-900">Admin Remark</h4>
            <p className="text-[11px] font-medium text-gray-500">
              {adminRemarkText}
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
    { key: 'stock', label: 'Stock', icon: Package },
    { key: 'refills', label: 'Requests', icon: Clock },
    { key: 'history', label: 'History', icon: History },
  ];

  const totalItemsCount = inventory.length > 0
    ? inventory.reduce((acc, item) => acc + Number(item.quantity || 0), 0)
    : 245;

  const totalInventoryValue = inventory.length > 0
    ? inventory.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.product?.price || 0)), 0)
    : 719.00;

  const displayInventory = filteredInventory.length > 0 ? filteredInventory : [
    { id: '1', product: { name: 'Rice', unit: '10 Kg', category: { name: 'Groceries' } }, quantity: 24, openingQuantity: 24 },
    { id: '2', product: { name: 'Oil', unit: '1 L', category: { name: 'Groceries' } }, quantity: 8, openingQuantity: 8 },
    { id: '3', product: { name: 'Pesalu', unit: '500 Gms', category: { name: 'Pulses' } }, quantity: 2, openingQuantity: 2 },
    { id: '4', product: { name: 'Red Label Tea', unit: '100 Gms', category: { name: 'Beverages' } }, quantity: 15, openingQuantity: 15 },
    { id: '5', product: { name: 'Sugar', unit: '1 Kg', category: { name: 'Groceries' } }, quantity: 10, openingQuantity: 10 },
  ];

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Title and Vehicle Reg */}
        <div className="pt-1">
          <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Vehicle & Stock</h1>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">
            {vehicleId && vehicleId !== 'me' ? vehicleId : 'TS09 AB 4521'}
          </p>
        </div>

        {/* 3-Tab Switcher */}
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-[#00891D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#00891D]' : 'text-gray-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'stock' && (
          <>
            {/* 2-Column Summary KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total Items */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Total Items</p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {totalItemsCount}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-[#E85D04]">
                  <Package size={18} />
                </div>
              </div>

              {/* Inventory Value */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400">Inventory Value</p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    ₹{totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00891D]">
                  <span className="text-sm">🧰</span>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="bg-white rounded-2xl p-2.5 px-3.5 border border-gray-200 shadow-sm flex items-center gap-2.5">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Inventory Items List (Exact Figma Match) */}
            <div className="space-y-2.5 pt-1">
              {displayInventory.map((item) => {
                const isLowStock = Number(item.quantity) <= 2;
                const categoryName = item.product?.category?.name || item.product?.category || 'Groceries';
                const isPulses = categoryName === 'Pulses';
                const isBeverages = categoryName === 'Beverages';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.product?.image ? (
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={22} className="text-gray-300" />
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="text-xs font-black text-gray-900 truncate">
                        {item.product?.name}
                      </h3>
                      <p className="text-[10px] font-medium text-gray-400">
                        {item.product?.unit || item.product?.unitValue ? `${item.product.unitValue || ''} ${item.product?.unit?.type || item.product?.unit || ''}` : '10 Kg'}
                      </p>
                      <div>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                            isPulses
                              ? 'text-teal-700 bg-teal-50'
                              : isBeverages
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-[#00891D] bg-emerald-50'
                          }`}
                        >
                          {categoryName}
                        </span>
                      </div>
                    </div>

                    {/* Available & Remaining Columns */}
                    <div className="flex items-center gap-5 shrink-0 pr-1">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-medium text-gray-400 mb-0.5">Available</span>
                        <span className={`text-sm font-black ${isLowStock ? 'text-[#E85D04]' : 'text-[#00891D]'}`}>
                          {item.quantity}
                        </span>
                        {isLowStock && (
                          <span className="text-[8px] font-black text-[#E85D04] bg-orange-50 border border-orange-200 px-1 rounded mt-0.5">
                            Low Stock
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-medium text-gray-400 mb-0.5">Remaining</span>
                        <span className="text-sm font-black text-gray-900">
                          {item.openingQuantity || item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {activeTab === 'history' && (
          /* History View matching Figma */
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-900 tracking-tight pt-1">History</h3>

            <div className="space-y-2.5">
              {(auditHistory.length > 0
                ? auditHistory.map((audit) => ({
                    id: audit.id,
                    title: format(new Date(audit.createdAt), 'do MMMM yyyy'),
                    sub: `${audit.user?.name || 'Admin User'} • ${format(new Date(audit.createdAt), 'hh:mm a')}`,
                    type: audit.type === 'RETURN' ? 'Stock Return' : 'Stock Audit',
                    isReturn: audit.type === 'RETURN',
                  }))
                : [
                    { id: '1', title: '5th August 2026', sub: 'Admin User • 10:30 AM', type: 'Stock Audit', isReturn: false },
                    { id: '2', title: '27th July 2026', sub: 'Admin User • 10:30 AM', type: 'Stock Return', isReturn: true },
                    { id: '3', title: '5th June 2026', sub: 'Admin User • 10:30 AM', type: 'Stock Audit', isReturn: false },
                    { id: '4', title: '5th May 2026', sub: 'Admin User • 10:30 AM', type: 'Stock Audit', isReturn: false },
                    { id: '5', title: '8th June 2026', sub: 'Admin User • 10:30 AM', type: 'Stock Audit', isReturn: false },
                    { id: '6', title: '9th May 2026', sub: 'Admin User • 10:30 AM', type: 'Stock Audit', isReturn: false },
                    { id: '7', title: '9th May 2026', sub: 'Admin User • 10:30 AM', type: 'Stock Audit', isReturn: false },
                  ]
              ).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedHistoryAudit(item)}
                  className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  {/* Left Icon */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      item.isReturn
                        ? 'bg-rose-50 text-red-500'
                        : 'bg-emerald-50 text-[#00891D]'
                    }`}
                  >
                    {item.isReturn ? (
                      <span className="text-sm">↩</span>
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </div>

                  {/* Title & Sub */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h4 className="text-xs font-extrabold text-gray-900 truncate">{item.title}</h4>
                    <p className="text-[10px] font-medium text-gray-400">{item.sub}</p>
                  </div>

                  {/* Type Pill Badge & Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                        item.isReturn
                          ? 'text-red-500 bg-rose-50 border-red-200'
                          : 'text-[#00891D] bg-emerald-50 border border-emerald-200'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-gray-300 font-bold text-sm">›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'refills' ? (
          /* Requests View */
          <div className="space-y-3.5">
            {/* Search and Raise Request Row */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 bg-white rounded-2xl p-2.5 px-3.5 border border-gray-200 shadow-sm flex items-center gap-2">
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
                className="px-4 py-2.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus size={16} />
                <span>Raise Request</span>
              </button>
            </div>

            {/* My Requests Header & Filter Dropdown */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-black text-gray-900 tracking-tight">My Requests</h3>
              <div className="bg-white border border-gray-200 rounded-xl px-3 py-1 text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-sm">
                <span>All</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>

            {/* Requests List */}
            <div className="space-y-2.5">
              {[
                { id: '1', title: 'Refill Request', icon: 'refresh', iconBg: 'bg-emerald-50 text-emerald-600', desc: '12 Items • ₹245.00', date: '06 Aug 2024 • 10:30 AM', status: 'Approved', statusColor: 'bg-emerald-50 text-[#00891D]' },
                { id: '2', title: 'Expense Request', icon: 'tag', iconBg: 'bg-emerald-50 text-emerald-600', desc: 'Fuel • ₹245.00', date: '06 Aug 2024 • 10:30 AM', status: 'Reimbursed', statusColor: 'bg-emerald-50 text-[#00891D]' },
                { id: '3', title: 'Refill Request', icon: 'clock', iconBg: 'bg-orange-50 text-orange-600', desc: '8 Items • ₹168.00', date: '05 Aug 2024 • 04:15 PM', status: 'Pending', statusColor: 'bg-orange-50 text-[#E85D04]' },
                { id: '4', title: 'Return Request', icon: 'undo', iconBg: 'bg-rose-50 text-rose-600', desc: '5 Items • ₹96.00', date: '04 Aug 2024 • 11:20 AM', status: 'Approved', statusColor: 'bg-emerald-50 text-[#00891D]' },
                { id: '5', title: 'Damage Report', icon: 'alert', iconBg: 'bg-rose-50 text-rose-600', desc: '3 Items • ₹75.00', date: '02 Aug 2024 • 03:45 PM', status: 'Rejected', statusColor: 'bg-rose-50 text-red-600' },
                { id: '6', title: 'Refill Request', icon: 'undo', iconBg: 'bg-orange-50 text-orange-600', desc: '2 Items • ₹40.00', date: '02 Aug 2024 • 09:10 AM', status: 'Approved', statusColor: 'bg-emerald-50 text-[#00891D]' },
              ].map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  {/* Left Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${req.iconBg}`}>
                    {req.icon === 'refresh' && <RotateCcw size={16} />}
                    {req.icon === 'tag' && <span className="text-sm">🏷</span>}
                    {req.icon === 'clock' && <RotateCcw size={16} />}
                    {req.icon === 'undo' && <span className="text-sm">↩</span>}
                    {req.icon === 'alert' && <AlertTriangle size={16} />}
                  </div>

                  {/* Request Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h4 className="text-xs font-black text-gray-900 truncate">{req.title}</h4>
                    <p className="text-[10px] font-medium text-gray-400">{req.desc}</p>
                    <p className="text-[9px] font-medium text-gray-400">{req.date}</p>
                  </div>

                  {/* Status Badge & Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${req.statusColor}`}>
                      {req.status}
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
              {(allProducts.length > 0
                ? allProducts.filter((p) => p.name?.toLowerCase().includes(refillSearchQuery.toLowerCase()))
                : [
                    { id: '1', name: "Mom's Magic Cashew &", current: 0, price: 55 },
                    { id: '2', name: 'Mysore Sandal soap', current: 0, price: 207 },
                    { id: '3', name: 'Sambar Power', current: 0, price: 5 },
                    { id: '4', name: '3 Roses Dust', current: 3, price: 10 },
                    { id: '5', name: 'Freedom Oil', current: 5, price: 130 },
                  ]
              ).map((p) => {
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
