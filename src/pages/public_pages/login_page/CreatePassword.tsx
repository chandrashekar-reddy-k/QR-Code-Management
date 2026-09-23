import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import {
  createPasswordSchema,
  CreatePasswordFormData,
  MAX_PASSWORD_LENGTH,
} from "../../../validationSchema/auth";
import { useCreatePassword } from "../../../hooks/login";

interface LocationState {
  emailOrPhone?: string;
  resetToken?: string;
}

const CreatePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [emailOrPhone, setEmailOrPhone] = useState<string>("");
  const [resetToken, setResetToken] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const targetEmail = state?.emailOrPhone || (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.email || u.phone || "";
      } catch {
        return "";
      }
    })();

    const targetToken = state?.resetToken || localStorage.getItem("token") || "";

    if (targetEmail && targetToken) {
      setEmailOrPhone(targetEmail);
      setResetToken(targetToken);
    } else {
      navigate("/login", { replace: true });
    }
  }, [state, navigate]);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreatePasswordFormData>({
    resolver: yupResolver(createPasswordSchema),
    mode: "onChange",
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const createPasswordMutation = useCreatePassword(() => {
    // Clear temporary auth data/tokens so user MUST log in freshly with their new credentials
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("partnerToken");
    localStorage.removeItem("partnerRefreshToken");
    localStorage.removeItem("partnerUser");
    localStorage.removeItem("permissions");
    localStorage.removeItem("portalMode");
    sessionStorage.clear();

    toast.success("Password set successfully! Please login with your new password.");
    navigate("/login", { replace: true });
  });

  const onSubmit = async (data: CreatePasswordFormData) => {
    if (!emailOrPhone || !resetToken) {
      return;
    }

    try {
      await createPasswordMutation.mutateAsync({
        // emailOrPhone,
        token: resetToken,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Create password error:", error);
    }
  };

  return (
    <>
      <style>{`
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
        .login-form-light input[type="password"]::-ms-reveal,
        .login-form-light input[type="password"]::-ms-clear {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 lg:h-screen bg-[#F7F7FA]">
        {/* Left: branding + illustration (matches Login) */}
        <div className="relative min-h-[40vh] lg:h-full flex flex-col p-6 lg:p-10 overflow-hidden bg-[#F7F7FA]">
          <div className="relative z-10 flex flex-col h-full flex-1 min-h-0">
            <div className="flex-shrink-0">
              <img
                src="/villagkart_logo_name_new.svg"
                alt="VillagKart"
                className="h-14 lg:h-20 w-auto max-w-[280px] lg:max-w-[320px] object-contain"
              />
            </div>

            <div className="mt-6 lg:mt-8 flex-shrink-0">
              <p className="text-xl lg:text-2xl font-bold text-gray-900">
                Create Your Password
              </p>
              <p className="text-lg lg:text-2xl font-bold text-[#00891D] leading-snug">
                Set a secure password to access your partner dashboard.
              </p>
            </div>

            <div className="flex-1 min-h-0 mt-6 lg:mt-8 flex items-end justify-center overflow-hidden">
              <img
                src="/login_page_image.svg"
                alt=""
                className="w-full max-w-full h-full min-h-0 object-contain object-bottom"
              />
            </div>
          </div>
        </div>

        {/* Right: form (matches Login column) */}
        <div className="w-full min-h-[60vh] lg:min-h-0 lg:h-full flex items-center justify-center p-6 lg:p-12 bg-[#F7F7FA] dark:bg-[#F7F7FA] login-form-light">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8">
              <img
                src="/villagkart_logo_name_new.svg"
                alt="VillagKart"
                className="h-14 w-auto max-w-[260px] object-contain"
              />
            </div>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#00891D] transition-colors mb-6"
            >
              <ArrowLeft size={18} />
              Back to Login
            </button>

            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-900 mb-2">
              Set Your Password
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Create a new password. Ensure it differs from previous ones for
              security.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  New Password
                </label>
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <input
                        {...field}
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        maxLength={MAX_PASSWORD_LENGTH}
                        autoComplete="new-password"
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] transition-colors ${
                          errors.newPassword
                            ? "!border-red-400 !focus:ring-red-500"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-600 transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  )}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Confirm New Password
                </label>
                <Controller
                  name="confirmNewPassword"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        maxLength={MAX_PASSWORD_LENGTH}
                        autoComplete="new-password"
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] transition-colors ${
                          errors.confirmNewPassword
                            ? "!border-red-400 !focus:ring-red-500"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  )}
                />
                {errors.confirmNewPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.confirmNewPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={createPasswordMutation.isPending || !isValid}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {createPasswordMutation.isPending
                  ? "Saving..."
                  : "Save Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatePassword;
