import PublicProfileClient from "@/components/PublicProfile/PublicProfileClient";

export default async function PublicProfilePage({
  params: paramsPromise,
}: {
  params: Promise<{ userId: string }>;
}) {
  const params = await paramsPromise;
  return <PublicProfileClient userId={params.userId} />;
}
