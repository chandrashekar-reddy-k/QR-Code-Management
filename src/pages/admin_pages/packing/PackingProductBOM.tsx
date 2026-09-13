import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Eye,
  X,
  Trash2,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  masterDataService,
  Recipe,
  Product,
} from '../../../api/packing/masterDataService';

export const PackingProductBOM: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);

  // New Product Form State
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductUom, setNewProductUom] = useState('');
  const [productSubmitLoading, setProductSubmitLoading] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formOutputProductId, setFormOutputProductId] = useState('');
  const [formOutputQty, setFormOutputQty] = useState(1);

  // BOM Items (Raw Materials / Packaging)
  const [bomItems, setBomItems] = useState<
    {
      inputProductId: string;
      requiredQty: number;
      tolerancePct: number;
      materialType: 'RAW_MATERIAL' | 'PACKAGING';
    }[]
  >([
    {
      inputProductId: '',
      requiredQty: 1,
      tolerancePct: 0,
      materialType: 'RAW_MATERIAL',
    },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [fetchedRecipes, fetchedProducts, fetchedCategories, fetchedUoms] = await Promise.all([
        masterDataService.getRecipes(),
        masterDataService.getProducts(),
        masterDataService.getCategories(),
        masterDataService.getUOMs(),
      ]);
      setRecipes(fetchedRecipes || []);
      setProducts(fetchedProducts || []);
      setCategories(fetchedCategories || []);
      setUoms(fetchedUoms || []);
    } catch (err: any) {
      setError(
        'Failed to load master data. ' +
          (err.response?.data?.message || err.message || '')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddBOMItem = () => {
    setBomItems([
      ...bomItems,
      {
        inputProductId: '',
        requiredQty: 1,
        tolerancePct: 0,
        materialType: 'RAW_MATERIAL',
      },
    ]);
  };

  const handleRemoveBOMItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleBOMItemChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...bomItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setBomItems(updated);
  };

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormOutputProductId('');
    setFormOutputQty(1);
    setBomItems([
      {
        inputProductId: '',
        requiredQty: 1,
        tolerancePct: 0,
        materialType: 'RAW_MATERIAL',
      },
    ]);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    try {
      // Validate items
      const validItems = bomItems.filter((item) => item.inputProductId);
      if (validItems.length === 0) {
        throw new Error('At least one valid input product is required.');
      }

      await masterDataService.createRecipe({
        code: formCode,
        name: formName,
        outputProductId: formOutputProductId,
        outputQty: Number(formOutputQty),
        items: validItems.map((item) => ({
          inputProductId: item.inputProductId,
          requiredQty: Number(item.requiredQty),
          tolerancePct: Number(item.tolerancePct),
          isPackaging: item.materialType === 'PACKAGING',
        })),
      });

      setIsCreateOpen(false);
      resetForm();
      await fetchData();
      setIsCreateOpen(false);
    } catch (err: any) {
      setError(
        err.message || err.response?.data?.message || 'Failed to create Product BOM'
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateFinishedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSubmitLoading(true);
    setError('');

    try {
      // Prevent duplicates
      const exists = products.some(
        (p) =>
          p.sku.toLowerCase() === newProductSku.toLowerCase() ||
          p.name.toLowerCase() === newProductName.toLowerCase()
      );
      if (exists) {
        throw new Error('A product with this Name or SKU already exists.');
      }

      const res = await masterDataService.createProduct({
        name: newProductName,
        sku: newProductSku,
        categoryId: newProductCategoryId,
        unit: newProductUom,
        type: 'FINISHED_GOOD',
      });

      // Refetch to get the new product in the dropdown
      const fetchedProducts = await masterDataService.getProducts();
      setProducts(fetchedProducts || []);

      // Auto-select
      setFormOutputProductId(res.id || '');
      setIsCreateProductOpen(false);
      setNewProductName('');
      setNewProductSku('');
      setNewProductCategoryId('');
      setNewProductUom('');
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Failed to create finished product');
    } finally {
      setProductSubmitLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(
    (rcp) =>
      rcp.name?.toLowerCase().includes(search.toLowerCase()) ||
      rcp.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
          Product Bill of Materials (BOM)
        </h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
          Configure yield targets, raw materials, packaging, and tolerances for work order processing.
        </p>
      </div>

      {/* Top action block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by BOM name or code..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="flex items-center justify-center w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Product BOM</span>
          </button>
        </div>
      </div>

      {error && !isCreateOpen && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Table view */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-emerald-600">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-700/50 text-slate-500 dark:text-gray-300 font-bold text-xs uppercase border-b border-slate-200 dark:border-gray-700">
                <th className="p-4">BOM Code</th>
                <th className="p-4">BOM Name</th>
                <th className="p-4 text-center">Output Product</th>
                <th className="p-4 text-center">Output Yield</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-sm text-slate-700 dark:text-gray-200">
              {filteredRecipes.map((rcp) => {
                const outputProd =
                  rcp.outputProduct ||
                  products.find((p) => p.id === rcp.outputProductId);
                return (
                  <tr
                    key={rcp.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="p-4 font-mono font-semibold text-slate-500 dark:text-gray-400">
                      {rcp.code}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {rcp.name}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-200 text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-200 dark:border-gray-600">
                        {outputProd?.name || rcp.outputProductId}
                      </span>
                    </td>
                    <td className="p-4 text-center font-medium">
                      {rcp.outputQty}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedRecipe(rcp)}
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100/80 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-xs"
                      >
                        <Eye size={14} />
                        <span>View BOM</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRecipes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-400 dark:text-gray-400"
                  >
                    No Product BOMs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Recipe Detail Drawer */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          <div className="bg-white dark:bg-gray-800 w-full max-w-xl h-screen overflow-y-auto flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-950 text-white">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  {selectedRecipe.code}
                </span>
                <h3 className="text-lg font-bold">{selectedRecipe.name}</h3>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="bg-slate-50 dark:bg-gray-700/40 p-4 rounded-xl border border-slate-100 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 dark:text-gray-400 block uppercase font-bold">
                    Output Product
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-white text-lg">
                    {products.find(
                      (p) => p.id === selectedRecipe.outputProductId
                    )?.name || selectedRecipe.outputProductId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 dark:text-gray-400 block uppercase font-bold">
                    Target Yield
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-lg">
                    {selectedRecipe.outputQty}
                  </span>
                </div>
              </div>

              {/* Bill of Materials (BOM) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-500" />
                  <span>Input Materials (Raw Materials & Packaging)</span>
                </h4>
                <div className="bg-slate-50 dark:bg-gray-700/40 border border-slate-100 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-gray-700 text-slate-500 dark:text-gray-300 font-bold border-b border-slate-200 dark:border-gray-600">
                        <th className="p-3">Input Material</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-center">Required Qty</th>
                        <th className="p-3 text-center">UOM</th>
                        <th className="p-3 text-center">Tolerance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-slate-700 dark:text-gray-200">
                      {selectedRecipe.items?.map((item, idx) => {
                        const product =
                          item.inputProduct ||
                          products.find((p) => p.id === item.inputProductId);
                        return (
                          <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-gray-700/30">
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              {product?.name || item.inputProductId}
                            </td>
                            <td className="p-3 text-left">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-2 py-1 rounded-md">
                                {product?.type
                                  ? product.type.replace('_', ' ')
                                  : item.isPackaging
                                  ? 'PACKAGING'
                                  : 'RAW MATERIAL'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-medium">
                              {item.requiredQty}
                            </td>
                            <td className="p-3 text-center text-slate-600 dark:text-gray-300 font-mono text-xs">
                              {product?.unit || '-'}
                            </td>
                            <td className="p-3 text-center text-slate-500 dark:text-gray-400">
                              ±{item.tolerancePct || 0}%
                            </td>
                          </tr>
                        );
                      })}
                      {!selectedRecipe.items?.length && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-slate-400 dark:text-gray-400"
                          >
                            No items mapped.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Configuration Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-900 text-white shrink-0">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="text-amber-400" size={18} />
                <span>Create Product BOM</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              <form
                id="createRecipeForm"
                onSubmit={handleCreateSubmit}
                className="space-y-6"
              >
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      BOM Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RCP-001"
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-mono"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      BOM Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Premium Basmati Rice 1kg Bag"
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase">
                        Output Product *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCreateProductOpen(true)}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        + Create Finished Product
                      </button>
                    </div>
                    {products.length === 0 ? (
                      <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                        Please create a Product first in Master Data.
                      </div>
                    ) : (
                      <select
                        required
                        className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-white"
                        value={formOutputProductId}
                        onChange={(e) => setFormOutputProductId(e.target.value)}
                      >
                        <option value="" className="dark:bg-gray-800">
                          Select Target Product
                        </option>
                        {products
                          .filter((p) => p.type === 'FINISHED_GOOD')
                          .map((p) => (
                            <option key={p.id} value={p.id} className="dark:bg-gray-800">
                              {p.name} ({p.sku})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Target Yield Qty *
                    </label>
                    <input
                      type="number"
                      required
                      min={0.01}
                      step={0.01}
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                      value={formOutputQty}
                      onChange={(e) => setFormOutputQty(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Bill of Materials (BOM) Input Items */}
                <div className="border-t border-slate-100 dark:border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">
                      Input Materials
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddBOMItem}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {bomItems.map((item, index) => {
                      const selectedProduct = products.find(
                        (p) => p.id === item.inputProductId
                      );
                      return (
                        <div
                          key={index}
                          className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-slate-50 dark:bg-gray-700/40 p-3 rounded-lg border border-slate-200 dark:border-gray-700"
                        >
                          <div className="w-32">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase mb-1">
                              Material Type *
                            </label>
                            <select
                              required
                              className="w-full p-1.5 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-xs bg-white focus:outline-none"
                              value={item.materialType}
                              onChange={(e) => {
                                const updated = [...bomItems];
                                updated[index] = {
                                  ...updated[index],
                                  materialType: e.target.value as any,
                                  inputProductId: '',
                                };
                                setBomItems(updated);
                              }}
                            >
                              <option value="RAW_MATERIAL" className="dark:bg-gray-800">
                                Raw Material
                              </option>
                              <option value="PACKAGING" className="dark:bg-gray-800">
                                Packaging Material
                              </option>
                            </select>
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase mb-1">
                              Input Material *
                            </label>
                            {products.length === 0 ? (
                              <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1.5">
                                Please create a Product first.
                              </div>
                            ) : (
                              <select
                                required
                                className="w-full p-1.5 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-xs bg-white focus:outline-none"
                                value={item.inputProductId}
                                onChange={(e) =>
                                  handleBOMItemChange(
                                    index,
                                    'inputProductId',
                                    e.target.value
                                  )
                                }
                              >
                                <option value="" className="dark:bg-gray-800">
                                  Select Material
                                </option>
                                {products
                                  .filter((p) => {
                                    if (item.materialType === 'PACKAGING') {
                                      return p.type === 'PACKAGING';
                                    }
                                    return p.type !== 'FINISHED_GOOD' && p.type !== 'PACKAGING';
                                  })
                                  .map((p) => (
                                    <option key={p.id} value={p.id} className="dark:bg-gray-800">
                                      {p.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                          <div className="w-20">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase mb-1">
                              Req. Qty *
                            </label>
                            <input
                              type="number"
                              required
                              step="0.01"
                              min="0.01"
                              className="w-full p-1.5 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-xs focus:outline-none"
                              value={item.requiredQty}
                              onChange={(e) =>
                                handleBOMItemChange(
                                  index,
                                  'requiredQty',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="w-16">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase mb-1">
                              UOM
                            </label>
                            <input
                              type="text"
                              readOnly
                              className="w-full p-1.5 border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 rounded-lg text-xs focus:outline-none cursor-not-allowed"
                              value={selectedProduct?.unit || ''}
                              placeholder="-"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase mb-1">
                              Tolerance %
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-full p-1.5 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-xs focus:outline-none"
                              value={item.tolerancePct}
                              onChange={(e) =>
                                handleBOMItemChange(
                                  index,
                                  'tolerancePct',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          {bomItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBOMItem(index)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 bg-white dark:bg-gray-800 hover:bg-rose-50 border border-slate-200 dark:border-gray-700 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            {/* Submit Buttons */}
            <div className="border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 shrink-0 p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="createRecipeForm"
                disabled={submitLoading || products.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {submitLoading && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Finished Product Modal */}
      {isCreateProductOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-900 text-white shrink-0">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="text-amber-400" size={18} />
                <span>Create Finished Product</span>
              </h3>
              <button
                onClick={() => setIsCreateProductOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1">
              <form id="createProductForm" onSubmit={handleCreateFinishedProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none"
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    required
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm bg-white focus:outline-none"
                    value={newProductCategoryId}
                    onChange={(e) => setNewProductCategoryId(e.target.value)}
                  >
                    <option value="" className="dark:bg-gray-800">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-gray-800">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    required
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm bg-white focus:outline-none"
                    value={newProductUom}
                    onChange={(e) => setNewProductUom(e.target.value)}
                  >
                    <option value="" className="dark:bg-gray-800">Select Unit</option>
                    {uoms.map((u) => (
                      <option key={u.id} value={u.id} className="dark:bg-gray-800">{u.name} ({u.abbreviation})</option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div className="border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 shrink-0 p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateProductOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="createProductForm"
                disabled={productSubmitLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {productSubmitLoading && <Loader2 size={16} className="animate-spin" />}
                Create Finished Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingProductBOM;
