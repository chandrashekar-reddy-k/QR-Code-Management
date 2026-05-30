import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

/** List with optional isActive: true = active only, false = inactive only, undefined = omit param (backend may return all). */
const useGetAllSubCategoryList = (page: number, limit: number, isActive?: boolean) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (isActive !== undefined) params.set("isActive", String(isActive));
    return useQuery({
        queryKey: ["subCategory", page, limit, isActive],
        queryFn: () =>
            fetchData(`subCategory/getSubCategoryList?${params.toString()}`, "GET"),
    });
};

/** For product create Sub-Category dropdown: active sub-categories only. */
const useGetActiveSubCategoryList = () => {
    return useQuery({
        queryKey: ["subCategory", "active", 1, 1000],
        queryFn: () =>
            fetchData("subCategory/getSubCategoryList?page=1&limit=1000&isActive=true", "GET"),
    });
};

/** For /categories/sub-categories: show both active and inactive (merged, client-side pagination). */
const useGetAllSubCategoriesForManage = (page: number, limit: number) => {
    const active = useGetAllSubCategoryList(1, 10000, true);
    const inactive = useGetAllSubCategoryList(1, 10000, false);
    const isLoading = active.isLoading || inactive.isLoading;
    const isFetching = active.isFetching || inactive.isFetching;
    const merged = useMemo(() => {
        const a = (active.data as any)?.data?.subCategories ?? [];
        const b = (inactive.data as any)?.data?.subCategories ?? [];
        const subCategories = [...a, ...b];
        const stats = {
            total: subCategories.length,
            active: a.length,
            inactive: b.length,
        };
        const start = (page - 1) * limit;
        const paginated = subCategories.slice(start, start + limit);
        return {
            status: true,
            response: "SubCategories fetched successfully",
            data: { stats, subCategories: paginated },
            pagination: {
                page,
                limit,
                total: subCategories.length,
                totalPages: Math.max(1, Math.ceil(subCategories.length / limit)),
                hasNext: start + limit < subCategories.length,
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

const useGetSubCategoryDetailsById = (id : string) => {
    return useQuery({
        queryKey: ["subCategoryById"],
        queryFn: () =>
            fetchData(`subCategory/${id}`,"GET", {
                page: 1,
                limit: 20,
            }),

        enabled : !!id
    });
};

interface createSubCategoryResponse {
    status : boolean,
    response : string,
    data : object
}
const useSubCreateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData("subCategory/createSubCategory", "POST", payload),

        onSuccess: (data:createSubCategoryResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["subCategory"] });
        },
    });
};

const useUpdateSubCategory = (id : string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData(`subCategory/${id}`,"PATCH", payload),

        onSuccess: (data:createSubCategoryResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["subCategory"] });
        },
    });
};

const useDeleteSubCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id : string) =>
            fetchData(`subCategory/${id}`,"DELETE"),

        onSuccess: () => {
            toast.success('Sub-Category deleted successfully')
            queryClient.invalidateQueries({ queryKey: ["subCategory"] });
        },
    });
};

/** Toggle sub-category active/inactive: PATCH {{baseUrl}}/api/v1/subCategory/toggle/{id}. Pass newStatus for toast message. */
const useToggleSubCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id }: { id: string; newStatus: "active" | "inactive" }) =>
            fetchData(`subCategory/toggle/${id}`, "PATCH"),
        onSuccess: (_data: createSubCategoryResponse, variables: { id: string; newStatus: "active" | "inactive" }) => {
            const message = variables.newStatus === "active" ? "Status updated to Active" : "Status updated to Inactive";
            toast.success(message);
            queryClient.invalidateQueries({ queryKey: ["subCategory"] });
        },
        onError: (err: any) => {
            toast.error(err?.message ?? "Failed to update sub-category status");
        },
    });
};

export {
    useGetAllSubCategoryList,
    useGetActiveSubCategoryList,
    useGetAllSubCategoriesForManage,
    useSubCreateCategory,
    useGetSubCategoryDetailsById,
    useUpdateSubCategory,
    useDeleteSubCategory,
    useToggleSubCategory,
};
