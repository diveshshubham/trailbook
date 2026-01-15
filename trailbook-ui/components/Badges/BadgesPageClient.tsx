"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import { ApiError } from "@/lib/api";
import {
  createCustomBadge,
  getCustomBadgeLogoPresignedUrl,
  getMyBadges,
  listGlobalBadgesCatalog,
  type CustomBadge,
  type GlobalBadge,
} from "@/lib/badgesApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const MAX_CUSTOM_BADGES = 5;

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("token"));
}

function requestLogin() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("tb:open-auth"));
}

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

type PreviewBadge =
  | { kind: "global_catalog"; badge: GlobalBadge }
  | { kind: "global_earned"; badge: GlobalBadge }
  | { kind: "custom"; badge: CustomBadge };

export default function BadgesPageClient() {
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([]);
  const [earnedGlobalBadges, setEarnedGlobalBadges] = useState<GlobalBadge[]>([]);
  const [globalCatalog, setGlobalCatalog] = useState<GlobalBadge[]>([]);

  const [loadingMine, setLoadingMine] = useState(true);
  const [loadMineError, setLoadMineError] = useState<string | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadGlobalError, setLoadGlobalError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<PreviewBadge | null>(null);

  const remaining = useMemo(
    () => Math.max(0, MAX_CUSTOM_BADGES - customBadges.length),
    [customBadges.length]
  );

  const canCreate = customBadges.length < MAX_CUSTOM_BADGES;

  const refreshMine = async () => {
    setLoadingMine(true);
    setLoadMineError(null);
    try {
      const res = await getMyBadges();
      setCustomBadges(res.customBadges);
      setEarnedGlobalBadges(res.globalBadges);
    } catch (e) {
      setLoadMineError(formatError(e));
    } finally {
      setLoadingMine(false);
    }
  };

  const refreshGlobal = async () => {
    setLoadingGlobal(true);
    setLoadGlobalError(null);
    try {
      const list = await listGlobalBadgesCatalog();
      setGlobalCatalog(list);
    } catch (e) {
      setLoadGlobalError(formatError(e));
    } finally {
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    // Global badges catalog is visible to everyone.
    void refreshGlobal();

    // Personal badges require login.
    if (isLoggedIn()) void refreshMine();
    else {
      setLoadingMine(false);
      setCustomBadges([]);
      setEarnedGlobalBadges([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  const onPickFile = (f: File | null) => {
    setCreateError(null);
    setFile(f);
  };

  const submit = async () => {
    setCreateError(null);

    if (!isLoggedIn()) {
      requestLogin();
      setCreateError("Please log in to create badges.");
      return;
    }

    if (!canCreate) {
      setCreateError(`You can create up to ${MAX_CUSTOM_BADGES} custom badges.`);
      return;
    }

    const n = name.trim();
    const d = description.trim();
    if (!n) {
      setCreateError("Please enter a badge name.");
      return;
    }
    if (!d) {
      setCreateError("Please enter a description.");
      return;
    }
    if (!file) {
      setCreateError("Please upload a badge logo (PNG/JPG).");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setCreateError("Logo must be an image file.");
      return;
    }

    try {
      setCreating(true);

      // 1) Get presigned URL from badges backend
      const { uploadUrl, key } = await getCustomBadgeLogoPresignedUrl({
        contentType: file.type,
      });

      // 2) Upload file to S3 via proxy (avoids CORS issues)
      const form = new FormData();
      form.append("uploadUrl", uploadUrl);
      form.append("contentType", file.type);
      form.append("file", file);

      const proxyRes = await fetch("/api/s3-upload", {
        method: "POST",
        body: form,
      });
      if (!proxyRes.ok) {
        const text = await proxyRes.text().catch(() => "");
        throw new Error(`Logo upload failed (${proxyRes.status}). ${text}`.trim());
      }

      // 3) Create custom badge record
      const created = await createCustomBadge({
        name: n,
        description: d,
        logoKey: key,
      });

      setCustomBadges((prev) => [created, ...prev].slice(0, MAX_CUSTOM_BADGES));
      setName("");
      setDescription("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setCreateError(formatError(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {/* Big hover/click preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-[32px] overflow-hidden border border-white/15 bg-gradient-to-br from-gray-950 via-gray-900 to-black shadow-2xl shadow-black/30">
              <div className="relative p-8 sm:p-10">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-pink-500/20 blur-3xl" />

                <div className="relative flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                      {preview.kind === "custom"
                        ? "Custom badge"
                        : preview.kind === "global_earned"
                          ? "Earned global badge"
                          : "Global badge"}
                    </p>
                    <h3 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                      {preview.badge.name}
                    </h3>
                    {preview.badge.description ? (
                      <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
                        {preview.badge.description}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                  >
                    Close
                  </button>
                </div>

                <div className="relative mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                  <div className="lg:col-span-3">
                    <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[520px] rounded-[28px] overflow-hidden border border-white/10 bg-white/5">
                      {resolveMediaUrl(preview.badge.logoKey) ? (
                        <Image
                          src={resolveMediaUrl(preview.badge.logoKey)!}
                          alt={`${preview.badge.name} logo`}
                          fill
                          className="object-contain p-6 sm:p-8"
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 92vw, 520px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/70 text-5xl">
                          ✦
                        </div>
                      )}
                    </div>
                    {preview.badge.logoKey ? (
                      <p className="mt-3 text-xs text-white/50 truncate">
                        key: {String(preview.badge.logoKey)}
                      </p>
                    ) : null}
                  </div>

                  <div className="lg:col-span-2">
                    {preview.kind !== "custom" ? (
                      <div className="rounded-[28px] border border-white/10 bg-black/25 p-6">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                          How to earn
                        </p>
                        <p className="mt-3 text-sm text-white/80 leading-relaxed">
                          {(typeof preview.badge.howToEarn === "string" &&
                            preview.badge.howToEarn.trim()) ||
                            "Earned automatically based on milestone rules (album uploads, reach, and more)."}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-white/10 bg-black/25 p-6">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                          About
                        </p>
                        <p className="mt-3 text-sm text-white/80 leading-relaxed">
                          This is a custom badge you created. You can assign it to
                          anyone (assignment UI coming next).
                        </p>
                      </div>
                    )}

                    <div className="mt-5 rounded-[28px] border border-white/10 bg-white/5 p-6">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                        Tip
                      </p>
                      <p className="mt-3 text-sm text-white/80 leading-relaxed">
                        Press <span className="font-semibold">Esc</span> to close.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-semibold">
            Badges
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Badges
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            Create up to <span className="font-semibold">{MAX_CUSTOM_BADGES}</span>{" "}
            custom badges — and collect global badges by hitting milestones.
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-black/5 bg-white shadow-sm px-4 py-3">
          <p className="text-xs text-gray-600">
            Remaining:{" "}
            <span className="font-semibold text-gray-900">{remaining}</span>
          </p>
        </div>
      </div>

      {/* Global badges */}
      <section className="mt-8 rounded-[32px] border border-black/5 bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white shadow-xl shadow-black/10 overflow-hidden">
        <div className="relative p-8">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl" />

          <div className="relative flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                Global badges
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Earned automatically
              </h2>
              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Global badges are created by admins and awarded based on milestones
                (album uploads, reach, and more).
              </p>
            </div>

            <button
              type="button"
              onClick={refreshGlobal}
              disabled={loadingGlobal}
              className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-60"
            >
              {loadingGlobal ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loadingGlobal ? (
            <div className="relative mt-6 rounded-3xl bg-white/5 border border-white/10 p-8 text-sm text-white/70">
              Loading global badges…
            </div>
          ) : loadGlobalError ? (
            <div className="relative mt-6 rounded-3xl bg-red-500/10 border border-red-400/20 p-8">
              <p className="text-sm font-semibold text-red-100">Couldn’t load global badges</p>
              <p className="mt-1 text-sm text-red-100/80">{loadGlobalError}</p>
            </div>
          ) : globalCatalog.length === 0 ? (
            <div className="relative mt-6 rounded-3xl bg-white/5 border border-white/10 p-8 text-sm text-white/70">
              No global badges published yet.
            </div>
          ) : (
            <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalCatalog.map((b) => {
                const logo = resolveMediaUrl(b.logoKey);
                const how =
                  (typeof b.howToEarn === "string" && b.howToEarn.trim()) ||
                  "Earned automatically based on milestone rules (album uploads, reach, and more).";
                return (
                  <div
                    key={b.id || `${b.name}-${b.logoKey || ""}`}
                    className="group rounded-3xl bg-white/5 border border-white/10 p-5 hover:bg-white/8 transition"
                  >
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        title="Preview badge"
                        onMouseEnter={() => setPreview({ kind: "global_catalog", badge: b })}
                        onClick={() => setPreview({ kind: "global_catalog", badge: b })}
                        className="relative w-14 h-14 rounded-2xl bg-white/10 border border-white/15 overflow-hidden shrink-0 cursor-zoom-in"
                      >
                        {logo ? (
                          <Image
                            src={logo}
                            alt={`${b.name} logo`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
                            ✦
                          </div>
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{b.name}</p>
                        {b.description ? (
                          <p className="mt-1 text-xs text-white/70 line-clamp-2">
                            {b.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/20 border border-white/10 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                        How to earn
                      </p>
                      <p className="mt-2 text-xs text-white/80 leading-relaxed">
                        {how}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Personal badges (custom + earned) */}
      {!isLoggedIn() ? (
        <div className="mt-8 rounded-3xl border border-black/5 bg-white shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900">Login required</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please log in to create and manage your custom badges, and to see which
            global badges you’ve earned.
          </p>
          <button
            type="button"
            onClick={requestLogin}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-black text-white px-5 py-2 text-sm font-semibold shadow-sm hover:bg-black/90"
          >
            Login / Sign up
          </button>
        </div>
      ) : (
        <>
          {/* Earned global badges */}
          <section className="mt-8 rounded-3xl border border-black/5 bg-white shadow-sm p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Earned global badges</h2>
                <p className="mt-1 text-sm text-gray-600">
                  These are global badges currently assigned to you.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshMine}
                className="rounded-full bg-white text-gray-700 px-4 py-2 text-xs font-semibold border border-black/10 hover:bg-black/5"
                disabled={loadingMine}
              >
                {loadingMine ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loadingMine ? (
              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-6 text-sm text-gray-600">
                Loading…
              </div>
            ) : loadMineError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6">
                <p className="text-sm font-semibold text-red-800">Couldn’t load your badges</p>
                <p className="mt-1 text-sm text-red-700">{loadMineError}</p>
              </div>
            ) : earnedGlobalBadges.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-6 text-sm text-gray-600">
                No global badges assigned yet.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {earnedGlobalBadges.map((b) => {
                  const logo = resolveMediaUrl(b.logoKey);
                  return (
                    <div
                      key={b.id || `${b.name}-${b.logoKey || ""}`}
                      className="rounded-3xl border border-black/5 bg-white shadow-sm p-5"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          title="Preview badge"
                          onMouseEnter={() => setPreview({ kind: "global_earned", badge: b })}
                          onClick={() => setPreview({ kind: "global_earned", badge: b })}
                          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-pink-50 border border-black/5 overflow-hidden shrink-0 cursor-zoom-in"
                        >
                          {logo ? (
                            <Image
                              src={logo}
                              alt={`${b.name} logo`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                              ✦
                            </div>
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {b.name}
                          </p>
                          {b.description ? (
                            <p className="mt-1 text-xs text-gray-600 line-clamp-3">
                              {b.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Create */}
          <section className="mt-8 rounded-3xl border border-black/5 bg-white shadow-sm p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Create a badge</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload a small logo and add a name + description.
                </p>
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={!canCreate || creating}
                className={[
                  "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold shadow-sm",
                  canCreate && !creating
                    ? "bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 text-white hover:opacity-95"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                ].join(" ")}
              >
                {creating ? "Creating…" : canCreate ? "Create badge" : "Limit reached"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-gray-700">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Hiking Buddy"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  maxLength={40}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-semibold text-gray-700">Description</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Personal badge"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  maxLength={140}
                />
              </label>

              <div className="md:col-span-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-gradient-to-br from-orange-50 via-white to-pink-50 px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
                      {file ? (
                        <Image
                          src={URL.createObjectURL(file)}
                          alt="Selected badge logo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          Logo
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Badge logo</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        PNG/JPG recommended. Square images look best.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full bg-black text-white px-4 py-2 text-xs font-semibold hover:bg-black/90"
                    >
                      Choose file
                    </button>
                    {file && (
                      <button
                        type="button"
                        onClick={() => onPickFile(null)}
                        className="rounded-full bg-white text-gray-700 px-4 py-2 text-xs font-semibold border border-black/10 hover:bg-black/5"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createError}
              </div>
            )}
          </section>

          {/* List */}
          <section className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Your badges</h2>
              <button
                type="button"
                onClick={refreshMine}
                className="rounded-full bg-white text-gray-700 px-4 py-2 text-xs font-semibold border border-black/10 hover:bg-black/5"
                disabled={loadingMine}
              >
                {loadingMine ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loadingMine ? (
              <div className="mt-4 rounded-3xl border border-black/5 bg-white shadow-sm p-8 text-sm text-gray-600">
                Loading badges…
              </div>
            ) : loadMineError ? (
              <div className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-8">
                <p className="text-sm font-semibold text-red-800">Couldn’t load badges</p>
                <p className="mt-1 text-sm text-red-700">{loadMineError}</p>
              </div>
            ) : customBadges.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-black/5 bg-white shadow-sm p-8">
                <p className="text-sm text-gray-600">
                  No custom badges yet. Create your first one above.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customBadges.map((b) => {
                  const logo = resolveMediaUrl(b.logoKey);
                  return (
                    <div
                      key={b.id || `${b.name}-${b.logoKey || ""}`}
                      className="rounded-3xl border border-black/5 bg-white shadow-sm p-5"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          title="Preview badge"
                          onMouseEnter={() => setPreview({ kind: "custom", badge: b })}
                          onClick={() => setPreview({ kind: "custom", badge: b })}
                          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 via-white to-pink-100 border border-black/5 overflow-hidden shrink-0 cursor-zoom-in"
                        >
                          {logo ? (
                            <Image
                              src={logo}
                              alt={`${b.name} logo`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                              🏷️
                            </div>
                          )}
                        </button>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {b.name}
                          </p>
                          {b.description ? (
                            <p className="mt-1 text-xs text-gray-600 line-clamp-3">
                              {b.description}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-500">No description</p>
                          )}
                          {b.logoKey ? (
                            <p className="mt-2 text-[11px] text-gray-400 truncate">
                              key: {b.logoKey}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

