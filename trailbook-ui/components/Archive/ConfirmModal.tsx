"use client";

import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "default" | "warning" | "error" | "success";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const confirmButtonStyle = {
    default: {
      background: isDefault 
        ? "linear-gradient(to right, #f97316, #ec4899)" 
        : "var(--theme-gradient-primary)",
      color: "var(--theme-text-inverse)",
    },
    warning: {
      backgroundColor: "var(--theme-warning)",
      color: "white",
    },
    error: {
      backgroundColor: "var(--theme-error)",
      color: "white",
    },
    success: {
      backgroundColor: "var(--theme-success)",
      color: "white",
    },
  }[confirmColor];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      {/* Premium backdrop with blur */}
      <div className="absolute inset-0 bg-[#050B17]/75 backdrop-blur-md" />

      {/* Premium modal card */}
      <div className="relative w-full max-w-md rounded-3xl sm:rounded-[32px] overflow-hidden border shadow-2xl shadow-black/40 transition-all duration-300"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-backdrop)",
        }}
      >
        {/* Gradient aura effects */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />

        {/* Content */}
        <div className="relative p-4 sm:p-5 md:p-8">
          {/* Icon and Title */}
          <div className="flex items-start gap-2.5 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
            <div className="shrink-0 h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl grid place-items-center"
              style={{
                backgroundColor: confirmColor === "error" 
                  ? "var(--theme-error)" 
                  : confirmColor === "warning"
                  ? "var(--theme-warning)"
                  : "var(--theme-accent)",
                opacity: 0.15,
              }}
            >
              <span className="text-lg sm:text-xl md:text-2xl">
                {confirmColor === "error" ? "⚠️" : confirmColor === "warning" ? "📦" : "ℹ️"}
              </span>
            </div>
            <div className="flex-1 min-w-0 pr-1 sm:pr-2">
              <p 
                className="text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.35em] font-semibold"
                style={{ color: "var(--theme-text-tertiary)" }}
              >
                Confirmation
              </p>
              <h3 
                id="confirm-title"
                className="mt-1 sm:mt-1.5 md:mt-2 text-base sm:text-lg md:text-xl font-bold tracking-tight leading-tight"
                style={{ color: "var(--theme-text-primary)" }}
              >
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full transition grid place-items-center text-xs sm:text-sm md:text-base"
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
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Message */}
          <p 
            id="confirm-message"
            className="text-xs sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 md:mb-8"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full px-4 py-2.5 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm font-semibold transition border order-2 sm:order-1"
              style={{
                backgroundColor: "var(--theme-surface)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-full px-4 py-2.5 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm font-semibold transition shadow-lg hover:shadow-xl order-1 sm:order-2"
              style={confirmButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
