"use client";

import Link from "next/link";

interface CollectionDestination {
  id: string;
  index: number;
  imageUrl: string | null;
}

interface Collection {
  id: string;
  title: string | null;
  vibe: string;
  departureCity: string;
  travelDates: string;
  days: number;
  budget: string;
  travelWith: string;
  interests: string[];
  destinations: CollectionDestination[];
  createdAt: string | Date;
}

export function CollectionsList({
  collections,
}: {
  collections: Collection[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((col) => {
        const displayName = col.title || col.vibe;
        const firstImage = col.destinations.find((d) => d.imageUrl)?.imageUrl;

        return (
          <Link
            key={col.id}
            href={`/collections/${col.id}`}
            className="group block rounded-xl border border-border-default hover:border-border-hover bg-surface-elevated overflow-hidden transition-all hover:-translate-y-1"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] bg-page-bg overflow-hidden">
              {firstImage ? (
                <img
                  src={firstImage}
                  alt={displayName}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display text-2xl text-text-faint">
                    {col.destinations.length}
                  </span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <span className="font-sans text-xs text-white/50">
                  {col.destinations.length} destinations
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-display text-lg text-text-primary leading-tight mb-1 truncate">
                {displayName}
              </h3>
              <p className="font-sans text-sm text-text-muted truncate mb-2">
                {col.vibe}
              </p>
              <div className="flex items-center gap-3 font-sans text-xs text-text-muted">
                <span>{col.days} days</span>
                <span>&middot;</span>
                <span>{col.departureCity}</span>
                <span>&middot;</span>
                <span>
                  {new Date(col.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
