import { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";

interface CMSContent {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
}

// Mock data (plain text, no HTML)
const mockAboutUs: CMSContent = {
  id: 1,
  title: "About Us",
  content:
    "About Us\n\nWelcome to VillagKart\nVillagKart is your trusted online marketplace connecting rural and urban communities. We are committed to providing quality products and excellent service to our customers.\n\nOur Mission\nTo bridge the gap between rural producers and urban consumers, creating a sustainable and inclusive marketplace.\n\nOur Vision\nTo become the leading e-commerce platform that empowers local businesses and communities across India.\n\nWhy Choose Us?\n- Quality Products\n- Fast Delivery\n- Secure Payments\n- 24/7 Customer Support",
  updatedAt: "2025-01-20T10:30:00Z",
};

const AboutUs = () => {
  const [contentText, setContentText] = useState(mockAboutUs.content);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getWordCount = (text: string): number => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      setContentText(mockAboutUs.content);
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
      // await cmsAPI.updateAboutUs(contentText);
      alert("About Us page updated successfully!");
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Error saving content. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Action Buttons */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          About Us
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchContent}
            disabled={loading}
            variant="ghost"
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="ghost"
            className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Save size={14} />
            {saving ? "Updating..." : "Update Information"}
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            About Us :
          </label>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {getWordCount(contentText)} words
          </span>
        </div>
        <textarea
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          rows={20}
          className="w-full px-3 py-2 text-xs border border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 font-mono resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          placeholder="Enter content...&#10;You can use:&#10;**bold text** for bold&#10;*italic text* for italic&#10;New lines will be preserved"
        />
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
          ⚡️Upgrade - Rich text editor available. Use **text** for bold, *text*
          for italic
        </p>
      </div>
    </div>
  );
};

export default AboutUs;
