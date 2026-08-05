import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface SecurityVerificationOverlayProps {
  user: any;
  onVerified: () => void;
}

export default function SecurityVerificationOverlay({ user, onVerified }: SecurityVerificationOverlayProps) {
  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.phone || "");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState(user?.email || "");

  // Validation error states
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mobileError, setMobileError] = useState("");

  const validateName = (val: string) => {
    if (!val.trim()) {
      setNameError("Full Name is required");
      return false;
    } else if (val.trim().length < 3) {
      setNameError("Name must be at least 3 characters");
      return false;
    } else if (!/^[A-Za-z\s]+$/.test(val.trim())) {
      setNameError("Name can only contain alphabets and spaces");
      return false;
    } else {
      setNameError("");
      return true;
    }
  };

  const validateEmail = (val: string) => {
    // Email is optional — only validate format if user typed something
    if (!val.trim()) {
      setEmailError("");
      return true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    } else {
      setEmailError("");
      return true;
    }
  };

  const validateMobile = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      setMobileError("Mobile number is required");
      return false;
    } else if (clean.length < 10) {
      setMobileError("Mobile number must be exactly 10 digits");
      return false;
    } else {
      setMobileError("");
      return true;
    }
  };

  // Checkboxes state
  const [checkAudited, setCheckAudited] = useState(false);
  const [checkNoCopy, setCheckNoCopy] = useState(false);
  const [checkOwner, setCheckOwner] = useState(false);

  // Send security OTP
  const handleSendOtp = async () => {
    const nameValid = validateName(name);
    const emailValid = validateEmail(email);
    const mobileValid = validateMobile(mobile);

    if (!nameValid || !emailValid || !mobileValid) {
      toast.error("Please correct the invalid fields first");
      return;
    }

    setOtpSending(true);
    try {
      const response = await fetch("http://localhost:3004/api/v1/partner/auth/security/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.replace(/\D/g, "").trim(),
          email: email.trim() || undefined,
          role: user?.role || "USER",
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setCooldown(60);
        const devOtp = resData.data?.otp ? ` (Dev OTP: ${resData.data.otp})` : "";
        toast.success(`Security OTP sent successfully!${devOtp}`);
      } else {
        toast.error(resData.response || resData.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Unable to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setOtpVerifying(true);
    try {
      const response = await fetch("http://localhost:3004/api/v1/partner/auth/security/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          role: user?.role || "USER",
          otp: otp.trim(),
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.data?.verified) {
        setOtpVerified(true);
        toast.success("Mobile number verified successfully!");
      } else {
        toast.error(resData.response || resData.message || "Invalid OTP code. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during verification.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const allChecksAccepted = checkAudited && checkNoCopy && checkOwner;
  const isSubmitEnabled = otpVerified && allChecksAccepted;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md overflow-y-auto p-4 select-none">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 max-w-lg w-full p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Security Verification Required</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Please verify your identity to unlock portal access.</p>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              disabled={otpSent}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={(e) => validateName(e.target.value)}
              placeholder="Enter your full name"
              className={`w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                nameError ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-600"
              }`}
            />
            {nameError && <p className="text-red-500 text-xs font-semibold mt-0.5">{nameError}</p>}
          </div>

          {/* Email Field (Optional) */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address <span className="text-slate-400 font-normal text-xs">(Optional)</span></label>
            <input
              type="email"
              disabled={otpSent}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              placeholder="Enter your email address"
              className={`w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                emailError ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-600"
              }`}
            />
            {emailError && <p className="text-red-500 text-xs font-semibold mt-0.5">{emailError}</p>}
          </div>

          {/* Mobile Field with Send OTP Button */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Mobile Number</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-slate-400 font-medium">+91</span>
                <input
                  type="text"
                  disabled={otpSent}
                  maxLength={10}
                  value={mobile.replace(/\D/g, "")}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (mobileError) validateMobile(e.target.value);
                  }}
                  onBlur={(e) => validateMobile(e.target.value)}
                  placeholder="Enter 10-digit number"
                  className={`w-full pl-11 pr-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                    mobileError ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-600"
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpSent || cooldown > 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-all focus:outline-none shadow-sm flex items-center justify-center min-w-[100px]"
              >
                {otpSending ? (
                  <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
                ) : cooldown > 0 ? (
                  `${cooldown}s`
                ) : (
                  "Send OTP"
                )}
              </button>
            </div>
            {mobileError && <p className="text-red-500 text-xs font-semibold mt-0.5">{mobileError}</p>}
          </div>

          {/* OTP Validation Field */}
          {otpSent && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-150">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Enter 6-Digit OTP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  disabled={otpVerified}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 text-center tracking-widest font-mono text-lg"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || otpVerified}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-all focus:outline-none shadow-sm flex items-center justify-center min-w-[100px]"
                >
                  {otpVerifying ? (
                    <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
                  ) : otpVerified ? (
                    "✓ Verified"
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
              {cooldown === 0 && !otpVerified && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IP Protection Notice */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            IP Protection Notice
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            By completing this verification, you agree to VillagKart's intellectual property policies. Screen capturing, text copying, or unauthorized session sharing is strictly monitored and blocked. All violations will trigger automatic audit logs, account locks, and potential legal action.
          </p>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2.5">
          <label className="flex items-start gap-2.5 cursor-pointer text-slate-600 dark:text-slate-300 text-xs">
            <input
              type="checkbox"
              checked={checkAudited}
              onChange={(e) => setCheckAudited(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-blue-600"
            />
            <span>I acknowledge that this session is monitored and logged for security auditing.</span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer text-slate-600 dark:text-slate-300 text-xs">
            <input
              type="checkbox"
              checked={checkNoCopy}
              onChange={(e) => setCheckNoCopy(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-blue-600"
            />
            <span>I agree not to copy, print, screenshot, or record any screen content.</span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer text-slate-600 dark:text-slate-300 text-xs">
            <input
              type="checkbox"
              checked={checkOwner}
              onChange={(e) => setCheckOwner(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-blue-600"
            />
            <span>I verify that the name and mobile number entered belong to me and are active.</span>
          </label>
        </div>

        {/* Submit / Unlock Button */}
        {isSubmitEnabled && (
          <button
            type="button"
            onClick={onVerified}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 text-center animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            Submit & Unlock Portal
          </button>
        )}
      </div>
    </div>
  );
}
