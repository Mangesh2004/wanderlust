"use client";

import { useState, useEffect } from "react";
import type { Destination } from "@/lib/trip/schema";
import { TripCarousel } from "@/app/components/trip-carousel";
import { TripDetail } from "@/app/components/trip-detail";

interface CollectionDestination {
  id: string;
  index: number;
  data: unknown;
  imageUrl: string | null;
}

interface Collection {
  id: string;
  title: string | null;
  vibe: string;
  departureCity: string;
  travelDates: string;
  days: number;
  destinations: CollectionDestination[];
}

export function CollectionView({ collectionId }: { collectionId: string }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/collections/${collectionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setCollection)
      .catch((err) => setError(err.message));
  }, [collectionId]);

  if (error) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <p className="font-sans text-text-muted">Collection not found.</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-border-default border-t-[#E07A3A] rounded-full animate-spin" />
          <p className="font-sans text-sm text-text-muted">Loading collection...</p>
        </div>
      </div>
    );
  }

  const destinations = collection.destinations.map(
    (d) => d.data as unknown as Destination,
  );
  const imageUrls: Record<number, string> = {};
  collection.destinations.forEach((d) => {
    if (d.imageUrl) {
      imageUrls[d.index] = d.imageUrl;
    }
  });

  if (detailIndex !== null && destinations[detailIndex]) {
    return (
      <TripDetail
        destination={destinations[detailIndex]}
        imageUrl={imageUrls[detailIndex]}
        onBack={() => setDetailIndex(null)}
      />
    );
  }

  return (
    <TripCarousel
      destinations={destinations}
      imageUrls={imageUrls}
      onExplore={(i) => setDetailIndex(i)}
    />
  );
}
