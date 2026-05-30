import { useState } from 'react';
import { X } from 'lucide-react';
import { InventorySnapshot } from '../../../types/inventory.types';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: InventorySnapshot | null;
  onAdjust: (variantId: string, locationCode: string, adjustmentType: 'Increase' | 'Decrease', qty: number, reason: string, notes: string) => void;
}

const AdjustStockModal = ({ isOpen, onClose, snapshot, onAdjust }: AdjustStockModalProps) => {
  const [adjustmentType, setAdjustmentType] = useState<'Increase' | 'Decrease'>('Increase');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !snapshot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || !reason || parseInt(qty) <= 0) {
      alert('Please fill in all required fields with valid values');
      return;
    }
    onAdjust(snapshot.variantId, snapshot.locationCode, adjustmentType, parseInt(qty), reason, notes);
    // Reset form
    setAdjustmentType('Increase');
    setQty('');
    setReason('');
    setNotes('');
    onClose();
  };

  const handleClose = () => {
    setAdjustmentType('Increase');
    setQty('');
    setReason('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Adjust Stock</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Read-only fields */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
            <input
              type="text"
              value={snapshot.productName}
              disabled
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
            <input
              type="text"
              value={snapshot.sku}
              disabled
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={snapshot.locationName}
              disabled
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current On Hand</label>
            <input
              type="text"
              value={snapshot.onHand}
              disabled
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Adjustment Type <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'Increase' | 'Decrease')}
              className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="Increase">Increase</option>
              <option value="Decrease">Decrease</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Quantity <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Enter quantity"
              className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Reason <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium"
            >
              Adjust Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustStockModal;

