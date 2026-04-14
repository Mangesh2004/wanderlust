import "server-only";
import { tool } from "@openai/agents";
import { z } from "zod";
import { geocodeLocation } from "../ai/tools/geocoder";
import { getWeatherForecast, type WeatherResult } from "../ai/tools/weather";
import { convertCurrency } from "../ai/tools/currency";

/** Per agent `run()`: keep weather deterministic by replaying the first result for a location. */
const weatherResultsByLocation = new Map<string, WeatherResult>();
const weatherResultsByRequest = new Map<string, WeatherResult>();

export function resetWeatherToolCallBudget(): void {
  weatherResultsByLocation.clear();
  weatherResultsByRequest.clear();
}

function weatherKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function weatherRequestKey(
  lat: number,
  lon: number,
  days: number,
  startDate: string,
): string {
  return `${weatherKey(lat, lon)}|${Math.ceil(days)}|${startDate}`;
}

function cloneWeatherResult(result: WeatherResult, cached: boolean): WeatherResult {
  return {
    ...result,
    cached,
    forecast: result.forecast.map((day) => ({ ...day })),
  };
}

export async function executeWeatherForecast(
  lat: number,
  lon: number,
  days: number,
  startDate: string,
): Promise<WeatherResult> {
  const requestKey = weatherRequestKey(lat, lon, days, startDate);
  const cachedRequest = weatherResultsByRequest.get(requestKey);
  if (cachedRequest) {
    return cloneWeatherResult(cachedRequest, true);
  }

  const locationKey = weatherKey(lat, lon);
  const cachedLocation = weatherResultsByLocation.get(locationKey);
  if (cachedLocation) {
    const replay = cloneWeatherResult(cachedLocation, true);
    weatherResultsByRequest.set(requestKey, replay);
    return replay;
  }

  const result = await getWeatherForecast(lat, lon, days, startDate);
  const canonical = cloneWeatherResult(result, false);
  weatherResultsByLocation.set(locationKey, canonical);
  weatherResultsByRequest.set(requestKey, canonical);
  return cloneWeatherResult(canonical, false);
}

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
    "Get weather from **Open-Meteo** daily forecast data. Returns { forecast, requestedDays, returnedDays, isPartial, final }. " +
    "Open-Meteo may return only the next 1-2 available days near the forecast boundary; treat that as the final answer and do not retry for the same destination.",
  parameters: z.object({
    lat: z.number(),
    lon: z.number(),
    days: z.number().describe("Number of days to forecast"),
    start_date: z.string().describe("YYYY-MM-DD trip start date"),
  }),
  async execute({ lat, lon, days, start_date }) {
    return await executeWeatherForecast(lat, lon, days, start_date);
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
