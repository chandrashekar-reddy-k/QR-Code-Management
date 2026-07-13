import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Upload,
  X,
  Image as ImageIcon,
  Tag,
  Download,
  FileUp,
  RefreshCw,
  Settings,
  Camera,
} from "lucide-react";
import {
  SearchInput,
  Button,
  ConfirmModal,
  StatCard,
  PageHeader,
  SortableTableHeader,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
} from "../../../components/ui";

interface Brand {
  id: number;
  name: string;
  image: string;
  status: "active" | "inactive";
}

type SortField = "id" | "name" | null;
type SortDirection = "asc" | "desc" | null;

// Groceries brand images - using placeholder with brand names for now
const brandImages = [
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200&h=200&fit=crop", // Amul
  "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=200&h=200&fit=crop", // Tata
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop", // MDH
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=200&h=200&fit=crop", // Haldiram
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&h=200&fit=crop", // Britannia
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=200&h=200&fit=crop", // Parle
  "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=200&h=200&fit=crop", // Patanjali
  "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop", // Colgate
  "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=200&h=200&fit=crop", // Surf Excel
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&h=200&fit=crop", // Lifebuoy
];

// Mock data for groceries brands
const mockBrands: Brand[] = [
  
  { id: 2, name: "Tata", image: brandImages[1], status: "active" },
  { id: 3, name: "MDH", image: brandImages[2], status: "active" },
  { id: 4, name: "Haldiram", image: brandImages[3], status: "active" },
  { id: 5, name: "Britannia", image: brandImages[4], status: "active" },
  { id: 6, name: "Parle", image: brandImages[5], status: "active" },
  { id: 7, name: "Patanjali", image: brandImages[6], status: "active" },
  { id: 8, name: "Colgate", image: brandImages[7], status: "active" },
  { id: 9, name: "Surf Excel", image: brandImages[8], status: "active" },
  { id: 10, name: "Lifebuoy", image: brandImages[9], status: "active" },
  { id: 11, name: "Kissan", image: brandImages[1], status: "active" },
  { id: 12, name: "Maggi", image: brandImages[2], status: "active" },
];

