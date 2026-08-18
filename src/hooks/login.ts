import { useMutation } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";
import { URL_AGENT } from "../config";

export interface User {
  id: string;
  phone: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  store: unknown | null;
  supplier: unknown | null;
  isCreatedPassword: boolean;
}

export interface LoginResponse {
  status: boolean;
  response: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

interface LoginPayload {
  identifier: string;
  password: string;
}

interface ErrorResponse {
  message: string;
  status?: number;
  data?: unknown;
  response?: string;
}

type ApiError =
  | ErrorResponse
  | { message?: string; response?: string; data?: { response?: string } };

const useLogin = (onSuccess: (data: LoginResponse) => void) => {
  return useMutation<LoginResponse, ErrorResponse, LoginPayload>({
    mutationFn: (payload: LoginPayload) => {
      const baseUrl = (import.meta.env.VITE_IDENTITY_SERVICE_URL || "http://localhost:4000").replace(/\/+$/, '');
      const identityServiceUrl = `${baseUrl}/api/v1/auth/login`;
      return fetch(identityServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifier: payload.identifier,
          password: payload.password,
          portal: "partner"
        })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Login failed");
        }
        return {
          status: true,
          response: data.message || "Success",
          data: {
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            expiresIn: "24h",
            user: {
              id: data.data.user?.id,
              phone: data.data.user?.phone || "",
              name: data.data.user?.name || "",
              email: data.data.user?.email || "",
              role: data.data.user?.roles?.[0] || data.data.user?.role || "PARTNER",
              avatar: data.data.user?.avatar || null,
              store: null,
              supplier: null,
              isCreatedPassword: data.data.user?.mustChangePassword === true
            }
          }
        } as LoginResponse;
      });
    },

    onSuccess: async (data: LoginResponse) => {
      const user = data.data.user;
      const anyUser = user as any;

      // Only persist tokens for users who should go to dashboard (password already created is FALSE)
      if (!user.isCreatedPassword) {
        let permissions: string[] = [];
        try {
          const identityBase = (import.meta.env.VITE_IDENTITY_SERVICE_URL || 'https://identity.villagkart.com').replace(/\/+$/, '');
          const meRes = await fetch(`${identityBase}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${data.data.accessToken}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            const livePerms = meData.data?.flatPermissions || meData.data?.permissions || meData.data?.user?.permissions;
            if (Array.isArray(livePerms)) {
              permissions = livePerms;
            } else if (livePerms && typeof livePerms === 'object') {
              permissions = (Object.values(livePerms) as string[][]).flat();
            }
          }
        } catch (err) {
          console.error("Failed to pre-fetch permissions from /me endpoint:", err);
        }

        // If /me fetch failed or returned no permissions, fall back to decoding JWT
        if (permissions.length === 0) {
          try {
            const base64Url = data.data.accessToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            permissions = decoded.permissions || [];
          } catch (err) {
            console.error("Failed to decode token:", err);
          }
        }

        const role = (user.role || "").toUpperCase();

        // Block admin/super-admin accounts by role — they should use the Admin Portal,
        // not the Partner Portal, regardless of what permissions they carry.
        const isAdminRole = ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"].includes(role);
        if (isAdminRole) {
          toast.error("Invalid Login");
          return;
        }

        // Also block users who have ONLY admin permissions and no partner/agent/shopkeeper permissions
        const hasPartner = permissions.some((p: string) => p.startsWith("partner_") && !p.startsWith("partner_shopkeeper_erp_"));
        const hasAgent = permissions.some((p: string) => p.startsWith("vsms_agent_"));
        const hasShopkeeper = permissions.some((p: string) => p.startsWith("shopkeeper_") || p.startsWith("partner_shopkeeper_erp_"));
        const hasAdminPerms = permissions.some((p: string) => p.startsWith("admin_"));
        if (hasAdminPerms && !hasPartner && !hasAgent && !hasShopkeeper) {
          toast.error("Invalid Credentials");
          return;
        }

        localStorage.setItem("token", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem('permissions', JSON.stringify(permissions));

        const isStaffRole = (hasShopkeeper && !hasPartner) || ['WAREHOUSE_STAFF', 'REGIONAL_ADMIN', 'OPERATIONAL_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'VEHICLE_AGENT', 'DELIVERY_AGENT', 'SALES_AGENT', 'VSMS_AGENT', 'PACKING_OPERATOR', 'PACKER_OPERATOR', 'OPERATOR', 'PACKER', 'PACKING_QC', 'PACKER_QC', 'QC_INSPECTOR'].includes(user.role?.toUpperCase());
        if (isStaffRole) {
          sessionStorage.setItem("staffToken", data.data.accessToken);
          sessionStorage.setItem("staffRefreshToken", data.data.refreshToken);
          sessionStorage.setItem("staffUser", JSON.stringify(user));
          sessionStorage.setItem("staffRole", user.role);
          if (anyUser.store?.id || anyUser.warehouseId || anyUser.warehouse_id) {
            sessionStorage.setItem("staffWarehouseId", anyUser.store?.id || anyUser.warehouseId || anyUser.warehouse_id || "");
          }
          // Also set partner fields as fallback
          localStorage.setItem("partnerToken", data.data.accessToken);
          localStorage.setItem("partnerRefreshToken", data.data.refreshToken);
          localStorage.setItem("partnerUser", JSON.stringify(user));
          localStorage.setItem("partnerRole", user.role);
          if (anyUser.store?.id || anyUser.warehouseId || anyUser.warehouse_id) {
            localStorage.setItem("partnerWarehouseId", anyUser.store?.id || anyUser.warehouseId || anyUser.warehouse_id || "");
          }
        } else {
          localStorage.setItem("partnerToken", data.data.accessToken);
          localStorage.setItem("partnerRefreshToken", data.data.refreshToken);
          localStorage.setItem("partnerUser", JSON.stringify(user));
          localStorage.setItem("partnerRole", user.role);
          if (anyUser.store?.id || anyUser.warehouseId || anyUser.warehouse_id) {
            localStorage.setItem("partnerWarehouseId", anyUser.store?.id || anyUser.warehouseId || anyUser.warehouse_id || "");
          }
        }
      }

      onSuccess(data);
      toast.success(data.response);
    },
    onError: (error: ApiError) => {
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Login failed";
      toast.error(errorMessage);
    },
  });
};

interface AgentLoginPayload {
  mobile: string;
  password: string;
}

export const useAgentLogin = (onSuccess: (data: LoginResponse) => void) => {
  return useMutation<LoginResponse, ErrorResponse, AgentLoginPayload>({
    mutationFn: async (payload: AgentLoginPayload) => {
      const response = await fetch(`${URL_AGENT.replace(/\/$/, "")}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let apiData;
      try {
        apiData = await response.json();
      } catch (e) {
        throw { message: "Network error. Please check your connection." } as ErrorResponse;
      }

      if (!response.ok) {
        throw apiData as ErrorResponse;
      }

      // Decode permissions dynamically from the token to determine if they belong in the VSMS Agent portal
      let isAgent = false;
      try {
        const base64Url = apiData.token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        const userPermissions = decoded.permissions || [];
        isAgent = userPermissions.some((p: string) => p.startsWith("vsms_agent_"));
      } catch (err) {
        console.error("Agent login permission decoder error:", err);
      }

      if (!isAgent && apiData.role !== "VEHICLE_AGENT" && apiData.role !== "DELIVERY_AGENT") {
        throw { message: "This login is exclusively for VSMS Agents." } as ErrorResponse;
      }

      // Map the VSMS Agent API response format to the Partner Web LoginResponse format
      const formattedData: LoginResponse = {
        status: true,
        response: "Agent logged in successfully",
        data: {
          user: {
            id: apiData.id,
            name: apiData.name,
            phone: apiData.mobile,
            email: apiData.email || "",
            role: apiData.role,
            avatar: apiData.avatar || null,
            isCreatedPassword: false, // Bypass create password screen
            store: apiData.storeId ? { id: apiData.storeId } : null,
            supplier: null,
          },
          accessToken: apiData.token,
          refreshToken: apiData.token,
          expiresIn: "3600",
        }
      };

      return formattedData;
    },
    onSuccess: (data: LoginResponse) => {
      const user = data.data.user;
      const anyUser = user as any;

      if (!user.isCreatedPassword) {
        sessionStorage.setItem("staffToken", data.data.accessToken);
        sessionStorage.setItem("staffRefreshToken", data.data.refreshToken);
        sessionStorage.setItem("staffUser", JSON.stringify(user));
        sessionStorage.setItem("staffRole", user.role);
        if (anyUser.store?.id) {
          sessionStorage.setItem("staffWarehouseId", anyUser.store.id);
        }
        localStorage.setItem("token", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("role", user.role);
        try {
          const base64Url = data.data.accessToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const decoded = JSON.parse(jsonPayload);
          if (decoded.permissions) {
            localStorage.setItem('permissions', JSON.stringify(decoded.permissions));
          } else {
            localStorage.setItem('permissions', JSON.stringify([]));
          }
        } catch (err) {
          console.error("Failed to parse token permissions:", err);
          localStorage.setItem('permissions', JSON.stringify([]));
        }
      }

      onSuccess(data);

      toast.success(data.response || "Agent logged in successfully");
    },
    onError: (error: ErrorResponse) => {
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Agent Login failed";
      toast.error(errorMessage);
    },
  });
};

interface ForgotPasswordPayload {
  emailOrPhone: string;
}

interface ForgotPasswordResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useForgotPassword = (
  onSuccess?: (data: ForgotPasswordResponse) => void,
) => {
  return useMutation<
    ForgotPasswordResponse,
    ErrorResponse,
    ForgotPasswordPayload
  >({
    mutationFn: (payload: ForgotPasswordPayload) =>
      fetchData<ForgotPasswordResponse>(
        `partner/auth/forgot-password`,
        "POST",
        payload,
      ),

    onSuccess: (data: ForgotPasswordResponse) => {
      if (onSuccess) {
        onSuccess(data);
      }
      toast.success(
        data.response || "Password reset link has been sent to your email.",
      );
    },
    onError: (error: ApiError) => {
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Failed to send password reset link. Please try again.";
      toast.error(errorMessage);
    },
  });
};

interface VerifyOtpPayload {
  emailOrPhone: string;
  otp: string;
  deviceId: string;
  fcmToken?: string;
}

interface VerifyOtpResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useVerifyOtp = (onSuccess?: (data: VerifyOtpResponse) => void) => {
  return useMutation<VerifyOtpResponse, ErrorResponse, VerifyOtpPayload>({
    mutationFn: (payload: VerifyOtpPayload) =>
      fetchData<VerifyOtpResponse>(`partner/auth/verify-otp`, "POST", payload),

    onSuccess: (data: VerifyOtpResponse) => {
      if (onSuccess) {
        onSuccess(data);
      }
      toast.success(data.response || "OTP verified successfully!");
    },
    onError: (error: ApiError) => {
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Invalid OTP. Please try again.";
      toast.error(errorMessage);
    },
  });
};

interface VerifyResetOtpPayload {
  emailOrPhone: string;
  otp: string;
}

interface VerifyResetOtpResponse {
  status: boolean;
  response: string;
  data?: {
    resetToken: string;
    emailOrPhone?: string;
    [key: string]: unknown;
  };
}

const useVerifyResetOtp = (
  onSuccess?: (data: VerifyResetOtpResponse) => void,
) => {
  return useMutation<
    VerifyResetOtpResponse,
    ErrorResponse,
    VerifyResetOtpPayload
  >({
    mutationFn: (payload: VerifyResetOtpPayload) =>
      fetchData<VerifyResetOtpResponse>(
        `partner/auth/verify-reset-otp`,
        "POST",
        payload,
      ),

    onSuccess: (data: VerifyResetOtpResponse) => {
      if (onSuccess) {
        onSuccess(data);
      }
      toast.success(data.response || "OTP verified successfully!");
    },
    onError: (error: ApiError) => {
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Invalid OTP. Please try again.";
      toast.error(errorMessage);
    },
  });
};

interface ResendOtpPayload {
  emailOrPhone: string;
}

interface ResendOtpResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useResendOtp = (onSuccess?: (data: ResendOtpResponse) => void) => {
  return useMutation<ResendOtpResponse, ErrorResponse, ResendOtpPayload>({
    mutationFn: async (payload: ResendOtpPayload) => {
      try {
        const response = await fetchData<ResendOtpResponse>(
          `partner/auth/resend-otp`,
          "POST",
          payload,
        );
        return response;
      } catch (error) {
        console.error("Resend OTP API Error:", error);
        throw error;
      }
    },
    onSuccess: (data: ResendOtpResponse) => {
      if (onSuccess) {
        onSuccess(data);
      }
      toast.success(data.response || "OTP has been resent to your email");
    },
    onError: (error: ApiError) => {
      console.error("Resend OTP Error Details:", error);
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Failed to resend OTP. Please try again.";
      toast.error(errorMessage);
    },
  });
};

interface CreatePasswordPayload {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface CreatePasswordResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useCreatePassword = (
  onSuccess?: (data: CreatePasswordResponse) => void,
) => {
  return useMutation<
    CreatePasswordResponse,
    ErrorResponse,
    CreatePasswordPayload
  >({
    mutationFn: (payload: CreatePasswordPayload) =>
      fetchData<CreatePasswordResponse>(
        `partner/auth/create-password`,
        "POST",
        payload,
      ),

    onSuccess: (data: CreatePasswordResponse) => {
      if (onSuccess) {
        onSuccess(data);
      }
      toast.success(data.response || "Password has been updated successfully!");
    },
    onError: (error: ApiError) => {
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Failed to update password. Please try again.";
      toast.error(errorMessage);
    },
  });
};

interface ResetPasswordPayload {
  emailOrPhone: string;
  newPassword: string;
  confirmPassword: string;
  resetToken: string;
}

interface ResetPasswordResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useResetPassword = (
  onSuccess?: (data: ResetPasswordResponse) => void,
) => {
  return useMutation<
    ResetPasswordResponse,
    ErrorResponse,
    ResetPasswordPayload
  >({
    mutationFn: (payload: ResetPasswordPayload) =>
      fetchData<ResetPasswordResponse>(
        `partner/auth/reset-password`,
        "POST",
        payload,
      ),

    onSuccess: (data: ResetPasswordResponse) => {
      if (onSuccess) {
        onSuccess(data);
      }
      toast.success(data.response || "Password has been updated successfully!");
    },
    onError: (error: ApiError) => {
      const errorMessage =
        error?.message ||
        error?.response ||
        (error?.data as { response?: string })?.response ||
        "Failed to update password. Please try again.";
      toast.error(errorMessage);
    },
  });
};

export default useLogin;
export {
  useForgotPassword,
  useVerifyOtp,
  useVerifyResetOtp,
  useResendOtp,
  useCreatePassword,
  useResetPassword,
};
