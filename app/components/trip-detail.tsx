"use client";

/**
 * Destination detail palette scope:
 * This component is only mounted after the user clicks Explore from the collection
 * carousel (`app/collections/[id]/collection-view.tsx`). Destination-scoped colors live
 * in CSS variables set on this tree; browse/carousel chrome stays on global tokens.
 */

import { useEffect, type CSSProperties } from "react";
import type { Destination } from "@/lib/trip/schema";

/** Fallback hex values for detail view only (single mapping layer). */
export const DETAIL_PALETTE_DEFAULTS = {
  primary: "#C96A32",
  secondary: "#D9A07B",
  accent: "#E07A3A",
  background: "#F8F5F0",
  text: "#1F2937",
} as const;

export type ResolvedDetailPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

/**
 * When the app is in dark mode, semantic `text-text-*` still points at light-on-dark
 * colors. AI `background` is usually a light cream, so we re-seed the semantic text and
 * a few surfaces under TripDetail to match a light “content island” while keeping
 * `--detail-readable-text` as the primary tone from the model.
 */
const DETAIL_LIGHT_ISLAND_SEMANTICS: Record<string, string> = {
  "--text-primary": "var(--detail-readable-text)",
  "--text-secondary": "#5A5750",
  "--text-tertiary": "#8A8780",
  "--text-muted": "#B0ADA6",
  "--text-faint": "#D0CDC6",
  "--surface-elevated": "rgba(0, 0, 0, 0.03)",
  "--surface-subtle": "rgba(0, 0, 0, 0.015)",
  "--border-default": "#E8E5DD",
  "--border-hover": "#D0CDC6",
  "--hover-bg": "rgba(0, 0, 0, 0.04)",
};

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(input: string | undefined, fallback: string): string {
  if (input === undefined || typeof input !== "string") return fallback;
  const t = input.trim();
  return HEX6.test(t) ? t : fallback;
}

/**
 * Resolves AI palette with validation; always returns safe hex for the detail skin.
 */
export function resolveDetailPalette(
  colorPalette: Destination["colorPalette"],
): ResolvedDetailPalette {
  const d = DETAIL_PALETTE_DEFAULTS;
  if (!colorPalette) {
    return { ...d };
  }
  return {
    primary: normalizeHex(colorPalette.primary, d.primary),
    secondary: normalizeHex(colorPalette.secondary, d.secondary),
    accent: normalizeHex(colorPalette.accent, d.accent),
    background: normalizeHex(colorPalette.background, d.background),
    text: normalizeHex(colorPalette.text, d.text),
  };
}

/**
 * CSS variables for destination detail only. Derived values use var() so hex appears * only on the base accent keys (from resolveDetailPalette).
 */
