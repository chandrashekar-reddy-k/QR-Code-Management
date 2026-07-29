import React, { useState, useEffect } from "react";
import { Plus, Upload, History, DollarSign, Calendar, Search, Edit3, Trash2 } from "lucide-react";
import fetchData from "../../../helper";
import { toast } from "react-toastify";

interface PriceBook {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
}

interface Variant {
  id: string;
  variantName: string;
  sku: string;
  mrp: number;
  sellingPrice: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  mrp: number;
  variants?: Variant[];
}

interface ProductPriceHistoryItem {
  id: string;
  mrp: number;
  sellingPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  priceBook: {
    name: string;
    code: string;
  };
}

export default function ProductPricing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  // Assign Price Form States
  const [productId, setProductId] = useState("");
  const [priceBookId, setPriceBookId] = useState("");
  const [mrp, setMrp] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  // Bulk Upload Form State
  const [bulkJson, setBulkJson] = useState("");

  const [comparisonData, setComparisonData] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, priceBooksRes, comparisonRes] = await Promise.all([
        fetchData<{ status: number; data: Product[] | { products: Product[] } }>("/productmanagement/product?limit=1000"),
        fetchData<{ status: number; data: PriceBook[] }>("/pricing/price-books"),
        fetchData<{ status: number; data: any[] }>("/pricing/prices/comparison")
      ]);

      if (productsRes) {
        // Handle different possible products list shapes
        const prodData = Array.isArray(productsRes.data)
          ? productsRes.data
          : (productsRes.data as any)?.products || [];
        setProducts(prodData);
      }
      if (priceBooksRes && priceBooksRes.data) {
        setPriceBooks(priceBooksRes.data.filter(b => b.isActive !== false));
      }
      if (comparisonRes && comparisonRes.data) {
        setComparisonData(comparisonRes.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load pricing configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditChannelPrice = (item: any, pBookId: string, currentMrp: number, currentPrice: number) => {
    setProductId(item.id);
    setPriceBookId(pBookId);
    setSelectedVariantId(item.productVariantId || "");
    setMrp(currentMrp.toString());
    setSellingPrice(currentPrice.toString());
    setEffectiveFrom(new Date().toISOString().split("T")[0]);
    setEffectiveTo("");
    setAssignModalOpen(true);
  };

  const handleDeleteChannelPrice = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this channel pricing? It will fall back to base price.")) {
      return;
    }
    try {
      const response = await fetchData<{ status: number; message: string }>(`/pricing/product-prices/${id}`, "DELETE");
      if (response && response.status === 200) {
        toast.success(response.message || "Price deleted successfully");
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete price");
    }
  };

  const handleDeleteRowPrices = async (productId: string, productVariantId: string | null) => {
    if (!window.confirm("Are you sure you want to delete ALL custom prices for this row?")) {
      return;
    }
    try {
      const url = productVariantId
        ? `/pricing/product-prices?productId=${productId}&productVariantId=${productVariantId}`
        : `/pricing/product-prices?productId=${productId}`;
      const response = await fetchData<{ status: number; message: string }>(url, "DELETE");
      if (response && response.status === 200) {
        toast.success(response.message || "Pricing records deleted successfully");
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete prices");
    }
  };

  const handleProductChange = (prodId: string) => {
    setProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      if (prod.variants && prod.variants.length > 0) {
        const firstVar = prod.variants[0];
        setSelectedVariantId(firstVar.id);
        setMrp(firstVar.mrp?.toString() || "");
        setSellingPrice(firstVar.sellingPrice?.toString() || "");
      } else {
        setSelectedVariantId("");
        setMrp(prod.mrp?.toString() || "");
        setSellingPrice(prod.price?.toString() || "");
      }
    }
  };

  const handleOpenAssign = (product?: Product) => {
    const activeProduct = product || products[0];
    const prodId = activeProduct?.id || "";
    setProductId(prodId);
    setPriceBookId(priceBooks[0]?.id || "");

    if (activeProduct) {
      if (activeProduct.variants && activeProduct.variants.length > 0) {
        const firstVar = activeProduct.variants[0];
        setSelectedVariantId(firstVar.id);
        setMrp(firstVar.mrp?.toString() || "");
        setSellingPrice(firstVar.sellingPrice?.toString() || "");
      } else {
        setSelectedVariantId("");
        setMrp(activeProduct.mrp?.toString() || "");
        setSellingPrice(activeProduct.price?.toString() || "");
      }
    } else {
      setSelectedVariantId("");
      setMrp("");
      setSellingPrice("");
    }

    setEffectiveFrom(new Date().toISOString().split("T")[0]);
    setEffectiveTo("");
    setAssignModalOpen(true);
  };

  const handleAssignPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !priceBookId || mrp === undefined || sellingPrice === undefined) {
      toast.warn("Product, Price Book, MRP, and Selling Price are required");
      return;
    }

    try {
      const payload = {
        productId,
        productVariantId: selectedVariantId || null,
        priceBookId,
        mrp: Number(mrp),
        sellingPrice: Number(sellingPrice),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : new Date().toISOString(),
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null
      };

      const response = await fetchData<{ status: number; message: string }>("/pricing/product-prices", "POST", payload);
      if (response && response.status === 200) {
        toast.success(response.message || "Price assigned successfully");
        setAssignModalOpen(false);
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign price");
    }
  };

  const handleOpenHistory = async (product: Product) => {
    setSelectedProduct(product);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const response = await fetchData<{ status: number; data: ProductPriceHistoryItem[] }>(`/pricing/prices/history?productId=${product.id}`);
      if (response && response.data) {
        setPriceHistory(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load price history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        toast.warn("Bulk data must be a JSON array of pricing rules");
        return;
      }

      const response = await fetchData<{ status: number; message: string }>("/pricing/product-prices", "POST", { prices: parsed });
      if (response && response.status === 200) {
        toast.success(response.message || "Bulk prices uploaded successfully");
        setBulkModalOpen(false);
        setBulkJson("");
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid JSON or upload failed");
    }
  };

  const filteredComparison = comparisonData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Product Pricing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure channel-specific custom pricing and active periods</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold transition-all shadow-sm"
          >
            <Upload size={18} />
            Bulk Upload JSON
          </button>
          <button
            onClick={() => handleOpenAssign()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-sm"
          >
            <Plus size={18} />
            Assign Price
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-green-600"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Base (MRP/Price)</th>
                {priceBooks.map((pb) => (
                  <th key={pb.id} className="px-6 py-4">{pb.name} ({pb.code})</th>
                ))}
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-700 dark:text-slate-300">
              {filteredComparison.map((item) => (
                <tr key={item.productVariantId ? `${item.id}-${item.productVariantId}` : item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{item.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{item.sku || "—"}</td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <div>MRP: Rs {item.baseMrp || 0}</div>
                    <div className="text-slate-500">Price: Rs {item.basePrice || 0}</div>
                  </td>
                  {priceBooks.map((pb) => {
                    const customPrice = item.customPrices?.[pb.id] || { mrp: item.baseMrp, sellingPrice: item.basePrice, isCustom: false, id: null };
                    const isCustom = customPrice.isCustom;
                    return (
                      <td key={pb.id} className={`px-6 py-4 font-mono text-xs group relative ${
                        isCustom
                          ? (pb.code === 'POS' ? 'text-green-600 dark:text-green-400' :
                             pb.code === 'ONLINE' ? 'text-indigo-600 dark:text-indigo-400' :
                             pb.code === 'VEHICLE' ? 'text-rose-600 dark:text-rose-400' :
                             'text-slate-600 dark:text-slate-400')
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        <div className="flex flex-col pr-8">
                          {isCustom ? (
                            <>
                              <div>MRP: Rs {customPrice.mrp || 0}</div>
                              <div className="font-semibold">Price: Rs {customPrice.sellingPrice || 0}</div>
                            </>
                          ) : (
                            <div className="italic text-slate-350 dark:text-slate-600">Standard Base</div>
                          )}
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 rounded p-1">
                          <button
                            onClick={() => handleEditChannelPrice(item, pb.id, isCustom ? customPrice.mrp : item.baseMrp, isCustom ? customPrice.sellingPrice : item.basePrice)}
                            className="text-slate-500 hover:text-green-600 dark:hover:text-green-400 p-0.5"
                            title={`Edit ${pb.name} Price`}
                          >
                            <Edit3 size={14} />
                          </button>
                          {isCustom && (
                            <button
                              onClick={() => handleDeleteChannelPrice(customPrice.id)}
                              className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-0.5"
                              title="Reset to Catalog Base Price"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                    <button
                      onClick={() => {
                        const product = products.find(p => p.id === item.id);
                        if (product) handleOpenHistory(product);
                      }}
                      className="text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 transition-all flex items-center gap-1 text-xs font-semibold"
                      title="View Price History"
                    >
                      <History size={14} />
                      History
                    </button>
                    <button
                      onClick={() => {
                        const product = products.find(p => p.id === item.id);
                        if (product) {
                          handleOpenAssign(product);
                          if (item.productVariantId) {
                            setSelectedVariantId(item.productVariantId);
                            setMrp(item.baseMrp?.toString() || "");
                            setSellingPrice(item.basePrice?.toString() || "");
                          }
                        }
                      }}
                      className="text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-all flex items-center gap-1 text-xs font-semibold"
                      title="Assign Price"
                    >
                      <DollarSign size={14} />
                      Assign
                    </button>
                    <button
                      onClick={() => handleDeleteRowPrices(item.id, item.productVariantId)}
                      className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
                      title="Delete all custom prices for this row"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredComparison.length === 0 && (
                <tr>
                  <td colSpan={4 + priceBooks.length} className="text-center py-10 text-slate-400">
                    No products found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign Price Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Assign Channel Price</h2>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignPrice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Select Product
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-green-600"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku || "No SKU"})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const selectedProd = products.find((p) => p.id === productId);
                if (selectedProd && selectedProd.variants && selectedProd.variants.length > 0) {
                  return (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                        Select Variant
                      </label>
                      <select
                        value={selectedVariantId}
                        onChange={(e) => {
                          const varId = e.target.value;
                          setSelectedVariantId(varId);
                          const variant = selectedProd.variants?.find((v) => v.id === varId);
                          if (variant) {
                            setMrp(variant.mrp?.toString() || "");
                            setSellingPrice(variant.sellingPrice?.toString() || "");
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-green-600"
                      >
                        {selectedProd.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.variantName} ({v.sku || "No SKU"})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  SKU Code
                </label>
                <input
                  type="text"
                  value={(() => {
                    const selectedProd = products.find((p) => p.id === productId);
                    if (selectedProd) {
                      if (selectedProd.variants && selectedProd.variants.length > 0) {
                        const variant = selectedProd.variants.find((v) => v.id === selectedVariantId);
                        return variant?.sku || "No SKU";
                      }
                      return selectedProd.sku || "No SKU";
                    }
                    return "";
                  })()}
                  readOnly
                  className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Select Price Book (Channel)
                </label>
                <select
                  value={priceBookId}
                  onChange={(e) => setPriceBookId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-green-600"
                  required
                >
                  {priceBooks.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name} ({pb.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    MRP (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Selling Price (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Effective From
                  </label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Effective To
                  </label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                    placeholder="Indefinite"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
                >
                  Assign Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Bulk Upload Prices</h2>
              <button onClick={() => setBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleBulkUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Paste JSON Array
                </label>
                <textarea
                  rows={10}
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-green-600"
                  placeholder={`[\n  {\n    "productId": "product-uuid-here",\n    "priceBookId": "price-book-uuid-here",\n    "mrp": 100,\n    "sellingPrice": 85,\n    "effectiveFrom": "2026-06-25T00:00:00Z"\n  }\n]`}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
                >
                  Process Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Price History: {selectedProduct?.name}
              </h2>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[500px]">
              {historyLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : priceHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No channel pricing history found for this product.
                </div>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-slate-700 ml-4 space-y-6">
                  {priceHistory.map((item) => (
                    <div key={item.id} className="relative pl-6">
                      <div className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full bg-green-500 border border-white dark:border-slate-800"></div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/80">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            {item.priceBook.name} ({item.priceBook.code})
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(item.effectiveFrom).toLocaleDateString()} to{" "}
                            {item.effectiveTo ? new Date(item.effectiveTo).toLocaleDateString() : "Present"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                          <div>
                            <span className="text-slate-400">MRP: </span>
                            <span className="font-semibold">Rs {item.mrp}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Selling Price: </span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              Rs {item.sellingPrice}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
