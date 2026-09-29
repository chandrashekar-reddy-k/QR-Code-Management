import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  masterDataService,
  Recipe,
  Product,
} from '../../../api/packing/masterDataService';

export const PackingProductBOM: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inputProducts, setInputProducts] = useState<Product[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Output product custom searchable dropdown
  const [outputPickerOpen, setOutputPickerOpen] = useState(false);
  const [outputProductSearch, setOutputProductSearch] = useState('');

  // Form State
  const [formCode, setFormCode] = useState(`RCP-${Math.floor(100000 + Math.random() * 900000)}`);
  const [formName, setFormName] = useState('');
  const [formOutputProductId, setFormOutputProductId] = useState('');
  const [formOutputQty, setFormOutputQty] = useState<number | string>('');

  // BOM Items (Raw Materials / Packaging)
  const [bomItems, setBomItems] = useState<
    {
      inputProductId: string;
      requiredQty: number | string;
      tolerancePct: number;
      materialType: 'RAW_MATERIAL' | 'PACKAGING';
    }[]
  >([
    {
      inputProductId: '',
      requiredQty: '' as number | string,
      tolerancePct: 0,
      materialType: 'RAW_MATERIAL',
    },
  ]);

  useEffect(() => {
    if (location.state?.bomFormState) {
      const state = location.state.bomFormState;
      setIsCreateOpen(state.isCreateOpen || false);
      setFormCode(state.formCode || '');
      setFormName(state.formName || '');
      setFormOutputQty(state.formOutputQty || 1);
      setBomItems(state.bomItems || [{ inputProductId: '', requiredQty: 1, tolerancePct: 0, materialType: 'RAW_MATERIAL' }]);
      
      if (location.state.newProductId) {
        setFormOutputProductId(location.state.newProductId);
      } else {
        setFormOutputProductId(state.formOutputProductId || '');
      }

      // Clear the state so a reload doesn't trigger this again
      navigate(location.pathname, { replace: true, state: {} });
    }
    fetchData();
  }, [location.state, location.pathname, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [fetchedRecipes, fetchedProducts, fetchedUoms, fetchedInputProducts] = await Promise.all([
        masterDataService.getRecipes(),
        masterDataService.getProducts('inventoryType=READY,RAW'),
        masterDataService.getUOMs(),
        masterDataService.getProducts(),
      ]);
      setRecipes(fetchedRecipes || []);
      setProducts(fetchedProducts || []);
      setInputProducts(fetchedInputProducts || []);
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
        requiredQty: '' as number | string,
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
    setFormCode(`RCP-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormName('');
    setFormOutputProductId('');
    setFormOutputQty('');
    setBomItems([
      {
        inputProductId: '',
        requiredQty: '' as number | string,
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

  const filteredRecipes = recipes.filter(
    (rcp) =>
      rcp.name?.toLowerCase().includes(search.toLowerCase()) ||
      rcp.code?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const paginatedRecipes = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredRecipes.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRecipes, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredRecipes.length / rowsPerPage);

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
              {paginatedRecipes.map((rcp, index) => {
                const outputProd =
                  rcp.outputProduct ||
                  products.find((p) => p.id === rcp.outputProductId);
                return (
                  <tr
                    key={`${rcp.id}-${index}`}
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

        {/* Pagination Footer */}
        {!loading && (
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 dark:text-white focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {filteredRecipes.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} -{' '}
                {Math.min(currentPage * rowsPerPage, filteredRecipes.length)} of{' '}
                {filteredRecipes.length} records
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-bold dark:text-white">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
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
                    {selectedRecipe.outputProduct?.name ||
                      products.find(
                        (p) => p.id === selectedRecipe.outputProductId
                      )?.name ||
                      selectedRecipe.outputProductId}
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
                              {product?.uom?.abbreviation || product?.uom?.name || uoms.find((u) => u.id === product?.unit)?.abbreviation || uoms.find((u) => u.id === product?.unit)?.name || product?.unit || '-'}
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
                      readOnly
                      placeholder="e.g. RCP-001"
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 dark:text-gray-400 text-slate-500 rounded-lg text-sm focus:outline-none font-mono cursor-not-allowed"
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
                     <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                        Output Product *
                      </label>
                    {/* Custom searchable output product picker */}
                    {(() => {
                      const outputProducts = products.filter((p: any) =>
                        p.inventoryType === 'READY' && (p.productType === 'BRANDED' || p.productType === 'Branded')
                      );
                      const filteredOutputProducts = outputProducts.filter((p: any) =>
                        p.name?.toLowerCase().includes(outputProductSearch.toLowerCase()) ||
                        (p.sku || p.resolvedSku || '').toLowerCase().includes(outputProductSearch.toLowerCase())
                      );
                      const selectedOutputProduct = outputProducts.find((p: any) => p.id === formOutputProductId);

                      if (outputProducts.length === 0) {
                        return (
                          <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                            Please create a Product first in Master Data.
                          </div>
                        );
                      }

                      return (
                        <div className="relative">
                          {/* Trigger button */}
                          <button
                            type="button"
                            onClick={() => { setOutputPickerOpen(true); setOutputProductSearch(''); }}
                            className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm text-left focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-white flex items-center justify-between"
                          >
                            <span className={selectedOutputProduct ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-gray-500'}>
                              {selectedOutputProduct ? selectedOutputProduct.name : 'Select Target Product'}
                            </span>
                            <Search size={14} className="text-slate-400 flex-shrink-0" />
                          </button>

                          {/* Dropdown panel */}
                          {outputPickerOpen && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                              {/* Backdrop */}
                              <div
                                className="absolute inset-0 bg-black/30"
                                onClick={() => setOutputPickerOpen(false)}
                              />
                              {/* Panel */}
                              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[70vh]">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">Select Product</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setOutputPickerOpen(false)}
                                      className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>

                                {/* Search input */}
                                <div className="px-5 pb-3">
                                  <div className="flex items-center gap-2 border-2 border-emerald-500 rounded-xl px-3 py-2 bg-white dark:bg-gray-900">
                                    <Search size={16} className="text-emerald-500 flex-shrink-0" />
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="Search product name or SKU..."
                                      className="flex-1 text-sm bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-400"
                                      value={outputProductSearch}
                                      onChange={(e) => setOutputProductSearch(e.target.value)}
                                    />
                                  </div>
                                </div>

                                {/* Product list */}
                                <div className="overflow-y-auto flex-1 px-2 pb-4">
                                  {filteredOutputProducts.length === 0 ? (
                                    <div className="text-center text-sm text-slate-400 py-8">No products found</div>
                                  ) : (
                                    filteredOutputProducts.map((p: any) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { setFormOutputProductId(p.id); setOutputPickerOpen(false); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
                                          formOutputProductId === p.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                                        }`}
                                      >
                                        <p className="font-semibold text-sm text-slate-800 dark:text-white">{p.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{p.sku || p.resolvedSku || 'NO-SKU'}</p>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
                      const selectedProduct = inputProducts.find(
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
                            {inputProducts.length === 0 ? (
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
                                {inputProducts
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
                          <div className="w-20">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase mb-1">
                              UOM
                            </label>
                            <input
                              type="text"
                              readOnly
                              className="w-full p-1.5 border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-medium rounded-lg text-xs focus:outline-none cursor-not-allowed"
                              value={
                                selectedProduct?.uom?.abbreviation ||
                                selectedProduct?.uom?.name ||
                                uoms.find((u) => u.id === selectedProduct?.uomId)?.abbreviation ||
                                uoms.find((u) => u.id === selectedProduct?.uomId)?.name ||
                                uoms.find((u) => u.id === selectedProduct?.unit)?.abbreviation ||
                                uoms.find((u) => u.id === selectedProduct?.unit)?.name ||
                                selectedProduct?.unit ||
                                ''
                              }
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
    </div>
  );
};

export default PackingProductBOM;
