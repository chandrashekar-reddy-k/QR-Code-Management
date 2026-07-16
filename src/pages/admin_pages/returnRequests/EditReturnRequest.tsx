import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetReturnRequestById, useApproveReturnItem, useRejectReturnItem } from "../../../hooks/returnRequest";
import { toast } from "react-toastify";
import { ReturnRequest } from '../../../types';
import { Badge } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { 
  Package, 
  Hash, 
  FileText, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  ShieldCheck,
  User
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';


const EditReturnRequest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ReturnRequest | null>(null);
  
  // State for rejection reasons keyed by orderItemId
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const { data: apiData, isLoading: loading, isError } = useGetReturnRequestById(id);
  const approveMutation = useApproveReturnItem(id);
  const rejectMutation = useRejectReturnItem(id);

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

  const handleApprove = async (orderItemId: string) => {
    try {
      await approveMutation.mutateAsync({ orderItemId });
    } catch (error) {
      console.error('Error approving item:', error);
    }
  };

  const handleReject = async (orderItemId: string) => {
    const reason = rejectReasons[orderItemId];
    if (!reason || !reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ orderItemId, reason });
      setRejectReasons(prev => ({ ...prev, [orderItemId]: '' }));
    } catch (error) {
      console.error('Error rejecting item:', error);
    }
  };

  const handleReasonChange = (orderItemId: string, value: string) => {
    setRejectReasons(prev => ({ ...prev, [orderItemId]: value }));
  };

  const metrics = useMemo(() => {
    if (!request?.items) return { pending: 0 };
    return {
      pending: request.items.filter((i: any) => !i.status || i.status === 'pending' || i.status === 'PARTNER_APPROVAL_PENDING').length
    };
  }, [request]);

  if (loading) {
    return (
      <div className="w-full px-4 pb-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading interactive interface...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full px-4 pb-8 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-800 flex flex-col items-center max-w-md text-center">
           <AlertCircle className="text-rose-500 mb-3" size={32} />
           <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">Return request not found.</p>
           <BackButton to="/return-requests" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 relative min-h-screen">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 -z-10" />

      {/* Header */}
      <div className="mb-6 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight">
             Process Return
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

           <div className="flex flex-col items-end">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Items Awaiting Decision</p>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  {metrics.pending > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${metrics.pending > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                </span>
                <span className="font-bold text-slate-800 dark:text-white">{metrics.pending}</span>
              </div>
           </div>
        </div>

        <div className="p-6 sm:p-8">
           
           {/* Reason */}
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
                <ShieldCheck size={18} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Review Items</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {request.items && request.items.length > 0 ? (
                  request.items.map((item: any, index: number) => {
                    const isPending = !item.status || item.status === 'pending' || item.status === 'PARTNER_APPROVAL_PENDING';
                    
                    return (
                    <div key={item.id || index} className={`group flex flex-col lg:flex-row gap-6 p-6 rounded-2xl border transition-all duration-300 ${isPending ? 'bg-white/80 dark:bg-slate-800/80 border-indigo-200/60 dark:border-indigo-500/30 shadow-md hover:shadow-xl' : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-700/60 opacity-80'}`}>
                      
                      {/* Left: Item Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                             <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                               {item.productName}
                             </p>
                             {!isPending && <Badge status={item.status} size="sm" />}
                          </div>
                          <div className="space-y-1 mb-4 flex gap-4">
                             <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                               Qty: <span className="text-slate-800 dark:text-slate-200 font-bold">{item.quantity}</span>
                             </p>
                             <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                               Unit: <span className="text-slate-800 dark:text-slate-200">{formatCurrency(item.unitPrice)}</span>
                             </p>
                          </div>
                        </div>
                        
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Requested Refund</p>
                           <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      </div>
                      
                      {/* Right: Actions */}
                      <div className="w-full lg:w-96 flex flex-col justify-end">
                        {isPending ? (
                          <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                             <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Partner Decision</p>
                             
                             <div className="relative">
                               <input 
                                  type="text" 
                                  placeholder="Provide reason (required for reject)" 
                                  value={rejectReasons[item.id] || ''} 
                                  onChange={(e) => handleReasonChange(item.id, e.target.value)}
                                  className="w-full px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400"
                               />
                             </div>
                             
                             <div className="flex gap-3 mt-2">
                                <button 
                                  onClick={() => handleReject(item.id)}
                                  disabled={rejectMutation.isPending && rejectMutation.variables?.orderItemId === item.id}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50"
                                >
                                  <XCircle size={18} /> Reject
                                </button>
                                <button 
                                  onClick={() => handleApprove(item.id)}
                                  disabled={approveMutation.isPending && approveMutation.variables?.orderItemId === item.id}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50"
                                >
                                  <CheckCircle2 size={18} /> Approve
                                </button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end justify-end h-full">
                            <div className="text-center p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-auto">
                               <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Decision Logged</p>
                               <div className="flex justify-center">
                                  <Badge status={item.status} size="md" />
                               </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )})
                ) : (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed">
                    <Package size={48} className="mb-4 text-slate-400" />
                    <p className="text-sm font-medium text-slate-500">No detailed items available for this return.</p>
                  </div>
                )}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default EditReturnRequest;
