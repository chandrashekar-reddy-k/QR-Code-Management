import { HandoverVerificationMobile } from "./HandoverVerificationMobile";

import { useState } from "react";
import { ArrowLeft, QrCode, CheckCircle, Scan, Bike, Loader2, ChevronRight, Package } from "lucide-react";
import api from "../../api/axios";
import { getSLAInfo } from "../../utils/slaHelper";
import toast from "react-hot-toast";

interface HandoverVerificationProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  data?: any;
}

type Step = "staff-scan" | "rider-scan" | "complete";

export function HandoverVerification({ onBack, onNavigate, data }: HandoverVerificationProps) {

  const storedPartnerUser = localStorage.getItem("partnerUser");
  const partnerUserObj = storedPartnerUser ? JSON.parse(storedPartnerUser) : null;
  const partnerRole = partnerUserObj?.role;

  // Staff login (SHOPKEEPER / STORE_STAFF) uses the original mobile handover verification UI
  const isStaffLogin = !partnerRole || partnerRole === "SHOPKEEPER" || partnerRole === "STORE_STAFF";

  if (isStaffLogin) {
    return <HandoverVerificationMobile onBack={onBack} onNavigate={onNavigate} data={data} />;
  }


  const [step, setStep] = useState<Step>("staff-scan");
  const [loading, setLoading] = useState(false);
  const [staffVerifiedAt, setStaffVerifiedAt] = useState<Date | null>(null);
  const [riderVerifiedAt, setRiderVerifiedAt] = useState<Date | null>(null);
  const order = data || {};

  const steps = [
    { key: "staff-scan", label: "Staff Verification", desc: "Staff scans the order QR" },
    { key: "rider-scan", label: "Rider Verification", desc: "Rider scans on their app" },
    { key: "complete", label: "Handover Complete", desc: "Dispatched successfully" },
  ];

  const currentStepIdx = steps.findIndex(s => s.key === step);

  const handleStaffVerify = () => {
    setLoading(true);
    setTimeout(() => {
      setStaffVerifiedAt(new Date());
      setStep("rider-scan");
      setLoading(false);
    }, 1000);
  };

  const handleRiderVerify = () => {
    setLoading(true);
    setTimeout(() => {
      setRiderVerifiedAt(new Date());
      toast.success("Rider verified successfully");
      setLoading(false);
    }, 500);
  };

  const handleCompleteHandover = async () => {
    if (!order.id) return;
    setLoading(true);
    try {
      await api.put(`/orders/${order.id}/status`, { status: 'dispatched' });
      setStep("complete");
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setLoading(false);
    }
  };

  const slaInfo = getSLAInfo(order);

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] pb-12">
      {/* Page Header */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="text-xs text-gray-500 flex items-center gap-1 mb-2">
              <button onClick={() => onNavigate("dashboard")} className="hover:text-[#00891D] transition-colors">Home</button>
              <ChevronRight size={12} />
              <button onClick={() => onNavigate("ready-orders")} className="hover:text-[#00891D] transition-colors">Ready for Dispatch</button>
              <ChevronRight size={12} />
              <span className="font-medium text-[#00891D]">Handover Verification</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Handover Verification</h1>
            <p className="text-gray-500 text-sm mt-1">Order #{order.order_number || "—"} · Rider: {order.riderName || "N/A"}</p>
          </div>
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            <ArrowLeft size={16} /> Back to Ready Orders
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Order Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Package size={20} className="text-[#00891D]" />
            Order Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Order Number</p>
              <p className="font-semibold text-gray-900">{order.order_number || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Staff</p>
              <p className="font-medium text-gray-900">Store Manager</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Rider</p>
              <p className="font-medium text-gray-900">{order.riderName || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Tray</p>
              <p className="font-medium text-gray-900">{order.tray_number || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Items</p>
              <p className="font-medium text-gray-900">{order.items?.length || 0} items</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">SLA Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                slaInfo.status === 'breached' 
                  ? 'bg-red-105 text-red-800' 
                  : slaInfo.status === 'at_risk' 
                  ? 'bg-orange-100 text-orange-850' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {slaInfo.displayText}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Stepper and Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Stepper */}
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => {
                const isActive = step === s.key;
                const isPassed = currentStepIdx > i;
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                        isPassed ? 'bg-[#00891D] text-white' :
                        isActive ? 'bg-[#00891D] text-white ring-4 ring-[#00891D]/20' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {isPassed ? <CheckCircle size={16} /> : (i + 1)}
                      </div>
                      <div className="hidden sm:block">
                        <p className={`text-sm font-semibold ${isActive || isPassed ? 'text-gray-900' : 'text-gray-500'}`}>{s.label}</p>
                        <p className="text-xs text-gray-500">{s.desc}</p>
                      </div>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 mx-4 h-0.5 bg-gray-200">
                        <div className="h-full bg-[#00891D] transition-all" style={{ width: isPassed ? '100%' : '0%' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-8">
            {step === "staff-scan" && (
              <div className="text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-[#E8F5E9] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Scan size={48} className="text-[#00891D]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Staff Verification</h3>
                <p className="text-gray-500 mb-8">Please scan the QR code on the order receipt to verify that the items match the order.</p>
                <button
                  onClick={handleStaffVerify}
                  disabled={loading}
                  className="w-full bg-[#00891D] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-[#006614] transition-colors flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
                  <span>Scan Receipt QR</span>
                </button>
              </div>
            )}

            {step === "rider-scan" && (
              <div className="text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Bike size={48} className="text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Rider Verification</h3>
                <p className="text-gray-500 mb-8">Hand over the order to <strong>{order.riderName || "the rider"}</strong>. They must scan their app to confirm pickup.</p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 mb-8 flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm mb-4">
                     <QrCode size={64} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Show this QR to the Rider</p>
                </div>

                {!riderVerifiedAt ? (
                  <button
                    onClick={handleRiderVerify}
                    disabled={loading || !!riderVerifiedAt}
                    className="w-full bg-orange-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    <span>Simulate Rider Scan</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteHandover}
                    disabled={loading || !staffVerifiedAt}
                    className="w-full bg-[#00891D] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-[#006614] transition-colors flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    <span>Complete Handover</span>
                  </button>
                )}
              </div>
            )}

            {step === "complete" && (
              <div className="text-center max-w-md mx-auto py-8">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Handover Complete!</h3>
                <p className="text-gray-500 mb-8">Order #{order.order_number} has been successfully dispatched.</p>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">Staff Verified</span>
                    <span className="text-sm font-medium text-gray-900">{staffVerifiedAt?.toLocaleTimeString() || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Rider Verified</span>
                    <span className="text-sm font-medium text-gray-900">{riderVerifiedAt?.toLocaleTimeString() || "—"}</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate("ready-orders")}
                  className="w-full bg-white text-gray-900 border border-gray-300 font-bold py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Back to Ready Orders
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
