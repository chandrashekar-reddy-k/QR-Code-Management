import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueries, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import fetchData from "../../../helper";
import {
  Plus,
  Package,
  Filter,
  RotateCcw,
  Upload,
  FolderArchive,
  ChevronDown,
  Barcode,
  Camera,
  MoreVertical,
  Loader2,
  Save,
} from "lucide-react";
// @ts-ignore
import BarcodeScannerOverlay from "../../../components/BarcodeScannerOverlay";
import {
  SearchInput,
  ConfirmModal,
  Modal,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteButton,
  Pagination,
  PrimaryButton,
  SelectInput,
  TextInput,
} from "../../../components/ui";
import SortableTableHeader from "../../../components/ui/Table/SortableTableHeader";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useDeleteProduct,
  useGetAllProductList,
  useGetProductDetailsById,
  useGetProductCategoriesList,
  useUpdateProductActive,
  useGetProductUnitTypesList,
  useGetUnitsByUnitType,
  useGetUnitsMapForUnitTypes,
  useResetAllProductsStock,
  useUndoResetProductsStock,
  useAssignRandomProductsStock,
} from "../../../hooks/product";
import {
  looksLikeOpaqueId,
  parseUnitTypesOptions,
  resolveListRowUnitLabels,
  resolveUnitTypeId,
  stringifyUnitField,
} from "../../../utils/productUnitDisplay";

// Define the API response type
interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  mrp: number;
  finalPrice?: number;
  salePrice?: number;
  sellingPrice?: number;
  landingPrice?: number;
  images: string[];
  unit: string;
  unitType?: string;
  sku?: string;
  barcode?: string;
  gtin?: string;
  barCode?: string;
  stock: number;
  isActive: boolean;
  status: string; // e.g. APPROVED, PENDING, REJECTED, ACTIVE, INACTIVE
  warehouse?: {
    name: string;
  };
  supplier?: Array<{
    id: string;
    companyName: string;
  }>;
  categoryId?: string;
  subCategoryId?: string;
  createdAt: string;
  updatedAt: string;
  variants?: unknown[];
  variantsCount?: number;
}

// Variant type for nested table (same model as admin)
interface Variant {
  id: number | string;
  variantName?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  gtin?: string;
  unit?: string;
  unitType?: string;
  measurement?: string;
  /** MRP / list price (PRICE column in variant sub-table) */
  price?: number | string;
  mrp?: number | string;
  /** Final selling price (D.PRICE column) */
  salePrice?: number | string;
  images?: string[];
  image?: string | null;
  variantStatus?: boolean | string;
}

interface ApiStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts?: number;
  total?: number;
  active?: number;
  inactive?: number;
  lowStock: number;
  outOfStock: number;
  featured: number;
}

interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Partner API returns data as array; admin may return data.products. Support both. */
interface ApiResponse {
  status: boolean;
  response: string;
  data: ApiProduct[] | { stats?: ApiStats; products?: ApiProduct[] };
  pagination: ApiPagination;
}

// Table product type for internal use (same as admin)
interface TableProduct {
  id: string;
  productId: string;
  sellerName: string;
  name: string;
  sku: string;
  barcode: string;
  unit: string;
  unitType: string;
  image: string | null;
  price: number;
  discountedPrice: number;
  variantsCount: number;
  status: "active" | "inactive" | "pending";
  isActive: boolean;
  categoryId?: string;
  variants?: Variant[];
}

const STORAGE_KEY = "villagkart_manage_products_state";

/** Values sent as GET query param `status` on product list API */
const PRODUCT_LIST_STATUS_FILTER_VALUES = [
  "APPROVED",
  "PENDING",
  "REJECTED",
  "TRUE",
  "FALSE",
] as const;

const PRODUCT_LIST_STATUS_FILTER_OPTIONS: { value: string; label: string }[] =
  [
    { value: "", label: "All statuses" },
    { value: "APPROVED", label: "Approved" },
    { value: "PENDING", label: "Pending" },
    { value: "REJECTED", label: "Rejected" },
    { value: "TRUE", label: "True" },
    { value: "FALSE", label: "False" },
  ];

function normalizeProductListStatusFilter(stored: string | undefined): string {
  if (!stored?.trim()) return "";
  const upper = stored.trim().toUpperCase();
  return PRODUCT_LIST_STATUS_FILTER_VALUES.includes(
    upper as (typeof PRODUCT_LIST_STATUS_FILTER_VALUES)[number],
  )
    ? upper
    : "";
}

function getStoredListState(): {
  sortField: string | null;
  sortDirection: "asc" | "desc" | null;
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;
  currentPage: number;
  itemsPerPage: number;
} | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    const sf = (p.sortField as string) ?? null;
    return {
      sortField: sf === "productId" ? null : sf,
      sortDirection: (p.sortDirection as "asc" | "desc") ?? null,
      searchTerm: "", // Default to empty search term on fresh navigation so catalog is not locked to previous query
      categoryFilter: (p.categoryFilter as string) ?? "",
      statusFilter: (p.statusFilter as string) ?? "",
      currentPage: typeof p.currentPage === "number" && p.currentPage >= 1 ? p.currentPage : 1,
      itemsPerPage: typeof p.itemsPerPage === "number" && p.itemsPerPage >= 1 ? p.itemsPerPage : 10,
    };
  } catch {
    return null;
  }
}

const ManageProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storedState = useRef(getStoredListState()).current;

  const [sortField, setSortField] = useState<string | null>(storedState?.sortField ?? null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    storedState?.sortDirection ?? null
  );
  const [searchTerm, setSearchTerm] = useState(storedState?.searchTerm ?? "");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(storedState?.categoryFilter ?? "");
  const [statusFilter, setStatusFilter] = useState(() =>
    normalizeProductListStatusFilter(storedState?.statusFilter),
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [resetStockConfirm, setResetStockConfirm] = useState(false);
  const [undoResetConfirm, setUndoResetConfirm] = useState(false);
  const [randomStockConfirm, setRandomStockConfirm] = useState(false);
  const resetStockMutation = useResetAllProductsStock();
  const undoResetStockMutation = useUndoResetProductsStock();
  const randomStockMutation = useAssignRandomProductsStock();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryPage = Number(queryParams.get("page"));
  const queryLimit = Number(queryParams.get("limit"));
  const initialPage =
    Number.isFinite(queryPage) && queryPage > 0
      ? Math.floor(queryPage)
      : (storedState?.currentPage ?? 1);
  const initialLimit =
    Number.isFinite(queryLimit) && queryLimit > 0
      ? Math.floor(queryLimit)
      : (storedState?.itemsPerPage ?? 10);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedProductIdForFetch, setExpandedProductIdForFetch] = useState<string | null>(null);
  const [expandedProductDetailsCache, setExpandedProductDetailsCache] = useState<Record<string, TableProduct>>({});
  const [activeOverrides, setActiveOverrides] = useState<Record<string, boolean>>({});
  const [updatingStatusProductId, setUpdatingStatusProductId] = useState<string | null>(null);
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);

  const formatPrice = (value: unknown): string => {
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : NaN;
    return Number.isFinite(numeric) ? `₹${numeric.toFixed(2)}` : "₹0.00";
  };
  const [variantActiveOverrides, setVariantActiveOverrides] = useState<Record<string, boolean>>({});

  // Quick Edit Modal State
  const [quickEdit, setQuickEdit] = useState<{
    isOpen: boolean;
    isVariant: boolean;
    productId: string;
    variantId?: string;
    parentProductId?: string;
    title: string;
    isLoading: boolean;
    isSaving: boolean;
    unitTypeId: string;
    unit: string;
    measurement: string;
    costPrice: string;
    mrp: string;
    discountType: "RUPEES" | "PERCENTAGE";
    discountValue: string;
    stock: string;
    threshold: string;
    minOrderQty: string;
    maxOrderQty: string;
  }>({
    isOpen: false,
    isVariant: false,
    productId: "",
    title: "",
    isLoading: false,
    isSaving: false,
    unitTypeId: "",
    unit: "",
    measurement: "",
    costPrice: "",
    mrp: "",
    discountType: "RUPEES",
    discountValue: "",
    stock: "0",
    threshold: "0",
    minOrderQty: "1",
    maxOrderQty: "5",
  });

  const { data, isLoading, isError, error, refetch } = useGetAllProductList(
    currentPage,
    itemsPerPage,
    searchTerm,
    undefined,
    statusFilter,
    undefined,
    categoryFilter || undefined
  );
  const { mutate } = useDeleteProduct();
  const queryClient = useQueryClient();

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;
    const deletedId = deleteConfirm.id;
    try {
      mutate(deletedId, {
        onSuccess: () => {
          // Clear cached state for this product
          setExpandedProductDetailsCache((prev) => {
            const next = { ...prev };
            delete next[deletedId];
            return next;
          });

          // Clear and remove all product related query caches completely
          queryClient.removeQueries({ queryKey: ["product"] });
          queryClient.removeQueries({ queryKey: ["productById"] });
          queryClient.removeQueries({ queryKey: ["productListByProductId"] });
          queryClient.invalidateQueries({ queryKey: ["product"] });

          // Trigger a hard refetch from the server
          refetch();
        }
      });
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };
  const { data: expandedProductData, isLoading: isLoadingExpandedProduct } = useGetProductDetailsById(expandedProductIdForFetch || "");

  // When user searches by product ID (full UUID or short like "0FCBB0F0"), fetch that product and merge into list
  const searchTermTrimmed = searchTerm.trim();
  const searchTermIsUuid = /^[0-9a-f-]{36}$/i.test(searchTermTrimmed);
  const searchTermIsShortId = /^[a-zA-Z0-9]{6,10}$/.test(searchTermTrimmed);
  const searchTermLooksLikeId = searchTermTrimmed.length > 0 && (searchTermIsUuid || searchTermIsShortId);
  // 1) Try GET product/:id (works if backend accepts UUID or short code in path)
  const { data: productBySearchIdData } = useQuery({
    queryKey: ["productById", "search", searchTermTrimmed],
    queryFn: () => fetchData(`productmanagement/product/${encodeURIComponent(searchTermTrimmed)}`, "GET"),
    enabled: searchTermLooksLikeId,
    retry: false,
  });
  // 2) Fallback: list API with only productId (no search) so backend can return product by ID
  const { data: productListByProductIdData } = useQuery({
    queryKey: ["productListByProductId", searchTermTrimmed],
    queryFn: () => {
      const params = new URLSearchParams({
        productId: searchTermTrimmed,
        page: "1",
        limit: "1",
        isActive: "true",
      });
      return fetchData(`productmanagement/product?${params.toString()}`, "GET");
    },
    enabled: searchTermIsShortId && searchTermTrimmed.length >= 6,
    retry: false,
  });
  const { mutate: updateProductActive, isPending: _isUpdatingStatus } = useUpdateProductActive();
  const { mutateAsync: updateVariantStatus, isPending: _isUpdatingVariant } = useMutation({
    mutationFn: ({ variantId, isEnabled }: { variantId: string; isEnabled: boolean }) =>
      fetchData(`productmanagement/variant/${variantId}`, "PUT", { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productById"] });
      queryClient.invalidateQueries({ queryKey: ["variantsByProduct"] });
      toast.success("Variant status updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update variant status");
    },
  });
  const { data: categoriesData } = useGetProductCategoriesList();
  const { data: unitTypesData } = useGetProductUnitTypesList();

  // Build category options for filter dropdown (All Categories + active categories from API)
  const categoryOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "", label: "All Categories" }];
    if (!categoriesData) return list;
    const res = categoriesData as { data?: Array<{ id: string; name: string; isActive?: boolean }> };
    const arr = Array.isArray(res?.data) ? res.data : [];
    arr
      .filter((c) => c.isActive !== false)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .forEach((c) => list.push({ value: c.id, label: c.name || c.id }));
    return list;
  }, [categoriesData]);

  // Fetch variant counts for all products on current page (same as admin)
  const productIdsToFetchCounts = useMemo(() => {
    const apiData = data as ApiResponse | undefined;
    const d = apiData?.data;
    const productsArray = Array.isArray(d) ? d : (d as { products?: ApiProduct[] })?.products ?? [];
    return (Array.isArray(productsArray) ? productsArray : []).filter((p: ApiProduct) => p.id).map((p: ApiProduct) => p.id);
  }, [data]);

  const variantCountQueries = useQueries({
    queries: productIdsToFetchCounts.map((productId: string) => ({
      queryKey: ["productVariantCount", productId],
      queryFn: () => fetchData(`productmanagement/product/${productId}`, "GET"),
      enabled: !!productId,
    })),
  });

  const variantCountsFromFetch: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    productIdsToFetchCounts.forEach((productId: string, index: number) => {
      const result = variantCountQueries[index]?.data as Record<string, unknown> | undefined;
      if (result) {
        const productData = result?.data ?? result;
        const product = (productData as Record<string, unknown>)?.product ?? productData;
        if (product && typeof product === "object") {
          const p = product as Record<string, unknown>;
          const variants = (p.variants ?? p.productVariants ?? []) as unknown[];
          const totalCount = Array.isArray(variants)
            ? variants.length
            : Number(p.variantsCount ?? (p._count as any)?.variants ?? p.variantCount ?? 0) || 0;
          map[productId] = Math.max(0, totalCount);
        }
      }
    });
    return map;
  }, [productIdsToFetchCounts, variantCountQueries]);

  // Persist sort, filters, and pagination so they survive navigation to View/Edit and back
  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sortField,
        sortDirection,
        searchTerm,
        categoryFilter,
        statusFilter,
        currentPage,
        itemsPerPage,
      })
    );
  }, [sortField, sortDirection, searchTerm, categoryFilter, statusFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    if (refetch) refetch();
    const onFocus = () => { if (refetch) refetch(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  useEffect(() => {
    if (refetch) refetch();
  }, [currentPage, itemsPerPage, refetch]);

  // Type assertion for the data – partner API: data is array; admin API: data.products
  const apiData = data as ApiResponse | undefined;

  const products: ApiProduct[] = useMemo(() => {
    const fromList = (() => {
      if (!apiData?.data) return [];
      const d = apiData.data;
      return Array.isArray(d) ? d : (d as { products?: ApiProduct[] }).products ?? [];
    })();
    const searchUpper = searchTermTrimmed.toUpperCase();
    const alreadyHasMatch = (id: string) =>
      fromList.some((x) => x.id === id || (x.id && x.id.slice(0, 8).toUpperCase() === searchUpper));

    const rawToApiProduct = (p: Record<string, unknown>): ApiProduct | null => {
      const id = String(p.id ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(p.name ?? ""),
        description: p.description != null ? String(p.description) : undefined,
        price: Number(p.price ?? 0),
        mrp: Number(p.mrp ?? 0),
        finalPrice: Number(
          p.finalPrice ?? p.salePrice ?? p.sellingPrice ?? p.landingPrice ?? p.price ?? 0
        ),
        salePrice: p.salePrice != null ? Number(p.salePrice) : undefined,
        sellingPrice: p.sellingPrice != null ? Number(p.sellingPrice) : undefined,
        landingPrice: p.landingPrice != null ? Number(p.landingPrice) : undefined,
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        unit: stringifyUnitField(p.unit),
        unitType: (() => {
          const s = stringifyUnitField(p.unitType);
          return s || undefined;
        })(),
        sku: p.sku != null ? String(p.sku) : undefined,
        stock: Number(p.stock ?? 0),
        isActive: p.isActive === true,
        status: String(p.status ?? p.isActive === true ? "ACTIVE" : "INACTIVE"),
        warehouse: p.warehouse as ApiProduct["warehouse"],
        supplier: p.supplier as ApiProduct["supplier"],
        categoryId: p.categoryId != null ? String(p.categoryId) : undefined,
        subCategoryId: p.subCategoryId != null ? String(p.subCategoryId) : undefined,
        createdAt: String(p.createdAt ?? ""),
        updatedAt: String(p.updatedAt ?? ""),
        variants: (p.variants ?? []) as unknown[],
        variantsCount: Number(p.variantsCount ?? (Array.isArray(p.variants) ? p.variants.length : 0)),
      };
    };

    // 1) Product from GET product/:id (when backend accepts short code or UUID in path)
    if (searchTermLooksLikeId && productBySearchIdData) {
      const res = productBySearchIdData as Record<string, unknown>;
      const productDataObj = res?.data ?? res;
      const raw = (productDataObj as Record<string, unknown>)?.product ?? productDataObj;
      if (raw && typeof raw === "object") {
        const apiProduct = rawToApiProduct(raw as Record<string, unknown>);
        if (apiProduct && !alreadyHasMatch(apiProduct.id)) return [apiProduct, ...fromList];
      }
    }

    // 2) Fallback: product from list API with productId param only (e.g. 0FCBB0F0)
    if (searchTermIsShortId && productListByProductIdData) {
      const res = productListByProductIdData as Record<string, unknown>;
      const d = res?.data ?? res;
      const list = Array.isArray(d) ? d : (d as { products?: ApiProduct[] })?.products ?? [];
      const first = list[0];
      if (first && typeof first === "object") {
        const apiProduct = rawToApiProduct(first as unknown as Record<string, unknown>);
        const idMatch = apiProduct && (apiProduct.id === searchTermTrimmed || apiProduct.id.slice(0, 8).toUpperCase() === searchUpper);
        if (apiProduct && idMatch && !alreadyHasMatch(apiProduct.id)) return [apiProduct, ...fromList];
      }
    }

    return fromList;
  }, [apiData?.data, searchTermLooksLikeId, searchTermIsShortId, searchTermTrimmed, productBySearchIdData, productListByProductIdData]);

  const unitTypesOptions = useMemo(() => parseUnitTypesOptions(unitTypesData), [unitTypesData]);

  const unitTypeIdsFromExpandedDetail = useMemo(() => {
    if (!expandedProductData) return [] as string[];
    const res = expandedProductData as Record<string, unknown>;
    const productDataObj = res?.data ?? res;
    const raw = (productDataObj as Record<string, unknown>)?.product ?? productDataObj;
    if (!raw || typeof raw !== "object") return [];
    const p = raw as Record<string, unknown>;
    const ids = new Set<string>();
    const collect = (row: Record<string, unknown>) => {
      const id = resolveUnitTypeId(row);
      if (id) ids.add(id);
      const ut = row.unitType;
      if (typeof ut === "string" && looksLikeOpaqueId(ut.trim())) ids.add(ut.trim());
    };
    collect(p);
    const variants = (p.variants ?? p.productVariants ?? []) as unknown[];
    if (Array.isArray(variants)) {
      variants.forEach((v) => {
        if (v && typeof v === "object") collect(v as Record<string, unknown>);
      });
    }
    return Array.from(ids);
  }, [expandedProductData]);

  const unitTypeIdsForFetch = useMemo(() => {
    const ids = new Set<string>(unitTypeIdsFromExpandedDetail);
    for (const product of products) {
      const p = product as unknown as Record<string, unknown>;
      const id = resolveUnitTypeId(p);
      if (id) ids.add(id);
      const ut = p.unitType;
      if (typeof ut === "string" && looksLikeOpaqueId(ut.trim())) ids.add(ut.trim());
      const listVariants = (product.variants ?? []) as Record<string, unknown>[];
      for (const v of listVariants) {
        const vid = resolveUnitTypeId(v);
        if (vid) ids.add(vid);
        const vt = v.unitType;
        if (typeof vt === "string" && looksLikeOpaqueId(String(vt).trim())) ids.add(String(vt).trim());
      }
    }
    return Array.from(ids);
  }, [products, unitTypeIdsFromExpandedDetail]);

  const unitsByTypeId = useGetUnitsMapForUnitTypes(unitTypeIdsForFetch);

  // Dynamic Units for Quick Edit Modal
  const { data: quickEditUnitsData } = useGetUnitsByUnitType(quickEdit.unitTypeId || null);
  const quickEditUnitsOptions = useMemo(() => {
    if (!quickEditUnitsData) return [];
    const res = quickEditUnitsData as Record<string, unknown>;
    const raw = (res?.data ?? res) as unknown;
    if (Array.isArray(raw)) {
      return raw.map((u: any) => ({
        value: String(u.id || u.name),
        label: String(u.name || u.shortCode || u.id),
      }));
    }
    return [];
  }, [quickEditUnitsData]);

  // Real-time final selling price calculation for Quick Edit Modal
  const quickCalculatedFinalPrice = useMemo(() => {
    const numMrp = parseFloat(quickEdit.mrp) || 0;
    const numCost = parseFloat(quickEdit.costPrice) || 0;
    const numDiscount = parseFloat(quickEdit.discountValue) || 0;

    let finalSellingPrice = numMrp;
    if (quickEdit.discountType === "PERCENTAGE" && numDiscount > 0 && numDiscount < 100) {
      finalSellingPrice = numMrp - (numMrp * numDiscount) / 100;
    } else if (quickEdit.discountType === "RUPEES" && numDiscount > 0 && numDiscount < numMrp) {
      finalSellingPrice = numMrp - numDiscount;
    }
    if (finalSellingPrice <= 0) {
      finalSellingPrice = numMrp > 0 ? numMrp : numCost;
    }
    return String(Math.round(finalSellingPrice));
  }, [quickEdit.mrp, quickEdit.costPrice, quickEdit.discountType, quickEdit.discountValue]);

  // Cache fetched product details when expanded (same as admin); must run after unitTypesOptions / unitsByTypeId exist
  useEffect(() => {
    if (!expandedProductIdForFetch || !expandedProductData) return;
    const apiDataExpanded = expandedProductData as Record<string, unknown>;
    const productDataObj = apiDataExpanded?.data ?? apiDataExpanded;
    const product = (productDataObj as Record<string, unknown>)?.product ?? productDataObj;
    if (!product || typeof product !== "object") return;
    const p = product as Record<string, unknown>;
    const image = Array.isArray(p.images) ? (p.images[0] as string) : (p.mainImage ?? p.image) as string | null ?? null;
    const variantsArray = (p.variants ?? p.productVariants ?? []) as unknown[];
    const firstVar = (variantsArray[0] ?? {}) as Record<string, unknown>;
    // Product row should prefer product-level unit fields, not first variant.
    const productLabels = resolveListRowUnitLabels(p, unitTypesOptions, unitsByTypeId);
    const variantLabels = resolveListRowUnitLabels(firstVar, unitTypesOptions, unitsByTypeId);
    const mainUnit = productLabels.unit || variantLabels.unit;
    const mainUnitType = productLabels.unitType || variantLabels.unitType;
    const mainSku = String(p.sku ?? firstVar.sku ?? "");

    const transformedVariants: Variant[] = (Array.isArray(variantsArray) ? variantsArray : []).map((variant: any, index: number) => {
      const imgs = (Array.isArray(variant.primaryImages) && variant.primaryImages.length > 0 ? variant.primaryImages : Array.isArray(variant.images) && variant.images?.length ? variant.images : variant.image ? [variant.image] : variant.primaryImage ? [variant.primaryImage] : []) as string[];
      const mergedV = { ...p, ...variant };
      const { unit: vu, unitType: vut } = resolveListRowUnitLabels(mergedV, unitTypesOptions, unitsByTypeId);
      // Partner API: mrp = list/MRP; sellingPrice/salePrice/finalPrice = final selling; price/landingPrice often = landing
      const mrpForRow = Number(
        variant.mrp ?? p.mrp ?? variant.price ?? p.price ?? 0
      );
      const finalSelling = Number(
        variant.sellingPrice ??
        variant.salePrice ??
        variant.finalPrice ??
        variant.landingPrice ??
        variant.price ??
        p.price ??
        0
      );
      return {
        id: (variant.id as number | string) ?? index + 1,
        variantName: (variant.variantName ?? variant.name) as string,
        name: (variant.variantName ?? variant.name ?? p.name) as string,
        sku: (variant.sku as string) ?? "",
        barcode: String(variant.gtin ?? variant.barcode ?? ""),
        gtin: String(variant.gtin ?? variant.barcode ?? ""),
        unit: vu || "N/A",
        unitType: vut || "N/A",
        measurement: (variant.measurement as string) ?? "",
        price: mrpForRow,
        mrp: mrpForRow,
        salePrice: finalSelling,
        images: imgs,
        image: imgs[0] ?? null,
        variantStatus: variant.isEnabled ?? variant.status ?? true,
      };
    });
    const supplier = (p.supplier as Array<{ companyName?: string }>) || [];
    const warehouse = p.warehouse as { name?: string } | undefined;
    const tableProduct: TableProduct = {
      id: expandedProductIdForFetch,
      productId: (p.productId as string) || String(p.id ?? "").slice(0, 8).toUpperCase(),
      barcode: (p.barcode as string) || (p.sku as string) || "",
      sellerName: supplier[0]?.companyName ?? warehouse?.name ?? "N/A",
      name: (p.name as string) ?? "",
      sku: mainSku || "N/A",
      unit: mainUnit || "N/A",
      unitType: mainUnitType || "N/A",
      image: image ? String(image) : null,
      // PRICE (₹) => MRP, D.PRICE (₹) => Final Selling Price
      price: Number(p.mrp ?? p.price ?? 0),
      discountedPrice: Number(
        p.finalPrice ?? p.salePrice ?? p.sellingPrice ?? p.landingPrice ?? p.price ?? 0
      ),
      variantsCount: transformedVariants.length,
      status: (p.status as string) === "ACTIVE" || p.isActive === true ? "active" : "inactive",
      isActive: p.isActive === true,
      variants: transformedVariants,
    };
    setExpandedProductDetailsCache((prev) => ({ ...prev, [expandedProductIdForFetch]: tableProduct }));
    setExpandedProductIdForFetch(null);
  }, [expandedProductIdForFetch, expandedProductData, unitTypesOptions, unitsByTypeId]);

  const pagination: ApiPagination = apiData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Transform API products to table format: S.NO, IMAGE, PRODUCT ID, NAME, PRICE, D.PRICE, VARIANTS, STATUS, ACTIONS (no SELLER in partner)
  const tableProducts: TableProduct[] = useMemo(() => {
    return products.map((product) => {
      let displayStatus: "active" | "inactive" | "pending" = "pending";
      if (product.status === "ACTIVE" || (product.isActive && product.status !== "PENDING")) displayStatus = "active";
      else if (product.status === "INACTIVE" || !product.isActive) displayStatus = "inactive";
      else if (product.status === "PENDING") displayStatus = "pending";

      const sellerName = product.supplier?.length ? product.supplier[0].companyName : product.warehouse?.name || "N/A";
      const image = product.images?.length ? product.images[0] : null;

      const listVariants = (product.variants ?? []) as Record<string, unknown>[];
      const variantsCountFromList = listVariants.length;
      const fetchedCount = variantCountsFromFetch[product.id];
      const variantsCount = fetchedCount !== undefined ? fetchedCount : (product.variantsCount ?? variantsCountFromList);

      const variantsToShow = listVariants;
      const firstVariant = variantsToShow[0] as Record<string, unknown> | undefined;
      const pRec = product as unknown as Record<string, unknown>;
      const fv = (firstVariant ?? {}) as Record<string, unknown>;
      // Product table row must show product-level Unit/Unit Type.
      // Fallback to first variant only when product-level fields are missing.
      const productLabels = resolveListRowUnitLabels(pRec, unitTypesOptions, unitsByTypeId);
      const variantLabels = resolveListRowUnitLabels(fv, unitTypesOptions, unitsByTypeId);
      const dispUnit = productLabels.unit || variantLabels.unit;
      const dispUnitType = productLabels.unitType || variantLabels.unitType;
      const resolvedSku = String(
        ((product as unknown) as Record<string, unknown>).sku ||
        firstVariant?.sku ||
        ""
      );
      const transformedVariants: Variant[] = variantsToShow.map((v: any, index: number) => {
        const imgs = (Array.isArray(v.primaryImages) && v.primaryImages.length ? v.primaryImages : Array.isArray(v.images) && v.images?.length ? v.images : v.image ? [v.image] : v.primaryImage ? [v.primaryImage] : []) as string[];
        const mergedV = { ...pRec, ...v };
        const { unit: vu, unitType: vut } = resolveListRowUnitLabels(mergedV, unitTypesOptions, unitsByTypeId);
        const mrpForRow = Number(
          v.mrp ?? product.mrp ?? v.price ?? product.price ?? 0
        );
        const finalSelling = Number(
          v.sellingPrice ??
          v.salePrice ??
          v.finalPrice ??
          v.landingPrice ??
          v.price ??
          product.price ??
          0
        );
        return {
          id: (v.id as number | string) ?? index + 1,
          variantName: (v.variantName ?? v.name) as string,
          name: (v.variantName ?? v.name ?? product.name) as string,
          sku: (v.sku as string) ?? "",
          barcode: String(v.gtin ?? v.barcode ?? ""),
          gtin: String(v.gtin ?? v.barcode ?? ""),
          unit: vu || "N/A",
          unitType: vut || "N/A",
          measurement: (v.measurement as string) ?? "",
          price: mrpForRow,
          mrp: mrpForRow,
          salePrice: finalSelling,
          images: imgs,
          image: imgs[0] ?? null,
          variantStatus: v.isEnabled ?? v.status ?? true,
        };
      });

      const resolvedBarcode = String(
        (product as any).barcode ??
        (product as any).gtin ??
        (product as any).barCode ??
        resolvedSku ??
        ""
      );

      return {
        id: product.id,
        productId: product.id.slice(0, 8).toUpperCase(),
        sellerName,
        name: product.name,
        sku: resolvedSku || "N/A",
        barcode: resolvedBarcode || "N/A",
        unit: dispUnit || "N/A",
        unitType: dispUnitType || "N/A",
        image,
        // PRICE (₹) => MRP, D.PRICE (₹) => Final Selling Price
        price: Number(product.mrp ?? product.price ?? 0),
        discountedPrice: Number(
          product.finalPrice ??
          product.salePrice ??
          product.sellingPrice ??
          product.landingPrice ??
          product.price ??
          0
        ),
        variantsCount,
        status: displayStatus,
        isActive: product.isActive === true,
        categoryId: product.categoryId,
        variants: transformedVariants,
      };
    });
  }, [products, variantCountsFromFetch, unitTypesOptions, unitsByTypeId]);

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

  // Filter and sort products (search, barcode, category, status)
  const filteredAndSortedProducts: TableProduct[] = useMemo(() => {
    let filtered = tableProducts.filter((product) => {
      const searchLower = searchTerm.trim().toLowerCase();
      const barcodeSearchLower = barcodeSearch.trim().toLowerCase();
      const query = barcodeSearchLower || searchLower;

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.barcode && product.barcode.toLowerCase().includes(query)) ||
        (product.variants && product.variants.some((v: any) =>
          (v.barcode && String(v.barcode).toLowerCase().includes(query)) ||
          (v.gtin && String(v.gtin).toLowerCase().includes(query)) ||
          (v.sku && String(v.sku).toLowerCase().includes(query)) ||
          (v.variantName && String(v.variantName).toLowerCase().includes(query))
        ));

      const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableProduct, b: TableProduct) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "sku":
            aValue = a.sku.toLowerCase();
            bValue = b.sku.toLowerCase();
            break;
          case "barcode":
            aValue = a.barcode.toLowerCase();
            bValue = b.barcode.toLowerCase();
            break;
          case "price":
            aValue = a.price;
            bValue = b.price;
            break;
          case "unit":
            aValue = a.unit.toLowerCase();
            bValue = b.unit.toLowerCase();
            break;
          case "unitType":
            aValue = a.unitType.toLowerCase();
            bValue = b.unitType.toLowerCase();
            break;
          case "discountedPrice":
            aValue = a.discountedPrice;
            bValue = b.discountedPrice;
            break;
          case "variantsCount":
            aValue = a.variantsCount;
            bValue = b.variantsCount;
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
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
    tableProducts,
    searchTerm,
    barcodeSearch,
    categoryFilter,
    sortField,
    sortDirection,
  ]);

  const handleResetFilters = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    setSearchTerm("");
    setBarcodeSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setCurrentPage(1);
    refetch();
  };

  // API is already paginated by currentPage/itemsPerPage.
  // Do not slice again on client, otherwise page 2+ can appear empty.
  const paginatedProducts = filteredAndSortedProducts;

  const _handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };
  if (typeof window !== "undefined") {
    (window as any)._handleDeleteClick = _handleDeleteClick;
  }

  const handleEdit = (product: TableProduct) => {
    const params = new URLSearchParams();
    params.set("returnTo", "list");
    params.set("page", String(currentPage));
    params.set("limit", String(itemsPerPage));
    navigate(`/products/${product.id}/edit?${params.toString()}`);
  };

  const handleView = (product: TableProduct) => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", String(itemsPerPage));
    navigate(`/products/manage/view/${product.id}?${params.toString()}`);
  };

  const handleOpenQuickEdit = async (
    item: TableProduct | Variant,
    isVariant = false,
    parentProductId?: string,
  ) => {
    const itemId = String(item.id);
    const resolvedParentId = parentProductId || (!isVariant ? itemId : "");
    const title = isVariant
      ? `Quick Edit: ${((item as Variant).variantName || (item as Variant).name || "Variant")}`
      : `Quick Edit: ${(item as TableProduct).name || "Product"}`;

    setQuickEdit({
      isOpen: true,
      isVariant,
      productId: resolvedParentId,
      variantId: isVariant ? itemId : undefined,
      parentProductId: resolvedParentId,
      title,
      isLoading: true,
      isSaving: false,
      unitTypeId: "",
      unit: "",
      measurement: "",
      costPrice: "",
      mrp: "",
      discountType: "RUPEES",
      discountValue: "",
      stock: "0",
      threshold: "0",
      minOrderQty: "1",
      maxOrderQty: "5",
    });

    try {
      if (isVariant && itemId) {
        const res = await fetchData(`productmanagement/variant/${itemId}`, "GET");
        const raw = (res as any)?.data ?? res;
        const v = (raw as any)?.variant ?? raw;
        if (v) {
          const rawUnitType = v.unitTypeId || v.unitType || "";
          const resolvedUnitTypeId =
            unitTypesOptions.find(
              (o) =>
                o.value === rawUnitType ||
                (o.label && o.label.toLowerCase() === String(rawUnitType).toLowerCase())
            )?.value || (looksLikeOpaqueId(rawUnitType) ? rawUnitType : "");

          const resolvedMrp = v.mrp != null ? String(v.mrp) : v.price != null ? String(v.price) : "";
          const resolvedCost = v.landingPrice != null ? String(v.landingPrice) : v.costPrice != null ? String(v.costPrice) : "";
          const discType = String(v.discountType || "").toUpperCase().includes("PERCENT")
            ? "PERCENTAGE"
            : "RUPEES";
          const discVal = v.discountValue != null ? String(v.discountValue) : v.discount != null ? String(v.discount) : "";
          const stockVal = v.stockQuantity != null ? String(v.stockQuantity) : v.stock != null ? String(v.stock) : "0";
          const threshVal = v.lowStockThreshold != null ? String(v.lowStockThreshold) : v.threshold != null ? String(v.threshold) : "0";

          setQuickEdit((prev) => ({
            ...prev,
            isLoading: false,
            unitTypeId: resolvedUnitTypeId,
            unit: String(v.unitId || v.unit || ""),
            measurement: String(v.measurement ?? ""),
            costPrice: resolvedCost,
            mrp: resolvedMrp,
            discountType: discType,
            discountValue: discVal,
            stock: stockVal,
            threshold: threshVal,
            minOrderQty: String(v.minOrderQty ?? v.minOrderQuantity ?? "1"),
            maxOrderQty: String(v.maxOrderQty ?? v.maxOrderQuantity ?? "5"),
          }));
          return;
        }
      } else if (resolvedParentId) {
        const res = await fetchData(`productmanagement/product/${resolvedParentId}`, "GET");
        const raw = (res as any)?.data ?? res;
        const p = (raw as any)?.product ?? raw;
        if (p) {
          const rawUnitType = p.unitTypeId || p.unitType || "";
          const resolvedUnitTypeId =
            unitTypesOptions.find(
              (o) =>
                o.value === rawUnitType ||
                (o.label && o.label.toLowerCase() === String(rawUnitType).toLowerCase())
            )?.value || (looksLikeOpaqueId(rawUnitType) ? rawUnitType : "");

          const resolvedMrp = p.mrp != null ? String(p.mrp) : "";
          const resolvedCost = p.costPrice != null ? String(p.costPrice) : p.price != null ? String(p.price) : "";
          const discType = String(p.discountType || "").toUpperCase().includes("PERCENT")
            ? "PERCENTAGE"
            : "RUPEES";
          const discVal = p.discountValue != null ? String(p.discountValue) : p.discount != null ? String(p.discount) : "";

          setQuickEdit((prev) => ({
            ...prev,
            isLoading: false,
            unitTypeId: resolvedUnitTypeId,
            unit: String(p.unitId || p.unit || ""),
            measurement: String(p.measurement ?? ""),
            costPrice: resolvedCost,
            mrp: resolvedMrp,
            discountType: discType,
            discountValue: discVal,
            stock: String(p.stock ?? "0"),
            threshold: String(p.threshold ?? "0"),
            minOrderQty: String(p.minOrderQty ?? "1"),
            maxOrderQty: String(p.maxOrderQty ?? "5"),
          }));
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch full details for quick edit, falling back to row data:", e);
    }

    // Fallback if API fetch failed
    setQuickEdit((prev) => ({
      ...prev,
      isLoading: false,
      mrp: String((item as any).mrp ?? (item as any).price ?? ""),
      costPrice: String((item as any).landingPrice ?? (item as any).costPrice ?? (item as any).price ?? ""),
      unit: String((item as any).unit || ""),
      unitTypeId: String((item as any).unitType || ""),
      measurement: String((item as any).measurement || ""),
      discountType: "RUPEES",
      discountValue: "",
      stock: "0",
      threshold: "0",
      minOrderQty: "1",
      maxOrderQty: "5",
    }));
  };

  const handleSaveQuickEdit = async () => {
    const numMrp = parseFloat(quickEdit.mrp) || 0;
    const numCost = parseFloat(quickEdit.costPrice) || 0;
    const numDiscount = parseFloat(quickEdit.discountValue) || 0;

    let finalSellingPrice = numMrp;
    if (quickEdit.discountType === "PERCENTAGE" && numDiscount > 0 && numDiscount < 100) {
      finalSellingPrice = numMrp - (numMrp * numDiscount) / 100;
    } else if (quickEdit.discountType === "RUPEES" && numDiscount > 0 && numDiscount < numMrp) {
      finalSellingPrice = numMrp - numDiscount;
    }
    if (finalSellingPrice <= 0) {
      finalSellingPrice = numMrp > 0 ? numMrp : numCost;
    }
    finalSellingPrice = Math.round(finalSellingPrice);

    setQuickEdit((prev) => ({ ...prev, isSaving: true }));

    try {
      if (quickEdit.isVariant && quickEdit.variantId) {
        // Variant update payload
        const payload: any = {
          unitType: quickEdit.unitTypeId || undefined,
          unit: quickEdit.unit || undefined,
          measurement: quickEdit.measurement || undefined,
          mrp: numMrp,
          sellingPrice: finalSellingPrice,
          landingPrice: numCost,
          costPrice: numCost,
          discountType: quickEdit.discountType,
          discountValue: numDiscount,
          stockQuantity: parseFloat(quickEdit.stock) || 0,
          lowStockThreshold: parseFloat(quickEdit.threshold) || 0,
          minOrderQty: parseFloat(quickEdit.minOrderQty) || 1,
          maxOrderQty: parseFloat(quickEdit.maxOrderQty) || 5,
        };

        await fetchData(`productmanagement/variant/${quickEdit.variantId}`, "PUT", payload);
        toast.success("Variant details updated successfully");
      } else {
        // Product update payload
        const payload: any = {
          unitType: quickEdit.unitTypeId || undefined,
          unit: quickEdit.unit || undefined,
          measurement: quickEdit.measurement || undefined,
          costPrice: numCost,
          mrp: numMrp,
          price: finalSellingPrice,
          finalPrice: finalSellingPrice,
          discountType: quickEdit.discountType,
          discountValue: numDiscount,
          stock: parseFloat(quickEdit.stock) || 0,
          threshold: parseFloat(quickEdit.threshold) || 0,
          minOrderQty: parseFloat(quickEdit.minOrderQty) || 1,
          maxOrderQty: parseFloat(quickEdit.maxOrderQty) || 5,
        };

        await fetchData(`productmanagement/product/${quickEdit.productId}`, "PUT", payload);
        toast.success("Product details updated successfully");
      }

      // Clear cache and refetch list
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productById"] });
      queryClient.invalidateQueries({ queryKey: ["variantsByProduct"] });
      queryClient.invalidateQueries({ queryKey: ["variantById"] });
      refetch();

      setQuickEdit((prev) => ({ ...prev, isOpen: false, isSaving: false }));
    } catch (err: any) {
      console.error("Error updating quick edit:", err);
      toast.error(err?.data?.response || err?.message || "Failed to update product");
      setQuickEdit((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const toggleRowExpansion = (productId: string, product?: TableProduct) => {
    const isCurrentlyExpanded = expandedRows.has(productId);
    if (isCurrentlyExpanded) {
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      setExpandedProductIdForFetch(null);
    } else {
      setExpandedRows((prev) => new Set(prev).add(productId));
      if (product && product.variantsCount > 0 && (!product.variants || product.variants.length === 0)) {
        setExpandedProductIdForFetch(productId);
      }
    }
  };

  const handleStatusToggle = (productId: string, product: TableProduct) => {
    const idKey = String(productId);
    const newIsActive = !product.isActive;
    setActiveOverrides((prev) => ({ ...prev, [idKey]: newIsActive }));
    setUpdatingStatusProductId(idKey);
    updateProductActive(
      { productId, isActive: newIsActive },
      {
        onError: () => {
          setActiveOverrides((prev) => {
            const next = { ...prev };
            delete next[idKey];
            return next;
          });
        },
        onSettled: () => {
          setUpdatingStatusProductId(null);
        },
      }
    );
  };

  const handleVariantStatusToggle = async (variantId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setVariantActiveOverrides((prev) => ({ ...prev, [variantId]: newEnabled }));
    setUpdatingVariantId(variantId);
    try {
      await updateVariantStatus({ variantId, isEnabled: newEnabled });
      queryClient.invalidateQueries({ queryKey: ["productById"] });
    } catch {
      setVariantActiveOverrides((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
    } finally {
      setUpdatingVariantId(null);
    }
  };

  // Calculate KPI stats from API data
  // Use backend total count across all pages (not just current page records).
  const totalProducts = useMemo(() => {
    const raw = apiData as unknown as Record<string, unknown> | undefined;
    const dataBlock = raw?.data as Record<string, unknown> | undefined;
    const statsBlock = dataBlock?.stats as Record<string, unknown> | undefined;
    const candidates = [
      pagination?.total,
      (pagination as unknown as Record<string, unknown> | undefined)?.totalCount,
      (pagination as unknown as Record<string, unknown> | undefined)?.count,
      statsBlock?.totalProducts,
      statsBlock?.total,
      dataBlock?.totalProducts,
      dataBlock?.total,
      raw?.total,
    ];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return products.length;
  }, [apiData, pagination, products.length]);
  const activeProducts = useMemo(() => {
    const raw = apiData as unknown as Record<string, unknown> | undefined;
    const dataBlock = raw?.data as Record<string, unknown> | undefined;
    const statsBlock = dataBlock?.stats as Record<string, unknown> | undefined;
    const candidates = [statsBlock?.activeProducts, statsBlock?.active];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return products.filter(
      (p) => p.status === "ACTIVE" || (p.isActive && p.status !== "PENDING")
    ).length;
  }, [apiData, products]);
  const inactiveProducts = useMemo(() => {
    const raw = apiData as unknown as Record<string, unknown> | undefined;
    const dataBlock = raw?.data as Record<string, unknown> | undefined;
    const statsBlock = dataBlock?.stats as Record<string, unknown> | undefined;
    const candidates = [statsBlock?.inactiveProducts, statsBlock?.inactive];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return products.filter(
      (p) => p.status === "INACTIVE" || !p.isActive
    ).length;
  }, [apiData, products]);
  const pendingProducts = products.filter((p) => p.status === "PENDING").length;



  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Manage Products
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* <button
            type="button"
            onClick={() => setResetStockConfirm(true)}
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center px-3.5 py-2 bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-600 text-white rounded-lg shadow-sm hover:shadow transition-colors text-xs sm:text-sm font-semibold"
            title="Reset stock quantity and low stock threshold to 0 for all products"
          >
            <RotateCcw size={14} className="sm:w-4 sm:h-4" />
            <span>Reset All Stock to 0</span>
          </button> */}
          {/* <button
            type="button"
            onClick={() => setRandomStockConfirm(true)}
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center px-3.5 py-2 bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg shadow-sm hover:shadow transition-colors text-xs sm:text-sm font-semibold"
            title="Assign random stock quantities (10 - 150) to all products"
          >
            <Dices size={14} className="sm:w-4 sm:h-4" />
            <span>Random Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setUndoResetConfirm(true)}
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center px-3 py-2 bg-amber-600 dark:bg-amber-700 hover:bg-amber-700 dark:hover:bg-amber-600 text-white rounded-lg shadow-sm hover:shadow transition-colors text-xs sm:text-sm font-semibold"
            title="Restore product stock levels to state prior to reset"
          >
            <Undo2 size={14} className="sm:w-4 sm:h-4" />
            <span>Undo Reset</span>
          </button> */}
          <button
            type="button"
            onClick={() => navigate("/products/barcode-mapping")}
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm hover:shadow transition-all text-xs sm:text-sm font-semibold"
          >
            <Barcode size={15} />
            <span>Quick Barcode Map</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/products/bulk-upload")}
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-xs sm:text-sm font-medium"
          >
            <Upload size={14} className="sm:w-4 sm:h-4" />
            <span>Bulk Upload</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/products/zip-import")}
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-xs sm:text-sm font-medium"
          >
            <FolderArchive size={14} className="sm:w-4 sm:h-4" />
            <span>ZIP Import</span>
          </button>
          <PrimaryButton
            onClick={() => navigate("/products/create")}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Product</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 max-w-full mb-6">
        <StatCard
          title="Total Catalog"
          value={totalProducts}
          icon={Package}
          variant="blue"
        />

        <StatCard
          title="Active (Public)"
          value={activeProducts}
          icon={Package}
          variant="green"
        />
        <StatCard
          title="Inactive"
          value={inactiveProducts}
          icon={Package}
          variant="gray"
        />
        <StatCard
          title="Pending"
          value={pendingProducts}
          icon={Package}
          variant="yellow"
        />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Category Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 flex items-center relative">
            <div className="w-full [&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:pl-0 [&_select]:py-0 [&_select]:w-full [&_.relative]:w-full">
              <SelectInput
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={categoryOptions}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 flex items-center relative">
            <div className="w-full [&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:pl-0 [&_select]:py-0 [&_select]:w-full [&_.relative]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={PRODUCT_LIST_STATUS_FILTER_OPTIONS}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Reset Filter Button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center sm:justify-start"
            >
              <RotateCcw
                size={14}
                className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-500"
              />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search & Barcode Scanner Section */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-72 lg:w-80">
            <SearchInput
              placeholder="Search name, ID, SKU, barcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg shadow-sm hover:shadow transition-all text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 h-10 shrink-0"
            title="Scan product barcode using camera"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerOverlay
          onScan={(code: string) => {
            const cleanCode = String(code || "").trim();
            if (cleanCode) {
              setSearchTerm(cleanCode);
              setCurrentPage(1);
              setIsScannerOpen(false);
              toast.success(`Scanned Barcode: ${cleanCode}`);
            }
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Products Table: S.NO, IMAGE, NAME, UNIT, UNIT TYPE, PRICE, D.PRICE, VARIANTS, SKU, STATUS, ACTIONS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400" />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-500 dark:text-red-400 text-sm mb-3">
                Failed to load products. {(error as Error)?.message || "Please try again."}
              </p>
              <button type="button" onClick={() => refetch()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                Retry
              </button>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">No products found</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-center">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">S.NO</span>
                  </th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-center">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">IMAGE</span>
                  </th>
                  <SortableTableHeader field="name" label="NAME" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                  <SortableTableHeader field="unit" label="UNIT" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                  <SortableTableHeader field="unitType" label="UNIT TYPE" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                  <SortableTableHeader field="price" label="PRICE (₹)" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                  <SortableTableHeader field="discountedPrice" label="D.PRICE (₹)" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                  <SortableTableHeader field="variantsCount" label="VARIANTS" currentField={sortField} direction={sortDirection} onSort={handleSort} />

                  <SortableTableHeader field="sku" label="SKU" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                  <SortableTableHeader field="status" label="STATUS" currentField={sortField} direction={sortDirection} onSort={handleSort} />

                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-center">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">ACTIONS</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product, index) => {
                  const idKey = String(product.id);
                  const isActive = activeOverrides[idKey] !== undefined ? activeOverrides[idKey] : product.isActive;
                  const productForVariants = expandedProductDetailsCache[product.id] || product;
                  const hasVariants = productForVariants.variants && productForVariants.variants.length > 0;
                  const rowSerial = (currentPage - 1) * itemsPerPage + index + 1;

                  const queryLower = (barcodeSearch.trim() || searchTerm.trim()).toLowerCase();
                  const hasMatchingVariant = Boolean(
                    queryLower &&
                    productForVariants.variants &&
                    productForVariants.variants.some((v: any) =>
                      (v.barcode && String(v.barcode).toLowerCase().includes(queryLower)) ||
                      (v.gtin && String(v.gtin).toLowerCase().includes(queryLower)) ||
                      (v.sku && String(v.sku).toLowerCase().includes(queryLower)) ||
                      (v.variantName && String(v.variantName).toLowerCase().includes(queryLower))
                    )
                  );
                  const isExpanded = expandedRows.has(product.id) || hasMatchingVariant;

                  return (
                    <React.Fragment key={product.id}>
                      <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">{rowSerial}</td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-[10px] text-gray-400 dark:text-gray-500">No image</span>'; }} />
                          ) : (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">No image</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 text-center">{product.name}</td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">{product.unit}</td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">{product.unitType}</td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 text-center">{formatPrice(product.price)}</td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">{formatPrice(product.discountedPrice)}</td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200 text-center">
                          <button type="button" onClick={() => toggleRowExpansion(product.id, product)} className="font-semibold cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors underline decoration-dotted" title="Click to view variant details">
                            {product.variantsCount}
                          </button>
                        </td>

                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">{product.sku}</td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(product.id, product)}
                              disabled={updatingStatusProductId === idKey}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isActive ? "bg-green-600 dark:bg-green-500" : "bg-gray-300 dark:bg-gray-600"} ${updatingStatusProductId === idKey ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              title={isActive ? "Click to make inactive" : "Click to make active"}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </td>

                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenQuickEdit(product, false)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Quick Edit"
                            >
                              <MoreVertical size={14} />
                            </button>
                            <ViewIconButton onClick={() => handleView(product)} size={12} />
                            <EditIconButton onClick={() => handleEdit(product)} size={12} />
                            <DeleteButton onClick={() => _handleDeleteClick(product.id)} size={12} />
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${product.id}-variants`}>
                          <td colSpan={14} className="px-0 py-0 bg-gray-50 dark:bg-gray-900">
                            <div className="px-4 py-4">
                              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse table-fixed">
                                    <tbody>
                                      {hasVariants && productForVariants.variants && productForVariants.variants.length > 0 ? (
                                        productForVariants.variants.map((variant, idx) => {
                                          const vMrp = typeof variant.price === "string" ? parseFloat(variant.price) : Number(variant.price ?? variant.mrp ?? 0);
                                          const vFinalSelling =
                                            typeof variant.salePrice === "string"
                                              ? parseFloat(variant.salePrice)
                                              : Number(variant.salePrice ?? 0);
                                          const vImg = variant.image ?? variant.images?.[0] ?? null;
                                          const vName = variant.variantName || variant.name || product.name;
                                          const baseActive = variant.variantStatus === true || variant.variantStatus === "active" || String(variant.variantStatus).toLowerCase() === "active";
                                          const variantIdStr = String(variant.id ?? "");
                                          const isVariantActive = variantActiveOverrides[variantIdStr] !== undefined ? variantActiveOverrides[variantIdStr] : baseActive;
                                          const cellClass = "px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-center align-middle";
                                          const isVarMatch = Boolean(
                                            queryLower && (
                                              (variant.barcode && String(variant.barcode).toLowerCase().includes(queryLower)) ||
                                              (variant.gtin && String(variant.gtin).toLowerCase().includes(queryLower)) ||
                                              (variant.sku && String(variant.sku).toLowerCase().includes(queryLower)) ||
                                              (vName && vName.toLowerCase().includes(queryLower))
                                            )
                                          );
                                          return (
                                            <tr key={variant.id ?? idx} className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${isVarMatch ? "bg-emerald-100/70 dark:bg-emerald-900/40 ring-1 ring-emerald-500/50" : "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"}`}>
                                              <td className={`${cellClass} text-gray-800 dark:text-gray-200`}>{idx + 1}</td>
                                              <td className={cellClass}>
                                                {vImg ? <img src={vImg} alt={vName} className="w-10 h-10 object-cover rounded mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-[10px] text-gray-400 dark:text-gray-500">No image</span>'; }} /> : <span className="text-[10px] text-gray-400 dark:text-gray-500">No image</span>}
                                              </td>
                                              <td className={`${cellClass} font-semibold text-gray-800 dark:text-gray-200`}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <span>{vName}</span>
                                                  {isVarMatch && (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-600 text-white shadow-xs">
                                                      Matched
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className={`${cellClass} text-gray-700 dark:text-gray-300`}>{variant.unit || product.unit || "N/A"}</td>
                                              <td className={`${cellClass} text-gray-700 dark:text-gray-300`}>{variant.unitType || "N/A"}</td>
                                              <td className={`${cellClass} font-semibold text-gray-800 dark:text-gray-200`}>{formatPrice(vMrp)}</td>
                                              <td className={`${cellClass} text-gray-700 dark:text-gray-300`}>{formatPrice(vFinalSelling)}</td>
                                              <td className={cellClass} />
                                              <td className={`${cellClass} text-gray-700 dark:text-gray-300`}>
                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                  <span className="font-mono text-xs">{variant.sku || "N/A"}</span>
                                                  {variant.barcode && variant.barcode !== "N/A" && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" title="Variant Barcode">
                                                      <Barcode size={10} className="shrink-0" />
                                                      {variant.barcode}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className={cellClass}>
                                                <div className="flex items-center justify-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => variantIdStr && handleVariantStatusToggle(variantIdStr, isVariantActive)}
                                                    disabled={updatingVariantId === variantIdStr}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isVariantActive ? "bg-green-600 dark:bg-green-500" : "bg-gray-300 dark:bg-gray-600"} ${updatingVariantId === variantIdStr ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                                    title={isVariantActive ? "Click to make inactive" : "Click to make active"}
                                                  >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVariantActive ? "translate-x-6" : "translate-x-1"}`} />
                                                  </button>
                                                </div>
                                              </td>
                                              <td className={cellClass}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenQuickEdit(variant, true, product.id)}
                                                    className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title="Quick Edit"
                                                  >
                                                    <MoreVertical size={14} />
                                                  </button>
                                                  <ViewIconButton onClick={() => navigate(`/products/manage/view/${product.id}/variant/${variant.id}`)} size={12} />
                                                  <EditIconButton onClick={() => navigate(`/products/create?editVariant=true&productId=${product.id}&variantId=${variant.id}`)} size={12} />
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : expandedProductIdForFetch === product.id && isLoadingExpandedProduct ? (
                                        <tr>
                                          <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center justify-center gap-2">
                                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 dark:border-green-400" /> Loading variants...
                                            </div>
                                          </td>
                                        </tr>
                                      ) : (
                                        <tr>
                                          <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No variants available</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filteredAndSortedProducts.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing {pagination.total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    pagination.total || filteredAndSortedProducts.length
                  )}{" "}
                  of {pagination.total || filteredAndSortedProducts.length}
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                pagination={pagination}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Reset Stock Confirmation Modal */}
      <ConfirmModal
        isOpen={resetStockConfirm}
        onClose={() => setResetStockConfirm(false)}
        onConfirm={() => {
          resetStockMutation.mutate(undefined, {
            onSettled: () => setResetStockConfirm(false),
          });
        }}
        title="Reset All Product Stock to 0"
        message="Are you sure you want to reset the Stock Quantity and Low Stock Alert Threshold to 0 for ALL products? (You can use 'Undo Reset' afterwards if needed)."
        confirmText={resetStockMutation.isPending ? "Resetting..." : "Yes, Reset All to 0"}
        cancelText="Cancel"
        variant="danger"
      />

      {/* Undo Reset Stock Confirmation Modal */}
      <ConfirmModal
        isOpen={undoResetConfirm}
        onClose={() => setUndoResetConfirm(false)}
        onConfirm={() => {
          undoResetStockMutation.mutate(undefined, {
            onSettled: () => setUndoResetConfirm(false),
          });
        }}
        title="Undo Reset Stock"
        message="Are you sure you want to restore previous stock quantities and low stock thresholds for all products?"
        confirmText={undoResetStockMutation.isPending ? "Restoring..." : "Yes, Restore Stock"}
        cancelText="Cancel"
        variant="info"
      />

      {/* Random Stock Confirmation Modal */}
      <ConfirmModal
        isOpen={randomStockConfirm}
        onClose={() => setRandomStockConfirm(false)}
        onConfirm={() => {
          randomStockMutation.mutate(undefined, {
            onSettled: () => setRandomStockConfirm(false),
          });
        }}
        title="Assign Random Stock to All Products"
        message="Are you sure you want to assign random stock quantities (between 10 and 150) to ALL products? (You can use 'Undo Reset' to revert if needed)."
        confirmText={randomStockMutation.isPending ? "Assigning..." : "Yes, Assign Random Stock"}
        cancelText="Cancel"
        variant="info"
      />

      {/* Quick Edit Modal */}
      <Modal
        isOpen={quickEdit.isOpen}
        onClose={() => setQuickEdit((prev) => ({ ...prev, isOpen: false }))}
        title={quickEdit.title}
        size="lg"
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        {quickEdit.isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading details...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Units & Measurement */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-xs">1</span>
                Units & Measurement
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <SelectInput
                    label="Unit Type"
                    required
                    value={quickEdit.unitTypeId}
                    onChange={(e) => {
                      const newUnitType = e.target.value;
                      setQuickEdit((prev) => ({
                        ...prev,
                        unitTypeId: newUnitType,
                        unit: "", // reset unit when type changes
                      }));
                    }}
                    options={[
                      { value: "", label: "Select Unit Type" },
                      ...unitTypesOptions,
                    ]}
                  />
                </div>
                <div>
                  <SelectInput
                    label="Unit"
                    required
                    value={quickEdit.unit}
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    options={[
                      { value: "", label: "Select Unit" },
                      ...(quickEditUnitsOptions || []),
                    ]}
                  />
                </div>
                <div>
                  <TextInput
                    label="Measurement"
                    value={quickEdit.measurement}
                    placeholder="e.g. 100"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, measurement: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* 2. Pricing */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 inline-flex items-center justify-center text-xs">2</span>
                Pricing
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <TextInput
                    label="Landing Price ( ₹ )"
                    required
                    type="number"
                    value={quickEdit.costPrice}
                    placeholder="0.00"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, costPrice: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <TextInput
                    label="Original Price / M.R.P ( ₹ )"
                    required
                    type="number"
                    value={quickEdit.mrp}
                    placeholder="0.00"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, mrp: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <SelectInput
                    label="Discount Type"
                    value={quickEdit.discountType}
                    onChange={(e) =>
                      setQuickEdit((prev) => ({
                        ...prev,
                        discountType: e.target.value as "RUPEES" | "PERCENTAGE",
                      }))
                    }
                    options={[
                      { value: "RUPEES", label: "Rupees (₹)" },
                      { value: "PERCENTAGE", label: "Percentage (%)" },
                    ]}
                  />
                </div>
                <div>
                  <TextInput
                    label={quickEdit.discountType === "PERCENTAGE" ? "Discount Percentage ( % )" : "Discount Amount ( ₹ )"}
                    type="number"
                    value={quickEdit.discountValue}
                    placeholder="0"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, discountValue: e.target.value }))
                    }
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <TextInput
                    label="Final Selling Price ( ₹ )"
                    type="number"
                    disabled
                    value={quickCalculatedFinalPrice}
                    className="bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* 3. Inventory & Availability */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 inline-flex items-center justify-center text-xs">3</span>
                Inventory & Availability
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <TextInput
                    label="Stock Quantity"
                    required
                    type="number"
                    value={quickEdit.stock}
                    placeholder="0"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, stock: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <TextInput
                    label="Low Stock Alert Threshold"
                    type="number"
                    value={quickEdit.threshold}
                    placeholder="0"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, threshold: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <TextInput
                    label="Minimum Order Quantity"
                    type="number"
                    value={quickEdit.minOrderQty}
                    placeholder="1"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, minOrderQty: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <TextInput
                    label="Maximum Order Quantity"
                    type="number"
                    value={quickEdit.maxOrderQty}
                    placeholder="5"
                    onChange={(e) =>
                      setQuickEdit((prev) => ({ ...prev, maxOrderQty: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setQuickEdit((prev) => ({ ...prev, isOpen: false }))}
                disabled={quickEdit.isSaving}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleSaveQuickEdit}
                disabled={quickEdit.isSaving}
                className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium"
              >
                {quickEdit.isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerOverlay
          onScan={(code: string) => {
            const trimmed = (code || "").trim();
            if (trimmed) {
              setBarcodeSearch(trimmed);
              setCurrentPage(1);
            }
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
};

export default ManageProducts;
