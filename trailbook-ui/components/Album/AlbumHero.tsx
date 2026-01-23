"use client";

import { useTheme } from "@/contexts/ThemeContext";

type AlbumHeroProps = {
  title?: string;
  coverUrl?: string;
  subtitle?: string;
  isPublic?: boolean;
  protectImage?: boolean;
  location?: string;
  elevation?: string | number;
  date?: string;
  duration?: string | number;
};

export default function AlbumHero({
  title = "Untitled album",
  coverUrl = "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
  subtitle,
  isPublic,
  protectImage = false,
  location,
  elevation,
  date,
  duration,
}: AlbumHeroProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      {/* Background Image with Parallax-like feel */}
      <div className="absolute inset-0">
        <img 
          src={coverUrl} 
          className="w-full h-full object-cover" 
          alt={title} 
          draggable={false}
          onContextMenu={(e) => {
            if (protectImage) e.preventDefault();
          }}
        />
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/80" />
      </div>

      {/* Content Container */}
      <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-16">
        <div className="max-w-3xl animate-fadeInUp">
          <div className="flex items-center gap-3 mb-6">
            <span 
              className="px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold rounded-full backdrop-blur-md border"
              style={{
                backgroundColor: isPublic 
                  ? (isDefault ? "rgba(16, 185, 129, 0.2)" : "var(--theme-success)")
                  : (isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-accent)"),
                borderColor: isPublic
                  ? (isDefault ? "rgba(16, 185, 129, 0.3)" : "var(--theme-success)")
                  : (isDefault ? "rgba(249, 115, 22, 0.3)" : "var(--theme-accent)"),
                color: isPublic
                  ? (isDefault ? "rgb(52, 211, 153)" : "var(--theme-text-inverse)")
                  : (isDefault ? "rgb(251, 146, 60)" : "var(--theme-text-inverse)"),
                opacity: isPublic ? (isDefault ? 1 : 0.9) : (isDefault ? 1 : 0.9),
              }}
            >
              {isPublic ? "Public Story" : "Private Collection"}
            </span>
            {subtitle && (
              <span className="text-white/40 text-[10px] tracking-widest uppercase">
                {subtitle}
              </span>
            )}
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight">
            {title}
          </h1>
          
          {/* Metadata Row */}
          {(location || elevation || date || duration) && (
            <div className="mt-6 flex flex-wrap items-center gap-4 text-white/80 text-sm">
              {location && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base">📍</span>
                  <span className="font-medium">{location}</span>
                </div>
              )}
              {elevation && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🏔️</span>
                  <span className="font-medium">
                    {typeof elevation === 'number' ? `${elevation.toLocaleString()} m` : elevation}
                  </span>
                </div>
              )}
              {date && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🗓️</span>
                  <span className="font-medium">{date}</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base">⏱️</span>
                  <span className="font-medium">
                    {typeof duration === 'number' ? `${duration} day${duration !== 1 ? 's' : ''}` : duration}
                  </span>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8 flex items-center gap-4">
            <div className="h-px w-12 bg-white/30" />
            <p className="text-white/60 text-sm font-light tracking-wide uppercase">
              Curated Moments
            </p>
          </div>
        </div>
      </div>

      {/* Elegant Bottom Edge Fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t to-transparent"
        style={{ background: `linear-gradient(to top, var(--theme-background), transparent)` }}
      />
    </section>
  );
}
  