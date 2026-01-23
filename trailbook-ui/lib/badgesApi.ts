import { apiFetch } from "@/lib/api";

// Badges backend (default). Override via NEXT_PUBLIC_BADGES_API_BASE_URL.
const DEFAULT_BADGES_API_BASE_URL = "http://localhost:3003/api";

function getBadgesBaseUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_BADGES_API_BASE_URL || "";
  const trimmed = v.trim().replace(/\/$/, "");
  if (trimmed) return trimmed;
  return DEFAULT_BADGES_API_BASE_URL;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapData(res: unknown): unknown {
  if (isRecord(res) && "data" in res) return (res as { data?: unknown }).data;
  return res;
}

export type CustomBadge = {
  id: string;
  name: string;
  description?: string;
  logoKey?: string;
  createdAt?: string;
  // Keep unknown fields (backend may add more later)
  [key: string]: unknown;
};

export type GlobalBadge = {
  id: string;
  name: string;
  description?: string;
  logoKey?: string;
  createdAt?: string;
  // Optional “how to earn” metadata (backend may evolve)
  howToEarn?: string;
  criteria?: unknown;
  [key: string]: unknown;
};

export type MyBadgesResponse = {
  customBadges: CustomBadge[];
  globalBadges: GlobalBadge[]; // earned/assigned global badges (per-user)
};

