"use client";

import { useEffect, useMemo, useState } from "react";
import AlbumHero from "@/components/Album/AlbumHero";
import AlbumStory from "@/components/Album/AlbumStory";
import AlbumPhotos from "@/components/Album/AlbumPhotos";
import AlbumBadgesStrip from "@/components/Badges/AlbumBadgesStrip";
import {
  getAlbumMedia,
  getMyAlbums,
  getPresignedUrl,
  updateAlbum,
  updateAlbumCover,
  updateMediaDetails,
  type Album,
  type MediaItem,
} from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { useRouter } from "next/navigation";
import type { MediaMeta } from "@/components/Album/Lightbox";
import { getMediaReflectionsCount } from "@/lib/badgesApi";
import { useTheme } from "@/contexts/ThemeContext";
import StoryEditor from "@/components/Album/StoryEditor";

function formatSubtitle(createdAt?: string, location?: string) {
  const parts: string[] = [];
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push(d.toLocaleString(undefined, { month: "long", year: "numeric" }));
    }
  }
  if (location) parts.push(location);
  return parts.join(" · ");
}

export default function AlbumDetailClient({ albumId }: { albumId: string }) {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  const [album, setAlbum] = useState<Album | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myAlbumsCount, setMyAlbumsCount] = useState<number | null>(null);
  const [slideshowToken, setSlideshowToken] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [reflectionCounts, setReflectionCounts] = useState<Record<string, number>>({});
  const [albumDraft, setAlbumDraft] = useState<{
    title: string;
    description: string;
    location: string;
    story: string;
    eventDate: string;
    isPublic: boolean;
  }>({
    title: "",
    description: "",
    location: "",
    story: "",
    eventDate: "",
    isPublic: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token =
          typeof window !== "undefined" ? window.localStorage.getItem("token") : null;

        // If a signed-in user lands on /album/demo (or any album route with no albums), send them back to the library.
        if (token && albumId === "demo") {
          router.replace("/");
          return;
        }

        const albums = await getMyAlbums();
        if (cancelled) return;
        setMyAlbumsCount(albums.length);

        // New users / users with zero albums should never see a "default demo album" screen.
        if (token && albums.length === 0) {
          router.replace("/");
          return;
        }

        const found = albums.find((a) => a.id === albumId || a._id === albumId) || null;
        if (!found) {
          setAlbum(null);
          setMedia([]);
          setError("Album not found.");
          return;
        }

        const mediaDataRaw = await getAlbumMedia(albumId);
        const mediaData = [...mediaDataRaw].sort((a, b) => {
          const ta = new Date(a.createdAt).getTime();
          const tb = new Date(b.createdAt).getTime();
          if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
          return tb - ta; // latest first
        });
        if (!cancelled) {
          setAlbum(found);
          setMedia(mediaData);
        }
      } catch {
        if (!cancelled) {
          setError("Couldn’t load this album from the server.");
          setAlbum(null);
          setMedia([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  const photos = useMemo(() => {
    return media
      .map((m) => resolveMediaUrl(m.url || m.key))
      .filter(Boolean) as string[];
  }, [media]);

  const mediaWithResolvedUrl = useMemo(() => {
    return media.map((m) => ({
      ...m,
      url: resolveMediaUrl(m.url || m.key),
    }));
  }, [media]);

  // Fetch a small set of reflection counts for the gallery grid (premium "signal" without spamming requests).
  useEffect(() => {
    let cancelled = false;
    const ids = media.slice(0, 24).map((m) => m._id).filter(Boolean);
    const toFetch = ids.filter((id) => typeof reflectionCounts[id] !== "number");
    if (toFetch.length === 0) return;

    const run = async () => {
      const out: Record<string, number> = {};
      const concurrency = 6;
      let idx = 0;
      const worker = async () => {
        while (!cancelled) {
          const i = idx++;
          if (i >= toFetch.length) return;
          const id = toFetch[i];
          try {
            const res = await getMediaReflectionsCount({ mediaId: id });
            out[id] = typeof res.count === "number" ? res.count : 0;
          } catch {
            // ignore per-item failures
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, toFetch.length) }, () => worker()));
      if (cancelled) return;
      if (Object.keys(out).length) {
        setReflectionCounts((prev) => ({ ...prev, ...out }));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [media, reflectionCounts]);

  const title = album?.title || album?.name || "Untitled story";
  const subtitle = formatSubtitle(album?.createdAt, album?.location);
  const coverUrl =
    resolveMediaUrl(album?.coverImage || album?.coverUrl || album?.cover) || photos[0];

  const effectiveCoverUrl = coverPreviewUrl || coverUrl;

  useEffect(() => {
    if (!album) return;
    const normalizeDate = (v?: string) => {
      if (!v) return "";
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    };
    setAlbumDraft({
      title: album.title || album.name || "",
      description: album.description || "",
      location: album.location || "",
      story: album.story || "",
      eventDate: normalizeDate((album as unknown as { eventDate?: string }).eventDate),
      isPublic: Boolean(album.isPublic),
    });
  }, [album]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  const uploadViaProxy = async (payload: {
    uploadUrl: string;
    contentType: string;
    file: File;
  }) => {
    const fd = new FormData();
    fd.append("uploadUrl", payload.uploadUrl);
    fd.append("contentType", payload.contentType);
    fd.append("file", payload.file);
    const res = await fetch("/api/s3-upload", { method: "POST", body: fd });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Failed to upload cover image");
    }
  };

  const onPickCover = () => {
    const el = document.getElementById("tb-cover-file") as HTMLInputElement | null;
    el?.click();
  };

  const onCoverSelected = async (file: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const blobUrl = URL.createObjectURL(file);
      setCoverPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return blobUrl;
      });

      const presigned = await getPresignedUrl({
        albumId,
        contentType: file.type || "image/jpeg",
      });

      await uploadViaProxy({
        uploadUrl: presigned.uploadUrl,
        contentType: file.type || "image/jpeg",
        file,
      });

      const updated = await updateAlbumCover({ albumId, coverImage: presigned.key });
      setAlbum((prev) => (prev ? { ...prev, ...updated } : updated));

      // clear preview once saved (keeps real URL source of truth)
      setCoverPreviewUrl(null);
    } catch (e) {
      console.error(e);
      // If upload fails, keep UI stable by clearing preview.
      setCoverPreviewUrl(null);
    } finally {
      setUploadingCover(false);
      const el = document.getElementById("tb-cover-file") as HTMLInputElement | null;
      if (el) el.value = "";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-gray-500">Loading your album…</p>
      </main>
    );
  }

  if (!album) {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    const isEmptyLibrary = Boolean(token) && (myAlbumsCount ?? 0) === 0;

    return (
      <main className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-white shadow-sm overflow-hidden">
          <div className="p-8">
            <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
              {isEmptyLibrary ? "Welcome" : "Not found"}
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              {isEmptyLibrary ? "Create your first album" : "We couldn’t find that album"}
            </h1>
            <p className="mt-3 text-gray-500 leading-relaxed">
              {isEmptyLibrary
                ? "Your library is empty right now. Start a new album to collect moments, stories, and photos."
                : error || "Try going back to your library and opening an album again."}
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/")}
                className="rounded-full px-6 py-3 bg-white border border-black/10 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
              >
                Back to library
              </button>
              {isEmptyLibrary && (
                <button
                  onClick={() => router.push("/create-album")}
                  className="rounded-full px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold shadow-lg shadow-orange-500/20 hover:opacity-95 active:scale-[0.99] transition"
                >
                  Create album
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="px-8 pb-8">
              <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-sm border border-orange-100">
                {error}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#fafafa] min-h-screen">
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-sm border border-orange-100">
            {error}
          </div>
        </div>
      )}

      <AlbumHero
        title={title}
        coverUrl={effectiveCoverUrl}
        subtitle={subtitle || undefined}
        isPublic={album?.isPublic}
      />

      <div className="max-w-7xl mx-auto -mt-10 relative z-10 px-6">
        <div className="mb-10">
          <AlbumBadgesStrip 
            albumId={albumId} 
            canAssign 
            albumOwnerId={(album as { userId?: string })?.userId}
            isPublic={album?.isPublic ?? false}
          />
        </div>
        <AlbumStory albumId={albumId} initialStory={album?.story} />

        <div className="mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gallery</h2>
              <p className="text-gray-500 text-sm mt-1">Capture. Preserve. Share.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide bg-white border border-black/5 shadow-sm hover:shadow-md transition whitespace-nowrap"
                title="Edit album details"
              >
                <span className="text-gray-800">✎</span>
                <span className="text-gray-700">Edit</span>
              </button>
              <button
                onClick={() => {
                  setSlideshowToken((n) => n + 1);
                }}
                disabled={photos.length === 0}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide bg-white border border-black/5 shadow-sm hover:shadow-md transition disabled:opacity-40 whitespace-nowrap"
                title="Start slideshow"
              >
                <span className="text-gray-800">▶</span>
                <span className="text-gray-700">Slideshow</span>
              </button>

              <button
                onClick={() => router.push("/")}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide bg-white border border-black/5 shadow-sm hover:shadow-md transition whitespace-nowrap"
              >
                <span className="text-gray-800">←</span>
                <span className="text-gray-700">Back to library</span>
              </button>
            </div>
          </div>

          <AlbumPhotos
            albumId={albumId}
            photos={photos}
            mediaItems={mediaWithResolvedUrl}
            showUpload
            slideshowToken={slideshowToken}
            reflectionCounts={reflectionCounts}
            onSetCover={async (media) => {
              if (!albumId) return;
              const key = media.key || "";
              if (!key) return;
              const updated = await updateAlbumCover({ albumId, coverImage: key });
              setAlbum((prev) => (prev ? { ...prev, ...updated } : updated));
            }}
            onSaveMediaMeta={async (mediaId, meta: MediaMeta) => {
              const updated = await updateMediaDetails(mediaId, {
                title: meta.title,
                description: meta.description,
                location: meta.location,
                story: meta.story,
                tags: meta.tags,
                isPublic: meta.isPublic,
              });

              setMedia((prev) => prev.map((m) => (m._id === mediaId ? { ...m, ...updated } : m)));
            }}
          />
        </div>
      </div>

      {/* Premium edit album drawer */}
      {editOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <aside 
            className="absolute top-0 right-0 bottom-0 w-[min(800px,95vw)] max-w-[95vw] backdrop-blur-xl border-l shadow-2xl transition-colors duration-300"
            style={{
              backgroundColor: "var(--theme-backdrop)",
              borderColor: "var(--theme-border)",
            }}
          >
            <div 
              className="px-6 pt-6 pb-5 border-b flex items-center justify-between transition-colors duration-300"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <div>
                <p 
                  className="text-[10px] uppercase tracking-[0.35em] font-semibold"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Album settings
                </p>
                <h3 
                  className="mt-1 text-lg font-bold tracking-tight"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  Edit details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="h-10 w-10 rounded-full transition grid place-items-center"
                style={{
                  backgroundColor: "var(--theme-surface-hover)",
                  color: "var(--theme-text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                  e.currentTarget.style.color = "var(--theme-text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                  e.currentTarget.style.color = "var(--theme-text-secondary)";
                }}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 overflow-auto h-full pb-32">
              <div 
                className="rounded-3xl border p-4 transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface-elevated)",
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p 
                      className="text-[10px] uppercase tracking-[0.35em] font-semibold"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      Cover image
                    </p>
                    <p 
                      className="mt-1 text-sm"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      Upload a new cover or set one from the gallery (bookmark icon).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onPickCover}
                    disabled={uploadingCover}
                    className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold border transition disabled:opacity-60"
                    style={{
                      backgroundColor: "var(--theme-surface)",
                      borderColor: "var(--theme-border)",
                      color: "var(--theme-text-primary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!uploadingCover) {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!uploadingCover) {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                      }
                    }}
                  >
                    {uploadingCover ? "Uploading…" : "Upload cover"}
                  </button>
                  <input
                    id="tb-cover-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onCoverSelected(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <label className="block">
                <span 
                  className="block text-[10px] uppercase tracking-[0.35em] font-semibold"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Title
                </span>
                <input
                  value={albumDraft.title}
                  onChange={(e) => setAlbumDraft((p) => ({ ...p, title: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors duration-300"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: "var(--theme-surface)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                    e.currentTarget.style.boxShadow = isDefault 
                      ? "0 0 0 2px rgba(249, 115, 22, 0.2)" 
                      : "0 0 0 2px var(--theme-accent-light)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="My new album title"
                />
              </label>

              <label className="block">
                <span 
                  className="block text-[10px] uppercase tracking-[0.35em] font-semibold"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Description
                </span>
                <textarea
                  value={albumDraft.description}
                  onChange={(e) =>
                    setAlbumDraft((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none transition-colors duration-300"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: "var(--theme-surface)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                    e.currentTarget.style.boxShadow = isDefault 
                      ? "0 0 0 2px rgba(249, 115, 22, 0.2)" 
                      : "0 0 0 2px var(--theme-accent-light)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="Updated desc"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span 
                    className="block text-[10px] uppercase tracking-[0.35em] font-semibold"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  >
                    Location
                  </span>
                  <input
                    value={albumDraft.location}
                    onChange={(e) =>
                      setAlbumDraft((p) => ({ ...p, location: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors duration-300"
                    style={{
                      borderColor: "var(--theme-border)",
                      backgroundColor: "var(--theme-surface)",
                      color: "var(--theme-text-primary)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                      e.currentTarget.style.boxShadow = isDefault 
                        ? "0 0 0 2px rgba(249, 115, 22, 0.2)" 
                        : "0 0 0 2px var(--theme-accent-light)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--theme-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    placeholder="Manali"
                  />
                </label>

                <label className="block">
                  <span 
                    className="block text-[10px] uppercase tracking-[0.35em] font-semibold"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  >
                    Event date
                  </span>
                  <input
                    type="date"
                    value={albumDraft.eventDate}
                    onChange={(e) =>
                      setAlbumDraft((p) => ({ ...p, eventDate: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors duration-300"
                    style={{
                      borderColor: "var(--theme-border)",
                      backgroundColor: "var(--theme-surface)",
                      color: "var(--theme-text-primary)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                      e.currentTarget.style.boxShadow = isDefault 
                        ? "0 0 0 2px rgba(249, 115, 22, 0.2)" 
                        : "0 0 0 2px var(--theme-accent-light)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--theme-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </label>
              </div>

              <div className="block">
                <span 
                  className="block text-[10px] uppercase tracking-[0.35em] font-semibold mb-3"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Story
                </span>
                <StoryEditor
                  value={albumDraft.story || ""}
                  onChange={(value) => setAlbumDraft((p) => ({ ...p, story: value }))}
                  albumId={albumId}
                  placeholder="Start writing your story... Use formatting tools above to make it beautiful!"
                />
              </div>

              <div 
                className="flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface)",
                }}
              >
                <div>
                  <p 
                    className="text-sm font-semibold"
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    Visibility
                  </p>
                  <p 
                    className="text-xs mt-1"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {albumDraft.isPublic ? "Public album" : "Private album"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAlbumDraft((p) => ({ ...p, isPublic: !p.isPublic }))}
                  className="h-9 w-16 rounded-full border transition relative"
                  style={{
                    backgroundColor: albumDraft.isPublic 
                      ? (isDefault ? "rgba(16, 185, 129, 0.9)" : "var(--theme-success)")
                      : "var(--theme-surface-hover)",
                    borderColor: albumDraft.isPublic
                      ? (isDefault ? "rgba(16, 185, 129, 0.2)" : "var(--theme-success)")
                      : "var(--theme-border)",
                  }}
                  aria-label="Toggle visibility"
                >
                  <span
                    className="absolute top-1 h-7 w-7 rounded-full shadow-sm transition-all"
                    style={{
                      backgroundColor: "var(--theme-surface)",
                      left: albumDraft.isPublic ? "32px" : "4px",
                    }}
                  />
                </button>
              </div>

              <div 
                className="rounded-2xl border p-4 text-sm transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: isDefault ? "rgb(255, 247, 237)" : "var(--theme-accent-light)",
                }}
              >
                <p 
                  style={{ 
                    color: isDefault ? "rgb(154, 52, 18)" : "var(--theme-accent)",
                  }}
                >
                  Tip: Use the bookmark icon on any photo to set it as your cover.
                </p>
              </div>
            </div>

            <div 
              className="absolute bottom-0 left-0 right-0 p-6 backdrop-blur-xl border-t transition-colors duration-300"
              style={{
                backgroundColor: "var(--theme-backdrop)",
                borderColor: "var(--theme-border)",
              }}
            >
              <button
                type="button"
                disabled={savingAlbum}
                onClick={async () => {
                  try {
                    setSavingAlbum(true);
                    const updated = await updateAlbum(albumId, {
                      title: albumDraft.title.trim() || undefined,
                      description: albumDraft.description.trim() || undefined,
                      location: albumDraft.location.trim() || undefined,
                      story: albumDraft.story.trim() || undefined,
                      eventDate: albumDraft.eventDate || undefined,
                      isPublic: albumDraft.isPublic,
                    });
                    setAlbum((prev) => (prev ? { ...prev, ...updated } : updated));
                    setEditOpen(false);
                  } finally {
                    setSavingAlbum(false);
                  }
                }}
                className="w-full rounded-full px-6 py-3 text-white font-semibold shadow-lg hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60"
                style={{
                  background: isDefault 
                    ? "linear-gradient(to right, #f97316, #ec4899)" 
                    : "var(--theme-gradient-primary)",
                  boxShadow: isDefault 
                    ? "0 10px 15px -3px rgba(249, 115, 22, 0.2), 0 4px 6px -2px rgba(249, 115, 22, 0.1)" 
                    : "0 10px 15px -3px var(--theme-shadow-strong), 0 4px 6px -2px var(--theme-shadow)",
                }}
              >
                {savingAlbum ? "Saving…" : "Save changes"}
              </button>
            </div>
          </aside>
        </div>
      )}

      <footer className="py-20 text-center text-gray-400 text-xs tracking-widest uppercase">
        © 2026 Trailbook Storyteller
      </footer>
    </main>
  );
}

