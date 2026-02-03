import { apiFetch } from "@/lib/api";

export type TrailConnection = {
  id: string;
  userId: string;
  connectedUserId: string;
  mutualAlbums: Array<{
    _id: string;
    title?: string;
    coverImage?: string;
  }>;
  reflectionCount: number;
  createdAt: string;
  user?: {
    _id: string;
    name?: string;
    profilePicture?: string;
    email?: string;
  };
  connectedUser?: {
    _id: string;
    name?: string;
    profilePicture?: string;
    email?: string;
  };
};

export type EligibilityResponse = {
  eligible: boolean;
  mutualAlbums: Array<{
    _id: string;
    title?: string;
    coverImage?: string;
  }>;
  reflectionCount: number;
  reason?: string;
};

/**
 * Check if user is eligible to connect with another user
 */
export async function checkEligibility(userId: string): Promise<EligibilityResponse> {
  const res = await apiFetch<unknown>(
    `/trail-connections/check-eligibility/${encodeURIComponent(userId)}`,
    {
      method: "GET",
    }
  );

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      return (res as { data: EligibilityResponse }).data;
    }
    return res as EligibilityResponse;
  }

  return { eligible: false, mutualAlbums: [], reflectionCount: 0 };
}

/**
 * Create a trail connection with another user
 */
export async function createConnection(userId: string): Promise<TrailConnection> {
  const res = await apiFetch<unknown>(`/trail-connections/connect/${encodeURIComponent(userId)}`, {
    method: "POST",
  });

  if (typeof res === "object" && res !== null) {
    if ("connection" in res) {
      return (res as { connection: TrailConnection }).connection;
    }
    if ("data" in res) {
      return (res as { data: TrailConnection }).data;
    }
    return res as TrailConnection;
  }

  throw new Error("Failed to create connection");
}

/**
 * Get all trail connections (walked together list)
 */
export async function getWalkedTogether(): Promise<TrailConnection[]> {
  const res = await apiFetch<unknown>("/trail-connections/walked-together", {
    method: "GET",
  });

  if (typeof res === "object" && res !== null) {
    if ("connections" in res && Array.isArray((res as { connections: unknown }).connections)) {
      return (res as { connections: TrailConnection[] }).connections;
    }
    if ("data" in res && Array.isArray((res as { data: unknown }).data)) {
      return (res as { data: TrailConnection[] }).data;
    }
    if (Array.isArray(res)) {
      return res as TrailConnection[];
    }
  }

  return [];
}

/**
 * Get connection details with a specific user
 */
export async function getConnectionWith(userId: string): Promise<TrailConnection | null> {
  try {
    const res = await apiFetch<unknown>(`/trail-connections/with/${encodeURIComponent(userId)}`, {
      method: "GET",
    });

    if (typeof res === "object" && res !== null) {
      if ("connection" in res) {
        return (res as { connection: TrailConnection }).connection;
      }
      if ("data" in res) {
        return (res as { data: TrailConnection }).data;
      }
      return res as TrailConnection;
    }
  } catch {
    // Connection doesn't exist
    return null;
  }

  return null;
}

/**
 * Remove a trail connection
 */
export async function removeConnection(userId: string): Promise<void> {
  await apiFetch<unknown>(`/trail-connections/with/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}
