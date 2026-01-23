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
  const href = album.id ? `/album/${album.id}` : "#";

  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-3xl bg-[var(--theme-surface)] shadow-theme border border-[var(--theme-border)] transition-all duration-500 hover:-translate-y-1 hover:shadow-theme-xl">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={album.cover}
            alt={album.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            {typeof album.isPublic === "boolean" && (
              <span
                className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold backdrop-blur-md border ${
                  album.isPublic
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-100"
                    : "bg-orange-500/20 border-orange-500/30 text-orange-100"
                }`}
              >
                {album.isPublic ? "Public" : "Private"}
              </span>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white text-sm font-semibold tracking-tight line-clamp-1">
              {album.title}
            </p>
            <div className="mt-2 flex items-center justify-between text-white/80 text-xs">
              <span className="tracking-wide">{photos} photos</span>
              {album.location && (
                <span className="tracking-wide line-clamp-1 max-w-[60%] text-right">
                  {album.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--theme-text-tertiary)]">
            {dateLabel || "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
  