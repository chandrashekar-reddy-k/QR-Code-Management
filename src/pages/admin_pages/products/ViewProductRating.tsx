import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Star, User, Package, Calendar, Image as ImageIcon } from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetRatingDetailsById } from '../../../hooks/rating';

// Interface for API response
interface ApiRating {
  id: string;
  rating: number; // API uses "rating" not "rate"
  review: string | null;
  userId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

// Interface for hook response data structure
interface RatingResponseData {
  data: ApiRating;
  [key: string]: any;
}

const ViewProductRating = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetRatingDetailsById(id || '');

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as RatingResponseData | undefined;
  const rating = responseData?.data;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading rating...</p>
        </div>
      </div>
    );
  }

  if (!rating) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Rating not found</p>
          <button
            onClick={() => navigate('/products/ratings')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Extract display data from API response
  const userName = rating.user?.name || 'N/A';
  const userPhone = rating.user?.phone || null;
  const productName = rating.product?.name || 'N/A';
  const productImage = rating.product?.images && rating.product.images.length > 0
    ? rating.product.images[0]
    : null;
  const displayRating = rating.rating;
  const displayReview = rating.review || 'No review provided';
  const displayDate = rating.createdAt;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderStars = (rate: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={star <= rate ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Rating ID #{rating.id.slice(0, 8)}...
        </h1>
        <BackButton to="/products/ratings" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Two Cards Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* User & Product Information Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2 mb-4">
            <User size={18} className="text-green-600 dark:text-green-400" />
            User & Product information
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">User ID</p>
              <p className="text-sm text-gray-700">{rating.userId.slice(0, 8)}...</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">User Name</p>
              <p className="text-sm font-semibold text-gray-800">{userName}</p>
            </div>

            {userPhone && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">User Phone</p>
                <p className="text-sm text-gray-700">{userPhone}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Package size={12} />
                Product ID
              </p>
              <p className="text-sm text-gray-700">{rating.productId.slice(0, 8)}...</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Package size={12} />
                Product Name
              </p>
              <p className="text-sm text-gray-700">{productName}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Calendar size={12} />
                Review Date
              </p>
              <p className="text-sm text-gray-700">{formatDate(displayDate)}</p>
            </div>
          </div>
        </div>

        {/* Ratings & Reviews Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2 mb-4">
            <Star size={18} className="text-green-600 dark:text-green-400" />
            Ratings & Reviews
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-2">Rating</p>
              {renderStars(displayRating)}
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-2">Review</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 leading-relaxed">{displayReview}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Image Card - Below the two cards */}
      <div className="flex justify-start">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 max-w-[300px] w-full">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2 mb-4">
            <ImageIcon size={18} className="text-green-600 dark:text-green-400" />
            Review Image
          </h2>
          
          <div className="flex justify-center">
            {productImage ? (
              <img
                src={productImage}
                alt="Review"
                className="max-w-[200px] h-auto object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = 
                    '<div class="max-w-[200px] w-[200px] h-48 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center"><span class="text-sm text-gray-500">No image available</span></div>';
                }}
              />
            ) : (
              <div className="max-w-[200px] w-[200px] h-48 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                <ImageIcon size={48} className="text-gray-400" />
                <span className="text-sm text-gray-500 ml-2">No image available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProductRating;
