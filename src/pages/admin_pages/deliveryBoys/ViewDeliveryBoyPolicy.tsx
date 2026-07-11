import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, FileText } from 'lucide-react';
import { SellerPolicy } from '../../../types';

// Mock data for policies
const mockPolicy: SellerPolicy = {
  id: 1,
  privacyPolicy: '<h3>Privacy Policy</h3><br/><strong>Privacy Policy</strong><br/>This privacy policy describes how we collect, use, and protect your personal information as a delivery boy on our platform. We are committed to ensuring your privacy and protecting your data. Your information including personal details, contact information, location data, and delivery records are used solely for the purpose of providing our delivery services and improving your experience. We do not share your information with third parties without your consent, except as required by law or to facilitate deliveries. Your location data is collected only during active delivery assignments for route optimization and safety purposes. This policy is effective as of the date of publication and may be updated from time to time. We will notify you of any significant changes to this policy. By using our platform, you agree to the collection and use of information in accordance with this policy.',
  termsConditions: '<h3>Terms & Conditions</h3><br/><strong>1. Acceptance of Terms</strong><br/>By accessing and using this platform as a delivery boy, you agree to be bound by these terms and conditions. If you do not agree with any part of these terms, you must not use our services.<br/><br/><strong>2. Delivery Boy Responsibilities</strong><br/>As a delivery boy, you are responsible for maintaining the accuracy of your profile information, ensuring timely and safe delivery of orders, and complying with all applicable laws and regulations. You must provide accurate information about your availability, vehicle details, and delivery capabilities. You are responsible for the safety and security of all orders assigned to you during transit.<br/><br/><strong>3. Commission and Payments</strong><br/>Commission rates and payment terms are as specified in your delivery boy agreement. Payments will be processed according to the payment schedule outlined in your contract. Any disputes regarding payments must be reported within 30 days of the transaction date. You are responsible for maintaining accurate bank account or payment information for receiving payments.<br/><br/><strong>4. Prohibited Activities</strong><br/>You agree not to engage in any fraudulent, illegal, or harmful activities. This includes but is not limited to: tampering with orders, misrepresenting delivery status, violating traffic laws, or engaging in any activity that could harm customers or damage the platform\'s reputation. You must not accept orders while under the influence of alcohol or drugs.<br/><br/><strong>5. Termination</strong><br/>We reserve the right to terminate your delivery boy account at any time for violation of these terms or for any other reason deemed necessary to protect the platform and its users. Upon termination, you must return any company property and settle all outstanding payments.',
  updatedAt: '2025-01-20T10:30:00Z',
};

const ViewDeliveryBoyPolicy = () => {
  const { type } = useParams<{ type: 'privacy' | 'terms' }>();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<SellerPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await deliveryBoyPoliciesAPI.get();
      // setPolicy(data);
      setPolicy(mockPolicy);
    } catch (error) {
      console.error('Error fetching policy:', error);
      setPolicy(mockPolicy);
    } finally {
      setLoading(false);
    }
  };

  const content = type === 'privacy' ? policy?.privacyPolicy : policy?.termsConditions;
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
  const lastUpdated = policy?.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <FileText size={24} className="text-green-700 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delivery Boy {title}</h1>
                {lastUpdated && (
                  <p className="text-xs text-gray-600 mt-1">Last updated: {lastUpdated}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/delivery-boys/policies')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            <div 
              className="max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content || '' }}
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
              }}
            />
            <style>{`
              .max-w-none h3 {
                font-size: 1.5rem;
                font-weight: 700;
                color: #1f2937;
                margin-top: 2rem;
                margin-bottom: 1rem;
              }
              .dark .max-w-none h3 {
                color: #f3f4f6;
              }
              .max-w-none h3:first-child {
                margin-top: 0;
              }
              .max-w-none strong {
                font-weight: 600;
                color: #111827;
              }
              .dark .max-w-none strong {
                color: #e5e7eb;
              }
              .max-w-none p {
                margin-bottom: 1rem;
              }
              .max-w-none br {
                line-height: 1.8;
              }
            `}</style>
          </div>

          {/* Footer Actions */}
          <div className="px-8 pb-6 border-t border-gray-200 pt-4">
            <button
              onClick={() => navigate('/delivery-boys/policies')}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Policies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDeliveryBoyPolicy;

