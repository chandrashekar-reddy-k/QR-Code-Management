import { useQuery } from "@tanstack/react-query";
import fetchData from "../helper";

interface RefundsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  orderId?: string;
  queue?: string;
}

export const useGetPartnerRefunds = (params: RefundsParams) => {
  return useQuery({
    queryKey: ["partnerRefunds", params],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.append("page", params.page.toString());
      queryParams.append("limit", params.limit.toString());
      if (params.search) queryParams.append("search", params.search);
      if (params.status) queryParams.append("status", params.status);
      if (params.orderId) queryParams.append("orderId", params.orderId);
      if (params.queue) queryParams.append("queue", params.queue);

      const endpoint = `partner/refunds?${queryParams.toString()}`;
      return fetchData<any>(endpoint, "GET");
    },
  });
};

export const useGetPartnerRefundStats = () => {
  return useQuery({
    queryKey: ["partnerRefundStats"],
    queryFn: () => {
      return fetchData<any>(`partner/refunds/stats`, "GET");
    },
  });
};
