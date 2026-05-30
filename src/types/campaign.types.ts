export interface Campaign {
  id: number;
  campaignName: string;
  promoCodes: string;
  banners: string;
  startDate: string;
  endDate: string;
  status: "active" | "inactive";
}

export interface CampaignFormValues {
  campaignName: string;
  promoCodes: string;
  banners: string;
  startDate: string;
  endDate: string;
}

export type CampaignQuery = {
  search: string;
  status: string;
  page: number;
  limit: number;
};

export type CampaignsApiResponse = {
  data?: {
    campaigns?: Campaign[];
  };
  pagination?: {
    total?: number;
    totalPages?: number;
  };
};
