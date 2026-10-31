// routes/partnerAuthRoutes.js
import express from "express";
import {
  registerPartner,
  loginWithPassword,
  createNewPassword,
  sendLoginOtp,
  verifyLoginOtp,
  resendLoginOtp,
  refreshAccessToken,
  logoutPartner,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/partnerAuthController.js";
import {
  sendSecurityOtp,
  verifySecurityOtp,
  getSecurityLogs,
} from "../controllers/securityController.js";
import {
  registerPartnerValidator,
  loginWithPasswordValidator,
  loginWithPasswordCustomValidator,
  createNewPasswordValidator,
  createNewPasswordMatchValidator,
  emailOrPhoneRequiredValidator,
  sendOtpValidator,
  verifyOtpValidator,
  refreshTokenValidator,
  logoutValidator,
  forgotPasswordValidator,
  verifyResetOtpValidator,
  resetPasswordValidator,
  resetPasswordMatchValidator,
} from "../validations/partnerAuthValidation.js";
import { validationResult } from "express-validator";
import { validationErrorResponse } from "../utils/responseHelper.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requirePartner } from "../middlewares/partnerMiddleware.js";

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors);
  }
  next();
};

/**
 * Partner Registration
 * POST /api/v1/partner/auth/register
 * Returns: user, store, supplier, accessToken, refreshToken
 */
router.post("/register", registerPartnerValidator, validate, registerPartner);

/**
 * Partner Login - Email/Phone + Password
 * POST /api/v1/partner/auth/login
 * Body: { email?: string, phone?: string, password: string }
 */
router.post(
  "/login",
  loginWithPasswordCustomValidator,
  loginWithPasswordValidator,
  validate,
  loginWithPassword,
);

/**
 * Create New Password (for approved partner - first-time setup)
 * POST /api/v1/partner/auth/create-password
 * Requires: Bearer token (partner logged in via OTP)
 * Body: { newPassword: string, confirmNewPassword: string }
 */
router.post(
  "/create-password",
  createNewPasswordValidator,
  createNewPasswordMatchValidator,
  validate,
  createNewPassword,
);

/**
 * Partner Login - Send OTP
 * POST /api/v1/partner/auth/send-otp
 * Body: { emailOrPhone: string }
 */
router.post(
  "/send-otp",
  emailOrPhoneRequiredValidator,
  sendOtpValidator,
  validate,
  sendLoginOtp,
);

/**
 * Partner Login - Verify OTP
 * POST /api/v1/partner/auth/verify-otp
 * Body: { emailOrPhone: string, otp: string }
 */
router.post(
  "/verify-otp",
  emailOrPhoneRequiredValidator,
  verifyOtpValidator,
  validate,
  verifyLoginOtp,
);

/**
 * Partner Login - Resend OTP
 * POST /api/v1/partner/auth/resend-otp
 * Body: { emailOrPhone: string }
 */
router.post(
  "/resend-otp",
  emailOrPhoneRequiredValidator,
  sendOtpValidator,
  validate,
  resendLoginOtp,
);

/**
 * Refresh access token
 * POST /api/v1/partner/auth/refresh-token
 */
router.post(
  "/refresh-token",
  refreshTokenValidator,
  validate,
  refreshAccessToken,
);

/**
 * Logout (invalidate refresh token)
 * POST /api/v1/partner/auth/logout
 */
router.post("/logout", logoutValidator, validate, logoutPartner);

/**
 * Password Reset – Step 1: Request OTP
 * POST /api/v1/partner/auth/forgot-password
 * Body: { emailOrPhone: string }
 */
router.post(
  "/forgot-password",
  emailOrPhoneRequiredValidator,
  forgotPasswordValidator,
  validate,
  forgotPassword,
);

/**
 * Password Reset – Step 2: Verify OTP (returns resetToken; frontend stores and navigates to New Password)
 * POST /api/v1/partner/auth/verify-reset-otp
 * Body: { emailOrPhone: string, otp: string }
 */
router.post(
  "/verify-reset-otp",
  emailOrPhoneRequiredValidator,
  verifyResetOtpValidator,
  validate,
  verifyResetOtp,
);

/**
 * Password Reset – Step 3: Set new password (then redirect to Login)
 * POST /api/v1/partner/auth/reset-password
 * Body: { emailOrPhone: string, newPassword: string, confirmPassword: string, resetToken: string }
 */
router.post(
  "/reset-password",
  emailOrPhoneRequiredValidator,
  resetPasswordValidator,
  resetPasswordMatchValidator,
  validate,
  resetPassword,
);

import { updateFcmToken } from "../controllers/fcmTokenController.js";

/**
 * Register / Update FCM Token for push notifications
 * POST /api/v1/partner/auth/fcm-token
 */
router.post("/fcm-token", authMiddleware, updateFcmToken);
router.post("/security/send-otp", sendSecurityOtp);
router.post("/security/verify-otp", verifySecurityOtp);
router.get("/security/logs", getSecurityLogs);

export default router;
