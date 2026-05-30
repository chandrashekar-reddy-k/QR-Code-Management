import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllStateList = (page:number,limit:number) => {
    return useQuery({
        queryKey: ["state"],
        queryFn: () =>
            fetchData("state/getStateList", "GET", {
                page: page,
                limit: limit,
            }),
    });
};

const useGetStateDetailsById = (id : string) => {
    return useQuery({
        queryKey: ["stateById",,id],
        queryFn: () =>
            fetchData(`state/${id}`,"GET", {
                page: 1,
                limit: 20,
            }),

        enabled : !!id
    });
};

interface createStateResponse {
    status : boolean,
    response : string,
    data : object
}
const useCreateState = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData("state/createState", "POST", payload),

        onSuccess: (data:createStateResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["state"] });
        },
    });
};

const useUpdateState = (id : string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) =>
            fetchData(`state/${id}`,"PATCH", payload),

        onSuccess: (data:createStateResponse) => {
            toast.success(data.response)
            queryClient.invalidateQueries({ queryKey: ["state"] });
        },
    });
};

const useDeleteState = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id : string) =>
            fetchData(`state/${id}`,"DELETE"),

        onSuccess: () => {
            toast.success('State deleted successfully')
            queryClient.invalidateQueries({ queryKey: ["state"] });
        },
    });
};

export { useGetAllStateList, useCreateState, useGetStateDetailsById,useUpdateState ,useDeleteState};
