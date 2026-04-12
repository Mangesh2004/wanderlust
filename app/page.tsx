"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TripInput, Destination } from "@/lib/trip/schema";
import { TripForm } from "./components/trip-form";
import { TripLoading, type StreamEvent } from "./components/trip-loading";
import { useAuth } from "./components/auth-provider";
import { AuthModal } from "./components/auth-modal";
import { RecentTrips } from "./components/recent-trips";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSubmit = useCallback(
    async (input: TripInput) => {
      if (!user) {
        setShowAuthModal(true);
        return;
      }

      setLoading(true);
      setEvents([]);
      setError("");

      try {
        const res = await fetch("/api/trip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const err = await res.json();
          if (res.status === 401) {
            setLoading(false);
            setShowAuthModal(true);
            return;
          }
          throw new Error(err.error || "Failed to generate");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        const collectedDests: Record<number, Destination> = {};
        const collectedImages: Record<number, string> = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const dataLine = chunk.replace(/^data: /, "").trim();
            if (!dataLine) continue;

            try {
              const event = JSON.parse(dataLine);

              switch (event.type) {
                case "status":
                  setEvents((prev) => [
                    ...prev,
                    { type: "status", message: event.data.message },
                  ]);
                  break;
                case "tool_call":
                  setEvents((prev) => [
                    ...prev,
                    { type: "tool_call", tool: event.data.tool, toolInput: event.data.input },
                  ]);
                  break;
                case "tool_result":
                  setEvents((prev) => [
                    ...prev,
                    { type: "tool_result", tool: event.data.tool, toolOutput: event.data.output },
                  ]);
                  break;
                case "thinking":
                  setEvents((prev) => [
                    ...prev,
                    { type: "thinking", thinking: event.data.text },
                  ]);
                  break;
                case "destination_complete":
                  collectedDests[event.data.index] = event.data.destination;
                  break;
                case "image_complete":
                  if (event.data.imageUrl) {
                    collectedImages[event.data.index] = event.data.imageUrl;
                  }
                  break;
                case "result":
                  if (event.data.success && event.data.result?.destinations) {
                    event.data.result.destinations.forEach((d: Destination, i: number) => {
                      collectedDests[i] = d;
                    });
                  }
                  break;
                case "error":
                  setError(event.data.message || "Something went wrong");
                  break;
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }

        // Auto-save and redirect to collection
        const destsArray = Object.keys(collectedDests)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => collectedDests[Number(k)]);

        if (destsArray.length > 0) {
          const saveRes = await fetch("/api/collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...input,
              destinations: destsArray,
              imageUrls: collectedImages,
            }),
          });

          if (saveRes.ok) {
            const collection = await saveRes.json();
            router.push(`/collections/${collection.id}`);
            return;
          }
        }

        // Fallback if save failed
        setLoading(false);
        setError("Trip generated but failed to save. Please try again.");
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [user, router],
  );

  if (loading) {
    return <TripLoading events={events} />;
  }

  return (
    <div className="min-h-screen bg-[#0F0E0D] pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 items-start">
        {/* Left: Form */}
        <div className="w-full max-w-2xl">
          <TripForm onSubmit={handleSubmit} error={error} />
        </div>

        {/* Right: Recent trips sidebar (desktop) / below form (mobile) */}
        <aside className="lg:sticky lg:top-24 lg:min-h-[400px]">
          <RecentTrips />
        </aside>
      </div>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
