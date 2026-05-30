import { useState, useEffect } from 'react';
import { ChevronDown, FolderTree } from 'lucide-react';
import { StatCard, PageHeader } from '../../../components/ui';

interface Category {
  id: number;
  name: string;
  parentId?: number | null;
}

const ProductsOrder = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Mock categories data
  const mockCategories: Category[] = [
    { id: 1, name: 'Electronics', parentId: null },
    { id: 2, name: 'Clothing', parentId: null },
    { id: 3, name: 'Food', parentId: null },
    { id: 4, name: 'Home & Garden', parentId: null },
    { id: 5, name: 'Sports', parentId: null },
    { id: 6, name: 'Books', parentId: null },
  ];

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await categoriesAPI.getAll();
      // const categoriesList = Array.isArray(data) ? data : data.categories || [];
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(mockCategories);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  // Calculate KPI metrics
  const totalCategories = categories.length;
  const selectedCategoryProducts = selectedCategory ? 0 : 0; // This would be calculated from products in selected category
  const firstCategory = categories.length > 0 ? categories[0].name : '-';
  const lastCategory = categories.length > 0 ? categories[categories.length - 1].name : '-';

  return (
    <div>
      <PageHeader
        title="Products Order"
        description="Products Order List"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          title="Total Categories"
          value={totalCategories}
          icon={FolderTree}
          variant="blue"
        />
        <StatCard
          title="Category Products"
          value={selectedCategoryProducts}
          icon={FolderTree}
          variant="green"
        />
        <StatCard
          title="First Category"
          value={firstCategory}
          icon={FolderTree}
          variant="purple"
        />
        <StatCard
          title="Last Category"
          value={lastCategory}
          icon={FolderTree}
          variant="yellow"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Categories
          </label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full px-3 py-1.5 text-xs border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white pr-8"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={14}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Select a Categories for update products order list.
          </p>
        </div>

        {loading && (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">Loading categories...</p>
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="text-center py-4">
            <FolderTree className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-xs text-gray-500">
              No categories available. Categories will be loaded when API is integrated.
            </p>
          </div>
        )}

        {selectedCategory && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-gray-700">
              Selected Category ID: <span className="font-semibold">{selectedCategory}</span>
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Product order management for this category will be available after API integration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsOrder;

