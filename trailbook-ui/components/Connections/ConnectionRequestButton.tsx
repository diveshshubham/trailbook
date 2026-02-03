"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  sendConnectionRequest,
  getConnectedPeople,
  getPendingRequests,
  type ConnectedUser,
  type ConnectionRequest,
} from "@/lib/connectionsApi";
import { getMyProfile } from "@/lib/userApi";
import { ApiError } from "@/lib/api";

type ConnectionRequestButtonProps = {
  userId: string;
  className?: string;
};

export default function ConnectionRequestButton({
  userId,
  className = "",
}: ConnectionRequestButtonProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [status, setStatus] = useState<"idle" | "connected" | "pending" | "loading">("idle");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    getMyProfile()
      .then((profile) => {
        setCurrentUserId(profile.user._id);
      })
      .catch((err) => {
        console.warn("Failed to get current user profile", err);
      });
  }, []);

  useEffect(() => {
    if (!currentUserId || !userId || currentUserId === userId) {
      return;
    }

    checkConnectionStatus();
  }, [currentUserId, userId]);

  const checkConnectionStatus = async () => {
    try {
      const [connected, pending] = await Promise.all([
        getConnectedPeople(),
        getPendingRequests(),
      ]);

      // Check for connected users - support both old and new API formats
      const isConnected = connected.some((conn) => {
        // New API format: has userId field
        if (conn.userId) {
          return conn.userId === userId;
        }
        // Also check user object
        if (conn.user?.userId) {
          return conn.user.userId === userId;
        }
        // Old API format: has _id or id
        return (conn._id || conn.id) === userId;
      });
      
      // Check for pending requests - support both old and new API formats
      const hasPending = pending.some((req) => {
        // New API format: has userId field
        if (req.userId) {
          return req.userId === userId;
        }
        // Old API format: has senderId/receiverId
        if (req.senderId || req.receiverId) {
          return (
            (req.senderId === userId && req.receiverId === currentUserId) ||
            (req.receiverId === userId && req.senderId === currentUserId)
          );
        }
        // Also check user object
        if (req.user?.userId) {
          return req.user.userId === userId;
        }
        return false;
      });

      if (isConnected) {
        setStatus("connected");
      } else if (hasPending) {
        setStatus("pending");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error("Failed to check connection status", err);
    }
  };

  const handleSendRequest = async () => {
    if (status !== "idle" || !userId) return;

    try {
      setStatus("loading");
      await sendConnectionRequest(userId);
      setStatus("pending");
    } catch (err) {
      console.error("Failed to send connection request", err);
      alert(err instanceof ApiError ? err.message : "Failed to send connection request");
      setStatus("idle");
    }
  };

  // Don't show button if it's the current user
  if (!currentUserId || currentUserId === userId) {
    return null;
  }

  if (status === "connected") {
    return (
      <button
        onClick={() => {
          window.location.href = `/chat/${userId}`;
        }}
        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${className}`}
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
    );
  }

  if (status === "pending") {
    return (
      <button
        disabled
        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 opacity-60 ${className}`}
        style={{
          backgroundColor: "var(--theme-surface-hover)",
          color: "var(--theme-text-secondary)",
          border: "1px solid var(--theme-border)",
        }}
      >
        Request Sent
      </button>
    );
  }

  return (
    <button
      onClick={handleSendRequest}
      disabled={status === "loading"}
      className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${className}`}
      style={{
        background: isDefault
          ? "linear-gradient(to right, #f97316, #ec4899)"
          : "var(--theme-gradient-primary)",
        color: "white",
      }}
      onMouseEnter={(e) => {
        if (!e.currentTarget.disabled) {
          e.currentTarget.style.transform = "scale(1.02)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {status === "loading" ? "Sending..." : "🔗 Connect"}
    </button>
  );
}
