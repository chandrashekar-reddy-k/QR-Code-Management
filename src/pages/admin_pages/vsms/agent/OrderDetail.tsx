// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { ArrowLeft, Printer, Package, Smartphone, Calendar, ShieldCheck, User, MapPin, Hash, CheckCircle2, Edit3, Trash2, RotateCcw, XCircle, Minus, Plus, AlertTriangle, Loader2, Truck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // Edit state
  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState(1);
  // Return state
  const [returningItem, setReturningItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => { fetchOrderDetails(); }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const { data } = await ordersAPI.getById(id);
      setOrder(data);
    } catch (err) {
      toast.error('Failed to load order details');
      navigate('/vsms/agent-portal/sales-history');
    } finally { setLoading(false); }
  };

  const canEdit = order && !['CANCELLED', 'RETURNED'].includes(order.status);

  const handleEditQty = async () => {
    if (!editingItem || editQty < 1) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.editItem(order.id, editingItem.id, { quantity: editQty });
      setOrder(data);
      setEditingItem(null);
      toast.success('Quantity updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setActionLoading(false); }
  };

  const handleRemoveItem = async (itemId) => {
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.removeItem(order.id, itemId);
      setOrder(data);
      toast.success('Item removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    } finally { setActionLoading(false); }
  };

  const handleReturn = async () => {
    if (!returningItem || returnQty < 1) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.returnItems(order.id, {
        items: [{ orderItemId: returningItem.id, returnQty }],
        reason: returnReason || undefined
      });
      setOrder(data);
      setReturningItem(null);
      setReturnReason('');
      toast.success('Return processed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return');
    } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.cancelOrder(order.id, { reason: cancelReason || undefined });
      setOrder(data);
      setShowCancelConfirm(false);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!order) return null;

  const totalMRP = order.items?.reduce((sum, i) => sum + (Number(i.mrp || 0) || Number(i.price || 0)) * i.quantity, 0);
  const totalSavings = totalMRP - order.totalAmount;
  const totalUnits = order.items?.reduce((sum, i) => sum + i.quantity, 0);
  const totalReturned = order.returns?.reduce((sum, r) => sum + r.returnAmount, 0) || 0;

  const statusColor = {
    COMPLETED: 'bg-emerald-500', PENDING: 'bg-orange-400', CANCELLED: 'bg-red-500',
    RETURNED: 'bg-red-400', PARTIALLY_RETURNED: 'bg-amber-500'
  }[order.status] || 'bg-slate-400';

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                Order Details
              </h1>
              <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                {order?.displayId || order?.orderNumber || 'ORD-13277'}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-black text-white bg-[#00891D] px-3 py-1 rounded-full">
            Delivered
          </span>
        </div>

        {/* Customer & Delivery Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3.5">
          {/* Customer Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 leading-tight">
                {order?.customerName || 'Ramesh Kumar'}
              </h3>
              <p className="text-[10px] font-semibold text-gray-400 mt-0.5 flex items-center gap-1">
                <span>📞</span> 98765 43210
              </p>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="space-y-2 pb-3 border-b border-gray-50">
            <h4 className="text-xs font-black text-gray-900">Delivery Details</h4>
            <div className="space-y-1.5 text-[11px] font-medium text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-[#00891D] shrink-0 mt-0.5" />
                <span>Kukatpally, Hyderabad</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-[#00891D] shrink-0" />
                <span>Delivered on: {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a') : 'Recently'}</span>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-900">Order Information</h4>
            <div className="space-y-1.5 text-[11px] font-medium text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-[#00891D]">🏷️</span>
                <span>Order Type: Scheduled Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00891D]">💳</span>
                <span>Payment Method: {order.paymentMode || 'Cash'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-[#00891D] shrink-0" />
                <span>Total Items: {order.items?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Table Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900">Order Items &amp; Margins</h3>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Profit: +₹{(() => {
                const totalM = order.items?.reduce((sum: number, item: any) => {
                  const sp = Number(item.price || item.sellingPrice || 0);
                  const lp = Number(item.landingPrice ?? item.landing_price ?? item.product?.landingPrice ?? item.costPrice ?? 0);
                  const qty = Number(item.quantity || 1);
                  return sum + (lp > 0 ? (sp - lp) * qty : sp * 0.20 * qty);
                }, 0) || 0;
                return totalM.toFixed(2);
              })()}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-[#00891D] pb-1 border-b border-gray-50">
            <span>Item / Margin</span>
            <div className="flex items-center gap-8 pr-2">
              <span>Qty</span>
              <span>Amount</span>
            </div>
          </div>

          <div className="divide-y divide-emerald-50">
            {order.items?.map((item: any, idx: number) => {
              const sp = Number(item.price || item.sellingPrice || 0);
              const lp = Number(item.landingPrice ?? item.landing_price ?? item.product?.landingPrice ?? item.costPrice ?? 0);
              const qty = Number(item.quantity || 1);
              const itemMargin = lp > 0 ? (sp - lp) * qty : (sp * 0.20) * qty;

              return (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 relative overflow-hidden shrink-0">
                      {item.product?.image ? <img src={item.product.image} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 leading-tight truncate">{item.product?.name || item.name || 'Product'}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-gray-500">
                        <span>VK Price: ₹{Math.round(sp)}</span>
                        {lp > 0 && <span className="text-gray-400">Cost: ₹{Math.round(lp)}</span>}
                      </div>
                      <p className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded w-fit mt-1 border border-emerald-100">
                        Margin: +₹{itemMargin.toFixed(2)}
                      </p>
                      {item.returnedQty > 0 && (
                        <p className="text-[9px] font-black text-red-500 mt-0.5 flex items-center gap-1"><RotateCcw size={8} /> {item.returnedQty} returned (Remaining: {Math.max(0, qty - item.returnedQty)})</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-8 text-xs font-black text-gray-900 pr-1 shrink-0">
                    <span>{item.returnedQty > 0 ? `x${qty - item.returnedQty} / ${qty}` : `x${qty}`}</span>
                    <div className="text-right">
                      <span>₹{Math.round(sp * (item.returnedQty > 0 ? (qty - item.returnedQty) : qty))}</span>
                      {item.returnedQty > 0 && (
                        <p className="text-[9px] text-gray-400 line-through">₹{Math.round(sp * qty)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bill Summary */}
          <div className="pt-3 border-t border-gray-100 space-y-1.5">
            <h4 className="text-xs font-black text-gray-900">Bill Summary</h4>
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 pt-0.5">
              <span>Net Subtotal</span>
              <span className="font-black text-gray-900">₹{Math.round(order.totalAmount || 0)}</span>
            </div>
            {totalReturned > 0 && (
              <div className="flex items-center justify-between text-xs font-bold text-red-500">
                <span>Total Returns</span>
                <span>-₹{Math.round(totalReturned)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-100">
              <span>Margin Money / Profit Earned</span>
              <span className="font-black text-[#00891D]">
                +₹{(order.items?.reduce((sum: number, item: any) => {
                  const sp = Number(item.price || item.sellingPrice || 0);
                  const lp = Number(item.landingPrice ?? item.landing_price ?? item.product?.landingPrice ?? item.costPrice ?? 0);
                  const netQty = Math.max(0, Number(item.quantity || 1) - (item.returnedQty || 0));
                  return sum + (lp > 0 ? (sp - lp) * netQty : sp * 0.20 * netQty);
                }, 0) || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-black text-emerald-900 pt-2 border-t border-gray-100">
              <span>Total Bill</span>
              <span className="text-base text-[#00891D]">₹{Math.round(Number(order?.totalAmount) || 0)}</span>
            </div>
          </div>
        </div>

        {/* Returns History Card */}
        {order.returns?.length > 0 && (
          <div className="bg-white rounded-3xl p-4 border border-rose-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-700">
              <RotateCcw size={16} />
              <h3 className="text-xs font-black">Return History ({order.returns.length})</h3>
            </div>
            <div className="space-y-2">
              {order.returns.map((r: any, idx: number) => {
                const matchedItem = (order.items || []).find((it: any) => it.id === r.orderItemId || it.productId === r.productId);
                const origQty = matchedItem?.quantity || r.returnQty;
                const totalReturned = (order.returns || [])
                  .filter((ret: any) => ret.orderItemId === r.orderItemId || ret.productId === r.productId)
                  .reduce((sum: number, ret: any) => sum + (ret.returnQty || 0), 0);
                const remainingQty = matchedItem?.returnableQty !== undefined 
                  ? matchedItem.returnableQty 
                  : Math.max(0, origQty - totalReturned);
                const prodName = r.product?.name || matchedItem?.product?.name || matchedItem?.name || 'Item';
                return (
                  <div key={idx} className="p-2.5 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-black text-rose-900">{prodName}</p>
                      <p className="text-[10px] text-rose-600 font-bold">Returned: {r.returnQty} qty • Remaining: {remainingQty} of {origQty} • Refund: ₹{Math.round(r.returnAmount || r.refundAmount || 0)}</p>
                      {r.reason && <p className="text-[9px] text-gray-500 mt-0.5">Reason: {r.reason}</p>}
                    </div>
                    <span className="text-[9px] font-bold text-gray-400">{r.createdAt ? format(new Date(r.createdAt), 'dd MMM, hh:mm a') : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={() => navigate('/vsms/agent-portal/sales-history')} className="w-full py-4 bg-white text-emerald-600 text-xs font-black uppercase tracking-widest rounded-2xl border border-emerald-100 shadow-sm active:scale-[0.98] transition-all">
          Back to History
        </button>
      </div>

      {/* ── EDIT QTY MODAL ── */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white w-full max-w-[320px] rounded-3xl p-5 space-y-4 shadow-xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-gray-900 leading-tight">
              Edit Quantity
            </h3>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                {editingItem.product?.name || editingItem.name || 'Pesarlu'}
              </p>

              {/* Stepper Card */}
              <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-2 flex items-center justify-between">
                <button
                  onClick={() => setEditQty(Math.max(1, editQty - 1))}
                  className="w-10 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-200/60 rounded-xl active:scale-90 transition-all cursor-pointer"
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>
                <span className="text-base font-black text-gray-900">{editQty}</span>
                <button
                  onClick={() => setEditQty(editQty + 1)}
                  className="w-10 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-200/60 rounded-xl active:scale-90 transition-all cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleEditQty}
              disabled={actionLoading}
              className="w-full py-3.5 bg-[#00891D] hover:bg-[#007018] text-white font-extrabold text-xs rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* ── RETURN MODAL ── */}
      {returningItem && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setReturningItem(null)}
        >
          <div
            className="bg-white w-full max-w-[320px] rounded-3xl p-5 space-y-4 shadow-xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-gray-900 leading-tight">
              Return Quantity
            </h3>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                {returningItem.product?.name || returningItem.name || 'Pesarlu'}
              </p>

              {/* Stepper Card */}
              <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-2 flex items-center justify-between">
                <button
                  onClick={() => setReturnQty(Math.max(1, returnQty - 1))}
                  className="w-10 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-200/60 rounded-xl active:scale-90 transition-all cursor-pointer"
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>
                <span className="text-base font-black text-gray-900">{returnQty}</span>
                <button
                  onClick={() => setReturnQty(returnQty + 1)}
                  className="w-10 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-200/60 rounded-xl active:scale-90 transition-all cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <p className="text-center text-xs font-black text-red-500">Refund: ₹{Math.round(returnQty * (returningItem?.price || 0))}</p>
            <input type="text" placeholder="Reason (optional)" value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300" />
            <button
              onClick={handleReturn}
              disabled={actionLoading}
              className="w-full py-3.5 bg-[#E85D04] hover:bg-[#d45300] text-white font-extrabold text-xs rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Return'}
            </button>
          </div>
        </div>
      )}

      {/* ── CANCEL CONFIRM MODAL ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 space-y-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center"><AlertTriangle size={24} /></div>
              <div>
                <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Cancel Order</h3>
                <p className="text-[10px] font-bold text-slate-400">This will restore all stock and reverse payments</p>
              </div>
            </div>
            <input type="text" placeholder="Cancellation reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="py-4 bg-slate-100 text-slate-600 font-black text-xs uppercase rounded-2xl">Keep Order</button>
              <button onClick={handleCancel} disabled={actionLoading} className="py-4 bg-red-500 text-white font-black text-xs uppercase rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
