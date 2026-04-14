"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { TripInput } from "@/lib/trip/schema";
import { useAuth } from "@/app/components/auth-provider";
import { AuthModal } from "@/app/components/auth-modal";

const INTEREST_OPTIONS = [
  "hiking",
  "food",
  "culture",
  "beach",
  "nightlife",
  "shopping",
  "wellness",
  "adventure",
  "photography",
  "history",
] as const;

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

const DEFAULT_INPUT: TripInput = {
  vibe: "Slow travel with great coffee, local markets, and a mix of city walks and nature nearby — not too touristy.",
  departureCity: "San Francisco",
  travelDates: defaultStartDate(),
  days: 5,
  budget: "medium",
  travelWith: "couple",
  interests: ["food", "culture"],
};

type LogFilter = "all" | "tools" | "agents" | "debug" | "errors";

type LogEntry = {
  id: string;
  at: number;
  type: string;
  data: Record<string, unknown>;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function eventCategory(type: string): LogFilter | "other" {
  if (type === "error") return "errors";
  if (type === "tool_call" || type === "tool_result") return "tools";
  if (type === "agent_update" || type === "thinking") return "agents";
  if (type.startsWith("debug_")) return "debug";
  return "other";
}

export default function TripDebugPage() {
  const { user } = useAuth();
  const [input, setInput] = useState<TripInput>(DEFAULT_INPUT);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => {
      const c = eventCategory(e.type);
      if (filter === "errors") return c === "errors";
      if (filter === "tools") return c === "tools";
      if (filter === "agents") return c === "agents";
      if (filter === "debug") return c === "debug";
      return true;
    });
  }, [entries, filter]);

  const run = useCallback(async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    setEntries([]);
    setError("");

    try {
      const res = await fetch("/api/trip/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (res.status === 403) {
        setLoading(false);
        setError(
          "Trip debug API is disabled. Set ALLOW_TRIP_DEBUG=true on the server.",
        );
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setLoading(false);
          setShowAuthModal(true);
          return;
        }
        throw new Error(
          typeof err.error === "string" ? err.error : "Request failed",
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

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
            const event = JSON.parse(dataLine) as {
              type: string;
              data?: Record<string, unknown>;
            };
            if (event.type === "done") continue;

            setEntries((prev) => [
              ...prev,
              {
                id: newId(),
                at: Date.now(),
                type: event.type,
                data: event.data ?? {},
              },
            ]);

            if (event.type === "error") {
              const msg =
                typeof event.data?.message === "string"
                  ? event.data.message
                  : "Stream error";
              setError(msg);
            }

            queueMicrotask(() => {
              logEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [user, input]);

  function toggleInterest(value: string) {
    setInput((prev) => {
      const has = prev.interests.includes(value);
      const interests = has
        ? prev.interests.filter((i) => i !== value)
        : [...prev.interests, value];
      if (interests.length === 0) return prev;
      return { ...prev, interests };
    });
  }

  const filterButtons: { id: LogFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "tools", label: "Tools" },
    { id: "agents", label: "Agents" },
    { id: "debug", label: "Debug" },
    { id: "errors", label: "Errors" },
  ];

  return (
    <div className="min-h-screen bg-page-bg page-texture pt-20 pb-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
          <div>
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.3em] text-text-muted mb-2">
              WANDERLUST · DEBUG
            </p>
            <h1 className="font-display text-2xl md:text-3xl text-text-primary">
              Trip pipeline inspector
            </h1>
            <p className="mt-2 font-serif text-sm text-text-tertiary max-w-xl">
              Prefilled request, live SSE log (tools, agent updates, debug
              payloads). Requires sign-in and{" "}
              <code className="text-xs bg-input-bg px-1 rounded">
                ALLOW_TRIP_DEBUG=true
              </code>
              .
            </p>
          </div>
          <Link
            href="/"
            className="font-sans text-sm text-[#E07A3A] hover:underline"
          >
            ← Back to app
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-8 items-start">
          <div className="rounded-2xl border border-input-border bg-input-bg/40 p-6 space-y-4">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Request body
            </h2>

            <label className="block">
              <span className="font-sans text-xs text-text-muted">Vibe</span>
              <textarea
                value={input.vibe}
                onChange={(e) => setInput((i) => ({ ...i, vibe: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm text-input-text"
                rows={3}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2 sm:col-span-1">
                <span className="font-sans text-xs text-text-muted">From</span>
                <input
                  type="text"
                  value={input.departureCity}
                  onChange={(e) =>
                    setInput((i) => ({ ...i, departureCity: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="font-sans text-xs text-text-muted">Start date</span>
                <input
                  type="date"
                  value={input.travelDates}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setInput((i) => ({ ...i, travelDates: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="font-sans text-xs text-text-muted">Days</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={input.days}
                  onChange={(e) =>
                    setInput((i) => ({
                      ...i,
                      days: Math.min(14, Math.max(1, Number(e.target.value) || 1)),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block col-span-2">
                <span className="font-sans text-xs text-text-muted">Budget</span>
                <select
                  value={input.budget}
                  onChange={(e) =>
                    setInput((i) => ({
                      ...i,
                      budget: e.target.value as TripInput["budget"],
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="font-sans text-xs text-text-muted">Travel with</span>
              <select
                value={input.travelWith}
                onChange={(e) =>
                  setInput((i) => ({
                    ...i,
                    travelWith: e.target.value as TripInput["travelWith"],
                  }))
                }
                className="mt-1 w-full rounded-xl border border-input-border bg-input-bg px-3 py-2 text-sm"
              >
                <option value="solo">Solo</option>
                <option value="couple">Couple</option>
                <option value="family">Family</option>
                <option value="friends">Friends</option>
              </select>
            </label>

            <div>
              <span className="font-sans text-xs text-text-muted block mb-2">
                Interests
              </span>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleInterest(opt)}
                    className={`rounded-full px-3 py-1 text-xs font-sans capitalize transition-colors ${
                      input.interests.includes(opt)
                        ? "bg-[#E07A3A]/20 text-[#E07A3A] ring-1 ring-[#E07A3A]/40"
                        : "bg-input-bg text-text-muted ring-1 ring-input-border"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="w-full rounded-xl bg-[#E07A3A] px-4 py-3 font-sans text-sm font-semibold text-white shadow-sm hover:bg-[#c96a32] disabled:opacity-50"
            >
              {loading ? "Running pipeline…" : "Run debug pipeline"}
            </button>

            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-input-border bg-input-bg/30 min-h-[420px] flex flex-col">
            <div className="p-4 border-b border-input-border flex flex-wrap gap-2">
              {filterButtons.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setFilter(b.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-sans ${
                    filter === b.id
                      ? "bg-[#E07A3A] text-white"
                      : "bg-input-bg text-text-secondary ring-1 ring-input-border"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto max-h-[70vh] p-4 space-y-3 font-mono text-[11px] leading-relaxed">
              {filtered.length === 0 ? (
                <p className="text-text-muted font-sans text-sm">
                  {loading
                    ? "Waiting for events…"
                    : "No events yet. Run the pipeline."}
                </p>
              ) : (
                filtered.map((e) => {
                  const header = (
                    <>
                      <span className="text-text-muted shrink-0">
                        {new Date(e.at).toLocaleTimeString()}
                      </span>
                      <span className="font-semibold text-[#E07A3A]">{e.type}</span>
                      {"message" in e.data &&
                      typeof e.data.message === "string" ? (
                        <span className="text-text-secondary truncate max-w-[200px] md:max-w-md">
                          {e.data.message as string}
                        </span>
                      ) : null}
                      {"tool" in e.data && typeof e.data.tool === "string" ? (
                        <span className="text-text-tertiary font-medium">
                          {e.data.tool as string}
                        </span>
                      ) : null}
                    </>
                  );
                  const body = (
                    <pre className="px-3 pb-3 overflow-x-auto text-text-secondary whitespace-pre-wrap break-words border-t border-input-border/60 pt-2 mt-1">
                      {JSON.stringify(e.data, null, 2)}
                    </pre>
                  );

                  if (e.type === "tool_call" || e.type === "tool_result") {
                    return (
                      <div
                        key={e.id}
                        className="rounded-lg border border-input-border bg-page-bg/80"
                      >
                        <div className="px-3 py-2 flex flex-wrap items-center gap-2 text-text-primary">
                          {header}
                        </div>
                        {body}
                      </div>
                    );
                  }

                  return (
                    <details
                      key={e.id}
                      open={
                        e.type.startsWith("debug_") || e.type === "error"
                      }
                      className="rounded-lg border border-input-border bg-page-bg/80"
                    >
                      <summary className="cursor-pointer px-3 py-2 flex flex-wrap items-center gap-2 text-text-primary list-none [&::-webkit-details-marker]:hidden">
                        {header}
                      </summary>
                      {body}
                    </details>
                  );
                })
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
