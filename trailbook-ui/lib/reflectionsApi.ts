import { apiFetch, ApiError } from "@/lib/api";

export type ReflectionReason = "composition" | "moment" | "emotion" | "story";

export type Reflection = {
  id: string;
  mediaId: string;
  userId: string;
  reason: ReflectionReason;
  note?: string;
  isAnonymous: boolean;
  createdAt: string;
  user?: {
    _id: string;
    name?: string;
    profilePicture?: string;
  };
};

export type ReflectionsResponse = {
  reflections: Reflection[];
  count: number;
  hasReflected: boolean;
};

export type AddReflectionPayload = {
  reason: ReflectionReason;
  note?: string;
  isAnonymous: boolean;
};

/**
 * Add a reflection to a media item
 */
export async function addReflection(
  mediaId: string,
  payload: AddReflectionPayload
): Promise<Reflection> {
  const res = await apiFetch<unknown>(`/reflections/media/${encodeURIComponent(mediaId)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (typeof res === "object" && res !== null && "reflection" in res) {
    return (res as { reflection: Reflection }).reflection;
  }
  return res as Reflection;
}

/**
 * Remove a reflection from a media item
 */
export async function removeReflection(mediaId: string): Promise<void> {
  await apiFetch<unknown>(`/reflections/media/${encodeURIComponent(mediaId)}`, {
    method: "DELETE",
  });
}

/**
 * Get all reflections for a media item
 */
export async function getReflections(mediaId: string): Promise<ReflectionsResponse> {
  const res = await apiFetch<unknown>(`/reflections/media/${encodeURIComponent(mediaId)}`, {
    method: "GET",
  });

  if (typeof res === "object" && res !== null) {
    if ("reflections" in res && Array.isArray((res as { reflections: unknown }).reflections)) {
      return res as ReflectionsResponse;
    }
    if ("data" in res) {
      return (res as { data: ReflectionsResponse }).data;
    }
  }

  return { reflections: [], count: 0, hasReflected: false };
}

/**
 * Get reflection count for a media item (lightweight)
 */
export async function getReflectionCount(mediaId: string): Promise<number> {
  try {
    const res = await getReflections(mediaId);
    return res.count || 0;
  } catch {
    return 0;
  }
}
