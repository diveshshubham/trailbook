"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { addToFavorites, removeFromFavorites, getFavoriteAlbums, type Album } from "@/lib/trailbookApi";

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
  albumId?: string;
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
  albumId,
}: AlbumHeroProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [contentOpacity, setContentOpacity] = useState(1);
  const heroRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Check if album is in favorites (only if user is logged in)
  useEffect(() => {
    if (!albumId) return;
    // Check if user is logged in
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    if (!token) return;
    
    let cancelled = false;
    const checkFavorite = async () => {
      try {
        const favorites = await getFavoriteAlbums();
        if (!cancelled) {
          setIsFavorite(favorites.some((a) => (a.id || a._id) === albumId));
        }
      } catch (err) {
        // Silently fail if user is not logged in or API fails
        console.error("Failed to check favorites", err);
      }
    };
    checkFavorite();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  // Parallax and scroll-based opacity effects
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      
      const rect = heroRef.current.getBoundingClientRect();
      const heroHeight = rect.height;
      const scrollY = window.scrollY;
      const heroTop = rect.top + scrollY;
      const currentScroll = scrollY - heroTop;
      
      // Calculate scroll progress (0 to 1)
      const progress = Math.max(0, Math.min(1, currentScroll / heroHeight));
      setScrollProgress(progress);
      
      // Fade out content as user scrolls (starts fading after 30% scroll)
      const fadeStart = 0.3;
      const fadeEnd = 0.7;
      if (progress < fadeStart) {
        setContentOpacity(1);
      } else if (progress > fadeEnd) {
        setContentOpacity(0);
      } else {
        const fadeProgress = (progress - fadeStart) / (fadeEnd - fadeStart);
        setContentOpacity(1 - fadeProgress);
      }
      
      // Parallax effect for background image
      if (imageRef.current) {
        const parallaxOffset = currentScroll * 0.5; // Adjust speed (0.5 = slower)
        imageRef.current.style.transform = `translateY(${parallaxOffset}px) scale(1.05)`;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleToggleFavorite = async () => {
    if (!albumId || isToggling) return;
    
    // Check if user is logged in
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    if (!token) {
      // Open auth modal if not logged in
      window.dispatchEvent(new Event("tb:open-auth"));
      return;
    }
    
    setIsToggling(true);
    try {
      if (isFavorite) {
        await removeFromFavorites(albumId);
        setIsFavorite(false);
      } else {
        await addToFavorites(albumId);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
      alert("Failed to update favorites. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };
  return (
    <section ref={heroRef} className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      {/* Background Image with Parallax */}
      <div className="absolute inset-0 overflow-hidden">
        <img 
          ref={imageRef}
          src={coverUrl} 
          className="w-full h-full object-cover transition-transform duration-75 ease-out will-change-transform" 
          alt={title} 
          draggable={false}
          onContextMenu={(e) => {
            if (protectImage) e.preventDefault();
          }}
          style={{
            minHeight: "120%", // Extra height for parallax
            minWidth: "100%",
          }}
        />
        {/* Premium Cinematic Gradient Overlays */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/75 transition-opacity duration-300"
          style={{ opacity: 1 - scrollProgress * 0.5 }}
        />
        {/* Subtle vignette for depth */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"
          style={{ opacity: 0.7 + scrollProgress * 0.3 }}
        />
        {/* Soft radial gradient for focus */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/30" />
      </div>

      {/* Content Container with scroll-based opacity */}
      <div 
        className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-20 md:pb-24 transition-opacity duration-300"
        style={{ opacity: contentOpacity }}
      >
        <div className="max-w-4xl animate-fadeInUp">
          {/* Subtle tag and subtitle */}
          <div className="flex items-center gap-3 mb-8">
            <span 
              className="px-3 py-1 text-[9px] uppercase tracking-[0.3em] font-semibold rounded-full backdrop-blur-xl border"
              style={{
                backgroundColor: isPublic 
                  ? (isDefault ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.2)")
                  : (isDefault ? "rgba(249, 115, 22, 0.15)" : "rgba(249, 115, 22, 0.2)"),
                borderColor: isPublic
                  ? (isDefault ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.3)")
                  : (isDefault ? "rgba(249, 115, 22, 0.25)" : "rgba(249, 115, 22, 0.3)"),
                color: isPublic
                  ? (isDefault ? "rgb(52, 211, 153)" : "rgb(52, 211, 153)")
                  : (isDefault ? "rgb(251, 146, 60)" : "rgb(251, 146, 60)"),
              }}
            >
              {isPublic ? "Public Story" : "Private Collection"}
            </span>
            {subtitle && (
              <span className="text-white/50 text-[9px] tracking-[0.4em] uppercase font-light">
                {subtitle}
              </span>
            )}
          </div>

          {/* Premium Title with refined typography */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6 drop-shadow-2xl">
            {title}
          </h1>
          
          {/* Elegant Metadata Row */}
          {(location || elevation || date || duration) && (
            <div className="mt-8 flex flex-wrap items-center gap-6 text-white/85 text-sm md:text-base">
              {location && (
                <div className="flex items-center gap-2">
                  <span className="text-lg opacity-80">📍</span>
                  <span className="font-medium tracking-wide">{location}</span>
                </div>
              )}
              {elevation && (
                <div className="flex items-center gap-2">
                  <span className="text-lg opacity-80">🏔️</span>
                  <span className="font-medium">
                    {typeof elevation === 'number' ? `${elevation.toLocaleString()} m` : elevation}
                  </span>
                </div>
              )}
              {date && (
                <div className="flex items-center gap-2">
                  <span className="text-lg opacity-80">🗓️</span>
                  <span className="font-medium">{date}</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-2">
                  <span className="text-lg opacity-80">⏱️</span>
                  <span className="font-medium">
                    {typeof duration === 'number' ? `${duration} day${duration !== 1 ? 's' : ''}` : duration}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Subtle divider hint */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px w-16 bg-white/20" />
            <p className="text-white/50 text-xs font-light tracking-[0.3em] uppercase">
              Scroll to explore
            </p>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="text-white/50 animate-bounce"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Premium Favorite Button */}
      {albumId && (
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isToggling}
            className="group relative flex items-center gap-2.5 px-5 py-3 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isFavorite
                ? (isDefault ? "rgba(251, 191, 36, 0.25)" : "var(--theme-accent)")
                : "rgba(0, 0, 0, 0.3)",
              borderColor: isFavorite
                ? (isDefault ? "rgba(251, 191, 36, 0.5)" : "var(--theme-accent)")
                : "rgba(255, 255, 255, 0.2)",
              color: "white",
            }}
            onMouseEnter={(e) => {
              if (!isToggling) {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                if (!isFavorite) {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
                }
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
            }}
            title={isFavorite ? "Remove from Worth Keeping" : "Add to Worth Keeping"}
          >
            <span className="text-lg transition-transform group-hover:scale-110">
              {isFavorite ? "⭐" : "☆"}
            </span>
            <span className="text-xs font-semibold tracking-wide hidden sm:inline">
              {isToggling ? "..." : isFavorite ? "Worth Keeping" : "Keep This"}
            </span>
          </button>
        </div>
      )}

      {/* Elegant Bottom Edge Fade with smooth transition */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t to-transparent pointer-events-none"
        style={{ 
          background: `linear-gradient(to top, var(--theme-background) 0%, var(--theme-background) 40%, transparent 100%)`,
          transition: "opacity 0.3s ease",
        }}
      />
      
      {/* Subtle scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
  