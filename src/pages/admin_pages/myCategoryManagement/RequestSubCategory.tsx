import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ChevronDown, ChevronUp, Search, PlusCircle, Upload, X } from "lucide-react";
import {
  FormSectionWithDots,
  PrimaryButton,
  Button,
  Modal,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { 
  useGetCategoriesAndSubCategories, 
  useAddCategoriesAndSubCategories,
  useRequestNewSubCategory 
} from "../../../hooks/category";
import { uploadImageFile } from "../../../lib/uploadImage";

interface SubCategory {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  image: string | null;
  subCategories: SubCategory[];
}

const RequestSubCategory = () => {
  const navigate = useNavigate();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Create new subcategory request state
  const [showModal, setShowModal] = useState(false);
  const [selectedParentCatId, setSelectedParentCatId] = useState("");
  const [subCatName, setSubCatName] = useState("");
  const [subCatDescription, setSubCatDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch categories and subcategories from database
  const { data: categoryData, isLoading } = useGetCategoriesAndSubCategories();
  const allCategories: Category[] = (categoryData as any)?.data || [];

  const requestSubCatMutation = useRequestNewSubCategory();
  const addCategoryMutation = useAddCategoriesAndSubCategories();

  // ---------------- HANDLERS ----------------

  const handleCategoryToggle = (id: string) => {
    const category = allCategories.find((c) => c.id === id);
    if (!category) return;

    const subIds = category.subCategories.map((s) => s.id);

    if (selectedCategories.includes(id)) {
      setSelectedCategories((prev) => prev.filter((c) => c !== id));
      setSelectedSubCategories((prev) =>
        prev.filter((sid) => !subIds.includes(sid))
      );
    } else {
      setSelectedCategories((prev) => [...prev, id]);
      setSelectedSubCategories((prev) => [...new Set([...prev, ...subIds])]);
    }
  };

  const handleSubCategoryToggle = (sub: SubCategory, parentCategoryId: string) => {
    const isSelected = selectedSubCategories.includes(sub.id);

    if (isSelected) {
      const updated = selectedSubCategories.filter((id) => id !== sub.id);
      setSelectedSubCategories(updated);

      const parentSubs = allCategories
        .find((c) => c.id === parentCategoryId)
        ?.subCategories.map((s) => s.id);

      const stillHas = updated.some((id) => parentSubs?.includes(id));

      if (!stillHas) {
        setSelectedCategories((prev) =>
          prev.filter((c) => c !== parentCategoryId)
        );
      }
    } else {
      setSelectedSubCategories((prev) => [...prev, sub.id]);

      if (!selectedCategories.includes(parentCategoryId)) {
        setSelectedCategories((prev) => [...prev, parentCategoryId]);
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleRemoveCategory = (id: string) => {
    const subIds = allCategories.find((c) => c.id === id)?.subCategories.map(s => s.id) || [];

    setSelectedCategories((prev) => prev.filter((c) => c !== id));
    setSelectedSubCategories((prev) => prev.filter((s) => !subIds.includes(s)));
  };

  const handleRemoveSub = (id: string) => {
    setSelectedSubCategories((prev) => prev.filter((s) => s !== id));
  };

  const filteredSub = (subs: SubCategory[]) =>
    subs.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

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

  const handleCreateSubCategoryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCatId) {
      alert("Please select a parent category");
      return;
    }
    if (!subCatName.trim()) {
      alert("Please enter a subcategory name");
      return;
    }

    try {
      setUploadingImage(true);
      let uploadedImageUrl: string | undefined = undefined;
      if (imageFile) {
        uploadedImageUrl = await uploadImageFile(imageFile);
      }

      await requestSubCatMutation.mutateAsync({
        categoryId: selectedParentCatId,
        name: subCatName.trim(),
        description: subCatDescription.trim() || undefined,
        image: uploadedImageUrl,
      });

      // Reset form
      setSubCatName("");
      setSubCatDescription("");
      setSelectedParentCatId("");
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

    if (selectedCategories.length === 0) {
      alert("Please select at least one category");
      return;
    }

    try {
      const payload = {
        categories: selectedCategories.map((catId) => {
          const cat = allCategories.find((c) => c.id === catId);
          const subIds = (cat?.subCategories || [])
            .map((s) => s.id)
            .filter((subId) => selectedSubCategories.includes(subId));

          return {
            categoryId: catId,
            subCategoryIds: subIds,
          };
        }),
      };

      await addCategoryMutation.mutateAsync(payload);
      navigate("/my-categories");
    } catch {
      // Error handled by hook toast
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 animate-pulse">
            Loading categories and subcategories...
          </p>
        </div>
      </div>
    );
  }

  // ---------------- UI ----------------
  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">

      {/* HEADER */}
      <div className="mb-3 mt-3 flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-900">Request SubCategory</h1>
        <BackButton />
      </div>

      <div className="mb-4">
        <Breadcrumbs />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          <FormSectionWithDots title="Select Categories & Subcategories">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select existing subcategories or request a new one for Admin approval:
              </span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                <PlusCircle size={14} /> + Create New SubCategory Request
              </button>
            </div>

            {/* CATEGORY CHIPS */}
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedCategories.length === 0 ? (
                <span className="text-sm text-gray-500">
                  No categories selected
                </span>
              ) : (
                selectedCategories.map((id) => {
                  const cat = allCategories.find((c) => c.id === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full border border-gray-300 dark:border-gray-600 text-xs text-gray-800"
                    >
                      {cat?.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=64&h=64";
                          }}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[6px] text-gray-400">
                          N/A
                        </div>
                      )}
                      {cat?.name}
                      <button type="button" onClick={() => handleRemoveCategory(id)} className="ml-1 hover:text-red-500">×</button>
                    </span>
                  );
                })
              )}
            </div>

            {/* SUBCATEGORY CHIPS */}
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSubCategories.length === 0 ? (
                <span className="text-sm text-gray-500">
                  No subcategories selected
                </span>
              ) : (
                selectedSubCategories.map((id) => {
                  const sub = allCategories
                    .flatMap((c) => c.subCategories)
                    .find((s) => s.id === id);

                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full border border-gray-300 dark:border-gray-600 text-xs text-gray-800"
                    >
                      {sub?.name}
                      <button type="button" onClick={() => handleRemoveSub(id)} className="ml-1 hover:text-red-500">×</button>
                    </span>
                  );
                })
              )}
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
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto bg-white">
              {allCategories.map((cat) => (
                <div key={cat.id} className="border-b last:border-b-0 border-gray-200">
                  <div className="flex items-center px-4 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => handleCategoryToggle(cat.id)}
                      className="accent-green-600 cursor-pointer"
                    />

                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-8 h-8 rounded-full ml-3 mr-2 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=64&h=64";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full ml-3 mr-2 bg-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                        N/A
                      </div>
                    )}

                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>

                    <button
                      type="button"
                      className="ml-auto text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => toggleExpand(cat.id)}
                    >
                      {expandedCategories.includes(cat.id) ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>

                  {expandedCategories.includes(cat.id) && (
                    <div className="ml-10 border-l border-gray-200">
                      {filteredSub(cat.subCategories).length === 0 ? (
                        <div className="px-4 py-2 text-xs text-gray-500">No subcategories match your search</div>
                      ) : (
                        filteredSub(cat.subCategories).map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center px-4 py-2 hover:bg-gray-50 transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubCategories.includes(sub.id)}
                              onChange={() => handleSubCategoryToggle(sub, cat.id)}
                              className="accent-green-600 cursor-pointer"
                            />
                            <span className="ml-2 text-xs text-gray-700">{sub.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </FormSectionWithDots>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => navigate("/my-sub-categories")} className="px-4 py-2 text-xs font-medium">
              Cancel
            </Button>
            <PrimaryButton type="submit" className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium">
              <Save size={14} />
              <span>Send Request</span>
            </PrimaryButton>
          </div>
        </div>
      </form>

      {/* CREATE NEW SUBCATEGORY REQUEST MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New SubCategory Request"
        size="md"
      >
        <form onSubmit={handleCreateSubCategoryRequest} className="space-y-4 pt-2">
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Note: SubCategory requests require Admin approval before appearing in active lists.
          </p>

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

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              SubCategory Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subCatName}
              onChange={(e) => setSubCatName(e.target.value)}
              placeholder="e.g. Organic Green Tea"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={subCatDescription}
              onChange={(e) => setSubCatDescription(e.target.value)}
              placeholder="Brief subcategory details..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              SubCategory Image (Optional)
            </label>
            {imagePreview ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-700"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 transition-all">
                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                  <Upload size={18} className="text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Click to upload image
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={uploadingImage || requestSubCatMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>
                {uploadingImage
                  ? "Uploading..."
                  : requestSubCatMutation.isPending
                  ? "Submitting..."
                  : "Submit for Approval"}
              </span>
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RequestSubCategory;