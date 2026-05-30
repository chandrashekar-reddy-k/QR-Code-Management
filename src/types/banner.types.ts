export interface Banner {
  id: number;
  bannerName?: string;
  title?: string;
  bannerType?: string;
  image?: string;
  imageUrl?: string;
  whereToShow?: string;
  position: number;
  startDate?: string;
  endDate?: string;
  startAt?: string;
  endAt?: string;
  status?: "active" | "inactive" | "ACTIVE" | "INACTIVE";
  createdAt?: string;
  subtitle?: string;
  redirectUrl?: string;
  isActive?: boolean;
}

export interface BannersQuery {
  search: string;
  status: string;
  isActive: string;
  bannerType: string;
  page: number;
  limit: number;
}

export interface BannersApiResponse {
  data?: {
    banners?: Banner[];
  };
  pagination?: {
    total?: number;
    totalPages?: number;
  };
}

export interface BannerFormValues {
  bannerTitle: string;
  bannerType: string;
  position: string;
  whereToShow: string;
  startDate: string;
  endDate: string;
}
