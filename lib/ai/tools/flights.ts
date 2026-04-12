import "server-only";

export interface FlightResult {
  airline: string;
  departure: string;
  arrival: string;
  price: string;
  duration: string;
  stops: number;
}

export async function searchFlights(params: {
  departure_id: string;
  arrival_id: string;
  outbound_date: string;
  return_date?: string;
  adults?: number;
}): Promise<FlightResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [{ airline: "No SERPAPI_KEY configured", departure: "N/A", arrival: "N/A", price: "N/A", duration: "N/A", stops: 0 }];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("departure_id", params.departure_id);
  url.searchParams.set("arrival_id", params.arrival_id);
  url.searchParams.set("outbound_date", params.outbound_date);
  if (params.return_date) url.searchParams.set("return_date", params.return_date);
  url.searchParams.set("adults", (params.adults || 1).toString());
  url.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`Flights API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const flights = data.best_flights || data.other_flights || [];

    return flights.slice(0, 5).map((f: any) => {
      const leg = f.flights?.[0] || {};
      return {
        airline: leg.airline || "Unknown",
        departure: leg.departure_airport?.name || params.departure_id,
        arrival: leg.arrival_airport?.name || params.arrival_id,
        price: f.price ? `$${f.price}` : "N/A",
        duration: `${f.total_duration || 0} min`,
        stops: (f.flights?.length || 1) - 1,
      };
    });
  } catch {
    return [];
  }
}
