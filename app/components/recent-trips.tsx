"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";

interface DestinationSummary {
  id: string;
  index: number;
  imageUrl: string | null;
}

interface CollectionSummary {
  id: string;
  title: string | null;
  vibe: string;
  destinations: DestinationSummary[];
}

export function RecentTrips() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    fetch("/api/collections?limit=4&fields=summary")
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-default flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
        </div>
        <p className="font-sans text-sm text-text-muted">Sign in to see your trips</p>
        <p className="font-sans text-xs text-text-faint mt-1">
          Your recent adventures will appear here
        </p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-8 h-8 border-2 border-border-default border-t-[#E07A3A] rounded-full animate-spin mb-3" />
        <p className="font-sans text-xs text-text-muted">Loading trips...</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-default flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
        </div>
        <p className="font-sans text-sm text-text-muted">No trips yet</p>
        <p className="font-sans text-xs text-text-faint mt-1">
          Your recent adventures will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-text-muted">
          Recent Trips
        </p>
        <Link
          href="/collections"
          className="font-sans text-[11px] text-text-muted hover:text-text-secondary transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        {collections.map((col) => {
          const firstImage = col.destinations.find((d) => d.imageUrl)?.imageUrl;
          const name = col.title || col.vibe;

          return (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="group flex gap-3 rounded-xl border border-border-default hover:border-[#E07A3A]/30 bg-surface-subtle overflow-hidden transition-all duration-200 hover:bg-surface-elevated"
            >
              <div className="relative w-20 h-20 shrink-0 bg-thumb-bg overflow-hidden">
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt={name}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display text-lg text-text-faint">
                      {col.destinations.length}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center py-2 pr-3 min-w-0">
                <h3 className="font-sans text-sm text-text-primary truncate leading-tight">
                  {name}
                </h3>
                <p className="font-sans text-xs text-text-muted truncate mt-0.5">
                  {col.vibe}
                </p>
                <p className="font-sans text-[10px] text-text-faint mt-1">
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
