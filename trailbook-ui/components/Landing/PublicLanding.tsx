"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublicFeed, type PublicFeedAlbumItem } from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

function clampText(input?: string, max = 160) {
  const s = (input || "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function pickTitle(a: PublicFeedAlbumItem) {
  return a.title?.trim() || "Untitled story";
}

function openAuthModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("tb:open-auth"));
}

const demoItems: PublicFeedAlbumItem[] = [
  {
    id: "demo-1",
    title: "Stories from the wild",
    location: "Mountains · Oceans · Cities",
    createdAt: new Date().toISOString(),
    description:
      "A premium space for journeys—written like chapters, collected like memories.",
    coverImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
    photoCount: 12,
    user: { id: "demo-u", name: "Trailbook" },
  },
  {
    id: "demo-2",
    title: "Cold air, warm light",
    location: "Himalayas",
    createdAt: new Date().toISOString(),
    description:
      "A quiet collection of effort, awe, and the kind of stillness you carry back home.",
    coverImage: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1600&q=80",
    photoCount: 9,
    user: { id: "demo-u2", name: "Guest" },
  },
  {
    id: "demo-3",
    title: "Streets after rain",
    location: "Somewhere familiar",
    createdAt: new Date().toISOString(),
    description:
      "Not a feed. A library of chapters—each one a place you can return to.",
    coverImage: "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80",
    photoCount: 6,
    user: { id: "demo-u3", name: "Guest" },
  },
];

