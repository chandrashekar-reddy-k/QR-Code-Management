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
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useGetReturnRequestById, useReceiveReturnItem } from "../../../hooks/returnRequest";
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
  const { data: apiData, isLoading: loading, isError } = useGetReturnRequestById(id);
  const { mutate: receiveReturn, isPending: isReceiving } = useReceiveReturnItem(id);
  
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
        // We only initialize empty QC data if the item doesn't have it yet and is approved for return
        if (!item.qcStatus && (item.status === 'APPROVED' || item.status === 'PARTIALLY_APPROVED')) {
          initialQcData[item.id] = { qcStatus: '', qcNotes: '' };
        }
      });
      setQcData(initialQcData);
    }
  }, [request]);

  const handleSubmitQC = () => {
    // Validate that all items have a PASS/FAIL status selected
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
        setQcData({}); // Clear form on success
      }
    });
  };

  // Derived metrics
  const metrics = useMemo(() => {
    if (!request?.items) return null;
    let approved = 0, rejected = 0, pending = 0;
    let refundAmount = 0;

    request.items.forEach((item: ReturnRequestItem) => {
      const status = item.status || 'pending';
      if (status === 'APPROVED') {
        approved++;
        refundAmount += item.totalPrice;
      } else if (status === 'REJECTED') {
        rejected++;
      } else {
        pending++;
      }
    });

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
        <BackButton to="/return-requests" />
      </div>

      {/* Main Glass Container */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-800 overflow-hidden">
        
        {/* Top Info Strip */}
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-8 items-center justify-between">
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

           <div className="flex flex-col items-end">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Overall Status</p>
              <Badge status={request.status} size="md" />
           </div>
        </div>

        <div className="p-6 sm:p-8">
           
           {/* Return Lifecycle Timeline */}
           <div className="mb-10 px-4 hidden sm:block">
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
                   { step: 1, label: 'Requested', short: 'Req.' },
                   { step: 2, label: 'Partner Approved', short: 'Approved' },
                   { step: 3, label: 'Pickup Assigned', short: 'Assigned' },
                   { step: 4, label: 'Picked Up', short: 'Picked' },
                   { step: 5, label: 'Warehouse Received', short: 'Received' },
                   { step: 6, label: 'Refund Processing', short: 'Refunding' },
                   { step: 7, label: 'Refund Completed', short: 'Done' }
                 ].map((s) => (
                   <div key={s.step} className="flex flex-col items-center gap-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300
                        ${isRejected && s.step <= 1
                          ? 'bg-rose-500 text-white border-2 border-rose-200'
                          : currentStep >= s.step 
                            ? 'bg-indigo-600 text-white border-2 border-indigo-100 dark:border-indigo-900 scale-110' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-700'}`}
                      >
                         {currentStep > s.step ? <CheckCircle size={14} /> : s.step}
                      </div>
                      <p className={`text-[10px] font-semibold text-center leading-tight max-w-[64px] ${currentStep >= s.step ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400'}`}>
                         {s.short}
                      </p>
                   </div>
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
