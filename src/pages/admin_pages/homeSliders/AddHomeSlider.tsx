import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, Save } from "lucide-react";
import { HomeSliderFormData, HomeSlider } from "../../../types";
import {
  FormSectionWithDots,
  TextInput,
  SelectInput,
  Button,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// Mock data for home sliders (same as ManageHomeSliders)
const sliderImages = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1340&h=740&fit=crop", // Fresh Vegetables Banner
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1340&h=740&fit=crop", // Fresh Fruits Banner
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1340&h=740&fit=crop", // Dairy Products Banner
  "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=1340&h=740&fit=crop", // Grains & Pulses Banner
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1340&h=740&fit=crop", // Spices & Condiments Banner
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1340&h=740&fit=crop", // Beverages Banner
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=1340&h=740&fit=crop", // Snacks & Sweets Banner
  "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=1340&h=740&fit=crop", // Personal Care Banner
];

const mockSliders: HomeSlider[] = [
  {
    id: 1,
    type: "Default",
    name: "Fresh Vegetables Special",
    image: sliderImages[0],
    status: "active",
  },
  {
    id: 2,
    type: "Banner",
    name: "Fresh Fruits Collection",
    image: sliderImages[1],
    status: "active",
  },
  {
    id: 3,
    type: "Promotional",
    name: "Dairy Products Offer",
    image: sliderImages[2],
    status: "active",
  },
  {
    id: 4,
    type: "Default",
    name: "Grains & Pulses Sale",
    image: sliderImages[3],
    status: "inactive",
  },
  {
    id: 5,
    type: "Banner",
    name: "Spices & Condiments",
    image: sliderImages[4],
    status: "active",
  },
  {
    id: 6,
    type: "Promotional",
    name: "Beverages Discount",
    image: sliderImages[5],
    status: "active",
  },
  {
    id: 7,
    type: "Default",
    name: "Snacks & Sweets",
    image: sliderImages[6],
    status: "active",
  },
  {
    id: 8,
    type: "Banner",
    name: "Personal Care Products",
    image: sliderImages[7],
    status: "active",
  },
];

const AddHomeSlider = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<HomeSliderFormData>({
    type: "Default",
    name: "",
    image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      const sliderToEdit = mockSliders.find(
        (s) => s.id === parseInt(id || "0")
      );
      if (sliderToEdit) {
        setFormData({
          type: sliderToEdit.type,
          name: sliderToEdit.name,
          image: null, // Don't set file, user can upload new one
        });
        setImagePreview(sliderToEdit.image);
      } else {
        alert("Home slider not found!");
        navigate("/home-sliders/manage");
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
      // Validate image dimensions
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
        setLoading(true);
        const formDataToSend = new FormData();
        formDataToSend.append("type", formData.type);
        formDataToSend.append("name", formData.name);
        if (formData.image) {
          formDataToSend.append("image", formData.image);
        }

        if (isEditing) {
          alert("Home slider updated successfully!");
        } else {
          alert("Home slider created successfully!");
        }
        navigate("/home-sliders/manage");
      } catch (error: unknown) {
        console.error(
          `Error ${isEditing ? "updating" : "creating"} home slider:`,
          error
        );
        const message =
          error instanceof Error
            ? error.message
            : `Error ${
                isEditing ? "updating" : "creating"
              } home slider. Please try again.`;
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditing ? "Edit Home Slider Image" : "Add Home Slider Image"}
        </h1>
        <BackButton to="/home-sliders/manage" />
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
          {/* Home Slider Information Section */}
          <FormSectionWithDots title="Home Slider Information">
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
              placeholder="Enter slider name"
              error={errors.name}
            />

            {/* Image */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Image <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50 dark:bg-gray-700/50">
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
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload
                        size={20}
                        className="mx-auto text-gray-400 dark:text-gray-500 mb-2"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Drop Files here or click to upload
                      </p>
                    </div>
                  )}
                </label>
              </div>
              {errors.image && (
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
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
              onClick={() => navigate("/home-sliders/manage")}
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
                {isEditing ? "Update Home Slider" : "Add Home Slider"}
              </span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddHomeSlider;
