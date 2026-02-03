"use client";

import { useEffect, useState } from "react";
import AuthedHome from "@/components/Landing/AuthedHome";
import PublicLanding from "@/components/Landing/PublicLanding";

type StoredUser = {
  name?: string;
  avatar?: string;
};

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return Boolean(window.localStorage.getItem("token"));
    } catch {
      return false;
    }
  });

  const [user, setUser] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const storedUser = window.localStorage.getItem("user");
      return storedUser ? (JSON.parse(storedUser) as StoredUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setAuthed(Boolean(window.localStorage.getItem("token")));
        const storedUser = window.localStorage.getItem("user");
        setUser(storedUser ? (JSON.parse(storedUser) as StoredUser) : null);
      } catch {
        setAuthed(false);
        setUser(null);
      }
    };

    // Fires when Navbar/Profile updates local user
    window.addEventListener("tb:user-updated", sync as EventListener);
    window.addEventListener("tb:auth-changed", sync as EventListener);

    // Fires in other tabs; harmless in same tab
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("tb:user-updated", sync as EventListener);
      window.removeEventListener("tb:auth-changed", sync as EventListener);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {authed || user ? <AuthedHome /> : <PublicLanding />}
    </main>
  );
}
