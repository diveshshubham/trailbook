"use client";

export default function EmailOrPhoneStep({
  value,
  setValue,
  onContinue,
}: {
  value: string;
  setValue: (v: string) => void;
  onContinue: () => void;
}) {
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
        onClick={onContinue}
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
