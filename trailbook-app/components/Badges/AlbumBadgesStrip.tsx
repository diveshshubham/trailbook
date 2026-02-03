"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  assignCustomBadgeToAlbum,
  listMyCustomBadges,
  listPublicAlbumBadges,
  type AlbumBadgeAssignment,
  type CustomBadge,
} from "@/lib/badgesApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { ApiError } from "@/lib/api";
import { getMyProfile } from "@/lib/userApi";
import { useTheme } from "@/contexts/ThemeContext";

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("token"));
}

function requestLogin() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("tb:open-auth"));
}

function formatError(err: unknown): string {
  // Check for duplicate key error (E11000)
  if (err instanceof ApiError) {
    const message = err.message || "";
    const data = err.data;
    
    // Check if it's a duplicate key error
    if (
      message.includes("E11000") ||
      message.includes("duplicate key") ||
      (typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string" &&
        (data.message.includes("E11000") || data.message.includes("duplicate key")))
    ) {
      return "This badge has already been assigned to this album. You can only assign each badge once per album.";
    }
    
    return err.message;
  }
  
  if (err instanceof Error) {
    const message = err.message || "";
    if (message.includes("E11000") || message.includes("duplicate key")) {
      return "This badge has already been assigned to this album. You can only assign each badge once per album.";
    }
    return err.message;
  }
  
  return "Something went wrong. Please try again.";
}

