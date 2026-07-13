import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Layout, Tag, MapPin, Hash } from 'lucide-react';
import { FeaturedSection } from '../../../types';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

// Mock data for featured sections (same as ManageFeaturedSections)
const mockFeaturedSections: FeaturedSection[] = [
  {
    id: 1,
    title: 'Featured Products',
    shortDescription: 'Weekends deal goes here',
    style: 'style_1',
    productType: 'Featured',
    categoryIds: '100,205,360',
    position: 1,
  },
  {
    id: 2,
    title: 'Products on Sale',
    shortDescription: 'Special discounts on selected items',
    style: 'style_2',
    productType: 'Sale',
    categoryIds: '150,250,400',
    position: 2,
  },
  {
    id: 3,
    title: 'New Arrivals',
    shortDescription: 'Latest products just arrived',
    style: 'style_3',
    productType: 'New',
    categoryIds: '200,300,450',
    position: 3,
  },
  {
    id: 4,
    title: 'Best Sellers',
    shortDescription: 'Top selling products this month',
    style: 'style_4',
    productType: 'Best Seller',
    categoryIds: '120,220,380',
    position: 4,
  },
  {
    id: 5,
    title: 'Flash Sale',
    shortDescription: 'Limited time offers',
    style: 'style_1',
    productType: 'Flash Sale',
    categoryIds: '180,280,420',
    position: 5,
  },
];

const ViewFeaturedSection = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [section, setSection] = useState<FeaturedSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSection = async () => {
      try {
        setLoading(true);
        // Using mock data for now - replace with API call when ready
        // const data = await featuredSectionsAPI.getById(parseInt(id || '0'));
        const foundSection = mockFeaturedSections.find((s) => s.id === parseInt(id || '0'));
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
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Layout size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Short Description</label>
            </div>
            <p className="text-sm text-gray-700">{section.shortDescription}</p>
          </div>

          {/* Style and Product Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layout size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Style</label>
              </div>
              <p className="text-sm font-medium text-gray-900">{section.style}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Product Type</label>
              </div>
              <p className="text-sm font-medium text-gray-900">{section.productType}</p>
            </div>
          </div>

          {/* Category IDs */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Category IDs</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {section.categoryIds.split(',').map((categoryId, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium"
                >
                  {categoryId.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* Position */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Position</label>
            </div>
            <p className="text-sm font-medium text-gray-900">{section.position}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewFeaturedSection;

