import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { X, Pencil } from "lucide-react";
import {
  useGetVariantById,
  useGetProductDetailsById,
} from "../../../hooks/product";
import LoadingFallback from "../../../components/common/LoadingFallback";

interface VariantAttribute {
  name: string;
  value: string;
}

interface Variant {
  id: number;
  variantName: string;
  sku: string;
  barcode: string;
  type: string;
  unit: string;
  measurement: string;
  price: string;
  mrp: string;
  discountType: string;
  discount: string;
  salePrice: string;
  stock: string;
  stockStatus: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  lowStockThreshold: string;
  attributes: VariantAttribute[];
  variantStatus: string;
  images: string[];
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  schemaMarkup: string;
}

/** Detect if object looks like the variant (has variant-specific fields). Supports camelCase and snake_case. */
function looksLikeVariant(o: Record<string, unknown>): boolean {
  if (!o || typeof o !== "object") return false;
  const hasName =
    o.variantName != null ||
    (o as Record<string, unknown>).variant_name != null;
  const hasSku = o.sku != null;
  const hasUnitType =
    o.unitType != null || (o as Record<string, unknown>).unit_type != null;
  const hasPrice =
    o.landingPrice != null ||
    (o as Record<string, unknown>).landing_price != null ||
    o.mrp != null ||
    o.sellingPrice != null ||
    (o as Record<string, unknown>).selling_price != null;
  return !!(hasName || hasSku || (hasUnitType && hasPrice));
}

/** Get variant object from full API response or already-unwrapped payload. Handles { data: variant }, { data: { variant } }, { data: [variant] }, variant at top level. */
function getVariantFromResponse(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  let root: unknown = obj.data ?? obj.response ?? obj;
  if (Array.isArray(root) && root.length > 0 && typeof root[0] === "object")
    root = root[0];
  if (root && typeof root === "object" && !Array.isArray(root)) {
    const r = root as Record<string, unknown>;
    if (looksLikeVariant(r)) return r;
    if (r.variant != null && typeof r.variant === "object")
      return r.variant as Record<string, unknown>;
    if (
      r.product != null &&
      typeof r.product === "object" &&
      looksLikeVariant(r.product as Record<string, unknown>)
    )
      return r.product as Record<string, unknown>;
    if (r.product != null && typeof r.product === "object")
      return r.product as Record<string, unknown>;
  }
  if (root && typeof root === "object" && !Array.isArray(root))
    return root as Record<string, unknown>;
  return null;
}

/** First numeric stock-like field present on the record (avoids showing 0 when the API omits stock on variant detail but sends it on the product list row). */
function firstDefinedStock(
  rec: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!rec || typeof rec !== "object") return undefined;
  const keys = [
    "stockQuantity",
    "stock_quantity",
    "stock",
    "quantity",
    "availableQuantity",
    "available_quantity",
    "currentStock",
    "current_stock",
    "inventoryQuantity",
    "inventory_quantity",
  ] as const;
  for (const k of keys) {
    if (!(k in rec)) continue;
    const v = rec[k as string];
    if (v === undefined || v === null || v === "") continue;
    const n =
      typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
    if (!Number.isNaN(n) && Number.isFinite(n)) return String(n);
  }
  return undefined;
}

function resolveStockQuantity(
  api: Record<string, unknown>,
  nestedProduct: Record<string, unknown> | null,
  productListVariant: Record<string, unknown> | null | undefined,
): string {
  return (
    firstDefinedStock(api) ??
    firstDefinedStock(nestedProduct) ??
    firstDefinedStock(productListVariant ?? null) ??
    "0"
  );
}

function unwrapProductFromDetailsPayload(
  data: unknown,
): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const inner = o.data ?? o;
  if (!inner || typeof inner !== "object") return null;
  const product = (inner as Record<string, unknown>).product ?? inner;
  return product && typeof product === "object"
    ? (product as Record<string, unknown>)
    : null;
}

function findVariantRowInProduct(
  product: Record<string, unknown> | null,
  variantId: string,
): Record<string, unknown> | null {
  if (!product) return null;
  const variants = product.variants ?? product.productVariants;
  if (!Array.isArray(variants)) return null;
  const idStr = String(variantId);
  const row = variants.find(
    (x) =>
      x &&
      typeof x === "object" &&
      String((x as Record<string, unknown>).id) === idStr,
  );
  return row ? (row as Record<string, unknown>) : null;
}

