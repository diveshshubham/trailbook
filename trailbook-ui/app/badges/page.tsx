import BadgesPageClient from "@/components/Badges/BadgesPageClient";

export default function BadgesPage() {
  return (
    <main className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
      <BadgesPageClient />
    </main>
  );
}

