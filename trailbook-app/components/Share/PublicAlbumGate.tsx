"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { createContext, useContext } from "react";

type PublicAlbumGateState = {
  locked: boolean;
};

const PublicAlbumGateContext = createContext<PublicAlbumGateState | null>(null);

export function usePublicAlbumGate() {
  return useContext(PublicAlbumGateContext);
}

export default function PublicAlbumGate({
  albumId,
  children,
}: {
  albumId: string;
  children: React.ReactNode;
}) {
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const token = window.localStorage.getItem("token");
      if (token) {
        setLocked(false);
        return;
      }

      const key = `tb:public-album:viewed:${albumId}:v1`;
      const seen = window.localStorage.getItem(key);
      if (seen) {
        // Soft gate: allow preview (handled by consumers), but mark as locked.
        setLocked(true);
        return;
      }

      window.localStorage.setItem(key, new Date().toISOString());
      setLocked(false);
    } catch {
      // If storage is unavailable, default to allowing view (don’t break public share).
      setLocked(false);
    }
  }, [albumId]);

  if (locked === null) return null;

  return (
    <PublicAlbumGateContext.Provider value={{ locked }}>
      {children}
    </PublicAlbumGateContext.Provider>
  );
}

