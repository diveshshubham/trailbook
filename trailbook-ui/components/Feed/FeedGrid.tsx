"use client";

import { useEffect, useState } from "react";
import FeedCard from "./FeedCard";
import FeedSkeleton from "./FeedSkeleton";
import { feedData } from "@/lib/feedData";

export default function FeedGrid() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simulate API delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="px-6 py-4">
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <FeedSkeleton key={i} />
            ))
          : feedData.map((item) => (
              <FeedCard key={item.id} data={item} />
            ))}
      </div>
    </div>
  );
}
