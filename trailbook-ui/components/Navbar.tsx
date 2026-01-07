"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import AuthModal from "@/components/Auth/AuthModal";
import EmailOrPhoneStep from "@/components/Auth/EmailOrPhoneStep";
import OtpStep from "@/components/Auth/OtpStep";
import { apiFetch } from "@/lib/api";


type User = {
  name: string;
  avatar: string;
};

export default function Navbar() {
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

  // 🔹 Restore login on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setLoggedIn(true);
    }
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
                className="w-10 h-10 rounded-full object-cover cursor-pointer transition-transform hover:scale-105"
              />

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-44 rounded-xl bg-white shadow-lg z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">{user?.name}</p>
                  </div>

                  <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                    My Albums
                  </button>

                  <button
                    onClick={() => {
                      localStorage.removeItem("user");
                      setLoggedIn(false);
                      setUser(null);
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                  >
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
            
              const isEmail = value.includes("@");
            
              const payload = isEmail
                ? { email: value, otp }
                : { phone: value, otp };
            
              try {
                const res = await apiFetch("/auth/verify-otp", {
                  method: "POST",
                  body: JSON.stringify(payload),
                });
            
                localStorage.setItem("token", res.token);
                localStorage.setItem("user", JSON.stringify(res.user));
            
                setUser(res.user);
                setLoggedIn(true);
                setOpen(false);
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
