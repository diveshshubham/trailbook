// Theme API functions

import { apiFetch } from "./api";
import type { ThemeKey } from "./themes";

const THEMES_API_BASE_URL = process.env.NEXT_PUBLIC_THEMES_API_BASE_URL || "http://localhost:3003/api";

export interface ThemeResponse {
  id: string;
  name: string;
  key: string;
  isDefault: boolean;
}

export interface GetThemesResponse {
  success: boolean;
  message: string;
  data: {
    themes: ThemeResponse[];
    defaultTheme: ThemeResponse;
  };
}

export interface SetThemeResponse {
  success: boolean;
  message: string;
  data?: {
    theme: ThemeResponse;
  };
}

/**
 * Fetch all available themes from the API
 */
export async function getThemes(): Promise<GetThemesResponse> {
  return apiFetch<GetThemesResponse>("/themes", {
    baseUrl: THEMES_API_BASE_URL,
    auth: false,
  });
}

/**
 * Set the user's theme preference
 */
export async function setUserTheme(themeId: string): Promise<SetThemeResponse> {
  return apiFetch<SetThemeResponse>("/themes/me", {
    baseUrl: THEMES_API_BASE_URL,
    method: "PUT",
    auth: true,
    body: JSON.stringify({ themeId }),
  });
}

/**
 * Get the user's current theme preference
 * Returns null if user is not logged in or no preference is set
 */
export async function getUserTheme(): Promise<ThemeResponse | null> {
  try {
    const response = await apiFetch<{ success: boolean; data: { theme: ThemeResponse } }>("/themes/me", {
      baseUrl: THEMES_API_BASE_URL,
      auth: true,
    });
    return response.data?.theme || null;
  } catch (error) {
    // User not logged in or no theme set
    return null;
  }
}
