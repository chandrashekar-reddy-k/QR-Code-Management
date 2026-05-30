import { useState, useEffect } from "react";
import { Save, Loader } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatDate } from "../../../utils/formatters";

interface Policy {
  id: number;
  privacyPolicy: string;
  termsConditions: string;
  updatedAt: string;
}

// Mock data for policies
const mockPolicy: Policy = {
  id: 1,
  privacyPolicy:
    "This privacy policy describes how we collect, use, and protect your personal information. We are committed to ensuring your privacy and protecting your data. Your information is used solely for the purpose of providing our services and improving your experience. We do not share your information with third parties without your consent. This policy is effective as of the date of publication and may be updated from time to time.",
  termsConditions: "",
  updatedAt: "2025-11-09T10:30:00Z",
};

const DeliveryBoyPolicies = () => {
  const [policy, setPolicy] = useState<Policy>(mockPolicy);
  const [loading, setLoading] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);
  const [privacyPolicyText, setPrivacyPolicyText] = useState("");
  const [termsConditionsText, setTermsConditionsText] = useState("");

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await deliveryBoyPoliciesAPI.get();
      // setPolicy(data);
      setPolicy(mockPolicy);
      setPrivacyPolicyText(mockPolicy.privacyPolicy || "");
      setTermsConditionsText(mockPolicy.termsConditions || "");
    } catch (error) {
      console.error("Error fetching policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrivacyPolicy = async () => {
    try {
      setSavingPrivacy(true);
      // Using mock data for now - replace with API call when ready
      // await deliveryBoyPoliciesAPI.updatePrivacyPolicy(privacyPolicyText);
      setPolicy({
        ...policy,
        privacyPolicy: privacyPolicyText,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingPrivacy(false);
      alert("Privacy Policy updated successfully!");
      await fetchPolicies();
    } catch (error) {
      console.error("Error updating privacy policy:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error updating privacy policy. Please try again.";
      alert(errorMessage);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleCreateTermsConditions = async () => {
    try {
      setSavingTerms(true);
      // Using mock data for now - replace with API call when ready
      // await deliveryBoyPoliciesAPI.updateTermsConditions(termsConditionsText);
      setPolicy({
        ...policy,
        termsConditions: termsConditionsText,
        updatedAt: new Date().toISOString(),
      });
      alert("Terms & Conditions created successfully!");
      await fetchPolicies();
    } catch (error) {
      console.error("Error creating terms & conditions:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error creating terms & conditions. Please try again.";
      alert(errorMessage);
    } finally {
      setSavingTerms(false);
    }
  };

  const lastUpdated = policy.updatedAt
    ? formatDate(policy.updatedAt, "DD-MM-YYYY")
    : "Never";

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading policies...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Policies
        </h1>
        <Breadcrumbs />
      </div>

      {/* Two Cards Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Privacy Policy Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
              Privacy Policy
            </h3>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Last Update : {lastUpdated}
            </span>
          </div>

          {isEditingPrivacy ? (
            <>
              <div className="mb-4">
                <textarea
                  value={privacyPolicyText}
                  onChange={(e) => setPrivacyPolicyText(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Type here"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdatePrivacyPolicy}
                  disabled={savingPrivacy}
                  className="flex-1 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {savingPrivacy ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Update
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditingPrivacy(false);
                    setPrivacyPolicyText(policy.privacyPolicy || "");
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {policy.privacyPolicy || "No privacy policy available."}
                </p>
              </div>
              <button
                onClick={() => setIsEditingPrivacy(true)}
                className="w-full px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Save size={14} />
                Update
              </button>
            </>
          )}
        </div>

        {/* Terms And Conditions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
              Terms And Conditions
            </h3>
          </div>

          <div className="mb-4">
            <textarea
              value={termsConditionsText}
              onChange={(e) => setTermsConditionsText(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Type here"
            />
          </div>

          <button
            onClick={handleCreateTermsConditions}
            disabled={savingTerms || !termsConditionsText.trim()}
            className="w-full px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {savingTerms ? (
              <>
                <Loader size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save size={14} />
                Create
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryBoyPolicies;
