import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Save,
  Popcorn,
  Power,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
// import { popupOfferAPI } from '../../../lib/api';
import { PopupOfferFormData } from "../../../types";
import {
  StatCard,
  TextInput,
  Button,
  PrimaryButton,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// Mock data for popup offer
const mockPopupOffer = {
  enabled: true,
  type: "Festival Offer",
  popupUrl: "https://example.com/popup",
  link: "https://example.com/offer",
  image: "https://via.placeholder.com/500x500",
};

const ManagePopupOffer = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PopupOfferFormData>({
    enabled: mockPopupOffer.enabled,
    type: mockPopupOffer.type,
    popupUrl: mockPopupOffer.popupUrl,
    link: mockPopupOffer.link,
    image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    mockPopupOffer.image
  );

  useEffect(() => {
    fetchPopupOffer();
  }, []);

  const fetchPopupOffer = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await popupOfferAPI.get();
      // setFormData({
      //   enabled: data.enabled || false,
      //   type: data.type || '',
      //   popupUrl: data.popupUrl || '',
      //   link: data.link || '',
      //   image: null,
      // });
      // if (data.image) {
      //   setImagePreview(data.image);
      // }
      setFormData({
        enabled: mockPopupOffer.enabled,
        type: mockPopupOffer.type,
        popupUrl: mockPopupOffer.popupUrl,
        link: mockPopupOffer.link,
        image: null,
      });
      setImagePreview(mockPopupOffer.image);
    } catch (error) {
      console.error("Error fetching popup offer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image dimensions (square, larger than 500px*500px)
      // const img = new Image();
      // img.onload = () => {
      //   const width = img.width;
      //   const height = img.height;

      //   // Check if image is square
      //   if (Math.abs(width - height) > 10) {
      //     setErrors((prev) => ({ ...prev, image: 'Image must be square' }));
      //     return;
      //   }

      //   // Check minimum size
      //   if (width < 500 || height < 500) {
      //     setErrors((prev) => ({ ...prev, image: 'Image must be larger than 500px*500px' }));
      //     return;
      //   }

      //   setFormData((prev) => ({ ...prev, image: file }));
      //   const reader = new FileReader();
      //   reader.onloadend = () => {
      //     setImagePreview(reader.result as string);
      //   };
      //   reader.readAsDataURL(file);
      //   setErrors((prev) => ({ ...prev, image: '' }));
      // };
      // img.onerror = () => {
      //   setErrors((prev) => ({ ...prev, image: 'Invalid image file' }));
      // };
      // img.src = URL.createObjectURL(file);

      // Accept any image size
      setFormData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrors((prev) => ({ ...prev, image: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.type.trim()) {
      newErrors.type = "Type is required";
    }
    if (!formData.popupUrl.trim()) {
      newErrors.popupUrl = "Popup URL is required";
    }
    if (!formData.link.trim()) {
      newErrors.link = "Link is required";
    }
    if (!formData.image && !imagePreview) {
      newErrors.image = "Image is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        setSaving(true);
        // Using mock data for now - replace with API call when ready
        // const formDataToSend = new FormData();
        // formDataToSend.append('enabled', formData.enabled.toString());
        // formDataToSend.append('type', formData.type);
        // formDataToSend.append('popupUrl', formData.popupUrl);
        // formDataToSend.append('link', formData.link);
        // if (formData.image) {
        //   formDataToSend.append('image', formData.image);
        // }
        // await popupOfferAPI.update(formDataToSend);
        alert("Popup offer updated successfully!");
        await fetchPopupOffer();
      } catch (error: unknown) {
        console.error("Error updating popup offer:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Error updating popup offer. Please try again.";
        alert(message);
      } finally {
        setSaving(false);
      }
    }
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const isEnabled = formData.enabled;
    const hasImage = imagePreview !== null;
    const hasType = formData.type.trim() !== "";
    const hasLink = formData.link.trim() !== "";

    return [
      {
        title: "Popup Status",
        value: isEnabled ? "Enabled" : "Disabled",
        icon: Power,
        variant: (isEnabled ? "green" : "gray") as "green" | "gray",
      },
      {
        title: "Type Configured",
        value: hasType ? "Yes" : "No",
        icon: Popcorn,
        variant: (hasType ? "blue" : "gray") as "blue" | "gray",
      },
      {
        title: "Link Configured",
        value: hasLink ? "Yes" : "No",
        icon: LinkIcon,
        variant: (hasLink ? "purple" : "gray") as "purple" | "gray",
      },
      {
        title: "Image Uploaded",
        value: hasImage ? "Yes" : "No",
        icon: ImageIcon,
        variant: (hasImage ? "yellow" : "gray") as "yellow" | "gray",
      },
    ];
  }, [formData.enabled, formData.type, formData.link, imagePreview]);

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading popup offer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Popup Offer
        </h1>
        <BackButton to="/offer-images/manage" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
            size="md"
            valueSize="2xl"
          />
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* Popup Offer Settings Section */}
          <FormSectionWithDots title="Popup Offer Settings">
            {/* Popup Offer Enabled */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                  className="w-4 h-4 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-400 dark:focus:ring-gray-500 bg-white"
                />
                <span className="text-xs font-medium text-gray-700">
                  Popup Offer Enabled (ON /OFF)
                </span>
              </label>
            </div>

            {/* Type */}
            <TextInput
              label="Type"
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="Enter type"
              required
              error={errors.type}
            />

            {/* Popup Url */}
            <TextInput
              label="Popup Url"
              type="text"
              name="popupUrl"
              value={formData.popupUrl}
              onChange={handleChange}
              placeholder="Enter popup URL"
              required
              error={errors.popupUrl}
            />

            {/* Link */}
            <TextInput
              label="Link"
              type="text"
              name="link"
              value={formData.link}
              onChange={handleChange}
              placeholder="Enter link"
              required
              error={errors.link}
            />

            {/* Image */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Popup Offer Image <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image"
                />
                <label htmlFor="image" className="cursor-pointer">
                  {imagePreview ? (
                    <div>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-w-md h-64 object-contain mx-auto mb-2"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setImagePreview(null);
                          setFormData((prev) => ({ ...prev, image: null }));
                          const input = document.getElementById(
                            "image"
                          ) as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload
                        size={20}
                        className="mx-auto text-gray-400 mb-2"
                      />
                      <p className="text-xs text-gray-600">
                        Drop Files here or click to upload
                      </p>
                    </div>
                  )}
                </label>
              </div>
              {errors.image && (
                <p className="text-[10px] text-red-600 mt-0.5">
                  {errors.image}
                </p>
              )}
              {/* <p className="text-[10px] text-gray-500 mt-1">
                Please choose square image of larger than 500px*500px.
              </p> */}
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/offer-images/manage")}
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
              <span>Update Popup Offer</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ManagePopupOffer;
