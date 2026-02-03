"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getAlbumAnalytics, type AlbumAnalytics } from "@/lib/publicAlbumsApi";
import { getAlbumContributors } from "@/lib/publicAlbumsApi";

type AnalyticsDashboardProps = {
  albumId: string;
  canView?: boolean;
};

export default function AnalyticsDashboard({ albumId, canView = false }: AnalyticsDashboardProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [analytics, setAnalytics] = useState<AlbumAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    if (canView) {
      loadAnalytics();
    }
  }, [albumId, canView, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAlbumAnalytics(albumId);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="p-6 rounded-2xl border text-center" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
        <p className="text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
          Analytics available for album owners and admins only
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border animate-pulse" style={{ backgroundColor: "var(--theme-surface-hover)", borderColor: "var(--theme-border)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl text-sm" style={{ backgroundColor: "var(--theme-error-light)", color: "var(--theme-error)" }}>
        {error}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(["7d", "30d", "all"] as const).map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              timeRange === range ? "" : ""
            }`}
            style={{
              backgroundColor: timeRange === range ? "var(--theme-accent)" : "var(--theme-surface-hover)",
              color: timeRange === range ? "white" : "var(--theme-text-primary)",
            }}
          >
            {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--theme-text-tertiary)" }}>
            Contributors
          </p>
          <p className="text-3xl font-bold" style={{ color: "var(--theme-text-primary)" }}>
            {analytics.contributorCount}
          </p>
        </div>
        <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--theme-text-tertiary)" }}>
            Photos
          </p>
          <p className="text-3xl font-bold" style={{ color: "var(--theme-text-primary)" }}>
            {analytics.photoCount}
          </p>
        </div>
        <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--theme-text-tertiary)" }}>
            Activities
          </p>
          <p className="text-3xl font-bold" style={{ color: "var(--theme-text-primary)" }}>
            {Object.values(analytics.activityStats).reduce((sum, val) => sum + val, 0)}
          </p>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--theme-text-primary)" }}>
          Activity Breakdown
        </h3>
        <div className="space-y-3">
          {Object.entries(analytics.activityStats).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm capitalize" style={{ color: "var(--theme-text-secondary)" }}>
                {type.replace("_", " ")}
              </span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 rounded-full overflow-hidden" style={{ backgroundColor: "var(--theme-surface-hover)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / Math.max(...Object.values(analytics.activityStats))) * 100}%`,
                      background: "var(--theme-gradient-primary)",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold w-12 text-right" style={{ color: "var(--theme-text-primary)" }}>
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
