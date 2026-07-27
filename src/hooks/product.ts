import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

/** Same as admin: use own API (VITE_URL = partner API) + own token (partner token from login). */
const useGetAllProductList = (
  page: number,
  limit: number,
  search: string = "",
  isActive: boolean = true,
  /** GET `status` query: APPROVED, PENDING, REJECTED, TRUE, FALSE (omit when empty) */
  status?: string,
  warehouseId?: string,
) => {
  const statusParam = status?.trim() ? status.trim().toUpperCase() : "";
  return useQuery({
    queryKey: ["product", page, limit, search, isActive, statusParam, warehouseId],
    queryFn: () => {
      const params = new URLSearchParams({
        search: search,
        page: String(page),
        limit: String(limit),
        isActive: String(isActive),
      });
      if (statusParam) {
        params.set("filter", statusParam);
      }
      if (warehouseId) {
        params.set("warehouseId", warehouseId);
      }
      // When search looks like a product ID, send it so backend can filter by id / productId
      const isUuid = /^[0-9a-f-]{36}$/i.test(search.trim());
      const isShortId = /^[a-z0-9]{6,10}$/i.test(search.trim());
      if (search.trim() && (isUuid || isShortId)) {
        params.set("productId", search.trim());
      }
      return fetchData(`productmanagement/product?${params.toString()}`, "GET");
    },
    retry: false,
  });
};

/** Get master product list for Import Products page: GET productmanagement/product/masterproducts
 * Supports: page, limit, search, status, categoryId, subCategoryId
 */
interface MasterProductsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  categoryId?: string;
  subCategoryId?: string;
}

const useGetMasterProducts = (params: MasterProductsParams) => {
  return useQuery({
    queryKey: ["masterProducts", params],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
      });

      if (params.search && params.search.trim()) {
        searchParams.set("search", params.search.trim());
      }
      if (params.status && params.status.trim()) {
        searchParams.set("status", params.status.trim());
      }
      if (params.categoryId && params.categoryId.trim()) {
        searchParams.set("categoryId", params.categoryId.trim());
      }
      if (params.subCategoryId && params.subCategoryId.trim()) {
        searchParams.set("subCategoryId", params.subCategoryId.trim());
      }

      return fetchData(
        `productmanagement/product/masterproducts?${searchParams.toString()}`,
        "GET",
      );
    },
    retry: false,
  });
};

/** Get master product details by ID: GET masterProduct/PRODUCT_ID */
const useGetMasterProductById = (id: string) => {
  return useQuery({
    queryKey: ["masterProductById", id],
    queryFn: () =>
      fetchData(`productmanagement/product/masterproducts/${id}`, "GET"),
    enabled: !!id,
    retry: false,
  });
};

/** Body for POST productmanagement/product/import/masterproduct */
export type ImportMasterProductsPayload = {
  products: Array<{
    masterProductId: string;
    masterProductVariantIds: string[];
  }>;
};

/** Import selected master products into partner products: POST productmanagement/product/import/masterproduct */
const useImportMasterProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ImportMasterProductsPayload) =>
      fetchData(
        "productmanagement/product/import/masterproduct",
        "POST",
        payload,
      ),
    onSuccess: (data: { response?: string }) => {
      toast.success(data?.response || "Products imported successfully");
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["masterProducts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import products");
    },
  });
};

const useGetProductDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["productById", id],
    queryFn: () => fetchData(`productmanagement/product/${id}`, "GET"),
    enabled: !!id,
    retry: false,
  });
};

/** Get all variants for a product: GET {{baseUrl}}/variant/product/{{productId}} */
const useGetVariantsByProductId = (productId: string) => {
  return useQuery({
    queryKey: ["variantsByProduct", productId],
    queryFn: () => fetchData(`variant/product/${productId}`, "GET"),
    enabled: !!productId,
    retry: false,
  });
};

/** Get variant by id: GET {{baseUrl}}/productmanagement/variant/{{variantId}} */
const useGetVariantById = (variantId: string) => {
  return useQuery({
    queryKey: ["variantById", variantId],
    queryFn: () => fetchData(`productmanagement/variant/${variantId}`, "GET"),
    enabled: !!variantId,
    retry: false,
  });
};

/** Variant bulk tab: GET productmanagement/variant/id-name (full list, no query filters). */
const useGetVariantIdNameList = (enabled: boolean) => {
  return useQuery({
    queryKey: ["variantIdNameList"],
    queryFn: () => fetchData("productmanagement/variant/id-name", "GET"),
    enabled,
    retry: false,
  });
};

