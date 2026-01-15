import { apiFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const DEFAULT_USERS_API_BASE_URL = "http://localhost:3002/api";

function getUsersApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_USERS_API_BASE_URL?.replace(/\/$/, "") ||
    DEFAULT_USERS_API_BASE_URL
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapData(res: unknown): unknown {
  if (isRecord(res) && "data" in res) return res.data;
  return res;
}

export type AuthUser = {
  _id: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
  isVerified?: boolean;
};

export type UserProfile = {
  _id: string;
  userId: string;
  fullName?: string;
  bio?: string;
  tags?: string[];
  favoriteAlbumIds?: string[];
  favoriteMediaIds?: string[];
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MeProfile = {
  user: AuthUser;
  profile: UserProfile | null;
};

export type UpdateProfilePayload = {
  email?: string;
  phone?: string;
  fullName?: string;
  description?: string; // backend maps this to profile.bio
  tags?: string[];
  favoriteAlbumIds?: string[];
  favoriteMediaIds?: string[];
};

export async function getMyProfile(): Promise<MeProfile> {
  const res = await apiFetch<unknown>("/users/me", { baseUrl: getUsersApiBaseUrl() });
  const data = unwrapData(res);
  if (isRecord(data) && isRecord(data.user)) {
    return {
      user: data.user as AuthUser,
      profile: (data.profile as UserProfile | null) ?? null,
    };
  }
  return data as MeProfile;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<MeProfile> {
  const res = await apiFetch<unknown>("/users/me", {
    baseUrl: getUsersApiBaseUrl(),
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = unwrapData(res);
  if (isRecord(data) && isRecord(data.user)) {
    return {
      user: data.user as AuthUser,
      profile: (data.profile as UserProfile | null) ?? null,
    };
  }
  return data as MeProfile;
}

export async function getProfilePicturePresignedUrl(payload: {
  contentType: string;
}): Promise<{ uploadUrl: string; key?: string; publicUrl?: string }> {
  const qs = new URLSearchParams({ contentType: payload.contentType }).toString();
  const res = await apiFetch<unknown>(`/users/me/profile-picture/presigned-url?${qs}`, {
    baseUrl: getUsersApiBaseUrl(),
    method: "GET",
  });
  const data = unwrapData(res);
  if (isRecord(data)) {
    const uploadUrl =
      (typeof data.uploadUrl === "string" && data.uploadUrl) ||
      (typeof data.url === "string" && data.url) ||
      "";
    const key = typeof data.key === "string" ? data.key : undefined;
    const publicUrl =
      typeof data.publicUrl === "string"
        ? data.publicUrl
        : typeof data.profilePictureUrl === "string"
          ? data.profilePictureUrl
          : undefined;
    return { uploadUrl, key, publicUrl };
  }
  return data as { uploadUrl: string; key?: string; publicUrl?: string };
}

export function extractKeyFromPresignedUrl(uploadUrl: string): string | null {
  try {
    const u = new URL(uploadUrl);
    const p = u.pathname.replace(/^\//, "");
    return p || null;
  } catch {
    return null;
  }
}

export async function updateMyProfilePicture(payload: {
  profilePicture: string;
}): Promise<MeProfile> {
  const res = await apiFetch<unknown>("/users/me/profile-picture", {
    baseUrl: getUsersApiBaseUrl(),
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = unwrapData(res);
  if (isRecord(data) && isRecord(data.user)) {
    return {
      user: data.user as AuthUser,
      profile: (data.profile as UserProfile | null) ?? null,
    };
  }
  return data as MeProfile;
}

export function resolveProfilePictureUrl(urlOrKey: string | undefined | null): string | null {
  const resolved = resolveMediaUrl(urlOrKey ?? undefined);
  return resolved ?? null;
}

