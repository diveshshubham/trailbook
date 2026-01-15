
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UploadDropzone from "./UploadDropzone";
import Lightbox, { type LightboxItem, type MediaMeta } from "@/components/Album/Lightbox";
import type { MediaItem } from "@/lib/trailbookApi";
import { usePublicAlbumGate } from "@/components/Share/PublicAlbumGate";

type AlbumPhotosProps = {
  albumId?: string;
  photos?: string[];
  mediaItems?: MediaItem[];
  showUpload?: boolean;
  slideshowToken?: number;
  onSaveMediaMeta?: (mediaId: string, meta: MediaMeta) => Promise<void> | void;
  onSetCover?: (media: MediaItem) => Promise<void> | void;
  reflectionCounts?: Record<string, number>;
  protectImages?: boolean;
};

export default function AlbumPhotos({
  albumId,
  photos,
  mediaItems,
  showUpload = true,
  slideshowToken,
  onSaveMediaMeta,
  onSetCover,
  reflectionCounts,
  protectImages = false,
}: AlbumPhotosProps) {
  const gate = usePublicAlbumGate();
  const locked = gate?.locked === true;
  const previewLimit = locked ? 5 : undefined;

  const displayPhotos = photos && photos.length > 0 ? photos : [];
  const [landscapeBySrc, setLandscapeBySrc] = useState<Record<string, boolean>>({});

  const lightboxItems: LightboxItem[] = useMemo(() => {
    if (!mediaItems?.length) return [];
    return mediaItems
      .map((m) => ({
        id: m._id,
        src: m.url || m.key,
        meta: {
          title: m.title,
          description: m.description,
          location: m.location,
          tags: m.tags,
          story: m.story,
          isPublic: m.isPublic,
        },
      }))
      .filter((i) => Boolean(i.src));
  }, [mediaItems]);

  const allSources = lightboxItems.length ? lightboxItems.map((i) => i.src) : displayPhotos;
  const isPreview = typeof previewLimit === "number" && allSources.length > previewLimit;
  const sources = isPreview ? allSources.slice(0, previewLimit) : allSources;
  const visibleLightboxItems = lightboxItems.length
    ? (isPreview ? lightboxItems.slice(0, previewLimit) : lightboxItems)
    : [];

  const desktopRows = useMemo(() => {
    // Desktop: premium "magazine" layout with truly dynamic sizing.
    // Key rules:
    // - Portraits stay portrait (tall aspect). Landscapes stay landscape (wide aspect).
    // - Avoid mixing portrait + landscape in the same row to prevent awkward empty space.
    const out: Array<
      | { type: "singleLandscape"; idx: number }
      | { type: "singlePortrait"; idx: number }
      | { type: "pairLandscape"; left: number; right: number }
      | { type: "pairPortrait"; left: number; right: number }
    > = [];

    let i = showUpload ? 1 : 0; // first photo is featured beside upload
    while (i < sources.length) {
      const a = sources[i];
      const b = sources[i + 1];
      const aLandscape = landscapeBySrc[a] === true;
      const aPortrait = landscapeBySrc[a] === false;
      const bLandscape = b ? landscapeBySrc[b] === true : false;
      const bPortrait = b ? landscapeBySrc[b] === false : false;

      // Pair only when both orientations match (keeps rows clean).
      if (aPortrait && bPortrait) {
        out.push({ type: "pairPortrait", left: i, right: i + 1 });
        i += 2;
        continue;
      }
      if (aLandscape && bLandscape) {
        out.push({ type: "pairLandscape", left: i, right: i + 1 });
        i += 2;
        continue;
      }

      if (aPortrait) out.push({ type: "singlePortrait", idx: i });
      else out.push({ type: "singleLandscape", idx: i }); // landscape or unknown → wide
      i += 1;
    }

    return out;
  }, [sources, landscapeBySrc, showUpload]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftMeta, setDraftMeta] = useState<MediaMeta>({});
  const [savingMeta, setSavingMeta] = useState(false);
  const [detailsOnOpen, setDetailsOnOpen] = useState(false);

  const open = (startIndex = 0, auto = false, openDetails = false) => {
    const max = Math.max(0, sources.length - 1);
    const idx = Math.max(0, Math.min(startIndex, max));
    setLightboxIndex(idx);
    // Editing should NEVER autoplay
    setAutoplay(openDetails ? false : auto);
    setDetailsOnOpen(openDetails);
    setLightboxOpen(true);

    if (visibleLightboxItems.length) {
      const item = visibleLightboxItems[idx];
      setActiveId(item?.id || null);
      setDraftMeta(item?.meta || {});
    } else {
      setActiveId(null);
      setDraftMeta({});
    }
  };

  useEffect(() => {
    if (!slideshowToken) return;
    if (sources.length === 0) return;
    open(0, true, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideshowToken]);

  const goPrev = () => {
    const nextIndex = Math.max(0, lightboxIndex - 1);
    setLightboxIndex(nextIndex);
    if (visibleLightboxItems.length) {
      const item = visibleLightboxItems[nextIndex];
      setActiveId(item?.id || null);
      setDraftMeta(item?.meta || {});
    }
  };

  const goNext = () => {
    const len = Math.max(1, sources.length);
    const nextIndex = (lightboxIndex + 1) % len;
    setLightboxIndex(nextIndex);
    if (visibleLightboxItems.length) {
      const item = visibleLightboxItems[nextIndex];
      setActiveId(item?.id || null);
      setDraftMeta(item?.meta || {});
    }
  };

  const getReflectionCountForIndex = (i: number) => {
    const m = mediaItems?.[i];
    const id = m?._id;
    if (!id) return 0;
    const fromMap = reflectionCounts?.[id];
    if (typeof fromMap === "number") return fromMap;
    const direct = (m as unknown as { reflectionsCount?: number }).reflectionsCount;
    return typeof direct === "number" ? direct : 0;
  };

  return (
    <section className="pb-20">
      {/* Mobile: simple stack */}
      <div className="md:hidden space-y-6">
        {showUpload && (
          <div className="aspect-[4/5]">
            <UploadDropzone albumId={albumId} />
          </div>
        )}
        {sources.map((src, i) => (
          <PhotoCard
            key={src + i}
            src={src}
            index={i}
            // Mobile: keep original aspect ratio (no forced crop)
            frameClass="rounded-3xl overflow-hidden bg-gray-100"
            imgClass="h-auto object-contain bg-gray-100"
            forceControlsVisible
            onOpen={() => open(i, false)}
            onInfo={() => open(i, false, true)}
            hasMeta={Boolean(
              lightboxItems[i]?.meta?.title ||
                lightboxItems[i]?.meta?.location ||
                lightboxItems[i]?.meta?.tags?.length
            )}
            onSetCover={onSetCover && mediaItems?.[i] ? () => onSetCover(mediaItems[i]) : undefined}
            reflectionCount={getReflectionCountForIndex(i)}
            protectImage={protectImages}
            onMeasured={(isLandscape) =>
              setLandscapeBySrc((prev) => (prev[src] === isLandscape ? prev : { ...prev, [src]: isLandscape }))
            }
          />
        ))}
      </div>

      {/* Tablet: clean 2-col grid (no holes; landscapes can be full-row) */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-2 gap-6">
          {showUpload && (
            <div className="col-span-1">
              <div className="aspect-[4/5]">
                <UploadDropzone albumId={albumId} />
              </div>
            </div>
          )}

          {sources.map((src, i) => {
            // Keep the first photo beside the upload card (if upload exists), even if it's landscape.
            const isLandscape = landscapeBySrc[src] === true;
            const span =
              showUpload && i === 0 ? "col-span-1" : isLandscape ? "col-span-2" : "col-span-1";
            const aspect = isLandscape ? "aspect-[16/10]" : "aspect-[4/5]";
            return (
              <PhotoCard
                key={`t-${src}-${i}`}
                src={src}
                index={i}
                frameClass={`${span} ${aspect}`}
                protectImage={protectImages}
                onOpen={() => open(i, false)}
                onInfo={() => open(i, false, true)}
                hasMeta={Boolean(
                  lightboxItems[i]?.meta?.title ||
                    lightboxItems[i]?.meta?.location ||
                    lightboxItems[i]?.meta?.tags?.length
                )}
                onSetCover={onSetCover && mediaItems?.[i] ? () => onSetCover(mediaItems[i]) : undefined}
                reflectionCount={getReflectionCountForIndex(i)}
                onMeasured={(isL) =>
                  setLandscapeBySrc((prev) => (prev[src] === isL ? prev : { ...prev, [src]: isL }))
                }
              />
            );
          })}
        </div>
      </div>

      {/* Desktop: premium magazine layout */}
      <div className="hidden lg:block space-y-10">
        {/* First row: upload + featured photo */}
        {showUpload && (
          <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 items-stretch">
            <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0">
              <div className="aspect-[4/5]">
                <UploadDropzone albumId={albumId} />
              </div>
            </div>

            {sources[0] && (
              <div className="flex-1 min-w-0">
                <PhotoCard
                  src={sources[0]}
                  index={0}
                  frameClass={
                    landscapeBySrc[sources[0]] === false
                      ? "aspect-[3/4] max-w-[560px] mx-auto"
                      : "aspect-[16/9]"
                  }
                  protectImage={protectImages}
                  onOpen={() => open(0, false)}
                  onInfo={() => open(0, false, true)}
                  hasMeta={Boolean(
                    lightboxItems[0]?.meta?.title ||
                      lightboxItems[0]?.meta?.location ||
                      lightboxItems[0]?.meta?.tags?.length
                  )}
                  onSetCover={onSetCover && mediaItems?.[0] ? () => onSetCover(mediaItems[0]) : undefined}
                  reflectionCount={getReflectionCountForIndex(0)}
                  onMeasured={(isL) =>
                    setLandscapeBySrc((prev) =>
                      prev[sources[0]] === isL ? prev : { ...prev, [sources[0]]: isL }
                    )
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Remaining rows */}
        <div className="space-y-10">
          {desktopRows.map((row, ri) => {
            if (row.type === "singleLandscape") {
              const src = sources[row.idx];
              return (
                <PhotoCard
                  key={`d-row-${ri}-sl-${row.idx}`}
                  src={src}
                  index={row.idx}
                  frameClass="aspect-[16/9]"
                  protectImage={protectImages}
                  onOpen={() => open(row.idx, false)}
                  onInfo={() => open(row.idx, false, true)}
                  hasMeta={Boolean(
                    lightboxItems[row.idx]?.meta?.title ||
                      lightboxItems[row.idx]?.meta?.location ||
                      lightboxItems[row.idx]?.meta?.tags?.length
                  )}
                  onSetCover={
                    onSetCover && mediaItems?.[row.idx] ? () => onSetCover(mediaItems[row.idx]) : undefined
                  }
                  reflectionCount={getReflectionCountForIndex(row.idx)}
                  onMeasured={(isL) =>
                    setLandscapeBySrc((prev) => (prev[src] === isL ? prev : { ...prev, [src]: isL }))
                  }
                />
              );
            }

            if (row.type === "singlePortrait") {
              const src = sources[row.idx];
              return (
                <PhotoCard
                  key={`d-row-${ri}-sp-${row.idx}`}
                  src={src}
                  index={row.idx}
                  frameClass="aspect-[3/4] max-w-[560px] mx-auto"
                  protectImage={protectImages}
                  onOpen={() => open(row.idx, false)}
                  onInfo={() => open(row.idx, false, true)}
                  hasMeta={Boolean(
                    lightboxItems[row.idx]?.meta?.title ||
                      lightboxItems[row.idx]?.meta?.location ||
                      lightboxItems[row.idx]?.meta?.tags?.length
                  )}
                  onSetCover={
                    onSetCover && mediaItems?.[row.idx] ? () => onSetCover(mediaItems[row.idx]) : undefined
                  }
                  reflectionCount={getReflectionCountForIndex(row.idx)}
                  onMeasured={(isL) =>
                    setLandscapeBySrc((prev) => (prev[src] === isL ? prev : { ...prev, [src]: isL }))
                  }
                />
              );
            }

            if (row.type === "pairLandscape") {
              const leftSrc = sources[row.left];
              const rightSrc = sources[row.right];
              return (
                <div key={`d-row-${ri}-pl-${row.left}-${row.right}`} className="grid grid-cols-2 gap-8 xl:gap-10">
                  <PhotoCard
                    src={leftSrc}
                    index={row.left}
                    frameClass="aspect-[16/10]"
                    protectImage={protectImages}
                    onOpen={() => open(row.left, false)}
                    onInfo={() => open(row.left, false, true)}
                    hasMeta={Boolean(
                      lightboxItems[row.left]?.meta?.title ||
                        lightboxItems[row.left]?.meta?.location ||
                        lightboxItems[row.left]?.meta?.tags?.length
                    )}
                    onSetCover={
                      onSetCover && mediaItems?.[row.left] ? () => onSetCover(mediaItems[row.left]) : undefined
                    }
                    reflectionCount={getReflectionCountForIndex(row.left)}
                    onMeasured={(isL) =>
                      setLandscapeBySrc((prev) =>
                        prev[leftSrc] === isL ? prev : { ...prev, [leftSrc]: isL }
                      )
                    }
                  />
                  <PhotoCard
                    src={rightSrc}
                    index={row.right}
                    frameClass="aspect-[16/10]"
                    protectImage={protectImages}
                    onOpen={() => open(row.right, false)}
                    onInfo={() => open(row.right, false, true)}
                    hasMeta={Boolean(
                      lightboxItems[row.right]?.meta?.title ||
                        lightboxItems[row.right]?.meta?.location ||
                        lightboxItems[row.right]?.meta?.tags?.length
                    )}
                    onSetCover={
                      onSetCover && mediaItems?.[row.right] ? () => onSetCover(mediaItems[row.right]) : undefined
                    }
                    reflectionCount={getReflectionCountForIndex(row.right)}
                    onMeasured={(isL) =>
                      setLandscapeBySrc((prev) =>
                        prev[rightSrc] === isL ? prev : { ...prev, [rightSrc]: isL }
                      )
                    }
                  />
                </div>
              );
            }

            // pairPortrait
            const leftSrc = sources[row.left];
            const rightSrc = sources[row.right];
            return (
              <div key={`d-row-${ri}-pp-${row.left}-${row.right}`} className="grid grid-cols-2 gap-8 xl:gap-10">
                <PhotoCard
                  src={leftSrc}
                  index={row.left}
                  frameClass="aspect-[3/4]"
                  protectImage={protectImages}
                  onOpen={() => open(row.left, false)}
                  onInfo={() => open(row.left, false, true)}
                  hasMeta={Boolean(
                    lightboxItems[row.left]?.meta?.title ||
                      lightboxItems[row.left]?.meta?.location ||
                      lightboxItems[row.left]?.meta?.tags?.length
                  )}
                  onSetCover={
                    onSetCover && mediaItems?.[row.left] ? () => onSetCover(mediaItems[row.left]) : undefined
                  }
                  reflectionCount={getReflectionCountForIndex(row.left)}
                  onMeasured={(isL) =>
                    setLandscapeBySrc((prev) =>
                      prev[leftSrc] === isL ? prev : { ...prev, [leftSrc]: isL }
                    )
                  }
                />
                <PhotoCard
                  src={rightSrc}
                  index={row.right}
                  frameClass="aspect-[3/4]"
                  protectImage={protectImages}
                  onOpen={() => open(row.right, false)}
                  onInfo={() => open(row.right, false, true)}
                  hasMeta={Boolean(
                    lightboxItems[row.right]?.meta?.title ||
                      lightboxItems[row.right]?.meta?.location ||
                      lightboxItems[row.right]?.meta?.tags?.length
                  )}
                  onSetCover={
                    onSetCover && mediaItems?.[row.right] ? () => onSetCover(mediaItems[row.right]) : undefined
                  }
                  reflectionCount={getReflectionCountForIndex(row.right)}
                  onMeasured={(isL) =>
                    setLandscapeBySrc((prev) =>
                      prev[rightSrc] === isL ? prev : { ...prev, [rightSrc]: isL }
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {displayPhotos.length === 0 && !showUpload && (
        <div className="py-20 text-center">
          <p className="text-gray-400 font-light italic">No memories captured here yet.</p>
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          images={sources}
          items={visibleLightboxItems.length ? visibleLightboxItems : undefined}
          index={lightboxIndex}
          autoplay={autoplay}
          protectImages={protectImages}
          onClose={() => setLightboxOpen(false)}
          onPrev={goPrev}
          onNext={goNext}
          meta={draftMeta}
          onMetaChange={onSaveMediaMeta ? setDraftMeta : undefined}
          savingMeta={savingMeta}
          initialDetailsOpen={detailsOnOpen}
          onSaveMeta={
            activeId && onSaveMediaMeta
              ? async () => {
                  try {
                    setSavingMeta(true);
                    await onSaveMediaMeta(activeId, draftMeta);
                  } finally {
                    setSavingMeta(false);
                  }
                }
              : undefined
          }
        />
      )}

      {/* Public preview paywall (shown only when locked) */}
      {isPreview && (
        <div className="mt-12">
          <div className="rounded-[32px] border border-black/5 bg-white shadow-sm overflow-hidden">
            <div className="p-8 sm:p-10">
              <p className="text-[10px] uppercase tracking-[0.45em] text-gray-400 font-semibold">
                Public preview
              </p>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Unlock the remaining {allSources.length - (previewLimit || 0)} photos
              </h3>
              <p className="mt-3 text-gray-600 leading-relaxed max-w-2xl">
                You’ve already viewed this chapter once on this device. Sign up to revisit, save, and
                explore the full gallery anytime.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("tb:open-auth"))}
                  className="rounded-full px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:opacity-95 transition"
                >
                  Login / Sign up
                </button>
                <Link
                  href="/"
                  className="rounded-full px-6 py-3 bg-white border border-black/10 text-gray-900 font-semibold hover:bg-gray-50 transition text-center"
                >
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PhotoCard({
  src,
  index,
  onOpen,
  onInfo,
  hasMeta,
  onSetCover,
  reflectionCount = 0,
  frameClass,
  onMeasured,
  imgClass,
  forceControlsVisible,
  blurBackground,
  protectImage,
}: {
  src: string;
  index: number;
  onOpen: () => void;
  onInfo: () => void;
  hasMeta: boolean;
  onSetCover?: () => void;
  reflectionCount?: number;
  frameClass?: string;
  onMeasured?: (isLandscape: boolean) => void;
  imgClass?: string;
  forceControlsVisible?: boolean;
  blurBackground?: boolean;
  protectImage?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group relative ${frameClass || "aspect-[4/5]"} w-full overflow-hidden rounded-3xl bg-gray-100 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 text-left cursor-pointer`}
    >
      {blurBackground && (
        <>
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        </>
      )}
      <img
        src={src}
        className={[
          // default: premium cover crop on larger screens
          "w-full transition-transform duration-700",
          imgClass || "h-full object-cover group-hover:scale-110",
        ].join(" ")}
        alt={`Moment ${index + 1}`}
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => {
          if (protectImage) e.preventDefault();
        }}
        onDragStart={(e) => {
          if (protectImage) e.preventDefault();
        }}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            onMeasured?.(img.naturalWidth >= img.naturalHeight);
          }
        }}
      />

      {/* Reflection count pill (only when > 0) */}
      {reflectionCount > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold tracking-wide shadow-xl shadow-black/30">
            ✦ {reflectionCount}
          </div>
        </div>
      )}

      {/* Only show “Add details” control when metadata is missing */}
      {!hasMeta && (
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInfo();
            }}
            className={[
              "tb-add-info group/icon relative h-10 w-10 grid place-items-center rounded-full",
              "bg-white/0 hover:bg-white/10 border border-white/0 hover:border-white/10 backdrop-blur-md text-white/90 transition",
              forceControlsVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
            ].join(" ")}
            title="Add info"
          >
            {/* Premium “add info” mark (circle + i + plus) */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-90 mix-blend-difference"
            >
              <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="1.6" />
              <path d="M12 11V16" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M12 8.25h.01" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M18.5 9.5v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M16.5 11.5h4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Set as cover (tiny premium icon) */}
      {onSetCover && (
        <div className="absolute top-4 left-4 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSetCover();
            }}
            className={[
              "h-10 w-10 grid place-items-center rounded-full",
              "bg-white/0 hover:bg-white/10 border border-white/0 hover:border-white/10 backdrop-blur-md text-white/90 transition",
              forceControlsVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
            ].join(" ")}
            title="Set as cover"
            aria-label="Set as cover"
          >
            {/* bookmark icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5V20l-6.5-3-6.5 3V6A1.5 1.5 0 0 1 7 4.5Z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Elegant Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
        <span className="text-white/50 text-[10px] tracking-widest uppercase mb-2">
          Moment {index + 1}
        </span>
        <p className="text-white font-medium text-sm tracking-wide">View fullscreen</p>
      </div>
    </div>
  );
}
