import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ArrowLeft } from "lucide-react";
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
  MAX_EMAIL_LENGTH,
} from "../../../validationSchema/auth";
import { toast } from "react-toastify";
import NewPassword from "./NewPassword";
import { useForgotPassword, useVerifyResetOtp, useResendOtp } from "../../../hooks/login";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize React Hook Form with Yup resolver
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useForgotPassword(() => {
    // This will be called after successful API call
    // The email is already stored via setUserEmail before mutation
    setShowOTPVerification(true);
  });

  const verifyOtpMutation = useVerifyResetOtp((response) => {
    // Extract reset token from API response and open new password screen
    const token = response.data?.resetToken;
    if (token) {
      setResetToken(token);
      setShowNewPassword(true);
    } else {
      toast.error("Reset token not received from server. Please try again.");
    }
  });

  const resendOtpMutation = useResendOtp(() => {
    // Clear OTP inputs and focus first input on successful resend
    setOtp(["", "", "", "", "", ""]);
    otpInputRefs.current[0]?.focus();
    // Start timer after successful resend
    setResendTimer(60);
    setCanResend(false);
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    // Store email before making API call
    setUserEmail(data.email);
    try {
      await forgotPasswordMutation.mutateAsync({
        emailOrPhone: data.email,
      });
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error("Forgot password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace
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
      // Focus the last filled input or the last input
      const lastIndex = Math.min(pastedData.length - 1, 5);
      otpInputRefs.current[lastIndex]?.focus();
    }
  };

  const handleResetPassword = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    if (!userEmail) {
      toast.error("Email not found. Please start over.");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtpMutation.mutateAsync({
        emailOrPhone: userEmail,
        otp: otpCode,
      });
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error("Verify OTP error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!userEmail) {
      toast.error("Email not found. Please start over.");
      return;
    }

    if (!canResend) {
      return; // Prevent resend if timer is still active
    }

    if (resendOtpMutation.isPending) {
      return; // Prevent multiple simultaneous requests
    }

    try {
      await resendOtpMutation.mutateAsync({
        emailOrPhone: userEmail,
      });
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error("Resend OTP error:", error);
    }
  };

  useEffect(() => {
    if (showOTPVerification) {
      otpInputRefs.current[0]?.focus();
      // Start timer when OTP verification screen is shown
      setResendTimer(60);
      setCanResend(false);
    }
  }, [showOTPVerification]);

  // Timer effect for resend OTP
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
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendTimer]);

  return (
    <>
      <style>{`
        .forgot-form-light input {
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #e5e7eb !important;
          caret-color: #111827 !important;
        }
        .forgot-form-light input::placeholder {
          color: #9ca3af !important;
        }
        .forgot-form-light input:-webkit-autofill,
        .forgot-form-light input:-webkit-autofill:hover,
        .forgot-form-light input:-webkit-autofill:focus,
        .forgot-form-light input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
          -webkit-text-fill-color: #111827 !important;
          caret-color: #111827 !important;
        }
      `}</style>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 lg:h-screen bg-[#F7F7FA]">
        {/* Left half: branding + illustration (same as Login) */}
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
               <p className="text-xl lg:text-2xl font-bold text-[#00891D]">
             Partner panel
              </p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">Forgot Password!</p>
              <p className="text-xl lg:text-2xl font-bold text-[#00891D]">
               Enter your email to receive a password reset link
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

        {/* Right half: form content */}
        <div className="w-full min-h-[60vh] lg:min-h-0 lg:h-full flex items-center justify-center p-6 lg:p-12 bg-[#F7F7FA] dark:bg-[#F7F7FA] forgot-form-light">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8">
              <img
                src="/villagkart_logo_name_new.svg"
                alt="VillagKart"
                className="h-14 w-auto max-w-[260px] object-contain"
              />
            </div>

            <div>
            {showNewPassword ? (
              <NewPassword
                emailOrPhone={userEmail}
                resetToken={resetToken}
                onBack={() => {
                  setShowNewPassword(false);
                  setOtp(["", "", "", "", "", ""]);
                }}
              />
            ) : !showOTPVerification ? (
              <>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8">
                  Reset Your Password Here
                </h1>

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
                            errors.email ? "!border-red-400" : ""
                          }`}
                        />
                      )}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#00891D] text-white py-3.5 rounded-lg font-medium hover:bg-[#007018] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Sending link..." : "Send Reset Link"}
                  </button>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="text-sm font-medium text-gray-600 hover:text-[#00891D] transition-colors"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOTPVerification(false);
                      setOtp(["", "", "", "", "", ""]);
                    }}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                </div>

                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  Reset Your Password here
                </h1>
                <p className="text-gray-500 text-sm mb-4">
                  Email Authentication for password reset
                </p>
                <p className="text-gray-500 text-sm mb-1">
                  We sent a reset link to{" "}
                  <span className="font-medium text-gray-900">{userEmail}</span>
                </p>
                <p className="text-gray-500 text-sm mb-8">
                  Enter 6 digit code that mentioned in the email
                </p>

                <div className="space-y-6">
                  <div className="flex justify-center gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="w-14 h-14 text-center text-xl font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] bg-white text-gray-900 border-gray-200 transition-colors"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isLoading || otp.join("").length !== 6}
                    className="w-full bg-[#00891D] hover:bg-[#007018] text-white py-3.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Verifying..." : "Reset Password"}
                  </button>

                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Haven&apos;t got the email yet?{" "}
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isLoading || resendOtpMutation.isPending}
                          className="text-[#00891D] hover:underline font-medium disabled:opacity-50"
                        >
                          {resendOtpMutation.isPending ? "Sending..." : "Resend OTP"}
                        </button>
                      ) : (
                        <span className="text-gray-600 font-medium">
                          Resend OTP in {resendTimer}s
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
