"use client";

import { useState } from "react";
import type { TripInput } from "@/lib/trip/schema";

const BUDGET_OPTIONS = [
  { value: "low" as const, label: "$0 – $1K", icon: "\u{1F4B0}" },
  { value: "medium" as const, label: "$1K – $2.5K", icon: "\u{1F48E}" },
  { value: "high" as const, label: "$2.5K+", icon: "\u{1F451}" },
];

const TRAVEL_WITH = [
  { value: "solo" as const, label: "Solo", icon: "\u{1F9F3}" },
  { value: "couple" as const, label: "Couple", icon: "\u{1F491}" },
  { value: "family" as const, label: "Family", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}" },
  { value: "friends" as const, label: "Friends", icon: "\u{1F46F}" },
];

const INTERESTS = [
  { value: "hiking", label: "Hiking", icon: "\u{1F97E}" },
  { value: "food", label: "Food", icon: "\u{1F35C}" },
  { value: "culture", label: "Culture", icon: "\u{1F3DB}\uFE0F" },
  { value: "beach", label: "Beach", icon: "\u{1F3D6}\uFE0F" },
  { value: "nightlife", label: "Nightlife", icon: "\u{1F303}" },
  { value: "shopping", label: "Shopping", icon: "\u{1F6CD}\uFE0F" },
  { value: "wellness", label: "Wellness", icon: "\u{1F9D8}" },
  { value: "adventure", label: "Adventure", icon: "\u{1FA82}" },
  { value: "photography", label: "Photography", icon: "\u{1F4F8}" },
  { value: "history", label: "History", icon: "\u{1F4DC}" },
];

interface TripFormProps {
  onSubmit: (input: TripInput) => void;
  error?: string;
}

export function TripForm({ onSubmit, error }: TripFormProps) {
  const [vibe, setVibe] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [travelDates, setTravelDates] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<"low" | "medium" | "high">("medium");
  const [travelWith, setTravelWith] = useState<"solo" | "couple" | "family" | "friends">("solo");
  const [interests, setInterests] = useState<string[]>(["food", "culture"]);

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ vibe, departureCity, travelDates, days, budget, travelWith, interests });
  }

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center px-4 py-12 pt-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.3em] text-white/30 mb-4">
            WANDERLUST
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white leading-tight">
            Where will your next{" "}
            <span className="italic text-[#E07A3A]">adventure</span> take you?
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vibe */}
          <div>
            <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
              Describe your travel vibe
            </label>
            <textarea
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="I want snowy mountains, cozy cafes, and hot chocolate by the fireplace..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 font-serif text-base text-white placeholder:text-white/30 placeholder:italic focus:border-[#E07A3A]/50 focus:outline-none focus:ring-2 focus:ring-[#E07A3A]/20 resize-none transition-all"
              rows={3}
              required
            />
          </div>

          {/* From + Date + Days */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                Flying from
              </label>
              <input
                type="text"
                value={departureCity}
                onChange={(e) => setDepartureCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:border-[#E07A3A]/50 focus:outline-none focus:ring-2 focus:ring-[#E07A3A]/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                Travel date
              </label>
              <input
                type="date"
                value={travelDates}
                onChange={(e) => setTravelDates(e.target.value)}
                min={minDate}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white focus:border-[#E07A3A]/50 focus:outline-none focus:ring-2 focus:ring-[#E07A3A]/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                Days
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) =>
                  setDays(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))
                }
                min={1}
                max={14}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white focus:border-[#E07A3A]/50 focus:outline-none focus:ring-2 focus:ring-[#E07A3A]/20 transition-all"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">
              Budget
            </label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBudget(opt.value)}
                  className={`rounded-full px-5 py-2.5 font-sans text-sm font-medium transition-all ${
                    budget === opt.value
                      ? "bg-[#E07A3A] text-white shadow-sm"
                      : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Traveling with */}
          <div>
            <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">
              Traveling with
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_WITH.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTravelWith(opt.value)}
                  className={`rounded-full px-5 py-2.5 font-sans text-sm font-medium transition-all ${
                    travelWith === opt.value
                      ? "bg-[#E07A3A] text-white shadow-sm"
                      : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">
              Interests{" "}
              <span className="normal-case tracking-normal font-normal text-white/30">
                (select multiple)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleInterest(opt.value)}
                  className={`rounded-full px-4 py-2 font-sans text-sm font-medium transition-all ${
                    interests.includes(opt.value)
                      ? "bg-[#E07A3A] text-white shadow-sm"
                      : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              !vibe.trim() ||
              !departureCity.trim() ||
              !travelDates ||
              interests.length === 0
            }
            className="w-full rounded-xl bg-gradient-to-r from-[#E07A3A] to-[#D4682B] px-6 py-4 font-sans text-lg font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#E07A3A]/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Generate Dream Destinations
          </button>
        </form>

        <p className="mt-6 text-center font-sans text-xs text-white/30">
          Powered by AI agents with real-time weather, flights &amp; cultural data
        </p>
      </div>
    </div>
  );
}
