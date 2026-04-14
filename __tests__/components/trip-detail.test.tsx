/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { destinationSchema } from "@/lib/trip/schema";
import {
  TripDetail,
  resolveDetailPalette,
  DETAIL_PALETTE_DEFAULTS,
  getTripDetailRootStyle,
} from "@/app/components/trip-detail";

function buildDestination(overrides: Record<string, unknown> = {}) {
  const raw = {
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
      summary: "Nice",
      forecast: [
        {
          day: "2026-06-01",
          high: 20,
          low: 10,
          condition: "Clear",
          icon: "\u2600\uFE0F",
        },
      ],
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
      tips: ["Tip one"],
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
  return destinationSchema.parse(raw);
}

describe("resolveDetailPalette", () => {
  it("uses defaults when colorPalette is null", () => {
    expect(resolveDetailPalette(null)).toEqual({ ...DETAIL_PALETTE_DEFAULTS });
  });

  it("falls back for invalid hex strings", () => {
    const p = resolveDetailPalette({
      primary: "not-a-color",
      secondary: "#669933",
      accent: "#993366",
      background: "#f8fafc",
      text: "#1e293b",
    });
    expect(p.primary).toBe(DETAIL_PALETTE_DEFAULTS.primary);
    expect(p.secondary).toBe("#669933");
  });
});

describe("getTripDetailRootStyle", () => {
  it("includes hero gradient and texture vars derived from palette", () => {
    const style = getTripDetailRootStyle(resolveDetailPalette(null));
    expect(style.backgroundColor).toBe("var(--detail-bg)");
    expect(String(style["--detail-hero-gradient"])).toContain("var(--detail-accent-primary)");
  });
});

describe("TripDetail", () => {
  it("applies resolved palette CSS variables on the root element", () => {
    const dest = buildDestination();
    const { container } = render(
      <TripDetail destination={dest} onBack={() => {}} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--color-dest-primary").trim()).toBe("#336699");
    expect(root.style.getPropertyValue("--detail-accent-highlight").trim()).toBe("#993366");
  });

  it("renders destination name and uses defaults when palette is null", () => {
    const dest = buildDestination({ colorPalette: null });
    render(<TripDetail destination={dest} onBack={() => {}} />);
    expect(screen.getByText("Test Place")).toBeInTheDocument();
    const root = document.querySelector(".min-h-screen") as HTMLElement;
    expect(root.style.getPropertyValue("--detail-accent-primary").trim()).toBe(
      DETAIL_PALETTE_DEFAULTS.primary,
    );
  });
});
