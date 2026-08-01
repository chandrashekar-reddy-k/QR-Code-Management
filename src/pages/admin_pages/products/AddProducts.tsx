

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Upload,
  X,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import {
  TextInput,
  SelectInput,
  FormSection,
  Modal,
} from "../../../components/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCreateProduct,
  useCreateVariant,
  useGetProductDetailsById,
  useGetVariantById,
  useGetProductCategoriesList,
  useGetProductUnitTypesList,
  useGetUnitsMapForUnitTypes,
  useUpdateProduct,
  useUpdateVariant,
} from "../../../hooks/product";
import { useGetBrandsFilteredByCategory } from "../../../hooks/brands";
import fetchData from "../../../helper";
import { uploadImageFile as uploadImage } from "../../../lib/uploadImage";
import {
  validatePartnerProductStep1,
  validatePartnerProductStep2,
  validatePartnerProductStep3,
  validatePartnerProductStep4,
  variantFieldErrorKey,
} from "./addProductFormValidation";
import {
  sanitizeNonNegativeDecimalInput,
  sanitizeNonNegativeIntInput,
} from "../../../utils/variantNumericInput";
import {
  buildAutoVariantLabel,
  buildAutoVariantSku,
} from "../../../utils/variantAutoFields";

type UnitsByTypeMap = Record<string, { value: string; label: string }[]>;

/** When false, variant name / SKU / status UI is hidden; values are auto-generated (aligned with vilagkart_new_admin). */
const SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS = false;
/** When false, variant barcode text + barcode image UI is hidden (aligned with vilagkart_new_admin). */
const SHOW_VARIANT_BARCODE_SECTION = false;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Space-separated label: product name + measurement + unit label (no hyphens; create flow). */
function computeAutoVariantName(
  unitsByTypeId: UnitsByTypeMap,
  productName: string,
  measurement: string,
  typeId: string,
  unitValue: string,
): string {
  const opts = unitsByTypeId[typeId] ?? [];
  const found = opts.find((o) => o.value === unitValue);
  const unitLabel = (found?.label ?? "").trim() || String(unitValue).trim();
  const parts = [productName.trim(), measurement.trim(), unitLabel].filter(
    Boolean,
  );
  if (parts.length === 0) return "";
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnlyMeasurement(value: string): string {
  return String(value).replace(/\D/g, "");
}

interface VariantAttribute {
  name: string; // e.g., "Color", "Size", "Weight"
  value: string; // e.g., "Red", "Large", "1kg"
}

interface Variant {
  id: number;
  // Basic Information
  variantName: string;
  sku: string;
  barcode: string;

  // Variant Type & Measurement (type = unitTypeId from API dropdown)
  type: string;
  unit: string;
  measurement: string;

  // Pricing
  mrp: string; // Maximum Retail Price
  price: string; // Original/Selling price
  discountType: "percentage" | "rupees";
  discount: string;
  salePrice: string; // Auto-calculated final price (Selling Price)

  // Inventory & Availability
  stock: string;
  stockStatus: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  lowStockThreshold: string;

  // Attributes
  attributes: VariantAttribute[];

  // Shipping & Dimensions
  weight: string; // For shipping calculation
  length: string;
  width: string;
  height: string;
  shippingClass: string;

  // Status & Visibility
  variantStatus: "active" | "inactive";

  // SEO & Settings
  metaTitle: string;
  metaKeywords: string;
  schemaMarkup: string;
  metaDescription: string;

  // Images
  primaryImage: File | null;
  secondaryImage: File | null;
  barcodeImage: File | null;
}

interface FormData {
  productName: string;
  seller: string;
  tax: string;
  tags: string;
  brands: string;
  description: string;
  shortDescription: string;
  slug: string;
  mainImage: File | null;
  secondImage: File | null;
  otherImages: File[];
  metaTitle: string;
  metaKeywords: string;
  schemaMarkup: string;
  metaDescription: string;
  variantType: string;
  stockLimit: string;
  measurement: string;
  price: string;
  discount: string;
  discountType: string;
  salePrice: string;
  stock: string;
  unit: string;
  stockStatus: string;
  category: string;
  subCategory: string;
  productType: string;
  inventoryType: string; // "Physical" | "Digital"
  manufacturer: string;
  barcode: string;
  barcodeImage: File | null;
  madeIn: string;
  fssaiLicNo: string;
  isReturnable: string; // "yes" | "no"
  maxReturnDays: string;
  isCancelable: string; // "yes" | "no"
  cancellableOrderStatuses: string[];
  isCodAllowed: string; // "yes" | "no"
  productStatus: string; // "approved" | "not_approved"
  variants: Variant[];
}

/** Must match partner product API validation. */
const PARTNER_CANCELLABLE_ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
] as const;

type PartnerCancellableOrderStatus =
  (typeof PARTNER_CANCELLABLE_ORDER_STATUSES)[number];

const PARTNER_CANCELLABLE_ORDER_STATUS_SET = new Set<string>(
  PARTNER_CANCELLABLE_ORDER_STATUSES,
);

const PARTNER_CANCELLABLE_ORDER_STATUS_OPTIONS: ReadonlyArray<{
  value: PartnerCancellableOrderStatus;
  label: string;
}> = [
    { value: "PLACED", label: "Placed" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "PROCESSING", label: "Processing" },
    { value: "READY_FOR_PICKUP", label: "Ready for pickup" },
    { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  ];

/** Maps old UI / legacy API strings to canonical backend enums. */
const LEGACY_CANCEL_STATUS_TO_CANONICAL: Record<
  string,
  PartnerCancellableOrderStatus
> = {
  pending: "PLACED",
  placed: "PLACED",
  confirmed: "CONFIRMED",
  processing: "PROCESSING",
  shipped: "READY_FOR_PICKUP",
  ready_for_pickup: "READY_FOR_PICKUP",
  readyforpickup: "READY_FOR_PICKUP",
  assigned_to_agent: "OUT_FOR_DELIVERY",
  assignedtoagent: "OUT_FOR_DELIVERY",
};

function normalizeCancellableOrderStatusForApi(
  raw: unknown,
): PartnerCancellableOrderStatus | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const upper = s.toUpperCase().replace(/-/g, "_");
  if (PARTNER_CANCELLABLE_ORDER_STATUS_SET.has(upper))
    return upper as PartnerCancellableOrderStatus;
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  return LEGACY_CANCEL_STATUS_TO_CANONICAL[lower] ?? null;
}

function normalizeCancellableOrderStatusesList(
  raw: unknown[],
): PartnerCancellableOrderStatus[] {
  const out = new Set<PartnerCancellableOrderStatus>();
  for (const item of raw) {
    const n = normalizeCancellableOrderStatusForApi(item);
    if (n) out.add(n);
  }
  return Array.from(out);
}

/** Empty product form for /products/create and after “Add new product” from success modals. */
function getEmptyCreateProductFormData(): FormData {
  return {
    productName: "",
    seller: "",
    tax: "",
    tags: "",
    brands: "",
    description: "",
    shortDescription: "",
    slug: "",
    mainImage: null,
    secondImage: null,
    otherImages: [],
    metaTitle: "",
    metaKeywords: "",
    schemaMarkup: "",
    metaDescription: "",
    variantType: "",
    stockLimit: "",
    measurement: "",
    price: "",
    discount: "",
    discountType: "percentage",
    salePrice: "",
    stock: "",
    unit: "",
    stockStatus: "",
    category: "",
    subCategory: "",
    productType: "",
    inventoryType: "",
    manufacturer: "",
    barcode: "",
    barcodeImage: null,
    madeIn: "",
    fssaiLicNo: "",
    isReturnable: "no",
    maxReturnDays: "",
    isCancelable: "no",
    cancellableOrderStatuses: [],
    isCodAllowed: "no",
    productStatus: "not_approved",
    variants: [
      {
        id: 1,
        variantName: "",
        sku: "",
        barcode: "",
        type: "" as Variant["type"],
        unit: "",
        measurement: "",
        mrp: "",
        price: "",
        discountType: "percentage",
        discount: "",
        salePrice: "",
        stock: "",
        stockStatus: "",
        minOrderQuantity: "",
        maxOrderQuantity: "",
        lowStockThreshold: "",
        attributes: [],
        weight: "",
        length: "",
        width: "",
        height: "",
        shippingClass: "",
        variantStatus: "active",
        metaTitle: "",
        metaKeywords: "",
        schemaMarkup: "",
        metaDescription: "",
        primaryImage: null,
        secondaryImage: null,
        barcodeImage: null,
      },
    ],
  };
}

const AddProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  // Check if addVariant or editVariant query parameters are present
  const searchParams = new URLSearchParams(location.search);
  const addVariantParam = searchParams.get("addVariant") === "true";
  const editVariantParam = searchParams.get("editVariant") === "true";
  const shouldShowVariants = addVariantParam || editVariantParam;
  const addVariantOnly =
    shouldShowVariants && addVariantParam && !editVariantParam;
  const productIdFromUrl = searchParams.get("productId");
  const variantIdFromUrl = searchParams.get("variantId");
  const returnTo = searchParams.get("returnTo"); // "list" = from manage list, "view" = from view page
  const isEditVariantMode = editVariantParam && !!variantIdFromUrl;
  const backToManage = useMemo(() => {
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const out = new URLSearchParams();
    if (page) out.set("page", page);
    if (limit) out.set("limit", limit);
    const qs = out.toString();
    return qs ? `/products/manage?${qs}` : "/products/manage";
  }, [location.search]);

  const cancellableStatusOptions = PARTNER_CANCELLABLE_ORDER_STATUS_OPTIONS;

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const totalSteps = shouldShowVariants ? 4 : 3;
  const [variantStep, setVariantStep] = useState(1); // For variant form sub-steps (1 or 2)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showVariantSuccessModal, setShowVariantSuccessModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  /** Bump to remount Jodit after “Add new product” on same route (navigate no-ops). */
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [isSavingVariants, setIsSavingVariants] = useState(false);

  // Product creation mutation
  const createProductMutation = useCreateProduct();

  const queryClient = useQueryClient();
  // Product update mutation
  const updateProductMutation = useUpdateProduct(id || "");
  // Create variant: POST productmanagement/variant (JSON body per Postman)
  const createVariantMutation = useCreateVariant();
  // Update variant: PUT productmanagement/variant/{{variantId}}
  const updateVariantMutation = useUpdateVariant(variantIdFromUrl || "");
  // Fetch variant for edit mode
  const { data: variantApiData } = useGetVariantById(
    isEditVariantMode ? variantIdFromUrl || "" : "",
  );

  // Fetch product data for edit mode
  const { data: productData, isLoading: isLoadingProduct } =
    useGetProductDetailsById(id || productIdFromUrl || "");

  const [parentProductData, setParentProductData] = useState<{
    productName: string;
    category: string;
    subCategory: string;
    mainImagePreview: string | null;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>(() =>
    getEmptyCreateProductFormData(),
  );
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [secondImagePreview, setSecondImagePreview] = useState<string | null>(
    null,
  );
  const [barcodeImagePreview, setBarcodeImagePreview] = useState<string | null>(
    null,
  );
  const [variantImagePreviews, setVariantImagePreviews] = useState<
    Record<
      number,
      {
        primary: string | null;
        secondary: string | null;
        barcode: string | null;
      }
    >
  >({});
  const [expandedSections, setExpandedSections] = useState<
    Record<number, Set<string>>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set current step to 4 (Add Variant) if addVariant query param is present
  useEffect(() => {
    if (shouldShowVariants) {
      setCurrentStep(4);
      setVariantStep(1); // Reset to first variant step
      // Mark steps 1, 2, 3 as completed since parent product is already created
      setCompletedSteps([1, 2, 3]);
      // Get productId from URL and load parent product data
      if (productIdFromUrl) {
        setSavedProductId(productIdFromUrl);
        // Get parent product data from sessionStorage
        const storedProductData = sessionStorage.getItem(
          `product_${productIdFromUrl}`,
        );
        if (storedProductData) {
          try {
            const parsed = JSON.parse(storedProductData);
            setParentProductData({
              productName: parsed.productName || parsed.name || "",
              category: parsed.categoryId || parsed.category || "",
              subCategory: parsed.subCategoryId || parsed.subCategory || "",
              mainImagePreview: parsed.mainImagePreview || null,
            });
          } catch (error) {
            console.error("Error parsing stored product data:", error);
          }
        }
      }

      // Reset variant form data only when adding new variant (not when editing)
      if (!isEditVariantMode) {
        setFormData((prev) => ({
          ...prev,
          variants: [
            {
              id: 1,
              // Basic Information
              variantName: "",
              sku: "",
              barcode: "",
              // Variant Type & Measurement
              type: "" as Variant["type"],
              unit: "",
              measurement: "",
              // Pricing
              mrp: "",
              price: "",
              discountType: "percentage",
              discount: "",
              salePrice: "",
              // Inventory & Availability
              stock: "",
              stockStatus: "",
              minOrderQuantity: "",
              maxOrderQuantity: "",
              lowStockThreshold: "",
              // Attributes
              attributes: [],
              // Shipping & Dimensions
              weight: "",
              length: "",
              width: "",
              height: "",
              shippingClass: "",
              // Status & Visibility
              variantStatus: "active",
              // SEO & Settings
              metaTitle: "",
              metaKeywords: "",
              schemaMarkup: "",
              metaDescription: "",
              // Images
              primaryImage: null,
              secondaryImage: null,
              barcodeImage: null,
            },
          ],
        }));
        // Reset variant image previews and errors
        setVariantImagePreviews({});
        setErrors({});
      }
      setExpandedSections({});
    }
  }, [shouldShowVariants, productIdFromUrl, isEditVariantMode]);

  const resetCreateProductForm = useCallback(
    (opts?: {
      clearSessionProductId?: string | null;
      remountDescriptionEditor?: boolean;
    }) => {
      if (opts?.clearSessionProductId) {
        try {
          sessionStorage.removeItem(`product_${opts.clearSessionProductId}`);
        } catch {
          /* ignore */
        }
      }
      queryClient.invalidateQueries({ queryKey: ["productById"] });
      queryClient.invalidateQueries({ queryKey: ["variantById"] });
      setCurrentStep(1);
      setCompletedSteps([]);
      setVariantStep(1);
      setParentProductData(null);
      setSavedProductId(null);
      setShowVariantSuccessModal(false);
      setShowSuccessModal(false);
      setMainImagePreview(null);
      setSecondImagePreview(null);
      setBarcodeImagePreview(null);
      setVariantImagePreviews({});
      setExpandedSections({});
      setErrors({});
      setFormData(getEmptyCreateProductFormData());
      if (opts?.remountDescriptionEditor) {
        setDescriptionEditorKey((k) => k + 1);
      }
    },
    [queryClient],
  );

  // When user opens /products/create with no id (or query changes): reset so edit data / stale values don’t appear.
  useEffect(() => {
    if (
      location.pathname === "/products/create" &&
      !id &&
      !shouldShowVariants
    ) {
      resetCreateProductForm();
    }
  }, [
    location.pathname,
    location.search,
    id,
    shouldShowVariants,
    resetCreateProductForm,
  ]);

  // Match admin (`vilagkart_new_admin` AddProducts) Jodit options + stable reference so the editor is not recreated every render.
  const joditDescriptionConfig = useMemo(
    () => ({
      readonly: false,
      placeholder: "Start writing...",
      height: 250,
      toolbar: true,
      spellcheck: true,
      language: "en",
      toolbarButtonSize: "small" as const,
      showCharsCounter: true,
      showWordsCounter: true,
      showXPathInStatusbar: false,
      askBeforePasteHTML: true,
      askBeforePasteFromWord: true,
      defaultActionOnPaste: "insert_as_html" as const,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "ul",
        "ol",
        "|",
        "outdent",
        "indent",
        "|",
        "align",
        "|",
        "link",
        "|",
        "undo",
        "redo",
        "|",
        "hr",
        "eraser",
        "|",
        "source",
      ],
    }),
    [],
  );

  const handleDescriptionBlur = useCallback((content: string) => {
    setFormData((prev) => ({ ...prev, description: content }));
    setErrors((prev) =>
      prev.description ? { ...prev, description: "" } : prev,
    );
  }, []);
  /** Keep description in sync while typing so Step 1 “Next” validates the visible editor content (not only on blur). */
  const handleDescriptionChange = useCallback((content: string) => {
    setFormData((prev) => ({ ...prev, description: content }));
    setErrors((prev) =>
      prev.description ? { ...prev, description: "" } : prev,
    );
  }, []);

  // Toggle section expand/collapse
  const toggleSection = (variantId: number, section: string) => {
    setExpandedSections((prev) => {
      const variantSections = prev[variantId] || new Set();
      const newSections = new Set(variantSections);
      if (newSections.has(section)) {
        newSections.delete(section);
      } else {
        newSections.add(section);
      }
      return { ...prev, [variantId]: newSections };
    });
  };

  const isSectionExpanded = (variantId: number, section: string) => {
    return expandedSections[variantId]?.has(section) ?? true; // Default to expanded
  };

  // Handle variant attribute changes
  const handleAttributeChange = (
    variantId: number,
    attrIndex: number,
    field: "name" | "value",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) => {
        if (variant.id !== variantId) return variant;
        const newAttributes = [...variant.attributes];
        newAttributes[attrIndex] = {
          ...newAttributes[attrIndex],
          [field]: value,
        };
        return { ...variant, attributes: newAttributes };
      }),
    }));
  };

  const handleAddAttribute = (variantId: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) => {
        if (variant.id !== variantId) return variant;
        return {
          ...variant,
          attributes: [...variant.attributes, { name: "", value: "" }],
        };
      }),
    }));
  };

  const handleRemoveAttribute = (variantId: number, attrIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) => {
        if (variant.id !== variantId) return variant;
        return {
          ...variant,
          attributes: variant.attributes.filter((_, i) => i !== attrIndex),
        };
      }),
    }));
  };

  // Available attribute names for variants (can be configured from master settings)
  const attributeNames = [
    "Color",
    "Size",
    "Weight",
    "Flavor",
    "Material",
    "Brand",
  ];

  // Predefined attribute values (can be expanded)
  const attributeValues: Record<string, string[]> = {
    Color: ["Red", "Blue", "Green", "Yellow", "Black", "White", "Gray"],
    Size: ["Small", "Medium", "Large", "XL", "XXL"],
    Weight: ["100g", "250g", "500g", "1kg", "2kg", "5kg"],
    Flavor: ["Vanilla", "Chocolate", "Strawberry", "Mint", "Original"],
    Material: ["Cotton", "Polyester", "Leather", "Plastic", "Metal"],
    Brand: ["Generic", "Premium", "Standard"],
  };

  // Helper functions for variant type-specific labels and field visibility
  const getUnitLabel = (variantType: string): string => {
    if (!variantType) return "Unit";
    const byId = unitTypesOptions.find((o) => o.value === variantType);
    if (byId) return `${byId.label} Unit`;
    const labelMap: Record<string, string> = {
      loose: "Unit",
      packet: "Packet Unit",
      box: "Box Unit",
      carton: "Carton Unit",
      bottle: "Bottle Unit",
      jar: "Jar Unit",
      can: "Can Unit",
      pouch: "Pouch Unit",
    };
    return labelMap[variantType] || "Unit";
  };

  const getMeasurementLabel = (variantType: string): string => {
    if (!variantType) return "Measurement";
    const labelMap: Record<string, string> = {
      loose: "Weight / Measure",
      packet: "Pack Size",
      box: "Box Size",
      carton: "Units per Carton",
      bottle: "Bottle Size / Volume",
      jar: "Jar Size / Volume",
      can: "Can Size / Volume",
      pouch: "Pouch Size / Weight",
    };
    return labelMap[variantType] || "Measurement";
  };

  const getMeasurementPlaceholder = (variantType: string): string => {
    if (!variantType) return "Select variant type first";
    const placeholderMap: Record<string, string> = {
      loose: "e.g. 1 Kg",
      packet: "e.g. 12 pcs",
      box: "e.g. 6 units",
      carton: "e.g. 24 units",
      bottle: "e.g. 500 ml",
      jar: "e.g. 250 g",
      can: "e.g. 330 ml",
      pouch: "e.g. 100 g",
    };
    return placeholderMap[variantType] || "Enter measurement";
  };

  // Determine if dimensions fields should be shown (relevant for packaged items) - COMMENTED OUT (Shipping section removed)
  // const shouldShowDimensions = (variantType: string): boolean => {
  //   if (!variantType) return false;
  //   return ["box", "carton", "bottle", "jar", "can"].includes(variantType);
  // };

  // Determine if weight field is required (more critical for certain types) - COMMENTED OUT (Shipping section removed)
  // const isWeightRequired = (variantType: string): boolean => {
  //   if (!variantType) return false;
  //   return ["loose", "box", "carton", "pouch"].includes(variantType);
  // };

  // Vendor data
  const vendors = [
    { id: "vendor1", name: "ABC Trading Company" },
    { id: "vendor2", name: "XYZ Retail Solutions" },
    { id: "vendor3", name: "Global Merchandise Inc" },
    { id: "vendor4", name: "Premium Suppliers Ltd" },
    { id: "vendor5", name: "Best Deal Wholesale" },
    { id: "vendor6", name: "Quality Goods Corp" },
  ];


  // Fetch Categories from partner API: GET productmanagement/product/categories/list
  // Response: { total, page, limit, data: [ { id, name, isActive, subCategories: [...] }, ... ] }
  const { data: categoriesData, isLoading: categoriesLoading } =
    useGetProductCategoriesList();
  const categoryIdForBrands = String(formData.category ?? "").trim();
  const subCategoryIdForBrands = String(formData.subCategory ?? "").trim();
  const {
    data: brandsListFiltered,
    isLoading: brandsLoading,
    isFetching: brandsFetching,
  } = useGetBrandsFilteredByCategory(
    categoryIdForBrands,
    subCategoryIdForBrands,
  );
  const brands = brandsListFiltered ?? [];
  const { data: activeTaxesData, isLoading: taxesLoading } = useQuery({
    queryKey: ["activeProductTaxes"],
    queryFn: () => fetchData("productmanagement/product/taxes/active", "GET"),
    retry: false,
  });
  const { data: unitTypesData } = useGetProductUnitTypesList();

  const activeTaxOptions = useMemo(() => {
    const payload = activeTaxesData as
      | { data?: unknown; taxes?: unknown[] }
      | unknown[]
      | undefined;

    const dataNode =
      (payload as { data?: unknown } | undefined)?.data ?? payload;
    const list = Array.isArray(dataNode)
      ? dataNode
      : Array.isArray((dataNode as { taxes?: unknown[] } | undefined)?.taxes)
        ? ((dataNode as { taxes?: unknown[] }).taxes as unknown[])
        : Array.isArray((payload as { taxes?: unknown[] } | undefined)?.taxes)
          ? ((payload as { taxes?: unknown[] }).taxes as unknown[])
          : [];

    const toTaxValue = (item: Record<string, unknown>): string => {
      const raw =
        item.taxRate ??
        item.value ??
        item.percentage ??
        item.rate ??
        item.gstRate ??
        item.tax;
      if (raw == null || raw === "") return "";
      const n = Number(raw);
      if (!Number.isFinite(n)) return "";
      return String(n);
    };

    return list
      .map((t) => t as Record<string, unknown>)
      .map((t) => {
        const value = toTaxValue(t);
        const name = String(t.name ?? t.title ?? t.label ?? "").trim();
        const label = name ? `${name} (${value}%)` : `${value}%`;
        return { value, label };
      })
      .filter((t) => t.value !== "");
  }, [activeTaxesData]);
  const unitTypesOptions = useMemo(() => {
    const raw = (
      unitTypesData as {
        data?: { id: string; name: string; status?: string }[];
      }
    )?.data;
    const list = Array.isArray(raw) ? raw : [];
    return list
      .filter((t) => t.status?.toUpperCase() === "ACTIVE")
      .map((t) => ({ value: t.id, label: t.name }));
  }, [unitTypesData]);

  const unitTypeIdsInVariants = useMemo(
    () => [
      ...new Set(
        (formData.variants || [])
          .map((v) => v.type)
          .filter((t) => t && /^[0-9a-f-]{36}$/i.test(t)),
      ),
    ],
    [formData.variants],
  );
  const unitsByTypeId = useGetUnitsMapForUnitTypes(unitTypeIdsInVariants);

  // Edit variant: populate form from GET variant/:id; API returns unitType/unit as names — resolve to IDs for dropdowns
  useEffect(() => {
    if (!isEditVariantMode || !variantIdFromUrl || !variantApiData) return;
    const res = variantApiData as { data?: Record<string, unknown> };
    const data = res?.data ?? variantApiData;
    const dataObj =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const looksLikeVariant = (o: Record<string, unknown>) =>
      o &&
      (o.variantName != null ||
        o.sku != null ||
        (o.unitType != null &&
          (o.landingPrice != null || o.mrp != null || o.sellingPrice != null)));
    const v = (dataObj &&
      (looksLikeVariant(dataObj)
        ? dataObj
        : (dataObj.variant ?? dataObj.product ?? dataObj))) as Record<
          string,
          unknown
        > | null;
    if (!v || typeof v !== "object") return;
    const api = v as Record<string, unknown>;
    const variantIdNum =
      typeof api.id === "number"
        ? api.id
        : parseInt(String(api.id ?? variantIdFromUrl), 10) || 1;
    const toUrl = (item: unknown): string => {
      if (!item) return "";
      if (typeof item === "string") return item;
      const obj = item as Record<string, unknown>;
      const url =
        obj?.url ||
        obj?.location ||
        obj?.fileUrl ||
        obj?.path ||
        obj?.src ||
        obj?.imageUrl ||
        obj?.link ||
        obj?.href;
      return typeof url === "string" ? url : "";
    };
    const toUrlList = (x: unknown): string[] => {
      if (!x) return [];
      if (Array.isArray(x)) return x.map(toUrl).filter(Boolean);
      const single = toUrl(x);
      return single ? [single] : [];
    };
    const primaryImages = toUrlList(
      api.primaryImages ?? api.primaryImage ?? api.images ?? api.image,
    );
    const secondaryImages = toUrlList(
      api.secondaryImages ?? api.secondaryImage,
    );
    const barcodeImg = toUrl(api.barcodeImage);

    const rawType = String(
      api.unitTypeId ?? api.unitType ?? api.type ?? "",
    ).trim();
    const rawUnit = String(api.unitId ?? api.unit ?? "").trim();
    const isUuid = (s: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);

    // Unit Type: use ID if API sent it; else resolve name (e.g. "pieces", "Pack") to id from unitTypesOptions
    let typeFormValue = rawType || "";
    if (rawType) {
      if (isUuid(rawType)) {
        typeFormValue = rawType;
      } else if (
        Array.isArray(unitTypesOptions) &&
        unitTypesOptions.length > 0
      ) {
        const norm = rawType.toLowerCase();
        const found = unitTypesOptions.find(
          (o) => o.label && String(o.label).toLowerCase() === norm,
        );
        if (found) typeFormValue = found.value;
      }
    }

    // Unit: use ID if API sent it; else resolve name (e.g. "pc", "g") to id from units for this unit type
    let unitFormValue = rawUnit || "";
    if (rawUnit && typeFormValue) {
      if (isUuid(rawUnit)) {
        unitFormValue = rawUnit;
      } else {
        const unitOpts = unitsByTypeId[typeFormValue] ?? [];
        if (unitOpts.length > 0) {
          const norm = rawUnit.toLowerCase();
          const found = unitOpts.find(
            (o) => o.label && String(o.label).toLowerCase() === norm,
          );
          if (found) unitFormValue = found.value;
        } else {
          unitFormValue = rawUnit;
        }
      }
    }

    const formVariant: Variant = {
      id: variantIdNum,
      variantName: String(api.variantName ?? api.name ?? ""),
      sku: String(api.sku ?? ""),
      barcode: String(api.barcode ?? api.gtin ?? ""),
      type: typeFormValue,
      unit: unitFormValue,
      measurement: sanitizeNonNegativeDecimalInput(
        String(api.measurement ?? ""),
      ),
      mrp: String(api.landingPrice ?? api.price ?? api.mrp ?? "0"),
      price: String(api.mrp ?? api.price ?? "0"),
      discountType: (String(api.discountType ?? "").toUpperCase() ===
        "RUPEES" || String(api.discountType ?? "").toUpperCase() === "FLAT"
        ? "rupees"
        : "percentage") as "percentage" | "rupees",
      discount: String(api.discountValue ?? api.discount ?? "0"),
      salePrice: String(
        api.sellingPrice ?? api.salePrice ?? api.finalPrice ?? "0",
      ),
      stock: String(api.stockQuantity ?? api.stock ?? "0"),
      stockStatus: String(api.stockStatus ?? "in_stock"),
      minOrderQuantity: String(api.minOrderQty ?? api.minOrderQuantity ?? "1"),
      maxOrderQuantity: String(api.maxOrderQty ?? api.maxOrderQuantity ?? "10"),
      lowStockThreshold: String(api.lowStockThreshold ?? api.threshold ?? "10"),
      attributes: Array.isArray(api.attributes)
        ? (api.attributes as VariantAttribute[])
        : [],
      weight: String(api.weight ?? "0"),
      length: String(
        (api.dimensions as Record<string, unknown>)?.length ??
        api.length ??
        "0",
      ),
      width: String(
        (api.dimensions as Record<string, unknown>)?.width ?? api.width ?? "0",
      ),
      height: String(
        (api.dimensions as Record<string, unknown>)?.height ??
        api.height ??
        "0",
      ),
      shippingClass: String(api.shippingClass ?? ""),
      variantStatus:
        api.variantStatus === "active" ||
          api.isEnabled === true ||
          api.status === "ACTIVE"
          ? "active"
          : "inactive",
      metaTitle: String(api.metaTitle ?? ""),
      metaKeywords: String(api.metaKeywords ?? ""),
      schemaMarkup:
        typeof api.schemaMarkup === "string"
          ? api.schemaMarkup
          : api.schemaMarkup
            ? JSON.stringify(api.schemaMarkup)
            : "",
      metaDescription: String(api.metaDescription ?? ""),
      primaryImage: null,
      secondaryImage: null,
      barcodeImage: null,
    };
    setFormData((prev) => {
      const current = prev.variants?.[0];
      if (
        current &&
        current.type === typeFormValue &&
        current.unit === unitFormValue
      )
        return prev;
      return { ...prev, variants: [formVariant] };
    });
    setSavedProductId((prev) => {
      const next = String(api.productId ?? productIdFromUrl ?? "");
      return prev === next ? prev : next;
    });
    setVariantImagePreviews((prev) => ({
      ...prev,
      [variantIdNum]: {
        primary: primaryImages[0] ?? null,
        secondary: secondaryImages[0] ?? primaryImages[1] ?? null,
        barcode: barcodeImg || null,
      },
    }));
  }, [isEditVariantMode, variantIdFromUrl, variantApiData, productIdFromUrl]);

  // When units for the variant's type load, resolve unit name → id so Unit dropdown shows selection (edit product + edit variant)
  useEffect(() => {
    const inEditVariant = isEditVariantMode && !!variantIdFromUrl;
    const inEditProduct = isEditMode && !!id && !shouldShowVariants;
    if ((!inEditVariant && !inEditProduct) || !formData.variants?.length)
      return;
    const variant = formData.variants[0];
    const typeId = variant?.type;
    const currentUnit = variant?.unit ?? "";
    const isUuid = (s: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);
    if (!typeId || !currentUnit || isUuid(currentUnit)) return;
    const unitOpts = unitsByTypeId[typeId] ?? [];
    if (unitOpts.length === 0) return;
    const norm = currentUnit.toLowerCase();
    const found = unitOpts.find(
      (o) => o.label && String(o.label).toLowerCase() === norm,
    );
    if (!found) return;
    setFormData((prev) => {
      const cur = prev.variants?.[0];
      if (!cur || cur.unit === found.value) return prev;
      const next: Variant = { ...cur, unit: found.value };
      if (!isEditMode && SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS) {
        const pn =
          prev.productName.trim() ||
          parentProductData?.productName?.trim() ||
          "";
        next.variantName = computeAutoVariantName(
          unitsByTypeId,
          pn,
          next.measurement,
          next.type,
          next.unit,
        );
      }
      return { ...prev, variants: [next] };
    });
  }, [
    isEditVariantMode,
    isEditMode,
    id,
    shouldShowVariants,
    variantIdFromUrl,
    formData.variants,
    unitsByTypeId,
    parentProductData?.productName,
  ]);

  const unitOptionsContentKey = useMemo(() => {
    return unitTypeIdsInVariants
      .map((id) => {
        const opts = unitsByTypeId[id] ?? [];
        return `${id}:${opts.map((o) => `${o.value}:${o.label}`).join(";")}`;
      })
      .join("|");
  }, [unitTypeIdsInVariants, unitsByTypeId]);

  const variantLabelProductName = useMemo(() => {
    const productDataObj =
      productData && typeof productData === "object"
        ? (productData as Record<string, unknown>)
        : null;
    const productDataPayload =
      productDataObj?.data && typeof productDataObj.data === "object"
        ? (productDataObj.data as Record<string, unknown>)
        : productDataObj;
    const nonEmpty = (...vals: unknown[]) => {
      for (const v of vals) {
        const s = String(v ?? "").trim();
        if (s) return s;
      }
      return "";
    };
    const fetchedProductName = nonEmpty(
      productDataPayload?.name,
      productDataPayload?.productName,
      (productDataPayload?.product as Record<string, unknown> | undefined)
        ?.name,
      (productDataPayload?.product as Record<string, unknown> | undefined)
        ?.productName,
    );

    const variantApiDataObj =
      variantApiData && typeof variantApiData === "object"
        ? (variantApiData as Record<string, unknown>)
        : null;
    const variantApiDataPayload =
      variantApiDataObj?.data && typeof variantApiDataObj.data === "object"
        ? (variantApiDataObj.data as Record<string, unknown>)
        : variantApiDataObj;
    const variantApiProductName = nonEmpty(
      variantApiDataPayload?.productName,
      (variantApiDataPayload?.product as Record<string, unknown> | undefined)
        ?.productName,
      (variantApiDataPayload?.product as Record<string, unknown> | undefined)
        ?.name,
    );

    return (
      parentProductData?.productName?.trim() ||
      formData.productName.trim() ||
      fetchedProductName ||
      variantApiProductName ||
      ""
    );
  }, [
    parentProductData?.productName,
    formData.productName,
    productData,
    variantApiData,
  ]);

  const variantMeasUnitKey = useMemo(
    () =>
      formData.variants
        .map((v) => `${v.id}:${v.measurement}:${v.unit}`)
        .join("|"),
    [formData.variants],
  );

  useEffect(() => {
    if (SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS) return;
    setFormData((prev) => {
      const nameSrc = variantLabelProductName || "";

      let changed = false;
      const nextVariants = prev.variants.map((v) => {
        const unitRaw = String(v.unit ?? "").trim();
        const unitFromType =
          (unitsByTypeId[v.type] ?? [])
            .find((u) => String(u.value) === String(unitRaw))
            ?.label?.trim() || "";
        const unitFromAnyType = (() => {
          if (!unitRaw || !/^[0-9a-f-]{36}$/i.test(unitRaw)) return "";
          for (const list of Object.values(unitsByTypeId)) {
            const found = (list ?? []).find((u) => String(u.value) === unitRaw);
            if (found?.label) return String(found.label).trim();
          }
          return "";
        })();
        const unitLabel = unitFromType || unitFromAnyType || unitRaw;

        const meas = (v.measurement || "").trim();

        if (!nameSrc) {
          if (v.variantStatus !== "active") {
            changed = true;
            return { ...v, variantStatus: "active" as const };
          }
          return v;
        }

        const autoVariantName = buildAutoVariantLabel(nameSrc, meas, unitLabel);
        const sku = buildAutoVariantSku(nameSrc, meas, unitLabel, {
          suffixWhenMultiple: prev.variants.length > 1 ? v.id : undefined,
        });

        // Add / edit variant URL flow: user sets variant name in UI; keep SKU etc. auto-synced only.
        if (shouldShowVariants) {
          if (v.sku === sku && v.variantStatus === "active") return v;
          changed = true;
          return { ...v, sku, variantStatus: "active" as const };
        }

        if (
          v.variantName === autoVariantName &&
          v.sku === sku &&
          v.variantStatus === "active"
        ) {
          return v;
        }
        changed = true;
        return {
          ...v,
          variantName: autoVariantName,
          sku,
          variantStatus: "active" as const,
        };
      });

      if (!changed) return prev;
      return { ...prev, variants: nextVariants };
    });
  }, [
    shouldShowVariants,
    editVariantParam,
    variantLabelProductName,
    variantMeasUnitKey,
    unitOptionsContentKey,
    formData.variants.length,
  ]);

  // When unit option labels load, refresh auto variant names (create flow only).
  useEffect(() => {
    if (!SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS) return;
    if (isEditMode) return;
    setFormData((prev) => {
      const pn =
        prev.productName.trim() || parentProductData?.productName?.trim() || "";
      let changed = false;
      const nextVariants = prev.variants.map((v) => {
        const nextName = computeAutoVariantName(
          unitsByTypeId,
          pn,
          v.measurement,
          v.type,
          v.unit,
        );
        if (nextName !== v.variantName) changed = true;
        return { ...v, variantName: nextName };
      });
      if (!changed) return prev;
      return { ...prev, variants: nextVariants };
    });
    // unitsByTypeId is read inside; unitOptionsContentKey bumps when loaded labels change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, unitOptionsContentKey, parentProductData?.productName]);

  interface ApiSubCategoryItem {
    id: string;
    name: string;
    categoryId?: string;
    isActive?: boolean;
  }

  interface ApiCategoryItem {
    id: string;
    name: string;
    isActive?: boolean;
    subCategories?: ApiSubCategoryItem[];
  }

  // Normalize categories from productmanagement/product/categories/list (response.data is the array)
  const categories = useMemo(() => {
    if (!categoriesData) return [];
    const res = categoriesData as { data?: ApiCategoryItem[] };
    const list = Array.isArray(res?.data) ? res.data : [];
    return list
      .filter((cat: ApiCategoryItem) => cat.isActive !== false)
      .map((cat: ApiCategoryItem) => ({ id: cat.id, name: cat.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesData]);

  // Sub-categories from the same response: selected category's embedded subCategories array
  const availableSubCategories = useMemo(() => {
    if (!formData.category || !categoriesData) return [];
    const res = categoriesData as { data?: ApiCategoryItem[] };
    const list = Array.isArray(res?.data) ? res.data : [];
    const category = list.find(
      (c: ApiCategoryItem) => c.id === formData.category,
    );
    const subs = category?.subCategories ?? [];
    return subs
      .filter((sub: ApiSubCategoryItem) => sub.isActive !== false)
      .map((sub: ApiSubCategoryItem) => ({ id: sub.id, name: sub.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [formData.category, categoriesData]);

  const subCategoriesLoading = false; // single API, no separate subcategories load

  // Resolve parent product subcategory name (for add-variant mode)
  const parentSubCategoryName = useMemo(() => {
    if (
      !parentProductData?.category ||
      !parentProductData?.subCategory ||
      !categoriesData
    )
      return "N/A";
    const res = categoriesData as { data?: ApiCategoryItem[] };
    const list = Array.isArray(res?.data) ? res.data : [];
    const category = list.find(
      (c: ApiCategoryItem) => c.id === parentProductData?.category,
    );
    const sub = category?.subCategories?.find(
      (s: ApiSubCategoryItem) => s.id === parentProductData?.subCategory,
    );
    return sub?.name ?? "N/A";
  }, [
    parentProductData?.category,
    parentProductData?.subCategory,
    categoriesData,
  ]);

  // Clear brand when category/sub-category pair is incomplete (brands API requires both).
  useEffect(() => {
    if (categoryIdForBrands && subCategoryIdForBrands) return;
    setFormData((prev) => (prev.brands ? { ...prev, brands: "" } : prev));
  }, [categoryIdForBrands, subCategoryIdForBrands]);

  // After filtered brands load, drop selection if it is not valid for this category/sub-category.
  useEffect(() => {
    if (!categoryIdForBrands || !subCategoryIdForBrands) return;
    if (brandsLoading || brandsFetching) return;
    const bid = String(formData.brands ?? "").trim();
    if (!bid) return;
    if (brands.length === 0) return;
    const ok = brands.some((b) => String(b.id) === bid);
    if (!ok) {
      setFormData((prev) => ({ ...prev, brands: "" }));
    }
  }, [
    categoryIdForBrands,
    subCategoryIdForBrands,
    brands,
    brandsLoading,
    brandsFetching,
    formData.brands,
  ]);

  // Validate and fix category/sub-category when data loads
  useEffect(() => {
    // Only validate after categories have finished loading
    if (!categoriesLoading && categories.length > 0 && formData.category) {
      const categoryExists = categories.some(
        (cat: { id: string; name: string }) => cat.id === formData.category,
      );
      if (!categoryExists) {
        // Category doesn't exist in loaded data, reset it
        setFormData((prev) => ({ ...prev, category: "", subCategory: "" }));
        setErrors((prev) => ({
          ...prev,
          category:
            "Selected category not found. Please select a valid category.",
        }));
      }
    } else if (
      !categoriesLoading &&
      categories.length === 0 &&
      formData.category
    ) {
      // Categories loaded but empty, reset if we have a category set
      setFormData((prev) => ({ ...prev, category: "", subCategory: "" }));
    }
  }, [categories, categoriesLoading, formData.category]);

  // Validate sub-category when category or sub-categories change
  useEffect(() => {
    // Only validate after sub-categories have finished loading
    if (
      !subCategoriesLoading &&
      formData.category &&
      formData.subCategory &&
      availableSubCategories.length > 0
    ) {
      const subCategoryExists = availableSubCategories.some(
        (subCat: { id: string; name: string }) =>
          subCat.id === formData.subCategory,
      );
      if (!subCategoryExists) {
        // Sub-category doesn't exist for the selected category, reset it
        setFormData((prev) => ({ ...prev, subCategory: "" }));
        setErrors((prev) => ({
          ...prev,
          subCategory:
            "Selected sub-category not found. Please select a valid sub-category.",
        }));
      }
    } else if (formData.subCategory && !formData.category) {
      // If sub-category is set but no category, reset sub-category
      setFormData((prev) => ({ ...prev, subCategory: "" }));
    }
  }, [
    formData.category,
    formData.subCategory,
    availableSubCategories,
    subCategoriesLoading,
  ]);

  // Map API unitType (id, name, or legacy) to form value (unitTypeId or legacy string)
  const normalizeUnitTypeForForm = (
    apiValue: string | undefined,
    unitTypeIdFromApi?: string,
  ): string => {
    if (unitTypeIdFromApi && String(unitTypeIdFromApi).trim())
      return String(unitTypeIdFromApi).trim();
    if (!apiValue || !String(apiValue).trim()) return "";
    const raw = String(apiValue).trim();
    if (/^[0-9a-f-]{36}$/i.test(raw)) return raw;
    const byId = unitTypesOptions.find((o) => o.value === raw);
    if (byId) return raw;
    const byName = unitTypesOptions.find(
      (o) => o.label === raw || o.label.toLowerCase() === raw.toLowerCase(),
    );
    if (byName) return byName.value;
    const rawLower = raw.toLowerCase();
    const formTypes = [
      "loose",
      "packet",
      "box",
      "carton",
      "bottle",
      "jar",
      "can",
      "pouch",
    ];
    if (formTypes.includes(rawLower)) return rawLower;
    const apiToForm: Record<string, string> = {
      weight: "packet",
      volume: "bottle",
      count: "packet",
      pack: "packet",
      gram: "packet",
      kg: "packet",
      liter: "bottle",
      ltr: "bottle",
      ml: "bottle",
      piece: "packet",
    };
    return apiToForm[rawLower] ?? "";
  };

  // Edit product: dynamic API only — GET productmanagement/product/:id (populate form only from this response)
  useEffect(() => {
    if (!isEditMode || !id || !productData || isLoadingProduct) return;
    // Handle different API response structures
    let product: any = productData;
    if ((productData as any)?.data) {
      product = (productData as any).data;
    }
    if (product?.product) {
      product = product.product;
    }
    const productIdMatch =
      product && (String(product.id) === String(id) || product.id === id);
    if (!productIdMatch) return;

    // Populate form fields only from API product (no session/cache)
    if (product && product.id) {
      // Handle category - can be ID string or object with id
      const categoryId =
        typeof product.category === "object" && product.category?.id
          ? product.category.id
          : product.categoryId || product.category || "";

      // Handle subCategory - can be ID string or object with id
      const subCategoryId =
        typeof product.subCategory === "object" && product.subCategory?.id
          ? product.subCategory.id
          : product.subCategoryId || product.subCategory || "";

      // Handle brand - can be ID string or object with id
      const brandId =
        typeof product.brand === "object" && product.brand?.id
          ? product.brand.id
          : product.brandId || product.brand || "";

      // Build variants once: use only first variant so Pricing step shows a single section (partner edit uses one variant)
      let variantsToSet: any[];
      if (
        product.variants &&
        Array.isArray(product.variants) &&
        product.variants.length > 0
      ) {
        const first = product.variants[0];
        const rawType = product.unitType || first.type || first.unitType || "";
        const unitTypeId = first.unitTypeId ?? product.unitTypeId;
        variantsToSet = [
          {
            id: first.id || 1,
            variantName: first.variantName || first.name || product.name || "",
            sku: first.sku || "",
            barcode: first.barcode || product.barcode || "",
            type: normalizeUnitTypeForForm(rawType, unitTypeId) || "",
            unit:
              product.unit ??
              product.unitId ??
              first.unit ??
              first.unitId ??
              "",
            measurement: sanitizeNonNegativeDecimalInput(
              String(product.measurement ?? ""),
            ),
            // Keep edit pricing aligned to product-level values shown in Pricing step.
            mrp: String(
              product.price ?? first.landingPrice ?? first.price ?? "0",
            ),
            price: String(product.mrp ?? first.mrp ?? first.price ?? "0"),
            discountType: String(
              product.discountType ?? first.discountType ?? "",
            )
              .toUpperCase()
              .includes("PERCENT")
              ? "percentage"
              : "rupees",
            discount: String(
              product.discountValue ??
              first.discountValue ??
              first.discount ??
              product.discount ??
              "0",
            ),
            salePrice: String(
              product.finalPrice ??
              first.sellingPrice ??
              first.salePrice ??
              first.finalPrice ??
              "0",
            ),
            stock: String(first.stock || product.stock || "0"),
            stockStatus: first.stockStatus || product.stockStatus || "in_stock",
            minOrderQuantity: String(
              product.minOrderQty ||
              first.minOrderQty ||
              first.minOrderQuantity ||
              "1",
            ),
            maxOrderQuantity: String(
              product.maxOrderQty ||
              first.maxOrderQty ||
              first.maxOrderQuantity ||
              "10",
            ),
            lowStockThreshold: String(product.threshold ?? ""),
            attributes: first.attributes || [],
            weight: String(first.weight || product.weight || "0"),
            length: String(
              first.dimensions?.length ||
              first.length ||
              product.dimensions?.length ||
              "0",
            ),
            width: String(
              first.dimensions?.width ||
              first.width ||
              product.dimensions?.width ||
              "0",
            ),
            height: String(
              first.dimensions?.height ||
              first.height ||
              product.dimensions?.height ||
              "0",
            ),
            shippingClass: first.shippingClass || "",
            variantStatus:
              first.variantStatus === true || first.variantStatus === "active"
                ? "active"
                : "inactive",
            primaryImage: null,
            secondaryImage: null,
            barcodeImage: null,
            metaTitle: first.metaTitle || product.metaTitle || "",
            metaKeywords: first.metaKeywords || product.metaKeywords || "",
            schemaMarkup: first.schemaMarkup || product.schemaMarkup || "",
            metaDescription:
              first.metaDescription || product.metaDescription || "",
          },
        ];
      } else {
        const defaultVariant = {
          id: 1,
          variantName: product.variantName || product.name || "",
          sku: product.sku || "",
          barcode: product.barcode || "",
          type:
            normalizeUnitTypeForForm(product.unitType, product.unitTypeId) ||
            "",
          unit: product.unit ?? product.unitId ?? "",
          measurement: sanitizeNonNegativeDecimalInput(
            String(product.measurement || ""),
          ),
          mrp: String(product.price || "0"),
          price: String(product.mrp || "0"),
          discountType:
            product.discountType?.toLowerCase() === "percentage" ||
              product.discountType === "PERCENTAGE"
              ? "percentage"
              : "rupees",
          discount: String(product.discountValue || product.discount || "0"),
          salePrice: String(product.finalPrice || product.salePrice || "0"),
          stock: String(product.stock || "0"),
          stockStatus: product.stockStatus || "in_stock",
          minOrderQuantity: String(product.minOrderQty || "1"),
          maxOrderQuantity: String(product.maxOrderQty || "10"),
          lowStockThreshold: String(product.threshold ?? ""),
          attributes: [],
          weight: String(product.weight || "0"),
          length: String(product.dimensions?.length || "0"),
          width: String(product.dimensions?.width || "0"),
          height: String(product.dimensions?.height || "0"),
          shippingClass: "",
          variantStatus:
            product.variantStatus === true || product.variantStatus === "active"
              ? "active"
              : "inactive",
          primaryImage: null,
          secondaryImage: null,
          barcodeImage: null,
          metaTitle: product.metaTitle || "",
          metaKeywords: product.metaKeywords || "",
          schemaMarkup: product.schemaMarkup || "",
          metaDescription: product.metaDescription || "",
        };
        variantsToSet = [defaultVariant];
      }

      // Single setFormData: product fields + variants together (stops duplicate variant sections)
      setFormData((prev) => ({
        ...prev,
        productName: product.name || "",
        description: product.description || "",
        shortDescription: product.shortDescription || "",
        category: categoryId,
        subCategory: subCategoryId,
        brands: brandId,
        productType: product.productType || "",
        inventoryType: product.inventoryType || "Physical",
        tax: String(product.taxRate || product.tax || "0"),
        tags: Array.isArray(product.tags)
          ? product.tags.join(", ")
          : product.tags || "",
        slug: product.slug || "",
        barcode: product.barcode || "",
        metaTitle: product.metaTitle || "",
        metaKeywords: product.metaKeywords || "",
        metaDescription: product.metaDescription || "",
        schemaMarkup: product.schemaMarkup || "",
        manufacturer: product.manufacturer || "",
        madeIn: product.madeIn || "",
        fssaiLicNo: product.fssaiLicNo || "",
        isReturnable: product.isReturnable ? "yes" : "no",
        isCodAllowed: product.isCodAllowed ? "yes" : "no",
        isCancelable: product.isCancelable ? "yes" : "no",
        maxReturnDays: String(
          (product as { returnableDays?: number }).returnableDays ??
          (product as { maxReturnDays?: number }).maxReturnDays ??
          "",
        ),
        cancellableOrderStatuses: normalizeCancellableOrderStatusesList(
          Array.isArray(
            (product as { cancellableOrderStatuses?: unknown })
              .cancellableOrderStatuses,
          )
            ? ((product as { cancellableOrderStatuses: unknown[] })
              .cancellableOrderStatuses as unknown[])
            : (product as { cancelTillStatus?: string }).cancelTillStatus
              ? [
                String(
                  (product as { cancelTillStatus: string }).cancelTillStatus,
                ).trim(),
              ]
              : [],
        ),
        variantType:
          normalizeUnitTypeForForm(
            product.unitType ||
            product.variants?.[0]?.unitType ||
            product.variants?.[0]?.type,
            product.unitTypeId || product.variants?.[0]?.unitTypeId,
          ) || "",
        unit:
          product.unit ??
          product.unitId ??
          product.variants?.[0]?.unit ??
          product.variants?.[0]?.unitId ??
          "",
        measurement: String(product.measurement ?? ""),
        price: String(product.price || "0"),
        salePrice: String(product.mrp || "0"),
        discount: String(product.discountValue || product.discount || "0"),
        discountType:
          product.discountType?.toLowerCase() === "percentage" ||
            product.discountType === "PERCENTAGE"
            ? "percentage"
            : "rupees",
        stock: String(product.stock || "0"),
        stockLimit: String(product.threshold ?? ""),
        variants: variantsToSet,
      }));

      // Set image previews if images exist
      if (
        product.images &&
        Array.isArray(product.images) &&
        product.images.length > 0
      ) {
        setMainImagePreview(product.images[0]);
        if (product.images.length > 1) {
          setSecondImagePreview(product.images[1]);
        }
      }
    }
  }, [id, isEditMode, productData, isLoadingProduct]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]:
          type === "checkbox" ? checked : type === "radio" ? value : value,
      };

      // Auto-generate slug from product name when product name changes
      if (name === "productName" && value.trim()) {
        updated.slug = generateSlug(value);
      }

      if (
        name === "productName" &&
        !isEditMode &&
        SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS
      ) {
        const pn =
          String(updated.productName ?? "").trim() ||
          parentProductData?.productName?.trim() ||
          "";
        updated.variants = prev.variants.map((v) => ({
          ...v,
          variantName: computeAutoVariantName(
            unitsByTypeId,
            pn,
            v.measurement,
            v.type,
            v.unit,
          ),
        }));
      }

      // Auto-calculate sale price when price, discount, or discountType changes
      if (name === "price" || name === "discount" || name === "discountType") {
        const price = parseFloat(updated.price) || 0;
        const discount = parseFloat(updated.discount) || 0;
        const discountType = updated.discountType || "percentage";

        if (price > 0 && discount >= 0) {
          let discountAmount = 0;

          if (discountType === "rupees") {
            // Discount in rupees
            discountAmount = discount;
            if (discountAmount > price) {
              discountAmount = price; // Don't allow discount more than price
            }
          } else {
            // Discount in percentage
            if (discount <= 100) {
              discountAmount = (price * discount) / 100;
            } else {
              discountAmount = price; // Cap at 100%
            }
          }

          updated.salePrice = (price - discountAmount).toFixed(2);
        } else {
          updated.salePrice = "";
        }
      }

      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (name === "isReturnable" || name === "maxReturnDays") {
      setErrors((prev) => {
        if (!prev.maxReturnDays) return prev;
        const next = { ...prev };
        delete next.maxReturnDays;
        return next;
      });
    }
    if (name === "isCancelable") {
      setErrors((prev) => {
        if (!prev.cancellableOrderStatuses) return prev;
        const next = { ...prev };
        delete next.cancellableOrderStatuses;
        return next;
      });
    }
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, mainImage: file }));
      setMainImagePreview(objectUrl);
      setErrors((prev) => ({ ...prev, mainImage: "" }));
    }
  };

  const handleSecondImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, secondImage: file }));
      setSecondImagePreview(objectUrl);
      setErrors((prev) => ({ ...prev, secondImage: "" }));
    }
  };

  const removeSecondImage = () => {
    if (secondImagePreview) {
      URL.revokeObjectURL(secondImagePreview);
    }
    setSecondImagePreview(null);
    setFormData((prev) => ({ ...prev, secondImage: null }));
    setErrors((prev) => ({ ...prev, secondImage: "" }));
  };

  const handleBarcodeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, barcodeImage: file }));
      setBarcodeImagePreview(objectUrl);
      setErrors((prev) => ({ ...prev, barcodeImage: "" }));
    }
  };

  const removeBarcodeImage = () => {
    if (barcodeImagePreview) {
      URL.revokeObjectURL(barcodeImagePreview);
    }
    setBarcodeImagePreview(null);
    setFormData((prev) => ({ ...prev, barcodeImage: null }));
    setErrors((prev) => ({ ...prev, barcodeImage: "" }));
  };

  const handleVariantImageChange = (
    variantId: number,
    imageType: "primaryImage" | "secondaryImage" | "barcodeImage",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setFormData((prev) => {
        const updatedVariants = prev.variants.map((variant) => {
          if (variant.id !== variantId) return variant;
          return {
            ...variant,
            [imageType]: file,
          };
        });
        return {
          ...prev,
          variants: updatedVariants,
        };
      });
      setVariantImagePreviews((prev) => ({
        ...prev,
        [variantId]: {
          ...prev[variantId],
          primary: prev[variantId]?.primary || null,
          secondary: prev[variantId]?.secondary || null,
          barcode: prev[variantId]?.barcode || null,
          [imageType === "primaryImage"
            ? "primary"
            : imageType === "secondaryImage"
              ? "secondary"
              : "barcode"]: objectUrl,
        },
      }));
      setErrors((prev) => {
        const key = variantFieldErrorKey(variantId, "primaryImage");
        if (!prev[key] && !prev.variants) return prev;
        const next = { ...prev };
        delete next[key];
        delete next.variants;
        return next;
      });
    }
  };

  const removeVariantImage = (
    variantId: number,
    imageType: "primaryImage" | "secondaryImage" | "barcodeImage",
  ) => {
    setFormData((prev) => {
      const updatedVariants = prev.variants.map((variant) => {
        if (variant.id !== variantId) return variant;
        // Revoke object URL before removing
        const currentPreview = variantImagePreviews[variantId];
        if (currentPreview) {
          const previewUrl =
            imageType === "primaryImage"
              ? currentPreview.primary
              : imageType === "secondaryImage"
                ? currentPreview.secondary
                : currentPreview.barcode;
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
        }
        return {
          ...variant,
          [imageType]: null,
        };
      });
      return {
        ...prev,
        variants: updatedVariants,
      };
    });
    setVariantImagePreviews((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        primary: prev[variantId]?.primary || null,
        secondary: prev[variantId]?.secondary || null,
        barcode: prev[variantId]?.barcode || null,
        [imageType === "primaryImage"
          ? "primary"
          : imageType === "secondaryImage"
            ? "secondary"
            : "barcode"]: null,
      },
    }));
  };

  const handleVariantChange = (
    id: number,
    field: keyof Variant,
    value: string | boolean,
  ) => {
    setFormData((prev) => {
      let nextVal: string | boolean = value;
      if (typeof value === "string") {
        if (field === "mrp" || field === "price" || field === "discount") {
          nextVal = sanitizeNonNegativeDecimalInput(value);
        } else if (
          field === "stock" ||
          field === "lowStockThreshold" ||
          field === "minOrderQuantity" ||
          field === "maxOrderQuantity"
        ) {
          nextVal = sanitizeNonNegativeIntInput(value);
        } else if (field === "measurement") {
          nextVal = sanitizeNonNegativeDecimalInput(value);
        }
      }

      const productNameForLabel =
        prev.productName.trim() || parentProductData?.productName?.trim() || "";

      const updatedVariants = prev.variants.map((variant) => {
        if (variant.id !== id) return variant;

        const updatedVariant: Variant = {
          ...variant,
          [field]: nextVal as any,
        };
        if (field === "type") updatedVariant.unit = "";

        // Auto-calculate sale price when price, discount, or discountType changes
        if (
          field === "price" ||
          field === "discount" ||
          field === "discountType"
        ) {
          const price = parseFloat(updatedVariant.price) || 0;
          const discount = parseFloat(updatedVariant.discount) || 0;
          const discountType = updatedVariant.discountType || "percentage";

          if (price > 0 && discount >= 0) {
            let discountAmount = 0;

            if (discountType === "rupees") {
              // Discount in rupees
              discountAmount = discount;
              if (discountAmount > price) {
                discountAmount = price; // Don't allow discount more than price
              }
            } else {
              // Discount in percentage
              if (discount <= 100) {
                discountAmount = (price * discount) / 100;
              } else {
                discountAmount = price; // Cap at 100%
              }
            }

            updatedVariant.salePrice = (price - discountAmount).toFixed(2);
          } else {
            updatedVariant.salePrice = "";
          }
        }

        if (
          !isEditMode &&
          SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS &&
          (field === "measurement" || field === "unit" || field === "type")
        ) {
          updatedVariant.variantName = computeAutoVariantName(
            unitsByTypeId,
            productNameForLabel,
            updatedVariant.measurement,
            updatedVariant.type,
            updatedVariant.unit,
          );
        }

        return updatedVariant;
      });

      return {
        ...prev,
        variants: updatedVariants,
      };
    });

    setErrors((prev) => {
      const next = { ...prev };
      const clearVf = (field: string) => {
        const key = variantFieldErrorKey(id, field);
        if (next[key]) delete next[key];
      };
      const variantFieldToErrorKey: Partial<Record<keyof Variant, string>> = {
        type: "type",
        unit: "unit",
        measurement: "measurement",
        mrp: "mrp",
        price: "price",
        discount: "discount",
        discountType: "discount",
        stock: "stock",
        lowStockThreshold: "lowStockThreshold",
        minOrderQuantity: "minOrderQuantity",
        maxOrderQuantity: "maxOrderQuantity",
        variantName: "variantName",
        sku: "sku",
      };
      const ek = variantFieldToErrorKey[field];
      if (ek) clearVf(ek);
      if (field === "discountType") clearVf("discount");
      if (field === "type") clearVf("unit");
      if (field === "stock") clearVf("lowStockThreshold");
      if (
        field === "price" ||
        field === "discount" ||
        field === "discountType"
      ) {
        clearVf("discount");
        clearVf("price");
      }
      if (field === "minOrderQuantity" || field === "maxOrderQuantity") {
        clearVf("minOrderQuantity");
        clearVf("maxOrderQuantity");
      }
      delete next.variants;
      return next;
    });
  };

  const handleAddVariant = () => {
    setFormData((prev) => {
      const nextId =
        prev.variants.length > 0
          ? Math.max(...prev.variants.map((v) => v.id)) + 1
          : 1;

      const newVariant: Variant = {
        id: nextId,
        // Basic Information
        variantName:
          !isEditMode && SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS
            ? computeAutoVariantName(
              unitsByTypeId,
              prev.productName.trim() ||
              parentProductData?.productName?.trim() ||
              "",
              "",
              "",
              "",
            )
            : "",
        sku: "",
        barcode: "",
        // Variant Type & Measurement
        type: "" as Variant["type"],
        unit: "",
        measurement: "",
        // Pricing
        mrp: "",
        price: "",
        discountType: "percentage",
        discount: "",
        salePrice: "",
        // Inventory & Availability
        stock: "",
        stockStatus: "",
        minOrderQuantity: "",
        maxOrderQuantity: "",
        lowStockThreshold: "",
        // Attributes
        attributes: [],
        // Shipping & Dimensions
        weight: "",
        length: "",
        width: "",
        height: "",
        shippingClass: "",
        // Status & Visibility
        variantStatus: "active",
        // SEO & Settings
        metaTitle: "",
        metaKeywords: "",
        schemaMarkup: "",
        metaDescription: "",
        // Images
        primaryImage: null,
        secondaryImage: null,
        barcodeImage: null,
      };

      return {
        ...prev,
        variants: [...prev.variants, newVariant],
      };
    });

    if (errors.variants) {
      setErrors((prev) => ({ ...prev, variants: "" }));
    }
  };

  const handleRemoveVariant = (id: number) => {
    setFormData((prev) => {
      if (prev.variants.length <= 1) {
        return prev; // keep at least one variant
      }

      // Clean up image previews when variant is removed
      const variantToRemove = prev.variants.find((v) => v.id === id);
      if (variantToRemove) {
        const previews = variantImagePreviews[id];
        if (previews?.primary) {
          URL.revokeObjectURL(previews.primary);
        }
        if (previews?.secondary) {
          URL.revokeObjectURL(previews.secondary);
        }
        if (previews?.barcode) {
          URL.revokeObjectURL(previews.barcode);
        }
        setVariantImagePreviews((prevPreviews) => {
          const { [id]: removed, ...rest } = prevPreviews;
          return rest;
        });
      }

      return {
        ...prev,
        variants: prev.variants.filter((variant) => variant.id !== id),
      };
    });
  };

  // Validate variant step 1 fields only (before allowing move to variant step 2)
  const validateVariantStep1 = (): boolean => {
    const v = validatePartnerProductStep2(formData, {
      skipVariantNameSku: !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS,
    });
    if (Object.keys(v).length) {
      setErrors((prev) => ({ ...prev, ...v }));
      return false;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.variants;
      Object.keys(next).forEach((k) => {
        if (k.startsWith("varField_")) delete next[k];
      });
      return next;
    });
    return true;
  };

  // Validate specific step (only sets errors for that step’s fields)
  const validateStep = (step: number): boolean => {
    let newErrors: Record<string, string> = {};

    if (step === 1) {
      newErrors = validatePartnerProductStep1(formData, {
        isEditMode,
        mainImagePreview,
      });
    } else if (step === 2) {
      newErrors = validatePartnerProductStep2(formData, {
        skipVariantNameSku: !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS,
      });
    } else if (step === 3) {
      newErrors = validatePartnerProductStep3(formData);
    } else if (step === 4) {
      newErrors = validatePartnerProductStep4(formData, {
        variantImagePreviews,
        isEditVariantMode,
        skipVariantNameSku: !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS,
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enable Submit when Step 1 + Step 2 are valid. Step 3 (SEO/settings) is checked only on submit via validate().
  const validateAllSteps = (): boolean => {
    if (shouldShowVariants || currentStep === 4) {
      const e4 = validatePartnerProductStep4(formData, {
        variantImagePreviews,
        isEditVariantMode,
        skipVariantNameSku: !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS,
      });
      return Object.keys(e4).length === 0;
    }

    const e1 = validatePartnerProductStep1(formData, {
      isEditMode,
      mainImagePreview,
    });
    const e2 = validatePartnerProductStep2(formData, {
      skipVariantNameSku: !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS,
    });
    return Object.keys(e1).length === 0 && Object.keys(e2).length === 0;
  };

  // Full validation before API submit — merge errors from all relevant steps
  const validate = () => {
    if (shouldShowVariants || currentStep === 4) {
      return validateStep(4);
    }
    const e1 = validatePartnerProductStep1(formData, {
      isEditMode,
      mainImagePreview,
    });
    const e2 = validatePartnerProductStep2(formData, {
      skipVariantNameSku: !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS,
    });
    const e3 = validatePartnerProductStep3(formData);
    const merged = { ...e1, ...e2, ...e3 };
    setErrors(merged);
    return Object.keys(merged).length === 0;
  };

  // Check if step is completed
  const isStepCompleted = (step: number): boolean => {
    return completedSteps.includes(step);
  };

  // Mark step as completed
  const markStepCompleted = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      markStepCompleted(currentStep);
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Go to specific step
  const goToStep = (step: number) => {
    // When in variant mode, only allow navigation to Step 4
    if (shouldShowVariants && step !== 4) {
      return;
    }
    if (step <= currentStep || isStepCompleted(step)) {
      setCurrentStep(step);
    }
  };

  // Resolve unit type for API: if type is unitTypeId (UUID), get name from list; else legacy map
  const resolveUnitTypeForPayload = (
    typeValue: string,
  ): { unitTypeId?: string; unitType?: string } => {
    if (!typeValue?.trim()) return {};
    const byId = unitTypesOptions.find((o) => o.value === typeValue.trim());
    if (byId) return { unitTypeId: typeValue.trim(), unitType: byId.label };
    const t = typeValue.trim().toLowerCase();
    const map: Record<string, string> = {
      loose: "Loose",
      packet: "Pack",
      box: "Box",
      carton: "Carton",
      bottle: "Bottle",
      jar: "Jar",
      can: "Can",
      pouch: "Pouch",
    };
    return {
      unitType:
        map[t] || typeValue.charAt(0).toUpperCase() + typeValue.slice(1),
    };
  };

  // Resolve unit for API: if unit is unit id (UUID), always map it back to its display label.
  // This avoids sending opaque IDs in edit/update payloads.
  const resolveUnitForPayload = (
    unitValue: string,
    unitTypeId: string,
  ): { unitId?: string; unit?: string } => {
    if (!unitValue?.trim()) return {};
    const trimmed = unitValue.trim();
    if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
      // 1) Try current unit-type bucket
      const options = unitsByTypeId[unitTypeId] ?? [];
      const byId = options.find((o) => o.value === trimmed);
      if (byId?.label) return { unitId: trimmed, unit: byId.label };

      // 2) Fallback: scan all loaded unit buckets (type key can be stale/mismatched)
      for (const list of Object.values(unitsByTypeId)) {
        const found = (list ?? []).find((o) => o.value === trimmed);
        if (found?.label) return { unitId: trimmed, unit: found.label };
      }

      // 3) No label available yet; keep id as fallback (edit path later strips unitId)
      return { unitId: trimmed };
    }
    return { unit: trimmed };
  };

  // Handle variant-only submission — POST productmanagement/variant with JSON body (Postman spec)
  const handleSubmitVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const productId = (savedProductId || productIdFromUrl || "").trim();
      if (
        !productId ||
        productId === "0" ||
        productId === "undefined" ||
        productId === "null"
      ) {
        alert(
          "Product ID is missing or invalid. Use 'Add Variant' from the product view page.",
        );
        return;
      }

      if (!formData.variants || formData.variants.length === 0) {
        alert("Please fill in all required variant fields.");
        return;
      }

      const variant = formData.variants[0];
      const existingPreviews = variantImagePreviews[variant.id];
      const existingPrimaryUrl = existingPreviews?.primary ?? null;
      const existingSecondaryUrl = existingPreviews?.secondary ?? null;
      const existingBarcodeUrl = existingPreviews?.barcode ?? null;

      const variantStepErrors = validatePartnerProductStep4(formData, {
        variantImagePreviews,
        isEditVariantMode,
        skipVariantNameSku: !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS,
      });
      if (Object.keys(variantStepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...variantStepErrors }));
        alert("Please fix the highlighted errors and try again.");
        return;
      }

      setIsSavingVariants(true);

      // 1. Upload images and get URLs (API expects primaryImages, secondaryImages, barcodeImage as URLs)
      let primaryImages: string[] = [];
      let secondaryImages: string[] = [];
      let barcodeImageUrl: string | null = null;

      if (variant.primaryImage) {
        primaryImages = [await uploadImage(variant.primaryImage)];
      } else if (isEditVariantMode && existingPrimaryUrl) {
        primaryImages = [existingPrimaryUrl];
      }
      if (variant.secondaryImage) {
        secondaryImages = [await uploadImage(variant.secondaryImage)];
      } else if (isEditVariantMode && existingSecondaryUrl) {
        secondaryImages = [existingSecondaryUrl];
      }
      if (variant.barcodeImage) {
        barcodeImageUrl = await uploadImage(variant.barcodeImage);
      } else if (isEditVariantMode && existingBarcodeUrl) {
        barcodeImageUrl = existingBarcodeUrl;
      }

      // 2. Build JSON payload - only user-entered values (no static "Pack", 1, 10, 15)
      const resolved = resolveUnitTypeForPayload(variant.type ?? "");
      const resolvedUnit = resolveUnitForPayload(
        variant.unit ?? "",
        variant.type ?? "",
      );
      const productDataObj =
        productData && typeof productData === "object"
          ? (productData as Record<string, unknown>)
          : null;
      const productDataPayload =
        productDataObj?.data && typeof productDataObj.data === "object"
          ? (productDataObj.data as Record<string, unknown>)
          : productDataObj;
      const nonEmpty = (...vals: unknown[]) => {
        for (const v of vals) {
          const s = String(v ?? "").trim();
          if (s) return s;
        }
        return "";
      };
      const fetchedProductName = nonEmpty(
        productDataPayload?.name,
        productDataPayload?.productName,
        (productDataPayload?.product as Record<string, unknown> | undefined)
          ?.name,
        (productDataPayload?.product as Record<string, unknown> | undefined)
          ?.productName,
      );
      const variantApiDataObj =
        variantApiData && typeof variantApiData === "object"
          ? (variantApiData as Record<string, unknown>)
          : null;
      const variantApiDataPayload =
        variantApiDataObj?.data && typeof variantApiDataObj.data === "object"
          ? (variantApiDataObj.data as Record<string, unknown>)
          : variantApiDataObj;
      const variantApiProductName = nonEmpty(
        variantApiDataPayload?.productName,
        (variantApiDataPayload?.product as Record<string, unknown> | undefined)
          ?.productName,
        (variantApiDataPayload?.product as Record<string, unknown> | undefined)
          ?.name,
      );
      const variantProductName = (() => {
        const candidates = [
          parentProductData?.productName,
          formData.productName,
          fetchedProductName,
          variantApiProductName,
        ];
        for (const value of candidates) {
          const s = String(value ?? "").trim();
          if (s) return s;
        }
        return "";
      })();
      const variantMeasurement = (variant.measurement ?? "").trim();
      const variantUnitRaw = String(variant.unit ?? "").trim();
      const variantUnitLabel = (
        resolvedUnit.unit ??
        (() => {
          if (!variantUnitRaw || !/^[0-9a-f-]{36}$/i.test(variantUnitRaw))
            return variantUnitRaw;
          for (const list of Object.values(unitsByTypeId)) {
            const found = (list ?? []).find(
              (u) => String(u.value) === variantUnitRaw,
            );
            if (found?.label) return String(found.label).trim();
          }
          return variantUnitRaw;
        })()
      ).trim();
      const autoVariantNameForPayload = (
        buildAutoVariantLabel(
          variantProductName,
          variantMeasurement,
          variantUnitLabel,
        ).trim() || variantProductName
      ).trim();
      // Variant-only screen: name comes from the form; fallback keeps create/edit safe if empty.
      const variantNameForPayload =
        String(variant.variantName ?? "").trim() || autoVariantNameForPayload;
      const minOrderQtyVal = variant.minOrderQuantity?.trim()
        ? parseInt(variant.minOrderQuantity, 10)
        : undefined;
      const maxOrderQtyVal = variant.maxOrderQuantity?.trim()
        ? parseInt(variant.maxOrderQuantity, 10)
        : undefined;
      const lowStockVal = variant.lowStockThreshold?.trim()
        ? parseInt(variant.lowStockThreshold, 10)
        : undefined;
      const payload: Record<string, unknown> = {
        productId,
        sku: variant.sku.trim(),
        variantName: variantNameForPayload,
        ...(resolved.unitTypeId && { unitTypeId: resolved.unitTypeId }),
        ...(resolved.unitType && { unitType: resolved.unitType }),
        ...(resolvedUnit.unitId && { unitId: resolvedUnit.unitId }),
        ...(resolvedUnit.unit && { unit: resolvedUnit.unit }),
        measurement: variant.measurement?.trim() || "",
        // status: variant.variantStatus === "active" ? "ACTIVE" : "INACTIVE",
        primaryImages,
        mrp: parseFloat(variant.price) || 0,
        landingPrice: parseFloat(variant.mrp) || 0,
        sellingPrice:
          parseFloat(variant.salePrice) || parseFloat(variant.price) || 0,
        discountType:
          variant.discountType === "percentage" ? "PERCENTAGE" : "RUPEES",
        discountValue: parseFloat(variant.discount) || 0,
        stockQuantity: parseInt(variant.stock, 10) || 0,
        ...(minOrderQtyVal != null &&
          !Number.isNaN(minOrderQtyVal) &&
          minOrderQtyVal >= 1 && { minOrderQty: minOrderQtyVal }),
        ...(maxOrderQtyVal != null &&
          !Number.isNaN(maxOrderQtyVal) &&
          maxOrderQtyVal >= 1 && { maxOrderQty: maxOrderQtyVal }),
        ...(lowStockVal != null &&
          !Number.isNaN(lowStockVal) &&
          lowStockVal >= 0 && { lowStockThreshold: lowStockVal }),
        // isEnabled: variant.variantStatus === "active",
      };

      if (variant.barcode?.trim()) payload.gtin = variant.barcode.trim();
      if (barcodeImageUrl) payload.barcodeImage = barcodeImageUrl;
      if (secondaryImages.length > 0) payload.secondaryImages = secondaryImages;
      // Variant SEO: always send latest variant form values (including empty strings when cleared).
      payload.metaTitle = String(variant.metaTitle ?? "").trim();
      payload.metaKeywords = String(variant.metaKeywords ?? "").trim();
      payload.metaDescription = String(variant.metaDescription ?? "").trim();
      const schemaInput = String(variant.schemaMarkup ?? "").trim();
      if (!schemaInput) {
        payload.schemaMarkup = "";
      } else {
        try {
          JSON.parse(schemaInput);
          payload.schemaMarkup = schemaInput;
        } catch {
          payload.schemaMarkup = "{}";
        }
      }

      // Variant update endpoint expects unit/unitType display values, not UUID ids.
      // Keep create flow as-is; normalize only update payload to avoid 500 on edit.
      if (isEditVariantMode) {
        if (resolved.unitType) payload.unitType = resolved.unitType;
        if (resolvedUnit.unit) payload.unit = resolvedUnit.unit;
        delete (payload as Record<string, unknown>).unitTypeId;
        delete (payload as Record<string, unknown>).unitId;
      }

      if (isEditVariantMode && variantIdFromUrl) {
        await updateVariantMutation.mutateAsync(payload);
        // Edit/update flow: go directly to variant view instead of showing add-success modal.
        navigate(
          `/products/manage/view/${productId}/variant/${variantIdFromUrl}`,
        );
      } else {
        await createVariantMutation.mutateAsync(payload);
        setShowVariantSuccessModal(true);
      }
    } catch (error: unknown) {
      console.error("Error saving variant:", error);
      const err = error as { message?: string; data?: { response?: string } };
      alert(
        err?.data?.response ||
        err?.message ||
        "Error saving variant. Please try again.",
      );
    } finally {
      setIsSavingVariants(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If in variant-only mode, use variant submission handler
    if (shouldShowVariants) {
      handleSubmitVariant(e);
      return;
    }

    try {
      // Validate all steps before submission
      if (!validate()) {
        alert("Please fill in all required fields correctly.");
        return;
      }

      // Step 1: Upload all images first and get URLs
      const imageUrls: string[] = [];

      // Handle main image: upload new file if provided, otherwise use existing URL from backend (edit mode)
      if (formData.mainImage) {
        // New image uploaded - upload it
        const mainImageUrl = await uploadImage(formData.mainImage);
        imageUrls.push(mainImageUrl);
      } else if (isEditMode && mainImagePreview) {
        // Edit mode: use existing image URL from backend
        imageUrls.push(mainImagePreview);
      }

      // Handle second image: upload new file if provided, otherwise use existing URL from backend (edit mode)
      if (formData.secondImage) {
        // New image uploaded - upload it
        const secondImageUrl = await uploadImage(formData.secondImage);
        imageUrls.push(secondImageUrl);
      } else if (isEditMode && secondImagePreview) {
        // Edit mode: use existing image URL from backend
        imageUrls.push(secondImagePreview);
      }
      if (formData.otherImages && formData.otherImages.length > 0) {
        for (const imageFile of formData.otherImages) {
          const imageUrl = await uploadImage(imageFile);
          imageUrls.push(imageUrl);
        }
      }

      // Step 2: Build JSON payload matching exact API structure
      const slug = generateSlug(formData.productName);
      const tagsArray = formData.tags
        ? formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
        : [];

      // Get values from main product form OR first variant (if main product fields are empty)
      const firstVariant =
        formData.variants && formData.variants.length > 0
          ? formData.variants[0]
          : null;

      // Pricing: prefer first variant when present (user edits in "2. Pricing" section which is variant fields)
      // API: price = Landing Price, mrp = Original Price/MRP
      // Form: variant.mrp = Landing Price, variant.price = Original Price/MRP
      let price = 0;
      let mrp = 0;
      let discount = 0;
      // In Pricing UI user edits variant fields; prefer those over top-level form fields.
      const discountTypeSource =
        firstVariant?.discountType || formData.discountType || "percentage";
      const discountType =
        String(discountTypeSource).toLowerCase() === "percentage"
          ? "PERCENTAGE"
          : "RUPEES";
      if (firstVariant) {
        price = parseFloat(firstVariant.mrp) || parseFloat(formData.price) || 0;
        mrp =
          parseFloat(firstVariant.price) ||
          parseFloat(formData.salePrice) ||
          price;
        discount = parseFloat(firstVariant.discount) || 0;
      } else {
        price = parseFloat(formData.price) || 0;
        mrp = parseFloat(formData.salePrice) || 0;
        discount = parseFloat(formData.discount) || 0;
      }
      if (mrp === 0 && price > 0) mrp = price;

      // Calculate finalPrice correctly - ensure it's never 0 or negative
      let finalPrice = mrp;
      if (discountType === "PERCENTAGE" && discount > 0 && discount < 100) {
        finalPrice = mrp - (mrp * discount) / 100;
      } else if (discountType === "RUPEES" && discount > 0 && discount < mrp) {
        finalPrice = mrp - discount;
      }

      // Ensure finalPrice is valid (not negative, not zero, not greater than mrp)
      if (finalPrice <= 0) {
        finalPrice = price > 0 ? price : mrp; // Use price (landing price) or mrp as fallback
      }
      if (finalPrice > mrp) {
        finalPrice = mrp; // Don't allow finalPrice to be greater than MRP
      }

      // If discount is invalid (100% or greater than MRP), set discount to 0
      let validDiscount = discount;
      if (discountType === "PERCENTAGE" && discount >= 100) {
        validDiscount = 0;
      } else if (discountType === "RUPEES" && discount >= mrp) {
        validDiscount = 0;
      }

      // Units & Measurement - use only user-entered values (no static defaults like "Pack")
      const rawType = (firstVariant?.type || formData.variantType || "").trim();
      const resolvedUnit = resolveUnitTypeForPayload(rawType);
      const unit = (firstVariant?.unit || formData.unit || "").trim();
      const measurement = (
        firstVariant?.measurement ??
        formData.measurement ??
        ""
      ).trim();

      // Stock & threshold - use only user-entered values (no static 10, 1, 10)
      const stockRaw = firstVariant
        ? (firstVariant.stock || formData.stock || "").trim()
        : (formData.stock || "").trim();
      const stock = stockRaw !== "" ? parseFloat(stockRaw) : undefined;
      const thresholdRaw = firstVariant
        ? (firstVariant.lowStockThreshold || formData.stockLimit || "").trim()
        : (formData.stockLimit || "").trim();
      const threshold =
        thresholdRaw !== "" ? parseFloat(thresholdRaw) : undefined;
      const minOrderQtyRaw = firstVariant
        ? (firstVariant.minOrderQuantity || "").trim()
        : "";
      const minOrderQty =
        minOrderQtyRaw !== "" ? parseFloat(minOrderQtyRaw) : undefined;
      const maxOrderQtyRaw = firstVariant
        ? (firstVariant.maxOrderQuantity || "").trim()
        : "";
      const maxOrderQty =
        maxOrderQtyRaw !== "" ? parseFloat(maxOrderQtyRaw) : undefined;

      // Variant info - use only user-entered values
      const sku = (firstVariant?.sku ?? "").trim();
      const barcode = (firstVariant?.barcode ?? formData.barcode ?? "").trim();

      // costPrice for partner API (typically lower than price)
      const costPrice = price > 0 ? Math.round(price * 0.6 * 100) / 100 : 0;

      // Build payload - only include fields with values (omit empty strings/arrays to avoid 500 from partner API)
      const payload: any = {
        name: formData.productName,
      };
      if (slug?.trim()) payload.slug = slug.trim();
      if (imageUrls.length > 0) payload.images = imageUrls;
      if (tagsArray.length > 0) payload.tags = tagsArray;
      if (formData.description?.trim())
        payload.description = formData.description.trim();
      if (formData.shortDescription?.trim())
        payload.shortDescription = formData.shortDescription.trim();
      if (formData.category) payload.categoryId = formData.category;
      if (formData.subCategory) payload.subCategoryId = formData.subCategory;
      if (formData.brands) payload.brandId = formData.brands;
      if (formData.productType) payload.productType = formData.productType;
      if (formData.inventoryType)
        payload.inventoryType = formData.inventoryType;

      if (price > 0 || mrp > 0) {
        payload.price = Number(price);
        payload.mrp = Number(mrp);
        payload.discountType = discountType;
        payload.discountValue = Number(validDiscount);
        payload.finalPrice = Number(finalPrice);
        if (costPrice > 0) payload.costPrice = Number(costPrice);
      }
      if (formData.tax) payload.taxRate = Number(parseFloat(formData.tax) || 0);

      const resolvedFirstUnit = resolveUnitForPayload(unit, rawType);
      const unitLabelForProductPayload = (
        resolvedFirstUnit.unit ??
        (() => {
          const unitRaw = String(unit || "").trim();
          if (!unitRaw || !/^[0-9a-f-]{36}$/i.test(unitRaw)) return unitRaw;
          for (const list of Object.values(unitsByTypeId)) {
            const found = (list ?? []).find((u) => String(u.value) === unitRaw);
            if (found?.label) return String(found.label).trim();
          }
          return unitRaw;
        })()
      ).trim();
      const variantName = (
        buildAutoVariantLabel(
          (formData.productName || "").trim(),
          measurement,
          unitLabelForProductPayload,
        ).trim() || (formData.productName || "").trim()
      ).trim();
      // Partner update API accepts unit/measurement as strings (e.g. "Pack", "120g"); sending unitId/unitTypeId can cause 500
      if (resolvedFirstUnit.unit) payload.unit = resolvedFirstUnit.unit;
      if (measurement) payload.measurement = measurement;
      if (!isEditMode) {
        if (resolvedUnit.unitTypeId)
          payload.unitTypeId = resolvedUnit.unitTypeId;
        if (resolvedUnit.unitType) payload.unitType = resolvedUnit.unitType;
        if (resolvedFirstUnit.unitId) payload.unitId = resolvedFirstUnit.unitId;
      }

      // Inventory: only user-entered values. When left empty, send null so backend does not insert defaults (100, 10, 1, 10).
      if (stock != null && !Number.isNaN(stock) && stock >= 0) {
        payload.stock = Number(stock);
      } else if (!isEditMode) {
        payload.stock = null;
      }
      if (threshold != null && !Number.isNaN(threshold) && threshold >= 0) {
        payload.threshold = Number(threshold);
      } else if (!isEditMode) {
        payload.threshold = null;
      }
      if (
        minOrderQty != null &&
        !Number.isNaN(minOrderQty) &&
        minOrderQty >= 1
      ) {
        payload.minOrderQty = Number(minOrderQty);
      } else if (!isEditMode) {
        payload.minOrderQty = null;
      }
      if (
        maxOrderQty != null &&
        !Number.isNaN(maxOrderQty) &&
        maxOrderQty >= 1
      ) {
        payload.maxOrderQty = Number(maxOrderQty);
      } else if (!isEditMode) {
        payload.maxOrderQty = null;
      }

      payload.isActive = true;
      payload.isFeatured = false;
      if (variantName) payload.variantName = variantName;
      if (sku) payload.sku = sku;
      if (barcode) payload.barcode = barcode;
      payload.variantStatus = true;

      // Product SEO: always send latest product form values (including empty strings when cleared).
      payload.metaTitle = String(formData.metaTitle ?? "").trim();
      payload.metaKeywords = String(formData.metaKeywords ?? "").trim();
      payload.metaDescription = String(formData.metaDescription ?? "").trim();
      if (formData.manufacturer?.trim())
        payload.manufacturer = formData.manufacturer.trim();
      if (formData.madeIn?.trim()) payload.madeIn = formData.madeIn.trim();
      if (formData.fssaiLicNo?.trim())
        payload.fssaiLicNo = formData.fssaiLicNo.trim();

      const isReturnable = formData.isReturnable === "yes";
      const isCodAllowed = formData.isCodAllowed === "yes";
      const isCancelable = formData.isCancelable === "yes";
      payload.isReturnable = isReturnable;
      payload.isCodAllowed = isCodAllowed;
      payload.isCancelable = isCancelable;

      const maxReturnParsed = parseInt(
        String(formData.maxReturnDays ?? "").trim(),
        10,
      );
      if (isReturnable) {
        payload.returnableDays = maxReturnParsed;
      } else {
        payload.returnableDays = 0;
      }

      if (isCancelable) {
        const selectedStatuses = normalizeCancellableOrderStatusesList(
          Array.isArray(formData.cancellableOrderStatuses)
            ? formData.cancellableOrderStatuses
            : [],
        );
        payload.cancellableOrderStatuses = selectedStatuses;
      } else if (isEditMode) {
        payload.cancellableOrderStatuses = [];
      }

      // Handle schemaMarkup - must be a valid JSON string if provided
      // The API expects a JSON string (a string that contains valid JSON)
      // Example: "{ \"@type\": \"Product\", \"name\": \"Bingo Hot Chips\" }"
      const schemaMarkupInput = formData.schemaMarkup?.trim() || "";
      if (schemaMarkupInput) {
        try {
          // Validate that the string contains valid JSON by parsing it
          const parsed = JSON.parse(schemaMarkupInput);
          // If parsing succeeds, it's valid JSON
          // Return it as a properly formatted JSON string
          payload.schemaMarkup = JSON.stringify(parsed);
        } catch (e) {
          // If parsing fails, it's not valid JSON
          // Don't include it in payload to avoid API validation error
          // The API will reject invalid JSON strings
          console.warn(
            "Invalid schemaMarkup format. Expected valid JSON string. Omitting from payload. Input was:",
            schemaMarkupInput,
          );
          // Remove schemaMarkup from payload if it was added
          delete payload.schemaMarkup;
        }
      } else {
        // Allow clearing schema markup in edit/update by explicitly sending empty string.
        payload.schemaMarkup = "";
      }
      // If empty, don't include schemaMarkup in payload (optional field)

      // Remove undefined, empty string, empty array so partner API does not return 500.
      // Keep null for inventory fields (stock, threshold, minOrderQty, maxOrderQty) so backend persists null instead of defaults.
      // Keep empty cancellableOrderStatuses on edit (clears statuses when Cancel-able is No).
      const keepNullKeys = new Set([
        "stock",
        "threshold",
        "minOrderQty",
        "maxOrderQty",
      ]);
      const keepEmptyArrayKeys = new Set(["cancellableOrderStatuses"]);
      const keepEmptyStringKeys = new Set([
        "metaTitle",
        "metaKeywords",
        "metaDescription",
        "schemaMarkup",
      ]);
      Object.keys(payload).forEach((key) => {
        const v = payload[key];
        if (keepNullKeys.has(key) && v === null) return;
        if (
          v === undefined ||
          v === null ||
          (typeof v === "string" &&
            v.trim() === "" &&
            !keepEmptyStringKeys.has(key))
        ) {
          delete payload[key];
        } else if (
          Array.isArray(v) &&
          v.length === 0 &&
          !keepEmptyArrayKeys.has(key)
        ) {
          delete payload[key];
        }
      });

      // Partner product update (PUT) accepts minimal body per Postman. Use current product as fallback so we never send undefined.
      const currentProduct =
        isEditMode && productData
          ? ((productData as any)?.data?.product ?? (productData as any)?.data)
          : null;
      const updatePayload: Record<string, unknown> =
        isEditMode && id
          ? {
            name: payload.name ?? currentProduct?.name ?? "",
            categoryId:
              payload.categoryId ??
              currentProduct?.categoryId ??
              (currentProduct?.category as { id?: string } | undefined)?.id ??
              undefined,
            subCategoryId:
              payload.subCategoryId ??
              currentProduct?.subCategoryId ??
              (currentProduct?.subCategory as { id?: string } | undefined)
                ?.id ??
              undefined,
            images: Array.isArray(payload.images)
              ? payload.images
              : Array.isArray(currentProduct?.images)
                ? currentProduct.images
                : undefined,
            tags: Array.isArray(payload.tags)
              ? payload.tags
              : Array.isArray(currentProduct?.tags)
                ? currentProduct.tags
                : undefined,
            price: Number(payload.price ?? currentProduct?.price ?? 0),
            mrp: Number(payload.mrp ?? currentProduct?.mrp ?? 0),
            discountValue: Number(
              payload.discountValue ?? currentProduct?.discountValue ?? 0,
            ),
            finalPrice: Number(
              payload.finalPrice ?? currentProduct?.finalPrice ?? 0,
            ),
            stock:
              payload.stock != null
                ? Number(payload.stock)
                : currentProduct?.stock != null
                  ? Number(currentProduct.stock)
                  : 0,
            threshold:
              payload.threshold != null
                ? Number(payload.threshold)
                : currentProduct?.threshold != null
                  ? Number(currentProduct.threshold)
                  : 0,
            minOrderQty:
              payload.minOrderQty != null
                ? Number(payload.minOrderQty)
                : currentProduct?.minOrderQty != null
                  ? Number(currentProduct.minOrderQty)
                  : undefined,
            maxOrderQty:
              payload.maxOrderQty != null
                ? Number(payload.maxOrderQty)
                : currentProduct?.maxOrderQty != null
                  ? Number(currentProduct.maxOrderQty)
                  : undefined,
            isFeatured:
              payload.isFeatured ?? currentProduct?.isFeatured ?? false,
            unit: payload.unit ?? currentProduct?.unit ?? "",
            measurement:
              payload.measurement ?? currentProduct?.measurement ?? "",
            description:
              payload.description ??
              (typeof formData.description === "string"
                ? formData.description
                : "") ??
              currentProduct?.description ??
              "",
            shortDescription:
              payload.shortDescription ??
              (typeof formData.shortDescription === "string"
                ? formData.shortDescription
                : "") ??
              currentProduct?.shortDescription ??
              "",
            metaTitle: payload.metaTitle ?? currentProduct?.metaTitle ?? "",
            metaKeywords:
              payload.metaKeywords ?? currentProduct?.metaKeywords ?? "",
            schemaMarkup:
              payload.schemaMarkup ??
              (typeof currentProduct?.schemaMarkup === "string"
                ? currentProduct.schemaMarkup
                : currentProduct?.schemaMarkup
                  ? JSON.stringify(currentProduct.schemaMarkup)
                  : ""),
            metaDescription:
              payload.metaDescription ??
              currentProduct?.metaDescription ??
              "",
            manufacturer:
              payload.manufacturer ?? currentProduct?.manufacturer ?? "",
            madeIn: payload.madeIn ?? currentProduct?.madeIn ?? "",
            isReturnable:
              payload.isReturnable ?? currentProduct?.isReturnable ?? false,
            isCodAllowed:
              payload.isCodAllowed ?? currentProduct?.isCodAllowed ?? false,
            isCancelable:
              payload.isCancelable ?? currentProduct?.isCancelable ?? false,
            returnableDays:
              payload.returnableDays !== undefined
                ? Number(payload.returnableDays)
                : Number(
                  (currentProduct as { returnableDays?: number })
                    ?.returnableDays ?? 0,
                ),
            cancellableOrderStatuses: Array.isArray(
              payload.cancellableOrderStatuses,
            )
              ? payload.cancellableOrderStatuses
              : Array.isArray(
                (
                  currentProduct as {
                    cancellableOrderStatuses?: string[];
                  }
                )?.cancellableOrderStatuses,
              )
                ? (currentProduct as { cancellableOrderStatuses: string[] })
                  .cancellableOrderStatuses
                : [],
          }
          : payload;
      // Only remove undefined so API always receives the expected fields
      if (isEditMode && id) {
        Object.keys(updatePayload).forEach((key) => {
          if ((updatePayload as any)[key] === undefined)
            delete (updatePayload as any)[key];
        });
      }

      // Force latest edited pricing + slug values on edit payload (avoid stale fallback values).
      if (isEditMode && id) {
        // Requested fields: Category, Sub-Category, Primary/Second Image, Min/Max order quantity.
        if (String(formData.category ?? "").trim()) {
          updatePayload.categoryId = String(formData.category).trim();
        }
        if (String(formData.subCategory ?? "").trim()) {
          updatePayload.subCategoryId = String(formData.subCategory).trim();
        }
        if (Array.isArray(payload.images) && payload.images.length > 0) {
          updatePayload.images = payload.images;
        }
        // Always reflect latest tags from form in edit payload (comma separated -> string[]).
        updatePayload.tags = tagsArray;
        if (payload.minOrderQty != null) {
          updatePayload.minOrderQty = Number(payload.minOrderQty);
        }
        if (payload.maxOrderQty != null) {
          updatePayload.maxOrderQty = Number(payload.maxOrderQty);
        }

        // Explicitly send dynamic values for product settings fields.
        if (String(formData.productType ?? "").trim()) {
          updatePayload.productType = String(formData.productType).trim();
        }
        if (String(formData.inventoryType ?? "").trim()) {
          updatePayload.inventoryType = String(formData.inventoryType).trim();
        }
        updatePayload.taxRate = Number(
          parseFloat(String(formData.tax ?? "")) || 0,
        );

        const editMeasurement =
          String(firstVariant?.measurement ?? "").trim() ||
          String(formData.measurement ?? "").trim();
        if (editMeasurement) {
          updatePayload.measurement = editMeasurement;
        }

        const editTypeRaw = String(
          firstVariant?.type ?? formData.variantType ?? "",
        ).trim();
        const editUnitRaw = String(
          firstVariant?.unit ?? formData.unit ?? "",
        ).trim();
        const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

        let editTypeLabel = "";
        if (editTypeRaw) {
          if (isUuid(editTypeRaw)) {
            const byId = unitTypesOptions.find(
              (o) => String(o.value) === editTypeRaw,
            );
            editTypeLabel = byId?.label?.trim() || "";
          } else {
            const byLabel = unitTypesOptions.find(
              (o) =>
                String(o.label).trim().toLowerCase() ===
                editTypeRaw.toLowerCase(),
            );
            editTypeLabel = (byLabel?.label || editTypeRaw).trim();
          }
        }

        let editUnitLabel = "";
        if (editUnitRaw) {
          if (isUuid(editUnitRaw)) {
            const sameTypeOpts = unitsByTypeId[editTypeRaw] ?? [];
            const byIdInType = sameTypeOpts.find(
              (o) => String(o.value) === editUnitRaw,
            );
            if (byIdInType?.label) {
              editUnitLabel = byIdInType.label.trim();
            } else {
              for (const list of Object.values(unitsByTypeId)) {
                const found = (list ?? []).find(
                  (o) => String(o.value) === editUnitRaw,
                );
                if (found?.label) {
                  editUnitLabel = found.label.trim();
                  break;
                }
              }
            }
          } else {
            editUnitLabel = editUnitRaw;
          }
        }

        if (editTypeLabel) {
          updatePayload.unitType = editTypeLabel;
        } else if (resolvedUnit.unitType) {
          updatePayload.unitType = resolvedUnit.unitType;
        } else if (resolvedUnit.unitTypeId) {
          const byId = unitTypesOptions.find(
            (o) => String(o.value) === String(resolvedUnit.unitTypeId),
          );
          if (byId?.label) updatePayload.unitType = byId.label;
        }
        if (editUnitLabel) {
          updatePayload.unit = editUnitLabel;
        } else if (resolvedFirstUnit.unit) {
          updatePayload.unit = resolvedFirstUnit.unit;
        }
        // Edit API should receive display values for unit fields, not UUID keys.
        delete (updatePayload as { unitId?: string }).unitId;
        delete (updatePayload as { unitTypeId?: string }).unitTypeId;

        const editMinOrder =
          String(firstVariant?.minOrderQuantity ?? "").trim() ||
          String(
            (currentProduct as { minOrderQty?: unknown } | null)?.minOrderQty ??
            "",
          ).trim();
        const editMaxOrder =
          String(firstVariant?.maxOrderQuantity ?? "").trim() ||
          String(
            (currentProduct as { maxOrderQty?: unknown } | null)?.maxOrderQty ??
            "",
          ).trim();
        if (editMinOrder !== "") {
          updatePayload.minOrderQty = Number(parseInt(editMinOrder, 10));
        }
        if (editMaxOrder !== "") {
          updatePayload.maxOrderQty = Number(parseInt(editMaxOrder, 10));
        }

        updatePayload.slug = slug.trim();
        updatePayload.description = formData.description ?? "";
        updatePayload.shortDescription = formData.shortDescription ?? "";
        updatePayload.price = Number(price);
        updatePayload.mrp = Number(mrp);
        updatePayload.discountType = discountType;
        updatePayload.discountValue = Number(validDiscount);
        updatePayload.finalPrice = Number(finalPrice);
      }

      // Log payload for debugging
      console.log(
        "Sending payload to API:",
        JSON.stringify(isEditMode && id ? updatePayload : payload, null, 2),
      );

      // Step 3: Call the API
      if (isEditMode && id) {
        await updateProductMutation.mutateAsync(updatePayload);
        await queryClient.refetchQueries({ queryKey: ["productById", id] });
        await queryClient.invalidateQueries({ queryKey: ["product"] });
        navigate(backToManage);
      } else {
        const response = await createProductMutation.mutateAsync(payload);
        const productId = (response as any)?.data?.id || (response as any)?.id;

        if (productId) {
          setSavedProductId(productId);
          setIsSavingVariants(false);
          sessionStorage.setItem(
            `product_${productId}`,
            JSON.stringify({
              productName: formData.productName,
              category: formData.category,
              subCategory: formData.subCategory,
              mainImagePreview: mainImagePreview,
            }),
          );
          setShowSuccessModal(true);
        } else {
          throw new Error("Product created but no ID returned");
        }
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      if (error?.data) {
        console.error("API Error Details:", error.data);
        alert(
          error.data?.response ||
          error.message ||
          "Error saving product. Please try again.",
        );
      } else if (
        error?.message?.includes("fetch") ||
        error?.message?.includes("network")
      ) {
        alert(
          "API connection error. Please ensure your backend API is running and configured.",
        );
      } else {
        alert(error?.message || "Error saving product. Please try again.");
      }
    }
  };

  // Back: from list (edit) → list; from view page (edit) → view; from add/edit variant → view; else list
  const productIdForBack =
    id || (productData as { data?: { id?: string } })?.data?.id;
  const backUrl =
    shouldShowVariants && (savedProductId || productIdFromUrl)
      ? `/products/manage/view/${savedProductId || productIdFromUrl}`
      : isEditMode && productIdForBack && returnTo === "view"
        ? `/products/manage/view/${productIdForBack}`
        : backToManage;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {shouldShowVariants
            ? isEditVariantMode
              ? "Update Variant"
              : "Add Variant"
            : isEditMode
              ? "Edit Product"
              : "Add Product"}
        </h1>
        <BackButton to={backUrl} />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Add Product Form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              {shouldShowVariants
                ? isEditVariantMode
                  ? "Update Variant"
                  : "Add Variant"
                : isEditMode
                  ? "Edit Product"
                  : "Add Product"}
            </h2>
            <span className="text-xs text-gray-500">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="flex items-center justify-between">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
              // When in variant mode, disable steps 1, 2, 3 (make them non-clickable)
              const isDisabledInVariantMode = shouldShowVariants && step !== 4;

              return (
                <div key={step} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDisabledInVariantMode) {
                        goToStep(step);
                      }
                    }}
                    className={`flex items-center gap-2 ${isDisabledInVariantMode
                        ? "cursor-not-allowed opacity-50"
                        : step <= currentStep || isStepCompleted(step)
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    disabled={
                      isDisabledInVariantMode ||
                      (step > currentStep && !isStepCompleted(step))
                    }
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step === currentStep
                          ? "bg-green-600 dark:bg-green-700 text-white"
                          : isStepCompleted(step) ||
                            (shouldShowVariants && step < 4)
                            ? "bg-green-500 dark:bg-green-600 text-white"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-600"
                        }`}
                    >
                      {isStepCompleted(step) ||
                        (shouldShowVariants && step < 4) ? (
                        <CheckCircle size={16} className="text-white" />
                      ) : (
                        step
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${step === currentStep
                          ? "text-green-600 dark:text-green-400"
                          : isStepCompleted(step) ||
                            (shouldShowVariants && step < 4)
                            ? "text-green-500 dark:text-green-400"
                            : "text-gray-500"
                        }`}
                    >
                      {step === 1 && "Basic Info"}
                      {step === 2 && "Pricing"}
                      {step === 3 && "SEO & Settings"}
                      {step === 4 &&
                        (isEditVariantMode ? "Update Variant" : "Add Variant")}
                    </span>
                  </button>
                  {step < totalSteps && (
                    <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-600">
                      <div
                        className={`h-full transition-all ${step < currentStep ||
                            isStepCompleted(step) ||
                            (shouldShowVariants && step < 4)
                            ? "bg-green-500 dark:bg-green-600"
                            : "bg-gray-200 dark:bg-gray-600"
                          }`}
                        style={{
                          width:
                            step < currentStep ||
                              isStepCompleted(step) ||
                              (shouldShowVariants && step < 4)
                              ? "100%"
                              : "0%",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <FormSection title="Basic Information" variant="white">
              <div className="space-y-4">
                {/* Row 1: Category, Sub-Category, Product Name (Partner removed - backend infers from token) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SelectInput
                    label="Category"
                    required
                    name="category"
                    value={formData.category}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData((prev) => ({
                        ...prev,
                        subCategory: "",
                        brands: "",
                      }));
                      if (errors.category) {
                        setErrors((prev) => ({ ...prev, category: "" }));
                      }
                      if (errors.subCategory) {
                        setErrors((prev) => ({ ...prev, subCategory: "" }));
                      }
                    }}
                    error={errors.category}
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      {categoriesLoading
                        ? "Loading categories..."
                        : "Select Category"}
                    </option>
                    {categories.map((cat: { id: string; name: string }) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                    {/* Show current value if it doesn't exist in loaded categories (for edit mode) */}
                    {formData.category &&
                      !categoriesLoading &&
                      !categories.some(
                        (cat: { id: string; name: string }) =>
                          cat.id === formData.category,
                      ) && (
                        <option value={formData.category} disabled>
                          {formData.category} (Not found - please select a valid
                          category)
                        </option>
                      )}
                  </SelectInput>
                  <SelectInput
                    label="Sub-Category"
                    required
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData((prev) => ({ ...prev, brands: "" }));
                    }}
                    disabled={!formData.category || subCategoriesLoading}
                    error={errors.subCategory}
                  >
                    <option value="">
                      {subCategoriesLoading
                        ? "Loading sub-categories..."
                        : formData.category
                          ? availableSubCategories.length > 0
                            ? "Select Sub-Category"
                            : "No sub-categories available"
                          : "Select Category first"}
                    </option>
                    {availableSubCategories.map(
                      (subCat: { id: string; name: string }) => (
                        <option key={subCat.id} value={subCat.id}>
                          {subCat.name}
                        </option>
                      ),
                    )}
                    {/* Show current value if it doesn't exist in loaded sub-categories (for edit mode) */}
                    {formData.subCategory &&
                      formData.category &&
                      !subCategoriesLoading &&
                      !availableSubCategories.some(
                        (subCat: { id: string; name: string }) =>
                          subCat.id === formData.subCategory,
                      ) && (
                        <option value={formData.subCategory} disabled>
                          {formData.subCategory} (Not found - please select a
                          valid sub-category)
                        </option>
                      )}
                  </SelectInput>
                  <div>
                    <TextInput
                      label="Product Name"
                      required
                      type="text"
                      name="productName"
                      value={formData.productName}
                      onChange={handleChange}
                      placeholder="Enter Product Name"
                      error={errors.productName}
                    />
                  </div>
                </div>

                {/* Row: Tax(%), Slug, Brand (3 in a row) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SelectInput
                    label="Tax(%)"
                    name="tax"
                    value={formData.tax}
                    onChange={handleChange}
                    error={errors.tax}
                    disabled={taxesLoading}
                  >
                    <option value="">
                      {taxesLoading ? "Loading taxes..." : "Select Tax"}
                    </option>
                    {activeTaxOptions.map((tax) => (
                      <option key={`${tax.value}-${tax.label}`} value={tax.value}>
                        {tax.label}
                      </option>
                    ))}
                  </SelectInput>
                  <TextInput
                    label="Slug"
                    type="text"
                    name="slug"
                    value={formData.slug || generateSlug(formData.productName)}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="Auto-generated from product name"
                  />
                  <SelectInput
                    label="Brand"
                    name="brands"
                    value={formData.brands}
                    onChange={handleChange}
                    error={errors.brands}
                    disabled={
                      !categoryIdForBrands ||
                      !subCategoryIdForBrands ||
                      brandsLoading ||
                      brandsFetching
                    }
                  >
                    <option value="">
                      {!categoryIdForBrands || !subCategoryIdForBrands
                        ? "Select category and sub-category first"
                        : brandsLoading || brandsFetching
                          ? "Loading brands..."
                          : "Select Brand"}
                    </option>
                    {brands.map((brand: { id: string; name: string }) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                    {formData.brands &&
                      categoryIdForBrands &&
                      subCategoryIdForBrands &&
                      !(brandsLoading || brandsFetching) &&
                      !brands.some(
                        (b) => String(b.id) === String(formData.brands),
                      ) && (
                        <option value={formData.brands}>
                          Previously selected brand (not in current list)
                        </option>
                      )}
                  </SelectInput>
                </div>

                {/* Row: Tags, Product Type *, Inventory Type (3 in a row) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TextInput
                    label="Tags"
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="Enter tags (comma separated)"
                    error={errors.tags}
                  />
                  <SelectInput
                    label="Product Type"
                    required
                    name="productType"
                    value={formData.productType}
                    onChange={handleChange}
                    error={errors.productType}
                  >
                    <option value="">Select Product Type</option>
                    <option value="Branded">Branded</option>
                    <option value="Non-Branded">Non-Branded</option>
                  </SelectInput>
                  <SelectInput
                    label="Inventory Type"
                    name="inventoryType"
                    value={formData.inventoryType}
                    onChange={handleChange}
                    error={errors.inventoryType}
                  >
                    <option value="">Select Inventory Type</option>
                    <option value="Physical">Physical</option>
                    <option value="Digital">Digital</option>
                  </SelectInput>
                </div>

                {/* Description and Short Description side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Description{" "}
                      <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter description"
                      rows={10}
                      className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 ${errors.description
                          ? "border-red-500 dark:border-red-600 focus:ring-red-400"
                          : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
                        }`}
                      style={{ minHeight: "250px" }}
                    />
                    {errors.description && (
                      <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                        {errors.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Short Description
                    </label>
                    <textarea
                      name="shortDescription"
                      value={formData.shortDescription}
                      onChange={handleChange}
                      placeholder="Enter short description"
                      rows={10}
                      className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 ${errors.shortDescription
                          ? "border-red-500 dark:border-red-600 focus:ring-red-400"
                          : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
                        }`}
                      style={{ minHeight: "250px" }}
                    />
                    {errors.shortDescription && (
                      <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                        {errors.shortDescription}
                      </p>
                    )}
                  </div>
                </div>

                {/* Image Upload Fields - Two images after Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Image */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Primary Image{" "}
                      <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    {!mainImagePreview ? (
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50 w-full ${errors.mainImage
                            ? "border-red-500 dark:border-red-600"
                            : "border-gray-300 dark:border-gray-600"
                          }`}
                        onClick={() =>
                          document.getElementById("main-image-upload")?.click()
                        }
                      >
                        <Upload
                          className="mx-auto text-gray-400 mb-2"
                          size={20}
                        />
                        <p className="text-xs text-gray-600 mb-1">
                          Click to upload primary image
                        </p>
                        <input
                          id="main-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageChange}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 w-full">
                        <img
                          src={mainImagePreview}
                          alt="Primary preview"
                          className="w-full h-auto rounded-lg max-h-48 object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (mainImagePreview) {
                              URL.revokeObjectURL(mainImagePreview);
                            }
                            setMainImagePreview(null);
                            setFormData((prev) => ({
                              ...prev,
                              mainImage: null,
                            }));
                            setErrors((prev) => ({ ...prev, mainImage: "" }));
                          }}
                          className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {errors.mainImage && (
                      <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                        {errors.mainImage}
                      </p>
                    )}
                  </div>
                  {/* Second Image */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Second Image{" "}
                      <span className="text-gray-500 text-[10px] ml-1">
                        (Optional)
                      </span>
                    </label>
                    {!secondImagePreview ? (
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50 w-full"
                        onClick={() =>
                          document
                            .getElementById("second-image-upload")
                            ?.click()
                        }
                      >
                        <Upload
                          className="mx-auto text-gray-400 mb-2"
                          size={20}
                        />
                        <p className="text-xs text-gray-600 mb-1">
                          Click to upload second image
                        </p>
                        <input
                          id="second-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleSecondImageChange}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 w-full">
                        <img
                          src={secondImagePreview}
                          alt="Second preview"
                          className="w-full h-auto rounded-lg max-h-48 object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={removeSecondImage}
                          className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {errors.secondImage && (
                      <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                        {errors.secondImage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {/* Step 2: Pricing - Product Creation (Full Variant Form with All Sections) */}
          {currentStep === 2 && !shouldShowVariants && (
            <FormSection title="Pricing" variant="white">
              <div className="space-y-4">
                <p className="text-[11px] text-gray-600">
                  Configure different variants for this product (loose, packet,
                  carton). You can add multiple variants with their own price,
                  discount and stock.
                </p>
                {errors.variants && (
                  <p className="text-red-500 text-[10px]">{errors.variants}</p>
                )}
                {formData.variants.map((variant) => {
                  const variantExpanded = (section: string) =>
                    isSectionExpanded(variant.id, section);
                  const vf = (field: string) =>
                    errors[variantFieldErrorKey(variant.id, field)];

                  return (
                    <div
                      key={variant.id}
                      className="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4 bg-white"
                    >
                      {/* 1. Units & Measurement Section */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(variant.id, "type")}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-xs font-semibold text-gray-800">
                            1. Units & Measurement
                          </span>
                          {variantExpanded("type") ? (
                            <ChevronUp
                              size={16}
                              className="text-gray-600"
                            />
                          ) : (
                            <ChevronDown
                              size={16}
                              className="text-gray-600"
                            />
                          )}
                        </button>
                        {variantExpanded("type") && (
                          <div className="p-4 space-y-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <SelectInput
                                label="Unit Type"
                                required
                                name={`variant-type-${variant.id}`}
                                value={variant.type}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "type",
                                    e.target.value,
                                  )
                                }
                                error={vf("type")}
                              >
                                <option value="">Select Unit Type</option>
                                {unitTypesOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </SelectInput>

                              <SelectInput
                                // label={getUnitLabel(variant.type)}
                                label="Unit"
                                required
                                name={`unit-${variant.id}`}
                                value={variant.unit}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                disabled={!variant.type}
                                error={vf("unit")}
                              >
                                <option value="">
                                  {!variant.type
                                    ? "Select Unit Type first"
                                    : "Select Unit"}
                                </option>
                                {(unitsByTypeId[variant.type] ?? []).map(
                                  (opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ),
                                )}
                              </SelectInput>

                              <TextInput
                                label={getMeasurementLabel(variant.type)}
                                type="text"
                                name={`measurement-${variant.id}`}
                                value={variant.measurement}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "measurement",
                                    e.target.value,
                                  )
                                }
                                placeholder={getMeasurementPlaceholder(
                                  variant.type,
                                )}
                                disabled={!variant.type}
                                className={
                                  !variant.type
                                    ? "bg-gray-50 cursor-not-allowed"
                                    : ""
                                }
                                error={vf("measurement")}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Pricing Section */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(variant.id, "pricing")}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-xs font-semibold text-gray-800">
                            2. Pricing
                          </span>
                          {variantExpanded("pricing") ? (
                            <ChevronUp
                              size={16}
                              className="text-gray-600"
                            />
                          ) : (
                            <ChevronDown
                              size={16}
                              className="text-gray-600"
                            />
                          )}
                        </button>
                        {variantExpanded("pricing") && (
                          <div className="p-4 space-y-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <TextInput
                                label="Landing Price ( ₹ )"
                                required
                                type="number"
                                name={`mrp-${variant.id}`}
                                value={variant.mrp}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "mrp",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter Landing Price"
                                step="0.01"
                                min="0"
                                error={vf("mrp")}
                              />
                              <TextInput
                                label="Original Price / M.R.P ( ₹ )"
                                required
                                type="number"
                                name={`price-${variant.id}`}
                                value={variant.price}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "price",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter original price"
                                step="0.01"
                                min="0"
                                error={vf("price")}
                              />
                              <SelectInput
                                label="Discount Type"
                                name={`discountType-${variant.id}`}
                                value={variant.discountType}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "discountType",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="percentage">
                                  Percentage (%)
                                </option>
                                <option value="rupees">Rupees (₹)</option>
                              </SelectInput>
                              <TextInput
                                label={
                                  variant.discountType === "rupees"
                                    ? "Discount Amount ( ₹ )"
                                    : "Discount ( % )"
                                }
                                type="number"
                                name={`discount-${variant.id}`}
                                value={variant.discount}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "discount",
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  variant.discountType === "rupees"
                                    ? "Enter discount amount"
                                    : "Enter discount percentage"
                                }
                                step="0.01"
                                min="0"
                                error={vf("discount")}
                              />
                              <TextInput
                                label="Final Selling Price ( ₹ )"
                                type="number"
                                name={`salePrice-${variant.id}`}
                                value={variant.salePrice}
                                readOnly
                                placeholder="Auto-calculated"
                                step="0.01"
                                className="bg-gray-50 cursor-not-allowed"
                                error={vf("salePrice")}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Inventory & Availability Section */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(variant.id, "inventory")}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-xs font-semibold text-gray-800">
                            3. Inventory & Availability
                          </span>
                          {variantExpanded("inventory") ? (
                            <ChevronUp
                              size={16}
                              className="text-gray-600"
                            />
                          ) : (
                            <ChevronDown
                              size={16}
                              className="text-gray-600"
                            />
                          )}
                        </button>
                        {variantExpanded("inventory") && (
                          <div className="p-4 space-y-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <TextInput
                                label="Stock Quantity"
                                required
                                type="number"
                                name={`stock-${variant.id}`}
                                value={variant.stock}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "stock",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter stock quantity"
                                min="0"
                                error={vf("stock")}
                              />
                              <TextInput
                                label="Low Stock Alert Threshold"
                                type="number"
                                name={`lowStockThreshold-${variant.id}`}
                                value={variant.lowStockThreshold}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "lowStockThreshold",
                                    e.target.value,
                                  )
                                }
                                placeholder="Alert when stock reaches this"
                                min="0"
                                error={vf("lowStockThreshold")}
                              />
                              <TextInput
                                label="Minimum Order Quantity"
                                type="number"
                                name={`minOrderQuantity-${variant.id}`}
                                value={variant.minOrderQuantity}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "minOrderQuantity",
                                    e.target.value,
                                  )
                                }
                                placeholder="Minimum quantity per order"
                                min="1"
                                error={vf("minOrderQuantity")}
                              />
                              <TextInput
                                label="Maximum Order Quantity"
                                type="number"
                                name={`maxOrderQuantity-${variant.id}`}
                                value={variant.maxOrderQuantity}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "maxOrderQuantity",
                                    e.target.value,
                                  )
                                }
                                placeholder="Maximum quantity per order"
                                min="1"
                                error={vf("maxOrderQuantity")}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {(() => false)() && !SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS && (
                        <>
                          {/* 4. Basic Information Section */}
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleSection(variant.id, "basic")}
                              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <span className="text-xs font-semibold text-gray-800">
                                4. Basic Information
                              </span>
                              {variantExpanded("basic") ? (
                                <ChevronUp
                                  size={16}
                                  className="text-gray-600"
                                />
                              ) : (
                                <ChevronDown
                                  size={16}
                                  className="text-gray-600"
                                />
                              )}
                            </button>
                            {variantExpanded("basic") && (
                              <div className="p-4 space-y-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <TextInput
                                    label={
                                      isEditMode
                                        ? "Variant Name / Label"
                                        : "Variant Name / Label (auto)"
                                    }
                                    required
                                    type="text"
                                    name={`variantName-${variant.id}`}
                                    value={variant.variantName}
                                    readOnly={!isEditMode || addVariantOnly}
                                    onChange={(e) => {
                                      if (isEditMode && !addVariantOnly) {
                                        handleVariantChange(
                                          variant.id,
                                          "variantName",
                                          e.target.value,
                                        );
                                      }
                                    }}
                                    placeholder={
                                      isEditMode
                                        ? "e.g. 1 Kg Loose, 500g Packet"
                                        : "Generated from product name, measurement & unit"
                                    }
                                    className={
                                      !isEditMode || addVariantOnly
                                        ? "bg-gray-50 cursor-not-allowed"
                                        : ""
                                    }
                                    error={vf("variantName")}
                                  />
                                  <TextInput
                                    label="SKU / Variant Code"
                                    required
                                    type="text"
                                    name={`sku-${variant.id}`}
                                    value={variant.sku}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        variant.id,
                                        "sku",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="e.g. PROD-001-KG"
                                    error={vf("sku")}
                                  />
                                  {SHOW_VARIANT_BARCODE_SECTION && (
                                    <TextInput
                                      label="Barcode / ISBN"
                                      type="text"
                                      name={`barcode-${variant.id}`}
                                      value={variant.barcode}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "barcode",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Optional barcode"
                                    />
                                  )}
                                </div>

                                {SHOW_VARIANT_BARCODE_SECTION && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                      Barcode Image
                                      <span className="text-gray-500 text-[10px] ml-1">
                                        (Optional)
                                      </span>
                                    </label>
                                    {!variantImagePreviews[variant.id]
                                      ?.barcode ? (
                                      <div
                                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50"
                                        onClick={() =>
                                          document
                                            .getElementById(
                                              `variant-barcode-${variant.id}`,
                                            )
                                            ?.click()
                                        }
                                      >
                                        <Upload
                                          className="mx-auto text-gray-400 mb-2"
                                          size={16}
                                        />
                                        <p className="text-[10px] text-gray-600 mb-1">
                                          Click to upload barcode image
                                        </p>
                                        <input
                                          id={`variant-barcode-${variant.id}`}
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) =>
                                            handleVariantImageChange(
                                              variant.id,
                                              "barcodeImage",
                                              e,
                                            )
                                          }
                                          className="hidden"
                                        />
                                      </div>
                                    ) : (
                                      <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50">
                                        <img
                                          src={
                                            variantImagePreviews[variant.id]
                                              .barcode || ""
                                          }
                                          alt="Barcode preview"
                                          className="w-full h-auto rounded-lg max-h-32 object-contain mx-auto"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeVariantImage(
                                              variant.id,
                                              "barcodeImage",
                                            )
                                          }
                                          className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 5. Status & Visibility Section */}
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                toggleSection(variant.id, "status")
                              }
                              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <span className="text-xs font-semibold text-gray-800">
                                5. Status & Visibility
                              </span>
                              {variantExpanded("status") ? (
                                <ChevronUp
                                  size={16}
                                  className="text-gray-600"
                                />
                              ) : (
                                <ChevronDown
                                  size={16}
                                  className="text-gray-600"
                                />
                              )}
                            </button>
                            {variantExpanded("status") && (
                              <div className="p-4 space-y-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <SelectInput
                                    label="Variant Status"
                                    name={`variantStatus-${variant.id}`}
                                    value={variant.variantStatus}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        variant.id,
                                        "variantStatus",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </SelectInput>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </FormSection>
          )}

          {/* Step 4: Add Variant - Variant-only mode (Full Variant Form) */}
          {currentStep === 4 && shouldShowVariants && (
            <>
              {/* Parent Product Details Card - shown when adding variants */}
              {parentProductData && (
                <FormSection
                  title="Product Details"
                  variant="white"
                  className="mb-4"
                >
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Product Image */}
                    <div className="w-full md:w-48 flex-shrink-0">
                      {parentProductData.mainImagePreview ? (
                        <div className="w-full md:w-48 h-48 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                          <img
                            src={parentProductData.mainImagePreview}
                            alt="Product"
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-full md:w-48 h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-400">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Product Details */}
                    <div className="flex-1 space-y-2">
                      <div>
                        <span className="text-xs font-semibold text-gray-700">
                          Product Name:
                        </span>
                        <span className="text-xs text-gray-900 ml-2">
                          {parentProductData.productName || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-700">
                          Category:
                        </span>
                        <span className="text-xs text-gray-900 ml-2">
                          {categories.find(
                            (c: { id: string; name: string }) =>
                              c.id === parentProductData.category,
                          )?.name ||
                            categories.find(
                              (c: { id: string; name: string }) =>
                                c.name === parentProductData.category,
                            )?.name ||
                            (categoriesLoading
                              ? "Loading..."
                              : parentProductData.category || "N/A")}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-700">
                          Sub Category:
                        </span>
                        <span className="text-xs text-gray-900 ml-2">
                          {parentSubCategoryName}
                        </span>
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}

              <FormSection title="Variant Details" variant="white">
                <div className="space-y-4">
                  {!shouldShowVariants && (
                    <p className="text-[11px] text-gray-600">
                      Configure different variants for this product (loose,
                      packet, carton). You can add multiple variants with their
                      own price, discount and stock.
                    </p>
                  )}
                  {errors.variants && (
                    <p className="text-red-500 text-[10px]">
                      {errors.variants}
                    </p>
                  )}
                  {formData.variants.map((variant) => {
                    const variantExpanded = (section: string) =>
                      isSectionExpanded(variant.id, section);
                    const vf = (field: string) =>
                      errors[variantFieldErrorKey(variant.id, field)];

                    return (
                      <div
                        key={variant.id}
                        className="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4 bg-white"
                      >
                        {/* Variant Step Progress Indicator */}
                        <div className="flex items-center justify-center mb-4 pb-4 border-b border-gray-200">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full ${variantStep === 1 ? "bg-green-600 dark:bg-green-700 text-white" : "bg-green-500 text-white"}`}
                            >
                              {variantStep > 1 ? "✓" : "1"}
                            </div>
                            <div
                              className={`w-16 h-1 ${variantStep >= 2 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                            ></div>
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full ${variantStep === 2 ? "bg-green-600 dark:bg-green-700 text-white" : variantStep > 2 ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600"}`}
                            >
                              {variantStep > 2 ? "✓" : "2"}
                            </div>
                          </div>
                        </div>

                        {/* Variant Step 1: Sections 1-4 */}
                        {variantStep === 1 && (
                          <>
                            {/* 1. Variant Type & Measurement Section - First */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSection(variant.id, "type")
                                }
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-xs font-semibold text-gray-800">
                                  1. Unit Type & Measurement
                                </span>
                                {variantExpanded("type") ? (
                                  <ChevronUp
                                    size={16}
                                    className="text-gray-600"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className="text-gray-600"
                                  />
                                )}
                              </button>
                              {variantExpanded("type") && (
                                <div className="p-4 space-y-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SelectInput
                                      label="Unit Type"
                                      required
                                      name={`variant-type-${variant.id}`}
                                      value={variant.type}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "type",
                                          e.target.value,
                                        )
                                      }
                                      error={vf("type")}
                                    >
                                      <option value="">Select Unit Type</option>
                                      {unitTypesOptions.map((opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </SelectInput>

                                    <SelectInput
                                      label={getUnitLabel(variant.type)}
                                      required
                                      name={`unit-${variant.id}`}
                                      value={variant.unit}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "unit",
                                          e.target.value,
                                        )
                                      }
                                      disabled={!variant.type}
                                      error={vf("unit")}
                                    >
                                      <option value="">
                                        {!variant.type
                                          ? "Select Unit Type first"
                                          : "Select Unit"}
                                      </option>
                                      {(unitsByTypeId[variant.type] ?? []).map(
                                        (opt) => (
                                          <option
                                            key={opt.value}
                                            value={opt.value}
                                          >
                                            {opt.label}
                                          </option>
                                        ),
                                      )}
                                    </SelectInput>

                                    <TextInput
                                      label={getMeasurementLabel(variant.type)}
                                      type="text"
                                      name={`measurement-${variant.id}`}
                                      value={variant.measurement}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "measurement",
                                          e.target.value,
                                        )
                                      }
                                      placeholder={getMeasurementPlaceholder(
                                        variant.type,
                                      )}
                                      disabled={!variant.type}
                                      className={
                                        !variant.type
                                          ? "bg-gray-50 cursor-not-allowed"
                                          : ""
                                      }
                                      error={vf("measurement")}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 2. Pricing Section */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSection(variant.id, "pricing")
                                }
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-xs font-semibold text-gray-800">
                                  2. Pricing
                                </span>
                                {variantExpanded("pricing") ? (
                                  <ChevronUp
                                    size={16}
                                    className="text-gray-600"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className="text-gray-600"
                                  />
                                )}
                              </button>
                              {variantExpanded("pricing") && (
                                <div className="p-4 space-y-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Landing Price */}
                                    <TextInput
                                      label="Landing Price ( ₹ )"
                                      required
                                      type="number"
                                      name={`mrp-${variant.id}`}
                                      value={variant.mrp}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "mrp",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter Landing Price"
                                      step="0.01"
                                      min="0"
                                      error={vf("mrp")}
                                    />

                                    {/* Base Price */}
                                    <TextInput
                                      label="Original Price / M.R.P ( ₹ )"
                                      required
                                      type="number"
                                      name={`price-${variant.id}`}
                                      value={variant.price}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "price",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter original price"
                                      step="0.01"
                                      min="0"
                                      error={vf("price")}
                                    />

                                    {/* Discount Type */}
                                    <SelectInput
                                      label="Discount Type"
                                      name={`discountType-${variant.id}`}
                                      value={variant.discountType}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "discountType",
                                          e.target.value,
                                        )
                                      }
                                    >
                                      <option value="percentage">
                                        Percentage (%)
                                      </option>
                                      <option value="rupees">Rupees (₹)</option>
                                    </SelectInput>

                                    {/* Discount Value */}
                                    <TextInput
                                      label={
                                        variant.discountType === "rupees"
                                          ? "Discount Amount ( ₹ )"
                                          : "Discount ( % )"
                                      }
                                      type="number"
                                      name={`discount-${variant.id}`}
                                      value={variant.discount}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "discount",
                                          e.target.value,
                                        )
                                      }
                                      placeholder={
                                        variant.discountType === "rupees"
                                          ? "Enter discount amount"
                                          : "Enter discount percentage"
                                      }
                                      step="0.01"
                                      min="0"
                                      error={vf("discount")}
                                    />

                                    {/* Selling Price (Auto-calculated) */}
                                    <TextInput
                                      label="Final Selling Price ( ₹ )"
                                      type="number"
                                      name={`salePrice-${variant.id}`}
                                      value={variant.salePrice}
                                      readOnly
                                      placeholder="Auto-calculated"
                                      step="0.01"
                                      className="bg-gray-50 cursor-not-allowed"
                                      error={vf("salePrice")}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 3. Inventory & Availability Section */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSection(variant.id, "inventory")
                                }
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-xs font-semibold text-gray-800">
                                  3. Inventory & Availability
                                </span>
                                {variantExpanded("inventory") ? (
                                  <ChevronUp
                                    size={16}
                                    className="text-gray-600"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className="text-gray-600"
                                  />
                                )}
                              </button>
                              {variantExpanded("inventory") && (
                                <div className="p-4 space-y-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <TextInput
                                      label="Stock Quantity"
                                      required
                                      type="number"
                                      name={`stock-${variant.id}`}
                                      value={variant.stock}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "stock",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter stock quantity"
                                      min="0"
                                      error={vf("stock")}
                                    />
                                    <TextInput
                                      label="Low Stock Alert Threshold"
                                      type="number"
                                      name={`lowStockThreshold-${variant.id}`}
                                      value={variant.lowStockThreshold}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "lowStockThreshold",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Alert when stock reaches this"
                                      min="0"
                                      error={vf("lowStockThreshold")}
                                    />
                                    <TextInput
                                      label="Minimum Order Quantity"
                                      type="number"
                                      name={`minOrderQuantity-${variant.id}`}
                                      value={variant.minOrderQuantity}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "minOrderQuantity",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Minimum quantity per order"
                                      min="1"
                                      error={vf("minOrderQuantity")}
                                    />
                                    <TextInput
                                      label="Maximum Order Quantity"
                                      type="number"
                                      name={`maxOrderQuantity-${variant.id}`}
                                      value={variant.maxOrderQuantity}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "maxOrderQuantity",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Maximum quantity per order"
                                      min="1"
                                      error={vf("maxOrderQuantity")}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {!SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS && (
                              <>
                                {/* 4. Basic Information Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSection(variant.id, "basic")
                                    }
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <span className="text-xs font-semibold text-gray-800">
                                      4. Basic Information
                                    </span>
                                    {variantExpanded("basic") ? (
                                      <ChevronUp
                                        size={16}
                                        className="text-gray-600"
                                      />
                                    ) : (
                                      <ChevronDown
                                        size={16}
                                        className="text-gray-600"
                                      />
                                    )}
                                  </button>
                                  {variantExpanded("basic") && (
                                    <div className="p-4 space-y-4 bg-white">
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <TextInput
                                          label={
                                            shouldShowVariants
                                              ? "Variant Name / Label "
                                              : isEditMode
                                                ? "Variant Name / Label"
                                                : "Variant Name / Label"
                                          }
                                          required
                                          type="text"
                                          name={`variantName-${variant.id}`}
                                          value={variant.variantName}
                                          readOnly={
                                            shouldShowVariants
                                              ? false
                                              : !isEditMode || addVariantOnly
                                          }
                                          onChange={(e) => {
                                            if (
                                              shouldShowVariants ||
                                              (isEditMode && !addVariantOnly)
                                            ) {
                                              handleVariantChange(
                                                variant.id,
                                                "variantName",
                                                e.target.value,
                                              );
                                            }
                                          }}
                                          placeholder={
                                            shouldShowVariants
                                              ? "e.g. 1 Kg Loose, 500g Packet"
                                              : isEditMode
                                                ? "e.g. 1 Kg Loose, 500g Packet"
                                                : "Generated from product name, measurement & unit"
                                          }
                                          className={
                                            shouldShowVariants
                                              ? ""
                                              : !isEditMode || addVariantOnly
                                                ? "bg-gray-50 cursor-not-allowed"
                                                : ""
                                          }
                                          error={vf("variantName")}
                                        />
                                        {!shouldShowVariants && (
                                          <>
                                            <TextInput
                                              label="SKU / Variant Code"
                                              required
                                              type="text"
                                              name={`sku-${variant.id}`}
                                              value={variant.sku}
                                              onChange={(e) =>
                                                handleVariantChange(
                                                  variant.id,
                                                  "sku",
                                                  e.target.value,
                                                )
                                              }
                                              placeholder="e.g. PROD-001-KG"
                                              error={vf("sku")}
                                            />
                                            {SHOW_VARIANT_BARCODE_SECTION && (
                                              <TextInput
                                                label="Barcode / ISBN"
                                                type="text"
                                                name={`barcode-${variant.id}`}
                                                value={variant.barcode}
                                                onChange={(e) =>
                                                  handleVariantChange(
                                                    variant.id,
                                                    "barcode",
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="Optional barcode"
                                              />
                                            )}
                                          </>
                                        )}
                                      </div>

                                      {!shouldShowVariants &&
                                        SHOW_VARIANT_BARCODE_SECTION && (
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                              Barcode Image
                                              <span className="text-gray-500 text-[10px] ml-1">
                                                (Optional)
                                              </span>
                                            </label>
                                            {!variantImagePreviews[variant.id]
                                              ?.barcode ? (
                                              <div
                                                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50"
                                                onClick={() =>
                                                  document
                                                    .getElementById(
                                                      `variant-barcode-${variant.id}`,
                                                    )
                                                    ?.click()
                                                }
                                              >
                                                <Upload
                                                  className="mx-auto text-gray-400 mb-2"
                                                  size={16}
                                                />
                                                <p className="text-[10px] text-gray-600 mb-1">
                                                  Click to upload barcode image
                                                </p>
                                                <input
                                                  id={`variant-barcode-${variant.id}`}
                                                  type="file"
                                                  accept="image/*"
                                                  onChange={(e) =>
                                                    handleVariantImageChange(
                                                      variant.id,
                                                      "barcodeImage",
                                                      e,
                                                    )
                                                  }
                                                  className="hidden"
                                                />
                                              </div>
                                            ) : (
                                              <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50">
                                                <img
                                                  src={
                                                    variantImagePreviews[
                                                      variant.id
                                                    ].barcode || ""
                                                  }
                                                  alt="Barcode preview"
                                                  className="w-full h-auto rounded-lg max-h-32 object-contain mx-auto"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    removeVariantImage(
                                                      variant.id,
                                                      "barcodeImage",
                                                    )
                                                  }
                                                  className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                                                >
                                                  <X size={12} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Navigation Buttons for Variant Step 1 */}
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                              <button
                                type="button"
                                onClick={() => {
                                  if (validateVariantStep1()) setVariantStep(2);
                                }}
                                className="px-6 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm font-medium"
                              >
                                Next
                              </button>
                            </div>
                          </>
                        )}

                        {/* Variant Step 2: Sections 5-7 */}
                        {variantStep === 2 && (
                          <>
                            {/* 6. Shipping & Dimensions Section - COMMENTED OUT */}
                            {/* <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(variant.id, "shipping")}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-xs font-semibold text-gray-800">
                            6. Shipping & Dimensions
                          </span>
                          {variantExpanded("shipping") ? (
                            <ChevronUp size={16} className="text-gray-600" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-600" />
                          )}
                        </button>
                        {variantExpanded("shipping") && (
                          <div className="p-4 space-y-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <TextInput
                                label={isWeightRequired(variant.type) ? "Weight (for shipping) *" : "Weight (for shipping)"}
                                type="number"
                                name={`weight-${variant.id}`}
                                value={variant.weight}
                                onChange={(e) =>
                                  handleVariantChange(variant.id, "weight", e.target.value)
                                }
                                placeholder="Weight in kg"
                                step="0.01"
                                min="0"
                                required={isWeightRequired(variant.type)}
                              />
                              {shouldShowDimensions(variant.type) && (
                                <>
                                  <TextInput
                                    label="Length (cm)"
                                    type="number"
                                    name={`length-${variant.id}`}
                                    value={variant.length}
                                    onChange={(e) =>
                                      handleVariantChange(variant.id, "length", e.target.value)
                                    }
                                    placeholder="Length"
                                    step="0.01"
                                    min="0"
                                  />
                                  <TextInput
                                    label="Width (cm)"
                                    type="number"
                                    name={`width-${variant.id}`}
                                    value={variant.width}
                                    onChange={(e) =>
                                      handleVariantChange(variant.id, "width", e.target.value)
                                    }
                                    placeholder="Width"
                                    step="0.01"
                                    min="0"
                                  />
                                  <TextInput
                                    label="Height (cm)"
                                    type="number"
                                    name={`height-${variant.id}`}
                                    value={variant.height}
                                    onChange={(e) =>
                                      handleVariantChange(variant.id, "height", e.target.value)
                                    }
                                    placeholder="Height"
                                    step="0.01"
                                    min="0"
                                  />
                                </>
                              )}
                              <SelectInput
                                label="Shipping Class"
                                name={`shippingClass-${variant.id}`}
                                value={variant.shippingClass}
                                onChange={(e) =>
                                  handleVariantChange(variant.id, "shippingClass", e.target.value)
                                }
                              >
                                <option value="">Select Shipping Class</option>
                                <option value="standard">Standard</option>
                                <option value="express">Express</option>
                                <option value="overnight">Overnight</option>
                                <option value="free">Free Shipping</option>
                              </SelectInput>
              </div>
                          </div>
                        )}
                      </div> */}

                            {SHOW_VARIANT_BASIC_AND_STATUS_SECTIONS && (
                              <>
                                {/* 5. Status & Visibility Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSection(variant.id, "status")
                                    }
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <span className="text-xs font-semibold text-gray-800">
                                      5. Status & Visibility
                                    </span>
                                    {variantExpanded("status") ? (
                                      <ChevronUp
                                        size={16}
                                        className="text-gray-600"
                                      />
                                    ) : (
                                      <ChevronDown
                                        size={16}
                                        className="text-gray-600"
                                      />
                                    )}
                                  </button>
                                  {variantExpanded("status") && (
                                    <div className="p-4 space-y-4 bg-white">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectInput
                                          label="Variant Status"
                                          name={`variantStatus-${variant.id}`}
                                          value={variant.variantStatus}
                                          onChange={(e) =>
                                            handleVariantChange(
                                              variant.id,
                                              "variantStatus",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <option value="active">Active</option>
                                          <option value="inactive">
                                            Inactive
                                          </option>
                                        </SelectInput>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {/* 6. Image Section */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSection(variant.id, "images")
                                }
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-xs font-semibold text-gray-800">
                                  6. Image
                                </span>
                                {variantExpanded("images") ? (
                                  <ChevronUp
                                    size={16}
                                    className="text-gray-600"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className="text-gray-600"
                                  />
                                )}
                              </button>
                              {variantExpanded("images") && (
                                <div className="p-4 space-y-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Primary Image (Mandatory) */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Primary Image{" "}
                                        <span className="text-red-500 dark:text-red-400">
                                          *
                                        </span>
                                      </label>
                                      {!variantImagePreviews[variant.id]
                                        ?.primary ? (
                                        <div
                                          className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer bg-gray-50 ${vf("primaryImage")
                                              ? "border-red-400 dark:border-red-500 hover:border-red-500"
                                              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                                            }`}
                                          onClick={() =>
                                            document
                                              .getElementById(
                                                `variant-primary-${variant.id}`,
                                              )
                                              ?.click()
                                          }
                                        >
                                          <Upload
                                            className="mx-auto text-gray-400 mb-2"
                                            size={16}
                                          />
                                          <p className="text-[10px] text-gray-600 mb-1">
                                            Click to upload primary image
                                          </p>
                                          <input
                                            id={`variant-primary-${variant.id}`}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                              handleVariantImageChange(
                                                variant.id,
                                                "primaryImage",
                                                e,
                                              )
                                            }
                                            className="hidden"
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          className={`relative border rounded-lg p-2 bg-gray-50 ${vf("primaryImage")
                                              ? "border-red-400 dark:border-red-500"
                                              : "border-gray-300 dark:border-gray-600"
                                            }`}
                                        >
                                          <img
                                            src={
                                              variantImagePreviews[variant.id]
                                                .primary || ""
                                            }
                                            alt="Primary preview"
                                            className="w-full h-auto rounded-lg max-h-32 object-contain mx-auto"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeVariantImage(
                                                variant.id,
                                                "primaryImage",
                                              )
                                            }
                                            className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      )}
                                      {vf("primaryImage") && (
                                        <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                                          {vf("primaryImage")}
                                        </p>
                                      )}
                                    </div>

                                    {/* Secondary Image (Optional) */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Secondary Image{" "}
                                        <span className="text-gray-500 text-[10px] ml-1">
                                          (Optional)
                                        </span>
                                      </label>
                                      {!variantImagePreviews[variant.id]
                                        ?.secondary ? (
                                        <div
                                          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50"
                                          onClick={() =>
                                            document
                                              .getElementById(
                                                `variant-secondary-${variant.id}`,
                                              )
                                              ?.click()
                                          }
                                        >
                                          <Upload
                                            className="mx-auto text-gray-400 mb-2"
                                            size={16}
                                          />
                                          <p className="text-[10px] text-gray-600 mb-1">
                                            Click to upload secondary image
                                          </p>
                                          <input
                                            id={`variant-secondary-${variant.id}`}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                              handleVariantImageChange(
                                                variant.id,
                                                "secondaryImage",
                                                e,
                                              )
                                            }
                                            className="hidden"
                                          />
                                        </div>
                                      ) : (
                                        <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50">
                                          <img
                                            src={
                                              variantImagePreviews[variant.id]
                                                .secondary || ""
                                            }
                                            alt="Secondary preview"
                                            className="w-full h-auto rounded-lg max-h-32 object-contain mx-auto"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeVariantImage(
                                                variant.id,
                                                "secondaryImage",
                                              )
                                            }
                                            className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 7. SEO & Settings Section */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleSection(variant.id, "seo")}
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-xs font-semibold text-gray-800">
                                  7. SEO & Settings
                                </span>
                                {variantExpanded("seo") ? (
                                  <ChevronUp
                                    size={16}
                                    className="text-gray-600"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className="text-gray-600"
                                  />
                                )}
                              </button>
                              {variantExpanded("seo") && (
                                <div className="p-4 space-y-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <TextInput
                                      label="Meta Title"
                                      type="text"
                                      name={`metaTitle-${variant.id}`}
                                      value={variant.metaTitle}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "metaTitle",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter meta title"
                                    />
                                    <TextInput
                                      label="Meta Keywords"
                                      type="text"
                                      name={`metaKeywords-${variant.id}`}
                                      value={variant.metaKeywords}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "metaKeywords",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter meta keywords"
                                    />
                                    <TextInput
                                      label="Schema Markup"
                                      type="text"
                                      name={`schemaMarkup-${variant.id}`}
                                      value={variant.schemaMarkup}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "schemaMarkup",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter schema markup"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 gap-4">
                                    <TextInput
                                      label="Meta Description"
                                      type="text"
                                      name={`metaDescription-${variant.id}`}
                                      value={variant.metaDescription}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          "metaDescription",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter meta description"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Navigation Buttons for Variant Step 2 */}
                            <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                              <button
                                type="button"
                                onClick={() => setVariantStep(1)}
                                className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                              >
                                Previous
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </FormSection>
            </>
          )}

          {/* Step 3: SEO & Settings (Combined) */}
          {currentStep === 3 && (
            <FormSection title="SEO & Settings" variant="white">
              <div className="space-y-6">
                {/* SEO Settings Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    SEO Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextInput
                      label="Meta Title"
                      type="text"
                      name="metaTitle"
                      value={formData.metaTitle}
                      onChange={handleChange}
                      placeholder="Enter meta title"
                      error={errors.metaTitle}
                    />
                    <TextInput
                      label="Meta Keywords"
                      type="text"
                      name="metaKeywords"
                      value={formData.metaKeywords}
                      onChange={handleChange}
                      placeholder="Enter meta keywords"
                      error={errors.metaKeywords}
                    />
                    <TextInput
                      label="Schema Markup"
                      type="text"
                      name="schemaMarkup"
                      value={formData.schemaMarkup}
                      onChange={handleChange}
                      placeholder="Enter schema markup"
                      error={errors.schemaMarkup}
                    />
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Meta Description
                      </label>
                      <textarea
                        name="metaDescription"
                        value={formData.metaDescription}
                        onChange={handleChange}
                        placeholder="Enter meta description"
                        rows={3}
                        className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 ${errors.metaDescription
                            ? "border-red-500 dark:border-red-600 focus:ring-red-400"
                            : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
                          }`}
                      />
                      {errors.metaDescription && (
                        <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                          {errors.metaDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Settings Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    Product Settings
                  </h3>
                  <div className="space-y-4">
                    {/* Manufacturer, Made In, FSSAI License Number */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <TextInput
                        label="Manufacturer"
                        type="text"
                        name="manufacturer"
                        value={formData.manufacturer}
                        onChange={handleChange}
                        placeholder="Enter Manufacturer"
                        error={errors.manufacturer}
                      />
                      <TextInput
                        label="Made In"
                        type="text"
                        name="madeIn"
                        value={formData.madeIn}
                        onChange={handleChange}
                        placeholder="Select & Search country name"
                        error={errors.madeIn}
                      />
                      <TextInput
                        label="FSSAI Lic. No."
                        type="text"
                        name="fssaiLicNo"
                        value={formData.fssaiLicNo}
                        onChange={handleChange}
                        placeholder="FSSAI Lic. No."
                        error={errors.fssaiLicNo}
                      />
                    </div>

                    {/* Return & Cancel Settings */}
                    <div className="mt-6 space-y-4">
                      <h4 className="text-xs font-semibold text-gray-800 mb-3">
                        Return & Cancel Settings
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Is Returnable */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Is Returnable?
                          </label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="isReturnable"
                                value="yes"
                                checked={formData.isReturnable === "yes"}
                                onChange={handleChange}
                                className="w-4 h-4 text-green-600 dark:text-green-500 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400"
                              />
                              <span className="text-xs text-gray-700">
                                Yes
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="isReturnable"
                                value="no"
                                checked={formData.isReturnable === "no"}
                                onChange={handleChange}
                                className="w-4 h-4 text-green-600 dark:text-green-500 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400"
                              />
                              <span className="text-xs text-gray-700">
                                No
                              </span>
                            </label>
                          </div>
                          {formData.isReturnable === "yes" && (
                            <TextInput
                              label="Max Return Days"
                              type="number"
                              name="maxReturnDays"
                              value={formData.maxReturnDays}
                              onChange={handleChange}
                              placeholder="Enter max return days"
                              error={errors.maxReturnDays}
                              className="mt-2"
                            />
                          )}
                        </div>

                        {/* Is Cancelable */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Is Cancel-able?
                          </label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="isCancelable"
                                value="yes"
                                checked={formData.isCancelable === "yes"}
                                onChange={handleChange}
                                className="w-4 h-4 text-green-600 dark:text-green-500 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400"
                              />
                              <span className="text-xs text-gray-700">
                                Yes
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="isCancelable"
                                value="no"
                                checked={formData.isCancelable === "no"}
                                onChange={handleChange}
                                className="w-4 h-4 text-green-600 dark:text-green-500 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400"
                              />
                              <span className="text-xs text-gray-700">
                                No
                              </span>
                            </label>
                          </div>
                          {formData.isCancelable === "yes" && (
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Cancellable order statuses
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {cancellableStatusOptions.map((option) => {
                                  const selectedStatuses = Array.isArray(
                                    formData.cancellableOrderStatuses,
                                  )
                                    ? formData.cancellableOrderStatuses
                                    : [];
                                  return (
                                    <label
                                      key={option.value}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedStatuses.includes(
                                          option.value,
                                        )}
                                        onChange={(e) => {
                                          setFormData((prev) => {
                                            const current = Array.isArray(
                                              prev.cancellableOrderStatuses,
                                            )
                                              ? prev.cancellableOrderStatuses
                                              : [];
                                            const next = e.target.checked
                                              ? Array.from(
                                                new Set([
                                                  ...current,
                                                  option.value,
                                                ]),
                                              )
                                              : current.filter(
                                                (s) => s !== option.value,
                                              );
                                            return {
                                              ...prev,
                                              cancellableOrderStatuses: next,
                                            };
                                          });
                                          setErrors((prev) =>
                                            prev.cancellableOrderStatuses
                                              ? {
                                                ...prev,
                                                cancellableOrderStatuses: "",
                                              }
                                              : prev,
                                          );
                                        }}
                                        className="w-4 h-4 text-green-600 dark:text-green-500 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-400"
                                      />
                                      <span className="text-xs text-gray-700">
                                        {option.label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              {errors.cancellableOrderStatuses && (
                                <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
                                  {errors.cancellableOrderStatuses}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment Settings */}
                    <div className="mt-6">
                      <h4 className="text-xs font-semibold text-gray-800 mb-3">
                        Payment Settings
                      </h4>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Is COD Allowed?
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isCodAllowed"
                            value="yes"
                            checked={formData.isCodAllowed === "yes"}
                            onChange={handleChange}
                            className="w-4 h-4 text-green-600 dark:text-green-500 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400"
                          />
                          <span className="text-xs text-gray-700">
                            Yes
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isCodAllowed"
                            value="no"
                            checked={formData.isCodAllowed === "no"}
                            onChange={handleChange}
                            className="w-4 h-4 text-green-600 dark:text-green-500 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400"
                          />
                          <span className="text-xs text-gray-700">
                            No
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex gap-2">
              {!shouldShowVariants && currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCancelConfirmModal(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-2">
              {shouldShowVariants ? (
                variantStep === 2 ? (
                  <button
                    type="submit"
                    disabled={!validateAllSteps()}
                    className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEditVariantMode ? "Update Variant" : "Add Variant"}
                  </button>
                ) : null
              ) : currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!validateAllSteps()}
                  className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditMode ? "Update Product" : "Add Product"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={showCancelConfirmModal}
        onClose={() => setShowCancelConfirmModal(false)}
        title="Cancel adding product?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-center text-gray-700">
            Your progress will not be saved. Are you sure you want to leave? You
            can continue editing if you choose to stay.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowCancelConfirmModal(false)}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              No, continue
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCancelConfirmModal(false);
                navigate(backToManage);
              }}
              className="px-5 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Yes, cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate(backToManage);
        }}
        title="Product Added Successfully!"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-center text-gray-700 mb-6">
            Product added successfully.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                const pid = savedProductId;
                setShowSuccessModal(false);
                // Same URL does not re-run route effects — reset explicitly + remount description editor.
                resetCreateProductForm({
                  clearSessionProductId: pid,
                  remountDescriptionEditor: true,
                });
                navigate("/products/create", { replace: true });
              }}
              className="flex-1 px-4 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm font-medium"
            >
              Add New Product
            </button>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                // Navigate to create page with addVariant query parameter to show variant form
                navigate(
                  `/products/create?addVariant=true&productId=${savedProductId}`,
                );
              }}
              className="flex-1 px-4 py-2.5 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Add Variant
            </button>
          </div>
        </div>
      </Modal>

      {/* Variant Success Modal */}
      <Modal
        isOpen={showVariantSuccessModal}
        onClose={() => {
          setShowVariantSuccessModal(false);
          // Don't auto-navigate on close, let user choose from buttons
        }}
        title="Variant Added Successfully!"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-center text-gray-700 mb-6">
            Variant added successfully. You can add another variant, create a
            new product, or finish.
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVariantSuccessModal(false);
                  navigate("/products/manage");
                }}
                className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Finish
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const pid = productIdFromUrl || savedProductId;
                  setShowVariantSuccessModal(false);
                  setTimeout(() => {
                    resetCreateProductForm({
                      clearSessionProductId: pid,
                      remountDescriptionEditor: true,
                    });
                    navigate("/products/create");
                  }, 100);
                }}
                className="flex-1 px-4 py-2.5 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                Add New Product
              </button>
            </div>
            <button
              onClick={() => {
                setShowVariantSuccessModal(false);
                // Ensure we're on Step 4 and steps 1-3 are completed
                setCurrentStep(4);
                setCompletedSteps([1, 2, 3]);
                // Reset variant form but keep parent product data
                setFormData((prev) => ({
                  ...prev,
                  variants: [
                    {
                      id: 1,
                      variantName: "",
                      sku: "",
                      barcode: "",
                      type: "" as Variant["type"],
                      unit: "",
                      measurement: "",
                      mrp: "",
                      price: "",
                      discountType: "percentage",
                      discount: "",
                      salePrice: "",
                      stock: "",
                      stockStatus: "",
                      minOrderQuantity: "",
                      maxOrderQuantity: "",
                      lowStockThreshold: "",
                      attributes: [],
                      weight: "",
                      length: "",
                      width: "",
                      height: "",
                      shippingClass: "",
                      variantStatus: "active",
                      metaTitle: "",
                      metaKeywords: "",
                      schemaMarkup: "",
                      metaDescription: "",
                      primaryImage: null,
                      secondaryImage: null,
                      barcodeImage: null,
                    },
                  ],
                }));
                setVariantImagePreviews({});
                setErrors({});
                setExpandedSections({});
                setVariantStep(1); // Reset to first variant step
              }}
              className="w-full px-4 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm font-medium"
            >
              Add Another Variant
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AddProduct;