export default function PublicLanding() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PublicFeedAlbumItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeAuthor, setActiveAuthor] = useState<{
    key: string;
    name: string;
    profileUrl: string | null;
  } | null>(null);
  const [dpOpen, setDpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getPublicFeed({ limit: 20 });
        if (cancelled) return;
        setItems(res.items || []);
      } catch {
        if (cancelled) return;
        setError("Couldn’t load the public stories right now. Showing a preview.");
        setItems(demoItems);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close author modal on ESC (backdrop click is handled by the modal container).
  useEffect(() => {
    if (!activeAuthor) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveAuthor(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeAuthor]);

  useEffect(() => {
    // Reset dp viewer whenever author modal closes / switches.
    setDpOpen(false);
  }, [activeAuthor?.key]);

  const featured = items[0] || null;
  const rest = items.slice(1);

  const curated = useMemo(() => {
    // Curate: keep first ~9 items for a tight “editorial” landing.
    return rest.slice(0, 9);
  }, [rest]);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B17] via-[#071A2F] to-[#fafafa]" />
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-28 -right-28 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.10] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 relative">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.45em] text-white/70 font-semibold">
              Trailbook · stories from the wild
            </p>
            <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-white">
              Travel, written like a chapter.
            </h1>
            <p className="mt-6 text-white/70 text-lg leading-relaxed">
              Not a social feed. A premium library of journeys—photos, story, and place—meant to be
              revisited.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a
                href="#public-stories"
                className="inline-flex justify-center items-center rounded-full px-7 py-3 bg-white text-black font-semibold shadow-lg shadow-[#050B17]/35 hover:opacity-95 transition"
              >
                Explore public stories
              </a>
              <Link
                href="/create-album"
                className="inline-flex justify-center items-center rounded-full px-7 py-3 bg-white/10 text-white font-semibold border border-white/15 hover:bg-white/15 transition"
              >
                Create your story
              </Link>
            </div>

            {error && (
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/80">
                <span className="opacity-70">⚠</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Public stories */}
      <section id="public-stories" className="max-w-7xl mx-auto px-6 -mt-10 relative z-10">
        <div className="rounded-[36px] border border-black/5 bg-white shadow-sm overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                  Public stories
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Curated chapters from the community
                </h2>
              </div>
              <Link
                href="/"
                className="inline-flex justify-center items-center rounded-full px-5 py-2 text-xs font-semibold tracking-wide bg-gray-50 border border-black/5 hover:bg-gray-100 transition w-fit"
              >
                Refresh
              </Link>
            </div>
          </div>

          {/* Featured */}
          {featured && (
            <Link
              href={featured.id.startsWith("demo-") ? "/" : `/share/${featured.id}`}
              className="block group"
            >
              <div className="relative overflow-hidden">
                <img
                  src={resolveMediaUrl(featured.coverImage) || featured.coverImage || ""}
                  alt={pickTitle(featured)}
                  className={[
                    "w-full h-[360px] sm:h-[420px] object-cover",
                    "transition-transform duration-700 ease-out",
                    "group-hover:scale-[1.03]",
                    "motion-reduce:transform-none motion-reduce:transition-none",
                  ].join(" ")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050B17]/80 via-[#050B17]/20 to-transparent" />
                <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-end">
                  <div className="max-w-3xl">
                    <p className="text-white/70 text-xs font-semibold tracking-widest uppercase">
                      Featured · {formatDate(featured.createdAt) || "New"}
                    </p>
                    <h3 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                      {pickTitle(featured)}
                    </h3>
                    <p className="mt-3 text-white/75 text-sm sm:text-base leading-relaxed">
                      {clampText(featured.description || featured.storyPreview, 220)}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-xs text-white/85">
                        <span className="opacity-80">📍</span>
                        <span className="truncate max-w-[26ch]">{featured.location || "Unknown"}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-xs text-white/85">
                        <span className="opacity-80">🖼</span>
                        <span>{featured.photoCount ?? "—"} photos</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-xs text-white/85">
                        <span className="opacity-80">✦</span>
                        <span>Open chapter</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Grid */}
          <div className="p-8 sm:p-10 pt-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(loading ? Array.from({ length: 6 }).map((_, i) => ({ id: `sk-${i}` } as PublicFeedAlbumItem)) : curated).map(
                (a, idx) => {
                  if (loading) {
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

                  const href = a.id.startsWith("demo-") ? "/" : `/share/${a.id}`;
                  const image = resolveMediaUrl(a.coverImage) || a.coverImage || "";

                  return (
                    <Link
                      key={a.id + idx}
                      href={href}
                      className="group rounded-3xl border border-black/5 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* Image-first cover */}
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

                        {/* Top chips */}
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

                        {/* Title on image (premium gold) */}
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
                            <div className="relative shrink-0 group/author" data-author-hovercard>
                              <button
                                type="button"
                                className={[
                                  "relative h-10 w-10 rounded-full overflow-hidden",
                                  "ring-2 ring-black/5 bg-gray-100",
                                  "shadow-sm transition-all duration-200 ease-out",
                                  "hover:scale-110 hover:ring-indigo-400/35 hover:shadow-md",
                                  "motion-reduce:transform-none motion-reduce:transition-none",
                                ].join(" ")}
                                aria-label="Open author preview"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const profileUrl =
                                    resolveMediaUrl(a.user?.profilePicture) ||
                                    a.user?.profilePicture ||
                                    null;
                                  const name = a.user?.name?.trim() || "Anonymous";
                                  setActiveAuthor((prev) =>
                                    prev?.key === a.id ? null : { key: a.id, name, profileUrl }
                                  );
                                }}
                              >
                                {a.user?.profilePicture ? (
                                  <img
                                    src={resolveMediaUrl(a.user.profilePicture) || a.user.profilePicture}
                                    alt={a.user?.name || "Author"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full grid place-items-center text-xs text-gray-400">
                                    ✦
                                  </div>
                                )}
                              </button>
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
                }
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              k: "Chapters, not posts",
              d: "Each album is a story-first space: title, place, narrative, and photos that belong together.",
            },
            {
              k: "Private by default",
              d: "Keep memories yours. Share a chapter when you’re ready—without turning life into a feed.",
            },
            {
              k: "Built for the long run",
              d: "A library you return to. Not endless scrolling—just beautiful recollection.",
            },
          ].map((f) => (
            <div
              key={f.k}
              className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm"
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                Philosophy
              </p>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-gray-900">{f.k}</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="relative rounded-[36px] border border-black/5 bg-gradient-to-br from-[#050B17] via-[#071A2F] to-[#0B2A4A] overflow-hidden">
          <div className="absolute -top-28 -right-28 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="p-10 sm:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.45em] text-white/70 font-semibold">
                Start your trail
              </p>
              <h3 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Create your first album.
              </h3>
              <p className="mt-3 text-white/70 leading-relaxed max-w-xl">
                Turn photos into a chapter worth revisiting—title, location, story, and a gallery that
                feels like a magazine.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/create-album"
                className="inline-flex justify-center items-center rounded-full px-7 py-3 bg-white text-black font-semibold shadow-lg shadow-[#050B17]/35 hover:opacity-95 transition"
              >
                Create album
              </Link>
              <a
                href="#public-stories"
                className="inline-flex justify-center items-center rounded-full px-7 py-3 bg-white/10 text-white font-semibold border border-white/15 hover:bg-white/15 transition"
              >
                Explore
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Author modal (centered, blurred background) */}
      {activeAuthor && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActiveAuthor(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-[#050B17]/55 backdrop-blur-md" />

          <div className="relative w-full max-w-md rounded-[28px] overflow-hidden border border-white/10 bg-white/95 backdrop-blur-xl shadow-2xl shadow-black/20">
            {/* Navy aura */}
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />

            <div className="relative p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                    Author preview
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-gray-900">
                    {activeAuthor.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAuthor(null)}
                  className="h-10 w-10 rounded-full bg-black/5 hover:bg-black/10 transition grid place-items-center"
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setDpOpen(true)}
                  className={[
                    "relative h-28 w-28 rounded-full overflow-hidden bg-gray-100 ring-2 ring-indigo-400/25 shadow-md",
                    "transition-transform duration-200 ease-out hover:scale-[1.03]",
                    "motion-reduce:transform-none motion-reduce:transition-none",
                  ].join(" ")}
                  aria-label="View profile picture"
                  title="View profile picture"
                >
                  {/* Premium pulsing halo (discoverable without text) */}
                  <span
                    aria-hidden="true"
                    className={[
                      "absolute -inset-2 rounded-full",
                      "ring-2 ring-cyan-400/30",
                      "animate-pulse",
                      "motion-reduce:animate-none",
                    ].join(" ")}
                  />
                  <span
                    aria-hidden="true"
                    className={[
                      "absolute -inset-4 rounded-full",
                      "ring-1 ring-indigo-400/20",
                      "animate-pulse [animation-delay:600ms]",
                      "motion-reduce:animate-none",
                    ].join(" ")}
                  />
                  {activeAuthor.profileUrl ? (
                    <img
                      src={activeAuthor.profileUrl}
                      alt={activeAuthor.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-gray-400">
                      ✦
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60" />
                </button>

                <p className="mt-4 text-sm text-gray-600 text-center leading-relaxed">
                  Like their vibe? Sign up to follow authors and save chapters you want to revisit.
                </p>

                <div className="mt-6 w-full flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="w-full rounded-full px-5 py-3 text-sm font-semibold bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20 hover:opacity-95 transition motion-reduce:transition-none"
                  >
                    Follow (Sign up)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAuthor(null)}
                    className="w-full rounded-full px-5 py-3 text-sm font-semibold bg-white border border-black/10 hover:bg-gray-50 transition"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>

            {/* In-card DP viewer (bigger, premium, not full-screen) */}
            {dpOpen && (
              <div
                className="absolute inset-0 z-40"
                // Click anywhere outside the frame closes the DP viewer (robust even if children stop bubbling).
                onPointerDownCapture={(e) => {
                  const t = e.target as HTMLElement | null;
                  if (!t) {
                    setDpOpen(false);
                    return;
                  }
                  if (t.closest?.("[data-dp-frame]")) return;
                  setDpOpen(false);
                }}
              >
                {/* Backdrop (click outside frame closes) */}
                <div className="absolute inset-0 bg-[#050B17]/35 backdrop-blur-sm pointer-events-none" />
                <div className="absolute inset-0 p-6 flex items-center justify-center">
                  {/* Frame becomes the popup (no extra card/padding) */}
                  <div
                    data-dp-frame
                    className="relative w-[min(86vw,520px)] aspect-square"
                    onPointerDown={(e) => {
                      // Don't close when interacting with the frame itself.
                      e.stopPropagation();
                    }}
                  >
                    {/* Tiny close button */}
                    <button
                      type="button"
                      onClick={() => setDpOpen(false)}
                      className={[
                        "absolute -top-3 -right-3 z-10",
                        "h-8 w-8 rounded-full",
                        "bg-white/80 backdrop-blur-md",
                        "border border-black/10",
                        "shadow-sm hover:shadow-md hover:bg-white",
                        "grid place-items-center",
                        "transition",
                        "motion-reduce:transition-none",
                      ].join(" ")}
                      aria-label="Close picture"
                      title="Close"
                    >
                      ✕
                    </button>

                    {/* outer glow */}
                    <div className="absolute -inset-8 rounded-[36px] bg-[radial-gradient(circle_at_30%_25%,rgba(99,102,241,0.22),transparent_62%),radial-gradient(circle_at_70%_75%,rgba(34,211,238,0.20),transparent_58%)] blur-2xl" />

                    {/* gradient frame */}
                    <div className="relative h-full w-full p-[2px] rounded-[30px] bg-gradient-to-tr from-indigo-400/70 via-cyan-300/35 to-pink-400/55 shadow-2xl shadow-black/20">
                      <div className="h-full w-full p-[6px] rounded-[28px] bg-white/85 backdrop-blur-sm">
                        <div className="relative h-full w-full rounded-[24px] overflow-hidden bg-gray-100">
                          {activeAuthor.profileUrl ? (
                            <img
                              src={activeAuthor.profileUrl}
                              alt={activeAuthor.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-gray-400">
                              ✦
                            </div>
                          )}
                          {/* premium glass highlight */}
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.65),transparent_58%)] opacity-55" />
                          <div className="absolute inset-0 ring-1 ring-black/10 rounded-[24px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

