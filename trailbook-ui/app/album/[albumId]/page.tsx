import AlbumDetailClient from "@/components/Album/AlbumDetailClient";

export default async function AlbumDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const params = await paramsPromise;
  return <AlbumDetailClient albumId={params.albumId} />;
}
