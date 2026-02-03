"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  checkEligibility,
  createConnection,
  getConnectionWith,
  removeConnection,
  type EligibilityResponse,
} from "@/lib/trailConnectionsApi";
import { ApiError } from "@/lib/api";

type WalkedTogetherButtonProps = {
  userId: string;
  onConnectionCreated?: () => void;
  onConnectionRemoved?: () => void;
};

export default function WalkedTogetherButton({
  userId,
  onConnectionCreated,
  onConnectionRemoved,
}: WalkedTogetherButtonProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [eligible, setEligible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityData, setEligibilityData] = useState<EligibilityResponse | null>(null);

  // Check eligibility and connection status
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const check = async () => {
      setLoading(true);
      try {
        // Check if already connected
        const connection = await getConnectionWith(userId);
        if (!cancelled) {
          setConnected(!!connection);
          if (!connection) {
            // Check eligibility
            const eligibility = await checkEligibility(userId);
            if (!cancelled) {
              setEligible(eligibility.eligible || false);
              setEligibilityData(eligibility);
            }
          } else {
            setEligible(false);
          }
        }
      } catch (err) {
        console.error("Failed to check connection status", err);
        if (!cancelled) {
          setEligible(false);
          setConnected(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleConnect = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await createConnection(userId);
      setConnected(true);
      setEligible(false);
      onConnectionCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setError("Connection not eligible: No mutual album favorites");
        } else {
          setError(err.message || "Failed to create connection");
        }
      } else {
        setError("Failed to create connection. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await removeConnection(userId);
      setConnected(false);
      // Re-check eligibility
      const eligibility = await checkEligibility(userId);
      setEligible(eligibility.eligible || false);
      setEligibilityData(eligibility);
      onConnectionRemoved?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to remove connection");
      } else {
        setError("Failed to remove connection. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-9 w-32 rounded-full bg-gray-200 animate-pulse" />
    );
  }

  if (!eligible && !connected) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p
          className="text-xs"
          style={{ color: "var(--theme-error)" }}
        >
          {error}
        </p>
      )}
      {connected ? (
        <button
          type="button"
          onClick={handleDisconnect}
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
          {submitting ? "Removing..." : "✓ Walked Together"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={submitting}
          className="rounded-full px-4 py-2 text-xs font-semibold border transition disabled:opacity-50"
          style={{
            backgroundColor: isDefault ? "rgba(249, 115, 22, 0.1)" : "var(--theme-accent-light)",
            borderColor: isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)",
            color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
          }}
          onMouseEnter={(e) => {
            if (!submitting) {
              e.currentTarget.style.backgroundColor = isDefault
                ? "rgba(249, 115, 22, 0.2)"
                : "var(--theme-accent)";
              e.currentTarget.style.color = "white";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDefault
              ? "rgba(249, 115, 22, 0.1)"
              : "var(--theme-accent-light)";
            e.currentTarget.style.color = isDefault
              ? "rgb(234, 88, 12)"
              : "var(--theme-accent)";
          }}
          title={
            eligibilityData?.mutualAlbums.length
              ? `${eligibilityData.mutualAlbums.length} mutual albums, ${eligibilityData.reflectionCount} reflections`
              : "Add to Walked Together"
          }
        >
          {submitting ? "Connecting..." : "+ Walked Together"}
        </button>
      )}
    </div>
  );
}
