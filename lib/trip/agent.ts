import "server-only";
import { run, InputGuardrailTripwireTriggered } from "@openai/agents";
import type { RunStreamEvent } from "@openai/agents";
import {
  BUDGET_LABELS,
  type TripInput,
  type TripResult,
  type Phase1Destination,
  type Destination,
  tripResultSchema,
} from "./schema";
import {
  destinationSelectorAgent,
  destinationResearcherAgent,
  imageGeneratorAgent,
} from "./agents";

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
    | "done";
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

function buildImageInput(dest: Destination): string {
  return `Destination: ${dest.name}, ${dest.country}

Call generate_travel_image with this prompt (you may only fix typos; keep the same meaning):
${dest.imagePrompt}

Then output imageDataUrl as the exact string returned by the tool (must start with data: if successful).`;
}

function parseToolCallItem(item: unknown): {
  name: string;
  input: Record<string, unknown>;
} {
  const o = item as {
    rawItem?: { name?: string; arguments?: string } };
  const name = o.rawItem?.name ?? "tool";
  let input: Record<string, unknown> = {};
  try {
    if (o.rawItem?.arguments) input = JSON.parse(o.rawItem.arguments) as Record<string, unknown>;
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

function* mapStreamEvent(ev: RunStreamEvent): Generator<TripEvent> {
  if (ev.type === "run_item_stream_event") {
    if (ev.name === "tool_called") {
      const { name, input } = parseToolCallItem(ev.item);
      yield {
        type: "tool_call",
        data: { tool: name, input },
      };
    } else if (ev.name === "tool_output") {
      const { name, output } = parseToolOutputItem(ev.item);
      yield {
        type: "tool_result",
        data: { tool: name, output },
      };
    }
  } else if (ev.type === "agent_updated_stream_event") {
    yield {
      type: "agent_update",
      data: { agent: ev.agent.name },
    };
  }
}

export async function* runTripAgentStream(
  input: TripInput,
): AsyncGenerator<TripEvent> {
  yield {
    type: "status",
    data: { message: "Starting trip research agent..." },
  };

  let phase1Result;
  try {
    yield { type: "status", data: { message: "Selecting destinations..." } };
    const stream = await run(destinationSelectorAgent, buildPhase1Input(input), {
      stream: true,
    });
    for await (const ev of stream) {
      yield* mapStreamEvent(ev);
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

  const researched: Destination[] = [];
  for (let i = 0; i < selected.length; i++) {
    const dest = selected[i];
    yield {
      type: "status",
      data: { message: `${dest.name}: deep research...` },
    };
    try {
      const r = await run(destinationResearcherAgent, buildPhase2Input(input, dest));
      const out = r.finalOutput;
      if (out) researched.push(out as Destination);
    } catch (e) {
      yield {
        type: "error",
        data: {
          message: `${dest.name}: ${e instanceof Error ? e.message : "research failed"}`,
        },
      };
    }
  }

  if (researched.length === 0) {
    yield {
      type: "error",
      data: { message: "All destination research failed" },
    };
    return;
  }

  const tripResult: TripResult = { destinations: researched };
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
      result: merged as unknown as Record<string, unknown>,
      raw: JSON.stringify({ destinations: merged }),
    },
  };

  for (let i = 0; i < merged.length; i++) {
    yield {
      type: "destination_complete",
      data: { index: i, destination: merged[i] },
    };
  }

  yield {
    type: "status",
    data: { message: "Generating travel poster images..." },
  };

  for (let i = 0; i < merged.length; i++) {
    yield {
      type: "image_generating",
      data: { index: i, name: merged[i].name },
    };
  }

  const imageResults = await Promise.all(
    merged.map(async (dest, index) => {
      try {
        const r = await run(imageGeneratorAgent, buildImageInput(dest));
        const url = r.finalOutput?.imageDataUrl ?? null;
        return { index, url: url && url.startsWith("data:") ? url : null };
      } catch {
        return { index, url: null as string | null };
      }
    }),
  );

  for (const { index, url } of imageResults) {
    merged[index].imageUrl = url;
    yield {
      type: "image_complete",
      data: { index, imageUrl: url ?? "" },
    };
  }

  yield {
    type: "result",
    data: {
      success: true,
      result: { destinations: merged } as unknown as Record<string, unknown>,
      raw: JSON.stringify({ destinations: merged }),
    },
  };
}
