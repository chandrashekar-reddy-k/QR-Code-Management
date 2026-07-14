// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Sparkles, Check, X, 
  ShoppingBag, Search, Tag, DollarSign, Layers 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../vsms/services/adminService';
import { useGetAllProductList } from '../../../hooks/product';

export default function BundleDeals() {
  const [bundles, setBundles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: 0,
    imageUrl: '',
    items: [] // { productId, quantity, name, price }
  });

  // Query products list via product management hook (1000 items limit to cover inventory list)
  const { data: productsRes } = useGetAllProductList(1, 1000);
  const products = (productsRes as any)?.data?.products ?? [];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch bundles
      const bundleRes = await adminAPI.getBundles();
      setBundles(bundleRes.data?.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load bundle deals data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      price: '',
      originalPrice: 0,
      imageUrl: '',
      items: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bundle) => {
    setEditingId(bundle.id);
    setForm({
      name: bundle.name,
      description: bundle.description || '',
      price: bundle.price.toString(),
      originalPrice: bundle.originalPrice || 0,
      imageUrl: bundle.imageUrl || '',
      items: bundle.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.product?.name || 'Product',
        price: item.product?.price || 0
      }))
    });
    setIsModalOpen(true);
  };

  const handleAddProductToBundle = (product) => {
    if (form.items.some(item => item.productId === product.id)) {
      toast.error('Product already added to bundle.');
      return;
    }

    const updatedItems = [
      ...form.items,
      {
        productId: product.id,
        quantity: 1,
        name: product.name,
        price: product.price
      }
    ];

    const originalSum = updatedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    setForm({
      ...form,
      items: updatedItems,
      originalPrice: originalSum
    });
    setProductSearch('');
  };

  const handleRemoveProductFromBundle = (productId) => {
    const updatedItems = form.items.filter(item => item.productId !== productId);
    const originalSum = updatedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    setForm({
      ...form,
      items: updatedItems,
      originalPrice: originalSum
    });
  };

  const handleQuantityChange = (productId, qty) => {
    const updatedItems = form.items.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, qty) };
      }
      return item;
    });

    const originalSum = updatedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    setForm({
      ...form,
      items: updatedItems,
      originalPrice: originalSum
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || form.items.length === 0) {
      toast.error('Please enter name, bundle price and add at least one product.');
      return;
    }

    try {
      if (editingId) {
        await adminAPI.updateBundle(editingId, form);
        toast.success('Bundle deal updated successfully.');
      } else {
        await adminAPI.createBundle(form);
        toast.success('Bundle deal created successfully.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save bundle deal.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bundle deal?')) return;
    try {
      await adminAPI.deleteBundle(id);
      toast.success('Bundle deal deleted successfully.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete bundle deal.');
    }
  };

  const handleToggleActive = async (bundle) => {
    try {
      await adminAPI.updateBundle(bundle.id, { isActive: !bundle.isActive });
      toast.success(`Bundle status updated.`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status.');
    }
  };

  const filteredBundles = bundles.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProductOptions = productSearch.trim().length > 1
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : [];

  return (
    <div className="p-8 min-h-screen bg-gray-50/50 dark:bg-gray-950/20 text-gray-900 dark:text-gray-100">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-violet-500 font-bold text-sm uppercase tracking-widest mb-1.5">
            <Sparkles size={16} /> Marketing & Promotions
          </div>
          <h1 className="text-3xl font-black tracking-tight">Bundle Deals</h1>
          <p className="text-gray-500 text-sm mt-1">Combine multiple products into discounted combo packages for the homepage.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-6 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/15 transition-all text-sm hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} /> Create Bundle Deal
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 p-4 rounded-3xl mb-8 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search bundle deals..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <p className="text-sm font-bold text-gray-500">Loading bundle deals...</p>
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="bg-white dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-800 p-16 rounded-3xl text-center">
          <ShoppingBag className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={48} />
          <h3 className="text-lg font-bold">No Bundle Deals Configured</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mt-2">Create combo packs of products and offer discounts to boost sales on the consumer app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBundles.map(bundle => {
            const savings = Math.max(0, bundle.originalPrice - bundle.price);
            return (
              <div 
                key={bundle.id}
                className="bg-white dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group"
              >
                {/* Active Toggle badge */}
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(bundle)}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      bundle.isActive 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/10'
                    }`}
                  >
                    {bundle.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div>
                  {/* Image/Details */}
                  <div className="flex gap-4 mb-4 items-start">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {bundle.imageUrl ? (
                        <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover" />
                      ) : (
                        <Layers className="text-violet-500" size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-violet-500 transition-colors">{bundle.name}</h3>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{bundle.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Horizontal Product Image Gallery */}
                  <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
                    {bundle.items?.map((item, idx) => {
                      const img = item.product?.images?.[0];
                      return (
                        <React.Fragment key={item.id}>
                          {idx > 0 && <span className="text-gray-300 dark:text-gray-700 text-xs font-bold">+</span>}
                          <div className="relative group/thumb flex-shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden">
                              {img ? (
                                <img src={img} alt={item.product?.name} className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag size={14} className="text-gray-400" />
                              )}
                            </div>
                            <span className="absolute -bottom-1.5 -right-1.5 bg-violet-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-gray-950">
                              {item.quantity}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Products checklist */}
                  <div className="space-y-2 mb-6 bg-gray-50/50 dark:bg-gray-950/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bundle Combo Items</div>
                    {bundle.items?.map(item => (
                      <div key={item.id} className="flex justify-between text-xs items-center">
                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          {item.product?.name || 'Product'} <span className="text-violet-500 font-extrabold">x{item.quantity}</span>
                        </span>
                        <span className="text-gray-400 font-medium">₹{item.product?.price || 0} each</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price and Operations block */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black">₹{bundle.price}</span>
                      <span className="text-gray-400 text-xs line-through">₹{bundle.originalPrice}</span>
                    </div>
                    {savings > 0 && (
                      <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        Save ₹{savings}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(bundle)}
                      className="p-3 bg-gray-50 hover:bg-violet-50 text-gray-600 hover:text-violet-600 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-400 rounded-2xl transition-all"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(bundle.id)}
                      className="p-3 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-400 rounded-2xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Creation / Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
            
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black">{editingId ? 'Edit Bundle Deal' : 'Create Bundle Deal'}</h2>
                <p className="text-gray-500 text-xs mt-1">Configure name, price, and select bundle items.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-400 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Basic configuration fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bundle Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Healthy Breakfast Combo"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 px-4 py-3.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                  <textarea
                    placeholder="Short summary of what makes this combo bundle unique..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 px-4 py-3.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bundle Sale Price (₹) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g., 149"
                    value={form.price}
                    onWheel={e => e.target.blur()}
                    onChange={e => {
                      const val = e.target.value;
                      if (parseFloat(val) < 0) return;
                      setForm({ ...form, price: val });
                    }}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 px-4 py-3.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 px-4 py-3.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm"
                  />
                </div>
              </div>

              {/* Product Selector section */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Products to Bundle</label>
                  <span className="text-xs text-gray-400">Search to add items</span>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Type product name to search..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm"
                  />

                  {/* Dropdown options */}
                  {filteredProductOptions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-10 p-2 space-y-1">
                      {filteredProductOptions.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProductToBundle(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:text-violet-600 rounded-xl text-xs font-bold transition-all flex justify-between items-center"
                        >
                          <span>{p.name}</span>
                          <span className="text-gray-400">₹{p.price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected items grid list */}
                <div className="space-y-2">
                  {form.items.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4 italic">No products added to this bundle yet.</p>
                  ) : (
                    form.items.map(item => (
                      <div 
                        key={item.productId}
                        className="flex justify-between items-center bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 p-3 rounded-2xl"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="text-xs font-bold truncate text-gray-700 dark:text-gray-300">{item.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Price: ₹{item.price} each</div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onWheel={e => e.target.blur()}
                              onChange={e => {
                                const parsedVal = parseInt(e.target.value);
                                if (parsedVal < 1) return;
                                handleQuantityChange(item.productId, parsedVal);
                              }}
                              className="w-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-xl text-center font-bold text-xs outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveProductFromBundle(item.productId)}
                            className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Price comparison / savings Summary */}
              {form.items.length > 0 && (
                <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/50 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Bundle Pricing Summary</div>
                    <div className="flex gap-4 items-center">
                      <div>
                        <div className="text-xs text-gray-500">Original Total</div>
                        <div className="font-extrabold text-sm line-through">₹{form.originalPrice}</div>
                      </div>
                      <div className="w-px h-6 bg-violet-200 dark:bg-violet-800" />
                      <div>
                        <div className="text-xs text-gray-500">Bundle Price</div>
                        <div className="font-extrabold text-sm text-violet-600 dark:text-violet-400">₹{form.price || 0}</div>
                      </div>
                    </div>
                  </div>

                  {parseFloat(form.price) < form.originalPrice && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Customer Savings</div>
                      <div className="font-black text-sm text-emerald-500">₹{(form.originalPrice - parseFloat(form.price)).toFixed(0)} Saved</div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer actions */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-violet-500/15 transition-all"
                >
                  {editingId ? 'Save Changes' : 'Create Bundle'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
