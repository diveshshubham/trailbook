"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeKey } from "@/lib/themes";

export default function ThemeSelector() {
  const { currentTheme, themeKey, availableThemes, setTheme, isLoading } = useTheme();

  if (isLoading || availableThemes.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-[var(--theme-border)]">
      <p className="text-xs uppercase tracking-widest text-[var(--theme-text-tertiary)] font-semibold mb-3">
        Theme
      </p>
      <div className="grid grid-cols-2 gap-2">
        {availableThemes.map((theme) => {
          const isActive = themeKey === theme.key;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setTheme(theme.key as ThemeKey)}
              className={[
                "relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                "border-2",
                isActive
                  ? "border-[var(--theme-accent)] bg-[var(--theme-accent-light)] text-[var(--theme-accent)]"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-primary)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)]",
              ].join(" ")}
            >
              {theme.name}
              {isActive && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
