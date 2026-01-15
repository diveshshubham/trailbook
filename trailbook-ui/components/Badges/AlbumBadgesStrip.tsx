"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  assignCustomBadgeToAlbum,
  listMyCustomBadges,
  listPublicAlbumBadges,
  type AlbumBadgeAssignment,
  type CustomBadge,
} from "@/lib/badgesApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { ApiError } from "@/lib/api";

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

export default function AlbumBadgesStrip({
  albumId,
  canAssign = false,
}: {
  albumId: string;
  canAssign?: boolean;
}) {
  const [items, setItems] = useState<AlbumBadgeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<AlbumBadgeAssignment | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [myBadges, setMyBadges] = useState<CustomBadge[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const selectedBadge = useMemo(
    () => myBadges.find((b) => b.id === selectedBadgeId) || null,
    [myBadges, selectedBadgeId]
  );

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPublicAlbumBadges({ albumId });
      setItems(res.items || []);
    } catch (e) {
      setError(formatError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  useEffect(() => {
    if (!assignOpen) return;
    if (!canAssign) return;
    if (!isLoggedIn()) return;
    let cancelled = false;
    const run = async () => {
      setLoadingMine(true);
      setMineError(null);
      try {
        const list = await listMyCustomBadges();
        if (!cancelled) setMyBadges(list);
      } catch (e) {
        if (!cancelled) setMineError(formatError(e));
      } finally {
        if (!cancelled) setLoadingMine(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [assignOpen, canAssign]);

  const submitAssign = async () => {
    setAssignError(null);

    if (!isLoggedIn()) {
      requestLogin();
      setAssignError("Please log in to assign a badge.");
      return;
    }

    const badgeId = selectedBadgeId || "";
    const uid = assigneeUserId.trim();
    if (!badgeId) {
      setAssignError("Pick a custom badge to assign.");
      return;
    }
    if (!uid) {
      setAssignError("Enter the assignee user id.");
      return;
    }

    try {
      setAssigning(true);
      await assignCustomBadgeToAlbum({ albumId, badgeId, assigneeUserId: uid });
      setAssignOpen(false);
      setSelectedBadgeId(null);
      setAssigneeUserId("");
      await refresh();
    } catch (e) {
      setAssignError(formatError(e));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-black/5 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
            Album badges
          </p>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Curated recognition — assign a custom badge to a person who shaped this story.
          </p>
        </div>

        {canAssign && (
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn()) {
                requestLogin();
                return;
              }
              setAssignOpen(true);
              setAssignError(null);
            }}
            className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold bg-gradient-to-r from-gray-900 to-black text-white shadow-lg shadow-black/10 hover:opacity-95 active:scale-[0.99] transition"
          >
            Assign badge
          </button>
        )}
      </div>

      <div className="px-6 pb-6">
        {error ? (
          <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-sm border border-orange-100">
            {error}
          </div>
        ) : loading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 w-56 rounded-2xl border border-black/5 bg-gray-50 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-gray-50 to-white px-5 py-5">
            <p className="text-sm text-gray-700 font-semibold">No badges assigned yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              When badges are assigned, they’ll appear here — tap one to see who it’s for.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {items.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setPreview(a)}
                className="shrink-0 w-[min(360px,82vw)] rounded-2xl border border-black/5 bg-white hover:bg-gray-50 transition p-3 flex items-center gap-3 text-left"
              >
                <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-black/10 bg-gray-100">
                  {resolveMediaUrl(a.badge.logoKey) ? (
                    <Image
                      src={resolveMediaUrl(a.badge.logoKey)!}
                      alt={`${a.badge.name} logo`}
                      fill
                      className="object-contain p-1.5"
                      sizes="40px"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-gray-500 text-lg">✦</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.badge.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    Assigned to {a.assignee?.name || "someone"}
                  </p>
                </div>

                <div className="relative h-9 w-9 rounded-full overflow-hidden border border-black/10 bg-gray-100">
                  {resolveMediaUrl(a.assignee?.profilePicture) ? (
                    <Image
                      src={resolveMediaUrl(a.assignee.profilePicture)!}
                      alt={a.assignee?.name || "Assignee"}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-gray-600 text-xs font-semibold">
                      {(a.assignee?.name || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Badge preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-[32px] overflow-hidden border border-white/15 bg-gradient-to-br from-gray-950 via-gray-900 to-black shadow-2xl shadow-black/30">
              <div className="relative p-8 sm:p-10">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-pink-500/20 blur-3xl" />

                <div className="relative flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                      Album badge
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
                    <div className="relative w-full h-[320px] sm:h-[420px] rounded-[28px] overflow-hidden border border-white/10 bg-white/5">
                      {resolveMediaUrl(preview.badge.logoKey) ? (
                        <Image
                          src={resolveMediaUrl(preview.badge.logoKey)!}
                          alt={`${preview.badge.name} logo`}
                          fill
                          className="object-contain p-6 sm:p-8"
                          sizes="(max-width: 1024px) 92vw, 520px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/70 text-5xl">
                          ✦
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                        Awarded to
                      </p>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden border border-white/10 bg-white/10">
                          {resolveMediaUrl(preview.assignee.profilePicture) ? (
                            <Image
                              src={resolveMediaUrl(preview.assignee.profilePicture)!}
                              alt={preview.assignee.name || "Assignee"}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-white/80 text-sm font-semibold">
                              {(preview.assignee.name || "U").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-base font-semibold truncate">
                            {preview.assignee.name || "Anonymous"}
                          </p>
                          <p className="text-white/60 text-xs truncate">
                            {preview.createdAt ? `Assigned ${new Date(preview.createdAt).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="text-white/70 text-sm leading-relaxed">
                          This badge is a signature token — designed by the album owner, and publicly attributed to its recipient.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal (owner only) */}
      {assignOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAssignOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <aside className="absolute top-0 right-0 bottom-0 w-[460px] max-w-[92vw] bg-white/95 backdrop-blur-xl border-l border-black/10 shadow-2xl">
            <div className="px-6 pt-6 pb-5 border-b border-black/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                  Assign badge
                </p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-gray-900">
                  Award a custom badge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="h-10 w-10 rounded-full bg-black/5 hover:bg-black/10 transition grid place-items-center"
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 overflow-auto h-full pb-32">
              {mineError && (
                <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-sm border border-orange-100">
                  {mineError}
                </div>
              )}

              <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-gray-50 to-white p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                  Pick a badge
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Only your custom badges can be assigned to this album.
                </p>

                {loadingMine ? (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-2xl bg-white border border-black/5 animate-pulse" />
                    ))}
                  </div>
                ) : myBadges.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-white border border-black/5 px-4 py-4 text-sm text-gray-700">
                    You don’t have any custom badges yet. Create one from the Badges page, then come back here.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {myBadges.map((b) => {
                      const selected = selectedBadgeId === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBadgeId(b.id)}
                          className={[
                            "rounded-2xl border px-4 py-3 flex items-center gap-3 text-left transition",
                            selected ? "border-black/20 bg-white" : "border-black/5 bg-white hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-black/10 bg-gray-100 shrink-0">
                            {resolveMediaUrl(b.logoKey) ? (
                              <Image
                                src={resolveMediaUrl(b.logoKey)!}
                                alt={`${b.name} logo`}
                                fill
                                className="object-contain p-2"
                                sizes="44px"
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-gray-500 text-lg">
                                ✦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                            <p className="text-xs text-gray-500 truncate">{b.description || ""}</p>
                          </div>
                          <div
                            className={[
                              "h-5 w-5 rounded-full border grid place-items-center text-[10px] font-bold",
                              selected ? "bg-black text-white border-black/30" : "bg-white text-gray-400 border-black/10",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold">
                  Assignee user id
                </span>
                <input
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Paste user id (Mongo ObjectId)"
                />
                <p className="mt-2 text-xs text-gray-500">
                  This will be visible publicly on the album badge.
                </p>
              </label>

              {assignError && (
                <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-sm border border-orange-100">
                  {assignError}
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-black/5">
              <button
                type="button"
                disabled={assigning || !selectedBadge || !assigneeUserId.trim()}
                onClick={submitAssign}
                className="w-full rounded-full px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60"
              >
                {assigning ? "Assigning…" : `Assign${selectedBadge ? ` “${selectedBadge.name}”` : ""}`}
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

