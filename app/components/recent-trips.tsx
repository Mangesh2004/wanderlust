"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";

interface Destination {
  id: string;
  index: number;
  data: Record<string, unknown>;
  imageUrl: string | null;
}

interface Collection {
  id: string;
  title: string | null;
  vibe: string;
  destinations: Destination[];
}

export function RecentTrips() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    fetch("/api/collections?limit=4")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setCollections(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || !loaded || collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
        </div>
        <p className="font-sans text-sm text-white/30">
          {!user ? "Sign in to see your trips" : "No trips yet"}
        </p>
        <p className="font-sans text-xs text-white/20 mt-1">
          Your recent adventures will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-white/30">
          Recent Trips
        </p>
        <Link
          href="/collections"
          className="font-sans text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        {collections.map((col) => {
          const firstImage = col.destinations.find((d) => d.imageUrl)?.imageUrl;
          const name =
            col.title ||
            col.destinations
              .map((d) => (d.data as { name?: string }).name ?? "Unknown")
              .join(", ");

          return (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="group flex gap-3 rounded-xl border border-white/10 hover:border-[#E07A3A]/30 bg-white/[0.03] overflow-hidden transition-all duration-200 hover:bg-white/[0.06]"
            >
              <div className="relative w-20 h-20 shrink-0 bg-[#1A1918] overflow-hidden">
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt={name}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display text-lg text-white/20">
                      {col.destinations.length}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center py-2 pr-3 min-w-0">
                <h3 className="font-sans text-sm text-white truncate leading-tight">
                  {name}
                </h3>
                <p className="font-sans text-xs text-white/30 truncate mt-0.5">
                  {col.vibe}
                </p>
                <p className="font-sans text-[10px] text-white/20 mt-1">
                  {col.destinations.length} destinations
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
