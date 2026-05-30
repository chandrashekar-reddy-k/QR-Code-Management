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

// Mock data for featured sections (same as ManageFeaturedSections)
const mockFeaturedSections: FeaturedSection[] = [
  {
    id: 1,
    title: "Featured Products",
    shortDescription: "Weekends deal goes here",
    style: "style_1",
    productType: "Featured",
    categoryIds: "100,205,360",
    position: 1,
  },
  {
    id: 2,
    title: "Products on Sale",
    shortDescription: "Special discounts on selected items",
    style: "style_2",
    productType: "Sale",
    categoryIds: "150,250,400",
    position: 2,
  },
  {
    id: 3,
    title: "New Arrivals",
    shortDescription: "Latest products just arrived",
    style: "style_3",
    productType: "New",
    categoryIds: "200,300,450",
    position: 3,
  },
  {
    id: 4,
    title: "Best Sellers",
    shortDescription: "Top selling products this month",
    style: "style_4",
    productType: "Best Seller",
    categoryIds: "120,220,380",
    position: 4,
  },
  {
    id: 5,
    title: "Flash Sale",
    shortDescription: "Limited time offers",
    style: "style_1",
    productType: "Flash Sale",
    categoryIds: "180,280,420",
    position: 5,
  },
];

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
      const sectionToEdit = mockFeaturedSections.find(
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
    if (!formData.productType) {
      newErrors.productType = "Product type is required";
    }
    if (!formData.position) {
      newErrors.position = "Position is required";
    }
    if (!formData.backgroundColorLight) {
      newErrors.backgroundColorLight =
        "Background color (light theme) is required";
    }
    if (!formData.backgroundColorDark) {
      newErrors.backgroundColorDark =
        "Background color (dark theme) is required";
    }
    if (!formData.appStyle) {
      newErrors.appStyle = "App style is required";
    }
    if (!formData.webStyle) {
      newErrors.webStyle = "Web style is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        setLoading(true);
        if (isEditing) {
          alert("Featured section updated successfully!");
        } else {
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Short Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="Ex : Weekends deal goes here"
                rows={3}
                className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
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

          {/* Category & Product Settings Section */}
          <FormSectionWithDots title="Category & Product Settings">
            {/* Category IDs - Multi-select Dropdown */}
            <div ref={categoryDropdownRef} className="relative mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Category IDs ( Ex : 100,205, 360 )
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`w-full min-h-[38px] px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between gap-2 ${
                    errors.categoryIds
                      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500'
                  }`}
                >
                  <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[20px]">
                    {getSelectedCategories().length > 0 ? (
                      getSelectedCategories().map((category) => (
                        <span
                          key={category.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px] font-medium"
                        >
                          {category.name} ({category.id})
                          <button
                            type="button"
                            onClick={(e) => removeCategory(category.id, e)}
                            className="hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Select categories...</span>
                    )}
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {categories.length > 0 ? (
                      <div className="p-2">
                        {categories.map((category) => {
                          const isSelected = formData.categoryIds
                            ? formData.categoryIds.split(",").map((id) => id.trim()).filter(id => id).includes(category.id.toString())
                            : false;
                          return (
                            <label
                              key={category.id}
                              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded transition-colors ${
                                isSelected ? 'bg-green-50 dark:bg-green-900/20' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleCategoryToggle(category.id)}
                                className="w-4 h-4 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-green-600"
                              />
                              <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">
                                {category.name} <span className="text-gray-500">({category.id})</span>
                              </span>
                              {isSelected && (
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                  ✓
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 p-4 text-center">
                        No categories available
                      </p>
                    )}
                  </div>
                )}
              </div>
              {formData.categoryIds && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  Selected IDs: {formData.categoryIds}
                </p>
              )}
              {errors.categoryIds && (
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                  {errors.categoryIds}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput
                label="Product Types"
                required
                name="productType"
                value={formData.productType}
                onChange={handleChange}
                error={errors.productType}
              >
                <option value="">Select Product Type</option>
                <option value="featured">Featured</option>
                <option value="new">New</option>
                <option value="sale">Sale</option>
                <option value="popular">Popular</option>
              </SelectInput>

              <SelectInput
                label="Position"
                required
                name="position"
                value={formData.position}
                onChange={handleChange}
                error={errors.position}
              >
                <option value="">Select Position</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </SelectInput>
            </div>
          </FormSectionWithDots>

          {/* Background Colors Section */}
          <FormSectionWithDots title="Background Colors">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Background Color (Light Theme){" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="backgroundColorLight"
                    value={formData.backgroundColorLight}
                    onChange={handleChange}
                    className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
                  />
                  <TextInput
                    type="text"
                    name="backgroundColorLight"
                    value={formData.backgroundColorLight}
                    onChange={handleChange}
                    className="flex-1"
                    error={errors.backgroundColorLight}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Background Color (Dark Theme){" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="backgroundColorDark"
                    value={formData.backgroundColorDark}
                    onChange={handleChange}
                    className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
                  />
                  <TextInput
                    type="text"
                    name="backgroundColorDark"
                    value={formData.backgroundColorDark}
                    onChange={handleChange}
                    className="flex-1"
                    error={errors.backgroundColorDark}
                  />
                </div>
              </div>
            </div>
          </FormSectionWithDots>

          {/* Style Settings Section */}
          <FormSectionWithDots title="Style Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput
                label="Select style for APP Section"
                required
                name="appStyle"
                value={formData.appStyle}
                onChange={handleChange}
                error={errors.appStyle}
              >
                <option value="style_1">style_1</option>
                <option value="style_2">style_2</option>
                <option value="style_3">style_3</option>
                <option value="style_4">style_4</option>
              </SelectInput>

              <SelectInput
                label="Select style for Web Section"
                required
                name="webStyle"
                value={formData.webStyle}
                onChange={handleChange}
                error={errors.webStyle}
              >
                <option value="style_1">style_1</option>
                <option value="style_2">style_2</option>
                <option value="style_3">style_3</option>
                <option value="style_4">style_4</option>
              </SelectInput>
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
