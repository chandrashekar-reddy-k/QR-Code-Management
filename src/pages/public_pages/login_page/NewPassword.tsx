import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  resetPasswordSchema,
  ResetPasswordFormData,
} from "../../../validationSchema/auth";
import { useResetPassword } from "../../../hooks/login";

interface NewPasswordProps {
  onBack?: () => void;
  emailOrPhone: string;
  resetToken: string;
}

const NewPassword = ({ onBack, emailOrPhone, resetToken }: NewPasswordProps) => {
  const navigate = useNavigate();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize React Hook Form with Yup resolver
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useResetPassword(() => {
    // Navigate to login after successful password reset
    navigate("/login");
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    // Safety check: required data from previous step
    if (!emailOrPhone || !resetToken) {
      console.error("Missing reset context (email or reset token).");
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        emailOrPhone,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
        resetToken,
      });
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error("Reset password error:", error);
    }
  };

  return (
    <>
      {/* Back Button */}
      {onBack && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Reset Your Password here
        </h1>
        <p className="text-gray-500 dark:text-gray-500 text-sm">
          Create a new password. Ensure it differs from previous ones for security
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* New Password Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Password
          </label>
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  size={18}
                />
                <input
                  {...field}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors.newPassword
                      ? "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            )}
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        {/* Confirm New Password Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm new Password
          </label>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  size={18}
                />
                <input
                  {...field}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors.confirmPassword
                      ? "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            )}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Update Password Button */}
        <button
          type="submit"
          disabled={resetPasswordMutation.isPending || !isValid}
          className="w-full text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md bg-green-600 hover:bg-green-700"
        >
          {resetPasswordMutation.isPending ? "Updating..." : "Update Password"}
        </button>
      </form>
    </>
  );
};

export default NewPassword;
