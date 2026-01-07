"use client";

import { useState } from "react";
import UserAlbums from "@/components/Profile/UserAlbums";
import FeedGrid from "@/components/Feed/FeedGrid";

type StoredUser = {
  name?: string;
  avatar?: string;
};

export default function HomePage() {
  const [user] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const storedUser = window.localStorage.getItem("user");
      return storedUser ? (JSON.parse(storedUser) as StoredUser) : null;
    } catch {
      return null;
    }
  });

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {user ? <UserAlbums /> : <FeedGrid />}
    </main>
  );
}
