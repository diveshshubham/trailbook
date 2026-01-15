"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
  getMyProfile,
  getProfilePicturePresignedUrl,
  extractKeyFromPresignedUrl,
  resolveProfilePictureUrl,
  updateMyProfilePicture,
  updateMyProfile,
  type MeProfile,
} from "@/lib/userApi";

function parseTags(raw: string): string[] {
  return raw
    .replace(/\n/g, " ")
    .split(",")
    .flatMap((chunk) => chunk.trim().split(/\s+/))
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t.slice(1) : t))
    .map((t) => t.replace(/\s+/g, "-"))
    .filter(Boolean);
}

function parseIds(raw: string): string[] {
  return raw
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function uploadViaProxy(payload: {
  uploadUrl: string;
  contentType: string;
  file: File;
}) {
  const fd = new FormData();
  fd.append("uploadUrl", payload.uploadUrl);
  fd.append("contentType", payload.contentType);
  fd.append("file", payload.file);

  const res = await fetch("/api/s3-upload", { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to upload file");
  }
}

function syncLocalUser(me: MeProfile) {
  if (typeof window === "undefined") return;
  const name =
    me.profile?.fullName?.trim() ||
    (me.user.email ? me.user.email.split("@")[0] : "") ||
    "Trailblazer";
  const email = me.user.email || undefined;
  const avatar =
    resolveProfilePictureUrl(me.profile?.profilePicture) ||
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(
      me.user._id || email || name
    )}`;

  try {
    window.localStorage.setItem("user", JSON.stringify({ name, avatar, email }));
  } catch {
    // ignore
  }

  // Let Navbar refresh itself
  window.dispatchEvent(new Event("tb:user-updated"));
}

export default function ProfilePageClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<MeProfile | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // form
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [favoriteAlbumIdsText, setFavoriteAlbumIdsText] = useState("");
  const [favoriteMediaIdsText, setFavoriteMediaIdsText] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const profilePictureUrl = useMemo(() => {
    const profilePic =
      data?.profile?.profilePicture ||
      // some backends may store it on user
      // @ts-expect-error - tolerate unknown optional field
      data?.user?.profilePicture;
    return resolveProfilePictureUrl(profilePic) || null;
  }, [data]);

  const effectiveProfilePhoto = localPhotoPreview || profilePictureUrl;

  const displayName = useMemo(() => {
    const n = data?.profile?.fullName?.trim();
    if (n) return n;
    const e = data?.user?.email?.trim();
    if (e) return e.split("@")[0] || e;
    return "Explorer";
  }, [data]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const me = await getMyProfile();
        if (!alive) return;
        setData(me);

        setEmail(me.user.email || "");
        setPhone(me.user.phone || "");
        setFullName(me.profile?.fullName || "");
        setBio(me.profile?.bio || "");
        setTagsText((me.profile?.tags || []).join(", "));
        setFavoriteAlbumIdsText((me.profile?.favoriteAlbumIds || []).join(", "));
        setFavoriteMediaIdsText((me.profile?.favoriteMediaIds || []).join(", "));
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setError("Failed to load profile. Please try again.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    // Cleanup object URLs to avoid memory leaks
    return () => {
      if (localPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localPhotoPreview);
      }
    };
  }, [localPhotoPreview]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen]);

  const onSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const payload = {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        fullName: fullName.trim() || undefined,
        description: bio.trim() || undefined,
        tags: parseTags(tagsText),
        favoriteAlbumIds: parseIds(favoriteAlbumIdsText),
        favoriteMediaIds: parseIds(favoriteMediaIdsText),
      };
      const next = await updateMyProfile(payload);
      setData(next);
      syncLocalUser(next);
      setSuccess("Saved.");
      window.setTimeout(() => setSuccess(null), 1800);
    } catch (e) {
      console.error(e);
      setError("Failed to save changes. Please check values and try again.");
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = () => fileRef.current?.click();

  const onPhotoSelected = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setSuccess(null);
    setError(null);
    try {
      // Instant preview (even before upload completes)
      const blobUrl = URL.createObjectURL(file);
      setLocalPhotoPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return blobUrl;
      });

      const presigned = await getProfilePicturePresignedUrl({
        contentType: file.type || "image/jpeg",
      });
      if (!presigned.uploadUrl) throw new Error("Missing presigned upload URL");
      await uploadViaProxy({
        uploadUrl: presigned.uploadUrl,
        contentType: file.type || "image/jpeg",
        file,
      });

      const key = presigned.key || extractKeyFromPresignedUrl(presigned.uploadUrl);
      if (!key) throw new Error("Missing profile picture key");

      // Finalize: tell backend which key to use for profile picture
      const updated = await updateMyProfilePicture({ profilePicture: key });
      setData(updated);
      syncLocalUser(updated);

      // Safety refresh (in case backend enriches URLs asynchronously)
      const refreshed = await getMyProfile();
      setData(refreshed);
      syncLocalUser(refreshed);
      setSuccess("Profile photo updated.");
      window.setTimeout(() => setSuccess(null), 1800);
    } catch (e) {
      console.error(e);
      setError("Failed to upload profile photo.");
      // keep preview, but stop showing it after failure so user doesn't think it's saved
      setLocalPhotoPreview(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
            Profile
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Your identity, your vibe
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl">
            Keep your profile crisp—so your albums feel like a real product.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-full px-5 py-2.5 bg-white border border-black/10 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
        >
          Back to library
        </Link>
      </div>

      <section className="mt-10 relative overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />

        <div className="relative px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!effectiveProfilePhoto) return;
                  setViewerOpen(true);
                }}
                className="h-20 w-20 rounded-3xl bg-black/5 overflow-hidden ring-4 ring-white/70 shadow-md cursor-zoom-in disabled:cursor-default"
                disabled={!effectiveProfilePhoto}
                aria-label="Open profile photo"
                title={effectiveProfilePhoto ? "View photo" : "No photo"}
              >
                {effectiveProfilePhoto ? (
                  <img
                    src={effectiveProfilePhoto}
                    alt="Profile"
                    className={[
                      "h-full w-full object-cover",
                      uploading ? "opacity-80" : "opacity-100",
                    ].join(" ")}
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-gray-400 text-sm">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={onPickPhoto}
                disabled={uploading || loading}
                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-white/90 border border-black/10 shadow-sm hover:bg-white transition grid place-items-center disabled:opacity-60"
                title="Change photo"
                aria-label="Change photo"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.5 6.5l4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhotoSelected(e.target.files?.[0] || null)}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                {data?.profile ? "Creator profile" : "Let’s set you up"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 truncate">
                {loading ? "Loading…" : displayName}
              </h2>
              <p className="mt-2 text-gray-500 text-sm">
                {data?.user?.email || "Add your email"}{" "}
                {data?.user?.phone ? `· ${data.user.phone}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={loading || saving}
              className="rounded-full px-7 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:opacity-95 active:scale-95 transition disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-5 py-4">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-green-200 bg-green-50 text-green-700 px-5 py-4">
            {success}
          </div>
        )}
      </div>

      <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-3xl border border-black/5 bg-white shadow-sm p-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
            Essentials
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-gray-900">
            The basics people will see
          </h3>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full name">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              />
            </Field>

            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 99999 99999"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              />
            </Field>

            <Field label="Email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              />
            </Field>

            <Field label="Tags (comma or space separated)">
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="trekking, cycling"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="Bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A line or two about you…"
                rows={4}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 resize-none"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white shadow-sm p-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
            Status
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-gray-900">
            Profile completeness
          </h3>

          <div className="mt-6 space-y-4">
            <Stat label="Verified" value={data?.user?.isVerified ? "Yes" : "No"} />
            <Stat label="Has profile" value={data?.profile ? "Yes" : "No"} />
            <Stat label="Tags" value={`${parseTags(tagsText).length}`} />
          </div>

          <div className="mt-8 rounded-2xl border border-black/5 bg-gradient-to-br from-gray-50 to-white p-5">
            <p className="text-sm font-semibold text-gray-900">Pro tip</p>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Add 2–4 tags and a short bio—your albums will feel instantly more “real product”.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="mt-8 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            {advancedOpen ? "Hide advanced" : "Show advanced"}
          </button>

          {advancedOpen && (
            <div className="mt-5 space-y-4">
              <Field label="Favorite album IDs (comma/space separated)">
                <textarea
                  value={favoriteAlbumIdsText}
                  onChange={(e) => setFavoriteAlbumIdsText(e.target.value)}
                  placeholder="695e54de..., 695e1234..."
                  rows={3}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                />
              </Field>

              <Field label="Favorite media IDs (comma/space separated)">
                <textarea
                  value={favoriteMediaIdsText}
                  onChange={(e) => setFavoriteMediaIdsText(e.target.value)}
                  placeholder="695e54df..., 695e5678..."
                  rows={3}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                />
              </Field>
            </div>
          )}
        </div>
      </section>

      {/* Fullscreen profile photo viewer */}
      {viewerOpen && effectiveProfilePhoto && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewerOpen(false);
          }}
        >
          <div className="absolute top-5 right-5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 transition grid place-items-center"
              aria-label="Close"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <img
              src={effectiveProfilePhoto}
              alt="Profile photo"
              className="max-h-[88vh] max-w-[92vw] object-contain rounded-3xl shadow-2xl shadow-black/60 select-none"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

