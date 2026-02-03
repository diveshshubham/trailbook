import { apiFetch } from "./api";

const DEFAULT_PUBLIC_ALBUMS_API_BASE_URL = "http://localhost:3008/api";

function getPublicAlbumsApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_PUBLIC_ALBUMS_API_BASE_URL || DEFAULT_PUBLIC_ALBUMS_API_BASE_URL;
  }
  return DEFAULT_PUBLIC_ALBUMS_API_BASE_URL;
}

export type AlbumInvitation = {
  _id?: string;
  id?: string;
  albumId: string;
  inviterId: string;
  inviteeUserId?: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  status: "pending" | "accepted" | "rejected";
  permission: "contributor" | "viewer" | "admin";
  autoConnect?: boolean;
  createdAt?: string;
  updatedAt?: string;
  album?: {
    _id: string;
    title: string;
    coverImage?: string;
    description?: string;
  };
  inviter?: {
    _id: string;
    email?: string;
    phone?: string;
    fullName?: string;
    profilePicture?: string;
    profile?: {
      fullName?: string;
      profilePicture?: string;
    };
  };
};

export type AlbumContributor = {
  userId: string;
  fullName?: string;
  bio?: string;
  profilePicture?: string;
  location?: string;
  permission?: "contributor" | "viewer" | "admin";
  contributionCount?: number;
  lastActive?: string;
};

export type AlbumActivity = {
  _id: string;
  albumId: string;
  activityType: "media_added" | "contributor_added" | "contributor_removed" | "album_updated" | "invitation_sent" | "invitation_accepted";
  userId?: string;
  user?: {
    _id: string;
    email: string;
    profile?: {
      fullName?: string;
      profilePicture?: string;
    };
  };
  media?: {
    _id: string;
    key: string;
    title?: string;
  };
  description?: string;
  createdAt: string;
};

export type AlbumAnalytics = {
  albumId: string;
  contributorCount: number;
  photoCount: number;
  activityStats: {
    media_added: number;
    contributor_added: number;
    invitation_sent: number;
    [key: string]: number;
  };
  topContributors: number;
};

// Create public album
export async function createPublicAlbum(data: {
  title: string;
  description?: string;
  allowContributors?: boolean;
}): Promise<{ albumId: string; message: string }> {
  const res = await apiFetch<{ success: boolean; data: { albumId: string; message: string } }>(
    `/public-albums/create`,
    {
      method: "POST",
      baseUrl: getPublicAlbumsApiBaseUrl(),
      body: JSON.stringify(data),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    return res.data as { albumId: string; message: string };
  }

  throw new Error("Failed to create public album");
}

// Invite user to album
export async function inviteToAlbum(data: {
  albumId: string;
  userId?: string;
  email?: string;
  phone?: string;
  permission?: "contributor" | "viewer" | "admin";
  autoConnect?: boolean;
}): Promise<{ invitationId: string; message: string }> {
  const res = await apiFetch<{ success: boolean; data: { invitationId: string; message: string } }>(
    `/public-albums/invite`,
    {
      method: "POST",
      baseUrl: getPublicAlbumsApiBaseUrl(),
      body: JSON.stringify(data),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    return res.data as { invitationId: string; message: string };
  }

  throw new Error("Failed to send invitation");
}

// Accept invitation
export async function acceptInvitation(invitationId: string): Promise<{ invitationId: string; message: string }> {
  const res = await apiFetch<{ success: boolean; data: { invitationId: string; message: string } }>(
    `/public-albums/invitations/${encodeURIComponent(invitationId)}/accept`,
    {
      method: "PUT",
      baseUrl: getPublicAlbumsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    return res.data as { invitationId: string; message: string };
  }

  throw new Error("Failed to accept invitation");
}

// Reject invitation
export async function rejectInvitation(invitationId: string): Promise<{ invitationId: string; message: string }> {
  const res = await apiFetch<{ success: boolean; data: { invitationId: string; message: string } }>(
    `/public-albums/invitations/${encodeURIComponent(invitationId)}/reject`,
    {
      method: "PUT",
      baseUrl: getPublicAlbumsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    return res.data as { invitationId: string; message: string };
  }

  throw new Error("Failed to reject invitation");
}

// Get my invitations
export async function getMyInvitations(): Promise<AlbumInvitation[]> {
  const res = await apiFetch<{ success: boolean; data: { invitations: AlbumInvitation[] } }>(
    `/public-albums/invitations/my`,
    {
      method: "GET",
      baseUrl: getPublicAlbumsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    const data = res.data as { invitations?: AlbumInvitation[] };
    return data.invitations || [];
  }

  return [];
}

// Get album contributors
export async function getAlbumContributors(albumId: string): Promise<AlbumContributor[]> {
  const res = await apiFetch<{ success: boolean; data: { contributors: AlbumContributor[] } }>(
    `/public-albums/${encodeURIComponent(albumId)}/contributors`,
    {
      method: "GET",
      baseUrl: getPublicAlbumsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    const data = res.data as { contributors?: AlbumContributor[] };
    return data.contributors || [];
  }

  return [];
}

// Remove contributor
export async function removeContributor(albumId: string, contributorId: string): Promise<{ message: string }> {
  const res = await apiFetch<{ success: boolean; data: { message: string } }>(
    `/public-albums/${encodeURIComponent(albumId)}/contributors/${encodeURIComponent(contributorId)}`,
    {
      method: "DELETE",
      baseUrl: getPublicAlbumsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    return res.data as { message: string };
  }

  throw new Error("Failed to remove contributor");
}

// Get album activity feed
export async function getAlbumActivity(albumId: string): Promise<AlbumActivity[]> {
  const res = await apiFetch<{ success: boolean; data: { activities: AlbumActivity[] } }>(
    `/public-albums/${encodeURIComponent(albumId)}/activity`,
    {
      method: "GET",
      baseUrl: getPublicAlbumsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    const data = res.data as { activities?: AlbumActivity[] };
    return data.activities || [];
  }

  return [];
}

// Get album analytics
export async function getAlbumAnalytics(albumId: string): Promise<AlbumAnalytics> {
  const res = await apiFetch<{ success: boolean; data: AlbumAnalytics }>(
    `/public-albums/${encodeURIComponent(albumId)}/analytics`,
    {
      method: "GET",
      baseUrl: getPublicAlbumsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null && "data" in res) {
    return res.data as AlbumAnalytics;
  }

  throw new Error("Failed to fetch analytics");
}