function detailPaletteCssVars(colors: ResolvedDetailPalette): CSSProperties {
  return {
    "--color-dest-primary": colors.primary,
    "--color-dest-secondary": colors.secondary,
    "--color-dest-accent": colors.accent,
    "--color-dest-bg": colors.background,
    "--color-dest-text": colors.text,

    "--detail-accent-primary": colors.primary,
    "--detail-accent-secondary": colors.secondary,
    "--detail-accent-highlight": colors.accent,
    "--detail-bg": colors.background,
    "--detail-readable-text": colors.text,

    ...DETAIL_LIGHT_ISLAND_SEMANTICS,

    "--detail-hero-gradient":
      "linear-gradient(to bottom right, color-mix(in srgb, var(--detail-accent-primary) 22%, transparent), color-mix(in srgb, var(--detail-accent-secondary) 12%, transparent))",

    "--detail-panel-soft":
      "color-mix(in srgb, var(--detail-accent-secondary) 14%, transparent)",
    "--detail-panel-border":
      "color-mix(in srgb, var(--detail-accent-primary) 22%, transparent)",

    "--detail-grand-total-bg":
      "color-mix(in srgb, var(--detail-accent-secondary) 10%, transparent)",
    "--detail-grand-total-border":
      "color-mix(in srgb, var(--detail-accent-primary) 18%, transparent)",

    "--detail-badge-bg":
      "color-mix(in srgb, var(--detail-accent-highlight) 12%, transparent)",

    "--detail-primary-hover-soft":
      "color-mix(in srgb, var(--detail-accent-primary) 10%, transparent)",

    "--detail-page-texture-a":
      "color-mix(in srgb, var(--detail-accent-primary) 6%, transparent)",
    "--detail-page-texture-b":
      "color-mix(in srgb, var(--detail-accent-secondary) 4%, transparent)",

    /* Weather: blue / sky (secondary) */
    "--detail-weather-card-bg":
      "color-mix(in srgb, var(--detail-accent-secondary) 24%, transparent)",
    "--detail-weather-icon-well":
      "color-mix(in srgb, var(--detail-accent-secondary) 38%, transparent)",
    "--detail-weather-border":
      "color-mix(in srgb, var(--detail-accent-secondary) 45%, transparent)",

    /* Lists / callouts: warm accent wash (readable dark text on light tint) */
    "--detail-list-row-bg":
      "color-mix(in srgb, var(--detail-accent-highlight) 18%, transparent)",
    "--detail-list-row-border":
      "color-mix(in srgb, var(--detail-accent-highlight) 32%, transparent)",
    /* Solid accent for small “chip” columns (white text) */
    "--detail-list-accent-solid": "var(--detail-accent-highlight)",
  } as CSSProperties;
}

export function getTripDetailRootStyle(colors: ResolvedDetailPalette): CSSProperties {
  return {
    ...detailPaletteCssVars(colors),
    backgroundColor: "var(--detail-bg)",
    backgroundImage:
      "radial-gradient(ellipse at 20% 0%, var(--detail-page-texture-a) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, var(--detail-page-texture-b) 0%, transparent 50%)",
  } as CSSProperties;
}

interface TripDetailProps {
  destination: Destination;
  imageUrl?: string;
  isImageGenerating?: boolean;
  onBack: () => void;
}

