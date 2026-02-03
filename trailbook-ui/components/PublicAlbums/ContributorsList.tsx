"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getAlbumContributors, removeContributor, type AlbumContributor } from "@/lib/publicAlbumsApi";
import { getMyProfile } from "@/lib/userApi";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
import { resolveProfilePictureUrl } from "@/lib/userApi";

type ContributorsListProps = {
  albumId: string;
  albumOwnerId?: string;
  canManage?: boolean;
};

export default function ContributorsList({ albumId, albumOwnerId, canManage = false }: ContributorsListProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [contributors, setContributors] = useState<AlbumContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadContributors();
    loadCurrentUser();
  }, [albumId]);

  const loadContributors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAlbumContributors(albumId);
      setContributors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contributors");
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const me = await getMyProfile();
      setCurrentUserId(me.user._id);
    } catch {
      // Ignore
    }
  };

  const handleRemove = async (contributorId: string) => {
    if (!confirm("Are you sure you want to remove this contributor?")) return;

    setRemovingId(contributorId);
    try {
      await removeContributor(albumId, contributorId);
      await loadContributors();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove contributor");
    } finally {
      setRemovingId(null);
    }
  };

  const canRemove = (contributor: AlbumContributor) => {
    if (!canManage) return false;
    if (contributor.userId === albumOwnerId) return false; // Can't remove owner
    if (contributor.userId === currentUserId) return false; // Can't remove self
    return true;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl border animate-pulse" style={{ backgroundColor: "var(--theme-surface-hover)", borderColor: "var(--theme-border)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl text-sm" style={{ backgroundColor: "var(--theme-error-light)", color: "var(--theme-error)" }}>
        {error}
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
          No contributors yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contributors.map((contributor) => {
        const isOwner = contributor.userId === albumOwnerId;
        const canRemoveContributor = canRemove(contributor);
        const permissionColor =
          contributor.permission === "admin"
            ? isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)"
            : contributor.permission === "contributor"
            ? isDefault ? "rgb(59, 130, 246)" : "var(--theme-info)"
            : "var(--theme-text-tertiary)";

        return (
          <div
            key={contributor.userId}
            className="group flex items-center gap-3 p-3 rounded-2xl border transition-all"
            style={{
              backgroundColor: "var(--theme-surface-hover)",
              borderColor: "var(--theme-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
            }}
          >
            <ClickableUserAvatar
              userId={contributor.userId}
              profilePicture={contributor.profilePicture}
              name={contributor.fullName}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--theme-text-primary)" }}>
                  {contributor.fullName || "Unknown"}
                </p>
                {isOwner && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase" style={{ backgroundColor: "var(--theme-accent-light)", color: "var(--theme-accent)" }}>
                    Owner
                  </span>
                )}
                {!isOwner && contributor.permission && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                    style={{ backgroundColor: `${permissionColor}20`, color: permissionColor }}
                  >
                    {contributor.permission}
                  </span>
                )}
              </div>
              {contributor.bio && (
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                  {contributor.bio}
                </p>
              )}
              {contributor.contributionCount !== undefined && (
                <p className="text-xs mt-1" style={{ color: "var(--theme-text-tertiary)" }}>
                  {contributor.contributionCount} {contributor.contributionCount === 1 ? "contribution" : "contributions"}
                </p>
              )}
            </div>
            {canRemoveContributor && (
              <button
                type="button"
                onClick={() => handleRemove(contributor.userId)}
                disabled={removingId === contributor.userId}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                style={{
                  backgroundColor: "var(--theme-error-light)",
                  color: "var(--theme-error)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-error)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-error-light)";
                  e.currentTarget.style.color = "var(--theme-error)";
                }}
                title="Remove contributor"
              >
                {removingId === contributor.userId ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
