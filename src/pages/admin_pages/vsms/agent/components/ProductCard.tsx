// @ts-nocheck
import React from 'react';
import { Plus, Minus, Package } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find((i) => i.productId === product.id);
  const qty = cartItem?.quantity || 0;

  const handleAdd = () => {
    if (qty + 1 > (product.stock || 99)) {
       toast.error(`Only ${product.stock || 0} units available in vehicle`, {
          id: `stock-limit-${product.id}`,
          icon: '🚛',
          style: { borderRadius: '15px', fontWeight: 'bold' }
       });
       return;
    }
    if (qty === 0) addItem(product);
    else updateQuantity(product.id, qty + 1);
  };

  const isOutOfStock = product.stock === 0;

  // Format unit safely
  const unitLabel = typeof product.unit === 'object' && product.unit !== null
    ? (product.unit.name || product.unit.type || (product.unitValue ? `${product.unitValue} g` : '500g'))
    : (product.unitValue ? `${product.unitValue} ${product.unit || 'g'}` : (product.unit || '500g'));

  return (
    <div className="bg-white rounded-2xl p-2.5 flex flex-col border border-gray-100 shadow-sm hover:shadow-md transition-all">
      {/* Product Image Area */}
      <div className="rounded-xl overflow-hidden bg-gray-50 h-28 w-full flex items-center justify-center relative">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div className={`flex flex-col items-center justify-center gap-1 text-gray-300 ${product.image ? 'hidden' : 'flex'}`}>
          <Package size={28} strokeWidth={1.5} />
        </div>

        {/* Stock Badge Overlay (Bottom Left on Image) */}
        <div className="absolute bottom-1.5 left-1.5 z-10">
          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm ${
            isOutOfStock ? 'bg-red-600 text-white' : 'bg-white/95 text-gray-700 border border-gray-100'
          }`}>
            {isOutOfStock ? 'Out Of Stock' : `${product.stock ?? 5} In Stock`}
          </span>
        </div>
      </div>

      {/* Price & Unit Line */}
      <div className="flex items-center justify-between mt-2 px-0.5">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-extrabold text-white bg-[#00891D] px-1.5 py-0.5 rounded leading-none">
            ₹{Number(product.price || 270).toFixed(0)}
          </span>
          <span className="text-[9px] font-semibold text-gray-400 line-through">
            ₹{Number(product.mrp || 300).toFixed(0)}
          </span>
        </div>
        <span className="text-[9px] font-bold text-gray-400">
          {unitLabel}
        </span>
      </div>

      {/* Product Title & Discount Tag */}
      <div className="flex items-center justify-between mt-1.5 px-0.5 min-h-[1.5rem] gap-1">
        <h3 className="text-xs font-extrabold text-gray-900 truncate flex-1">
          {typeof product.name === 'object' && product.name !== null ? product.name.name || 'Item' : (product.name || 'Jaggery')}
        </h3>
        {product.promoCode ? (
          <span className="text-[8px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded uppercase shrink-0 flex items-center gap-0.5">
            🏷️ {product.promoCode}
          </span>
        ) : (
          <span className="text-[8px] font-black text-[#E85D04] bg-orange-50 border border-orange-200 px-1 py-0.5 rounded uppercase shrink-0">
            {product.discount ? `${product.discount}% OFF` : '28% OFF'}
          </span>
        )}
      </div>


      {/* Action Button: + Add or Stepper */}
      <div className="mt-2">
        {isOutOfStock ? (
          <button
            disabled
            className="w-full py-2 bg-[#EAEAEA] text-gray-400 rounded-xl text-xs font-bold text-center cursor-not-allowed select-none"
          >
            + Add
          </button>
        ) : qty === 0 ? (
          <button
            onClick={handleAdd}
            className="w-full py-2 bg-[#00891D] hover:bg-[#007018] text-white rounded-xl text-xs font-bold shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            + Add
          </button>
        ) : (
          <div className="flex items-center justify-between bg-gray-50/80 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => updateQuantity(product.id, qty - 1)}
              className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200/60 rounded-lg active:scale-90 cursor-pointer"
            >
              <Minus size={13} strokeWidth={2.5} />
            </button>
            <span className="text-xs font-black text-gray-900 px-1">{qty}</span>
            <button
              onClick={handleAdd}
              className="w-7 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200/60 rounded-lg active:scale-90 cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
