import * as yup from "yup";

// Tighter limits to avoid excessively long input
export const MAX_EMAIL_LENGTH = 100;
export const MAX_PASSWORD_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 6;

// Yup validation schema for Login
export const loginSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .max(MAX_EMAIL_LENGTH, `Email should not exceed ${MAX_EMAIL_LENGTH} characters`)
    .email("Please enter a valid email address")
    .trim(),
  password: yup
    .string()
    .required("Password is required")
    .max(MAX_PASSWORD_LENGTH, `Password should not exceed ${MAX_PASSWORD_LENGTH} characters`)
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

export type LoginFormData = yup.InferType<typeof loginSchema>;

// Yup validation schema for Forgot Password
export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .max(MAX_EMAIL_LENGTH, `Email should not exceed ${MAX_EMAIL_LENGTH} characters`)
    .email("Please enter a valid email address")
    .trim(),
});

export type ForgotPasswordFormData = yup.InferType<typeof forgotPasswordSchema>;

// Yup validation schema for Reset Password
export const resetPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required("New password is required")
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, `Password should not exceed ${MAX_PASSWORD_LENGTH} characters`),
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("newPassword")], "Passwords must match"),
});

export type ResetPasswordFormData = yup.InferType<typeof resetPasswordSchema>;

// Yup validation schema for Create Password (separate confirm field name)
export const createPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required("New password is required")
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, `Password should not exceed ${MAX_PASSWORD_LENGTH} characters`),
  confirmNewPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("newPassword")], "Passwords must match"),
});

export type CreatePasswordFormData = yup.InferType<typeof createPasswordSchema>;