import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle, Bike, Loader2, ChevronRight, Package, Copy, Check, RefreshCw, KeyRound, ShieldCheck } from "lucide-react";
import api from "../../api/axios";
import { getSLAInfo } from "../../utils/slaHelper";
import toast from "react-hot-toast";

interface HandoverVerificationProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  data?: any;
}

type Step = "otp-verification" | "complete";

export function HandoverVerification({ onBack, onNavigate, data }: HandoverVerificationProps) {
  const [step, setStep] = useState<Step>("otp-verification");
  const [loading, setLoading] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [staffVerifiedAt, setStaffVerifiedAt] = useState<Date | null>(null);
  const order = data || {};
  const pollTimerRef = useRef<any>(null);

  const steps = [
    { key: "otp-verification", label: "Pickup OTP", desc: "Share 6-digit OTP with rider" },
    { key: "complete", label: "Handover Complete", desc: "Dispatched successfully" },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  const fetchPickupOtp = async (forceRegenerate = true) => {
    const orderIdentifier = order.id || order.order_number || order.orderNumber;
    if (!orderIdentifier) return;
    setLoadingOtp(true);
    try {
      const url = forceRegenerate
        ? `/orders/${orderIdentifier}/pickup-otp?regenerate=true&t=${Date.now()}`
        : `/orders/${orderIdentifier}/pickup-otp?t=${Date.now()}`;
      const res = await api.get(url);
      if (res.data?.otp || res.data?.pickupOtp) {
        setOtp(String(res.data.otp || res.data.pickupOtp));
        return;
      }
    } catch {
      let fallbackOtp;
      do {
        fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      } while (fallbackOtp === otp);
      setOtp(fallbackOtp);
    } finally {
      setLoadingOtp(false);
    }
  };

  useEffect(() => {
    fetchPickupOtp(false);
  }, [order.id, order.order_number]);

  // Poll for delivery partner completing pickup
  useEffect(() => {
    if (step === "complete") return;
    const orderIdentifier = order.id || order.order_number || order.orderNumber;
    if (!orderIdentifier) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/orders/${orderIdentifier}`);
        const current = res.data?.order || res.data;
        const status = (current?.status || "").toLowerCase();
        const allocationStatus = (current?.allocationStatus || current?.allocation_status || "").toLowerCase();

        if (
          status === "dispatched" ||
          status === "out_for_delivery" ||
          status === "picked_up" ||
          allocationStatus === "handedover"
        ) {
          setStaffVerifiedAt(new Date());
          setStep("complete");
          clearInterval(pollTimerRef.current);
        }
      } catch {
        // ignore polling error
      }
    }, 4000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [order.id, step]);

  const handleCopyOtp = () => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopied(true);
    toast.success("Pickup OTP copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompleteHandover = async () => {
    const orderIdentifier = order.id || order.order_number || order.orderNumber;
    if (!orderIdentifier) return;
    setLoading(true);
    try {
      await api.put(`/orders/${orderIdentifier}/handover`);
      setStaffVerifiedAt(new Date());
      setStep("complete");
      toast.success("Order handed over successfully!");
    } catch (err: any) {
      console.error("Failed to complete handover", err);
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || "Failed to complete handover");
    } finally {
      setLoading(false);
    }
  };

  const slaInfo = getSLAInfo(order);
  const otpDigits = (otp || "------").split("").slice(0, 6);
  while (otpDigits.length < 6) {
    otpDigits.push("-");
  }

  const riderName = order.riderName || order.rider_name || order.agent?.name || "Assigned Rider";

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
            <p className="text-gray-500 text-sm mt-1">Order #{order.order_number || order.orderNumber || "—"} · Rider: {riderName}</p>
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
              <p className="text-sm font-bold text-gray-900 font-mono">#{order.order_number || order.orderNumber || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Customer</p>
              <p className="text-sm font-medium text-gray-900 truncate">{order.customer_name || "Customer"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Items</p>
              <p className="text-sm font-medium text-gray-900">{order.item_count || order.items?.length || 1} items</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Delivery Partner</p>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                <Bike size={14} className="text-[#00891D]" />
                <span className="truncate">{riderName}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Order Type</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                {order.order_type || "Home Delivery"}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">SLA Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                slaInfo.status === 'breached' 
                  ? 'bg-red-100 text-red-800' 
                  : slaInfo.status === 'at_risk' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {slaInfo.displayText}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Stepper and Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Stepper */}
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
                      <div>
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
            {step === "otp-verification" && (
              <div className="text-center max-w-lg mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-[#00891D] rounded-full mb-4 text-xs font-bold tracking-wider border border-green-200">
                  <KeyRound size={16} />
                  <span>PICKUP OTP NUMBER</span>
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-2">Share OTP with Rider</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Provide this 6-digit OTP code to <strong className="text-gray-800">{riderName}</strong>. They must enter it on their delivery mobile app to verify and complete pickup.
                </p>

                {/* 6 Digit Display Blocks */}
                <div className="flex items-center justify-center gap-3 my-6">
                  {loadingOtp ? (
                    <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
                      <Loader2 className="animate-spin text-[#00891D]" size={28} />
                      <span className="text-base font-medium">Generating OTP...</span>
                    </div>
                  ) : (
                    otpDigits.map((digit, idx) => (
                      <div
                        key={idx}
                        className="w-14 h-20 rounded-2xl bg-gradient-to-b from-green-50 to-white border-2 border-[#00891D] flex items-center justify-center shadow-md"
                      >
                        <span className="text-4xl font-black text-[#00891D] font-mono">
                          {digit}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Actions: Copy and Refresh */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <button
                    onClick={handleCopyOtp}
                    disabled={!otp || loadingOtp}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-sm"
                  >
                    {copied ? <Check size={16} className="text-[#00891D]" /> : <Copy size={16} />}
                    <span>{copied ? "Copied" : "Copy OTP"}</span>
                  </button>

                </div>

                <div className="bg-green-50/70 border border-green-200 rounded-xl p-4 mb-8 text-left flex items-start gap-3">
                  <ShieldCheck size={24} className="text-[#00891D] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-950 font-bold text-sm">Automatic Sync</p>
                    <p className="text-green-800 text-xs mt-0.5">
                      Once the rider enters this code on their mobile device, this page will automatically confirm pickup and mark the order as dispatched.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCompleteHandover}
                  disabled={loading}
                  className="w-full bg-[#00891D] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-[#006614] transition-colors flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  <span>Staff Verified & Handed Over ✓</span>
                </button>
              </div>
            )}

            {step === "complete" && (
              <div className="text-center max-w-md mx-auto py-8">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Handover Complete!</h3>
                <p className="text-gray-500 mb-6">Order #{order.order_number || order.orderNumber} has been successfully dispatched with rider {riderName}.</p>
                <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-100 text-left">
                  <div className="flex justify-between py-1.5 border-b border-gray-200/50">
                    <span className="text-xs text-gray-500">Handover Time</span>
                    <span className="text-xs font-semibold text-gray-800">
                      {staffVerifiedAt ? staffVerifiedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className="text-xs font-bold text-green-700">Handed Over / Dispatched ✓</span>
                  </div>
                </div>
                <button
                  onClick={onBack}
                  className="w-full bg-[#00891D] text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:bg-[#006614] transition-colors"
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
