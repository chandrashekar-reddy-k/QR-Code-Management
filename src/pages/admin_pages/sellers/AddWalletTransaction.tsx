import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PrimaryButton, Button, TextInput, SelectInput, FormSectionWithDots } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { WalletTransactionFormData } from '../../../types';

// Mock vendors - in real app, this would come from API
const mockVendors = [
  { id: 1, name: 'Rajesh Kumar' },
  { id: 2, name: 'Priya Sharma' },
  { id: 3, name: 'Amit Patel' },
  { id: 4, name: 'Sneha Reddy' },
  { id: 5, name: 'Vikram Singh' },
];

const AddWalletTransaction = () => {
  const navigate = useNavigate();
  const [vendors] = useState(mockVendors);
  const [formData, setFormData] = useState<WalletTransactionFormData>({
    vendorId: 0,
    type: 'Credit',
    amount: 0,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        // await walletTransactionsAPI.create(formData);
        alert('Transaction added successfully!');
        navigate('/vendors/wallet-transactions');
      } catch (error: any) {
        console.error('Error creating transaction:', error);
        alert(error.message || 'Error creating transaction. Please try again.');
      }
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Add Wallet Transaction</h1>
        <BackButton to="/vendors/wallet-transactions" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <FormSectionWithDots title="Transaction Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Message <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Enter Message."
                  rows={3}
                  className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
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
              <span>Save Transaction</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWalletTransaction;

