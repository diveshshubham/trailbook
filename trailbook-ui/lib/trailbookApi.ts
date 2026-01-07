import { apiFetch } from "@/lib/api";

export type FeedItem = {
  id: string | number;
  imageUrl: string;
  user: string;
  caption: string;
  tags: string[];
  avatar: string;
};

export type Album = {
  id: string;
  _id?: string;
  title?: string;
  name?: string;
  description?: string;
  coverImage?: string;
  cover?: string;
  coverUrl?: string;
  photoCount?: number;
  photosCount?: number;
  createdAt?: string;
  location?: string;
  isPublic?: boolean;
  story?: string;
  photos?: string[];
};

export type MediaItem = {
  _id: string;
  albumId: string;
  key: string;
  contentType: string;
  size: number;
  url?: string;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapData(res: unknown): unknown {
  if (isRecord(res) && "data" in res) return res.data;
  return res;
}

export async function getMyAlbums(): Promise<Album[]> {
  const res = await apiFetch<unknown>("/albums/me");
  const data = unwrapData(res);
  if (isRecord(data) && Array.isArray(data.albums)) {
    return data.albums.map((a: any) => ({
      ...a,
      id: a._id || a.id,
    })) as Album[];
  }
  return [];
}

export async function getAlbumById(albumId: string): Promise<Album | null> {
  const res = await apiFetch<unknown>(`/albums/${encodeURIComponent(albumId)}`);
  const data = unwrapData(res);
  const album = isRecord(data) && "album" in data ? data.album : data;
  if (isRecord(album)) {
    return {
      ...(album as any),
      id: (album as any)._id || (album as any).id,
    } as Album;
  }
  return null;
}

export async function getAlbumMedia(albumId: string): Promise<MediaItem[]> {
  const res = await apiFetch<unknown>(`/media/album/${encodeURIComponent(albumId)}`);
  const data = unwrapData(res);
  if (isRecord(data) && Array.isArray(data.media)) {
    return data.media as MediaItem[];
  }
  if (Array.isArray(data)) return data as MediaItem[];
  return [];
}

export async function createAlbum(payload: {
  name: string;
  description: string;
  location: string;
  story: string;
  isPublic: boolean;
  coverImage?: string;
}): Promise<Album> {
  const res = await apiFetch<unknown>("/albums", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = unwrapData(res);
  const album = isRecord(data) && "album" in data ? data.album : data;
  if (isRecord(album)) {
    return {
      ...(album as any),
      id: (album as any)._id || (album as any).id,
    } as Album;
  }
  return album as Album;
}

/**
 * Gets a presigned URL for S3 upload. 
 * Note: If your endpoint is different, update the URL here.
 */
export async function getPresignedUrl(payload: {
  albumId: string;
  contentType: string;
}): Promise<{ uploadUrl: string; key: string }> {
  const qs = new URLSearchParams({
    albumId: payload.albumId,
    contentType: payload.contentType,
  }).toString();

  // Backend: GET /api/media/presigned-url?albumId=...&contentType=...
  const res = await apiFetch<unknown>(`/media/presigned-url?${qs}`, {
    method: "GET",
  });

  const data = unwrapData(res);

  // Support either { uploadUrl, key } or { url, key } naming
  if (isRecord(data)) {
    const uploadUrl =
      (typeof data.uploadUrl === "string" && data.uploadUrl) ||
      (typeof data.url === "string" && data.url) ||
      "";
    const key = (typeof data.key === "string" && data.key) || "";

    if (uploadUrl && key) return { uploadUrl, key };
  }

  return data as { uploadUrl: string; key: string };
}

export async function uploadMedia(payload: {
  albumId: string;
  key: string;
  contentType: string;
  size: number;
}): Promise<MediaItem> {
  const res = await apiFetch<unknown>("/media", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = unwrapData(res);
  return (isRecord(data) && "media" in data ? data.media : data) as MediaItem;
}

export async function getFeed(): Promise<FeedItem[]> {
  const res = await apiFetch<unknown>("/feed");
  const data = unwrapData(res);

  if (Array.isArray(data)) return data as FeedItem[];
  if (isRecord(data)) {
    const items = data.items;
    if (Array.isArray(items)) return items as FeedItem[];

    const feed = data.feed;
    if (Array.isArray(feed)) return feed as FeedItem[];
  }

  return [];
}

export async function getPublicAlbumById(albumId: string): Promise<Album | null> {
  // If your backend has a dedicated public endpoint, you can switch this to `/public/albums/:id`
  return getAlbumById(albumId);
}

export async function regenerateAlbumStory(albumId: string): Promise<{ story: string }> {
  const res = await apiFetch<unknown>(
    `/albums/${encodeURIComponent(albumId)}/story`,
    {
      method: "POST",
    }
  );
  const data = unwrapData(res);
  if (isRecord(data) && typeof data.story === "string") return { story: data.story };
  return data as { story: string };
}

