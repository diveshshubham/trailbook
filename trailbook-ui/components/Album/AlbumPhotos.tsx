
"use client";

import { useEffect, useState } from "react";
import UploadDropzone from "./UploadDropzone";
import Lightbox from "@/components/Album/Lightbox";

type AlbumPhotosProps = {
  albumId?: string;
  photos?: string[];
  showUpload?: boolean;
  slideshowToken?: number;
};

export default function AlbumPhotos({
  albumId,
  photos,
  showUpload = true,
  slideshowToken,
}: AlbumPhotosProps) {
  const displayPhotos = photos && photos.length > 0 ? photos : [];

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  const open = (startIndex = 0, auto = false) => {
    setLightboxIndex(Math.max(0, Math.min(startIndex, displayPhotos.length - 1)));
    setAutoplay(auto);
    setLightboxOpen(true);
  };

  useEffect(() => {
    if (!slideshowToken) return;
    if (displayPhotos.length === 0) return;
    open(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideshowToken]);

  return (
    <section className="pb-20">
      {/* Dense grid (no huge empty whitespace) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 [grid-auto-flow:dense]">
        {showUpload && (
          <div className="md:col-span-1">
            <div className="aspect-[4/5]">
              <UploadDropzone albumId={albumId} />
            </div>
          </div>
        )}

        {displayPhotos.map((src, i) => (
          <PhotoCard key={src + i} src={src} index={i} onOpen={() => open(i, false)} />
        ))}
      </div>

      {displayPhotos.length === 0 && !showUpload && (
        <div className="py-20 text-center">
          <p className="text-gray-400 font-light italic">No memories captured here yet.</p>
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          images={displayPhotos}
          index={lightboxIndex}
          autoplay={autoplay}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
          onNext={() =>
            setLightboxIndex((i) => (i + 1) % Math.max(1, displayPhotos.length))
          }
        />
      )}
    </section>
  );
}

function PhotoCard({
  src,
  index,
  onOpen,
}: {
  src: string;
  index: number;
  onOpen: () => void;
}) {
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null);
  const aspectClass =
    isLandscape === null
      ? "aspect-[4/5]"
      : isLandscape
        ? "aspect-[16/10]"
        : "aspect-[4/5]";
  const spanClass = isLandscape ? "md:col-span-2" : "md:col-span-1";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative ${spanClass} ${aspectClass} w-full overflow-hidden rounded-3xl bg-gray-100 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 text-left`}
    >
      <img
        src={src}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        alt={`Moment ${index + 1}`}
        loading="lazy"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setIsLandscape(img.naturalWidth >= img.naturalHeight);
          }
        }}
      />

      {/* Elegant Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
        <span className="text-white/50 text-[10px] tracking-widest uppercase mb-2">
          Moment {index + 1}
        </span>
        <p className="text-white font-medium text-sm tracking-wide">View fullscreen</p>
      </div>
    </button>
  );
}
