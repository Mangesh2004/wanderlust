/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { getWeatherForecast } from "@/lib/ai/tools/weather";
import {
  executeWeatherForecast,
  resetWeatherToolCallBudget,
} from "@/lib/trip/sdk-tools";

jest.mock("@/lib/ai/tools/weather", () => ({
  getWeatherForecast: jest.fn(),
}));

const mockedGetWeatherForecast = jest.mocked(getWeatherForecast);

describe("weatherTool", () => {
  beforeEach(() => {
    resetWeatherToolCallBudget();
    mockedGetWeatherForecast.mockReset();
  });

  it("replays cached result for identical repeated requests", async () => {
    mockedGetWeatherForecast.mockResolvedValue({
      forecast: [
        { day: "2026-04-28", high: 25, low: 10, condition: "Overcast" },
      ],
      requestedDays: 5,
      returnedDays: 1,
      isPartial: true,
      final: true,
    });

    const input = {
      lat: 41.1502195,
      lon: -8.6103497,
      days: 5,
      start_date: "2026-04-28",
    };

    const first = await executeWeatherForecast(
      input.lat,
      input.lon,
      input.days,
      input.start_date,
    );
    const second = await executeWeatherForecast(
      input.lat,
      input.lon,
      input.days,
      input.start_date,
    );

    expect(mockedGetWeatherForecast).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.forecast).toEqual(first.forecast);
  });

  it("replays the first location result even if the model retries the same place", async () => {
    mockedGetWeatherForecast.mockResolvedValue({
      forecast: [
        { day: "2026-04-28", high: 42, low: 28, condition: "Partly cloudy" },
        { day: "2026-04-29", high: 43, low: 27, condition: "Partly cloudy" },
      ],
      requestedDays: 5,
      returnedDays: 2,
      isPartial: true,
      final: true,
    });

    const first = await executeWeatherForecast(
      18.7882778,
      98.9858802,
      5,
      "2026-04-28",
    );

    const retry = await executeWeatherForecast(
      18.7882778,
      98.9858802,
      3,
      "2026-04-28",
    );

    expect(mockedGetWeatherForecast).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(false);
    expect(retry.cached).toBe(true);
    expect(retry.forecast).toEqual(first.forecast);
    expect(retry.returnedDays).toBe(first.returnedDays);
  });
});
