// validations/partnerAuthValidation.js
import { checkSchema } from "express-validator";

/**
 * Validation rules for partner registration
 */
export const registerPartnerValidator = checkSchema({
  phone: {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "Phone number is required",
    },
    isString: {
      errorMessage: "Phone number must be a string",
    },
    isLength: {
      options: { min: 10, max: 15 },
      errorMessage: "Phone number must be between 10 and 15 characters",
    },
  },
  name: {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "Name is required",
    },
    isLength: {
      options: { min: 2, max: 100 },
      errorMessage: "Name must be between 2 and 100 characters",
    },
  },
  email: {
    in: ["body"],
    optional: true,
    trim: true,
    isEmail: {
      errorMessage: "Email must be a valid email address",
    },
  },
  password: {
    in: ["body"],
    optional: true,
    isLength: {
      options: { min: 6 },
      errorMessage: "Password must be at least 6 characters",
    },
  },
  avatar: {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "Avatar URL is required",
    },
    isURL: {
      errorMessage: "Avatar must be a valid URL",
    },
  },
  countryCode: {
    in: ["body"],
    optional: true,
    trim: true,
    isString: {
      errorMessage: "Country code must be a string",
    },
  },
  "address.line1": {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "Address line1 is required",
    },
  },
  "address.city": {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "Address city is required",
    },
  },
  "address.state": {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "Address state is required",
    },
  },
  "address.pincode": {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "Address pincode is required",
    },
    isLength: {
      options: { min: 6, max: 6 },
      errorMessage: "Pincode must be exactly 6 characters",
    },
  },
  "store.name": {
    in: ["body"],
    optional: true,
    trim: true,
    notEmpty: {
      errorMessage: "Store name cannot be empty",
    },
    isLength: {
      options: { min: 2, max: 100 },
      errorMessage: "Store name must be between 2 and 100 characters",
    },
  },
  "store.panNumber": {
    in: ["body"],
    optional: true,
    matches: {
      options: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      errorMessage: "Invalid PAN number format",
    },
  },
  "supplier.companyName": {
    in: ["body"],
    optional: true,
    trim: true,
    notEmpty: {
      errorMessage: "Company name cannot be empty",
    },
    isLength: {
      options: { min: 2, max: 200 },
      errorMessage: "Company name must be between 2 and 200 characters",
    },
  },
});

/**
 * Validation for login with email/phone and password
 */
export const loginWithPasswordValidator = checkSchema({
  email: {
    in: ["body"],
    optional: true,
    trim: true,
    isEmail: { errorMessage: "Email must be valid" },
  },
  phone: {
    in: ["body"],
    optional: true,
    trim: true,
    isString: { errorMessage: "Phone must be a string" },
    isLength: {
      options: { min: 10, max: 15 },
      errorMessage: "Phone must be 10-15 digits",
    },
  },
  password: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Password is required" },
    isLength: {
      options: { min: 6 },
      errorMessage: "Password must be at least 6 characters",
    },
  },
  deviceId: { in: ["body"], optional: true, trim: true },
  fcmToken: { in: ["body"], optional: true, trim: true },
});

// Custom: exactly one of email or phone required for login
export const loginWithPasswordCustomValidator = (req, res, next) => {
  const { email, phone } = req.body || {};
  const hasEmail = email && String(email).trim().length > 0;
  const hasPhone = phone && String(phone).trim().length > 0;
  if (!hasEmail && !hasPhone) {
    return res.status(400).json({
      status: false,
      response: "Either email or phone is required",
      data: null,
    });
  }
  if (hasEmail && hasPhone) {
    return res.status(400).json({
      status: false,
      response: "Provide either email or phone, not both",
      data: null,
    });
  }
  next();
};

/**
 * Validation for create new password (authenticated)
 */
export const createNewPasswordValidator = checkSchema({
  newPassword: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "New password is required" },
    isLength: {
      options: { min: 6 },
      errorMessage: "Password must be at least 6 characters",
    },
  },
  confirmNewPassword: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Confirm new password is required" },
  },
});

// Custom: newPassword and confirmNewPassword must match
export const createNewPasswordMatchValidator = (req, res, next) => {
  const { newPassword, confirmNewPassword } = req.body || {};
  if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
    return res.status(400).json({
      status: false,
      response: "New password and confirm new password do not match",
      data: null,
    });
  }
  next();
};

