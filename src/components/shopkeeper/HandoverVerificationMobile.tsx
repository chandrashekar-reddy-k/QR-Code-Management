import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle, Loader2, Copy, Check, RefreshCw, KeyRound, Bike, ShieldCheck } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface HandoverVerificationMobileProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
  data?: any;
}

type Step = "otp-verification" | "complete";

export function HandoverVerificationMobile({ onBack, data }: HandoverVerificationMobileProps) {
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
    { key: "complete", label: "Handover Complete", desc: "Handed over successfully" },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  // Fetch or generate fresh unique Pickup OTP
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
      // Fallback: generate a fresh unique random 6-digit number
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

  const handleConfirmHandover = async () => {
    try {
      setLoading(true);
      const orderIdentifier = order.id || order.order_number || order.orderNumber;
      if (orderIdentifier) {
        await api.put(`/orders/${orderIdentifier}/handover`);

        // Fallback local cache
        const handedOverIds = JSON.parse(localStorage.getItem("handedOverIds") || "[]");
        if (!handedOverIds.includes(String(orderIdentifier))) {
          const newIds = [...handedOverIds, String(orderIdentifier)];
          localStorage.setItem("handedOverIds", JSON.stringify(newIds));
        }
      }
      setStaffVerifiedAt(new Date());
      setStep("complete");
      toast.success("Order handed over successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || "Failed to complete handover");
    } finally {
      setLoading(false);
    }
  };

  const otpDigits = (otp || "------").split("").slice(0, 6);
  while (otpDigits.length < 6) {
    otpDigits.push("-");
  }

  const riderName =
    order.riderName || order.rider_name || order.agent?.name || "Assigned Delivery Partner";
  const riderPhone =
    order.riderPhone || order.rider_phone || order.agent?.phone || order.agent?.mobile || "";

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Handover Verification</h1>
            <p className="text-white/70 text-xs">Order #{order.order_number || order.orderNumber || "QC100240"}</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center">
          {steps.map((s, idx) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-colors"
                  style={{
                    backgroundColor: idx < currentStepIdx ? "#2E7D32" : idx === currentStepIdx ? "#00891D" : "#E0E0E0",
                  }}
                >
                  {idx < currentStepIdx ? (
                    <CheckCircle size={16} color="white" />
                  ) : (
                    <span className="text-white font-bold text-xs">{idx + 1}</span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: idx <= currentStepIdx ? "#212121" : "#9E9E9E",
                    textAlign: "center",
                    maxWidth: "70px",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1 mb-5"
                  style={{ backgroundColor: idx < currentStepIdx ? "#2E7D32" : "#E0E0E0" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto w-full">
        {/* Pickup OTP Display Card */}
        {step !== "complete" && (
          <div className="bg-white rounded-3xl p-6 shadow-sm w-full flex flex-col items-center dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-950/40 text-[#00891D] dark:text-green-400 rounded-full mb-2 text-xs font-bold tracking-wider">
              <KeyRound size={14} />
              <span>PICKUP OTP CODE</span>
            </div>

            <p className="text-gray-500 mb-4 dark:text-gray-400 text-xs font-medium text-center">
              Share this 6-digit OTP with delivery boy to confirm pickup
            </p>

            {/* 6 Digit Display Blocks */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 my-3">
              {loadingOtp ? (
                <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                  <Loader2 className="animate-spin text-[#00891D]" size={22} />
                  <span className="text-sm">Fetching OTP...</span>
                </div>
              ) : (
                otpDigits.map((digit, idx) => (
                  <div
                    key={idx}
                    className="w-11 h-14 sm:w-12 sm:h-16 rounded-xl bg-gradient-to-b from-green-50 to-white dark:from-gray-700 dark:to-gray-800 border-2 border-[#00891D] flex items-center justify-center shadow-sm"
                  >
                    <span className="text-2xl sm:text-3xl font-black text-[#00891D] dark:text-green-400 font-mono">
                      {digit}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Action buttons: Copy & Refresh */}
            <div className="flex items-center gap-3 mt-1 mb-4">
              <button
                onClick={handleCopyOtp}
                disabled={!otp || loadingOtp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
              >
                {copied ? <Check size={14} className="text-[#00891D]" /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy OTP"}</span>
              </button>

            </div>

            {/* Order & Rider info */}
            <div className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 mt-1 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-200/60 dark:border-gray-600">
                <span className="text-xs text-gray-500 dark:text-gray-400">Order Number</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                  #{order.order_number || order.orderNumber || "QC100240"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center text-[#00891D]">
                    <Bike size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{riderName}</p>
                    {riderPhone && <p className="text-[11px] text-gray-500 dark:text-gray-400">{riderPhone}</p>}
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-[#00891D] dark:bg-green-900/40 dark:text-green-300">
                  Ready for Pickup
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        {step === "otp-verification" && (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl p-4 w-full flex items-start gap-3 border border-green-100 dark:border-green-900/40">
              <ShieldCheck size={22} className="text-[#00891D] shrink-0 mt-0.5" />
              <div>
                <p className="text-green-900 dark:text-green-200 font-bold text-sm">Pickup Verification</p>
                <p className="text-green-700 dark:text-green-400 text-xs mt-0.5">
                  Delivery partner enters this 6-digit OTP in their app to confirm pickup. Once submitted, status updates automatically.
                </p>
              </div>
            </div>

            <button
              onClick={handleConfirmHandover}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 transition-opacity shadow-sm"
              style={{ backgroundColor: "#00891D", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <Loader2 className="animate-spin text-white" size={18} /> : <CheckCircle size={18} color="white" />}
              <span className="text-white font-semibold text-sm">Staff Verified ✓</span>
            </button>
          </div>
        )}

        {step === "complete" && (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Success */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E8F5E9" }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#C8E6C9" }}>
                  <CheckCircle size={48} color="#2E7D32" />
                </div>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-30" />
            </div>

            <div className="text-center">
              <h2 className="text-gray-900 mb-1 dark:text-gray-100 font-bold text-2xl">Handover Complete!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Order handed over to delivery partner successfully</p>
            </div>

            <div className="bg-white rounded-2xl p-4 w-full shadow-sm dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              {[
                { label: "Order", value: `#${order.order_number || order.orderNumber || "QC100240"}` },
                {
                  label: "Handover Time",
                  value: staffVerifiedAt
                    ? staffVerifiedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "N/A",
                },
                { label: "Rider", value: riderName },
                { label: "Status", value: "Handed Over ✓" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{row.label}</span>
                  <span className="text-gray-800 dark:text-gray-200 font-semibold text-xs">{row.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 transition-colors"
              style={{ backgroundColor: "#2E7D32" }}
            >
              <span className="text-white font-semibold text-sm">Back to Ready Orders</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
