"use client";

import { apiFetch } from "@/lib/api";

export default function EmailOrPhoneStep({
  value,
  setValue,
  onContinue,
}: {
  value: string;
  setValue: (v: string) => void;
  onContinue: () => void;
}) {
  const isEmail = (val: string) => val.includes("@");

  const handleContinue = async () => {
    const contactRaw = value.trim();
    if (!contactRaw) {
      alert("Please enter email or phone number");
      return;
    }

    const payload = isEmail(contactRaw)
      ? { email: contactRaw }
      : { phone: contactRaw.replace(/\D/g, "") };

    if ("phone" in payload && !payload.phone) {
      alert("Please enter a valid phone number");
      return;
    }

    try {
      await apiFetch("/auth/request-otp", {
        method: "POST",
        auth: false,
        body: JSON.stringify(payload),
      });

      onContinue();
    } catch (err) {
      console.error(err);
      alert("Failed to send OTP");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Welcome to Trailbook</h2>
        <p className="text-sm text-gray-500 mt-1">
          Sign in or create an account with OTP
        </p>
      </div>

      <input
        type="text"
        placeholder="Email or mobile number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      <button
        onClick={handleContinue}
        className="w-full rounded-lg bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Continue
      </button>

      <p className="text-xs text-gray-400 text-center">
        We’ll send you a one-time code to verify
      </p>
    </div>
  );
}
