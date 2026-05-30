export const bannerFormValidation = {
  bannerTitle: {
    required: "Banner title is required",
    minLength: {
      value: 2,
      message: "Banner title must be at least 2 characters",
    },
    maxLength: {
      value: 100,
      message: "Banner title cannot exceed 100 characters",
    },
  },
  bannerType: {
    required: "Banner type is required",
  },
  position: {
    required: "Position is required",
  },
  whereToShow: {
    required: "Where to show is required",
  },
  startDate: {
    required: "Start date is required",
  },
  endDate: {
    required: "End date is required",
  },
};

