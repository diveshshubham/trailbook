"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ThemeKey, Theme } from "@/lib/themes";
import { themes, defaultThemeKey } from "@/lib/themes";
import { getThemes, getUserTheme, setUserTheme as setUserThemeApi } from "@/lib/themeApi";

interface ThemeContextType {
  currentTheme: Theme;
  themeKey: ThemeKey;
  availableThemes: Array<{ id: string; name: string; key: string; isDefault: boolean }>;
  isLoading: boolean;
  setTheme: (key: ThemeKey) => Promise<void>;
  isLoggedIn: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "tb:theme:v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(defaultThemeKey);
  const [availableThemes, setAvailableThemes] = useState<Array<{ id: string; name: string; key: string; isDefault: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  const checkAuth = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      const token = window.localStorage.getItem("token");
      return Boolean(token);
    } catch {
      return false;
    }
  }, []);

  // Load theme from storage or API
  const loadTheme = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Check if user is logged in
      const loggedIn = checkAuth();
      setIsLoggedIn(loggedIn);

      // Fetch available themes from API
      try {
        const themesResponse = await getThemes();
        if (themesResponse.success && themesResponse.data) {
          setAvailableThemes(themesResponse.data.themes);
        }
      } catch (error) {
        console.warn("Failed to fetch themes from API, using defaults", error);
        // Fallback to default themes
        setAvailableThemes([
          { id: "default", name: "Default", key: "default", isDefault: true },
          { id: "dark", name: "Dark", key: "dark", isDefault: false },
        ]);
      }

      // If user is logged in, try to get their theme preference
      if (loggedIn) {
        try {
          const userTheme = await getUserTheme();
          if (userTheme && userTheme.key) {
            const key = userTheme.key as ThemeKey;
            if (themes[key]) {
              setThemeKey(key);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(THEME_STORAGE_KEY, key);
              }
              return;
            }
          }
        } catch (error) {
          console.warn("Failed to fetch user theme, using stored preference", error);
        }
      }

      // Fallback to stored theme or default
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && themes[stored as ThemeKey]) {
          setThemeKey(stored as ThemeKey);
          return;
        }
      }

      // Default to default theme
      setThemeKey(defaultThemeKey);
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth]);

  // Set theme
  const setTheme = useCallback(
    async (key: ThemeKey) => {
      if (!themes[key]) {
        console.warn(`Theme "${key}" not found`);
        return;
      }

      setThemeKey(key);

      // Store in localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, key);
      }

      // If user is logged in, save to API
      const loggedIn = checkAuth();
      if (loggedIn) {
        try {
          // Find theme ID from available themes
          const theme = availableThemes.find((t) => t.key === key);
          if (theme) {
            await setUserThemeApi(theme.id);
          }
        } catch (error) {
          console.warn("Failed to save theme to API", error);
          // Theme is still set locally, so continue
        }
      }

      // Apply theme to document
      applyThemeToDocument(themes[key]);
    },
    [availableThemes, checkAuth]
  );

  // Apply theme CSS variables to document
  useEffect(() => {
    const theme = themes[themeKey];
    applyThemeToDocument(theme);
  }, [themeKey]);

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      loadTheme();
    };

    window.addEventListener("tb:auth-changed", handleAuthChange);
    return () => {
      window.removeEventListener("tb:auth-changed", handleAuthChange);
    };
  }, [loadTheme]);

  const value: ThemeContextType = {
    currentTheme: themes[themeKey],
    themeKey,
    availableThemes,
    isLoading,
    setTheme,
    isLoggedIn,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;
  const colors = theme.colors;

  // Set CSS variables
  root.style.setProperty("--theme-background", colors.background);
  root.style.setProperty("--theme-surface", colors.surface);
  root.style.setProperty("--theme-surface-elevated", colors.surfaceElevated);
  root.style.setProperty("--theme-surface-hover", colors.surfaceHover);
  root.style.setProperty("--theme-text-primary", colors.textPrimary);
  root.style.setProperty("--theme-text-secondary", colors.textSecondary);
  root.style.setProperty("--theme-text-tertiary", colors.textTertiary);
  root.style.setProperty("--theme-text-inverse", colors.textInverse);
  root.style.setProperty("--theme-border", colors.border);
  root.style.setProperty("--theme-border-subtle", colors.borderSubtle);
  root.style.setProperty("--theme-border-strong", colors.borderStrong);
  root.style.setProperty("--theme-accent", colors.accent);
  root.style.setProperty("--theme-accent-hover", colors.accentHover);
  root.style.setProperty("--theme-accent-light", colors.accentLight);
  root.style.setProperty("--theme-success", colors.success);
  root.style.setProperty("--theme-warning", colors.warning);
  root.style.setProperty("--theme-error", colors.error);
  root.style.setProperty("--theme-info", colors.info);
  root.style.setProperty("--theme-shadow", colors.shadow);
  root.style.setProperty("--theme-shadow-strong", colors.shadowStrong);
  root.style.setProperty("--theme-backdrop", colors.backdrop);
  root.style.setProperty("--theme-gradient-primary", colors.gradientPrimary);
  root.style.setProperty("--theme-gradient-secondary", colors.gradientSecondary);

  // Apply background directly to body for immediate effect
  body.style.backgroundColor = colors.background;
  body.style.color = colors.textPrimary;

  // Set data attribute for theme-based styling
  root.setAttribute("data-theme", theme.key);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
