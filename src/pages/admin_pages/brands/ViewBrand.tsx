import { useParams, useNavigate } from 'react-router-dom';
import { Tag, Image as ImageIcon } from 'lucide-react';
import { Badge } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetBrandsDetailsById } from '../../../hooks/brands';
import { useEffect } from 'react';

// Interface for API response
interface BrandResponse {
  id: number;
  name: string;
  image: string;
  status: 'active' | 'inactive';
  [key: string]: any;
}

// Interface for hook response data structure
interface BrandResponseData {
  data: BrandResponse;
  [key: string]: any;
}

const ViewBrand = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetBrandsDetailsById(id || '');

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);
  
  // Cast the response data to our interface
  const responseData = data as BrandResponseData;
  const brand = responseData?.data;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading brand...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Brand not found</p>
          <button
            onClick={() => navigate('/products/brands')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Brand Details</h1>
        <div className="flex items-center gap-3">
          <Badge
            status={brand.status}
            size="sm"
            customColor={brand.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 text-gray-800'}
            className="rounded"
          />
          <BackButton to="/products/brands" />
        </div>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Tag size={18} className="text-green-600 dark:text-green-400" />
              Basic Information
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">ID</p>
              <p className="text-sm font-semibold text-gray-800">{brand.id}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Brand Name</p>
              <p className="text-sm font-semibold text-gray-800">{brand.name}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  brand.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {brand.status}
              </span>
            </div>
          </div>

          {/* Image */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <ImageIcon size={18} className="text-green-600 dark:text-green-400" />
              Brand Image
            </h2>
            
            <div>
              {brand.image ? (
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="w-48 h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <ImageIcon size={48} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBrand;