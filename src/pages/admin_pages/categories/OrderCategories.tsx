import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, GripVertical, FolderTree, ListOrdered, CheckCircle2, XCircle } from 'lucide-react';
import { StatCard, PageHeader } from '../../../components/ui';

interface Category {
  id: number;
  name: string;
  slug: string;
  order: number;
}

// Mock categories for OrderCategories
const mockOrderCategories: Category[] = [
  { id: 1, name: 'Electronics', slug: 'electronics', order: 1 },
  { id: 2, name: 'Clothing', slug: 'clothing', order: 2 },
  { id: 3, name: 'Food', slug: 'food', order: 3 },
  { id: 4, name: 'Home & Garden', slug: 'home-garden', order: 4 },
  { id: 5, name: 'Sports', slug: 'sports', order: 5 },
  { id: 6, name: 'Books', slug: 'books', order: 6 },
];

const OrderCategories = () => {
  const [categories, setCategories] = useState<Category[]>(mockOrderCategories);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await categoriesAPI.getAll();
      // const categoriesWithOrder = Array.isArray(data) 
      //   ? data.map((cat: any, index: number) => ({ ...cat, order: cat.order || index + 1 }))
      //   : (data.categories || []).map((cat: any, index: number) => ({ ...cat, order: cat.order || index + 1 }));
      setCategories(mockOrderCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(mockOrderCategories);
    } finally {
      setLoading(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    newCategories[index - 1].order = index;
    newCategories[index].order = index + 1;
    setCategories(newCategories);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    newCategories[index].order = index + 1;
    newCategories[index + 1].order = index + 2;
    setCategories(newCategories);
  };

  const handleSave = async () => {
    try {
      // Using mock data for now - replace with API call when ready
      // await categoriesAPI.updateOrder(categories.map(cat => ({ id: cat.id, order: cat.order })));
      alert('Category order saved successfully!');
    } catch (error: any) {
      console.error('Error saving category order:', error);
      alert(error.message || 'Error saving category order. Please try again.');
    }
  };

  // Calculate KPI stats
  const totalCategories = categories.length;
  const orderedCategories = categories.filter(c => c.order).length;
  const firstCategory = categories.find(c => c.order === 1)?.name || 'N/A';
  const lastCategory = categories.length > 0 ? categories[categories.length - 1].name : 'N/A';

  return (
    <div>
      <PageHeader
        title="Order Categories"
        description="Drag and reorder categories or use arrows to change order"
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
          title="Ordered Categories"
          value={orderedCategories}
          icon={ListOrdered}
          variant="green"
        />
        <StatCard
          title="First Category"
          value={firstCategory}
          icon={CheckCircle2}
          variant="purple"
        />
        <StatCard
          title="Last Category"
          value={lastCategory}
          icon={XCircle}
          variant="yellow"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-xs text-gray-500">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-gray-500">No categories found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category, index) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <GripVertical className="text-gray-400 cursor-move" size={16} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-800">{category.name}</p>
                <p className="text-[10px] text-gray-500">/{category.slug}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Move Up"
                >
                  <ArrowUp size={14} className="text-gray-600" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === categories.length - 1}
                  className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Move Down"
                >
                  <ArrowDown size={14} className="text-gray-600" />
                </button>
              </div>
            </div>
          ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
          >
            Save Order
          </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCategories;

