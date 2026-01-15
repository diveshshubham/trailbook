"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AlbumCard from "@/components/Profile/AlbumCard";
import UserHero from "@/components/Profile/UserHero";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { getMyAlbums, getPublicFeed, type Album, type PublicFeedAlbumItem } from "@/lib/trailbookApi";
import { getMyProfile } from "@/lib/userApi";

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

function clampText(input?: string, max = 140) {
  const s = (input || "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function pickTitle(a: PublicFeedAlbumItem) {
  return a.title?.trim() || "Untitled story";
}

export default function AuthedHome() {
  const router = useRouter();

  const [userName, setUserName] = useState("Trailblazer");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [albumsError, setAlbumsError] = useState<string | null>(null);

  const [publicItems, setPublicItems] = useState<PublicFeedAlbumItem[]>([]);
  const [publicLoading, setPublicLoading] = useState(true);

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
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAlbumsLoading(true);
        setAlbumsError(null);
        const data = await getMyAlbums();
        if (!cancelled) setAlbums(data);
      } catch {
        if (!cancelled) setAlbumsError("Couldn’t load your library right now.");
      } finally {
        if (!cancelled) setAlbumsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPublicLoading(true);
        const res = await getPublicFeed({ limit: 20 });
        if (!cancelled) setPublicItems(res.items || []);
      } catch {
        if (!cancelled) setPublicItems([]);
      } finally {
        if (!cancelled) setPublicLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const photosCount = useMemo(
    () => albums.reduce((sum, a) => sum + (a.photoCount ?? a.photosCount ?? 0), 0),
    [albums]
  );

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Premium header block */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B17] via-[#071A2F] to-[#fafafa]" />
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-28 -right-28 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-10 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.45em] text-white/70 font-semibold">
                Your library
              </p>
              <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-white">
                Welcome back, {userName}.
              </h1>
              <p className="mt-4 text-white/70 text-lg leading-relaxed">
                Keep building chapters. Discover new ones from the community.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/create-album"
                  className="inline-flex justify-center items-center rounded-full px-7 py-3 bg-white text-black font-semibold shadow-lg shadow-[#050B17]/35 hover:opacity-95 transition"
                >
                  Create album
                </Link>
                <a
                  href="#discover"
                  className="inline-flex justify-center items-center rounded-full px-7 py-3 bg-white/10 text-white font-semibold border border-white/15 hover:bg-white/15 transition"
                >
                  Explore public stories
                </a>
              </div>
            </div>

            <div className="w-full lg:w-[460px]">
              <div className="rounded-[32px] border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                <UserHero
                  name={userName}
                  albumsCount={albums.length}
                  photosCount={photosCount}
                  onCreate={() => router.push("/create-album")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* My albums */}
      <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <div className="rounded-[36px] border border-black/5 bg-white shadow-sm overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                  Your stories
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Continue your trail
                </h2>
              </div>
              <Link
                href="/create-album"
                className="inline-flex justify-center items-center rounded-full px-5 py-2 text-xs font-semibold tracking-wide bg-gray-50 border border-black/5 hover:bg-gray-100 transition w-fit"
              >
                + New album
              </Link>
            </div>
          </div>

          <div className="px-8 sm:px-10 pb-10">
            {albumsLoading ? (
              <div className="py-16 text-center text-gray-500">Loading your stories…</div>
            ) : albumsError ? (
              <div className="py-16 text-center text-red-500">{albumsError}</div>
            ) : albums.length === 0 ? (
              <div className="pb-10">
                <div className="relative w-full overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50" />
                  <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/30 blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />

                  <div className="relative px-10 py-12 text-center">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                      First chapter
                    </p>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                      Create your first album
                    </h3>
                    <p className="mt-3 text-gray-500 leading-relaxed max-w-md mx-auto">
                      Give it a title, a place, and a story—then add moments as they happen.
                    </p>
                    <Link
                      href="/create-album"
                      className="mt-7 inline-flex rounded-full px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold transition hover:opacity-95 active:scale-[0.99] shadow-lg shadow-orange-500/20"
                    >
                      Create album
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {albums.map((album) => {
                  const { photos, ...rest } = album;
                  const cover = resolveMediaUrl(album.coverImage || album.coverUrl || album.cover);
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
                        createdAt: album.createdAt,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Discover */}
      <section id="discover" className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
              Discover
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Public stories from the community
            </h2>
            <p className="mt-2 text-gray-600">
              Explore beautifully shared chapters. Save and follow coming soon.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex justify-center items-center rounded-full px-5 py-2 text-xs font-semibold tracking-wide bg-gray-50 border border-black/5 hover:bg-gray-100 transition w-fit"
          >
            Refresh
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(publicLoading
            ? Array.from({ length: 6 }).map((_, i) => ({ id: `sk-${i}` } as PublicFeedAlbumItem))
            : publicItems.slice(0, 9)
          ).map((a, idx) => {
            if (publicLoading) {
              return (
                <div
                  key={a.id}
                  className="rounded-3xl border border-black/5 bg-gradient-to-br from-gray-50 to-white overflow-hidden animate-pulse"
                >
                  <div className="h-44 bg-black/5" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-24 bg-black/10 rounded" />
                    <div className="h-5 w-3/4 bg-black/10 rounded" />
                    <div className="h-4 w-full bg-black/10 rounded" />
                    <div className="h-4 w-2/3 bg-black/10 rounded" />
                  </div>
                </div>
              );
            }

            const href = `/share/${a.id}`;
            const image = resolveMediaUrl(a.coverImage) || a.coverImage || "";

            return (
              <Link
                key={a.id + idx}
                href={href}
                className="group rounded-3xl border border-black/5 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={image}
                    alt={pickTitle(a)}
                    className={[
                      "w-full h-64 object-cover",
                      "transition-transform duration-700 ease-out",
                      "group-hover:scale-[1.06]",
                      "motion-reduce:transform-none motion-reduce:transition-none",
                    ].join(" ")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050B17]/85 via-[#050B17]/25 to-transparent" />

                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/30 border border-white/15 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">
                      <span className="opacity-80">📍</span>
                      <span className="truncate max-w-[26ch]">{a.location || "Unknown"}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/30 border border-white/15 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">
                      <span className="opacity-80">🖼</span>
                      <span>{a.photoCount ?? "—"}</span>
                    </span>
                  </div>

                  <div className="absolute left-5 right-5 bottom-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/65 font-semibold">
                      {formatDate(a.createdAt) || "Public story"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold tracking-tight leading-snug text-white drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
                      {pickTitle(a)}
                    </h3>
                  </div>
                </div>

                <div className="px-6 pt-5 pb-6">
                  <p className="text-sm text-gray-600 leading-relaxed overflow-hidden max-h-[3.25rem]">
                    {clampText(a.description || a.storyPreview, 120)}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden ring-2 ring-black/5">
                        {a.user?.profilePicture ? (
                          <img
                            src={resolveMediaUrl(a.user.profilePicture) || a.user.profilePicture}
                            alt={a.user?.name || "Author"}
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-xs text-gray-400">
                            ✦
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {a.user?.name?.trim() || "Anonymous"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">Open chapter</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 group-hover:text-indigo-700 transition">
                      Open →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

