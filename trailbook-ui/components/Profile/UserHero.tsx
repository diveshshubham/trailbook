"use client";

import { useTheme } from "@/contexts/ThemeContext";

export default function UserHero({
  name,
  albumsCount,
  photosCount,
  onCreate,
}: {
  name: string;
  albumsCount: number;
  photosCount: number;
  onCreate: () => void;
}) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-theme transition-all duration-300">
      {/* Background gradient - theme-aware */}
      {isDefault ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: "var(--theme-gradient-secondary)" }}
          />
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl"
            style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl"
            style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
          />
        </>
      )}

      <div className="relative px-8 py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--theme-text-tertiary)] font-semibold">
            Your Studio
          </p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-[var(--theme-text-primary)]">
            {name}
          </h1>
          <p className="text-[var(--theme-text-secondary)] mt-3 max-w-2xl leading-relaxed">
            Your personal space to collect journeys, moments, and stories worth remembering.
          </p>

          <div className="mt-7 flex items-center gap-8 text-sm text-[var(--theme-text-secondary)]">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--theme-text-tertiary)]">Albums</p>
              <p className="text-lg font-semibold text-[var(--theme-text-primary)]">{albumsCount}</p>
            </div>
            <div className="h-8 w-px bg-[var(--theme-border)]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--theme-text-tertiary)]">Photos</p>
              <p className="text-lg font-semibold text-[var(--theme-text-primary)]">{photosCount}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreate}
            className="rounded-full px-7 py-3 text-white font-semibold shadow-theme-lg hover:opacity-95 active:scale-95 transition"
            style={{ background: "var(--theme-gradient-primary)" }}
          >
            Create new album
          </button>
        </div>
      </div>
    </section>
  );
}
  