"use client";

import { useEffect, useRef } from "react";

export interface StreamEvent {
  type: string;
  message?: string;
  agent?: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  thinking?: string;
}

interface TripLoadingProps {
  events: StreamEvent[];
}

function summarizeToolInput(tool: string, input: Record<string, unknown>): string {
  if (tool === "geocode_location") return `"${input.query}"`;
  if (tool === "get_weather_forecast")
    return `${(input.lat as number)?.toFixed?.(1) ?? input.lat}, ${(input.lon as number)?.toFixed?.(1) ?? input.lon}`;
  if (tool === "convert_currency") return `${input.from} \u2192 ${input.to}`;
  if (tool === "generate_travel_image")
    return `"${String(input.prompt ?? "").slice(0, 48)}..."`;
  if (tool === "web_search" || tool === "web_search_call")
    return `"${String(input.query ?? input.q ?? "").slice(0, 40)}"`;
  if (tool === "search_flights") return `${input.from} \u2192 ${input.to}`;
  if (tool === "search_hotels") return `${input.destination}, ${input.budget}`;
  if (tool === "search_transport") return `${input.destination}`;
  if (tool === "search_activities") return `${input.destination}`;
  if (tool === "search_general") return `"${(input.query as string)?.slice(0, 40)}"`;
  return JSON.stringify(input).slice(0, 50);
}

function summarizeToolOutput(tool: string, output: string): string {
  try {
    const parsed = JSON.parse(output);
    if (tool === "geocode_location") {
      return `${parsed.lat?.toFixed(2)}\u00B0, ${parsed.lon?.toFixed(2)}\u00B0 \u2014 ${parsed.country || parsed.displayName || "found"}`;
    }
    if (tool === "get_weather_forecast" && Array.isArray(parsed)) {
      const avg =
        parsed.reduce((s: number, d: { high?: number }) => s + (d.high || 0), 0) /
        parsed.length;
      return `${parsed.length}-day forecast, ~${avg.toFixed(0)}\u00B0C avg`;
    }
    if (tool === "convert_currency") {
      return `1 ${parsed.from} = ${parsed.rate?.toFixed(2)} ${parsed.to}`;
    }
  } catch {
    /* not json */
  }
  if (output.length > 80) return output.slice(0, 80) + "...";
  return output;
}

export function TripLoading({ events }: TripLoadingProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const totalToolResults = events.filter((e) => e.type === "tool_result").length;
  const progress = Math.min((totalToolResults / 20) * 100, 95);

  return (
    <div className="min-h-screen bg-page-bg page-texture flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <p className="mb-3 text-center font-sans text-[13px] uppercase tracking-[0.4em] text-text-muted">
          WANDERLUST
        </p>
        <p className="mb-8 text-center font-serif text-lg text-text-tertiary italic">
          Researching your dream destinations...
        </p>

        {/* Activity feed */}
        <div
          ref={scrollRef}
          className="bg-surface-subtle rounded-xl border border-border-default p-5 max-h-[55vh] overflow-y-auto space-y-2"
        >
          {events.length === 0 && (
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-transparent border-t-[var(--accent-orange)] animate-spin" />
              <span className="font-mono text-sm text-text-tertiary">
                Initializing agent...
              </span>
            </div>
          )}
          {events.map((event, i) => (
            <EventLine key={i} event={event} />
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="font-mono text-xs text-text-muted">
              {totalToolResults > 0
                ? `${totalToolResults} tool calls complete`
                : "Starting research..."}
            </span>
            <span className="font-mono text-xs text-text-muted">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1 bg-surface-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-orange)] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EventLine({ event }: { event: StreamEvent }) {
  if (event.type === "status") {
    return (
      <div className="flex items-center gap-3 animate-fade-in">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-transparent border-t-[var(--accent-orange)] animate-spin flex-shrink-0" />
        <span className="font-mono text-sm text-text-secondary">{event.message}</span>
      </div>
    );
  }

  if (event.type === "tool_call") {
    const inputSummary = event.toolInput
      ? summarizeToolInput(event.tool!, event.toolInput)
      : "";
    return (
      <div className="flex items-start gap-2 ml-4 animate-fade-in">
        <span className="text-text-muted font-mono text-xs mt-0.5">{"\u25B8"}</span>
        <div>
          <span className="font-mono text-xs text-[var(--accent-orange)]">
            {event.tool}
          </span>
          <span className="font-mono text-xs text-text-muted ml-1">
            ({inputSummary})
          </span>
        </div>
      </div>
    );
  }

  if (event.type === "tool_result") {
    const outputSummary = event.toolOutput
      ? summarizeToolOutput(event.tool!, event.toolOutput)
      : "";
    return (
      <div className="flex items-start gap-2 ml-8 animate-fade-in">
        <span className="text-emerald-400/60 font-mono text-xs mt-0.5">{"\u2192"}</span>
        <span className="font-mono text-xs text-text-tertiary">{outputSummary}</span>
      </div>
    );
  }

  if (event.type === "thinking") {
    return (
      <div className="flex items-start gap-2 ml-4 animate-fade-in">
        <span className="text-text-faint font-mono text-xs mt-0.5">
          {"\u{1F4AD}"}
        </span>
        <span className="font-mono text-xs text-text-muted italic">
          {event.thinking?.slice(0, 120)}
        </span>
      </div>
    );
  }

  if (event.type === "agent_update" && event.agent) {
    return (
      <div className="flex items-center gap-2 ml-2 animate-fade-in">
        <span className="font-mono text-xs text-text-muted uppercase tracking-wider">
          Agent
        </span>
        <span className="font-mono text-xs text-[var(--accent-orange)]">
          {event.agent}
        </span>
      </div>
    );
  }

  return null;
}
