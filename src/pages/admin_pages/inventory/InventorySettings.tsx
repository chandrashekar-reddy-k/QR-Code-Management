import { useInventory } from '../../../hooks/useInventory';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

const InventorySettings = () => {
  const { locations, settings, setSettings } = useInventory();

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory Settings</h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Locations and Thresholds - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Locations Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Locations</h2>
          <div className="space-y-2">
            {locations.map((loc) => (
              <div key={loc.code} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{loc.name}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Code: {loc.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thresholds Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Thresholds</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status Rules</h3>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>If available &lt; 0 → <span className="font-medium text-orange-600 dark:text-orange-400">Negative Stock</span></li>
                <li>If available &gt; safetyStock → <span className="font-medium text-green-600 dark:text-green-400">In Stock</span></li>
                <li>If available &gt; 0 and available ≤ safetyStock → <span className="font-medium text-amber-600 dark:text-amber-400">Low Stock</span></li>
                <li>If available ≤ 0 and inbound &gt; 0 → <span className="font-medium text-blue-600 dark:text-blue-400">Coming Soon</span></li>
                <li>If available ≤ 0 and inbound = 0 → <span className="font-medium text-red-600 dark:text-red-400">Out of Stock</span></li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default Safety Stock</label>
              <input
                type="number"
                value={settings.defaultSafetyStock}
                onChange={(e) => setSettings((prev) => ({ ...prev, defaultSafetyStock: parseInt(e.target.value) || 0 }))}
                className="w-full max-w-xs px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default Reorder Point</label>
              <input
                type="number"
                value={settings.defaultReorderPoint}
                onChange={(e) => setSettings((prev) => ({ ...prev, defaultReorderPoint: parseInt(e.target.value) || 0 }))}
                className="w-full max-w-xs px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventorySettings;

