import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff } from "lucide-react";
import {
  LoginFormData,
  AgentLoginFormData,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "../../../validationSchema/auth";
import { loginSchema, agentLoginSchema } from "../../../validationSchema/auth";
import useLogin, { useAgentLogin, LoginResponse } from "../../../hooks/login";
import SecurityVerificationOverlay from "../../../components/SecurityVerificationOverlay";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [pendingLoginData, setPendingLoginData] = useState<LoginResponse | null>(null);

  const onSuccess = (data: LoginResponse) => {
    if (!data) return;
    setErrorMessage("");

    const isVerified = true;
    if (!isVerified) {
      setPendingLoginData(data);
      return;
    }

    proceedRedirect(data);
  };

  const proceedRedirect = (data: LoginResponse) => {
    const user = data.data.user;

    // Decode permissions dynamically from local storage (or fallback to token)
    let userPermissions: string[] = [];
    try {
      const permsStr = localStorage.getItem('permissions');
      if (permsStr) {
        userPermissions = JSON.parse(permsStr);
      }
    } catch (e) {
      console.error("Failed to parse permissions from localStorage:", e);
    }

    if (userPermissions.length === 0) {
      try {
        const base64Url = data.data.accessToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        userPermissions = decoded.permissions || [];
      } catch (err) {
        console.error("SSO route parser error:", err);
      }
    }

    const roleUpper = (user.role || "").toUpperCase();
    const hasPartner = userPermissions.some((p: string) => p.startsWith("partner_") && !p.startsWith("partner_shopkeeper_erp_")) || roleUpper.includes("PARTNER");
    const isShopkeeperRole = !hasPartner && (userPermissions.some((p: string) => p.startsWith("shopkeeper_") || p.startsWith("partner_shopkeeper_erp_")) || roleUpper.includes("SHOPKEEPER"));
    const isAgentRole = !hasPartner && !isShopkeeperRole && (["VEHICLE_AGENT", "DELIVERY_AGENT", "SALES_AGENT", "VSMS_AGENT"].includes(roleUpper) || userPermissions.some((p: string) => p.startsWith("vsms_agent_")));

    const isOperator =
      !hasPartner && (
        ['PACKING_OPERATOR', 'PACKER_OPERATOR', 'OPERATOR', 'PACKER'].includes(roleUpper) ||
        userPermissions.some((p: string) => p.startsWith("packer_operator") || p.startsWith("packing_operator"))
      );

    const isQc =
      !hasPartner && (
        ['PACKING_QC', 'PACKER_QC', 'QC_INSPECTOR', 'QC'].includes(roleUpper) ||
        userPermissions.some((p: string) => p.startsWith("packer_qc") || p.startsWith("packing_qc"))
      );

    console.log("[LOGIN DEBUG] user flags:", {
      isCreatedPassword: user.isCreatedPassword,
      isFirstLogin: user.isFirstLogin,
      mustChangePassword: user.mustChangePassword,
      rawUser: user,
      roleUpper,
      hasPartner,
      isShopkeeperRole,
      isAgentRole,
      isOperator,
      isQc
    });

    const shouldChangePassword =
      user.requiresPasswordChange === true ||
      user.isCreatedPassword === true ||
      user.isFirstLogin === true ||
      user.mustChangePassword === true;

    if (shouldChangePassword) {
      localStorage.setItem("token", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/create-password", {
        replace: true,
        state: {
          emailOrPhone: user.email || user.phone,
          resetToken: data.data.accessToken,
        },
      });
    } else {
      if (isQc) {
        sessionStorage.setItem('portalMode', 'QC');
        localStorage.setItem('portalMode', 'QC');
        navigate("/packer/qc/dashboard");
      } else if (isOperator) {
        sessionStorage.setItem('portalMode', 'OPERATOR');
        localStorage.setItem('portalMode', 'OPERATOR');
        navigate("/packer/operator/dashboard");
      } else if (isAgentRole) {
        sessionStorage.setItem('portalMode', 'AGENT');
        localStorage.setItem('portalMode', 'AGENT');
        navigate("/vsms/agent-portal/today-plan");
      } else if (isShopkeeperRole) {
        sessionStorage.setItem('portalMode', 'SHOPKEEPER');
        localStorage.setItem('portalMode', 'SHOPKEEPER');
        navigate("/shopkeeper");
      } else {
        sessionStorage.setItem('portalMode', 'PARTNER');
        localStorage.setItem('portalMode', 'PARTNER');
        navigate("/");
      }
    }
  };

  const { mutate: loginMutation, isPending } = useLogin(onSuccess);

  const emailFromQuery = searchParams.get("email") || "";

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: {
      identifier: emailFromQuery,
      password: "",
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      setValue("identifier", emailFromQuery);
    }
  }, [emailFromQuery, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage("");
    loginMutation(data, {
      onError: (error: any) => {
        const message =
          error?.message ||
          error?.response ||
          "Login failed. Please try again.";
        setErrorMessage(message);
      },
    });
  };

  return (
    <>
      {pendingLoginData && (
        <SecurityVerificationOverlay
          user={pendingLoginData.data.user}
          onVerified={() => {
            sessionStorage.setItem('security_verified', 'true');
            proceedRedirect(pendingLoginData);
            setPendingLoginData(null);
          }}
        />
      )}
      <style>{`
        /* Login form: always light fields (white bg, dark text) - never dark */
        .login-form-light input {
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #e5e7eb !important;
          caret-color: #111827 !important;
        }
        .login-form-light input::placeholder {
          color: #9ca3af !important;
        }
        .login-form-light input:-webkit-autofill,
        .login-form-light input:-webkit-autofill:hover,
        .login-form-light input:-webkit-autofill:focus,
        .login-form-light input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
          -webkit-text-fill-color: #111827 !important;
          caret-color: #111827 !important;
        }
        /* Edge/IE: hide native password reveal icon (we use custom eye button) */
        .login-form-light input[type="password"]::-ms-reveal,
        .login-form-light input[type="password"]::-ms-clear {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 lg:h-screen bg-[#F7F7FA]">
        {/* Left half: branding + illustration */}
        <div className="hidden lg:flex relative h-full flex-col p-10 overflow-hidden bg-[#F7F7FA]">
          <div className="relative z-10 flex flex-col h-full flex-1 min-h-0">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img
                src="/villagkart_logo_name_new.svg"
                alt="VillagKart"
                className="h-14 lg:h-20 w-auto max-w-[280px] lg:max-w-[320px] object-contain"
              />
            </div>

            {/* Tagline */}
            <div className="mt-6 lg:mt-8 flex-shrink-0">
              <p className="text-xl lg:text-2xl font-bold text-gray-900">
                Welcome back!
              </p>
              <p className="text-xl lg:text-2xl font-bold text-[#00891D]">
                Please login to your account
              </p>
            </div>

            {/* Illustration - fills the left half properly */}
            <div className="flex-1 min-h-0 mt-6 lg:mt-8 flex items-end justify-center overflow-hidden">
              <img
                src="/login_page_image.svg"
                alt=""
                className="w-full max-w-full h-full min-h-0 object-contain object-bottom"
              />
            </div>
          </div>
        </div>

        {/* Right half: login form (exactly 50% on desktop) - always light fields */}
        <div className="w-full min-h-[60vh] lg:min-h-0 lg:h-full flex items-center justify-center p-6 lg:p-12 bg-[#F7F7FA] dark:bg-[#F7F7FA] login-form-light">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8">
              <img
                src="/villagkart_logo_name_new.svg"
                alt="VillagKart"
                className="h-14 w-auto max-w-[260px] object-contain"
              />
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-900 mb-6">
              Hey Welcome!
            </h1>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Enter your Email or Mobile Number here
                </label>
                <Controller
                  name="identifier"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Email or Mobile Number"
                      maxLength={MAX_EMAIL_LENGTH}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] transition-colors ${
                        errors.identifier
                          ? "!border-red-400 !focus:ring-red-500"
                          : ""
                      }`}
                    />
                  )}
                />
                {errors.identifier && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Password
                </label>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        maxLength={MAX_PASSWORD_LENGTH}
                        autoComplete="current-password"
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] transition-colors ${
                          errors.password
                            ? "!border-red-400 !focus:ring-red-500"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  )}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm font-medium text-gray-600 hover:text-[#00891D] transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#00891D] text-white py-3.5 rounded-lg font-medium transition-all hover:bg-[#007018] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
