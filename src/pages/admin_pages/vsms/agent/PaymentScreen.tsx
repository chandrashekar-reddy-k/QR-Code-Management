import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useUserStore } from '../store/userStore';
import { ordersAPI } from '../services/api';
import { ArrowLeft, Banknote, Smartphone, CreditCard, NotebookText, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_MODES = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'CREDIT', label: 'Credit (Udhar)', icon: NotebookText },
  { id: 'CASH_UPI', label: 'Cash + UPI', icon: Banknote, isSplit: true },
];

export default function PaymentScreen() {
  const [selected, setSelected] = useState<string>('CASH');
  const [loading, setLoading] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', upi: '' });
  const { items, customerMobile, customerName, clearCart, totalAmount: cartTotal } = useCartStore();
  const { user } = useUserStore() as any;
  const navigate = useNavigate();
  const location = useLocation();
  const { deliverySlot, deliveryDate, orderId, orderNumber, amountToCollect } = location.state || {};

  const totalAmount = Number(amountToCollect || cartTotal || 2800);
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeDue = numCashReceived >= totalAmount ? numCashReceived - totalAmount : 0;

  const isCashInvalid = selected === 'CASH' && (!cashReceived.trim() || numCashReceived < totalAmount);
  const isSplitInvalid = selected === 'CASH_UPI' && (!splitAmounts.cash || !splitAmounts.upi || Math.abs((parseFloat(splitAmounts.cash) || 0) + (parseFloat(splitAmounts.upi) || 0) - totalAmount) > 0.01);
  const isSubmitDisabled = loading || isCashInvalid || isSplitInvalid;

  // Auto-fill split amounts logic
  const handleSplitInput = (field: 'cash' | 'upi', value: string) => {
    const numValue = parseFloat(value) || 0;
    if (field === 'cash') {
      const remaining = Math.max(0, totalAmount - numValue);
      setSplitAmounts({ cash: value, upi: Math.round(remaining).toString() });
    } else {
      const remaining = Math.max(0, totalAmount - numValue);
      setSplitAmounts({ upi: value, cash: Math.round(remaining).toString() });
    }
  };

  const handlePayment = async () => {
    if (!selected) return toast.error('Please select a payment method');

    if (selected === 'CASH') {
      if (!cashReceived.trim() || numCashReceived <= 0) {
        return toast.error('Please enter the cash received amount');
      }
      if (numCashReceived < totalAmount) {
        return toast.error(`Cash received cannot be less than total amount (₹${totalAmount.toFixed(2)})`);
      }
    }

    if (selected === 'CASH_UPI') {
      const cash = parseFloat(splitAmounts.cash) || 0;
      const upi = parseFloat(splitAmounts.upi) || 0;
      if (Math.abs((cash + upi) - totalAmount) > 0.01) {
        return toast.error(`Total must equal ₹${Math.round(totalAmount)}`);
      }
    }

    if (selected === 'CREDIT' && !customerMobile && !customerName) {
      return toast.error('Customer name or mobile required for Credit sales');
    }

    setLoading(true);
    try {
      if (orderId) {
        await ordersAPI.completePayment({
          orderId,
          paymentMode: selected,
          cashAmount: selected === 'CASH_UPI' ? parseFloat(splitAmounts.cash) : undefined,
          upiAmount: selected === 'CASH_UPI' ? parseFloat(splitAmounts.upi) : undefined,
        });
        toast.success('Payment completed successfully!');
        navigate(`/vsms/agent-portal/success/${orderId}`);
        return;
      }

      if (items.length === 0) {
        return toast.error('Your cart is empty. Please add products first.');
      }

      // Step 1: Create order from cart in database
      const payload = {
        mobile: customerMobile || '9876543210',
        customerName: customerName || 'Walk-in Customer',
        items: items.map(i => ({ productId: i.productId || i.id, quantity: i.quantity || 1 })),
        deliverySlot: deliverySlot || 'MORNING',
        deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
        couponCode: useCartStore.getState().appliedPromotion?.code
      };

      const res = await ordersAPI.createFromCart(payload);
      const order = res.data;

      if (!order?.id) {
        throw new Error('Server failed to create order in database');
      }

      // Step 2: Complete payment in database
      await ordersAPI.completePayment({
        orderId: order.id,
        paymentMode: selected,
        cashAmount: selected === 'CASH_UPI' ? parseFloat(splitAmounts.cash) : undefined,
        upiAmount: selected === 'CASH_UPI' ? parseFloat(splitAmounts.upi) : undefined,
      });

      toast.success('Sale and payment recorded in database!');
      clearCart();
      navigate(`/vsms/agent-portal/success/${order.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 rounded-xl text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Select Payment</h1>
              <p className="text-[11px] font-medium text-gray-400">
                Order #{orderNumber || 'VK-20260806-000125'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium text-gray-400">To Collect</p>
            <p className="text-sm font-black text-[#00891D]">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Choose Payment Method Section */}
        <div className="w-full bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-900 tracking-tight">Choose Payment Method</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_MODES.slice(0, 3).map((mode) => {
                const Icon = mode.icon;
                const isSelected = selected === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setSelected(mode.id);
                      if (mode.id === 'CASH_UPI' && !splitAmounts.cash) {
                        setSplitAmounts({ cash: Math.round(totalAmount).toString(), upi: '0' });
                      }
                    }}
                    className={`py-4 px-2 rounded-2xl flex flex-col items-center justify-center gap-2 relative transition-all border ${
                      isSelected ? 'bg-[#F2FDF4] border-[#00891D] shadow-sm' : 'bg-white border-gray-200 shadow-none hover:border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00891D] flex items-center justify-center text-white">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                    <Icon size={22} className={isSelected ? 'text-[#00891D]' : 'text-gray-600'} />
                    <span className={`text-xs font-extrabold ${isSelected ? 'text-[#00891D]' : 'text-gray-700'}`}>
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_MODES.slice(3, 5).map((mode) => {
                const Icon = mode.icon;
                const isSelected = selected === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setSelected(mode.id);
                      if (mode.id === 'CASH_UPI' && !splitAmounts.cash) {
                        setSplitAmounts({ cash: Math.round(totalAmount).toString(), upi: '0' });
                      }
                    }}
                    className={`py-4 px-2 rounded-2xl flex flex-col items-center justify-center gap-2 relative transition-all border ${
                      isSelected ? 'bg-[#F2FDF4] border-[#00891D] shadow-sm' : 'bg-white border-gray-200 shadow-none hover:border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00891D] flex items-center justify-center text-white">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                    {mode.id === 'CASH_UPI' ? (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Banknote size={18} className={isSelected ? 'text-[#00891D]' : 'text-gray-600'} />
                        <span className="text-xs font-extrabold text-gray-400">+</span>
                        <Smartphone size={18} className={isSelected ? 'text-[#00891D]' : 'text-gray-600'} />
                      </div>
                    ) : (
                      <Icon size={22} className={isSelected ? 'text-[#00891D]' : 'text-gray-600'} />
                    )}
                    <span className={`text-xs font-extrabold ${isSelected ? 'text-[#00891D]' : 'text-gray-700'}`}>
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cash Calculator Wrapper */}
        {selected === 'CASH' && (
          <div className="bg-white rounded-3xl p-5 border border-gray-100/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">Cash Details</h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Required
              </span>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-gray-900 flex items-center justify-between">
                <span>Cash Received <span className="text-red-500">*</span></span>
                {cashReceived.trim() && numCashReceived < totalAmount && (
                  <span className="text-[10px] font-bold text-red-500">
                    Min ₹{totalAmount.toFixed(2)} required
                  </span>
                )}
              </label>
              <div className={`w-full bg-white border rounded-2xl px-4 py-3 flex items-center gap-2 transition-colors ${
                cashReceived.trim() && numCashReceived < totalAmount
                  ? 'border-red-300 focus-within:border-red-500'
                  : 'border-gray-200 focus-within:border-[#00891D]'
              }`}>
                <span className="text-sm font-extrabold text-gray-600">₹</span>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="Enter cash received"
                  autoFocus
                  className="w-full text-sm font-black text-gray-900 bg-transparent border-none outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-gray-900">Change Due</label>
              <div className="w-full bg-gray-50/80 border border-gray-100 rounded-2xl px-4 py-3">
                <p className="text-sm font-extrabold text-gray-700">
                  ₹ {numCashReceived >= totalAmount ? changeDue.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Split Payment Calculator */}
        {selected === 'CASH_UPI' && (
          <div className="bg-white rounded-3xl p-5 border border-gray-100/90 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900">Split Payment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-gray-900">Cash</label>
                <input type="number" value={splitAmounts.cash} onChange={(e) => handleSplitInput('cash', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-[#00891D]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-gray-900">UPI</label>
                <input type="number" value={splitAmounts.upi} onChange={(e) => handleSplitInput('upi', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-[#00891D]" />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-1/3 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs font-extrabold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isSubmitDisabled}
            className={`w-2/3 py-3.5 rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 ${
              isSubmitDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-[#00891D] hover:bg-[#007018] text-white cursor-pointer'
            }`}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
