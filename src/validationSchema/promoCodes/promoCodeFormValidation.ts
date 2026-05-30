export const promoCodeFormValidation = {
  codeName: {
    required: "Code name is required",
    minLength: {
      value: 2,
      message: "Code name must be at least 2 characters",
    },
    maxLength: {
      value: 50,
      message: "Code name cannot exceed 50 characters",
    },
  },

  discountType: {
    required: "Discount type is required",
  },

  minimumOrderValue: {
    required: "Minimum order value is required",
    pattern: {
      value: /^[0-9]+$/,
      message: "Minimum order value must be a number",
    },
    min: {
      value: 1,
      message: "Minimum order value must be at least 1",
    },
    max: {
      value: 100000,
      message: "Minimum order value cannot exceed 100000",
    },
  },

  maximumDiscount: {
    pattern: {
      value: /^[0-9]*$/,
      message: "Maximum discount must be a number",
    },
    min: {
      value: 0,
      message: "Maximum discount cannot be negative",
    },
    max: {
      value: 100000,
      message: "Maximum discount cannot exceed 100000",
    },
  },

  startDate: {
    required: "Start date is required",
  },

  startTime: {
    required: "Start time is required",
  },

  endDate: {
    required: "End date is required",
  },

  endTime: {
    required: "End time is required",
  },

  usageLimit: {
    required: "Usage limit is required",
  },
};
