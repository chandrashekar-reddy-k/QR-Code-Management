import { useState } from "react";
import { ArrowLeft, QrCode, CheckCircle, Scan, Bike, Loader2, Package, Clock, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import { HandoverVerificationMobile } from "./HandoverVerificationMobile";

interface HandoverVerificationProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  data?: any;
}

type Step = "staff-scan" | "rider-scan" | "complete";

export function HandoverVerification({ onBack, onNavigate, data }: HandoverVerificationProps) {
  const [userRole] = useState(() => {
    const storedUser = localStorage.getItem("user");
    const userObj = storedUser ? JSON.parse(storedUser) : null;
    return userObj?.role;
  });

  const [isStaffLogin] = useState(() => {
    return !userRole || userRole === "SHOPKEEPER" || userRole === "STORE_STAFF";
  });

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
  const totalItems = order.items?.length || 1;

  // Render desktop view (following Partner Portal design system)
  return (
    <div className="flex-1 bg-[#F5F7FA] dark:bg-gray-900 overflow-y-auto w-full min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">
            <span className="hover:text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => onNavigate("dashboard")}>Home</span>
            <ChevronRight size={16} />
            <span className="hover:text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => onNavigate("dashboard")}>Shopkeeper ERP</span>
            <ChevronRight size={16} />
            <span className="text-[#00891D] font-medium">Handover Verification</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 transition-colors bg-white dark:bg-gray-800"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Handover Verification</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Verify and handover order #{order.order_number || "QC100240"} to rider</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6 pb-20">
        {/* Order Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-wrap gap-8 items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Package size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Order Number</p>
              <p className="font-bold text-gray-900 dark:text-gray-100">#{order.order_number || "QC100240"}</p>
            </div>
          </div>
          
          <div className="h-10 w-px bg-gray-200 hidden md:block"></div>

          <div className="flex flex-col">
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Staff Assigned</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{order.staffName || "Alex"}</p>
          </div>

          <div className="h-10 w-px bg-gray-200 hidden md:block"></div>

          <div className="flex flex-col">
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Rider Assigned</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{order.riderName || "N/A"}</p>
          </div>

          <div className="h-10 w-px bg-gray-200 hidden md:block"></div>

          <div className="flex flex-col">
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Items</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{totalItems} Items</p>
          </div>

          <div className="h-10 w-px bg-gray-200 hidden md:block"></div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
              <Clock size={20} className="text-[#EF5A06]" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">SLA Status</p>
              <p className="font-semibold text-[#EF5A06]">5m Remaining</p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          
          {/* Stepper */}
          <div className="mb-10 max-w-3xl mx-auto">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 dark:bg-gray-700 z-0 rounded-full"></div>
              {steps.map((s, idx) => (
                <div key={s.key} className="flex flex-col items-center relative z-10 bg-white dark:bg-gray-800 px-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm transition-colors duration-300 ${
                      idx < currentStepIdx 
                        ? "bg-[#00891D] text-white" 
                        : idx === currentStepIdx 
                          ? "bg-[#00891D] text-white border-4 border-green-100" 
                          : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {idx < currentStepIdx ? (
                      <CheckCircle size={24} />
                    ) : (
                      <span className="font-bold text-lg">{idx + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${idx <= currentStepIdx ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1 max-w-[120px] text-center">
                    {s.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-xl mx-auto flex flex-col items-center">
            {/* QR Code Display */}
            {step !== "complete" && (
              <div className="flex flex-col items-center mb-8 bg-gray-50 dark:bg-gray-700/50 p-8 rounded-2xl w-full border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4 font-semibold tracking-wider text-sm">ORDER QR CODE</p>
                {/* Simulated QR Code */}
                <div className="relative w-56 h-56 bg-white dark:bg-gray-800 border-4 border-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <div className="grid grid-cols-7 gap-0.5 p-2">
                    {[...Array(49)].map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-sm"
                        style={{ backgroundColor: Math.random() > 0.5 ? "#1a1a1a" : "transparent" }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <QrCode size={90} color="#1a1a1a" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-gray-900 dark:text-gray-100 mb-1 font-bold text-xl">{order.order_number || "QC100240"}</p>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono bg-gray-200 px-3 py-1 rounded-md text-sm tracking-wider">HS7K2-9PLM4-QXR82</p>
              </div>
            )}

            {/* Step Content */}
            {step === "staff-scan" && (
              <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-green-50 rounded-2xl p-6 w-full text-center border border-green-100">
                  <Scan size={40} color="#00891D" className="mx-auto mb-3" />
                  <p className="text-green-800 font-bold text-lg mb-1">Staff QR Verification</p>
                  <p className="text-green-600 text-sm">Scan the order QR with the staff scanner</p>
                </div>
                <button
                  onClick={() => {
                    setStaffVerifiedAt(new Date());
                    setStep("rider-scan");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-4 bg-[#00891D] hover:bg-[#007317] transition-colors shadow-md shadow-green-200"
                >
                  <CheckCircle size={20} color="white" />
                  <span className="text-white font-bold text-lg">Verify as Staff</span>
                </button>
              </div>
            )}

            {step === "rider-scan" && (
              <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-orange-50 rounded-2xl p-6 w-full text-center border border-orange-100">
                  <Bike size={40} color="#EF5A06" className="mx-auto mb-3" />
                  <p className="text-orange-800 font-bold text-lg mb-1">Rider Scan Verification</p>
                  <p className="text-orange-600 text-sm">Rider <strong>{order.riderName || "N/A"}</strong> scans from their device</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      if (order.id) {
                        await api.put(`/orders/${order.id}/status`, { status: 'dispatched' });
                      }
                      setRiderVerifiedAt(new Date());
                      setStep("complete");
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-4 bg-[#EF5A06] hover:bg-[#D54D04] transition-colors shadow-md shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin text-white" size={20} /> : <CheckCircle size={20} color="white" />}
                  <span className="text-white font-bold text-lg">Verify as Rider</span>
                </button>
              </div>
            )}

            {step === "complete" && (
              <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
                {/* Success */}
                <div className="relative mt-4">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center bg-green-50">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-green-100 shadow-inner">
                      <CheckCircle size={56} className="text-[#00891D]" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-40" />
                </div>

                <div className="text-center">
                  <h2 className="text-gray-900 dark:text-gray-100 mb-2 font-extrabold text-3xl">Handover Complete!</h2>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-base">Order successfully dispatched to rider <strong>{order.riderName || "N/A"}</strong></p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 w-full border border-gray-100 dark:border-gray-700">
                  {[
                    { label: "Order Number", value: `#${order.order_number || "QC100240"}` },
                    { label: "Rider Name", value: order.riderName || "N/A" },
                    { label: "Staff Verification Time", value: staffVerifiedAt ? staffVerifiedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A" },
                    { label: "Rider Verification Time", value: riderVerifiedAt ? riderVerifiedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A" },
                    { label: "Handover Status", value: <span className="text-[#00891D] font-bold">Dispatched ✓</span> },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0 items-center">
                      <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm font-medium">{row.label}</span>
                      <span className="text-gray-900 dark:text-gray-100 text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-4 bg-[#00891D] hover:bg-[#007317] transition-colors shadow-md"
                >
                  <ArrowLeft size={20} color="white" />
                  <span className="text-white font-bold text-lg">Back to Ready Orders</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
