import ArchivedAlbumClient from "@/components/Archive/ArchivedAlbumClient";

export default async function ArchivedAlbumPage({
  params: paramsPromise,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const params = await paramsPromise;
  return <ArchivedAlbumClient albumId={params.albumId} />;
}
