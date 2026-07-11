import { TextInput } from '../../../../../components/ui';

interface AppSettingTabProps {
  formData: {
    customerAppEnabled: boolean;
    sellerAppEnabled: boolean;
    deliveryBoyAppEnabled: boolean;
    playStoreUrl: string;
    appStoreUrl: string;
    androidVersionSystemStatus: boolean;
    androidRequiredForceUpdate: boolean;
    androidCurrentVersion: string;
    iosVersionSystemStatus: boolean;
    iosRequiredForceUpdate: boolean;
    iosCurrentVersion: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AppSettingTab = ({ formData, onChange }: AppSettingTabProps) => {
  return (
    <div className="space-y-6">
      {/* Maintenance Mode Section */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          In this mode you can set your app in Maintenance and that Application will not work till not disabled from here
        </h3>
        <div className="space-y-4">
          {/* Customer APP */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
            <label className="text-xs font-medium text-gray-700">
              Customer APP ( Enable/Disable )
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="customerAppEnabled"
                checked={formData.customerAppEnabled}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* Seller APP */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
            <label className="text-xs font-medium text-gray-700">
              Seller APP ( Enable/Disable )
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="sellerAppEnabled"
                checked={formData.sellerAppEnabled}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* Delivery Boy APP */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
            <label className="text-xs font-medium text-gray-700">
              Delivery Boy APP( Enable/Disable )
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="deliveryBoyAppEnabled"
                checked={formData.deliveryBoyAppEnabled}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Store URLs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Store URLs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Play Store Url */}
          <div>
            <TextInput
              label="Play Store Url"
              type="url"
              name="playStoreUrl"
              value={formData.playStoreUrl}
              onChange={onChange}
            />
          </div>

          {/* App Store Url */}
          <div>
            <TextInput
              label="App Store Url"
              type="url"
              name="appStoreUrl"
              value={formData.appStoreUrl}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      {/* Android Version Settings */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Android Version System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Android Version System Status */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
            <label className="text-xs font-medium text-gray-700">
              Android Version System Status
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="androidVersionSystemStatus"
                checked={formData.androidVersionSystemStatus}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* Android Required Force Update */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
            <label className="text-xs font-medium text-gray-700">
              Android Required Force Update
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="androidRequiredForceUpdate"
                checked={formData.androidRequiredForceUpdate}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* Android Current Version Of App */}
          <div>
            <TextInput
              label="Android Current Version Of App"
              name="androidCurrentVersion"
              value={formData.androidCurrentVersion}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      {/* IOS Version Settings */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">IOS Version System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IOS Version System Status */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
            <label className="text-xs font-medium text-gray-700">
              IOS Version System Status
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="iosVersionSystemStatus"
                checked={formData.iosVersionSystemStatus}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* IOS Required Force Update */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
            <label className="text-xs font-medium text-gray-700">
              IOS Required Force Update
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="iosRequiredForceUpdate"
                checked={formData.iosRequiredForceUpdate}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* IOS Current Version Of App */}
          <div>
            <TextInput
              label="IOS Current Version Of App"
              name="iosCurrentVersion"
              value={formData.iosCurrentVersion}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettingTab;

