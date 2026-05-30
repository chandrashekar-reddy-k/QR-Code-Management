import {  useQuery } from "@tanstack/react-query";
import fetchData from "../../helper";


/* ---------- GET ALL INVENTORY ALERTS ---------- */
const useGetAllInventoryAlerts = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["inventoryAlerts"],
    queryFn: () =>
      fetchData(
        "inventorymanagement/alerts/alerts",
        "GET",
        {
          page: page,
          limit: limit,
        }
      ),
  });
};

/* ---------- GET ALERTS SUMMARY ---------- */
const useGetInventoryAlertsSummary = () => {
  return useQuery({
    queryKey: ["inventoryAlertsSummary"],
    queryFn: () =>
      fetchData(
        "alerts/alerts/summary",
        "GET"
      ),
  });
};

/* ---------- GET ALERTS BY PRODUCT ---------- */
const useGetInventoryAlertsByProduct = (productId: string) => {
  return useQuery({
    queryKey: ["inventoryAlertsByProduct", productId],
    queryFn: () =>
      fetchData(
        `inventorymanagement/alerts/alerts/${productId}`,
        "GET"
      ),

    enabled: !!productId,
  });
};

export {
  useGetAllInventoryAlerts,
  useGetInventoryAlertsSummary,
  useGetInventoryAlertsByProduct,
};
