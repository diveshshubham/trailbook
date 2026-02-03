"use client";

import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

export default function UserHero({
  name,
  albumsCount,
  photosCount,
  onCreate,
  lastAlbumDate,
  mostActiveAlbum,
  mostActiveAlbumId,
}: {
  name: string;
  albumsCount: number;
  photosCount: number;
  onCreate: () => void;
  lastAlbumDate?: string;
  mostActiveAlbum?: string;
  mostActiveAlbumId?: string;
}) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-theme transition-all duration-300 hover:shadow-theme-xl">
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
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--theme-text-tertiary)] font-semibold">
            Your Studio
          </p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-[var(--theme-text-primary)] break-words" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
            {name}
          </h1>
          <p className="text-[var(--theme-text-secondary)] mt-3 max-w-2xl leading-relaxed">
            Your personal space to collect journeys, moments, and stories worth remembering.
          </p>

          <div className="mt-7 flex items-center gap-8 text-sm text-[var(--theme-text-secondary)]">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--theme-text-tertiary)]">Chapters</p>
              <p className="text-lg font-semibold text-[var(--theme-text-primary)]">{albumsCount}</p>
            </div>
            <div className="h-8 w-px bg-[var(--theme-border)]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--theme-text-tertiary)]">Moments</p>
              <p className="text-lg font-semibold text-[var(--theme-text-primary)]">{photosCount}</p>
            </div>
          </div>
          
          {/* Emotional hook */}
          {(lastAlbumDate || mostActiveAlbum) && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--theme-border)" }}>
              {lastAlbumDate && (
                <p className="text-xs text-[var(--theme-text-tertiary)]">
                  Last memory added: <span className="font-medium text-[var(--theme-text-secondary)]">{lastAlbumDate}</span>
                </p>
              )}
              {mostActiveAlbum && (
                <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">
                  Most active chapter: {mostActiveAlbumId ? (
                    <Link 
                      href={`/album/${mostActiveAlbumId}`}
                      className="font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] transition-colors duration-200 underline decoration-dotted underline-offset-2 hover:decoration-solid"
                    >
                      {mostActiveAlbum}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--theme-text-secondary)]">{mostActiveAlbum}</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreate}
            className="rounded-full px-5 py-2.5 text-sm font-medium border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ 
              backgroundColor: "var(--theme-surface-hover)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-text-primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
              e.currentTarget.style.borderColor = "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.borderColor = "var(--theme-border)";
            }}
          >
            + New chapter
          </button>
        </div>
      </div>
    </section>
  );
}
  