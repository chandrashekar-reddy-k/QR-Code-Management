import { useQuery } from "@tanstack/react-query";
import fetchData from "../../helper";

/* ---------- GET ALL GOODS RECEIPTS ---------- */
const useGetAllGoodsReceiptList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["goodsReceipt", page, limit], // queryKey updated for caching per page/limit
    queryFn: () =>
      fetchData("inventorymanagement/grn/grn", "GET", {
        page,
        limit,
      }),
  });
};

/* ---------- GET GOODS RECEIPT BY ID ---------- */
const useGetGoodsReceiptDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["goodsReceiptById", id], // queryKey updated
    queryFn: () => fetchData(`inventorymanagement/grn/grn/${id}`, "GET"),
    enabled: !!id, // only fetch if id exists
  });
};

export { useGetAllGoodsReceiptList, useGetGoodsReceiptDetailsById };