export default function AlbumBadgesStrip({
  albumId,
  canAssign = false,
  albumOwnerId,
  isPublic = false,
}: {
  albumId: string;
  canAssign?: boolean;
  albumOwnerId?: string;
  isPublic?: boolean;
}) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  
  const [items, setItems] = useState<AlbumBadgeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<AlbumBadgeAssignment | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [myBadges, setMyBadges] = useState<CustomBadge[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profilePictureViewer, setProfilePictureViewer] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const selectedBadge = useMemo(
    () => myBadges.find((b) => b.id === selectedBadgeId) || null,
    [myBadges, selectedBadgeId]
  );

  // Check if user can assign badges (logged in, album is public, and not own album)
  const canActuallyAssign = useMemo(() => {
    if (!canAssign) return false;
    if (!isLoggedIn()) return false;
    if (!isPublic) return false;
    if (!currentUserId || !albumOwnerId) return false;
    // User cannot assign badges to their own albums
    return currentUserId !== albumOwnerId;
  }, [canAssign, isPublic, currentUserId, albumOwnerId]);

  // Fetch current user ID
  useEffect(() => {
    if (!isLoggedIn()) {
      setCurrentUserId(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const me = await getMyProfile();
        if (!cancelled) {
          setCurrentUserId(me.user._id);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserId(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPublicAlbumBadges({ albumId });
      setItems(res.items || []);
    } catch (e) {
      setError(formatError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  useEffect(() => {
    if (!assignOpen) return;
    if (!canActuallyAssign) return;
    if (!isLoggedIn()) return;
    let cancelled = false;
    const run = async () => {
      setLoadingMine(true);
      setMineError(null);
      try {
        const list = await listMyCustomBadges();
        if (!cancelled) setMyBadges(list);
      } catch (e) {
        if (!cancelled) setMineError(formatError(e));
      } finally {
        if (!cancelled) setLoadingMine(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [assignOpen, canActuallyAssign]);

  const submitAssign = async () => {
    setAssignError(null);

    if (!isLoggedIn()) {
      requestLogin();
      setAssignError("Please log in to assign a badge.");
      return;
    }

    const badgeId = selectedBadgeId || "";
    if (!badgeId) {
      setAssignError("Pick a custom badge to assign.");
      return;
    }
    if (!albumOwnerId) {
      setAssignError("Album owner information is missing.");
      return;
    }

    try {
      setAssigning(true);
      setAssignError(null);
      await assignCustomBadgeToAlbum({ albumId, badgeId, assigneeUserId: albumOwnerId });
      // Success - close modal and refresh
      setAssignOpen(false);
      setSelectedBadgeId(null);
      setAssignError(null);
      await refresh();
    } catch (e) {
      const errorMessage = formatError(e);
      setAssignError(errorMessage);
      // Don't close modal on error so user can see the message and try again
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      {/* Premium Badge Display Section */}
      <section 
        className="rounded-[32px] border shadow-lg overflow-hidden transition-colors duration-300"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-surface)",
          boxShadow: "0 10px 15px -3px var(--theme-shadow-strong), 0 4px 6px -2px var(--theme-shadow)",
        }}
      >
        <div className="px-8 py-6 flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="h-8 w-8 rounded-xl border flex items-center justify-center"
                style={{
                  backgroundColor: isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-accent-light)",
                  borderColor: isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)",
                  opacity: isDefault ? 1 : 0.8,
                }}
              >
                <span 
                  className="text-sm"
                  style={{ color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)" }}
                >
                  🏆
                </span>
              </div>
              <p 
                className="text-[10px] uppercase tracking-[0.4em] font-bold"
                style={{ color: "var(--theme-text-tertiary)" }}
              >
                Album Badges
              </p>
            </div>
            <p 
              className="text-sm leading-relaxed max-w-2xl"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              Curated recognition — badges awarded to those who shaped this story.
            </p>
          </div>

          {canActuallyAssign && (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn()) {
                    requestLogin();
                    return;
                  }
                  setAssignOpen(true);
                  setAssignError(null);
                }}
                className="shrink-0 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
                style={{
                  background: isDefault 
                    ? "linear-gradient(to right, #f97316, #ec4899, #ef4444)" 
                    : "var(--theme-gradient-primary)",
                  boxShadow: isDefault 
                    ? "0 10px 15px -3px rgba(249, 115, 22, 0.25), 0 4px 6px -2px rgba(249, 115, 22, 0.1)" 
                    : "0 10px 15px -3px var(--theme-shadow-strong), 0 4px 6px -2px var(--theme-shadow)",
                }}
                onMouseEnter={(e) => {
                  if (!isDefault) {
                    e.currentTarget.style.boxShadow = "0 20px 25px -5px var(--theme-shadow-strong), 0 10px 10px -5px var(--theme-shadow)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDefault) {
                    e.currentTarget.style.boxShadow = "0 10px 15px -3px var(--theme-shadow-strong), 0 4px 6px -2px var(--theme-shadow)";
                  }
                }}
                title="Assign one of your custom badges to this album"
              >
                <span className="text-base">+</span>
                <span>Assign Badge</span>
              </button>
              <p 
                className="text-[10px] text-right max-w-[140px]"
                style={{ color: "var(--theme-text-tertiary)" }}
              >
                Assign your custom badges
              </p>
            </div>
          )}
        </div>

        <div className="px-8 pb-8">
          {error ? (
            <div 
              className="rounded-2xl px-4 py-3 text-sm border transition-colors duration-300"
              style={{
                backgroundColor: isDefault ? "rgb(255, 247, 237)" : "var(--theme-accent-light)",
                color: isDefault ? "rgb(154, 52, 18)" : "var(--theme-accent)",
                borderColor: isDefault ? "rgb(254, 215, 170)" : "var(--theme-accent)",
              }}
            >
              {error}
            </div>
          ) : loading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 w-64 rounded-2xl border animate-pulse transition-colors duration-300"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: "var(--theme-surface)",
                  }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent]">
              {[
                { name: "Summit Attempt", icon: "🏔", description: "Locked" },
                { name: "High Altitude", icon: "❄️", description: "Locked" },
                { name: "Alpine Start", icon: "🌄", description: "Locked" },
              ].map((placeholder, idx) => (
                <div
                  key={idx}
                  className="group relative shrink-0 w-[min(280px,75vw)] rounded-2xl border transition-all duration-300 p-4 flex items-center gap-4 opacity-60"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: "var(--theme-surface-elevated)",
                  }}
                >
                  {/* Badge Logo Placeholder */}
                  <div 
                    className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 shrink-0 transition-all"
                    style={{
                      borderColor: "var(--theme-border)",
                      backgroundColor: "var(--theme-surface)",
                    }}
                  >
                    <div 
                      className="h-full w-full grid place-items-center text-2xl"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {placeholder.icon}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p 
                      className="text-sm font-bold truncate"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {placeholder.name}
                    </p>
                    <p 
                      className="text-xs truncate mt-0.5"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {placeholder.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent]">
              {items.map((a) => {
                const logoUrl = resolveMediaUrl(a.badge.logoKey);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setPreview(a)}
                    className="group relative shrink-0 w-[min(380px,85vw)] rounded-2xl border transition-all duration-300 p-4 flex items-center gap-4 text-left"
                    style={{
                      borderColor: "var(--theme-border)",
                      backgroundColor: "var(--theme-surface)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                      e.currentTarget.style.boxShadow = isDefault 
                        ? "0 20px 25px -5px rgba(249, 115, 22, 0.1), 0 10px 10px -5px rgba(249, 115, 22, 0.05)" 
                        : "0 20px 25px -5px var(--theme-shadow-strong), 0 10px 10px -5px var(--theme-shadow)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--theme-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Badge Logo with Premium Hover Effect */}
                    <div 
                      className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 transition-all duration-300 group-hover:scale-125 shrink-0"
                      style={{
                        borderColor: "var(--theme-border)",
                        backgroundColor: "var(--theme-surface-elevated)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                        e.currentTarget.style.boxShadow = isDefault 
                          ? "0 10px 15px -3px rgba(249, 115, 22, 0.2)" 
                          : "0 10px 15px -3px var(--theme-shadow-strong)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--theme-border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt={`${a.badge.name} logo`}
                          fill
                          className="object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                          sizes="64px"
                        />
                      ) : (
                        <div 
                          className="h-full w-full grid place-items-center text-xl transition-colors"
                          style={{ color: "var(--theme-text-tertiary)" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--theme-text-tertiary)";
                          }}
                        >
                          ✦
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p 
                        className="text-sm font-bold truncate transition-colors"
                        style={{ color: "var(--theme-text-primary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--theme-text-primary)";
                        }}
                      >
                        {a.badge.name}
                      </p>
                      <p 
                        className="text-xs truncate mt-0.5"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
                        Awarded to {a.assignee?.name || "someone"}
                      </p>
                      {a.badge.description && (
                        <p 
                          className="text-xs line-clamp-1 mt-1"
                          style={{ color: "var(--theme-text-tertiary)" }}
                        >
                          {a.badge.description}
                        </p>
                      )}
                    </div>

                    {/* Assignee Avatar */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = resolveMediaUrl(a.assignee?.profilePicture);
                        if (url) {
                          setProfilePictureViewer({ url, name: a.assignee?.name || "Assignee" });
                        }
                      }}
                      className="relative h-10 w-10 rounded-full overflow-hidden border-2 shadow-sm ring-1 shrink-0 hover:scale-125 hover:z-10 transition-all cursor-pointer"
                      style={{
                        borderColor: "var(--theme-surface)",
                        backgroundColor: "var(--theme-surface-elevated)",
                        ringColor: "var(--theme-border)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.ringColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.ringColor = "var(--theme-border)";
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          const url = resolveMediaUrl(a.assignee?.profilePicture);
                          if (url) {
                            setProfilePictureViewer({ url, name: a.assignee?.name || "Assignee" });
                          }
                        }
                      }}
                      aria-label={`View ${a.assignee?.name || "assignee"}'s profile picture`}
                    >
                      {resolveMediaUrl(a.assignee?.profilePicture) ? (
                        <Image
                          src={resolveMediaUrl(a.assignee.profilePicture)!}
                          alt={a.assignee?.name || "Assignee"}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div 
                          className="h-full w-full grid place-items-center text-xs font-bold"
                          style={{
                            color: "var(--theme-text-primary)",
                            backgroundColor: "var(--theme-surface)",
                          }}
                        >
                          {(a.assignee?.name || "U").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Hover Arrow Indicator */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)" }}
                      >
                        <path
                          d="M9 18L15 12L9 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Premium Badge Detail Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="min-h-full flex items-start justify-center p-4 pt-24 pb-8">
            <div className="w-full max-w-[960px] my-8">
              <div className="rounded-[36px] overflow-hidden border border-white/20 bg-gradient-to-br from-gray-950 via-gray-900 to-black shadow-2xl shadow-black/50">
                <div className="relative p-6 sm:p-10 md:p-12">
                {/* Animated Background Gradients */}
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl animate-pulse" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-pink-500/20 blur-3xl animate-pulse" />

                {/* Header */}
                <div className="relative flex items-start justify-between gap-6 mb-8">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 font-bold">
                      Badge Details
                    </p>
                    <h3 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                      {preview.badge.name}
                    </h3>
                    {preview.badge.description ? (
                      <p className="mt-4 text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
                        {preview.badge.description}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="shrink-0 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all grid place-items-center"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Content Grid */}
                <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                  {/* Badge Logo - Large Display */}
                  <div className="lg:col-span-3">
                    <div className="relative w-full h-[400px] sm:h-[480px] rounded-[32px] overflow-hidden border-2 border-white/10 bg-white/5 backdrop-blur-sm group/badge">
                      {/* Warm Premium Shining Overlay - Slower & Softer */}
                      <div className="absolute inset-0 opacity-100 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-300/15 via-transparent to-transparent animate-[shimmer_8s_ease-in-out_infinite]" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-300/10 to-transparent animate-[shimmer_8s_ease-in-out_infinite_2.5s]" />
                        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-amber-200/8 to-transparent animate-[shimmer_8s_ease-in-out_infinite_5s]" />
                      </div>
                      
                      {/* Warm Glow Effect - Slower Pulse */}
                      <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-r from-amber-400/10 via-amber-300/25 to-amber-400/10 blur-xl animate-[glow_6s_ease-in-out_infinite] pointer-events-none" />
                      
                      {resolveMediaUrl(preview.badge.logoKey) ? (
                        <Image
                          src={resolveMediaUrl(preview.badge.logoKey)!}
                          alt={`${preview.badge.name} logo`}
                          fill
                          className="object-contain p-8 sm:p-12 relative z-10"
                          sizes="(max-width: 1024px) 94vw, 520px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/70 text-6xl relative z-10">
                          ✦
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Information Panel */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Awarded To Section */}
                    <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 font-bold mb-4">
                        Awarded To
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            const url = resolveMediaUrl(preview.assignee.profilePicture);
                            if (url) {
                              setProfilePictureViewer({ url, name: preview.assignee.name || "Assignee" });
                            }
                          }}
                          className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 ring-2 ring-orange-500/30 cursor-pointer hover:ring-orange-500/50 hover:scale-110 transition-all duration-200"
                        >
                          {resolveMediaUrl(preview.assignee.profilePicture) ? (
                            <Image
                              src={resolveMediaUrl(preview.assignee.profilePicture)!}
                              alt={preview.assignee.name || "Assignee"}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-white/80 text-lg font-bold bg-gradient-to-br from-gray-700 to-gray-800">
                              {(preview.assignee.name || "U").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-lg font-bold truncate">
                            {preview.assignee.name || "Anonymous"}
                          </p>
                          <p className="text-white/60 text-sm truncate mt-1">
                            {preview.createdAt
                              ? `Assigned ${new Date(preview.createdAt).toLocaleDateString(undefined, {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}`
                              : "Badge recipient"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Assigned By Section */}
                    {preview.assignedBy && (
                      <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                        <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 font-bold mb-4">
                          Created By
                        </p>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              const url = resolveMediaUrl(preview.assignedBy.profilePicture);
                              if (url) {
                                setProfilePictureViewer({ url, name: preview.assignedBy.name || "Creator" });
                              }
                            }}
                            className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 ring-2 ring-pink-500/30 cursor-pointer hover:ring-pink-500/50 hover:scale-110 transition-all duration-200"
                          >
                            {resolveMediaUrl(preview.assignedBy.profilePicture) ? (
                              <Image
                                src={resolveMediaUrl(preview.assignedBy.profilePicture)!}
                                alt={preview.assignedBy.name || "Creator"}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-white/80 text-lg font-bold bg-gradient-to-br from-gray-700 to-gray-800">
                                {(preview.assignedBy.name || "U").slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-lg font-bold truncate">
                              {preview.assignedBy.name || "Anonymous"}
                            </p>
                            <p className="text-white/60 text-sm truncate mt-1">Badge creator</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info Card */}
                    <div className="rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-sm p-6">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 font-bold mb-3">
                        About This Badge
                      </p>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {preview.badge.isCustom
                          ? "This is a custom badge created specifically for this album. It represents a unique recognition for contributions to this story."
                          : "This badge represents a significant achievement and recognition within the Trailbook community."}
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Assign Badge Modal */}
      {assignOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setAssignOpen(false);
              setAssignError(null);
              setSelectedBadgeId(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <aside className="absolute top-0 right-0 bottom-0 w-[520px] max-w-[94vw] bg-white/98 backdrop-blur-xl border-l border-black/10 shadow-2xl">
            <div className="px-8 pt-8 pb-6 border-b border-black/5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-200/50 flex items-center justify-center">
                    <span className="text-orange-600 text-xs">🏆</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold">
                    Assign Badge
                  </p>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-gray-900">
                  Award a custom badge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignOpen(false);
                  setAssignError(null);
                  setSelectedBadgeId(null);
                }}
                className="h-10 w-10 rounded-full bg-black/5 hover:bg-black/10 transition grid place-items-center text-gray-600"
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-8 py-6 space-y-6 overflow-auto h-full pb-40">
              {mineError && (
                <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-sm border border-orange-100">
                  {mineError}
                </div>
              )}

              {/* Badge Selection */}
              <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-gray-50/80 via-white to-orange-50/30 p-6">
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold mb-2">
                  Select Badge
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Choose one of your custom badges to assign to this album.
                </p>

                {loadingMine ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-20 rounded-2xl bg-white border border-black/5 animate-pulse"
                      />
                    ))}
                  </div>
                ) : myBadges.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-black/5 px-5 py-5 text-sm text-gray-700">
                    <p className="font-semibold mb-2">No custom badges available</p>
                    <p className="text-gray-600">
                      Create a custom badge from the Badges page, then come back here to assign it.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {myBadges.map((b) => {
                      const selected = selectedBadgeId === b.id;
                      const logoUrl = resolveMediaUrl(b.logoKey);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBadgeId(b.id)}
                          className={[
                            "rounded-2xl border-2 px-5 py-4 flex items-center gap-4 text-left transition-all duration-200",
                            selected
                              ? "border-orange-400 bg-gradient-to-br from-orange-50 to-pink-50 shadow-lg shadow-orange-500/10"
                              : "border-black/5 bg-white hover:border-orange-200 hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "relative h-14 w-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                              selected
                                ? "border-orange-300 bg-white scale-110"
                                : "border-black/10 bg-gray-100",
                            ].join(" ")}
                          >
                            {logoUrl ? (
                              <Image
                                src={logoUrl}
                                alt={`${b.name} logo`}
                                fill
                                className="object-contain p-2"
                                sizes="56px"
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-gray-500 text-lg">
                                ✦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={[
                                "text-sm font-bold truncate",
                                selected ? "text-orange-700" : "text-gray-900",
                              ].join(" ")}
                            >
                              {b.name}
                            </p>
                            <p className="text-xs text-gray-600 truncate mt-0.5">
                              {b.description || "No description"}
                            </p>
                          </div>
                          <div
                            className={[
                              "h-6 w-6 rounded-full border-2 grid place-items-center text-xs font-bold transition-all",
                              selected
                                ? "bg-orange-500 border-orange-600 text-white scale-110"
                                : "bg-white text-gray-400 border-black/10",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            {selected ? "✓" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {assignError && (
                <div className="rounded-2xl bg-orange-50 text-orange-800 px-5 py-4 text-sm border-2 border-orange-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Unable to assign badge</p>
                      <p className="text-orange-700">{assignError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignError(null)}
                      className="shrink-0 h-6 w-6 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition grid place-items-center text-xs"
                      aria-label="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/95 backdrop-blur-xl border-t border-black/5">
              <button
                type="button"
                disabled={assigning || !selectedBadge || !albumOwnerId}
                onClick={submitAssign}
                className={[
                  "w-full rounded-full px-6 py-3.5 text-sm font-bold shadow-lg transition-all duration-200",
                  assigning || !selectedBadge || !albumOwnerId
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 text-white hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]",
                ].join(" ")}
              >
                {assigning
                  ? "Assigning…"
                  : selectedBadge
                    ? `Assign "${selectedBadge.name}"`
                    : "Select a badge"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Profile Picture Viewer Modal */}
      {profilePictureViewer && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setProfilePictureViewer(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-2xl max-h-[85vh] w-full mt-16">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setProfilePictureViewer(null);
              }}
              className="absolute -top-12 right-0 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all grid place-items-center z-10"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="rounded-3xl overflow-hidden border-2 border-white/20 bg-white/5 backdrop-blur-md shadow-2xl">
              <div className="relative aspect-square w-full">
                <Image
                  src={profilePictureViewer.url}
                  alt={profilePictureViewer.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 90vw, 800px"
                />
              </div>
              <div className="p-6 bg-gradient-to-b from-black/80 to-black">
                <p className="text-white text-xl font-bold text-center">
                  {profilePictureViewer.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
