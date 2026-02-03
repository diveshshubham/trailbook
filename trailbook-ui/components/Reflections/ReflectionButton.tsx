"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getReflectionCount, getReflections, type ReflectionsResponse } from "@/lib/reflectionsApi";
import ReflectionModal from "./ReflectionModal";

type ReflectionButtonProps = {
  mediaId: string;
  variant?: "badge" | "button";
  showCount?: boolean;
};

export default function ReflectionButton({
  mediaId,
  variant = "button",
  showCount = true,
}: ReflectionButtonProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [count, setCount] = useState(0);
  const [hasReflected, setHasReflected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!mediaId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res: ReflectionsResponse = await getReflections(mediaId);
        if (!cancelled) {
          setCount(res.count || 0);
          setHasReflected(res.hasReflected || false);
        }
      } catch (err) {
        console.error("Failed to load reflection count", err);
        if (!cancelled) {
          setCount(0);
          setHasReflected(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  const handleReflectionAdded = () => {
    // Optimistically update count
    setCount((prev) => prev + 1);
    setHasReflected(true);
    // Reload to get accurate data
    getReflections(mediaId).then((res) => {
      setCount(res.count || 0);
      setHasReflected(res.hasReflected || false);
    });
  };

  const handleReflectionRemoved = () => {
    // Optimistically update count
    setCount((prev) => Math.max(0, prev - 1));
    setHasReflected(false);
    // Reload to get accurate data
    getReflections(mediaId).then((res) => {
      setCount(res.count || 0);
      setHasReflected(res.hasReflected || false);
    });
  };

  if (variant === "badge") {
    return (
      <>
        {count > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full backdrop-blur-md border text-white/90 text-[11px] font-semibold tracking-wide shadow-xl shadow-black/30 transition-all hover:scale-105"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.45)",
                borderColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              ✦ {count}
            </button>
          </div>
        )}
        <ReflectionModal
          mediaId={mediaId}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onReflectionAdded={handleReflectionAdded}
          onReflectionRemoved={handleReflectionRemoved}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={loading}
        className="relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 disabled:opacity-50"
        style={{
          backgroundColor: hasReflected
            ? isDefault
              ? "rgba(249, 115, 22, 0.1)"
              : "var(--theme-accent-light)"
            : "transparent",
          borderColor: hasReflected
            ? isDefault
              ? "rgba(249, 115, 22, 0.5)"
              : "var(--theme-accent)"
            : "var(--theme-border)",
          color: hasReflected
            ? isDefault
              ? "rgb(234, 88, 12)"
              : "var(--theme-accent)"
            : "var(--theme-text-secondary)",
        }}
        onMouseEnter={(e) => {
          if (!hasReflected) {
            e.currentTarget.style.borderColor = isDefault
              ? "rgba(249, 115, 22, 0.5)"
              : "var(--theme-accent)";
            e.currentTarget.style.color = isDefault
              ? "rgb(234, 88, 12)"
              : "var(--theme-accent)";
            e.currentTarget.style.backgroundColor = isDefault
              ? "rgba(249, 115, 22, 0.05)"
              : "var(--theme-accent-light)";
          }
        }}
        onMouseLeave={(e) => {
          if (!hasReflected) {
            e.currentTarget.style.borderColor = "var(--theme-border)";
            e.currentTarget.style.color = "var(--theme-text-secondary)";
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
        title="Reflect on this moment"
      >
        <span className="text-base">💫</span>
        <span className="text-xs sm:text-sm font-semibold">Reflect</span>
        {showCount && count > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-accent)",
              color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-text-inverse)",
            }}
          >
            {count}
          </span>
        )}
      </button>
      <ReflectionModal
        mediaId={mediaId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onReflectionAdded={handleReflectionAdded}
        onReflectionRemoved={handleReflectionRemoved}
      />
    </>
  );
}
