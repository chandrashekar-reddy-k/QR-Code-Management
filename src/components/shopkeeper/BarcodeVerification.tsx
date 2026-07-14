import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, XCircle, ZapIcon, RefreshCw, ChevronRight, Scan, Package, ShieldAlert } from "lucide-react";
import api from "../../api/axios";
import { getSLAInfo } from "../../utils/slaHelper";

interface BarcodeVerificationProps {
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
  data?: any;
}

type ScanStatus = "Waiting" | "Verified" | "Mismatch";

export function BarcodeVerification({ onBack, onNavigate, data }: BarcodeVerificationProps) {
  const order = data || {};
  const initialItems = data.items || [];
  
  const [localItems, setLocalItems] = useState<any[]>(initialItems);
  const [currentItem, setCurrentItem] = useState<any>(data.currentItem || {});
  const [scannedQty, setScannedQty] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("Waiting");
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<any>(null);

  // Sync state if data changes
  useEffect(() => {
    if (data.items) setLocalItems(data.items);
    if (data.currentItem) {
      setCurrentItem(data.currentItem);
      setScannedQty(0);
      setScanStatus("Waiting");
      setScannedBarcode("");
    }
  }, [data]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    };
  }, [autoAdvanceTimer]);

  const requiredQty = currentItem.quantity || 1;
  const currentItemIndex = localItems.findIndex((item) => item.id === currentItem.id);
  const totalItems = localItems.length;
  const itemNumberDisplay = currentItemIndex >= 0 ? `${currentItemIndex + 1} of ${totalItems}` : `1 of ${totalItems}`;

  // SLA status
  const slaInfo = getSLAInfo(order);

  // Overall scan progress
  const totalPickedCount = localItems.filter((i) => i.is_picked || i.is_rejected).length;
  const percentProgress = totalItems > 0 ? Math.round((totalPickedCount / totalItems) * 100) : 0;

  const handleSimulateScan = async () => {
    if (scanStatus === "Verified") return;

    // Simulate scanning correct barcode
    const barcode = currentItem.barcode || "8901030726203";
    setScannedBarcode(barcode);

    const nextQty = scannedQty + 1;
    setScannedQty(nextQty);

    if (nextQty >= requiredQty) {
      setScanStatus("Verified");
      
      // Update local items immediately for progress bar
      const updatedItems = localItems.map((item) =>
        item.id === currentItem.id ? { ...item, is_picked: true, picked_qty: requiredQty } : item
      );
      setLocalItems(updatedItems);

      // Call API in background
      try {
        await api.put(`/orders/${order.id}/items/${currentItem.id}/pick`);
      } catch (err) {
        console.warn("Failed to mark picked via API:", err);
      }

      // Auto-advance after 1.5 seconds
      const timer = setTimeout(() => {
        // Find next unpicked/unrejected item
        const nextItem = updatedItems.find((item) => !item.is_picked && !item.is_rejected);
        if (nextItem) {
          setCurrentItem(nextItem);
          setScannedQty(0);
          setScanStatus("Waiting");
          setScannedBarcode("");
        } else {
          // All items verified! Navigate to completion screen
          onNavigate("picking-complete", { ...order, items: updatedItems });
        }
      }, 1500);
      setAutoAdvanceTimer(timer);
    } else {
      setScanStatus("Waiting");
    }
  };

  const handleSimulateMismatch = () => {
    setScannedBarcode("0000000000000");
    setScanStatus("Mismatch");
  };

  const handleResetScan = () => {
    setScanStatus("Waiting");
    setScannedBarcode("");
    setScannedQty(0);
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] text-gray-800" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
      {/* 1. Header & Navigation */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <nav className="text-xs text-gray-500 flex items-center gap-1 mb-2">
              <button onClick={() => onNavigate("dashboard")} className="hover:text-[#00891D] transition-colors">Home</button>
              <ChevronRight size={12} />
              <button onClick={() => onNavigate("picking-queue")} className="hover:text-[#00891D] transition-colors">Picking Queue</button>
              <ChevronRight size={12} />
              <button onClick={onBack} className="hover:text-[#00891D] transition-colors">Picking Screen</button>
              <ChevronRight size={12} />
              <span className="font-medium text-orange-600">Barcode Verification</span>
            </nav>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">
                Barcode Verification — Order #{order.order_number || "QC100245"}
              </h1>
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                slaInfo.status === 'breached' 
                  ? 'bg-red-50 text-red-700 border-red-100' 
                  : slaInfo.status === 'at_risk' 
                  ? 'bg-orange-50 text-orange-700 border-orange-100' 
                  : 'bg-green-50 text-green-700 border-green-100'
              }`}>
                SLA: {slaInfo.displayText}
              </span>
              {order.tray && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  Tray ID: {order.tray}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onBack}
            className="self-start md:self-auto flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Back to Order</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col gap-6">
        {/* 2. Progress Indicator Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Picking Progress</span>
            <span className="text-xs font-extrabold text-[#00891D]">{percentProgress}%</span>
          </div>
          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00891D] transition-all duration-500 rounded-full"
              style={{ width: `${percentProgress}%` }}
            />
          </div>
        </div>

        {/* 3. Main Dashboard Layout split panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Simulated camera frame and scan actions */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Scan size={14} className="text-[#00891D]" />
                Simulated Scanner Viewfinder
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                scanStatus === "Verified" 
                  ? "bg-green-50 text-green-700 border-green-200" 
                  : scanStatus === "Mismatch" 
                  ? "bg-red-50 text-red-700 border-red-200 animate-pulse" 
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}>
                {scanStatus}
              </span>
            </div>

            <div className="relative aspect-[4/3] bg-gray-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #131A26 0%, #1A2639 100%)", opacity: 0.95 }} />

              {/* Grid line overlay */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-white/20" style={{ left: `${(i + 1) * 16.6}%` }} />
                ))}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-b border-white/20" style={{ top: `${(i + 1) * 16.6}%` }} />
                ))}
              </div>

              {/* Scan Reticle */}
              <div className="relative w-56 h-36 border border-white/20 rounded-xl flex items-center justify-center">
                {/* Reticle corner markers */}
                {[
                  "top-0 left-0 border-t-4 border-l-4 rounded-tl-lg",
                  "top-0 right-0 border-t-4 border-r-4 rounded-tr-lg",
                  "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg",
                  "bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg",
                ].map((cls, i) => (
                  <div
                    key={i}
                    className={`absolute w-6 h-6 ${cls}`}
                    style={{ borderColor: scanStatus === "Verified" ? "#10B981" : scanStatus === "Mismatch" ? "#EF4444" : "#FFF" }}
                  />
                ))}

                {scanStatus === "Waiting" && (
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent" style={{ animation: "scanLine 2s linear infinite" }} />
                )}

                {scanStatus === "Verified" && (
                  <div className="bg-green-500/20 w-full h-full rounded-xl flex items-center justify-center animate-fade-in">
                    <CheckCircle size={48} className="text-[#10B981]" />
                  </div>
                )}

                {scanStatus === "Mismatch" && (
                  <div className="bg-red-500/20 w-full h-full rounded-xl flex items-center justify-center animate-fade-in">
                    <XCircle size={48} className="text-[#EF4444]" />
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Scan Buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
              {scanStatus === "Verified" ? (
                <div className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 bg-green-50 border border-green-200 text-green-700 font-bold text-sm shadow-sm">
                  <CheckCircle size={18} />
                  <span>Product Verified ✓</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleSimulateMismatch}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 border border-red-200 bg-white hover:bg-red-50/50 text-[#D32F2F] text-xs font-bold transition-all"
                  >
                    <XCircle size={15} />
                    <span>Mismatch</span>
                  </button>
                  <button
                    onClick={handleSimulateScan}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3 bg-[#00891D] hover:bg-[#006614] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <ZapIcon size={15} />
                    <span>Simulate Scan</span>
                  </button>
                </div>
              )}

              {(scanStatus !== "Waiting") && (
                <button
                  onClick={handleResetScan}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 text-xs font-semibold transition-all"
                >
                  <RefreshCw size={12} />
                  <span>Reset Scan</span>
                </button>
              )}
            </div>
          </div>

          {/* Right panel: Product Details and Status */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-[#00891D]" />
                  Active Product Info
                </span>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-md">
                  Item {itemNumberDisplay}
                </span>
              </div>

              <div className="p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Product Image */}
                <div className="w-28 h-28 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-5xl overflow-hidden flex-shrink-0">
                  {currentItem.image_url ? (
                    <img src={currentItem.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    "📦"
                  )}
                </div>

                {/* Details list */}
                <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900 truncate">{currentItem.name || "Unknown Product"}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">Barcode: {currentItem.barcode || "—"}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Required</p>
                      <p className="text-xl font-black text-gray-900 mt-1">×{requiredQty}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Scanned</p>
                      <p className="text-xl font-black text-[#00891D] mt-1">{scannedQty}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Remaining</p>
                      <p className="text-xl font-black text-orange-700 mt-1">{Math.max(0, requiredQty - scannedQty)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mismatch Alert Panel */}
            {scanStatus === "Mismatch" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 shadow-sm animate-shake">
                <ShieldAlert size={20} className="text-[#D32F2F] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-red-800 text-sm">Product Mismatch Warning!</h4>
                  <p className="text-red-700 text-xs mt-1">
                    The scanned barcode (<span className="font-mono font-bold">{scannedBarcode}</span>) does not match the expected barcode (<span className="font-mono font-bold">{currentItem.barcode}</span>). Please check the product and rescan.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 4px; }
          50% { top: 136px; }
          100% { top: 4px; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out 2;
        }
      `}</style>
    </div>
  );
}
