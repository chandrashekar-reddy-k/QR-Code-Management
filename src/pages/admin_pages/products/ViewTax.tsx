import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Percent } from 'lucide-react';
import { Badge } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetTaxDetailsById } from '../../../hooks/tax';

// Interface for API response
interface ApiTaxResponse {
  id: string;
  title: string;
  percentage: string | number;
  status?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Interface for the hook response data structure
interface TaxResponseData {
  data: ApiTaxResponse;
  [key: string]: any;
}

const ViewTax = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data, isLoading, refetch } = useGetTaxDetailsById(id || '');

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as TaxResponseData | undefined;
  const tax = responseData?.data;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading tax...</p>
        </div>
      </div>
    );
  }

  if (!tax) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Tax not found</p>
          <button
            onClick={() => navigate('/products/taxes')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const percentageValue = typeof tax.percentage === 'string' ? parseFloat(tax.percentage) : tax.percentage;
  const status = (tax.status?.toLowerCase() === 'active' || tax.status === 'ACTIVE') ? 'active' : 'inactive';

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Tax Details</h1>
        <div className="flex items-center gap-3">
          <Badge
            status={status}
            size="sm"
            customColor={status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800'}
            className="rounded"
          />
          <BackButton to="/products/taxes" />
        </div>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Percent size={18} className="text-green-600 dark:text-green-400" />
              Tax Information
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">ID</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tax.id.slice(0, 8)}...</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Title</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tax.title}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
                <Percent size={12} />
                Percentage
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{percentageValue || 0}%</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-700'
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTax;

