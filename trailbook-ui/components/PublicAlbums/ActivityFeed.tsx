"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getAlbumActivity, type AlbumActivity } from "@/lib/publicAlbumsApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
import Image from "next/image";

type ActivityFeedProps = {
  albumId: string;
  limit?: number;
};

function formatActivityTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(type: AlbumActivity["activityType"]): string {
  switch (type) {
    case "media_added":
      return "📸";
    case "contributor_added":
      return "👤";
    case "contributor_removed":
      return "➖";
    case "album_updated":
      return "✏️";
    case "invitation_sent":
      return "📨";
    case "invitation_accepted":
      return "✅";
    default:
      return "•";
  }
}

function getActivityDescription(activity: AlbumActivity): string {
  const userName = activity.user?.profile?.fullName || activity.user?.email || "Someone";
  
  switch (activity.activityType) {
    case "media_added":
      return `${userName} added a photo`;
    case "contributor_added":
      return `${userName} joined as contributor`;
    case "contributor_removed":
      return `${userName} was removed`;
    case "album_updated":
      return `${userName} updated the album`;
    case "invitation_sent":
      return `Invitation sent to ${userName}`;
    case "invitation_accepted":
      return `${userName} accepted the invitation`;
    default:
      return activity.description || "Activity";
  }
}

export default function ActivityFeed({ albumId, limit = 20 }: ActivityFeedProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [activities, setActivities] = useState<AlbumActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [albumId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAlbumActivity(albumId);
      setActivities(data.slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-10 w-10 rounded-full animate-pulse" style={{ backgroundColor: "var(--theme-surface-hover)" }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ backgroundColor: "var(--theme-surface-hover)" }} />
              <div className="h-3 w-1/2 rounded animate-pulse" style={{ backgroundColor: "var(--theme-surface-hover)" }} />
            </div>
          </div>
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

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3 opacity-50">📭</div>
        <p className="text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
          No activity yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const user = activity.user;
        const userId = user?._id || "";
        const userName = user?.profile?.fullName || user?.email || "Unknown";
        const profilePicture = user?.profile?.profilePicture;
        const mediaUrl = activity.media ? resolveMediaUrl(activity.media.key) : null;

        return (
          <div
            key={activity._id}
            className="flex gap-3 p-4 rounded-2xl border transition-all"
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
            {/* Activity Icon */}
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: "var(--theme-surface)" }}>
              {getActivityIcon(activity.activityType)}
            </div>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {userId ? (
                    <div className="flex items-center gap-2 mb-1">
                      <ClickableUserAvatar
                        userId={userId}
                        profilePicture={profilePicture}
                        name={userName}
                        size="sm"
                      />
                      <p className="text-sm font-medium" style={{ color: "var(--theme-text-primary)" }}>
                        {userName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--theme-text-primary)" }}>
                      {userName}
                    </p>
                  )}
                  <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                    {getActivityDescription(activity)}
                  </p>
                  {activity.media?.title && (
                    <p className="text-xs mt-1 italic" style={{ color: "var(--theme-text-tertiary)" }}>
                      "{activity.media.title}"
                    </p>
                  )}
                </div>

                {/* Media Preview */}
                {mediaUrl && (
                  <div className="h-16 w-16 rounded-xl overflow-hidden border shrink-0" style={{ borderColor: "var(--theme-border)" }}>
                    <Image
                      src={mediaUrl}
                      alt={activity.media?.title || "Media"}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Time */}
              <p className="text-xs mt-2" style={{ color: "var(--theme-text-tertiary)" }}>
                {formatActivityTime(activity.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
