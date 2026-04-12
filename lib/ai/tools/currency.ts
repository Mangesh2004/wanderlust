import "server-only";

export interface CurrencyResult {
  from: string;
  to: string;
  rate: number;
}

export async function convertCurrency(params: {
  from: string;
  to: string;
}): Promise<CurrencyResult> {
  // Primary: Frankfurter (free, no key needed)
  try {
    const url = `https://api.frankfurter.dev/v1/latest?from=${params.from}&to=${params.to}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return {
        from: params.from,
        to: params.to,
        rate: data.rates[params.to],
      };
    }
  } catch {
    // Fall through to SerpAPI
  }

  // Fallback: SerpAPI google_finance
  const apiKey = process.env.SERPAPI_KEY;
  if (apiKey) {
    try {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google_finance");
      url.searchParams.set("q", `${params.from}-${params.to}`);
      url.searchParams.set("api_key", apiKey);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const rate = data.summary?.price || 1;
        return { from: params.from, to: params.to, rate };
      }
    } catch {
      // Fall through
    }
  }

  return { from: params.from, to: params.to, rate: 1 };
}
