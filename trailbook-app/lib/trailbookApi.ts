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
  reflectionsCount?: number;
  createdAt: string;
  // Optional metadata (enrich later via API)
  title?: string;
  description?: string;
  location?: string;
  tags?: string[];
  story?: string;
  isPublic?: boolean;
  isArchived?: boolean;
};

export type MediaDetailsUpdate = {
  title?: string;
  description?: string;
  location?: string;
  story?: string;
  tags?: string[];
  isPublic?: boolean;
};

export type PublicFeedUser = {
  id: string;
  name?: string;
  profilePicture?: string;
};

export type PublicFeedBadge = {
  id: string;
  name?: string;
  description?: string;
  logoKey?: string;
  isCustom?: boolean;
};

export type PublicFeedAlbumItem = {
  id: string;
  title?: string;
  location?: string;
  createdAt?: string;
  eventDate?: string;
  description?: string;
  storyPreview?: string;
  coverImage?: string;
  photoCount?: number;
  user?: PublicFeedUser;
  badges?: PublicFeedBadge[];
};

export type PublicFeedPageInfo = {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
};

export type PublicFeedResponse = {
  items: PublicFeedAlbumItem[];
  pageInfo?: PublicFeedPageInfo;
};

export type PublicAlbumApiResponse = {
  album: PublicFeedAlbumItem & {
    userId?: string;
    coverImage?: string;
    story?: string;
    isPublic?: boolean;
  };
  media: Array<{
    id: string;
    albumId: string;
    key: string;
    contentType: string;
    size: number;
    createdAt: string;
    title?: string;
    description?: string;
    location?: string;
    story?: string;
    tags?: string[];
    isPublic?: boolean;
  }>;
  pageInfo?: PublicFeedPageInfo;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapData(res: unknown): unknown {
  if (isRecord(res) && "data" in res) return res.data;
  return res;
}

function getAlbumsWriteBaseUrl(): string | undefined {
  // Some deployments expose album PATCH endpoints on the users service.
  // Allow overriding, otherwise fall back to the primary API base.
  const v =
    process.env.NEXT_PUBLIC_ALBUMS_WRITE_API_BASE_URL ||
    process.env.NEXT_PUBLIC_USERS_API_BASE_URL ||
    "";
  const trimmed = v.trim().replace(/\/$/, "");
  return trimmed ? trimmed : undefined;
}

function getPublicFeedBaseUrl(): string | undefined {
  // Public-feed is served by a different backend in some deployments.
  const v = process.env.NEXT_PUBLIC_PUBLIC_FEED_API_BASE_URL || process.env.NEXT_PUBLIC_FEED_API_BASE_URL || "";
  const trimmed = v.trim().replace(/\/$/, "");
  if (trimmed) return trimmed;
  // Local dev default (matches your example: http://localhost:3003/api/albums/public-feed)
  return "http://localhost:3003/api";
}

export async function getMyAlbums(): Promise<Album[]> {
  const res = await apiFetch<unknown>("/albums/me");
  const data = unwrapData(res);
  if (isRecord(data) && Array.isArray(data.albums)) {
    return data.albums
      .filter((a): a is Record<string, unknown> => isRecord(a))
      .map((a) => ({
        ...(a as unknown as Album),
        id: (typeof a._id === "string" && a._id) || (typeof a.id === "string" && a.id) || "",
      }))
      .filter((a) => Boolean(a.id));
  }
  return [];
}

export async function getAlbumById(albumId: string): Promise<Album | null> {
  const res = await apiFetch<unknown>(`/albums/${encodeURIComponent(albumId)}`);
  const data = unwrapData(res);
  const album = isRecord(data) && "album" in data ? data.album : data;
  if (isRecord(album)) {
    return {
      ...(album as unknown as Album),
      id:
        (typeof (album as Record<string, unknown>)._id === "string" &&
          (album as Record<string, unknown>)._id) ||
        (typeof (album as Record<string, unknown>).id === "string" &&
          (album as Record<string, unknown>).id) ||
        "",
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
      ...(album as unknown as Album),
      id:
        (typeof (album as Record<string, unknown>)._id === "string" &&
          (album as Record<string, unknown>)._id) ||
        (typeof (album as Record<string, unknown>).id === "string" &&
          (album as Record<string, unknown>).id) ||
        "",
    } as Album;
  }
  return album as Album;
}

export async function updateAlbumCover(payload: {
  albumId: string;
  coverImage: string;
}): Promise<Album> {
  const res = await apiFetch<unknown>(`/albums/${encodeURIComponent(payload.albumId)}/cover`, {
    baseUrl: getAlbumsWriteBaseUrl(),
    method: "PATCH",
    body: JSON.stringify({ coverImage: payload.coverImage }),
  });
  const data = unwrapData(res);
  const album = isRecord(data) && "album" in data ? data.album : data;
  if (isRecord(album)) {
    return {
      ...(album as unknown as Album),
      id:
        (typeof (album as Record<string, unknown>)._id === "string" &&
          (album as Record<string, unknown>)._id) ||
        (typeof (album as Record<string, unknown>).id === "string" &&
          (album as Record<string, unknown>).id) ||
        payload.albumId,
    } as Album;
  }
  return album as Album;
}

export async function updateAlbum(
  albumId: string,
  payload: Partial<{
    title: string;
    description: string;
    location: string;
    story: string;
    eventDate: string; // YYYY-MM-DD
    coverImage: string;
    isPublic: boolean;
  }>
): Promise<Album> {
  const res = await apiFetch<unknown>(`/albums/${encodeURIComponent(albumId)}`, {
    baseUrl: getAlbumsWriteBaseUrl(),
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = unwrapData(res);
  const album = isRecord(data) && "album" in data ? data.album : data;
  if (isRecord(album)) {
    return {
      ...(album as unknown as Album),
      id:
        (typeof (album as Record<string, unknown>)._id === "string" &&
          (album as Record<string, unknown>)._id) ||
        (typeof (album as Record<string, unknown>).id === "string" &&
          (album as Record<string, unknown>).id) ||
        albumId,
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

/**
 * Get multiple presigned URLs for bulk uploads
 * Backend: POST /api/media/presigned-urls
 */
export async function getPresignedUrls(payload: {
  albumId: string;
  files: Array<{ contentType: string }>;
  expiresInSeconds?: number;
}): Promise<Array<{ uploadUrl: string; key: string }>> {
  const res = await apiFetch<unknown>("/media/presigned-urls", {
    method: "POST",
    body: JSON.stringify({
      albumId: payload.albumId,
      files: payload.files,
      expiresInSeconds: payload.expiresInSeconds || 300,
    }),
  });

  const data = unwrapData(res);

  // Log for debugging in development only
  if (process.env.NODE_ENV === "development") {
    console.log("Presigned URLs response:", data);
  }

  // Handle different response formats:
  // 1. { data: { presignedUrls: [...] } } - already unwrapped by unwrapData
  // 2. { presignedUrls: [...] }
  // 3. { urls: [...] }
  // 4. { items: [...] }
  // 5. { data: [...] } - array directly in data
  // 6. [...] - direct array

  let presignedUrlsArray: unknown[] | null = null;

  if (isRecord(data)) {
    // Try common property names - "uploads" is the actual property name from the API
    presignedUrlsArray =
      (Array.isArray(data.uploads) && data.uploads) ||
      (Array.isArray(data.presignedUrls) && data.presignedUrls) ||
      (Array.isArray(data.urls) && data.urls) ||
      (Array.isArray(data.items) && data.items) ||
      (Array.isArray(data.data) && data.data) ||
      null;
  } else if (Array.isArray(data)) {
    presignedUrlsArray = data;
  }

  if (!presignedUrlsArray || !Array.isArray(presignedUrlsArray)) {
    const errorDetails = isRecord(data)
      ? `Object with keys: ${Object.keys(data).join(", ")}`
      : `Type: ${typeof data}`;
    console.error("Invalid response format. Expected array of presigned URLs.", {
      received: data,
      type: typeof data,
      isRecord: isRecord(data),
      keys: isRecord(data) ? Object.keys(data) : null,
    });
    throw new Error(
      `Invalid response format from presigned-urls endpoint. ${errorDetails}. Please check the API response structure.`
    );
  }

  // Map each item to { uploadUrl, key } format
  const result = presignedUrlsArray
    .map((item: unknown, index: number) => {
      if (isRecord(item)) {
        const uploadUrl =
          (typeof item.uploadUrl === "string" && item.uploadUrl) ||
          (typeof item.url === "string" && item.url) ||
          (typeof item.presignedUrl === "string" && item.presignedUrl) ||
          "";
        const key =
          (typeof item.key === "string" && item.key) ||
          (typeof item.fileKey === "string" && item.fileKey) ||
          "";

        if (uploadUrl && key) {
          return { uploadUrl, key };
        }

        console.warn(`Item ${index} missing uploadUrl or key:`, item);
      } else {
        console.warn(`Item ${index} is not a record:`, item);
      }
      return null;
    })
    .filter((item): item is { uploadUrl: string; key: string } => item !== null);

  if (result.length !== payload.files.length) {
    console.error(
      `Mismatch: expected ${payload.files.length} presigned URLs, got ${result.length}`
    );
    throw new Error(
      `Expected ${payload.files.length} presigned URLs, but received ${result.length}`
    );
  }

  return result;
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

export async function updateMediaDetails(
  mediaId: string,
  payload: MediaDetailsUpdate
): Promise<MediaItem> {
  const endpoint = `/media/${encodeURIComponent(mediaId)}/details`;
  const res = await apiFetch<unknown>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = unwrapData(res);
  const media = isRecord(data) && "media" in data ? data.media : data;
  return media as MediaItem;
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

export async function getPublicFeed(payload?: {
  limit?: number;
  cursor?: string | null;
}): Promise<PublicFeedResponse> {
  const qs = new URLSearchParams();
  if (payload?.limit) qs.set("limit", String(payload.limit));
  if (payload?.cursor) qs.set("cursor", String(payload.cursor));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const res = await apiFetch<unknown>(`/albums/public-feed${suffix}`, {
    baseUrl: getPublicFeedBaseUrl(),
    auth: false,
    method: "GET",
  });

  // Expected response shape:
  // { success: true, data: { items: [...], pageInfo: {...} } }
  const unwrapped = unwrapData(res);
  const data = isRecord(unwrapped) && "data" in unwrapped ? (unwrapped as { data?: unknown }).data : unwrapped;

  if (isRecord(data) && Array.isArray(data.items)) {
    return {
      items: data.items as PublicFeedAlbumItem[],
      pageInfo: (isRecord(data.pageInfo) ? (data.pageInfo as PublicFeedPageInfo) : undefined),
    };
  }

  return { items: [] };
}

export async function getPublicAlbum(payload: {
  albumId: string;
  limit?: number;
}): Promise<{ album: Album; media: MediaItem[]; pageInfo?: PublicFeedPageInfo } | null> {
  const qs = new URLSearchParams();
  if (payload.limit) qs.set("limit", String(payload.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const res = await apiFetch<unknown>(`/albums/public/${encodeURIComponent(payload.albumId)}${suffix}`, {
    baseUrl: getPublicFeedBaseUrl(),
    auth: false,
    method: "GET",
  });

  const data = unwrapData(res);
  if (!isRecord(data)) return null;

  const albumRaw = data.album;
  const mediaRaw = data.media;
  if (!isRecord(albumRaw) || !Array.isArray(mediaRaw)) return null;

  const album: Album = {
    ...(albumRaw as unknown as Album),
    id:
      (typeof (albumRaw as Record<string, unknown>).id === "string"
        ? ((albumRaw as Record<string, unknown>).id as string)
        : "") ||
      (typeof (albumRaw as Record<string, unknown>)._id === "string"
        ? ((albumRaw as Record<string, unknown>)._id as string)
        : "") ||
      payload.albumId,
  };

  const media: MediaItem[] = mediaRaw
    .filter((m): m is Record<string, unknown> => isRecord(m))
    .map((m) => ({
      _id: (typeof m.id === "string" ? (m.id as string) : String(m.id || "")) || "",
      albumId: (typeof m.albumId === "string" ? (m.albumId as string) : payload.albumId) || payload.albumId,
      key: (typeof m.key === "string" ? (m.key as string) : "") || "",
      contentType: (typeof m.contentType === "string" ? (m.contentType as string) : "") || "",
      size: (typeof m.size === "number" ? (m.size as number) : 0) || 0,
      createdAt: (typeof m.createdAt === "string" ? (m.createdAt as string) : "") || new Date().toISOString(),
      reflectionsCount: typeof (m as Record<string, unknown>).reflectionsCount === "number"
        ? ((m as Record<string, unknown>).reflectionsCount as number)
        : undefined,
      title: typeof m.title === "string" ? (m.title as string) : undefined,
      description: typeof m.description === "string" ? (m.description as string) : undefined,
      location: typeof m.location === "string" ? (m.location as string) : undefined,
      story: typeof m.story === "string" ? (m.story as string) : undefined,
      tags: Array.isArray(m.tags) ? (m.tags as string[]) : undefined,
      isPublic: typeof m.isPublic === "boolean" ? (m.isPublic as boolean) : undefined,
    }))
    .filter((m) => Boolean(m._id) && Boolean(m.key));

  return {
    album: {
      ...album,
      photos: media.map((m) => m.key),
    },
    media,
    pageInfo: isRecord(data.pageInfo) ? (data.pageInfo as PublicFeedPageInfo) : undefined,
  };
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

// Archive and Delete Album Functions
export async function archiveAlbum(albumId: string): Promise<Album> {
  const res = await apiFetch<unknown>(`/albums/${encodeURIComponent(albumId)}/archive`, {
    method: "PATCH",
  });
  const data = unwrapData(res);
  const album = isRecord(data) && "album" in data ? data.album : data;
  return album as Album;
}

export async function restoreAlbum(albumId: string): Promise<Album> {
  const res = await apiFetch<unknown>(`/albums/${encodeURIComponent(albumId)}/restore`, {
    method: "PATCH",
  });
  const data = unwrapData(res);
  const album = isRecord(data) && "album" in data ? data.album : data;
  return album as Album;
}

export async function deleteAlbum(albumId: string): Promise<void> {
  await apiFetch<unknown>(`/albums/${encodeURIComponent(albumId)}`, {
    method: "DELETE",
  });
}

export async function getArchivedAlbums(): Promise<Album[]> {
  const res = await apiFetch<unknown>("/albums/archived");
  const data = unwrapData(res);
  if (isRecord(data) && Array.isArray(data.albums)) {
    return data.albums
      .filter((a): a is Record<string, unknown> => isRecord(a))
      .map((a) => ({
        ...(a as unknown as Album),
        id: (typeof a._id === "string" && a._id) || (typeof a.id === "string" && a.id) || "",
      }))
      .filter((a) => Boolean(a.id));
  }
  if (Array.isArray(data)) {
    return data
      .filter((a): a is Record<string, unknown> => isRecord(a))
      .map((a) => ({
        ...(a as unknown as Album),
        id: (typeof a._id === "string" && a._id) || (typeof a.id === "string" && a.id) || "",
      }))
      .filter((a) => Boolean(a.id));
  }
  return [];
}

// Archive and Delete Media Functions
export async function archiveMedia(mediaId: string): Promise<MediaItem> {
  const res = await apiFetch<unknown>(`/media/${encodeURIComponent(mediaId)}/archive`, {
    method: "PATCH",
  });
  const data = unwrapData(res);
  return (isRecord(data) && "media" in data ? data.media : data) as MediaItem;
}

export async function restoreMedia(mediaId: string): Promise<MediaItem> {
  const res = await apiFetch<unknown>(`/media/${encodeURIComponent(mediaId)}/restore`, {
    method: "PATCH",
  });
  const data = unwrapData(res);
  return (isRecord(data) && "media" in data ? data.media : data) as MediaItem;
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await apiFetch<unknown>(`/media/${encodeURIComponent(mediaId)}`, {
    method: "DELETE",
  });
}

export async function getArchivedMedia(albumId: string): Promise<MediaItem[]> {
  const res = await apiFetch<unknown>(`/media/album/${encodeURIComponent(albumId)}/archived`);
  const data = unwrapData(res);
  if (isRecord(data) && Array.isArray(data.media)) {
    return data.media as MediaItem[];
  }
  if (Array.isArray(data)) return data as MediaItem[];
  return [];
}

export async function deleteS3Object(payload: {
  albumId: string;
  key: string;
}): Promise<void> {
  await apiFetch<unknown>("/media/s3-object", {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}
