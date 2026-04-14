"use client";

import Carousel from "@/components/ui/carousel";
import type { Destination } from "@/lib/trip/schema";

interface TripCarouselProps {
  destinations: Destination[];
  imageUrls: Record<number, string>;
  generatingImages?: Record<number, string>;
  onExplore: (index: number) => void;
}

export function TripCarousel({
  destinations,
  imageUrls,
  generatingImages = {},
  onExplore,
}: TripCarouselProps) {
  if (destinations.length === 0) return null;

  const slides = destinations.map((dest, i) => ({
    title: dest.name,
    subtitle: dest.country,
    button: "Explore →",
    src: imageUrls[i] || "",
    loadingLabel: generatingImages[i]
      ? `Generating poster for ${generatingImages[i]}...`
      : undefined,
    onButtonClick: () => onExplore(i),
  }));

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4 py-20">
      <Carousel slides={slides} />
    </div>
  );
}
