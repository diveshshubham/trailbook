"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAlbum, getPresignedUrl, updateAlbumCover } from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const DRAFT_KEY = "tb:create-album-draft:v1";

export default function CreateAlbumPage() {
  const router = useRouter();
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

  const hasCover = Boolean(coverPreviewUrl);

  // Restore draft on first mount (prevents losing typed data on refresh / network errors)
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
      }>;
      if (typeof draft.name === "string") setName(draft.name);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.location === "string") setLocation(draft.location);
      if (typeof draft.story === "string") setStory(draft.story);
      if (typeof draft.isPublic === "boolean") setIsPublic(draft.isPublic);
    } catch {
      // ignore
    }
  }, []);

  // Autosave draft as user types (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
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
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [name, description, location, story, isPublic]);

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

      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      router.push(`/album/${albumId}`);
    } catch (err) {
      console.error(err);
      setError("Couldn't create album. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] pt-12 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 animate-fadeIn">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Begin a New Chapter</h1>
          <p className="text-gray-500 mt-2 text-lg font-light">Document your journey, one story at a time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-10">
            {/* Section 1: Essentials */}
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-sm">1</span>
                <h2 className="text-xl font-semibold">Essentials</h2>
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
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-sm">2</span>
                <h2 className="text-xl font-semibold">The Narrative</h2>
              </div>

              <div className="group">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1 block ml-1">The Story</label>
                <textarea
                  placeholder="Share the fragments of your time... Each step was a testament to human spirit..."
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="w-full bg-gray-50/50 rounded-2xl border-none px-6 py-4 text-gray-900 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-300 min-h-[160px] resize-none leading-relaxed"
                />
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-10">
            {/* Cover Image Upload */}
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-sm">3</span>
                <h2 className="text-xl font-semibold">Cover</h2>
              </div>

              <div 
                onClick={() => !coverUploading && fileInputRef.current?.click()}
                className={`relative aspect-square rounded-2xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-all ${
                  hasCover
                    ? "border-transparent" 
                    : "border-black/5 hover:border-orange-500/30 bg-gray-50/50 cursor-pointer"
                }`}
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
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {coverUploading ? "Uploading..." : "Upload Cover"}
                    </p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
            </section>

            {/* Privacy & Action */}
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-sm">4</span>
                <h2 className="text-xl font-semibold">Privacy</h2>
              </div>

              <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    !isPublic ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    isPublic ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Public
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium text-center animate-pulse">{error}</p>
              )}

              <button
                disabled={loading || coverUploading || !name || !description || !location || !story}
                onClick={handleSubmit}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
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
