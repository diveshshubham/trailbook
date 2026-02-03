import { apiFetch } from "@/lib/api";

export type PublicUserProfile = {
  _id: string;
  email?: string;
  profile?: {
    fullName?: string;
    bio?: string;
    location?: string;
    profilePicture?: string;
  };
};

export type PublicAlbum = {
  _id: string;
  id?: string;
  title?: string;
  name?: string;
  coverImage?: string;
  coverUrl?: string;
  cover?: string;
  photoCount?: number;
  photosCount?: number;
  location?: string;
  createdAt?: string;
  description?: string;
  isPublic?: boolean;
};

export type PublicProfileResponse = {
  profile: PublicUserProfile;
  albums: PublicAlbum[];
};

/**
 * Get public user profile information by userId
 * Tries multiple endpoints to find user profile
 */
export async function getPublicUserProfile(userId: string): Promise<PublicUserProfile | null> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required");
  }

  // Try different possible endpoints
  const endpoints = [
    `/users/${encodeURIComponent(userId)}/public`,
    `/users/${encodeURIComponent(userId)}`,
    `/users/${encodeURIComponent(userId)}/profile`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await apiFetch<unknown>(endpoint, {
        method: "GET",
        auth: false,
      });

      if (typeof res === "object" && res !== null) {
        // Handle different response formats
        if ("data" in res) {
          const data = (res as { data: unknown }).data;
          if (typeof data === "object" && data !== null) {
            if ("profile" in data) {
              return (data as { profile: PublicUserProfile }).profile;
            }
            if ("user" in data) {
              const user = (data as { user: unknown }).user;
              if (typeof user === "object" && user !== null) {
                // Convert user to PublicUserProfile format
                const userObj = user as { _id?: string; id?: string; email?: string; profile?: unknown };
                return {
                  _id: userObj._id || userObj.id || userId,
                  email: userObj.email,
                  profile: userObj.profile as PublicUserProfile["profile"],
                };
              }
            }
            // If data itself is the profile
            return data as PublicUserProfile;
          }
        }
        if ("profile" in res) {
          return (res as { profile: PublicUserProfile }).profile;
        }
        if ("user" in res) {
          const user = (res as { user: unknown }).user;
          if (typeof user === "object" && user !== null) {
            const userObj = user as { _id?: string; id?: string; email?: string; profile?: unknown };
            return {
              _id: userObj._id || userObj.id || userId,
              email: userObj.email,
              profile: userObj.profile as PublicUserProfile["profile"],
            };
          }
        }
        // If response itself is the profile
        return res as PublicUserProfile;
      }
    } catch (error) {
      // Try next endpoint
      continue;
    }
  }

  // If all endpoints fail, return null
  console.warn("Could not fetch user profile from any endpoint for userId:", userId);
  return null;
}

/**
 * Get public user profile (no authentication required)
 * Fetches both user profile and albums
 */
export async function getPublicProfile(userId: string): Promise<PublicProfileResponse> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required");
  }

  try {
    // Fetch albums and profile in parallel
    const [albumsRes, profileData] = await Promise.allSettled([
      apiFetch<unknown>(`/users/${encodeURIComponent(userId)}/public-albums`, {
        method: "GET",
        auth: false,
      }),
      getPublicUserProfile(userId),
    ]);

    let albums: PublicAlbum[] = [];
    let profile: PublicUserProfile | null = null;

    // Process albums response - the API returns both profile and albums in data
    if (albumsRes.status === "fulfilled") {
      const res = albumsRes.value;
      if (typeof res === "object" && res !== null) {
        // Handle the response structure: { success, message, data: { profile: {...}, albums: [...] } }
        if ("data" in res && typeof res.data === "object" && res.data !== null) {
          const data = res.data as { albums?: unknown; profile?: unknown };
          
          // Extract albums
          if ("albums" in data && Array.isArray(data.albums)) {
            albums = data.albums as PublicAlbum[];
          }
          
          // Extract profile from the same response
          if ("profile" in data && typeof data.profile === "object" && data.profile !== null) {
            const profileObj = data.profile as { fullName?: string; profilePicture?: string; bio?: string; location?: string };
            profile = {
              _id: userId,
              profile: {
                fullName: profileObj.fullName,
                profilePicture: profileObj.profilePicture,
                bio: profileObj.bio,
                location: profileObj.location,
              },
            };
          }
        } else if ("albums" in res && Array.isArray((res as { albums: unknown }).albums)) {
          albums = (res as { albums: PublicAlbum[] }).albums;
        } else if (Array.isArray(res)) {
          albums = res as PublicAlbum[];
        }
      }
    }

    // Use profile from albums response, or try separate call, or create minimal profile
    if (!profile) {
      if (profileData.status === "fulfilled" && profileData.value) {
        profile = profileData.value;
      } else {
        // Create minimal profile with userId
        profile = {
          _id: userId,
          profile: {
            fullName: undefined,
          },
        };
      }
    }

    return {
      profile,
      albums,
    };
  } catch (error) {
    // Log the full error for debugging
    console.error("getPublicProfile error:", {
      userId,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get public albums for a user
 */
export async function getPublicAlbums(userId: string): Promise<PublicAlbum[]> {
  const res = await apiFetch<unknown>(`/users/${encodeURIComponent(userId)}/public-albums`, {
    method: "GET",
    auth: false, // Public endpoint, no auth required
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res && Array.isArray((res as { data: unknown }).data)) {
      return (res as { data: PublicAlbum[] }).data;
    }
    if (Array.isArray(res)) {
      return res as PublicAlbum[];
    }
    if ("albums" in res && Array.isArray((res as { albums: unknown }).albums)) {
      return (res as { albums: PublicAlbum[] }).albums;
    }
  }

  return [];
}