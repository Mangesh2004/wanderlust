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
    // Frankfurter API unavailable
  }

  return { from: params.from, to: params.to, rate: 1 };
}
