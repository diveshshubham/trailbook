"use client";

import UserHero from "./UserHero";
import AlbumCard from "./AlbumCard";
import { getMyAlbums, type Album } from "@/lib/trailbookApi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { getMyProfile } from "@/lib/userApi";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

export default function UserAlbums() {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [userName, setUserName] = useState(() => {
    if (typeof window === "undefined") return "Trailblazer";
    try {
      const stored = window.localStorage.getItem("user");
      const parsed = stored ? (JSON.parse(stored) as { name?: string }) : null;
      return parsed?.name?.trim() || "Trailblazer";
    } catch {
      return "Trailblazer";
    }
  });

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Fetch albums from backend
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const data = await getMyAlbums();
        setAlbums(data);
      } catch (err: unknown) {
        console.error("Failed to fetch albums", err);
        setError("Failed to load albums");
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
  }, []);

  // 🔹 Fetch profile name for hero (premium touch)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getMyProfile();
        if (!alive) return;
        const name =
          me.profile?.fullName?.trim() ||
          (me.user.email ? me.user.email.split("@")[0] : "") ||
          "Trailblazer";
        setUserName(name);
      } catch {
        // ignore (keep fallback)
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 🔹 Loading state (minimal, premium)
  if (loading) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <p className="text-gray-500">Loading your stories…</p>
      </section>
    );
  }

  // 🔹 Error state (rare but safe)
  if (error) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <p className="text-red-500">{error}</p>
      </section>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <UserHero
          name={userName}
          albumsCount={albums.length}
          photosCount={albums.reduce((sum, a) => sum + (a.photoCount ?? a.photosCount ?? 0), 0)}
          onCreate={() => router.push("/create-album")}
        />
      </div>

      <section className="max-w-6xl mx-auto px-6 pb-24 pt-10">
        {/* Archive Link - Premium and Prominent */}
        <div className="mb-10 flex items-center justify-between">
          <div />
          <Link
            href="/archive"
            className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-theme hover:shadow-theme-lg"
            style={{
              background: isDefault 
                ? "linear-gradient(to right, rgba(249, 115, 22, 0.1), rgba(236, 72, 153, 0.1))" 
                : "var(--theme-gradient-secondary)",
              color: "var(--theme-text-primary)",
              border: "1px solid var(--theme-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--theme-border)";
            }}
            title="Manage archived albums and photos"
          >
            <span className="text-lg transition-transform group-hover:scale-110" style={{ color: "var(--theme-accent)" }}>
              📦
            </span>
            <span>Archive</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60" style={{ color: "var(--theme-text-tertiary)" }}>
              Manage
            </span>
          </Link>
        </div>

        {albums.length === 0 ? (
          /* ================= EMPTY STATE ================= */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50" />
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />

              <div className="relative px-10 py-14 text-center">
                <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                  Your library
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                  Your first story is waiting
                </h2>

                <p className="mt-3 text-gray-500 leading-relaxed max-w-md mx-auto">
                  Start an album, add moments, and turn your trip into something you’ll want to revisit.
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {[
                    { k: "01", t: "Create an album", d: "Give it a title, location, and story." },
                    { k: "02", t: "Upload moments", d: "Drop photos and add captions." },
                    { k: "03", t: "Share beautifully", d: "Make it public when you’re ready." },
                  ].map((s) => (
                    <div
                      key={s.k}
                      className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm px-4 py-4"
                    >
                      <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                        {s.k}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{s.t}</p>
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{s.d}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push("/create-album")}
                  className="mt-8 rounded-full px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold transition hover:opacity-95 active:scale-[0.99] shadow-lg shadow-orange-500/20"
                >
                  Create your first album
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= ALBUMS GRID ================= */
          <>
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-semibold">
                  Library
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                  Your Stories
                </h2>
              </div>
              <Link
                href="/manage"
                className="px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: "var(--theme-surface-hover)",
                  color: "var(--theme-text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                  e.currentTarget.style.color = "var(--theme-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                  e.currentTarget.style.color = "var(--theme-text-secondary)";
                }}
              >
                <span className="text-sm font-medium">Manage Albums</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {albums.map((album) => {
                const { photos, ...rest } = album;
                const cover = resolveMediaUrl(
                  album.coverImage || album.coverUrl || album.cover
                );
                return (
                  <AlbumCard 
                    key={album.id || album._id} 
                    album={{
                      ...rest,
                      title: album.title || album.name || "Untitled story",
                      cover:
                        cover ||
                        "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
                      photosCount: album.photoCount ?? album.photosCount,
                      location: album.location,
                      isPublic: album.isPublic,
                    }} 
                  />
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
