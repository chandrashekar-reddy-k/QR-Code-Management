// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Sparkles, Check, X, ArrowLeft,
  ShoppingBag, Search, Tag, DollarSign, Layers, ChevronLeft, ChevronRight, Upload,
  Eye, Table, LayoutGrid, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../vsms/services/adminService';
import { useGetAllProductList } from '../../../hooks/product';
import { uploadImageFile } from '../../../lib/uploadImage';

export default function BundleDeals() {
  const [bundles, setBundles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected bundle for Detail Modal/View
  const [detailBundle, setDetailBundle] = useState<any | null>(null);

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
    startDate: '',
    endDate: '',
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
  const { data: productsRes } = useGetAllProductList(1, 1000, "", true, "APPROVED", partnerWarehouseId);
  const products = (productsRes as any)?.data?.products ?? [];

  const fetchData = async () => {
    setIsLoading(true);
    try {
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

  useEffect(() => {
    setProductPage(1);
  }, [productSearch]);

  const formatForDateTimeInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      price: '',
      originalPrice: 0,
      imageUrl: '',
      startDate: '',
      endDate: '',
      items: []
    });
    setProductSearch('');
    setView('create');
  };

  const getItemPrice = (product) => {
    return product?.sellingPrice ?? product?.price ?? product?.mrp ?? 0;
  };

  const handleOpenEdit = (bundle) => {
    setEditingId(bundle.id);
    setForm({
      name: bundle.name,
      description: bundle.description || '',
      price: bundle.price.toString(),
      originalPrice: bundle.originalPrice || 0,
      imageUrl: bundle.imageUrl || '',
      startDate: formatForDateTimeInput(bundle.startDate),
      endDate: formatForDateTimeInput(bundle.endDate),
      items: bundle.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.product?.name || 'Product',
        price: getItemPrice(item.product)
      }))
    });
    setProductSearch('');
    setView('edit');
  };

  const handleAddProductToBundle = (product) => {
    if (form.items.some(item => item.productId === product.id)) {
      toast.error('Product already added to bundle.');
      return;
    }

    const itemPrice = getItemPrice(product);
    const updatedItems = [
      ...form.items,
      {
        productId: product.id,
        quantity: 1,
        name: product.name,
        price: itemPrice
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
    if (!form.name || form.price === '' || isNaN(parseFloat(form.price)) || form.items.length === 0) {
      toast.error('Please enter name, bundle price and add at least one product.');
      return;
    }

    const parsedPrice = Math.round(parseFloat(form.price));
    const parsedMrp = Math.round(parseFloat(form.originalPrice || form.price));
    const img = form.imageUrl || form.image || '';

    const payload = {
      name: form.name.trim(),
      description: form.description ? form.description.trim() : '',
      price: parsedPrice,
      bundlePrice: parsedPrice,
      originalPrice: parsedMrp,
      mrp: parsedMrp,
      imageUrl: img,
      image: img,
      startDate: (form.startDate && !isNaN(new Date(form.startDate).getTime())) ? new Date(form.startDate).toISOString() : null,
      endDate: (form.endDate && !isNaN(new Date(form.endDate).getTime())) ? new Date(form.endDate).toISOString() : null,
      items: form.items.map(i => ({
        productId: i.productId || i.id,
        id: i.productId || i.id,
        quantity: Math.max(1, parseInt(i.quantity || 1))
      }))
    };

    try {
      if (editingId) {
        await adminAPI.updateBundle(editingId, payload);
        toast.success('Bundle deal updated successfully.');
      } else {
        await adminAPI.createBundle(payload);
        toast.success('Bundle deal created successfully. Submitted for Admin Approval.');
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

  const isBundleExpired = (bundle) => {
    if (!bundle) return false;
    const now = new Date();
    if (bundle.endDate && new Date(bundle.endDate) < now) {
      return true;
    }
    return false;
  };

  const filteredBundles = bundles.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 min-h-screen bg-gray-50/50 dark:bg-gray-950/20 text-gray-900 dark:text-gray-100 font-sans">
      
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

          {/* Filter, Search & View Switcher Bar */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search bundle deals..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm transition-all"
              />
            </div>

            {/* Layout Toggle (Table vs Cards) */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
              <button
                onClick={() => setDisplayMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  displayMode === 'table'
                    ? 'bg-white dark:bg-gray-900 text-violet-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Table size={16} /> Table View
              </button>
              <button
                onClick={() => setDisplayMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  displayMode === 'cards'
                    ? 'bg-white dark:bg-gray-900 text-violet-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid size={16} /> Cards View
              </button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <p className="text-sm font-bold text-gray-500">Loading bundle deals...</p>
            </div>
          ) : filteredBundles.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 p-16 rounded-3xl text-center">
              <ShoppingBag className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={48} />
              <h3 className="text-lg font-bold">No Bundle Deals Configured</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mt-2">Create combo packs of products and offer discounts to boost sales on the consumer app.</p>
            </div>
          ) : displayMode === 'table' ? (
            /* TABLE FORMAT VIEW */
            <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-150 dark:border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="py-4 px-4 font-black">IMAGE</th>
                      <th className="py-4 px-4 font-black">BUNDLE NAME & DESCRIPTION</th>
                      <th className="py-4 px-4 font-black">COMBO ITEMS</th>
                      <th className="py-4 px-4 font-black">MRP TOTAL</th>
                      <th className="py-4 px-4 font-black">SELLING PRICE</th>
                      <th className="py-4 px-4 font-black">SAVINGS</th>
                      <th className="py-4 px-4 font-black">APPROVAL</th>
                      <th className="py-4 px-4 font-black">STATUS</th>
                      <th className="py-4 px-4 font-black text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredBundles.map((bundle) => {
                      const savings = Math.max(0, bundle.originalPrice - bundle.price);
                      return (
                        <tr key={bundle.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="py-4 px-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                              {bundle.imageUrl ? (
                                <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover" />
                              ) : (
                                <Layers className="text-violet-500" size={20} />
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 max-w-[220px]">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{bundle.name}</h4>
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{bundle.description || 'No description provided.'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                                {bundle.items?.length || 0} Items
                              </span>
                              <div className="flex -space-x-2 overflow-hidden">
                                {bundle.items?.slice(0, 4).map((it) => (
                                  <div key={it.id} className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                    {it.product?.images?.[0] ? (
                                      <img src={it.product.images[0]} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <ShoppingBag size={12} className="m-auto text-gray-400" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-medium text-gray-400 line-through">
                            ₹{bundle.originalPrice}
                          </td>
                          <td className="py-4 px-4 font-black text-violet-600 text-sm">
                            ₹{bundle.price}
                          </td>
                          <td className="py-4 px-4">
                            {savings > 0 ? (
                              <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold px-2.5 py-1 rounded-md text-[11px]">
                                Save ₹{savings}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">Standard</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-xl font-black text-[9px] uppercase tracking-wider border ${
                              bundle.approvalStatus === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : bundle.approvalStatus === 'REJECTED'
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {bundle.approvalStatus || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {isBundleExpired(bundle) ? (
                              <span className="px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 inline-block">
                                Expired
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleActive(bundle)}
                                className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider ${
                                  bundle.isActive 
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/10'
                                }`}
                              >
                                {bundle.isActive ? 'Active' : 'Inactive'}
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setDetailBundle(bundle)}
                                title="View Details"
                                className="p-2 bg-gray-50 hover:bg-violet-50 text-gray-600 hover:text-violet-600 rounded-xl transition-all"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(bundle)}
                                title="Edit Bundle"
                                className="p-2 bg-gray-50 hover:bg-violet-50 text-gray-600 hover:text-violet-600 rounded-xl transition-all"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(bundle.id)}
                                title="Delete Bundle"
                                className="p-2 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARDS GRID FORMAT VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fadeIn">
              {filteredBundles.map(bundle => {
                const savings = Math.max(0, bundle.originalPrice - bundle.price);
                return (
                  <div 
                    key={bundle.id}
                    className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group"
                  >
                    {/* Active Toggle & Approval Status badge */}
                    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl font-black text-[9px] uppercase tracking-wider border ${
                        bundle.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : bundle.approvalStatus === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {bundle.approvalStatus || 'PENDING'}
                      </span>
                      {isBundleExpired(bundle) ? (
                        <span className="px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          Expired
                        </span>
                      ) : (
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
                      )}
                    </div>

                    <div>
                      {/* Image/Details */}
                      <div className="flex gap-4 mb-4 items-start cursor-pointer" onClick={() => setDetailBundle(bundle)}>
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
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
                            <span className="text-gray-400 font-medium">₹{item.product?.mrp ?? item.product?.price ?? 0} each</span>
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
                          onClick={() => setDetailBundle(bundle)}
                          title="View Details"
                          className="p-3 bg-gray-50 hover:bg-violet-50 text-gray-600 hover:text-violet-600 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-2xl transition-all"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(bundle)}
                          className="p-3 bg-gray-50 hover:bg-violet-50 text-gray-600 hover:text-violet-600 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-2xl transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(bundle.id)}
                          className="p-3 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-2xl transition-all"
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
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl outline-none focus:border-violet-500 font-bold text-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe what's special about this combo pack..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl outline-none focus:border-violet-500 font-medium text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bundle Selling Price (₹) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g., 299"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  onBlur={e => setForm({ ...form, price: Math.round(parseFloat(e.target.value || 0)).toString() })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl outline-none focus:border-violet-500 font-black text-sm text-violet-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Original Total MRP (₹)</label>
                <input
                  type="number"
                  readOnly
                  value={form.originalPrice}
                  className="w-full bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl outline-none font-bold text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl outline-none focus:border-violet-500 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl outline-none focus:border-violet-500 font-bold text-xs"
                />
              </div>
            </div>

            {/* Image upload box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bundle Image Banner</label>
              <div className="flex items-center gap-4">
                {form.imageUrl && (
                  <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
                    <img src={form.imageUrl} alt="Bundle preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <label className="flex-1 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-violet-500 p-4 rounded-2xl text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/40">
                  <Upload className="mx-auto text-violet-500 mb-1" size={20} />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    {isUploadingImage ? 'Uploading image...' : form.imageUrl ? 'Change Bundle Image' : 'Click to Upload Image'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Selected Bundle Items Section */}
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  Items in this Bundle ({form.items.length})
                </label>
                <span className="text-xs text-gray-400 font-bold">Auto-calculated MRP: ₹{form.originalPrice}</span>
              </div>

              {form.items.length === 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center text-amber-600 text-xs font-bold">
                  No products added yet. Select products from the table below to include them in this combo deal.
                </div>
              ) : (
                <div className="space-y-2">
                  {form.items.map(item => (
                    <div key={item.productId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="font-bold text-xs text-gray-800 dark:text-gray-200">
                        {item.name} <span className="text-gray-400 font-normal ml-2">(MRP: ₹{item.price})</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center font-black text-gray-500 hover:text-violet-600"
                          >
                            -
                          </button>
                          <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center font-black text-gray-500 hover:text-violet-600"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveProductFromBundle(item.productId)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product selection list */}
            <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <h4 className="font-black text-sm uppercase tracking-wider">Select Products to Add</h4>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search product inventory..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-3 py-2 rounded-xl text-xs font-bold outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-150 dark:border-gray-800 font-black text-gray-400 uppercase tracking-widest">
                        <th className="py-3 px-4">PRODUCT</th>
                        <th className="py-3 px-4">MRP / ORIG PRICE</th>
                        <th className="py-3 px-4">SELLING PRICE</th>
                        <th className="py-3 px-4">STOCK</th>
                        <th className="py-3 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {paginatedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 font-bold">
                            No active products found matching your search.
                          </td>
                        </tr>
                      ) : (
                        paginatedProducts.map(p => {
                          const isAdded = form.items.some(i => i.productId === p.id);
                          const mrpVal = getItemPrice(p);
                          return (
                            <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                    {p.images?.[0] ? (
                                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <ShoppingBag size={14} className="m-auto text-gray-400" />
                                    )}
                                  </div>
                                  <span className="font-bold text-gray-800 dark:text-gray-200">{p.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-200">₹{mrpVal}</td>
                              <td className="py-3 px-4 font-black text-emerald-600">₹{p.price}</td>
                              <td className="py-3 px-4 font-bold text-gray-500">{p.stock ?? 0}</td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => handleAddProductToBundle(p)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                    isAdded 
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800' 
                                      : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                                  }`}
                                >
                                  {isAdded ? 'Added' : '+ Add'}
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
            </div>

            {/* Form submit footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-violet-500/20"
              >
                {editingId ? 'Update Bundle' : 'Save Bundle'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* DETAIL VIEW MODAL (Matching User Reference Design) */}
      {detailBundle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {detailBundle.imageUrl ? (
                    <img src={detailBundle.imageUrl} alt={detailBundle.name} className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="text-violet-500" size={28} />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-violet-600 dark:text-violet-400">{detailBundle.name}</h2>
                  <p className="text-gray-500 text-xs mt-0.5">{detailBundle.description || 'Combo bundle offer'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider border ${
                  detailBundle.approvalStatus === 'APPROVED'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : detailBundle.approvalStatus === 'REJECTED'
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {detailBundle.approvalStatus || 'PENDING'}
                </span>
                {isBundleExpired(detailBundle) ? (
                  <span className="px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    EXPIRED
                  </span>
                ) : (
                  <span className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider ${
                    detailBundle.isActive 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-gray-500/10 text-gray-400 border border-gray-500/10'
                  }`}>
                    {detailBundle.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                )}
                <button 
                  onClick={() => setDetailBundle(null)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 rounded-full transition-all ml-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Horizontal Product Image Gallery with + signs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 justify-center bg-gray-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              {detailBundle.items?.map((item, idx) => {
                const img = item.product?.images?.[0];
                return (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <span className="text-gray-300 dark:text-gray-600 text-sm font-black">+</span>}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-sm">
                        {img ? (
                          <img src={img} alt={item.product?.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag size={18} className="text-gray-400" />
                        )}
                      </div>
                      <span className="absolute -bottom-1.5 -right-1.5 bg-violet-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-gray-900">
                        {item.quantity}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* BUNDLE COMBO ITEMS Checklist (Matching Screenshot) */}
            <div className="bg-gray-50/70 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-150 dark:border-gray-800 mb-6 space-y-3">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">BUNDLE COMBO ITEMS</div>
              {detailBundle.items?.map(item => {
                const itemMrp = item.product?.mrp ?? item.product?.price ?? 0;
                return (
                  <div key={item.id} className="flex justify-between items-center text-xs font-bold">
                    <span className="text-violet-600 dark:text-violet-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      {item.product?.name || 'Product'} <span className="text-violet-500 font-black">x{item.quantity}</span>
                    </span>
                    <span className="text-gray-400 font-medium">₹{itemMrp} each</span>
                  </div>
                );
              })}
            </div>

            {/* Price & Savings Footer Summary */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-150 dark:border-gray-800">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">₹{detailBundle.price}</span>
                  <span className="text-gray-400 text-sm line-through">₹{detailBundle.originalPrice}</span>
                </div>
                {detailBundle.originalPrice > detailBundle.price && (
                  <span className="inline-block text-emerald-600 font-black text-xs uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg mt-1 border border-emerald-500/20">
                    SAVE ₹{detailBundle.originalPrice - detailBundle.price}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setDetailBundle(null); handleOpenEdit(detailBundle); }}
                  className="px-4 py-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 hover:bg-violet-100 rounded-xl font-bold text-xs flex items-center gap-1.5"
                >
                  <Edit3 size={15} /> Edit Bundle
                </button>
                <button
                  onClick={() => setDetailBundle(null)}
                  className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
