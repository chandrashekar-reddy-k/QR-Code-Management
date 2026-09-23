import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  Package,
  Hash,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Edit,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useGetReturnRequestById, useReceiveReturnItem, useApproveReturnItem, useRejectReturnItem, useUpdateReturnPhase } from "../../../hooks/returnRequest";
import { toast } from "react-toastify";
import { ReturnRequest, ReturnRequestItem } from "../../../types";
import { formatDate, formatCurrency } from "../../../utils/formatters";
import { Badge, Button } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
}

// Enhanced KPI Card Component
const KPICard = ({ title, value, icon: Icon, colorClass }: KPICardProps) => (
  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-white/20 dark:border-slate-700/50 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-all duration-300">
    <div className={`p-3 rounded-xl ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

const ViewReturnRequest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: apiData, isLoading: loading, isError, refetch } = useGetReturnRequestById(id);
  const { mutate: receiveReturn, isPending: isReceiving } = useReceiveReturnItem(id);
  const approveMutation = useApproveReturnItem(id);
  const rejectMutation = useRejectReturnItem(id);
  const updatePhaseMutation = useUpdateReturnPhase(id);
  
  const [request, setRequest] = useState<ReturnRequest | null>(null);
  const [qcData, setQcData] = useState<Record<string, { qcStatus: 'PASSED' | 'FAILED' | '', qcNotes: string }>>({});

  useEffect(() => {
    if (apiData?.data) {
      setRequest(apiData.data);
    }
  }, [apiData]);

  useEffect(() => {
    if (isError) {
      toast.error("Return request not found!");
      navigate('/return-requests');
    }
  }, [isError, navigate]);

  // Initialize QC data for items that need it
  useEffect(() => {
    if (request?.items) {
      const initialQcData: Record<string, { qcStatus: 'PASSED' | 'FAILED' | '', qcNotes: string }> = {};
      request.items.forEach((item: ReturnRequestItem) => {
        if (!item.qcStatus && (item.status === 'APPROVED' || item.status === 'PARTIALLY_APPROVED')) {
          initialQcData[item.id] = { qcStatus: '', qcNotes: '' };
        }
      });
      setQcData(initialQcData);
    }
  }, [request]);

  const handleSubmitQC = () => {
    const items = Object.entries(qcData).map(([orderItemId, data]) => ({
      orderItemId,
      ...data
    }));

    if (items.length === 0) {
      toast.error("No items to receive");
      return;
    }

    const missingQc = items.some(item => !item.qcStatus);
    if (missingQc) {
      toast.error("Please select PASS or FAIL for all items.");
      return;
    }

    receiveReturn({ items }, {
      onSuccess: () => {
        setQcData({});
      }
    });
  };

  const handlePhaseChange = (phase: string) => {
    updatePhaseMutation.mutate(phase);
  };

  // Derived metrics
  const metrics = useMemo(() => {
    if (!request?.items) return null;
    let approved = 0, rejected = 0, pending = 0;
    let approvedRefundAmount = 0;
    let totalRequestedAmount = 0;

    request.items.forEach((item: ReturnRequestItem) => {
      const status = item.status || 'pending';
      const itemTotal = Number(item.totalPrice || 0);
      totalRequestedAmount += itemTotal;
      if (status === 'APPROVED') {
        approved++;
        approvedRefundAmount += itemTotal;
      } else if (status === 'REJECTED') {
        rejected++;
      } else {
        pending++;
      }
    });

    const refundAmount = approvedRefundAmount > 0 ? approvedRefundAmount : (Number(request.total) || totalRequestedAmount);

    return { approved, rejected, pending, refundAmount, total: request.items.length };
  }, [request]);

  if (loading) {
    return (
      <div className="w-full px-4 pb-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading premium interface...</p>
        </div>
      </div>
    );
  }

  if (!request || !metrics) {
    return (
      <div className="w-full px-4 pb-8 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-800 flex flex-col items-center max-w-md text-center">
           <AlertCircle className="text-rose-500 mb-3" size={32} />
           <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">Return request not found or data is incomplete.</p>
           <BackButton to="/return-requests" />
        </div>
      </div>
    );
  }

  // Determine timeline steps based on return lifecycle (7 steps)
  const getTimelineStep = () => {
    const s = request.status?.toUpperCase() || 'PENDING';
    if (['REFUND_COMPLETED', 'COMPLETED', 'REFUNDED'].includes(s)) return 7;
    if (s === 'ADMIN_REFUND_PENDING' || s === 'REFUND_PROCESSING') return 6;
    if (s === 'RETURN_RECEIVED_AT_WAREHOUSE') return 5;
    if (['PICKUP_COMPLETED', 'RETURN_IN_TRANSIT'].includes(s)) return 4;
    if (['PICKUP_ASSIGNED', 'OUT_FOR_PICKUP', 'RETURN_OUT_FOR_PICKUP', 'RETURN_PICKUP_ASSIGNED'].includes(s)) return 3;
    if (['APPROVED', 'PARTIALLY_APPROVED', 'PARTNER_APPROVED'].includes(s)) return 2;
    if (['REJECTED', 'FAILED'].includes(s)) return -1; // Error state
    return 1; // REQUESTED / PARTNER_APPROVAL_PENDING
  };
  const currentStep = getTimelineStep();
  const isRejected = currentStep === -1;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 relative min-h-screen">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 -z-10" />

      {/* Header */}
      <div className="mb-6 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight">
             Return Details
           </h1>
           <div className="mt-2">
             <Breadcrumbs />
           </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(!request.status || request.status.toLowerCase() === 'pending' || request.status === 'REQUESTED') && (
            <>
              <button
                onClick={async () => {
                  try {
                    await approveMutation.mutateAsync({ orderItemId: '' });
                    refetch();
                  } catch (err) {}
                }}
                disabled={approveMutation.isPending}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {approveMutation.isPending ? "Approving..." : "Accept & Approve Refund"}
              </button>
              <button
                onClick={() => navigate(`/return-requests/edit/${request.id}`)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 flex items-center gap-2 transition-all"
              >
                <Edit size={16} />
                Review / Reject Items
              </button>
            </>
          )}
          <BackButton to="/return-requests" />
        </div>
      </div>

      {/* Main Glass Container */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-800 overflow-hidden">
        
        {/* Top Info Strip */}
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-6 items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400">
               <Hash size={20} />
             </div>
             <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Request ID</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">#{request.id}</p>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400">
               <User size={20} />
             </div>
             <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Customer</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{request.name}</p>
             </div>
           </div>

           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400">
               <Calendar size={20} />
             </div>
             <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Date</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(request.date)}</p>
             </div>
           </div>

           {/* Flow Stage Dropdown Selector */}
           <div className="flex items-center gap-2 bg-indigo-50/90 dark:bg-indigo-950/40 p-2.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800 shadow-sm">
             <div className="p-2 bg-indigo-600 text-white rounded-xl">
               <Sparkles size={16} />
             </div>
             <div>
               <label className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Stage / Flow Status</label>
               <select
                 value={
                   isRejected ? 'REJECTED' :
                   currentStep === 7 ? 'COMPLETED' :
                   currentStep === 6 ? 'REFUND_PROCESSING' :
                   currentStep === 5 ? 'RETURN_RECEIVED_AT_WAREHOUSE' :
                   currentStep === 4 ? 'PICKUP_COMPLETED' :
                   currentStep === 3 ? 'PICKUP_ASSIGNED' :
                   currentStep === 2 ? 'APPROVED' : 'REQUESTED'
                 }
                 onChange={(e) => handlePhaseChange(e.target.value)}
                 disabled={updatePhaseMutation.isPending}
                 className="mt-0.5 text-xs font-bold text-indigo-950 dark:text-indigo-100 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
               >
                 <option value="REQUESTED">1. Req. (Requested)</option>
                 <option value="APPROVED">2. Approved (Partner Approved)</option>
                 <option value="PICKUP_ASSIGNED">3. Assigned (Pickup Assigned)</option>
                 <option value="PICKUP_COMPLETED">4. Picked (Picked Up)</option>
                 <option value="RETURN_RECEIVED_AT_WAREHOUSE">5. Received (At Warehouse)</option>
                 <option value="REFUND_PROCESSING">6. Refunding (Refund Processing)</option>
                 <option value="COMPLETED">7. Done (Refund Completed)</option>
                 <option value="REJECTED">✕ Rejected</option>
               </select>
             </div>
           </div>
        </div>

        <div className="p-6 sm:p-8">
           
           {/* Return Lifecycle Timeline with Clickable Stages */}
           <div className="mb-10 px-4 hidden sm:block">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lifecycle Progress (Click any step to transition)</p>
                {updatePhaseMutation.isPending && (
                  <span className="text-xs font-semibold text-indigo-600 animate-pulse">Updating stage...</span>
                )}
              </div>
              <div className="relative flex justify-between items-center w-full">
                 {/* Connecting line background */}
                 <div className="absolute top-4 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10 rounded-full" />
                 {/* Connecting line progress */}
                 {!isRejected && (
                   <div 
                     className="absolute top-4 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 -z-10 rounded-full transition-all duration-700" 
                     style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
                   />
                 )}
                 
                 {[
                   { step: 1, phase: 'REQUESTED', label: 'Requested', short: '1. Req.' },
                   { step: 2, phase: 'APPROVED', label: 'Partner Approved', short: '2. Approved' },
                   { step: 3, phase: 'PICKUP_ASSIGNED', label: 'Pickup Assigned', short: '3. Assigned' },
                   { step: 4, phase: 'PICKUP_COMPLETED', label: 'Picked Up', short: '4. Picked' },
                   { step: 5, phase: 'RETURN_RECEIVED_AT_WAREHOUSE', label: 'Warehouse Received', short: '5. Received' },
                   { step: 6, phase: 'REFUND_PROCESSING', label: 'Refund Processing', short: '6. Refunding' },
                   { step: 7, phase: 'COMPLETED', label: 'Refund Completed', short: '7. Done' }
                 ].map((s) => (
                   <button 
                     key={s.step}
                     type="button"
                     onClick={() => handlePhaseChange(s.phase)}
                     disabled={updatePhaseMutation.isPending}
                     className="flex flex-col items-center gap-1.5 group cursor-pointer transition-transform hover:scale-105 focus:outline-none"
                     title={`Click to transition to Step ${s.step}: ${s.label}`}
                   >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300
                        ${isRejected && s.step <= 1
                          ? 'bg-rose-500 text-white border-2 border-rose-200'
                          : currentStep >= s.step 
                            ? 'bg-indigo-600 text-white border-2 border-indigo-100 dark:border-indigo-900 scale-110 shadow-md shadow-indigo-500/30' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 group-hover:text-indigo-600'}`}
                      >
                         {currentStep > s.step ? <CheckCircle size={15} /> : s.step}
                      </div>
                      <p className={`text-[11px] font-semibold text-center leading-tight max-w-[70px] ${currentStep >= s.step ? 'text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                         {s.short}
                      </p>
                   </button>
                 ))}
              </div>
              {isRejected && (
                <p className="text-center text-xs text-rose-500 font-semibold mt-3">⚠️ Return Rejected / Failed</p>
              )}
           </div>

           {/* KPI Metrics */}
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              <KPICard 
                title="Total Items" value={metrics.total} icon={Package} 
                colorClass="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" 
              />
              <KPICard 
                title="Pending" value={metrics.pending} icon={Clock} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" 
              />
              <KPICard 
                title="Approved" value={metrics.approved} icon={CheckCircle} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" 
              />
              <KPICard 
                title="Rejected" value={metrics.rejected} icon={XCircle} 
                colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" 
              />
              <KPICard 
                title="Refund Amount" value={formatCurrency(metrics.refundAmount)} icon={DollarSign} 
                colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400" 
              />
           </div>

           {/* Reason & Content */}
           <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Customer's Return Reason</h3>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                 {request.reason}
              </div>
           </div>

           {/* Item Cards */}
           <div>
              <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3">
                <Package size={18} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Itemized Breakdown</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {request.items && request.items.length > 0 ? (
                  request.items.map((item: ReturnRequestItem, index: number) => (
                    <div key={item.id || index} className="group flex flex-col justify-between p-5 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                           <p className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight pr-4">
                             {item.productName}
                           </p>
                           <Badge status={item.status || 'pending'} size="sm" />
                        </div>
                        <div className="space-y-1 mb-4">
                           <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                             <span>Quantity:</span>
                             <span className="text-slate-800 dark:text-slate-200 font-bold">{item.quantity}</span>
                           </p>
                           <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                             <span>Unit Price:</span>
                             <span className="text-slate-800 dark:text-slate-200">{formatCurrency(item.unitPrice)}</span>
                           </p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                         <span className="text-[10px] uppercase font-bold text-slate-500">Requested Amount</span>
                         <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(item.totalPrice)}</span>
                      </div>
                      
                      {/* QC Input Form — shown when item is pending warehouse receipt */}
                      {qcData[item.id] && (
                        <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/30">
                          <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-2 uppercase tracking-wider">Quality Control</p>
                          <div className="flex gap-2 mb-3">
                            <button 
                              onClick={() => setQcData(prev => ({ ...prev, [item.id]: { ...prev[item.id], qcStatus: 'PASSED' } }))}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${qcData[item.id].qcStatus === 'PASSED' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-600'}`}
                            >
                              PASS
                            </button>
                            <button 
                              onClick={() => setQcData(prev => ({ ...prev, [item.id]: { ...prev[item.id], qcStatus: 'FAILED' } }))}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${qcData[item.id].qcStatus === 'FAILED' ? 'bg-rose-500 text-white border-rose-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-rose-500 hover:text-rose-600'}`}
                            >
                              FAIL
                            </button>
                          </div>
                          <input 
                            type="text" 
                            placeholder="QC Remarks (optional)"
                            value={qcData[item.id].qcNotes}
                            onChange={(e) => setQcData(prev => ({ ...prev, [item.id]: { ...prev[item.id], qcNotes: e.target.value } }))}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      )}

                      {/* QC Status — shown after warehouse receipt */}
                      {item.qcStatus && (
                        <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                          item.qcStatus === 'PASSED'
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {item.qcStatus === 'PASSED' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          QC: {item.qcStatus}
                          {item.qcNotes && <span className="font-normal opacity-80"> — {item.qcNotes}</span>}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-60">
                    <Package size={48} className="mb-4 text-slate-400" />
                    <p className="text-sm font-medium text-slate-500">No detailed items available for this return.</p>
                  </div>
                )}
              </div>

              {Object.keys(qcData).length > 0 && (
                <div className="mt-8 flex justify-end">
                  <Button 
                    onClick={handleSubmitQC} 
                    disabled={isReceiving}
                    variant="primary"
                    size="lg"
                    className="shadow-lg shadow-indigo-500/30"
                  >
                    {isReceiving ? "Submitting QC..." : "Submit QC & Receive Items"}
                  </Button>
                </div>
              )}
           </div>

        </div>
      </div>
    </div>
  );
};

export default ViewReturnRequest;