export function TripDetail({
  destination,
  imageUrl,
  isImageGenerating = false,
  onBack,
}: TripDetailProps) {
  const dest = destination;
  const colors = resolveDetailPalette(dest.colorPalette);
  const rootStyle = getTripDetailRootStyle(colors);
  const heroHasPhoto = Boolean(imageUrl);

  useEffect(() => {
    const resolved = resolveDetailPalette(dest.colorPalette);
    console.log("[TripDetail colorPalette]", {
      destination: dest.name,
      rawFromModel: dest.colorPalette,
      resolvedForUi: resolved,
    });
  }, [dest.name, dest.colorPalette]);

  const heroReadableMuted = { color: "var(--detail-readable-text)", opacity: 0.65 } as const;
  const heroReadableBody = { color: "var(--detail-readable-text)", opacity: 0.88 } as const;

  return (
    <div className="min-h-screen" style={rootStyle}>
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden bg-surface-elevated">
        {imageUrl ? (
          <img src={imageUrl} alt={dest.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "var(--detail-hero-gradient)" }}
          >
            {isImageGenerating ? (
              <div className="text-center px-6">
                <div
                  className="w-12 h-12 rounded-full border-2 animate-spin mx-auto"
                  style={
                    heroHasPhoto
                      ? { borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }
                      : {
                          borderColor: "color-mix(in srgb, var(--detail-accent-primary) 28%, transparent)",
                          borderTopColor: "var(--detail-accent-primary)",
                        }
                  }
                />
                <p
                  className="mt-4 font-sans text-sm"
                  style={heroHasPhoto ? { color: "rgba(255,255,255,0.8)" } : heroReadableBody}
                >
                  Generating poster for {dest.name}...
                </p>
              </div>
            ) : null}
          </div>
        )}
        {heroHasPhoto ? (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        ) : null}

        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className={
            heroHasPhoto
              ? "absolute top-14 left-6 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 font-sans text-sm text-white hover:bg-white/20 transition-all z-10"
              : "absolute top-14 left-6 flex items-center gap-2 rounded-full border border-border-default bg-surface-elevated/90 backdrop-blur-md px-4 py-2 font-sans text-sm text-text-primary hover:bg-hover-bg transition-all z-10"
          }
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All Destinations
        </button>

        {/* Hero text */}
        <div className="absolute bottom-8 left-8 right-8">
          {heroHasPhoto ? (
            <>
              <p className="font-sans text-xs uppercase tracking-widest text-white/60 mb-2">
                {dest.country}
                {dest.state ? `, ${dest.state}` : ""}
              </p>
              <h1 className="font-display text-5xl md:text-6xl text-white mb-3">
                {dest.name}
              </h1>
              <p className="font-serif text-lg text-white/80 italic max-w-2xl">
                {dest.tagline}
              </p>
            </>
          ) : (
            <>
              <p className="font-sans text-xs uppercase tracking-widest mb-2" style={heroReadableMuted}>
                {dest.country}
                {dest.state ? `, ${dest.state}` : ""}
              </p>
              <h1
                className="font-display text-5xl md:text-6xl mb-3"
                style={{ color: "var(--detail-readable-text)" }}
              >
                {dest.name}
              </h1>
              <p className="font-serif text-lg italic max-w-2xl" style={heroReadableBody}>
                {dest.tagline}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Quick facts */}
        <div className="border-b border-border-default pb-4">
          <div
            className="flex flex-wrap gap-6 justify-center rounded-2xl border px-4 py-5"
            style={{
              background: "var(--detail-panel-soft)",
              borderColor: "var(--detail-panel-border)",
            }}
          >
            <Fact label="Weather" value={dest.weather.summary} />
            <Fact label="Budget" value={dest.costEstimate.grandTotal} />
            <Fact
              label="Currency"
              value={`${dest.costEstimate.localCurrency.symbol} (${dest.costEstimate.localCurrency.code})`}
            />
            <Fact label="Duration" value={`${dest.days} days`} />
            <Fact
              label="Coords"
              value={`${dest.coordinates.lat.toFixed(2)}°, ${dest.coordinates.lon.toFixed(2)}°`}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="font-serif text-base leading-relaxed text-text-secondary">
            {dest.description}
          </p>
          {dest.history && (
            <p className="font-serif text-sm text-text-tertiary mt-3 italic">{dest.history}</p>
          )}
        </div>

        {/* Weather forecast */}
        <Section label="Weather Forecast">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
            {dest.weather.forecast.map((day) => (
              <div
                key={day.day}
                className="text-center p-3 rounded-xl border"
                style={{
                  background: "var(--detail-weather-card-bg)",
                  borderColor: "var(--detail-weather-border)",
                }}
              >
                <p
                  className="font-mono text-xs mb-1"
                  style={{ color: "var(--detail-accent-secondary)" }}
                >
                  {formatDate(day.day)}
                </p>
                <div
                  className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                  style={{ background: "var(--detail-weather-icon-well)" }}
                >
                  {day.icon}
                </div>
                <p
                  className="font-sans text-sm font-semibold"
                  style={{ color: "var(--detail-accent-secondary)" }}
                >
                  {day.high}°
                </p>
                <p
                  className="font-sans text-xs"
                  style={{ color: "var(--detail-accent-primary)" }}
                >
                  {day.low}°
                </p>
                <p
                  className="font-sans text-xs mt-1"
                  style={{ color: "var(--detail-readable-text)", opacity: 0.85 }}
                >
                  {day.condition}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Cost breakdown */}
        <Section label="Cost Breakdown">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CostRow
              label="Accommodation"
              total={dest.costEstimate.accommodation.total}
              desc={dest.costEstimate.accommodation.description}
            />
            <CostRow
              label="Food"
              total={dest.costEstimate.food.total}
              desc={dest.costEstimate.food.description}
            />
            <CostRow
              label="Transport"
              total={dest.costEstimate.transport.total}
              desc={dest.costEstimate.transport.description}
            />
            <CostRow
              label="Activities"
              total={dest.costEstimate.activities.total}
              desc={dest.costEstimate.activities.description}
            />
          </div>
          <div
            className="mt-4 p-4 rounded-xl border flex items-center justify-between"
            style={{
              background: "var(--detail-grand-total-bg)",
              borderColor: "var(--detail-grand-total-border)",
            }}
          >
            <span className="font-sans text-sm font-semibold text-text-primary">
              Grand Total
            </span>
            <div className="text-right">
              <span
                className="font-sans text-lg font-bold"
                style={{ color: "var(--detail-accent-highlight)" }}
              >
                {dest.costEstimate.grandTotal}
              </span>
              {dest.costEstimate.withinBudget && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
                  Within budget
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* Itinerary */}
        <Section label="Day-by-Day Itinerary">
          <div className="space-y-8">
            {dest.itinerary.map((day) => (
              <div key={day.day}>
                <div className="flex items-baseline gap-3 mb-4">
                  <span
                    className="font-mono text-xs font-bold px-2 py-1 rounded"
                    style={{
                      color: "var(--detail-accent-highlight)",
                      background: "var(--detail-badge-bg)",
                    }}
                  >
                    DAY {day.day}
                  </span>
                  <span className="font-sans font-semibold text-text-primary">
                    {day.title}
                  </span>
                </div>
                <div className="space-y-3 ml-2 pl-4 border-l-2 border-border-default">
                  {day.places.map((place, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-lg flex-shrink-0">{place.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-sans font-medium text-text-primary">
                            {place.name}
                          </span>
                          <span className="font-mono text-xs text-text-muted">
                            {place.duration}
                          </span>
                          {place.cost &&
                            place.cost !== "$0" &&
                            place.cost.toLowerCase() !== "free" && (
                              <span
                                className="font-mono text-xs"
                                style={{ color: "var(--detail-accent-highlight)" }}
                              >
                                {place.cost}
                              </span>
                            )}
                        </div>
                        <p className="font-sans text-sm text-text-tertiary mt-0.5">
                          {place.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Hotels */}
        <Section label="Recommended Hotels">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dest.hotels.map((hotel, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface-elevated border border-border-default">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans font-semibold text-sm text-text-primary">
                    {hotel.name}
                  </span>
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: "var(--detail-accent-highlight)" }}
                  >
                    {hotel.rating}
                  </span>
                </div>
                <p className="font-sans text-xs text-text-tertiary mb-2">{hotel.location}</p>
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-xs text-text-muted">
                    {hotel.pricePerNight}/night
                  </span>
                  <span className="font-sans text-sm font-semibold text-text-secondary">
                    {hotel.totalForStay} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Flights */}
        {dest.flights.length > 0 && (
          <Section label="Flight Options">
            <div className="space-y-3">
              {dest.flights.map((flight, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface-elevated border border-border-default"
                >
                  <div>
                    <span className="font-sans font-medium text-sm text-text-primary">
                      {flight.airline}
                    </span>
                    <p className="font-sans text-xs text-text-tertiary mt-0.5">
                      {flight.route} · {flight.duration}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-sans font-semibold text-text-primary">
                      {flight.price}
                    </span>
                    <p className="font-mono text-xs text-text-muted">{flight.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Transport */}
        {dest.transport.length > 0 && (
          <Section label="Local Transport">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dest.transport.map((t, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-surface-elevated border border-border-default flex items-center gap-3"
                >
                  <span className="font-sans font-medium text-sm text-text-secondary">
                    {t.type}
                  </span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: "var(--detail-accent-highlight)" }}
                  >
                    {t.cost}
                  </span>
                  <span className="font-sans text-xs text-text-muted flex-1 text-right">
                    {t.notes}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Culture & Tips */}
        <Section label="Culture & Tips">
          {/* Local phrase */}
          <div
            className="p-5 rounded-xl mb-6 border"
            style={{
              background: "var(--detail-panel-soft)",
              borderColor: "var(--detail-panel-border)",
            }}
          >
            <p className="font-serif text-xl text-text-primary mb-1">
              &ldquo;{dest.culture.localPhrase.phrase}&rdquo;
            </p>
            <p className="font-mono text-xs text-text-tertiary">
              {dest.culture.localPhrase.pronunciation} &mdash;{" "}
              {dest.culture.localPhrase.meaning}
            </p>
          </div>

          {/* Must-try food */}
          <div className="mb-6">
            <p className="font-sans text-xs uppercase tracking-wider text-text-tertiary mb-3">
              Must-Try Food
            </p>
            <div className="flex flex-wrap gap-2">
              {dest.culture.mustTryFood.map((food, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full border font-sans text-sm"
                  style={{
                    background: "var(--detail-list-row-bg)",
                    borderColor: "var(--detail-list-row-border)",
                    color: "var(--detail-readable-text)",
                  }}
                >
                  {food}
                </span>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="mb-6">
            <p className="font-sans text-xs uppercase tracking-wider text-text-tertiary mb-3">
              Traveler Tips
            </p>
            <ul className="list-none space-y-3">
              {dest.culture.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex overflow-hidden rounded-xl border"
                  style={{
                    borderColor: "var(--detail-list-row-border)",
                    background: "var(--detail-list-row-bg)",
                  }}
                >
                  <div
                    className="flex min-w-[2.75rem] flex-shrink-0 items-center justify-center px-2 py-3 font-mono text-xs font-bold text-white"
                    style={{ background: "var(--detail-list-accent-solid)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    className="flex-1 py-3 pr-3 pl-3 font-sans text-sm leading-relaxed"
                    style={{ color: "var(--detail-readable-text)" }}
                  >
                    {tip}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Activities */}
          {dest.culture.activities.length > 0 && (
            <div>
              <p className="font-sans text-xs uppercase tracking-wider text-text-tertiary mb-3">
                Recommended Activities
              </p>
              <ul className="list-none space-y-3">
                {dest.culture.activities.map((act, i) => (
                  <li
                    key={i}
                    className="flex overflow-hidden rounded-xl border"
                    style={{
                      borderColor: "var(--detail-list-row-border)",
                      background: "var(--detail-list-row-bg)",
                    }}
                  >
                    <div
                      className="flex min-w-[2.75rem] flex-shrink-0 items-center justify-center px-2 py-2 text-lg leading-none text-white"
                      style={{ background: "var(--detail-list-accent-solid)" }}
                      aria-hidden
                    >
                      {"\u2022"}
                    </div>
                    <div
                      className="flex-1 py-2 pr-3 pl-3 font-sans text-sm leading-relaxed"
                      style={{ color: "var(--detail-readable-text)" }}
                    >
                      {act}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Back button */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border px-8 py-3 font-sans text-sm font-medium transition-colors hover:bg-[var(--detail-primary-hover-soft)]"
            style={{
              borderColor: "var(--detail-accent-primary)",
              color: "var(--detail-accent-primary)",
            }}
          >
            &larr; Back to All Destinations
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-3">
        <span
          className="w-6 h-0.5 rounded-full"
          style={{ background: "var(--detail-accent-primary)" }}
        />
        {label}
      </h3>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-sans text-xs uppercase tracking-wider text-text-muted mb-0.5">
        {label}
      </p>
      <p className="font-sans text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function CostRow({ label, total, desc }: { label: string; total: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-surface-elevated border border-border-default">
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-sans text-sm font-medium text-text-secondary">{label}</span>
        <span className="font-sans text-sm font-semibold text-text-primary">{total}</span>
      </div>
      <p className="font-sans text-xs text-text-muted">{desc}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
