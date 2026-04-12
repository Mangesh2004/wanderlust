import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import {
  type TripInput,
  BUDGET_LABELS,
  extractJSON,
  destinationSchema,
  phase1DestinationSchema,
  phase1ResultSchema,
  type Phase1Destination,
  type TripResult,
  type Destination,
} from "./schema";
import { geocodeLocation } from "../ai/tools/geocoder";
import { getWeatherForecast } from "../ai/tools/weather";
import { convertCurrency } from "../ai/tools/currency";
import {
  searchHotels,
  searchFlights,
  searchTransport,
  searchActivities,
  searchGeneral,
} from "./tools/tavily-search";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TripEvent {
  type: "status" | "tool_call" | "tool_result" | "thinking" | "result" | "error";
  data: Record<string, unknown>;
}

// --- Tool definitions ---

const phase1Tools: Tool[] = [
  {
    name: "geocode_location",
    description:
      "Geocode a place name → returns { lat, lon, displayName, country }. Use this FIRST for every destination to get real coordinates.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Location name, e.g. 'Banff, Canada' or 'Grindelwald, Switzerland'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_weather_forecast",
    description:
      "Get weather forecast for specific dates at coordinates. Returns array of { day, high, low, condition } for each day. Pass the trip start_date so it fetches weather for the ACTUAL travel dates, not today.",
    input_schema: {
      type: "object" as const,
      properties: {
        lat: { type: "number" },
        lon: { type: "number" },
        days: { type: "number", description: "Number of days to forecast" },
        start_date: {
          type: "string",
          description:
            "YYYY-MM-DD — the trip start date. REQUIRED to get forecast for correct dates.",
        },
      },
      required: ["lat", "lon", "days", "start_date"],
    },
  },
  {
    name: "submit_destinations",
    description:
      "Submit the final selected destinations after all research (geocoding + weather) is complete. Call this tool ONCE with all selected destinations.",
    input_schema: {
      type: "object" as const,
      properties: {
        selectedDestinations: {
          type: "array",
          description:
            "The best 3 destinations matching the vibe and weather criteria",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              country: { type: "string" },
              state: {
                type: "string",
                description: "State/province or empty string",
              },
              coordinates: {
                type: "object",
                properties: {
                  lat: { type: "number" },
                  lon: { type: "number" },
                },
                required: ["lat", "lon"],
              },
              weather: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Weather summary with emoji",
                  },
                  forecast: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string", description: "YYYY-MM-DD" },
                        high: { type: "number" },
                        low: { type: "number" },
                        condition: { type: "string" },
                        icon: { type: "string", description: "Weather emoji" },
                      },
                      required: ["day", "high", "low", "condition", "icon"],
                    },
                  },
                },
                required: ["summary", "forecast"],
              },
            },
            required: ["name", "country", "state", "coordinates", "weather"],
          },
        },
      },
      required: ["selectedDestinations"],
    },
  },
];

