import AlbumHero from "@/components/Album/AlbumHero";
import AlbumStory from "@/components/Album/AlbumStory";
import AlbumPhotos from "@/components/Album/AlbumPhotos";
import { getPublicAlbumById } from "@/lib/trailbookApi";
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
  let album = null;
  try {
    album = await getPublicAlbumById(params.albumId);
  } catch {
    album = null;
  }
  if (!album) notFound();
  const title = album?.title ?? "Untitled album";
  const coverUrl = album?.coverUrl ?? album?.cover;
  const subtitle = formatSubtitle(album?.createdAt, album?.location);
  const photos = album?.photos ?? [];

  return (
    <main className="bg-black text-white min-h-screen">
      <AlbumHero
        title={title}
        coverUrl={coverUrl}
        subtitle={subtitle || undefined}
        isPublic={album?.isPublic ?? true}
      />
      <AlbumStory initialStory={album?.story} />
      <AlbumPhotos photos={photos} showUpload={false} />
    </main>
  );
}
