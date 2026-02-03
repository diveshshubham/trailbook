"use client";

import { useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getPresignedUrls, uploadMedia } from "@/lib/trailbookApi";

type UploadProgress = {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
};

export default function UploadDropzone({ albumId }: { albumId?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !albumId) return;

    try {
      setUploading(true);

      // Initialize progress tracking
      const progress: UploadProgress[] = files.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "pending",
      }));
      setUploadProgress(progress);

      // 1) Get presigned URLs for all files at once
      let presignedUrls: Array<{ uploadUrl: string; key: string }>;
      try {
        presignedUrls = await getPresignedUrls({
          albumId,
          files: files.map((file) => ({ contentType: file.type })),
          expiresInSeconds: 300,
        });

        if (presignedUrls.length !== files.length) {
          throw new Error(
            `Mismatch: expected ${files.length} presigned URLs, got ${presignedUrls.length}`
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to get upload URLs. Please try again.";
        console.error("Error getting presigned URLs:", err);
        alert(`Upload failed: ${errorMessage}`);
        setUploading(false);
        setUploadProgress([]);
        return;
      }

      // 2) Upload all files in parallel
      const uploadPromises = files.map(async (file, index) => {
        const { uploadUrl, key } = presignedUrls[index];

        try {
          // Update status to uploading
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index ? { ...p, status: "uploading", progress: 10 } : p
            )
          );

          // PUT file to S3
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

          // Update progress
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index ? { ...p, progress: 80 } : p
            )
          );

          // 3) Notify backend about uploaded media
          await uploadMedia({
            albumId,
            key,
            contentType: file.type,
            size: file.size,
          });

          // Mark as completed
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index ? { ...p, status: "completed", progress: 100 } : p
            )
          );
          return { success: true, index };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Upload failed";
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index
                ? { ...p, status: "error", error: errorMessage }
                : p
            )
          );
          return { success: false, index, error: errorMessage };
        }
      });

      // Wait for all uploads to complete
      const results = await Promise.allSettled(uploadPromises);

      // Check results after state updates
      setTimeout(() => {
        setUploadProgress((current) => {
          const successCount = current.filter((p) => p.status === "completed").length;
          const errorCount = current.filter((p) => p.status === "error").length;

          if (errorCount > 0 && successCount < files.length) {
            alert(
              `${successCount} file(s) uploaded successfully. ${errorCount} file(s) failed.`
            );
          }
          return current;
        });
      }, 100);

      // Reload page after a short delay to show completion
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);
    }
  };

  return (
    <div className="h-full rounded-3xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-theme transition-all duration-300">
      <div className="h-full w-full relative">
        {isDefault ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50" />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-50"
              style={{ background: "var(--theme-gradient-secondary)" }}
            />
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
            />
            <div
              className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
            />
          </>
        )}

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
        multiple
      />
      
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-all duration-500 border ${
                uploading
                  ? "animate-pulse"
                  : "hover:scale-110"
              }`}
              style={{
                backgroundColor: uploading
                  ? "var(--theme-accent-light)"
                  : isDefault
                    ? "rgba(255, 255, 255, 0.6)"
                    : "var(--theme-surface)",
                borderColor: uploading
                  ? "var(--theme-accent)"
                  : isDefault
                    ? "rgba(255, 255, 255, 0.4)"
                    : "var(--theme-border)",
                opacity: uploading ? 1 : 0.6,
              }}
            >
              <span className="text-2xl">{uploading ? "⏳" : "＋"}</span>
            </div>

            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--theme-text-tertiary)] font-semibold">
              Add to this story
            </p>
            <p className="mt-3 text-xl font-bold tracking-tight text-[var(--theme-text-primary)]">
              {uploading 
                ? uploadProgress.length > 0
                  ? `Uploading ${uploadProgress.filter(p => p.status === "completed").length}/${uploadProgress.length}...`
                  : "Uploading…"
                : "Upload photos"}
            </p>
            <p className="mt-2 text-sm text-[var(--theme-text-secondary)] max-w-sm leading-relaxed">
              Drop photos here or click to select multiple. We'll add them to your album instantly.
            </p>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="mt-6 w-full max-w-md space-y-2">
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span 
                        className="truncate flex-1"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
                        {progress.fileName}
                      </span>
                      <span 
                        className="ml-2 text-[10px]"
                        style={{ 
                          color: progress.status === "error" 
                            ? "var(--theme-error)" 
                            : progress.status === "completed"
                            ? "var(--theme-success)"
                            : "var(--theme-text-tertiary)"
                        }}
                      >
                        {progress.status === "completed" ? "✓" : progress.status === "error" ? "✕" : `${progress.progress}%`}
                      </span>
                    </div>
                    <div 
                      className="h-1 rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--theme-surface-elevated)" }}
                    >
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${progress.progress}%`,
                          backgroundColor: progress.status === "error"
                            ? "var(--theme-error)"
                            : progress.status === "completed"
                            ? "var(--theme-success)"
                            : "var(--theme-accent)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className="mt-7 inline-flex items-center gap-2 rounded-full text-white px-5 py-2 text-xs font-semibold tracking-wide shadow-theme-lg"
              style={{
                backgroundColor: "var(--theme-text-primary)",
                color: "var(--theme-text-inverse)",
              }}
            >
              <span>{uploading ? "Please wait" : "Choose file"}</span>
              <span className="opacity-70">→</span>
            </div>
          </div>

          {/* Decorative frame */}
          <div className="absolute inset-6 rounded-[28px] border border-[var(--theme-border)] border-dashed" />
          <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-[var(--theme-border-strong)] rounded-tl-xl" />
          <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-[var(--theme-border-strong)] rounded-br-xl" />
        </button>
      </div>
    </div>
  );
}
  