/**
 * Custom validator: emailOrPhone required (phone field removed)
 */
export const emailOrPhoneRequiredValidator = (req, res, next) => {
  const { emailOrPhone } = req.body || {};
  const hasEmailOrPhone =
    emailOrPhone && String(emailOrPhone).trim().length > 0;
  if (!hasEmailOrPhone) {
    return res.status(400).json({
      status: false,
      response: "emailOrPhone is required",
      data: null,
    });
  }
  next();
};

/**
 * Validation for send OTP (login / forgot password)
 * Body: { emailOrPhone: string }
 */
export const sendOtpValidator = checkSchema({
  emailOrPhone: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "emailOrPhone is required" },
    isString: { errorMessage: "emailOrPhone must be a string" },
    isLength: {
      options: { min: 5, max: 100 },
      errorMessage: "emailOrPhone must be 5-100 characters",
    },
  },
});

/**
 * Validation for verify OTP (login)
 * Body: { emailOrPhone: string, otp: string }
 */
export const verifyOtpValidator = checkSchema({
  emailOrPhone: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "emailOrPhone is required" },
    isString: { errorMessage: "emailOrPhone must be a string" },
    isLength: {
      options: { min: 5, max: 100 },
      errorMessage: "emailOrPhone must be 5-100 characters",
    },
  },
  otp: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "OTP is required" },
    isLength: {
      options: { min: 4, max: 6 },
      errorMessage: "OTP must be 4-6 digits",
    },
    isNumeric: { errorMessage: "OTP must contain only numbers" },
  },
  deviceId: { in: ["body"], optional: true, trim: true },
  fcmToken: { in: ["body"], optional: true, trim: true },
});

/**
 * Validation for refresh token
 */
export const refreshTokenValidator = checkSchema({
  refreshToken: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Refresh token is required" },
  },
});

/**
 * Validation for logout
 */
export const logoutValidator = checkSchema({
  refreshToken: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Refresh token is required" },
  },
});

/**
 * Validation for forgot password
 * Body: { emailOrPhone: string }
 */
export const forgotPasswordValidator = checkSchema({
  emailOrPhone: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "emailOrPhone is required" },
    isString: { errorMessage: "emailOrPhone must be a string" },
    isLength: {
      options: { min: 5, max: 100 },
      errorMessage: "emailOrPhone must be 5-100 characters",
    },
  },
});

/**
 * Validation for Step 2 – Verify OTP for password reset (returns resetToken)
 * Body: { emailOrPhone: string, otp: string }
 */
export const verifyResetOtpValidator = checkSchema({
  emailOrPhone: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "emailOrPhone is required" },
    isString: { errorMessage: "emailOrPhone must be a string" },
    isLength: {
      options: { min: 5, max: 100 },
      errorMessage: "emailOrPhone must be 5-100 characters",
    },
  },
  otp: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "OTP is required" },
    isLength: {
      options: { min: 4, max: 6 },
      errorMessage: "OTP must be 4-6 digits",
    },
    isNumeric: { errorMessage: "OTP must contain only numbers" },
  },
});

/**
 * Validation for Step 3 – Reset password (set new password with resetToken)
 * Body: { emailOrPhone: string, newPassword: string, confirmPassword: string, resetToken: string }
 */
export const resetPasswordValidator = checkSchema({
  emailOrPhone: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "emailOrPhone is required" },
    isString: { errorMessage: "emailOrPhone must be a string" },
    isLength: {
      options: { min: 5, max: 100 },
      errorMessage: "emailOrPhone must be 5-100 characters",
    },
  },
  newPassword: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "New password is required" },
    isLength: {
      options: { min: 6 },
      errorMessage: "Password must be at least 6 characters",
    },
  },
  confirmPassword: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Confirm password is required" },
  },
  resetToken: {
    in: ["body"],
    trim: true,
    notEmpty: { errorMessage: "Reset token is required" },
    isString: { errorMessage: "Reset token must be a string" },
  },
});

/** Custom: newPassword and confirmPassword must match (for reset-password). */
export const resetPasswordMatchValidator = (req, res, next) => {
  const { newPassword, confirmPassword } = req.body || {};
  if (
    newPassword &&
    confirmPassword &&
    newPassword !== confirmPassword
  ) {
    return res.status(400).json({
      status: false,
      response: "New password and confirm password do not match",
      data: null,
    });
  }
  next();
};
