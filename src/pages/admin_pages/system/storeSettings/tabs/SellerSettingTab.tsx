import { TextInput } from '../../../../../components/ui';

interface SellerSettingTabProps {
  formData: {
    oneSellerCart: boolean;
    sellerCommission: string;
    selfPickupMode: boolean;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SellerSettingTab = ({ formData, onChange }: SellerSettingTabProps) => {
  return (
    <div className="space-y-6">
      {/* One Seller Cart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            One Seller Cart( Enable/Disable )
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="oneSellerCart"
              checked={formData.oneSellerCart}
              onChange={onChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>

      {/* Seller Commission */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div>
          <TextInput
            label="Seller Commission (%)"
            type="number"
            name="sellerCommission"
            value={formData.sellerCommission}
            onChange={onChange}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Self Pickup Mode */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Self Pickup Mode( Enable/Disable )
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="selfPickupMode"
              checked={formData.selfPickupMode}
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

export default SellerSettingTab;

