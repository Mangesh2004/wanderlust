"use client";

import { useState, useRef, useEffect } from "react";

interface StreamEvent {
  type: "status" | "tool_call" | "tool_result" | "thinking" | "result" | "error";
  data: Record<string, any>;
}

function ExpandableJson({ data, label, maxHeight = "300px" }: { data: any; label?: string; maxHeight?: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-zinc-500 hover:text-zinc-300 underline"
      >
        {expanded ? "▼ Collapse" : "▶ Expand"} {label || `(${text.length} chars)`}
      </button>
      {expanded && (
        <pre
          className="mt-1 bg-zinc-950 border border-zinc-800 rounded p-3 text-xs overflow-auto whitespace-pre-wrap"
          style={{ maxHeight }}
        >
          {text}
        </pre>
      )}
    </div>
  );
}

function ToolResultCard({ event }: { event: StreamEvent }) {
  const { tool, input, output } = event.data;
  let parsedOutput: any = null;
  try {
    parsedOutput = JSON.parse(output as string);
  } catch {
    parsedOutput = null;
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-400 font-bold text-xs">✓ {tool}</span>
      </div>

      {/* Input */}
      <div className="mb-2">
        <span className="text-xs text-zinc-500">Input:</span>
        <code className="ml-2 text-xs text-blue-300">{JSON.stringify(input)}</code>
      </div>

      {/* Output summary */}
      <div>
        <span className="text-xs text-zinc-500">Output:</span>
        {parsedOutput ? (
          <div className="mt-1">
            {/* Smart summary based on tool type */}
            {tool === "geocode_location" && (
              <span className="text-xs text-green-300 ml-2">
                → {parsedOutput.lat?.toFixed(4)}, {parsedOutput.lon?.toFixed(4)} | {parsedOutput.displayName || parsedOutput.country}
              </span>
            )}
            {tool === "get_weather_forecast" && parsedOutput.forecast && (
              <div className="ml-2 mt-1">
                <div className="text-xs text-green-300">
                  → {parsedOutput.forecast.length} days: {parsedOutput.forecast.map((f: any) => `${f.day}: ${f.high}°/${f.low}° ${f.condition}`).join(" | ")}
                </div>
              </div>
            )}
            {tool === "convert_currency" && (
              <span className="text-xs text-green-300 ml-2">
                → 1 {parsedOutput.from} = {parsedOutput.rate} {parsedOutput.to}
              </span>
            )}
            {(tool === "search_hotels" || tool === "search_flights" || tool === "search_transport" || tool === "search_activities" || tool === "search_general") && (
              <div className="ml-2 mt-1">
                {parsedOutput.answer && (
                  <p className="text-xs text-yellow-300/80 leading-relaxed">{(parsedOutput.answer as string).slice(0, 400)}</p>
                )}
                {parsedOutput.results && (
                  <span className="text-xs text-zinc-500 block mt-1">{parsedOutput.results.length} source results</span>
                )}
              </div>
            )}
            <ExpandableJson data={output} label="full raw output" maxHeight="400px" />
          </div>
        ) : (
          <div>
            <span className="text-xs text-zinc-400 ml-2">{(output as string).slice(0, 200)}</span>
            {(output as string).length > 200 && (
              <ExpandableJson data={output} label="full output" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DebugPage() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"stream" | "tools" | "result" | "raw" | "images">("stream");
  const logRef = useRef<HTMLDivElement>(null);
  const [collectionImages, setCollectionImages] = useState<{dest_name: string; imageUrl: string}[]>([]);

  const [form, setForm] = useState({
    vibe: "I want to wake up in the mountains, fresh cold air, cozy cafes, maybe some snow",
    departureCity: "New York",
    travelDates: "2026-04-18",
    days: 3,
    budget: "medium",
    travelWith: "solo",
    interests: ["hiking", "food", "culture"],
  });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  // Load collection images on mount
  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.ok ? r.json() : [])
      .then((collections: any[]) => {
        const imgs: {dest_name: string; imageUrl: string}[] = [];
        for (const col of collections) {
          for (const dest of col.destinations || []) {
            if (dest.imageUrl) {
              imgs.push({
                dest_name: (dest.data as any)?.name || `index ${dest.index}`,
                imageUrl: dest.imageUrl,
              });
            }
          }
        }
        setCollectionImages(imgs);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEvents([]);
    setFinalResult(null);
    setActiveTab("stream");

    try {
      const res = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, "").trim();
          if (!dataLine) continue;

          try {
            const event: StreamEvent = JSON.parse(dataLine);
            setEvents((prev) => [...prev, event]);

            if (event.type === "result") {
              setFinalResult(event.data);
              setActiveTab("result");
            } else if (event.type === "error") {
              setError(event.data.message as string);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const toolResults = events.filter((e) => e.type === "tool_result");
  const toolCalls = events.filter((e) => e.type === "tool_call");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-sm">
      <h1 className="text-xl font-bold mb-6 text-white">Trip Agent — Debug (Full Tool Inspection)</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-4 mb-8">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Travel Vibe</label>
          <textarea
            value={form.vibe}
            onChange={(e) => setForm((f) => ({ ...f, vibe: e.target.value }))}
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            placeholder="Describe your dream trip..."
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">From</label>
            <input
              value={form.departureCity}
              onChange={(e) => setForm((f) => ({ ...f, departureCity: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              value={form.travelDates}
              onChange={(e) => setForm((f) => ({ ...f, travelDates: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Days</label>
            <input
              type="number"
              min={1}
              max={14}
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: Number(e.target.value) }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Budget</label>
            <select
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            >
              <option value="low">Low ($0-$1K)</option>
              <option value="medium">Medium ($1K-$2.5K)</option>
              <option value="high">High ($2.5K+)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">With</label>
            <select
              value={form.travelWith}
              onChange={(e) => setForm((f) => ({ ...f, travelWith: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            >
              <option value="solo">Solo</option>
              <option value="couple">Couple</option>
              <option value="family">Family</option>
              <option value="friends">Friends</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Interests</label>
          <input
            value={form.interests.join(", ")}
            onChange={(e) => setForm((f) => ({ ...f, interests: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-6 py-2 rounded font-sans font-medium"
        >
          {loading ? "Agent running..." : "Run Trip Agent"}
        </button>
        {loading && <span className="ml-3 text-orange-400 animate-pulse text-xs">streaming events...</span>}
      </form>

      {error && <div className="text-red-400 mb-4 p-3 bg-red-900/20 rounded border border-red-800">Error: {error}</div>}

      {/* Images tab — always visible */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("images")}
          className={`px-4 py-1.5 rounded-t text-xs font-medium ${
            activeTab === "images"
              ? "bg-zinc-800 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Collection Images ({collectionImages.length})
        </button>
        {events.length > 0 && (["stream", "tools", "result", "raw"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-t text-xs font-medium ${
              activeTab === tab
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab === "stream" && `Stream (${events.length})`}
            {tab === "tools" && `Tool Outputs (${toolResults.length})`}
            {tab === "result" && "Parsed Result"}
            {tab === "raw" && "Raw AI Output"}
          </button>
        ))}
      </div>

      {activeTab === "images" && (
        <div>
          {collectionImages.length === 0 ? (
            <p className="text-zinc-500 text-sm">No collection images found. Generate a trip first.</p>
          ) : (
            <div className="space-y-8">
              {collectionImages.map((img, i) => (
                <div key={i}>
                  <p className="text-xs text-zinc-400 mb-2">{img.dest_name}</p>
                  <img
                    src={img.imageUrl}
                    alt={img.dest_name}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {events.length > 0 && (
        <>

          {/* Stream tab */}
          {activeTab === "stream" && (
            <div
              ref={logRef}
              className="bg-zinc-900 rounded border border-zinc-800 p-4 max-h-[500px] overflow-y-auto space-y-1"
            >
              {events.map((event, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className={`flex-shrink-0 w-20 text-right ${
                    event.type === "tool_call" ? "text-blue-400" :
                    event.type === "tool_result" ? "text-green-400" :
                    event.type === "status" ? "text-zinc-500" :
                    event.type === "thinking" ? "text-purple-400" :
                    event.type === "error" ? "text-red-400" :
                    "text-orange-400"
                  }`}>
                    [{event.type}]
                  </span>
                  <span className="text-zinc-300 truncate">
                    {event.type === "tool_call" && `${event.data.tool}(${JSON.stringify(event.data.input).slice(0, 80)}...)`}
                    {event.type === "tool_result" && `${event.data.tool} → ${typeof event.data.output === 'string' ? event.data.output.slice(0, 100) : JSON.stringify(event.data.output).slice(0, 100)}...`}
                    {event.type === "status" && event.data.message}
                    {event.type === "thinking" && (event.data.text as string).slice(0, 150)}
                    {event.type === "error" && <span className="text-red-400">{event.data.message}</span>}
                    {event.type === "result" && (event.data.success ? "✓ Schema validated" : "✗ Schema failed")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tools tab — full detail */}
          {activeTab === "tools" && (
            <div className="max-h-[700px] overflow-y-auto space-y-2">
              <p className="text-xs text-zinc-500 mb-3">
                {toolCalls.length} tool calls → {toolResults.length} results. Inspect each tool's raw output to verify data quality.
              </p>
              {toolResults.map((event, i) => (
                <ToolResultCard key={i} event={event} />
              ))}
            </div>
          )}

          {/* Result tab */}
          {activeTab === "result" && finalResult && (
            <div>
              <div className={`px-4 py-2 rounded mb-4 ${finalResult.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                {finalResult.success ? `✓ Schema PASSED — ${finalResult.result?.destinations?.length || 0} destinations` : "✗ Schema FAILED"}
              </div>
              {finalResult.result && (
                <pre className="bg-zinc-900 rounded border border-zinc-800 p-4 overflow-auto max-h-[600px] text-xs text-green-300">
                  {JSON.stringify(finalResult.result, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Raw tab */}
          {activeTab === "raw" && finalResult && (
            <pre className="bg-zinc-900 rounded border border-zinc-800 p-4 overflow-auto max-h-[600px] text-xs text-zinc-300 whitespace-pre-wrap">
              {finalResult.raw}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
