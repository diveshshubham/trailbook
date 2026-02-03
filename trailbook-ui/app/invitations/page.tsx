"use client";

import { useTheme } from "@/contexts/ThemeContext";
import InvitationsList from "@/components/PublicAlbums/InvitationsList";

export default function InvitationsPage() {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  return (
    <main className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
      <div className="max-w-4xl mx-auto px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r bg-clip-text"
            style={{
              backgroundImage: "var(--theme-gradient-primary)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Invitations
          </h1>
          <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            Album invitations waiting for your response
          </p>
        </div>
        <InvitationsList />
      </div>
    </main>
  );
}
