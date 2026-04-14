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
  if (params.from === params.to) {
    return { from: params.from, to: params.to, rate: 1 };
  }

  try {
    const url = `https://api.frankfurter.dev/v1/latest?from=${params.from}&to=${params.to}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as {
        rates?: Record<string, number>;
      };
      const rate = data.rates?.[params.to];
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        return {
          from: params.from,
          to: params.to,
          rate,
        };
      }
      throw new Error(`Currency API returned no rate for ${params.to}`);
    }

    const detail = await res.text().catch(() => "");
    throw new Error(
      `Currency API failed: ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`,
    );
  } catch (error) {
    throw new Error(
      `Unable to convert ${params.from} to ${params.to}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
