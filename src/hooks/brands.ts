import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

function mapBrandRowsToOptions(brandsList: unknown[]): { id: string; name: string }[] {
    return brandsList
        .filter((row: unknown) => {
            const b = row as Record<string, unknown>;
            return b.isActive !== false;
        })
        .map((row: unknown) => {
            const b = row as Record<string, unknown>;
            const rawId = b.id ?? b._id;
            const id = rawId != null ? String(rawId) : "";
            const name = String(b.name ?? b.title ?? b.brandName ?? id ?? "");
            return { id, name };
        })
        .filter((b) => b.id)
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Normalize brand rows from productmanagement/product/brands/list (same envelopes as admin app).
 */
export function normalizeBrandsListResponse(raw: unknown): { id: string; name: string }[] {
    if (Array.isArray(raw)) {
        return mapBrandRowsToOptions(raw);
    }
    const apiData = raw as Record<string, unknown> | null | undefined;
    if (!apiData || typeof apiData !== "object") return [];

    let rootData: unknown = apiData.data;
    if (rootData && typeof rootData === "object" && !Array.isArray(rootData)) {
        const layer = rootData as Record<string, unknown>;
        if (Array.isArray(layer.data)) rootData = layer.data;
        else if (Array.isArray(layer.brands)) rootData = layer.brands;
    }

    let brandsList: unknown[] | undefined = Array.isArray(rootData)
        ? (rootData as unknown[])
        : undefined;

    if (!Array.isArray(brandsList)) {
        const data = rootData as Record<string, unknown> | undefined;
        const inner =
            data && typeof data === "object" && !Array.isArray(data)
                ? (data.data as Record<string, unknown> | undefined)
                : undefined;
        brandsList =
            (data?.brands as unknown[]) ??
            (data?.brandList as unknown[]) ??
            (data?.brand_list as unknown[]) ??
            (inner?.brands as unknown[]) ??
            (apiData.brands as unknown[]) ??
            ((apiData.result as Record<string, unknown>)?.data as Record<string, unknown> | undefined)?.brands as
                | unknown[]
                | undefined;
        if (!Array.isArray(brandsList) && data && typeof data === "object" && !Array.isArray(data)) {
            const firstArray = Object.values(data).find((v) => Array.isArray(v)) as unknown[] | undefined;
            brandsList = firstArray;
        }
    }

    if (!Array.isArray(brandsList)) {
        const resultNode = apiData.result as Record<string, unknown> | undefined;
        if (resultNode && Array.isArray(resultNode.data)) {
            brandsList = resultNode.data as unknown[];
        }
    }

    if (!Array.isArray(brandsList)) return [];
    return mapBrandRowsToOptions(brandsList);
}

/** Product form: GET productmanagement/product/brands/list?categoryId=&subCategoryId= (aligned with admin). */
const useGetBrandsFilteredByCategory = (categoryId: string, subCategoryId: string) => {
    const cid = String(categoryId ?? "").trim();
    const sid = String(subCategoryId ?? "").trim();
    const enabled = Boolean(cid && sid);
    return useQuery({
        queryKey: ["brand", "product-brands-list", cid, sid],
        queryFn: async () => {
            const params = new URLSearchParams({
                categoryId: cid,
                subCategoryId: sid,
            });
            const res = await fetchData(
                `productmanagement/product/brands/list?${params.toString()}`,
                "GET"
            );
            return normalizeBrandsListResponse(res);
        },
        enabled,
        staleTime: 2 * 60 * 1000,
        retry: false,
    });
};

const useGetAllBrandsList = (page:number,limit:number) => {
    return useQuery({
        queryKey: ["brand", page, limit],
        queryFn: () =>
            fetchData(`brand/getBrandList?page=${page}&limit=${limit}`, "GET")
    });
};

const useGetBrandsDetailsById = (id : string) => {
    return useQuery({
        queryKey: ["brandById"],
        queryFn: () =>
            fetchData(`brand/${id}`,"GET", {
                page: 1,
                limit: 20,
            }),

        enabled : !!id
    });
};

interface createBrandResponse {
    status : boolean,
    response : string,
    data : object
}
const useCreateBrands = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData("brand/createBrand", "POST", payload),

        onSuccess: (data:createBrandResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["brand"] });
        },
    });
};

const useUpdateBrands = (id : string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData(`brand/${id}`,"PATCH", payload),

        onSuccess: (data:createBrandResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["brand"] });
        },
    });
};

const useDeleteBrands = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id : string) =>
            fetchData(`brand/${id}`,"DELETE"),

        onSuccess: () => {
            toast.success('Brand deleted successfully')
            queryClient.invalidateQueries({ queryKey: ["brand"] });
        },
    });
};

export {
    useGetAllBrandsList,
    useGetBrandsDetailsById,
    useDeleteBrands,
    useUpdateBrands,
    useCreateBrands,
    useGetBrandsFilteredByCategory,
};
