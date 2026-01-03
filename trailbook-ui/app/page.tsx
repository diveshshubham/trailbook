"use client";

import { useEffect, useState } from "react";
import UserAlbums from "@/components/Profile/UserAlbums";
import FeedGrid from "@/components/Feed/FeedGrid";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {user ? <UserAlbums /> : <FeedGrid />}
    </main>
  );
}
