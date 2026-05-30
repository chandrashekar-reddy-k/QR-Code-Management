import { useState } from "react";
import { Pencil } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BusinessSettingsModal from "../../../components/common/BusinessSettingsModal";
import { useGetWarehouseCategories } from "../../../hooks/category";

interface ApiSubCategory {
  id: string;
  name: string;
  image: string | null;
}

interface ApiCategory {
  id: string;
  categoryId: string;
  categoryName: string;
  image: string | null;
  icon: string | null;
  subCategories?: ApiSubCategory[];
}

interface ApiResponse {
  data?: ApiCategory[] | { categories?: ApiCategory[] };
}

interface CategoryGroup {
  mainCategory: { id: string; categoryId: string; categoryName: string };
  subCategories: Array<{ id: string; name: string }>;
}

const BusinessSettings = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch warehouse categories from API
  const { data: warehouseCategoriesData, isLoading, refetch } = useGetWarehouseCategories();

  // Transform API response to category groups
  const categoryGroups: CategoryGroup[] = (() => {
    const apiData = warehouseCategoriesData as ApiResponse | undefined;
    if (!apiData?.data) return [];

    // API response structure: data is an array of categories or data.categories
    const categories: ApiCategory[] = Array.isArray(apiData.data) 
      ? apiData.data 
      : (apiData.data && typeof apiData.data === 'object' && 'categories' in apiData.data)
        ? (apiData.data.categories || [])
        : [];

    const groups: CategoryGroup[] = [];

    categories.forEach((category: ApiCategory) => {
      const subCategories = category.subCategories || [];
      
      // Show all categories from API
      groups.push({
        mainCategory: {
          id: category.id,
          categoryId: category.categoryId,
          categoryName: category.categoryName,
        },
        subCategories: subCategories.map((subCat) => ({
          id: subCat.id,
          name: subCat.name,
        })),
      });
    });

    return groups;
  })();

  const handleEditComplete = () => {
    setIsEditModalOpen(false);
    // Refetch warehouse categories after edit
    refetch();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Breadcrumbs />

      <div className="mt-6">
        {/* Header with Title and Edit Icon */}
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Business Settings
          </h1>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Edit Business Settings"
          >
            <Pencil size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Category Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Loading categories...</p>
          </div>
        ) : categoryGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No business categories selected.</p>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="mt-4 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
            >
              Click here to add categories
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {categoryGroups.map((group) => (
              <div
                key={group.mainCategory.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                {/* Main Category */}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {group.mainCategory.categoryName}
                </h2>

                {/* Sub Categories */}
                {group.subCategories.length > 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Sub Categories : </span>
                    <span>
                      {group.subCategories.map((sub, index) => (
                        <span key={sub.id}>
                          {sub.name}
                          {index < group.subCategories.length - 1 && ", "}
                        </span>
                      ))}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    No sub-categories selected
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <BusinessSettingsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onComplete={handleEditComplete}
      />
    </div>
  );
};

export default BusinessSettings;
