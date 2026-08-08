// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Sparkles, Check, X, ArrowLeft,
  ShoppingBag, Search, Tag, DollarSign, Layers, ChevronLeft, ChevronRight, Upload
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../vsms/services/adminService';
import { useGetAllProductList } from '../../../hooks/product';
import { uploadImageFile } from '../../../lib/uploadImage';

export default function BundleDeals() {
  const [bundles, setBundles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Product list pagination & search states
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 10;

  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  // Retrieve warehouseId from local storage or store to isolate product selection
  const partnerWarehouseId = localStorage.getItem('partnerWarehouseId') || '';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const url = await uploadImageFile(file);
      setForm(prev => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded successfully to S3!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Query products list via product management hook (1000 items limit to cover inventory list)
  // Filtering: active (true) and APPROVED status only, restricted to partner's warehouse
  const { data: productsRes } = useGetAllProductList(1, 1000, "", true, "APPROVED", partnerWarehouseId);
  const products = (productsRes as any)?.data?.products ?? [];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // showAll=true: admin portal should always see all own bundles (no storefront product filter)
      const bundleRes = await adminAPI.getBundles({ showAll: 'true' });
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

  // Filter products based on search query
  const filteredProductsList = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Paginated products
  const totalProductPages = Math.ceil(filteredProductsList.length / productsPerPage) || 1;
  const paginatedProducts = filteredProductsList.slice(
    (productPage - 1) * productsPerPage,
    productPage * productsPerPage
  );

  // Reset product search page when query changes
  useEffect(() => {
    setProductPage(1);
  }, [productSearch]);

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
    setProductSearch('');
    setProductPage(1);
    setView('create');
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
    setProductSearch('');
    setProductPage(1);
    setView('edit');
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
      setView('list');
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

  return (
    <div className="p-8 min-h-screen bg-gray-50/50 dark:bg-gray-950/20 text-gray-900 dark:text-gray-100">
      
      {view === 'list' ? (
        <>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fadeIn">
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
        </>
      ) : (
        /* Full-page Inline Creation & Editing Layout */
        <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl shadow-sm p-6 md:p-8 animate-fadeIn">
          
          {/* Inline Page Header */}
          <div className="flex justify-between items-center pb-6 border-b border-gray-100 dark:border-gray-800 mb-6">
            <div>
              <button 
                onClick={() => setView('list')}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-violet-500 transition-colors mb-2"
              >
                <ArrowLeft size={14} /> Back to Bundles List
              </button>
              <h2 className="text-2xl font-black">{view === 'edit' ? 'Edit Bundle Deal' : 'Create Bundle Deal'}</h2>
              <p className="text-gray-500 text-xs mt-1">Configure name, price, and select bundle items.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Basic configuration fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
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

              <div className="space-y-1.5 md:col-span-2">
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

              <div className="space-y-1.5 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Or Upload File to AWS S3</label>
                  <div className="flex gap-3 items-center">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer text-xs font-bold transition-all text-gray-500 hover:text-violet-500">
                      <Upload size={14} />
                      {isUploadingImage ? 'Uploading...' : 'Choose Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {form.imageUrl && (
                      <div className="w-12 h-12 rounded-xl border border-gray-150 overflow-hidden bg-gray-50 flex-shrink-0 relative group">
                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-150"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Split layout: Selector Table left, selected list right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              
              {/* Product Selector section with Table and Pagination */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Products to Bundle</label>
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 pl-9 pr-3 py-2 rounded-xl outline-none focus:border-violet-500 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-gray-900">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-150 dark:border-gray-800 text-gray-400 font-black uppercase tracking-widest">
                          <th className="p-3">Product Name</th>
                          <th className="p-3 text-center">Price</th>
                          <th className="p-3 text-center">Stock</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProducts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-gray-400 italic">No products found matching query.</td>
                          </tr>
                        ) : (
                          paginatedProducts.map(p => {
                            const isOutOfStock = p.stock <= 0;
                            const isAdded = form.items.some(item => item.productId === p.id);
                            return (
                              <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/50 dark:hover:bg-gray-950/20 font-bold">
                                <td className="p-3 truncate max-w-[200px]">{p.name}</td>
                                <td className="p-3 text-center text-gray-600 dark:text-gray-400">₹{p.price}</td>
                                <td className="p-3 text-center">
                                  {isOutOfStock ? (
                                    <span className="text-[10px] text-rose-500 font-extrabold uppercase">Out of Stock</span>
                                  ) : (
                                    <span className="text-gray-500">{p.stock}</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    disabled={isOutOfStock || isAdded}
                                    onClick={() => handleAddProductToBundle(p)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${
                                      isAdded
                                        ? 'bg-violet-500/10 text-violet-500 border border-violet-500/15 cursor-default'
                                        : isOutOfStock
                                        ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
                                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:-translate-y-0.5'
                                    }`}
                                  >
                                    {isAdded ? 'Added' : 'Add'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                {totalProductPages > 1 && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-gray-400 font-semibold">Page {productPage} of {totalProductPages}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={productPage === 1}
                        onClick={() => setProductPage(prev => Math.max(1, prev - 1))}
                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={productPage === totalProductPages}
                        onClick={() => setProductPage(prev => Math.min(totalProductPages, prev + 1))}
                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected items grid list */}
              <div className="lg:col-span-5 space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Selected Combo Items</label>
                
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {form.items.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl italic">No products added to this bundle yet.</p>
                  ) : (
                    form.items.map(item => (
                      <div 
                        key={item.productId}
                        className="flex justify-between items-center bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 p-3.5 rounded-2xl animate-fadeIn"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="text-xs font-black truncate text-gray-700 dark:text-gray-300">{item.name}</div>
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
                              className="w-14 bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 px-2 py-1 rounded-xl text-center font-bold text-xs outline-none"
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

            </div>

            {/* Price comparison / savings Summary */}
            {form.items.length > 0 && (
              <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/50 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
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
                onClick={() => setView('list')}
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
      )}

    </div>
  );
}
