import "server-only";
import { Agent, webSearchTool } from "@openai/agents";
import { geocodeTool, weatherTool, currencyTool } from "./sdk-tools";
import { phase1ResultSchema, destinationSchema } from "./schema";
import { tripInputGuardrail } from "./guardrails";

const fastModel = process.env.OPENAI_TRIP_MODEL_FAST ?? "gpt-5.4-mini";
const researchModel = process.env.OPENAI_TRIP_MODEL ?? "gpt-5.4-mini";

export const destinationSelectorAgent = new Agent({
  name: "Destination Selector",
  instructions: `You are a travel destination selector. Given a user's travel vibe,
preferences, and constraints, select the 3 best matching destinations worldwide.

PROCESS:
1. Consider 3-4 strong candidates matching the vibe
2. Geocode each candidate with geocode_location
3. Weather (CRITICAL): For each fixed (lat, lon), call get_weather_forecast once. Open-Meteo may return only the next 1-2 available days even when more were requested. Treat that as the FINAL answer for that destination. Never call the same coordinates again to try to get more days. If the tool errors or returns an empty forecast, stop and keep weather honest: set a brief summary like "Forecast unavailable right now 🌤️" and leave forecast as [].
4. Validate vibe/weather match (cold/snow vibe → cool temps; beach/warm → warm temps)
5. Produce final structured output with exactly 3 destinations

RULES:
- At least 2 destinations must be in different countries
- Never invent weather values that were not returned by the tool
- If the tool returns fewer days than requested, accept the shorter forecast and do not retry
- For weather: add a short summary with emoji; only include forecast days actually returned by the tool, and each returned day needs icon as a weather emoji
- Use REAL coordinates from geocoding, not guesses`,
  model: fastModel,
  tools: [geocodeTool, weatherTool],
  outputType: phase1ResultSchema,
  inputGuardrails: [tripInputGuardrail],
});

export const destinationResearcherAgent = new Agent({
  name: "Destination Researcher",
  instructions: `You are a deep travel researcher. You receive a destination with coordinates
and weather already validated. Use web search and convert_currency to fill realistic details.

RESEARCH:
1. convert_currency from USD to the local currency (infer code from destination country)
2. Use web search for flights, hotels, transport, activities, food, culture tips
3. All prices in USD strings as in the schema

BUDGET:
- low: ~$600–1,000 total trip style
- medium: ~$1,200–2,000
- high: ~$2,500–4,000

OUTPUT:
- Fill EVERY field in the structured schema including colorPalette (hex colors that match the destination mood)
- Preserve the incoming weather object faithfully. If its forecast is empty, keep it empty and do not invent weather rows.
- itinerary.places: each place MUST include icon (one emoji); never omit it
- imagePrompt: 35–50 words, photorealistic destination-only travel scene focused on scenery, architecture, streets, landscape, and atmosphere. Do not include people, faces, crowds, text, logos, poster design, illustration, or painting.
- imageUrl: null (images are generated separately)
- If state/region is unknown, use null`,
  model: researchModel,
  tools: [webSearchTool({ searchContextSize: "low" }), currencyTool],
  outputType: destinationSchema,
});
