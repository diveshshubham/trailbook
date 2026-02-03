"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  addReflection,
  removeReflection,
  getReflections,
  type Reflection,
  type ReflectionReason,
  type ReflectionsResponse,
} from "@/lib/reflectionsApi";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import { ApiError } from "@/lib/api";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";

type ReflectionModalProps = {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
  onReflectionAdded?: () => void;
  onReflectionRemoved?: () => void;
};

const REASONS: Array<{ value: ReflectionReason; label: string; icon: string; description: string }> = [
  { value: "composition", label: "Composition", icon: "🎨", description: "Visual artistry" },
  { value: "moment", label: "Moment", icon: "⏰", description: "Captured time" },
  { value: "emotion", label: "Emotion", icon: "💫", description: "Feeling evoked" },
  { value: "story", label: "Story", icon: "📖", description: "Narrative depth" },
];

export default function ReflectionModal({
  mediaId,
  isOpen,
  onClose,
  onReflectionAdded,
  onReflectionRemoved,
}: ReflectionModalProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [hasReflected, setHasReflected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<ReflectionReason | null>(null);
  const [note, setNote] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Load reflections when modal opens
  useEffect(() => {
    if (!isOpen || !mediaId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res: ReflectionsResponse = await getReflections(mediaId);
        if (!cancelled) {
          setReflections(res.reflections || []);
          setHasReflected(res.hasReflected || false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load reflections", err);
          setError("Failed to load reflections");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mediaId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedReason(null);
      setNote("");
      setIsAnonymous(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError("Please select a reason");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addReflection(mediaId, {
        reason: selectedReason,
        note: note.trim() || undefined,
        isAnonymous,
      });

      // Reload reflections
      const res = await getReflections(mediaId);
      setReflections(res.reflections || []);
      setHasReflected(true);
      setSelectedReason(null);
      setNote("");
      setIsAnonymous(false);
      onReflectionAdded?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError("Too many reflections. Please wait before reflecting on more content.");
        } else if (err.status === 400) {
          setError(err.message || "Invalid input. Please check your reflection.");
        } else {
          setError(err.message || "Failed to add reflection");
        }
      } else {
        setError("Failed to add reflection. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await removeReflection(mediaId);
      const res = await getReflections(mediaId);
      setReflections(res.reflections || []);
      setHasReflected(false);
      onReflectionRemoved?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to remove reflection");
      } else {
        setError("Failed to remove reflection. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start justify-center p-4 pt-16 sm:pt-24 pb-8">
        <div className="w-full max-w-2xl my-8">
          <div
            className="rounded-[32px] overflow-hidden border shadow-2xl transition-colors duration-300"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-surface)",
              boxShadow: "0 20px 25px -5px var(--theme-shadow-strong), 0 10px 10px -5px var(--theme-shadow)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b flex items-center justify-between transition-colors duration-300"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="h-8 w-8 rounded-xl border flex items-center justify-center"
                    style={{
                      backgroundColor: isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-accent-light)",
                      borderColor: isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)",
                    }}
                  >
                    <span className="text-base">💫</span>
                  </div>
                  <p
                    className="text-[10px] uppercase tracking-[0.4em] font-bold"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  >
                    Reflections
                  </p>
                </div>
                <h3
                  className="text-xl sm:text-2xl font-bold tracking-tight"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  Share your reflection
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
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
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-6 sm:px-8 py-6 space-y-6 overflow-auto max-h-[calc(100vh-300px)]">
              {error && (
                <div
                  className="rounded-2xl px-4 py-3 text-sm border transition-colors duration-300"
                  style={{
                    backgroundColor: isDefault ? "rgb(255, 247, 237)" : "var(--theme-error-light)",
                    color: isDefault ? "rgb(154, 52, 18)" : "var(--theme-error)",
                    borderColor: isDefault ? "rgb(254, 215, 170)" : "var(--theme-error)",
                  }}
                >
                  {error}
                </div>
              )}

              {hasReflected ? (
                <div
                  className="rounded-2xl border p-6 transition-colors duration-300"
                  style={{
                    borderColor: isDefault ? "rgba(249, 115, 22, 0.3)" : "var(--theme-accent)",
                    backgroundColor: isDefault ? "rgba(249, 115, 22, 0.05)" : "var(--theme-accent-light)",
                  }}
                >
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)" }}
                  >
                    You've already reflected on this
                  </p>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={submitting}
                    className="rounded-full px-4 py-2 text-xs font-semibold border transition disabled:opacity-50"
                    style={{
                      backgroundColor: "transparent",
                      borderColor: isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)",
                      color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting) {
                        e.currentTarget.style.backgroundColor = isDefault
                          ? "rgba(249, 115, 22, 0.1)"
                          : "var(--theme-accent-light)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Remove reflection
                  </button>
                </div>
              ) : (
                <>
                  {/* Reason Selector */}
                  <div>
                    <label
                      className="block text-[10px] uppercase tracking-[0.35em] font-semibold mb-3"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      Why does this resonate?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {REASONS.map((reason) => (
                        <button
                          key={reason.value}
                          type="button"
                          onClick={() => setSelectedReason(reason.value)}
                          className={`rounded-2xl border-2 p-4 transition-all duration-200 text-left ${
                            selectedReason === reason.value ? "scale-105" : ""
                          }`}
                          style={{
                            borderColor:
                              selectedReason === reason.value
                                ? isDefault
                                  ? "rgba(249, 115, 22, 0.5)"
                                  : "var(--theme-accent)"
                                : "var(--theme-border)",
                            backgroundColor:
                              selectedReason === reason.value
                                ? isDefault
                                  ? "rgba(249, 115, 22, 0.1)"
                                  : "var(--theme-accent-light)"
                                : "var(--theme-surface)",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedReason !== reason.value) {
                              e.currentTarget.style.borderColor = isDefault
                                ? "rgba(249, 115, 22, 0.3)"
                                : "var(--theme-accent)";
                              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedReason !== reason.value) {
                              e.currentTarget.style.borderColor = "var(--theme-border)";
                              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                            }
                          }}
                        >
                          <div className="text-2xl mb-2">{reason.icon}</div>
                          <p
                            className="text-xs font-bold mb-1"
                            style={{
                              color:
                                selectedReason === reason.value
                                  ? isDefault
                                    ? "rgb(234, 88, 12)"
                                    : "var(--theme-accent)"
                                  : "var(--theme-text-primary)",
                            }}
                          >
                            {reason.label}
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: "var(--theme-text-tertiary)" }}
                          >
                            {reason.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note Input */}
                  <div>
                    <label
                      className="block text-[10px] uppercase tracking-[0.35em] font-semibold mb-2"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      Add a note (optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => {
                        if (e.target.value.length <= 50) {
                          setNote(e.target.value);
                        }
                      }}
                      placeholder="What moved you about this moment?"
                      rows={3}
                      className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none transition-colors duration-300"
                      style={{
                        borderColor: "var(--theme-border)",
                        backgroundColor: "var(--theme-surface)",
                        color: "var(--theme-text-primary)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = isDefault
                          ? "rgba(249, 115, 22, 0.5)"
                          : "var(--theme-accent)";
                        e.currentTarget.style.boxShadow = isDefault
                          ? "0 0 0 2px rgba(249, 115, 22, 0.2)"
                          : "0 0 0 2px var(--theme-accent-light)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--theme-border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <p
                      className="text-[10px] mt-1 text-right"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {note.length}/50
                    </p>
                  </div>

                  {/* Anonymous Toggle */}
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
                        Share anonymously
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
                        Your reflection will be visible but your name won't
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className="h-9 w-16 rounded-full border transition relative"
                      style={{
                        backgroundColor: isAnonymous
                          ? isDefault
                            ? "rgba(249, 115, 22, 0.9)"
                            : "var(--theme-accent)"
                          : "var(--theme-surface-hover)",
                        borderColor: isAnonymous
                          ? isDefault
                            ? "rgba(249, 115, 22, 0.2)"
                            : "var(--theme-accent)"
                          : "var(--theme-border)",
                      }}
                      aria-label="Toggle anonymous"
                    >
                      <span
                        className="absolute top-1 h-7 w-7 rounded-full shadow-sm transition-all"
                        style={{
                          backgroundColor: "var(--theme-surface)",
                          left: isAnonymous ? "32px" : "4px",
                        }}
                      />
                    </button>
                  </div>
                </>
              )}

              {/* Reflections List */}
              {reflections.length > 0 && (
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.35em] font-semibold mb-3"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  >
                    All Reflections ({reflections.length})
                  </p>
                  <div className="space-y-3">
                    {reflections.map((reflection) => {
                      const userProfilePicture = reflection.user?.profilePicture
                        ? resolveProfilePictureUrl(reflection.user.profilePicture)
                        : null;
                      const userName = reflection.isAnonymous
                        ? "Anonymous"
                        : reflection.user?.name || "Someone";

                      return (
                        <div
                          key={reflection.id}
                          className="rounded-2xl border p-4 transition-colors duration-300"
                          style={{
                            borderColor: "var(--theme-border)",
                            backgroundColor: "var(--theme-surface-elevated)",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {!reflection.isAnonymous ? (
                              reflection.user?._id ? (
                                <ClickableUserAvatar
                                  userId={reflection.user._id}
                                  profilePicture={reflection.user.profilePicture}
                                  name={userName}
                                  size="md"
                                />
                              ) : userProfilePicture ? (
                                <img
                                  src={userProfilePicture}
                                  alt={userName}
                                  className="w-10 h-10 rounded-full object-cover border cursor-pointer hover:ring-2 hover:ring-[var(--theme-accent)]/40 transition-all"
                                  style={{ borderColor: "var(--theme-border)" }}
                                  onClick={() => {
                                    if (reflection.userId) {
                                      window.location.href = `/users/${reflection.userId}/public`;
                                    }
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center border"
                                  style={{
                                    borderColor: "var(--theme-border)",
                                    backgroundColor: "var(--theme-surface)",
                                  }}
                                >
                                  <span className="text-lg">👤</span>
                                </div>
                              )
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center border"
                                style={{
                                  borderColor: "var(--theme-border)",
                                  backgroundColor: "var(--theme-surface)",
                                }}
                              >
                                <span className="text-lg">👤</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p
                                  className="text-sm font-semibold"
                                  style={{ color: "var(--theme-text-primary)" }}
                                >
                                  {userName}
                                </p>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: isDefault
                                      ? "rgba(249, 115, 22, 0.1)"
                                      : "var(--theme-accent-light)",
                                    color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                                  }}
                                >
                                  {REASONS.find((r) => r.value === reflection.reason)?.label}
                                </span>
                              </div>
                              {reflection.note && (
                                <p
                                  className="text-sm mb-2"
                                  style={{ color: "var(--theme-text-secondary)" }}
                                >
                                  {reflection.note}
                                </p>
                              )}
                              <p
                                className="text-[10px]"
                                style={{ color: "var(--theme-text-tertiary)" }}
                              >
                                {new Date(reflection.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!hasReflected && (
              <div
                className="px-6 sm:px-8 py-6 border-t flex items-center justify-end gap-3 transition-colors duration-300"
                style={{ borderColor: "var(--theme-border)" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold border transition"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                    e.currentTarget.style.color = "var(--theme-text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--theme-text-secondary)";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedReason || submitting}
                  className="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isDefault
                      ? "linear-gradient(to right, #f97316, #ec4899)"
                      : "var(--theme-gradient-primary)",
                    boxShadow: isDefault
                      ? "0 10px 15px -3px rgba(249, 115, 22, 0.2), 0 4px 6px -2px rgba(249, 115, 22, 0.1)"
                      : "0 10px 15px -3px var(--theme-shadow-strong), 0 4px 6px -2px var(--theme-shadow)",
                  }}
                >
                  {submitting ? "Reflecting..." : "Share Reflection"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
