"use client";

import Link from "next/link";

type AlbumCardAlbum = {
  id?: string;
  cover: string;
  title: string;
  /** Some screens/backend payloads use `photos`, others use `photosCount` */
  photos?: number;
  photosCount?: number;
  /** Some screens/backend payloads use `date`, others use `createdAt` */
  date?: string;
  createdAt?: string;
  location?: string;
  isPublic?: boolean;
  isArchived?: boolean;
  /** Optional custom href to override default album route */
  href?: string;
  /** Hide the date section at the bottom */
  hideDate?: boolean;
};

function formatDateLabel(dateLike?: string) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return dateLike;
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function AlbumCard({ album }: { album: AlbumCardAlbum }) {
  if (!album) return null; // 🛡️ safety guard

  const photos = album.photos ?? album.photosCount ?? 0;
  const dateLabel = formatDateLabel(album.date ?? album.createdAt);
  // Use custom href if provided, otherwise default to album route
  // IMPORTANT: href prop takes priority over id-based route
  const href = album.href ? album.href : (album.id ? `/album/${album.id}` : "#");

  return (
    <div className="group relative">
      <Link href={href} className="block">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--theme-surface)] shadow-theme border border-[var(--theme-border)] transition-all duration-500 hover:-translate-y-1 hover:shadow-theme-xl">
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={album.cover}
              alt={album.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />

            {/* Public/Private tag removed for cleaner design */}


          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white text-base font-bold tracking-tight line-clamp-2 mb-2 leading-snug">
              {album.title}
            </p>
            <div className="flex items-center gap-2 text-white/70 text-xs">
              {album.location && (
                <>
                  <span className="tracking-wide line-clamp-1">
                    {album.location}
                  </span>
                  <span className="opacity-50">·</span>
                </>
              )}
              <span className="tracking-wide">
                {photos} {photos === 1 ? "moment" : "moments"}
              </span>
            </div>
          </div>
        </div>

          {!album.hideDate && (
            <div className="px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--theme-text-tertiary)]">
                {dateLabel || "—"}
              </p>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
  