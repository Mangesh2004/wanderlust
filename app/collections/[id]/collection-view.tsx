"use client";

import { useState } from "react";
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

export function CollectionView({ collection }: { collection: Collection }) {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  // Reconstruct Destination[] and imageUrls from stored data
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
