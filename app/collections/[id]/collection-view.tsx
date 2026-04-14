"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  const [imageStatus, setImageStatus] = useState<string>("");
  const [generatingImages, setGeneratingImages] = useState<Record<number, string>>({});
  const imageStreamStartedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/collections/${collectionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Collection) => {
        setCollection(data);
        setGeneratingImages(
          Object.fromEntries(
            data.destinations
              .filter((dest) => !dest.imageUrl)
              .map((dest) => [
                dest.index,
                (dest.data as Destination).name,
              ]),
          ),
        );
      })
      .catch((err) => setError(err.message));
  }, [collectionId]);

  useEffect(() => {
    if (!collection || imageStreamStartedRef.current) return;
    if (collection.destinations.every((dest) => dest.imageUrl)) return;

    imageStreamStartedRef.current = true;
    let cancelled = false;

    const startImageStream = async () => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/images`, {
          method: "POST",
        });
        if (!res.ok) {
          throw new Error("Poster generation failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No image response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const dataLine = chunk.replace(/^data: /, "").trim();
            if (!dataLine) continue;

            const event = JSON.parse(dataLine) as {
              type: string;
              data: Record<string, unknown>;
            };

            if (event.type === "status") {
              setImageStatus(String(event.data.message ?? ""));
            }

            if (
              event.type === "image_complete" &&
              typeof event.data.index === "number"
            ) {
              const imageUrl =
                typeof event.data.imageUrl === "string" && event.data.imageUrl
                  ? event.data.imageUrl
                  : null;

              setCollection((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  destinations: prev.destinations.map((dest) =>
                    dest.index === event.data.index
                      ? { ...dest, imageUrl }
                      : dest,
                  ),
                };
              });
              setGeneratingImages((prev) => {
                const next = { ...prev };
                delete next[event.data.index as number];
                return next;
              });
            }

            if (event.type === "done") {
              setImageStatus("");
            }
          }
        }
      } catch (err) {
        setImageStatus(
          err instanceof Error ? err.message : "Poster generation failed",
        );
      }
    };

    void startImageStream();

    return () => {
      cancelled = true;
    };
  }, [collection, collectionId]);

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
        isImageGenerating={Boolean(generatingImages[detailIndex])}
        onBack={() => setDetailIndex(null)}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-page-bg">
      {imageStatus ? (
        <div className="absolute top-20 right-4 sm:right-8 z-20 rounded-full bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] px-4 py-2 font-sans text-xs text-text-secondary">
          {imageStatus}
        </div>
      ) : null}

      {/* Back to collections */}
      <div className="absolute top-20 left-4 sm:left-8 z-20">
        <Link
          href="/collections"
          className="flex items-center gap-2 rounded-full bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] px-4 py-2 font-sans text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Collections
        </Link>
      </div>

      <TripCarousel
        destinations={destinations}
        imageUrls={imageUrls}
        generatingImages={generatingImages}
        onExplore={(i) => setDetailIndex(i)}
      />
    </div>
  );
}
