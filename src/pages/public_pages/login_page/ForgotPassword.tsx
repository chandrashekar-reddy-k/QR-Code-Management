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
          <div className="w-full max-w-[320px] aspect-[336/250] rounded-2xl overflow-hidden mb-6 flex items-center justify-center bg-transparent">
            <img
              src="/forgot_password_hero.png"
              alt="VillagKart Security & Password Reset"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="w-full">
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
                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#D96B27] mb-2 tracking-tight text-center">
                  Forgot Password
                </h1>
                <p className="text-xs font-bold text-gray-700 mb-6 text-center">
                  Reset your Password here
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Enter your Mobile Number / Email <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="Enter your Email / Mobile"
                          maxLength={MAX_EMAIL_LENGTH}
                          autoComplete="email"
                          className={`w-full px-4 py-3 bg-[#FAFAFA] border ${
                            errors.email
                              ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              : "border-gray-200 focus:border-[#00891D] focus:ring-1 focus:ring-[#00891D]"
                          } rounded-xl text-gray-900 placeholder-gray-400 text-sm outline-none transition-all`}
                        />
                      )}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#00891D] hover:bg-[#007018] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </button>

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="text-xs font-bold text-gray-600 hover:text-[#00891D] transition-colors"
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
                    <ArrowLeft size={16} />
                    <span className="text-xs font-bold">Back</span>
                  </button>
                </div>

                <h1 className="text-2xl font-extrabold text-[#D96B27] mb-1 text-center">
                  Verification Code
                </h1>
                <p className="text-gray-500 text-xs mb-1 text-center">
                  We sent a 6-digit code to
                </p>
                <p className="text-gray-900 font-bold text-xs mb-6 text-center">
                  {userEmail}
                </p>

                <div className="space-y-6">
                  <div className="flex justify-center gap-2 sm:gap-3">
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
                        className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] bg-[#FAFAFA] text-gray-900 border-gray-200 transition-colors"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isLoading || otp.join("").length !== 6}
                    className="w-full bg-[#00891D] hover:bg-[#007018] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? "Verifying..." : "Verify & Reset"}
                  </button>

                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Haven&apos;t got the code yet?{" "}
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isLoading || resendOtpMutation.isPending}
                          className="text-[#00891D] hover:underline font-bold disabled:opacity-50"
                        >
                          {resendOtpMutation.isPending ? "Sending..." : "Resend Code"}
                        </button>
                      ) : (
                        <span className="text-gray-600 font-bold">
                          Resend in {resendTimer}s
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
    </>
  );
};

export default ForgotPassword;
