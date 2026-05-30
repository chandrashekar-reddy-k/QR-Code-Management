import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

/** Single list: isActive optional. true = active only, false = inactive only. */
const useGetAllCategoryList = (page: number, limit: number, isActive?: boolean) => {
    const queryKey = ["category", page, limit, isActive];
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (isActive !== undefined) params.set("isActive", String(isActive));
    return useQuery({
        queryKey,
        queryFn: () =>
            fetchData(`category/getCategoryList?${params.toString()}`, "GET"),
    });
};

/** For /categories/manage: fetches both active and inactive, merges to show all. */
const useGetAllCategoriesForManage = (page: number, limit: number) => {
    const active = useGetAllCategoryList(1, 1000, true);
    const inactive = useGetAllCategoryList(1, 1000, false);
    const isLoading = active.isLoading || inactive.isLoading;
    const isFetching = active.isFetching || inactive.isFetching;
    const merged = useMemo(() => {
        const a = (active.data as any)?.data?.categories ?? [];
        const b = (inactive.data as any)?.data?.categories ?? [];
        const categories = [...a, ...b];
        const stats = {
            total: categories.length,
            active: a.length,
            inactive: b.length,
        };
        const start = (page - 1) * limit;
        const paginated = categories.slice(start, start + limit);
        return {
            status: true,
            response: "Categories fetched successfully",
            data: { stats, categories: paginated },
            pagination: {
                page,
                limit,
                total: categories.length,
                totalPages: Math.max(1, Math.ceil(categories.length / limit)),
                hasNext: start + limit < categories.length,
                hasPrev: page > 1,
            },
        };
    }, [active.data, inactive.data, page, limit]);
    return {
        data: merged,
        isLoading,
        isFetching,
        refetch: () => {
            active.refetch();
            inactive.refetch();
        },
    };
};

/** For product create Category dropdown: active categories only. */
const useGetActiveCategoriesList = () => {
    return useQuery({
        queryKey: ["category", "active", 1, 1000],
        queryFn: () =>
            fetchData("category/getCategoryList?page=1&limit=1000&isActive=true", "GET"),
    });
};

/** Merged active + inactive for lookup (e.g. ViewProduct). Same shape as single list. */
const useGetAllCategoriesMerged = () => {
    const active = useGetAllCategoryList(1, 1000, true);
    const inactive = useGetAllCategoryList(1, 1000, false);
    const isLoading = active.isLoading || inactive.isLoading;
    const merged = useMemo(() => {
        const a = (active.data as any)?.data?.categories ?? [];
        const b = (inactive.data as any)?.data?.categories ?? [];
        return {
            status: true,
            response: "Categories fetched successfully",
            data: { categories: [...a, ...b], stats: { total: a.length + b.length, active: a.length, inactive: b.length } },
        };
    }, [active.data, inactive.data]);
    return { data: merged, isLoading, refetch: () => { active.refetch(); inactive.refetch(); } };
};

const useGetCategoryDetailsById = (id : string) => {
    return useQuery({
        queryKey: ["categoryById"],
        queryFn: () =>
            fetchData(`category/${id}`,"GET", {
                page: 1,
                limit: 20,
            }),

        enabled : !!id
    });
};

interface createCategoryResponse {
    status : boolean,
    response : string,
    data : object
}
const useCreateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData("category/createCategory", "POST", payload),

        onSuccess: (data:createCategoryResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["category"] });
        },
    });
};

const useUpdateCategory = (id : string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData(`category/${id}`,"PATCH", payload),

        onSuccess: (data:createCategoryResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["category"] });
        },
    });
};

const useDeleteCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id : string) =>
            fetchData(`category/${id}`,"DELETE"),

        onSuccess: () => {
            toast.success('Category deleted successfully')
            queryClient.invalidateQueries({ queryKey: ["category"] });
        },
    });
};

/** Toggle category active/inactive: PATCH {{baseUrl}}/api/v1/category/{id} with body { isActive }. Toast is shown by the caller (ManageCategories) so the correct "Status updated to Active/Inactive" message is always displayed. */
const useToggleCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            fetchData(`category/${id}`, "PATCH", { isActive }),
        onSuccess: (_data: createCategoryResponse) => {
            queryClient.invalidateQueries({ queryKey: ["category"] });
        },
        onError: (err: any) => {
            toast.error(err?.message ?? "Failed to update category status");
        },
    });
};

/** Get categories and subcategories for Business Settings: GET partner/categories/catandsubcat */
const useGetCategoriesAndSubCategories = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ["categoriesAndSubCategories"],
        queryFn: () => fetchData("partner/categories/catandsubcat", "GET"),
        retry: false,
        enabled: options?.enabled ?? true,
        // Avoid duplicate refetches on tab focus / remount that can race with backend
        refetchOnWindowFocus: false,
    });
};

/** Add categories and subcategories for Business Settings: POST partner/categories/catandsubcat/add */
interface AddCategoriesPayload {
    categories: Array<{
        categoryId: string;
        subCategoryIds: string[];
    }>;
}

const useAddCategoriesAndSubCategories = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: AddCategoriesPayload) =>
            fetchData("partner/categories/catandsubcat/add", "POST", payload),

        onSuccess: (data: createCategoryResponse) => {
            toast.success(data.response || "Categories added successfully");
            queryClient.invalidateQueries({ queryKey: ["categoriesAndSubCategories"] });
            queryClient.invalidateQueries({ queryKey: ["warehouseCategories"] });
        },
        onError: (error: any) => {
            toast.error(error?.message || error?.response || "Failed to add categories");
        },
    });
};

/** Get warehouse categories for Business Settings: GET partner/categories/warehouse/catandsubcat */
const useGetWarehouseCategories = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ["warehouseCategories"],
        queryFn: () => fetchData("partner/categories/warehouse/catandsubcat", "GET"),
        retry: false,
        enabled: options?.enabled ?? true,
        refetchOnWindowFocus: false,
    });
};

/** Edit warehouse categories for Business Settings: POST partner/categories/warehouse/catandsubcat */
interface EditWarehouseCategoriesPayload {
    categories: Array<{
        categoryId: string;
        subCategoryIds: string[];
    }>;
}

const useEditWarehouseCategories = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: EditWarehouseCategoriesPayload) =>
            fetchData("partner/categories/warehouse/catandsubcat", "PUT", payload),

        onSuccess: (data: createCategoryResponse) => {
            toast.success(data.response || "Categories updated successfully");
            queryClient.invalidateQueries({ queryKey: ["warehouseCategories"] });
            queryClient.invalidateQueries({ queryKey: ["categoriesAndSubCategories"] });
        },
        onError: (error: any) => {
            toast.error(error?.message || error?.response || "Failed to update categories");
        },
    });
};

export {
    useGetAllCategoryList,
    useGetAllCategoriesForManage,
    useGetActiveCategoriesList,
    useGetAllCategoriesMerged,
    useCreateCategory,
    useGetCategoryDetailsById,
    useUpdateCategory,
    useDeleteCategory,
    useToggleCategory,
    useGetCategoriesAndSubCategories,
    useAddCategoriesAndSubCategories,
    useGetWarehouseCategories,
    useEditWarehouseCategories,
};
