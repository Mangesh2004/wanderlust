import "server-only";
import { Agent, webSearchTool } from "@openai/agents";
import { z } from "zod";
import {
  geocodeTool,
  weatherTool,
  currencyTool,
  imageGenTool,
} from "./sdk-tools";
import { phase1ResultSchema, destinationSchema } from "./schema";
import { tripInputGuardrail } from "./guardrails";

const fastModel = process.env.OPENAI_TRIP_MODEL_FAST ?? "gpt-4o-mini";
const researchModel = process.env.OPENAI_TRIP_MODEL ?? "gpt-4o";

export const destinationSelectorAgent = new Agent({
  name: "Destination Selector",
  instructions: `You are a travel destination selector. Given a user's travel vibe,
preferences, and constraints, select the 3 best matching destinations worldwide.

PROCESS:
1. Consider 5+ candidates matching the vibe
2. Geocode each candidate with geocode_location
3. Get weather with get_weather_forecast (pass start_date and days from the user message)
4. Validate vibe/weather match (cold/snow vibe → cool temps; beach/warm → warm temps)
5. Produce final structured output with exactly 3 destinations

RULES:
- At least 2 destinations must be in different countries
- For weather: add a short summary with emoji; each forecast day needs icon as a weather emoji
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
- imagePrompt: 30–40 words, photorealistic, no poster/illustration wording
- imageUrl: null (images are generated separately)`,
  model: researchModel,
  tools: [webSearchTool({ searchContextSize: "medium" }), currencyTool],
  outputType: destinationSchema,
});

export const imageGenOutputSchema = z.object({
  imageDataUrl: z.string().nullable().describe("Base64 data URL from the tool, or null"),
});

export const imageGeneratorAgent = new Agent({
  name: "Image Generator",
  instructions: `You create travel poster images. You MUST call generate_travel_image once
with the prompt given in the user message (after any light edits for clarity).

Then respond with structured output: imageDataUrl must be the exact string returned by the tool
(if it starts with data: it is valid). If the tool returns an error message, set imageDataUrl to null.`,
  model: fastModel,
  tools: [imageGenTool],
  outputType: imageGenOutputSchema,
});
