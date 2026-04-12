import "server-only";

export interface HotelResult {
  name: string;
  rating: number;
  pricePerNight: string;
  amenities: string[];
  link: string;
}

export async function searchHotels(params: {
  q: string;
  check_in_date: string;
  check_out_date: string;
  adults?: number;
}): Promise<HotelResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [{ name: "No SERPAPI_KEY configured", rating: 0, pricePerNight: "N/A", amenities: [], link: "" }];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_hotels");
  url.searchParams.set("q", params.q);
  url.searchParams.set("check_in_date", params.check_in_date);
  url.searchParams.set("check_out_date", params.check_out_date);
  url.searchParams.set("adults", (params.adults || 1).toString());
  url.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`Hotels API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const properties = data.properties || [];

    return properties.slice(0, 5).map((h: any) => ({
      name: h.name || "Unknown Hotel",
      rating: h.overall_rating || 0,
      pricePerNight: h.rate_per_night?.lowest || "N/A",
      amenities: h.amenities?.slice(0, 5) || [],
      link: h.link || "",
    }));
  } catch {
    return [];
  }
}
