"use client";

import { useState } from "react";
import { regenerateAlbumStory } from "@/lib/trailbookApi";

type AlbumStoryProps = {
  albumId?: string;
  initialStory?: string;
};

export default function AlbumStory({
  albumId,
  initialStory = "No story yet.",
}: AlbumStoryProps) {
  const [story, setStory] = useState(initialStory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRegenerate = Boolean(albumId);

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">The Story</h3>

        <p className="text-gray-600 leading-relaxed">{story}</p>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          disabled={!canRegenerate || loading}
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
      </div>
    </section>
  );
}
  