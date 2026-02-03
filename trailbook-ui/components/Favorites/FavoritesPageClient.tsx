"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import AlbumCard from "@/components/Profile/AlbumCard";
import ConfirmModal from "@/components/Archive/ConfirmModal";
import {
  getFavoriteAlbums,
  removeFromFavorites,
  type Album,
} from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";

export default function FavoritesPageClient() {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingAlbumId, setRemovingAlbumId] = useState<string | null>(null);

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

  // Load favorite albums
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const favorites = await getFavoriteAlbums();
        if (!cancelled) {
          setFavoriteAlbums(favorites);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load favorite albums", err);
          setError("Failed to load favorite albums");
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

  const handleRemoveFavorite = async (albumId: string) => {
    setConfirmModal({
      open: true,
      title: "Move out of Keeps?",
      message: "This story will be moved out of your Keeps. You can add it back anytime.",
      confirmText: "Unkeep",
      cancelText: "Keep it",
      confirmColor: "default",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          setRemovingAlbumId(albumId);
          await removeFromFavorites(albumId);
          setFavoriteAlbums((prev) => prev.filter((a) => (a.id || a._id) !== albumId));
        } catch (err) {
          console.error("Failed to remove favorite", err);
          alert("Failed to remove from favorites. Please try again.");
        } finally {
          setRemovingAlbumId(null);
        }
      },
    });
  };

  return (
    <>
      {/* Premium shimmer animation for tooltip */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}</style>
      <div className="min-h-screen relative" style={{ backgroundColor: "var(--theme-background)" }}>
        {/* Premium Header */}
      <div className="relative overflow-hidden border-b transition-colors duration-300"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-surface)",
        }}
      >
        {isDefault ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/50" />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-200/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-yellow-200/20 blur-3xl" />
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl sm:text-4xl">⭐</span>
                <p
                  className="text-[9px] sm:text-[10px] uppercase tracking-[0.35em] font-semibold"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Your Collection
                </p>
              </div>
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3"
                style={{ color: "var(--theme-text-primary)" }}
              >
                Worth Keeping
              </h1>
              <p
                className="text-sm sm:text-base leading-relaxed max-w-2xl"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Your most cherished albums. These are the stories and moments that matter most to you.
              </p>
            </div>

            <Link
              href="/profile"
              className="shrink-0 self-start sm:self-auto rounded-full px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold transition shadow-theme hover:shadow-theme-lg"
              style={{
                backgroundColor: "var(--theme-surface-elevated)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-primary)",
                border: "1px solid var(--theme-border)",
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

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-12">
        {/* Premium decorative background pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-5"
            style={{
              background: isDefault 
                ? "radial-gradient(circle, rgba(251, 191, 36, 0.3), transparent)"
                : "radial-gradient(circle, var(--theme-accent), transparent)",
            }}
          />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-5"
            style={{
              background: isDefault 
                ? "radial-gradient(circle, rgba(251, 191, 36, 0.3), transparent)"
                : "radial-gradient(circle, var(--theme-accent), transparent)",
            }}
          />
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-current border-t-transparent mb-4" />
            <p>Loading your favorite albums…</p>
          </div>
        ) : favoriteAlbums.length === 0 ? (
          <div className="py-24 sm:py-32 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 opacity-60"
              style={{
                backgroundColor: isDefault ? "rgba(251, 191, 36, 0.08)" : "var(--theme-accent-light)",
              }}
            >
              <span className="text-5xl">📖</span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-light mb-4 leading-tight"
              style={{ color: "var(--theme-text-primary)" }}
            >
              Nothing worth keeping yet.
            </h2>
            <p
              className="text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              Some stories take time.<br />
              When something truly matters, keep it here.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 border"
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--theme-accent)";
                e.currentTarget.style.backgroundColor = "var(--theme-accent-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--theme-border)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Browse Stories
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {favoriteAlbums.map((album, index) => {
              const albumId = album.id || album._id || "";
              const cover = resolveMediaUrl(album.coverImage || album.coverUrl || album.cover);
              const isRemoving = removingAlbumId === albumId;

              const userProfilePicture = album.user?.profilePicture
                ? resolveProfilePictureUrl(album.user.profilePicture)
                : null;
              const userName = album.user?.fullName || "Unknown";
              const isOwnAlbum = album.isOwnAlbum === true;

              return (
                <div key={albumId} className="relative group">
                  {/* Premium card wrapper with enhanced styling and hover effects */}
                  <div className="relative rounded-3xl overflow-hidden transition-all duration-500 group-hover:scale-[1.02]"
                    style={{
                      boxShadow: isDefault
                        ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                        : "0 10px 25px -5px var(--theme-shadow), 0 4px 6px -2px var(--theme-shadow-strong)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = isDefault
                        ? "0 12px 30px -5px rgba(0, 0, 0, 0.15), 0 8px 12px -4px rgba(0, 0, 0, 0.1)"
                        : "0 20px 40px -10px var(--theme-shadow), 0 8px 12px -4px var(--theme-shadow-strong)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = isDefault
                        ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                        : "0 10px 25px -5px var(--theme-shadow), 0 4px 6px -2px var(--theme-shadow-strong)";
                    }}
                  >
                    {/* Subtle gradient overlay on card */}
                    <div className="absolute inset-0 pointer-events-none z-10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: isDefault
                          ? "linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(251, 191, 36, 0.02) 100%)"
                          : "linear-gradient(135deg, var(--theme-accent-light) 0%, transparent 100%)",
                      }}
                    />
                    
                    <AlbumCard
                      album={{
                        id: albumId,
                        title: album.title || album.name || "Untitled story",
                        cover: cover || "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
                        photosCount: album.photoCount ?? album.photosCount,
                        location: album.location,
                        isPublic: album.isPublic,
                        hideDate: true, // Hide date section for cleaner favorites page
                      }}
                    />
                    
                    {/* "Why I kept this" - Favorited Date (Right Side) */}
                    {album.favoritedAt && (
                      <div className="absolute bottom-4 right-4 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <div className="px-3 py-1.5 rounded-full backdrop-blur-md border"
                          style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            borderColor: "rgba(255, 255, 255, 0.15)",
                          }}
                        >
                          <span className="text-[9px] text-white/70 font-medium">
                            Kept on {(() => {
                              const d = new Date(album.favoritedAt);
                              if (Number.isNaN(d.getTime())) return "";
                              return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* User Info Badge - More Visible */}
                    {album.user && !isOwnAlbum && (
                      <div className="absolute top-4 left-4 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        {(album.userId || album.user._id || album.user.id) ? (
                          <div 
                            className="flex items-center gap-2.5 px-3 py-2 rounded-full backdrop-blur-md border transition-all duration-300 cursor-pointer"
                            style={{
                              backgroundColor: "rgba(0, 0, 0, 0.5)",
                              borderColor: "rgba(255, 255, 255, 0.2)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const userId = album.userId || album.user._id || album.user.id;
                              if (userId) {
                                window.location.href = `/users/${userId}/public`;
                              }
                            }}
                          >
                            <ClickableUserAvatar
                              userId={album.userId || album.user._id || album.user.id || ""}
                              profilePicture={album.user.profilePicture}
                              name={userName}
                              size="sm"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-semibold text-white truncate max-w-[140px]">
                                {userName}
                              </span>
                              <span className="text-[8px] text-white/70 uppercase tracking-wider font-medium">
                                View Profile
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 px-3 py-2 rounded-full backdrop-blur-md border transition-all duration-300"
                          style={{
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            borderColor: "rgba(255, 255, 255, 0.2)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                          }}
                        >
                          {userProfilePicture ? (
                            <img
                              src={userProfilePicture}
                              alt={userName}
                              className="w-6 h-6 rounded-full object-cover border border-white/25 shadow-sm"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/20 border border-white/25 flex items-center justify-center shadow-sm">
                              <span className="text-[10px] text-white">👤</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-white truncate max-w-[140px]">
                              {userName}
                            </span>
                          </div>
                        </div>
                        )}
                      </div>
                    )}
                    {album.user && isOwnAlbum && (
                      <div className="absolute top-4 left-4 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-full backdrop-blur-md border transition-all duration-300"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                          borderColor: "rgba(255, 255, 255, 0.2)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                        }}
                      >
                        {userProfilePicture ? (
                          <img
                            src={userProfilePicture}
                            alt={userName}
                            className="w-6 h-6 rounded-full object-cover border border-white/25 shadow-sm"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/20 border border-white/25 flex items-center justify-center shadow-sm">
                            <span className="text-[10px] text-white">👤</span>
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-white truncate max-w-[140px]">
                            {userName}
                          </span>
                          <span className="text-[8px] text-white/70 uppercase tracking-wider font-medium">
                            Your Album
                          </span>
                        </div>
                      </div>
                    </div>
                    )}
                    
                    {/* Premium Bookmark Icon with Elegant Tooltip - Always visible on mobile, fade in on hover (desktop) */}
                    <div className="absolute top-4 right-4 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                      <div className="relative group/remove">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFavorite(albumId);
                          }}
                          disabled={isRemoving}
                          className="relative flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                          style={{
                            backgroundColor: isDefault 
                              ? "rgba(245, 245, 240, 0.4)" 
                              : "rgba(255, 255, 255, 0.08)",
                            borderColor: isDefault
                              ? "rgba(200, 200, 190, 0.3)"
                              : "rgba(255, 255, 255, 0.15)",
                            color: isDefault ? "rgba(100, 100, 90, 0.9)" : "rgba(255, 255, 255, 0.85)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isRemoving) {
                              e.currentTarget.style.backgroundColor = isDefault
                                ? "rgba(245, 245, 240, 0.6)"
                                : "rgba(255, 255, 255, 0.12)";
                              e.currentTarget.style.borderColor = isDefault
                                ? "rgba(200, 200, 190, 0.5)"
                                : "rgba(255, 255, 255, 0.25)";
                              e.currentTarget.style.transform = "scale(1.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isDefault
                              ? "rgba(245, 245, 240, 0.4)"
                              : "rgba(255, 255, 255, 0.08)";
                            e.currentTarget.style.borderColor = isDefault
                              ? "rgba(200, 200, 190, 0.3)"
                              : "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          {/* Subtle glow effect on hover */}
                          <div className="absolute inset-0 opacity-0 group-hover/remove:opacity-100 transition-opacity duration-300 rounded-full"
                            style={{
                              background: isDefault
                                ? "radial-gradient(circle, rgba(245, 245, 240, 0.3), transparent)"
                                : "radial-gradient(circle, rgba(255, 255, 255, 0.08), transparent)",
                            }}
                          />
                          {isRemoving ? (
                            <span className="text-sm animate-spin relative z-10">⚙️</span>
                          ) : (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="relative z-10 transition-all duration-300 group-hover/remove:scale-110"
                            >
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                          )}
                        </button>
                        
                        {/* Premium Tooltip */}
                        <div className="absolute top-full right-0 mt-3 opacity-0 group-hover/remove:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover/remove:translate-y-0 whitespace-nowrap z-50">
                          <div className="relative">
                            {/* Tooltip Arrow */}
                            <div className="absolute -top-1.5 right-3 w-3 h-3 rotate-45"
                              style={{
                                backgroundColor: isDefault
                                  ? "rgba(251, 191, 36, 0.95)"
                                  : "rgba(0, 0, 0, 0.95)",
                                backdropFilter: "blur(12px)",
                              }}
                            />
                            
                            {/* Tooltip Content */}
                            <div className="relative px-3 py-2 rounded-lg backdrop-blur-xl border shadow-xl"
                              style={{
                                backgroundColor: isDefault
                                  ? "rgba(245, 245, 240, 0.95)"
                                  : "rgba(0, 0, 0, 0.9)",
                                borderColor: isDefault
                                  ? "rgba(200, 200, 190, 0.3)"
                                  : "rgba(255, 255, 255, 0.15)",
                                boxShadow: isDefault
                                  ? "0 8px 20px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1)"
                                  : "0 8px 20px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
                              }}
                            >
                              {/* Text */}
                              <span className="relative z-10 text-xs font-medium tracking-wide"
                                style={{
                                  color: isDefault ? "rgba(80, 80, 70, 0.9)" : "rgba(255, 255, 255, 0.9)",
                                  textShadow: isDefault ? "none" : "0 1px 2px rgba(0, 0, 0, 0.5)",
                                }}
                              >
                                Unkeep
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </>
  );
}
