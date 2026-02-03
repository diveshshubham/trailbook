"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getMyAlbums,
  getAlbumMedia,
  archiveMedia,
  deleteMedia,
  restoreAlbum,
  deleteAlbum,
  type Album,
  type MediaItem,
} from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import ConfirmModal from "./ConfirmModal";
import Lightbox, { type LightboxItem } from "@/components/Album/Lightbox";

export default function ArchivedAlbumClient({ albumId }: { albumId: string }) {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [album, setAlbum] = useState<Album | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingMediaId, setArchivingMediaId] = useState<string | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [restoringAlbumId, setRestoringAlbumId] = useState<string | null>(null);
  const [deletingAlbumId, setDeletingAlbumId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Premium confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: "default" | "warning" | "error" | "success";
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all albums (same API as home page) to find the album
        const allAlbums = await getMyAlbums();
        if (cancelled) return;

        // Find the album
        const found = allAlbums.find(
          (a) => (a.id || a._id) === albumId
        );

        if (!found) {
          setError("Album not found.");
          return;
        }

        setAlbum(found);

        // Get all media for this album (same API as home page)
        const mediaData = await getAlbumMedia(albumId);
        if (cancelled) return;
        // Sort by creation date, latest first
        const sortedMedia = [...mediaData].sort((a, b) => {
          const ta = new Date(a.createdAt).getTime();
          const tb = new Date(b.createdAt).getTime();
          if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
          return tb - ta; // latest first
        });
        setMedia(sortedMedia);
      } catch (err) {
        console.error("Failed to load album", err);
        setError("Failed to load album.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  // Prepare lightbox items
  const lightboxItems: LightboxItem[] = useMemo(() => {
    return media
      .map((m) => ({
        id: m._id || "",
        src: resolveMediaUrl(m.url || m.key) || "",
        meta: {
          title: m.title,
          description: m.description,
          location: m.location,
          tags: m.tags,
          story: m.story,
          isPublic: m.isPublic,
        },
      }))
      .filter((i) => Boolean(i.src));
  }, [media]);

  const photos = useMemo(() => {
    return lightboxItems.map((i) => i.src);
  }, [lightboxItems]);

  const handleArchiveMedia = async (mediaId: string) => {
    setConfirmModal({
      open: true,
      title: "Archive This Photo?",
      message: "This photo will be moved to your archive. You can restore it anytime from the Archived Photos tab.",
      confirmText: "Archive",
      cancelText: "Cancel",
      confirmColor: "warning",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          setArchivingMediaId(mediaId);
          await archiveMedia(mediaId);
          // Remove from current view (it's now archived)
          setMedia((prev) => prev.filter((m) => m._id !== mediaId));
          // Close lightbox if this photo was open
          if (lightboxOpen && lightboxItems[lightboxIndex]?.id === mediaId) {
            setLightboxOpen(false);
          }
        } catch (err) {
          console.error("Failed to archive photo", err);
          alert("Failed to archive photo. Please try again.");
        } finally {
          setArchivingMediaId(null);
        }
      },
    });
  };

  const handleDeleteMedia = async (mediaId: string) => {
    setConfirmModal({
      open: true,
      title: "Delete Photo Permanently?",
      message: "Are you sure you want to permanently delete this photo? This action cannot be undone.",
      confirmText: "Delete Forever",
      cancelText: "Cancel",
      confirmColor: "error",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          setDeletingMediaId(mediaId);
          await deleteMedia(mediaId);
          setMedia((prev) => prev.filter((m) => m._id !== mediaId));
          // Close lightbox if this photo was open
          if (lightboxOpen && lightboxItems[lightboxIndex]?.id === mediaId) {
            setLightboxOpen(false);
          }
        } catch (err) {
          console.error("Failed to delete photo", err);
          alert("Failed to delete photo. Please try again.");
        } finally {
          setDeletingMediaId(null);
        }
      },
    });
  };

  const handleRestoreAlbum = async () => {
    if (!albumId) return;
    try {
      setRestoringAlbumId(albumId);
      await restoreAlbum(albumId);
      router.push("/archive");
    } catch (err) {
      console.error("Failed to restore album", err);
      alert("Failed to restore album. Please try again.");
    } finally {
      setRestoringAlbumId(null);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!albumId) return;
    setConfirmModal({
      open: true,
      title: "Delete Album Permanently?",
      message: "Are you sure you want to permanently delete this album? This action cannot be undone and all photos will be lost.",
      confirmText: "Delete Forever",
      cancelText: "Cancel",
      confirmColor: "error",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          setDeletingAlbumId(albumId);
          await deleteAlbum(albumId);
          router.push("/archive");
        } catch (err) {
          console.error("Failed to delete album", err);
          alert("Failed to delete album. Please try again.");
        } finally {
          setDeletingAlbumId(null);
        }
      },
    });
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
          <p style={{ color: "var(--theme-text-secondary)" }}>Loading album…</p>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
          <p style={{ color: "var(--theme-error)" }}>{error || "Album not found"}</p>
          <Link
            href="/archive"
            className="mt-4 inline-block px-6 py-3 rounded-full font-semibold transition"
            style={{
              backgroundColor: "var(--theme-surface)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-text-primary)",
              border: "1px solid",
            }}
          >
            Back to Archive
          </Link>
        </div>
      </div>
    );
  }

  const cover = resolveMediaUrl(album.coverImage || album.coverUrl || album.cover);
  const nonArchivedMedia = media.filter((m) => !m.isArchived);

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[36px] border mb-6 sm:mb-10 transition-colors duration-300"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-surface)",
          }}
        >
          {isDefault ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-white to-pink-50/50" />
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/20 blur-3xl" />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: "var(--theme-gradient-secondary)" }}
              />
              <div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl"
                style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
              />
              <div
                className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl"
                style={{ backgroundColor: "var(--theme-info)", opacity: 0.1 }}
              />
            </>
          )}

          <div className="relative px-4 sm:px-8 py-6 sm:py-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <span className="text-xl sm:text-2xl" style={{ color: "var(--theme-accent)" }}>📸</span>
                  <p
                    className="text-[9px] sm:text-[10px] uppercase tracking-[0.35em] font-semibold"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  >
                    Manage Album Photos
                  </p>
                </div>
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  {album.title || album.name || "Untitled Album"}
                </h1>
                {album.location && (
                  <p
                    className="mt-2 sm:mt-3 text-sm sm:text-base"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {album.location}
                  </p>
                )}
                <p
                  className="mt-2 text-xs sm:text-sm"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  {nonArchivedMedia.length} {nonArchivedMedia.length === 1 ? "photo" : "photos"} available • Click to preview
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0">
                <Link
                  href="/archive"
                  className="rounded-full px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold transition border text-center"
                  style={{
                    backgroundColor: "var(--theme-surface-elevated)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-primary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                  }}
                >
                  Back
                </Link>
                <button
                  type="button"
                  onClick={handleRestoreAlbum}
                  disabled={restoringAlbumId !== null || deletingAlbumId !== null}
                  className="rounded-full px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--theme-success)",
                    color: "white",
                  }}
                >
                  {restoringAlbumId ? "Restoring…" : "↻ Restore Album"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAlbum}
                  disabled={restoringAlbumId !== null || deletingAlbumId !== null}
                  className="rounded-full px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--theme-error)",
                    color: "white",
                  }}
                >
                  {deletingAlbumId ? "Deleting…" : "✕ Delete Album"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        {nonArchivedMedia.length === 0 ? (
          <div className="py-20 text-center">
            <p style={{ color: "var(--theme-text-secondary)" }}>No photos available in this album.</p>
            <p className="mt-2 text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
              All photos have been archived or deleted.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {nonArchivedMedia.map((item, index) => {
              const mediaId = item._id || "";
              const imageUrl = resolveMediaUrl(item.url || item.key);
              const isArchiving = archivingMediaId === mediaId;
              const isDeleting = deletingMediaId === mediaId;
              
              // Find the index in the full media array for lightbox
              const lightboxIdx = media.findIndex((m) => m._id === mediaId);

              return (
                <div key={mediaId} className="relative group aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(lightboxIdx >= 0 ? lightboxIdx : 0)}
                >
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={item.title || "Photo"}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-semibold line-clamp-1">
                      {item.title || "Untitled"}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="flex flex-col gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchiveMedia(mediaId);
                        }}
                        disabled={isArchiving || isDeleting}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        style={{
                          backgroundColor: "var(--theme-warning)",
                          color: "white",
                        }}
                      >
                        {isArchiving ? "Archiving…" : "📦 Archive"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteMedia(mediaId);
                        }}
                        disabled={isArchiving || isDeleting}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        style={{
                          backgroundColor: "var(--theme-error)",
                          color: "white",
                        }}
                      >
                        {isDeleting ? "Deleting…" : "✕ Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox with Album Context */}
        {lightboxOpen && photos.length > 0 && (
          <Lightbox
            images={photos}
            items={lightboxItems}
            index={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onPrev={() => setLightboxIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => setLightboxIndex((prev) => Math.min(photos.length - 1, prev + 1))}
            autoplay={false}
            initialDetailsOpen={false}
            protectImages={false}
            showArchiveActions={true}
            onArchive={async (mediaId) => {
              const currentMedia = media.find((m) => m._id === mediaId);
              if (currentMedia) {
                await handleArchiveMedia(mediaId);
              }
            }}
            onDelete={async (mediaId) => {
              const currentMedia = media.find((m) => m._id === mediaId);
              if (currentMedia) {
                await handleDeleteMedia(mediaId);
              }
            }}
            isArchiving={archivingMediaId === lightboxItems[lightboxIndex]?.id}
            isDeleting={deletingMediaId === lightboxItems[lightboxIndex]?.id}
            meta={{
              ...lightboxItems[lightboxIndex]?.meta,
              // Add album context to meta
              description: album.title 
                ? `${lightboxItems[lightboxIndex]?.meta?.description || ""}\n\nFrom album: ${album.title}${album.location ? ` • ${album.location}` : ""}`.trim()
                : lightboxItems[lightboxIndex]?.meta?.description,
            }}
          />
        )}

        {/* Premium Confirmation Modal */}
        {confirmModal && (
          <ConfirmModal
            open={confirmModal.open}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            cancelText={confirmModal.cancelText}
            confirmColor={confirmModal.confirmColor}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
      </div>
    </div>
  );
}
