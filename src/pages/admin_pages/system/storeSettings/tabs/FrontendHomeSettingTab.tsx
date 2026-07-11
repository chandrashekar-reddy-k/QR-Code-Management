import { TextInput } from '../../../../../components/ui';

interface FrontendHomeSettingTabProps {
  formData: {
    displayCategorySection: boolean;
    categoryCount: string;
    displayBrandSection: boolean;
    brandCount: string;
    displaySellerSection: boolean;
    sellerCount: string;
    displayCountrySection: boolean;
    countryCount: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FrontendHomeSettingTab = ({ formData, onChange }: FrontendHomeSettingTabProps) => {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-xs text-gray-700">
          In this mode you can set your app/website Home page.
        </p>
      </div>

      {/* Category Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-medium text-gray-700 flex-1">
            Display Category Section in Home Page?
          </label>
          <div className="flex items-center gap-3">
            {formData.displayCategorySection && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">
                  Count Category Display in Homepage
                </label>
                <TextInput
                  type="number"
                  name="categoryCount"
                  value={formData.categoryCount}
                  onChange={onChange}
                  min="1"
                  className="w-20"
                />
              </div>
            )}
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                name="displayCategorySection"
                checked={formData.displayCategorySection}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Brand Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-medium text-gray-700 flex-1">
            Display Brand Section in Home Page?
          </label>
          <div className="flex items-center gap-3">
            {formData.displayBrandSection && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">
                  Count Brand Display in Homepage
                </label>
                <TextInput
                  type="number"
                  name="brandCount"
                  value={formData.brandCount}
                  onChange={onChange}
                  min="1"
                  className="w-20"
                />
              </div>
            )}
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                name="displayBrandSection"
                checked={formData.displayBrandSection}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Seller Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-medium text-gray-700 flex-1">
            Display Seller Section in Home Page?
          </label>
          <div className="flex items-center gap-3">
            {formData.displaySellerSection && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">
                  Count Seller Display in Homepage
                </label>
                <TextInput
                  type="number"
                  name="sellerCount"
                  value={formData.sellerCount}
                  onChange={onChange}
                  min="1"
                  className="w-20"
                />
              </div>
            )}
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                name="displaySellerSection"
                checked={formData.displaySellerSection}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Country Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-medium text-gray-700 flex-1">
            Display Country Section in Home Page?
          </label>
          <div className="flex items-center gap-3">
            {formData.displayCountrySection && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">
                  Count Country in Home Page
                </label>
                <TextInput
                  type="number"
                  name="countryCount"
                  value={formData.countryCount}
                  onChange={onChange}
                  min="1"
                  className="w-20"
                />
              </div>
            )}
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                name="displayCountrySection"
                checked={formData.displayCountrySection}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrontendHomeSettingTab;

