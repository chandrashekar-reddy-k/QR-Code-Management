import { ArrowLeft, Trash2, Plus, Minus, Tag, PlusCircle, Package } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useNavigate } from 'react-router-dom';
import promotionService from '../../services/promotionService';
import toast from 'react-hot-toast';

export default function CartDrawer({ isOpen, onClose, products = [], routeId, villageName }) {
  const { 
    items, 
    updateQuantity, 
    clearCart, 
    totalAmount, 
    appliedPromotion, 
    setAppliedPromotion,
    customerName,
    setCustomerName,
    customerMobile,
    setCustomerMobile
  } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const navigate = useNavigate();

  const validateCustomerDetails = () => {
    const trimmedName = customerName?.trim();
    const cleanMobile = customerMobile?.trim().replace(/\D/g, '');

    if (!trimmedName || trimmedName.length === 0) {
      toast.error('Customer Name is mandatory for sale billing');
      return false;
    }

    if (!cleanMobile || cleanMobile.length === 0) {
      toast.error('Customer Mobile Number is mandatory for sale billing');
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit mobile number (starting with 6, 7, 8, or 9)');
      return false;
    }

    return true;
  };

  const handleUpdate = (item, newQty) => {
    if (newQty > item.quantity && newQty > (item.stock || 99)) {
        toast.error(`Only ${item.stock || 0} units available in vehicle`, {
            id: `stock-limit-${item.productId}`,
            icon: '🚛',
            style: { borderRadius: '15px', fontWeight: 'bold' }
        });
        return;
    }
    updateQuantity(item.productId, newQty);
  };

  const handleProceed = () => {
    if (!validateCustomerDetails()) return;
    onClose();
    setTimeout(() => {
        navigate('/vsms/agent-portal/payment');
    }, 100);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidating(true);
    try {
        const { data } = await promotionService.validate({
            code: couponCode,
            subtotal: totalAmount,
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            routeId,
            villageName
        });
        setAppliedPromotion(data);
        toast.success(`Coupon "${data.code}" applied!`, { icon: '🎉' });
        setCouponCode('');
    } catch (err: any) {
        toast.error(err.response?.data?.message || 'Invalid coupon code');
    } finally {
        setValidating(false);
    }
  };

  if (!isOpen) return null;

  const displayItems = items.length > 0 ? items : [
    { productId: '1', name: 'Jaggery', price: 65, mrp: 90, discount: 28, quantity: 1, unit: '900 Gms' },
    { productId: '2', name: 'Red Label', price: 10, mrp: 15, discount: 33, quantity: 2, unit: '20 Gms' },
    { productId: '3', name: 'Pesarlu', price: 58, mrp: 65, discount: 11, quantity: 1, unit: '500 Gms' },
  ];

  const totalItemsCount = displayItems.reduce((sum, i) => sum + i.quantity, 0);
  const displayTotal = items.length > 0 ? totalAmount : 143.00;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAFA] flex flex-col justify-between overflow-y-auto animate-fade-in">
      <div className="max-w-[420px] mx-auto w-full px-4 space-y-4 pt-2 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Cart</h1>
              <p className="text-[11px] font-medium text-gray-400">
                {totalItemsCount} Items
              </p>
            </div>
          </div>

          <button
            onClick={clearCart}
            className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Clear Cart"
          >
            <Trash2 size={16} />
            <span className="text-[9px] font-bold mt-0.5">Clear Cart</span>
          </button>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              <span>Customer Details</span>
              <span className="text-rose-500 font-bold">*</span>
            </h3>
            {(!customerName?.trim() || !customerMobile?.trim()) && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Required
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-700">Customer Name <span className="text-rose-500 font-bold">*</span></label>
              <input
                type="text"
                required
                placeholder="Enter Customer Name *"
                value={customerName || ''}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#00891D] ${
                  !customerName?.trim() ? 'border-amber-300' : 'border-gray-200'
                }`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-700">Mobile Number <span className="text-rose-500 font-bold">*</span></label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile *"
                value={customerMobile || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCustomerMobile(val);
                }}
                className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#00891D] ${
                  !customerMobile?.trim() ? 'border-amber-300' : 'border-gray-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-black text-gray-900 tracking-tight">Cart Items</h3>

          <div className="space-y-2.5">
            {displayItems.map((item, idx) => (
              <div
                key={item.productId || idx}
                className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3"
              >
                {/* Product Image */}
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-gray-300" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs font-medium text-gray-800 leading-snug break-words">
                    {item.name}
                  </h4>
                  <p className="text-[10px] font-medium text-gray-400">
                    {item.unit || '500 Gms'}
                  </p>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-xs font-black text-[#00891D]">
                      ₹{Number(item.price).toFixed(2)}
                    </span>
                    {item.mrp && (
                      <span className="text-[10px] font-semibold text-gray-400 line-through">
                        ₹{Number(item.mrp).toFixed(2)}
                      </span>
                    )}
                    <span className="text-[8px] font-black text-white bg-[#E85D04] px-1.5 py-0.5 rounded leading-none">
                      {item.discount || 28}% OFF
                    </span>
                  </div>
                </div>

                {/* Price & Stepper */}
                <div className="flex flex-col items-end justify-between shrink-0 space-y-2">
                  <p className="text-xs font-black text-gray-900">
                    ₹{(Number(item.price) * item.quantity).toFixed(2)}
                  </p>

                  <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
                    <button
                      onClick={() => handleUpdate(item, item.quantity - 1)}
                      className="w-6 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90"
                    >
                      <Minus size={10} strokeWidth={2.5} />
                    </button>
                    <span className="text-xs font-black text-gray-900 px-2">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdate(item, item.quantity + 1)}
                      className="w-6 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded active:scale-90"
                    >
                      <Plus size={10} strokeWidth={2.5} />
                    </button>
                  </div>

                  <button
                    onClick={() => updateQuantity(item.productId, 0)}
                    className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={10} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Items Dashed Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#00891D] text-[#00891D] bg-emerald-50/20 text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-50/40 active:scale-98 transition-all cursor-pointer"
        >
          <PlusCircle size={16} />
          <span>Add Items</span>
        </button>

        {/* Coupon Code Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={15} className="text-gray-900" />
              <h4 className="text-xs font-extrabold text-gray-900">Promo / Coupon Code</h4>
            </div>
            {appliedPromotion && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            )}
          </div>

          {appliedPromotion ? (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-emerald-900 tracking-wider">
                    {appliedPromotion.code}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                    {appliedPromotion.isProductSpecific ? '🏷️ Product Offer' : 'Order Discount'}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-emerald-800 mt-1">
                  Saved ₹{appliedPromotion.calculatedDiscount || appliedPromotion.discount || 0}
                  {appliedPromotion.appliedItems?.length > 0 && ` on ${appliedPromotion.appliedItems.length} matching item(s)`}
                </p>
              </div>
              <button
                onClick={() => {
                  setAppliedPromotion(null);
                  toast.success('Coupon removed');
                }}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Promo Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#00891D] transition-colors"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={validating || !couponCode.trim()}
                className="px-5 py-2.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {validating ? 'Applying...' : 'Apply'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Sticky Bottom Total & Proceed Button Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 p-4 pb-6">
        <div className="max-w-[420px] mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-gray-400">Total Amount</p>
            <p className="text-base font-black text-[#00891D]">
              ₹{displayTotal.toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleProceed}
            className="flex-1 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed To Payment</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
