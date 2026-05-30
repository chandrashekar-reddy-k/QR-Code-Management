import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Upload,
  X,
  FolderTree,
  Image as ImageIcon,
  Package,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  FileUp,
  Search,
} from "lucide-react";
import {
  SearchInput,
  Button,
  ConfirmModal,
  SortableTableHeader,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  BackButton,
  TextInput,
  SelectInput,
} from "../../../components/ui";

interface SubCategory {
  id: number;
  parentId: number;
  parentName: string;
  name: string;
  subtitle: string;
  image: string;
  status: "active" | "inactive";
  slug: string;
}

type SortField = "id" | "parentId" | "name" | "subtitle" | "status" | null;
type SortDirection = "asc" | "desc" | null;

// Groceries subcategory images
const subCategoryImages = [
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop", // Fresh Fruits
  "https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=400&h=400&fit=crop", // Fresh Vegetables
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop", // Milk & Cream
  "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop", // Cheese & Butter
  "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=400&fit=crop", // Rice & Wheat
  "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=400&fit=crop", // Lentils & Beans
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop", // Whole Spices
  "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", // Spice Powders
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=400&fit=crop", // Tea & Coffee
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop", // Juices & Drinks
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=400&h=400&fit=crop", // Chips & Namkeen
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop", // Biscuits & Cookies
  "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=400&fit=crop", // Soaps & Shampoos
  "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop", // Toothpaste & Brushes
  "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop", // Cleaning Supplies
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=400&fit=crop", // Detergents & Soaps
];

// Mock data for groceries subcategories
const mockSubCategories: SubCategory[] = [
  {
    id: 1,
    parentId: 1,
    parentName: "Fruits & Vegetables",
    name: "Fresh Fruits",
    subtitle: "Seasonal and exotic fruits",
    image: subCategoryImages[0],
    status: "active",
    slug: "fresh-fruits",
  },
  {
    id: 2,
    parentId: 1,
    parentName: "Fruits & Vegetables",
    name: "Fresh Vegetables",
    subtitle: "Organic and fresh vegetables",
    image: subCategoryImages[1],
    status: "active",
    slug: "fresh-vegetables",
  },
  {
    id: 3,
    parentId: 2,
    parentName: "Dairy Products",
    name: "Milk & Cream",
    subtitle: "Fresh milk and cream",
    image: subCategoryImages[2],
    status: "active",
    slug: "milk-cream",
  },
  {
    id: 4,
    parentId: 2,
    parentName: "Dairy Products",
    name: "Cheese & Butter",
    subtitle: "Premium cheese and butter",
    image: subCategoryImages[3],
    status: "active",
    slug: "cheese-butter",
  },
  {
    id: 5,
    parentId: 3,
    parentName: "Grains & Pulses",
    name: "Rice & Wheat",
    subtitle: "Premium quality rice and wheat",
    image: subCategoryImages[4],
    status: "active",
    slug: "rice-wheat",
  },
  {
    id: 6,
    parentId: 3,
    parentName: "Grains & Pulses",
    name: "Lentils & Beans",
    subtitle: "Various dals and pulses",
    image: subCategoryImages[5],
    status: "active",
    slug: "lentils-beans",
  },
  {
    id: 7,
    parentId: 4,
    parentName: "Spices & Condiments",
    name: "Whole Spices",
    subtitle: "Whole spices and masalas",
    image: subCategoryImages[6],
    status: "active",
    slug: "whole-spices",
  },
  {
    id: 8,
    parentId: 4,
    parentName: "Spices & Condiments",
    name: "Spice Powders",
    subtitle: "Ground spices and powders",
    image: subCategoryImages[7],
    status: "active",
    slug: "spice-powders",
  },
  {
    id: 9,
    parentId: 5,
    parentName: "Beverages",
    name: "Tea & Coffee",
    subtitle: "Premium tea and coffee",
    image: subCategoryImages[8],
    status: "active",
    slug: "tea-coffee",
  },
  {
    id: 10,
    parentId: 5,
    parentName: "Beverages",
    name: "Juices & Drinks",
    subtitle: "Fresh juices and soft drinks",
    image: subCategoryImages[9],
    status: "active",
    slug: "juices-drinks",
  },
  {
    id: 11,
    parentId: 6,
    parentName: "Snacks & Sweets",
    name: "Chips & Namkeen",
    subtitle: "Crispy snacks and namkeen",
    image: subCategoryImages[10],
    status: "active",
    slug: "chips-namkeen",
  },
  {
    id: 12,
    parentId: 6,
    parentName: "Snacks & Sweets",
    name: "Biscuits & Cookies",
    subtitle: "Sweet and savory biscuits",
    image: subCategoryImages[11],
    status: "active",
    slug: "biscuits-cookies",
  },
  {
    id: 13,
    parentId: 7,
    parentName: "Personal Care",
    name: "Soaps & Shampoos",
    subtitle: "Body care and hair care",
    image: subCategoryImages[12],
    status: "active",
    slug: "soaps-shampoos",
  },
  {
    id: 14,
    parentId: 7,
    parentName: "Personal Care",
    name: "Toothpaste & Brushes",
    subtitle: "Oral care products",
    image: subCategoryImages[13],
    status: "active",
    slug: "toothpaste-brushes",
  },
  {
    id: 15,
    parentId: 8,
    parentName: "Household Items",
    name: "Cleaning Supplies",
    subtitle: "Household cleaning products",
    image: subCategoryImages[14],
    status: "active",
    slug: "cleaning-supplies",
  },
  {
    id: 16,
    parentId: 8,
    parentName: "Household Items",
    name: "Detergents & Soaps",
    subtitle: "Laundry and dish care",
    image: subCategoryImages[15],
    status: "active",
    slug: "detergents-soaps",
  },
];

