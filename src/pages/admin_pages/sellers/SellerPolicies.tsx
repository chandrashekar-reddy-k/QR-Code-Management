import { useState, useEffect } from 'react';
import { Eye, Save, Loader, FileText, Calendar, Edit } from 'lucide-react';
import { VendorPolicy } from '../../../types';
import { StatCard, PrimaryButton, Button } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

// Mock data for policies
const mockPolicy: VendorPolicy = {
  id: 1,
  privacyPolicy: '<strong>Privacy Policy</strong><br/>This privacy policy describes how we collect, use, and protect your personal information. We are committed to ensuring your privacy and protecting your data. Your information is used solely for the purpose of providing our services and improving your experience. We do not share your information with third parties without your consent. This policy is effective as of the date of publication and may be updated from time to time.',
  termsConditions: '<h3>Terms & Conditions</h3><br/><strong>1. Acceptance of Terms</strong><br/>By accessing and using this platform, you agree to be bound by these terms and conditions. If you do not agree with any part of these terms, you must not use our services.<br/><br/><strong>2. Seller Responsibilities</strong><br/>As a seller, you are responsible for maintaining the accuracy of your product listings, ensuring product quality, and complying with all applicable laws and regulations. You must provide accurate information about your products and services.<br/><br/><strong>3. Commission and Payments</strong><br/>Commission rates are as specified in your seller agreement. Payments will be processed according to the payment schedule outlined in your contract. Any disputes regarding payments must be reported within 30 days of the transaction date.<br/><br/><strong>4. Prohibited Activities</strong><br/>You agree not to engage in any fraudulent, illegal, or harmful activities. This includes but is not limited to: selling counterfeit products, misrepresenting products, or violating intellectual property rights.<br/><br/><strong>5. Termination</strong><br/>We reserve the right to terminate your seller account at any time for violation of these terms or for any other reason deemed necessary to protect the platform and its users.',
  updatedAt: '2025-01-20T10:30:00Z',
};

const SellerPolicies = () => {
  const [policy, setPolicy] = useState<VendorPolicy>(mockPolicy);
  const [loading, setLoading] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [showPrivacyView, setShowPrivacyView] = useState(false);
  const [showTermsView, setShowTermsView] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(mockPolicy.privacyPolicy || '');
  const [termsConditions, setTermsConditions] = useState(mockPolicy.termsConditions || '');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await vendorPoliciesAPI.get();
      // setPolicy(data);
      // setPrivacyPolicy(data.privacyPolicy || '');
      // setTermsConditions(data.termsConditions || '');
      setPolicy(mockPolicy);
      setPrivacyPolicy(mockPolicy.privacyPolicy || '');
      setTermsConditions(mockPolicy.termsConditions || '');
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrivacyPolicy = async () => {
    try {
      setSavingPrivacy(true);
      // Using mock data for now - replace with API call when ready
      // await vendorPoliciesAPI.updatePrivacyPolicy(privacyPolicy);
      setPolicy({ ...policy, privacyPolicy, updatedAt: new Date().toISOString() });
      alert('Privacy Policy updated successfully!');
      await fetchPolicies();
    } catch (error: any) {
      console.error('Error updating privacy policy:', error);
      alert(error.message || 'Error updating privacy policy. Please try again.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleUpdateTermsConditions = async () => {
    try {
      setSavingTerms(true);
      // Using mock data for now - replace with API call when ready
      // await vendorPoliciesAPI.updateTermsConditions(termsConditions);
      setPolicy({ ...policy, termsConditions, updatedAt: new Date().toISOString() });
      alert('Terms & Conditions updated successfully!');
      await fetchPolicies();
    } catch (error: any) {
      console.error('Error updating terms & conditions:', error);
      alert(error.message || 'Error updating terms & conditions. Please try again.');
    } finally {
      setSavingTerms(false);
    }
  };

  // Calculate KPI metrics
  const privacyWordCount = privacyPolicy.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
  const termsWordCount = termsConditions.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
  const lastUpdated = policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-IN') : 'Never';
  const hasPrivacyPolicy = privacyPolicy.trim().length > 0;
  const hasTermsConditions = termsConditions.trim().length > 0;

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Vendor Policies</h1>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Privacy Policy Words"
          value={privacyWordCount}
          icon={FileText}
          variant="blue"
          valueSize="xl"
        />
        <StatCard
          title="Terms & Conditions Words"
          value={termsWordCount}
          icon={FileText}
          variant="green"
          valueSize="xl"
        />
        <StatCard
          title="Last Updated"
          value={lastUpdated}
          icon={Calendar}
          variant="purple"
          valueSize="xl"
        />
        <StatCard
          title="Policies Status"
          value={hasPrivacyPolicy && hasTermsConditions ? 'Complete' : 'Incomplete'}
          icon={Edit}
          variant="yellow"
          valueSize="xl"
        />
      </div>

      {/* Privacy Policy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">Update Privacy Policy</h3>
          <Button
            onClick={() => setShowPrivacyView(!showPrivacyView)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10"
          >
            <Eye size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">View</span>
          </Button>
        </div>

        {showPrivacyView ? (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="prose prose-sm max-w-none">
              <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: policy.privacyPolicy || '' }} />
            </div>
            <div className="mt-4">
              <Button
                onClick={() => setShowPrivacyView(false)}
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Privacy Policy</label>
              <textarea
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                rows={15}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-300 dark:focus:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter privacy policy content..."
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">⚡️Upgrade - Rich text editor available</p>
            </div>
            <PrimaryButton
              onClick={handleUpdatePrivacyPolicy}
              disabled={savingPrivacy}
              size="sm"
              className="flex items-center gap-1.5 h-9 sm:h-10"
            >
              {savingPrivacy ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  <span className="text-xs sm:text-sm">Updating...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span className="text-xs sm:text-sm">Update Privacy Policy</span>
                </>
              )}
            </PrimaryButton>
          </>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">Update Terms Conditions</h3>
          <Button
            onClick={() => setShowTermsView(!showTermsView)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10"
          >
            <Eye size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">View</span>
          </Button>
        </div>

        {showTermsView ? (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="prose prose-sm max-w-none">
              <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: policy.termsConditions || '' }} />
            </div>
            <div className="mt-4">
              <Button
                onClick={() => setShowTermsView(false)}
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Terms & Conditions :</label>
              <textarea
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                rows={15}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-300 dark:focus:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter terms & conditions content..."
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">⚡️Upgrade - Rich text editor available</p>
            </div>
            <PrimaryButton
              onClick={handleUpdateTermsConditions}
              disabled={savingTerms}
              size="sm"
              className="flex items-center gap-1.5 h-9 sm:h-10"
            >
              {savingTerms ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  <span className="text-xs sm:text-sm">Updating...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span className="text-xs sm:text-sm">Update Terms Conditions</span>
                </>
              )}
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
};

export default SellerPolicies;

