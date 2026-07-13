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

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<"staff" | "partner" | "agent">("partner");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const onSuccess = (data: LoginResponse) => {
    if (!data) return;
    setErrorMessage("");
    const user = data.data.user;

    // Check login type constraints
    if (loginType === "partner" && user.role === "SHOPKEEPER") {
      setErrorMessage("Invalid login");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      return;
    }

    if (loginType === "staff" && user.role !== "SHOPKEEPER" && user.role !== "WAREHOUSE_STAFF" && user.role !== "REGIONAL_ADMIN" && user.role !== "OPERATIONAL_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      setErrorMessage("Invalid login");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      return;
    }

    if (user.isCreatedPassword) {
      navigate("/create-password", {
        state: {
          emailOrPhone: user.email || user.phone,
          resetToken: data.data.accessToken,
        },
      });
    } else {
      if (user.role === "SHOPKEEPER") {
        navigate("/shopkeeper");
      } else {
        navigate("/");
      }
    }
  };

  const onAgentSuccess = (data: LoginResponse) => {
    if (!data) return;
    const user = data.data.user;
    
    if (user.role !== "VEHICLE_AGENT" && user.role !== "DELIVERY_AGENT") {
      setErrorMessage("Invalid email/phone or password");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      return;
    }

    setErrorMessage("");
    if (user.isCreatedPassword) {
      navigate("/create-password", {
        state: {
          emailOrPhone: user.email || user.phone,
          resetToken: data.data.accessToken,
        },
      });
    } else {
      navigate("/vsms/agent-portal/today-plan");
    }
  };

  const { mutate: loginMutation, isPending } = useLogin(onSuccess);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: {
      email: "",
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

  const {
    register: agentRegister,
    handleSubmit: handleAgentSubmit,
    formState: { errors: agentErrors },
  } = useForm<AgentLoginFormData>({
    resolver: yupResolver(agentLoginSchema),
    mode: "onSubmit",
    defaultValues: {
      mobile: "",
      password: "",
    },
  });

  const { mutate: agentLoginMutation, isPending: isAgentPending } = useAgentLogin(onAgentSuccess);

  const onAgentSubmit = async (data: AgentLoginFormData) => {
    setErrorMessage("");
    agentLoginMutation(data, {
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
                {loginType === "agent" ? "Welcome Agent!" : "Welcome Partner!"}
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

            {/* Tab Navigation */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  loginType === "staff"
                    ? "bg-white text-[#00891D] shadow-xs"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => {
                  setLoginType("staff");
                  setErrorMessage("");
                  reset();
                }}
              >
                Staff Login
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  loginType === "partner"
                    ? "bg-white text-[#00891D] shadow-xs"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => {
                  setLoginType("partner");
                  setErrorMessage("");
                  reset();
                }}
              >
                Partner Login
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  loginType === "agent"
                    ? "bg-white text-[#00891D] shadow-xs"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => {
                  setLoginType("agent");
                  setErrorMessage("");
                  reset();
                }}
              >
                VSMS Agent Login
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                {errorMessage}
              </div>
            )}

            {loginType !== "agent" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Enter your Email Address here
                </label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      placeholder="Email Address"
                      maxLength={MAX_EMAIL_LENGTH}
                      autoComplete="email"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] transition-colors ${
                        errors.email
                          ? "!border-red-400 !focus:ring-red-500"
                          : ""
                      }`}
                    />
                  )}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.email.message}
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
            ) : (
            <form onSubmit={handleAgentSubmit(onAgentSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Enter your Mobile Number here
                </label>
                <input
                  {...agentRegister("mobile")}
                  type="tel"
                  placeholder="Mobile Number"
                  maxLength={10}
                  autoComplete="tel"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] transition-colors ${
                    agentErrors.mobile
                      ? "!border-red-400 !focus:ring-red-500"
                      : ""
                  }`}
                />
                {agentErrors.mobile && (
                  <p className="mt-1 text-xs text-red-600">
                    {agentErrors.mobile.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...agentRegister("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="current-password"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] transition-colors ${
                      agentErrors.password
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
                {agentErrors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {agentErrors.password.message}
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
                disabled={isAgentPending}
                className="w-full bg-[#00891D] text-white py-3.5 rounded-lg font-medium transition-all hover:bg-[#007018] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAgentPending ? "Signing in..." : "Login"}
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
