import { TextInput } from '../../../../../components/ui';

interface CartSettingTabProps {
  formData: {
    notificationDelayAfterCartAddition: string;
    notificationInterval: string;
    notificationStopTime: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CartSettingTab = ({ formData, onChange }: CartSettingTabProps) => {
  return (
    <div className="space-y-6">
      {/* Cart Notification Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Cart Notification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notification Delay After Cart Addition */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Notification Delay After Cart Addition <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <TextInput
                type="number"
                name="notificationDelayAfterCartAddition"
                value={formData.notificationDelayAfterCartAddition}
                onChange={onChange}
                min="1"
                className="flex-1"
              />
              <span className="text-xs text-gray-600 whitespace-nowrap">Minutes</span>
            </div>
          </div>

          {/* Notification Interval */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Notification Interval <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <TextInput
                type="number"
                name="notificationInterval"
                value={formData.notificationInterval}
                onChange={onChange}
                min="1"
                className="flex-1"
              />
              <span className="text-xs text-gray-600 whitespace-nowrap">Minutes</span>
            </div>
          </div>

          {/* Notification Stop Time */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Notification Stop Time <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <TextInput
                type="number"
                name="notificationStopTime"
                value={formData.notificationStopTime}
                onChange={onChange}
                min="1"
                className="flex-1"
              />
              <span className="text-xs text-gray-600 whitespace-nowrap">Minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSettingTab;

