"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AuthModal from "@/components/Auth/AuthModal";
import EmailOrPhoneStep from "@/components/Auth/EmailOrPhoneStep";
import OtpStep from "@/components/Auth/OtpStep";
import { apiFetch } from "@/lib/api";
import { getMyProfile, resolveProfilePictureUrl } from "@/lib/userApi";
import { getMyAlbums } from "@/lib/trailbookApi";


type User = {
  name: string;
  avatar: string;
  email?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : null;
}

function getTokenFromVerifyResponse(res: unknown): string | null {
  if (!isRecord(res)) return null;

  // Support backend response shapes:
  // { data: { accessToken } } (your current API)
  // { accessToken }
  // { token }
  // { data: { token } }
  const direct = pickString(res, "accessToken") ?? pickString(res, "token");
  if (direct) return direct;

  if (isRecord(res.data)) {
    return pickString(res.data, "accessToken") ?? pickString(res.data, "token");
  }

  return null;
}

function buildFallbackUser(contact: string): User {
  const label = contact.includes("@") ? contact : `+${contact}`;
  const seed = encodeURIComponent(contact || "user");
  return {
    name: label,
    avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}`,
    email: contact.includes("@") ? contact : undefined,
  };
}

export default function Navbar() {
  const router = useRouter();
  // 🔹 Auth / modal state
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "otp">("input");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 User state
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // 🔹 Avatar menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const hydrateFromProfile = async () => {
    try {
      const me = await getMyProfile();
      const name =
        me.profile?.fullName?.trim() ||
        (me.user.email ? me.user.email.split("@")[0] : "") ||
        "Trailblazer";
      const email = me.user.email || undefined;
      const avatar =
        resolveProfilePictureUrl(me.profile?.profilePicture) ||
        `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(
          me.user._id || email || name
        )}`;

      const nextUser: User = { name, avatar, email };
      setUser(nextUser);
      setLoggedIn(true);
      localStorage.setItem("user", JSON.stringify(nextUser));
    } catch (e) {
      // Non-fatal: keep localStorage fallback user if profile service is down
      console.warn("Failed to hydrate navbar user from profile", e);
    }
  };

  // 🔹 Restore login on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setLoggedIn(true);
      } catch {
        localStorage.removeItem("user");
      }
    }

    const token = localStorage.getItem("token");
    if (token) {
      void hydrateFromProfile();
    }
  }, []);

  // Allow any part of the app to request opening the auth modal (e.g., landing page CTA).
  useEffect(() => {
    const onOpenAuth = () => {
      setOpen(true);
      setStep("input");
      setValue("");
    };
    window.addEventListener("tb:open-auth", onOpenAuth as EventListener);
    return () => {
      window.removeEventListener("tb:open-auth", onOpenAuth as EventListener);
    };
  }, []);

  // 🔹 Keep navbar in sync when profile page updates user info
  useEffect(() => {
    const onUpdated = () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      void hydrateFromProfile();
    };
    window.addEventListener("tb:user-updated", onUpdated as EventListener);
    return () => window.removeEventListener("tb:user-updated", onUpdated as EventListener);
  }, []);

  // 🔹 Close avatar menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* LOGO */}
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 transition-transform duration-300 hover:scale-105">
              <Image
                src="/logo.png"
                alt="Trailbook logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-[0.28em] bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                Trailbook
              </span>
              <span className="text-xs tracking-widest text-gray-500 mt-1">
                stories from the wild
              </span>
            </div>
          </div>

          {/* RIGHT SIDE */}
          {!loggedIn ? (
            /* LOGIN / SIGNUP */
            <button
              onClick={() => {
                setOpen(true);
                setStep("input");
                setValue("");
              }}
              className="group relative overflow-hidden rounded-full px-6 py-2"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-red-500 transition-all duration-300 group-hover:scale-110" />
              <span className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
              <span className="relative z-10 text-sm font-semibold text-white">
                Login / Sign up
              </span>
            </button>
          ) : (
            /* AVATAR MENU (CLICK BASED) */
            <div ref={menuRef} className="relative">
              <img
                src={user?.avatar}
                alt="User avatar"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={[
                  "w-10 h-10 rounded-full object-cover cursor-pointer",
                  "ring-2 ring-black/5 shadow-sm",
                  "transition-all duration-200 ease-out",
                  "hover:scale-110 hover:ring-indigo-400/40 hover:shadow-md",
                  "motion-reduce:transform-none motion-reduce:transition-none",
                ].join(" ")}
              />

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl shadow-black/10 border border-black/5 z-50 animate-fadeIn overflow-hidden">
                  <div className="px-4 py-4 border-b border-black/5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="mt-1 text-xs text-gray-500 truncate">{user?.email || "Signed in"}</p>
                  </div>

                  <Link
                    href="/"
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-black/5 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="text-gray-400">📚</span>
                    My Albums
                  </Link>

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-black/5 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="text-gray-400">👤</span>
                    Profile
                  </Link>

                  <Link
                    href="/badges"
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-black/5 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="text-gray-400">🏷️</span>
                    Badges
                  </Link>

                  <button
                    onClick={() => {
                      localStorage.removeItem("user");
                      localStorage.removeItem("token");
                      setLoggedIn(false);
                      setUser(null);
                      setMenuOpen(false);
                      window.dispatchEvent(new Event("tb:user-updated"));
                      window.dispatchEvent(new Event("tb:auth-changed"));
                      router.push("/");
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <span className="text-red-400">⎋</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setStep("input");
          setValue("");
          setLoading(false);
        }}
      >
        {step === "input" ? (
          <EmailOrPhoneStep
            value={value}
            setValue={setValue}
            onContinue={() => setStep("otp")}
          />
        ) : (
          <OtpStep
            loading={loading}
            onVerify={async (otp) => {
              setLoading(true);
            
              const contactRaw = value.trim();
              const isEmail = contactRaw.includes("@");
              const phone = contactRaw.replace(/\D/g, "");
            
              const payload = isEmail
                ? { email: contactRaw, otp }
                : { phone, otp };
            
              try {
                const res = await apiFetch<unknown>("/auth/verify-otp", {
                  method: "POST",
                  auth: false,
                  body: JSON.stringify(payload),
                });
            
                const token = getTokenFromVerifyResponse(res);
                if (!token) throw new Error("Missing access token from verify-otp response");

                const nextUser = buildFallbackUser(isEmail ? contactRaw : phone);

                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify(nextUser));
                window.dispatchEvent(new Event("tb:user-updated"));
                window.dispatchEvent(new Event("tb:auth-changed"));
            
                setUser(nextUser);
                setLoggedIn(true);
                setOpen(false);

                // If user has no albums yet, always land them on the premium empty-state.
                // Also helps if they happened to be on a demo/invalid album route while signing in.
                try {
                  const albums = await getMyAlbums();
                  if (albums.length === 0) router.push("/");
                } catch {
                  // ignore (fallback to staying on current page)
                }

                // Hydrate name/photo from profile service if available
                window.setTimeout(() => {
                  void hydrateFromProfile();
                }, 0);
              } catch (err) {
                console.error(err);
                alert("Invalid OTP");
              } finally {
                setLoading(false);
              }
            }}        
            
          />
        )}
      </AuthModal>
    </>
  );
}
