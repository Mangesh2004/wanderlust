import "server-only";
import { getBudgetRangeString } from "./schema";

export function getDestinationAgentPrompt(budgetRange: string) {
  return `You are a travel destination expert. Given a user's travel vibe, style, season, and budget:
1. Choose 3 to 5 DIVERSE destinations that match. Be specific and surprising — avoid obvious picks like Paris, London, Tokyo, New York unless they truly fit.
2. For EACH destination, use the geocode_location tool to verify it exists and get coordinates.
3. Return ONLY a valid JSON ARRAY of objects matching this schema:
[
  {
    "name": "string (specific place name, e.g. 'Hallstatt' not just 'Austria')",
    "country": "string",
    "coordinates": {"lat": number, "lon": number},
    "tagline": "string (evocative one-liner, min 5 chars)",
    "description": "string (2-3 vivid sentences about why this place matches the vibe, min 20 chars)",
    "currencyCode": "string (3 chars, e.g. 'EUR')"
  }
]

Budget: ${budgetRange}. Pick destinations that realistically match this budget range.
Each destination should offer a DIFFERENT experience — vary by region, culture, and landscape.
No markdown, no explanation, ONLY the JSON array.`;
}

export function getWeatherItineraryPrompt(
  destination: string,
  country: string,
  lat: number,
  lon: number,
  currencyCode: string,
  budget: string,
  season: string
) {
  const budgetRange = getBudgetRangeString(budget);
  const today = new Date().toISOString().split("T")[0];
  const tripStart = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const tripEnd = new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];
  return `You are a travel planner for ${destination}, ${country}.
Today's date is ${today}. Plan the trip for ${tripStart} to ${tripEnd}.

1. Use the get_forecast tool to get real weather data for coordinates ${lat}, ${lon}
2. Use search_hotels to find real hotels (check_in: ${tripStart}, check_out: ${tripEnd})
3. Use search_flights to find real flights (outbound_date: ${tripStart}, return_date: ${tripEnd}). You must guess reasonable IATA airport codes for departure (use "JFK" as default) and arrival.
4. Use search_events to find local events happening around ${tripStart}
5. Use the convert_currency tool to get exchange rate from USD to ${currencyCode}
6. Create a 3-day itinerary with real weather considered
7. Budget: ${budgetRange}. Convert this to ${currencyCode} using the exchange rate.
8. Season: ${season}
9. Activities should be SPECIFIC to ${destination} — mention actual place names, local restaurants, markets, viewpoints. NOT generic like "visit museum" or "explore old town".
10. Return ONLY valid JSON matching this schema:
{
  "weather": { "current": "string (brief current conditions)", "forecast": [{ "day": "YYYY-MM-DD", "high": number, "low": number, "condition": "string" }] (min 3 days) },
  "itinerary": { "days": [{ "day": number, "title": "string (catchy day title)", "activities": [{ "time": "string (e.g. '09:00')", "activity": "string (specific place/activity name)", "description": "string (what to do there, why it's special)", "icon": "string (single emoji)" }] }] (min 3 days) },
  "flights": [{ "airline": "string", "departure": "string", "arrival": "string", "price": "string", "duration": "string" }] (optional),
  "hotels": [{ "name": "string", "rating": number, "pricePerNight": "string", "location": "string" }] (optional),
  "events": [{ "name": "string", "date": "string", "venue": "string", "description": "string" }] (optional),
  "currency": { "code": "${currencyCode}", "symbol": "string", "exchangeRate": number (from USD), "budgetEstimate": "string (e.g. '${budgetRange} (~€45-73/day)')" }
}
No markdown, no explanation, ONLY the JSON object.`;
}

export function getCulturePrompt(destination: string, country: string) {
  return `You are a cultural expert for ${destination}, ${country}.
Return ONLY valid JSON:
{
  "localPhrase": "string (a useful greeting or phrase visitors should know)",
  "pronunciation": "string (phonetic pronunciation)",
  "meaning": "string (English translation)",
  "mustTryDishes": ["string"] (min 3 specific local dishes with brief description, e.g. "Wiener Schnitzel — crispy breaded veal cutlet"),
  "culturalTips": ["string"] (min 3 practical tips for visitors, be specific to ${destination}),
  "imagePrompt": "string (detailed prompt for a vintage-style travel poster of ${destination}. Include: specific landmarks or iconic views, dominant colors from the landscape/architecture, artistic style like Art Deco or mid-century modern, time of day, mood. The poster should be instantly recognizable as ${destination}. 50+ words)",
  "colorPalette": {
    "primary": "#RRGGBB (the dominant color you'd see in ${destination} — landscape, sea, buildings, etc.)",
    "secondary": "#RRGGBB (a complementary color from the local architecture or nature)",
    "accent": "#RRGGBB (a vibrant accent — think local flowers, textiles, signage)",
    "background": "#RRGGBB (light, suitable as card background)",
    "text": "#RRGGBB (dark, readable on the background color)"
  }
}
No markdown, no explanation, ONLY the JSON object.`;
}
