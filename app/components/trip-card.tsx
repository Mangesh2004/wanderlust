"use client";

import type { CSSProperties } from "react";
import type { Destination } from "@/lib/trip/schema";

interface TripCardProps {
  destination: Destination;
  imageUrl?: string;
  isActive: boolean;
  onExplore: () => void;
  generatingLabel?: string;
}

export function TripCard({ destination, imageUrl, isActive, onExplore, generatingLabel }: TripCardProps) {
  const paletteStyle = (
    destination.colorPalette
      ? {
          "--color-dest-primary": destination.colorPalette.primary,
          "--color-dest-secondary": destination.colorPalette.secondary,
          "--color-dest-accent": destination.colorPalette.accent,
          "--color-dest-bg": destination.colorPalette.background,
          "--color-dest-text": destination.colorPalette.text,
        }
      : undefined
  ) as CSSProperties | undefined;

  return (
    <div
      className={`w-72 rounded-2xl overflow-hidden transition-shadow ${
        isActive ? "shadow-2xl ring-2 ring-white/20" : "shadow-md"
      }`}
      style={paletteStyle}
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-[#E07A3A]/20 to-[#D4682B]/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={destination.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#E07A3A]/30 border-t-[#E07A3A] animate-spin mx-auto" />
              {generatingLabel && (
                <p className="mt-3 font-sans text-xs text-zinc-500 px-4">
                  Creating poster for {generatingLabel}...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Glass overlay */}
        <div className="absolute bottom-0 inset-x-0 p-5 backdrop-blur-md bg-black/40 border-t border-white/10">
          <p className="font-sans text-xs uppercase tracking-wider text-white/70 mb-1">
            {destination.country}
          </p>
          <h3 className="font-display text-2xl text-white leading-tight mb-3">
            {destination.name}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplore();
            }}
            className="w-full rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-white/30 transition-colors"
          >
            Explore →
          </button>
        </div>
      </div>
    </div>
  );
}
