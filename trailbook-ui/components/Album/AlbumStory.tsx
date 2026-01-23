"use client";

import { useState } from "react";
import { regenerateAlbumStory } from "@/lib/trailbookApi";
import { usePublicAlbumGate } from "@/components/Share/PublicAlbumGate";
import { useTheme } from "@/contexts/ThemeContext";

type AlbumStoryProps = {
  albumId?: string;
  initialStory?: string;
};

function truncateStory(raw: string, maxChars: number) {
  const s = (raw || "").trim();
  if (!s) return "No story yet.";
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

export default function AlbumStory({
  albumId,
  initialStory = "No story yet.",
}: AlbumStoryProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  const gate = usePublicAlbumGate();
  const locked = gate?.locked === true;

  const [story, setStory] = useState(initialStory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readMode, setReadMode] = useState(false);
  const [fontSize, setFontSize] = useState(20);

  const canRegenerate = Boolean(albumId);
  const previewChars = 650;
  const effectiveStory = locked ? truncateStory(story, previewChars) : story;
  const isTruncated = locked && story.trim().length > effectiveStory.trim().length;

  return (
    <section className="max-w-[75ch] mx-auto px-6 py-16 md:py-20">
      <div 
        className="rounded-2xl p-10 md:p-16 shadow-sm border transition-colors duration-300"
        style={{
          backgroundColor: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
        }}
      >
        <div className="mb-12 flex items-center justify-between">
          <h3 
            className="text-xl md:text-2xl font-light tracking-[0.2em] mb-1"
            style={{ color: "var(--theme-text-tertiary)" }}
          >
            The Story
          </h3>
          {effectiveStory && effectiveStory !== "No story yet." && (
            <button
              type="button"
              onClick={() => setReadMode(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: "var(--theme-surface-hover)",
                color: "var(--theme-text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                e.currentTarget.style.color = "var(--theme-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                e.currentTarget.style.color = "var(--theme-text-secondary)";
              }}
              title="Enter reading mode"
              aria-label="Enter reading mode"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">Read Story</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <article className="space-y-8">
          {effectiveStory
            .split(/\n\s*\n/)
            .filter(p => p.trim().length > 0)
            .map((paragraph, index, paragraphs) => {
              const trimmed = paragraph.trim();
              const isDayHeader = /^Day \d+/.test(trimmed);
              const isFirstParagraph = index === 0 && !isDayHeader;
              const showContinueHint = isFirstParagraph && !locked && paragraphs.length > 1;
              
              if (isDayHeader) {
                const parts = trimmed.split(' - ');
                const dayPart = parts[0];
                const subtitlePart = parts.slice(1).join(' - ');
                
                return (
                  <div key={index} className="pt-8 first:pt-0">
                    <div className="mb-6">
                      <h4 className="text-sm md:text-base font-normal text-gray-500 tracking-wide mb-2">
                        {dayPart}
                      </h4>
                      {subtitlePart && (
                        <p 
                          className="text-lg md:text-xl font-light leading-relaxed"
                          style={{ color: "var(--theme-text-primary)" }}
                        >
                          {subtitlePart}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={index}>
                  <p 
                    className={`antialiased ${isFirstParagraph ? 'text-[20px] md:text-[22px] leading-[2.1] font-extralight' : 'text-[17px] md:text-[18px] leading-[1.95] font-light'}`}
                    style={{
                      fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                      letterSpacing: isFirstParagraph ? "0em" : "-0.01em",
                      color: "var(--theme-text-secondary)",
                    }}
                  >
                    {trimmed.split('\n').filter(line => line.trim()).map((line, lineIndex, lines) => (
                      <span key={lineIndex}>
                        {line.trim()}
                        {lineIndex < lines.length - 1 && <><br /><br /></>}
                      </span>
                    ))}
                  </p>
                  
                  {/* Subtle "Continue reading ↓" hint after first paragraph */}
                  {showContinueHint && (
                    <div className="mt-8 flex items-center justify-center">
                      <p 
                        className="text-xs font-light tracking-wider uppercase flex items-center gap-2 opacity-60"
                        style={{ color: "var(--theme-text-tertiary)" }}
                      >
                        <span>Continue reading</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
        </article>

        {isTruncated && (
          <div 
            className="mt-16 pt-12 border-t"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <div className="text-center">
              <p 
                className="text-sm font-light tracking-wide mb-3"
                style={{ color: "var(--theme-text-tertiary)" }}
              >
                Continue reading
              </p>
              <p 
                className="font-light text-sm mb-6 leading-relaxed max-w-md mx-auto"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Sign up to read the full story and revisit this chapter anytime.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("tb:open-auth"))}
                className="rounded-full px-8 py-3 text-sm font-normal text-white shadow-md hover:shadow-lg transition-all duration-200 hover:opacity-90"
                style={{
                  background: isDefault 
                    ? "linear-gradient(to right, #f97316, #ec4899)" 
                    : "var(--theme-gradient-primary)",
                }}
              >
                Login / Sign up
              </button>
            </div>
          </div>
        )}

        {error && (
          <div 
            className="mt-8 pt-8 border-t"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <p 
              className="text-sm font-light"
              style={{ color: "var(--theme-error)" }}
            >
              {error}
            </p>
          </div>
        )}

        {canRegenerate && !locked && (
          <div 
            className="mt-12 pt-8 border-t"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <button
              disabled={loading}
              onClick={async () => {
                if (!albumId) return;
                try {
                  setLoading(true);
                  setError(null);
                  const res = await regenerateAlbumStory(albumId);
                  setStory(res.story);
                } catch {
                  setError("Couldn't regenerate story. Please try again.");
                } finally {
                  setLoading(false);
                }
              }}
              className="text-xs font-light tracking-wide transition-colors disabled:opacity-40"
              style={{
                color: "var(--theme-text-tertiary)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.color = "var(--theme-text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.color = "var(--theme-text-tertiary)";
                }
              }}
            >
              {loading ? "Regenerating…" : "Regenerate story"}
            </button>
          </div>
        )}
      </div>

      {/* Premium Reading Mode */}
      {readMode && (
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto"
          style={{ backgroundColor: "var(--theme-background)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReadMode(false);
          }}
        >
          {/* Header Bar */}
          <div
            className="sticky top-0 z-10 backdrop-blur-xl border-b transition-colors duration-300"
            style={{
              backgroundColor: "var(--theme-backdrop)",
              borderColor: "var(--theme-border)",
            }}
          >
            <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReadMode(false)}
                  className="h-10 w-10 rounded-full transition-all flex items-center justify-center"
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
                  aria-label="Exit reading mode"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
                <p
                  className="text-xs uppercase tracking-widest font-semibold"
                  style={{ color: "var(--theme-text-tertiary)" }}
                >
                  Reading Mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFontSize(prev => Math.min(prev + 2, 28))}
                  disabled={fontSize >= 28}
                  className="h-9 w-9 rounded-lg transition-all flex items-center justify-center disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    color: fontSize >= 28 ? "var(--theme-text-tertiary)" : "var(--theme-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (fontSize < 28) {
                      e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                      e.currentTarget.style.color = "var(--theme-accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (fontSize < 28) {
                      e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                      e.currentTarget.style.color = "var(--theme-text-secondary)";
                    }
                  }}
                  title="Increase font size"
                  aria-label="Increase font size"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10" />
                    <path d="M12 20V10" />
                    <path d="M6 20V4" />
                    <path d="M18 14h-4" />
                    <path d="M12 14H8" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize(prev => Math.max(prev - 2, 16))}
                  disabled={fontSize <= 16}
                  className="h-9 w-9 rounded-lg transition-all flex items-center justify-center disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    color: fontSize <= 16 ? "var(--theme-text-tertiary)" : "var(--theme-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (fontSize > 16) {
                      e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                      e.currentTarget.style.color = "var(--theme-accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (fontSize > 16) {
                      e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                      e.currentTarget.style.color = "var(--theme-text-secondary)";
                    }
                  }}
                  title="Decrease font size"
                  aria-label="Decrease font size"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10" />
                    <path d="M12 20V10" />
                    <path d="M6 20V4" />
                    <path d="M18 14h-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Reading Content */}
          <div className="max-w-[75ch] mx-auto px-6 py-16 md:py-24">
            <article
              className="prose prose-lg max-w-none"
              style={{
                color: "var(--theme-text-primary)",
              }}
            >
              <div
                className="space-y-8"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: `${fontSize}px`,
                  lineHeight: "2.0",
                  letterSpacing: "0.01em",
                }}
              >
                {story
                  .split(/\n\s*\n/)
                  .filter(p => p.trim().length > 0)
                  .map((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    const isDayHeader = /^Day \d+/.test(trimmed);
                    const isFirstParagraph = index === 0 && !isDayHeader;
                    
                    if (isDayHeader) {
                      const parts = trimmed.split(' - ');
                      const dayPart = parts[0];
                      const subtitlePart = parts.slice(1).join(' - ');
                      
                      return (
                        <div key={index} className="pt-12 first:pt-0">
                          <div className="mb-8">
                            <h4
                              className="text-base md:text-lg font-normal mb-4 tracking-wide"
                              style={{ color: "var(--theme-text-tertiary)" }}
                            >
                              {dayPart}
                            </h4>
                            {subtitlePart && (
                              <p
                                className="text-2xl md:text-3xl font-light leading-relaxed"
                                style={{ color: "var(--theme-text-primary)" }}
                              >
                                {subtitlePart}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <p
                        key={index}
                        className={isFirstParagraph ? "leading-[2.1] font-extralight" : "leading-[2.0] font-light"}
                        style={{
                          color: "var(--theme-text-secondary)",
                          marginBottom: "1.5em",
                          fontSize: isFirstParagraph ? `${Math.min(fontSize + 2, 28)}px` : `${fontSize}px`,
                        }}
                      >
                        {trimmed.split('\n').filter(line => line.trim()).map((line, lineIndex, lines) => (
                          <span key={lineIndex}>
                            {line.trim()}
                            {lineIndex < lines.length - 1 && <><br /><br /></>}
                          </span>
                        ))}
                      </p>
                    );
                  })}
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
  