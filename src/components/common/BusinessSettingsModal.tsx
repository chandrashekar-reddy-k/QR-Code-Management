import { useState, useRef, useEffect, useMemo } from "react";
import Modal from "../ui/Modal/Modal";
import { Search, ChevronDown, X as CloseIcon, PlusCircle } from "lucide-react";
import { 
  useGetCategoriesAndSubCategories, 
  useAddCategoriesAndSubCategories,
  useGetWarehouseCategories,
  useEditWarehouseCategories,
  useRequestNewCategory,
  useRequestNewSubCategory
} from "../../hooks/category";

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface CategoryOption {
  value: string;
  label: string;
  level: number;
  parent: string | null;
}

interface ApiCategory {
  id: string;
  name: string;
  subCategories?: Array<{
    id: string;
    name: string;
  }>;
}

interface ApiResponse {
  data?: ApiCategory[] | { categories?: ApiCategory[] };
}

interface WarehouseCategoryResponse {
  data?: Array<{
    id: string;
    categoryId: string;
    categoryName: string;
    subCategories?: Array<{
      id: string;
      name: string;
    }>;
  }> | {
    categories?: Array<{
      id: string;
      categoryId: string;
      categoryName: string;
      subCategories?: Array<{
        id: string;
        name: string;
      }>;
    }>;
  };
}

