"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { getConversations, getUnreadCount, type Conversation } from "@/lib/connectionsApi";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
import Image from "next/image";

export default function ConversationsList() {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversations();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const [convos, unread] = await Promise.all([
        getConversations(),
        getUnreadCount(),
      ]);
      setConversations(convos);
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString(undefined, { weekday: "short" });
    } else {
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-current border-t-transparent mb-4" />
          <p style={{ color: "var(--theme-text-secondary)" }}>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
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
          <span className="text-4xl">💬</span>
        </div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--theme-text-primary)" }}>
          No conversations yet
        </h3>
        <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
          Start a conversation with your connections
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const userId = conv.userId;
        const userName = conv.user?.fullName || conv.user?.name || "Unknown";
        const profilePicture = conv.user?.profilePicture
          ? resolveProfilePictureUrl(conv.user.profilePicture)
          : null;
        const lastMessage = conv.lastMessage;
        const hasUnread = conv.unreadCount > 0;

        return (
          <div
            key={userId}
            onClick={() => router.push(`/chat/${userId}`)}
            className="group relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
            style={{
              borderColor: hasUnread
                ? (isDefault ? "rgba(249, 115, 22, 0.3)" : "var(--theme-accent-light)")
                : "var(--theme-border)",
              backgroundColor: hasUnread
                ? (isDefault ? "rgba(249, 115, 22, 0.05)" : "var(--theme-accent-light)")
                : "var(--theme-surface-elevated)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = isDefault
                ? "rgba(249, 115, 22, 0.5)"
                : "var(--theme-accent)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = isDefault
                ? "0 8px 16px rgba(249, 115, 22, 0.1)"
                : "0 8px 16px var(--theme-shadow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = hasUnread
                ? (isDefault ? "rgba(249, 115, 22, 0.3)" : "var(--theme-accent-light)")
                : "var(--theme-border)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="flex items-center gap-3">
              {userId ? (
                <ClickableUserAvatar
                  userId={userId}
                  profilePicture={conv.user?.profilePicture}
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
                    <div className="h-full w-full grid place-items-center text-lg font-bold"
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
                <div className="flex items-center justify-between mb-1">
                  <h3
                    className={`text-base font-semibold truncate ${
                      hasUnread ? "font-bold" : ""
                    }`}
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    {userName}
                  </h3>
                  {lastMessage && (
                    <span
                      className="text-xs shrink-0 ml-2"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {formatTime(lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {lastMessage && (
                  <p
                    className={`text-sm truncate ${
                      hasUnread ? "font-medium" : ""
                    }`}
                    style={{
                      color: hasUnread
                        ? "var(--theme-text-primary)"
                        : "var(--theme-text-secondary)",
                    }}
                  >
                    {lastMessage.content}
                  </p>
                )}
              </div>
              {hasUnread && (
                <div
                  className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: isDefault
                      ? "linear-gradient(to right, #f97316, #ec4899)"
                      : "var(--theme-gradient-primary)",
                  }}
                >
                  {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
