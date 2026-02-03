"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

import AlbumCard from "@/components/Profile/AlbumCard";
import UserHero from "@/components/Profile/UserHero";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
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
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

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

  // Calculate emotional hooks for UserHero
  const lastAlbumDate = useMemo(() => {
    if (albums.length === 0) return undefined;
    const sorted = [...albums].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    const latest = sorted[0];
    if (!latest?.createdAt) return undefined;
    const date = new Date(latest.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }, [albums]);

  const mostActiveAlbum = useMemo(() => {
    if (albums.length === 0) return undefined;
    const sorted = [...albums].sort((a, b) => {
      const countA = a.photoCount ?? a.photosCount ?? 0;
      const countB = b.photoCount ?? b.photosCount ?? 0;
      return countB - countA;
    });
    return sorted[0]?.title || sorted[0]?.name || undefined;
  }, [albums]);

  return (
    <main className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
      {/* Premium header block - Theme-aware */}
      <section className="relative overflow-hidden">
        {isDefault ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#050B17] via-[#071A2F] to-[#fafafa]" />
            <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute top-28 -right-28 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
            {/* Subtle mountain silhouette texture */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-64 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='1200' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,400 L0,300 Q200,250 400,280 T800,260 T1200,300 L1200,400 Z' fill='%23ffffff'/%3E%3C/svg%3E")`,
                backgroundSize: 'cover',
                backgroundPosition: 'bottom',
                backgroundRepeat: 'no-repeat',
              }}
            />
            {/* Subtle grain texture */}
            <div 
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px',
              }}
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, var(--theme-accent), var(--theme-background))`,
                opacity: 0.15,
              }}
            />
            <div
              className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
            />
            <div
              className="absolute top-28 -right-28 h-96 w-96 rounded-full blur-3xl"
              style={{ backgroundColor: "var(--theme-info)", opacity: 0.1 }}
            />
            <div className="absolute inset-0" style={{ backgroundColor: "var(--theme-background)" }} />
          </>
        )}
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-10 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div className="max-w-2xl relative">
              {/* Subtle background blur for better text readability */}
              {isDefault && (
                <div className="absolute inset-0 -inset-4 bg-gradient-to-r from-[#050B17]/20 via-transparent to-transparent blur-xl rounded-2xl" />
              )}
              <div className="relative">
                <p className="text-[9px] uppercase tracking-[0.5em] font-medium" style={{ color: isDefault ? "rgba(255,255,255,0.6)" : "var(--theme-text-tertiary)" }}>
                  Your library
                </p>
                <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight" style={{ 
                  color: isDefault ? "white" : "var(--theme-text-primary)",
                  textShadow: isDefault ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
                }}>
                  Start your next chapter
                </h1>
                <p className="mt-4 text-lg leading-relaxed font-medium" style={{ 
                  color: isDefault ? "rgba(255,255,255,0.9)" : "var(--theme-text-secondary)",
                  textShadow: isDefault ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
                }}>
                  Keep building chapters. Discover new ones from the community.
                </p>
              </div>
              
              {/* Empty state storytelling placeholders */}
              {albums.length === 0 && !albumsLoading && (
                <div className="mt-6 flex flex-wrap gap-3 opacity-40">
                  {["Your Sandakphu Trek", "Cycling Through Goa", "Monsoon Evenings"].map((placeholder, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 rounded-full border backdrop-blur-sm"
                      style={{
                        backgroundColor: isDefault ? "rgba(255,255,255,0.05)" : "var(--theme-surface-elevated)",
                        borderColor: isDefault ? "rgba(255,255,255,0.1)" : "var(--theme-border)",
                        color: isDefault ? "rgba(255,255,255,0.6)" : "var(--theme-text-tertiary)",
                      }}
                    >
                      <span className="text-sm font-medium">{placeholder}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/create-album"
                  className="group inline-flex justify-center items-center rounded-full px-8 py-3.5 font-semibold shadow-theme-lg transition-all duration-300 hover:shadow-theme-xl hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
                  style={{
                    background: isDefault ? "white" : "var(--theme-gradient-primary)",
                    color: isDefault ? "black" : "var(--theme-text-inverse)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    if (isDefault) {
                      e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.15), 0 0 20px rgba(255,255,255,0.3)";
                    } else {
                      e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.2), 0 0 30px var(--theme-accent)";
                      e.currentTarget.style.filter = "drop-shadow(0 0 20px var(--theme-accent))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  <span className="mr-2 text-lg group-hover:scale-110 transition-transform duration-300">✨</span>
                  Create chapter
                </Link>
                <div className="flex flex-col gap-1">
                  <a
                    href="#discover"
                    className="group inline-flex items-center rounded-full px-6 py-3 font-medium border transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      backgroundColor: isDefault ? "rgba(255,255,255,0.08)" : "var(--theme-surface)",
                      borderColor: isDefault ? "rgba(255,255,255,0.2)" : "var(--theme-border)",
                      color: isDefault ? "rgba(255,255,255,0.9)" : "var(--theme-text-primary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isDefault) {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                        e.currentTarget.style.borderColor = "var(--theme-accent)";
                      } else {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDefault) {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                        e.currentTarget.style.borderColor = "var(--theme-border)";
                      } else {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                      }
                    }}
                  >
                    <span className="mr-2 text-base">🌍</span>
                    <span>Explore public stories</span>
                    <span className="ml-2 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">→</span>
                  </a>
                  <span className="text-xs ml-6 opacity-70 group-hover:opacity-90 transition-opacity duration-300" style={{ 
                    color: isDefault ? "rgba(255,255,255,0.6)" : "var(--theme-text-tertiary)" 
                  }}>
                    Stories from the trail, shared by others
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[460px]">
              <div
                className="rounded-[32px] border backdrop-blur-xl p-6"
                style={{
                  borderColor: isDefault ? "rgba(255,255,255,0.1)" : "var(--theme-border)",
                  backgroundColor: isDefault ? "rgba(255,255,255,0.1)" : "var(--theme-surface)",
                }}
              >
                <div className="group transition-all duration-200 hover:-translate-y-1">
                  <UserHero
                    name={userName}
                    albumsCount={albums.length}
                    photosCount={photosCount}
                    onCreate={() => router.push("/create-album")}
                    lastAlbumDate={lastAlbumDate}
                    mostActiveAlbum={mostActiveAlbum}
                    mostActiveAlbumId={albums.length > 0 ? (() => {
                      const sorted = [...albums].sort((a, b) => {
                        const countA = a.photoCount ?? a.photosCount ?? 0;
                        const countB = b.photoCount ?? b.photosCount ?? 0;
                        return countB - countA;
                      });
                      return sorted[0]?.id || sorted[0]?._id || undefined;
                    })() : undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* My albums */}
      <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <div className="rounded-[36px] border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-theme overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--theme-text-tertiary)] font-semibold">
                  Your stories
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--theme-text-primary)]">
                  Continue your trail
                </h2>
              </div>
              <Link
                href="/create-album"
                className="group inline-flex justify-center items-center rounded-full px-5 py-2 text-xs font-semibold tracking-wide bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] hover:bg-[var(--theme-surface-elevated)] hover:border-[var(--theme-accent)] transition-all duration-200 w-fit text-[var(--theme-text-primary)] hover:scale-[1.02] active:scale-[0.98]"
              >
                + New chapter
              </Link>
            </div>
          </div>

          <div className="px-8 sm:px-10 pb-10">
            {albumsLoading ? (
              <div className="py-16 text-center text-[var(--theme-text-secondary)]">Loading your stories…</div>
            ) : albumsError ? (
              <div className="py-16 text-center text-[var(--theme-error)]">{albumsError}</div>
            ) : albums.length === 0 ? (
              <div className="pb-10">
                <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-theme">
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{ background: "var(--theme-gradient-secondary)" }}
                  />
                  <div
                    className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl"
                    style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
                  />
                  <div
                    className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl"
                    style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
                  />

                  <div className="relative px-10 py-12 text-center">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--theme-text-tertiary)] font-semibold">
                      First chapter
                    </p>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-[var(--theme-text-primary)]">
                      Create your first chapter
                    </h3>
                    <p className="mt-3 text-[var(--theme-text-secondary)] leading-relaxed max-w-md mx-auto font-medium">
                      Give it a title, a place, and a story—then add moments as they happen.
                    </p>
                    <Link
                      href="/create-album"
                      className="group mt-7 inline-flex rounded-full px-8 py-3.5 text-white font-semibold transition-all duration-300 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] shadow-theme-lg hover:shadow-theme-xl"
                      style={{ background: "var(--theme-gradient-primary)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <span className="mr-2">✨</span>
                      Create chapter
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
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--theme-text-tertiary)] font-semibold">
              Discover
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--theme-text-primary)]">
              Public stories from the community
            </h2>
            <p className="mt-2 text-[var(--theme-text-secondary)]">
              Explore beautifully shared chapters. Save and follow coming soon.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex justify-center items-center rounded-full px-5 py-2 text-xs font-semibold tracking-wide bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] hover:bg-[var(--theme-surface-elevated)] transition w-fit text-[var(--theme-text-primary)]"
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
                className="group rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] overflow-hidden shadow-theme hover:shadow-theme-xl hover:-translate-y-1 transition-all duration-300"
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

                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 border border-white/15 px-2.5 py-1 text-[10px] text-white/85 backdrop-blur-md">
                        <span className="opacity-80 text-xs">📍</span>
                        <span className="truncate max-w-[26ch]">{a.location || "Unknown"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 border border-white/15 px-2.5 py-1 text-[10px] text-white/85 backdrop-blur-md">
                        <span className="opacity-80 text-xs">🖼</span>
                        <span>{a.photoCount ?? "—"}</span>
                      </span>
                    </div>
                    
                    {/* Badge Count - Compact */}
                    {a.badges && a.badges.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // TODO: Open badge modal/detail view
                        }}
                        className="relative inline-flex items-center gap-1.5 rounded-full bg-black/30 border border-white/15 px-2.5 py-1 text-[10px] text-white/85 backdrop-blur-md hover:bg-black/40 hover:border-white/25 transition-all duration-200"
                      >
                        <span className="text-xs opacity-90">🏆</span>
                        <span className="font-semibold">{a.badges.length}</span>
                      </button>
                    )}
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
                  <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed overflow-hidden max-h-[3.25rem]">
                    {clampText(a.description || a.storyPreview, 120)}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {a.user?.id ? (
                        <ClickableUserAvatar
                          userId={a.user.id}
                          profilePicture={a.user.profilePicture}
                          name={a.user?.name || "Author"}
                          size="md"
                          showName={true}
                        />
                      ) : (
                        <>
                          <div className="h-10 w-10 rounded-full bg-[var(--theme-surface-elevated)] overflow-hidden ring-2 ring-[var(--theme-border)]">
                            {a.user?.profilePicture ? (
                              <img
                                src={resolveMediaUrl(a.user.profilePicture) || a.user.profilePicture}
                                alt={a.user?.name || "Author"}
                                className="h-full w-full object-cover"
                                draggable={false}
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-xs text-[var(--theme-text-tertiary)]">
                                ✦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">
                              {a.user?.name?.trim() || "Anonymous"}
                            </p>
                            <p className="text-xs text-[var(--theme-text-tertiary)] truncate">Open chapter</p>
                          </div>
                        </>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-accent)] transition">
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