function schemaMarkupToDisplay(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    try {
      return JSON.stringify(JSON.parse(v), null, 2);
    } catch {
      return v;
    }
  }
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/** Normalize API variant (GET productmanagement/variant/:variantId). API returns { status, response, data: { id, variantName, sku, unit, unitType, measurement, mrp, sellingPrice, landingPrice, ..., product: {...} } } */
function normalizeApiVariantToView(
  raw: unknown,
  variantId: string,
  ctx?: {
    productListVariant?: Record<string, unknown> | null;
    productRoot?: Record<string, unknown> | null;
  },
): Variant | null {
  const api = getVariantFromResponse(raw);
  if (!api) return null;

  const getStr = (v: unknown, def = "") =>
    v == null || v === "" ? def : String(v).trim();
  const getNum = (v: unknown, def = 0) =>
    v == null || v === "" ? def : Number(v);
  const snak = api as Record<string, unknown>;

  const primaryImages = Array.isArray(api.primaryImages)
    ? (api.primaryImages as string[])
    : api.primaryImage
      ? [api.primaryImage as string]
      : Array.isArray(snak.primary_images)
        ? (snak.primary_images as string[])
        : [];
  const secondaryImages = Array.isArray(api.secondaryImages)
    ? (api.secondaryImages as string[])
    : api.secondaryImage
      ? [api.secondaryImage as string]
      : Array.isArray(snak.secondary_images)
        ? (snak.secondary_images as string[])
        : [];
  const fallbackImages = Array.isArray(api.images)
    ? (api.images as string[])
    : api.image
      ? [api.image as string]
      : [];
  const images =
    primaryImages.length > 0 || secondaryImages.length > 0
      ? [...primaryImages, ...secondaryImages]
      : fallbackImages;

  const landingPrice = api.landingPrice ?? snak.landing_price ?? api.price;
  const mrpVal = api.mrp ?? api.price ?? landingPrice;
  const sellingPrice =
    api.sellingPrice ??
    snak.selling_price ??
    api.finalPrice ??
    api.salePrice ??
    mrpVal;
  const unitType = getStr(api.unitType ?? snak.unit_type ?? api.type);
  const measurementVal = getStr(api.measurement ?? snak.measurement_value);
  const unitVal = getStr(api.unit);

  const discountTypeRaw = String(
    api.discountType ?? snak.discount_type ?? "",
  ).toUpperCase();
  const discountTypeUi: "rupees" | "percentage" =
    discountTypeRaw === "RUPEES" || discountTypeRaw === "FLAT"
      ? "rupees"
      : "percentage";

  const idRaw = api.id ?? variantId;
  const idNum =
    typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : Number.isFinite(Number(idRaw))
        ? Number(idRaw)
        : 1;

  const nestedProduct =
    api.product != null && typeof api.product === "object"
      ? (api.product as Record<string, unknown>)
      : null;
  const listRow = ctx?.productListVariant ?? null;
  const root = ctx?.productRoot ?? null;

  const stockStr = resolveStockQuantity(api, nestedProduct, listRow);

  const pickSeo = (
    key: "metaTitle" | "metaKeywords" | "metaDescription" | "schemaMarkup",
  ): string => {
    const snake =
      key === "metaTitle"
        ? "meta_title"
        : key === "metaKeywords"
          ? "meta_keywords"
          : key === "metaDescription"
            ? "meta_description"
            : "schema_markup";
    const fromApi = api[key] ?? snak[snake];
    if (key === "schemaMarkup") {
      return schemaMarkupToDisplay(fromApi);
    }
    return getStr(fromApi, "");
  };

  const minOrd = getStr(
    api.minOrderQty ??
      snak.min_order_qty ??
      listRow?.minOrderQty ??
      listRow?.min_order_qty ??
      api.minOrderQuantity ??
      "1",
    "1",
  );
  const maxOrd = getStr(
    api.maxOrderQty ??
      snak.max_order_qty ??
      listRow?.maxOrderQty ??
      listRow?.max_order_qty ??
      api.maxOrderQuantity ??
      "10",
    "10",
  );
  const lowThresh = getStr(
    api.lowStockThreshold ??
      snak.low_stock_threshold ??
      listRow?.lowStockThreshold ??
      listRow?.low_stock_threshold ??
      api.threshold ??
      listRow?.threshold ??
      "10",
    "10",
  );
  const stockStat = getStr(
    api.stockStatus ??
      snak.stock_status ??
      listRow?.stockStatus ??
      listRow?.stock_status,
    "in_stock",
  );

  const normalizedVariantStatus =
    typeof api.isEnabled === "boolean"
      ? api.isEnabled
        ? "ACTIVE"
        : "INACTIVE"
      : String(api.status ?? "ACTIVE");

  return {
    id: idNum,
    variantName: getStr(api.variantName ?? snak.variant_name ?? api.name),
    sku: getStr(api.sku),
    barcode: getStr(api.barcode ?? api.gtin),
    type: unitType || "",
    unit: unitVal || "",
    measurement: measurementVal || "",
    price: String(getNum(landingPrice, 0)),
    mrp: String(getNum(mrpVal, 0)),
    discountType: discountTypeUi,
    discount: String(
      api.discountValue ?? snak.discount_value ?? api.discount ?? "0",
    ),
    salePrice: String(getNum(sellingPrice, 0)),
    stock: stockStr,
    stockStatus: stockStat,
    minOrderQuantity: minOrd,
    maxOrderQuantity: maxOrd,
    lowStockThreshold: lowThresh,
    attributes: (api.attributes as VariantAttribute[]) ?? [],
    variantStatus: normalizedVariantStatus,

    images,
    metaTitle: pickSeo("metaTitle"),
    metaKeywords: pickSeo("metaKeywords"),
    metaDescription: pickSeo("metaDescription"),
    schemaMarkup: pickSeo("schemaMarkup"),
  };
}

