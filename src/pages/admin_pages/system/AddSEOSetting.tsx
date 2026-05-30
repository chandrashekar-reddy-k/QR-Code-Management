import { useState, useEffect } from "react";
import { Save, Upload } from "lucide-react";
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

// Mock data - in real app, fetch from API
const mockSEOSettings = [
  {
    id: 1,
    pageType: "Home",
    metaTitle: "VillagKart - Online Shopping for Rural & Urban Communities",
    metaKeywords: "online shopping, ecommerce, rural marketplace, villagkart",
    schemaMarkup: '{"@type":"WebSite","name":"VillagKart"}',
    metaDescription:
      "Shop quality products from rural and urban communities. Fast delivery, secure payments, and 24/7 customer support.",
    ogImage: "/images/og-home.jpg",
  },
  {
    id: 2,
    pageType: "Products",
    metaTitle: "Products - VillagKart Online Store",
    metaKeywords: "products, shopping, buy online, villagkart products",
    schemaMarkup: '{"@type":"ItemList","name":"Products"}',
    metaDescription:
      "Browse our wide range of quality products. Find the best deals and offers on your favorite items.",
    ogImage: "/images/og-products.jpg",
  },
  {
    id: 3,
    pageType: "About Us",
    metaTitle: "About Us - VillagKart",
    metaKeywords: "about us, company, villagkart, mission, vision",
    schemaMarkup: '{"@type":"AboutPage","name":"About VillagKart"}',
    metaDescription:
      "Learn about VillagKart, our mission to bridge rural and urban communities through quality products and excellent service.",
    ogImage: "/images/og-about.jpg",
  },
  {
    id: 4,
    pageType: "Contact Us",
    metaTitle: "Contact Us - VillagKart Customer Support",
    metaKeywords: "contact, support, help, customer service, villagkart",
    schemaMarkup: '{"@type":"ContactPage","name":"Contact VillagKart"}',
    metaDescription:
      "Get in touch with VillagKart customer support. We are here to help with any questions or concerns.",
    ogImage: "/images/og-contact.jpg",
  },
];

const AddSEOSetting = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    pageType: "",
    metaTitle: "",
    metaKeyword: "",
    schemaMarkup: "",
    metaDescription: "",
    ogImage: null as File | null,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      const setting = mockSEOSettings.find((s) => s.id === parseInt(id));
      if (setting) {
        setFormData({
          pageType: setting.pageType,
          metaTitle: setting.metaTitle,
          metaKeyword: setting.metaKeywords,
          schemaMarkup: setting.schemaMarkup,
          metaDescription: setting.metaDescription,
          ogImage: null,
        });
        setPreviewImage(setting.ogImage);
      }
    }
  }, [id, isEditMode]);

  const pageTypes = [
    "Home",
    "Products",
    "About Us",
    "Contact Us",
    "Terms and Conditions",
    "Privacy Policy",
    "Category",
    "Product Detail",
    "Cart",
    "Checkout",
  ];

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image size
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setFormData((prev) => ({ ...prev, ogImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setFormData((prev) => ({ ...prev, ogImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pageType || !formData.metaTitle) {
      alert("Please fill in all required fields");
      return;
    }
    if (!isEditMode && !formData.ogImage) {
      alert("Please upload an OG Image");
      return;
    }
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(`SEO setting ${isEditMode ? "updated" : "added"} successfully!`);
      navigate("/system/seo-settings");
    } catch (error: unknown) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} SEO setting:`,
        error
      );
      const message =
        error instanceof Error
          ? error.message
          : `Error ${
              isEditMode ? "updating" : "creating"
            } SEO setting. Please try again.`;
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? "Edit SEO Setting" : "Add SEO Setting"}
        </h1>
        <BackButton to="/system/seo-settings" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          <FormSectionWithDots title="SEO Configuration">
            <SelectInput
              label="SEO Page"
              required
              value={formData.pageType}
              onChange={(e) => handleChange("pageType", e.target.value)}
              options={[
                { value: "", label: "Select Page Type" },
                ...pageTypes.map((type) => ({ value: type, label: type })),
              ]}
            />

            <TextInput
              label="Meta Title"
              required
              type="text"
              value={formData.metaTitle}
              onChange={(e) => handleChange("metaTitle", e.target.value)}
              placeholder="Enter meta title"
            />

            <TextInput
              label="Meta Keyword"
              required
              type="text"
              value={formData.metaKeyword}
              onChange={(e) => handleChange("metaKeyword", e.target.value)}
              placeholder="Enter meta keywords (comma separated)"
            />

            {/* Schema Markup Textarea */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Schema Markup
              </label>
              <textarea
                value={formData.schemaMarkup}
                onChange={(e) => handleChange("schemaMarkup", e.target.value)}
                rows={4}
                placeholder="Enter JSON-LD schema markup"
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 font-mono resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Meta Description Textarea */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Meta Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.metaDescription}
                onChange={(e) =>
                  handleChange("metaDescription", e.target.value)
                }
                required
                rows={4}
                placeholder="Enter meta description"
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* OG Image Upload */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                OG Image{" "}
                {!isEditMode && <span className="text-red-500">*</span>}
              </label>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                Please choose square image of larger than 350px*350px & smaller
                than 550px*550px.
              </p>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-700"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="ogImageUpload"
                  required={!isEditMode}
                />
                <label htmlFor="ogImageUpload" className="cursor-pointer">
                  {previewImage ? (
                    <div className="space-y-2">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="mx-auto max-w-xs max-h-48 object-contain rounded"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setPreviewImage(null);
                          setFormData((prev) => ({ ...prev, ogImage: null }));
                          const input = document.getElementById(
                            "ogImageUpload"
                          ) as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload size={20} className="mx-auto text-gray-400 dark:text-gray-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Drop Files here or click to upload
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/system/seo-settings")}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={saving}
              isLoading={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>
                {isEditMode ? "Update SEO Setting" : "Add SEO Setting"}
              </span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddSEOSetting;
