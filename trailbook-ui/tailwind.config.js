/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          background: "var(--theme-background)",
          surface: "var(--theme-surface)",
          "surface-elevated": "var(--theme-surface-elevated)",
          "surface-hover": "var(--theme-surface-hover)",
          "text-primary": "var(--theme-text-primary)",
          "text-secondary": "var(--theme-text-secondary)",
          "text-tertiary": "var(--theme-text-tertiary)",
          "text-inverse": "var(--theme-text-inverse)",
          border: "var(--theme-border)",
          "border-subtle": "var(--theme-border-subtle)",
          "border-strong": "var(--theme-border-strong)",
          accent: "var(--theme-accent)",
          "accent-hover": "var(--theme-accent-hover)",
          "accent-light": "var(--theme-accent-light)",
          success: "var(--theme-success)",
          warning: "var(--theme-warning)",
          error: "var(--theme-error)",
          info: "var(--theme-info)",
        },
      },
      boxShadow: {
        theme: "0 1px 3px 0 var(--theme-shadow), 0 1px 2px -1px var(--theme-shadow)",
        "theme-md": "0 4px 6px -1px var(--theme-shadow), 0 2px 4px -2px var(--theme-shadow)",
        "theme-lg": "0 10px 15px -3px var(--theme-shadow), 0 4px 6px -4px var(--theme-shadow)",
        "theme-xl": "0 20px 25px -5px var(--theme-shadow-strong), 0 8px 10px -6px var(--theme-shadow-strong)",
      },
    },
  },
  plugins: [],
};
