"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getWalkedTogether, removeConnection, type TrailConnection } from "@/lib/trailConnectionsApi";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import Link from "next/link";
import Image from "next/image";

export default function WalkedTogetherList() {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [connections, setConnections] = useState<TrailConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getWalkedTogether();
        if (!cancelled) {
          setConnections(data);
        }
      } catch (err) {
        console.error("Failed to load connections", err);
        if (!cancelled) {
          setError("Failed to load connections");
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

  const handleRemove = async (userId: string) => {
    try {
      await removeConnection(userId);
      setConnections((prev) => prev.filter((c) => c.connectedUserId !== userId && c.userId !== userId));
    } catch (err) {
      console.error("Failed to remove connection", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl px-4 py-3 text-sm border"
        style={{
          borderColor: "var(--theme-error)",
          backgroundColor: "var(--theme-error-light)",
          color: "var(--theme-error)",
        }}
      >
        {error}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 opacity-60"
          style={{
            backgroundColor: isDefault ? "rgba(249, 115, 22, 0.1)" : "var(--theme-accent-light)",
          }}
        >
          <span className="text-3xl">👥</span>
        </div>
        <p
          className="text-sm font-light"
          style={{ color: "var(--theme-text-secondary)" }}
        >
          No trail connections yet
        </p>
        <p
          className="text-xs mt-2"
          style={{ color: "var(--theme-text-tertiary)" }}
        >
          Connect with people you've shared trails with
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => {
        // Determine which user to show (the other user in the connection)
        const otherUser = connection.connectedUser || connection.user;
        const userId = otherUser?._id || connection.connectedUserId || connection.userId;
        const userName = otherUser?.name || "Unknown";
        const profilePicture = otherUser?.profilePicture
          ? resolveProfilePictureUrl(otherUser.profilePicture)
          : null;

        return (
          <div
            key={connection.id}
            className="rounded-2xl border p-4 transition-all duration-300 hover:shadow-lg"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-surface)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = isDefault
                ? "rgba(249, 115, 22, 0.5)"
                : "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--theme-border)";
            }}
          >
            <div className="flex items-start gap-4">
              <Link
                href={`/users/${userId}/public`}
                className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 shrink-0 transition-transform hover:scale-110"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface-elevated)",
                }}
              >
                {profilePicture ? (
                  <Image
                    src={profilePicture}
                    alt={userName}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div
                    className="h-full w-full grid place-items-center text-lg font-bold"
                    style={{
                      backgroundColor: isDefault ? "rgba(249, 115, 22, 0.1)" : "var(--theme-accent-light)",
                      color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                    }}
                  >
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/users/${userId}/public`}
                  className="block"
                >
                  <p
                    className="text-sm font-bold truncate mb-1"
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    {userName}
                  </p>
                </Link>

                <div className="flex items-center gap-4 text-xs mb-2"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  {connection.mutualAlbums.length > 0 && (
                    <span>{connection.mutualAlbums.length} mutual albums</span>
                  )}
                  {connection.reflectionCount > 0 && (
                    <span>{connection.reflectionCount} reflections</span>
                  )}
                </div>

                {connection.mutualAlbums.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {connection.mutualAlbums.slice(0, 3).map((album) => {
                      const coverUrl = resolveMediaUrl(
                        album.coverImage || ""
                      );
                      return (
                        <Link
                          key={album._id}
                          href={`/album/${album._id}`}
                          className="relative h-12 w-12 rounded-xl overflow-hidden border shrink-0 transition-transform hover:scale-110"
                          style={{
                            borderColor: "var(--theme-border)",
                            backgroundColor: "var(--theme-surface-elevated)",
                          }}
                        >
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={album.title || "Album"}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div
                              className="h-full w-full grid place-items-center text-xs"
                              style={{ color: "var(--theme-text-tertiary)" }}
                            >
                              📖
                            </div>
                          )}
                        </Link>
                      );
                    })}
                    {connection.mutualAlbums.length > 3 && (
                      <div
                        className="h-12 w-12 rounded-xl border flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{
                          borderColor: "var(--theme-border)",
                          backgroundColor: "var(--theme-surface-elevated)",
                          color: "var(--theme-text-tertiary)",
                        }}
                      >
                        +{connection.mutualAlbums.length - 3}
                      </div>
                    )}
                  </div>
                )}

                <p
                  className="text-[10px] mt-2"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Connected {new Date(connection.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(userId)}
                className="h-8 w-8 rounded-full grid place-items-center transition hover:bg-red-50"
                style={{ color: "var(--theme-text-tertiary)" }}
                title="Remove connection"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
