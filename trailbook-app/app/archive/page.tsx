import ArchivePageClient from "@/components/Archive/ArchivePageClient";

export default function ArchivePage() {
  return (
    <main className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--theme-background)" }}>
      <ArchivePageClient />
    </main>
  );
}
