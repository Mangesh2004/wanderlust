"use client";

import type { CSSProperties } from "react";
import type { Destination } from "@/lib/trip/schema";

interface TripDetailProps {
  destination: Destination;
  imageUrl?: string;
  onBack: () => void;
}

export function TripDetail({ destination, imageUrl, onBack }: TripDetailProps) {
  const dest = destination;

  const paletteStyle = (
    dest.colorPalette
      ? {
          "--color-dest-primary": dest.colorPalette.primary,
          "--color-dest-secondary": dest.colorPalette.secondary,
          "--color-dest-accent": dest.colorPalette.accent,
          "--color-dest-bg": dest.colorPalette.background,
          "--color-dest-text": dest.colorPalette.text,
        }
      : undefined
  ) as CSSProperties | undefined;

  return (
    <div
      className="min-h-screen bg-page-bg page-texture"
      style={paletteStyle}
    >
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden bg-surface-elevated">
        {imageUrl ? (
          <img src={imageUrl} alt={dest.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E07A3A]/20 to-[#D4682B]/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-14 left-6 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 font-sans text-sm text-white hover:bg-white/20 transition-all z-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All Destinations
        </button>

        {/* Hero text */}
        <div className="absolute bottom-8 left-8 right-8">
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Quick facts */}
        <div className="flex flex-wrap gap-6 justify-center py-4 border-b border-border-default">
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
                className="text-center p-3 rounded-xl bg-surface-elevated border border-border-default"
              >
                <p className="font-mono text-xs text-text-muted mb-1">
                  {formatDate(day.day)}
                </p>
                <p className="text-2xl mb-1">{day.icon}</p>
                <p className="font-sans text-sm font-semibold text-text-primary">
                  {day.high}°
                </p>
                <p className="font-sans text-xs text-text-muted">{day.low}°</p>
                <p className="font-sans text-xs text-text-tertiary mt-1">{day.condition}</p>
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
          <div className="mt-4 p-4 rounded-xl bg-[#E07A3A]/5 border border-[#E07A3A]/10 flex items-center justify-between">
            <span className="font-sans text-sm font-semibold text-text-primary">
              Grand Total
            </span>
            <div className="text-right">
              <span className="font-sans text-lg font-bold text-[#E07A3A]">
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
                  <span className="font-mono text-xs font-bold text-[#E07A3A] bg-[#E07A3A]/10 px-2 py-1 rounded">
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
                              <span className="font-mono text-xs text-[#E07A3A]">
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
                  <span className="font-mono text-xs text-[#E07A3A] font-bold">
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
                  <span className="font-mono text-xs text-[#E07A3A]">{t.cost}</span>
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
          <div className="p-5 rounded-xl bg-[#E07A3A]/5 border border-[#E07A3A]/10 mb-6">
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
                  className="px-3 py-1.5 rounded-full bg-surface-elevated border border-border-default font-sans text-sm text-text-secondary"
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
            <ul className="space-y-2">
              {dest.culture.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex gap-3 font-sans text-sm text-text-secondary"
                >
                  <span className="font-mono text-xs text-[#E07A3A] mt-0.5 font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {tip}
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
              <ul className="space-y-2">
                {dest.culture.activities.map((act, i) => (
                  <li key={i} className="flex gap-2 font-sans text-sm text-text-secondary">
                    <span className="text-[#E07A3A]">{"\u2022"}</span>
                    {act}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Back button */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            onClick={onBack}
            className="rounded-xl border border-[#E07A3A] px-8 py-3 font-sans text-sm font-medium text-[#E07A3A] hover:bg-[#E07A3A]/5 transition-colors"
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
        <span className="w-6 h-0.5 bg-[#E07A3A] rounded-full" />
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
