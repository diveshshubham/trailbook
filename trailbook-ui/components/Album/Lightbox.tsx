"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type LightboxProps = {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  autoplay?: boolean;
  intervalMs?: number;
};

export default function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
  autoplay = false,
  intervalMs = 2500,
}: LightboxProps) {
  const src = images[index];
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(autoplay);

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    if (!playing || images.length <= 1) return;
    const id = window.setInterval(() => {
      onNext();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, images.length, intervalMs, onNext]);

  useEffect(() => {
    // Prevent background scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const counter = useMemo(() => `${index + 1} / ${images.length}`, [index, images.length]);

  if (!src) return null;
  if (!mounted) return null;

  const ui = (
    <div
      className="fixed inset-0 z-[9999] bg-black"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Minimal top overlay (stays on top of image) */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-[10px] tracking-[0.35em] uppercase">
            Slideshow
          </span>
          <span className="text-white/30">·</span>
          <span className="text-white/70 text-xs tracking-wide">{counter}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={images.length <= 1}
            className="rounded-full px-4 py-2 text-white/80 hover:text-white transition bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-40"
            title={playing ? "Pause (Space)" : "Play (Space)"}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-white/80 hover:text-white transition bg-white/10 hover:bg-white/15 border border-white/10"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="absolute inset-0">
        <img
          src={src}
          alt={`Photo ${index + 1}`}
          className="h-full w-full object-contain select-none"
          draggable={false}
          onDoubleClick={onClose}
          onClick={() => setPlaying((p) => !p)}
          title="Double click to close"
        />

        {/* Premium nav buttons */}
        <div className="absolute inset-y-0 left-0 flex items-center">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="ml-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/10 transition"
            aria-label="Previous"
          >
            ‹
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="mr-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/10 transition"
            aria-label="Next"
          >
            ›
          </button>
        </div>

        {/* Subtle bottom hint */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center text-white/30 text-xs tracking-wide">
          <span>Space / click to play-pause · Esc / double‑click to close</span>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}