const BusinessSettingsModal = ({
  isOpen,
  onClose,
  onComplete,
}: BusinessSettingsModalProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Modal state for requesting new category / subcategory
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubCatModal, setShowSubCatModal] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const [selectedParentCatId, setSelectedParentCatId] = useState("");
  const [newSubCatName, setNewSubCatName] = useState("");
  const [newSubCatDesc, setNewSubCatDesc] = useState("");

  const requestCatMutation = useRequestNewCategory();
  const requestSubCatMutation = useRequestNewSubCategory();

  // Only fetch when modal is open — avoids GET partner/categories/*/catandsubcat on every
  // Dashboard / Business Settings page load (backend treats unsolicited calls as "blank" requests).
  const { data: categoriesData, isLoading } = useGetCategoriesAndSubCategories({
    enabled: isOpen,
  });

  const { data: warehouseCategoriesData } = useGetWarehouseCategories({
    enabled: isOpen,
  });
  
  // Mutation hooks for adding and editing categories
  const addCategoriesMutation = useAddCategoriesAndSubCategories();
  const editCategoriesMutation = useEditWarehouseCategories();
  
  // Check if we're in edit mode (if warehouse categories exist)
  const isEditMode = useMemo(() => {
    if (!warehouseCategoriesData) return false;
    const apiData = warehouseCategoriesData as WarehouseCategoryResponse;
    const categories = Array.isArray(apiData?.data) 
      ? apiData.data 
      : (apiData?.data?.categories || []);
    return categories.length > 0;
  }, [warehouseCategoriesData]);

  // Extract raw categories list for dropdown and selection
  const categoriesList = useMemo(() => {
    const apiData = categoriesData as ApiResponse | undefined;
    if (!apiData?.data) return [];
    return Array.isArray(apiData.data) 
      ? apiData.data 
      : (apiData.data && typeof apiData.data === 'object' && 'categories' in apiData.data)
        ? (apiData.data.categories || [])
        : [];
  }, [categoriesData]);

  // Transform API response to flat structure with level and parent
  const BUSINESS_CATEGORIES = useMemo<CategoryOption[]>(() => {
    const flatCategories: CategoryOption[] = [];

    categoriesList.forEach((category: ApiCategory) => {
      // Main category - using exact API field names: id, name
      const categoryId = category.id;
      const categoryName = category.name;

      if (categoryId && categoryName) {
        flatCategories.push({
          value: categoryId,
          label: categoryName,
          level: 0,
          parent: null,
        });

        // Sub-categories - using exact API field name: subCategories
        const subCategories = category.subCategories || [];
        subCategories.forEach((subCat) => {
          // SubCategory fields: id, name
          const subCatId = subCat.id;
          const subCatName = subCat.name;

          if (subCatId && subCatName) {
            flatCategories.push({
              value: subCatId,
              label: subCatName,
              level: 1,
              parent: categoryId,
            });
          }
        });
      }
    });

    return flatCategories;
  }, [categoriesList]);

  // Filter categories: if main category matches, show it + all sub-categories
  // If sub-category matches, show it + its parent
  const filteredCategories = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return BUSINESS_CATEGORIES;

    const matchedValues = new Set<string>();

    BUSINESS_CATEGORIES.forEach((opt) => {
      const matchesSearch = opt.label.toLowerCase().includes(searchLower);
      
      if (matchesSearch) {
        matchedValues.add(opt.value);
        
        // If main category matches, add all its sub-categories
        if (opt.level === 0) {
          BUSINESS_CATEGORIES.forEach((child) => {
            if (child.parent === opt.value) {
              matchedValues.add(child.value);
            }
          });
        }
        
        // If sub-category matches, add its parent
        if (opt.level === 1 && opt.parent) {
          matchedValues.add(opt.parent);
        }
      }
    });

    return BUSINESS_CATEGORIES.filter((opt) => matchedValues.has(opt.value));
  }, [BUSINESS_CATEGORIES, search]);

  const selectedOptions = BUSINESS_CATEGORIES.filter((opt) =>
    selectedCategories.includes(opt.value)
  );

  // Load existing warehouse categories when modal opens in edit mode
  useEffect(() => {
    if (isOpen && isEditMode && warehouseCategoriesData && BUSINESS_CATEGORIES.length > 0) {
      const apiData = warehouseCategoriesData as WarehouseCategoryResponse;
      const categories = Array.isArray(apiData?.data) 
        ? apiData.data 
        : (apiData?.data?.categories || []);
      
      const selectedIds = new Set<string>();
      
      // Transform warehouse categories to selected IDs
      // The warehouse API returns categories with categoryId and subCategoryIds
      // We need to map these to the category options
      categories.forEach((cat) => {
        const categoryId = cat.categoryId;
        const subCategories = cat.subCategories || [];
        
        // Find the main category option by matching categoryId
        const mainCategoryOption = BUSINESS_CATEGORIES.find(
          (opt) => opt.level === 0 && opt.value === categoryId
        );
        
        if (mainCategoryOption) {
          // Always include category; subcategories can be empty for some categories
          selectedIds.add(categoryId);
          
          // Add all subcategories by matching their IDs
          subCategories.forEach((subCat) => {
            selectedIds.add(subCat.id);
          });
        }
      });
      
      setSelectedCategories(Array.from(selectedIds));
    } else if (isOpen && !isEditMode) {
      // Reset selections when opening in add mode
      setSelectedCategories([]);
    }
  }, [isOpen, isEditMode, warehouseCategoriesData, BUSINESS_CATEGORIES]);
  
  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Transform selected categories into API payload format
  const transformToPayload = useMemo(() => {
    if (selectedCategories.length === 0) return { categories: [] };

    const selectedSet = new Set(selectedCategories);
    const categoryMap = new Map<string, string[]>(); // categoryId -> subCategoryIds[]

    // Start with all selected main categories (including those without sub-categories)
    BUSINESS_CATEGORIES.forEach((option) => {
      if (option.level === 0 && selectedSet.has(option.value)) {
        categoryMap.set(option.value, []);
      }
    });

    // Group selected subcategories by their parent category
    BUSINESS_CATEGORIES.forEach((option) => {
      if (option.level === 1 && option.parent && selectedSet.has(option.value)) {
        // This is a selected subcategory
        if (!categoryMap.has(option.parent)) {
          categoryMap.set(option.parent, []);
        }
        categoryMap.get(option.parent)!.push(option.value);
      }
    });

    // Build payload: include selected categories even if subCategoryIds is empty
    const categories = Array.from(categoryMap.entries())
      .map(([categoryId, subCategoryIds]) => ({
        categoryId,
        subCategoryIds,
      }));

    return { categories };
  }, [selectedCategories, BUSINESS_CATEGORIES]);

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await requestCatMutation.mutateAsync({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined
      });
      setNewCatName("");
      setNewCatDesc("");
      setShowCatModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCatId || !newSubCatName.trim()) return;
    try {
      await requestSubCatMutation.mutateAsync({
        categoryId: selectedParentCatId,
        name: newSubCatName.trim(),
        description: newSubCatDesc.trim() || undefined
      });
      setSelectedParentCatId("");
      setNewSubCatName("");
      setNewSubCatDesc("");
      setShowSubCatModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0) {
      setError("Please select at least one business category");
      return;
    }

    // Drop invalid rows so we never send { categories: [] } or blank ids (backend may clear data)
    const sanitizedCategories = transformToPayload.categories.filter(
      (c) => c.categoryId && String(c.categoryId).trim().length > 0,
    );

    if (sanitizedCategories.length === 0) {
      setError("Please select at least one category");
      return;
    }

    const payload = { categories: sanitizedCategories };

    try {
      setError("");

      // Call appropriate API based on edit mode
      if (isEditMode) {
        await editCategoriesMutation.mutateAsync(payload);
      } else {
        await addCategoriesMutation.mutateAsync(payload);
      }

      onComplete();
    } catch (error: unknown) {
      // Error is already handled by the mutation hook's onError
      console.error("Error saving categories:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as { message?: string }).message)
          : "Failed to save categories. Please try again.";
      setError(errorMessage);
    }
  };

  const handleSelectCategory = (value: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      const option = BUSINESS_CATEGORIES.find((o) => o.value === value);

      if (!option) return Array.from(next);

      // If main category (level 0) → toggle all its children together
      if (option.level === 0) {
        const children = BUSINESS_CATEGORIES.filter((o) => o.parent === option.value);
        const allValues = [option.value, ...children.map((c) => c.value)];

        const isAlreadySelected = allValues.every((val) => next.has(val));

        if (isAlreadySelected) {
          // Unselect parent and all its sub categories
          allValues.forEach((val) => next.delete(val));
        } else {
          // Select parent and all sub categories
          allValues.forEach((val) => next.add(val));
        }
        return Array.from(next);
      }

      // If sub category (level 1)
      if (next.has(value)) {
        // Unselect this sub category
        next.delete(value);

        // If no other sub categories of same parent selected, also unselect parent
        if (option.parent) {
          const hasAnySiblingSelected = BUSINESS_CATEGORIES.some(
            (o) =>
              o.parent === option.parent &&
              o.value !== value &&
              next.has(o.value)
          );
          if (!hasAnySiblingSelected) {
            next.delete(option.parent);
          }
        }
      } else {
        // Select this sub category
        next.add(value);

        // Ensure parent is selected too
        if (option.parent) {
          next.add(option.parent);
        }
      }

      return Array.from(next);
    });
    if (error) setError("");
  };

  const handleRemoveCategory = (
    value: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      const option = BUSINESS_CATEGORIES.find((o) => o.value === value);
      if (!option) return Array.from(next);

      // If removing main category chip → remove parent and all its sub categories
      if (option.level === 0) {
        const children = BUSINESS_CATEGORIES.filter((o) => o.parent === option.value);
        const allValues = [option.value, ...children.map((c) => c.value)];
        allValues.forEach((val) => next.delete(val));
        return Array.from(next);
      }

      // Removing sub category chip
      next.delete(value);

      if (option.parent) {
        const hasAnySiblingSelected = BUSINESS_CATEGORIES.some(
          (o) =>
            o.parent === option.parent &&
            o.value !== value &&
            next.has(o.value)
        );
        // If no siblings remain, also remove parent
        if (!hasAnySiblingSelected) {
          next.delete(option.parent);
        }
      }

      return Array.from(next);
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Business Settings"
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Business Category
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 hover:underline"
                >
                  <PlusCircle size={13} /> New Category
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={() => setShowSubCatModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <PlusCircle size={13} /> New SubCategory
                </button>
              </div>
            </div>

            <div className="w-full max-w-md" ref={dropdownRef}>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setIsOpenDropdown((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <div className="flex-1 min-w-0 mr-2">
                  {selectedOptions.length === 0 ? (
                    <span className="text-gray-400 text-sm">Select Category</span>
                  ) : (
                    <div className="inline-flex flex-wrap items-center gap-1 px-2 py-1 rounded-md bg-gray-100 border border-gray-200">
                      {selectedOptions.map((opt) => (
                        <span
                          key={opt.value}
                          className="inline-flex items-center gap-1 text-xs text-gray-800"
                        >
                          {opt.label}
                          <button
                            type="button"
                            onClick={(e) => handleRemoveCategory(opt.value, e)}
                            className="focus:outline-none"
                          >
                            <CloseIcon
                              size={10}
                              className="text-gray-500 hover:text-gray-700"
                            />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Dropdown panel */}
              {isOpenDropdown && (
                <div className="mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  {/* Search */}
                  <div className="flex items-center px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <Search size={16} className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      placeholder="Search Category"
                      className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                    />
                  </div>

                  {/* Options */}
                  <div className="max-h-60 overflow-y-auto">
                    {isLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        Loading categories...
                      </div>
                    ) : (
                      <>
                        {filteredCategories.map((opt) => {
                          const checked = selectedCategories.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectCategory(opt.value)}
                              className={`w-full flex items-center py-3 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                opt.level ? "pl-8 pr-4" : "px-4"
                              }`}
                            >
                              <input
                                type="checkbox"
                                readOnly
                                checked={checked}
                                className="w-4 h-4 mr-3 border-gray-300 dark:border-gray-600 rounded"
                              />
                              <span className={`truncate ${opt.level ? "" : "font-medium"}`}>
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                        {filteredCategories.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            No results
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={addCategoriesMutation.isPending || editCategoriesMutation.isPending || isLoading}
              className="w-full sm:w-40 mx-auto block bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg shadow-md transition-colors text-sm"
            >
              {(addCategoriesMutation.isPending || editCategoriesMutation.isPending) ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request New Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Request New Category" size="sm">
        <form onSubmit={handleCreateCategorySubmit} className="space-y-4 pt-2">
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Note: Requested categories require Admin approval before appearing in your store or active categories list.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Organic Produce"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Brief description of the category..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCatModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requestCatMutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm shadow disabled:opacity-50"
            >
              {requestCatMutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request New SubCategory Modal */}
      <Modal isOpen={showSubCatModal} onClose={() => setShowSubCatModal(false)} title="Request New SubCategory" size="sm">
        <form onSubmit={handleCreateSubCategorySubmit} className="space-y-4 pt-2">
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Note: Requested subcategories require Admin approval before appearing in your store.
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
              {categoriesList.map((cat: ApiCategory) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SubCategory Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newSubCatName}
              onChange={(e) => setNewSubCatName(e.target.value)}
              placeholder="e.g. Leafy Greens"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={newSubCatDesc}
              onChange={(e) => setNewSubCatDesc(e.target.value)}
              placeholder="Brief description of the subcategory..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSubCatModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requestSubCatMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow disabled:opacity-50"
            >
              {requestSubCatMutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default BusinessSettingsModal;

