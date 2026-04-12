import "server-only";
import { z } from "zod";
import { getWeatherForecast } from "../tools/weather";
import { searchFlights } from "../tools/flights";
import { searchHotels } from "../tools/hotels";
import { searchEvents } from "../tools/events";
import { convertCurrency } from "../tools/currency";
import { getWeatherItineraryPrompt } from "../prompt";
import {
  applyGuardrail,
  weatherItinerarySchema,
  type WeatherItinerary,
} from "../schema";
import { chatCompleteWithTools, type ToolDef } from "../llm";

export async function runWeatherItineraryAgent(
  input: {
    destination: string;
    country: string;
    lat: number;
    lon: number;
    currencyCode: string;
    budget: string;
    season: string;
  },
  traceId?: string,
  onToolCall?: (event: { tool: string; input: Record<string, unknown>; output: string }) => void
): Promise<WeatherItinerary> {
  const tools: ToolDef[] = [
    {
      name: "get_forecast",
      description: "Get weather forecast for coordinates",
      schema: z.object({
        lat: z.number(),
        lon: z.number(),
        days: z.number().optional().describe("Number of forecast days, default 7"),
      }),
      run: async ({ lat, lon, days }) => {
        const result = await getWeatherForecast(lat, lon, days);
        return JSON.stringify(result);
      },
    },
    {
      name: "search_flights",
      description: "Search for flights to the destination",
      schema: z.object({
        departure_id: z.string().describe("Departure airport IATA code"),
        arrival_id: z.string().describe("Arrival airport IATA code"),
        outbound_date: z.string().describe("YYYY-MM-DD"),
        return_date: z.string().optional(),
        adults: z.number().optional(),
      }),
      run: async (params) => {
        const result = await searchFlights(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "search_hotels",
      description: "Search for hotels at the destination",
      schema: z.object({
        q: z.string().describe("Hotel search query, e.g. 'hotels in Paris'"),
        check_in_date: z.string(),
        check_out_date: z.string(),
        adults: z.number().optional(),
      }),
      run: async (params) => {
        const result = await searchHotels(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "search_events",
      description: "Search for events at the destination",
      schema: z.object({
        q: z.string().describe("Event search query"),
        location: z.string().describe("City/country"),
      }),
      run: async (params) => {
        const result = await searchEvents(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "convert_currency",
      description: "Get exchange rate between two currencies",
      schema: z.object({
        from: z.string().describe("Source currency code, e.g. USD"),
        to: z.string().describe("Target currency code, e.g. EUR"),
      }),
      run: async (params) => {
        const result = await convertCurrency(params);
        return JSON.stringify(result);
      },
    },
  ];

  const systemPrompt = getWeatherItineraryPrompt(
    input.destination,
    input.country,
    input.lat,
    input.lon,
    input.currencyCode,
    input.budget,
    input.season
  );

  const text = await chatCompleteWithTools(
    systemPrompt,
    `Plan a trip to ${input.destination}, ${input.country}. Budget: ${input.budget}, Season: ${input.season}.`,
    tools,
    { agentName: "weather-itinerary-agent", traceId, onToolCall }
  );

  return applyGuardrail(text, weatherItinerarySchema);
}
