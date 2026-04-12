"use client";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { useState, useRef, useId, useEffect, useCallback } from "react";

interface SlideData {
  title: string;
  subtitle?: string;
  button: string;
  src: string;
  onButtonClick?: () => void;
}

/* ── Carousel ── */
export default function Carousel({ slides }: { slides: SlideData[] }) {
  const [current, setCurrent] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const didSwipe = useRef(false);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c <= 0 ? slides.length - 1 : c - 1));
  }, [slides.length]);

  const goNext = useCallback(() => {
    setCurrent((c) => (c >= slides.length - 1 ? 0 : c + 1));
  }, [slides.length]);

  // Attach touch listeners with { passive: false } so we can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let locked: "h" | "v" | null = null;
    let dx = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      locked = null;
      dx = 0;
      didSwipe.current = false;
      setIsDragging(true);
    };

    const onMove = (e: TouchEvent) => {
      dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!locked) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          locked = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
        }
        return;
      }

      if (locked === "h") {
        e.preventDefault();
        didSwipe.current = true;
        setDragX(dx);
      }
    };

    const onEnd = () => {
      if (locked === "h") {
        if (dx < -50) goNext();
        else if (dx > 50) goPrev();
      }
      setDragX(0);
      setIsDragging(false);
      locked = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [goNext, goPrev]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const id = useId();

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Slide area — overflow hidden prevents page shifting */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[500px] aspect-[3/4] sm:aspect-square sm:max-w-[60vmin] mx-auto select-none overflow-hidden rounded-2xl"
        aria-labelledby={`carousel-heading-${id}`}
      >
        {slides.map((slide, index) => {
          const diff = index - current;
          const offset = diff * 100 + (dragX / (containerRef.current?.offsetWidth || 400)) * 100;

          return (
            <div
              key={index}
              className="absolute inset-0 cursor-pointer"
              onClick={() => { if (diff === 0 && !didSwipe.current) slide.onButtonClick?.(); }}
              style={{
                transform: `translateX(${offset}%) scale(${diff === 0 ? 1 : 0.9})`,
                transition: isDragging ? "none" : "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                zIndex: diff === 0 ? 10 : 5 - Math.abs(diff),
                pointerEvents: diff === 0 ? "auto" : "none",
              }}
            >
              <div className="w-full h-full rounded-2xl overflow-hidden bg-thumb-bg relative">
                {slide.src && (
                  <img
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: diff === 0 ? 1 : 0.4 }}
                    alt={slide.title}
                    src={slide.src}
                    loading="eager"
                    decoding="sync"
                  />
                )}
                {diff === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                )}

                {/* Content overlay */}
                <div
                  className={`absolute bottom-0 left-0 right-0 p-5 sm:p-7 transition-all duration-500 ${
                    diff === 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                  }`}
                >
                  {slide.subtitle && (
                    <p className="text-[11px] uppercase tracking-wider text-white/60 mb-1">
                      {slide.subtitle}
                    </p>
                  )}
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold leading-tight text-white mb-3">
                    {slide.title}
                  </h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      slide.onButtonClick?.();
                    }}
                    className="px-5 py-2.5 text-sm text-white bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl hover:bg-white/25 active:scale-95 transition duration-200"
                  >
                    {slide.button}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls + dots */}
      <div className="flex items-center gap-1">
        <button
          className="w-10 h-10 flex items-center justify-center bg-surface-elevated border border-border-default rounded-full hover:-translate-y-0.5 active:translate-y-0.5 transition duration-200 rotate-180"
          title="Previous"
          onClick={goPrev}
        >
          <IconArrowNarrowRight className="text-text-secondary" />
        </button>

        <div className="flex items-center gap-2 mx-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 h-2 bg-[#E07A3A]"
                  : "w-2 h-2 bg-text-muted/40"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="w-10 h-10 flex items-center justify-center bg-surface-elevated border border-border-default rounded-full hover:-translate-y-0.5 active:translate-y-0.5 transition duration-200"
          title="Next"
          onClick={goNext}
        >
          <IconArrowNarrowRight className="text-text-secondary" />
        </button>
      </div>

      {/* Swipe hint — mobile */}
      <p className="sm:hidden font-sans text-xs text-text-muted -mt-2">
        Swipe to explore destinations
      </p>
    </div>
  );
}
