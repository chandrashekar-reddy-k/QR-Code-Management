import { useParams, useNavigate } from 'react-router-dom';
import { FolderTree, Image as ImageIcon, Layers } from 'lucide-react';
import { Badge } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetSubCategoryDetailsById } from '../../../hooks/subCategory';
import { useGetAllCategoryList } from '../../../hooks/category';
import { useEffect, useMemo } from 'react';

// Interface for API response
interface ApiSubCategoryResponse {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  image?: string | null;
  categoryId: string;
  isActive?: boolean;
  metaTitle?: string | null;
  metaKeyword?: string | null;
  metaDescription?: string | null;
  schemaMarkup?: string | object | null;
  description?: string | null;
  colorCode?: string | null;
  icon?: string | null;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Interface for hook response data structure
interface SubCategoryResponseData {
  data: ApiSubCategoryResponse;
  [key: string]: any;
}

// Interface for category data
interface Category {
  id: string;
  name: string;
  [key: string]: any;
}

// Interface for category list response
interface CategoryListResponse {
  data?: {
    categories?: Category[];
  };
  [key: string]: any;
}


const ViewSubCategory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data, isLoading, refetch } = useGetSubCategoryDetailsById(id || '');
  const { data: categoryData } = useGetAllCategoryList(1, 100);

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as SubCategoryResponseData;
  const subCategory = responseData?.data;
  
  // Get categories for parent name lookup
  const categoryListData = categoryData as CategoryListResponse;
  const categories = categoryListData?.data?.categories || [];

  // Find parent category name
  const parentCategory = useMemo(() => {
    if (!subCategory?.categoryId) return null;
    return categories.find(cat => cat.id === subCategory.categoryId);
  }, [subCategory?.categoryId, categories]);

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

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading sub category...</p>
        </div>
      </div>
    );
  }

  if (!subCategory) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Sub category not found</p>
          <button
            onClick={() => navigate('/categories/sub-categories')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const status = subCategory.isActive ? 'active' : 'inactive';

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Sub Category Details</h1>
        <div className="flex items-center gap-3">
          <Badge
            status={status}
            size="sm"
            customColor={status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 text-gray-800'}
            className="rounded"
          />
          <BackButton to="/categories/sub-categories" />
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
              <Layers size={18} className="text-green-600 dark:text-green-400" />
              Basic Information
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">ID</p>
              <p className="text-sm font-semibold text-gray-800">{subCategory.id || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <FolderTree size={12} />
                Parent Category
              </p>
              <p className="text-sm text-gray-700">
                {parentCategory ? `${parentCategory.name} (ID: ${subCategory.categoryId})` : `ID: ${subCategory.categoryId || 'N/A'}`}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Name</p>
              <p className="text-sm font-semibold text-gray-800">{subCategory.name || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Slug</p>
              <p className="text-sm text-gray-700">{subCategory.slug || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Subtitle</p>
              <p className="text-sm text-gray-700">{subCategory.subtitle || 'N/A'}</p>
            </div>

            {subCategory.description && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Description</p>
                <p className="text-sm text-gray-700">{subCategory.description}</p>
              </div>
            )}

            {subCategory.displayOrder !== undefined && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Display Order</p>
                <p className="text-sm text-gray-700">{subCategory.displayOrder}</p>
              </div>
            )}
          </div>

          {/* Image & Status */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <ImageIcon size={18} className="text-green-600 dark:text-green-400" />
              Image & Status
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-2">Sub Category Image</p>
              {subCategory.image ? (
                <img
                  src={subCategory.image}
                  alt={subCategory.name || 'Sub Category'}
                  className="w-48 h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <ImageIcon size={48} className="text-gray-400" />
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {status}
              </span>
            </div>

            {subCategory.colorCode && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Color Code</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: subCategory.colorCode }}
                  />
                  <p className="text-sm text-gray-700">{subCategory.colorCode}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Created At</p>
              <p className="text-sm text-gray-700">{formatDate(subCategory.createdAt)}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Updated At</p>
              <p className="text-sm text-gray-700">{formatDate(subCategory.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* SEO Information */}
        {(subCategory.metaTitle || subCategory.metaKeyword || subCategory.metaDescription || subCategory.schemaMarkup) && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">
              SEO Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subCategory.metaTitle && (
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Meta Title</p>
                  <p className="text-sm text-gray-700">{subCategory.metaTitle}</p>
                </div>
              )}

              {subCategory.metaKeyword && (
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Meta Keyword</p>
                  <p className="text-sm text-gray-700">{subCategory.metaKeyword}</p>
                </div>
              )}

              {subCategory.metaDescription && (
                <div className="md:col-span-2">
                  <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Meta Description</p>
                  <p className="text-sm text-gray-700">{subCategory.metaDescription}</p>
                </div>
              )}

              {subCategory.schemaMarkup && (
                <div className="md:col-span-2">
                  <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Schema Markup</p>
                  <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg overflow-auto max-h-40">
                    {typeof subCategory.schemaMarkup === 'object' ? 
                      JSON.stringify(subCategory.schemaMarkup, null, 2) : 
                      String(subCategory.schemaMarkup)
                    }
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSubCategory;