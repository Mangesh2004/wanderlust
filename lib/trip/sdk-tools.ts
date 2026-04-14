import "server-only";
import { tool } from "@openai/agents";
import { z } from "zod";
import { geocodeLocation } from "../ai/tools/geocoder";
import { getWeatherForecast } from "../ai/tools/weather";
import { convertCurrency } from "../ai/tools/currency";
import { generateTripImage } from "./tools/image-gen";

export const geocodeTool = tool({
  name: "geocode_location",
  description:
    "Geocode a place name to coordinates. Returns { lat, lon, displayName, country }.",
  parameters: z.object({
    query: z.string().describe('Location name, e.g. "Banff, Canada"'),
  }),
  async execute({ query }) {
    return await geocodeLocation(query);
  },
});

export const weatherTool = tool({
  name: "get_weather_forecast",
  description:
    "Get weather forecast for specific dates at coordinates. Returns { forecast: [...] }.",
  parameters: z.object({
    lat: z.number(),
    lon: z.number(),
    days: z.number().describe("Number of days to forecast"),
    start_date: z.string().describe("YYYY-MM-DD trip start date"),
  }),
  async execute({ lat, lon, days, start_date }) {
    return await getWeatherForecast(lat, lon, days, start_date);
  },
});

export const currencyTool = tool({
  name: "convert_currency",
  description:
    "Get exchange rate between currencies. Returns { from, to, rate }.",
  parameters: z.object({
    from: z.string().describe("Source currency code, e.g. USD"),
    to: z.string().describe("Target currency code, e.g. EUR"),
  }),
  async execute({ from, to }) {
    return await convertCurrency({ from, to });
  },
});

export const imageGenTool = tool({
  name: "generate_travel_image",
  description:
    "Generate a photorealistic travel poster image using Gemini (Nano Banana). " +
    "Pass a detailed image prompt (30–40 words). Returns a base64 data URL or an error message.",
  parameters: z.object({
    prompt: z
      .string()
      .describe(
        "Image prompt: cinematic landscape photograph, photorealistic, no illustration.",
      ),
  }),
  timeoutMs: 60_000,
  async execute({ prompt }) {
    const result = await generateTripImage(prompt);
    return result ?? "Image generation failed";
  },
});
