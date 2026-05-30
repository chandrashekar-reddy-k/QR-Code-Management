import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Image as ImageIcon, Tag } from "lucide-react";
// import { offerImagesAPI } from '../../../lib/api';
import { OfferImage } from "../../../types";
import { Badge } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// Groceries offer image URLs (banner format: 1340x740)
const offerImageUrls = [
  'https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=1340&h=740&fit=crop', // Grocery shopping banner
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1340&h=740&fit=crop', // Fresh produce banner
  'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1340&h=740&fit=crop', // Fresh fruits banner
  'https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=1340&h=740&fit=crop', // Fresh vegetables banner
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1340&h=740&fit=crop', // Dairy products banner
];

// Mock data for offer images (same as ManageOfferImages)
const mockOfferImages: OfferImage[] = [
  {
    id: 1,
    type: 'Default',
    name: 'Special Offer Banner',
    image: offerImageUrls[0],
    status: 'active',
  },
  {
    id: 2,
    type: 'Banner',
    name: 'Flash Sale Offer',
    image: offerImageUrls[1],
    status: 'active',
  },
  {
    id: 3,
    type: 'Promotional',
    name: 'Festival Discount',
    image: offerImageUrls[2],
    status: 'active',
  },
  {
    id: 4,
    type: 'Default',
    name: 'Weekend Deal',
    image: offerImageUrls[3],
    status: 'inactive',
  },
  {
    id: 5,
    type: 'Banner',
    name: 'New Year Sale',
    image: offerImageUrls[4],
    status: 'active',
  },
];

const ViewOfferImage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offerImage, setOfferImage] = useState<OfferImage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOfferImage = async () => {
      try {
        setLoading(true);
        // Using mock data for now - replace with API call when ready
        // const data = await offerImagesAPI.getById(parseInt(id || '0'));
        const foundOfferImage = mockOfferImages.find((o) => o.id === parseInt(id || '0'));
        if (foundOfferImage) {
          setOfferImage(foundOfferImage);
        } else {
          alert('Offer image not found!');
          navigate('/offer-images/manage');
        }
      } catch (error) {
        console.error('Error fetching offer image:', error);
        alert('Error fetching offer image. Please try again.');
        navigate('/offer-images/manage');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOfferImage();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading offer image...</p>
        </div>
      </div>
    );
  }

  if (!offerImage) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Offer image not found</p>
          <button
            onClick={() => navigate("/offer-images/manage")}
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Offer Image Details
        </h1>
        <BackButton to="/offer-images/manage" />
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
              <Tag size={18} className="text-green-600" />
              Basic Information
            </h2>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">ID</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{offerImage.id}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Name</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{offerImage.name}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Type</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{offerImage.type}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Status</p>
              <Badge status={offerImage.status} size="sm" />
            </div>
          </div>

          {/* Image Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <ImageIcon size={18} className="text-green-600" />
              Offer Image
            </h2>

            {offerImage.image ? (
              <div className="flex justify-center">
                <img
                  src={offerImage.image}
                  alt={offerImage.name}
                  className="max-w-full w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400">No image available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewOfferImage;

