"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { inviteToAlbum, type AlbumInvitation } from "@/lib/publicAlbumsApi";
import { getMyProfile } from "@/lib/userApi";
import { getConnectedPeople, type ConnectedUser } from "@/lib/connectionsApi";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
import { resolveProfilePictureUrl } from "@/lib/userApi";

type InviteModalProps = {
  albumId: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
};

type InviteMethod = "user" | "email" | "phone";

export default function InviteModal({ albumId, isOpen, onClose, onInviteSent }: InviteModalProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("user");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [permission, setPermission] = useState<"contributor" | "viewer" | "admin">("contributor");
  const [autoConnect, setAutoConnect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load connected users when modal opens
  useEffect(() => {
    if (isOpen && inviteMethod === "user") {
      loadConnectedUsers();
    }
  }, [isOpen, inviteMethod]);

  const loadConnectedUsers = async () => {
    try {
      setLoadingUsers(true);
      const users = await getConnectedPeople();
      setConnectedUsers(users);
    } catch (err) {
      console.error("Failed to load connected users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInvite = async () => {
    if (inviteMethod === "user" && !selectedUserId) {
      setError("Please select a user");
      return;
    }
    if (inviteMethod === "email" && !email.trim()) {
      setError("Please enter an email address");
      return;
    }
    if (inviteMethod === "phone" && !phone.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await inviteToAlbum({
        albumId,
        userId: inviteMethod === "user" ? selectedUserId || undefined : undefined,
        email: inviteMethod === "email" ? email.trim() : undefined,
        phone: inviteMethod === "phone" ? phone.trim() : undefined,
        permission,
        autoConnect,
      });

      onInviteSent();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteMethod("user");
    setSelectedUserId(null);
    setEmail("");
    setPhone("");
    setPermission("contributor");
    setAutoConnect(true);
    setError(null);
    setSearchQuery("");
    onClose();
  };

  const filteredUsers = connectedUsers.filter((user) => {
    const userObj = user.user || user;
    const name = userObj.fullName || userObj.name || "";
    const email = userObj.email || "";
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="min-h-full flex items-center justify-center p-4 py-12">
        <div
          className="w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            backgroundColor: "var(--theme-surface)",
            borderColor: "var(--theme-border)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 py-5 border-b flex items-center justify-between"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <h2
              id="invite-modal-title"
              className="text-xl font-bold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              Invite to Album
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
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
          <div className="p-6 space-y-6">
            {/* Invite Method Tabs */}
            <div className="flex gap-2 p-1 rounded-2xl border" style={{ backgroundColor: "var(--theme-surface-hover)", borderColor: "var(--theme-border)" }}>
              <button
                type="button"
                onClick={() => {
                  setInviteMethod("user");
                  loadConnectedUsers();
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  inviteMethod === "user"
                    ? "shadow-sm"
                    : ""
                }`}
                style={{
                  backgroundColor: inviteMethod === "user" ? "var(--theme-surface)" : "transparent",
                  color: inviteMethod === "user" ? "var(--theme-text-primary)" : "var(--theme-text-secondary)",
                }}
              >
                From Connections
              </button>
              <button
                type="button"
                onClick={() => setInviteMethod("email")}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  inviteMethod === "email"
                    ? "shadow-sm"
                    : ""
                }`}
                style={{
                  backgroundColor: inviteMethod === "email" ? "var(--theme-surface)" : "transparent",
                  color: inviteMethod === "email" ? "var(--theme-text-primary)" : "var(--theme-text-secondary)",
                }}
              >
                By Email
              </button>
              <button
                type="button"
                onClick={() => setInviteMethod("phone")}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  inviteMethod === "phone"
                    ? "shadow-sm"
                    : ""
                }`}
                style={{
                  backgroundColor: inviteMethod === "phone" ? "var(--theme-surface)" : "transparent",
                  color: inviteMethod === "phone" ? "var(--theme-text-primary)" : "var(--theme-text-secondary)",
                }}
              >
                By Phone
              </button>
            </div>

            {/* Invite Method Content */}
            {inviteMethod === "user" && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-border)";
                  }}
                />
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {loadingUsers ? (
                    <div className="text-center py-8 text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
                      Loading connections...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
                      No connections found
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const userObj = user.user || user;
                      const userId = (userObj as { userId?: string; _id?: string; id?: string }).userId || 
                                    (userObj as { userId?: string; _id?: string; id?: string })._id || 
                                    (userObj as { userId?: string; _id?: string; id?: string }).id || "";
                      const userName = userObj.fullName || userObj.name || "Unknown";
                      const profilePicture = userObj.profilePicture;
                      const isSelected = selectedUserId === userId;
                      const userBio = (userObj as { bio?: string }).bio;

                      return (
                        <button
                          key={userId}
                          type="button"
                          onClick={() => setSelectedUserId(userId)}
                          className={`w-full p-4 rounded-2xl border transition-all text-left ${
                            isSelected ? "ring-2" : ""
                          }`}
                          style={{
                            backgroundColor: isSelected ? "var(--theme-accent-light)" : "var(--theme-surface-hover)",
                            borderColor: isSelected ? "var(--theme-accent)" : "var(--theme-border)",
                            boxShadow: isSelected ? "0 0 0 2px var(--theme-accent)" : "none",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <ClickableUserAvatar
                              userId={userId}
                              profilePicture={profilePicture}
                              name={userName}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: "var(--theme-text-primary)" }}>
                                {userName}
                              </p>
                              {userBio && (
                                <p className="text-xs truncate mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                                  {userBio}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--theme-accent)" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {inviteMethod === "email" && (
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--theme-text-primary)" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-border)";
                  }}
                />
                <p className="mt-2 text-xs" style={{ color: "var(--theme-text-tertiary)" }}>
                  They'll receive an invitation and can join when they sign up
                </p>
              </div>
            )}

            {inviteMethod === "phone" && (
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--theme-text-primary)" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-border)";
                  }}
                />
                <p className="mt-2 text-xs" style={{ color: "var(--theme-text-tertiary)" }}>
                  They'll receive an invitation and can join when they sign up
                </p>
              </div>
            )}

            {/* Permission Selector */}
            <div>
              <label className="block mb-3 text-sm font-medium" style={{ color: "var(--theme-text-primary)" }}>
                Permission Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["contributor", "viewer", "admin"] as const).map((perm) => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => setPermission(perm)}
                    className={`p-4 rounded-2xl border transition-all text-left ${
                      permission === perm ? "ring-2" : ""
                    }`}
                    style={{
                      backgroundColor: permission === perm ? "var(--theme-accent-light)" : "var(--theme-surface-hover)",
                      borderColor: permission === perm ? "var(--theme-accent)" : "var(--theme-border)",
                      boxShadow: permission === perm ? "0 0 0 2px var(--theme-accent)" : "none",
                    }}
                  >
                    <p className="text-sm font-semibold capitalize mb-1" style={{ color: "var(--theme-text-primary)" }}>
                      {perm}
                    </p>
                    <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                      {perm === "contributor"
                        ? "Can add photos"
                        : perm === "viewer"
                        ? "View only"
                        : "Full control"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Connect Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ backgroundColor: "var(--theme-surface-hover)", borderColor: "var(--theme-border)" }}>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1" style={{ color: "var(--theme-text-primary)" }}>
                  Auto-connect
                </p>
                <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  Automatically create a connection when they accept
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoConnect(!autoConnect)}
                className={`relative h-7 w-12 rounded-full transition-all ${
                  autoConnect ? "" : ""
                }`}
                style={{
                  backgroundColor: autoConnect ? "var(--theme-accent)" : "var(--theme-border)",
                }}
                aria-label="Toggle auto-connect"
              >
                <div
                  className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform shadow-sm"
                  style={{
                    transform: autoConnect ? "translateX(20px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl text-sm" style={{ backgroundColor: "var(--theme-error-light)", color: "var(--theme-error)" }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 rounded-2xl border text-sm font-medium transition-all"
                style={{
                  backgroundColor: "var(--theme-surface-hover)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{
                  background: "var(--theme-gradient-primary)",
                }}
              >
                {loading ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