// Mock parent categories (groceries)
const mockParentCategories = [
  { id: 1, name: "Fruits & Vegetables" },
  { id: 2, name: "Dairy Products" },
  { id: 3, name: "Grains & Pulses" },
  { id: 4, name: "Spices & Condiments" },
  { id: 5, name: "Beverages" },
  { id: 6, name: "Snacks & Sweets" },
  { id: 7, name: "Personal Care" },
  { id: 8, name: "Household Items" },
];

const AddSubCategories = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [subCategories, setSubCategories] =
    useState<SubCategory[]>(mockSubCategories);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    parentCategory: "",
    categoryName: "",
    slug: "",
    categorySubtitle: "",
    image: null as File | null,
    metaTitle: "",
    metaKeywords: "",
    schemaMarkup: "",
    metaDescription: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Function to generate slug from category name
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // Auto-generate slug when category name changes
    if (name === "categoryName") {
      const autoSlug = generateSlug(value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        slug: autoSlug,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        if (
          img.width < 350 ||
          img.width > 550 ||
          img.height < 350 ||
          img.height > 550
        ) {
          setErrors((prev) => ({
            ...prev,
            image: "Image must be between 350px*350px and 550px*550px",
          }));
          setImagePreview(null);
          setFormData((prev) => ({ ...prev, image: null }));
        } else if (img.width !== img.height) {
          setErrors((prev) => ({
            ...prev,
            image: "Image must be square (same width and height)",
          }));
          setImagePreview(null);
          setFormData((prev) => ({ ...prev, image: null }));
        } else {
          setFormData((prev) => ({ ...prev, image: file }));
          setImagePreview(objectUrl);
          setErrors((prev) => ({ ...prev, image: "" }));
        }
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleImageChange({ target: input } as any);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.parentCategory) {
      newErrors.parentCategory = "Parent category is required";
    }

    if (!formData.categoryName.trim()) {
      newErrors.categoryName = "Category name is required";
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "Slug is required";
    }

    if (!formData.categorySubtitle.trim()) {
      newErrors.categorySubtitle = "Category subtitle is required";
    }

    if (!formData.image && !editingId) {
      newErrors.image = "Image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const fetchSubCategories = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      setSubCategories(mockSubCategories);
      // Small delay so loading spinner is visible when using mock data
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (error) {
      console.error("Error fetching sub categories:", error);
      setSubCategories(mockSubCategories);
    } finally {
      setLoading(false);
    }
  };

  const getSortedSubCategories = () => {
    let filtered = subCategories.filter((subCat) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        subCat.name.toLowerCase().includes(searchLower) ||
        subCat.subtitle.toLowerCase().includes(searchLower) ||
        subCat.parentName.toLowerCase().includes(searchLower) ||
        subCat.id.toString().includes(searchLower) ||
        subCat.slug.toLowerCase().includes(searchLower)
      );
    });

    if (!sortField) return filtered;

    return filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "parentId") {
        aValue = aValue ?? 0;
        bValue = bValue ?? 0;
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Export sub categories to CSV
  const handleExport = () => {
    const headers = [
      "ID",
      "Parent ID",
      "Parent Name",
      "Name",
      "Subtitle",
      "Slug",
      "Status",
    ];
    const rows = subCategories.map((sc) => [
      sc.id,
      sc.parentId,
      sc.parentName,
      sc.name,
      sc.subtitle,
      sc.slug,
      sc.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `sub_categories_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import sub categories from CSV
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());

            const importedSubCategories: SubCategory[] = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i]
                .split(",")
                .map((v) => v.replace(/"/g, "").trim());
              if (values.length >= 7) {
                const parentId = parseInt(values[1]);
                const parent = mockParentCategories.find(
                  (p) => p.id === parentId
                );
                importedSubCategories.push({
                  id: parseInt(values[0]) || subCategories.length + i,
                  parentId: parentId,
                  parentName: values[2] || parent?.name || "",
                  name: values[3] || "",
                  subtitle: values[4] || "",
                  slug:
                    values[5] ||
                    values[3]?.toLowerCase().replace(/\s+/g, "-") ||
                    "",
                  status: (values[6] as "active" | "inactive") || "active",
                  image:
                    subCategoryImages[
                      Math.floor(Math.random() * subCategoryImages.length)
                    ],
                });
              }
            }

            if (importedSubCategories.length > 0) {
              setSubCategories([...subCategories, ...importedSubCategories]);
              alert(
                `Successfully imported ${importedSubCategories.length} sub categories!`
              );
            } else {
              alert("No valid sub categories found in the file.");
            }
          } catch (error) {
            console.error("Error importing sub categories:", error);
            alert(
              "Error importing sub categories. Please check the file format."
            );
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        const parentCategory = mockParentCategories.find(
          (p) => p.id.toString() === formData.parentCategory
        );

        if (editingId) {
          // Update existing subcategory
          setSubCategories(
            subCategories.map((sc) =>
              sc.id === editingId
                ? {
                    ...sc,
                    parentId: parseInt(formData.parentCategory),
                    parentName: parentCategory?.name || "",
                    name: formData.categoryName,
                    slug: formData.slug,
                    subtitle: formData.categorySubtitle,
                    image: imagePreview || sc.image,
                  }
                : sc
            )
          );
          alert("Sub category updated successfully!");
        } else {
          // Create new subcategory
          const newSubCategory: SubCategory = {
            id:
              subCategories.length > 0
                ? Math.max(...subCategories.map((sc) => sc.id)) + 1
                : 1,
            parentId: parseInt(formData.parentCategory),
            parentName: parentCategory?.name || "",
            name: formData.categoryName,
            slug: formData.slug,
            subtitle: formData.categorySubtitle,
            image:
              imagePreview ||
              subCategoryImages[
                Math.floor(Math.random() * subCategoryImages.length)
              ],
            status: "active",
          };
          setSubCategories([...subCategories, newSubCategory]);
          alert("Sub category added successfully!");
        }

        setShowForm(false);
        setEditingId(null);
        resetForm();
      } catch (error: any) {
        console.error("Error saving sub category:", error);
        alert(error.message || "Error saving sub category. Please try again.");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      parentCategory: "",
      categoryName: "",
      slug: "",
      categorySubtitle: "",
      image: null,
      metaTitle: "",
      metaKeywords: "",
      schemaMarkup: "",
      metaDescription: "",
    });
    setImagePreview(null);
    setErrors({});
    setEditingId(null);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id === null) return;
    setSubCategories(subCategories.filter((sc) => sc.id !== deleteConfirm.id));
    alert("Sub category deleted successfully!");
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const handleEdit = (subCategory: SubCategory) => {
    setFormData({
      parentCategory: subCategory.parentId.toString(),
      categoryName: subCategory.name,
      slug: subCategory.slug,
      categorySubtitle: subCategory.subtitle,
      image: null,
      metaTitle: "",
      metaKeywords: "",
      schemaMarkup: "",
      metaDescription: "",
    });
    setImagePreview(subCategory.image);
    setEditingId(subCategory.id);
    setShowForm(true);
  };

  const handleView = (subCategory: SubCategory) => {
    navigate(`/categories/sub-categories/view/${subCategory.id}`);
  };

  // Calculate KPI stats
  const totalSubCategories = subCategories.length;
  const activeSubCategories = subCategories.filter(
    (sc) => sc.status === "active"
  ).length;
  const inactiveSubCategories = subCategories.filter(
    (sc) => sc.status === "inactive"
  ).length;
  const uniqueParentCategories = new Set(subCategories.map((sc) => sc.parentId))
    .size;

  return (
    <div>
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-900 dark:text-gray-100">
              {showForm
                ? editingId
                  ? "Edit Sub Category"
                  : "Add Sub Category"
                : "Sub-Categories"}
            </h1>
            <p className="text-blue-700 dark:text-gray-400 text-xs mt-0.5">
              {showForm
                ? editingId
                  ? "Update sub category information"
                  : "Create a new sub category"
                : "View and manage all sub categories"}
            </p>
          </div>
          {showForm ? (
            <BackButton
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              size="sm"
            />
          ) : (
            <Button
              onClick={() => setShowForm(true)}
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Plus size={14} />
              Add Sub Category
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            title="Total Sub Categories"
            value={totalSubCategories}
            icon={FolderTree}
            variant="blue"
          />
          <StatCard
            title="Active Sub Categories"
            value={activeSubCategories}
            icon={CheckCircle2}
            variant="green"
          />
          <StatCard
            title="Inactive Sub Categories"
            value={inactiveSubCategories}
            icon={XCircle}
            variant="gray"
          />
          <StatCard
            title="Parent Categories"
            value={uniqueParentCategories}
            icon={Package}
            variant="purple"
          />
        </div>
      )}

      {/* Search, Refresh, Import/Export Bar */}
      {!showForm && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <SearchInput
                placeholder="Search sub categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchSubCategories}
                disabled={loading}
                variant="ghost"
                className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  size={14}
                  className={`sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                title="Export to CSV"
              >
                <Download size={14} />
                Export
              </button>
              <Button
                onClick={handleImport}
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5"
                title="Import from CSV"
              >
                <FileUp size={14} />
                Import
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sub Categories Table */}
      {!showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading sub categories...</p>
            </div>
          ) : getSortedSubCategories().length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {searchTerm
                  ? "No sub categories found matching your search"
                  : "No sub categories found"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                >
                  Add First Sub Category
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <SortableTableHeader
                      field="id"
                      label="ID"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-3 py-2 text-left">
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Image
                      </span>
                    </th>
                    <SortableTableHeader
                      field="parentId"
                      label="Parent Category"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      field="name"
                      label="Name"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      field="subtitle"
                      label="Subtitle"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      field="status"
                      label="Status"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-3 py-2 text-left">
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedSubCategories().map((subCategory) => (
                    <tr
                      key={subCategory.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200">
                        {subCategory.id}
                      </td>
                      <td className="px-3 py-2">
                        {subCategory.image ? (
                          <img
                            src={subCategory.image}
                            alt={subCategory.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            No image
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                        {subCategory.parentName}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {subCategory.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                        {subCategory.subtitle}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            subCategory.status === "active"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {subCategory.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <ViewIconButton
                            onClick={() => handleView(subCategory)}
                            size={12}
                          />
                          <EditIconButton
                            onClick={() => handleEdit(subCategory)}
                            size={12}
                          />
                          <DeleteIconButton
                            onClick={() => handleDeleteClick(subCategory.id)}
                            size={12}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Sub Category Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <FolderTree size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Basic Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parent Category */}
                <SelectInput
                  label="Parent Category"
                  required
                  name="parentCategory"
                  value={formData.parentCategory}
                  onChange={handleChange}
                  error={errors.parentCategory}
                >
                  <option value="">Select Parent Category</option>
                  {mockParentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </option>
                  ))}
                </SelectInput>

                {/* Category Name */}
                <TextInput
                  label="Sub Category Name"
                  required
                  type="text"
                  name="categoryName"
                  value={formData.categoryName}
                  onChange={handleChange}
                  placeholder="Enter sub category name"
                  error={errors.categoryName}
                />

                {/* Slug */}
                <TextInput
                  label="Slug"
                  required
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="Auto-generated from sub category name"
                  className="bg-gray-50 dark:bg-gray-700"
                  readOnly
                  error={errors.slug}
                />

                {/* Category Subtitle */}
                <TextInput
                  label="Sub Category Subtitle"
                  required
                  type="text"
                  name="categorySubtitle"
                  value={formData.categorySubtitle}
                  onChange={handleChange}
                  placeholder="Enter sub category subtitle"
                  error={errors.categorySubtitle}
                />
              </div>
            </div>

            {/* Image Upload Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <ImageIcon size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Sub Category Image
                </h3>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Image {!editingId && <span className="text-red-500 dark:text-red-400">*</span>}
                </label>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                  Please choose square image of larger than 350px*350px &
                  smaller than 550px*550px.
                </p>
                {!imagePreview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg p-4 text-center hover:border-green-500 dark:hover:border-green-600 transition-colors cursor-pointer bg-green-50 dark:bg-green-900/20"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                  >
                    <Upload className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={20} />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Drop Files here or click to upload
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative border border-green-300 dark:border-green-700 rounded-lg p-2 bg-green-50 dark:bg-green-900/20">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-auto rounded-lg max-h-48 object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {errors.image && (
                  <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                    {errors.image}
                  </p>
                )}
              </div>
            </div>

            {/* SEO & Meta Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Search size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  SEO & Meta Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Meta Title */}
                <TextInput
                  label="Meta Title"
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleChange}
                  placeholder="Enter meta title"
                />

                {/* Meta Keywords */}
                <TextInput
                  label="Meta Keywords"
                  type="text"
                  name="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={handleChange}
                  placeholder="Enter meta keywords (comma separated)"
                />

                {/* Schema Markup */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Schema Markup
                  </label>
                  <textarea
                    name="schemaMarkup"
                    value={formData.schemaMarkup}
                    onChange={handleChange}
                    placeholder="Enter schema markup"
                    rows={3}
                    className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-600 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                {/* Meta Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Meta Description
                  </label>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleChange}
                    placeholder="Enter meta description"
                    rows={3}
                    className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-600 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-2 md:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium bg-white dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
              >
                {editingId ? "Update Sub Category" : "Add Sub Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Sub Category"
        message="Are you sure you want to delete this sub category?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default AddSubCategories;
