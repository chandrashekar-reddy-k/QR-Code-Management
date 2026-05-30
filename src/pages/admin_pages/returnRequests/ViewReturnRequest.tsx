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
// import { returnRequestsAPI } from '../../../lib/api';
import { ReturnRequest } from "../../../types";
import { formatDate, formatCurrency } from "../../../utils/formatters";
import { Badge } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// Mock data for return requests (same as ManageReturnRequests)
const mockReturnRequests: ReturnRequest[] = [
  {
    id: 1,
    userId: 201,
    name: 'Rajesh Kumar',
    productName: 'iPhone 15 Pro',
    quantity: 1,
    total: 75000.00,
    status: 'pending',
    reason: 'Product damaged on delivery',
    date: '2025-01-15T10:30:00Z',
  },
  {
    id: 2,
    userId: 202,
    name: 'Priya Sharma',
    productName: 'Cotton T-Shirt',
    quantity: 2,
    total: 1200.00,
    status: 'approved',
    reason: 'Wrong size received',
    date: '2025-01-16T14:20:00Z',
  },
  {
    id: 3,
    userId: 203,
    name: 'Amit Patel',
    productName: 'Samsung Galaxy S24',
    quantity: 1,
    total: 65000.00,
    status: 'rejected',
    reason: 'Changed my mind',
    date: '2025-01-17T09:15:00Z',
  },
  {
    id: 4,
    userId: 204,
    name: 'Sneha Reddy',
    productName: 'Denim Jeans',
    quantity: 1,
    total: 1800.00,
    status: 'completed',
    reason: 'Product quality not as expected',
    date: '2025-01-18T16:45:00Z',
  },
  {
    id: 5,
    userId: 205,
    name: 'Vikram Singh',
    productName: 'Wireless Headphones',
    quantity: 1,
    total: 2500.00,
    status: 'pending',
    reason: 'Product not working properly',
    date: '2025-01-19T11:30:00Z',
  },
  {
    id: 6,
    userId: 206,
    name: 'Anjali Mehta',
    productName: 'Running Shoes',
    quantity: 1,
    total: 3200.00,
    status: 'approved',
    reason: 'Wrong color received',
    date: '2025-01-20T13:20:00Z',
  },
];

const ViewReturnRequest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        // Using mock data for now - replace with API call when ready
        // const data = await returnRequestsAPI.getById(parseInt(id || '0'));
        const foundRequest = mockReturnRequests.find((r) => r.id === parseInt(id || '0'));
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          alert('Return request not found!');
          navigate('/return-requests');
        }
      } catch (error) {
        console.error('Error fetching return request:', error);
        alert('Error fetching return request. Please try again.');
        navigate('/return-requests');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRequest();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading return request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Return request not found</p>
          <BackButton to="/return-requests" className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Return Request Details
        </h1>
        <BackButton to="/return-requests" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="space-y-6">
          {/* Request ID and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Hash size={16} className="text-gray-500 dark:text-gray-400" />
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Request ID</label>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">#{request.id}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Status</label>
              </div>
              <Badge status={request.status} size="sm" />
            </div>
          </div>

          {/* Customer Information */}
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <User size={16} className="text-gray-500 dark:text-gray-400" />
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Customer Information</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">User ID</label>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{request.userId}</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Customer Name</label>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{request.name}</p>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Package size={16} className="text-gray-500 dark:text-gray-400" />
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Product Information</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Product Name</label>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{request.productName}</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Quantity</label>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{request.quantity}</p>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <DollarSign size={16} className="text-gray-500 dark:text-gray-400" />
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Financial Information</label>
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Total Amount</label>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatCurrency(request.total)}</p>
            </div>
          </div>

          {/* Return Reason */}
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <FileText size={16} className="text-gray-500 dark:text-gray-400" />
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Return Reason</label>
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{request.reason}</p>
            </div>
          </div>

          {/* Date Information */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Date Information</label>
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Request Date</label>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDate(request.date)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReturnRequest;

