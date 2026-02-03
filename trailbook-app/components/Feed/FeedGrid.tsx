"use client";

import { useEffect, useState } from "react";
import FeedCard from "./FeedCard";
import FeedSkeleton from "./FeedSkeleton";
import { feedData } from "@/lib/feedData";
import { getFeed, type FeedItem } from "@/lib/trailbookApi";

export default function FeedGrid() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getFeed();
        if (!cancelled) {
          setItems(data);
        }
      } catch {
        // Keep the UI useful even if backend isn't ready yet.
        if (!cancelled) {
          setError("Couldn’t load the live feed. Showing demo content.");
          setItems(feedData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-6 py-4">
      {error && (
        <div className="mb-4 rounded-xl bg-orange-50 text-orange-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <FeedSkeleton key={i} />
            ))
          : items.map((item) => (
              <FeedCard key={item.id} data={item} />
            ))}
      </div>
    </div>
  );
}
