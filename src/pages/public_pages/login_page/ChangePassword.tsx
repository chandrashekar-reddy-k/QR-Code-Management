import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ArrowLeft, Lock, ShieldCheck, Mail } from "lucide-react";
import {
  resetPasswordSchema,
  ResetPasswordFormData,
} from "../../../validationSchema/auth";
import { toast } from "react-toastify";
import { useForgotPassword, useVerifyResetOtp, useResetPassword, useResendOtp } from "../../../hooks/login";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"INITIAL" | "OTP" | "NEW_PASSWORD">("INITIAL");
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("partnerUser") || localStorage.getItem("user") || localStorage.getItem("adminUser");
      let foundEmail = "";
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.email) {
          foundEmail = u.email;
        }
      }
      if (!foundEmail) {
        const token = localStorage.getItem("partnerToken") || localStorage.getItem("token");
        if (token) {
          const base64Url = token.split(".")[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
              window.atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
            );
            const decoded = JSON.parse(jsonPayload);
            if (decoded.email) {
              foundEmail = decoded.email;
            }
          }
        }
      }
      if (foundEmail) {
        setUserEmail(foundEmail);
      }
    } catch (e) {
      console.error("Failed to parse user email", e);
    }
  }, []);

  const forgotPasswordMutation = useForgotPassword(() => {
    setStep("OTP");
    toast.success(`Verification code sent to ${userEmail}`);
  });

  const verifyOtpMutation = useVerifyResetOtp((response) => {
    const token = response.data?.resetToken;
    if (token) {
      setResetToken(token);
      setStep("NEW_PASSWORD");
    } else {
      toast.error("Reset token not received from server. Please try again.");
    }
  });

  const resendOtpMutation = useResendOtp(() => {
    setOtp(["", "", "", "", "", ""]);
    otpInputRefs.current[0]?.focus();
    setResendTimer(60);
    setCanResend(false);
  });

  const resetPasswordMutation = useResetPassword(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("partnerToken");
    localStorage.removeItem("partnerRefreshToken");
    localStorage.removeItem("partnerUser");
    localStorage.removeItem("permissions");
    localStorage.removeItem("portalMode");
    sessionStorage.clear();
    toast.success("Password changed successfully! Please log in with your new password.");
    navigate("/login", { replace: true });
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const handleSendOtp = async () => {
    if (!userEmail) {
      toast.error("User email not found. Please log in again.");
      return;
    }
    setIsLoading(true);
    try {
      await forgotPasswordMutation.mutateAsync({ emailOrPhone: userEmail });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }
    setIsLoading(true);
    try {
      await verifyOtpMutation.mutateAsync({
        emailOrPhone: userEmail,
        otp: otpCode,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resendOtpMutation.isPending) return;
    try {
      await resendOtpMutation.mutateAsync({ emailOrPhone: userEmail });
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmitNewPassword = async (data: ResetPasswordFormData) => {
    if (!userEmail || !resetToken) {
      toast.error("Missing reset details. Please try again.");
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({
        emailOrPhone: userEmail,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
        resetToken,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (step === "OTP") {
      otpInputRefs.current[0]?.focus();
      setResendTimer(60);
      setCanResend(false);
    }
  }, [step]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || "";
      }
      setOtp(newOtp);
      const lastIndex = Math.min(pastedData.length - 1, 5);
      otpInputRefs.current[lastIndex]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[#00891D]">
            <Lock size={24} />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Change Password
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          Securely reset your account password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100 dark:border-gray-700">
          {step === "INITIAL" && (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center gap-3 text-left border border-emerald-100 dark:border-emerald-800/30">
                <Mail className="text-[#00891D] flex-shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">OTP will be sent to:</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{userEmail || "Your registered email"}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                To change your password, we need to send a 6-digit verification code (OTP) to your registered email address.
              </p>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#00891D] hover:bg-[#007018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00891D] disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Sending OTP..." : "Send Verification OTP"}
              </button>
            </div>
          )}

          {step === "OTP" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-2">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Verify Security Code</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the 6-digit OTP sent to <span className="font-semibold text-gray-700 dark:text-gray-300">{userEmail}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 h-12 text-center text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#00891D] focus:border-transparent dark:bg-gray-700 dark:text-white outline-none"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#00891D] hover:bg-[#007018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00891D] disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Verifying..." : "Verify & Continue"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || resendOtpMutation.isPending}
                  className="text-xs font-medium text-[#00891D] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : "Resend Verification Code"}
                </button>
              </div>
            </div>
          )}

          {step === "NEW_PASSWORD" && (
            <form onSubmit={handleSubmit(onSubmitNewPassword)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    {...register("newPassword")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-[#00891D] focus:border-transparent dark:bg-gray-700 dark:text-white text-sm outline-none"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-[#00891D] focus:border-transparent dark:bg-gray-700 dark:text-white text-sm outline-none"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="w-full mt-4 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#00891D] hover:bg-[#007018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00891D] disabled:opacity-50 transition-colors"
              >
                {resetPasswordMutation.isPending ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
