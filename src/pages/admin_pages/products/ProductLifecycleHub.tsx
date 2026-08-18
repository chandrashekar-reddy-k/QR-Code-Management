import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Warehouse, 
  Boxes, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Search, 
  Layers,
  Check
} from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { toast } from 'react-toastify';
import fetchData from '../../../helper';

export type LifecycleStage = 'STORE_ROOM' | 'IN_PRODUCTION' | 'READY_FOR_LIVE' | 'LIVE';

interface LifecycleProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unitType: string;
  price: number;
  stock: number;
  image?: string;
  status: string;
  lifecycleStage: LifecycleStage;
  stageNotes?: string;
  updatedAt: string;
}

export default function ProductLifecycleHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as LifecycleStage) || 'STORE_ROOM';
  const [activeTab, setActiveTab] = useState<LifecycleStage>(tabParam);

  useEffect(() => {
    const tab = searchParams.get('tab') as LifecycleStage;
    if (tab && ['STORE_ROOM', 'IN_PRODUCTION', 'READY_FOR_LIVE', 'LIVE'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (stage: LifecycleStage) => {
    setActiveTab(stage);
    setSearchParams({ tab: stage });
  };
  const [products, setProducts] = useState<LifecycleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<LifecycleProduct | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<LifecycleStage>('IN_PRODUCTION');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [channelOnline, setChannelOnline] = useState(true);
  const [channelPos, setChannelPos] = useState(true);
  const [channelVehicle, setChannelVehicle] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stageCounts, setStageCounts] = useState<Record<LifecycleStage, number>>({
    STORE_ROOM: 0,
    IN_PRODUCTION: 0,
    READY_FOR_LIVE: 0,
    LIVE: 0
  });

  const loadLifecycleData = async () => {
    setIsLoading(true);
    try {
      const summaryRes = await fetchData<{ status: boolean; data: { stage: string; count: number }[] }>('productmanagement/product/lifecycle/summary', 'GET')
        .catch(() => fetchData<{ status: boolean; data: { stage: string; count: number }[] }>('product/lifecycle/summary', 'GET'));
      if (summaryRes?.data && Array.isArray(summaryRes.data)) {
        const counts: Record<LifecycleStage, number> = {
          STORE_ROOM: 0,
          IN_PRODUCTION: 0,
          READY_FOR_LIVE: 0,
          LIVE: 0
        };
        summaryRes.data.forEach(item => {
          if (counts[item.stage as LifecycleStage] !== undefined) {
            counts[item.stage as LifecycleStage] = Number(item.count) || 0;
          }
        });
        setStageCounts(counts);
      }

      const listRes = await fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('productmanagement/product?limit=100', 'GET')
        .catch(() => fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('product/getProducts?limit=100', 'GET'));
      const rawProducts = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data as any)?.products || [];
      
      const mapped: LifecycleProduct[] = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || 'N/A',
        unit: p.unit || 'Pack',
        unitType: p.unitType || 'Pack',
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
        status: p.status || 'APPROVED',
        lifecycleStage: (p.lifecycleStage as LifecycleStage) || 'STORE_ROOM',
        stageNotes: p.stageNotes || '',
        updatedAt: p.updatedAt || new Date().toISOString()
      }));

      setProducts(mapped);
    } catch (err: any) {
      console.error('Failed to load lifecycle items in partner portal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLifecycleData();
  }, []);

  const handleOpenTransition = (product: LifecycleProduct, defaultTarget: LifecycleStage) => {
    setSelectedProduct(product);
    setTargetStage(defaultTarget);
    setTransitionNotes('');
    setChannelOnline(true);
    setChannelPos(true);
    setChannelVehicle(true);
    setIsTransitionModalOpen(true);
  };

  const handleConfirmTransition = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await fetchData(`productmanagement/product/${selectedProduct.id}/lifecycle`, 'POST', {
        stage: targetStage,
        notes: transitionNotes,
        isOnline: channelOnline,
        isPos: channelPos,
        isVehicle: channelVehicle
      }).catch(() => fetchData(`product/${selectedProduct.id}/lifecycle`, 'POST', {
        stage: targetStage,
        notes: transitionNotes,
        isOnline: channelOnline,
        isPos: channelPos,
        isVehicle: channelVehicle
      }));
      toast.success(`Product moved to ${targetStage.replace(/_/g, ' ')}`);
      setIsTransitionModalOpen(false);
      loadLifecycleData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update lifecycle stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesStage = (p.lifecycleStage || 'STORE_ROOM') === activeTab;
    const matchesSearch = !search.trim() || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="w-full px-2 sm:px-4 py-4 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <Layers className="text-green-600 dark:text-green-400" size={26} />
            Store-Room, Production & Live Stock Hub
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track and manage physical stock flow from Inwarding &rarr; Processing/Packing &rarr; Live Channels
          </p>
        </div>
        <button
          onClick={loadLifecycleData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <Breadcrumbs />

      {/* Lifecycle Stage Nav Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleTabChange('STORE_ROOM')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start justify-between cursor-pointer ${
            activeTab === 'STORE_ROOM'
              ? 'bg-amber-500/10 border-amber-500 dark:border-amber-400 text-amber-900 dark:text-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
              <Warehouse size={18} className="text-amber-500" />
              <span>1. Store-Room (Inwarding)</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Bulk raw goods received after Admin approval
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200">
            {stageCounts.STORE_ROOM || 0} items
          </span>
        </button>

        <button
          onClick={() => handleTabChange('IN_PRODUCTION')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start justify-between cursor-pointer ${
            activeTab === 'IN_PRODUCTION'
              ? 'bg-blue-500/10 border-blue-500 dark:border-blue-400 text-blue-900 dark:text-blue-300 ring-2 ring-blue-400/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
              <Boxes size={18} className="text-blue-500" />
              <span>2. Production & Packing</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Grading, cleaning, packaging & quality check
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200">
            {stageCounts.IN_PRODUCTION || 0} items
          </span>
        </button>

        <button
          onClick={() => handleTabChange('LIVE')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start justify-between cursor-pointer ${
            activeTab === 'LIVE'
              ? 'bg-emerald-500/10 border-emerald-500 dark:border-emerald-400 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>3. Live Stock (Channels)</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live in Consumer App, POS billing, & Van stock
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
            {stageCounts.LIVE || 0} items
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredProducts.length}</span> products in current view
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <th className="px-4 py-3.5 text-center">Image</th>
                <th className="px-4 py-3.5">Product Info</th>
                <th className="px-4 py-3.5">Unit / Spec</th>
                <th className="px-4 py-3.5 text-right">Price</th>
                <th className="px-4 py-3.5 text-center">Current Stage</th>
                <th className="px-4 py-3.5 text-center">Available Channels</th>
                <th className="px-4 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs sm:text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} /> Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No products found in this stage.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg mx-auto border border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto text-gray-400 text-[10px]">
                          No img
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {item.unit} <span className="text-gray-400 text-[11px]">({item.unitType})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                        activeTab === 'STORE_ROOM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                          : activeTab === 'IN_PRODUCTION'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                      }`}>
                        {activeTab.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {activeTab === 'LIVE' ? (
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <span title="Consumer App">📱 App</span> • 
                          <span title="Van Stock">🚚 Van</span> • 
                          <span title="POS Counter">🛒 POS</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">
                          Withheld in {activeTab === 'STORE_ROOM' ? 'Store-Room' : 'Production'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {activeTab === 'STORE_ROOM' && (
                        <button
                          onClick={() => handleOpenTransition(item, 'IN_PRODUCTION')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        >
                          <span>Move to Packing</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                      {activeTab === 'IN_PRODUCTION' && (
                        <button
                          onClick={() => handleOpenTransition(item, 'LIVE')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        >
                          <Check size={13} />
                          <span>Release to Live</span>
                        </button>
                      )}
                      {activeTab === 'LIVE' && (
                        <button
                          onClick={() => handleOpenTransition(item, 'STORE_ROOM')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          <span>Recall to Store</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transition Modal */}
      {isTransitionModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ArrowRight className="text-green-600" size={18} />
              Transition Stock Stage
            </h3>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-gray-800 dark:text-gray-200">{selectedProduct.name}</div>
              <div className="text-gray-500">SKU: {selectedProduct.sku}</div>
              <div className="text-gray-500">Current Stage: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedProduct.lifecycleStage.replace(/_/g, ' ')}</span></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Target Stage</label>
              <select
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value as LifecycleStage)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
              >
                <option value="STORE_ROOM">Store-Room (Inwarding / Bulk)</option>
                <option value="IN_PRODUCTION">Production (Packing / Processing)</option>
                <option value="LIVE">Live Channels (Consumer, Van & POS)</option>
              </select>
            </div>

            {targetStage === 'LIVE' && (
              <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2.5">
                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                  Select Live Release Channels
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelOnline}
                      onChange={(e) => setChannelOnline(e.target.checked)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span><strong>Customer Portal / Online App:</strong> Show in consumer product catalog & online store</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelPos}
                      onChange={(e) => setChannelPos(e.target.checked)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span><strong>POS Section:</strong> Show in retail point-of-sale checkout billing</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelVehicle}
                      onChange={(e) => setChannelVehicle(e.target.checked)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span><strong>Vehicle Stock:</strong> Enable allocation to delivery vans</span>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Stage Notes / Batch Details (Optional)</label>
              <textarea
                rows={3}
                placeholder="e.g. Packing completed, Batch #204 passed QA inspection."
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsTransitionModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                <span>Confirm Move</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
