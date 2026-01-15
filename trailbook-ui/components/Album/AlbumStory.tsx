"use client";

import { useState } from "react";
import { regenerateAlbumStory } from "@/lib/trailbookApi";
import { usePublicAlbumGate } from "@/components/Share/PublicAlbumGate";

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
  const gate = usePublicAlbumGate();
  const locked = gate?.locked === true;

  const [story, setStory] = useState(initialStory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRegenerate = Boolean(albumId);
  const previewChars = 650;
  const effectiveStory = locked ? truncateStory(story, previewChars) : story;
  const isTruncated = locked && story.trim().length > effectiveStory.trim().length;

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">The Story</h3>

        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{effectiveStory}</p>

        {isTruncated && (
          <div className="mt-5 rounded-2xl border border-black/5 bg-gradient-to-br from-gray-50 to-white p-4">
            <p className="text-sm text-gray-700 font-semibold">Continue reading</p>
            <p className="mt-1 text-sm text-gray-600">
              Sign up to read the full story and revisit this chapter anytime.
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("tb:open-auth"))}
              className="mt-3 rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20 hover:opacity-95 transition"
            >
              Login / Sign up
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {canRegenerate && !locked && (
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
                setError("Couldn’t regenerate story. Please try again.");
              } finally {
                setLoading(false);
              }
            }}
            className="mt-4 text-sm text-orange-500 hover:underline disabled:opacity-60 disabled:hover:no-underline"
          >
            {loading ? "Regenerating…" : "Regenerate story"}
          </button>
        )}
      </div>
    </section>
  );
}
  