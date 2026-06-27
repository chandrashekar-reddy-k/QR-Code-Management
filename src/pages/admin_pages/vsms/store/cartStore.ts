// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const checkIsFree = (val: any): boolean => val === true || val === 'true' || val === 1 || val === '1';

interface CartItem {
  id?: string;
  productId: string;
  productVariantId?: string | null;
  name: string;
  price: number;
  mrp: number;
  discount?: number;
  landingPrice?: number;
  quantity: number;
  image?: string;
  isFree?: boolean;
  skuCode?: string;
  unit?: any;
  stock?: number;
  minShopAmount?: number;
}

interface DeliverySlab {
  minAmount: number;
  maxAmount: number;
  deliveryCharge: number;
}

interface CartState {
  items: CartItem[];
  customerMobile: string;
  customerName: string;
  cartOwnerId: string | null;
  deliverySlabs: DeliverySlab[];
  totalAmount: number;
  deliveryCharge: number;
  promotionDiscount: number;
  appliedPromotion: any | null;
  totalItems: number;
  addItem: (product: any, quantity?: number, productVariantId?: string | null) => void;
  removeItem: (productId: string, productVariantId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, productVariantId?: string | null) => void;
  clearCart: () => void;
  setCustomerMobile: (mobile: string) => void;
  setCustomerName: (name: string) => void;
  setCartOwner: (id: string | null) => void;
  setDeliverySlabs: (slabs: DeliverySlab[]) => void;
  setAppliedPromotion: (promotion: any) => void;
}

const calculateTotals = (items: CartItem[], deliverySlabs: DeliverySlab[] = [], promotion: any = null) => {
  // Subtotal of non-free items
  const subtotalRaw = items.reduce((sum, i) => {
    if (!checkIsFree(i.isFree)) return sum + Number(i.price || 0) * i.quantity;
    return sum;
  }, 0);

  // Round subtotal for precision matching with backend
  const subtotal = Math.round(subtotalRaw * 100) / 100;

  // Grand total calculation:
  // isFree items are 0 ONLY if subtotal >= minShopAmount
  const itemsTotal = items.reduce((sum, i) => {
    const isFreeInCart = checkIsFree(i.isFree);
    const threshold = Number(i.minShopAmount || 0);
    
    if (isFreeInCart && subtotal >= threshold) {
      return sum;
    }
    return sum + Number(i.price || 0) * i.quantity;
  }, 0);

  // Delivery Charge Calculation
  let deliveryCharge = 0;
  if (deliverySlabs && Array.isArray(deliverySlabs) && items.length > 0) {
    const slabs = [...deliverySlabs].sort((a, b) => b.minOrderValue - a.minOrderValue);
    const matchedSlab = slabs.find(slab => itemsTotal >= slab.minOrderValue);
    if (matchedSlab) {
      deliveryCharge = Number(matchedSlab.fee || 0);
    }
  }

  // Promotion Discount Calculation
  let promotionDiscount = 0;
  if (promotion) {
    if (promotion.discountType === 'PERCENTAGE') {
      promotionDiscount = (itemsTotal * promotion.discountValue) / 100;
      if (promotion.maxDiscount && promotionDiscount > promotion.maxDiscount) {
        promotionDiscount = promotion.maxDiscount;
      }
    } else if (promotion.discountType === 'FLAT_AMOUNT') {
      promotionDiscount = promotion.discountValue;
    }
  }

  const totalAmount = itemsTotal + deliveryCharge - promotionDiscount;
  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { 
    totalAmount: Math.round(Math.max(0, totalAmount)), 
    deliveryCharge,
    promotionDiscount: Math.round(promotionDiscount),
    totalItems: totalItemsCount
  };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerMobile: '',
      customerName: '',
      cartOwnerId: null,
      totalAmount: 0,
      deliveryCharge: 0,
      promotionDiscount: 0,
      appliedPromotion: null,
      totalItems: 0,
      deliverySlabs: [],

      setDeliverySlabs: (slabs) => set((state) => ({ 
        deliverySlabs: slabs,
        ...calculateTotals(state.items, slabs, state.appliedPromotion)
      })),

      setAppliedPromotion: (promotion) => set((state) => ({
        appliedPromotion: promotion,
        ...calculateTotals(state.items, state.deliverySlabs, promotion)
      })),

      setCustomerMobile: (mobile) => set({ customerMobile: mobile }),
      setCustomerName: (name) => set({ customerName: name }),

      addItem: (product, quantity = 1, productVariantId = null) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id && i.productVariantId === productVariantId);
        const isFree = checkIsFree(product.isFree);
        
        const availableStock = product.stock || 0;
        const currentQty = existing ? existing.quantity : 0;
        let newQtyRequested = currentQty + quantity;

        if (newQtyRequested > availableStock) {
          if (currentQty >= availableStock) return;
          quantity = availableStock - currentQty;
        }

        let newItems;
        if (existing) {
          newItems = items.map((i) =>
            i.productId === product.id && i.productVariantId === productVariantId
              ? { 
                  ...i, 
                  quantity: i.quantity + quantity, 
                  isFree: isFree,
                  stock: availableStock,
                  minShopAmount: Number(product.minShopAmount || 0)
                }
              : i
          );
        } else {
          newItems = [
            ...items,
            {
              id: productVariantId || product.id,
              productId: product.id,
              productVariantId: productVariantId,
              name: product.name,
              price: Number(product.price || 0),
              mrp: Number(product.mrp || 0),
              discount: Number(product.discount || 0),
              landingPrice: Number(product.landingPrice || 0),
              image: product.image,
              isFree: isFree,
              stock: availableStock,
              minShopAmount: Number(product.minShopAmount || 0),
              quantity,
            },
          ];
        }
        set({ items: newItems, ...calculateTotals(newItems, get().deliverySlabs, get().appliedPromotion) });
      },

      removeItem: (productId, productVariantId = null) => {
        const newItems = get().items.filter((i) => !(i.productId === productId && i.productVariantId === productVariantId));
        set({ items: newItems, ...calculateTotals(newItems, get().deliverySlabs, get().appliedPromotion) });
      },

      updateQuantity: (productId, quantity, productVariantId = null) => {
        if (quantity <= 0) {
          get().removeItem(productId, productVariantId);
          return;
        }

        const items = get().items;
        const newItems = items.map((i) =>
          i.productId === productId && i.productVariantId === productVariantId ? { ...i, quantity } : i
        );
        set({ items: newItems, ...calculateTotals(newItems, get().deliverySlabs, get().appliedPromotion) });
      },

      clearCart: () => set({ 
        items: [], 
        customerMobile: '', 
        customerName: '', 
        appliedPromotion: null,
        totalAmount: 0, 
        deliveryCharge: 0, 
        promotionDiscount: 0, 
        totalItems: 0 
      }),
      
      setCartOwner: (id) => set({ cartOwnerId: id }),
    }),
    {
      name: 'vk-pos-cart-storage',
      partialize: (state) => ({
        items: state.items,
        customerMobile: state.customerMobile,
        customerName: state.customerName,
        cartOwnerId: state.cartOwnerId,
        totalAmount: state.totalAmount,
        deliveryCharge: state.deliveryCharge,
        promotionDiscount: state.promotionDiscount,
        appliedPromotion: state.appliedPromotion,
        totalItems: state.totalItems,
      }),
    }
  )
);
