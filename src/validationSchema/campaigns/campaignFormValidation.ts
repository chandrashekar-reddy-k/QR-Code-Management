export const campaignFormValidation = {
  campaignName: {
    required: "Campaign name is required",
    minLength: {
      value: 2,
      message: "Campaign name must be at least 2 characters",
    },
    maxLength: {
      value: 100,
      message: "Campaign name cannot exceed 100 characters",
    },
  },
  promoCodes: {
    required: "Promo codes is required",
  },
  banners: {
    required: "Banners is required",
  },
  startDate: {
    required: "Start date is required",
  },
  endDate: {
    required: "End date is required",
  },
};
