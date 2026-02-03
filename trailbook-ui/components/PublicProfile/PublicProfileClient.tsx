"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getPublicProfile, type PublicProfileResponse, type PublicAlbum } from "@/lib/publicProfileApi";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import AlbumCard from "@/components/Profile/AlbumCard";
import WalkedTogetherButton from "@/components/TrailConnections/WalkedTogetherButton";
import ConnectionRequestButton from "@/components/Connections/ConnectionRequestButton";
import ScrollToTop from "@/components/Album/ScrollToTop";
import Link from "next/link";
import Image from "next/image";

export default function PublicProfileClient({ userId }: { userId: string }) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicProfile(userId);
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load public profile", err);
        if (!cancelled) {
          // Provide more specific error messages
          if (err instanceof Error) {
            if (err.message.includes("404") || err.message.includes("Not Found")) {
              setError("User profile not found. This user may not exist or their profile is private.");
            } else if (err.message.includes("401") || err.message.includes("Unauthorized")) {
              setError("Access denied. This profile may be private.");
            } else {
              setError(`Failed to load profile: ${err.message}`);
            }
          } else {
            setError("Failed to load profile. Please try again later.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: "var(--theme-background)" }}>
        <ScrollToTop />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-current border-t-transparent mb-4" />
            <p style={{ color: "var(--theme-text-secondary)" }}>Loading profile...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: "var(--theme-background)" }}>
        <ScrollToTop />
        <div className="flex items-center justify-center min-h-screen px-6">
          <div className="text-center max-w-md">
            <p
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--theme-text-primary)" }}
            >
              Profile not found
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              {error || "This profile doesn't exist or is not public."}
            </p>
            <Link
              href="/"
              className="inline-block rounded-full px-6 py-3 text-sm font-semibold border transition"
              style={{
                backgroundColor: "var(--theme-surface)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text-primary)",
              }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const userProfile = profile.profile;
  // Try multiple ways to get the user's name
  const userName = 
    userProfile.profile?.fullName || 
    userProfile.email?.split("@")[0] || 
    (userProfile._id ? `User ${userProfile._id.slice(-6)}` : "User");
  const profilePicture = userProfile.profile?.profilePicture
    ? resolveProfilePictureUrl(userProfile.profile.profilePicture)
    : null;
  const bio = userProfile.profile?.bio;
  const location = userProfile.profile?.location;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--theme-background)" }}>
      <ScrollToTop />

      {/* Header */}
      <div
        className="relative overflow-hidden border-b transition-colors duration-300"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-surface)",
        }}
      >
        {isDefault ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/50" />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-200/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-yellow-200/20 blur-3xl" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-30"
              style={{ background: "var(--theme-gradient-secondary)" }}
            />
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
            />
            <div
              className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl"
              style={{ backgroundColor: "var(--theme-info)", opacity: 0.1 }}
            />
          </>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="flex flex-col sm:flex-row sm:items-start gap-8">
            {/* Profile Picture - Premium Design */}
            <div className="relative shrink-0">
              <div 
                className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-3xl overflow-hidden shadow-2xl ring-4 transition-all duration-300 hover:scale-105"
                style={{
                  ringColor: isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-accent-light)",
                  backgroundColor: "var(--theme-surface-elevated)",
                }}
              >
                {profilePicture ? (
                  <Image
                    src={profilePicture}
                    alt={userName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 128px, 160px"
                  />
                ) : (
                  <div
                    className="h-full w-full grid place-items-center text-5xl font-bold"
                    style={{
                      background: isDefault 
                        ? "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(236, 72, 153, 0.15))" 
                        : "var(--theme-gradient-secondary)",
                      color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                    }}
                  >
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {/* Premium glow effect */}
                <div 
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: isDefault
                      ? "radial-gradient(circle, rgba(249, 115, 22, 0.2), transparent)"
                      : "radial-gradient(circle, var(--theme-accent-light), transparent)",
                  }}
                />
              </div>
            </div>

            {/* Profile Info - Enhanced */}
            <div className="flex-1 min-w-0">
              <div className="mb-4">
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-2 bg-gradient-to-r bg-clip-text"
                  style={{ 
                    color: "var(--theme-text-primary)",
                    backgroundImage: isDefault 
                      ? "linear-gradient(to right, rgb(234, 88, 12), rgb(236, 72, 153))"
                      : "var(--theme-gradient-primary)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {userName}
                </h1>
                {bio && (
                  <p
                    className="text-base sm:text-lg mt-3 leading-relaxed max-w-2xl"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {bio}
                  </p>
                )}
              </div>
              
              {location && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📍</span>
                  <p
                    className="text-sm sm:text-base font-medium"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {location}
                  </p>
                </div>
              )}
              {bio && (
                <p
                  className="text-sm sm:text-base leading-relaxed max-w-2xl mb-4"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  {bio}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div 
                  className="px-4 py-2 rounded-full border backdrop-blur-sm"
                  style={{
                    backgroundColor: isDefault ? "rgba(249, 115, 22, 0.08)" : "var(--theme-surface-elevated)",
                    borderColor: isDefault ? "rgba(249, 115, 22, 0.2)" : "var(--theme-border)",
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    {profile.albums.length} {profile.albums.length === 1 ? "album" : "albums"}
                  </p>
                </div>
                <WalkedTogetherButton
                  userId={userProfile._id}
                />
                <ConnectionRequestButton
                  userId={userProfile._id}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Albums Grid - Premium Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="mb-8">
          <h2 
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ color: "var(--theme-text-primary)" }}
          >
            Albums
          </h2>
          <p 
            className="text-sm"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            Stories from the wild
          </p>
        </div>
        {profile.albums.length === 0 ? (
          <div className="py-24 sm:py-32 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 opacity-60"
              style={{
                backgroundColor: isDefault ? "rgba(249, 115, 22, 0.08)" : "var(--theme-accent-light)",
              }}
            >
              <span className="text-5xl">📖</span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-light mb-4 leading-tight"
              style={{ color: "var(--theme-text-primary)" }}
            >
              No public albums yet
            </h2>
            <p
              className="text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              This trailblazer hasn't shared any albums publicly yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {profile.albums.map((album: PublicAlbum) => {
              const albumId = album._id || album.id || "";
              const cover = resolveMediaUrl(album.coverImage || album.coverUrl || album.cover);

              return (
                <AlbumCard
                  key={albumId}
                  album={{
                    id: albumId,
                    title: album.title || album.name || "Untitled story",
                    cover: cover || "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
                    photosCount: album.photoCount ?? album.photosCount,
                    location: album.location,
                    isPublic: album.isPublic,
                    date: album.createdAt,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
