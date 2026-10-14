import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, ChevronDown, X } from "lucide-react";
// import { featuredSectionsAPI, categoriesAPI } from '../../../lib/api';
import { FeaturedSectionFormData, FeaturedSection } from "../../../types";
import {
  FormSectionWithDots,
  TextInput,
  SelectInput,
  Button,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

import {
  getStoredFeaturedSections,
  saveStoredFeaturedSections,
} from "../../../utils/featuredSectionsStorage";

const AddFeaturedSection = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<FeaturedSectionFormData>({
    title: "",
    shortDescription: "",
    categoryIds: "",
    productType: "",
    position: "",
    backgroundColorLight: "#ffffff",
    backgroundColorDark: "#000000",
    appStyle: "style_1",
    webStyle: "style_1",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

  const fetchCategories = async () => {
    try {
      // const data = await categoriesAPI.getAll();
      // setCategories(Array.isArray(data) ? data : data.categories || []);
      // Mock categories - replace with API call
      setCategories([
        { id: 1, name: "Fruits & Vegetables" },
        { id: 2, name: "Dairy Products" },
        { id: 3, name: "Grains & Pulses" },
        { id: 4, name: "Spices & Condiments" },
        { id: 5, name: "Beverages" },
        { id: 6, name: "Snacks & Sweets" },
        { id: 7, name: "Personal Care" },
        { id: 8, name: "Household Items" },
      ]);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  };

  useEffect(() => {
    if (isEditing) {
      const stored = getStoredFeaturedSections();
      const sectionToEdit = stored.find(
        (s) => s.id === parseInt(id || "0")
      );
      if (sectionToEdit) {
        setFormData({
          title: sectionToEdit.title,
          shortDescription: sectionToEdit.shortDescription,
          categoryIds: sectionToEdit.categoryIds,
          productType: sectionToEdit.productType,
          position: sectionToEdit.position.toString(),
          backgroundColorLight: "#ffffff",
          backgroundColorDark: "#000000",
          appStyle: sectionToEdit.style,
          webStyle: sectionToEdit.style,
        });
      } else {
        alert("Featured section not found!");
        navigate("/featured-sections");
      }
    }
  }, [id, isEditing, navigate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    const currentIds = formData.categoryIds
      ? formData.categoryIds.split(",").map((id) => id.trim()).filter(id => id)
      : [];
    
    if (currentIds.includes(categoryId.toString())) {
      const newIds = currentIds.filter((id) => id !== categoryId.toString());
      setFormData((prev) => ({ ...prev, categoryIds: newIds.join(",") }));
    } else {
      const newIds = [...currentIds, categoryId.toString()];
      setFormData((prev) => ({ ...prev, categoryIds: newIds.join(",") }));
    }
  };

  const removeCategory = (categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIds = formData.categoryIds
      ? formData.categoryIds.split(",").map((id) => id.trim()).filter(id => id)
      : [];
    const newIds = currentIds.filter((id) => id !== categoryId.toString());
    setFormData((prev) => ({ ...prev, categoryIds: newIds.join(",") }));
  };

  const getSelectedCategories = () => {
    if (!formData.categoryIds) return [];
    const selectedIds = formData.categoryIds.split(",").map((id) => id.trim()).filter(id => id);
    return selectedIds.map((id) => {
      const category = categories.find((cat) => cat.id.toString() === id);
      return category ? { id: category.id, name: category.name } : null;
    }).filter(Boolean) as { id: number; name: string }[];
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = "Short description is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        setLoading(true);
        const stored = getStoredFeaturedSections();

        if (isEditing) {
          const targetId = parseInt(id || "0");
          const updated = stored.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  title: formData.title.trim(),
                  shortDescription: formData.shortDescription.trim(),
                }
              : item
          );
          saveStoredFeaturedSections(updated);
          alert("Featured section updated successfully!");
        } else {
          const nextId = stored.length > 0 ? Math.max(...stored.map((s) => s.id)) + 1 : 1;
          const newSection: FeaturedSection = {
            id: nextId,
            title: formData.title.trim(),
            shortDescription: formData.shortDescription.trim(),
            style: "style_1",
            productType: "Featured",
            categoryIds: "",
            position: nextId,
          };
          saveStoredFeaturedSections([...stored, newSection]);
          alert("Featured section created successfully!");
        }
        navigate("/featured-sections");
      } catch (error: unknown) {
        console.error(
          `Error ${isEditing ? "updating" : "creating"} featured section:`,
          error
        );
        const message =
          error instanceof Error
            ? error.message
            : `Error ${
                isEditing ? "updating" : "creating"
              } featured section. Please try again.`;
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
          {isEditing ? "Edit Featured Section" : "Add Featured Section"}
        </h1>
        <BackButton to="/featured-sections" />
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
          {/* Basic Information Section */}
          <FormSectionWithDots title="Basic Information">
            <TextInput
              label="Title for section"
              required
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ex : Featured Products / Products on Sale"
              error={errors.title}
            />

            {/* Short Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Short Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="Ex : Weekends deal goes here"
                rows={3}
                className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white text-gray-900 ${
                  errors.shortDescription
                    ? "border-red-300 dark:border-red-600 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
                }`}
              />
              {errors.shortDescription && (
                <p className="text-[10px] text-red-600 mt-0.5">
                  {errors.shortDescription}
                </p>
              )}
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/featured-sections")}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={loading}
              isLoading={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>
                {isEditing ? "Update Featured Section" : "Add Featured Section"}
              </span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddFeaturedSection;
