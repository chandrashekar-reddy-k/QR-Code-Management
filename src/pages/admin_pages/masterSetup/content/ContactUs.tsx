import { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";
import { PrimaryButton, Button } from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";

interface CMSContent {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
}

// Mock data (plain text, no HTML)
const mockContactUs: CMSContent = {
  id: 1,
  title: "Contact Us",
  content:
    "Contact Us\n\nGet in Touch\nWe are here to help! If you have any questions, concerns, or feedback, please feel free to reach out to us.\n\nEmail: support@villagkart.com\nPhone: +91-1234567890\nAddress: 123 Main Street, City, State, PIN Code\n\nBusiness Hours:\nMonday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed",
  updatedAt: "2025-01-20T10:30:00Z",
};

const ContactUs = () => {
  const [contentText, setContentText] = useState(mockContactUs.content);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(mockContactUs.updatedAt);

  const getWordCount = (text: string): number =>
    text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      setContentText(mockContactUs.content);
      setLastUpdate(mockContactUs.updatedAt);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Using mock data for now - replace with API call when ready
      // await cmsAPI.updateContactUs(contentText);
      setLastUpdate(new Date().toISOString());
      alert("Contact Us page updated successfully!");
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Error saving content. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Contact Us
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Refresh Button */}
      <div className="mb-4">
        <Button
          onClick={fetchContent}
          disabled={loading}
          variant="ghost"
          className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={`sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Contact Us</h2>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Last Update : {formatDate(lastUpdate)}
          </span>
        </div>

        {/* Content Section */}
        <div className="mb-6">
          <div className="flex items-center justify-end mb-1.5">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {getWordCount(contentText)} words
            </span>
          </div>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={20}
            className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 font-mono resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Enter content...&#10;You can use:&#10;**bold text** for bold&#10;*italic text* for italic&#10;New lines will be preserved"
          />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            ⚡️Upgrade - Rich text editor available. Use **text** for bold, *text* for italic
          </p>
        </div>

        {/* Save Button - Bottom Right */}
        <div className="flex items-center justify-end mt-6">
          <PrimaryButton
            onClick={handleSave}
            disabled={saving}
            isLoading={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
          >
            <Save size={14} />
            <span>Save Changes</span>
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;

