import { useState } from "react";
import { ArrowLeft, CheckCircle, XCircle, ZapIcon, RefreshCw } from "lucide-react";

interface BarcodeVerificationProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  data?: any;
}

type ScanState = "scanning" | "success" | "mismatch";

export function BarcodeVerification({ onBack, onNavigate, data }: BarcodeVerificationProps) {
  const [scanState, setScanState] = useState<ScanState>("scanning");

  const order = data || {};
  const currentItem = order.currentItem || {};

  const expectedProduct = { 
    name: currentItem.name || "Unknown Product", 
    barcode: currentItem.barcode || "8901030726203", 
    qty: currentItem.quantity || 1, 
    img: currentItem.image_url ? <img src={currentItem.image_url} alt="" className="w-10 h-10 object-cover rounded" /> : "📦" 
  };
  const mismatchProduct = { name: "Unknown Mismatch", barcode: "000000000000", img: "📦" };

  const handleSuccess = () => setScanState("success");
  const handleMismatch = () => setScanState("mismatch");
  const handleReset = () => setScanState("scanning");

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Barcode Scanner</h1>
          <p className="text-white/70" style={{ fontSize: "12px" }}>Order #{order.order_number || "QC100245"}</p>
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden" style={{ minHeight: "55vw" }}>
        {/* Simulated camera background */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", opacity: 0.9 }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 border-r border-white/30" style={{ left: `${(i + 1) * 12.5}%` }} />
          ))}
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute left-0 right-0 border-b border-white/30" style={{ top: `${(i + 1) * 8.33}%` }} />
          ))}
        </div>

        {/* Scanner Frame */}
        <div className="relative" style={{ width: "260px", height: "140px" }}>
          {/* Corner markers */}
          {[
            "top-0 left-0 border-t-4 border-l-4",
            "top-0 right-0 border-t-4 border-r-4",
            "bottom-0 left-0 border-b-4 border-l-4",
            "bottom-0 right-0 border-b-4 border-r-4",
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-8 h-8 ${cls}`}
              style={{ borderColor: scanState === "success" ? "#4CAF50" : scanState === "mismatch" ? "#D32F2F" : "#FFFFFF" }}
            />
          ))}

          {/* Scanning line animation */}
          {scanState === "scanning" && (
            <div className="absolute left-2 right-2" style={{ animation: "scanLine 2s linear infinite" }}>
              <div className="h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent" />
            </div>
          )}

          {/* Result overlay */}
          {scanState === "success" && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg">
              <CheckCircle size={48} color="#4CAF50" />
            </div>
          )}
          {scanState === "mismatch" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg">
              <XCircle size={48} color="#D32F2F" />
            </div>
          )}
        </div>

        <p className="absolute bottom-8 text-white/70 text-center" style={{ fontSize: "13px" }}>
          {scanState === "scanning" ? "Align barcode within the frame" : ""}
        </p>
      </div>

      {/* Bottom Panel */}
      <div className="bg-white rounded-t-3xl p-4 pb-8">
        {/* Expected Product */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-4">
          <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center" style={{ fontSize: "32px" }}>
            {expectedProduct.img}
          </div>
          <div className="flex-1">
            <p className="text-gray-500 mb-0.5" style={{ fontSize: "11px" }}>EXPECTED PRODUCT</p>
            <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "14px" }}>{expectedProduct.name}</p>
            <p className="text-gray-400" style={{ fontSize: "11px", fontFamily: "monospace" }}>{expectedProduct.barcode}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500" style={{ fontSize: "11px" }}>Required</p>
            <p className="text-green-700" style={{ fontWeight: 700, fontSize: "20px" }}>×{expectedProduct.qty}</p>
          </div>
        </div>

        {/* States */}
        {scanState === "scanning" && (
          <div className="flex gap-3">
            <button onClick={handleMismatch} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border border-red-200 bg-red-50">
              <XCircle size={16} color="#D32F2F" />
              <span style={{ color: "#D32F2F", fontWeight: 600, fontSize: "14px" }}>Simulate Mismatch</span>
            </button>
            <button onClick={handleSuccess} className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3" style={{ backgroundColor: "#00891D" }}>
              <ZapIcon size={16} color="white" />
              <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Simulate Scan</span>
            </button>
          </div>
        )}

        {scanState === "success" && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} color="#2E7D32" />
                <span style={{ color: "#2E7D32", fontWeight: 700, fontSize: "15px" }}>Product Verified ✓</span>
              </div>
              <p className="text-green-600" style={{ fontSize: "13px" }}>Scanned: {expectedProduct.name}</p>
              <p className="text-green-500" style={{ fontSize: "11px" }}>Remaining quantity: {expectedProduct.qty - 1}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border border-gray-200">
                <RefreshCw size={16} color="#757575" />
                <span style={{ color: "#757575", fontWeight: 600, fontSize: "14px" }}>Scan Next</span>
              </button>
              <button onClick={() => onNavigate("picking-screen")} className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3" style={{ backgroundColor: "#2E7D32" }}>
                <CheckCircle size={16} color="white" />
                <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Confirm & Continue</span>
              </button>
            </div>
          </div>
        )}

        {scanState === "mismatch" && (
          <div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} color="#D32F2F" />
                <span style={{ color: "#D32F2F", fontWeight: 700, fontSize: "15px" }}>Product Mismatch!</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-2.5">
                  <p className="text-gray-400 mb-1" style={{ fontSize: "10px" }}>EXPECTED</p>
                  <p className="text-gray-800" style={{ fontWeight: 600, fontSize: "12px" }}>{expectedProduct.name}</p>
                  <p className="text-gray-400" style={{ fontSize: "10px", fontFamily: "monospace" }}>{expectedProduct.barcode}</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-red-200">
                  <p className="text-red-400 mb-1" style={{ fontSize: "10px" }}>SCANNED</p>
                  <p className="text-gray-800" style={{ fontWeight: 600, fontSize: "12px" }}>{mismatchProduct.name}</p>
                  <p className="text-gray-400" style={{ fontSize: "10px", fontFamily: "monospace" }}>{mismatchProduct.barcode}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border border-gray-200">
                <RefreshCw size={16} color="#757575" />
                <span style={{ color: "#757575", fontWeight: 600, fontSize: "14px" }}>Rescan</span>
              </button>
              <button onClick={() => onNavigate("picking-screen")} className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3" style={{ backgroundColor: "#D32F2F" }}>
                <XCircle size={16} color="white" />
                <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Report Issue</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 10px; }
          50% { top: 120px; }
          100% { top: 10px; }
        }
      `}</style>
    </div>
  );
}
