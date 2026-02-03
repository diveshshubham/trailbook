"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { regenerateAlbumStory, uploadMedia } from "@/lib/trailbookApi";
import { usePublicAlbumGate } from "@/components/Share/PublicAlbumGate";
import { useTheme } from "@/contexts/ThemeContext";
import { resolveMediaUrl } from "@/lib/mediaUrl";

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
  const [showFullStory, setShowFullStory] = useState(false);
  const [addingImageKeys, setAddingImageKeys] = useState<Set<string>>(new Set());
  const [addImagesError, setAddImagesError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const readingContentRef = useRef<HTMLDivElement>(null);

  const canRegenerate = Boolean(albumId);
  const previewChars = 650;
  const effectiveStory = locked ? truncateStory(story, previewChars) : story;
  const isTruncated = locked && story.trim().length > effectiveStory.trim().length;
  
  // Check if story contains HTML
  const isHTML = effectiveStory.includes("<") && effectiveStory.includes(">");
  
  // Split story into paragraphs (for plain text) or process HTML
  const paragraphs = isHTML 
    ? [] // Will render HTML directly
    : effectiveStory
        .split(/\n\s*\n/)
        .filter(p => p.trim().length > 0);
  
  const hasMultipleParagraphs = isHTML ? false : paragraphs.length > 1;
  const shouldShowContinueHint = !locked && hasMultipleParagraphs && !showFullStory;
  
  // Process HTML content to extract and replace images with interactive wrappers
  const displayHTML = useMemo(() => {
    if (!isHTML || !effectiveStory) return null;
    
    // Process images: resolve URLs and wrap with add-to-album button
    let processedHTML = effectiveStory;
    
    // Replace each img tag with a wrapper that includes the button
    processedHTML = processedHTML.replace(/<img([^>]*)>/g, (match, attrs) => {
      // Extract src and data-key
      const srcMatch = attrs.match(/src="([^"]+)"/);
      const dataKeyMatch = attrs.match(/data-key="([^"]+)"/);
      
      const src = srcMatch ? srcMatch[1] : "";
      const dataKey = dataKeyMatch ? dataKeyMatch[1] : null;
      
      // Resolve URL
      const resolvedUrl = resolveMediaUrl(src) || src;
      const imageKey = dataKey || extractKeyFromUrl(src) || "";
      
      // Create a unique ID for this image based on its key
      const imageId = imageKey ? `story-img-${imageKey.replace(/[^a-zA-Z0-9]/g, "-")}` : `story-img-${Math.random().toString(36).substr(2, 9)}`;
      
      // Update src in attributes
      const updatedAttrs = attrs.replace(/src="[^"]+"/, `src="${resolvedUrl}"`);
      
      // Return wrapped image with button overlay
      return `
        <div class="story-image-wrapper" data-image-key="${imageKey}" data-image-id="${imageId}" style="position: relative; display: inline-block; width: 100%; margin: 16px 0;">
          <img${updatedAttrs} style="max-width: 100%; height: auto; border-radius: 12px; display: block;" />
          ${!locked && albumId && imageKey ? `
            <button 
              type="button"
              class="story-image-add-btn"
              data-image-key="${imageKey}"
              data-image-url="${resolvedUrl}"
              data-adding="false"
              style="
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(12px);
                color: #333;
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 8px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
                z-index: 10;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              "
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add to Album</span>
            </button>
          ` : ""}
        </div>
      `;
    });
    
    return processedHTML;
  }, [isHTML, effectiveStory, locked, albumId]);

  // Extract image keys from story HTML
  const extractImageKeys = useMemo(() => {
    if (!story) return [];
    const storyIsHTML = story.includes("<") && story.includes(">");
    if (!storyIsHTML) return [];
    
    const imageKeys: Array<{ key: string; url: string }> = [];
    const imgRegex = /<img[^>]*>/g;
    let match;
    
    while ((match = imgRegex.exec(story)) !== null) {
      const imgTag = match[0];
      
      // First, try to get data-key attribute
      const dataKeyMatch = imgTag.match(/data-key="([^"]+)"/);
      if (dataKeyMatch && dataKeyMatch[1]) {
        const key = dataKeyMatch[1];
        imageKeys.push({ 
          key, 
          url: resolveMediaUrl(key) || key 
        });
        continue;
      }
      
      // Otherwise, extract from src attribute
      const srcMatch = imgTag.match(/src="([^"]+)"/);
      if (!srcMatch || !srcMatch[1]) continue;
      
      const src = srcMatch[1];
      
      // If it's already a key (no http/https/data), use it directly
      if (!src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:")) {
        imageKeys.push({ 
          key: src, 
          url: resolveMediaUrl(src) || src 
        });
        continue;
      }
      
      // Extract key from full URL
      const mediaBaseUrl = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 
        "https://trailbook-media-shubham.s3.ap-south-1.amazonaws.com").replace(/\/$/, "");
      
      if (src.startsWith(mediaBaseUrl)) {
        const key = src.replace(mediaBaseUrl, "").replace(/^\//, "").split("?")[0]; // Remove query params
        if (key) {
          imageKeys.push({ key, url: src });
        }
      }
    }
    
    // Remove duplicates based on key
    const uniqueKeys = new Map<string, { key: string; url: string }>();
    imageKeys.forEach(item => {
      if (!uniqueKeys.has(item.key)) {
        uniqueKeys.set(item.key, item);
      }
    });
    
    return Array.from(uniqueKeys.values());
  }, [story, isHTML]);

  // Function to extract key from URL
  const extractKeyFromUrl = (url: string): string | null => {
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:")) {
      return url; // Already a key
    }
    
    const mediaBaseUrl = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 
      "https://trailbook-media-shubham.s3.ap-south-1.amazonaws.com").replace(/\/$/, "");
    
    if (url.startsWith(mediaBaseUrl)) {
      return url.replace(mediaBaseUrl, "").replace(/^\//, "");
    }
    
    return null;
  };

  // Function to get image metadata
  const getImageMetadata = async (url: string, key: string): Promise<{ size: number; contentType: string }> => {
    try {
      // Try HEAD request first (more efficient)
      const response = await fetch(url, { method: "HEAD", mode: "cors" });
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "image/jpeg";
        const contentLength = response.headers.get("content-length");
        const size = contentLength ? parseInt(contentLength, 10) : 0;
        
        if (size > 0 && contentType.startsWith("image/")) {
          return { size, contentType };
        }
      }
    } catch (headError) {
      console.warn("HEAD request failed, trying full fetch:", headError);
    }
    
    // If HEAD doesn't work, try fetching the image (with timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const imgResponse = await fetch(url, { 
        signal: controller.signal,
        mode: "cors"
      });
      clearTimeout(timeoutId);
      
      if (imgResponse.ok) {
        const blob = await imgResponse.blob();
        return {
          size: blob.size,
          contentType: blob.type || "image/jpeg",
        };
      }
    } catch (fetchError) {
      console.warn("Full fetch failed:", fetchError);
    }
    
    // Fallback: infer from extension
    const extension = (key.split(".").pop() || url.split(".").pop() || "jpg").toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
    };
    
    // Use a reasonable default size if we can't determine it
    // This is a fallback - ideally we should always get the real size
    return {
      size: 100000, // Default to 100KB if we can't fetch it
      contentType: contentTypeMap[extension] || "image/jpeg",
    };
  };

  // Function to add a single image to album
  const handleAddImageToAlbum = useCallback(async (imageKey: string, imageUrl: string) => {
    if (!albumId || !imageKey) return;
    
    setAddingImageKeys(prev => {
      if (prev.has(imageKey)) return prev;
      return new Set(prev).add(imageKey);
    });
    setAddImagesError(null);
    
    try {
      // Get metadata for the image
      const metadata = await getImageMetadata(imageUrl, imageKey);
      
      // Call the API to add the image to the album
      await uploadMedia({
        albumId,
        key: imageKey,
        contentType: metadata.contentType,
        size: metadata.size,
      });
      
      // Success - show feedback and optionally refresh
      setAddImagesError(null);
      // Optionally refresh the page or show success message
      window.location.reload();
    } catch (error) {
      console.error("Error adding image to album:", error);
      setAddImagesError("Failed to add image to album. Please try again.");
    } finally {
      setAddingImageKeys(prev => {
        const next = new Set(prev);
        next.delete(imageKey);
        return next;
      });
    }
  }, [albumId]);

  const storyContentRef = useRef<HTMLDivElement>(null);

  // Track reading progress
  useEffect(() => {
    if (!readMode || !readingContentRef.current) return;

    const handleScroll = () => {
      if (!readingContentRef.current) return;
      
      const element = readingContentRef.current;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const elementTop = element.offsetTop;
      const elementHeight = element.scrollHeight;
      const windowHeight = window.innerHeight;
      
      const scrollPosition = scrollTop + windowHeight - elementTop;
      const totalHeight = elementHeight;
      
      if (scrollPosition < 0) {
        setReadingProgress(0);
      } else if (scrollPosition > totalHeight) {
        setReadingProgress(100);
      } else {
        setReadingProgress((scrollPosition / totalHeight) * 100);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [readMode]);

  // Set up click handlers for image buttons after render
  useEffect(() => {
    if (!storyContentRef.current || typeof window === "undefined" || !albumId) return;
    
    const handleImageButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".story-image-add-btn") as HTMLElement;
      if (!button) return;
      
      const imageKey = button.getAttribute("data-image-key");
      const imageUrl = button.getAttribute("data-image-url");
      const isAdding = button.getAttribute("data-adding") === "true";
      
      if (imageKey && imageUrl && !isAdding) {
        e.preventDefault();
        e.stopPropagation();
        
        // Update button state
        button.setAttribute("data-adding", "true");
        button.style.opacity = "0.6";
        button.style.cursor = "not-allowed";
        const originalContent = button.innerHTML;
        button.innerHTML = `
          <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>Adding...</span>
        `;
        
        handleAddImageToAlbum(imageKey, imageUrl)
          .finally(() => {
            button.setAttribute("data-adding", "false");
            button.style.opacity = "1";
            button.style.cursor = "pointer";
            button.innerHTML = originalContent;
          });
      }
    };
    
    const storyContainer = storyContentRef.current;
    storyContainer.addEventListener("click", handleImageButtonClick);
    
    return () => {
      storyContainer.removeEventListener("click", handleImageButtonClick);
    };
  }, [displayHTML, albumId, handleAddImageToAlbum]);

  return (
    <section className="max-w-[75ch] mx-auto px-6 py-16 md:py-20">
      <style jsx global>{`
        .story-content .story-image-add-btn:hover {
          background: rgba(255, 255, 255, 1) !important;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        .story-content .story-image-add-btn[data-adding="true"] {
          opacity: 0.6;
          cursor: not-allowed !important;
        }
      `}</style>
      <div 
        className="rounded-2xl p-10 md:p-16 shadow-sm border transition-colors duration-300"
        style={{
          backgroundColor: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
        }}
      >
        <div className="mb-12 flex items-center justify-between">
          <h3 
            className="text-xl md:text-2xl font-light tracking-[0.2em] mb-1 antialiased"
            style={{ 
              color: "var(--theme-text-tertiary)",
              fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            }}
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
              <span className="text-xs font-semibold uppercase tracking-wider">Begin Journey</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <article className="space-y-8">
          {isHTML && displayHTML ? (
            // Render HTML content
            <div
              ref={storyContentRef}
              className="story-content prose prose-lg max-w-none"
              style={{
                color: "var(--theme-text-secondary)",
                fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                fontSize: "17px",
                lineHeight: "1.95",
              }}
              dangerouslySetInnerHTML={{ __html: displayHTML }}
            />
          ) : (
            // Render plain text paragraphs
            paragraphs
              .map((paragraph, index) => {
                const trimmed = paragraph.trim();
                const isDayHeader = /^Day \d+/.test(trimmed);
                const isFirstParagraph = index === 0 && !isDayHeader;
                
                // Hide paragraphs after the first one if continue hint should be shown
                if (shouldShowContinueHint && index > 0) {
                  return null;
                }
                
                if (isDayHeader) {
                  const parts = trimmed.split(' - ');
                  const dayPart = parts[0];
                  const subtitlePart = parts.slice(1).join(' - ');
                  
                  return (
                    <div key={index} className="pt-8 first:pt-0">
                      <div className="mb-6">
                        <h4 
                          className="text-sm md:text-base font-normal tracking-wide mb-2 antialiased"
                          style={{ 
                            color: "var(--theme-text-tertiary)",
                            fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                          }}
                        >
                          {dayPart}
                        </h4>
                        {subtitlePart && (
                          <p 
                            className="text-lg md:text-xl font-light leading-relaxed antialiased"
                            style={{ 
                              color: "var(--theme-text-primary)",
                              fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                            }}
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
                    
                    {/* Clickable "Continue reading ↓" hint after first paragraph */}
                    {shouldShowContinueHint && isFirstParagraph && (
                      <button
                        type="button"
                        onClick={() => setShowFullStory(true)}
                        className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] group"
                        style={{
                          borderColor: "var(--theme-border)",
                          backgroundColor: "var(--theme-surface-hover)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                          e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--theme-border)";
                          e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                        }}
                        aria-label="Continue reading the story"
                      >
                        <span 
                          className="text-xs font-light tracking-wider uppercase antialiased"
                          style={{ 
                            color: "var(--theme-text-secondary)",
                            fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                          }}
                        >
                          Walk deeper into this moment
                        </span>
                        <svg 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="animate-bounce group-hover:translate-y-1 transition-transform"
                          style={{ color: "var(--theme-text-tertiary)" }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
              .filter(Boolean)
          )}
        </article>

        {isTruncated && (
          <div 
            className="mt-16 pt-12 border-t"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <div className="text-center">
              <p 
                className="text-sm font-light tracking-wide mb-3 antialiased"
                style={{ 
                  color: "var(--theme-text-tertiary)",
                  fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                }}
              >
                Continue reading
              </p>
              <p 
                className="font-light text-sm mb-6 leading-relaxed max-w-md mx-auto antialiased"
                style={{ 
                  color: "var(--theme-text-secondary)",
                  fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                }}
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

        {addImagesError && (
          <div 
            className="mt-8 pt-8 border-t"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <p 
              className="text-sm font-light"
              style={{ color: "var(--theme-error)" }}
            >
              {addImagesError}
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
          {/* Reading Progress Bar */}
          <div
            className="fixed top-0 left-0 right-0 h-1 z-[10000] transition-all duration-150"
            style={{
              backgroundColor: "var(--theme-border)",
              opacity: 0.2,
            }}
          >
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${readingProgress}%`,
                background: "var(--theme-gradient-primary)",
              }}
            />
          </div>

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
                  className="h-10 w-10 rounded-full transition-all flex items-center justify-center group"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    color: "var(--theme-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                    e.currentTarget.style.color = "var(--theme-text-primary)";
                    e.currentTarget.style.transform = "translateX(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                    e.currentTarget.style.color = "var(--theme-text-secondary)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                  aria-label="Return to story"
                  title="Return to story"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex flex-col">
                  <p
                    className="text-xs uppercase tracking-widest font-semibold"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  >
                    Immersed in Story
                  </p>
                  {readingProgress > 0 && (
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {Math.round(readingProgress)}% complete
                    </p>
                  )}
                </div>
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
          <div ref={readingContentRef} className="max-w-[75ch] mx-auto px-6 py-16 md:py-24">
            <article
              className="prose prose-lg max-w-none"
              style={{
                color: "var(--theme-text-primary)",
              }}
            >
              {(() => {
                const storyIsHTML = story.includes("<") && story.includes(">");
                const readingHTML = storyIsHTML 
                  ? story.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, (match, url) => {
                      const resolvedUrl = resolveMediaUrl(url) || url;
                      return match.replace(`src="${url}"`, `src="${resolvedUrl}"`);
                    })
                  : null;
                
                if (storyIsHTML && readingHTML) {
                  return (
                    <div
                      className="story-content"
                      style={{
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                        fontSize: `${fontSize}px`,
                        lineHeight: "2.0",
                        letterSpacing: "0.01em",
                        color: "var(--theme-text-secondary)",
                      }}
                      dangerouslySetInnerHTML={{ __html: readingHTML }}
                    />
                  );
                }
                
                return (
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
                );
              })()}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
  