const phase2Tools: Tool[] = [
  {
    name: "convert_currency",
    description:
      "Get exchange rate from one currency to another. Returns { from, to, rate }. Use the rate to convert local prices to USD in your output.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Source currency code, e.g. USD",
        },
        to: {
          type: "string",
          description: "Target currency code, e.g. CAD, CHF, JPY, INR",
        },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "search_hotels",
    description:
      "Web search for hotels with prices. Returns Tavily answer + source snippets. You must extract hotel names, ratings, and prices from the results and convert to USD.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "City/area name" },
        checkIn: { type: "string", description: "YYYY-MM-DD" },
        checkOut: { type: "string", description: "YYYY-MM-DD" },
        budget: {
          type: "string",
          description: "budget level: 'budget', 'mid-range', or 'luxury'",
        },
      },
      required: ["destination", "checkIn", "checkOut", "budget"],
    },
  },
  {
    name: "search_flights",
    description:
      "Web search for flights with prices. Returns Tavily answer + source snippets. Extract airline names, prices, and durations. Convert all prices to USD.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Departure city name (NOT airport code)",
        },
        to: {
          type: "string",
          description: "Destination city or nearest major airport city",
        },
        date: { type: "string", description: "YYYY-MM-DD departure date" },
        returnDate: {
          type: "string",
          description: "YYYY-MM-DD return date (optional)",
        },
      },
      required: ["from", "to", "date"],
    },
  },
  {
    name: "search_transport",
    description:
      "Web search for local transport options and costs. Returns bus/taxi/train/metro info with typical prices. Convert costs to USD.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "City name" },
      },
      required: ["destination"],
    },
  },
  {
    name: "search_activities",
    description:
      "Web search for activities, tours, and things to do. Returns options with prices. Filter by user interests.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "City name" },
        interests: {
          type: "string",
          description:
            "Comma-separated interests like 'hiking, food, culture'",
        },
        budget: {
          type: "string",
          description: "budget level: 'budget', 'mid-range', or 'luxury'",
        },
      },
      required: ["destination", "interests", "budget"],
    },
  },
  {
    name: "search_general",
    description:
      "General web search for anything not covered by other tools. Use for food costs, cultural tips, or specific questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "submit_destination_details",
    description:
      "Submit the fully researched destination details. Call this ONCE after using all research tools to compile the final destination data.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        country: { type: "string" },
        state: { type: "string" },
        coordinates: {
          type: "object",
          properties: { lat: { type: "number" }, lon: { type: "number" } },
          required: ["lat", "lon"],
        },
        tagline: { type: "string" },
        description: { type: "string" },
        history: { type: "string" },
        days: { type: "number" },
        totalBudget: { type: "string" },
        weather: {
          type: "object",
          description: "Weather data with summary and forecast",
        },
        costEstimate: {
          type: "object",
          description:
            "Cost breakdown: localCurrency, accommodation, food, transport, activities, grandTotal, withinBudget",
        },
        hotels: { type: "array", description: "Hotel options array" },
        flights: { type: "array", description: "Flight options array" },
        transport: {
          type: "array",
          description: "Local transport options array",
        },
        itinerary: { type: "array", description: "Day-by-day itinerary" },
        culture: {
          type: "object",
          description:
            "Culture info: localPhrase, mustTryFood, tips, activities",
        },
        imagePrompt: { type: "string" },
        imageUrl: { type: ["string", "null"] },
      },
      required: [
        "name",
        "country",
        "coordinates",
        "tagline",
        "description",
        "history",
        "days",
        "totalBudget",
        "weather",
        "costEstimate",
        "hotels",
        "flights",
        "transport",
        "itinerary",
        "culture",
        "imagePrompt",
        "imageUrl",
      ],
    },
  },
];

// --- Tool executor ---

