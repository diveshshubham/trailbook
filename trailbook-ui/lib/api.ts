// Albums/feed/auth backend (default). Override via NEXT_PUBLIC_API_BASE_URL.
const DEFAULT_API_BASE_URL = "http://localhost:3002/api";

function getApiBaseUrl() {
  // For client-side fetches we can use NEXT_PUBLIC_* vars.
  // Fallback keeps local dev working even without an env file.
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    DEFAULT_API_BASE_URL
  );
}

function safeGetTokenFromLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("token");
  } catch {
    return null;
  }
}

async function parseJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type ApiFetchOptions = RequestInit & {
  /**
   * If provided, overrides the default token lookup from localStorage.
   * Useful for server-side usage where localStorage isn't available.
   */
  token?: string | null;
  /**
   * Whether to attach Authorization header automatically.
   * Defaults to true (if a token is available). Set to false for public/auth endpoints.
   */
  auth?: boolean;
  /**
   * Optional override for API base URL (useful when multiple backends exist).
   * Example: process.env.NEXT_PUBLIC_USERS_API_BASE_URL
   */
  baseUrl?: string;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getMessageFromErrorPayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if (!("message" in data)) return null;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg : null;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const baseUrl = (options.baseUrl || getApiBaseUrl()).replace(/\/$/, "");
  const { token: tokenOverride, auth = true, headers, baseUrl: _baseUrl, ...rest } = options;
  const token = tokenOverride ?? safeGetTokenFromLocalStorage();

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${normalizedEndpoint}`;

  // Debug logging for 404 errors
  if (process.env.NODE_ENV === "development") {
    console.log(`[apiFetch] ${options.method || "GET"} ${fullUrl}`, {
      auth,
      hasToken: !!token,
    });
  }

  const res = await fetch(fullUrl, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  const data = await parseJsonSafely(res);

  if (!res.ok) {
    // Enhanced error logging for 404s
    if (res.status === 404 && process.env.NODE_ENV === "development") {
      console.error(`[apiFetch] 404 Not Found: ${fullUrl}`, {
        endpoint,
        baseUrl,
        normalizedEndpoint,
        fullUrl,
        response: data,
      });
    }
    const message =
      getMessageFromErrorPayload(data) ??
      `Request failed: ${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
