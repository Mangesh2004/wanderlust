import "server-only";
import {
  run,
  InputGuardrailTripwireTriggered,
  type RunItem,
  type RunErrorHandlers,
} from "@openai/agents";
import type { RunStreamEvent } from "@openai/agents";
import {
  BUDGET_LABELS,
  type TripInput,
  type TripResult,
  type Phase1Destination,
  type Destination,
  tripResultSchema,
  phase1ResultSchema,
  destinationSchema,
  extractJSON,
} from "./schema";
import {
  destinationSelectorAgent,
  destinationResearcherAgent,
} from "./agents";
import { resetWeatherToolCallBudget } from "./sdk-tools";
import {
  isWeatherConfigured,
  summarizeGetWeatherForecastToolOutput,
} from "@/lib/ai/tools/weather";
import { generateTripImage } from "./tools/image-gen";
import { createSupabaseServer } from "@/lib/supabase/server";
import { uploadBase64Image } from "@/lib/supabase/upload-image";
import {
  sanitizeForDebugJson,
  sanitizeToolOutputString,
} from "./debug-sanitize";

export { sanitizeForDebugJson, sanitizeToolOutputString };

/** OpenAI Agents SDK default is 10; researcher + many tools needs more. Override with OPENAI_TRIP_MAX_TURNS. */
const TRIP_AGENT_MAX_TURNS = (() => {
  const raw = process.env.OPENAI_TRIP_MAX_TURNS;
  const n = raw === undefined ? 12 : Number(raw);
  if (!Number.isFinite(n)) return 12;
  return Math.min(200, Math.max(10, Math.floor(n)));
})();

/** Selector only needs geocode + bounded weather + structured output; cap turns to fail fast. */
const PHASE1_MAX_TURNS = 15;

function extractAssistantTextFromRunItems(items: RunItem[]): string {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i] as {
      rawItem?: {
        role?: string;
        content?: Array<{ type?: string; text?: string }>;
      };
    };
    const raw = it.rawItem;
    if (raw?.role !== "assistant" || !Array.isArray(raw.content)) continue;
    const texts: string[] = [];
    for (const block of raw.content) {
      if (block?.type === "output_text" && typeof block.text === "string") {
        texts.push(block.text);
      }
    }
    if (texts.length > 0) return texts.join("\n");
  }
  return "";
}

