import {
  extractJSON,
  tripInputSchema,
  destinationSchema,
  phase1ResultSchema,
} from "@/lib/trip/schema";

describe("extractJSON", () => {
  it("extracts JSON from fenced code blocks", () => {
    const raw = 'Here:\n```json\n{"a":1}\n```';
    expect(extractJSON(raw)).toBe('{"a":1}');
  });

  it("extracts first object from text", () => {
    const raw = 'prefix {"x": true} suffix';
    expect(extractJSON(raw)).toBe('{"x": true}');
  });

  it("returns trimmed text when no pattern matches", () => {
    expect(extractJSON("  hello  ")).toBe("hello");
  });
});

describe("tripInputSchema", () => {
  const valid = {
    vibe: "cozy mountains",
    departureCity: "NYC",
    travelDates: "2026-06-01",
    days: 5,
    budget: "medium" as const,
    travelWith: "couple" as const,
    interests: ["hiking", "food"],
  };

  it("accepts valid input", () => {
    expect(() => tripInputSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty vibe", () => {
    expect(() => tripInputSchema.parse({ ...valid, vibe: "" })).toThrow();
  });

  it("rejects invalid budget", () => {
    expect(() =>
      tripInputSchema.parse({ ...valid, budget: "luxury" }),
    ).toThrow();
  });

  it("rejects days out of range", () => {
    expect(() => tripInputSchema.parse({ ...valid, days: 20 })).toThrow();
  });
});

const minimalForecastDay = {
  day: "2026-06-01",
  high: 20,
  low: 10,
  condition: "Clear",
  icon: "☀️",
};

function buildDestination(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Test Place",
    country: "Testland",
    state: "Test State",
    coordinates: { lat: 1, lon: 2 },
    tagline: "A tagline",
    description: "A description.",
    history: "Some history.",
    days: 3,
    totalBudget: "$1,000 – $2,500 USD",
    weather: {
      summary: "Nice ☀️",
      forecast: [minimalForecastDay],
    },
    costEstimate: {
      localCurrency: { code: "USD", symbol: "$", exchangeRate: 1 },
      accommodation: { total: "$100", description: "Hotels" },
      food: { total: "$50", description: "Food" },
      transport: { total: "$30", description: "Transit" },
      activities: { total: "$20", description: "Fun" },
      grandTotal: "$200",
      withinBudget: true,
    },
    hotels: [],
    flights: [],
    transport: [],
    itinerary: [],
    culture: {
      localPhrase: { phrase: "Hi", pronunciation: "hai", meaning: "Hello" },
      mustTryFood: ["Soup"],
      tips: ["Tip"],
      activities: ["Walk"],
    },
    colorPalette: {
      primary: "#336699",
      secondary: "#669933",
      accent: "#993366",
      background: "#f8fafc",
      text: "#1e293b",
    },
    imagePrompt: "A cinematic photo.",
    imageUrl: null as string | null,
    ...overrides,
  };
}

describe("destinationSchema", () => {
  it("parses complete destination", () => {
    const d = buildDestination();
    expect(() => destinationSchema.parse(d)).not.toThrow();
  });

  it("rejects missing name", () => {
    const d = buildDestination({ name: undefined });
    expect(() => destinationSchema.parse(d)).toThrow();
  });

  it("allows nullable imageUrl", () => {
    const d = buildDestination({ imageUrl: null });
    const parsed = destinationSchema.parse(d);
    expect(parsed.imageUrl).toBeNull();
  });

  it("allows optional colorPalette", () => {
    const d = buildDestination();
    const { colorPalette, ...rest } = d;
    expect(colorPalette).toBeDefined();
    expect(() => destinationSchema.parse({ ...rest, colorPalette: null })).not.toThrow();
  });

  it("defaults missing itinerary place icon to pin emoji", () => {
    const d = buildDestination({
      itinerary: [
        {
          day: 1,
          title: "Day one",
          places: [
            {
              name: "Cafe",
              description: "Coffee",
              duration: "1h",
              cost: "$5",
            },
          ],
        },
      ],
    });
    const parsed = destinationSchema.parse(d);
    expect(parsed.itinerary[0].places[0].icon).toBe("\u{1F4CD}");
  });

  it("normalizes invalid weather icons", () => {
    const d = buildDestination({
      weather: {
        summary: "Cloudy",
        forecast: [
          {
            ...minimalForecastDay,
            icon: "\uFE0F",
          },
        ],
      },
    });
    const parsed = destinationSchema.parse(d);
    expect(parsed.weather.forecast[0].icon).toBe("🌤️");
  });

  it("accepts nullable state", () => {
    const d = buildDestination({ state: null });
    const parsed = destinationSchema.parse(d);
    expect(parsed.state).toBeNull();
  });
});

describe("phase1ResultSchema", () => {
  it("requires exactly three destinations", () => {
    const one = {
      selectedDestinations: [
        {
          name: "A",
          country: "X",
          state: "",
          coordinates: { lat: 0, lon: 0 },
          weather: {
            summary: "s",
            forecast: [minimalForecastDay],
          },
        },
      ],
    };
    expect(() => phase1ResultSchema.parse(one)).toThrow();
  });
});
