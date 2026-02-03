"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { themes, type ThemeKey } from "@/lib/themes";
import Link from "next/link";

export default function ThemesPageClient() {
  const { themeKey, availableThemes, setTheme, isLoading } = useTheme();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--theme-background)]">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <p className="text-[var(--theme-text-secondary)]">Loading themes…</p>
        </div>
      </main>
    );
  }

  // Only show Default and Fresh for now
  const visibleThemes = availableThemes.filter((t) => t.key === "default" || t.key === "fresh");

  return (
    <main className="min-h-screen bg-[var(--theme-background)] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition mb-6"
          >
            <span>←</span>
            <span>Back</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--theme-text-primary)]">
            Themes
          </h1>
          <p className="mt-2 text-[var(--theme-text-secondary)]">
            Choose a theme that matches your style. More themes coming soon.
          </p>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleThemes.map((themeData) => {
            const theme = themes[themeData.key as ThemeKey];
            const isActive = themeKey === themeData.key;
            const isDefault = themeData.key === "default";

            return (
              <button
                key={themeData.id}
                type="button"
                onClick={() => setTheme(themeData.key as ThemeKey)}
                className={[
                  "relative group text-left rounded-3xl border-2 overflow-hidden transition-all duration-300",
                  isActive
                    ? "border-[var(--theme-accent)] shadow-theme-lg scale-[1.02]"
                    : "border-[var(--theme-border)] hover:border-[var(--theme-border-strong)] hover:shadow-theme-md",
                ].join(" ")}
              >
                {/* Preview Card */}
                <div
                  className="p-8 space-y-6"
                  style={{
                    backgroundColor: theme.colors.background,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {/* Preview Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                        {theme.name}
                      </h3>
                      {isDefault && (
                        <p className="text-sm mt-1" style={{ color: theme.colors.textTertiary }}>
                          Original design
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.colors.accent }}
                      >
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Preview Content */}
                  <div
                    className="rounded-2xl p-6 space-y-4"
                    style={{
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                    }}
                  >
                    {/* Sample Card */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: theme.colors.surfaceElevated,
                        border: `1px solid ${theme.colors.borderSubtle}`,
                      }}
                    >
                      <div
                        className="h-3 rounded mb-2"
                        style={{
                          width: "60%",
                          backgroundColor: theme.colors.textPrimary,
                          opacity: 0.3,
                        }}
                      />
                      <div
                        className="h-2 rounded"
                        style={{
                          width: "40%",
                          backgroundColor: theme.colors.textSecondary,
                          opacity: 0.2,
                        }}
                      />
                    </div>

                    {/* Sample Button */}
                    <div
                      className="rounded-full px-4 py-2 inline-block"
                      style={{
                        background: theme.colors.gradientPrimary,
                        color: theme.colors.textInverse,
                      }}
                    >
                      <span className="text-sm font-semibold">Sample Button</span>
                    </div>

                    {/* Color Palette Preview */}
                    <div className="flex gap-2 mt-4">
                      <div
                        className="w-8 h-8 rounded-full border"
                        style={{
                          backgroundColor: theme.colors.accent,
                          borderColor: theme.colors.border,
                        }}
                      />
                      <div
                        className="w-8 h-8 rounded-full border"
                        style={{
                          backgroundColor: theme.colors.success,
                          borderColor: theme.colors.border,
                        }}
                      />
                      <div
                        className="w-8 h-8 rounded-full border"
                        style={{
                          backgroundColor: theme.colors.info,
                          borderColor: theme.colors.border,
                        }}
                      />
                    </div>

                    {/* Background Pattern Preview (for Fresh theme) */}
                    {themeData.key === "fresh" && (
                      <div
                        className="mt-4 h-16 rounded-lg relative overflow-hidden"
                        style={{
                          backgroundColor: theme.colors.background,
                          backgroundImage: "radial-gradient(rgba(14, 165, 233, 0.03) 1px, transparent 1px)",
                          backgroundSize: "20px 20px",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs" style={{ color: theme.colors.textTertiary }}>
                            Fresh background
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Indicator Overlay */}
                {isActive && (
                  <div className="absolute top-4 right-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        backgroundColor: theme.colors.accent,
                        color: theme.colors.textInverse,
                      }}
                    >
                      <span className="text-sm">✓</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-10 p-6 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
          <p className="text-sm text-[var(--theme-text-secondary)]">
            <strong className="text-[var(--theme-text-primary)]">Note:</strong> Theme changes apply
            immediately. Your preference is saved when you're logged in.
          </p>
        </div>
      </div>
    </main>
  );
}
