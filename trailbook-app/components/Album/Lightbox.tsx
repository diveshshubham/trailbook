"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getMediaReflectionsCount,
  listMediaReflections,
  listReflectionTypes,
  upsertMyMediaReflection,
  type MediaReflectionItem,
  type ReflectionType,
} from "@/lib/badgesApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export type MediaMeta = {
  title?: string;
  description?: string;
  location?: string;
  tags?: string[];
  story?: string;
  isPublic?: boolean;
};

export type LightboxItem = {
  id: string;
  src: string;
  meta?: MediaMeta;
};

type LightboxProps = {
  images: string[];
  items?: LightboxItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  autoplay?: boolean;
  intervalMs?: number;
  meta?: MediaMeta;
  onMetaChange?: (meta: MediaMeta) => void;
  onSaveMeta?: () => Promise<void> | void;
  savingMeta?: boolean;
  initialDetailsOpen?: boolean;
  protectImages?: boolean;
  onArchive?: (mediaId: string) => Promise<void> | void;
  onDelete?: (mediaId: string) => Promise<void> | void;
  isArchiving?: boolean;
  isDeleting?: boolean;
  showArchiveActions?: boolean;
};

export default function Lightbox({
  images,
  items,
  index,
  onClose,
  onPrev,
  onNext,
  autoplay = false,
  intervalMs = 2500,
  meta,
  onMetaChange,
  onSaveMeta,
  savingMeta = false,
  initialDetailsOpen = false,
  protectImages = false,
  onArchive,
  onDelete,
  isArchiving = false,
  isDeleting = false,
  showArchiveActions = false,
}: LightboxProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  
  const sources = items?.length ? items.map((i) => i.src) : images;
  const src = sources[index];
  const mediaId = items?.[index]?.id || null;
  const currentMediaId = mediaId;
  const [playing, setPlaying] = useState(autoplay && !initialDetailsOpen);
  const [detailsOpen, setDetailsOpen] = useState(initialDetailsOpen);
  const [detailsTab, setDetailsTab] = useState<"details" | "reflections">("details");
  const canEditMeta = Boolean(items?.length) && Boolean(onMetaChange);
  const isViewer = !canEditMeta;
  const [tagsText, setTagsText] = useState((meta?.tags || []).join(", "));
  const [storyOpen, setStoryOpen] = useState(false);
  const [viewerSheetOpen, setViewerSheetOpen] = useState(false);
  const [appreciationEmoji, setAppreciationEmoji] = useState<string | null>(null);
  const storyScrollRef = useRef<HTMLDivElement | null>(null);
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingDrawerWheelDelta = useRef<number | null>(null);
  const lastWheelNavAt = useRef<number>(0);
  const resumeAfterStoryClose = useRef<boolean>(false);

  const hasPrev = index > 0;
  const hasNext = index < sources.length - 1;

  const hasMeta =
    Boolean(meta?.title) ||
    Boolean(meta?.description) ||
    Boolean(meta?.location) ||
    Boolean(meta?.story) ||
    Boolean(meta?.tags?.length);

  const isFormFocus = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // When typing in the details form, do NOT hijack keys like space/arrow.
      if (typeof document !== "undefined" && isFormFocus()) return;
      if (detailsOpen) return;

      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onPrev, onNext, detailsOpen]);

  useEffect(() => {
    if (!playing || sources.length <= 1) return;
    const id = window.setInterval(() => {
      onNext();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, sources.length, intervalMs, onNext]);

  useEffect(() => {
    // When editing details, pause slideshow and prevent accidental play.
    if (detailsOpen) setPlaying(false);
  }, [detailsOpen]);

  useEffect(() => {
    // Reset tab when switching images
    setDetailsTab("details");
  }, [src]);

  useEffect(() => {
    // Never show story drawer while editing
    if (detailsOpen) {
      setStoryOpen(false);
      setViewerSheetOpen(false);
    }
  }, [detailsOpen]);

  useEffect(() => {
    // Reset drawers when switching photos
    setStoryOpen(false);
    setViewerSheetOpen(false);
    if (storyScrollRef.current) storyScrollRef.current.scrollTop = 0;
    if (drawerScrollRef.current) drawerScrollRef.current.scrollTop = 0;
    pendingDrawerWheelDelta.current = null;
    resumeAfterStoryClose.current = false;
  }, [src]);

  useEffect(() => {
    // If user opens story/viewer sheet while slideshow is playing, pause it.
    // When they close, resume only if it was paused by opening.
    if (detailsOpen) return;
    const anySheetOpen = storyOpen || viewerSheetOpen;
    if (anySheetOpen) {
      if (playing) {
        resumeAfterStoryClose.current = true;
        setPlaying(false);
      } else {
        resumeAfterStoryClose.current = false;
      }
      return;
    }

    if (resumeAfterStoryClose.current) {
      resumeAfterStoryClose.current = false;
      setPlaying(true);
    }
  }, [storyOpen, viewerSheetOpen, detailsOpen, playing]);

  useEffect(() => {
    const anySheetOpen = storyOpen || viewerSheetOpen;
    if (!anySheetOpen) return;
    if (pendingDrawerWheelDelta.current == null) return;
    const dy = pendingDrawerWheelDelta.current;
    pendingDrawerWheelDelta.current = null;
    // Apply the initiating wheel delta to the drawer so the user's scroll continues naturally.
    requestAnimationFrame(() => {
      drawerScrollRef.current?.scrollBy({ top: dy });
    });
  }, [storyOpen, viewerSheetOpen]);

  useEffect(() => {
    // Keep play state in sync with props (but never autoplay while editing)
    if (detailsOpen) return;
    setPlaying(Boolean(autoplay));
  }, [autoplay, detailsOpen]);

  useEffect(() => {
    // Keep tags input stable while typing (space should work). Sync when meta changes.
    setTagsText((meta?.tags || []).join(", "));
  }, [meta?.tags]);

  const parseTags = (raw: string) => {
    // Accept: "sunset, trek" OR "sunset trek" OR "#sunset #trek"
    return raw
      .replace(/\n/g, " ")
      .split(",")
      .flatMap((chunk) => chunk.trim().split(/\s+/))
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t.slice(1) : t))
      .map((t) => t.replace(/\s+/g, "-"))
      .filter(Boolean);
  };

  useEffect(() => {
    // Prevent background scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const counter = useMemo(() => `${index + 1} / ${sources.length}`, [index, sources.length]);

  if (!src) return null;
  if (typeof document === "undefined") return null;

  const ui = (
    <div
      className="fixed inset-0 z-[9999] bg-black"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Minimal top overlay (stays on top of image) */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-[10px] tracking-[0.35em] uppercase">
            Slideshow
          </span>
          <span className="text-white/30">·</span>
          <span className="text-white/70 text-xs tracking-wide">{counter}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Single top-right Edit entrypoint (works for add/edit) */}
          {canEditMeta && (
            <IconButton
              onClick={() => setDetailsOpen(true)}
              aria-label="Edit details"
              label={hasMeta ? "Edit" : "Add info"}
              className={!hasMeta ? "animate-pulse" : undefined}
            >
              {/* pencil icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 20h9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          )}
          <IconButton
            onClick={() => setPlaying((p) => !p)}
            disabled={sources.length <= 1}
            aria-label={playing ? "Pause" : "Play"}
            label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M17 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 7.5v9l8-4.5-8-4.5Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </IconButton>
          <IconButton
            onClick={onClose}
            aria-label="Close"
            label="Close"
          >
            ✕
          </IconButton>
        </div>
      </div>

      {/* Main */}
      <div
        className="absolute inset-0 group"
        onWheel={(e) => {
          if (detailsOpen) return;
          // Horizontal scroll (trackpad): left/right to navigate photos.
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 14) {
            const now = Date.now();
            if (now - lastWheelNavAt.current < 320) return;
            lastWheelNavAt.current = now;
            if (e.deltaX > 0) {
              if (hasNext) onNext();
            } else {
              if (hasPrev) onPrev();
            }
            return;
          }
          const anySheetOpen = storyOpen || viewerSheetOpen;
          if (anySheetOpen) {
            // If user scrolls DOWN anywhere on the image, close the drawer.
            // Note: on some devices deltaY is inverted; in this app we map "down" to deltaY < 0.
            if (e.deltaY < -10) {
              setStoryOpen(false);
              setViewerSheetOpen(false);
            }
            return;
          }
          // Open drawer ONLY when user scrolls UP anywhere on the image.
          // Note: on some devices deltaY is inverted; in this app we map "up" to deltaY > 0.
          if (e.deltaY > 10) {
            pendingDrawerWheelDelta.current = e.deltaY;
            if (isViewer) {
              setViewerSheetOpen(true);
            } else {
              setStoryOpen(true);
            }
          }
        }}
      >
        <img
          src={src}
          alt={`Photo ${index + 1}`}
          className="h-full w-full object-contain select-none"
          draggable={false}
          onContextMenu={(e) => {
            if (protectImages) e.preventDefault();
          }}
          onDoubleClick={onClose}
          onClick={() => {
            if (!detailsOpen) setPlaying((p) => !p);
          }}
          title="Double click to close"
        />
        
        {/* Instagram-style appreciation animation */}
        {appreciationEmoji && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div
              className="text-[140px] animate-[appreciationPop_1.2s_ease-out_forwards]"
              style={{
                filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.5))",
                textShadow: "0 0 40px rgba(255,255,255,0.5)",
              }}
            >
              {appreciationEmoji}
            </div>
          </div>
        )}

        {/* Premium nav buttons (subtle, on hover) */}
        {!detailsOpen && (
          <>
            <div className="absolute inset-y-0 left-0 flex items-center z-30 pointer-events-none">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                className="pointer-events-auto ml-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white disabled:opacity-20 transition opacity-0 group-hover:opacity-100"
                aria-label="Previous"
                title="Previous (←)"
              >
                ‹
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center z-30 pointer-events-none">
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="pointer-events-auto mr-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white disabled:opacity-20 transition opacity-0 group-hover:opacity-100"
                aria-label="Next"
                title="Next (→)"
              >
                ›
              </button>
            </div>
          </>
        )}


        {/* Bottom sheet for owners (story/details) */}
        {!detailsOpen && storyOpen && !isViewer && (
          <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
            <div className="w-[min(860px,calc(100vw-2rem))] max-h-[75vh] rounded-3xl border border-white/10 bg-black/45 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden animate-[tbSheetIn_220ms_ease-out]">
              <div className="px-6 pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">
                      Moment
                    </p>
                    <p className="mt-1 text-white/90 font-semibold tracking-tight truncate">
                      {meta?.title || "A moment worth naming"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStoryOpen(false)}
                    className="ml-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition grid place-items-center"
                    aria-label="Close story"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4 h-1 w-12 rounded-full bg-white/10 mx-auto" />
              </div>

              <div
                ref={drawerScrollRef}
                className="px-6 pb-6 pt-4 border-t border-white/10 overflow-auto max-h-[calc(75vh-80px)] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent]"
                onWheel={(e) => {
                  e.stopPropagation();
                }}
              >
                {(meta?.location || meta?.description) && (
                  <p className="text-white/65 text-sm leading-relaxed">
                    {meta?.location ? `${meta.location}` : ""}
                    {meta?.location && meta?.description ? " · " : ""}
                    {meta?.description || ""}
                  </p>
                )}

                {meta?.tags?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {meta.tags.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {meta?.story ? (
                  <div className="mt-5">
                    <p className="text-white/45 text-[10px] uppercase tracking-[0.35em]">
                      Story
                    </p>
                    <div
                      ref={storyScrollRef}
                      className="relative mt-2 pb-10 text-white/60 text-sm leading-relaxed whitespace-pre-wrap"
                      onWheel={(e) => {
                        e.stopPropagation();
                        const el = storyScrollRef.current;
                        if (!el) return;
                        if (el.scrollTop <= 0 && e.deltaY < -10) {
                          setStoryOpen(false);
                        }
                      }}
                    >
                      {meta.story}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-white/45 text-sm">No story added yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Premium bottom sheet for viewers (progressive: picker → list → details) */}
        {!detailsOpen && viewerSheetOpen && isViewer && mediaId && (
          <ViewerReflectionsSheet
            mediaId={mediaId}
            meta={meta}
            onClose={() => setViewerSheetOpen(false)}
            drawerScrollRef={drawerScrollRef}
            setAppreciationEmoji={setAppreciationEmoji}
          />
        )}

        {/* Subtle bottom hint */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center text-white/30 text-xs tracking-wide pointer-events-none">
          <span>
            {isViewer && !viewerSheetOpen ? "Scroll up or tap ✦ to appreciate · " : ""}
            Space / click to play-pause · Esc / double‑click to close
          </span>
        </div>
      </div>

      {/* Details panel */}
      {detailsOpen && items?.length && (
        <aside className="absolute top-0 right-0 bottom-0 w-[360px] max-w-[90vw] bg-black/70 backdrop-blur-xl border-l border-white/10 z-20">
          <div className="px-6 pt-20 pb-6 h-full overflow-auto">
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition flex items-center justify-center"
              title="Close details"
              aria-label="Close details"
            >
              ✕
            </button>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-semibold">
              {detailsTab === "details" ? "Photo details" : "Reflections"}
            </p>

            <div className="mt-4">
              <div
                className="inline-flex w-full p-1 rounded-2xl border"
                style={{
                  backgroundColor: isDefault ? "rgba(255, 255, 255, 0.05)" : "var(--theme-surface-elevated)",
                  borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setDetailsTab("details")}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold tracking-[0.22em] uppercase transition"
                  style={
                    detailsTab === "details"
                      ? {
                          background: isDefault ? "white" : "var(--theme-accent)",
                          color: isDefault ? "black" : "var(--theme-text-inverse)",
                        }
                      : {
                          color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (detailsTab !== "details") {
                      e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (detailsTab !== "details") {
                      e.currentTarget.style.color = isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)";
                    }
                  }}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab("reflections")}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold tracking-[0.22em] uppercase transition"
                  style={
                    detailsTab === "reflections"
                      ? {
                          background: isDefault ? "white" : "var(--theme-accent)",
                          color: isDefault ? "black" : "var(--theme-text-inverse)",
                        }
                      : {
                          color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (detailsTab !== "reflections") {
                      e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (detailsTab !== "reflections") {
                      e.currentTarget.style.color = isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)";
                    }
                  }}
                >
                  Reflections
                </button>
              </div>
            </div>

            {detailsTab === "details" ? (
              <div className="mt-6 space-y-5">
                <Field label="Title">
                  <input
                    value={meta?.title || ""}
                    onChange={(e) => onMetaChange?.({ ...(meta || {}), title: e.target.value })}
                    placeholder="e.g. Sunrise"
                    disabled={!canEditMeta}
                    className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                  />
                </Field>

                <Field label="Description">
                  <input
                    value={meta?.description || ""}
                    onChange={(e) =>
                      onMetaChange?.({ ...(meta || {}), description: e.target.value })
                    }
                    placeholder="e.g. Top view point"
                    disabled={!canEditMeta}
                    className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                  />
                </Field>

                <Field label="Location">
                  <input
                    value={meta?.location || ""}
                    onChange={(e) => onMetaChange?.({ ...(meta || {}), location: e.target.value })}
                    placeholder="e.g. Pangong Lake, Ladakh"
                    disabled={!canEditMeta}
                    className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                  />
                </Field>

                <Field label="Tags">
                  <input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    onBlur={() => {
                      const parsed = parseTags(tagsText);
                      onMetaChange?.({ ...(meta || {}), tags: parsed });
                    }}
                    placeholder="adventure, sunrise, mountains"
                    disabled={!canEditMeta}
                    className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                  />
                  {meta?.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {meta.tags.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Field>

                <Field label="Visibility">
                  <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => onMetaChange?.({ ...(meta || {}), isPublic: false })}
                      disabled={!canEditMeta}
                      className="flex-1 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-60"
                      style={
                        meta?.isPublic === false
                          ? {
                              background: isDefault ? "white" : "var(--theme-accent)",
                              color: isDefault ? "black" : "var(--theme-text-inverse)",
                            }
                          : {
                              color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (meta?.isPublic !== false && !e.currentTarget.disabled) {
                          e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-primary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (meta?.isPublic !== false) {
                          e.currentTarget.style.color = isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)";
                        }
                      }}
                    >
                      Private
                    </button>
                    <button
                      type="button"
                      onClick={() => onMetaChange?.({ ...(meta || {}), isPublic: true })}
                      disabled={!canEditMeta}
                      className="flex-1 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-60"
                      style={
                        meta?.isPublic === true
                          ? {
                              background: isDefault ? "white" : "var(--theme-accent)",
                              color: isDefault ? "black" : "var(--theme-text-inverse)",
                            }
                          : {
                              color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (meta?.isPublic !== true && !e.currentTarget.disabled) {
                          e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-primary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (meta?.isPublic !== true) {
                          e.currentTarget.style.color = isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)";
                        }
                      }}
                    >
                      Public
                    </button>
                  </div>
                </Field>

                <Field label="Story behind this photo">
                  <textarea
                    value={meta?.story || ""}
                    onChange={(e) => onMetaChange?.({ ...(meta || {}), story: e.target.value })}
                    placeholder="What was happening when you took this?"
                    disabled={!canEditMeta}
                    className="w-full min-h-[120px] rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none leading-relaxed disabled:opacity-50"
                  />
                </Field>
              </div>
            ) : (
              <div className="mt-6">
                <ReflectionsPanel mediaId={mediaId} />
              </div>
            )}

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => {
                  // Ensure tags are parsed before saving
                  const parsed = parseTags(tagsText);
                  onMetaChange?.({ ...(meta || {}), tags: parsed });
                  onSaveMeta?.();
                }}
                disabled={!onSaveMeta || savingMeta || detailsTab !== "details"}
                className="flex-1 rounded-2xl py-3 text-xs font-semibold tracking-[0.2em] uppercase disabled:opacity-40 transition"
                style={{
                  background: isDefault ? "white" : "var(--theme-gradient-primary)",
                  color: isDefault ? "black" : "var(--theme-text-inverse)",
                }}
              >
                {savingMeta ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-2xl border px-4 py-3 text-xs font-semibold tracking-wide transition"
                style={{
                  backgroundColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-surface)",
                  borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                  color: isDefault ? "rgba(255, 255, 255, 0.8)" : "var(--theme-text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!isDefault) {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                  } else {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDefault) {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                  } else {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }
                }}
              >
                Done
              </button>
            </div>

            {!onSaveMeta && (
              <p className="mt-3 text-xs text-white/40">
                Save is disabled until you share the media-metadata API.
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );

  return createPortal(ui, document.body);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
}) {
  return (
    <button
      {...props}
      className={[
        "group relative rounded-full h-10 w-10 grid place-items-center",
        "text-white/80 hover:text-white",
        "bg-white/10 hover:bg-white/15 border border-white/10",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/10",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        "disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none",
        // pulsing should not affect layout
        "will-change-transform",
        className || "",
      ].join(" ")}
    >
      {children}
      <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 border border-white/10 px-3 py-1 text-[10px] tracking-[0.25em] uppercase text-white/70 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
        {label}
      </span>
    </button>
  );
}

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("token"));
}

function requestLogin() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("tb:open-auth"));
}

function formatTime(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric" });
}


function ViewerReflectionsSheet({
  mediaId,
  meta,
  onClose,
  drawerScrollRef,
  setAppreciationEmoji,
}: {
  mediaId: string | null;
  meta?: MediaMeta;
  onClose: () => void;
  drawerScrollRef: React.RefObject<HTMLDivElement | null>;
  setAppreciationEmoji: (emoji: string | null) => void;
}) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  const storyScrollRef = useRef<HTMLDivElement | null>(null);
  const [types, setTypes] = useState<ReflectionType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);

  const [count, setCount] = useState<number>(0);
  const [items, setItems] = useState<MediaReflectionItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [myTypeId, setMyTypeId] = useState<string | null>(null);
  const [showReflections, setShowReflections] = useState(false);
  const [selectedReflectionTypeId, setSelectedReflectionTypeId] = useState<string | null>(null);
  const reflectionsSectionRef = useRef<HTMLDivElement | null>(null);
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ name: string; profilePicture?: string } | null>(null);

  // Get micro-descriptions for each reflection type
  const getDescription = (label: string): string => {
    const descriptions: Record<string, string> = {
      "Tokens": "Quick recognition",
      "Kudos": "Quick recognition",
      "Recognition": "Quick recognition",
      "Insights": "What you learned",
      "Thoughts": "How this made you feel",
      "Moments": "Capture a highlight",
      "Trail Reflections": "Share your experience",
      "Memories": "Remember this",
      "Companions": "Who was with you",
      "Journeys": "Your journey story",
      "Reactions": "One-tap response",
      "Appreciate": "Quick reaction",
    };
    return descriptions[label] || "Share your thoughts";
  };

  // Get softer "yours" label for each reflection type
  const getYoursLabel = (label: string): string => {
    const labels: Record<string, string> = {
      "Insights": "Your insight",
      "Thoughts": "You shared",
      "Moments": "Your moment",
      "Tokens": "You gave",
      "Kudos": "You gave",
      "Recognition": "You gave",
      "Trail Reflections": "You reflected",
      "Memories": "Your memory",
      "Companions": "You noted",
      "Journeys": "You shared",
      "Reactions": "Your reaction",
      "Appreciate": "You appreciated",
    };
    return labels[label] || "Added by you";
  };

  // Calculate reflection counts by type
  const reflectionCountsByType = useMemo(() => {
    const counts: Record<string, { count: number; emoji?: string; label: string }> = {};
    items.forEach((item) => {
      const typeId = item.reflection.id;
      if (!counts[typeId]) {
        counts[typeId] = {
          count: 0,
          emoji: item.reflection.emoji,
          label: item.reflection.label,
        };
      }
      counts[typeId].count += 1;
    });
    return counts;
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setTypesLoading(true);
      setTypesError(null);
      try {
        const list = await listReflectionTypes();
        if (!cancelled) setTypes(list);
      } catch (e) {
        if (!cancelled) setTypesError(e instanceof Error ? e.message : "Failed to load reflection types.");
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-open appreciate section when scrolling to bottom of story
  useEffect(() => {
    const el = drawerScrollRef.current;
    if (!el || !meta?.story || showReflections) return;
    
    let hasTriggered = false;
    let scrollTimeout: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      if (hasTriggered || showReflections) return;
      
      // Debounce scroll checks
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        if (!drawerScrollRef.current || hasTriggered || showReflections) return;
        
        const currentEl = drawerScrollRef.current;
        const scrollBottom = currentEl.scrollHeight - currentEl.scrollTop - currentEl.clientHeight;
        
        // Check if scrolled to bottom (with 100px threshold)
        if (scrollBottom < 100) {
          hasTriggered = true;
          setShowReflections(true);
          // Auto-scroll to reflections section after state update
          requestAnimationFrame(() => {
            setTimeout(() => {
              reflectionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 200);
          });
        }
      }, 100);
    };
    
    el.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [meta?.story, showReflections]);

  useEffect(() => {
    if (!mediaId) return;
    let cancelled = false;
    const run = async () => {
      setLoadingList(true);
      setListError(null);
      setMyTypeId(null);
      try {
        // Use count from listMediaReflections response if available, otherwise fetch separately
        const list = await listMediaReflections({ mediaId, limit: 20 });
        if (cancelled) return;
        // Use count from list response if available, otherwise fetch it
        if (typeof list.count === "number") {
          setCount(list.count);
        } else {
          const c = await getMediaReflectionsCount({ mediaId });
          if (!cancelled) setCount(typeof c.count === "number" ? c.count : 0);
        }
        setItems(list.items || []);
        setCursor(list.pageInfo?.nextCursor ?? null);
        setHasNext(Boolean(list.pageInfo?.hasNextPage));
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : "Failed to load reflections.");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  const loadMore = async () => {
    if (!mediaId || !hasNext || !cursor) return;
    setLoadingMore(true);
    setListError(null);
    try {
      const next = await listMediaReflections({ mediaId, limit: 20, cursor });
      setItems((prev) => [...prev, ...(next.items || [])]);
      setCursor(next.pageInfo?.nextCursor ?? null);
      setHasNext(Boolean(next.pageInfo?.hasNextPage));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load more reflections.");
    } finally {
      setLoadingMore(false);
    }
  };

  const onPick = async (typeId: string) => {
    if (!mediaId) return;
    if (!isLoggedIn()) {
      requestLogin();
      return;
    }
    
    // Find the emoji for the selected type
    const selectedType = types.find((t) => t.id === typeId);
    const emoji = selectedType?.emoji || "✦";
    
    // Trigger Instagram-style animation
    setAppreciationEmoji(emoji);
    setTimeout(() => setAppreciationEmoji(null), 1200);
    
    setSaving(true);
    try {
      const res = await upsertMyMediaReflection({ mediaId, reflectionTypeId: typeId });
      setMyTypeId(typeId);
      // Refresh list (user's reflection will appear first when authenticated)
      const list = await listMediaReflections({ mediaId, limit: 20 });
      // Update count from response
      if (typeof list.count === "number") {
        setCount(list.count);
      } else if (res.created) {
        setCount((c) => c + 1);
      }
      setItems(list.items || []);
      setCursor(list.pageInfo?.nextCursor ?? null);
      setHasNext(Boolean(list.pageInfo?.hasNextPage));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
      <div className="w-[min(720px,calc(100vw-2rem))] max-h-[75vh] rounded-[28px] border border-white/20 bg-black/60 backdrop-blur-[40px] shadow-2xl shadow-black/60 flex flex-col overflow-hidden animate-[tbSheetIn_220ms_ease-out]">
        {/* Header - fixed at top */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold leading-relaxed">
                {showReflections ? "Appreciation" : "Moment"}
              </p>
              <p className="mt-2 text-white/90 font-semibold text-lg tracking-tight leading-snug">
                {showReflections ? "Share your reflection" : meta?.title || "About this moment"}
              </p>
              {/* Reflection counts with icons (top-left area) - clickable to show filtered user list */}
              {Object.keys(reflectionCountsByType).length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {Object.entries(reflectionCountsByType).map(([typeId, data]) => {
                    const filteredUsers = items.filter((item) => item.reflection.id === typeId);
                    return (
                      <button
                        key={typeId}
                        type="button"
                        onClick={() => {
                          setSelectedReflectionTypeId(typeId);
                          setShowReflections(true);
                          setTimeout(() => {
                            reflectionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 100);
                        }}
                        className="group/icon relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-white/15 hover:border-white/30 transition-all duration-200 cursor-pointer"
                      >
                        <span className="text-base">{data.emoji || "✦"}</span>
                        <span className="text-xs font-semibold text-white/90">{data.count}</span>
                        {/* Premium hover tooltip */}
                        <span className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/90 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[10px] tracking-wide text-white/90 opacity-0 group-hover/icon:opacity-100 transition-all duration-200 group-hover/icon:-translate-y-1 shadow-xl z-50">
                          {data.count} {data.count === 1 ? "person" : "people"} {data.label.toLowerCase()}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 shrink-0 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition grid place-items-center"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content: Story first → Appreciate button → Reflections */}
        <div
          ref={drawerScrollRef}
          className="overflow-auto max-h-[calc(80vh-120px)] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent]"
          onWheel={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Section 1: Details/Story FIRST (beautiful, readable) */}
          {(meta?.location || meta?.description || meta?.tags?.length || meta?.story) && (
            <div className="px-6 pt-6 pb-6">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold mb-4">
                About this moment
              </p>
              {(meta.location || meta.description) && (
                <p className="text-white/75 text-sm leading-relaxed mb-4">
                  {meta.location ? `${meta.location}` : ""}
                  {meta.location && meta.description ? " · " : ""}
                  {meta.description || ""}
                </p>
              )}
              {meta.tags?.length ? (
                <div className="mb-5 flex flex-wrap gap-2">
                  {meta.tags.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
              {meta.story ? (
                <div className="relative">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="text-white/45 text-[10px] uppercase tracking-[0.35em] font-semibold">
                      Story
                    </p>
                    {/* Archive/Delete buttons or Appreciate button */}
                    {showArchiveActions && onArchive && onDelete && currentMediaId ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onArchive(currentMediaId)}
                          disabled={isArchiving || isDeleting}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: "var(--theme-warning)",
                            borderColor: "var(--theme-warning)",
                            color: "white",
                          }}
                          onMouseEnter={(e) => {
                            if (!isArchiving && !isDeleting) {
                              e.currentTarget.style.opacity = "0.9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          <span className="text-xs font-semibold tracking-wide">
                            {isArchiving ? "Archiving…" : "📦 Archive"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(currentMediaId)}
                          disabled={isArchiving || isDeleting}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: "var(--theme-error)",
                            borderColor: "var(--theme-error)",
                            color: "white",
                          }}
                          onMouseEnter={(e) => {
                            if (!isArchiving && !isDeleting) {
                              e.currentTarget.style.opacity = "0.9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          <span className="text-xs font-semibold tracking-wide">
                            {isDeleting ? "Deleting…" : "✕ Delete"}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowReflections(true);
                          setTimeout(() => {
                            reflectionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 100);
                        }}
                        disabled={showReflections && myTypeId !== null}
                        className={[
                          "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm shrink-0",
                          showReflections && myTypeId !== null
                            ? "cursor-default"
                            : "hover:scale-105"
                        ].join(" ")}
                        style={
                          showReflections && myTypeId !== null
                            ? {
                                backgroundColor: isDefault ? "rgba(16, 185, 129, 0.2)" : "var(--theme-success)",
                                borderColor: isDefault ? "rgba(16, 185, 129, 0.4)" : "var(--theme-success)",
                                color: isDefault ? "rgba(209, 250, 229, 0.9)" : "var(--theme-text-inverse)",
                                opacity: 0.3,
                              }
                            : {
                                backgroundColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-accent)",
                                borderColor: isDefault ? "rgba(255, 255, 255, 0.2)" : "var(--theme-accent)",
                                color: isDefault ? "rgba(255, 255, 255, 0.9)" : "var(--theme-text-inverse)",
                              }
                        }
                        onMouseEnter={(e) => {
                          if (!(showReflections && myTypeId !== null)) {
                            if (!isDefault) {
                              e.currentTarget.style.opacity = "0.9";
                            } else {
                              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(showReflections && myTypeId !== null)) {
                            if (!isDefault) {
                              e.currentTarget.style.opacity = "1";
                            } else {
                              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                            }
                          }
                        }}
                        aria-label={showReflections && myTypeId !== null ? "Appreciation sent" : "Appreciate this moment"}
                      >
                        <span className="text-lg">{showReflections && myTypeId !== null ? "✓" : "✦"}</span>
                        <span className="text-xs font-semibold tracking-wide">
                          {showReflections && myTypeId !== null ? "Appreciated" : "Appreciate"}
                        </span>
                        {count > 0 && (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold min-w-[20px] text-center">
                            {count}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  <div
                    ref={storyScrollRef}
                    className="relative text-white/85 text-base leading-[1.85] font-light tracking-wide whitespace-pre-wrap max-w-full"
                    style={{
                      fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {meta.story}
                  </div>
                </div>
              ) : (
                /* If no story, show archive/delete buttons or appreciate button after details */
                <div className="mt-6 flex justify-end">
                  {showArchiveActions && onArchive && onDelete && currentMediaId ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onArchive(currentMediaId)}
                        disabled={isArchiving || isDeleting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: "var(--theme-warning)",
                          borderColor: "var(--theme-warning)",
                          color: "white",
                        }}
                        onMouseEnter={(e) => {
                          if (!isArchiving && !isDeleting) {
                            e.currentTarget.style.opacity = "0.9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        <span className="text-xs font-semibold tracking-wide">
                          {isArchiving ? "Archiving…" : "📦 Archive"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(currentMediaId)}
                        disabled={isArchiving || isDeleting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: "var(--theme-error)",
                          borderColor: "var(--theme-error)",
                          color: "white",
                        }}
                        onMouseEnter={(e) => {
                          if (!isArchiving && !isDeleting) {
                            e.currentTarget.style.opacity = "0.9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        <span className="text-xs font-semibold tracking-wide">
                          {isDeleting ? "Deleting…" : "✕ Delete"}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowReflections(true);
                        setTimeout(() => {
                          reflectionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                      }}
                      disabled={showReflections && myTypeId !== null}
                      className={[
                        "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm",
                        showReflections && myTypeId !== null
                          ? "cursor-default"
                          : "hover:scale-105"
                      ].join(" ")}
                      style={
                        showReflections && myTypeId !== null
                          ? {
                              backgroundColor: isDefault ? "rgba(16, 185, 129, 0.2)" : "var(--theme-success)",
                              borderColor: isDefault ? "rgba(16, 185, 129, 0.4)" : "var(--theme-success)",
                              color: isDefault ? "rgba(209, 250, 229, 0.9)" : "var(--theme-text-inverse)",
                              opacity: 0.3,
                            }
                          : {
                              backgroundColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-accent)",
                              borderColor: isDefault ? "rgba(255, 255, 255, 0.2)" : "var(--theme-accent)",
                              color: isDefault ? "rgba(255, 255, 255, 0.9)" : "var(--theme-text-inverse)",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!(showReflections && myTypeId !== null)) {
                          if (!isDefault) {
                            e.currentTarget.style.opacity = "0.9";
                          } else {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(showReflections && myTypeId !== null)) {
                          if (!isDefault) {
                            e.currentTarget.style.opacity = "1";
                          } else {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                          }
                        }
                      }}
                      aria-label={showReflections && myTypeId !== null ? "Appreciation sent" : "Appreciate this moment"}
                    >
                      <span className="text-lg">{showReflections && myTypeId !== null ? "✓" : "✦"}</span>
                      <span className="text-xs font-semibold tracking-wide">
                        {showReflections && myTypeId !== null ? "Appreciated" : "Appreciate"}
                      </span>
                      {count > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold min-w-[20px] text-center">
                          {count}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Always show Archive/Delete buttons or Appreciate button if no meta exists */}
          {!(meta?.location || meta?.description || meta?.tags?.length || meta?.story) && (
            <div className="px-6 pt-6 pb-6">
              <div className="flex justify-end">
                {showArchiveActions && onArchive && onDelete && currentMediaId ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onArchive(currentMediaId)}
                      disabled={isArchiving || isDeleting}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: "var(--theme-warning)",
                        borderColor: "var(--theme-warning)",
                        color: "white",
                      }}
                      onMouseEnter={(e) => {
                        if (!isArchiving && !isDeleting) {
                          e.currentTarget.style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      <span className="text-xs font-semibold tracking-wide">
                        {isArchiving ? "Archiving…" : "📦 Archive"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(currentMediaId)}
                      disabled={isArchiving || isDeleting}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: "var(--theme-error)",
                        borderColor: "var(--theme-error)",
                        color: "white",
                      }}
                      onMouseEnter={(e) => {
                        if (!isArchiving && !isDeleting) {
                          e.currentTarget.style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      <span className="text-xs font-semibold tracking-wide">
                        {isDeleting ? "Deleting…" : "✕ Delete"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReflections(true);
                      setTimeout(() => {
                        reflectionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 100);
                    }}
                    disabled={showReflections && myTypeId !== null}
                    className={[
                      "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-sm",
                      showReflections && myTypeId !== null
                        ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300/90 cursor-default"
                        : "bg-white/10 hover:bg-white/15 border-white/20 hover:border-white/30 text-white/90 hover:text-white hover:scale-105"
                    ].join(" ")}
                    aria-label={showReflections && myTypeId !== null ? "Appreciation sent" : "Appreciate this moment"}
                  >
                    <span className="text-lg">{showReflections && myTypeId !== null ? "✓" : "✦"}</span>
                    <span className="text-xs font-semibold tracking-wide">
                      {showReflections && myTypeId !== null ? "Appreciated" : "Appreciate"}
                    </span>
                    {count > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold min-w-[20px] text-center">
                        {count}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Reflections (only shown after clicking Appreciate) */}
          {showReflections && (
            <div ref={reflectionsSectionRef} className="px-6 pt-6 pb-6 border-t border-white/10 relative">
              {/* Clear, inviting CTA with gentle hint */}
              <div className="mb-6 text-center">
                <p className="text-white/95 text-[15px] font-light tracking-wide mb-1">
                  What resonated with you?
                </p>
                {count > 0 ? (
                  <p className="text-white/50 text-[11px]">
                    {count} {count === 1 ? "person has" : "people have"} appreciated this
                  </p>
                ) : (
                  <p className="text-white/40 text-[10px] italic mt-1.5">
                    There's no right way — share what feels true
                  </p>
                )}
              </div>

              {typesLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                    ))}
                  </div>
                ) : typesError ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/60 text-center">
                    {typesError}
                  </div>
                ) : types.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {types.map((t) => {
                      const selected = myTypeId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onPick(t.id)}
                          disabled={saving}
                          className={[
                            "group relative rounded-2xl px-4 py-4 flex flex-col items-center justify-center gap-2 border transition-all duration-300 text-center min-h-[100px] overflow-hidden",
                            selected
                              ? "bg-gradient-to-br from-white/20 to-white/10 text-white border-white/40 shadow-xl shadow-white/10 scale-[1.02]"
                              : "bg-white/[0.03] text-white/90 border-white/10 hover:bg-white/[0.08] hover:border-white/25 hover:scale-[1.03] active:scale-[0.98]",
                            saving ? "opacity-70 cursor-wait" : "cursor-pointer",
                          ].join(" ")}
                        >
                          {/* Darkened background for better contrast */}
                          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                          
                          {/* Emoji with gentle lift on hover */}
                          <span className={[
                            "text-4xl transition-all duration-300 relative z-10",
                            selected ? "scale-110" : "group-hover:scale-110 group-hover:-translate-y-0.5"
                          ].join(" ")}>
                            {t.emoji || "✦"}
                          </span>
                          
                          {/* Label */}
                          <div className="flex flex-col gap-0.5 relative z-10">
                            <span className="text-[13px] font-semibold tracking-wide">
                              {t.label}
                            </span>
                            <span className={[
                              "text-[10px] leading-tight transition-colors",
                              selected ? "text-white/70" : "text-white/45 group-hover:text-white/60"
                            ].join(" ")}>
                              {getDescription(t.label)}
                            </span>
                          </div>

                          {/* Softer "yours" indicator */}
                          {selected && (
                            <div className="absolute top-2 right-2 z-10">
                              <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-[8px] font-medium text-white/90 tracking-wide">
                                {getYoursLabel(t.label)}
                              </div>
                            </div>
                          )}

                          {/* Subtle glow on hover */}
                          {!selected && (
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/0 transition-all duration-300 pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/50 text-sm">
                    No reflection types available
                  </div>
                )}
                
                {!isLoggedIn() && (
                  <p className="mt-5 text-xs text-white/45 text-center">
                    Sign in to leave a reflection
                  </p>
                )}
              </div>
          )}

          {/* Section 3: Existing Reflections List - filtered or all */}
          {showReflections && (count > 0 || selectedReflectionTypeId) && (
            <div className="px-6 pt-6 pb-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold whitespace-nowrap">
                        {selectedReflectionTypeId
                          ? reflectionCountsByType[selectedReflectionTypeId]?.label || "Reflected"
                          : "People who reflected"}
                      </p>
                      {selectedReflectionTypeId && (
                        <p className="text-xs text-white/60 mt-1">
                          {items.filter((r) => r.reflection.id === selectedReflectionTypeId).length}{" "}
                          {items.filter((r) => r.reflection.id === selectedReflectionTypeId).length === 1 ? "person" : "people"}
                        </p>
                      )}
                    </div>
                    {selectedReflectionTypeId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllUsersModal(true);
                        }}
                        className="text-xs text-white/60 hover:text-white/90 underline transition shrink-0 whitespace-nowrap"
                      >
                        Show all
                      </button>
                    )}
                  </div>
                  {loadingList ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                      ))}
                    </div>
                  ) : listError ? (
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/60">
                      {listError}
                    </div>
                  ) : (() => {
                    const filteredItems = selectedReflectionTypeId
                      ? items.filter((r) => r.reflection.id === selectedReflectionTypeId)
                      : items;
                    
                    if (filteredItems.length === 0) {
                      return (
                        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-sm text-white/60 text-center">
                          {selectedReflectionTypeId
                            ? `No one has ${reflectionCountsByType[selectedReflectionTypeId]?.label?.toLowerCase() || "reflected"} yet.`
                            : "No reflections yet."}
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="space-y-2">
                          {filteredItems.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser({
                                  name: r.user.name || "Anonymous",
                                  profilePicture: r.user.profilePicture,
                                });
                              }}
                              className="w-full rounded-2xl bg-white/5 border border-white/10 px-5 py-4 flex items-center gap-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left group"
                            >
                              <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-white/20 bg-white/10 shrink-0">
                                {resolveMediaUrl(r.user.profilePicture) ? (
                                  <Image
                                    src={resolveMediaUrl(r.user.profilePicture)!}
                                    alt={r.user.name || "User"}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                ) : (
                                  <div className="h-full w-full grid place-items-center text-white/80 text-base font-bold bg-gradient-to-br from-gray-700 to-gray-800">
                                    {r.user.name?.slice(0, 1)?.toUpperCase() || "U"}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-white text-sm font-semibold">
                                  {r.user.name || "Anonymous"}
                                </p>
                                <p className="text-white/50 text-xs mt-0.5">
                                  {formatTime(r.createdAt)}
                                </p>
                              </div>
                              {!selectedReflectionTypeId && (
                                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10">
                                  <span className="text-base">{r.reflection.emoji || "✦"}</span>
                                  <span className="text-[11px] font-semibold text-white/90 whitespace-nowrap">
                                    {r.reflection.label}
                                  </span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {hasNext && !selectedReflectionTypeId && (
                          <button
                            type="button"
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="w-full mt-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 py-3 text-xs font-semibold tracking-[0.2em] uppercase disabled:opacity-50 transition"
                          >
                            {loadingMore ? "Loading…" : "Load more"}
                          </button>
                        )}
                      </>
                    );
                  })() as React.ReactNode}
            </div>
          )}

          {/* Show All Users Modal */}
          {showAllUsersModal && (
            <div
              className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md overflow-y-auto"
              onClick={() => setShowAllUsersModal(false)}
              role="dialog"
              aria-modal="true"
            >
              <div className="min-h-full flex items-start justify-center p-4 pt-24 pb-8">
                <div className="w-full max-w-3xl my-8">
                  <div
                    className="rounded-[36px] overflow-hidden border border-white/20 bg-gradient-to-br from-gray-950 via-gray-900 to-black shadow-2xl shadow-black/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative p-6 sm:p-8 md:p-10">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-6 mb-6">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 font-bold mb-2">
                            All Reflections
                          </p>
                          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            {reflectionCountsByType[selectedReflectionTypeId || ""]?.label || "People who reflected"}
                          </h3>
                          <p className="mt-2 text-white/60 text-sm">
                            {items.length} {items.length === 1 ? "person" : "people"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAllUsersModal(false)}
                          className="shrink-0 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all grid place-items-center"
                          aria-label="Close"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Users List */}
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {items.length === 0 ? (
                          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-8 text-center text-white/60 text-sm">
                            No reflections yet.
                          </div>
                        ) : (
                          items.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser({
                                  name: r.user.name || "Anonymous",
                                  profilePicture: r.user.profilePicture,
                                });
                                setShowAllUsersModal(false);
                              }}
                              className="group w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 flex items-center gap-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left"
                            >
                              <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-white/20 bg-white/10 shrink-0">
                                {resolveMediaUrl(r.user.profilePicture) ? (
                                  <Image
                                    src={resolveMediaUrl(r.user.profilePicture)!}
                                    alt={r.user.name || "User"}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                ) : (
                                  <div className="h-full w-full grid place-items-center text-white/80 text-base font-bold bg-gradient-to-br from-gray-700 to-gray-800">
                                    {r.user.name?.slice(0, 1)?.toUpperCase() || "U"}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-white text-sm font-semibold truncate">
                                  {r.user.name || "Anonymous"}
                                </p>
                                <p className="text-white/50 text-xs mt-0.5">
                                  {formatTime(r.createdAt)}
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10">
                                <span className="text-base">{r.reflection.emoji || "✦"}</span>
                                <span className="text-[10px] font-semibold text-white/90 whitespace-nowrap">
                                  {r.reflection.label}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Profile Modal */}
          {selectedUser && (
            <div
              className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedUser(null)}
              role="dialog"
              aria-modal="true"
            >
              <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="absolute -top-12 right-0 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all grid place-items-center z-10"
                  aria-label="Close"
                >
                  ✕
                </button>
                <div className="rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-gray-950 via-gray-900 to-black shadow-2xl">
                  <div className="relative aspect-square w-full">
                    {selectedUser.profilePicture && resolveMediaUrl(selectedUser.profilePicture) ? (
                      <Image
                        src={resolveMediaUrl(selectedUser.profilePicture)!}
                        alt={selectedUser.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 90vw, 400px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <div className="text-white text-6xl font-bold">
                          {selectedUser.name?.slice(0, 1)?.toUpperCase() || "U"}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-8 bg-gradient-to-b from-black/80 to-black">
                    <p className="text-white text-2xl font-bold text-center">
                      {selectedUser.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReflectionsPanel({ mediaId }: { mediaId: string | null }) {
  const [types, setTypes] = useState<ReflectionType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);

  const [count, setCount] = useState<number>(0);
  const [countLoading, setCountLoading] = useState(true);

  const [items, setItems] = useState<MediaReflectionItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [myTypeId, setMyTypeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setTypesLoading(true);
      setTypesError(null);
      try {
        const list = await listReflectionTypes();
        if (!cancelled) setTypes(list);
      } catch (e) {
        if (!cancelled) setTypesError(e instanceof Error ? e.message : "Failed to load reflection types.");
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!mediaId) return;

    const run = async () => {
      setCountLoading(true);
      setLoadingList(true);
      setListError(null);
      setMyTypeId(null);
      try {
        const [c, list] = await Promise.all([
          getMediaReflectionsCount({ mediaId }),
          listMediaReflections({ mediaId, limit: 20 }),
        ]);
        if (cancelled) return;
        setCount(typeof c.count === "number" ? c.count : 0);
        setItems(list.items || []);
        setCursor(list.pageInfo?.nextCursor ?? null);
        setHasNext(Boolean(list.pageInfo?.hasNextPage));
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : "Failed to load reflections.");
      } finally {
        if (!cancelled) {
          setCountLoading(false);
          setLoadingList(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  const loadMore = async () => {
    if (!mediaId) return;
    if (!hasNext || !cursor) return;
    setLoadingMore(true);
    setListError(null);
    try {
      const next = await listMediaReflections({ mediaId, limit: 20, cursor });
      setItems((prev) => [...prev, ...(next.items || [])]);
      setCursor(next.pageInfo?.nextCursor ?? null);
      setHasNext(Boolean(next.pageInfo?.hasNextPage));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load more reflections.");
    } finally {
      setLoadingMore(false);
    }
  };

  const onPick = async (typeId: string) => {
    if (!mediaId) return;
    if (!isLoggedIn()) {
      requestLogin();
      return;
    }
    setSaving(true);
    try {
      const res = await upsertMyMediaReflection({ mediaId, reflectionTypeId: typeId });
      setMyTypeId(typeId);
      if (res.created) setCount((c) => c + 1);
      // refresh list (so the viewer sees themselves + latest)
      const list = await listMediaReflections({ mediaId, limit: 20 });
      setItems(list.items || []);
      setCursor(list.pageInfo?.nextCursor ?? null);
      setHasNext(Boolean(list.pageInfo?.hasNextPage));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold">
            Appreciation
          </p>
          <p className="mt-2 text-white/85 text-sm leading-relaxed">
            Reflections are quiet, word‑first reactions. Choose one that fits the moment.
          </p>
        </div>
        <div className="shrink-0">
          <div className="px-3.5 py-2 rounded-2xl bg-black/30 border border-white/10 text-white/80 text-xs font-semibold tracking-wide">
            {countLoading ? "…" : `${count}`} ✦
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold">
          Leave a reflection
        </p>

        {typesLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : typesError ? (
          <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/60">
            {typesError}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {types.map((t) => {
              const selected = myTypeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onPick(t.id)}
                  disabled={saving}
                  className={[
                    "h-11 rounded-2xl px-4 flex items-center justify-between gap-3 border transition",
                    selected
                      ? "bg-white text-black border-white/20"
                      : "bg-white/5 text-white/85 border-white/10 hover:bg-white/10",
                    saving ? "opacity-70" : "",
                  ].join(" ")}
                  title={t.label}
                >
                  <span className="text-base">{t.emoji || "✦"}</span>
                  <span className="text-xs font-semibold tracking-wide truncate">{t.label}</span>
                  <span className="text-[10px] text-white/40">{selected ? "Yours" : ""}</span>
                </button>
              );
            })}
          </div>
        )}

        {!isLoggedIn() && (
          <p className="mt-3 text-xs text-white/45">
            Sign in to leave a reflection.
          </p>
        )}
      </div>

      <div className="mt-6">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold">
          People who reflected
        </p>

        {loadingList ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : listError ? (
          <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/60">
            {listError}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-sm text-white/60">
            No reflections yet. Be the first to leave a thoughtful note.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3 flex items-center gap-3"
              >
                <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                  {resolveMediaUrl(r.user.profilePicture) ? (
                    <Image
                      src={resolveMediaUrl(r.user.profilePicture)!}
                      alt={r.user.name || "User"}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-white/60 text-xs">
                      {r.user.name?.slice(0, 1)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-white/90 text-sm font-semibold truncate">
                    {r.user.name || "Anonymous"}
                  </p>
                  <p className="text-white/55 text-xs truncate">
                    {formatTime(r.createdAt)}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-base">{r.reflection.emoji || "✦"}</span>
                  <span className="text-xs font-semibold text-white/80">{r.reflection.label}</span>
                </div>
              </div>
            ))}

            {hasNext && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full mt-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 py-3 text-xs font-semibold tracking-[0.2em] uppercase disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
