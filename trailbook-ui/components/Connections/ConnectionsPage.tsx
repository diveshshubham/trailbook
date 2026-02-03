"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getConnectedPeople,
  getPendingRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  sendConnectionRequest,
  type ConnectionRequest,
  type ConnectedUser,
} from "@/lib/connectionsApi";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
import { ApiError } from "@/lib/api";
import Image from "next/image";

type TabType = "connected" | "pending" | "requests";

export default function ConnectionsPage() {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [activeTab, setActiveTab] = useState<TabType>("connected");
  const [connected, setConnected] = useState<ConnectedUser[]>([]);
  const [pending, setPending] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "connected") {
        const data = await getConnectedPeople();
        setConnected(data);
      } else if (activeTab === "pending") {
        const data = await getPendingRequests();
        setPending(data);
      }
    } catch (err) {
      console.error("Failed to load connections", err);
      setError("Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await acceptConnectionRequest(requestId);
      await loadData();
    } catch (err) {
      console.error("Failed to accept request", err);
      alert(err instanceof ApiError ? err.message : "Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await rejectConnectionRequest(requestId);
      await loadData();
    } catch (err) {
      console.error("Failed to reject request", err);
      alert(err instanceof ApiError ? err.message : "Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--theme-background)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Premium Header */}
        <div className="mb-8">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r bg-clip-text"
            style={{
              backgroundImage: isDefault
                ? "linear-gradient(to right, rgb(234, 88, 12), rgb(236, 72, 153))"
                : "var(--theme-gradient-primary)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Connections
          </h1>
          <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            Connect with trailblazers and share your stories
          </p>
        </div>

        {/* Premium Tabs */}
        <div className="mb-8">
          <div
            className="inline-flex rounded-2xl p-1 border backdrop-blur-xl"
            style={{
              backgroundColor: "var(--theme-surface-elevated)",
              borderColor: "var(--theme-border)",
            }}
          >
            {[
              { id: "connected" as TabType, label: "Connected", count: connected.length },
              { id: "pending" as TabType, label: "Requests", count: pending.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id ? "shadow-lg" : ""
                }`}
                style={{
                  backgroundColor:
                    activeTab === tab.id
                      ? isDefault
                        ? "rgba(249, 115, 22, 0.15)"
                        : "var(--theme-accent-light)"
                      : "transparent",
                  color:
                    activeTab === tab.id
                      ? isDefault
                        ? "rgb(234, 88, 12)"
                        : "var(--theme-accent)"
                      : "var(--theme-text-secondary)",
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor:
                        activeTab === tab.id
                          ? isDefault
                            ? "rgba(249, 115, 22, 0.2)"
                            : "var(--theme-accent)"
                          : "var(--theme-surface-hover)",
                      color: activeTab === tab.id ? "inherit" : "var(--theme-text-tertiary)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-current border-t-transparent mb-4" />
              <p style={{ color: "var(--theme-text-secondary)" }}>Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div
            className="rounded-2xl border p-6 text-center"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-surface-elevated)",
            }}
          >
            <p style={{ color: "var(--theme-error)" }}>{error}</p>
          </div>
        ) : activeTab === "connected" ? (
          <ConnectedList users={connected} />
        ) : (
          <PendingRequestsList
            requests={pending}
            onAccept={handleAccept}
            onReject={handleReject}
            processingId={processingId}
          />
        )}
      </div>
    </main>
  );
}

function ConnectedList({ users }: { users: ConnectedUser[] }) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  if (users.length === 0) {
    return (
      <div
        className="rounded-3xl border p-12 text-center"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-surface-elevated)",
        }}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 opacity-60"
          style={{
            backgroundColor: isDefault ? "rgba(249, 115, 22, 0.08)" : "var(--theme-accent-light)",
          }}
        >
          <span className="text-4xl">👥</span>
        </div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--theme-text-primary)" }}>
          No connections yet
        </h3>
        <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
          Start connecting with trailblazers to share stories
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((connection) => {
        // Support both old API format (direct user fields) and new API format (user object)
        const userData = connection.user || connection;
        const userId = connection.userId || userData.userId || connection._id || connection.id || "";
        const userName = userData.fullName || userData.name || "Unknown";
        const profilePicture = userData.profilePicture
          ? resolveProfilePictureUrl(userData.profilePicture)
          : null;
        const userBio = userData.bio;
        const connectionKey = connection.requestId || connection._id || connection.id || userId;

        return (
          <div
            key={connectionKey}
            className="group relative rounded-3xl border overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-surface-elevated)",
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
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                {userId ? (
                  <ClickableUserAvatar
                    userId={userId}
                    profilePicture={userData.profilePicture}
                    name={userName}
                    size="lg"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl overflow-hidden border-2"
                    style={{
                      borderColor: "var(--theme-border)",
                      backgroundColor: "var(--theme-surface)",
                    }}
                  >
                    {profilePicture ? (
                      <Image
                        src={profilePicture}
                        alt={userName}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-2xl font-bold"
                        style={{
                          backgroundColor: isDefault ? "rgba(249, 115, 22, 0.1)" : "var(--theme-accent-light)",
                          color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                        }}
                      >
                        {userName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-lg font-bold truncate"
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    {userName}
                  </h3>
                  {userData.email && (
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {userData.email}
                    </p>
                  )}
                  {userBio && (
                    <p
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {userBio}
                    </p>
                  )}
                  {connection.connectedAt && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      Connected {new Date(connection.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (userId) {
                    window.location.href = `/chat/${userId}`;
                  }
                }}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
                style={{
                  background: isDefault
                    ? "linear-gradient(to right, rgba(249, 115, 22, 0.1), rgba(236, 72, 153, 0.1))"
                    : "var(--theme-gradient-secondary)",
                  color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                  border: `1px solid ${isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-accent-light)"}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = isDefault
                    ? "0 4px 12px rgba(249, 115, 22, 0.2)"
                    : "0 4px 12px var(--theme-shadow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                💬 Message
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PendingRequestsList({
  requests,
  onAccept,
  onReject,
  processingId,
}: {
  requests: ConnectionRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  processingId: string | null;
}) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  if (requests.length === 0) {
    return (
      <div
        className="rounded-3xl border p-12 text-center"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-surface-elevated)",
        }}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 opacity-60"
          style={{
            backgroundColor: isDefault ? "rgba(249, 115, 22, 0.08)" : "var(--theme-accent-light)",
          }}
        >
          <span className="text-4xl">📬</span>
        </div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--theme-text-primary)" }}>
          No pending requests
        </h3>
        <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
          You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        // Support both old API format (sender) and new API format (user)
        const user = request.user || request.sender;
        const userId = request.userId || user?.userId || user?._id || user?.id || "";
        const userName = user?.fullName || user?.name || "Unknown";
        const profilePicture = user?.profilePicture
          ? resolveProfilePictureUrl(user.profilePicture)
          : null;
        const requestId = request.requestId || request._id || request.id || "";
        const isProcessing = processingId === requestId;

        return (
          <div
            key={requestId}
            className="group rounded-3xl border p-6 transition-all duration-300 hover:shadow-lg"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-surface-elevated)",
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
            <div className="flex items-center gap-4">
              {userId ? (
                <ClickableUserAvatar
                  userId={userId}
                  profilePicture={user?.profilePicture}
                  name={userName}
                  size="md"
                />
              ) : (
                <div className="h-12 w-12 rounded-2xl overflow-hidden border-2 shrink-0"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: "var(--theme-surface)",
                  }}
                >
                  {profilePicture ? (
                    <Image
                      src={profilePicture}
                      alt={userName}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xl font-bold"
                      style={{
                        backgroundColor: isDefault ? "rgba(249, 115, 22, 0.1)" : "var(--theme-accent-light)",
                        color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                      }}
                    >
                      {userName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-semibold truncate"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  {userName}
                </h3>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  {request.isReceived ? "Wants to connect with you" : "Connection request"}
                </p>
                {user?.bio && (
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {user.bio}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAccept(requestId)}
                  disabled={isProcessing || !requestId}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: isDefault
                      ? "linear-gradient(to right, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))"
                      : "var(--theme-success-light)",
                    color: isDefault ? "rgb(5, 150, 105)" : "var(--theme-success)",
                    border: `1px solid ${isDefault ? "rgba(16, 185, 129, 0.2)" : "var(--theme-success)"}`,
                  }}
                >
                  {isProcessing ? "..." : "Accept"}
                </button>
                <button
                  onClick={() => onReject(requestId)}
                  disabled={isProcessing || !requestId}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    color: "var(--theme-text-secondary)",
                    border: "1px solid var(--theme-border)",
                  }}
                >
                  {isProcessing ? "..." : "Decline"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
