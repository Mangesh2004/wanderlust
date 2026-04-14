/**
 * @jest-environment node
 */
import {
  getWeatherForecast,
  runOpenMeteoSmokeTest,
  summarizeGetWeatherForecastToolOutput,
  weatherCodeToCondition,
} from "@/lib/ai/tools/weather";

describe("summarizeGetWeatherForecastToolOutput (no HTTP)", () => {
  it("marks ok when forecast has rows", () => {
    const raw = JSON.stringify({
      requestedDays: 3,
      returnedDays: 1,
      isPartial: true,
      final: true,
      forecast: [
        { day: "2026-06-01", high: 20, low: 10, condition: "Sunny" },
      ],
    });
    const s = summarizeGetWeatherForecastToolOutput(raw);
    expect(s.status).toBe("ok_partial");
    expect(s.forecastDays).toBe(1);
    expect(s.returnedDays).toBe(1);
    expect(s.isPartial).toBe(true);
  });

  it("marks error for thrown tool messages", () => {
    const s = summarizeGetWeatherForecastToolOutput("Error: rate limit");
    expect(s.status).toBe("error");
  });
});

describe("weatherCodeToCondition", () => {
  it("maps Open-Meteo weather codes", () => {
    expect(weatherCodeToCondition(0)).toBe("Clear sky");
    expect(weatherCodeToCondition(63)).toBe("Rain");
    expect(weatherCodeToCondition(95)).toBe("Thunderstorm");
  });
});

/**
 * Real HTTP calls — opt-in so `pnpm test` stays green without network variance.
 * Run: `RUN_WEATHER_LIVE=1 pnpm test`.
 */
const runLive = process.env.RUN_WEATHER_LIVE === "1";

const live = runLive ? describe : describe.skip;

live("getWeatherForecast — live Open-Meteo API", () => {
  jest.setTimeout(30_000);

  it("returns non-empty daily forecast for Boulder from today", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = await getWeatherForecast(40.0149856, -105.270545, 3, today);

    expect(r.forecast.length).toBeGreaterThan(0);
    expect(r.requestedDays).toBe(3);
    expect(r.returnedDays).toBe(r.forecast.length);
    expect(r.final).toBe(true);
    for (const row of r.forecast) {
      expect(row.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.high).toBeGreaterThanOrEqual(row.low);
      expect(row.condition.length).toBeGreaterThan(0);
    }
  });

  it("runOpenMeteoSmokeTest matches the smoke script path", async () => {
    const r = await runOpenMeteoSmokeTest();
    expect(r.forecast.length).toBeGreaterThan(0);
  });

  it("returns empty forecast when the trip starts beyond the 16-day window", async () => {
    const future = new Date(Date.now() + 25 * 86_400_000).toISOString().slice(0, 10);
    const r = await getWeatherForecast(40.0149856, -105.270545, 5, future);
    expect(r.forecast).toEqual([]);
    expect(r.isPartial).toBe(true);
    expect(r.final).toBe(true);
  });
});