/** Get categories for product: GET {{baseUrl}}/productmanagement/product/categories/list */
const useGetProductCategoriesList = () => {
  return useQuery({
    queryKey: ["productCategoriesList"],
    queryFn: () =>
      fetchData("productmanagement/product/categories/list", "GET"),
    retry: false,
  });
};

/** Get subcategories by category: GET {{baseUrl}}/productmanagement/product/subcategories/list?categoryId={{categoryId}} */
const useGetSubcategoriesByCategoryId = (categoryId: string) => {
  return useQuery({
    queryKey: ["subcategoriesByCategory", categoryId],
    queryFn: () =>
      fetchData(
        `productmanagement/product/subcategories/list?categoryId=${encodeURIComponent(categoryId)}`,
        "GET",
      ),
    enabled: !!categoryId,
    retry: false,
  });
};

/** Get unit types for product form: GET {{baseUrl}}/productmanagement/product/unittypes — response: { total, data: [{ id, name, description, status, displayOrder, ... }] } */
const useGetProductUnitTypesList = () => {
  return useQuery({
    queryKey: ["productUnitTypesList"],
    queryFn: () => fetchData("productmanagement/product/unittypes", "GET"),
    retry: false,
  });
};

/** Get units by unit type: GET {{baseUrl}}/productmanagement/product/units/:unitTypeId — response: { total, data: [{ id, name, shortCode, status, unitTypeId, ... }] } */
const useGetUnitsByUnitType = (unitTypeId: string | null) => {
  return useQuery({
    queryKey: ["productUnits", unitTypeId],
    queryFn: () =>
      fetchData(`productmanagement/product/units/${unitTypeId}`, "GET"),
    enabled: !!unitTypeId,
    retry: false,
  });
};

/** Fetch units for multiple unit type ids; returns map unitTypeId -> { value: id, label: name }[] (ACTIVE only). */
const useGetUnitsMapForUnitTypes = (unitTypeIds: string[]) => {
  const queries = useQueries({
    queries: unitTypeIds.map((id) => ({
      queryKey: ["productUnits", id],
      queryFn: () => fetchData(`productmanagement/product/units/${id}`, "GET"),
      enabled: !!id,
      retry: false,
    })),
  });
  const unitsByTypeId = useMemo(() => {
    const unwrapUnits = (
      res: unknown,
    ): Array<{
      id: string;
      name: string;
      status?: string;
      shortCode?: string;
    }> => {
      const r = res as { data?: unknown } | undefined;
      const d = r?.data;
      if (Array.isArray(d))
        return d as Array<{
          id: string;
          name: string;
          status?: string;
          shortCode?: string;
        }>;
      if (d && typeof d === "object" && !Array.isArray(d)) {
        const inner =
          (d as Record<string, unknown>).data ??
          (d as Record<string, unknown>).units ??
          (d as Record<string, unknown>).items;
        if (Array.isArray(inner))
          return inner as Array<{
            id: string;
            name: string;
            status?: string;
            shortCode?: string;
          }>;
      }
      return [];
    };
    const m: Record<string, { value: string; label: string }[]> = {};
    unitTypeIds.forEach((id, i) => {
      const list = unwrapUnits(queries[i]?.data);
      m[id] = list
        .filter((u) => !u.status || String(u.status).toUpperCase() === "ACTIVE")
        .map((u) => ({
          value: String(u.id),
          label: String(u.name || u.shortCode || u.id),
        }));
    });
    return m;
  }, [unitTypeIds, queries]);
  return unitsByTypeId;
};

interface createProductResponse {
  status: boolean;
  response: string;
  data: object;
}

interface UpdateProductStatusResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

