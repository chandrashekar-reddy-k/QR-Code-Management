import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../../../hooks/useInventory';
import { TextInput, FormSection, PrimaryButton, BackButton } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

const AdjustStock = () => {
  const { variantId, locationCode } = useParams<{ variantId: string; locationCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { snapshots, adjustStock } = useInventory();
  
  const [adjustmentType, setAdjustmentType] = useState<'Increase' | 'Decrease'>('Increase');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Get snapshot from route params or location state
  const snapshot = snapshots.find(
    (s) => s.variantId === variantId && s.locationCode === locationCode
  ) || (location.state?.snapshot as any);

  useEffect(() => {
    if (!snapshot && variantId && locationCode) {
      // If snapshot not found, redirect back
      navigate('/inventory/overview');
    }
  }, [snapshot, variantId, locationCode, navigate]);

  if (!snapshot) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="mb-3 mt-3">
          <BackButton onClick={() => navigate('/inventory/overview')} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Snapshot not found. Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || !reason || parseInt(qty) <= 0) {
      alert('Please fill in all required fields with valid values');
      return;
    }
    adjustStock(
      snapshot.variantId,
      snapshot.locationCode,
      adjustmentType === 'Increase' ? parseInt(qty) : -parseInt(qty),
      reason,
      notes
    );
    alert('Stock adjusted successfully!');
    navigate('/inventory/overview');
  };

  const handleCancel = () => {
    navigate('/inventory/overview');
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Adjust Stock
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Adjust Stock Form */}
      <FormSection
        title="Adjust Stock"
        description={`Adjusting stock for ${snapshot.productName} - ${snapshot.variantLabel}`}
        onSubmit={handleAdjustStock}
        variant="white"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TextInput
            label="Product Name"
            value={snapshot.productName}
            disabled
            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
          />
          <TextInput
            label="SKU"
            value={snapshot.sku}
            disabled
            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
          />
          <TextInput
            label="Location"
            value={snapshot.locationName}
            disabled
            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
          />
          <TextInput
            label="Current On Hand"
            value={snapshot.onHand.toString()}
            disabled
            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Adjustment Type <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'Increase' | 'Decrease')}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="Increase">Increase</option>
              <option value="Decrease">Decrease</option>
            </select>
          </div>
          <TextInput
            label="Quantity"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Enter quantity"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Reason <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Select reason</option>
              <option value="Stock correction">Stock correction</option>
              <option value="Damage">Damage</option>
              <option value="Expiry">Expiry</option>
              <option value="Shrinkage">Shrinkage</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
          >
            Cancel
          </button>
          <PrimaryButton
            type="submit"
            className="flex-1"
          >
            Adjust Stock
          </PrimaryButton>
        </div>
      </FormSection>
    </div>
  );
};

export default AdjustStock;

