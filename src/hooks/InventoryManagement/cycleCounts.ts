import { useQuery } from "@tanstack/react-query";
import fetchData from "../../helper";

/* ---------- GET ALL CYCLE COUNTS ---------- */
const useGetAllCycleCountList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["cycleCount", page, limit], // updated queryKey to include pagination
    queryFn: () =>
      fetchData("inventorymanagement/cyclecount/", "GET", {
        page,
        limit,
      }),
  });
};

/* ---------- GET CYCLE COUNT BY ID ---------- */
const useGetCycleCountDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["cycleCountById", id], // updated queryKey
    queryFn: () => fetchData(`inventorymanagement/cyclecount/${id}`, "GET"),
    enabled: !!id, // only fetch if id exists
  });
};

export { useGetAllCycleCountList, useGetCycleCountDetailsById };