function tryPhase1OutputFromRunItems(items: RunItem[]) {
  const text = extractAssistantTextFromRunItems(items);
  if (!text.trim()) return undefined;
  try {
    const parsed = phase1ResultSchema.safeParse(
      JSON.parse(extractJSON(text)),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function tryDestinationOutputFromRunItems(items: RunItem[]) {
  const text = extractAssistantTextFromRunItems(items);
  if (!text.trim()) return undefined;
  try {
    const parsed = destinationSchema.safeParse(JSON.parse(extractJSON(text)));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

const phase1RunErrorHandlers: RunErrorHandlers<
  undefined,
  typeof destinationSelectorAgent
> = {
  maxTurns: ({ runData }) => {
    const out = tryPhase1OutputFromRunItems(runData.newItems);
    if (out) return { finalOutput: out };
    return undefined;
  },
};

const phase2RunErrorHandlers: RunErrorHandlers<
  undefined,
  typeof destinationResearcherAgent
> = {
  maxTurns: ({ runData }) => {
    const out = tryDestinationOutputFromRunItems(runData.newItems);
    if (out) return { finalOutput: out };
    return undefined;
  },
};

const PHASE1_RUN_STREAM_OPTS = {
  stream: true as const,
  maxTurns: PHASE1_MAX_TURNS,
  errorHandlers: phase1RunErrorHandlers,
};

const TRIP_RUN_OPTS = {
  maxTurns: TRIP_AGENT_MAX_TURNS,
  errorHandlers: phase2RunErrorHandlers,
};

export interface TripEvent {
  type:
    | "status"
    | "tool_call"
    | "tool_result"
    | "thinking"
    | "agent_update"
    | "result"
    | "error"
    | "destination_complete"
    | "image_generating"
    | "image_complete"
    | "done"
    | "debug_phase1"
    | "debug_research"
    | "debug_image_agent"
    | "debug_weather";
  data: Record<string, unknown>;
}

function buildPhase1Input(input: TripInput): string {
  const endDate = new Date(input.travelDates);
  endDate.setDate(endDate.getDate() + input.days);
  return `Find exactly 3 dream destinations for:
Vibe: "${input.vibe}"
Departure city: ${input.departureCity}
Travel dates: ${input.travelDates} to ${endDate.toISOString().split("T")[0]} (${input.days} days)
Total trip budget: ${BUDGET_LABELS[input.budget]}
Traveling with: ${input.travelWith}
Interests: ${input.interests.join(", ")}`;
}

function buildPhase2Input(input: TripInput, dest: Phase1Destination): string {
  const endDate = new Date(input.travelDates);
  endDate.setDate(endDate.getDate() + input.days);
  return `## Trip parameters
${JSON.stringify(
  {
    vibe: input.vibe,
    departureCity: input.departureCity,
    travelDates: input.travelDates,
    returnDate: endDate.toISOString().split("T")[0],
    days: input.days,
    budget: input.budget,
    budgetLabel: BUDGET_LABELS[input.budget],
    travelWith: input.travelWith,
    interests: input.interests,
  },
  null,
  2,
)}

## Pre-selected destination (keep name, country, coordinates, and weather; expand details in the structured output)
${JSON.stringify(dest, null, 2)}

Research this destination thoroughly and return ONE complete object matching the Destination schema.`;
}

function parseToolCallItem(item: unknown): {
  name: string;
  input: Record<string, unknown>;
} {
  const o = item as {
    rawItem?: {
      name?: string;
      arguments?: string;
      input?: string;
      action?: { query?: string; q?: string };
      query?: string;
      q?: string;
    };
    input?: unknown;
  };
  const name = o.rawItem?.name ?? "tool";
  let input: Record<string, unknown> = {};
  try {
    if (o.rawItem?.arguments) {
      input = JSON.parse(o.rawItem.arguments) as Record<string, unknown>;
    } else if (o.rawItem?.input) {
      input = JSON.parse(o.rawItem.input) as Record<string, unknown>;
    } else if (o.rawItem?.query || o.rawItem?.q) {
      input = { query: o.rawItem.query ?? o.rawItem.q };
    } else if (o.rawItem?.action?.query || o.rawItem?.action?.q) {
      input = { query: o.rawItem.action.query ?? o.rawItem.action.q };
    } else if (o.input && typeof o.input === "object") {
      input = o.input as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return { name, input };
}

function parseToolOutputItem(item: unknown): { name: string; output: string } {
  const o = item as {
    rawItem?: { name?: string; callId?: string; type?: string };
    output?: unknown;
  };
  const out = o.output;
  const name =
    typeof o.rawItem?.name === "string"
      ? o.rawItem.name
      : "tool";
  const output =
    typeof out === "string" ? out : JSON.stringify(out ?? "");
  return { name, output };
}

function* mapStreamEvent(
  ev: RunStreamEvent,
  options?: { sanitizeToolOutput?: boolean; debug?: boolean },
): Generator<TripEvent> {
  if (ev.type === "run_item_stream_event") {
    if (ev.name === "tool_called") {
      const { name, input } = parseToolCallItem(ev.item);
      yield {
        type: "tool_call",
        data: { tool: name, input },
      };
    } else if (ev.name === "tool_output") {
      const { name, output } = parseToolOutputItem(ev.item);
      const out =
        options?.sanitizeToolOutput === true
          ? sanitizeToolOutputString(output)
          : output;
      yield {
        type: "tool_result",
        data: { tool: name, output: out },
      };
      if (
        options?.debug === true &&
        name === "get_weather_forecast"
      ) {
        yield {
          type: "debug_weather",
          data: {
            phase: "tool_result",
            ...summarizeGetWeatherForecastToolOutput(output),
          },
        };
      }
    }
  } else if (ev.type === "agent_updated_stream_event") {
    yield {
      type: "agent_update",
      data: { agent: ev.agent.name },
    };
  }
}

export type RunTripAgentStreamOptions = {
  debug?: boolean;
};

export interface ImageGenerationEvent {
  type: "status" | "image_generating" | "image_complete" | "error" | "done";
  data: Record<string, unknown>;
}

export type StoredDestination = {
  id: string;
  index: number;
  imageUrl: string | null;
  data: Destination;
};

export async function* runTripAgentStream(
  input: TripInput,
  options?: RunTripAgentStreamOptions,
): AsyncGenerator<TripEvent> {
  const debug = options?.debug === true;
  const streamMapOpts = debug
    ? { sanitizeToolOutput: true as const, debug: true as const }
    : undefined;

  yield {
    type: "status",
    data: { message: "Starting trip research agent..." },
  };

  let phase1Result;
  try {
    yield { type: "status", data: { message: "Selecting destinations..." } };
    if (debug) {
      yield {
        type: "debug_weather",
        data: {
          phase: "pipeline",
          provider: "Open-Meteo",
          endpoint: "https://api.open-meteo.com/v1/forecast",
          apiKeyConfigured: isWeatherConfigured(),
          note:
            "get_weather_forecast uses Open-Meteo daily forecast data (up to 16 days).",
        },
      };
    }
    resetWeatherToolCallBudget();
    const stream = await run(
      destinationSelectorAgent,
      buildPhase1Input(input),
      PHASE1_RUN_STREAM_OPTS,
    );
    for await (const ev of stream) {
      yield* mapStreamEvent(ev, streamMapOpts);
    }
    await stream.completed;
    phase1Result = stream.finalOutput;
  } catch (e) {
    if (e instanceof InputGuardrailTripwireTriggered) {
      yield {
        type: "error",
        data: {
          message:
            "Invalid travel request. Please refine your vibe or dates and try again.",
        },
      };
      return;
    }
    throw e;
  }

  if (!phase1Result || phase1Result.selectedDestinations.length === 0) {
    yield { type: "error", data: { message: "Failed to select destinations" } };
    return;
  }

  const selected = phase1Result.selectedDestinations;
  yield {
    type: "status",
    data: {
      message: `Selected ${selected.length} destinations: ${selected.map((d) => d.name).join(", ")}. Researching...`,
    },
  };

  if (debug) {
    yield {
      type: "debug_phase1",
      data: {
        selectedDestinations: sanitizeForDebugJson(selected),
      },
    };
  }

  for (const dest of selected) {
    yield {
      type: "status",
      data: { message: `${dest.name}: deep research queued...` },
    };
  }

  const researchResults = await Promise.allSettled(
    selected.map(async (dest, index) => {
      const result = await run(
        destinationResearcherAgent,
        buildPhase2Input(input, dest),
        TRIP_RUN_OPTS,
      );
      const out = result.finalOutput;
      return { index, destName: dest.name, out };
    }),
  );

  const researched: Array<{ index: number; destination: Destination }> = [];
  for (const outcome of researchResults) {
    if (outcome.status === "fulfilled") {
      const { index, destName, out } = outcome.value;
      if (out) {
        researched.push({ index, destination: out as Destination });
        yield {
          type: "status",
          data: { message: `${destName}: research complete.` },
        };
        if (debug) {
          yield {
            type: "debug_research",
            data: {
              index,
              destinationName: destName,
              finalOutput: sanitizeForDebugJson(out),
            },
          };
        }
      }
      continue;
    }

    const reason = outcome.reason;
    const message =
      reason instanceof Error ? reason.message : "research failed";
    yield {
      type: "error",
      data: {
        message,
      },
    };
  }

  if (researched.length === 0) {
    yield {
      type: "error",
      data: { message: "All destination research failed" },
    };
    return;
  }

  researched.sort((a, b) => a.index - b.index);
  const tripResult: TripResult = {
    destinations: researched.map((item) => item.destination),
  };
  const validated = tripResultSchema.safeParse(tripResult);
  if (!validated.success) {
    yield {
      type: "error",
      data: { message: "Trip result failed validation. Please try again." },
    };
    return;
  }

  const merged = validated.data.destinations.map((d) => ({ ...d }));

  yield {
    type: "result",
    data: {
      success: true,
      result: { destinations: merged } as unknown as Record<string, unknown>,
      raw: JSON.stringify({ destinations: merged }),
    },
  };

  for (let i = 0; i < merged.length; i++) {
    yield {
      type: "destination_complete",
      data: { index: i, destination: merged[i] },
    };
  }
}

export async function* generateCollectionImagesStream(
  destinations: StoredDestination[],
  profileId: string,
): AsyncGenerator<ImageGenerationEvent> {
  const pending = destinations.filter((dest) => !dest.imageUrl);
  if (pending.length === 0) {
    yield {
      type: "done",
      data: {},
    };
    return;
  }

  yield {
    type: "status",
    data: { message: "Generating travel poster images..." },
  };

  for (const dest of pending) {
    yield {
      type: "image_generating",
      data: { index: dest.index, name: dest.data.name },
    };
  }

  const supabase = await createSupabaseServer();
  const uploadBatchId = Date.now();

  const imageResults = await Promise.allSettled(
    pending.map(async (dest) => {
      const dataUrl = await generateTripImage(dest.data.imagePrompt);
      let publicUrl: string | null = null;
      if (dataUrl?.startsWith("data:")) {
        const path = `${profileId}/${uploadBatchId}_${dest.index}.png`;
        publicUrl = await uploadBase64Image(supabase, dataUrl, path);
      }
      return {
        destinationId: dest.id,
        index: dest.index,
        imageUrl: publicUrl,
      };
    }),
  );

  for (const outcome of imageResults) {
    if (outcome.status === "fulfilled") {
      const { index, imageUrl } = outcome.value;
      yield {
        type: "image_complete",
        data: { index, imageUrl: imageUrl ?? "" },
      };
      continue;
    }

    yield {
      type: "error",
      data: {
        message:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : "image pipeline failed",
      },
    };
  }

  yield {
    type: "done",
    data: {},
  };
}
