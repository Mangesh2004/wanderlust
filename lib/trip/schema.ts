import { z } from "zod";

// --- User Input ---
export const tripInputSchema = z.object({
  vibe: z.string().min(1, "Describe your travel vibe"),
  departureCity: z.string().min(1, "Where are you flying from?"),
  travelDates: z.string().describe("Start date YYYY-MM-DD"),
  days: z.number().min(1).max(14),
  budget: z.enum(["low", "medium", "high"]),
  travelWith: z.enum(["solo", "couple", "family", "friends"]),
  interests: z.array(z.string()).min(1),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export const BUDGET_LABELS: Record<string, string> = {
  low: "$0 – $1,000 USD",
  medium: "$1,000 – $2,500 USD",
  high: "$2,500+ USD",
};

// --- AI Output Schema ---
export const destinationSchema = z.object({
  name: z.string(),
  country: z.string(),
  state: z.string().optional(),
  coordinates: z.object({ lat: z.number(), lon: z.number() }),
  tagline: z.string(),
  description: z.string(),
  history: z.string(),

  // Trip params echoed back
  days: z.number(),
  totalBudget: z.string(),

  // Weather
  weather: z.object({
    summary: z.string(),
    forecast: z.array(z.object({
      day: z.string(),
      high: z.number(),
      low: z.number(),
      condition: z.string(),
      icon: z.string(),
    })),
  }),

  // Cost breakdown for entire trip
  costEstimate: z.object({
    localCurrency: z.object({
      code: z.string(),
      symbol: z.string(),
      exchangeRate: z.number(),
    }),
    accommodation: z.object({ total: z.string(), description: z.string() }),
    food: z.object({ total: z.string(), description: z.string() }),
    transport: z.object({ total: z.string(), description: z.string() }),
    activities: z.object({ total: z.string(), description: z.string() }),
    grandTotal: z.string(),
    withinBudget: z.boolean(),
  }),

  // Hotels from search
  hotels: z.array(z.object({
    name: z.string(),
    rating: z.number(),
    pricePerNight: z.string(),
    totalForStay: z.string(),
    location: z.string(),
  })),

  // Flights from search
  flights: z.array(z.object({
    airline: z.string(),
    route: z.string(),
    price: z.string(),
    duration: z.string(),
    date: z.string(),
  })),

  // Local transport
  transport: z.array(z.object({
    type: z.string(),
    cost: z.string(),
    notes: z.string(),
  })),

  // Day-by-day itinerary
  itinerary: z.array(z.object({
    day: z.number(),
    title: z.string(),
    places: z.array(z.object({
      name: z.string(),
      description: z.string(),
      duration: z.string(),
      cost: z.string(),
      icon: z.string(),
    })),
  })),

  // Culture & tips
  culture: z.object({
    localPhrase: z.object({
      phrase: z.string(),
      pronunciation: z.string(),
      meaning: z.string(),
    }),
    mustTryFood: z.array(z.string()),
    tips: z.array(z.string()),
    activities: z.array(z.string()),
  }),

  // Image generation
  imagePrompt: z.string(),
  imageUrl: z.string().nullable(),
});

export type Destination = z.infer<typeof destinationSchema>;

export const tripResultSchema = z.object({
  destinations: z.array(destinationSchema).min(1).max(5),
});

export type TripResult = z.infer<typeof tripResultSchema>;

// --- JSON extraction helper ---
export function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { JSON.parse(arrayMatch[0]); return arrayMatch[0].trim(); } catch { /* try object */ }
  }

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0].trim();

  return text.trim();
}
