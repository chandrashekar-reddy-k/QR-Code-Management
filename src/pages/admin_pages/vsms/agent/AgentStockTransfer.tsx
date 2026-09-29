// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Package, Loader2, Search, Plus, Minus, X,
  Truck, Send, Clock, CheckCircle2, XCircle, ChevronDown, Trash2
} from "lucide-react";
import { agentTransferAPI, productsAPI } from "../services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AgentStockTransfer() {
  const navigate = useNavigate();

  const [activeAgents, setActiveAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Map of productId -> quantity to transfer
  const [transferItems, setTransferItems] = useState({});
  const [transferRemarks, setTransferRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [view, setView] = useState("form");
  const [myTransfers, setMyTransfers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const agentDropdownRef = useRef(null);
  const itemDropdownRef = useRef(null);

  useEffect(() => {
    loadInventory();
    loadAgents();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target)) {
        setShowAgentDropdown(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await agentTransferAPI.getActiveAgents();
      const raw = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setActiveAgents(Array.isArray(raw) ? raw : []);
    } catch {
      toast.error("Could not load agents");
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadInventory = async () => {
    setLoadingInventory(true);
    try {
      const res = await productsAPI.getVehicleInventory('me');
      const raw = Array.isArray(res.data) ? res.data : (res.data?.stock || res.data?.data || []);
      setInventory(Array.isArray(raw) ? raw.filter(i => Number(i.quantity) > 0) : []);
    } catch {
      toast.error("Could not load your stock");
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await agentTransferAPI.getTransfers({ myTransfers: "true" });
      setMyTransfers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch {
      toast.error("Could not load transfer history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddItem = (item) => {
    const pid = item.productId || item.product?.id || item.id;
    const available = Number(item.quantity ?? 0);
    const currentQty = transferItems[pid] || 0;

    if (currentQty >= available) {
      toast.error(`Maximum available stock is ${available}`);
      return;
    }

    setTransferItems(prev => ({
      ...prev,
      [pid]: (prev[pid] || 0) + 1
    }));
    setShowItemDropdown(false);
    setItemSearch("");
  };

  const handleUpdateQty = (pid, newQty, maxQty) => {
    if (newQty <= 0) {
      handleRemoveItem(pid);
      return;
    }
    if (newQty > maxQty) {
      toast.error(`Maximum available: ${maxQty}`);
      return;
    }
    setTransferItems(prev => ({
      ...prev,
      [pid]: newQty
    }));
  };

  const handleRemoveItem = (pid) => {
    setTransferItems(prev => {
      const updated = { ...prev };
      delete updated[pid];
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!selectedAgent) {
      toast.error("Please select a destination agent");
      return;
    }
    const items = Object.entries(transferItems)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (items.length === 0) {
      toast.error("Select at least one item to transfer");
      return;
    }
    setIsSubmitting(true);
    try {
      await agentTransferAPI.createTransfer({
        toUserId: selectedAgent.id,
        toVehicleId: selectedAgent.assignedVehicleId,
        remarks: transferRemarks.trim() || undefined,
        items,
      });
      toast.success("Transfer request sent! Awaiting partner approval.");
      setSelectedAgent(null);
      setTransferItems({});
      setTransferRemarks("");
      setAgentSearch("");
      setItemSearch("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send transfer request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAgents = activeAgents.filter(a =>
    (a.name || "").toLowerCase().includes(agentSearch.toLowerCase()) ||
    (a.assignedVehicle?.vehicleNumber || "").toLowerCase().includes(agentSearch.toLowerCase()) ||
    (a.phone || "").includes(agentSearch)
  );

  const filteredInventory = inventory.filter(item => {
    const name = item.product?.name || item.name || "";
    const sku = item.product?.sku || item.sku || "";
    const query = itemSearch.toLowerCase();
    return name.toLowerCase().includes(query) || sku.toLowerCase().includes(query);
  });

  // Selected items with metadata
  const selectedItemsList = Object.entries(transferItems)
    .filter(([, qty]) => qty > 0)
    .map(([pid, qty]) => {
      const item = inventory.find(i => (i.productId || i.product?.id || i.id) === pid);
      return {
        productId: pid,
        quantity: qty,
        item,
        name: item?.product?.name || item?.name || "Product",
        availableQty: Number(item?.quantity ?? 0),
        image: item?.product?.images?.[0] || item?.product?.image || null,
        unit: item?.product?.unit?.name || item?.product?.unit || item?.unit || "Unit"
      };
    });

  const qtySelected = selectedItemsList.length;
  const totalUnits = selectedItemsList.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen pb-36 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[440px] mx-auto px-4 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-2.5 pt-1">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-900 cursor-pointer">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Stock Transfer</h1>
            <p className="text-[10px] font-medium text-gray-400">Transfer items to another field agent</p>
          </div>
          <button
            onClick={() => {
              const next = view === "form" ? "history" : "form";
              setView(next);
              if (next === "history") loadHistory();
            }}
            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 cursor-pointer whitespace-nowrap"
          >
            {view === "form" ? "My Transfers" : "+ New Transfer"}
          </button>
        </div>

        {view === "history" ? (
          <div className="space-y-3">
            {loadingHistory ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
            ) : myTransfers.length === 0 ? (
              <div className="p-10 bg-white rounded-3xl border border-gray-100 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                  <Truck size={24} className="text-blue-400" />
                </div>
                <p className="text-sm font-black text-gray-800">No Transfers Yet</p>
                <p className="text-xs font-medium text-gray-400">Transfers you initiate will appear here.</p>
              </div>
            ) : myTransfers.map(t => {
              const isApproved = t.status === "APPROVED";
              const isRejected = t.status === "REJECTED";
              return (
                <div key={t.id} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isApproved ? "bg-emerald-50 text-emerald-600" : isRejected ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                        <Truck size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-900 truncate">To: {t.toUser?.name || "Agent"}</p>
                        <p className="text-[10px] font-medium text-gray-400">{t.toVehicle?.vehicleNumber || ""}</p>
                        <p className="text-[9px] font-semibold text-gray-400 mt-0.5">
                          {t.createdAt ? format(new Date(t.createdAt), "dd MMM yyyy • hh:mm a") : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${isApproved ? "text-emerald-600 bg-emerald-50 border-emerald-200" : isRejected ? "text-red-500 bg-red-50 border-red-200" : "text-amber-600 bg-amber-50 border-amber-200"}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(t.items || []).slice(0, 5).map((item, idx) => (
                      <span key={idx} className="text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                        {item.product?.name || "Item"} x {item.quantity}
                      </span>
                    ))}
                    {(t.items || []).length > 5 && <span className="text-[10px] font-bold text-gray-400">+{(t.items || []).length - 5} more</span>}
                  </div>
                  {t.remarks && <p className="text-[10px] text-gray-400 italic">"{t.remarks}"</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Step 1: Destination Agent Dropdown */}
            <div className="space-y-2" ref={agentDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-900">1. Select Destination Agent</label>
                {selectedAgent && (
                  <button
                    onClick={() => { setSelectedAgent(null); setShowAgentDropdown(true); }}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>

              {selectedAgent ? (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      {(selectedAgent.name || "A").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-blue-950">{selectedAgent.name}</p>
                      <p className="text-[10px] font-semibold text-blue-700">
                        {selectedAgent.assignedVehicle?.vehicleNumber || "Vehicle"} • {selectedAgent.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="w-7 h-7 rounded-lg bg-blue-100 hover:bg-red-100 text-blue-600 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div
                    onClick={() => setShowAgentDropdown(true)}
                    className="bg-white rounded-2xl p-3 px-3.5 border border-gray-200 shadow-xs flex items-center gap-2.5 cursor-text focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                  >
                    <Search size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search destination agent by name, phone or vehicle..."
                      value={agentSearch}
                      onChange={e => {
                        setAgentSearch(e.target.value);
                        setShowAgentDropdown(true);
                      }}
                      onFocus={() => setShowAgentDropdown(true)}
                      className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                    />
                    {loadingAgents ? (
                      <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={15} className="text-gray-400 shrink-0 cursor-pointer" onClick={() => setShowAgentDropdown(prev => !prev)} />
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {showAgentDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-30 max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                      {filteredAgents.length === 0 ? (
                        <div className="p-4 text-center text-xs font-semibold text-gray-400">
                          {loadingAgents ? "Loading agents..." : "No matching agents found"}
                        </div>
                      ) : (
                        filteredAgents.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setAgentSearch("");
                              setShowAgentDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50/70 transition-colors flex items-center gap-3 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-black text-xs">
                              {(agent.name || "A").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold text-gray-900 truncate">{agent.name}</p>
                              <p className="text-[10px] font-medium text-gray-500 truncate">
                                {agent.assignedVehicle?.vehicleNumber ? `🚗 ${agent.assignedVehicle.vehicleNumber}` : "No Vehicle"} • {agent.phone}
                              </p>
                            </div>
                            <Truck size={13} className="text-gray-300 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Item Selection Dropdown & Selected Items */}
            <div className="space-y-2.5" ref={itemDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-900">2. Select Items to Transfer</label>
                {inventory.length > 0 && (
                  <span className="text-[10px] font-bold text-gray-400">
                    {inventory.length} items in vehicle
                  </span>
                )}
              </div>

              {/* Searchable Item Dropdown Input */}
              <div className="relative">
                <div
                  onClick={() => setShowItemDropdown(true)}
                  className="bg-white rounded-2xl p-3 px-3.5 border border-gray-200 shadow-xs flex items-center gap-2.5 cursor-text focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                >
                  <Search size={15} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search & select items from vehicle stock..."
                    value={itemSearch}
                    onChange={e => {
                      setItemSearch(e.target.value);
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  {loadingInventory ? (
                    <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-gray-400 shrink-0 cursor-pointer" onClick={() => setShowItemDropdown(prev => !prev)} />
                  )}
                </div>

                {/* Items Dropdown Menu */}
                {showItemDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-30 max-h-60 overflow-y-auto divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                    {loadingInventory ? (
                      <div className="p-4 text-center text-xs font-semibold text-gray-400">Loading inventory...</div>
                    ) : filteredInventory.length === 0 ? (
                      <div className="p-4 text-center text-xs font-semibold text-gray-400">
                        {inventory.length === 0 ? "No available stock in your vehicle" : "No matching items found"}
                      </div>
                    ) : (
                      filteredInventory.map(item => {
                        const pid = item.productId || item.product?.id || item.id;
                        const name = item.product?.name || item.name || "Product";
                        const available = Number(item.quantity ?? 0);
                        const addedQty = transferItems[pid] || 0;
                        const isAdded = addedQty > 0;
                        const prodImg = item.product?.images?.[0] || item.product?.image || null;

                        return (
                          <button
                            key={pid}
                            onClick={() => handleAddItem(item)}
                            className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 cursor-pointer ${
                              isAdded ? "bg-blue-50/40 hover:bg-blue-50/70" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {prodImg ? (
                                <img src={prodImg} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={16} className="text-gray-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold text-gray-900 truncate">{name}</p>
                              <p className="text-[10px] font-semibold text-gray-400">
                                Stock: <span className="text-gray-700 font-bold">{available}</span>
                              </p>
                            </div>
                            {isAdded ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700">
                                {addedQty} added
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors">
                                + Add
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected Items List */}
              {selectedItemsList.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Selected Items ({selectedItemsList.length})
                    </p>
                    <button
                      onClick={() => setTransferItems({})}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedItemsList.map(({ productId, quantity, name, availableQty, image }) => (
                      <div
                        key={productId}
                        className="bg-white rounded-2xl p-3 border border-blue-200/80 shadow-xs flex items-center gap-3 bg-gradient-to-r from-white via-white to-blue-50/20"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-gray-900 truncate">{name}</p>
                          <p className="text-[10px] font-semibold text-gray-400">
                            Available: <span className="text-gray-600 font-bold">{availableQty}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Stepper */}
                          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-0.5">
                            <button
                              onClick={() => handleUpdateQty(productId, quantity - 1, availableQty)}
                              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded-lg active:scale-90 transition-all cursor-pointer"
                            >
                              <Minus size={12} strokeWidth={2.5} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={availableQty}
                              value={quantity}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleUpdateQty(productId, val, availableQty);
                                }
                              }}
                              className="w-9 text-center bg-transparent text-xs font-black text-gray-900 outline-none"
                            />
                            <button
                              onClick={() => handleUpdateQty(productId, quantity + 1, availableQty)}
                              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded-lg active:scale-90 transition-all cursor-pointer"
                            >
                              <Plus size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                          {/* Delete Item */}
                          <button
                            onClick={() => handleRemoveItem(productId)}
                            className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-white rounded-2xl border border-dashed border-gray-200 text-center space-y-1">
                  <Package size={22} className="mx-auto text-gray-300" />
                  <p className="text-xs font-bold text-gray-600">No items added yet</p>
                  <p className="text-[10px] text-gray-400">Search and pick items from the dropdown above</p>
                </div>
              )}
            </div>

            {/* Step 3: Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">3. Remarks (optional)</label>
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                  placeholder="Add a reason or note for this transfer..."
                  value={transferRemarks}
                  onChange={e => setTransferRemarks(e.target.value)}
                  rows={2}
                  className="w-full text-xs font-semibold text-gray-800 placeholder:text-gray-400 bg-transparent border-none outline-none resize-none"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2 pb-8 space-y-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedAgent || qtySelected === 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Sending Transfer Request...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>
                      {selectedAgent && qtySelected > 0
                        ? `Send Transfer Request (${qtySelected} Items • ${totalUnits} Units)`
                        : "Send Transfer Request"}
                    </span>
                  </>
                )}
              </button>
              <p className="text-center text-[10px] font-semibold text-gray-400">
                Transfers require partner approval before stock is moved
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

