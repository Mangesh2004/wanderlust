import "server-only";

export interface WeatherForecast {
  day: string;
  high: number;
  low: number;
  condition: string;
}

export interface WeatherResult {
  forecast: WeatherForecast[];
}

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export async function getWeatherForecast(
  lat: number,
  lon: number,
  days: number = 7,
  startDate?: string
): Promise<WeatherResult> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lon.toString());
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode"
  );
  url.searchParams.set("timezone", "auto");

  // If a future start date is provided, use date range instead of forecast_days
  if (startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", end.toISOString().split("T")[0]);
  } else {
    url.searchParams.set("forecast_days", days.toString());
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Weather API failed: ${res.status}`);
  }

  const data = await res.json();
  const forecast: WeatherForecast[] = data.daily.time.map(
    (day: string, i: number) => ({
      day,
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      condition:
        WEATHER_CODE_MAP[data.daily.weathercode[i]] || "Unknown",
    })
  );

  return { forecast };
}
