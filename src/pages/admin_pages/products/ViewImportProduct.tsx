import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetMasterProductById } from '../../../hooks/product';
import LoadingFallback from '../../../components/common/LoadingFallback';
import { formatCurrency } from "../../../utils/formatters";

interface MasterVariant {
  id: string;
  variantName: string;
  sku: string;
  unitType: string;
  unit: string;
  measurement: string;
  mrp: number;
  sellingPrice: number;
  status: string;
  stockQuantity: number;
  primaryImages: string[];
}

const ViewImportProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = id ?? '';

  const { data: productData, isLoading, isError, error: productError, refetch } = useGetMasterProductById(productId);

  useEffect(() => {
    if (!productId || !productId.trim()) {
      navigate("/products/import", { replace: true });
      return;
    }
    refetch();
  }, [productId, navigate, refetch]);

  const product = useMemo(() => {
    if (!productData) return null;
    const res = productData as { data?: { [key: string]: unknown } } | { [key: string]: unknown };
    const raw = 'data' in res && res.data ? (res.data as Record<string, unknown>) : (res as Record<string, unknown>);
    return raw;
  }, [productData]);

  const variants: MasterVariant[] = useMemo(() => {
    if (!product) return [];
    const apiVariants = (product.variants as unknown) ?? [];
    if (!Array.isArray(apiVariants)) return [];

    return apiVariants.map((v) => {
      const mv = v as Record<string, unknown>;
      return {
        id: String(mv.id ?? ''),
        variantName: String(mv.variantName ?? ''),
        sku: String(mv.sku ?? ''),
        unitType: String(mv.unitType ?? ''),
        unit: String(mv.unit ?? ''),
        measurement: String(mv.measurement ?? ''),
        mrp: Number(mv.mrp ?? 0),
        sellingPrice: Number(mv.sellingPrice ?? 0),
        status: String(mv.status ?? ''),
        stockQuantity: Number(mv.stockQuantity ?? 0),
        primaryImages: Array.isArray(mv.primaryImages)
          ? (mv.primaryImages as string[])
          : [],
      };
    });
  }, [product]);

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
            onClick={() => navigate('/products/import')}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const images: string[] = Array.isArray(product.images) ? product.images : [];
  const mainImage = images[0] || (product.image as string | undefined) || (product.imageUrl as string | undefined) || '';

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title + Back button (same structure as ViewProduct) */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          View Import Product
        </h1>
        <div className="flex items-center gap-2">
          <BackButton to="/products/import" />
        </div>
      </div>

      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Header card: image + main info (mirrors ViewProduct style but simplified) */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
            {mainImage ? (
              <img
                src={mainImage}
                alt={String(product.name || 'Product')}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
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
                <span className="text-sm text-gray-800">
                  {String(product.name || 'N/A')}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">SKU : </span>
                <span className="text-sm text-gray-800">
                  {String(product.sku || 'N/A')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid – reuse pricing / category cards style from ViewProduct but with import fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Pricing card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Pricing Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-500">Price : </span>
              <span className="text-xs text-gray-800">
                {formatCurrency(Number(product.price || 0))}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">MRP : </span>
              <span className="text-xs text-gray-800">
                {formatCurrency(Number((product as { mrp?: number }).mrp || 0))}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Final Price : </span>
              <span className="text-xs text-green-600 dark:text-green-400">
                {formatCurrency(Number((product as { finalPrice?: number }).finalPrice || 0))}
              </span>
            </div>
            {product.description && typeof product.description === 'string' && (
              <div>
                <span className="text-xs font-medium text-gray-500">Description : </span>
                <p className="text-xs text-gray-800 mt-1">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Category / brand card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Category & Brand</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-500">Category : </span>
              <span className="text-xs text-gray-800">
                {String((product.category as { name?: string })?.name || product.categoryName || 'N/A')}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Sub Category : </span>
              <span className="text-xs text-gray-800">
                {String((product.subCategory as { name?: string })?.name || product.subCategoryName || 'N/A')}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Brand : </span>
              <span className="text-xs text-gray-800">
                {String((product.brand as { name?: string })?.name || product.brandName || 'N/A')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Variants table – simplified version of ViewProduct variants table */}
      {variants.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Variants</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/40">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">ID</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">IMAGE</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">VARIANT NAME</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">SKU</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">MEASUREMENT</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">MRP</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">PRICE</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">STATUS</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">STOCK</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="px-3 py-2 text-[11px] text-gray-800">{v.id}</td>
                    <td className="px-3 py-2">
                      {v.primaryImages && v.primaryImages.length > 0 ? (
                        <img
                          src={v.primaryImages[0]}
                          alt={v.variantName || 'Variant'}
                          className="w-10 h-10 object-cover rounded mx-auto"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">No image</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-800">{v.variantName || 'N/A'}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-800">{v.sku || 'N/A'}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-800">
                      {v.measurement || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-800">
                      {formatCurrency(v.mrp || 0)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-800">
                      {formatCurrency(v.sellingPrice || 0)}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-[10px] font-medium ${
                          v.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {v.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-800">
                      {v.stockQuantity ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewImportProduct;
