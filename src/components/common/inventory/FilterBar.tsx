import { Search } from 'lucide-react';

interface FilterBarProps {
  locations: { code: string; name: string }[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  statuses: { value: string; label: string }[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const FilterBar = ({
  locations,
  selectedLocation,
  onLocationChange,
  statuses,
  selectedStatus,
  onStatusChange,
  searchTerm,
  onSearchChange,
}: FilterBarProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Location Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
          <select
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="All">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => onStatusChange(status.value)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  selectedStatus === status.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Product name or SKU..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;

