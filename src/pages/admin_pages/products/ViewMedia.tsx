import { useParams, useNavigate } from 'react-router-dom';
import { Image as ImageIcon, FileText, Folder, HardDrive, Store } from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

interface Media {
  id: number;
  name: string;
  extension: string;
  type: string;
  subDirectory: string;
  size: string;
  vendorName?: string;
  url: string;
}

// Groceries media images
const mediaImages = [
  'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&h=300&fit=crop', // Fresh Fruits
  'https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=300&h=300&fit=crop', // Fresh Vegetables
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=300&fit=crop', // Dairy Products
  'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=300&h=300&fit=crop', // Cheese & Butter
  'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=300&h=300&fit=crop', // Grains
  'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300&h=300&fit=crop', // Pulses
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=300&h=300&fit=crop', // Spices
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&h=300&fit=crop', // Spice Powders
  'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=300&fit=crop', // Tea & Coffee
  'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=300&fit=crop', // Beverages
  'https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=300&h=300&fit=crop', // Snacks
  'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&h=300&fit=crop', // Biscuits
  'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=300&h=300&fit=crop', // Personal Care
  'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&h=300&fit=crop', // Toothpaste
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&h=300&fit=crop', // Household Items
];

// Mock data for groceries media - in real app, fetch from API using the ID
const mockMedia: Media[] = [
  { id: 1, name: 'fresh-mangoes', extension: 'jpg', type: 'image', subDirectory: 'products/media/', size: '245.5 KB', vendorName: 'Fresh Grocery Store', url: mediaImages[0] },
  { id: 2, name: 'fresh-tomatoes', extension: 'png', type: 'image', subDirectory: 'products/media/', size: '189.2 KB', vendorName: 'Organic Farm', url: mediaImages[1] },
  { id: 3, name: 'amul-milk', extension: 'jpg', type: 'image', subDirectory: 'products/media/', size: '312.8 KB', vendorName: 'Dairy Delight', url: mediaImages[2] },
  { id: 4, name: 'amul-butter', extension: 'jpeg', type: 'image', subDirectory: 'products/media/', size: '156.3 KB', vendorName: 'Dairy Delight', url: mediaImages[3] },
  { id: 5, name: 'basmati-rice', extension: 'png', type: 'image', subDirectory: 'products/media/', size: '278.9 KB', vendorName: 'Grain Mart', url: mediaImages[4] },
  { id: 6, name: 'toor-dal', extension: 'jpg', type: 'image', subDirectory: 'products/media/', size: '201.4 KB', vendorName: 'Grain Mart', url: mediaImages[5] },
  { id: 7, name: 'mdh-spices', extension: 'jpeg', type: 'image', subDirectory: 'products/media/', size: '334.7 KB', vendorName: 'Spice World', url: mediaImages[6] },
  { id: 8, name: 'turmeric-powder', extension: 'png', type: 'image', subDirectory: 'products/media/', size: '167.2 KB', vendorName: 'Spice World', url: mediaImages[7] },
  { id: 9, name: 'tata-tea', extension: 'jpg', type: 'image', subDirectory: 'products/media/', size: '198.5 KB', vendorName: 'Beverage Corner', url: mediaImages[8] },
  { id: 10, name: 'orange-juice', extension: 'jpg', type: 'image', subDirectory: 'products/media/', size: '223.1 KB', vendorName: 'Beverage Corner', url: mediaImages[9] },
  { id: 11, name: 'haldiram-namkeen', extension: 'png', type: 'image', subDirectory: 'products/media/', size: '145.8 KB', vendorName: 'Snack Zone', url: mediaImages[10] },
  { id: 12, name: 'britannia-biscuits', extension: 'jpg', type: 'image', subDirectory: 'products/media/', size: '176.3 KB', vendorName: 'Snack Zone', url: mediaImages[11] },
  { id: 13, name: 'patanjali-soap', extension: 'jpeg', type: 'image', subDirectory: 'products/media/', size: '134.2 KB', vendorName: 'Personal Care', url: mediaImages[12] },
  { id: 14, name: 'colgate-toothpaste', extension: 'png', type: 'image', subDirectory: 'products/media/', size: '189.7 KB', vendorName: 'Personal Care', url: mediaImages[13] },
  { id: 15, name: 'surf-excel', extension: 'jpg', type: 'image', subDirectory: 'products/media/', size: '256.4 KB', vendorName: 'Household Essentials', url: mediaImages[14] },
];

const ViewMedia = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // In real app, fetch from API using the ID
  const media = mockMedia.find(m => m.id === parseInt(id || '0'));

  if (!media) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Media not found</p>
          <button
            onClick={() => navigate('/products/media')}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Media Details</h1>
        <BackButton to="/products/media" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Two Separate Cards Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Card: User & Product Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
            User & Product information
          </h2>
          
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">User ID</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{media.id}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">File Name</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{media.name}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Extension</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{media.extension.toUpperCase()}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">File Type</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{media.type}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Sub Directory</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{media.subDirectory}</p>
            </div>

            {media.vendorName && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Seller Name</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{media.vendorName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Media Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
            Media Preview
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-center">
              {media.url ? (
                <img
                  src={media.url}
                  alt={media.name}
                  className="w-full max-w-[200px] rounded-lg border border-gray-200 dark:border-gray-600 shadow-md"
                />
              ) : (
                <div className="w-full max-w-[200px] h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <ImageIcon size={48} className="text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{media.name}.{media.extension}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewMedia;
