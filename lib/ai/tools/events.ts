import "server-only";

export interface EventResult {
  name: string;
  date: string;
  venue: string;
  description: string;
  link: string;
}

export async function searchEvents(params: {
  q: string;
  location: string;
}): Promise<EventResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [{ name: "No SERPAPI_KEY configured", date: "N/A", venue: "N/A", description: "", link: "" }];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_events");
  url.searchParams.set("q", `${params.q} events in ${params.location}`);
  url.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`Events API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const events = data.events_results || [];

    return events.slice(0, 5).map((e: any) => ({
      name: e.title || "Unknown Event",
      date: e.date?.start_date || e.date?.when || "TBD",
      venue: e.venue?.name || "TBD",
      description: e.description || "",
      link: e.link || "",
    }));
  } catch {
    return [];
  }
}
