import AlbumDetailClient from "@/components/Album/AlbumDetailClient";
import ScrollToTop from "@/components/Album/ScrollToTop";

export default async function AlbumDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const params = await paramsPromise;
  return (
    <>
      <ScrollToTop />
      <AlbumDetailClient albumId={params.albumId} />
    </>
  );
}
