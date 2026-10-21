import { useQuery } from "@tanstack/react-query";
import fetchData from "../helper";

export interface CustomerAddress {
  id: string;
  userId: string;
  label?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  isDefault?: boolean;
  addressType?: string;
  mandal?: string | null;
}

export interface CustomerUser {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  addresses?: CustomerAddress[];
}

export interface CustomersListResponse {
  status: boolean;
  response: string;
  data: CustomerUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const useGetCustomersList = (
  page: number,
  limit: number,
  search?: string,
  isActive?: boolean
) => {
  return useQuery<CustomersListResponse>({
    queryKey: ["customers-users", page, limit, search, isActive],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("role", "CONSUMER");
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search && search.trim()) {
        params.set("search", search.trim());
      }
      if (isActive !== undefined) {
        params.set("isActive", String(isActive));
      }
      return fetchData<CustomersListResponse>(
        `user/users-list?${params.toString()}`,
        "GET"
      );
    },
  });
};
