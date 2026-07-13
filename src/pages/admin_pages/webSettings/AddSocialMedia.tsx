import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FormSectionWithDots,
  TextInput,
  SelectInput,
  Button,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// Mock data
const mockSocialMedia = [
  { id: 1, icon: "Facebook", link: "https://www.facebook.com/villagkart" },
  { id: 2, icon: "Twitter", link: "https://www.twitter.com/villagkart" },
  { id: 3, icon: "Instagram", link: "https://www.instagram.com/villagkart" },
  {
    id: 4,
    icon: "LinkedIn",
    link: "https://www.linkedin.com/company/villagkart",
  },
  { id: 5, icon: "YouTube", link: "https://www.youtube.com/villagkart" },
];

const iconOptions = [
  "Facebook",
  "Twitter",
  "Instagram",
  "LinkedIn",
  "YouTube",
  "Pinterest",
  "Snapchat",
  "TikTok",
  "WhatsApp",
  "Telegram",
  "Discord",
  "Reddit",
];

const AddSocialMedia = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    icon: "",
    link: "",
  });

  useEffect(() => {
    if (isEditMode && id) {
      const item = mockSocialMedia.find((s) => s.id === parseInt(id));
      if (item) {
        setFormData({
          icon: item.icon,
          link: item.link,
        });
      }
    }
  }, [id, isEditMode]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.icon || !formData.link) {
      alert("Please fill in all required fields");
      return;
    }
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert(
      `Social media link ${isEditMode ? "updated" : "added"} successfully!`
    );
    navigate("/web-settings/social-media");
    setSaving(false);
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Social Media" : "Add Social Media"}
        </h1>
        <BackButton to="/web-settings/social-media" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="max-w-4xl">
          {/* Social Media Information Section */}
          <FormSectionWithDots title="Social Media Information">
            <SelectInput
              label="Icon"
              required
              value={formData.icon}
              onChange={(e) => handleChange("icon", e.target.value)}
              placeholder="Select social media platform"
            >
              <option value="">Select Icon</option>
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </SelectInput>

            <TextInput
              label="Link"
              required
              type="url"
              value={formData.link}
              onChange={(e) => handleChange("link", e.target.value)}
              placeholder="https://www.example.com/your-profile"
            />
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/web-settings/social-media")}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>{isEditMode ? "Update Social Media" : "Add Social Media"}</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddSocialMedia;
