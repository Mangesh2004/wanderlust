import "server-only";

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  country: string;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "DreamDestinationGenerator/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.length) {
    throw new Error(`No geocoding results for: ${query}`);
  }

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
    country: data[0].display_name.split(",").pop()?.trim() || "",
  };
}
