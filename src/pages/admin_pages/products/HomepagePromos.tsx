// @ts-nocheck
import React, { useState } from 'react';
import { 
  Sparkles, Search, Star, Percent, Clock, 
  Check, RefreshCw, ShoppingBag, X, RotateCcw 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAllProductList } from '../../../hooks/product';
import fetchData from '../../../helper';

export default function HomepagePromos() {
  const [activeTab, setActiveTab] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({ mrp: '', price: '', isFeatured: false });
  const [isRollingBack, setIsRollingBack] = useState(false);

  const queryClient = useQueryClient();

  const { data: productsRes, isFetching } = useGetAllProductList(1, 1000, searchQuery);
  const products = (productsRes as any)?.data?.products ?? [];

  // Helper to optimistically update a product in the react-query cache
  const optimisticUpdate = (productId: string, changes: Record<string, any>) => {
    queryClient.setQueryData(['product', 1, 1000, searchQuery], (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === productId ? { ...p, ...changes } : p
          ),
        },
      };
    });
    // Also update any other cached product queries
    queryClient.setQueriesData({ queryKey: ['product'] }, (old: any) => {
      if (!old?.data?.products) return old;
      return {
        ...old,
        data: {
          ...old.data,
          products: old.data.products.map((p: any) =>
            p.id === productId ? { ...p, ...changes } : p
          ),
        },
      };
    });
  };

  const handleToggleFeatured = async (product) => {
    const newVal = !product.isFeatured;
    optimisticUpdate(product.id, { isFeatured: newVal });
    toast.success(`${product.name} updated successfully.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { isFeatured: newVal });
      invalidate();
    } catch (err) { console.error(err); toast.error('Failed to update featured status.'); invalidate(); }
  };

  const handleToggleWeekly = async (product) => {
    const isWeekly = product.tags?.includes('weekly') || false;
    const currentTags = product.tags || [];
    const newTags = isWeekly ? currentTags.filter((t: string) => t !== 'weekly') : [...currentTags, 'weekly'];
    optimisticUpdate(product.id, { tags: newTags });
    toast.success(`${product.name} weekly status updated.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { tags: newTags });
      invalidate();
    } catch (err) { console.error(err); toast.error('Failed to update weekly status.'); invalidate(); }
  };

  const handleRemoveOffer = async (product) => {
    optimisticUpdate(product.id, { mrp: null });
    toast.success(`Offer removed from ${product.name}.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { mrp: null });
      invalidate();
    } catch (err) { console.error(err); toast.error('Failed to remove offer.'); invalidate(); }
  };

  const handleRollbackOffer = async (product) => {
    if (!product.mrp) { toast.error('No original price to roll back to.'); return; }
    optimisticUpdate(product.id, { price: product.mrp, mrp: null });
    toast.success(`${product.name} rolled back to ₹${product.mrp}.`);
    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', { price: product.mrp, mrp: null });
      invalidate();
    } catch (err) { console.error(err); toast.error('Rollback failed.'); invalidate(); }
  };

  const handleRollbackAll = async () => {
    const toRollback = filteredProducts.filter(p => p.mrp && p.mrp > p.price);
    if (toRollback.length === 0) { toast('No products with saved original prices to roll back.'); return; }
    setIsRollingBack(true);
    // Optimistic: update all at once
    toRollback.forEach(p => optimisticUpdate(p.id, { price: p.mrp, mrp: null }));
    try {
      await Promise.all(
        toRollback.map(p => fetchData(`productmanagement/product/${p.id}`, 'PUT', { price: p.mrp, mrp: null }))
      );
      toast.success(`Rolled back ${toRollback.length} product${toRollback.length > 1 ? 's' : ''} to original prices.`);
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
    setPromoForm({ mrp: product.mrp ? product.mrp.toString() : '', price: product.price ? product.price.toString() : '', isFeatured: product.isFeatured || false });
  };

  const handleSavePromo = async (product) => {
    const mrpFloat = parseFloat(promoForm.mrp);
    const priceFloat = parseFloat(promoForm.price);

    if (isNaN(priceFloat) || priceFloat <= 0) {
      toast.error('Please enter a valid sale price.');
      return;
    }
    if (activeTab === 'offers' && (isNaN(mrpFloat) || mrpFloat <= priceFloat)) {
      toast.error('MRP must be higher than the sale price to create an offer.');
      return;
    }

    const changes = activeTab === 'offers'
      ? { mrp: mrpFloat, price: priceFloat, isFeatured: promoForm.isFeatured }
      : { price: priceFloat, isFeatured: promoForm.isFeatured };
    optimisticUpdate(product.id, changes);
    toast.success(`${product.name} updated successfully!`);
    setEditingProduct(null);

    try {
      await fetchData(`productmanagement/product/${product.id}`, 'PUT', {
        ...(activeTab === 'offers' ? { mrp: mrpFloat, price: priceFloat } : { price: priceFloat }),
        isFeatured: promoForm.isFeatured,
      });
      invalidate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save. Please try again.');
      invalidate();
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeTab === 'popular') {
      return p.isFeatured;
    } else if (activeTab === 'weekly') {
      return p.tags?.includes('weekly');
    } else {
      // offers / today's deals
      return p.mrp && p.mrp > p.price;
    }
  });

  // For adding new items to these sections, we filter the main list to show non-promoted items
  const nonPromotedProducts = products.filter(p => {
    if (activeTab === 'popular') {
      return !p.isFeatured;
    } else if (activeTab === 'weekly') {
      return !p.tags?.includes('weekly');
    } else {
      return !p.mrp || p.mrp <= p.price;
    }
  });

  return (
    <div className="p-8 min-h-screen bg-gray-50/50 dark:bg-gray-955/20 text-gray-900 dark:text-gray-100 animate-fadeIn">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-violet-500 font-bold text-sm uppercase tracking-widest mb-1.5">
          <Sparkles size={16} /> Marketing & Homepage Promos
        </div>
        <h1 className="text-3xl font-black tracking-tight">Homepage Promo Sections</h1>
        <p className="text-gray-500 text-sm mt-1">Manage Popular Products, Product Offers, Today's Deals, and Weekly Specials featured on the customer app.</p>
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
          <Star size={16} /> Most Popular Section
        </button>
        <button
          onClick={() => { setActiveTab('offers'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'offers'
              ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Percent size={16} /> Offers & Today's Deals
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
              Active {activeTab === 'popular' ? 'Popular Items' : activeTab === 'weekly' ? 'Weekly Specials' : 'Deals & Offers'}
            </h2>
            <div className="flex items-center gap-3">
              {isFetching && <RefreshCw size={15} className="animate-spin text-gray-400" />}
              {activeTab === 'offers' && filteredProducts.length > 0 && (
                <button
                  onClick={handleRollbackAll}
                  disabled={isRollingBack}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <RotateCcw size={13} className={isRollingBack ? 'animate-spin' : ''} />
                  {isRollingBack ? 'Rolling back…' : 'Rollback All'}
                </button>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 p-12 rounded-3xl text-center shadow-sm">
              <ShoppingBag className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={40} />
              <p className="text-gray-500 text-sm font-medium">No products currently active in this section.</p>
              <p className="text-gray-400 text-xs mt-1">Use the panel on the right to promote products.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map(product => {
                const discountPercent = product.mrp && product.mrp > product.price
                  ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
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
                        <h3 className="font-bold text-sm truncate">{product.name}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Unit: {product.unit}</p>
                      </div>
                    </div>

                    {editingProduct === product.id ? (
                      <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                        <div className="w-24">
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">MRP (₹)</label>
                          <input
                            type="number"
                            placeholder="MRP"
                            value={promoForm.mrp}
                            onWheel={e => e.target.blur()}
                            onChange={e => setPromoForm({ ...promoForm, mrp: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-95 border border-gray-200 dark:border-gray-800 px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold outline-none"
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
                          <span className="text-lg font-black text-gray-900 dark:text-gray-100">₹{product.price}</span>
                          {product.mrp && product.mrp > product.price && (
                            <>
                              <span className="text-gray-400 text-xs line-through">₹{product.mrp}</span>
                              <span className="text-emerald-500 text-[10px] font-black bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                {discountPercent}% OFF
                              </span>
                            </>
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
                              <button
                                onClick={() => handleRemoveOffer(product)}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition-all"
                              >
                                Remove
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
          <h2 className="text-lg font-bold mb-1">Promote Products</h2>
          <p className="text-gray-500 text-xs mb-4">Search and add products to the homepage promo sections.</p>

          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search product by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 pl-10 pr-4 py-2.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-xs"
            />
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {nonPromotedProducts.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6 italic">No other products available.</p>
            ) : (
              nonPromotedProducts.slice(0, 10).map(product => (
                <div 
                  key={product.id}
                  className="flex flex-col p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-950 border border-gray-100 dark:border-gray-800/40"
                >
                  <div className="flex justify-between items-center">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold truncate text-gray-700 dark:text-gray-300">{product.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Price: ₹{product.price}</div>
                    </div>

                    {editingProduct === product.id ? null : activeTab === 'popular' ? (
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
                        Set Offer
                      </button>
                    )}
                  </div>

                  {/* Inline edit form for offers */}
                  {editingProduct === product.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 items-end">
                      <div className="w-20">
                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">MRP (₹)</label>
                        <input
                          type="number"
                          placeholder="MRP"
                          value={promoForm.mrp}
                          onWheel={e => (e.target as HTMLInputElement).blur()}
                          onChange={e => setPromoForm({ ...promoForm, mrp: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 px-2 py-1.5 rounded-xl font-mono text-xs font-bold outline-none"
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
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
