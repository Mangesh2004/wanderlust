export interface WeatherForecast {
  day: string;
  high: number;
  low: number;
  condition: string;
}

export interface WeatherResult {
  forecast: WeatherForecast[];
  requestedDays: number;
  returnedDays: number;
  isPartial: boolean;
  final: boolean;
  cached?: boolean;
}

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_MAX_DAYS = 16;

interface OpenMeteoForecastResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
}

function clampForecastDays(days: number): number {
  if (!Number.isFinite(days)) return 1;
  return Math.min(OPEN_METEO_MAX_DAYS, Math.max(1, Math.ceil(days)));
}

function startOfUtcDay(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function computeForecastDays(days: number, startDate?: string): number {
  const wanted = clampForecastDays(days);
  if (!startDate) return wanted;

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = startOfUtcDay(todayStr);
  const start = startOfUtcDay(startDate);
  const diffDays = Math.max(
    0,
    Math.ceil((start.getTime() - today.getTime()) / 86_400_000),
  );
  return clampForecastDays(diffDays + wanted);
}

export function weatherCodeToCondition(code: number | undefined): string {
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain";
    case 66:
    case 67:
      return "Freezing rain";
    case 71:
    case 73:
    case 75:
      return "Snow";
    case 77:
      return "Snow grains";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return "Partly cloudy";
  }
}

export async function getWeatherForecast(
  lat: number,
  lon: number,
  days: number = 7,
  startDate?: string,
): Promise<WeatherResult> {
  const wanted = clampForecastDays(days);
  const forecastDays = computeForecastDays(wanted, startDate);

  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,weather_code",
  );

  let res = await fetch(url.toString());
  if (res.status === 502 || res.status === 503) {
    await new Promise((r) => setTimeout(r, 400));
    res = await fetch(url.toString());
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Weather API failed: ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const data = (await res.json()) as OpenMeteoForecastResponse;
  const daily = data.daily;
  const times = daily?.time ?? [];
  const highs = daily?.temperature_2m_max ?? [];
  const lows = daily?.temperature_2m_min ?? [];
  const codes = daily?.weather_code ?? [];

  if (
    times.length === 0 ||
    highs.length !== times.length ||
    lows.length !== times.length
  ) {
    return {
      forecast: [],
      requestedDays: wanted,
      returnedDays: 0,
      isPartial: wanted > 0,
      final: true,
    };
  }

  const startStr = (startDate ?? times[0] ?? "").slice(0, 10);
  const forecast: WeatherForecast[] = [];

  for (let i = 0; i < times.length; i++) {
    const day = times[i]?.slice(0, 10);
    if (!day || day < startStr) continue;
    forecast.push({
      day,
      high: Math.round(highs[i]),
      low: Math.round(lows[i]),
      condition: weatherCodeToCondition(codes[i]),
    });
    if (forecast.length >= wanted) break;
  }

  return {
    forecast,
    requestedDays: wanted,
    returnedDays: forecast.length,
    isPartial: forecast.length < wanted,
    final: true,
  };
}

export async function runOpenMeteoSmokeTest(): Promise<WeatherResult> {
  const today = new Date().toISOString().slice(0, 10);
  return getWeatherForecast(40.0149856, -105.270545, 3, today);
}

export function isWeatherConfigured(): boolean {
  return true;
}

export function summarizeGetWeatherForecastToolOutput(
  outputJsonOrError: string,
): Record<string, unknown> {
  const base = {
    provider: "Open-Meteo",
    endpoint: "v1/forecast",
  };
  const s = outputJsonOrError.trim();
  if (
    s.startsWith("Error:") ||
    s.includes("An error occurred while running the tool") ||
    s.includes("WEATHER LIMIT")
  ) {
    return { ...base, status: "error", detail: s.slice(0, 500) };
  }
  try {
    const j = JSON.parse(s) as {
      forecast?: unknown[];
      requestedDays?: number;
      returnedDays?: number;
      isPartial?: boolean;
      final?: boolean;
      cached?: boolean;
    };
    const fc = j?.forecast;
    const len = Array.isArray(fc) ? fc.length : 0;
    const requestedDays =
      typeof j.requestedDays === "number" ? j.requestedDays : undefined;
    const returnedDays =
      typeof j.returnedDays === "number" ? j.returnedDays : len;
    const isPartial =
      typeof j.isPartial === "boolean"
        ? j.isPartial
        : requestedDays !== undefined
          ? returnedDays < requestedDays
          : false;
    const cached = j.cached === true;
    return {
      ...base,
      status: len > 0 ? (isPartial ? "ok_partial" : "ok") : "empty",
      forecastDays: len,
      requestedDays,
      returnedDays,
      isPartial,
      final: j.final === true,
      cached,
      firstDay:
        Array.isArray(fc) && fc[0] && typeof fc[0] === "object"
          ? fc[0]
          : undefined,
    };
  } catch {
    return { ...base, status: "parse_error", preview: s.slice(0, 300) };
  }
}
