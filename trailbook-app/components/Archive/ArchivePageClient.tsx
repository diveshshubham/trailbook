"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import AlbumCard from "@/components/Profile/AlbumCard";
import ConfirmModal from "./ConfirmModal";
import {
  getArchivedAlbums,
  getMyAlbums,
  archiveAlbum,
  restoreAlbum,
  deleteAlbum,
  getArchivedMedia,
  restoreMedia,
  deleteMedia,
  type Album,
  type MediaItem,
} from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export default function ArchivePageClient() {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [activeTab, setActiveTab] = useState<"albums" | "photos" | "archive">("albums");
  const [archivedAlbums, setArchivedAlbums] = useState<Album[]>([]);
  const [activeAlbums, setActiveAlbums] = useState<Album[]>([]);
  const [archivedPhotos, setArchivedPhotos] = useState<Array<{ album: Album; media: MediaItem[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringAlbumId, setRestoringAlbumId] = useState<string | null>(null);
  const [restoringMediaId, setRestoringMediaId] = useState<string | null>(null);
  const [archivingAlbumId, setArchivingAlbumId] = useState<string | null>(null);
  const [deletingAlbumId, setDeletingAlbumId] = useState<string | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  
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

  // Load archived albums and active albums
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [archived, active] = await Promise.all([
          getArchivedAlbums(),
          getMyAlbums(),
        ]);
        if (!cancelled) {
          setArchivedAlbums(archived);
          setActiveAlbums(active);
        }

        // Load archived photos for each album
        const photosData: Array<{ album: Album; media: MediaItem[] }> = [];
        for (const album of archived) {
          const albumId = album.id || album._id || "";
          if (albumId) {
            try {
              const media = await getArchivedMedia(albumId);
              if (media.length > 0) {
                photosData.push({ album, media });
              }
            } catch {
              // Ignore per-album errors
            }
          }
        }
        if (!cancelled) setArchivedPhotos(photosData);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load archived items", err);
          setError("Failed to load archived items");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRestoreAlbum = async (albumId: string) => {
    try {
      setRestoringAlbumId(albumId);
      await restoreAlbum(albumId);
      // Remove from archived lists
      setArchivedAlbums((prev) => prev.filter((a) => (a.id || a._id) !== albumId));
      setArchivedPhotos((prev) => prev.filter((p) => (p.album.id || p.album._id) !== albumId));
      // Reload active albums to show the restored album
      const active = await getMyAlbums();
      setActiveAlbums(active);
      // Switch to Archive Albums tab to show the restored album
      setActiveTab("archive");
    } catch (err) {
      console.error("Failed to restore album", err);
      alert("Failed to restore album. Please try again.");
    } finally {
      setRestoringAlbumId(null);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
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
          setArchivedAlbums((prev) => prev.filter((a) => (a.id || a._id) !== albumId));
          setArchivedPhotos((prev) => prev.filter((p) => (p.album.id || p.album._id) !== albumId));
        } catch (err) {
          console.error("Failed to delete album", err);
          alert("Failed to delete album. Please try again.");
        } finally {
          setDeletingAlbumId(null);
        }
      },
    });
  };

  const handleRestorePhoto = async (mediaId: string, albumId: string) => {
    try {
      setRestoringMediaId(mediaId);
      await restoreMedia(mediaId);
      setArchivedPhotos((prev) =>
        prev.map((p) => {
          if ((p.album.id || p.album._id) === albumId) {
            return {
              ...p,
              media: p.media.filter((m) => m._id !== mediaId),
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error("Failed to restore photo", err);
      alert("Failed to restore photo. Please try again.");
    } finally {
      setRestoringMediaId(null);
    }
  };

  const handleDeletePhoto = async (mediaId: string, albumId: string) => {
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
          setArchivedPhotos((prev) =>
            prev.map((p) => {
              if ((p.album.id || p.album._id) === albumId) {
                return {
                  ...p,
                  media: p.media.filter((m) => m._id !== mediaId),
                };
              }
              return p;
            })
          );
        } catch (err) {
          console.error("Failed to delete photo", err);
          alert("Failed to delete photo. Please try again.");
        } finally {
          setDeletingMediaId(null);
        }
      },
    });
  };

  const handleArchiveAlbum = async (albumId: string) => {
    setConfirmModal({
      open: true,
      title: "Archive This Album?",
      message: "This album will be moved to your archive. You can restore it anytime from the Archived Albums tab.",
      confirmText: "Archive",
      cancelText: "Cancel",
      confirmColor: "warning",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          setArchivingAlbumId(albumId);
          await archiveAlbum(albumId);
          // Reload both lists
          const [archived, active] = await Promise.all([
            getArchivedAlbums(),
            getMyAlbums(),
          ]);
          setArchivedAlbums(archived);
          setActiveAlbums(active);
          // Switch to Archived Albums tab to show the newly archived album
          setActiveTab("albums");
        } catch (err) {
          console.error("Failed to archive album", err);
          alert("Failed to archive album. Please try again.");
        } finally {
          setArchivingAlbumId(null);
        }
      },
    });
  };

  return (
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
                <span className="text-xl sm:text-2xl" style={{ color: "var(--theme-accent)" }}>📦</span>
                <p
                  className="text-[9px] sm:text-[10px] uppercase tracking-[0.35em] font-semibold"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Archive Management
                </p>
              </div>
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
                style={{ color: "var(--theme-text-primary)" }}
              >
                Archived Memories
              </h1>
              <p
                className="mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Albums and photos you've archived. Restore them anytime or permanently delete them.
              </p>
            </div>

            <Link
              href="/profile"
              className="shrink-0 self-start sm:self-auto rounded-full px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold transition shadow-theme hover:shadow-theme-lg"
              style={{
                backgroundColor: "var(--theme-surface-elevated)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Back to albums
            </Link>
          </div>
        </div>
      </div>

      {/* Premium Tabs */}
      <div className="mb-6 sm:mb-10">
        <div className="inline-flex gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border backdrop-blur-sm overflow-x-auto w-full sm:w-auto"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-surface)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("albums")}
            className="relative px-3 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all rounded-lg sm:rounded-xl whitespace-nowrap"
            style={{
              color: activeTab === "albums" ? "var(--theme-text-primary)" : "var(--theme-text-tertiary)",
              backgroundColor: activeTab === "albums" ? "var(--theme-surface-elevated)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "albums") {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "albums") {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline">Archived Albums</span>
              <span className="sm:hidden">Albums</span>
              <span 
                className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold"
                style={{
                  backgroundColor: activeTab === "albums" ? "var(--theme-accent)" : "var(--theme-surface-hover)",
                  color: activeTab === "albums" ? "var(--theme-text-inverse)" : "var(--theme-text-secondary)",
                }}
              >
                {archivedAlbums.length}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("photos")}
            className="relative px-3 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all rounded-lg sm:rounded-xl whitespace-nowrap"
            style={{
              color: activeTab === "photos" ? "var(--theme-text-primary)" : "var(--theme-text-tertiary)",
              backgroundColor: activeTab === "photos" ? "var(--theme-surface-elevated)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "photos") {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "photos") {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline">Archived Photos</span>
              <span className="sm:hidden">Photos</span>
              <span 
                className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold"
                style={{
                  backgroundColor: activeTab === "photos" ? "var(--theme-accent)" : "var(--theme-surface-hover)",
                  color: activeTab === "photos" ? "var(--theme-text-inverse)" : "var(--theme-text-secondary)",
                }}
              >
                {archivedPhotos.reduce((sum, p) => sum + p.media.length, 0)}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archive")}
            className="relative px-3 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all rounded-lg sm:rounded-xl whitespace-nowrap"
            style={{
              color: activeTab === "archive" ? "var(--theme-text-primary)" : "var(--theme-text-tertiary)",
              backgroundColor: activeTab === "archive" ? "var(--theme-surface-elevated)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "archive") {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "archive") {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline">Archive Albums</span>
              <span className="sm:hidden">Archive</span>
              <span 
                className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold"
                style={{
                  backgroundColor: activeTab === "archive" ? "var(--theme-accent)" : "var(--theme-surface-hover)",
                  color: activeTab === "archive" ? "var(--theme-text-inverse)" : "var(--theme-text-secondary)",
                }}
              >
                {activeAlbums.length}
              </span>
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-2xl border px-5 py-4 mb-6 transition-colors duration-300"
          style={{
            borderColor: "var(--theme-error)",
            backgroundColor: "var(--theme-error)",
            opacity: 0.1,
            color: "var(--theme-error)",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center" style={{ color: "var(--theme-text-secondary)" }}>
          Loading archived items…
        </div>
      ) : activeTab === "archive" ? (
        activeAlbums.length === 0 ? (
          <div className="py-20 text-center">
            <p style={{ color: "var(--theme-text-secondary)" }}>No albums to archive.</p>
            <Link
              href="/create-album"
              className="mt-4 inline-block px-6 py-3 rounded-full font-semibold transition"
              style={{
                background: "var(--theme-gradient-primary)",
                color: "var(--theme-text-inverse)",
              }}
            >
              Create your first album
            </Link>
          </div>
        ) : (
          <div>
            <p className="mb-6 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
              Select albums to archive. Archived albums can be restored later.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {activeAlbums.map((album) => {
                const albumId = album.id || album._id || "";
                const cover = resolveMediaUrl(album.coverImage || album.coverUrl || album.cover);
                const isArchiving = archivingAlbumId === albumId;

                return (
                  <div key={albumId} className="relative group">
                    <AlbumCard
                      album={{
                        id: albumId,
                        title: album.title || album.name || "Untitled story",
                        cover: cover || "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
                        photosCount: album.photoCount ?? album.photosCount,
                        location: album.location,
                        isPublic: album.isPublic,
                        href: `/archive/album/${albumId}`, // Use archive route for all albums on archive page
                      }}
                    />
                    <div className="absolute top-4 right-4 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchiveAlbum(albumId);
                        }}
                        disabled={isArchiving}
                        className="px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-xs font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
                        style={{
                          backgroundColor: "var(--theme-warning)",
                          color: "white",
                        }}
                        onMouseEnter={(e) => {
                          if (!isArchiving) {
                            e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0) scale(1)";
                        }}
                      >
                        {isArchiving ? "Archiving…" : "📦 Archive"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : activeTab === "albums" ? (
        archivedAlbums.length === 0 ? (
          <div className="py-20 text-center">
            <p style={{ color: "var(--theme-text-secondary)" }}>No archived albums yet.</p>
            <p className="mt-2 text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
              Albums you archive will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {archivedAlbums.map((album) => {
              const albumId = album.id || album._id || "";
              const cover = resolveMediaUrl(album.coverImage || album.coverUrl || album.cover);
              const isRestoring = restoringAlbumId === albumId;
              const isDeleting = deletingAlbumId === albumId;

              return (
                <div key={albumId} className="relative group">
                  <div className="relative">
                    <AlbumCard
                      album={{
                        id: albumId,
                        title: album.title || album.name || "Untitled story",
                        cover: cover || "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
                        photosCount: album.photoCount ?? album.photosCount,
                        location: album.location,
                        isPublic: album.isPublic,
                        href: `/archive/album/${albumId}`, // CRITICAL: This must override default route
                      }}
                    />
                    <div className="absolute top-4 right-4 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRestoreAlbum(albumId);
                          }}
                          disabled={isRestoring || isDeleting}
                          className="px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-xs font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: "var(--theme-success)",
                            color: "white",
                          }}
                          onMouseEnter={(e) => {
                            if (!isRestoring && !isDeleting) {
                              e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0) scale(1)";
                          }}
                        >
                          {isRestoring ? "Restoring…" : "↻ Restore"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteAlbum(albumId);
                          }}
                          disabled={isRestoring || isDeleting}
                          className="px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-xs font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: "var(--theme-error)",
                            color: "white",
                          }}
                          onMouseEnter={(e) => {
                            if (!isRestoring && !isDeleting) {
                              e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0) scale(1)";
                          }}
                        >
                          {isDeleting ? "Deleting…" : "✕ Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : archivedPhotos.length === 0 ? (
        <div className="py-20 text-center">
          <p style={{ color: "var(--theme-text-secondary)" }}>No archived photos yet.</p>
          <p className="mt-2 text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
            Photos you archive will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {archivedPhotos.map(({ album, media }) => {
            const albumId = album.id || album._id || "";
            return (
              <div
                key={albumId}
                className="rounded-3xl border p-6 transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--theme-text-primary)" }}>
                      {album.title || album.name || "Untitled album"}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
                      {media.length} archived photo{media.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={`/album/${albumId}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                    style={{
                      backgroundColor: "var(--theme-surface-hover)",
                      color: "var(--theme-text-primary)",
                    }}
                  >
                    View album
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {media.map((item) => {
                    const mediaId = item._id || "";
                    const imageUrl = resolveMediaUrl(item.url || item.key);
                    const isRestoring = restoringMediaId === mediaId;
                    const isDeleting = deletingMediaId === mediaId;

                    return (
                      <div key={mediaId} className="relative group aspect-square rounded-2xl overflow-hidden">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={item.title || "Archived photo"}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestorePhoto(mediaId, albumId)}
                            disabled={isRestoring || isDeleting}
                            className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: "var(--theme-success)",
                              color: "white",
                            }}
                            onMouseEnter={(e) => {
                              if (!isRestoring && !isDeleting) {
                                e.currentTarget.style.transform = "scale(1.1)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            {isRestoring ? "Restoring…" : "↻ Restore"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(mediaId, albumId)}
                            disabled={isRestoring || isDeleting}
                            className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: "var(--theme-error)",
                              color: "white",
                            }}
                            onMouseEnter={(e) => {
                              if (!isRestoring && !isDeleting) {
                                e.currentTarget.style.transform = "scale(1.1)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            {isDeleting ? "Deleting…" : "✕ Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
  );
}
