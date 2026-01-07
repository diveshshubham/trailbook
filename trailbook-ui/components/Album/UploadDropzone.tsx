"use client";

import { useRef, useState } from "react";
import { getPresignedUrl, uploadMedia } from "@/lib/trailbookApi";

export default function UploadDropzone({ albumId }: { albumId?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !albumId) return;

    try {
      setUploading(true);

      // 1) Get presigned URL from backend
      const { uploadUrl, key } = await getPresignedUrl({
        albumId,
        contentType: file.type,
      });

      // 2) PUT file to S3
      const form = new FormData();
      form.append("uploadUrl", uploadUrl);
      form.append("contentType", file.type);
      form.append("file", file);

      const proxyRes = await fetch("/api/s3-upload", {
        method: "POST",
        body: form,
      });
      if (!proxyRes.ok) {
        throw new Error(`Upload failed: ${proxyRes.status}`);
      }

      // 3) Notify backend about uploaded media
      await uploadMedia({
        albumId,
        key,
        contentType: file.type,
        size: file.size,
      });

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full rounded-3xl overflow-hidden border border-black/5 bg-white shadow-sm">
      <div className="h-full w-full relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />

        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="relative h-full w-full flex flex-col items-center justify-center px-8 text-center"
        >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept="image/*"
      />
      
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-all duration-500 border ${
                uploading
                  ? "bg-orange-100 animate-pulse border-orange-200"
                  : "bg-white/60 border-white/40 hover:scale-110"
              }`}
            >
              <span className="text-2xl">{uploading ? "⏳" : "＋"}</span>
            </div>

            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-semibold">
              Add to this story
            </p>
            <p className="mt-3 text-xl font-bold tracking-tight text-gray-900">
              {uploading ? "Uploading…" : "Upload photos"}
            </p>
            <p className="mt-2 text-sm text-gray-500 max-w-sm leading-relaxed">
              Drop a photo here or click to select. We’ll add it to your album instantly.
            </p>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2 text-xs font-semibold tracking-wide shadow-lg shadow-black/10">
              <span>{uploading ? "Please wait" : "Choose file"}</span>
              <span className="opacity-70">→</span>
            </div>
          </div>

          {/* Decorative frame */}
          <div className="absolute inset-6 rounded-[28px] border border-black/5 border-dashed" />
          <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-black/10 rounded-tl-xl" />
          <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-black/10 rounded-br-xl" />
        </button>
      </div>
    </div>
  );
}
  