export async function getCustomBadgeLogoPresignedUrl(payload: {
  contentType: string;
}): Promise<{ uploadUrl: string; key: string }> {
  const qs = new URLSearchParams({ contentType: payload.contentType }).toString();
  const res = await apiFetch<unknown>(`/badges/custom/logo/presigned-url?${qs}`, {
    baseUrl: getBadgesBaseUrl(),
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = unwrapData(res);

  // Support common shapes:
  // { uploadUrl, key }
  // { url, key }
  // { presignedUrl, key }
  // { data: { uploadUrl, key } } (handled by unwrapData)
  if (isRecord(data)) {
    const uploadUrl =
      (typeof data.uploadUrl === "string" && data.uploadUrl) ||
      (typeof data.url === "string" && data.url) ||
      (typeof data.presignedUrl === "string" && data.presignedUrl) ||
      "";
    const key = (typeof data.key === "string" && data.key) || (typeof data.logoKey === "string" && data.logoKey) || "";
    if (uploadUrl && key) return { uploadUrl, key };
  }

  return data as { uploadUrl: string; key: string };
}

export async function createCustomBadge(payload: {
  name: string;
  description: string;
  logoKey: string;
}): Promise<CustomBadge> {
  const res = await apiFetch<unknown>("/badges/custom", {
    baseUrl: getBadgesBaseUrl(),
    method: "POST",
    headers: { Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = unwrapData(res);
  const badge = isRecord(data) && "badge" in data ? (data as { badge?: unknown }).badge : data;

  if (isRecord(badge)) {
    const id =
      (typeof badge.id === "string" && badge.id) ||
      (typeof badge._id === "string" && badge._id) ||
      "";
    return {
      ...(badge as CustomBadge),
      id,
      name: (typeof badge.name === "string" ? badge.name : payload.name) as string,
      description:
        typeof badge.description === "string" ? badge.description : payload.description,
      logoKey: typeof badge.logoKey === "string" ? badge.logoKey : payload.logoKey,
    };
  }

  // Fallback
  return {
    id: "",
    name: payload.name,
    description: payload.description,
    logoKey: payload.logoKey,
  };
}

function normalizeBadgesList(
  listRaw: unknown
): Array<
  Record<string, unknown> & {
    id: string;
    name: string;
    description?: string;
    logoKey?: string;
    createdAt?: string;
    howToEarn?: string;
  }
> {
  if (!Array.isArray(listRaw)) return [];
  return (listRaw as unknown[])
    .filter((b): b is Record<string, unknown> => isRecord(b))
    .map((b) => {
      const id =
        (typeof b.id === "string" && b.id) ||
        (typeof b._id === "string" && b._id) ||
        "";
      const name = (typeof b.name === "string" && b.name) || "";
      const description = typeof b.description === "string" ? b.description : undefined;
      const logoKey =
        (typeof b.logoKey === "string" && b.logoKey) ||
        (typeof b.logo === "string" && b.logo) ||
        undefined;
      const createdAt = typeof b.createdAt === "string" ? b.createdAt : undefined;

      const howToEarn =
        (typeof b.howToEarn === "string" && b.howToEarn) ||
        (typeof b.how_to_earn === "string" && b.how_to_earn) ||
        (typeof b.howToGet === "string" && b.howToGet) ||
        undefined;

      return { ...b, id, name, description, logoKey, createdAt, howToEarn };
    })
    .filter((b) => Boolean(b.name));
}

export async function listMyCustomBadges(): Promise<CustomBadge[]> {
  const res = await apiFetch<unknown>("/badges/me", {
    baseUrl: getBadgesBaseUrl(),
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = unwrapData(res);

  // Support: /badges/me can return BOTH custom + global; this function keeps just custom.
  const listRaw =
    (isRecord(data) && Array.isArray(data.customBadges) && data.customBadges) ||
    (isRecord(data) && isRecord(data.custom) && Array.isArray((data.custom as Record<string, unknown>).badges) && (data.custom as Record<string, unknown>).badges) ||
    (isRecord(data) && Array.isArray(data.badges) && data.badges) ||
    (isRecord(data) && Array.isArray(data.items) && data.items) ||
    (Array.isArray(data) ? data : []);

  return normalizeBadgesList(listRaw) as CustomBadge[];
}

export async function getMyBadges(): Promise<MyBadgesResponse> {
  const res = await apiFetch<unknown>("/badges/me", {
    baseUrl: getBadgesBaseUrl(),
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = unwrapData(res);

  const customRaw =
    (isRecord(data) && Array.isArray(data.customBadges) && data.customBadges) ||
    (isRecord(data) && Array.isArray(data.custom) && data.custom) ||
    (isRecord(data) && isRecord(data.custom) && Array.isArray((data.custom as Record<string, unknown>).badges) && (data.custom as Record<string, unknown>).badges) ||
    [];

  const globalRaw =
    (isRecord(data) && Array.isArray(data.globalBadges) && data.globalBadges) ||
    (isRecord(data) && Array.isArray(data.global) && data.global) ||
    (isRecord(data) && isRecord(data.global) && Array.isArray((data.global as Record<string, unknown>).badges) && (data.global as Record<string, unknown>).badges) ||
    [];

  return {
    customBadges: normalizeBadgesList(customRaw) as CustomBadge[],
    globalBadges: normalizeBadgesList(globalRaw) as GlobalBadge[],
  };
}

export async function listGlobalBadgesCatalog(): Promise<GlobalBadge[]> {
  const res = await apiFetch<unknown>("/badges", {
    baseUrl: getBadgesBaseUrl(),
    auth: false,
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = unwrapData(res);

  const listRaw =
    (isRecord(data) && Array.isArray(data.badges) && data.badges) ||
    (isRecord(data) && Array.isArray(data.items) && data.items) ||
    (Array.isArray(data) ? data : []);

  return normalizeBadgesList(listRaw) as GlobalBadge[];
}

// ----------------------------
// Reflections (premium reactions)
// ----------------------------

export type ReflectionType = {
  id: string;
  label: string;
  emoji?: string;
};

export type MediaReflectionItem = {
  id: string;
  user: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  reflection: {
    id: string; // reflectionTypeId
    label: string;
    emoji?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type CursorPageInfo = {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
};

export async function listReflectionTypes(): Promise<ReflectionType[]> {
  const res = await apiFetch<unknown>("/reflection-types", {
    baseUrl: getBadgesBaseUrl(),
    auth: false,
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = unwrapData(res);
  const typesRaw = isRecord(data) ? data["types"] : null;
  const list = Array.isArray(typesRaw) ? typesRaw : [];

  return list
    .filter((t): t is Record<string, unknown> => isRecord(t))
    .map((t) => ({
      id: (typeof t.id === "string" && t.id) || (typeof t._id === "string" && t._id) || "",
      label: (typeof t.label === "string" && t.label) || "",
      emoji: typeof t.emoji === "string" ? t.emoji : undefined,
    }))
    .filter((t) => Boolean(t.id) && Boolean(t.label));
}

export async function getMediaReflectionsCount(payload: { mediaId: string }): Promise<{ count: number }> {
  const res = await apiFetch<unknown>(`/media/${encodeURIComponent(payload.mediaId)}/reflections/count`, {
    baseUrl: getBadgesBaseUrl(),
    auth: false,
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = unwrapData(res);
  if (isRecord(data) && typeof data["count"] === "number") return { count: data["count"] as number };
  return data as { count: number };
}

export async function upsertMyMediaReflection(payload: {
  mediaId: string;
  reflectionTypeId: string;
}): Promise<{ reflection: { reflectionTypeId: string; label?: string; emoji?: string }; created: boolean }> {
  const res = await apiFetch<unknown>(`/media/${encodeURIComponent(payload.mediaId)}/reflections/me`, {
    baseUrl: getBadgesBaseUrl(),
    method: "PUT",
    headers: { Accept: "application/json" },
    body: JSON.stringify({ reflectionTypeId: payload.reflectionTypeId }),
  });
  const data = unwrapData(res);
  const reflectionRaw = isRecord(data) ? data["reflection"] : null;
  const reflection = isRecord(reflectionRaw) ? reflectionRaw : null;
  const createdRaw = isRecord(data) ? data["created"] : undefined;

  return {
    reflection: {
      reflectionTypeId:
        (reflection && typeof reflection["reflectionTypeId"] === "string" && (reflection["reflectionTypeId"] as string)) ||
        payload.reflectionTypeId,
      label: reflection && typeof reflection["label"] === "string" ? (reflection["label"] as string) : undefined,
      emoji: reflection && typeof reflection["emoji"] === "string" ? (reflection["emoji"] as string) : undefined,
    },
    created: Boolean(createdRaw),
  };
}

export async function listMediaReflections(payload: {
  mediaId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{ items: MediaReflectionItem[]; count?: number; pageInfo?: CursorPageInfo }> {
  const qs = new URLSearchParams();
  if (payload.limit) qs.set("limit", String(payload.limit));
  if (payload.cursor) qs.set("cursor", String(payload.cursor));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  // Use auth: true so user's reflection appears first when authenticated
  const res = await apiFetch<unknown>(`/media/${encodeURIComponent(payload.mediaId)}/reflections${suffix}`, {
    baseUrl: getBadgesBaseUrl(),
    auth: true, // Changed to true so authenticated users see their reflection first
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = unwrapData(res);
  const itemsRaw = isRecord(data) ? data["items"] : null;
  const reflectionsRaw = isRecord(data) ? data["reflections"] : null;
  const listRaw = Array.isArray(itemsRaw)
    ? itemsRaw
    : Array.isArray(reflectionsRaw)
      ? reflectionsRaw
      : Array.isArray(data)
        ? data
        : [];

  // Extract count from response (API returns count in data object)
  const count = isRecord(data) && typeof data["count"] === "number" ? (data["count"] as number) : undefined;

  const pageInfoRaw = isRecord(data) ? data["pageInfo"] : undefined;
  const pageInfoRec = isRecord(pageInfoRaw) ? pageInfoRaw : undefined;

  const items = listRaw
    .filter((r): r is Record<string, unknown> => isRecord(r))
    .map((r) => ({
      id: (typeof r.id === "string" && r.id) || (typeof r._id === "string" && r._id) || "",
      user: {
        id: (() => {
          const u = isRecord(r.user) ? (r.user as Record<string, unknown>) : null;
          return u && typeof u["id"] === "string" ? (u["id"] as string) : "";
        })(),
        name: (() => {
          const u = isRecord(r.user) ? (r.user as Record<string, unknown>) : null;
          return u && typeof u["name"] === "string" ? (u["name"] as string) : "";
        })(),
        profilePicture:
          (() => {
            const u = isRecord(r.user) ? (r.user as Record<string, unknown>) : null;
            return u && typeof u["profilePicture"] === "string" ? (u["profilePicture"] as string) : undefined;
          })(),
      },
      reflection: {
        id: (() => {
          const rr = isRecord(r.reflection) ? (r.reflection as Record<string, unknown>) : null;
          if (rr && typeof rr["id"] === "string") return rr["id"] as string;
          return typeof r["reflectionTypeId"] === "string" ? (r["reflectionTypeId"] as string) : "";
        })(),
        label: (() => {
          const rr = isRecord(r.reflection) ? (r.reflection as Record<string, unknown>) : null;
          if (rr && typeof rr["label"] === "string") return rr["label"] as string;
          return typeof r["reflectionLabel"] === "string" ? (r["reflectionLabel"] as string) : "";
        })(),
        emoji: (() => {
          const rr = isRecord(r.reflection) ? (r.reflection as Record<string, unknown>) : null;
          if (rr && typeof rr["emoji"] === "string") return rr["emoji"] as string;
          return typeof r["reflectionEmoji"] === "string" ? (r["reflectionEmoji"] as string) : undefined;
        })(),
      },
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
      updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
    }))
    .filter((r) => Boolean(r.id) && Boolean(r.user.id));

  const pageInfo = pageInfoRec
    ? {
        limit: typeof pageInfoRec["limit"] === "number" ? (pageInfoRec["limit"] as number) : payload.limit ?? 20,
        hasNextPage: Boolean(pageInfoRec["hasNextPage"]),
        nextCursor: typeof pageInfoRec["nextCursor"] === "string" ? (pageInfoRec["nextCursor"] as string) : null,
      }
    : undefined;

  return { items, count, pageInfo };
}

// ----------------------------
// Album badge assignments (custom badges)
// ----------------------------

export type AlbumBadgeAssignment = {
  id: string;
  createdAt?: string;
  badge: {
    id: string;
    name: string;
    description?: string;
    logoKey?: string;
    isCustom?: boolean;
  };
  assignee: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  assignedBy?: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  assignedByUserId?: string;
};

export async function assignCustomBadgeToAlbum(payload: {
  albumId: string;
  badgeId: string;
  assigneeUserId: string;
}): Promise<{ assignment: AlbumBadgeAssignment }> {
  const res = await apiFetch<unknown>(`/albums/${encodeURIComponent(payload.albumId)}/badges/assign`, {
    baseUrl: getBadgesBaseUrl(),
    method: "POST",
    headers: { Accept: "application/json" },
    body: JSON.stringify({ badgeId: payload.badgeId, assigneeUserId: payload.assigneeUserId }),
  });
  const data = unwrapData(res);
  const assignmentRaw = isRecord(data) ? data["assignment"] : null;
  const a = isRecord(assignmentRaw) ? assignmentRaw : data;
  return { assignment: normalizeAlbumBadgeAssignment(a) };
}

export async function listPublicAlbumBadges(payload: { albumId: string }): Promise<{ items: AlbumBadgeAssignment[] }> {
  const res = await apiFetch<unknown>(`/albums/public/${encodeURIComponent(payload.albumId)}/badges`, {
    baseUrl: getBadgesBaseUrl(),
    auth: false,
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = unwrapData(res);
  const itemsRaw = isRecord(data) ? data["items"] : null;
  const listRaw = Array.isArray(itemsRaw) ? itemsRaw : Array.isArray(data) ? data : [];

  return {
    items: listRaw
      .filter((x): x is Record<string, unknown> => isRecord(x))
      .map((x) => normalizeAlbumBadgeAssignment(x))
      .filter((x) => Boolean(x.id) && Boolean(x.badge.id)),
  };
}

function normalizeAlbumBadgeAssignment(raw: unknown): AlbumBadgeAssignment {
  if (!isRecord(raw)) {
    return {
      id: "",
      badge: { id: "", name: "" },
      assignee: { id: "", name: "" },
    };
  }

  const badgeRaw = isRecord(raw.badge) ? (raw.badge as Record<string, unknown>) : {};
  const assigneeRaw = isRecord(raw.assignee) ? (raw.assignee as Record<string, unknown>) : {};
  const assignedByRaw = isRecord(raw.assignedBy) ? (raw.assignedBy as Record<string, unknown>) : null;

  return {
    id: (typeof raw.id === "string" && raw.id) || (typeof raw._id === "string" && raw._id) || "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    badge: {
      id:
        (typeof badgeRaw.id === "string" && badgeRaw.id) ||
        (typeof badgeRaw["_id"] === "string" && (badgeRaw["_id"] as string)) ||
        (typeof raw["badgeId"] === "string" && (raw["badgeId"] as string)) ||
        "",
      name: (typeof badgeRaw.name === "string" && badgeRaw.name) || "",
      description: typeof badgeRaw.description === "string" ? (badgeRaw.description as string) : undefined,
      logoKey: typeof badgeRaw.logoKey === "string" ? (badgeRaw.logoKey as string) : undefined,
      isCustom: typeof badgeRaw.isCustom === "boolean" ? (badgeRaw.isCustom as boolean) : undefined,
    },
    assignee: {
      id:
        (typeof assigneeRaw.id === "string" && assigneeRaw.id) ||
        (typeof assigneeRaw.userId === "string" && assigneeRaw.userId) ||
        (typeof raw["assigneeUserId"] === "string" && (raw["assigneeUserId"] as string)) ||
        "",
      name: (typeof assigneeRaw.name === "string" && assigneeRaw.name) || "",
      profilePicture: typeof assigneeRaw.profilePicture === "string" ? (assigneeRaw.profilePicture as string) : undefined,
    },
    assignedBy: assignedByRaw
      ? {
          id:
            (typeof assignedByRaw.id === "string" && assignedByRaw.id) ||
            (typeof assignedByRaw.userId === "string" && assignedByRaw.userId) ||
            (typeof raw["assignedByUserId"] === "string" && (raw["assignedByUserId"] as string)) ||
            "",
          name: (typeof assignedByRaw.name === "string" && assignedByRaw.name) || "",
          profilePicture:
            typeof assignedByRaw.profilePicture === "string" ? (assignedByRaw.profilePicture as string) : undefined,
        }
      : undefined,
    assignedByUserId: typeof raw.assignedByUserId === "string" ? raw.assignedByUserId : undefined,
  };
}