async function executeTool(
  name: string,
  input: Record<string, any>,
): Promise<string> {
  switch (name) {
    case "geocode_location":
      return JSON.stringify(await geocodeLocation(input.query));
    case "get_weather_forecast":
      return JSON.stringify(
        await getWeatherForecast(
          input.lat,
          input.lon,
          input.days || 7,
          input.start_date,
        ),
      );
    case "convert_currency":
      return JSON.stringify(
        await convertCurrency({ from: input.from, to: input.to }),
      );
    case "search_hotels":
      return await searchHotels(input as any);
    case "search_flights":
      return await searchFlights(input as any);
    case "search_transport":
      return await searchTransport(input as any);
    case "search_activities":
      return await searchActivities(input as any);
    case "search_general":
      return await searchGeneral(input as any);
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

// --- Prompts ---

function buildPhase1Prompt(input: TripInput): string {
  const today = new Date().toISOString().split("T")[0];
  const budgetLabel = BUDGET_LABELS[input.budget];
  const endDate = new Date(input.travelDates);
  endDate.setDate(endDate.getDate() + input.days);
  const returnDate = endDate.toISOString().split("T")[0];

  return `You are a travel research agent (Phase 1: Destination Selection). Today is ${today}.

## USER REQUEST
Vibe: "${input.vibe}"
Departure city: ${input.departureCity}
Travel dates: ${input.travelDates} to ${returnDate} (${input.days} days)
Total trip budget: ${budgetLabel}
Traveling with: ${input.travelWith}
Interests: ${input.interests.join(", ")}

## YOUR TASK — SELECT 3 DESTINATIONS

1. Pick 5 candidate destinations that MIGHT match the vibe.
   - DIVERSITY RULE: At least 2 must be in DIFFERENT countries. Max 2 from same country.
   - Think globally: mix continents, cultures, price ranges.
2. Geocode ALL 5 candidates.
3. Get weather forecast for ALL 5 (pass start_date="${input.travelDates}", days=${input.days}).
4. VALIDATE each candidate against the vibe:
   - If vibe mentions "cold/snow/winter/cozy" → reject any destination with HIGH temp > 25°C
   - If vibe mentions "beach/warm/tropical/sun" → reject any destination with HIGH temp < 20°C
   - If vibe mentions "mountains" → verify coordinates show mountainous region
   - WEATHER SANITY CHECK: If temp > 15°C, the condition CANNOT be "snow." Override to "Rain" in your output.
5. Keep the BEST 3 that match the vibe + weather. If fewer than 3 survive, pick replacement(s) and repeat geocode+weather.

## WEATHER RULES
- Copy EXACT data from tool output: days, high, low, condition
- SANITY CHECK: Snow requires temp ≤ 2°C. If tool says "snow" at 15°C+, change to "Rain showers" in output.
- Summary must be HONEST: 35°C+ = "Scorching 🔥", 25-35°C = "Hot ☀️", 15-25°C = "Warm/Pleasant 🌤️", 5-15°C = "Cool ❄️", <5°C = "Freezing 🥶"

## FEW-SHOT EXAMPLE

User vibe: "I want cold mountains, snow, cozy cafes"
Departure: Delhi | Budget: medium | 3 days | Solo | Interests: hiking, food

Thinking:
- Candidate 1: Manali, India → geocode → weather: 5°C/−2°C, snow ✓ KEEP
- Candidate 2: Nainital, India → geocode → weather: 36°C/12°C ✗ TOO HOT, REJECT
- Candidate 3: Interlaken, Switzerland → geocode → weather: 8°C/2°C, clear ✓ KEEP
- Candidate 4: Nagano, Japan → geocode → weather: 12°C/3°C, clear ✓ KEEP
- Candidate 5: Goa, India → geocode → weather: 34°C ✗ BEACH NOT MOUNTAIN, REJECT

Final 3: Manali, Interlaken, Nagano

## OUTPUT FORMAT
After selecting the best 3, call the **submit_destinations** tool with your final selection. Do NOT return raw JSON as text — always use the tool.`;
}

function buildPhase2Prompt(input: TripInput, dest: Phase1Destination): string {
  const today = new Date().toISOString().split("T")[0];
  const budgetLabel = BUDGET_LABELS[input.budget];
  const endDate = new Date(input.travelDates);
  endDate.setDate(endDate.getDate() + input.days);
  const returnDate = endDate.toISOString().split("T")[0];

  return `You are a travel research agent (Phase 2: Deep Research). Today is ${today}.

## DESTINATION (already selected and validated)
Name: ${dest.name}
Country: ${dest.country}
${dest.state ? `State: ${dest.state}` : ""}
Coordinates: ${dest.coordinates.lat}, ${dest.coordinates.lon}
Weather (already collected):
${JSON.stringify(dest.weather, null, 2)}

## USER REQUEST
Vibe: "${input.vibe}"
Departure city: ${input.departureCity}
Travel dates: ${input.travelDates} to ${returnDate} (${input.days} days)
Total trip budget: ${budgetLabel}
Traveling with: ${input.travelWith}
Interests: ${input.interests.join(", ")}

## YOUR TASK — DEEP RESEARCH FOR ${dest.name.toUpperCase()}

Research this destination using the available tools:

1. **convert_currency** → from="USD", to=local currency code
2. **search_flights** → from="${input.departureCity}", to="${dest.name}", date="${input.travelDates}", returnDate="${returnDate}"
   - Extract: airline names, prices (USD), duration
3. **search_hotels** → "${dest.name}", checkIn="${input.travelDates}", checkOut="${returnDate}", budget="${input.budget}"
   - Include MIX: one budget, one mid-range, one premium option
   - Calculate totalForStay = pricePerNight × ${input.days}
4. **search_transport** → "${dest.name}"
   - Extract: types, costs (USD), notes
5. **search_activities** → "${dest.name}", interests="${input.interests.join(", ")}", budget="${input.budget}"
   - Match user interests, include prices
6. **search_general** → for any additional info (food costs, cultural tips, local phrases)

Use ALL tools to gather real data. Then compile the final JSON.

## COST ESTIMATE RULES
- Budget target: low = aim for $600-900 total, medium = aim for $1,200-2,000 total, high = aim for $2,500-4,000 total
- Do NOT pick cheapest everything for medium/high budgets. Match the tier:
  - LOW: budget hostels, street food, public transport, free activities
  - MEDIUM: mid-range hotels ($40-100/night), nice restaurants ($15-30/meal), mix of paid activities
  - HIGH: premium hotels ($100-250/night), fine dining, private tours, premium experiences
- accommodation.total = hotel price/night × ${input.days} nights
- food.total = daily food estimate × ${input.days} days
- transport.total = flights + airport transfers + local transport for ${input.days} days
- activities.total = sum of included activities
- grandTotal = sum of all components. VERIFY THE MATH ADDS UP.
- withinBudget = grandTotal ≤ budget ceiling (low=$1000, medium=$2500, high=unlimited)

## ITINERARY RULES
- ${input.days} days exactly
- Each place: real name, specific description, duration in MINUTES, cost in USD
- First day includes arrival/transit, last day allows departure
- Match user interests: ${input.interests.join(", ")}

## LOCAL PHRASE RULE
- REAL phrase in the local language (not English, not a joke)
- Include native script + romanized pronunciation + English meaning

## IMAGE PROMPT RULE
- 30-40 words max. Format: "Cinematic landscape photograph of [place]: [key natural feature or landmark], [time of day], [weather/atmosphere], [camera angle like wide-angle or aerial], photorealistic, National Geographic style"
- NEVER mention poster, illustration, art deco, cartoon, or vintage. The image must look like a real photograph.

## OUTPUT FORMAT
After completing all research, call the **submit_destination_details** tool with the data below as the tool input. Do NOT return raw JSON as text — always use the tool.
The tool input must match this structure:
{
  "name": "${dest.name}",
  "country": "${dest.country}",
  "state": "${dest.state || ""}",
  "coordinates": { "lat": ${dest.coordinates.lat}, "lon": ${dest.coordinates.lon} },
  "tagline": "string",
  "description": "string (2-3 sentences)",
  "history": "string (1-2 sentences)",
  "days": ${input.days},
  "totalBudget": "${budgetLabel}",
  "weather": ${JSON.stringify(dest.weather)},
  "costEstimate": {
    "localCurrency": { "code": "string", "symbol": "string", "exchangeRate": number },
    "accommodation": { "total": "string", "description": "string" },
    "food": { "total": "string", "description": "string" },
    "transport": { "total": "string", "description": "string" },
    "activities": { "total": "string", "description": "string" },
    "grandTotal": "string",
    "withinBudget": boolean
  },
  "hotels": [{ "name": "string", "rating": number, "pricePerNight": "string", "totalForStay": "string", "location": "string" }],
  "flights": [{ "airline": "string", "route": "string", "price": "string", "duration": "string", "date": "string" }],
  "transport": [{ "type": "string", "cost": "string", "notes": "string" }],
  "itinerary": [{ "day": number, "title": "string", "places": [{ "name": "string", "description": "string", "duration": "string", "cost": "string", "icon": "string" }] }],
  "culture": {
    "localPhrase": { "phrase": "string", "pronunciation": "string", "meaning": "string" },
    "mustTryFood": ["string"],
    "tips": ["string"],
    "activities": ["string"]
  },
  "imagePrompt": "string (30-40 words)",
  "imageUrl": null
}`;
}

// --- Agent loops ---

async function* runPhase1(
  input: TripInput,
  resultRef: { value: Phase1Destination[] },
): AsyncGenerator<TripEvent> {
  const systemPrompt = buildPhase1Prompt(input);
  const messages: MessageParam[] = [
    {
      role: "user",
      content:
        "Select the best 3 destinations. Geocode and check weather for all candidates. Submit the final selection using the submit_destinations tool.",
    },
  ];

  let iteration = 0;
  let lastTools: string[] = [];

  for (let i = 0; i < 15; i++) {
    iteration++;
    const statusMessage = getPhase1Status(lastTools, iteration);
    yield { type: "status", data: { message: statusMessage, iteration } };

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      tools: phase1Tools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use",
    );

    // Check for submit tool — structured output path
    const submitBlock = toolUseBlocks.find(
      (tc) => tc.name === "submit_destinations",
    );
    if (submitBlock) {
      yield {
        type: "status",
        data: { message: "Selecting best destinations..." },
      };
      try {
        const result = phase1ResultSchema.parse(submitBlock.input);
        resultRef.value = result.selectedDestinations;
      } catch (err) {
        yield {
          type: "error",
          data: {
            message: `Phase 1 validation failed: ${err instanceof Error ? err.message : "unknown"}`,
          },
        };
      }
      return;
    }

    // Text fallback — if model returns end_turn instead of using submit tool
    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      yield {
        type: "status",
        data: { message: "Selecting best destinations..." },
      };
      const textBlock = response.content.find(
        (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text",
      );
      const raw = textBlock?.text || "";
      console.log("[phase1] raw response (text fallback):", raw.slice(0, 2000));

      if (raw.trim()) {
        try {
          const jsonStr = extractJSON(raw);
          const parsed = JSON.parse(jsonStr);
          // Accept multiple possible shapes, validate each with Zod
          const dests =
            parsed.selectedDestinations ||
            parsed.selected_destinations ||
            parsed.destinations ||
            (Array.isArray(parsed) ? parsed : null);
          if (Array.isArray(dests) && dests.length > 0) {
            resultRef.value = z
              .array(phase1DestinationSchema)
              .parse(dests);
          } else {
            yield {
              type: "error",
              data: {
                message: `Phase 1: No destinations array found in response`,
              },
            };
          }
        } catch (err) {
          yield {
            type: "error",
            data: {
              message: `Phase 1 parse failed: ${err instanceof Error ? err.message : "unknown"}. Raw: ${raw.slice(0, 200)}`,
            },
          };
        }
      } else {
        yield {
          type: "error",
          data: { message: "Phase 1: Model returned empty response" },
        };
      }
      return;
    }

    // Has tool calls — execute research tools
    for (const tc of toolUseBlocks) {
      yield {
        type: "tool_call",
        data: { tool: tc.name, input: tc.input },
      };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];
    const currentTools: string[] = [];
    for (const tc of toolUseBlocks) {
      const args = tc.input as Record<string, any>;
      const output = await executeTool(tc.name, args);
      yield {
        type: "tool_result",
        data: { tool: tc.name, input: args, output },
      };
      toolResults.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: output,
      });
      currentTools.push(tc.name);
    }

    messages.push({ role: "user", content: toolResults });
    lastTools = currentTools;
  }

  yield { type: "error", data: { message: "Phase 1: Max iterations reached" } };
}

