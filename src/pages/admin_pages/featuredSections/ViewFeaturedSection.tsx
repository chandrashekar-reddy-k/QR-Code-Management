import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Layout, Tag, MapPin, Hash } from 'lucide-react';
import { FeaturedSection } from '../../../types';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

import { getStoredFeaturedSections } from '../../../utils/featuredSectionsStorage';

const ViewFeaturedSection = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [section, setSection] = useState<FeaturedSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSection = async () => {
      try {
        setLoading(true);
        const stored = getStoredFeaturedSections();
        const foundSection = stored.find((s) => s.id === parseInt(id || '0'));
        if (foundSection) {
          setSection(foundSection);
        } else {
          alert('Featured section not found!');
          navigate('/featured-sections');
        }
      } catch (error) {
        console.error('Error fetching featured section:', error);
        alert('Error fetching featured section. Please try again.');
        navigate('/featured-sections');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSection();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading featured section...</p>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Featured section not found</p>
          <button
            onClick={() => navigate('/featured-sections')}
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Featured Section Details
        </h1>
        <BackButton to="/featured-sections" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="space-y-6">
          {/* Title */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Title</label>
            </div>
            <p className="text-sm font-bold text-gray-900">{section.title}</p>
          </div>

          {/* Short Description */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layout size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Short Description</label>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{section.shortDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewFeaturedSection;

