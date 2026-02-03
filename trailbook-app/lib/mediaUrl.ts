const DEFAULT_MEDIA_BASE_URL =
  "https://trailbook-media-shubham.s3.ap-south-1.amazonaws.com/";

export function resolveMediaUrl(maybeUrlOrKey?: string | null): string | undefined {
  if (!maybeUrlOrKey) return undefined;
  const val = String(maybeUrlOrKey).trim();
  if (!val) return undefined;

  // Already a full URL
  if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
    return val;
  }

  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(
    /\/$/,
    ""
  );

  // Ensure no leading slash issues
  const key = val.replace(/^\//, "");
  return `${base}/${key}`;
}