async function* runPhase2(
  input: TripInput,
  dest: Phase1Destination,
  index: number,
  resultRef: { value: Destination | null },
): AsyncGenerator<TripEvent> {
  const systemPrompt = buildPhase2Prompt(input, dest);
  const messages: MessageParam[] = [
    {
      role: "user",
      content: `Research ${dest.name}, ${dest.country} thoroughly. Use all tools to gather real data, then submit the results using the submit_destination_details tool.`,
    },
  ];

  let iteration = 0;
  let lastTools: string[] = [];

  for (let i = 0; i < 15; i++) {
    iteration++;
    const statusMessage = `${dest.name}: ${getPhase2Status(lastTools, iteration)}`;
    yield {
      type: "status",
      data: { message: statusMessage, iteration, destinationIndex: index },
    };

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 16384,
      system: systemPrompt,
      tools: phase2Tools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use",
    );

    // Check for submit tool — structured output path
    const submitBlock = toolUseBlocks.find(
      (tc) => tc.name === "submit_destination_details",
    );
    if (submitBlock) {
      yield {
        type: "status",
        data: { message: `${dest.name}: Compiling trip details...` },
      };
      try {
        resultRef.value = destinationSchema.parse(submitBlock.input);
      } catch (err) {
        yield {
          type: "error",
          data: {
            message: `${dest.name}: Schema validation failed: ${err instanceof Error ? err.message : "unknown"}`,
          },
        };
      }
      return;
    }

    // Text fallback — if model returns end_turn instead of using submit tool
    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      yield {
        type: "status",
        data: { message: `${dest.name}: Compiling trip details...` },
      };
      const textBlock = response.content.find(
        (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text",
      );
      const raw = textBlock?.text || "";

      if (raw.trim()) {
        try {
          const jsonStr = extractJSON(raw);
          const parsed = JSON.parse(jsonStr);
          const destObj = parsed.destinations ? parsed.destinations[0] : parsed;
          resultRef.value = destinationSchema.parse(destObj);
        } catch (err) {
          yield {
            type: "error",
            data: {
              message: `${dest.name}: Schema validation failed: ${err instanceof Error ? err.message : "unknown"}`,
            },
          };
        }
      }
      return;
    }

    // Has tool calls — execute research tools
    for (const tc of toolUseBlocks) {
      yield {
        type: "tool_call",
        data: { tool: tc.name, input: tc.input },
      };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];
    const currentTools: string[] = [];
    for (const tc of toolUseBlocks) {
      const args = tc.input as Record<string, any>;
      const output = await executeTool(tc.name, args);
      yield {
        type: "tool_result",
        data: { tool: tc.name, input: args, output },
      };
      toolResults.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: output,
      });
      currentTools.push(tc.name);
    }

    messages.push({ role: "user", content: toolResults });
    lastTools = currentTools;
  }

  yield {
    type: "error",
    data: { message: `${dest.name}: Max iterations reached` },
  };
}

