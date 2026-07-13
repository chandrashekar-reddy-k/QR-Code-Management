import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PrimaryButton, Button, TextInput, SelectInput, FormSectionWithDots } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { WalletTransaction, WalletTransactionFormData } from '../../../types';

// Mock data - in real app, this would come from API
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

const mockVendors = [
  { id: 1, name: 'Rajesh Kumar' },
  { id: 2, name: 'Priya Sharma' },
  { id: 3, name: 'Amit Patel' },
  { id: 4, name: 'Sneha Reddy' },
  { id: 5, name: 'Vikram Singh' },
];

const EditWalletTransaction = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [vendors] = useState(mockVendors);
  const [formData, setFormData] = useState<WalletTransactionFormData>({
    vendorId: 0,
    type: 'Credit',
    amount: 0,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Load transaction data for editing
      const transaction = mockTransactions.find(t => t.id === parseInt(id));
      if (transaction) {
        setFormData({
          vendorId: transaction.vendorId,
          type: transaction.type,
          amount: transaction.amount,
          message: transaction.message,
        });
      } else {
        alert('Transaction not found');
        navigate('/vendors/wallet-transactions');
      }
      setLoading(false);
    }
  }, [id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'vendorId' || name === 'amount' ? (value ? parseFloat(value) : 0) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendorId || formData.vendorId === 0) {
      newErrors.vendorId = 'Vendor is required';
    }
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        // Using mock data for now - replace with API call when ready
        // await walletTransactionsAPI.update(id, formData);
        alert('Transaction updated successfully!');
        navigate('/vendors/wallet-transactions');
      } catch (error: any) {
        console.error('Error updating transaction:', error);
        alert(error.message || 'Error updating transaction. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading transaction...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Edit Wallet Transaction</h1>
        <BackButton to="/vendors/wallet-transactions" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <FormSectionWithDots title="Transaction Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Vendor <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <SelectInput
                  name="vendorId"
                  value={formData.vendorId.toString()}
                  onChange={handleChange}
                  options={[
                    { value: '0', label: 'Select & Search Vendor' },
                    ...vendors.map((vendor) => ({ value: vendor.id.toString(), label: vendor.name })),
                  ]}
                  error={errors.vendorId}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Type <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <SelectInput
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  options={[
                    { value: 'Credit', label: 'Credit' },
                    { value: 'Debit', label: 'Debit' },
                  ]}
                  error={errors.type}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Amount <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <TextInput
                  type="number"
                  name="amount"
                  value={formData.amount || ''}
                  onChange={handleChange}
                  placeholder="Enter Transfer Amount"
                  step="0.01"
                  min="0"
                  error={errors.amount}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Message <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Enter Message."
                  rows={3}
                  className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 ${
                    errors.message ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500'
                  }`}
                />
                {errors.message && <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{errors.message}</p>}
              </div>
            </div>
          </FormSectionWithDots>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/vendors/wallet-transactions')}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>Update Transaction</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditWalletTransaction;

