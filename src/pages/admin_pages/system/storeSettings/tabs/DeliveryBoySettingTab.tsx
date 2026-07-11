import { TextInput, SelectInput } from '../../../../../components/ui';

interface DeliveryBoySettingTabProps {
  formData: {
    bonusType: string;
    commission: string;
    deliveryBoyBonusPercentage: string;
    minimumBonusAmount: string;
    maximumBonusAmount: string;
    orderDeliveryOTP: boolean;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const DeliveryBoySettingTab = ({ formData, onChange }: DeliveryBoySettingTabProps) => {
  return (
    <div className="space-y-6">
      {/* Bonus Settings Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Bonus Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bonus Type */}
          <div>
            <SelectInput
              label="Bonus Type"
              name="bonusType"
              value={formData.bonusType}
              onChange={onChange}
              options={[
                { value: '', label: 'Select Bonus Type' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'percentage', label: 'Percentage' },
              ]}
            />
          </div>

          {/* Commission (%) */}
          <div>
            <TextInput
              label="Commission (%)"
              type="number"
              name="commission"
              value={formData.commission}
              onChange={onChange}
              min="0"
              step="0.01"
              placeholder="Enter commission percentage"
            />
          </div>

          {/* Delivery Boy Bonus Percentage (%) */}
          <div>
            <TextInput
              label="Delivery Boy Bonus Percentage(%)"
              type="number"
              name="deliveryBoyBonusPercentage"
              value={formData.deliveryBoyBonusPercentage}
              onChange={onChange}
              min="0"
              step="0.01"
            />
          </div>

          {/* Minimum bonus amount */}
          <div>
            <TextInput
              label="Minimum bonus amount"
              type="number"
              name="minimumBonusAmount"
              value={formData.minimumBonusAmount}
              onChange={onChange}
              min="0"
              step="0.01"
            />
            <p className="text-[10px] text-gray-500 mt-1">Set 0 if you want to remove limit.</p>
          </div>

          {/* Maximum bonus amount */}
          <div>
            <TextInput
              label="Maximum bonus amount"
              type="number"
              name="maximumBonusAmount"
              value={formData.maximumBonusAmount}
              onChange={onChange}
              min="0"
              step="0.01"
            />
            <p className="text-[10px] text-gray-500 mt-1">Set 0 if you want to remove limit.</p>
          </div>
        </div>
      </div>

      {/* Order Delivery OTP System */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Order Delivery OTP System
            </label>
            <p className="text-[10px] text-gray-500">Enable OTP verification for order delivery</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="orderDeliveryOTP"
              checked={formData.orderDeliveryOTP}
              onChange={onChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default DeliveryBoySettingTab;

