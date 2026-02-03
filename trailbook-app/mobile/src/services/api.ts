import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiBaseUrl, getToken } from '../config/api';

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

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: any) => {
    // Check if auth is explicitly disabled via custom property
    if (config.skipAuth === true) {
      delete config.skipAuth;
      return config;
    }
    
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const data = error.response.data;
      const message =
        getMessageFromErrorPayload(data) ??
        `Request failed: ${error.response.status} ${error.response.statusText}`;
      throw new ApiError(message, error.response.status, data);
    }
    throw error;
  }
);

export default api;
