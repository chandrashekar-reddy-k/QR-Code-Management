import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Edit, Image as ImageIcon, Plus } from 'lucide-react';
import fetchData from '../../../helper';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import {
  ViewIconButton,
  EditIconButton,
  PrimaryButton,
  ConfirmModal,
  DataTable,
} from '../../../components/ui';
import { useGetProductDetailsById, useGetVariantsByProductId, useDeleteProduct, useDeleteVariant, useUpdateProductActive, useGetProductUnitTypesList, useGetUnitsMapForUnitTypes } from '../../../hooks/product';
import { useGetAllCategoriesMerged } from '../../../hooks/category';
import { useGetAllSubCategoryList } from '../../../hooks/subCategory';
import { useGetAllBrandsList } from '../../../hooks/brands';
import LoadingFallback from '../../../components/common/LoadingFallback';
import {
  UUID_RE,
  looksLikeOpaqueId,
  resolveUnitType,
  resolveUnitTypeId,
  resolveUnit,
  resolveUnitId,
  parseUnitTypesOptions,
} from '../../../utils/productUnitDisplay';

interface VariantAttribute {
  name: string;
  value: string;
}

interface Variant {
  id: number | string; // number for display index, string for API variant UUID (edit/delete)
  variantName: string;
  sku: string;
  barcode: string;
  type: "loose" | "packet" | "box" | "carton" | "bottle" | "jar" | "can" | "pouch" | "";
  unit: string;
  unitTypeId?: string; // optional: for resolving to name when API returns only ID
  unitId?: string;
  measurement: string;
  price: string;
  discountType: "percentage" | "rupees";
  discount: string;
  salePrice: string;
  stock: string;
  stockStatus: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  lowStockThreshold: string;
  attributes: VariantAttribute[];
  variantStatus: "active" | "inactive";
  images: string[]; // Array of image URLs
}

interface Product {
  id: string | number;
  productId: string;
  sellerName: string;
  name: string;
  mainImage: string;
  productType: string;
  category: string;
  subCategory: string;
  categoryId?: string;
  subCategoryId?: string;
  seller: string;
  tax: string;
  tags: string;
  brands: string;
  description: string;
  shortDescription?: string;
  slug?: string;
  metaTitle: string;
  metaKeywords: string;
  schemaMarkup: string;
  metaDescription: string;
  manufacturer: string;
  madeIn: string;
  fssaiLicNo: string;
  isReturnable: boolean;
  maxReturnDays: string;
  isCancelable: boolean;
  cancelTillStatus: string;
  isCodAllowed: boolean;
  status: 'active' | 'inactive' | 'pending' | 'approved';
  variants: Variant[];
  barcode?: string;
  /** Product-level unit fields (when variants list is empty or missing unit metadata). */
  productUnitTypeId?: string;
  productUnitId?: string;
  productUnitTypeName?: string;
  productUnitName?: string;
  otherImages?: string[];
}

// Mock data fallback when API returns no data
const mockProducts: Product[] = [
  {
    id: 1,
    productId: 'PROD001',
    sellerName: 'Fresh Grocery Store',
    name: 'Fresh Mangoes',
    mainImage: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop',
    productType: 'Branded',
    category: 'Fruits & Vegetables',
    subCategory: 'Fresh Fruits',
    seller: 'VENDOR001',
    tax: '5',
    tags: 'fruits, mango, seasonal, fresh',
    brands: 'Farm Fresh',
    description: 'Premium quality fresh mangoes, handpicked and carefully packed. Rich in vitamins and minerals. Best quality Alphonso mangoes from Maharashtra.',
    metaTitle: 'Fresh Mangoes - Premium Quality | Fresh Grocery Store',
    metaKeywords: 'mangoes, fresh fruits, alphonso mango, seasonal fruits, online grocery',
    metaDescription: 'Buy fresh premium quality mangoes online. Handpicked Alphonso mangoes. Rich in vitamins. Free delivery available.',
    schemaMarkup: '{"@type":"Product","name":"Fresh Mangoes"}',
    manufacturer: 'Farm Fresh',
    madeIn: 'India',
    fssaiLicNo: 'FSSAI123456789',
    isReturnable: true,
    maxReturnDays: '7',
    isCancelable: true,
    cancelTillStatus: 'Confirmed',
    isCodAllowed: true,
    status: 'active',
    variants: [
      {
        id: 1,
        variantName: '1 Kg Loose',
        sku: 'PROD001-VAR001',
        barcode: '8901234567890',
        type: 'loose',
        unit: 'kg',
        measurement: '1',
        price: '199',
        discountType: 'percentage',
        discount: '25',
        salePrice: '149.25',
        stock: '75',
        stockStatus: 'in_stock',
        minOrderQuantity: '1',
        maxOrderQuantity: '10',
        lowStockThreshold: '20',
        attributes: [
          { name: 'Weight', value: '1kg' }
        ],
        variantStatus: 'active',
        images: [
          'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=400&h=400&fit=crop'
        ]
      },
      {
        id: 2,
        variantName: '500g Packet',
        sku: 'PROD001-VAR002',
        barcode: '8901234567891',
        type: 'packet',
        unit: 'g',
        measurement: '500',
        price: '99',
        discountType: 'percentage',
        discount: '20',
        salePrice: '79.2',
        stock: '50',
        stockStatus: 'in_stock',
        minOrderQuantity: '1',
        maxOrderQuantity: '15',
        lowStockThreshold: '15',
        attributes: [
          { name: 'Weight', value: '500g' }
        ],
        variantStatus: 'active',
        images: [
          'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop'
        ]
      }
    ]
  },
  {
    id: 2,
    productId: 'PROD002',
    sellerName: 'Dairy Delight',
    name: 'Amul Full Cream Milk',
    mainImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    productType: 'Branded',
    category: 'Dairy Products',
    subCategory: 'Milk',
    seller: 'VENDOR002',
    tax: '5',
    tags: 'milk, dairy, amul, full cream',
    brands: 'Amul',
    description: 'Amul Full Cream Milk, fresh and nutritious. Rich in calcium and protein. Pasteurized for safety.',
    metaTitle: 'Amul Full Cream Milk | Dairy Delight',
    metaKeywords: 'amul milk, full cream milk, dairy products, fresh milk',
    metaDescription: 'Buy Amul Full Cream Milk online. Fresh, pure and nutritious. Rich in calcium. Free delivery available.',
    schemaMarkup: '{"@type":"Product","name":"Amul Full Cream Milk"}',
    manufacturer: 'Amul',
    madeIn: 'India',
    fssaiLicNo: 'FSSAI112233445',
    isReturnable: false,
    maxReturnDays: '',
    isCancelable: true,
    cancelTillStatus: 'Dispatched',
    isCodAllowed: true,
    status: 'active',
    variants: [
      {
        id: 3,
        variantName: '1 Liter Tetra Pack',
        sku: 'PROD002-VAR001',
        barcode: '8901234567892',
        type: 'packet',
        unit: 'l',
        measurement: '1',
        price: '68',
        discountType: 'rupees',
        discount: '3',
        salePrice: '65',
        stock: '350',
        stockStatus: 'in_stock',
        minOrderQuantity: '1',
        maxOrderQuantity: '20',
        lowStockThreshold: '50',
        attributes: [],
        variantStatus: 'active',
        images: [
          'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop'
        ]
      }
    ]
  }
];

