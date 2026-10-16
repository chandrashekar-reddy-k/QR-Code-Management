import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Search, Star, Percent, Clock, Zap,
  Check, RefreshCw, ShoppingBag, X, RotateCcw, Smartphone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAllProductList } from '../../../hooks/product';
import fetchData from '../../../helper';

function FlashCountdown({ expiry }: { expiry: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiry).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const h = Math.floor(diff / (3600 * 1000));
      const m = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
      const s = Math.floor((diff % (60 * 1000)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s remaining`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiry]);

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-500/10">
      <Clock size={11} className="shrink-0" /> {timeLeft}
    </span>
  );
}

export default function HomepagePromos() {
  const [activeTab, setActiveTab] = useState('popular'); // 'popular' | 'offers' | 'flash' | 'weekly'
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({ mrp: '', price: '', isFeatured: false, flashDuration: '24' });
  const [isRollingBack, setIsRollingBack] = useState(false);

  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product'] });

  const partnerWarehouseId = localStorage.getItem('partnerWarehouseId') || '';

  // Load products list via the hook - load products for this partner's warehouse
  const { data: productsRes, isFetching } = useGetAllProductList(1, 1000, searchQuery, true, undefined, partnerWarehouseId);
  const rawProducts = (productsRes as any)?.data?.products ?? [];

  // Filter only products present in the Online (Customer App) channel (identical logic to /inventory/online)
  const isOnlineProduct = (p: any) => {
    const isPublished = p.onlineAppStock?.isPublished !== undefined
      ? Boolean(p.onlineAppStock.isPublished)
      : (p.isOnline === true || (Array.isArray(p.tags) && p.tags.includes('CH:ONLINE')));
    const hasOnlineStock = Number(p.onlineStock ?? p.onlineAppStock?.onlineStock ?? p.stageStocks?.LIVE) > 0;

    return isPublished || hasOnlineStock;
  };

  const onlineProducts = useMemo(() => {
    return (rawProducts || []).filter(isOnlineProduct).map((p: any) => {
      const onlineStock = (p.onlineStock !== undefined && p.onlineStock !== null)
        ? Number(p.onlineStock)
        : (p.onlineAppStock?.onlineStock !== undefined && p.onlineAppStock?.onlineStock !== null
          ? Number(p.onlineAppStock.onlineStock)
          : (p.stageStocks?.LIVE !== undefined ? Number(p.stageStocks.LIVE) : (p.stock ?? 0)));

      const channelPrice = (p.onlinePrice !== undefined && p.onlinePrice !== null && p.onlinePrice > 0)
        ? Number(p.onlinePrice)
        : ((p.onlineAppStock?.appPrice ?? p.onlineAppStock?.channelPrice ?? p.onlineAppStock?.onlinePrice ?? p.channelPrice ?? p.sellingPrice ?? p.price) ?? 0);

      const salePrice = (p.price !== undefined && p.price !== null) ? Number(p.price) : channelPrice;
      const effectiveMrp = (p.mrp !== undefined && p.mrp !== null && p.mrp > 0) ? p.mrp : channelPrice;

      return {
        ...p,
        onlineStock,
        stock: onlineStock,
        channelPrice,
        onlinePrice: channelPrice,
        price: salePrice,
        effectiveMrp
      };
    });
  }, [rawProducts]);

  // Determine global/shared flash deal end time if there are active deals
  const activeFlashProducts = onlineProducts.filter(p => p.flashDealEnd && new Date(p.flashDealEnd) > new Date());
  // Find the longest remaining deal time to treat as the shared master end time
  const sharedFlashDealEnd = activeFlashProducts.length > 0 
    ? activeFlashProducts.reduce((latest, p) => {
        return new Date(p.flashDealEnd) > new Date(latest) ? p.flashDealEnd : latest;
      }, activeFlashProducts[0].flashDealEnd)
    : null;

  const handleToggleFeatured = async (product) => {
    const newVal = !product.isFeatured;
    queryClient.setQueriesData({ queryKey: ['product'] }, (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === product.id ? { ...p, isFeatured: newVal } : p
          ),
        },
      };
    });
    toast.success(`${product.name} updated successfully.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { isFeatured: newVal, allowBelowCost: true });
      invalidate();
    } catch (err) { console.error(err); toast.error('Failed to update featured status.'); invalidate(); }
  };

  const handleToggleWeekly = async (product) => {
    const isWeekly = product.tags?.includes('weekly') || false;
    const currentTags = product.tags || [];
    const newTags = isWeekly ? currentTags.filter((t: string) => t !== 'weekly') : [...currentTags, 'weekly'];
    queryClient.setQueriesData({ queryKey: ['product'] }, (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === product.id ? { ...p, tags: newTags } : p
          ),
        },
      };
    });
    toast.success(`${product.name} weekly status updated.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { tags: newTags, allowBelowCost: true });
      invalidate();
    } catch (err) { console.error(err); toast.error('Failed to update weekly status.'); invalidate(); }
  };

  const handleRemoveOffer = async (product) => {
    queryClient.setQueriesData({ queryKey: ['product'] }, (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === product.id ? { ...p, mrp: null, flashDealEnd: null } : p
          ),
        },
      };
    });
    toast.success(`Offer removed from ${product.name}.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { mrp: null, offerPrice: null, flashDealEnd: null, allowBelowCost: true });
      invalidate();
    } catch (err) { console.error(err); toast.error('Failed to remove offer.'); invalidate(); }
  };

  const handleRemoveFlash = async (product) => {
    queryClient.setQueriesData({ queryKey: ['product'] }, (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === product.id ? { ...p, flashDealEnd: null, flashPrice: null } : p
          ),
        },
      };
    });
    toast.success(`Flash deal removed from ${product.name}.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { flashDealEnd: null, flashPrice: null, allowBelowCost: true });
      invalidate();
    } catch (err) { console.error(err); toast.error('Failed to remove flash deal.'); invalidate(); }
  };

  const handleRollbackOffer = async (product) => {
    const currentTags = Array.isArray(product.tags) ? product.tags : [];
    const newTags = currentTags.filter((t: string) => t !== 'offer');
    const rollbackPrice = (product.mrp && Number(product.mrp) > 0) ? Number(product.mrp) : (product.channelPrice ?? product.price);

    queryClient.setQueriesData({ queryKey: ['product'] }, (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === product.id ? { ...p, price: rollbackPrice, mrp: null, offerPrice: null, flashDealEnd: null, discountType: null, tags: newTags } : p
          ),
        },
      };
    });
    toast.success(`${product.name} offer rolled back successfully.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', {
        price: rollbackPrice,
        mrp: null,
        offerPrice: null,
        flashDealEnd: null,
        discountType: null,
        tags: newTags,
        allowBelowCost: true
      });
      invalidate();
    } catch (err) {
      console.error(err);
      toast.error('Rollback failed.');
      invalidate();
    }
  };

  const handleRollbackAll = async () => {
    if (filteredProducts.length === 0) { toast('No offer products to roll back.'); return; }
    setIsRollingBack(true);
    try {
      await Promise.all(
        filteredProducts.map(product => {
          const currentTags = Array.isArray(product.tags) ? product.tags : [];
          const newTags = currentTags.filter((t: string) => t !== 'offer');
          const rollbackPrice = (product.mrp && Number(product.mrp) > 0) ? Number(product.mrp) : (product.channelPrice ?? product.price);
          return fetchData(`productmanagement/product/${product.id}`, 'PUT', {
            price: rollbackPrice,
            mrp: null,
            offerPrice: null,
            flashDealEnd: null,
            discountType: null,
            tags: newTags,
            allowBelowCost: true
          });
        })
      );
      toast.success(`Rolled back ${filteredProducts.length} offer product${filteredProducts.length > 1 ? 's' : ''}.`);
      invalidate();
    } catch (err) {
      console.error(err);
      toast.error('Some rollbacks failed. Please try again.');
      invalidate();
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleStartEdit = (product) => {
    setEditingProduct(product.id);
    let durationStr = '24';
    const expiry = sharedFlashDealEnd || product.flashDealEnd;
    if (expiry) {
      const remainingMs = new Date(expiry).getTime() - Date.now();
      if (remainingMs > 0) {
        durationStr = Math.max(1, Math.round(remainingMs / (3600 * 1000))).toString();
      }
    }
    const autoMrp = (product.mrp !== undefined && product.mrp !== null && product.mrp > 0)
      ? product.mrp
      : (product.effectiveMrp ?? product.channelPrice ?? product.price ?? '');
    const currentPrice = product.price ?? product.channelPrice ?? product.onlinePrice;
    setPromoForm({
      mrp: autoMrp ? autoMrp.toString() : '',
      price: currentPrice ? currentPrice.toString() : '',
      isFeatured: product.isFeatured || false,
      flashDuration: durationStr
    });
  };

  const handleSavePromo = async (product) => {
    const mrpFloat = parseFloat(promoForm.mrp);
    const priceFloat = parseFloat(promoForm.price);
    const hasMrp = !isNaN(mrpFloat) && mrpFloat > 0;

    if (isNaN(priceFloat) || priceFloat <= 0) {
      toast.error('Please enter a valid sale price.');
      return;
    }

    if (activeTab === 'offers' && (!hasMrp || mrpFloat <= priceFloat)) {
      toast.error('MRP must be higher than the sale price to create an offer.');
      return;
    }

    if (activeTab === 'flash' && hasMrp && mrpFloat <= priceFloat) {
      toast.error('If MRP is entered for a flash deal, it must be higher than the sale price.');
      return;
    }

    let flashDealEndVal: string | null = null;
    if (activeTab === 'flash') {
      if (sharedFlashDealEnd) {
        flashDealEndVal = sharedFlashDealEnd;
      } else {
        const hours = parseInt(promoForm.flashDuration);
        if (isNaN(hours) || hours <= 0 || hours > 720) {
          toast.error('Flash deal duration must be between 1 and 720 hours.');
          return;
        }
        flashDealEndVal = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      }
    }

    const currentTags = Array.isArray(product.tags) ? product.tags : [];
    let payload: Record<string, any>;
    if (activeTab === 'flash') {
      payload = { price: priceFloat, flashPrice: priceFloat, flashDealEnd: flashDealEndVal, allowBelowCost: true };
      if (hasMrp) payload.mrp = mrpFloat;
    } else if (activeTab === 'offers') {
      const offerTags = Array.from(new Set([...currentTags, 'offer']));
      payload = { mrp: mrpFloat, price: priceFloat, offerPrice: priceFloat, isFeatured: promoForm.isFeatured, discountType: 'OFFER', tags: offerTags, allowBelowCost: true };
    } else {
      payload = { price: priceFloat, isFeatured: promoForm.isFeatured, allowBelowCost: true };
    }

    queryClient.setQueriesData({ queryKey: ['product'] }, (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === product.id ? { ...p, ...payload } : p
          ),
        },
      };
    });
    toast.success(`${product.name} updated successfully!`);
    setEditingProduct(null);

    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', payload);
      invalidate();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || err?.data?.response || 'Failed to save. Please try again.');
      invalidate();
    }
  };

  const handleUpdateGlobalTimer = async () => {
    const hours = parseInt(promoForm.flashDuration);
    if (isNaN(hours) || hours <= 0 || hours > 720) {
      toast.error('Flash deal duration must be between 1 and 720 hours.');
      return;
    }
    const newEnd = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const productIds = activeFlashProducts.map(p => p.id);

    if (productIds.length === 0) {
      toast.error('No active flash deals to apply the timer to.');
      return;
    }

    try {
      await fetchData('productmanagement/product/flash-deal/sync', 'PUT', {
        flashDealEnd: newEnd,
        productIds
      });
      toast.success('Flash sale countdown timer updated for all items!');
      invalidate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update countdown timer.');
    }
  };

  const handleEndEntireFlashSale = async () => {
    if (activeFlashProducts.length === 0) return;
    try {
      await fetchData('productmanagement/product/flash-deal/sync', 'PUT', {
        flashDealEnd: null,
        productIds: activeFlashProducts.map(p => p.id)
      });
      toast.success('Successfully ended the flash sale!');
      invalidate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to end flash sale.');
    }
  };

  const filteredProducts = onlineProducts.filter(p => {
    // Only show products that are in stock
    const effectiveStock = (p.onlineStock !== undefined && p.onlineStock !== null)
      ? Number(p.onlineStock)
      : (p.stock ?? 0);
    if (effectiveStock <= 0) return false;

    if (activeTab === 'popular') {
      return p.isFeatured;
    } else if (activeTab === 'weekly') {
      return p.tags?.includes('weekly');
    } else if (activeTab === 'flash') {
      return p.flashDealEnd && new Date(p.flashDealEnd) > new Date();
    } else {
      return Boolean(
        (p.mrp && Number(p.mrp) > Number(p.price) && (!p.flashDealEnd || new Date(p.flashDealEnd) <= new Date())) ||
        p.discountType === 'OFFER' ||
        (p.tags && Array.isArray(p.tags) && p.tags.some((t: string) => ['offer', 'offers', 'deal', 'deals'].includes(String(t).toLowerCase())))
      );
    }
  });

  const promotedIds = new Set(filteredProducts.map(p => p.id));
  const nonPromotedProducts = onlineProducts.filter(p => {
    const effectiveStock = (p.onlineStock !== undefined && p.onlineStock !== null)
      ? Number(p.onlineStock)
      : (p.stock ?? 0);
    return !promotedIds.has(p.id) && effectiveStock > 0;
  });

  return (
    <div className="p-8 min-h-screen bg-gray-50/50 dark:bg-gray-955/20 text-gray-900 dark:text-gray-100 animate-fadeIn">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-violet-500 font-bold text-sm uppercase tracking-widest mb-1.5">
          <Sparkles size={16} /> Marketing &amp; Homepage Promos
        </div>
        <h1 className="text-3xl font-black tracking-tight">Homepage Promo Sections</h1>
        <p className="text-gray-500 text-sm mt-1">Manage Popular Products, Flash Deals, Product Offers, Today's Deals, and Weekly Specials featured on the customer app.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-900 w-fit rounded-2xl mb-8">
        <button
          onClick={() => { setActiveTab('popular'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'popular'
              ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Star size={16} /> Most Popular
        </button>
        <button
          onClick={() => { setActiveTab('flash'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'flash'
              ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap size={16} /> Limited Time Deals
        </button>
        <button
          onClick={() => { setActiveTab('offers'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'offers'
              ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Percent size={16} /> Offers &amp; Deals
        </button>
        <button
          onClick={() => { setActiveTab('weekly'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'weekly'
              ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={16} /> Weekly Specials
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold capitalize">
              Active {activeTab === 'popular' ? 'Popular Items' : activeTab === 'flash' ? 'Limited Time Deals' : activeTab === 'weekly' ? 'Weekly Specials' : 'Deals & Offers'}
            </h2>
            <div className="flex items-center gap-3">
              {isFetching && <RefreshCw size={15} className="animate-spin text-gray-400" />}
              {activeTab === 'offers' && filteredProducts.length > 0 && (
                <button
                  onClick={handleRollbackAll}
                  disabled={isRollingBack}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  <RotateCcw size={13} className={isRollingBack ? 'animate-spin' : ''} />
                  {isRollingBack ? 'Rolling back…' : 'Rollback All'}
                </button>
              )}
            </div>
          </div>

          {/* Unified Flash Deal control banner */}
          {activeTab === 'flash' && (
            <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-3xl mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-xs font-black uppercase text-amber-600 tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="fill-amber-500" /> Active Flash Sale Countdown
                </div>
                {sharedFlashDealEnd ? (
                  <div className="mt-2 flex items-center gap-2">
                    <FlashCountdown expiry={sharedFlashDealEnd} />
                    <span className="text-gray-400 text-xs font-semibold">shared by all listed items</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs font-medium mt-1">No active flash sale. Set a timer below or promote products on the right to start one.</div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="720"
                  placeholder="Hrs"
                  value={promoForm.flashDuration}
                  onChange={e => setPromoForm({ ...promoForm, flashDuration: e.target.value })}
                  className="w-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-2 py-1.5 rounded-xl font-mono text-xs font-bold outline-none"
                />
                <button
                  onClick={handleUpdateGlobalTimer}
                  disabled={activeFlashProducts.length === 0}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-40"
                >
                  Set Shared Timer
                </button>
                {activeFlashProducts.length > 0 && (
                  <button
                    onClick={handleEndEntireFlashSale}
                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition-all"
                  >
                    End Sale
                  </button>
                )}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 p-12 rounded-3xl text-center shadow-sm">
              <ShoppingBag className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={40} />
              <p className="text-gray-500 text-sm font-medium">No products currently active in this section.</p>
              <p className="text-gray-400 text-xs mt-1">Use the panel on the right to promote products.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map(product => {
                const isPopularOrWeekly = activeTab === 'popular' || activeTab === 'weekly';
                const displayPrice = isPopularOrWeekly
                  ? (product.onlinePrice ?? product.channelPrice ?? product.price)
                  : product.price;

                const discountPercent = product.mrp && product.mrp > displayPrice
                  ? Math.round(((product.mrp - displayPrice) / product.mrp) * 100)
                  : 0;

                return (
                  <div 
                    key={product.id}
                    className="bg-white dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-95 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">
                          {product.name}
                          {(product.onlineStock ?? product.stock ?? 0) <= 0 && (
                            <span className="ml-2 text-[9px] text-red-500 font-extrabold uppercase tracking-wider">(Out of Stock)</span>
                          )}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Unit: {product.unit} | Online Stock: {product.onlineStock ?? product.stock ?? 0}</p>
                      </div>
                    </div>

                    {editingProduct === product.id ? (
                      <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                        <div className="w-24">
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">MRP (₹)</label>
                          <input
                            type="number"
                            readOnly
                            disabled
                            placeholder="MRP"
                            value={promoForm.mrp}
                            className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold text-gray-500 cursor-not-allowed outline-none"
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Sale Price (₹)</label>
                          <input
                            type="number"
                            required
                            placeholder="Sale"
                            value={promoForm.price}
                            onWheel={e => e.target.blur()}
                            onChange={e => setPromoForm({ ...promoForm, price: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-95 border border-gray-200 dark:border-gray-800 px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold outline-none"
                          />
                        </div>
                        <div className="flex gap-1.5 mt-4 self-end">
                          <button
                            onClick={() => handleSavePromo(product)}
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-6 justify-between w-full md:w-auto">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-gray-900 dark:text-gray-100">₹{displayPrice}</span>
                          {Boolean(product.mrp && Number(product.mrp) > Number(displayPrice)) && (
                            <>
                              <span className="text-gray-400 text-xs line-through">₹{product.mrp}</span>
                              <span className="text-emerald-500 text-[10px] font-black bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                {discountPercent}% OFF
                              </span>
                            </>
                          )}
                          {isPopularOrWeekly && (
                            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md ml-1">
                              Online Price
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {activeTab === 'popular' ? (
                            <button
                              onClick={() => handleToggleFeatured(product)}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition-all"
                            >
                              Remove Popular
                            </button>
                          ) : activeTab === 'weekly' ? (
                            <button
                              onClick={() => handleToggleWeekly(product)}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition-all"
                            >
                              Remove Weekly
                            </button>
                          ) : activeTab === 'flash' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(product)}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                              >
                                Edit Price
                              </button>
                              <button
                                onClick={() => handleRemoveFlash(product)}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition-all"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(product)}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRollbackOffer(product)}
                                title={`Restore to ₹${product.mrp}`}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold transition-all"
                              >
                                <RotateCcw size={11} /> Rollback
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Promotion Panel */}
        <div className="bg-white dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 p-6 rounded-3xl shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={18} className="text-violet-500" />
            <h2 className="text-lg font-bold">Promote Online Products</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">Search and feature active online (Customer App) products ({onlineProducts.length} available).</p>

          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search online products by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 pl-10 pr-4 py-2.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-xs"
            />
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {nonPromotedProducts.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6 italic">No other online products available to promote.</p>
            ) : (
              nonPromotedProducts.slice(0, 10).map(product => {
                const effectiveStock = product.onlineStock ?? product.stock ?? 0;
                const effectivePrice = product.onlinePrice ?? product.price ?? 0;
                const isOutOfStock = effectiveStock <= 0;
                return (
                  <div 
                    key={product.id}
                    className={`flex flex-col p-3 rounded-2xl border border-gray-100 dark:border-gray-800/40 ${
                      isOutOfStock ? 'opacity-50 bg-gray-50/50 dark:bg-gray-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-950'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-gray-700 dark:text-gray-300">
                          {product.name}
                          {isOutOfStock && <span className="ml-2 text-[9px] text-red-500 font-extrabold uppercase">(Out of Stock)</span>}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Channel Price: ₹{effectivePrice} | Online Stock: {effectiveStock}</div>
                      </div>

                      {isOutOfStock ? (
                        <span className="px-3 py-1.5 bg-red-50 text-red-500 dark:bg-red-950/20 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          Unavailable
                        </span>
                      ) : editingProduct === product.id ? null : activeTab === 'popular' ? (
                        <button
                          onClick={() => handleToggleFeatured(product)}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Make Popular
                        </button>
                      ) : activeTab === 'weekly' ? (
                        <button
                          onClick={() => handleToggleWeekly(product)}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Make Weekly
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(product)}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          {activeTab === 'flash' ? 'Set Flash Deal' : 'Set Offer'}
                        </button>
                      )}
                    </div>

                  {editingProduct === product.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 items-end">
                      <div className="w-20">
                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">MRP (₹)</label>
                        <input
                          type="number"
                          readOnly
                          disabled
                          placeholder="MRP"
                          value={promoForm.mrp}
                          className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-2 py-1.5 rounded-xl font-mono text-xs font-bold text-gray-500 cursor-not-allowed outline-none"
                        />
                      </div>
                      <div className="w-20">
                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Sale (₹)</label>
                        <input
                          type="number"
                          required
                          placeholder="Sale"
                          value={promoForm.price}
                          onWheel={e => (e.target as HTMLInputElement).blur()}
                          onChange={e => setPromoForm({ ...promoForm, price: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 px-2 py-1.5 rounded-xl font-mono text-xs font-bold outline-none"
                        />
                      </div>
                      {activeTab === 'flash' && !sharedFlashDealEnd && (
                        <div className="w-20">
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Hours (1-720)</label>
                          <input
                            type="number"
                            min="1"
                            max="720"
                            required
                            placeholder="e.g. 24"
                            value={promoForm.flashDuration}
                            onWheel={e => (e.target as HTMLInputElement).blur()}
                            onChange={e => setPromoForm({ ...promoForm, flashDuration: e.target.value })}
                            className="w-full bg-gray-55 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 px-2 py-1.5 rounded-xl font-mono text-xs font-bold outline-none"
                          />
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSavePromo(product)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>

      </div>

    </div>
  );
}
