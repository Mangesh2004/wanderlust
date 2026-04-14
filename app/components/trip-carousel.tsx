"use client";

import Carousel from "@/components/ui/carousel";
import type { Destination } from "@/lib/trip/schema";
import type { PosterPhase } from "@/app/collections/poster-phase";

interface TripCarouselProps {
  destinations: Destination[];
  imageUrls: Record<number, string>;
  /** Destination name per index while poster is generating */
  generatingLabels?: Record<number, string>;
  /** When imageUrl is absent, how to render the placeholder */
  posterPhaseByIndex?: Record<number, PosterPhase>;
  onExplore: (index: number) => void;
}

export function TripCarousel({
  destinations,
  imageUrls,
  generatingLabels = {},
  posterPhaseByIndex = {},
  onExplore,
}: TripCarouselProps) {
  if (destinations.length === 0) return null;

  const slides = destinations.map((dest, i) => {
    const src = imageUrls[i] || "";
    const phaseWhenMissing: PosterPhase = posterPhaseByIndex[i] ?? "generating";
    return {
      title: dest.name,
      subtitle: dest.country,
      button: "Explore →",
      src,
      posterPhase: src ? undefined : phaseWhenMissing,
      loadingLabel: generatingLabels[i]
        ? `Generating poster for ${generatingLabels[i]}...`
        : undefined,
      onButtonClick: () => onExplore(i),
    };
  });

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4 py-20">
      <Carousel slides={slides} />
    </div>
  );
}
