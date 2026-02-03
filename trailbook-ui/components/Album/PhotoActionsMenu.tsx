"use client";

import { useState } from "react";
import { archiveMedia, deleteMedia, restoreMedia, deleteS3Object } from "@/lib/trailbookApi";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

type PhotoActionsMenuProps = {
  mediaId?: string;
  albumId?: string;
  s3Key?: string;
  isArchived?: boolean;
  isStoryImage?: boolean;
  onActionComplete?: () => void;
};

export default function PhotoActionsMenu({
  mediaId,
  albumId,
  s3Key,
  isArchived = false,
  isStoryImage = false,
  onActionComplete,
}: PhotoActionsMenuProps) {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    if (!mediaId) return;
    try {
      setLoading(true);
      setError(null);
      await archiveMedia(mediaId);
      setShowArchiveConfirm(false);
      setShowMenu(false);
      if (onActionComplete) {
        onActionComplete();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to archive photo:", err);
      setError("Failed to archive photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!mediaId) return;
    try {
      setLoading(true);
      setError(null);
      await restoreMedia(mediaId);
      setShowMenu(false);
      if (onActionComplete) {
        onActionComplete();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to restore photo:", err);
      setError("Failed to restore photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isStoryImage && s3Key && albumId) {
        // Delete story-only S3 image
        await deleteS3Object({ albumId, key: s3Key });
      } else if (mediaId) {
        // Delete regular media
        await deleteMedia(mediaId);
      } else {
        throw new Error("Missing required parameters for deletion");
      }
      
      setShowDeleteConfirm(false);
      setShowMenu(false);
      if (onActionComplete) {
        onActionComplete();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete photo:", err);
      setError("Failed to delete photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mediaId && !isStoryImage) return null;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{
            backgroundColor: showMenu ? "var(--theme-surface-elevated)" : "rgba(255, 255, 255, 0.9)",
            color: showMenu ? "var(--theme-text-secondary)" : "#333",
            backdropFilter: "blur(12px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
            e.currentTarget.style.color = "var(--theme-accent)";
          }}
          onMouseLeave={(e) => {
            if (!showMenu) {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.color = "#333";
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-lg border z-50 overflow-hidden"
              style={{
                backgroundColor: "var(--theme-surface-elevated)",
                borderColor: "var(--theme-border)",
              }}
            >
              {isArchived && mediaId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(false);
                    handleRestore();
                  }}
                  disabled={loading}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors disabled:opacity-50"
                  style={{
                    color: "var(--theme-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                      e.currentTarget.style.color = "var(--theme-accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--theme-text-secondary)";
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                  <span className="text-sm font-medium">Restore Photo</span>
                </button>
              ) : mediaId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(false);
                    setShowArchiveConfirm(true);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors"
                  style={{
                    color: "var(--theme-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                    e.currentTarget.style.color = "var(--theme-accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--theme-text-secondary)";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  <span className="text-sm font-medium">Archive Photo</span>
                </button>
              ) : null}
              <div className="h-px" style={{ backgroundColor: "var(--theme-border)" }} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors"
                style={{
                  color: "var(--theme-error)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                <span className="text-sm font-medium">Delete Permanently</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowArchiveConfirm(false)}
        >
          <div
            className="max-w-md w-full rounded-2xl p-6 shadow-xl"
            style={{
              backgroundColor: "var(--theme-surface-elevated)",
              borderColor: "var(--theme-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: "var(--theme-text-primary)" }}
            >
              Archive Photo?
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              This photo will be hidden from the album but kept in storage. You can restore it anytime.
            </p>
            {error && (
              <p className="text-sm mb-4" style={{ color: "var(--theme-error)" }}>
                {error}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowArchiveConfirm(false);
                  setError(null);
                }}
                disabled={loading}
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
                onClick={handleArchive}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{
                  background: isDefault
                    ? "linear-gradient(to right, #f97316, #ec4899)"
                    : "var(--theme-gradient-primary)",
                }}
              >
                {loading ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowDeleteConfirm(false)}
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
              Delete Photo Permanently?
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              {isStoryImage
                ? "This will permanently delete the image from storage. This action cannot be undone."
                : "This action cannot be undone. The photo will be permanently deleted from the album and storage."}
            </p>
            {error && (
              <p className="text-sm mb-4" style={{ color: "var(--theme-error)" }}>
                {error}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setError(null);
                }}
                disabled={loading}
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
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--theme-error)",
                }}
              >
                {loading ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
