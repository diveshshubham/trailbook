"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getMyAlbums, 
  getArchivedAlbums, 
  getAlbumMedia, 
  getArchivedMedia,
  archiveAlbum,
  restoreAlbum,
  deleteAlbum,
  archiveMedia,
  restoreMedia,
  deleteMedia,
  type Album,
  type MediaItem
} from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

type ViewMode = "albums" | "album-photos" | "archived-albums" | "archived-photos";

export default function ManagePage() {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  
  const [viewMode, setViewMode] = useState<ViewMode>("albums");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [archivedAlbums, setArchivedAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [archivedPhotos, setArchivedPhotos] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<MediaItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{type: "album" | "photo", id: string, name: string} | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [viewMode, selectedAlbumId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === "albums") {
        const data = await getMyAlbums();
        setAlbums(data);
      } else if (viewMode === "archived-albums") {
        const data = await getArchivedAlbums();
        setArchivedAlbums(data);
      } else if (viewMode === "album-photos" && selectedAlbumId) {
        const data = await getAlbumMedia(selectedAlbumId);
        setPhotos(data);
      } else if (viewMode === "archived-photos" && selectedAlbumId) {
        const data = await getArchivedMedia(selectedAlbumId);
        setArchivedPhotos(data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveAlbum = async (albumId: string) => {
    try {
      setActionLoading(true);
      await archiveAlbum(albumId);
      await loadData();
    } catch (error) {
      console.error("Failed to archive album:", error);
      alert("Failed to archive album. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreAlbum = async (albumId: string) => {
    try {
      setActionLoading(true);
      await restoreAlbum(albumId);
      await loadData();
    } catch (error) {
      console.error("Failed to restore album:", error);
      alert("Failed to restore album. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    try {
      setActionLoading(true);
      await deleteAlbum(albumId);
      setShowDeleteConfirm(null);
      await loadData();
    } catch (error) {
      console.error("Failed to delete album:", error);
      alert("Failed to delete album. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchivePhoto = async (mediaId: string) => {
    try {
      setActionLoading(true);
      await archiveMedia(mediaId);
      await loadData();
    } catch (error) {
      console.error("Failed to archive photo:", error);
      alert("Failed to archive photo. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestorePhoto = async (mediaId: string) => {
    try {
      setActionLoading(true);
      await restoreMedia(mediaId);
      await loadData();
    } catch (error) {
      console.error("Failed to restore photo:", error);
      alert("Failed to restore photo. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePhoto = async (mediaId: string) => {
    try {
      setActionLoading(true);
      await deleteMedia(mediaId);
      setShowDeleteConfirm(null);
      await loadData();
    } catch (error) {
      console.error("Failed to delete photo:", error);
      alert("Failed to delete photo. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const currentAlbums = viewMode === "albums" ? albums : archivedAlbums;
  const currentPhotos = viewMode === "album-photos" ? photos : archivedPhotos;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--theme-background)" }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 
                className="text-4xl md:text-5xl font-light tracking-tight mb-2"
                style={{ color: "var(--theme-text-primary)" }}
              >
                Manage Your Content
              </h1>
              <p 
                className="text-base font-light"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Archive, restore, or delete your albums and photos
              </p>
            </div>
            <button
              onClick={() => router.push("/profile")}
              className="px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: "var(--theme-surface-hover)",
                color: "var(--theme-text-secondary)",
              }}
            >
              <span className="text-sm font-medium">Back to Profile</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b" style={{ borderColor: "var(--theme-border)" }}>
            <button
              onClick={() => {
                setViewMode("albums");
                setSelectedAlbumId(null);
              }}
              className="px-6 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: viewMode === "albums" ? "var(--theme-accent)" : "var(--theme-text-secondary)",
              }}
            >
              My Albums
              {viewMode === "albums" && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "var(--theme-accent)" }}
                />
              )}
            </button>
            <button
              onClick={() => {
                setViewMode("archived-albums");
                setSelectedAlbumId(null);
              }}
              className="px-6 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: viewMode === "archived-albums" ? "var(--theme-accent)" : "var(--theme-text-secondary)",
              }}
            >
              Archived Albums
              {viewMode === "archived-albums" && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "var(--theme-accent)" }}
                />
              )}
            </button>
            {selectedAlbumId && (
              <>
                <button
                  onClick={() => setViewMode("album-photos")}
                  className="px-6 py-3 text-sm font-medium transition-colors relative"
                  style={{
                    color: viewMode === "album-photos" ? "var(--theme-accent)" : "var(--theme-text-secondary)",
                  }}
                >
                  Album Photos
                  {viewMode === "album-photos" && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: "var(--theme-accent)" }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setViewMode("archived-photos")}
                  className="px-6 py-3 text-sm font-medium transition-colors relative"
                  style={{
                    color: viewMode === "archived-photos" ? "var(--theme-accent)" : "var(--theme-text-secondary)",
                  }}
                >
                  Archived Photos
                  {viewMode === "archived-photos" && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: "var(--theme-accent)" }}
                    />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-current border-r-transparent" style={{ color: "var(--theme-text-tertiary)" }} />
            <p className="mt-4" style={{ color: "var(--theme-text-secondary)" }}>Loading...</p>
          </div>
        ) : (viewMode === "albums" || viewMode === "archived-albums") ? (
          /* Albums Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentAlbums.map((album) => {
              const coverUrl = resolveMediaUrl(album.coverImage || album.cover || album.coverUrl) || 
                "https://images.unsplash.com/photo-1501785888041-af3ef285b470";
              const photos = album.photoCount ?? album.photosCount ?? 0;

              return (
                <div
                  key={album.id}
                  className="group relative overflow-hidden rounded-2xl border transition-all hover:shadow-lg"
                  style={{
                    backgroundColor: "var(--theme-surface)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={coverUrl}
                      alt={album.title || album.name || "Album"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    <div className="absolute top-4 left-4">
                      <span
                        className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold backdrop-blur-md border"
                        style={{
                          backgroundColor: viewMode === "archived-albums" 
                            ? "rgba(107, 114, 128, 0.2)"
                            : (album.isPublic ? "rgba(16, 185, 129, 0.2)" : "rgba(249, 115, 22, 0.2)"),
                          borderColor: viewMode === "archived-albums"
                            ? "rgba(107, 114, 128, 0.3)"
                            : (album.isPublic ? "rgba(16, 185, 129, 0.3)" : "rgba(249, 115, 22, 0.3)"),
                          color: viewMode === "archived-albums"
                            ? "rgb(209, 213, 219)"
                            : (album.isPublic ? "rgb(52, 211, 153)" : "rgb(251, 146, 60)"),
                        }}
                      >
                        {viewMode === "archived-albums" ? "Archived" : (album.isPublic ? "Public" : "Private")}
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-white text-sm font-semibold tracking-tight line-clamp-1">
                        {album.title || album.name || "Untitled Album"}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-white/80 text-xs">
                        <span>{photos} photos</span>
                        {album.location && (
                          <span className="line-clamp-1 max-w-[60%] text-right">
                            {album.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAlbumId(album.id);
                          setViewMode(viewMode === "archived-albums" ? "archived-photos" : "album-photos");
                        }}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                        View Photos
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      {viewMode === "archived-albums" ? (
                        <button
                          onClick={() => handleRestoreAlbum(album.id!)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--theme-surface-hover)",
                            color: "var(--theme-accent)",
                          }}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveAlbum(album.id!)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--theme-surface-hover)",
                            color: "var(--theme-text-secondary)",
                          }}
                        >
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm({
                          type: "album",
                          id: album.id!,
                          name: album.title || album.name || "Untitled Album"
                        })}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: "var(--theme-error)",
                          color: "white",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Photos Grid */
          <div>
            {selectedAlbumId && (
              <div className="mb-6">
                <button
                  onClick={() => {
                    setSelectedAlbumId(null);
                    setViewMode(viewMode === "archived-photos" ? "archived-albums" : "albums");
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors mb-4"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    color: "var(--theme-text-secondary)",
                  }}
                >
                  ← Back to Albums
                </button>
              </div>
            )}
            
            {currentPhotos.length === 0 ? (
              <div className="text-center py-24">
                <p style={{ color: "var(--theme-text-secondary)" }}>
                  {viewMode === "archived-photos" ? "No archived photos" : "No photos in this album"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {currentPhotos.map((photo) => {
                  const photoUrl = resolveMediaUrl(photo.url || photo.key) || "";
                  
                  return (
                    <div
                      key={photo._id}
                      className="group relative aspect-square overflow-hidden rounded-xl border cursor-pointer"
                      style={{
                        backgroundColor: "var(--theme-surface)",
                        borderColor: "var(--theme-border)",
                      }}
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photoUrl}
                        alt={photo.title || "Photo"}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium line-clamp-1">
                          {photo.title || "Untitled"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Photo Lightbox */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.9)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <img
                  src={resolveMediaUrl(selectedPhoto.url || selectedPhoto.key) || ""}
                  alt={selectedPhoto.title || "Photo"}
                  className="w-full h-auto rounded-lg"
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div 
                className="mt-4 p-4 rounded-lg"
                style={{
                  backgroundColor: "var(--theme-surface-elevated)",
                }}
              >
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--theme-text-primary)" }}>
                  {selectedPhoto.title || "Untitled Photo"}
                </h3>
                
                <div className="flex gap-3">
                  {viewMode === "archived-photos" ? (
                    <button
                      onClick={() => {
                        handleRestorePhoto(selectedPhoto._id);
                        setSelectedPhoto(null);
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--theme-surface-hover)",
                        color: "var(--theme-accent)",
                      }}
                    >
                      Restore Photo
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleArchivePhoto(selectedPhoto._id);
                        setSelectedPhoto(null);
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--theme-surface-hover)",
                        color: "var(--theme-text-secondary)",
                      }}
                    >
                      Archive Photo
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDeleteConfirm({
                        type: "photo",
                        id: selectedPhoto._id,
                        name: selectedPhoto.title || "Photo"
                      });
                      setSelectedPhoto(null);
                    }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--theme-error)",
                      color: "white",
                    }}
                  >
                    Delete Photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowDeleteConfirm(null)}
          >
            <div
              className="max-w-md w-full rounded-2xl p-6 shadow-xl border"
              style={{
                backgroundColor: "var(--theme-surface-elevated)",
                borderColor: "var(--theme-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: "var(--theme-error)" }}
              >
                Delete {showDeleteConfirm.type === "album" ? "Album" : "Photo"} Permanently?
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                This action cannot be undone. {showDeleteConfirm.type === "album" 
                  ? "The album and all its photos will be permanently deleted."
                  : "The photo will be permanently deleted from storage."}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    color: "var(--theme-text-secondary)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showDeleteConfirm.type === "album") {
                      handleDeleteAlbum(showDeleteConfirm.id);
                    } else {
                      handleDeletePhoto(showDeleteConfirm.id);
                    }
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--theme-error)",
                  }}
                >
                  {actionLoading ? "Deleting..." : "Delete Forever"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
