import { Plus, X } from 'lucide-react';
import { TextInput } from '../../../../../components/ui';

interface Charge {
  id: string;
  chargeTitle: string;
  chargeAmount: string;
}

interface AdditionalChargesTabProps {
  charges: Charge[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: 'chargeTitle' | 'chargeAmount', value: string) => void;
}

const AdditionalChargesTab = ({ charges, onAdd, onRemove, onChange }: AdditionalChargesTabProps) => {
  return (
    <div className="space-y-6">
      {/* Additional Charges Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Additional Charges</h3>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {charges.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
            No additional charges added. Click "Add" to add a new charge.
          </div>
        ) : (
          <div className="space-y-4">
            {charges.map((charge, index) => (
              <div
                key={charge.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Charge #{index + 1}
                  </span>
                  {charges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemove(charge.id)}
                      className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remove charge"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Charge Title */}
                  <div>
                    <TextInput
                      label="Charge Title"
                      value={charge.chargeTitle}
                      onChange={(e) => onChange(charge.id, 'chargeTitle', e.target.value)}
                      placeholder="Enter charge title"
                    />
                  </div>

                  {/* Charge Amount */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Charge Amount
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">₹</span>
                      <TextInput
                        type="number"
                        value={charge.chargeAmount}
                        onChange={(e) => onChange(charge.id, 'chargeAmount', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="Enter charge amount"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdditionalChargesTab;

