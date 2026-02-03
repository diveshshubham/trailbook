"use client";

import { useState, useRef } from "react";

export default function OtpStep({
  onVerify,
  loading,
}: {
  onVerify: (otp: string) => void;
  loading: boolean;
}) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold">Enter verification code</h2>
        <p className="text-sm text-gray-500 mt-1">
          We sent a 6-digit code
        </p>
      </div>

      {/* OTP Boxes */}
      <div className="flex justify-center gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputsRef.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="w-12 h-14 text-xl text-center rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        ))}
      </div>

      <button
        disabled={loading}
        onClick={() => onVerify(otp.join(""))}
        className="w-full rounded-lg bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Verifying..." : "Verify & Continue"}
      </button>
    </div>
  );
}
