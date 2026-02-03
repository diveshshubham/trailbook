"use client";

import { useRouter } from "next/navigation";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

type ClickableUserAvatarProps = {
  userId: string;
  profilePicture?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showName?: boolean;
  fallbackSeed?: string;
};

export default function ClickableUserAvatar({
  userId,
  profilePicture,
  name,
  size = "md",
  className = "",
  showName = false,
  fallbackSeed,
}: ClickableUserAvatarProps) {
  const router = useRouter();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-20 h-20",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const avatarUrl =
    profilePicture
      ? resolveProfilePictureUrl(profilePicture) || resolveMediaUrl(profilePicture) || profilePicture
      : null;

  const fallbackUrl = fallbackSeed
    ? `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(fallbackSeed)}`
    : name
    ? `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`
    : `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(userId)}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/users/${userId}/public`);
  };

  return (
    <div
      className={`flex items-center gap-2 ${showName ? "cursor-pointer" : ""} ${className}`}
      onClick={showName ? handleClick : undefined}
    >
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden ring-2 ring-[var(--theme-border)] shadow-sm transition-all duration-200 hover:scale-110 hover:ring-[var(--theme-accent)]/40 hover:shadow-md cursor-pointer`}
        onClick={handleClick}
        title={name ? `View ${name}'s profile` : "View profile"}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name || "User"}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <img
            src={fallbackUrl}
            alt={name || "User"}
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </div>
      {showName && name && (
        <span
          className={`font-semibold ${textSizes[size]} text-[var(--theme-text-primary)] hover:text-[var(--theme-accent)] transition-colors`}
        >
          {name}
        </span>
      )}
    </div>
  );
}
