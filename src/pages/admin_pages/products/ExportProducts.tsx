import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Filter,
  ChevronDown,
  RotateCcw,
  Image as ImageIcon,
  IndianRupee,
  Upload,
  X,
} from "lucide-react";
import {
  SearchInput,
  DataTable,
  Pagination,
  SelectInput,
  PrimaryButton,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatCurrency } from "../../../utils/formatters";

// Mock data for export products
interface ExportProduct {
  id: number;
  image: string;
  productName: string;
  units: number;
  unitType: string;
  variants: number;
  actualPrice: number;
  dPrice: number;
  oPrice: number;
  fPrice: number;
  sku: string;
}

const mockExportProducts: ExportProduct[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop',
    productName: 'Fresh Mangoes(1kg)',
    units: 500,
    unitType: 'KG',
    variants: 2,
    actualPrice: 199.00,
    dPrice: 199.00,
    oPrice: 199.00,
    fPrice: 199.00,
    sku: 'SKU001',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&h=500&fit=crop',
    productName: 'Fresh Mangoes(1kg)',
    units: 500,
    unitType: 'LTR',
    variants: 3,
    actualPrice: 199.00,
    dPrice: 199.00,
    oPrice: 199.00,
    fPrice: 199.00,
    sku: 'SKU002',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&h=500&fit=crop',
    productName: 'Fresh Mangoes(1kg)',
    units: 500,
    unitType: 'KG',
    variants: 3,
    actualPrice: 199.00,
    dPrice: 199.00,
    oPrice: 199.00,
    fPrice: 199.00,
    sku: 'SKU003',
  },
];

// Mock categories and sub categories
const mockCategories = [
  { value: "", label: "All Categories" },
  { value: "1", label: "Category 1" },
  { value: "2", label: "Category 2" },
  { value: "3", label: "Category 3" },
];

const mockSubCategories = [
  { value: "", label: "All Sub Categories" },
  { value: "1", label: "Sub Category 1" },
  { value: "2", label: "Sub Category 2" },
  { value: "3", label: "Sub Category 3" },
];

const ExportProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ExportProduct[]>(mockExportProducts);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Update selectAll when selectedProducts changes
    if (products.length > 0) {
      setSelectAll(selectedProducts.size === products.length);
    } else {
      setSelectAll(false);
    }
  }, [selectedProducts, products.length]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await exportProductsAPI.getAll();
      // setProducts(Array.isArray(data) ? data : data.products || []);
      setProducts(mockExportProducts);
    } catch (error) {
      console.error('Error fetching export products:', error);
      setProducts(mockExportProducts);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
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

  // Filter + sort
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.id.toString().includes(term) ||
          p.productName.toLowerCase().includes(term) ||
          p.unitType.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter) {
      // Mock filter - replace with actual category filtering
      // filtered = filtered.filter((p) => p.categoryId === categoryFilter);
    }

    // Sub Category filter
    if (subCategoryFilter) {
      // Mock filter - replace with actual sub category filtering
      // filtered = filtered.filter((p) => p.subCategoryId === subCategoryFilter);
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "productName":
            aValue = a.productName.toLowerCase();
            bValue = b.productName.toLowerCase();
            break;
          case "units":
            aValue = a.units;
            bValue = b.units;
            break;
          case "unitType":
            aValue = a.unitType.toLowerCase();
            bValue = b.unitType.toLowerCase();
            break;
          case "variants":
            aValue = a.variants;
            bValue = b.variants;
            break;
          case "actualPrice":
            aValue = a.actualPrice;
            bValue = b.actualPrice;
            break;
          case "dPrice":
            aValue = a.dPrice;
            bValue = b.dPrice;
            break;
          case "oPrice":
            aValue = a.oPrice;
            bValue = b.oPrice;
            break;
          case "fPrice":
            aValue = a.fPrice;
            bValue = b.fPrice;
            break;
          case "sku":
            aValue = a.sku.toLowerCase();
            bValue = b.sku.toLowerCase();
            break;
          default:
            return 0;
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, subCategoryFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
    setSubCategoryFilter("");
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleExportProducts = () => {
    if (selectedProducts.size === 0) {
      alert("Please select at least one product to export");
      return;
    }
    setIsUploadModalOpen(true);
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (validTypes.includes(file.type) || file.name.match(/\.(png|jpeg|jpg|pdf)$/i)) {
      setUploadFile(file);
    } else {
      alert("Please select a PNG, JPEG, or PDF file");
      setUploadFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadConfirm = () => {
    if (!uploadFile) {
      alert("Please select a file to upload");
      return;
    }
    // Using mock data for now - replace with API call when ready
    // await exportProductsAPI.export(Array.from(selectedProducts), uploadFile);
    alert(`Exporting ${selectedProducts.size} product(s) with file: ${uploadFile.name}...`);
    setSelectedProducts(new Set());
    setSelectAll(false);
    setUploadFile(null);
    setIsUploadModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
  };

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{product.id}</span>
        </div>
      ),
    },
    {
      key: "select",
      label: "SELECT ALL",
      sortable: false,
      render: (product: ExportProduct) => (
        <div className="text-center">
          <input
            type="checkbox"
            checked={selectedProducts.has(product.id)}
            onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
            className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:bg-gray-700"
          />
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      sortable: false,
      render: (product: ExportProduct) => (
        <div className="flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.productName}
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              <ImageIcon size={12} className="text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "productName",
      label: "PRODUCT NAME",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">{product.productName}</span>
        </div>
      ),
    },
    {
      key: "units",
      label: "UNITS",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{product.units}</span>
        </div>
      ),
    },
    {
      key: "unitType",
      label: "UNIT TYPE",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{product.unitType}</span>
        </div>
      ),
    },
    {
      key: "variants",
      label: "VARIANTS",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{product.variants}</span>
        </div>
      ),
    },
    {
      key: "actualPrice",
      label: "ACTUAL PRICE",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{formatCurrency(product.actualPrice)}</span>
        </div>
      ),
    },
    {
      key: "dPrice",
      label: "D.PRICE",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{formatCurrency(product.dPrice)}</span>
        </div>
      ),
    },
    {
      key: "oPrice",
      label: "O.PRICE",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{formatCurrency(product.oPrice)}</span>
        </div>
      ),
    },
    {
      key: "fPrice",
      label: "F.PRICE",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{formatCurrency(product.fPrice)}</span>
        </div>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      sortable: true,
      render: (product: ExportProduct) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{product.sku}</span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (product: ExportProduct) => (
        <div className="flex items-center justify-center gap-2">
          <ViewIconButton
            onClick={() => navigate(`/products/view/${product.id}`)}
            size={14}
            tooltip="View"
          />
          <EditIconButton
            onClick={() => navigate(`/products/edit/${product.id}`)}
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => {
              if (confirm(`Are you sure you want to delete product ${product.productName}?`)) {
                setProducts(products.filter(p => p.id !== product.id));
              }
            }}
            size={14}
            tooltip="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Export Products
        </h1>
        <Breadcrumbs />
      </div>

      {/* Export Products Button */}
      <div className="mt-2 mb-4 flex justify-end">
        <PrimaryButton
          onClick={handleExportProducts}
          size="sm"
          disabled={selectedProducts.size === 0}
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Export Products</span>
        </PrimaryButton>
      </div>

      {/* Filters + Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-xl overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Category Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={mockCategories}
                className="bg-transparent dark:bg-transparent"
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Sub Category Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={subCategoryFilter}
                onChange={(e) => setSubCategoryFilter(e.target.value)}
                options={mockSubCategories}
                className="bg-transparent dark:bg-transparent"
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                {columns.map((column) => {
                  if (column.key === "select") {
                    return (
                      <th
                        key={column.key}
                        className="px-2 sm:px-6 py-3 sm:py-4 text-center"
                      >
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:bg-gray-700"
                          />
                          <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                            {column.label}
                          </span>
                        </div>
                      </th>
                    );
                  }
                  return (
                    <th
                      key={column.key}
                      className={`px-2 sm:px-6 py-3 sm:py-4 text-center ${
                        column.sortable
                          ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          : ""
                      }`}
                      onClick={column.sortable ? () => handleSort(column.key) : undefined}
                    >
                      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {column.label}
                        </span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            <svg
                              className={`w-2 h-2 ${
                                sortField === column.key && sortDirection === "asc"
                                  ? "text-gray-900 dark:text-gray-100"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 12l5-5 5 5H5z" />
                            </svg>
                            <svg
                              className={`w-2 h-2 -mt-1 ${
                                sortField === column.key && sortDirection === "desc"
                                  ? "text-gray-900 dark:text-gray-100"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M15 8l-5 5-5-5h10z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200"
                    >
                      {column.render ? column.render(product) : (product as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAndSortedProducts.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                    ]}
                    className="w-16 sm:w-20 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing results{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedProducts.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedProducts.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                Select Media
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-colors ${
                  isDragging
                    ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                    <Upload size={28} className="text-white" />
                  </div>
                  <p className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Drag and Drop or{" "}
                    <label
                      htmlFor="export-file-input"
                      className="text-purple-600 dark:text-purple-400 cursor-pointer hover:underline"
                    >
                      Choose file
                    </label>{" "}
                    to upload
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    supported formats PNG, JPEG, PDF
                  </p>
                  <input
                    id="export-file-input"
                    type="file"
                    accept=".png,.jpeg,.jpg,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadFile && (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                        Selected: {uploadFile.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadConfirm}
                disabled={!uploadFile}
                className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportProducts;
