import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllCountryList = (page: number, limit: number) => {
    return useQuery({
        queryKey: ["country", page, limit],
        queryFn: () =>
            fetchData(`countries/getCountryList?page=${page}&limit=${limit}`, "GET"),
    });
};

const useGetCountryDetailsById = (id: string) => {
    return useQuery({
        queryKey: ["countryById",id],
        queryFn: () =>
            fetchData(`countries/${id}`, "GET", {
                page: 1,
                limit: 20,
            }),

        enabled: !!id
    });
};

interface createCountryResponse {
    status: boolean,
    response: string,
    data: object
}

const useCreateCountry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData("countries/createCountry", "POST", payload),

        onSuccess: (data: createCountryResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["country"] });
        },
    });
};

const useUpdateCountry = (id: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData(`countries/${id}`, "PATCH", payload),

        onSuccess: (data: createCountryResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["country"] });
        },
    });
};

const useDeleteCountry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            fetchData(`countries/${id}`, "DELETE"),

        onSuccess: () => {
            toast.success('Country deleted successfully')
            queryClient.invalidateQueries({ queryKey: ["country"] });
        },
    });
};

export {
    useGetAllCountryList,
    useCreateCountry,
    useGetCountryDetailsById,
    useUpdateCountry,
    useDeleteCountry
};
