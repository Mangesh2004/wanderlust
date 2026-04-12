import "server-only";
import { type GenerateInput, type DestinationResult, type Destination } from "../schema";
import { runDestinationAgent } from "./destination-agent";
import { runWeatherItineraryAgent } from "./weather-itinerary-agent";
import { runCultureAgent } from "./culture-agent";
import { generateTravelPoster } from "../../gemini/image-generator";

export interface SSEEvent {
  event: "status" | "agent_complete" | "tool_call" | "destination_complete" | "error" | "done";
  data: Record<string, unknown>;
}

export async function* orchestrate(
  input: GenerateInput
): AsyncGenerator<SSEEvent> {
  const sessionId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Collect tool events during agent execution (push-based)
  let toolEvents: { tool: string; input: Record<string, unknown>; output: string }[] = [];
  const onToolCall = (event: { tool: string; input: Record<string, unknown>; output: string }) => {
    toolEvents.push(event);
  };

  try {
    // ── Step 1: Destination Agent (finds 3-5 destinations) ──
    yield {
      event: "status",
      data: { agent: "destination", message: "Finding your dream destinations..." },
    };

    toolEvents = [];
    const destinations = await runDestinationAgent(input, `${sessionId}-dest`, onToolCall);

    // Yield collected tool events
    for (const te of toolEvents) {
      yield {
        event: "tool_call",
        data: { agent: "destination", tool: te.tool, input: te.input, output: te.output },
      };
    }

    yield {
      event: "agent_complete",
      data: {
        agent: "destination",
        data: { count: destinations.length, names: destinations.map((d) => d.name) },
      },
    };

    // ── Step 2: Full pipeline for each destination ──
    const results: DestinationResult[] = [];

    // Process destinations in parallel (batches of 3 to avoid overload)
    const processDestination = async function* (dest: Destination, index: number) {
      const destId = `dest-${index}`;

      yield {
        event: "status" as const,
        data: { agent: destId, message: `Planning ${dest.name}, ${dest.country}...` },
      };

      // Run weather + culture in parallel
      const weatherToolEvents: { tool: string; input: Record<string, unknown>; output: string }[] = [];
      const onWeatherTool = (e: { tool: string; input: Record<string, unknown>; output: string }) => {
        weatherToolEvents.push(e);
      };

      const [weatherItinerary, culture] = await Promise.all([
        runWeatherItineraryAgent(
          {
            destination: dest.name,
            country: dest.country,
            lat: dest.coordinates.lat,
            lon: dest.coordinates.lon,
            currencyCode: dest.currencyCode,
            budget: input.budget,
            season: input.season,
          },
          `${sessionId}-weather-${index}`,
          onWeatherTool
        ),
        runCultureAgent(
          { destination: dest.name, country: dest.country },
          `${sessionId}-culture-${index}`
        ),
      ]);

      // Yield tool events for this destination
      for (const te of weatherToolEvents) {
        yield {
          event: "tool_call" as const,
          data: { agent: destId, tool: te.tool, input: te.input, output: te.output },
        };
      }

      yield {
        event: "status" as const,
        data: { agent: destId, message: `Generating poster for ${dest.name}...` },
      };

      // Image generation (non-fatal)
      let imageData: string | null = null;
      try {
        imageData = await generateTravelPoster(culture.imagePrompt);
      } catch {
        // Image generation is non-fatal
      }

      const result: DestinationResult = {
        destination: dest,
        season: input.season,
        weather: weatherItinerary.weather,
        itinerary: weatherItinerary.itinerary,
        flights: weatherItinerary.flights,
        hotels: weatherItinerary.hotels,
        events: weatherItinerary.events,
        currency: weatherItinerary.currency,
        localPhrase: culture.localPhrase,
        pronunciation: culture.pronunciation,
        meaning: culture.meaning,
        mustTryDishes: culture.mustTryDishes,
        culturalTips: culture.culturalTips,
        imagePrompt: culture.imagePrompt,
        colorPalette: culture.colorPalette,
        imageData,
      };

      yield {
        event: "destination_complete" as const,
        data: { index, destination: result as unknown as Record<string, unknown> },
      };

      return result;
    };

    // Process all destinations — yield events as they come
    // We run them sequentially to stream events properly
    for (let i = 0; i < destinations.length; i++) {
      try {
        const gen = processDestination(destinations[i], i);
        let done = false;
        let result: DestinationResult | undefined;
        while (!done) {
          const next = await gen.next();
          done = next.done ?? false;
          if (!done && next.value) {
            yield next.value as SSEEvent;
          }
          if (done && next.value) {
            result = next.value as DestinationResult;
          }
        }
        if (result) results.push(result);
      } catch (err) {
        yield {
          event: "error",
          data: {
            agent: `dest-${i}`,
            message: `Failed to process ${destinations[i].name}: ${err instanceof Error ? err.message : "unknown"}`,
          },
        };
      }
    }

    yield { event: "done", data: { results: results as unknown as Record<string, unknown>[] } };
  } catch (error) {
    yield {
      event: "error",
      data: {
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
    };
  }
}