const Brands = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [brands, setBrands] = useState<Brand[]>(mockBrands);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    name: "",
    image: null as File | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    console.log(mockBrands);

    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await brandsAPI.getAll();
      // setBrands(Array.isArray(data) ? data : data.brands || []);
      setBrands(mockBrands);
      console.log(mockBrands);

      // Small delay so loading spinner is visible when using mock data
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (error) {
      console.error("Error fetching brands:", error);
      setBrands(mockBrands);
    } finally {
      console.log(mockBrands);

      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrors((prev) => ({ ...prev, image: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Brand name is required";
    }
    if (!editingId && !formData.image) {
      newErrors.image = "Brand image is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        const formDataToSend = new FormData();
        formDataToSend.append("name", formData.name);
        if (formData.image) {
          formDataToSend.append("image", formData.image);
        }

        // Using mock data for now - replace with API calls when ready
        if (editingId) {
          // await brandsAPI.update(editingId, formDataToSend);
          setBrands(
            brands.map((b) =>
              b.id === editingId
                ? {
                    ...b,
                    name: formData.name,
                    image: imagePreview || b.image,
                  }
                : b
            )
          );
          alert("Brand updated successfully!");
        } else {
          // await brandsAPI.create(formDataToSend);
          const newBrand: Brand = {
            id:
              brands.length > 0 ? Math.max(...brands.map((b) => b.id)) + 1 : 1,
            name: formData.name,
            image:
              imagePreview ||
              brandImages[Math.floor(Math.random() * brandImages.length)],
            status: "active",
          };
          setBrands([...brands, newBrand]);
          alert("Brand added successfully!");
        }

        setShowForm(false);
        setEditingId(null);
        resetForm();
      } catch (error: any) {
        console.error("Error saving brand:", error);
        if (
          error.message?.includes("fetch") ||
          error.message?.includes("network")
        ) {
          alert(
            "API connection error. Please ensure your backend API is running and configured."
          );
        } else {
          alert(error.message || "Error saving brand. Please try again.");
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      image: null,
    });
    setImagePreview(null);
    setErrors({});
    setEditingId(null);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      // Using mock data for now - replace with API call when ready
      // await brandsAPI.delete(deleteConfirm.id);
      setBrands(brands.filter((b) => b.id !== deleteConfirm.id));
      alert("Brand deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting brand:", error);
      alert(error.message || "Error deleting brand. Please try again.");
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = async (brand: Brand) => {
    try {
      // Using mock data for now - replace with API call when ready
      // const brandData = await brandsAPI.getById(brand.id);
      setFormData({
        name: brand.name || "",
        image: null,
      });
      if (brand.image) {
        setImagePreview(brand.image);
      }
      setEditingId(brand.id);
      setShowForm(true);
    } catch (error: any) {
      console.error("Error loading brand:", error);
      alert(error.message || "Error loading brand data. Please try again.");
    }
  };

  const handleView = (brand: Brand) => {
    navigate(`/products/brands/view/${brand.id}`);
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

  const getSortedBrands = () => {
    let filtered = brands.filter((brand) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        brand.name.toLowerCase().includes(searchLower) ||
        brand.id.toString().includes(searchLower)
      );
    });

    if (!sortField) return filtered;

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "id":
          aValue = a.id;
          bValue = b.id;
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Export brands to CSV
  const handleExport = () => {
    const headers = ["ID", "Name", "Status"];
    const rows = brands.map((b) => [b.id, b.name, b.status]);

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
      `brands_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import brands from CSV
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

            const importedBrands: Brand[] = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i]
                .split(",")
                .map((v) => v.replace(/"/g, "").trim());
              if (values.length >= 3) {
                importedBrands.push({
                  id: parseInt(values[0]) || brands.length + i,
                  name: values[1] || "",
                  status: (values[2] as "active" | "inactive") || "active",
                  image:
                    brandImages[Math.floor(Math.random() * brandImages.length)],
                });
              }
            }

            if (importedBrands.length > 0) {
              setBrands([...brands, ...importedBrands]);
              alert(`Successfully imported ${importedBrands.length} brands!`);
            } else {
              alert("No valid brands found in the file.");
            }
          } catch (error) {
            console.error("Error importing brands:", error);
            alert("Error importing brands. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Calculate KPI metrics
  const totalBrands = brands.length;
  const activeBrands = brands.filter((b) => b.status === "active").length;
  const inactiveBrands = brands.filter((b) => b.status === "inactive").length;
  const brandsWithImages = brands.filter((b) => b.image).length;

  return (
    <div>
      <PageHeader
        title="Brands"
        description="View and manage all brands"
        action={
          !showForm
            ? {
                label: "Add Brand",
                onClick: () => setShowForm(true),
                icon: Plus,
                variant: "primary",
              }
            : undefined
        }
        showBackButton={showForm}
        onBack={
          showForm
            ? () => {
                setShowForm(false);
                resetForm();
              }
            : undefined
        }
      />

      {/* KPI Cards */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            title="Total Brands"
            value={totalBrands}
            icon={Settings}
            variant="purple"
          />
          <StatCard
            title="Active Brands"
            value={activeBrands}
            icon={Settings}
            variant="yellow"
          />
          <StatCard
            title="Inactive Brands"
            value={inactiveBrands}
            icon={Settings}
            variant="green"
          />
          <StatCard
            title="With Images"
            value={brandsWithImages}
            icon={Camera}
            variant="red"
          />
        </div>
      )}

      {/* Brands Table */}
      {!showForm && (
        <div className="space-y-4">
          {/* Action Buttons (Export, Import, Refresh) and Search Bar */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              {/* Export, Import, Refresh Buttons - Left */}
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <Button
                  onClick={handleExport}
                  variant="ghost"
                  className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
                  title="Export to CSV"
                >
                  <Download size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  onClick={handleImport}
                  variant="ghost"
                  className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
                  title="Import from CSV"
                >
                  <FileUp size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
                <Button
                  onClick={fetchBrands}
                  disabled={loading}
                  variant="ghost"
                  className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    size={14}
                    className={`sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
              {/* Search Bar - Right */}
              <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs lg:max-w-sm">
                <SearchInput
                  placeholder="Search brands..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full"
                />
              </div>
            </div>
          </div>

          {/* Brands Table */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-500">
                  Loading brands...
                </p>
              </div>
            ) : getSortedBrands().length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-500 mb-3">
                  No brands found
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                >
                  Add First Brand
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 dark:border-gray-600">
                      <SortableTableHeader
                        field="id"
                        label="ID"
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
                      <th className="px-3 py-2 text-left">
                        <span className="text-[10px] font-semibold text-gray-700 uppercase">
                          Image
                        </span>
                      </th>
                      <th className="px-3 py-2 text-left">
                        <span className="text-[10px] font-semibold text-gray-700 uppercase">
                          Status
                        </span>
                      </th>
                      <th className="px-3 py-2 text-left">
                        <span className="text-[10px] font-semibold text-gray-700 uppercase">
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedBrands().map((brand) => (
                      <tr
                        key={brand.id}
                        className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-3 py-2 text-xs font-medium text-gray-800">
                          {brand.id}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-800">
                          {brand.name}
                        </td>
                        <td className="px-3 py-2">
                          {brand.image ? (
                            <img
                              src={brand.image}
                              alt={brand.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400">
                              No image
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              brand.status === "active"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {brand.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <ViewIconButton
                              onClick={() => handleView(brand)}
                              size={12}
                              className="text-green-600 hover:bg-green-50"
                              tooltip="View"
                            />
                            <EditIconButton
                              onClick={() => handleEdit(brand)}
                              size={12}
                              tooltip="Edit"
                            />
                            <DeleteIconButton
                              onClick={() => handleDeleteClick(brand.id)}
                              size={12}
                              tooltip="Delete"
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
        </div>
      )}

      {/* Add/Edit Brand Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-gray-800">
                {editingId ? "Edit Brand" : "Add Brand"}
              </h3>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter tax title."
                className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
              />
              {errors.name && (
                <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Image {!editingId && <span className="text-red-500">*</span>}
              </label>
              {!imagePreview ? (
                <div
                  className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg p-4 text-center hover:border-green-500 dark:hover:border-green-600 transition-colors cursor-pointer bg-green-50 dark:bg-green-900/20"
                  onClick={() =>
                    document.getElementById("brand-image-upload")?.click()
                  }
                >
                  <Upload
                    className="mx-auto text-gray-400 mb-2"
                    size={20}
                  />
                  <p className="text-xs text-gray-600 mb-1">
                    Drop Files here or click to upload
                  </p>
                  <input
                    id="brand-image-upload"
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
                    onClick={() => {
                      setImagePreview(null);
                      setFormData((prev) => ({ ...prev, image: null }));
                    }}
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

            {/* Submit Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
              >
                Save
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
        title="Delete Brand"
        message="Are you sure you want to delete this brand? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Brands;
