import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, Calendar, Users, DollarSign, Percent, Image as ImageIcon, Tag, Clock, Repeat } from 'lucide-react';
// import { promoCodesAPI } from '../../../lib/api';
import { PromoCode } from '../../../types';
import { formatDate, formatCurrency } from "../../../utils/formatters";
import { Badge } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

// Groceries promo code images
const promoCodeImages = [
  'https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=500&h=500&fit=crop', // Grocery shopping
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&h=500&fit=crop', // Fresh produce
  'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&h=500&fit=crop', // Fresh fruits display
  'https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=500&h=500&fit=crop', // Fresh vegetables
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&h=500&fit=crop', // Dairy products
];

// Mock data for promo codes (same as ManagePromoCodes)
const mockPromoCodes: PromoCode[] = [
  {
    id: 18,
    promoCode: 'WELCOME15',
    message: 'Often used to offer a 15% discount to first-time customers.',
    startDate: '2025-11-11',
    endDate: '2025-12-31',
    noOfUsers: 1000,
    minimumOrderAmount: 100,
    discount: 12,
    discountType: 'amount',
    image: promoCodeImages[0],
    status: 'active',
    validity: 'Acceptable',
    repeatUsage: 'Multiple',
  },
  {
    id: 19,
    promoCode: 'SUMMER20',
    message: 'Summer sale with 20% discount on all items.',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    noOfUsers: 500,
    minimumOrderAmount: 200,
    discount: 20,
    discountType: 'percentage',
    image: promoCodeImages[1],
    status: 'active',
    validity: 'Acceptable',
    repeatUsage: 'Multiple',
  },
  {
    id: 20,
    promoCode: 'FLASH50',
    message: 'Flash sale with flat ₹50 off on orders above ₹500.',
    startDate: '2025-01-15',
    endDate: '2025-01-20',
    noOfUsers: 200,
    minimumOrderAmount: 500,
    discount: 50,
    discountType: 'amount',
    image: promoCodeImages[2],
    status: 'active',
    validity: 'Acceptable',
    repeatUsage: 'Once',
  },
  {
    id: 21,
    promoCode: 'FESTIVAL25',
    message: 'Festival special 25% discount on all products.',
    startDate: '2025-10-01',
    endDate: '2025-10-31',
    noOfUsers: 1500,
    minimumOrderAmount: 150,
    discount: 25,
    discountType: 'percentage',
    image: promoCodeImages[3],
    status: 'inactive',
    validity: 'Expired',
    repeatUsage: 'Multiple',
  },
  {
    id: 22,
    promoCode: 'NEWUSER100',
    message: 'Welcome offer for new users - ₹100 off on first order.',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    noOfUsers: 3000,
    minimumOrderAmount: 300,
    discount: 100,
    discountType: 'amount',
    image: promoCodeImages[4],
    status: 'active',
    validity: 'Acceptable',
    repeatUsage: 'Once',
  },
];

const ViewPromoCode = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromoCode = async () => {
      try {
        setLoading(true);
        // Using mock data for now - replace with API call when ready
        // const data = await promoCodesAPI.getById(parseInt(id || '0'));
        const foundPromoCode = mockPromoCodes.find((p) => p.id === parseInt(id || '0'));
        if (foundPromoCode) {
          setPromoCode(foundPromoCode);
        } else {
          alert('Promo code not found!');
          navigate('/promo-codes/manage');
        }
      } catch (error) {
        console.error('Error fetching promo code:', error);
        alert('Error fetching promo code. Please try again.');
        navigate('/promo-codes/manage');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPromoCode();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading promo code...</p>
        </div>
      </div>
    );
  }

  if (!promoCode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Promo code not found</p>
          <button
            onClick={() => navigate('/promo-codes/manage')}
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
          Promo Code Details
        </h1>
        <BackButton to="/promo-codes/manage" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="space-y-6">
          {/* Promo Code and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Ticket size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Promo Code</label>
              </div>
              <p className="text-lg font-bold text-gray-900">{promoCode.promoCode}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Status</label>
              </div>
              <Badge status={promoCode.status} size="sm" />
            </div>
          </div>

          {/* Message */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Ticket size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Message</label>
            </div>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{promoCode.message}</p>
          </div>

          {/* Date Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Start Date</label>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatDate(promoCode.startDate)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">End Date</label>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatDate(promoCode.endDate)}</p>
            </div>
          </div>

          {/* User and Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">No. of Users</label>
              </div>
              <p className="text-sm font-semibold text-gray-900">{promoCode.noOfUsers.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Minimum Order Amount</label>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(promoCode.minimumOrderAmount)}</p>
            </div>
          </div>

          {/* Discount Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Percent size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Discount</label>
              </div>
              <p className="text-lg font-bold text-green-700">
                {promoCode.discountType === 'amount' ? formatCurrency(promoCode.discount) : `${promoCode.discount}%`}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Discount Type</label>
              </div>
              <p className="text-sm font-semibold text-gray-900 capitalize">{promoCode.discountType}</p>
            </div>
          </div>

          {/* Validity and Repeat Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Validity</label>
              </div>
              <p className="text-sm font-semibold text-gray-900">{promoCode.validity}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Repeat size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">Repeat Usage</label>
              </div>
              <p className="text-sm font-semibold text-gray-900">{promoCode.repeatUsage || 'N/A'}</p>
            </div>
          </div>

          {/* Image */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">Promo Code Image</label>
            </div>
            {promoCode.image ? (
              <div className="flex justify-center">
                <img
                  src={promoCode.image}
                  alt={promoCode.promoCode}
                  className="max-w-md h-64 object-contain rounded-lg border border-gray-200"
                />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                <p className="text-xs text-gray-500">No image available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPromoCode;

