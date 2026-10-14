import { useParams, useNavigate } from 'react-router-dom';
import { Tag, MapPin, Hash, CheckCircle, XCircle } from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetAppSectionById } from '../../../hooks/appSections';

const ViewFeaturedSection = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: responseData, isLoading } = useGetAppSectionById(id, !!id);

  const section = responseData?.data || responseData;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading featured section...</p>
        </div>
      </div>
    );
  }

  if (!section || !section.title) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Featured section not found</p>
          <button
            onClick={() => navigate('/featured-sections')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
          >
            Back to Featured Sections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          View Featured Section
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/featured-sections/edit/${section.id}`)}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Edit Section
          </button>
          <BackButton to="/featured-sections" />
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 max-w-4xl space-y-6">
        <div>
          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            {section.titleType}
          </span>
          <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{section.subTitle || 'No description provided'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div className="flex items-start gap-2.5">
            <Hash className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Display Order</p>
              <p className="text-sm font-semibold text-gray-800">{section.displayOrder ?? 1}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Role Target</p>
              <p className="text-sm font-semibold text-gray-800">{section.roleName || 'CUSTOMER'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Link Path / Deep Link</p>
              <p className="text-sm font-mono font-semibold text-blue-600">{section.linkPath || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            {section.isActive ? (
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
            )}
            <div>
              <p className="text-xs text-gray-500 font-medium">Status</p>
              <p className="text-sm font-semibold text-gray-800">
                {section.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 flex flex-wrap gap-4">
          <div>ID: <span className="font-mono text-gray-600">{section.id}</span></div>
          {section.createdAt && <div>Created: {new Date(section.createdAt).toLocaleString()}</div>}
          {section.updatedAt && <div>Last Updated: {new Date(section.updatedAt).toLocaleString()}</div>}
        </div>
      </div>
    </div>
  );
};

export default ViewFeaturedSection;
