import { useParams, useNavigate } from 'react-router-dom';
import { FolderTree, Image as ImageIcon } from 'lucide-react';
import { Badge } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetCategoryDetailsById } from '../../../hooks/category';
import { useEffect } from 'react';

// Interface for API response
interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  categorySubtitle: string;
  image?: string | null;
  isActive?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[] | null;
  schemaMarkup?: string | object | null;
  description?: string | null;
  colorCode?: string | null;
  icon?: string | null;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  parentId?: string | null;
  [key: string]: any;
}

// Interface for hook response data structure
interface CategoryResponseData {
  data: CategoryResponse;
  [key: string]: any;
}

// Groceries category images (fallback)
const categoryImages = [
  'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop', // Fruits & Vegetables
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop', // Dairy Products
  'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=400&fit=crop', // Grains & Pulses
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop', // Spices & Condiments
  'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=400&fit=crop', // Beverages
  'https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=400&h=400&fit=crop', // Snacks & Sweets
  'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=400&fit=crop', // Personal Care
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop', // Household Items
];

const ViewCategory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetCategoryDetailsById(id || '');


  useEffect(()=>{
   if(id){
refetch();
   }
  },[id])
  
  // Cast the response data to our interface
  const responseData = data as CategoryResponseData;
  const category = responseData?.data;

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get a random fallback image
  const getFallbackImage = () => {
    const randomIndex = Math.floor(Math.random() * categoryImages.length);
    return categoryImages[randomIndex];
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading category...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Category not found</p>
          <button
            onClick={() => navigate('/categories/manage')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const status = category.isActive ? 'active' : 'inactive';

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Category Details</h1>
        <div className="flex items-center gap-3">
          <Badge
            status={status}
            size="sm"
            customColor={status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800'}
            className="rounded"
          />
          <BackButton to="/categories/manage" />
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
              <FolderTree size={18} className="text-green-600 dark:text-green-400" />
              Basic Information
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">ID</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{category.id || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Parent ID</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{category.parentId || 'None (Main Category)'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Name</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{category.name || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Slug</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{category.slug || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Subtitle</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{category.categorySubtitle || category.subtitle || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Display Order</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{category.displayOrder !== undefined ? category.displayOrder : 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{category.description || 'N/A'}</p>
            </div>
          </div>

          {/* Image & Status */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <ImageIcon size={18} className="text-green-600 dark:text-green-400" />
              Image & Status
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Category Image</p>
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name || 'Category'}
                  className="w-48 h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <ImageIcon size={48} className="text-gray-400 dark:text-gray-500" />
                </div>
              )}
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

            {category.colorCode && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Color Code</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: category.colorCode }}
                  />
                  <p className="text-sm text-gray-700 dark:text-gray-300">{category.colorCode}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Created At</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(category.createdAt)}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Updated At</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(category.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* SEO Information */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
            SEO Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Meta Title</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{category.metaTitle || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Meta Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{category.metaDescription || 'N/A'}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Meta Keywords</p>
              <div className="flex flex-wrap gap-1">
                {category.metaKeywords && category.metaKeywords.length > 0 ? (
                  category.metaKeywords.map((keyword, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                    >
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300">N/A</p>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Schema Markup</p>
              <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg overflow-auto max-h-40">
                {category.schemaMarkup ? 
                  (typeof category.schemaMarkup === 'object' ? 
                    JSON.stringify(category.schemaMarkup, null, 2) : 
                    String(category.schemaMarkup)
                  ) : 
                  'N/A'
                }
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCategory;