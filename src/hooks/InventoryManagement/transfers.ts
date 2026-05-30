import { useQuery } from "@tanstack/react-query";
import fetchData from "../../helper";

/* ---------- GET ALL TRANSFERS ---------- */
const useGetAllTransfersList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["transfer", page, limit], // update queryKey
    queryFn: () =>
      fetchData("inventorymanagement/inventory/transfers", "GET", {
        page,
        limit,
      }),
  });
};

/* ---------- GET TRANSFER BY ID ---------- */
const useGetTransferDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["transferById", id], // update queryKey
    queryFn: () =>
      fetchData(`inventorymanagement/inventory/transfers/${id}`, "GET"),
    enabled: !!id,
  });
};

export { useGetAllTransfersList, useGetTransferDetailsById };
