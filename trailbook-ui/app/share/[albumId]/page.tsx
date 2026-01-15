import AlbumHero from "@/components/Album/AlbumHero";
import AlbumStory from "@/components/Album/AlbumStory";
import AlbumPhotos from "@/components/Album/AlbumPhotos";
import PublicAlbumGate from "@/components/Share/PublicAlbumGate";
import AlbumBadgesStrip from "@/components/Badges/AlbumBadgesStrip";
import { getPublicAlbum } from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { notFound } from "next/navigation";

function formatSubtitle(createdAt?: string, location?: string) {
  const parts: string[] = [];
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        d.toLocaleString(undefined, { month: "long", year: "numeric" })
      );
    }
  }
  if (location) parts.push(location);
  return parts.join(" · ");
}

export default async function PublicAlbumPage({
  params: paramsPromise,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const params = await paramsPromise;
  let payload: Awaited<ReturnType<typeof getPublicAlbum>> = null;
  try {
    payload = await getPublicAlbum({ albumId: params.albumId, limit: 30 });
  } catch {
    payload = null;
  }
  if (!payload?.album) notFound();

  const album = payload.album;
  const title = album?.title ?? album?.name ?? "Untitled album";
  const coverUrl = resolveMediaUrl(album?.coverImage || album?.coverUrl || album?.cover) || undefined;
  const subtitle = formatSubtitle(album?.createdAt, album?.location);
  const mediaItems = (payload.media || []).map((m) => ({
    ...m,
    url: resolveMediaUrl(m.url || m.key) || undefined,
  }));
  const photos = mediaItems.map((m) => resolveMediaUrl(m.url || m.key)).filter(Boolean) as string[];

  return (
    <main className="bg-[#fafafa] min-h-screen">
      <PublicAlbumGate albumId={params.albumId}>
        <AlbumHero
          title={title}
          coverUrl={coverUrl}
          subtitle={subtitle || undefined}
          isPublic={true}
          protectImage
        />
        <div className="max-w-7xl mx-auto -mt-10 relative z-10 px-6">
          <div className="mb-10">
            <AlbumBadgesStrip albumId={params.albumId} />
          </div>
          <AlbumStory initialStory={album?.story} />
          <div className="mt-10">
            <AlbumPhotos
              photos={photos}
              mediaItems={mediaItems}
              showUpload={false}
              protectImages
            />
          </div>
        </div>
      </PublicAlbumGate>
    </main>
  );
}
