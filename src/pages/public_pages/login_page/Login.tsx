import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

    const hasShopkeeper = userPermissions.some((p: string) => p.startsWith("shopkeeper_") || p.startsWith("partner_shopkeeper_erp_"));
    const hasAgent = userPermissions.some((p: string) => p.startsWith("vsms_agent_"));
    const hasPartner = userPermissions.some((p: string) => p.startsWith("partner_") && !p.startsWith("partner_shopkeeper_erp_"));

    const roleUpper = (user.role || "").toUpperCase();
    const isAgentRole = ["VEHICLE_AGENT", "DELIVERY_AGENT", "SALES_AGENT", "VSMS_AGENT"].includes(roleUpper);

    if (user.isCreatedPassword) {
      navigate("/create-password", {
        state: {
          emailOrPhone: user.email || user.phone,
          resetToken: data.data.accessToken,
        },
      });
    } else {
      if (isAgentRole || hasAgent) {
        navigate("/vsms/agent-portal/today-plan");
      } else if (hasPartner) {
        navigate("/");
      } else if (hasShopkeeper) {
        navigate("/shopkeeper");
      } else {
        navigate("/");
      }
    }
  };

  const { mutate: loginMutation, isPending } = useLogin(onSuccess);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

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

      <div className="min-h-screen w-full bg-[#FFFFFF] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 flex flex-col items-center">
          {/* Logo Header */}
          <div className="flex items-center justify-center mb-6">
            <img
              src="/villagkart_logo_name_new.svg"
              alt="VillagKart"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>

          {/* Hero Illustration */}
          <div className="w-full max-w-[340px] aspect-[336/270] rounded-2xl overflow-hidden mb-6 flex items-center justify-center bg-transparent">
            <img
              src="/login_hero.png"
              alt="VillagKart Delivery Operations"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Hey Welcome Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#D96B27] mb-6 tracking-tight text-center">
            Hey Welcome!
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
            {/* Identifier Field */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                Enter your Mobile Number <span className="text-red-500">*</span>
              </label>
              <Controller
                name="identifier"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Enter your Ema Mobile Number"
                    maxLength={MAX_EMAIL_LENGTH}
                    className={`w-full px-4 py-3 bg-[#FAFAFA] border ${
                      errors.identifier || errorMessage
                        ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-gray-200 focus:border-[#00891D] focus:ring-1 focus:ring-[#00891D]"
                    } rounded-xl text-gray-900 placeholder-gray-400 text-sm outline-none transition-all`}
                  />
                )}
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your Password"
                      maxLength={MAX_PASSWORD_LENGTH}
                      autoComplete="current-password"
                      className={`w-full px-4 py-3 pr-11 bg-[#FAFAFA] border ${
                        errors.password || errorMessage
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          : "border-gray-200 focus:border-[#00891D] focus:ring-1 focus:ring-[#00891D]"
                      } rounded-xl text-gray-900 placeholder-gray-400 text-sm outline-none transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                )}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs font-semibold text-gray-600 hover:text-[#00891D] transition-colors"
              >
                Forgot Password
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#00891D] hover:bg-[#007018] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {isPending ? "Logging in..." : "Login"}
            </button>

            {/* Error Message Box underneath Login button matching design */}
            {errorMessage && (
              <div className="mt-3 p-3.5 bg-red-50/70 border border-red-200 rounded-xl text-red-600 text-sm font-bold text-left animate-in fade-in duration-200">
                {errorMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
