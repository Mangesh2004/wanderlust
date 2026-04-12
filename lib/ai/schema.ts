import "server-only";
import { z } from "zod";

// Re-export budget utilities from shared constants (safe for both client/server)
export { BUDGET_RANGES, getBudgetRangeString } from "../constants";

// --- Input Schema ---
export const generateInputSchema = z.object({
  vibe: z.string().min(1, "Vibe is required"),
  travelStyle: z.enum([
    "adventure",
    "relaxation",
    "cultural",
    "romantic",
    "budget",
    "luxury",
  ]),
  season: z.enum(["spring", "summer", "autumn", "winter"]),
  budget: z.enum(["budget", "moderate", "luxury"]),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

// --- Agent 1: Destination Schema ---
export const destinationSchema = z.object({
  name: z.string(),
  country: z.string(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  tagline: z.string().min(5),
  description: z.string().min(20),
  currencyCode: z.string().length(3),
});

export type Destination = z.infer<typeof destinationSchema>;

// --- Multi-destination (3-5 suggestions) ---
export const multiDestinationSchema = z.array(destinationSchema).min(3).max(5);

// --- Agent 2: Weather & Itinerary Schema ---
export const weatherItinerarySchema = z.object({
  weather: z.object({
    current: z.string(),
    forecast: z
      .array(
        z.object({
          day: z.string(),
          high: z.number(),
          low: z.number(),
          condition: z.string(),
        })
      )
      .min(3),
  }),
  itinerary: z.object({
    days: z
      .array(
        z.object({
          day: z.number(),
          title: z.string(),
          activities: z.array(
            z.object({
              time: z.string(),
              activity: z.string(),
              description: z.string(),
              icon: z.string(),
            })
          ),
        })
      )
      .min(3),
  }),
  flights: z
    .array(
      z.object({
        airline: z.string(),
        departure: z.string(),
        arrival: z.string(),
        price: z.string(),
        duration: z.string(),
      })
    )
    .optional(),
  hotels: z
    .array(
      z.object({
        name: z.string(),
        rating: z.number(),
        pricePerNight: z.string(),
        location: z.string(),
      })
    )
    .optional(),
  events: z
    .array(
      z.object({
        name: z.string(),
        date: z.string(),
        venue: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  currency: z.object({
    code: z.string(),
    symbol: z.string(),
    exchangeRate: z.number(),
    budgetEstimate: z.string(),
  }),
});

export type WeatherItinerary = z.infer<typeof weatherItinerarySchema>;

// --- Agent 3: Culture Schema ---
export const cultureSchema = z.object({
  localPhrase: z.string(),
  pronunciation: z.string(),
  meaning: z.string(),
  mustTryDishes: z.array(z.string()).min(3),
  culturalTips: z.array(z.string()).min(3),
  imagePrompt: z.string().min(20),
  colorPalette: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
});

export type Culture = z.infer<typeof cultureSchema>;

// --- Final merged result ---
export const finalResultSchema = z.object({
  destination: destinationSchema,
  season: z.string(),
  weather: weatherItinerarySchema.shape.weather,
  itinerary: weatherItinerarySchema.shape.itinerary,
  flights: weatherItinerarySchema.shape.flights,
  hotels: weatherItinerarySchema.shape.hotels,
  events: weatherItinerarySchema.shape.events,
  currency: weatherItinerarySchema.shape.currency,
  localPhrase: z.string(),
  pronunciation: z.string(),
  meaning: z.string(),
  mustTryDishes: z.array(z.string()),
  culturalTips: z.array(z.string()),
  imagePrompt: z.string(),
  colorPalette: cultureSchema.shape.colorPalette,
  imageData: z.string().nullable(),
});

export type DestinationResult = z.infer<typeof finalResultSchema>;

// --- Helpers ---

/** Extract JSON from Claude's response (handles ```json blocks, raw objects, and arrays) */
export function extractJSON(text: string): string {
  // Try to find ```json ... ``` block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Try to find raw JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      JSON.parse(arrayMatch[0]);
      return arrayMatch[0].trim();
    } catch { /* not valid, try object */ }
  }
  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  return text.trim();
}

/** Validate Claude output against a Zod schema */
export function applyGuardrail<T>(message: string, schema: z.ZodType<T>): T {
  const jsonStr = extractJSON(message);
  const parsed = JSON.parse(jsonStr);
  return schema.parse(parsed);
}
