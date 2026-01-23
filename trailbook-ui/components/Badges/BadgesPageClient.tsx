"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
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
    <main 
      className="max-w-6xl mx-auto px-6 py-10 transition-colors duration-300"
      style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-text-primary)" }}
    >
      {/* Big hover/click preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] backdrop-blur-sm transition-colors duration-300"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="rounded-[32px] overflow-hidden border shadow-2xl transition-colors duration-300"
              style={{
                borderColor: "var(--theme-border)",
                backgroundColor: isDefault ? "rgb(17, 24, 39)" : "var(--theme-surface)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div className="relative p-8 sm:p-10">
                {isDefault ? (
                  <>
                    <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-pink-500/20 blur-3xl" />
                  </>
                ) : (
                  <>
                    <div
                      className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl"
                      style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
                    />
                    <div
                      className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl"
                      style={{ backgroundColor: "var(--theme-info)", opacity: 0.1 }}
                    />
                  </>
                )}

                <div className="relative flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p 
                      className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                      style={{ color: isDefault ? "rgba(255, 255, 255, 0.6)" : "var(--theme-text-tertiary)" }}
                    >
                      {preview.kind === "custom"
                        ? "Custom badge"
                        : preview.kind === "global_earned"
                          ? "Earned global badge"
                          : "Global badge"}
                    </p>
                    <h3 
                      className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight"
                      style={{ color: isDefault ? "white" : "var(--theme-text-primary)" }}
                    >
                      {preview.badge.name}
                    </h3>
                    {preview.badge.description ? (
                      <p 
                        className="mt-3 text-sm sm:text-base leading-relaxed max-w-2xl"
                        style={{ color: isDefault ? "rgba(255, 255, 255, 0.8)" : "var(--theme-text-secondary)" }}
                      >
                        {preview.badge.description}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition"
                    style={{
                      backgroundColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-surface-hover)",
                      color: isDefault ? "white" : "var(--theme-text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDefault ? "rgba(255, 255, 255, 0.15)" : "var(--theme-surface-elevated)";
                      e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-surface-hover)";
                      e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-secondary)";
                    }}
                  >
                    Close
                  </button>
                </div>

                <div className="relative mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                  <div className="lg:col-span-3">
                    <div 
                      className="relative w-full h-[360px] sm:h-[440px] lg:h-[520px] rounded-[28px] overflow-hidden border transition-colors duration-300"
                      style={{
                        borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                        backgroundColor: isDefault ? "rgba(255, 255, 255, 0.05)" : "var(--theme-surface-elevated)",
                      }}
                    >
                      {resolveMediaUrl(preview.badge.logoKey) ? (
                        <Image
                          src={resolveMediaUrl(preview.badge.logoKey)!}
                          alt={`${preview.badge.name} logo`}
                          fill
                          className="object-contain p-6 sm:p-8"
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 92vw, 520px"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-5xl"
                          style={{ color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-tertiary)" }}
                        >
                          ✦
                        </div>
                      )}
                    </div>
                    {preview.badge.logoKey ? (
                      <p 
                        className="mt-3 text-xs truncate"
                        style={{ color: isDefault ? "rgba(255, 255, 255, 0.5)" : "var(--theme-text-tertiary)" }}
                      >
                        key: {String(preview.badge.logoKey)}
                      </p>
                    ) : null}
                  </div>

                  <div className="lg:col-span-2">
                    {preview.kind !== "custom" ? (
                      <div 
                        className="rounded-[28px] border p-6 transition-colors duration-300"
                        style={{
                          borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                          backgroundColor: isDefault ? "rgba(0, 0, 0, 0.25)" : "var(--theme-surface)",
                        }}
                      >
                        <p 
                          className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                          style={{ color: isDefault ? "rgba(255, 255, 255, 0.6)" : "var(--theme-text-tertiary)" }}
                        >
                          How to earn
                        </p>
                        <p 
                          className="mt-3 text-sm leading-relaxed"
                          style={{ color: isDefault ? "rgba(255, 255, 255, 0.8)" : "var(--theme-text-secondary)" }}
                        >
                          {(typeof preview.badge.howToEarn === "string" &&
                            preview.badge.howToEarn.trim()) ||
                            "Earned automatically based on milestone rules (album uploads, reach, and more)."}
                        </p>
                      </div>
                    ) : (
                      <div 
                        className="rounded-[28px] border p-6 transition-colors duration-300"
                        style={{
                          borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                          backgroundColor: isDefault ? "rgba(0, 0, 0, 0.25)" : "var(--theme-surface)",
                        }}
                      >
                        <p 
                          className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                          style={{ color: isDefault ? "rgba(255, 255, 255, 0.6)" : "var(--theme-text-tertiary)" }}
                        >
                          About
                        </p>
                        <p 
                          className="mt-3 text-sm leading-relaxed"
                          style={{ color: isDefault ? "rgba(255, 255, 255, 0.8)" : "var(--theme-text-secondary)" }}
                        >
                          This is a custom badge you created. You can assign it to
                          anyone (assignment UI coming next).
                        </p>
                      </div>
                    )}

                    <div 
                      className="mt-5 rounded-[28px] border p-6 transition-colors duration-300"
                      style={{
                        borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                        backgroundColor: isDefault ? "rgba(255, 255, 255, 0.05)" : "var(--theme-surface-elevated)",
                      }}
                    >
                      <p 
                        className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                        style={{ color: isDefault ? "rgba(255, 255, 255, 0.6)" : "var(--theme-text-tertiary)" }}
                      >
                        Tip
                      </p>
                      <p 
                        className="mt-3 text-sm leading-relaxed"
                        style={{ color: isDefault ? "rgba(255, 255, 255, 0.8)" : "var(--theme-text-secondary)" }}
                      >
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
          <p 
            className="text-[10px] uppercase tracking-[0.3em] font-semibold"
            style={{ color: "var(--theme-text-tertiary)" }}
          >
            Badges
          </p>
          <h1 
            className="mt-2 text-3xl font-bold tracking-tight"
            style={{ color: "var(--theme-text-primary)" }}
          >
            Badges
          </h1>
          <p 
            className="mt-2 text-sm max-w-2xl"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            Create up to <span className="font-semibold">{MAX_CUSTOM_BADGES}</span>{" "}
            custom badges — and collect global badges by hitting milestones.
          </p>
        </div>

        <div 
          className="shrink-0 rounded-2xl border shadow-sm px-4 py-3 transition-colors duration-300"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-surface)",
          }}
        >
          <p 
            className="text-xs"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            Remaining:{" "}
            <span 
              className="font-semibold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              {remaining}
            </span>
          </p>
        </div>
      </div>

      {/* Global badges */}
      <section 
        className="mt-8 rounded-[32px] border text-white shadow-xl overflow-hidden transition-colors duration-300"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: isDefault ? "rgb(17, 24, 39)" : "var(--theme-surface)",
          boxShadow: "0 20px 25px -5px var(--theme-shadow-strong), 0 10px 10px -5px var(--theme-shadow)",
        }}
      >
        <div className="relative p-8">
          {isDefault ? (
            <>
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl" />
            </>
          ) : (
            <>
              <div
                className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl"
                style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
              />
              <div
                className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl"
                style={{ backgroundColor: "var(--theme-info)", opacity: 0.1 }}
              />
            </>
          )}

          <div className="relative flex items-start justify-between gap-6">
            <div>
              <p 
                className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                style={{ color: isDefault ? "rgba(255, 255, 255, 0.6)" : "var(--theme-text-tertiary)" }}
              >
                Global badges
              </p>
              <h2 
                className="mt-2 text-2xl font-semibold tracking-tight"
                style={{ color: isDefault ? "white" : "var(--theme-text-primary)" }}
              >
                Earned automatically
              </h2>
              <p 
                className="mt-2 text-sm max-w-2xl"
                style={{ color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)" }}
              >
                Global badges are created by admins and awarded based on milestones
                (album uploads, reach, and more).
              </p>
            </div>

            <button
              type="button"
              onClick={refreshGlobal}
              disabled={loadingGlobal}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-60"
              style={{
                backgroundColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-surface-hover)",
                color: isDefault ? "white" : "var(--theme-text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!loadingGlobal) {
                  e.currentTarget.style.backgroundColor = isDefault ? "rgba(255, 255, 255, 0.15)" : "var(--theme-surface-elevated)";
                  e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loadingGlobal) {
                  e.currentTarget.style.backgroundColor = isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-surface-hover)";
                  e.currentTarget.style.color = isDefault ? "white" : "var(--theme-text-secondary)";
                }
              }}
            >
              {loadingGlobal ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loadingGlobal ? (
            <div 
              className="relative mt-6 rounded-3xl border p-8 text-sm transition-colors duration-300"
              style={{
                borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                backgroundColor: isDefault ? "rgba(255, 255, 255, 0.05)" : "var(--theme-surface-elevated)",
                color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)",
              }}
            >
              Loading global badges…
            </div>
          ) : loadGlobalError ? (
            <div 
              className="relative mt-6 rounded-3xl border p-8 transition-colors duration-300"
              style={{
                borderColor: "var(--theme-error)",
                backgroundColor: "var(--theme-error)",
                opacity: 0.1,
              }}
            >
              <p 
                className="text-sm font-semibold"
                style={{ color: "var(--theme-error)" }}
              >
                Couldn't load global badges
              </p>
              <p 
                className="mt-1 text-sm"
                style={{ color: "var(--theme-error)", opacity: 0.8 }}
              >
                {loadGlobalError}
              </p>
            </div>
          ) : globalCatalog.length === 0 ? (
            <div 
              className="relative mt-6 rounded-3xl border p-8 text-sm transition-colors duration-300"
              style={{
                borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                backgroundColor: isDefault ? "rgba(255, 255, 255, 0.05)" : "var(--theme-surface-elevated)",
                color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)",
              }}
            >
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
                    className="group rounded-3xl border p-5 transition"
                    style={{
                      borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                      backgroundColor: isDefault ? "rgba(255, 255, 255, 0.05)" : "var(--theme-surface-elevated)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDefault ? "rgba(255, 255, 255, 0.08)" : "var(--theme-surface-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDefault ? "rgba(255, 255, 255, 0.05)" : "var(--theme-surface-elevated)";
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        title="Preview badge"
                        onMouseEnter={() => setPreview({ kind: "global_catalog", badge: b })}
                        onClick={() => setPreview({ kind: "global_catalog", badge: b })}
                        className="relative w-14 h-14 rounded-2xl border overflow-hidden shrink-0 cursor-zoom-in transition-colors duration-300"
                        style={{
                          borderColor: isDefault ? "rgba(255, 255, 255, 0.15)" : "var(--theme-border)",
                          backgroundColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-surface)",
                        }}
                      >
                        {logo ? (
                          <Image
                            src={logo}
                            alt={`${b.name} logo`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-sm"
                            style={{ color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-tertiary)" }}
                          >
                            ✦
                          </div>
                        )}
                      </button>
                      <div className="min-w-0">
                        <p 
                          className="text-sm font-semibold truncate"
                          style={{ color: isDefault ? "white" : "var(--theme-text-primary)" }}
                        >
                          {b.name}
                        </p>
                        {b.description ? (
                          <p 
                            className="mt-1 text-xs line-clamp-2"
                            style={{ color: isDefault ? "rgba(255, 255, 255, 0.7)" : "var(--theme-text-secondary)" }}
                          >
                            {b.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div 
                      className="mt-4 rounded-2xl border px-4 py-3 transition-colors duration-300"
                      style={{
                        borderColor: isDefault ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
                        backgroundColor: isDefault ? "rgba(0, 0, 0, 0.2)" : "var(--theme-surface)",
                      }}
                    >
                      <p 
                        className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                        style={{ color: isDefault ? "rgba(255, 255, 255, 0.6)" : "var(--theme-text-tertiary)" }}
                      >
                        How to earn
                      </p>
                      <p 
                        className="mt-2 text-xs leading-relaxed"
                        style={{ color: isDefault ? "rgba(255, 255, 255, 0.8)" : "var(--theme-text-secondary)" }}
                      >
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
        <div 
          className="mt-8 rounded-3xl border shadow-sm p-8 transition-colors duration-300"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-surface)",
          }}
        >
          <h2 
            className="text-lg font-semibold"
            style={{ color: "var(--theme-text-primary)" }}
          >
            Login required
          </h2>
          <p 
            className="mt-2 text-sm"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            Please log in to create and manage your custom badges, and to see which
            global badges you've earned.
          </p>
          <button
            type="button"
            onClick={requestLogin}
            className="mt-5 inline-flex items-center justify-center rounded-full text-white px-5 py-2 text-sm font-semibold shadow-sm transition"
            style={{
              background: isDefault ? "black" : "var(--theme-gradient-primary)",
            }}
            onMouseEnter={(e) => {
              if (isDefault) {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
              }
            }}
            onMouseLeave={(e) => {
              if (isDefault) {
                e.currentTarget.style.backgroundColor = "black";
              }
            }}
          >
            Login / Sign up
          </button>
        </div>
      ) : (
        <>
          {/* Earned global badges */}
          <section 
            className="mt-8 rounded-3xl border shadow-sm p-8 transition-colors duration-300"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-surface)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 
                  className="text-lg font-semibold"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  Earned global badges
                </h2>
                <p 
                  className="mt-1 text-sm"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  These are global badges currently assigned to you.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshMine}
                className="rounded-full px-4 py-2 text-xs font-semibold border transition disabled:opacity-60"
                style={{
                  backgroundColor: "var(--theme-surface)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!loadingMine) {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loadingMine) {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                  }
                }}
                disabled={loadingMine}
              >
                {loadingMine ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loadingMine ? (
              <div 
                className="mt-4 rounded-2xl border p-6 text-sm transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface-elevated)",
                  color: "var(--theme-text-secondary)",
                }}
              >
                Loading…
              </div>
            ) : loadMineError ? (
              <div 
                className="mt-4 rounded-2xl border p-6 transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-error)",
                  backgroundColor: "var(--theme-error)",
                  opacity: 0.1,
                }}
              >
                <p 
                  className="text-sm font-semibold"
                  style={{ color: "var(--theme-error)" }}
                >
                  Couldn't load your badges
                </p>
                <p 
                  className="mt-1 text-sm"
                  style={{ color: "var(--theme-error)", opacity: 0.8 }}
                >
                  {loadMineError}
                </p>
              </div>
            ) : earnedGlobalBadges.length === 0 ? (
              <div 
                className="mt-4 rounded-2xl border p-6 text-sm transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface-elevated)",
                  color: "var(--theme-text-secondary)",
                }}
              >
                No global badges assigned yet.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {earnedGlobalBadges.map((b) => {
                  const logo = resolveMediaUrl(b.logoKey);
                  return (
                    <div
                      key={b.id || `${b.name}-${b.logoKey || ""}`}
                      className="rounded-3xl border shadow-sm p-5 transition-colors duration-300"
                      style={{
                        borderColor: "var(--theme-border)",
                        backgroundColor: "var(--theme-surface)",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          title="Preview badge"
                          onMouseEnter={() => setPreview({ kind: "global_earned", badge: b })}
                          onClick={() => setPreview({ kind: "global_earned", badge: b })}
                          className="relative w-14 h-14 rounded-2xl border overflow-hidden shrink-0 cursor-zoom-in transition-colors duration-300"
                          style={{
                            borderColor: "var(--theme-border)",
                            backgroundColor: isDefault ? "rgb(238, 242, 255)" : "var(--theme-surface-elevated)",
                          }}
                        >
                          {logo ? (
                            <Image
                              src={logo}
                              alt={`${b.name} logo`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-sm"
                              style={{ color: "var(--theme-text-tertiary)" }}
                            >
                              ✦
                            </div>
                          )}
                        </button>
                        <div className="min-w-0">
                          <p 
                            className="text-sm font-semibold truncate"
                            style={{ color: "var(--theme-text-primary)" }}
                          >
                            {b.name}
                          </p>
                          {b.description ? (
                            <p 
                              className="mt-1 text-xs line-clamp-3"
                              style={{ color: "var(--theme-text-secondary)" }}
                            >
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
          <section 
            className="mt-8 rounded-3xl border shadow-sm p-8 transition-colors duration-300"
            style={{
              borderColor: "var(--theme-border)",
              backgroundColor: "var(--theme-surface)",
            }}
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 
                  className="text-lg font-semibold"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  Create a badge
                </h2>
                <p 
                  className="mt-1 text-sm"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  Upload a small logo and add a name + description.
                </p>
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={!canCreate || creating}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={
                  canCreate && !creating
                    ? {
                        background: isDefault 
                          ? "linear-gradient(to right, #f97316, #ec4899, #ef4444)" 
                          : "var(--theme-gradient-primary)",
                        color: "var(--theme-text-inverse)",
                        boxShadow: isDefault 
                          ? "0 1px 3px rgba(249, 115, 22, 0.2)" 
                          : "0 1px 3px var(--theme-shadow)",
                      }
                    : {
                        backgroundColor: "var(--theme-surface-hover)",
                        color: "var(--theme-text-tertiary)",
                      }
                }
                onMouseEnter={(e) => {
                  if (canCreate && !creating) {
                    e.currentTarget.style.opacity = "0.95";
                  }
                }}
                onMouseLeave={(e) => {
                  if (canCreate && !creating) {
                    e.currentTarget.style.opacity = "1";
                  }
                }}
              >
                {creating ? "Creating…" : canCreate ? "Create badge" : "Limit reached"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span 
                  className="text-xs font-semibold"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Hiking Buddy"
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors duration-300"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: "var(--theme-surface-elevated)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                    e.currentTarget.style.boxShadow = isDefault 
                      ? "0 0 0 2px rgba(249, 115, 22, 0.2)" 
                      : "0 0 0 2px var(--theme-accent-light)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  maxLength={40}
                />
              </label>

              <label className="block md:col-span-2">
                <span 
                  className="text-xs font-semibold"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  Description
                </span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Personal badge"
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors duration-300"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: "var(--theme-surface-elevated)",
                    color: "var(--theme-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
                    e.currentTarget.style.boxShadow = isDefault 
                      ? "0 0 0 2px rgba(249, 115, 22, 0.2)" 
                      : "0 0 0 2px var(--theme-accent-light)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--theme-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  maxLength={140}
                />
              </label>

              <div className="md:col-span-3">
                <div 
                  className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-4 transition-colors duration-300"
                  style={{
                    borderColor: "var(--theme-border)",
                    backgroundColor: isDefault ? "rgb(255, 247, 237)" : "var(--theme-surface-elevated)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="relative w-14 h-14 rounded-2xl shadow-sm border overflow-hidden transition-colors duration-300"
                      style={{
                        borderColor: "var(--theme-border)",
                        backgroundColor: "var(--theme-surface)",
                      }}
                    >
                      {file ? (
                        <Image
                          src={URL.createObjectURL(file)}
                          alt="Selected badge logo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-sm"
                          style={{ color: "var(--theme-text-tertiary)" }}
                        >
                          Logo
                        </div>
                      )}
                    </div>
                    <div>
                      <p 
                        className="text-sm font-semibold"
                        style={{ color: "var(--theme-text-primary)" }}
                      >
                        Badge logo
                      </p>
                      <p 
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
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
                      className="rounded-full text-white px-4 py-2 text-xs font-semibold transition"
                      style={{
                        background: isDefault ? "black" : "var(--theme-gradient-primary)",
                      }}
                      onMouseEnter={(e) => {
                        if (isDefault) {
                          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
                        } else {
                          e.currentTarget.style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isDefault) {
                          e.currentTarget.style.backgroundColor = "black";
                        } else {
                          e.currentTarget.style.opacity = "1";
                        }
                      }}
                    >
                      Choose file
                    </button>
                    {file && (
                      <button
                        type="button"
                        onClick={() => onPickFile(null)}
                        className="rounded-full border px-4 py-2 text-xs font-semibold transition"
                        style={{
                          backgroundColor: "var(--theme-surface)",
                          borderColor: "var(--theme-border)",
                          color: "var(--theme-text-primary)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {createError && (
              <div 
                className="mt-4 rounded-2xl border px-4 py-3 text-sm transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-error)",
                  backgroundColor: "var(--theme-error)",
                  opacity: 0.1,
                  color: "var(--theme-error)",
                }}
              >
                {createError}
              </div>
            )}
          </section>

          {/* List */}
          <section className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 
                className="text-lg font-semibold"
                style={{ color: "var(--theme-text-primary)" }}
              >
                Your badges
              </h2>
              <button
                type="button"
                onClick={refreshMine}
                className="rounded-full px-4 py-2 text-xs font-semibold border transition disabled:opacity-60"
                style={{
                  backgroundColor: "var(--theme-surface)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!loadingMine) {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loadingMine) {
                    e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                  }
                }}
                disabled={loadingMine}
              >
                {loadingMine ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loadingMine ? (
              <div 
                className="mt-4 rounded-3xl border shadow-sm p-8 text-sm transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface)",
                  color: "var(--theme-text-secondary)",
                }}
              >
                Loading badges…
              </div>
            ) : loadMineError ? (
              <div 
                className="mt-4 rounded-3xl border p-8 transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-error)",
                  backgroundColor: "var(--theme-error)",
                  opacity: 0.1,
                }}
              >
                <p 
                  className="text-sm font-semibold"
                  style={{ color: "var(--theme-error)" }}
                >
                  Couldn't load badges
                </p>
                <p 
                  className="mt-1 text-sm"
                  style={{ color: "var(--theme-error)", opacity: 0.8 }}
                >
                  {loadMineError}
                </p>
              </div>
            ) : customBadges.length === 0 ? (
              <div 
                className="mt-4 rounded-3xl border shadow-sm p-8 transition-colors duration-300"
                style={{
                  borderColor: "var(--theme-border)",
                  backgroundColor: "var(--theme-surface)",
                }}
              >
                <p 
                  className="text-sm"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
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
                      className="rounded-3xl border shadow-sm p-5 transition-colors duration-300"
                      style={{
                        borderColor: "var(--theme-border)",
                        backgroundColor: "var(--theme-surface)",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          title="Preview badge"
                          onMouseEnter={() => setPreview({ kind: "custom", badge: b })}
                          onClick={() => setPreview({ kind: "custom", badge: b })}
                          className="relative w-14 h-14 rounded-2xl border overflow-hidden shrink-0 cursor-zoom-in transition-colors duration-300"
                          style={{
                            borderColor: "var(--theme-border)",
                            backgroundColor: isDefault ? "rgb(255, 237, 213)" : "var(--theme-surface-elevated)",
                          }}
                        >
                          {logo ? (
                            <Image
                              src={logo}
                              alt={`${b.name} logo`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-sm"
                              style={{ color: "var(--theme-text-tertiary)" }}
                            >
                              🏷️
                            </div>
                          )}
                        </button>

                        <div className="min-w-0">
                          <p 
                            className="text-sm font-semibold truncate"
                            style={{ color: "var(--theme-text-primary)" }}
                          >
                            {b.name}
                          </p>
                          {b.description ? (
                            <p 
                              className="mt-1 text-xs line-clamp-3"
                              style={{ color: "var(--theme-text-secondary)" }}
                            >
                              {b.description}
                            </p>
                          ) : (
                            <p 
                              className="mt-1 text-xs"
                              style={{ color: "var(--theme-text-tertiary)" }}
                            >
                              No description
                            </p>
                          )}
                          {b.logoKey ? (
                            <p 
                              className="mt-2 text-[11px] truncate"
                              style={{ color: "var(--theme-text-tertiary)" }}
                            >
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