// --- Orchestrator ---

export async function* runTripAgentStream(
  input: TripInput,
): AsyncGenerator<TripEvent> {
  yield { type: "status", data: { message: "Starting trip research agent..." } };

  // --- Phase 1: Select destinations ---
  const phase1Result = { value: [] as Phase1Destination[] };
  for await (const event of runPhase1(input, phase1Result)) {
    yield event;
  }

  const selectedDests = phase1Result.value;
  if (selectedDests.length === 0) {
    yield {
      type: "error",
      data: { message: "Failed to select destinations" },
    };
    return;
  }

  const names = selectedDests.map((d) => d.name).join(", ");
  yield {
    type: "status",
    data: {
      message: `Selected ${selectedDests.length} destinations: ${names}. Researching in parallel...`,
    },
  };

  // --- Phase 2: Research all destinations in parallel ---
  const destinations: (Destination | null)[] = new Array(
    selectedDests.length,
  ).fill(null);
  const eventBuffer: TripEvent[] = [];
  let notifyResolve: (() => void) | null = null;
  let settled = false;

  const notify = () => {
    if (notifyResolve) {
      const r = notifyResolve;
      notifyResolve = null;
      r();
    }
  };

  const waitForEvent = () =>
    new Promise<void>((resolve) => {
      if (eventBuffer.length > 0 || settled) {
        resolve();
        return;
      }
      notifyResolve = resolve;
    });

  // Start all Phase 2 agents concurrently
  const promises = selectedDests.map(async (dest, i) => {
    try {
      const ref = { value: null as Destination | null };
      for await (const event of runPhase2(input, dest, i, ref)) {
        eventBuffer.push(event);
        notify();
      }
      destinations[i] = ref.value;
    } catch (err) {
      eventBuffer.push({
        type: "error",
        data: {
          message: `${dest.name}: Unexpected error — ${err instanceof Error ? err.message : "unknown"}`,
        },
      });
      notify();
    }
  });

  Promise.all(promises)
    .then(() => {
      settled = true;
      notify();
    })
    .catch(() => {
      settled = true;
      notify();
    });

  // Drain the event buffer as events arrive from parallel agents
  while (!settled || eventBuffer.length > 0) {
    while (eventBuffer.length > 0) {
      yield eventBuffer.shift()!;
    }
    if (!settled) {
      await waitForEvent();
    }
  }

  // --- Compile final result ---
  const validDestinations = destinations.filter(
    (d): d is Destination => d !== null,
  );

  if (validDestinations.length === 0) {
    yield {
      type: "error",
      data: { message: "All destination research failed" },
    };
    return;
  }

  const result: TripResult = { destinations: validDestinations };
  yield {
    type: "result",
    data: {
      success: true,
      result: result as unknown as Record<string, unknown>,
      raw: JSON.stringify(result),
    },
  };
}

// --- Status message helpers ---

function getPhase1Status(lastTools: string[], iteration: number): string {
  if (iteration === 1 || lastTools.length === 0)
    return "Starting destination search...";
  const has = (substr: string) => lastTools.some((t) => t.includes(substr));
  if (has("geocode")) return "Pinpointing locations on the map...";
  if (has("weather")) return "Checking weather conditions...";
  return "Evaluating candidates...";
}

function getPhase2Status(lastTools: string[], iteration: number): string {
  if (iteration === 1 || lastTools.length === 0) return "Starting research...";
  const has = (substr: string) => lastTools.some((t) => t.includes(substr));
  if (has("flight")) return "Searching for flights...";
  if (has("hotel")) return "Finding the best hotels...";
  if (has("transport")) return "Exploring local transport...";
  if (has("activities")) return "Discovering activities & experiences...";
  if (has("general")) return "Gathering local insights...";
  if (has("currency")) return "Converting currency rates...";
  return "Analyzing results...";
}
