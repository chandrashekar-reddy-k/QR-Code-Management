import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, Save } from "lucide-react";
import { OfferImageFormData, OfferImage } from "../../../types";
import {
  FormSectionWithDots,
  TextInput,
  SelectInput,
  Button,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// Groceries offer image URLs (banner format: 1340x740)
const offerImageUrls = [
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=1340&h=740&fit=crop", // Grocery shopping banner
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1340&h=740&fit=crop", // Fresh produce banner
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1340&h=740&fit=crop", // Fresh fruits banner
  "https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=1340&h=740&fit=crop", // Fresh vegetables banner
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1340&h=740&fit=crop", // Dairy products banner
];

// Mock data for offer images (same as ManageOfferImages)
const mockOfferImages: OfferImage[] = [
  {
    id: 1,
    type: "Default",
    name: "Special Offer Banner",
    image: offerImageUrls[0],
    status: "active",
  },
  {
    id: 2,
    type: "Banner",
    name: "Flash Sale Offer",
    image: offerImageUrls[1],
    status: "active",
  },
  {
    id: 3,
    type: "Promotional",
    name: "Festival Discount",
    image: offerImageUrls[2],
    status: "active",
  },
  {
    id: 4,
    type: "Default",
    name: "Weekend Deal",
    image: offerImageUrls[3],
    status: "inactive",
  },
  {
    id: 5,
    type: "Banner",
    name: "New Year Sale",
    image: offerImageUrls[4],
    status: "active",
  },
];

const AddOfferImage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<OfferImageFormData>({
    type: "Default",
    name: "",
    image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      const offerImageToEdit = mockOfferImages.find(
        (o) => o.id === parseInt(id || "0")
      );
      if (offerImageToEdit) {
        setFormData({
          type: offerImageToEdit.type,
          name: offerImageToEdit.name,
          image: null, // Don't set file, user can upload new one
        });
        setImagePreview(offerImageToEdit.image);
      } else {
        alert("Offer image not found!");
        navigate("/offer-images/manage");
      }
    }
  }, [id, isEditing, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Commented out - Image size validation (670px*370px to 1340px*740px)
      // Uncomment when size restrictions are required
      // const img = new Image();
      // img.onload = () => {
      //   const width = img.width;
      //   const height = img.height;
      //   // Validate size range (670px*370px to 1340px*740px)
      //   if (width < 670 || height < 370) {
      //     setErrors((prev) => ({ ...prev, image: 'Image must be larger than 670px*370px' }));
      //     return;
      //   }
      //   if (width > 1340 || height > 740) {
      //     setErrors((prev) => ({ ...prev, image: 'Image must be smaller than 1340px*740px' }));
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
    if (!formData.type) {
      newErrors.type = "Type is required";
    }
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!isEditing && !formData.image && !imagePreview) {
      newErrors.image = "Image is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        setLoading(true);
        const formDataToSend = new FormData();
        formDataToSend.append("type", formData.type);
        formDataToSend.append("name", formData.name);
        if (formData.image) {
          formDataToSend.append("image", formData.image);
        }

        if (isEditing) {
          alert("Offer image updated successfully!");
        } else {
          alert("Offer image created successfully!");
        }
        navigate("/offer-images/manage");
      } catch (error: unknown) {
        console.error(
          `Error ${isEditing ? "updating" : "creating"} offer image:`,
          error
        );
        const message =
          error instanceof Error
            ? error.message
            : `Error ${
                isEditing ? "updating" : "creating"
              } offer image. Please try again.`;
        alert(message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditing ? "Edit Offer Image" : "Add Offer Image"}
        </h1>
        <BackButton to="/offer-images/manage" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* Offer Image Information Section */}
          <FormSectionWithDots title="Offer Image Information">
            {/* Type */}
            <SelectInput
              label="Type"
              required
              name="type"
              value={formData.type}
              onChange={handleChange}
              error={errors.type}
            >
              <option value="Default">Default</option>
              <option value="Banner">Banner</option>
              <option value="Promotional">Promotional</option>
            </SelectInput>

            {/* Name */}
            <TextInput
              label="Name"
              required
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter offer name"
              error={errors.name}
            />

            {/* Image */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Image <span className="text-red-500">*</span>
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
                Please choose square image of larger than 670px*370px & smaller
                than 1340px*740px.
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
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>
                {isEditing ? "Update Offer Image" : "Add Offer Image"}
              </span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddOfferImage;
