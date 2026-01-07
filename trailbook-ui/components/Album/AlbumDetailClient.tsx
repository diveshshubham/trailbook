"use client";

import { useEffect, useMemo, useState } from "react";
import AlbumHero from "@/components/Album/AlbumHero";
import AlbumStory from "@/components/Album/AlbumStory";
import AlbumPhotos from "@/components/Album/AlbumPhotos";
import { getAlbumMedia, getMyAlbums, type Album, type MediaItem } from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { useRouter } from "next/navigation";

function formatSubtitle(createdAt?: string, location?: string) {
  const parts: string[] = [];
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push(d.toLocaleString(undefined, { month: "long", year: "numeric" }));
    }
  }
  if (location) parts.push(location);
  return parts.join(" · ");
}

const DEMO_ALBUM: Album = {
  id: "demo",
  title: "Majestic Himalayan Expedition",
  description: "A journey through the peaks of silence and snow.",
  coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
  createdAt: new Date().toISOString(),
  location: "Uttarakhand, India",
  isPublic: true,
  story:
    "Each step was a testament to human spirit. The air grew thin, the cold bit deep, but the view from the summit made every struggle worth it. These are the fragments of that frozen time.",
};

export default function AlbumDetailClient({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideshowToken, setSlideshowToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [albums, mediaData] = await Promise.all([
          getMyAlbums(),
          getAlbumMedia(albumId),
        ]);

        const found = albums.find((a) => a.id === albumId || a._id === albumId) || null;

        if (!cancelled) {
          setAlbum(found);
          setMedia(mediaData);
          if (!found) setError("Album not found.");
        }
      } catch (e) {
        if (!cancelled) {
          setError("Couldn’t load this album from the server. Showing a demo preview.");
          setAlbum(DEMO_ALBUM);
          setMedia([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  const photos = useMemo(() => {
    return media
      .map((m) => resolveMediaUrl(m.url || m.key))
      .filter(Boolean) as string[];
  }, [media]);

  const title = album?.title || album?.name || "Untitled story";
  const subtitle = formatSubtitle(album?.createdAt, album?.location);
  const coverUrl =
    resolveMediaUrl(album?.coverImage || album?.coverUrl || album?.cover) || photos[0];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-gray-500">Loading your album…</p>
      </main>
    );
  }

  return (
    <main className="bg-[#fafafa] min-h-screen">
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-sm border border-orange-100">
            {error}
          </div>
        </div>
      )}

      <AlbumHero
        title={title}
        coverUrl={coverUrl}
        subtitle={subtitle || undefined}
        isPublic={album?.isPublic}
      />

      <div className="max-w-7xl mx-auto -mt-10 relative z-10 px-6">
        <AlbumStory albumId={albumId} initialStory={album?.story} />

        <div className="mt-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gallery</h2>
              <p className="text-gray-500 text-sm mt-1">Capture. Preserve. Share.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSlideshowToken((n) => n + 1);
                }}
                disabled={photos.length === 0}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide bg-white border border-black/5 shadow-sm hover:shadow-md transition disabled:opacity-40"
                title="Start slideshow"
              >
                <span className="text-gray-800">▶</span>
                <span className="text-gray-700">Slideshow</span>
              </button>

              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide bg-white border border-black/5 shadow-sm hover:shadow-md transition"
              >
                <span className="text-gray-800">←</span>
                <span className="text-gray-700">Back to library</span>
              </button>
            </div>
          </div>

          <AlbumPhotos
            albumId={albumId}
            photos={photos}
            showUpload
            slideshowToken={slideshowToken}
          />
        </div>
      </div>

      <footer className="py-20 text-center text-gray-400 text-xs tracking-widest uppercase">
        © 2026 Trailbook Storyteller
      </footer>
    </main>
  );
}

