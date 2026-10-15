import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
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
  useGetAppSectionById,
  useCreateAppSection,
  useUpdateAppSection,
} from "../../../hooks/appSections";

const TITLE_TYPE_OPTIONS = [
  { value: "SHOP_MORE_UNLOCK_MORE", label: "SHOP_MORE_UNLOCK_MORE (Coupons / Shop More)" },
  { value: "FEATURED_PRODUCTS", label: "FEATURED_PRODUCTS (Featured)" },
  { value: "PRODUCTS_ON_SALE", label: "PRODUCTS_ON_SALE (Sale / Deals)" },
  { value: "BEST_SELLERS", label: "BEST_SELLERS (Popular)" },
  { value: "TOP_CATEGORIES", label: "TOP_CATEGORIES (Categories)" },
  { value: "CUSTOM", label: "CUSTOM" },
];

const ROLE_OPTIONS = [
  { value: "CUSTOMER", label: "CUSTOMER" },
  { value: "PARTNER", label: "PARTNER" },
  { value: "DELIVERY_BOY", label: "DELIVERY_BOY" },
];

const AddFeaturedSection = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: sectionData, isLoading: isFetching } = useGetAppSectionById(id, isEditing);
  const createMutation = useCreateAppSection();
  const updateMutation = useUpdateAppSection(id);

  const [formData, setFormData] = useState({
    titleType: "SHOP_MORE_UNLOCK_MORE",
    title: "",
    subTitle: "",
    roleName: "CUSTOMER",
    linkPath: "/coupons",
    displayOrder: 1,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing && sectionData) {
      const data = sectionData.data || sectionData;
      if (data && data.title) {
        setFormData({
          titleType: data.titleType || "SHOP_MORE_UNLOCK_MORE",
          title: data.title || "",
          subTitle: data.subTitle || "",
          roleName: data.roleName || "CUSTOMER",
          linkPath: data.linkPath || "/coupons",
          displayOrder: Number(data.displayOrder) || 1,
          isActive: data.isActive !== undefined ? data.isActive : true,
        });
      }
    }
  }, [isEditing, sectionData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const finalValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.subTitle.trim()) {
      newErrors.subTitle = "Short description is required";
    }
    if (!formData.titleType.trim()) {
      newErrors.titleType = "Title Type is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        titleType: formData.titleType.trim(),
        title: formData.title.trim(),
        subTitle: formData.subTitle.trim(),
        roleName: formData.roleName.trim(),
        linkPath: formData.linkPath.trim(),
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive,
      };

      if (isEditing) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate("/featured-sections");
    } catch (error) {
      console.error("Error saving app section:", error);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

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
          {isFetching ? (
            <div className="p-8 text-center text-gray-500">Loading section details...</div>
          ) : (
            <>
              {/* Basic Information Section */}
              <FormSectionWithDots title="App Section Configuration">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Section Type <span className="text-red-500">*</span>
                    </label>
                    <SelectInput
                      name="titleType"
                      value={formData.titleType}
                      onChange={handleChange}
                      options={TITLE_TYPE_OPTIONS}
                      className="w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Role Name
                    </label>
                    <SelectInput
                      name="roleName"
                      value={formData.roleName}
                      onChange={handleChange}
                      options={ROLE_OPTIONS}
                      className="w-full text-xs"
                    />
                  </div>
                </div>

                <TextInput
                  label="Title for Section"
                  required
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex : Shop More, Unlock More"
                  error={errors.title}
                />

                {/* Subtitle / Short Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Subtitle / Short Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="subTitle"
                    value={formData.subTitle}
                    onChange={handleChange}
                    placeholder="Ex : Add more to your cart and get exciting offers..."
                    rows={3}
                    className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white text-gray-900 ${
                      errors.subTitle
                        ? "border-red-300 dark:border-red-600 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
                    }`}
                  />
                  {errors.subTitle && (
                    <p className="text-[10px] text-red-600 mt-0.5">
                      {errors.subTitle}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Link Path (Deep Link / Route)"
                    type="text"
                    name="linkPath"
                    value={formData.linkPath}
                    onChange={handleChange}
                    placeholder="Ex : /coupons or /products"
                  />

                  <TextInput
                    label="Display Order"
                    type="number"
                    name="displayOrder"
                    value={String(formData.displayOrder)}
                    onChange={handleChange}
                    placeholder="1"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-medium text-gray-700">
                    Active (Visible in App)
                  </label>
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
                  disabled={isSaving}
                  isLoading={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
                >
                  <Save size={14} />
                  <span>
                    {isEditing ? "Update Featured Section" : "Add Featured Section"}
                  </span>
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddFeaturedSection;