/** Extract URL from a single image value (string or object). */
function variantImageToUrl(item: unknown): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const obj = item as Record<string, unknown>;
  return (obj?.url ?? obj?.location ?? obj?.fileUrl ?? obj?.path ?? obj?.src ?? obj?.imageUrl ?? obj?.link ?? obj?.href ?? '') as string;
}

/** Build array of image URLs from API value (array of strings/objects or single string/object). */
function toVariantImageUrlList(x: unknown): string[] {
  if (!x) return [];
  if (Array.isArray(x)) {
    return x.map((item) => variantImageToUrl(item)).filter(Boolean);
  }
  const single = variantImageToUrl(x);
  return single ? [single] : [];
}

/** Normalize API variant list (GET variant/product/:productId) — map mrp, landingPrice, sellingPrice, variant images (not product image) */
function normalizeApiVariantsToView(raw: unknown, productImages: string[] = []): Variant[] {
  const payload = raw as { data?: unknown; variants?: unknown };
  // Support { data: { variants: [...] } }, { data: [...] }, { variants: [...] }
  const data = payload?.data;
  const list =
    (Array.isArray(data) ? data : (data as Record<string, unknown>)?.variants) ??
    (payload?.variants as Array<Record<string, unknown>>) ??
    [];
  const listArr = Array.isArray(list) ? list : [];
  if (listArr.length === 0) return [];
  return listArr.map((row, i) => {
    // Unwrap if API returns { variant: {...} } or { data: {...} } per item
    const v = (row as { variant?: Record<string, unknown> }).variant ?? (row as { data?: Record<string, unknown> }).data ?? row;
    const vObj = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const media = v && typeof v === 'object' ? (v as { media?: Record<string, unknown> }).media : undefined;
    const primaryImages = toVariantImageUrlList(v?.primaryImages ?? v?.primaryImage ?? (media && (media as Record<string, unknown>).primaryImage));
    const secondaryImages = toVariantImageUrlList(v?.secondaryImages ?? v?.secondaryImage ?? (media && (media as Record<string, unknown>).secondaryImage));
    const variantImages = toVariantImageUrlList(v?.images ?? v?.imageUrls ?? v?.variantImages ?? v?.variantImage ?? v?.image ?? v?.imageUrl ?? (media && (media as Record<string, unknown>).images));
    const allVariantImages = [...primaryImages, ...secondaryImages, ...variantImages].filter(Boolean);
    // Use variant-specific images only; fall back to product image only when this variant has none
    const images = allVariantImages.length > 0 ? allVariantImages : productImages;
    const mrpVal = v.mrp ?? v.price ?? '0';
    const sellingPriceVal = v.sellingPrice ?? v.finalPrice ?? v.salePrice ?? mrpVal;
    const variantIdResolved = v.id != null
      ? (typeof v.id === 'string' ? v.id : String(v.id))
      : (i + 1);
    const typeResolved = resolveUnitType(vObj);
    const unitResolved = resolveUnit(vObj);
    const unitTypeIdResolved = resolveUnitTypeId(vObj);
    const unitIdResolved = resolveUnitId(vObj);
    return {
      id: variantIdResolved,
      variantName: (v.variantName ?? v.name ?? '') as string,
      sku: (v.sku ?? '') as string,
      barcode: (v.barcode ?? v.gtin ?? '') as string,
      type: (typeResolved as Variant['type']) || '',
      unit: unitResolved,
      unitTypeId: unitTypeIdResolved,
      unitId: unitIdResolved,
      measurement: (v.measurement ?? '') as string,
      price: String(mrpVal),
      discountType: (String(v.discountType ?? '').toUpperCase() === 'RUPEES' || String(v.discountType ?? '').toUpperCase() === 'FLAT' ? 'rupees' : 'percentage') as 'percentage' | 'rupees',
      discount: String(v.discountValue ?? v.discount ?? '0'),
      salePrice: String(sellingPriceVal),
      stock: String(v.stockQuantity ?? v.stock ?? '0'),
      stockStatus: (v.stockStatus as string) ?? 'in_stock',
      minOrderQuantity: String(v.minOrderQty ?? v.minOrderQuantity ?? '1'),
      maxOrderQuantity: String(v.maxOrderQty ?? v.maxOrderQuantity ?? '10'),
      lowStockThreshold: String(v.lowStockThreshold ?? v.threshold ?? '10'),
      attributes: (v.attributes as VariantAttribute[]) ?? [],
      variantStatus: (v.isEnabled === false || v.isEnabled === 'false') ? 'inactive' : (v.isEnabled === true || v.isEnabled === 'true' || v.variantStatus === true || v.variantStatus === 'active' || v.status === 'ACTIVE') ? 'active' : 'inactive',
      images,
    };
  });
}

