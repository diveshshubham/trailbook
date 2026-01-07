"use client";

import UserHero from "./UserHero";
import AlbumCard from "./AlbumCard";
import { getMyAlbums, type Album } from "@/lib/trailbookApi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export default function UserAlbums() {
  const router = useRouter();
  const userName = "Shubham";

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
      {/* SHOW HERO ONLY WHEN ALBUMS EXIST */}
      {albums.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pt-10">
          <UserHero
            name={userName}
            albumsCount={albums.length}
            photosCount={albums.reduce((sum, a) => sum + (a.photoCount ?? a.photosCount ?? 0), 0)}
            onCreate={() => router.push("/create-album")}
          />
        </div>
      )}

      <section className="max-w-6xl mx-auto px-6 pb-24 pt-10">
        {albums.length === 0 ? (
          /* ================= EMPTY STATE ================= */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-3xl px-10 py-14 text-center max-w-md shadow-sm">
              <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
                <span className="text-3xl">📖</span>
              </div>

              <h2 className="text-xl font-semibold">
                Your first story is waiting
              </h2>

              <p className="mt-3 text-gray-500 leading-relaxed">
                Create an album to begin collecting moments, memories,
                and milestones from your journeys.
              </p>

              <button
                onClick={() => router.push("/create-album")}
                className="
                  mt-6 rounded-full px-8 py-3
                  bg-gradient-to-r from-orange-500 to-pink-500
                  text-white font-semibold
                  transition-all duration-200
                  hover:scale-105 active:scale-95
                  shadow-lg
                "
              >
                Create your first album
              </button>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {albums.map((album) => {
                const { photos, ...rest } = album;
                const cover = resolveMediaUrl(
                  album.coverImage || album.coverUrl || album.cover
                );
                return (
                  <AlbumCard 
                    key={album.id} 
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
