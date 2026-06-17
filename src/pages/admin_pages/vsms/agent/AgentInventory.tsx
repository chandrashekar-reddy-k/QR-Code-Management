// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, Search, Plus, Minus, X, History, Calendar, User, Info, ChevronDown, ChevronUp, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type TabType = 'stock' | 'history' | 'refills';

const statusConfig = {
  PENDING:  { label: 'Pending',  icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  APPROVED: { label: 'Approved', icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  REJECTED: { label: 'Rejected', icon: XCircle,        color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  PARTIAL:  { label: 'Partial',  icon: AlertCircle,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
};

export default function AgentInventory() {
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [inventory, setInventory] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [refillHistory, setRefillHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFreeOnly] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [refillItems, setRefillItems] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refillSearchQuery, setRefillSearchQuery] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [expandedRefillId, setExpandedRefillId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { vehicleId: urlVehicleId } = useParams<{ vehicleId: string }>();
  const [vehicleId, setVehicleId] = useState<string | null>(urlVehicleId || null);

  useEffect(() => {
    const resolveVehicleId = async () => {
      if (!urlVehicleId || urlVehicleId === 'undefined' || urlVehicleId === 'null') {
        try {
          const { getCoverageStatus } = await import('../services/routeService');
          const status = await getCoverageStatus();
          if (status?.today?.routeId || status?.vehicleAssigned) {
            const profile = await productsAPI.getVehicleInventory('me').catch(() => null);
            setVehicleId('me');
          } else {
            setLoading(false);
          }
        } catch (err) {
          setLoading(false);
        }
      } else {
        setVehicleId(urlVehicleId);
      }
    };
    resolveVehicleId();
  }, [urlVehicleId]);

  useEffect(() => {
    if (vehicleId && vehicleId !== 'undefined' && vehicleId !== 'null') {
      if (activeTab === 'stock') fetchInventory();
      else if (activeTab === 'history') fetchAuditHistory();
      else if (activeTab === 'refills') fetchRefillHistory();
    } else if (activeTab === 'refills') {
      // refill history doesn't need vehicleId
      fetchRefillHistory();
    }
  }, [vehicleId, activeTab]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getVehicleInventory(vehicleId);
      setInventory(data);
    } catch { toast.error('Failed to load vehicle inventory'); }
    finally { setLoading(false); }
  };

  const fetchAuditHistory = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getAuditHistory(vehicleId);
      setAuditHistory(data);
    } catch { toast.error('Failed to load audit history'); }
    finally { setLoading(false); }
  };

  const fetchRefillHistory = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getMyRefills();
      setRefillHistory(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load refill history'); }
    finally { setLoading(false); }
  };

  const fetchAllProductsForRefill = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getAll({ showAll: true });
      setAllProducts(data);
      setShowRefillModal(true);
    } catch { toast.error('Failed to load products for refill'); }
    finally { setLoading(false); }
  };

  const handleRefillSubmit = async () => {
    const items = Object.entries(refillItems).filter(([_, qty]) => qty > 0).map(([id, qty]) => ({ productId: id, quantity: qty }));
    if (items.length === 0) return toast.error('Please add quantities to request a refill');
    try {
      setIsSubmitting(true);
      await productsAPI.requestRefill({ vehicleId, items });
      toast.success('Refill requested successfully!');
      setShowRefillModal(false);
      setRefillItems({});
      // Refresh refill history if on that tab
      if (activeTab === 'refills') fetchRefillHistory();
    } catch { toast.error('Failed to submit refill request'); }
    finally { setIsSubmitting(false); }
  };

  const refillToInitial = async () => {
    try {
      setLoading(true);
      if (allProducts.length === 0) {
        const { data } = await productsAPI.getAll({ showAll: true });
        setAllProducts(data);
      }

      const newRefillItems: Record<string, number> = {};
      let hasItemsToRefill = false;

      inventory.forEach(item => {
        const targetCapacity = Math.max(item.openingQuantity || 0, item.quantity);
        const diff = targetCapacity - item.quantity;
        if (diff > 0) {
          newRefillItems[item.product?.id || item.productId] = diff;
          hasItemsToRefill = true;
        }
      });

      if (!hasItemsToRefill) {
        toast.error('Inventory is already at full capacity');
        return;
      }

      setRefillItems(newRefillItems);
      setShowRefillModal(true);
    } catch {
      toast.error('Failed to prepare refill');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFree = !filterFreeOnly || item.product?.isFree;
    return matchesSearch && matchesFree;
  });

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'stock',   label: 'Stock',   icon: Package },
    { key: 'history', label: 'Audits',  icon: History },
    { key: 'refills', label: 'Refills', icon: RefreshCw },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 px-5 pt-3 pb-3 flex flex-col gap-3 bg-white border-b border-gray-100 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl hover:bg-emerald-50 bg-white shadow-sm border border-emerald-100 text-emerald-700">
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-black text-emerald-950 tracking-tight">Inventory</h1>
          </div>
          {activeTab === 'stock' && (
            <div className="flex items-center gap-2">
              <button
                onClick={refillToInitial}
                className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-xl font-black text-xs flex items-center gap-2 shadow-sm border border-emerald-100"
              >
                <Package size={16} /> Original
              </button>
              <button
                onClick={fetchAllProductsForRefill}
                className="px-3 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded-xl font-black text-xs flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Custom
              </button>
            </div>
          )}
          {activeTab === 'refills' && (
            <button onClick={fetchRefillHistory} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100">
              <RefreshCw size={18} />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center gap-3 bg-white border border-emerald-100 p-2 rounded-2xl shadow-sm">
            <div className="bg-emerald-50 p-1.5 rounded-xl text-emerald-500"><Search size={18} strokeWidth={2.5} /></div>
            <input type="text" placeholder="Search items..." className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold text-emerald-950 placeholder-emerald-950/30"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-sm font-black text-emerald-900/40 uppercase tracking-widest">Loading...</p>
          </div>
        ) : activeTab === 'stock' ? (
          (!vehicleId || vehicleId === 'undefined') ? (
            <div className="bg-white rounded-[2rem] p-10 flex flex-col items-center text-center border border-rose-50">
              <X size={48} className="text-rose-300 mb-4" />
              <p className="text-sm font-black text-rose-900 uppercase tracking-widest">No Vehicle Assigned</p>
              <p className="text-[10px] font-bold text-rose-600 mt-2">Please assign a vehicle to this agent profile.</p>
            </div>
          ) : (
            <>
              {filteredInventory.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-10 flex flex-col items-center text-center border opacity-60">
                  <Package size={48} className="text-emerald-300 mb-4" />
                  <p className="text-sm font-black text-emerald-900 uppercase tracking-widest">No Items Found</p>
                </div>
              ) : (
                <>
                  {/* Value Card */}
                  <div className="bg-emerald-600 rounded-[2rem] p-6 shadow-xl shadow-emerald-600/20 relative overflow-hidden">
                    <div className="flex justify-between items-center text-white">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Inventory Value</p>
                        <p className="text-3xl font-black tracking-tighter">
                          ₹{filteredInventory.reduce((acc, item) => acc + (item.quantity * (item.product?.price || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-2xl"><Package size={28} strokeWidth={2.5} /></div>
                    </div>
                  </div>

                  {/* Inventory List */}
                  <div className="space-y-3">
                    {filteredInventory.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 border border-gray-100/50 hover:border-emerald-200 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 overflow-hidden border border-emerald-100/50 shrink-0">
                          {item.product?.image ? <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" /> : <Package size={20} strokeWidth={2} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black text-emerald-950 tracking-tight leading-tight mb-1 truncate">{item.product?.name}</h3>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100/30">
                            {item.product?.category?.name || 'Item'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 pl-4 border-l border-gray-100/50">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-0.5">Total</span>
                            <span className="text-xs font-black text-emerald-900/60">{Math.max(item.openingQuantity || 0, item.quantity)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-0.5">Rem</span>
                            <span className="text-lg font-black text-emerald-950 tracking-tighter leading-none">{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )
        ) : activeTab === 'history' ? (
          /* Audit History */
          <div className="space-y-4">
            {auditHistory.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-10 flex flex-col items-center text-center border opacity-60">
                <History size={48} className="text-slate-300 mb-4" />
                <p className="text-sm font-black text-slate-900 uppercase tracking-widest">No Audit History</p>
              </div>
            ) : (
              auditHistory.map((audit) => (
                <div key={audit.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div onClick={() => setExpandedAuditId(expandedAuditId === audit.id ? null : audit.id)}
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                        <History size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm ${audit.type === 'AUDIT' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : audit.type === 'LOAD' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                            {audit.type === 'AUDIT' ? 'Stock Audit' : audit.type === 'LOAD' ? 'Stock Loading' : 'Stock Refill'}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">
                          {format(new Date(audit.createdAt), 'do MMMM yyyy')}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <User size={10} className="text-slate-300" /> {audit.user?.name || 'Admin'}
                        </div>
                      </div>
                    </div>
                    {expandedAuditId === audit.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                  {expandedAuditId === audit.id && (
                    <div className="px-4 pb-4">
                      {audit.remark && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                          <Info size={14} className="text-slate-400 mt-0.5" />
                          <p className="text-xs font-bold text-slate-600 italic">"{audit.remark}"</p>
                        </div>
                      )}
                      <div className="space-y-1 border-t border-slate-100 pt-3">
                        {audit.items?.map((item: any) => {
                          const diff = (item.newQuantity || 0) - (item.oldQuantity || 0);
                          return (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-50/50 border border-slate-100/30">
                              <div className="col-span-6 flex flex-col min-w-0">
                                <span className="text-[11px] font-black text-slate-800 truncate leading-tight uppercase">{item.product?.name}</span>
                              </div>
                              <div className="col-span-2 text-center"><span className="text-[10px] font-bold text-slate-400">{item.oldQuantity}</span></div>
                              <div className="col-span-2 text-center"><span className="text-[10px] font-black text-emerald-600">{item.newQuantity}</span></div>
                              <div className="col-span-2 flex justify-end">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[8px] font-black border-2 shadow-sm shrink-0 ${diff === 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : diff > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-rose-50 text-rose-600 border-rose-500'}`}>
                                  {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : diff}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Refill History */
          <div className="space-y-4">
            {refillHistory.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-10 flex flex-col items-center text-center border opacity-60">
                <RefreshCw size={48} className="text-emerald-300 mb-4" />
                <p className="text-sm font-black text-emerald-900 uppercase tracking-widest">No Refill Requests Yet</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-2">Requests you submit will appear here.</p>
              </div>
            ) : (
              refillHistory.map((refill) => {
                const cfg = statusConfig[refill.status] || statusConfig.PENDING;
                const StatusIcon = cfg.icon;
                const isExpanded = expandedRefillId === refill.id;
                const totalItems = refill.items?.length || 0;
                const totalQty = refill.items?.reduce((s: number, i: any) => s + (i.requestedQuantity || i.quantity || 0), 0) || 0;

                return (
                  <div key={refill.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div
                      onClick={() => setExpandedRefillId(isExpanded ? null : refill.id)}
                      className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
                            <StatusIcon size={20} className={cfg.color} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                              {refill.vehicle?.vehicleNumber && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  {refill.vehicle.vehicleNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-black text-slate-900 tracking-tight leading-none">
                              {format(new Date(refill.createdAt), 'do MMM yyyy · h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs font-black text-emerald-950">{totalItems} items</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">qty {totalQty}</p>
                          </div>
                          {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                        {refill.items?.map((item: any) => {
                          const approved = item.approvedQuantity ?? null;
                          const requested = item.requestedQuantity || item.quantity || 0;
                          const productImg = item.product?.images?.[0];

                          return (
                            <div key={item.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                {productImg
                                  ? <img src={productImg} alt={item.product?.name} className="w-full h-full object-cover" />
                                  : <Package size={16} className="text-slate-300" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{item.product?.name || 'Product'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  {item.product?.unit} · ₹{item.product?.price}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Req</p>
                                  <p className="text-sm font-black text-slate-900">{requested}</p>
                                </div>
                                {approved !== null && (
                                  <>
                                    <div className="w-px h-8 bg-slate-200" />
                                    <div className="text-center">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Approved</p>
                                      <p className="text-sm font-black text-emerald-700">{approved}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {refill.remarks && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 mt-2">
                            <Info size={13} className="text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs font-bold text-amber-700 italic">"{refill.remarks}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Refill Modal */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-emerald-950">Request Refill</h2>
                  <p className="text-xs font-bold text-gray-500">Request stock from the warehouse.</p>
                </div>
                <button onClick={() => { setShowRefillModal(false); setRefillItems({}); }} className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white border border-emerald-100 p-2 rounded-xl shadow-sm">
                <div className="bg-emerald-50 p-1.5 rounded-xl text-emerald-500"><Search size={18} strokeWidth={2.5} /></div>
                <input type="text" placeholder="Search products..." className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold" value={refillSearchQuery} onChange={(e) => setRefillSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-y-auto p-5 space-y-3 flex-1">
              {allProducts.filter(p => p.name?.toLowerCase().includes(refillSearchQuery.toLowerCase())).map(p => {
                const currentStock = inventory.find(i => i.productId === p.id)?.quantity || 0;
                const reqQty = refillItems[p.id] || 0;
                return (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-300" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-800 truncate">{p.name}</span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded cursor-default border border-emerald-100 shrink-0 mt-1">
                          Current: {currentStock} · ₹{p.price}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <button onClick={() => setRefillItems(prev => ({ ...prev, [p.id]: Math.max(0, reqQty - 1) }))} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center font-black text-emerald-950 text-lg">{reqQty}</span>
                      <button onClick={() => setRefillItems(prev => ({ ...prev, [p.id]: reqQty + 1 }))} className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-gray-100 bg-white rounded-b-[2rem]">
              <button onClick={handleRefillSubmit} disabled={isSubmitting} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-700 flex justify-center items-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Submitting...</> : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