/** Normalize API product (partner/get-by-id) to ViewProduct Product shape */
function normalizeApiProductToView(raw: unknown, productId: string): Product | null {
  const p = raw as Record<string, unknown>;
  if (!p || (typeof p.id === 'undefined' && typeof p.name === 'undefined')) return null;
  const resolvedId = (p.id != null ? String(p.id) : productId) || productId;
  const rawCat = p.category;
  const categoryObj =
    rawCat && typeof rawCat === 'object'
      ? (rawCat as { id?: string; name?: string })
      : undefined;
  const categoryIdResolved = String(
    categoryObj?.id ?? p.categoryId ?? p.category_id ?? ''
  ).trim();
  const categoryNameResolved = String(
    categoryObj?.name ??
      (typeof rawCat === 'string' && rawCat.trim() && !UUID_RE.test(rawCat.trim()) ? rawCat.trim() : '') ??
      p.categoryName ??
      p.category_name ??
      ''
  ).trim();
  const rawSub =
    p.subCategory ??
    p.subcategory ??
    p.sub_category ??
    p.subCategoryData;
  const subCategoryObj =
    rawSub && typeof rawSub === 'object'
      ? (rawSub as {
          id?: string;
          name?: string;
          title?: string;
          subCategoryName?: string;
          sub_category_name?: string;
          label?: string;
        })
      : undefined;
  const subCategoryIdResolved = String(
    subCategoryObj?.id ??
      p.subCategoryId ??
      p.sub_category_id ??
      p.subcategoryId ??
      p.subcategory_id ??
      p.subCategoryID ??
      ''
  ).trim();
  const subCategoryNameResolved = String(
    (subCategoryObj?.name ??
      subCategoryObj?.title ??
      subCategoryObj?.subCategoryName ??
      subCategoryObj?.sub_category_name ??
      subCategoryObj?.label) ??
      (typeof rawSub === 'string' && rawSub.trim() && !UUID_RE.test(rawSub.trim()) ? rawSub.trim() : '') ??
      p.subCategoryName ??
      p.sub_category_name ??
      p.subcategoryName ??
      p.subcategory_name ??
      p.subCategoryTitle ??
      ''
  ).trim();
  const brandObj =
    p.brand && typeof p.brand === 'object'
      ? (p.brand as { id?: string; name?: string; title?: string })
      : undefined;
  const brandIdResolved = String(brandObj?.id ?? p.brandId ?? p.brand_id ?? '').trim();
  const brandDisplayResolved = String(
    brandObj?.name ||
      (typeof brandObj?.title === 'string' ? brandObj.title : '') ||
      (typeof p.brand === 'string' && p.brand.trim() && !UUID_RE.test(p.brand.trim()) ? p.brand.trim() : '') ||
      (typeof p.brands === 'string' && String(p.brands).trim() && !UUID_RE.test(String(p.brands).trim()) ? String(p.brands).trim() : '') ||
      brandIdResolved
  ).trim();
  const supplier = (p.supplier as Array<{ companyName?: string }>) || [];
  const warehouse = p.warehouse as { name?: string } | undefined;
  const images = (p.images as string[]) || [];
  const mainImage = images[0] ?? '';
  const otherImages = images.filter(Boolean).filter((img) => img !== mainImage);
  const tags = Array.isArray(p.tags) ? (p.tags as string[]).join(', ') : (p.tags as string) ?? '';
  const variantsRaw = ((p.variants ?? (p as Record<string, unknown>).productVariants) as Array<Record<string, unknown>>) || [];
  const variantStatus = p.variantStatus === true || p.variantStatus === 'active' ? 'active' : 'inactive';
  // Prefer isActive from API (used after status toggle); fallback to status string
  const status =
    p.isActive === false ? 'inactive'
    : p.isActive === true ? 'active'
    : (p.status as string)?.toLowerCase() === 'active' ? 'active'
    : (p.status as string)?.toLowerCase() === 'inactive' ? 'inactive'
    : (p.status as string)?.toLowerCase() === 'approved' ? 'approved'
    : 'pending';

  // Only real variants from API — do not add a fake "product as variant" row (match admin: table shows variants only)
  const variants: Variant[] =
    variantsRaw.length > 0
      ? variantsRaw.map((v, i) => {
          const vPrimary = toVariantImageUrlList(v.primaryImages ?? v.primaryImage);
          const vSecondary = toVariantImageUrlList(v.secondaryImages ?? v.secondaryImage);
          const vImages = toVariantImageUrlList(v.images ?? v.imageUrls ?? v.variantImages ?? v.image);
          const variantImageList = [...vPrimary, ...vSecondary, ...vImages].filter(Boolean);
          const variantImagesFinal = variantImageList.length > 0 ? variantImageList : images;
          const mrpVal = v.mrp ?? v.price ?? '0';
          const sellingPriceVal = v.sellingPrice ?? v.salePrice ?? v.finalPrice ?? mrpVal;
          const variantIdResolved = v.id != null
            ? (typeof v.id === 'string' ? v.id : String(v.id))
            : (i + 1);
          const typeResolved = resolveUnitType(v);
          const unitResolved = resolveUnit(v);
          const unitTypeIdResolved = resolveUnitTypeId(v);
          const unitIdResolved = resolveUnitId(v);
          return {
            id: variantIdResolved,
            variantName: (v.variantName ?? v.name ?? p.name ?? '') as string,
            sku: (v.sku ?? '') as string,
            barcode: (v.barcode ?? v.gtin ?? '') as string,
            type: (typeResolved as Variant['type']) || '',
            unit: unitResolved,
            unitTypeId: unitTypeIdResolved,
            unitId: unitIdResolved,
            measurement: (v.measurement ?? '') as string,
            price: String(mrpVal),
            discountType: (String(v.discountType ?? '').toUpperCase() === 'RUPEES' || String(v.discountType ?? '').toUpperCase() === 'FLAT' ? 'rupees' : 'percentage') as 'percentage' | 'rupees',
            discount: String(v.discountValue ?? v.discount ?? '0'),
            salePrice: String(sellingPriceVal),
            stock: String(v.stockQuantity ?? v.stock ?? '0'),
            stockStatus: (v.stockStatus as string) ?? 'in_stock',
            minOrderQuantity: String(v.minOrderQty ?? v.minOrderQuantity ?? '1'),
            maxOrderQuantity: String(v.maxOrderQty ?? v.maxOrderQuantity ?? '10'),
            lowStockThreshold: String(v.lowStockThreshold ?? v.threshold ?? '10'),
            attributes: (v.attributes as VariantAttribute[]) ?? [],
            variantStatus: (v.isEnabled === false || v.isEnabled === 'false') ? 'inactive' : (v.isEnabled === true || v.isEnabled === 'true' || v.variantStatus === true || v.variantStatus === 'active' || v.status === 'ACTIVE') ? 'active' : 'inactive',
            images: variantImagesFinal,
          };
        })
      : [];

  return {
    id: resolvedId,
    productId: (p.id != null ? String(p.id).slice(0, 8) : productId.slice(0, 8)).toUpperCase(),
    sellerName: supplier[0]?.companyName ?? (warehouse?.name as string) ?? 'N/A',
    name: (p.name ?? '') as string,
    mainImage,
    otherImages,
    productType: (p.productType ?? '') as string,
    category: categoryNameResolved || categoryIdResolved,
    subCategory: subCategoryNameResolved || subCategoryIdResolved,
    categoryId: categoryIdResolved,
    subCategoryId: subCategoryIdResolved,
    seller: supplier[0]?.companyName ?? (warehouse?.name as string) ?? '',
    tax: String(p.taxRate ?? p.tax ?? '0'),
    tags,
    brands: brandDisplayResolved,
    description: (p.description ?? '') as string,
    shortDescription: String(p.shortDescription ?? ''),
    slug: String(p.slug ?? ''),
    metaTitle: String(p.metaTitle ?? (p as Record<string, unknown>).meta_title ?? ''),
    metaKeywords: Array.isArray(p.metaKeywords)
      ? (p.metaKeywords as string[]).join(', ')
      : String(p.metaKeywords ?? (p as Record<string, unknown>).metaKeyword ?? (p as Record<string, unknown>).keywords ?? ''),
    schemaMarkup: typeof p.schemaMarkup === 'string'
      ? (p.schemaMarkup as string)
      : (p.schemaMarkup ? JSON.stringify(p.schemaMarkup) : ''),
    metaDescription: String(p.metaDescription ?? (p as Record<string, unknown>).meta_description ?? ''),
    manufacturer: String(p.manufacturer ?? (p as Record<string, unknown>).manufacturerName ?? ''),
    madeIn: String(p.madeIn ?? (p as Record<string, unknown>).made_in ?? (p as Record<string, unknown>).countryOfOrigin ?? (p as Record<string, unknown>).originCountry ?? ''),
    fssaiLicNo: String(p.fssaiLicNo ?? (p as Record<string, unknown>).fssaiLicenseNo ?? (p as Record<string, unknown>).fssaiLicenceNo ?? (p as Record<string, unknown>).fssaiNo ?? ''),
    isReturnable: Boolean(p.isReturnable),
    maxReturnDays: '',
    isCancelable: Boolean(p.isCancelable),
    cancelTillStatus: '',
    isCodAllowed: Boolean(p.isCodAllowed),
    status,
    variants,
    barcode: String(p.barcode ?? (p as Record<string, unknown>).gtin ?? (p as Record<string, unknown>).barCode ?? ''),
    productUnitTypeId: resolveUnitTypeId(p),
    productUnitId: resolveUnitId(p),
    productUnitTypeName: resolveUnitType(p),
    productUnitName: resolveUnit(p),
  };
}

const ViewProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backToManage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const page = params.get("page");
    const limit = params.get("limit");
    const out = new URLSearchParams();
    if (page) out.set("page", page);
    if (limit) out.set("limit", limit);
    const qs = out.toString();
    return qs ? `/products/manage?${qs}` : "/products/manage";
  }, [location.search]);
  const queryClient = useQueryClient();
  const productId = id ?? '';

  const [variantSortField, setVariantSortField] = useState<string | null>(null);
  const [variantSortDirection, setVariantSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    variantId: number | string | null;
    variantName: string | null;
  }>({ isOpen: false, variantId: null, variantName: null });
  const [deleteProductConfirm, setDeleteProductConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  const { data: productData, isLoading, isError, error: productError, refetch } = useGetProductDetailsById(productId);
  const { data: variantsData, refetch: refetchVariants } = useGetVariantsByProductId(productId);
  const { mutate: deleteProductMutation } = useDeleteProduct();
  const { mutate: updateProductActive, isPending: isUpdatingStatus } = useUpdateProductActive();
  const { mutateAsync: deleteVariant } = useDeleteVariant();
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);
  const [variantActiveOverrides, setVariantActiveOverrides] = useState<Record<string, boolean>>({});
  const { mutateAsync: updateVariantStatus } = useMutation({
    mutationFn: ({ variantId, isEnabled }: { variantId: string; isEnabled: boolean }) =>
      fetchData(`productmanagement/variant/${variantId}`, 'PUT', { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['productById'] });
      queryClient.invalidateQueries({ queryKey: ['variantsByProduct'] });
    },
  });
  const { data: categoriesData } = useGetAllCategoriesMerged();
  const { data: subCategoriesData } = useGetAllSubCategoryList(1, 1000);
  const { data: brandsData } = useGetAllBrandsList(1, 1000);
  const { data: unitTypesData } = useGetProductUnitTypesList();

  // Redirect to list if view URL has no product id (e.g. /products/manage/view/ with trailing slash or empty id)
  useEffect(() => {
    if (!productId || !productId.trim()) {
      navigate("/products/manage", { replace: true });
      return;
    }
    refetch();
  }, [productId, navigate, refetch]);

  const product = useMemo(() => {
    if (!productData) return null;
    const res = productData as { data?: { product?: unknown } | unknown };
    const data = res?.data ?? productData;
    const raw = (data as { product?: unknown })?.product ?? data;
    return normalizeApiProductToView(raw, productId);
  }, [productData, productId]);

  /** Raw API product for read-only fields that match admin Product Info (price, stock, etc.). */
  const rawProduct = useMemo((): Record<string, unknown> | null => {
    if (!productData) return null;
    const res = productData as { data?: unknown };
    const data = res?.data ?? productData;
    const p = (data as { product?: unknown })?.product ?? data;
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
  }, [productData]);

  const variantsFromApi = useMemo(() => {
    if (!variantsData) return null;
    const raw = (variantsData as { data?: unknown })?.data ?? variantsData;
    const productImages = product ? (product.mainImage ? [product.mainImage] : []) : [];
    return normalizeApiVariantsToView(raw, productImages);
  }, [variantsData, product?.mainImage]);

  const variantTableData = (
    variantsFromApi && variantsFromApi.length > 0 ? variantsFromApi : (product?.variants || [])
  );

  const variantUnitTypeIds = useMemo(() => {
    const fromVariants = variantTableData.map((v) => v.unitTypeId).filter((id): id is string => Boolean(id));
    const pid = product?.productUnitTypeId?.trim();
    const merged = pid ? [...fromVariants, pid] : fromVariants;
    return [...new Set(merged.map(String))];
  }, [variantTableData, product?.productUnitTypeId]);

  const unitsByTypeId = useGetUnitsMapForUnitTypes(variantUnitTypeIds);

  const unitTypesOptions = useMemo(() => parseUnitTypesOptions(unitTypesData), [unitTypesData]);

  const variantsWithResolvedUnitAndType = useMemo(() => {
    return variantTableData.map((v) => {
      let typeDisplay = String(v.type || '').trim();
      let unitDisplay = String(v.unit || '').trim();
      if (typeDisplay && looksLikeOpaqueId(typeDisplay) && unitTypesOptions.length > 0) {
        const found = unitTypesOptions.find((o) => String(o.value) === typeDisplay);
        if (found) typeDisplay = found.label;
      }
      if (!typeDisplay && v.unitTypeId && unitTypesOptions.length > 0) {
        const found = unitTypesOptions.find((o) => String(o.value) === String(v.unitTypeId));
        if (found) typeDisplay = found.label;
      }
      if (unitDisplay && looksLikeOpaqueId(unitDisplay) && v.unitTypeId != null) {
        const opts = unitsByTypeId[String(v.unitTypeId)] ?? [];
        const found = opts.find((o) => String(o.value) === unitDisplay);
        if (found) unitDisplay = found.label;
      }
      if (!unitDisplay && v.unitTypeId != null && v.unitId != null) {
        const opts = unitsByTypeId[String(v.unitTypeId)] ?? [];
        const found = opts.find((o) => String(o.value) === String(v.unitId));
        if (found) unitDisplay = found.label;
      }
      return { ...v, type: typeDisplay as Variant['type'], unit: unitDisplay };
    });
  }, [variantTableData, unitTypesOptions, unitsByTypeId]);

  /** Product-level unit metadata first, then variant fallback for display. */
  const productCardUnitTypeAndUnit = useMemo(() => {
    const rows = variantsWithResolvedUnitAndType;
    const pick =
      rows.find((v) => String(v.type || '').trim() || String(v.unit || '').trim()) ?? rows[0];
    let typeStr = '';
    let unitStr = '';

    const ptId = product?.productUnitTypeId?.trim();
    const puId = product?.productUnitId?.trim();
    const ptn = String(product?.productUnitTypeName ?? '').trim();
    const pun = String(product?.productUnitName ?? '').trim();

    // 1) Product-level unitType from response (prefer direct name).
    if (ptn) typeStr = ptn;
    // 2) Resolve product-level unitType id to name.
    if (!typeStr && ptId && unitTypesOptions.length > 0) {
      const f = unitTypesOptions.find((o) => String(o.value) === String(ptId));
      if (f) typeStr = f.label;
    }

    // 3) Product-level unit from response (prefer direct name).
    if (pun) unitStr = pun;
    // 4) Resolve product-level unit id to name.
    if (!unitStr && puId && ptId) {
      const opts = unitsByTypeId[String(ptId)] ?? [];
      const f = opts.find((o) => String(o.value) === String(puId));
      if (f) unitStr = f.label;
    }
    // 5) Fallback to variant-resolved values only if product-level fields are missing.
    if (!typeStr) typeStr = String(pick?.type ?? '').trim();
    if (!unitStr) unitStr = String(pick?.unit ?? '').trim();

    return { unitType: typeStr, unit: unitStr, variantForPricing: pick };
  }, [variantsWithResolvedUnitAndType, product, unitTypesOptions, unitsByTypeId]);

  const sortedVariantTableData = useMemo(() => {
    if (!variantSortField || variantsWithResolvedUnitAndType.length === 0) return variantsWithResolvedUnitAndType;
    const direction = variantSortDirection ?? 'asc';
    const field = variantSortField;
    const getSortValue = (v: Variant): string | number => {
      switch (field) {
        case 'id':
          return typeof v.id === 'number' ? v.id : (v.id ?? '');
        case 'productName':
          return (v.variantName || '').toLowerCase();
        case 'type':
          return (String(v.type || '')).toLowerCase();
        case 'measurement':
          return `${v.measurement || ''} ${v.unit || ''}`.trim().toLowerCase();
        case 'price':
          return parseFloat(v.price || '0') || 0;
        case 'dPrice':
          return parseFloat(v.salePrice || '0') || 0;
        case 'status':
          return (v.variantStatus || '').toLowerCase();
        default:
          return (v as unknown as Record<string, unknown>)[field] as string | number ?? '';
      }
    };
    return [...variantsWithResolvedUnitAndType].sort((a, b) => {
      const aVal = getSortValue(a);
      const bVal = getSortValue(b);
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [variantsWithResolvedUnitAndType, variantSortField, variantSortDirection]);

  const variantSerialById = useMemo(() => {
    const map = new Map<string, number>();
    sortedVariantTableData.forEach((v, idx) => {
      map.set(String(v.id), idx + 1);
    });
    return map;
  }, [sortedVariantTableData]);

  const categories = useMemo(() => {
    const apiData = categoriesData as { data?: { categories?: Record<string, unknown>[] }; categories?: Record<string, unknown>[] } | undefined;
    const raw = apiData?.data?.categories ?? apiData?.categories;
    const list = Array.isArray(raw) ? raw : [];
    return list.map((c) => ({
      id: String(c.id ?? c._id ?? c.categoryId ?? ''),
      name: String(c.name ?? c.title ?? c.categoryName ?? ''),
    })).filter((c) => c.id);
  }, [categoriesData]);

  const subCategories = useMemo(() => {
    const apiData = subCategoriesData as
      | {
          data?:
            | { subCategories?: Record<string, unknown>[]; subcategories?: Record<string, unknown>[]; items?: Record<string, unknown>[]; list?: Record<string, unknown>[] }
            | Record<string, unknown>[];
          subCategories?: Record<string, unknown>[];
          subcategories?: Record<string, unknown>[];
          items?: Record<string, unknown>[];
          list?: Record<string, unknown>[];
        }
      | undefined;
    const dataNode = apiData?.data;
    const raw =
      (Array.isArray(dataNode) ? dataNode : undefined) ??
      (!Array.isArray(dataNode) ? dataNode?.subCategories : undefined) ??
      (!Array.isArray(dataNode) ? dataNode?.subcategories : undefined) ??
      (!Array.isArray(dataNode) ? (dataNode as { data?: Record<string, unknown>[] })?.data : undefined) ??
      (!Array.isArray(dataNode) ? dataNode?.items : undefined) ??
      (!Array.isArray(dataNode) ? dataNode?.list : undefined) ??
      apiData?.subCategories ??
      apiData?.subcategories ??
      apiData?.data ??
      apiData?.items ??
      apiData?.list;
    const list = Array.isArray(raw) ? raw : [];
    return list.map((s) => ({
      id: String(s.id ?? s._id ?? s.subCategoryId ?? ''),
      name: String(s.name ?? s.title ?? s.subCategoryName ?? s.sub_category_name ?? ''),
    })).filter((s) => s.id);
  }, [subCategoriesData]);

  const brands = useMemo(() => {
    const apiData = brandsData as { data?: { brands?: { id: string; name: string; title?: string | null }[] }; brands?: { id: string; name: string; title?: string | null }[] } | undefined;
    if (!apiData) return [];
    if (apiData.data?.brands) return apiData.data.brands;
    if (Array.isArray(apiData.brands)) return apiData.brands;
    return [];
  }, [brandsData]);

  const getCategoryName = (categoryId: string, fallbackLabel?: string): string => {
    const id = String(categoryId ?? '').trim();
    if (id) {
      const cat = categories.find((c) => String(c.id) === id);
      if (cat?.name) return cat.name;
      if (!UUID_RE.test(id)) return id;
    }
    const fb = String(fallbackLabel ?? '').trim();
    if (fb) return fb;
    return 'N/A';
  };

  const getSubCategoryName = (subCategoryId: string, fallbackLabel?: string): string => {
    const id = String(subCategoryId ?? '').trim();
    if (id) {
      const sub = subCategories.find((s) => String(s.id) === id);
      if (sub?.name) return sub.name;
      if (!UUID_RE.test(id)) return id;
    }
    const fb = String(fallbackLabel ?? '').trim();
    if (fb) return fb;
    return 'N/A';
  };

  const getBrandName = (brandIdOrLabel: string): string => {
    if (!brandIdOrLabel) return 'N/A';
    const id = String(brandIdOrLabel).trim();
    const brand = brands.find((b: { id: string }) => String(b.id) === id);
    const r = brand as { name?: string; title?: string | null } | undefined;
    if (r?.name || r?.title) return (r.name || r.title || '').trim();
    if (!UUID_RE.test(id)) return id;
    return id;
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <LoadingFallback />
      </div>
    );
  }

  if (isError || !product) {
    const errMsg = (productError as { message?: string })?.message;
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            {isError ? (errMsg || 'Error loading product') : 'Product not found'}
          </p>
          <button
            onClick={() => navigate(backToManage)}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleVariantSort = (field: string) => {
    if (variantSortField === field) {
      if (variantSortDirection === 'asc') {
        setVariantSortDirection('desc');
      } else if (variantSortDirection === 'desc') {
        setVariantSortField(null);
        setVariantSortDirection(null);
      } else {
        setVariantSortDirection('asc');
      }
    } else {
      setVariantSortField(field);
      setVariantSortDirection('asc');
    }
  };

  const handleEdit = () => {
    const params = new URLSearchParams(location.search);
    params.set("returnTo", "view");
    navigate(`/products/${productId}/edit?${params.toString()}`);
  };

  const handleDeleteClick = () => {
    setDeleteProductConfirm({ isOpen: true, id: productId });
  };

  const handleDeleteProductConfirm = () => {
    if (deleteProductConfirm.id === null) return;
    deleteProductMutation(deleteProductConfirm.id, {
      onSuccess: () => {
        setDeleteProductConfirm({ isOpen: false, id: null });
        navigate(backToManage);
      },
      onSettled: () => {
        setDeleteProductConfirm({ isOpen: false, id: null });
      },
    });
  };

  const handleAddVariant = () => {
    const productDataForVariant = {
      productName: product.name,
      categoryId: product.categoryId || product.category,
      subCategoryId: product.subCategoryId || product.subCategory,
      category: product.categoryId || product.category,
      subCategory: product.subCategoryId || product.subCategory,
      mainImagePreview: product.mainImage || (Array.isArray((product as any).images) ? (product as any).images[0] : null) || null,
    };
    sessionStorage.setItem(`product_${productId}`, JSON.stringify(productDataForVariant));
    navigate(`/products/create?addVariant=true&productId=${productId}`);
  };

  const handleStatusToggle = () => {
    const newIsActive = !(product.status === 'active' || product.status === 'approved');
    updateProductActive({ productId, isActive: newIsActive });
  };

  const handleViewVariant = (variantId: number | string) => {
    navigate(`/products/manage/view/${productId}/variant/${variantId}`);
  };

  const handleEditVariant = (variantId: number | string) => {
    navigate(`/products/create?editVariant=true&productId=${productId}&variantId=${variantId}`);
  };

  const handleVariantStatusToggle = async (variantId: string, currentActive: boolean) => {
    const newActive = !currentActive;
    setVariantActiveOverrides((prev) => ({ ...prev, [variantId]: newActive }));
    setUpdatingVariantId(variantId);
    try {
      await updateVariantStatus({ variantId, isEnabled: newActive });
      await queryClient.invalidateQueries({ queryKey: ['variantsByProduct', productId] });
      await queryClient.invalidateQueries({ queryKey: ['productById', productId] });
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

  const handleDeleteVariant = (variantId: number | string, variantName: string) => {
    setDeleteConfirm({ isOpen: true, variantId, variantName });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.variantId === null || !productId) return;
    const variantIdToDelete = deleteConfirm.variantId;
    setDeleteConfirm({ isOpen: false, variantId: null, variantName: null });
    try {
      await deleteVariant(variantIdToDelete);
      // Invalidate and refetch so the list updates immediately (API may soft-delete; refetch gets fresh list)
      await queryClient.invalidateQueries({ queryKey: ['variantsByProduct', productId] });
      await queryClient.invalidateQueries({ queryKey: ['productById', productId] });
      await queryClient.refetchQueries({ queryKey: ['variantsByProduct', productId] });
      await queryClient.refetchQueries({ queryKey: ['productById', productId] });
    } catch {
      // Error shown by hook; re-open confirm if you want to retry
    }
  };

  const variantColumns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (variant: Variant) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {variantSerialById.get(String(variant.id)) ?? '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'image',
      label: 'IMAGE',
      sortable: false,
      render: (variant: Variant) => (
        <div className="text-center">
          {variant.images && variant.images.length > 0 ? (
            <img
              src={variant.images[0]}
              alt={variant.variantName}
              className="w-12 h-12 object-cover rounded mx-auto"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = 'none';
                if (t.parentElement) {
                  t.parentElement.innerHTML = '<span class="text-[10px] text-gray-400">No image</span>';
                }
              }}
            />
          ) : (
            <span className="text-[10px] text-gray-400">No image</span>
          )}
        </div>
      ),
    },
    {
      key: 'productName',
      label: 'PRODUCT NAME',
      sortable: true,
      render: (variant: Variant) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{variant.variantName || product.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'UNIT TYPE',
      sortable: true,
      render: (variant: Variant) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {variant.type
              ? String(variant.type).charAt(0).toUpperCase() + String(variant.type).slice(1).toLowerCase()
              : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'unit',
      label: 'UNIT',
      sortable: true,
      render: (variant: Variant) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {variant.unit || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'measurement',
      label: 'MEASUREMENT',
      sortable: true,
      render: (variant: Variant) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {variant.measurement || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'PRICE',
      sortable: true,
      render: (variant: Variant) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">₹{parseFloat(variant.price || '0').toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'dPrice',
      label: 'D.PRICE',
      sortable: true,
      render: (variant: Variant) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">₹{parseFloat(variant.salePrice || '0').toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (variant: Variant) => {
        const variantIdStr = String(variant.id ?? '');
        const baseActive = variant.variantStatus === 'active';
        const isActive = variantActiveOverrides[variantIdStr] !== undefined ? variantActiveOverrides[variantIdStr] : baseActive;
        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => variantIdStr && handleVariantStatusToggle(variantIdStr, isActive)}
              disabled={updatingVariantId === variantIdStr}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isActive ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} ${updatingVariantId === variantIdStr ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={isActive ? 'Click to make inactive' : 'Click to make active'}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (variant: Variant) => (
        <div className="flex items-center justify-center gap-1.5">
          <ViewIconButton onClick={() => handleViewVariant(variant.id)} size={12} />
          <EditIconButton onClick={() => handleEditVariant(variant.id)} size={12} />
          {/* Delete variant — hidden per request
          <DeleteIconButton
            onClick={() => handleDeleteVariant(variant.id, variant.variantName)}
            size={12}
          />
          */}
        </div>
      ),
    },
  ];

  const rawStr = (key: string) => {
    const v = rawProduct?.[key];
    if (v == null || v === '') return 'N/A';
    return String(v);
  };

  const toDisplayValue = (...vals: unknown[]): string => {
    for (const v of vals) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s !== '' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') return s;
    }
    return 'N/A';
  };

  const pricingCard = {
    landingPrice: (() => {
      const raw = toDisplayValue(rawProduct?.costPrice, rawProduct?.price, rawProduct?.landingPrice);
      if (raw === 'N/A') return raw;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? `₹${n.toFixed(2)}` : raw;
    })(),
    originalPrice: (() => {
      const raw = toDisplayValue(rawProduct?.mrp, rawProduct?.originalPrice, rawProduct?.listPrice);
      if (raw === 'N/A') return raw;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? `₹${n.toFixed(2)}` : raw;
    })(),
    tax: (() => {
      const raw = toDisplayValue(rawProduct?.taxRate, rawProduct?.tax);
      if (raw === 'N/A') return raw;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? `${n}%` : raw;
    })(),
    discountType: (() => {
      const raw = String(rawProduct?.discountType ?? '').trim();
      if (!raw) return 'N/A';
      const up = raw.toUpperCase();
      if (up.includes('RUPEE') || up === 'FLAT') return 'Rupees';
      if (up.includes('PERCENT')) return 'Percentage';
      return raw;
    })(),
    discount: toDisplayValue(rawProduct?.discountValue, rawProduct?.discount),
    finalSellingPrice: (() => {
      const raw = toDisplayValue(
        rawProduct?.finalPrice,
        rawProduct?.sellingPrice,
        rawProduct?.salePrice
      );
      if (raw === 'N/A') return raw;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? `₹${n.toFixed(2)}` : raw;
    })(),
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          View Product
        </h1>
        <div className="flex items-center gap-2">
          <BackButton to={backToManage} />
          <button
            type="button"
            onClick={handleEdit}
            className="p-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          {/* Delete product — hidden per request
          <button
            type="button"
            onClick={handleDeleteClick}
            className="p-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          */}
        </div>
      </div>

      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Product header — matches admin */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
            {product.mainImage ? (
              <img
                src={product.mainImage}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<div class="w-full h-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                <ImageIcon size={32} className="text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500">Product Name : </span>
                <span className="text-sm text-gray-800">{product.name}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Category : </span>
                <span className="text-xs text-gray-800">
                  {getCategoryName(product.categoryId || '', product.category) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Sub Category : </span>
                <span className="text-xs text-gray-800">
                  {getSubCategoryName(product.subCategoryId || '', product.subCategory) || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Status :</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={product.status === 'active' || product.status === 'approved'}
                onChange={handleStatusToggle}
                disabled={isUpdatingStatus}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 dark:peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  product.status === 'active' || product.status === 'approved'
                    ? 'peer-checked:bg-green-600 dark:peer-checked:bg-green-500'
                    : 'peer-checked:bg-gray-400 dark:peer-checked:bg-gray-500'
                } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Description — partner data, admin-style card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3">Description</h2>
        <div
          className="text-xs text-gray-800 break-words min-h-[2rem] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
          dangerouslySetInnerHTML={{ __html: product.description || 'N/A' }}
        />
      </div>

      {/* Pricing | Images — admin grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Pricing Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-500">Landing Price : </span>
              <span className="text-xs text-gray-800">{pricingCard.landingPrice}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Original Price / MRP : </span>
              <span className="text-xs text-gray-800">{pricingCard.originalPrice}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Discount Type : </span>
              <span className="text-xs text-gray-800">{pricingCard.discountType}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Discount : </span>
              <span className="text-xs text-gray-800">{pricingCard.discount}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Final Selling Price : </span>
              <span className="text-xs text-gray-800">{pricingCard.finalSellingPrice}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Tax : </span>
              <span className="text-xs text-gray-800">{pricingCard.tax}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Images</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Main Image</p>
              {product.mainImage ? (
                <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <img
                    src={product.mainImage}
                    alt="Main"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Other images</p>
              {product.otherImages && product.otherImages.length > 0 ? (
                <div className="space-y-2">
                  <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <img
                      src={product.otherImages[0]}
                      alt="Other 1"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  {product.otherImages.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {product.otherImages.slice(1, 7).map((img, idx) => (
                        <div
                          key={`${img}-${idx}`}
                          className="w-full h-10 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                        >
                          <img src={img} alt={`Other ${idx + 2}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEO | Product Info — admin bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Seo Settings</h2>
          <div className="space-y-3 min-w-0">
            <div>
              <span className="text-xs font-medium text-gray-500">Main Title : </span>
              <span className="text-xs text-gray-800 break-words">{product.metaTitle || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Schema Markup : </span>
              <p className="mt-1 text-xs text-gray-800 break-all whitespace-pre-wrap">
                {product.schemaMarkup || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Meta Keywords : </span>
              <p className="mt-1 text-xs text-gray-800 break-words whitespace-pre-wrap">
                {product.metaKeywords || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Meta Description : </span>
              <p className="mt-1 text-xs text-gray-800 break-words whitespace-pre-wrap">
                {product.metaDescription || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Product Info</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-500">Slug : </span>
              <span className="text-xs text-gray-800">{product.slug || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Description : </span>
              <div
                className="text-xs text-gray-800 mt-1"
                dangerouslySetInnerHTML={{ __html: product.description || 'N/A' }}
              />
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Short Description : </span>
              <span className="text-xs text-gray-800">{product.shortDescription || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Brand : </span>
              <span className="text-xs text-gray-800">{getBrandName(product.brands)}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Category : </span>
              <span className="text-xs text-gray-800">
                {getCategoryName(product.categoryId || '', product.category)}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Sub Category : </span>
              <span className="text-xs text-gray-800">
                {getSubCategoryName(product.subCategoryId || '', product.subCategory) || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Product Type : </span>
              <span className="text-xs text-gray-800">{product.productType || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Inventory Type : </span>
              <span className="text-xs text-gray-800">{rawStr('inventoryType')}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Unit Type : </span>
              <span className="text-xs text-gray-800">{productCardUnitTypeAndUnit.unitType || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Unit : </span>
              <span className="text-xs text-gray-800">{productCardUnitTypeAndUnit.unit || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Measurement : </span>
              <span className="text-xs text-gray-800">{rawStr('measurement')}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Stock : </span>
              <span className="text-xs text-gray-800">{rawStr('stock')}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Threshold : </span>
              <span className="text-xs text-gray-800">{rawStr('threshold')}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Min Order Qty : </span>
              <span className="text-xs text-gray-800">
                {rawProduct?.minOrderQty != null || rawProduct?.minOrderQuantity != null
                  ? String(rawProduct.minOrderQty ?? rawProduct.minOrderQuantity)
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Max Order Qty : </span>
              <span className="text-xs text-gray-800">
                {rawProduct?.maxOrderQty != null || rawProduct?.maxOrderQuantity != null
                  ? String(rawProduct.maxOrderQty ?? rawProduct.maxOrderQuantity)
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Is Active : </span>
              <span className="text-xs text-gray-800">
                {product.status === 'active' || product.status === 'approved' ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Is Featured : </span>
              <span className="text-xs text-gray-800">
                {String(Boolean(rawProduct?.isFeatured))}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Status : </span>
              <span className="text-xs text-gray-800">{String(product.status || 'N/A').toUpperCase()}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Lifecycle Stage : </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
                {String((rawProduct as any)?.lifecycleStage || 'STORE_ROOM').replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">SKU : </span>
              <span className="text-xs text-gray-800">{rawStr('sku')}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Tags : </span>
              <span className="text-xs text-gray-800">{product.tags || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Manufacturer : </span>
              <span className="text-xs text-gray-800">{product.manufacturer || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Made In : </span>
              <span className="text-xs text-gray-800">{product.madeIn || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">FSSAI Lic. No. : </span>
              <span className="text-xs text-gray-800">{product.fssaiLicNo || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Is Returnable : </span>
              <span className="text-xs text-gray-800">{product.isReturnable ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Is Cancel-able : </span>
              <span className="text-xs text-gray-800">{product.isCancelable ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Is COD allowed : </span>
              <span className="text-xs text-gray-800">{product.isCodAllowed ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Variants — admin DataTable */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Product Variants</h2>
          <PrimaryButton onClick={handleAddVariant} size="sm" className="flex items-center gap-1.5">
            <Plus size={14} />
            Add Variant
          </PrimaryButton>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            data={sortedVariantTableData}
            columns={variantColumns}
            sortField={variantSortField}
            sortDirection={variantSortDirection}
            onSort={handleVariantSort}
            keyExtractor={(variant) => String(variant.id)}
            emptyMessage="No variants added"
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, variantId: null, variantName: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Variant"
        message={`Are you sure you want to delete the variant "${deleteConfirm.variantName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Delete Product Confirmation - same flow as Manage Products */}
      <ConfirmModal
        isOpen={deleteProductConfirm.isOpen}
        onClose={() => setDeleteProductConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteProductConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ViewProduct;
