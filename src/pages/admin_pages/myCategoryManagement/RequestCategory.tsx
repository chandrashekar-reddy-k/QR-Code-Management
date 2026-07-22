import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Search } from "lucide-react";
import {
  FormSectionWithDots,
  PrimaryButton,
  Button,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { useGetProductCategoriesList } from "../../../hooks/product";
import { useAddCategoriesAndSubCategories } from "../../../hooks/category";

interface ApiCategory {
  id: string;
  name: string;
  image: string | null;
}

const RequestCategoryPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // Fetch active categories from the database using the partner-compatible product categories hook
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selected.length === 0) {
      alert("Please select at least one category");
      return;
    }

    try {
      const payload = {
        categories: selected.map(catId => {
          const category = allCategories.find(c => c.id === catId);
          return {
            categoryId: catId,
            subCategoryIds: []
          };
        })
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
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=64&h=64";
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
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=64&h=64";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full mr-3 bg-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                        N/A
                      </div>
                    )}

                    <span className="text-sm text-gray-800">
                      {cat.name}
                    </span>
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
    </div>
  );
};

export default RequestCategoryPage;