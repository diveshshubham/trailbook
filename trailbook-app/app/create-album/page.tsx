"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { createAlbum, getPresignedUrl, updateAlbumCover } from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const DRAFT_KEY = "tb:create-album-draft:v1";
const DRAFT_COVER_KEY = "tb:create-album-cover:v1";

// Convert file to base64 for localStorage
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convert base64 back to File
function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || mimeType;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export default function CreateAlbumPage() {
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [story, setStory] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const hasCover = Boolean(coverPreviewUrl);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      
      const draft = JSON.parse(raw) as Partial<{
        name: string;
        description: string;
        location: string;
        story: string;
        isPublic: boolean;
        updatedAt: string;
      }>;
      
      // Check if draft has meaningful content
      const hasContent = draft.name || draft.description || draft.location || draft.story;
      if (!hasContent) return;
      
      // Check if draft is recent (within 7 days)
      if (draft.updatedAt) {
        const draftDate = new Date(draft.updatedAt);
        const daysSince = (Date.now() - draftDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
          // Draft is too old, clear it
          window.localStorage.removeItem(DRAFT_KEY);
          window.localStorage.removeItem(DRAFT_COVER_KEY);
          return;
        }
      }
      
      // If form is already filled, show banner
      if (name || description || location || story) {
        setShowDraftBanner(true);
      } else {
        // Auto-restore draft if form is empty
        restoreDraft();
      }
    } catch {
      // ignore
    }
  }, []);

  // Restore draft function
  const restoreDraft = async () => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      
      const draft = JSON.parse(raw) as Partial<{
        name: string;
        description: string;
        location: string;
        story: string;
        isPublic: boolean;
      }>;
      
      if (typeof draft.name === "string") setName(draft.name);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.location === "string") setLocation(draft.location);
      if (typeof draft.story === "string") setStory(draft.story);
      if (typeof draft.isPublic === "boolean") setIsPublic(draft.isPublic);
      
      // Restore cover image
      const coverBase64 = window.localStorage.getItem(DRAFT_COVER_KEY);
      if (coverBase64) {
        try {
          const file = base64ToFile(coverBase64, "cover.jpg", "image/jpeg");
          setCoverFile(file);
          setCoverPreviewUrl(URL.createObjectURL(file));
        } catch {
          // If cover restoration fails, just clear it
          window.localStorage.removeItem(DRAFT_COVER_KEY);
        }
      }
      
      setHasRestoredDraft(true);
      setShowDraftBanner(false);
    } catch {
      // ignore
    }
  };

  // Clear draft function
  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(DRAFT_COVER_KEY);
      setShowDraftBanner(false);
    } catch {
      // ignore
    }
  };

  // Autosave draft as user types (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const hasContent = name || description || location || story;
        if (hasContent) {
          window.localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              name,
              description,
              location,
              story,
              isPublic,
              updatedAt: new Date().toISOString(),
            })
          );
        } else {
          // Clear draft if form is empty
          window.localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [name, description, location, story, isPublic]);

  // Save cover image to localStorage when it changes
  useEffect(() => {
    if (!coverFile) {
      window.localStorage.removeItem(DRAFT_COVER_KEY);
      return;
    }
    
    fileToBase64(coverFile)
      .then((base64) => {
        try {
          window.localStorage.setItem(DRAFT_COVER_KEY, base64);
        } catch (e) {
          // If localStorage is full, just log and continue
          console.warn("Could not save cover to localStorage:", e);
        }
      })
      .catch(() => {
        // ignore errors
      });
  }, [coverFile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      // Don't upload cover until the album exists (prevents invalid albumId errors).
      setCoverFile(file);
      setCoverImageKey(null);

      setCoverPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } catch (err) {
      console.error(err);
      setError("Failed to upload cover image. Please try again.");
    } finally {
      // allow selecting the same file again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name || !description || !location || !story) {
      setError("Please fill in all mandatory fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const album = await createAlbum({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        story: story.trim(),
        isPublic,
      });

      const albumId = album.id || album._id;
      if (!albumId) throw new Error("Missing album id from createAlbum response");

      // Upload cover AFTER album exists (optional)
      if (coverFile) {
        try {
          setCoverUploading(true);
          const { uploadUrl, key } = await getPresignedUrl({
            albumId,
            contentType: coverFile.type || "image/jpeg",
          });

          const form = new FormData();
          form.append("uploadUrl", uploadUrl);
          form.append("contentType", coverFile.type || "image/jpeg");
          form.append("file", coverFile);

          const proxyRes = await fetch("/api/s3-upload", { method: "POST", body: form });
          if (!proxyRes.ok) throw new Error("Cover upload failed");

          await updateAlbumCover({ albumId, coverImage: key });
          setCoverImageKey(key);
        } catch (e) {
          console.error(e);
          // Album is created already, so don't block user. We show a banner on the album page.
          router.push(`/album/${albumId}?cover=failed`);
          return;
        } finally {
          setCoverUploading(false);
        }
      }

      // Only clear draft after successful creation
      try {
        window.localStorage.removeItem(DRAFT_KEY);
        window.localStorage.removeItem(DRAFT_COVER_KEY);
      } catch {
        // ignore
      }

      router.push(`/album/${albumId}`);
    } catch (err) {
      console.error(err);
      setError("Couldn't create album. Please check your connection. Your draft has been saved - you can continue editing.");
      // Don't clear draft on error - let user continue editing
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-12 pb-24 px-6 transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Draft Recovery Banner */}
        {showDraftBanner && (
          <div 
            className="mb-6 rounded-2xl border p-6 shadow-theme animate-fadeIn"
            style={{
              backgroundColor: "var(--theme-surface)",
              borderColor: "var(--theme-accent)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">💾</span>
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    Unsaved draft found
                  </h3>
                </div>
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  We found a draft from your previous session. Would you like to continue editing where you left off?
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: isDefault ? "linear-gradient(to right, #f97316, #ec4899)" : "var(--theme-gradient-primary)",
                    color: "var(--theme-text-inverse)",
                  }}
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: "var(--theme-surface-hover)",
                    color: "var(--theme-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                  }}
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message after restoring draft */}
        {hasRestoredDraft && (
          <div 
            className="mb-6 rounded-2xl border p-4 shadow-theme animate-fadeIn"
            style={{
              backgroundColor: "var(--theme-accent-light)",
              borderColor: "var(--theme-accent)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <p 
                className="text-sm font-medium"
                style={{ color: "var(--theme-accent)" }}
              >
                Draft restored! You can continue editing your album.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-12 animate-fadeIn">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "var(--theme-text-primary)" }}>Begin a New Chapter</h1>
          <p className="mt-2 text-lg font-light" style={{ color: "var(--theme-text-secondary)" }}>Document your journey, one story at a time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-10">
            {/* Section 1: Essentials */}
            <section className="rounded-3xl p-8 shadow-theme border space-y-6 transition-colors duration-300" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: isDefault ? "#ffedd5" : "var(--theme-accent-light)",
                    color: isDefault ? "#f97316" : "var(--theme-accent)",
                  }}
                >
                  1
                </span>
                <h2 className="text-xl font-semibold" style={{ color: "var(--theme-text-primary)" }}>Essentials</h2>
              </div>
              
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1 block ml-1">Album Title</label>
                  <input
                    placeholder="e.g. Majestic Himalayan Expedition"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50/50 rounded-2xl border-none px-6 py-4 text-gray-900 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1 block ml-1">Location</label>
                  <input
                    placeholder="e.g. Uttarakhand, India"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-gray-50/50 rounded-2xl border-none px-6 py-4 text-gray-900 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1 block ml-1">Brief Description</label>
                  <input
                    placeholder="e.g. A journey through the peaks of silence and snow"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50/50 rounded-2xl border-none px-6 py-4 text-gray-900 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: The Narrative */}
            <section className="rounded-3xl p-8 shadow-theme border space-y-6 transition-colors duration-300" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: isDefault ? "#ffedd5" : "var(--theme-accent-light)",
                    color: isDefault ? "#f97316" : "var(--theme-accent)",
                  }}
                >
                  2
                </span>
                <h2 className="text-xl font-semibold" style={{ color: "var(--theme-text-primary)" }}>The Narrative</h2>
              </div>

              <div className="group">
                <label className="text-[10px] uppercase tracking-widest font-bold mb-1 block ml-1" style={{ color: "var(--theme-text-tertiary)" }}>The Story</label>
                <textarea
                  placeholder="Share the fragments of your time... Each step was a testament to human spirit..."
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="w-full rounded-2xl border-none px-6 py-4 transition-all min-h-[160px] resize-none leading-relaxed"
                  style={{
                    backgroundColor: "var(--theme-surface-elevated)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-accent-light)"}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-10">
            {/* Cover Image Upload */}
            <section className="rounded-3xl p-8 shadow-theme border space-y-6 transition-colors duration-300" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: isDefault ? "#ffedd5" : "var(--theme-accent-light)",
                    color: isDefault ? "#f97316" : "var(--theme-accent)",
                  }}
                >
                  3
                </span>
                <h2 className="text-xl font-semibold" style={{ color: "var(--theme-text-primary)" }}>Cover</h2>
              </div>

              <div 
                onClick={() => !coverUploading && fileInputRef.current?.click()}
                className={`relative aspect-square rounded-2xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-all ${
                  hasCover ? "border-transparent" : "cursor-pointer"
                }`}
                style={
                  !hasCover
                    ? {
                        borderColor: isDefault ? "rgba(0, 0, 0, 0.05)" : "var(--theme-border)",
                        backgroundColor: isDefault ? "rgba(249, 250, 251, 0.5)" : "var(--theme-surface-elevated)",
                      }
                    : {}
                }
                onMouseEnter={(e) => {
                  if (!hasCover) {
                    e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.3)" : "var(--theme-accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasCover) {
                    e.currentTarget.style.borderColor = isDefault ? "rgba(0, 0, 0, 0.05)" : "var(--theme-border)";
                  }
                }}
              >
                {hasCover ? (
                  <>
                    <img
                      src={coverPreviewUrl || resolveMediaUrl(coverImageKey || "")}
                      className="w-full h-full object-cover"
                      alt="Preview"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold uppercase tracking-widest">Change Image</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <span className="text-3xl mb-4 block">{coverUploading ? "⏳" : "🖼️"}</span>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--theme-text-tertiary)" }}>
                      {coverUploading ? "Uploading..." : "Upload Cover"}
                    </p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
            </section>

            {/* Privacy & Action */}
            <section className="rounded-3xl p-8 shadow-theme border space-y-6 transition-colors duration-300" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: isDefault ? "#ffedd5" : "var(--theme-accent-light)",
                    color: isDefault ? "#f97316" : "var(--theme-accent)",
                  }}
                >
                  4
                </span>
                <h2 className="text-xl font-semibold" style={{ color: "var(--theme-text-primary)" }}>Privacy</h2>
              </div>

              <div
                className="flex gap-2 p-1 rounded-2xl"
                style={{ backgroundColor: "var(--theme-surface-elevated)" }}
              >
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  style={
                    !isPublic
                      ? {
                          background: isDefault ? "white" : "var(--theme-accent)",
                          color: isDefault ? "#171717" : "var(--theme-text-inverse)",
                        }
                      : {
                          color: "var(--theme-text-tertiary)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (isPublic) {
                      e.currentTarget.style.color = "var(--theme-text-secondary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isPublic) {
                      e.currentTarget.style.color = "var(--theme-text-tertiary)";
                    }
                  }}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  style={
                    isPublic
                      ? {
                          background: isDefault ? "#f97316" : "var(--theme-gradient-primary)",
                          color: "var(--theme-text-inverse)",
                        }
                      : {
                          color: "var(--theme-text-tertiary)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!isPublic) {
                      e.currentTarget.style.color = "var(--theme-text-secondary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPublic) {
                      e.currentTarget.style.color = "var(--theme-text-tertiary)";
                    }
                  }}
                >
                  Public
                </button>
              </div>

              {error && (
                <div 
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: "var(--theme-error)",
                    borderColor: "var(--theme-error)",
                    opacity: 0.1,
                  }}
                >
                  <p 
                    className="text-xs font-medium text-center"
                    style={{ color: "var(--theme-error)" }}
                  >
                    {error}
                  </p>
                  <p 
                    className="text-[10px] text-center mt-2 opacity-70"
                    style={{ color: "var(--theme-error)" }}
                  >
                    Don't worry - your progress has been saved automatically.
                  </p>
                </div>
              )}

              {/* Auto-save indicator */}
              {(name || description || location || story) && !loading && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-xs" style={{ color: "var(--theme-text-tertiary)" }}>💾</span>
                  <p 
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  >
                    Auto-saving draft...
                  </p>
                </div>
              )}

              <button
                disabled={loading || coverUploading || !name || !description || !location || !story}
                onClick={handleSubmit}
                className="w-full py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                style={{
                  background: isDefault ? "black" : "var(--theme-gradient-primary)",
                  color: "var(--theme-text-inverse)",
                }}
              >
                {loading ? "Crafting..." : "Create Album"}
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
