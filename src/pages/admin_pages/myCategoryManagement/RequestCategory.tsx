import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Search, PlusCircle, Upload, X, Trash2, Plus } from "lucide-react";
import {
  FormSectionWithDots,
  PrimaryButton,
  Button,
  Modal,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { useGetProductCategoriesList } from "../../../hooks/product";
import { 
  useAddCategoriesAndSubCategories, 
  useRequestNewCategory, 
  useRequestNewSubCategory 
} from "../../../hooks/category";
import { uploadImageFile } from "../../../lib/uploadImage";

interface ApiCategory {
  id: string;
  name: string;
  image: string | null;
}

interface SubCategoryRow {
  id: string;
  name: string;
  description: string;
  imageFile: File | null;
  imagePreview: string | null;
}

const RequestCategoryPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // Unified modal state for requesting new category or subcategory
  const [showModal, setShowModal] = useState(false);
  const [requestType, setRequestType] = useState<"category" | "subcategory">("category");
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentCatId, setSelectedParentCatId] = useState("");

  // Multiple SubCategory dynamic rows state for Category request
  const [subCategoryRows, setSubCategoryRows] = useState<SubCategoryRow[]>([]);

  // Photo upload state for main item
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const requestCatMutation = useRequestNewCategory();
  const requestSubCatMutation = useRequestNewSubCategory();

  // Fetch active categories from database
  const { data: categoryData, isLoading } = useGetProductCategoriesList();
  const allCategories: ApiCategory[] = Array.isArray(categoryData?.data) ? categoryData.data : [];

  // ---------------- HANDLERS ----------------
  const handleToggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleRemove = (id: string) => {
    setSelected((prev) => prev.filter((sid) => sid !== id));
  };

  const addCategoryMutation = useAddCategoriesAndSubCategories();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // SubCategory row management
  const handleAddSubCategoryRow = () => {
    setSubCategoryRows((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        name: "",
        description: "",
        imageFile: null,
        imagePreview: null,
      },
    ]);
  };

  const handleRemoveSubCategoryRow = (id: string) => {
    setSubCategoryRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSubCategoryFieldChange = (
    id: string,
    field: "name" | "description",
    value: string
  ) => {
    setSubCategoryRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSubCategoryImageChange = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setSubCategoryRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, imageFile: file, imagePreview: preview } : row
        )
      );
    }
  };

  const handleRemoveSubCategoryImage = (id: string) => {
    setSubCategoryRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, imageFile: null, imagePreview: null } : row
      )
    );
  };

  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setUploadingImage(true);

      // 1. Upload Category image if provided
      let uploadedImageUrl: string | undefined = undefined;
      if (imageFile) {
        uploadedImageUrl = await uploadImageFile(imageFile);
      }

      if (requestType === "category") {
        // 2. Upload images for each subcategory row concurrently
        const validSubCatRows = subCategoryRows.filter((r) => r.name.trim());
        const uploadedSubCategories = await Promise.all(
          validSubCatRows.map(async (row) => {
            let subImgUrl: string | undefined = undefined;
            if (row.imageFile) {
              subImgUrl = await uploadImageFile(row.imageFile);
            }
            return {
              name: row.name.trim(),
              description: row.description.trim() || undefined,
              image: subImgUrl,
            };
          })
        );

        await requestCatMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          image: uploadedImageUrl,
          subCategories: uploadedSubCategories.length > 0 ? uploadedSubCategories : undefined,
        });
      } else {
        if (!selectedParentCatId) {
          alert("Please select a parent category");
          setUploadingImage(false);
          return;
        }
        await requestSubCatMutation.mutateAsync({
          categoryId: selectedParentCatId,
          name: name.trim(),
          description: description.trim() || undefined,
          image: uploadedImageUrl,
        });
      }

      // Reset form state
      setName("");
      setDescription("");
      setSelectedParentCatId("");
      setSubCategoryRows([]);
      setImageFile(null);
      setImagePreview(null);
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selected.length === 0) {
      alert("Please select at least one category");
      return;
    }

    try {
      const payload = {
        categories: selected.map((catId) => ({
          categoryId: catId,
          subCategoryIds: [],
        })),
      };

      await addCategoryMutation.mutateAsync(payload);
      navigate("/my-categories");
    } catch {
      // Error handled by hook toast
    }
  };

  // Filter categories by search input
  const filteredCategories = allCategories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 animate-pulse">
            Loading categories...
          </p>
        </div>
      </div>
    );
  }

  // ---------------- UI ----------------
  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* HEADER */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Request Category
        </h1>
        <BackButton />
      </div>

      {/* BREADCRUMBS */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          <FormSectionWithDots title="Select Categories">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select existing categories or request a new one:
              </span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                <PlusCircle size={14} /> + Create New Request
              </button>
            </div>

            {/* SELECTED CHIPS */}
            <div className="flex flex-wrap gap-2 mb-4">
              {selected.length === 0 && (
                <span className="text-sm text-gray-500">
                  No categories selected
                </span>
              )}

              {selected.map((id) => {
                const cat = allCategories.find((c) => c.id === id);
                if (!cat) return null;

                return (
                  <span
                    key={cat.id}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full border border-gray-300 dark:border-gray-600 text-xs"
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=64&h=64";
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[8px] text-gray-400">
                        N/A
                      </div>
                    )}
                    {cat.name}
                    <button
                      type="button"
                      onClick={() => handleRemove(cat.id)}
                      className="ml-1 text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>

            {/* SEARCH */}
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white border-gray-300 dark:border-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* CATEGORY LIST */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 bg-white">
                  No categories found
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center px-4 py-3 border-b last:border-b-0 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(cat.id)}
                      onChange={() => handleToggle(cat.id)}
                      className="mr-3 accent-green-600 cursor-pointer"
                    />

                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-8 h-8 rounded-full mr-3 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=64&h=64";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full mr-3 bg-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                        N/A
                      </div>
                    )}

                    <span className="text-sm text-gray-800">{cat.name}</span>
                  </div>
                ))
              )}
            </div>
          </FormSectionWithDots>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/my-categories")}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>

            <PrimaryButton
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>Send Request</span>
            </PrimaryButton>
          </div>
        </div>
      </form>

      {/* Unified Request Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Category / SubCategory Request"
        size="lg"
      >
        <form onSubmit={handleUnifiedSubmit} className="space-y-4 pt-2">
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Note: Requests require Admin approval before appearing in your store or active categories list.
          </p>

          {/* Type Selector Header */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Request Type <span className="text-red-500">*</span>
            </label>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Category + SubCategories
            </div>
          </div>

          {/* Parent Category selection (Only if subcategory) */}
          {requestType === "subcategory" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parent Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedParentCatId}
                onChange={(e) => setSelectedParentCatId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select Parent Category</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CATEGORY / SUBCATEGORY MAIN DETAILS */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {requestType === "category" ? "1. Category Details" : "SubCategory Details"}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {requestType === "category" ? "Category Name" : "SubCategory Name"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={requestType === "category" ? "e.g. Organic Produce" : "e.g. Leafy Greens"}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {requestType === "category" ? "Category Image" : "SubCategory Image"} (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs text-gray-600 dark:text-gray-300">
                      <Upload size={14} className="text-gray-400" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* SIMULTANEOUS SUBCATEGORIES SECTION WITH IMAGE UPLOADS */}
          {requestType === "category" && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    2. Mapped SubCategories & Images (Optional)
                  </h4>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Add multiple subcategories under this category simultaneously, each with its own photo!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSubCategoryRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  <Plus size={14} /> Add SubCategory
                </button>
              </div>

              {subCategoryRows.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-dashed border-gray-300">
                  No subcategories added yet. Click "+ Add SubCategory" above to include subcategories & images simultaneously.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {subCategoryRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative space-y-2"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          SubCategory #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubCategoryRow(row.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                          title="Remove SubCategory"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                            SubCategory Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={row.name}
                            onChange={(e) =>
                              handleSubCategoryFieldChange(row.id, "name", e.target.value)
                            }
                            placeholder="e.g. Leafy Greens"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                            SubCategory Photo (Optional)
                          </label>
                          {row.imagePreview ? (
                            <div className="flex items-center gap-2">
                              <div className="relative w-9 h-9 rounded overflow-hidden border border-gray-300 flex-shrink-0">
                                <img
                                  src={row.imagePreview}
                                  alt="SubCategory preview"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubCategoryImage(row.id)}
                                  className="absolute top-0 right-0 p-0.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                                >
                                  <X size={8} />
                                </button>
                              </div>
                              <span className="text-[11px] text-emerald-600 truncate font-medium">
                                Image attached
                              </span>
                            </div>
                          ) : (
                            <label className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs text-gray-600 dark:text-gray-300">
                              <Upload size={12} className="text-gray-400" />
                              <span className="text-[11px]">Upload Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSubCategoryImageChange(row.id, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            handleSubCategoryFieldChange(row.id, "description", e.target.value)
                          }
                          placeholder="Optional subcategory description..."
                          className="w-full border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1 text-[11px] focus:ring-1 focus:ring-green-500 bg-gray-50 dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requestCatMutation.isPending || requestSubCatMutation.isPending || uploadingImage}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploadingImage
                ? "Uploading Images..."
                : requestCatMutation.isPending || requestSubCatMutation.isPending
                ? "Submitting..."
                : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RequestCategoryPage;