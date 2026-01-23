// Theme definitions and types

export type ThemeKey = "default" | "dark" | "warm" | "comfort" | "natural" | "fresh";

export interface Theme {
  key: ThemeKey;
  name: string;
  colors: {
    // Backgrounds
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceHover: string;
    
    // Text
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    
    // Borders
    border: string;
    borderSubtle: string;
    borderStrong: string;
    
    // Accents
    accent: string;
    accentHover: string;
    accentLight: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Gradients
    gradientPrimary: string;
    gradientSecondary: string;
    gradientOverlay: string;
    
    // Special
    shadow: string;
    shadowStrong: string;
    backdrop: string;
  };
}

export const themes: Record<ThemeKey, Theme> = {
  default: {
    key: "default",
    name: "Default",
    colors: {
      background: "#fafafa",
      surface: "#ffffff",
      surfaceElevated: "#ffffff",
      surfaceHover: "#f9fafb",
      textPrimary: "#171717",
      textSecondary: "#525252",
      textTertiary: "#a3a3a3",
      textInverse: "#ffffff",
      border: "rgba(0, 0, 0, 0.05)",
      borderSubtle: "rgba(0, 0, 0, 0.03)",
      borderStrong: "rgba(0, 0, 0, 0.1)",
      accent: "#f97316",
      accentHover: "#ea580c",
      accentLight: "#ffedd5",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
      gradientPrimary: "linear-gradient(to right, #f97316, #ec4899)",
      gradientSecondary: "linear-gradient(to br, #fef3c7, #fce7f3)",
      gradientOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.1), rgba(0,0,0,0.8))",
      shadow: "rgba(0, 0, 0, 0.05)",
      shadowStrong: "rgba(0, 0, 0, 0.15)",
      backdrop: "rgba(255, 255, 255, 0.9)",
    },
  },
  dark: {
    key: "dark",
    name: "Dark",
    colors: {
      background: "#0a0a0a",
      surface: "#141414",
      surfaceElevated: "#1a1a1a",
      surfaceHover: "#1f1f1f",
      textPrimary: "#fafafa",
      textSecondary: "#d4d4d4",
      textTertiary: "#a3a3a3",
      textInverse: "#0a0a0a",
      border: "rgba(255, 255, 255, 0.08)",
      borderSubtle: "rgba(255, 255, 255, 0.05)",
      borderStrong: "rgba(255, 255, 255, 0.15)",
      accent: "#f97316",
      accentHover: "#ff8c42",
      accentLight: "rgba(249, 115, 22, 0.15)",
      success: "#22c55e",
      warning: "#fbbf24",
      error: "#f87171",
      info: "#60a5fa",
      gradientPrimary: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
      gradientSecondary: "linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(236, 72, 153, 0.12) 100%)",
      gradientOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.25), rgba(0,0,0,0.9))",
      shadow: "rgba(0, 0, 0, 0.4)",
      shadowStrong: "rgba(0, 0, 0, 0.7)",
      backdrop: "rgba(20, 20, 20, 0.98)",
    },
  },
  warm: {
    key: "warm",
    name: "Warm",
    colors: {
      background: "#fef7ed",
      surface: "#ffffff",
      surfaceElevated: "#fffbf5",
      surfaceHover: "#fef3e7",
      textPrimary: "#292524",
      textSecondary: "#78716c",
      textTertiary: "#a8a29e",
      textInverse: "#ffffff",
      border: "rgba(146, 64, 14, 0.1)",
      borderSubtle: "rgba(146, 64, 14, 0.05)",
      borderStrong: "rgba(146, 64, 14, 0.2)",
      accent: "#ea580c",
      accentHover: "#c2410c",
      accentLight: "#fff7ed",
      success: "#16a34a",
      warning: "#d97706",
      error: "#dc2626",
      info: "#0284c7",
      gradientPrimary: "linear-gradient(to right, #ea580c, #d97706)",
      gradientSecondary: "linear-gradient(to br, #fff7ed, #fef3c7)",
      gradientOverlay: "linear-gradient(to bottom, rgba(146, 64, 14, 0.2), rgba(146, 64, 14, 0.1), rgba(146, 64, 14, 0.7))",
      shadow: "rgba(146, 64, 14, 0.1)",
      shadowStrong: "rgba(146, 64, 14, 0.2)",
      backdrop: "rgba(255, 251, 245, 0.95)",
    },
  },
  comfort: {
    key: "comfort",
    name: "Comfort",
    colors: {
      background: "#faf5ff",
      surface: "#ffffff",
      surfaceElevated: "#fefbff",
      surfaceHover: "#f5f0ff",
      textPrimary: "#1e1b1f",
      textSecondary: "#6b6770",
      textTertiary: "#9d99a3",
      textInverse: "#ffffff",
      border: "rgba(103, 80, 164, 0.1)",
      borderSubtle: "rgba(103, 80, 164, 0.05)",
      borderStrong: "rgba(103, 80, 164, 0.2)",
      accent: "#a855f7",
      accentHover: "#9333ea",
      accentLight: "#f3e8ff",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
      gradientPrimary: "linear-gradient(to right, #a855f7, #ec4899)",
      gradientSecondary: "linear-gradient(to br, #f3e8ff, #fce7f3)",
      gradientOverlay: "linear-gradient(to bottom, rgba(103, 80, 164, 0.2), rgba(103, 80, 164, 0.1), rgba(103, 80, 164, 0.7))",
      shadow: "rgba(103, 80, 164, 0.1)",
      shadowStrong: "rgba(103, 80, 164, 0.2)",
      backdrop: "rgba(255, 251, 255, 0.95)",
    },
  },
  natural: {
    key: "natural",
    name: "Natural",
    colors: {
      background: "#f7fdf7",
      surface: "#ffffff",
      surfaceElevated: "#fafffa",
      surfaceHover: "#f0fdf4",
      textPrimary: "#1a1f1a",
      textSecondary: "#5f6b5f",
      textTertiary: "#9ca99c",
      textInverse: "#ffffff",
      border: "rgba(34, 197, 94, 0.1)",
      borderSubtle: "rgba(34, 197, 94, 0.05)",
      borderStrong: "rgba(34, 197, 94, 0.2)",
      accent: "#22c55e",
      accentHover: "#16a34a",
      accentLight: "#dcfce7",
      success: "#22c55e",
      warning: "#eab308",
      error: "#ef4444",
      info: "#0ea5e9",
      gradientPrimary: "linear-gradient(to right, #22c55e, #10b981)",
      gradientSecondary: "linear-gradient(to br, #dcfce7, #d1fae5)",
      gradientOverlay: "linear-gradient(to bottom, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.7))",
      shadow: "rgba(34, 197, 94, 0.1)",
      shadowStrong: "rgba(34, 197, 94, 0.2)",
      backdrop: "rgba(250, 255, 250, 0.95)",
    },
  },
  fresh: {
    key: "fresh",
    name: "Fresh",
    colors: {
      background: "#f0f9ff",
      surface: "#ffffff",
      surfaceElevated: "#fafffe",
      surfaceHover: "#e0f2fe",
      textPrimary: "#0c1a1f",
      textSecondary: "#5b6b7a",
      textTertiary: "#9ca3af",
      textInverse: "#ffffff",
      border: "rgba(14, 165, 233, 0.1)",
      borderSubtle: "rgba(14, 165, 233, 0.05)",
      borderStrong: "rgba(14, 165, 233, 0.2)",
      accent: "#0ea5e9",
      accentHover: "#0284c7",
      accentLight: "#e0f2fe",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#0ea5e9",
      gradientPrimary: "linear-gradient(to right, #0ea5e9, #06b6d4)",
      gradientSecondary: "linear-gradient(to br, #e0f2fe, #cffafe)",
      gradientOverlay: "linear-gradient(to bottom, rgba(14, 165, 233, 0.2), rgba(14, 165, 233, 0.1), rgba(14, 165, 233, 0.7))",
      shadow: "rgba(14, 165, 233, 0.1)",
      shadowStrong: "rgba(14, 165, 233, 0.2)",
      backdrop: "rgba(250, 255, 255, 0.95)",
    },
  },
};

export const defaultThemeKey: ThemeKey = "default";