const ViewVariant = () => {
  const { productId, variantId } = useParams<{
    productId: string;
    variantId: string;
  }>();
  const navigate = useNavigate();
  const pid = productId ?? "";
  const vid = variantId ?? "";

  const {
    data: variantData,
    isLoading,
    isError,
    refetch,
  } = useGetVariantById(vid);
  const { data: productData } = useGetProductDetailsById(pid);

  useEffect(() => {
    if (!vid || !vid.trim()) {
      navigate(pid ? `/products/manage/view/${pid}` : "/products/manage", {
        replace: true,
      });
      return;
    }
    refetch();
  }, [vid, pid, navigate, refetch]);

  const productRoot = useMemo(
    () => unwrapProductFromDetailsPayload(productData),
    [productData],
  );
  const productListVariant = useMemo(
    () => findVariantRowInProduct(productRoot, vid),
    [productRoot, vid],
  );

  const variant = useMemo(() => {
    if (!variantData) return null;
    return normalizeApiVariantToView(variantData, vid, {
      productListVariant,
      productRoot,
    });
  }, [variantData, vid, productListVariant, productRoot]);

  const productName = useMemo(() => {
    if (!productData) return "Product";
    const raw =
      (productData as { data?: Record<string, unknown> })?.data ?? productData;
    return ((raw as Record<string, unknown>)?.name as string) ?? "Product";
  }, [productData]);

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  useEffect(() => {
    if (variant) {
      requestAnimationFrame(() => setIsDrawerVisible(true));
    }
  }, [variant]);

  const handleClose = () => {
    setIsDrawerVisible(false);
    setTimeout(
      () => navigate(pid ? `/products/manage/view/${pid}` : "/products/manage"),
      200,
    );
  };

  const handleEdit = () => {
    navigate(
      `/products/create?editVariant=true&productId=${pid}&variantId=${vid}`,
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  useEffect(() => {
    if (variant) {
      document.body.style.overflow = "hidden";
      const onEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") handleClose();
      };
      document.addEventListener("keydown", onEscape);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onEscape);
      };
    }
  }, [variant]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80">
        <LoadingFallback />
      </div>
    );
  }

  if (isError || !variant) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {isError ? "Error loading variant" : "Variant not found"}
          </p>
          <button
            onClick={() =>
              navigate(
                pid ? `/products/manage/view/${pid}` : "/products/manage",
              )
            }
            className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
          >
            Back to Product
          </button>
        </div>
      </div>
    );
  }

  const variantImages = variant.images ?? [];
  const landingPrice = parseFloat(variant.price) || 0;
  const originalPrice = parseFloat(variant.mrp) || landingPrice;
  const finalPrice = parseFloat(variant.salePrice) || originalPrice;
  const measurementDisplay =
    [variant.measurement, variant.unit].filter(Boolean).join(" ") || "N/A";

  const DetailRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        {label}
      </span>
      <span className="text-sm text-gray-900 dark:text-gray-100 font-medium text-right max-w-[60%]">
        {value ?? "N/A"}
      </span>
    </div>
  );

  const DetailBlock = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        {label}
      </span>
      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium text-right max-w-[60%] whitespace-pre-wrap break-words break-all">
        {value.trim() ? value : "N/A"}
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="variant-details-title"
    >
      <div
        className={`absolute inset-0 bg-black/40 dark:bg-black/60 transition-opacity duration-200 ${isDrawerVisible ? "opacity-100" : "opacity-0"}`}
        onClick={handleBackdropClick}
      />
      <div
        className={`relative w-full max-w-md bg-gray-50 dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${isDrawerVisible ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <h2
            id="variant-details-title"
            className="text-xl font-bold text-gray-900 dark:text-gray-100"
          >
            Variant Details
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={22} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {variantImages.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {variantImages.map((imgSrc, idx) => (
                  <img
                    key={idx}
                    src={imgSrc}
                    alt={`${variant.variantName} - ${idx === 0 ? "Primary" : "Secondary"}`}
                    className="w-32 h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex justify-center w-32 h-32 mx-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  No image
                </span>
              </div>
            )}
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                Units & Measurements
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-0">
                <DetailRow label="Unit Type" value={variant.type || "N/A"} />
                <DetailRow label="Unit" value={variant.unit || "N/A"} />
                <DetailRow label="Measurement" value={measurementDisplay} />
                <DetailRow
                  label="Variant Name / Label"
                  value={variant.variantName || "N/A"}
                />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                Pricing
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-0">
                <DetailRow
                  label="Landing Price"
                  value={`₹${landingPrice.toFixed(2)}`}
                />
                <DetailRow
                  label="Original / Selling Price (₹)"
                  value={`₹${originalPrice.toFixed(2)}`}
                />
                <DetailRow
                  label="Discount Type"
                  value={variant.discountType || "N/A"}
                />
                <DetailRow
                  label="Discount"
                  value={
                    variant.discountType === "rupees"
                      ? `₹${variant.discount}`
                      : `${variant.discount}%`
                  }
                />
                <DetailRow
                  label="Final Selling Price (₹)"
                  value={`₹${finalPrice.toFixed(2)}`}
                />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                Inventory & Availability
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-0">
                <DetailRow label="Stock Quantity" value={variant.stock} />
                <DetailRow
                  label="Low Stock Alert Threshold"
                  value={variant.lowStockThreshold}
                />
                <DetailRow
                  label="Stock Status"
                  value={(variant.stockStatus || "").replace("_", " ")}
                />
                <DetailRow
                  label="Variant Status"
                  value={variant.variantStatus || "N/A"}
                />
                <DetailRow label="SKU" value={variant.sku || "N/A"} />
                <DetailRow
                  label="Min Order Quantity"
                  value={variant.minOrderQuantity}
                />
                <DetailRow
                  label="Max Order Quantity"
                  value={variant.maxOrderQuantity}
                />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                SEO & Settings
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-0">
                <DetailRow
                  label="Meta Title"
                  value={variant.metaTitle || "N/A"}
                />
                <DetailRow
                  label="Meta Keywords"
                  value={variant.metaKeywords || "N/A"}
                />
                <DetailBlock
                  label="Meta Description"
                  value={variant.metaDescription}
                />
                <DetailBlock
                  label="Schema Markup (JSON-LD)"
                  value={variant.schemaMarkup}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <button
            onClick={handleEdit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 dark:bg-green-700 text-white font-semibold rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            <Pencil size={18} />
            Edit Variant
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewVariant;