/** Toggle product active/inactive (same as admin). PUT productmanagement/product/{{productId}} with { isActive }. Uses .env base URL. */
const useUpdateProductActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      isActive,
    }: {
      productId: string;
      isActive: boolean;
    }) =>
      fetchData<UpdateProductStatusResponse>(
        `productmanagement/product/${productId}`,
        "PUT",
        { isActive },
      ),
    onSuccess: (_, variables) => {
      toast.success(
        variables.isActive
          ? "Product is now active"
          : "Product is now inactive",
      );
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({
        queryKey: ["productById", variables.productId],
      });
      // Optimistic update so view page toggle reflects immediately before refetch
      queryClient.setQueriesData(
        { queryKey: ["productById", variables.productId] },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const o = old as Record<string, unknown>;
          const data = o.data as Record<string, unknown> | undefined;
          const product = (data?.product ?? data ?? o) as Record<
            string,
            unknown
          >;
          const updated = { ...product, isActive: variables.isActive };
          if (data && "product" in data)
            return { ...o, data: { ...data, product: updated } };
          if (data) return { ...o, data: updated };
          return { ...o, ...updated };
        },
      );
      queryClient.setQueriesData({ queryKey: ["product"] }, (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const o = old as Record<string, unknown>;
        const data = o.data as Record<string, unknown> | undefined;
        const products =
          (data?.products as Array<Record<string, unknown>>) ??
          (Array.isArray(data) ? data : null) ??
          (o.products as Array<Record<string, unknown>>);
        if (!Array.isArray(products)) return old;
        const next = products.map((p) =>
          String(p.id) === String(variables.productId)
            ? { ...p, isActive: variables.isActive }
            : p,
        );
        if (data && "products" in data)
          return { ...o, data: { ...data, products: next } };
        if (Array.isArray(data)) return { ...o, data: next };
        return { ...o, products: next };
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update product");
    },
  });
};

const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData("productmanagement/product", "POST", payload),

    onSuccess: (data: createProductResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });
};

/** Update product: PUT {{baseUrl}}/api/v1/productmanagement/product/{{productId}} */
const useUpdateProduct = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData(`productmanagement/product/${id}`, "PUT", payload),

    onSuccess: async (data: createProductResponse) => {
      toast.success(data.response || "Product updated successfully");
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productById", id] });
      await queryClient.refetchQueries({ queryKey: ["productById", id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update product");
    },
  });
};

/** Delete product: DELETE {{baseUrl}}/api/v1/productmanagement/product/{{productId}}/delete */
const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchData(`productmanagement/product/${id}/delete`, "DELETE"),

    onSuccess: () => {
      toast.success("Product deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete product");
    },
  });
};

/** Create variant: POST {{baseUrl}}/productmanagement/variant — JSON body (Postman spec). */
const useCreateVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchData("productmanagement/variant", "POST", payload),

    onSuccess: (data: createProductResponse) => {
      toast.success(
        (data as createProductResponse).response ||
          "Variant created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productById"] });
      queryClient.invalidateQueries({ queryKey: ["variantsByProduct"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create variant");
    },
  });
};

/** Update variant: PUT {{baseUrl}}/productmanagement/variant/{{variantId}} */
const useUpdateVariant = (variantId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchData(`productmanagement/variant/${variantId}`, "PUT", payload),

    onSuccess: (data: createProductResponse) => {
      toast.success(
        (data as createProductResponse).response ||
          "Variant updated successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productById"] });
      queryClient.invalidateQueries({ queryKey: ["variantsByProduct"] });
      queryClient.invalidateQueries({ queryKey: ["variantById", variantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update variant");
    },
  });
};

/** Delete (disable) variant: DELETE {{baseUrl}}/productmanagement/variant/delete/{{variantId}} — API soft-deletes (sets isEnabled: false). */
const useDeleteVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variantId: string | number) =>
      fetchData(`productmanagement/variant/delete/${variantId}`, "DELETE"),

    onSuccess: () => {
      toast.success("Variant disabled successfully");
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productById"] });
      queryClient.invalidateQueries({ queryKey: ["variantsByProduct"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete variant");
    },
  });
};

const useGetPendingProductList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["pendingProduct", page, limit],
    queryFn: () =>
      fetchData("productmanagement/product/pending/list", "GET", {
        page,
        limit,
      }),
  });
};

const useUpdateProductStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, stock }: { productId: string; stock: number }) =>
      fetchData(`productmanagement/product/${productId}`, "PUT", { stock }),

    onSuccess: (data: any) => {
      toast.success(data.response || "Stock updated successfully");
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update stock");
    },
  });
};

export {
  useGetAllProductList,
  useGetMasterProducts,
  useGetMasterProductById,
  useImportMasterProducts,
  useCreateProduct,
  useGetProductDetailsById,
  useGetVariantsByProductId,
  useGetVariantById,
  useGetVariantIdNameList,
  useGetProductCategoriesList,
  useGetSubcategoriesByCategoryId,
  useGetProductUnitTypesList,
  useGetUnitsByUnitType,
  useGetUnitsMapForUnitTypes,
  useUpdateProduct,
  useUpdateProductActive,
  useUpdateProductStock,
  useDeleteProduct,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useGetPendingProductList,
};

