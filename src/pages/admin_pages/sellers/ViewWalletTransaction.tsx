import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { formatCurrency, formatDate } from "../../../utils/formatters";
import { WalletTransaction } from '../../../types';

// Mock data - in real app, fetch from API using the ID
// Using the same mock data as SellerWalletTransactions
const mockTransactions: WalletTransaction[] = [
  {
    id: 1,
    vendorId: 1,
    vendorName: 'Rajesh Kumar',
    orderId: 242,
    orderItemId: 500,
    productName: 'Stainless Steel Water Bottle',
    measurement: '1 PC',
    type: 'Credit',
    amount: 122.4,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T07:40:19Z',
  },
  {
    id: 2,
    vendorId: 2,
    vendorName: 'Priya Sharma',
    orderId: 243,
    orderItemId: 501,
    productName: 'Cotton T-Shirt',
    measurement: '1 PC',
    type: 'Credit',
    amount: 89.85,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T08:15:30Z',
  },
  {
    id: 3,
    vendorId: 1,
    vendorName: 'Rajesh Kumar',
    orderId: 244,
    orderItemId: 502,
    productName: 'Wireless Headphones',
    measurement: '1 PC',
    type: 'Credit',
    amount: 374.85,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T09:20:45Z',
  },
  {
    id: 4,
    vendorId: 4,
    vendorName: 'Sneha Reddy',
    orderId: 245,
    orderItemId: 503,
    productName: 'Face Serum',
    measurement: '30ml',
    type: 'Credit',
    amount: 179.82,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T10:30:12Z',
  },
  {
    id: 5,
    vendorId: 3,
    vendorName: 'Amit Patel',
    orderId: 246,
    orderItemId: 504,
    productName: 'Organic Honey',
    measurement: '500g',
    type: 'Credit',
    amount: 49.9,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T11:45:28Z',
  },
  {
    id: 6,
    vendorId: 2,
    vendorName: 'Priya Sharma',
    orderId: 247,
    orderItemId: 505,
    productName: 'Denim Jeans',
    measurement: '1 PC',
    type: 'Debit',
    amount: 250.0,
    message: 'Withdrawal',
    status: 'Active',
    date: '2025-11-15T12:00:00Z',
  },
];

const ViewWalletTransaction = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // In real app, fetch from API using the ID
  const transaction = mockTransactions.find(t => t.id === parseInt(id || '0'));

  if (!transaction) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Transaction not found</p>
          <button
            onClick={() => navigate('/vendors/wallet-transactions')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Transaction Details</h1>
        <BackButton to="/vendors/wallet-transactions" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Transaction Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Transaction ID</p>
              <p className="text-sm text-gray-800">{transaction.id}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Vendor</p>
              <p className="text-sm text-gray-800">{transaction.vendorName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Order ID</p>
              <p className="text-sm text-gray-800">{transaction.orderId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Product Name</p>
              <p className="text-sm text-gray-800">{transaction.productName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Type</p>
              <Badge
                status={transaction.type}
                size="sm"
                customColor={transaction.type === 'Credit' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'}
                className="rounded"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Amount</p>
              <p className={`text-sm font-medium ${transaction.type === 'Credit' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {formatCurrency(transaction.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
              <Badge
                status={transaction.status}
                size="sm"
                customColor={transaction.status === 'Active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 text-gray-800'}
                className="rounded"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Date</p>
              <p className="text-sm text-gray-800">{formatDate(transaction.date, 'DD-MM-YYYY, HH:mm A')}</p>
            </div>
            <div className="col-span-1 md:col-span-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Message</p>
              <p className="text-sm text-gray-800">{transaction.message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewWalletTransaction;

