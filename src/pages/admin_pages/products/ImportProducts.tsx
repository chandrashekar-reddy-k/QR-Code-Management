import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Filter,
  ChevronDown,
  Check,
  RotateCcw,
  Image as ImageIcon,
  IndianRupee,
  X,
} from "lucide-react";
import {
  SearchInput,
  DataTable,
  Pagination,
  SelectInput,
  PrimaryButton,
  ViewIconButton,
  Button,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatCurrency } from "../../../utils/formatters";
import {
  useGetMasterProducts,
  useImportMasterProducts,
  useGetProductCategoriesList,
  type ImportMasterProductsPayload,
} from "../../../hooks/product";
import LoadingFallback from "../../../components/common/LoadingFallback";

interface ImportProduct {
  id: string;
  /** Master product already imported — UI locked, excluded from import payload when nothing new */
  isImported?: boolean;
  image: string;
  productName: string;
  categoryName: string;
  subCategoryName: string;
  brandName: string;
  sku: string;
  units: string;
  unitType: string;
  unitName?: string;
  unitShortCode?: string;
  unitTypeName?: string;
  price: number;
  mrp: number;
  finalPrice: number;
  variants?: Array<{
    id: string;
    masterProductId?: string;
    name?: string;
    variantName?: string;
    sku?: string;
    gtin?: string | null;
    barcodeImage?: string | null;
    unit?: string;
    unitType?: string;
    measurement?: string;
    price?: number;
    mrp?: number;
    sellingPrice?: number;
    landingPrice?: number;
    finalPrice?: number;
    discountType?: string;
    discountValue?: number;
    image?: string;
    images?: string[];
    primaryImages?: string[];
    secondaryImages?: string[];
    metaTitle?: string | null;
    metaKeywords?: string | null;
    metaDescription?: string | null;
    schemaMarkup?: string | null;
    status?: string;
    isEnabled?: boolean;
    stockQuantity?: number;
    lowStockThreshold?: number;
    minOrderQty?: number;
    maxOrderQty?: number;
    isImported?: boolean;
    unitName?: string;
    unitShortCode?: string;
    unitTypeName?: string;
  }>;
}

const ImportProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ImportProduct[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"" | "admin" | "partner">("");
  const [statusFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [selectAll, setSelectAll] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImportSuccess, setIsImportSuccess] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(
    new Set(),
  );

  const { data: masterProductsData, isLoading: isMasterLoading } =
    useGetMasterProducts({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm,
      status: statusFilter,
      categoryId: categoryFilter || undefined,
      subCategoryId: subCategoryFilter || undefined,
      source: sourceFilter || undefined,
    });
  const importMasterProducts = useImportMasterProducts();

  // Categories & Subcategories for filters
  const { data: categoriesData } = useGetProductCategoriesList();

  type ApiSubCategoryItem = { id: string; name: string; isActive?: boolean };
  type ApiCategoryItem = {
    id: string;
    name: string;
    isActive?: boolean;
    subCategories?: ApiSubCategoryItem[];
  };

  const categoryOptions = useMemo(() => {
    if (!categoriesData) return [{ value: "", label: "All Categories" }];
    const res = categoriesData as { data?: ApiCategoryItem[] };
    const list = Array.isArray(res?.data) ? res.data : [];
    const mapped = list
      .filter((cat) => cat.isActive !== false)
      .map((cat) => ({ value: cat.id, label: cat.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "", label: "All Categories" }, ...mapped];
  }, [categoriesData]);

  const subCategoryOptions = useMemo(() => {
    if (!categoriesData || !categoryFilter) {
      return [{ value: "", label: "All Sub Categories" }];
    }
    const res = categoriesData as { data?: ApiCategoryItem[] };
    const list = Array.isArray(res?.data) ? res.data : [];
    const category = list.find((c) => c.id === categoryFilter);
    const subs = category?.subCategories ?? [];
    const mapped = subs
      .filter((sub) => sub.isActive !== false)
      .map((sub) => ({ value: sub.id, label: sub.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "", label: "All Sub Categories" }, ...mapped];
  }, [categoriesData, categoryFilter]);

  useEffect(() => {
    if (!masterProductsData) return;

    const response: any = masterProductsData;

    const raw =
      response?.data?.products ||
      response?.data ||
      response?.products ||
      response ||
      [];

    const list: any[] = Array.isArray(raw) ? raw : [];

    const mapped: ImportProduct[] = list.map((p: any) => {
      const images: string[] = Array.isArray(p.images) ? p.images : [];

      return {
        id: String(p.id ?? ""),
        image: images[0] || p.imageUrl || p.image || "",
        productName: p.name || p.productName || "N/A",
        categoryName: p.category?.name || "-",
        subCategoryName: p.subCategory?.name || "-",
        brandName: p.brand?.name || "-",
        sku: p.sku || p.skuCode || "",
        units: String(p.unit ?? p.units ?? p.uom ?? "-"),
        unitType: String(p.unitType ?? p.unit_type ?? p.unitOfMeasure ?? "-"),
        unitName: p.unitName || "",
        unitShortCode: p.unitShortCode || "",
        unitTypeName: p.unitTypeName || "",
        price: Number(p.price ?? 0),
        mrp: Number(p.mrp ?? p.finalPrice ?? p.price ?? 0),
        finalPrice: Number(p.finalPrice ?? p.price ?? 0),
        isImported: typeof p.isImported === "boolean" ? p.isImported : undefined,
        variants: Array.isArray(p.variants)
          ? p.variants.map((v: any, idx: number) => ({
              id: String(v?.id ?? idx),
              masterProductId: v?.masterProductId != null ? String(v.masterProductId) : String(p.id ?? ""),
              name: v?.variantName || v?.name || "N/A",
              variantName: v?.variantName || v?.name || "N/A",
              sku: v?.sku || "",
              gtin: v?.gtin ?? null,
              barcodeImage: v?.barcodeImage ?? null,
              unit: String(v?.unit ?? "-"),
              unitType: String(v?.unitType ?? "-"),
              measurement: String(v?.measurement ?? ""),
              price: Number(v?.price ?? v?.mrp ?? v?.sellingPrice ?? 0),
              mrp: Number(v?.mrp ?? v?.price ?? 0),
              sellingPrice: Number(v?.sellingPrice ?? v?.salePrice ?? 0),
              landingPrice: Number(v?.landingPrice ?? 0),
              finalPrice: Number(
                v?.finalPrice ??
                  v?.sellingPrice ??
                  v?.salePrice ??
                  v?.landingPrice ??
                  v?.price ??
                  0,
              ),
              discountType: v?.discountType != null ? String(v.discountType) : undefined,
              discountValue: Number(v?.discountValue ?? 0),
              image:
                v?.image ||
                (Array.isArray(v?.primaryImages) ? v.primaryImages[0] : "") ||
                (Array.isArray(v?.images) ? v.images[0] : ""),
              images: Array.isArray(v?.images) ? v.images : [],
              primaryImages: Array.isArray(v?.primaryImages)
                ? v.primaryImages
                : [],
              secondaryImages: Array.isArray(v?.secondaryImages)
                ? v.secondaryImages
                : [],
              metaTitle: v?.metaTitle ?? null,
              metaKeywords: v?.metaKeywords ?? null,
              metaDescription: v?.metaDescription ?? null,
              schemaMarkup: v?.schemaMarkup ?? null,
              status: v?.status != null ? String(v.status) : undefined,
              isEnabled: typeof v?.isEnabled === "boolean" ? v.isEnabled : undefined,
              stockQuantity: Number(v?.stockQuantity ?? 0),
              lowStockThreshold: Number(v?.lowStockThreshold ?? 0),
              minOrderQty: Number(v?.minOrderQty ?? 0),
              maxOrderQty: Number(v?.maxOrderQty ?? 0),
              isImported: typeof v?.isImported === "boolean" ? v.isImported : undefined,
            }))
          : [],
      };
    });

    setProducts(mapped);
  }, [masterProductsData]);

  // Pre-select (and keep) fully imported master products — UI only; payload filters these when empty.
  useEffect(() => {
    if (products.length === 0) return;
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      products.forEach((p) => {
        if (p.isImported === true) next.add(p.id);
      });
      return next;
    });
  }, [products]);

  // (API integration is handled by useGetMasterProducts + mapping above)

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
      filtered = filtered.filter((p) =>
        [
          p.id,
          p.productName,
          p.categoryName,
          p.subCategoryName,
          p.brandName,
          p.sku,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term),
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
          case "productName":
            aValue = a.productName.toLowerCase();
            bValue = b.productName.toLowerCase();
            break;
          case "categoryName":
            aValue = a.categoryName.toLowerCase();
            bValue = b.categoryName.toLowerCase();
            break;
          case "subCategoryName":
            aValue = a.subCategoryName.toLowerCase();
            bValue = b.subCategoryName.toLowerCase();
            break;
          case "brandName":
            aValue = a.brandName.toLowerCase();
            bValue = b.brandName.toLowerCase();
            break;
          case "units":
            aValue = a.units.toLowerCase();
            bValue = b.units.toLowerCase();
            break;
          case "unitType":
            aValue = a.unitType.toLowerCase();
            bValue = b.unitType.toLowerCase();
            break;
          case "price":
            aValue = a.price;
            bValue = b.price;
            break;
          case "mrp":
            aValue = a.mrp;
            bValue = b.mrp;
            break;
          case "finalPrice":
            aValue = a.finalPrice;
            bValue = b.finalPrice;
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
  }, [
    products,
    searchTerm,
    categoryFilter,
    subCategoryFilter,
    sortField,
    sortDirection,
  ]);

  // Flatten filtered and sorted products to display variants directly as main table rows
  const flattenedProducts = useMemo(() => {
    const list: any[] = [];
    filteredAndSortedProducts.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          list.push({
            id: p.id,
            variantId: v.id,
            isImported: v.isImported,
            image: v.image || p.image,
            productName: `${p.productName} (${v.variantName || v.name || "-"})`,
            categoryName: p.categoryName,
            subCategoryName: p.subCategoryName,
            brandName: p.brandName,
            sku: v.sku || p.sku,
            units: v.unit || p.units,
            unitType: v.unitType || p.unitType,
            unitName: v.unitName || p.unitName,
            unitShortCode: v.unitShortCode || p.unitShortCode,
            unitTypeName: v.unitTypeName || p.unitTypeName,
            price: v.price || p.price,
            mrp: v.mrp || p.mrp,
            finalPrice: v.finalPrice || p.finalPrice,
            isVariantRow: true,
            parentProduct: p
          });
        });
      } else {
        list.push({
          ...p,
          isVariantRow: false
        });
      }
    });
    return list;
  }, [filteredAndSortedProducts]);

  // Pagination
  const apiTotalItems =
    (masterProductsData as any)?.data?.stats?.total ??
    (masterProductsData as any)?.data?.total ??
    filteredAndSortedProducts.length;

  const totalPages = Math.max(1, Math.ceil(apiTotalItems / itemsPerPage));
  // Server already returns the current page; do not slice again.
  const paginatedProducts = flattenedProducts;

  useEffect(() => {
    if (paginatedProducts.length > 0) {
      const allOnPageSelected = paginatedProducts.every((p) => {
        if (p.isVariantRow) {
          return p.isImported === true || selectedVariantIds.has(String(p.variantId));
        }
        return p.isImported === true || selectedProducts.has(p.id);
      });
      setSelectAll(allOnPageSelected);
    } else {
      setSelectAll(false);
    }
  }, [selectedProducts, selectedVariantIds, paginatedProducts]);

  const showingFrom =
    apiTotalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, apiTotalItems);

  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
    setSubCategoryFilter("");
    setSourceFilter("");
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => {
          if (!p.isVariantRow) {
            next.add(p.id);
          }
        });
        return next;
      });
      setSelectedVariantIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => {
          if (p.isVariantRow && p.isImported !== true) {
            next.add(String(p.variantId));
          }
        });
        return next;
      });
      setSelectAll(true);
    } else {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => {
          if (!p.isVariantRow && p.isImported !== true) {
            next.delete(p.id);
          }
        });
        return next;
      });
      setSelectedVariantIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => {
          if (p.isVariantRow && p.isImported !== true) {
            next.delete(String(p.variantId));
          }
        });
        return next;
      });
      setSelectAll(false);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const product = products.find((p) => p.id === productId);
    if (product?.isImported === true) return;

    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });

    if (product) {
      setSelectedVariantIds((prev) => {
        const next = new Set(prev);
        (product.variants ?? []).forEach((v) => {
          if (v.isImported !== true) {
            if (checked) {
              next.add(String(v.id));
            } else {
              next.delete(String(v.id));
            }
          }
        });
        return next;
      });
    }
  };

  const buildImportPayload = useCallback((): ImportMasterProductsPayload => {
    const productIdSet = new Set<string>(selectedProducts);
    products.forEach((p) => {
      (p.variants ?? []).forEach((v) => {
        if (
          v.isImported !== true &&
          selectedVariantIds.has(String(v.id))
        ) {
          productIdSet.add(p.id);
        }
      });
    });

    const productsPayload = Array.from(productIdSet)
      .map((masterProductId) => {
        const product = products.find((p) => p.id === masterProductId);
        const masterProductVariantIds = (product?.variants ?? [])
          .filter(
            (v) =>
              v.isImported !== true &&
              selectedVariantIds.has(String(v.id)),
          )
          .map((v) => String(v.id));

        return {
          masterProductId,
          masterProductVariantIds,
        };
      })
      .filter((row) => {
        const p = products.find((x) => x.id === row.masterProductId);
        if (!p) return false;
        if (
          p.isImported === true &&
          row.masterProductVariantIds.length === 0
        ) {
          return false;
        }
        return true;
      });

    return { products: productsPayload };
  }, [selectedProducts, selectedVariantIds, products]);

  const hasImportableSelection =
    buildImportPayload().products.length > 0;

  const handleImportProducts = () => {
    const importPayload = buildImportPayload();

    if (importPayload.products.length === 0) {
      alert("Please select at least one product to import");
      return;
    }

    importMasterProducts.mutate(importPayload, {
      onSuccess: () => {
        setIsImportSuccess(true);
        setSelectedProducts(new Set());
        setSelectAll(false);
        setSelectedVariantIds(new Set());
      },
    });
  };

  const toggleVariants = (productId: string) => {
    setExpandedRows((prev) => {
      if (prev.has(productId)) {
        return new Set();
      }
      return new Set([productId]);
    });
  };

  const toggleVariantSelection = (
    productId: string,
    variantId: string,
    checked: boolean,
    variantIsImported?: boolean,
  ) => {
    if (variantIsImported === true) return;

    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(variantId);
      } else {
        next.delete(variantId);
      }
      return next;
    });

    if (checked) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        next.add(productId);
        return next;
      });
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (
      validTypes.includes(file.type) ||
      file.name.match(/\.(png|jpeg|jpg|pdf)$/i)
    ) {
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
    // await importProductsAPI.import(Array.from(selectedProducts), uploadFile);
    alert(
      `Importing ${selectedProducts.size} product(s) with file: ${uploadFile.name}...`,
    );
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
      key: "select",
      label: "SELECT ALL",
      sortable: false,
      render: (product: any) => {
        const isChecked = product.isVariantRow
          ? product.isImported === true || selectedVariantIds.has(String(product.variantId))
          : product.isImported === true || selectedProducts.has(product.id);
        const isDisabled = product.isImported === true;
        
        return (
          <div className="text-center">
            <input
              type="checkbox"
              checked={isChecked}
              disabled={isDisabled}
              onChange={(e) => {
                if (product.isVariantRow) {
                  toggleVariantSelection(product.id, String(product.variantId), e.target.checked, product.isImported);
                } else {
                  handleSelectProduct(product.id, e.target.checked);
                }
              }}
              className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        );
      },
    },
    {
      key: "image",
      label: "IMAGE",
      sortable: false,
      render: (product: any) => (
        <div className="flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.productName}
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              <ImageIcon
                size={12}
                className="text-gray-400 dark:text-gray-500"
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "productName",
      label: "PRODUCT",
      sortable: true,
      render: (product: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
            {product.productName}
          </span>
        </div>
      ),
    },
    {
      key: "units",
      label: "UNITS",
      sortable: true,
      render: (product: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {product.unitShortCode || product.unitName || product.units || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "unitType",
      label: "UNIT TYPE",
      sortable: true,
      render: (product: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {product.unitTypeName || product.unitType || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "price",
      label: "PRICE",
      sortable: true,
      render: (product: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {formatCurrency(product.price || 0)}
          </span>
        </div>
      ),
    },
    {
      key: "mrp",
      label: "MRP",
      sortable: true,
      render: (product: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {formatCurrency(product.mrp || 0)}
          </span>
        </div>
      ),
    },
    {
      key: "finalPrice",
      label: "FINAL PRICE",
      sortable: true,
      render: (product: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {formatCurrency(product.finalPrice || 0)}
          </span>
        </div>
      ),
    },
    {
      key: "variants",
      label: "VARIANTS",
      sortable: false,
      render: (product: any) => (
        <div className="text-center text-xs sm:text-sm text-gray-800 dark:text-gray-200">
          {product.isVariantRow ? "Variant" : "-"}
        </div>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      sortable: true,
      render: (product: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {product.sku}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (product: any) => (
        <div className="flex items-center justify-center gap-2">
          <ViewIconButton
            onClick={() => navigate(`/products/import/view/${product.id}`)}
            size={14}
            tooltip="View"
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
          Import Products
        </h1>
        <Breadcrumbs />
      </div>

      {/* Import Products Button */}
      <div className="mt-2 mb-4 flex justify-end">
        <PrimaryButton
          onClick={handleImportProducts}
          size="sm"
          disabled={!hasImportableSelection}
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Import Products</span>
        </PrimaryButton>
      </div>

      {/* Filters + Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-3xl overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Category Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-[160px] max-w-xs relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:appearance-none [&_select]:text-xs sm:text-sm [&_select]:font-medium [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-3 [&_select]:py-1.5 [&_select]:w-full">
              <SelectInput
                value={categoryFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategoryFilter(value);
                  // Reset subcategory when category changes
                  setSubCategoryFilter("");
                  // Reset pagination
                  setCurrentPage(1);
                }}
                options={categoryOptions}
                className="bg-transparent dark:bg-transparent"
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Sub Category Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-[160px] max-w-xs relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:appearance-none [&_select]:text-xs sm:text-sm [&_select]:font-medium [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-3 [&_select]:py-1.5 [&_select]:w-full">
              <SelectInput
                value={subCategoryFilter}
                onChange={(e) => {
                  setSubCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={subCategoryOptions}
                className="bg-transparent dark:bg-transparent"
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Source Filter: Admin vs Partner */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-[160px] max-w-xs relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:appearance-none [&_select]:text-xs sm:text-sm [&_select]:font-medium [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-3 [&_select]:py-1.5 [&_select]:w-full">
              <SelectInput
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value as "" | "admin" | "partner");
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "All Products" },
                  { value: "admin", label: "Admin Products" },
                  { value: "partner", label: "Partner Products" },
                ]}
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
        {isMasterLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
          </div>
        ) : (
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
                              onChange={(e) =>
                                handleSelectAll(e.target.checked)
                              }
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
                        onClick={
                          column.sortable
                            ? () => handleSort(column.key)
                            : undefined
                        }
                      >
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                          <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                            {column.label}
                          </span>
                          {column.sortable && (
                            <div className="flex flex-col">
                              <svg
                                className={`w-2 h-2 ${
                                  sortField === column.key &&
                                  sortDirection === "asc"
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
                                  sortField === column.key &&
                                  sortDirection === "desc"
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
                {paginatedProducts.map((product) => {
                  const rowKey = product.isVariantRow ? `${product.id}-${product.variantId}` : product.id;
                  return (
                    <tr
                      key={rowKey}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200"
                        >
                          {column.render
                            ? column.render(product)
                            : (product as any)[column.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(apiTotalItems > 0 || filteredAndSortedProducts.length > 0) && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Show
                </span>
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
                  Showing{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {showingFrom.toLocaleString()}
                  </span>{" "}
                  to{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {showingTo.toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {apiTotalItems.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pagination={{
                    page: currentPage,
                    limit: itemsPerPage,
                    total: apiTotalItems,
                    totalPages,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {isImportSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-8 text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={40} className="text-white" />
              </div>
            </div>

            {/* Message */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Products Imported Successfully!
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
              Products are imported. You can see them in All Products list.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <PrimaryButton
                onClick={() => {
                  setIsImportSuccess(false);
                  navigate("/products/manage");
                }}
              >
                Go to All Products
              </PrimaryButton>

              <Button
                onClick={() => {
                  setSelectedProducts(new Set());
                  setSelectAll(false);
                  setIsImportSuccess(false);
                }}
              >
                Import Other Products
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportProducts;
