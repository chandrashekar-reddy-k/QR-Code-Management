import { useParams, useNavigate } from 'react-router-dom';
import { formatDate } from "../../../../utils/formatters";
import Breadcrumbs from '../../../../components/common/Breadcrumbs';
import BackButton from '../../../../components/common/BackButton';
import { useGetAttributeById } from '../../../../hooks/attribute';

interface Attribute {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

const ViewAttribute = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useGetAttributeById(id);

  // Transform API response to component format
  const attribute: Attribute | null = data?.data ? {
    id: data.data.id,
    name: data.data.name,
    type: data.data.type,
    isRequired: data.data.isRequired,
    isFilterable: data.data.isFilterable,
    isSearchable: data.data.isSearchable,
    displayOrder: data.data.displayOrder,
    status: data.data.status === 'ACTIVE' ? 'active' : 'inactive',
    createdAt: data.data.createdAt,
    updatedAt: data.data.updatedAt,
  } : null;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading attribute...</p>
        </div>
      </div>
    );
  }

  if (!attribute) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Attribute not found</p>
          <button
            onClick={() => navigate('/master-setup/attributes')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      TEXT: 'Text',
      SINGLE_SELECT: 'Select (Single Choice)',
      MULTI_SELECT: 'Multi-Select (Multiple Choice)',
      NUMBER: 'Number',
      BOOLEAN: 'Boolean (Yes/No)',
      DATE: 'Date',
      text: 'Text',
      select: 'Select (Single Choice)',
      multiselect: 'Multi-Select (Multiple Choice)',
      number: 'Number',
      boolean: 'Boolean (Yes/No)',
      date: 'Date',
    };
    return labels[type] || type;
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">View Attribute</h1>
        <BackButton to="/master-setup/attributes" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Three Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Basic Information Card - Top Left */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">Basic Information</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={attribute.status === 'active'}
                  onChange={() => {
                    // In real app, this would update the status via API
                    console.log('Toggle status');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
        </div>
      </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Attribute</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{attribute.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Attribute Type</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{getTypeLabel(attribute.type)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Display Order</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{attribute.displayOrder}</p>
            </div>
            </div>
          </div>

        {/* Options & Settings Card - Bottom Left */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Options & Settings</h2>

            <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Required</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{attribute.isRequired ? 'Yes' : 'No'}</p>
              </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filterable</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{attribute.isFilterable ? 'Yes' : 'No'}</p>
              </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Searchable</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{attribute.isSearchable ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAttribute;
