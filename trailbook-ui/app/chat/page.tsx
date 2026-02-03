"use client";

import ConversationsList from "@/components/Chat/ConversationsList";
import { useTheme } from "@/contexts/ThemeContext";

export default function ChatHomePage() {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--theme-background)" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r bg-clip-text"
            style={{
              backgroundImage: isDefault
                ? "linear-gradient(to right, rgb(234, 88, 12), rgb(236, 72, 153))"
                : "var(--theme-gradient-primary)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Messages
          </h1>
          <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            Your conversations
          </p>
        </div>
        <ConversationsList />
      </div>
    </main>
  );
}
