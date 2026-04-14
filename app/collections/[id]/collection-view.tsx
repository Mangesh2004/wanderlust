"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Destination } from "@/lib/trip/schema";
import { TripCarousel } from "@/app/components/trip-carousel";
import { TripDetail } from "@/app/components/trip-detail";
import type { PosterPhase } from "@/app/collections/poster-phase";

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

const MAX_IMAGE_STREAM_RETRIES = 2;

export function CollectionView({ collectionId }: { collectionId: string }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [imageStatus, setImageStatus] = useState<string>("");
  /** Per-index label while generating (destination name) */
  const [generatingLabels, setGeneratingLabels] = useState<Record<number, string>>(
    {},
  );
  /** When `imageUrl` is null, drives spinner vs failed vs idle placeholder */
  const [posterPhaseByIndex, setPosterPhaseByIndex] = useState<
    Record<number, PosterPhase>
  >({});
  const imageStreamStartedRef = useRef(false);
  const [streamRetryGeneration, setStreamRetryGeneration] = useState(0);
  /** Bumps when collection JSON first loads so the image stream effect runs without depending on `collection` (avoids aborting SSE on each `setCollection`). */
  const [imageStreamBootstrap, setImageStreamBootstrap] = useState(0);
  const collectionRef = useRef<Collection | null>(null);
  collectionRef.current = collection;

  useEffect(() => {
    imageStreamStartedRef.current = false;
  }, [collectionId]);

  useEffect(() => {
    fetch(`/api/collections/${collectionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Collection) => {
        setCollection(data);
        const labels: Record<number, string> = {};
        const phases: Record<number, PosterPhase> = {};
        for (const dest of data.destinations) {
          if (!dest.imageUrl) {
            labels[dest.index] = (dest.data as Destination).name;
            phases[dest.index] = "generating";
          }
        }
        setGeneratingLabels(labels);
        setPosterPhaseByIndex(phases);
        setImageStreamBootstrap((k) => k + 1);
      })
      .catch((err) => setError(err.message));
  }, [collectionId]);

  useEffect(() => {
    const col = collectionRef.current;
    if (!col) return;
    if (col.destinations.every((dest) => dest.imageUrl)) {
      imageStreamStartedRef.current = false;
      return;
    }
    if (imageStreamStartedRef.current) return;

    imageStreamStartedRef.current = true;
    const ac = new AbortController();
    let cancelled = false;

    const startImageStream = async () => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/images`, {
          method: "POST",
          signal: ac.signal,
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

            let event: { type: string; data: Record<string, unknown> };
            try {
              event = JSON.parse(dataLine) as {
                type: string;
                data: Record<string, unknown>;
              };
            } catch {
              continue;
            }

            if (event.type === "status") {
              setImageStatus(String(event.data.message ?? ""));
            }

            if (event.type === "image_generating") {
              const idx = event.data.index;
              if (typeof idx === "number") {
                const name = String(event.data.name ?? "");
                setGeneratingLabels((prev) =>
                  name ? { ...prev, [idx]: name } : prev,
                );
                setPosterPhaseByIndex((prev) => ({
                  ...prev,
                  [idx]: "generating",
                }));
              }
            }

            if (
              event.type === "image_complete" &&
              typeof event.data.index === "number"
            ) {
              const idx = event.data.index;
              const imageUrl =
                typeof event.data.imageUrl === "string" && event.data.imageUrl
                  ? event.data.imageUrl
                  : null;

              setCollection((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  destinations: prev.destinations.map((dest) =>
                    dest.index === idx ? { ...dest, imageUrl } : dest,
                  ),
                };
              });
              setGeneratingLabels((prev) => {
                const next = { ...prev };
                delete next[idx];
                return next;
              });
              setPosterPhaseByIndex((prev) => {
                const next = { ...prev };
                if (imageUrl) {
                  delete next[idx];
                } else {
                  next[idx] = "no_image";
                }
                return next;
              });
            }

            if (event.type === "error") {
              const msg = String(event.data.message ?? "Poster error");
              setImageStatus(msg);
              const idx = event.data.index;
              if (typeof idx === "number") {
                setPosterPhaseByIndex((prev) => ({
                  ...prev,
                  [idx]: "failed",
                }));
                setGeneratingLabels((prev) => {
                  const next = { ...prev };
                  delete next[idx];
                  return next;
                });
              } else {
                setPosterPhaseByIndex((prev) => {
                  const next = { ...prev };
                  for (const k of Object.keys(next)) {
                    const i = Number(k);
                    if (next[i] === "generating") next[i] = "failed";
                  }
                  return next;
                });
                setGeneratingLabels({});
              }
            }

            if (event.type === "done") {
              setImageStatus("");
              setPosterPhaseByIndex((prev) => {
                const next = { ...prev };
                for (const k of Object.keys(next)) {
                  const i = Number(k);
                  if (next[i] === "generating") next[i] = "no_image";
                }
                return next;
              });
              setGeneratingLabels({});
            }
          }
        }
        imageStreamStartedRef.current = false;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          imageStreamStartedRef.current = false;
          return;
        }
        const message =
          err instanceof Error ? err.message : "Poster generation failed";
        setImageStatus(message);
        setPosterPhaseByIndex((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            const i = Number(k);
            if (next[i] === "generating") next[i] = "failed";
          }
          return next;
        });
        setGeneratingLabels({});

        imageStreamStartedRef.current = false;
        setStreamRetryGeneration((g) =>
          g < MAX_IMAGE_STREAM_RETRIES ? g + 1 : g,
        );
      }
    };

    void startImageStream();

    return () => {
      cancelled = true;
      ac.abort();
      imageStreamStartedRef.current = false;
    };
  }, [collectionId, imageStreamBootstrap, streamRetryGeneration]);

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

  const posterPhaseForCarousel: Record<number, PosterPhase> = {};
  for (const d of collection.destinations) {
    if (!d.imageUrl && posterPhaseByIndex[d.index]) {
      posterPhaseForCarousel[d.index] = posterPhaseByIndex[d.index];
    }
  }

  if (detailIndex !== null && destinations[detailIndex]) {
    const hasImage = Boolean(imageUrls[detailIndex]);
    const phase = posterPhaseByIndex[detailIndex];
    const isImageGenerating =
      !hasImage && phase === "generating";

    return (
      <TripDetail
        destination={destinations[detailIndex]}
        imageUrl={imageUrls[detailIndex]}
        isImageGenerating={isImageGenerating}
        onBack={() => setDetailIndex(null)}
      />
    );
  }

  const showRetry =
    collection.destinations.some((d) => !d.imageUrl) &&
    Object.values(posterPhaseByIndex).some(
      (p) => p === "failed" || p === "no_image",
    );

  return (
    <div className="relative min-h-screen bg-page-bg">
      {imageStatus ? (
        <div className="absolute top-20 right-4 sm:right-8 z-20 rounded-full bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] px-4 py-2 font-sans text-xs text-text-secondary max-w-[min(90vw,20rem)]">
          {imageStatus}
        </div>
      ) : null}

      {showRetry ? (
        <div className="absolute top-32 right-4 sm:right-8 z-20">
          <button
            type="button"
            onClick={() => {
              imageStreamStartedRef.current = false;
              const labels: Record<number, string> = {};
              const phases: Record<number, PosterPhase> = {
                ...posterPhaseByIndex,
              };
              for (const dest of collection.destinations) {
                if (!dest.imageUrl) {
                  phases[dest.index] = "generating";
                  labels[dest.index] = (dest.data as Destination).name;
                }
              }
              setGeneratingLabels(labels);
              setPosterPhaseByIndex(phases);
              setStreamRetryGeneration((g) => g + 1);
            }}
            className="rounded-full bg-surface-elevated border border-border-default px-4 py-2 font-sans text-xs text-text-primary hover:bg-hover-bg"
          >
            Retry posters
          </button>
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
        generatingLabels={generatingLabels}
        posterPhaseByIndex={posterPhaseForCarousel}
        onExplore={(i) => setDetailIndex(i)}
      />
    </div>
  );
}
