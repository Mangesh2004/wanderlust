"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { TripInput, Destination } from "@/lib/trip/schema";
import { TripForm } from "./components/trip-form";
import { TripLoading, type StreamEvent } from "./components/trip-loading";
import { useAuth } from "./components/auth-provider";
import { AuthModal } from "./components/auth-modal";
import { RecentTrips } from "./components/recent-trips";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Reset loading state when navigating back to this page
  useEffect(() => {
    setLoading(false);
    setEvents([]);
  }, [pathname]);

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
                case "agent_update":
                  setEvents((prev) => [
                    ...prev,
                    {
                      type: "agent_update",
                      agent: String(event.data.agent ?? ""),
                    },
                  ]);
                  break;
                case "done":
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
          const payload = {
            ...input,
            destinations: destsArray,
          };
          let saveRes: Response | null = null;
          let lastSaveError = "";
          for (let attempt = 0; attempt < 2; attempt++) {
            saveRes = await fetch("/api/collections", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (saveRes.ok) {
              const collection = await saveRes.json();
              router.push(`/collections/${collection.id}`);
              return;
            }
            try {
              const errBody = await saveRes.json();
              lastSaveError =
                typeof errBody.error === "string"
                  ? errBody.error
                  : saveRes.statusText;
            } catch {
              lastSaveError = saveRes.statusText || "Save failed";
            }
            console.error("[collections POST]", saveRes.status, lastSaveError);
          }
          setLoading(false);
          setError(
            lastSaveError
              ? `Could not save trip: ${lastSaveError}`
              : "Trip generated but failed to save. Please try again.",
          );
          return;
        }

        setLoading(false);
        setError("Trip generated but no destinations to save. Please try again.");
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
    <div className="min-h-screen bg-page-bg page-texture pt-24 pb-12 px-4 md:px-8">
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
