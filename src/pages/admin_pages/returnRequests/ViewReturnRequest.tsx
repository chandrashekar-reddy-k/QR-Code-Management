import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  Package,
  Hash,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react";
import { useGetReturnRequestById } from "../../../hooks/returnRequest";
import { toast } from "react-toastify";
import { ReturnRequest } from "../../../types";
import { formatDate, formatCurrency } from "../../../utils/formatters";
import { Badge } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";



const ViewReturnRequest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: apiData, isLoading: loading, isError } = useGetReturnRequestById(id);
  const [request, setRequest] = useState<ReturnRequest | null>(null);

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

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading return request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Return request not found</p>
          <BackButton to="/return-requests" className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Return Request Details
        </h1>
        <BackButton to="/return-requests" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="space-y-6">
          {/* Request ID and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Hash size={16} className="text-gray-500" />
                <label className="text-[10px] font-medium text-gray-500 uppercase">Request ID</label>
              </div>
              <p className="text-sm font-semibold text-gray-800">#{request.id}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] font-medium text-gray-500 uppercase">Status</label>
              </div>
              <Badge status={request.status} size="sm" />
            </div>
          </div>

          {/* Customer Information */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <User size={16} className="text-gray-500" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Customer Information</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase mb-1 block">User ID</label>
                <p className="text-sm font-semibold text-gray-800">{request.userId}</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase mb-1 block">Customer Name</label>
                <p className="text-sm font-semibold text-gray-800">{request.name}</p>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <Package size={16} className="text-gray-500" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Product Information</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase mb-1 block">Product Name</label>
                <p className="text-sm font-semibold text-gray-800">{request.productName}</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase mb-1 block">Quantity</label>
                <p className="text-sm font-semibold text-gray-800">{request.quantity}</p>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <DollarSign size={16} className="text-gray-500" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Financial Information</label>
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-medium text-gray-500 uppercase mb-1 block">Total Amount</label>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(request.total)}</p>
            </div>
          </div>

          {/* Return Reason */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <FileText size={16} className="text-gray-500" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Return Reason</label>
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{request.reason}</p>
            </div>
          </div>

          {/* Date Information */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <Calendar size={16} className="text-gray-500" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Date Information</label>
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-medium text-gray-500 uppercase mb-1 block">Request Date</label>
              <p className="text-sm font-semibold text-gray-800">{formatDate(request.date)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReturnRequest;

