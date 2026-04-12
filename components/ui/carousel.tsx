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

interface SlideProps {
  slide: SlideData;
  index: number;
  current: number;
  handleSlideClick: (index: number) => void;
}

const Slide = ({ slide, index, current, handleSlideClick }: SlideProps) => {
  const slideRef = useRef<HTMLLIElement>(null);

  const xRef = useRef(0);
  const yRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      if (!slideRef.current) return;

      const x = xRef.current;
      const y = yRef.current;

      slideRef.current.style.setProperty("--x", `${x}px`);
      slideRef.current.style.setProperty("--y", `${y}px`);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent) => {
    const el = slideRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    xRef.current = event.clientX - (r.left + Math.floor(r.width / 2));
    yRef.current = event.clientY - (r.top + Math.floor(r.height / 2));
  };

  const handleMouseLeave = () => {
    xRef.current = 0;
    yRef.current = 0;
  };

  const imageLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.opacity = "1";
  };

  const { src, button, title, subtitle, onButtonClick } = slide;
  const isActive = current === index;

  return (
    <div className="[perspective:1200px] [transform-style:preserve-3d] shrink-0 w-full sm:w-auto">
      <li
        ref={slideRef}
        className="flex flex-1 flex-col items-center justify-center relative text-white opacity-100 transition-all duration-300 ease-in-out w-[85vw] h-[85vw] sm:w-[70vmin] sm:h-[70vmin] mx-auto sm:mx-[4vmin] z-10"
        onClick={() => handleSlideClick(index)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isActive
            ? "scale(1) rotateX(0deg)"
            : "scale(0.98) rotateX(8deg)",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: "bottom",
          maxWidth: "500px",
          maxHeight: "500px",
        }}
      >
        <div
          className="absolute top-0 left-0 w-full h-full bg-[#0F0E0D] rounded-[1%] overflow-hidden transition-all duration-150 ease-out"
          style={{
            transform: isActive
              ? "translate3d(calc(var(--x) / 30), calc(var(--y) / 30), 0)"
              : "none",
          }}
        >
          <img
            className="absolute inset-0 w-[120%] h-[120%] object-cover transition-opacity duration-600 ease-in-out"
            style={{ opacity: isActive ? 1 : 0.5 }}
            alt={title}
            src={src}
            onLoad={imageLoaded}
            loading="eager"
            decoding="sync"
          />
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-all duration-1000" />
          )}
        </div>

        {/* Bottom-left content */}
        <article
          className={`absolute bottom-0 left-0 p-4 sm:p-6 md:p-8 transition-all duration-700 ease-in-out ${
            isActive
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          {subtitle && (
            <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
              {subtitle}
            </p>
          )}
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold leading-tight mb-3 sm:mb-4">
            {title}
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onButtonClick?.();
            }}
            className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm text-white bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl hover:bg-white/25 transition duration-200"
          >
            {button}
          </button>
        </article>
      </li>
    </div>
  );
};

interface CarouselControlProps {
  type: string;
  title: string;
  handleClick: () => void;
}

const CarouselControl = ({
  type,
  title,
  handleClick,
}: CarouselControlProps) => {
  return (
    <button
      className={`w-10 h-10 flex items-center mx-2 justify-center bg-neutral-200 dark:bg-neutral-800 border-3 border-transparent rounded-full focus:border-[#6D64F7] focus:outline-none hover:-translate-y-0.5 active:translate-y-0.5 transition duration-200 ${
        type === "previous" ? "rotate-180" : ""
      }`}
      title={title}
      onClick={handleClick}
    >
      <IconArrowNarrowRight className="text-neutral-600 dark:text-neutral-200" />
    </button>
  );
};

interface CarouselProps {
  slides: SlideData[];
}

export default function Carousel({ slides }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch/swipe state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);

  const handlePreviousClick = useCallback(() => {
    setCurrent((c) => (c - 1 < 0 ? slides.length - 1 : c - 1));
  }, [slides.length]);

  const handleNextClick = useCallback(() => {
    setCurrent((c) => (c + 1 === slides.length ? 0 : c + 1));
  }, [slides.length]);

  const handleSlideClick = (index: number) => {
    if (current !== index) {
      setCurrent(index);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Only count as swipe if horizontal movement > vertical
    if (!isSwiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping.current = true;
    }

    if (isSwiping.current) {
      e.preventDefault();
      touchDeltaX.current = dx;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isSwiping.current) {
      const threshold = 50;
      if (touchDeltaX.current < -threshold) {
        handleNextClick();
      } else if (touchDeltaX.current > threshold) {
        handlePreviousClick();
      }
    }
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, [handleNextClick, handlePreviousClick]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePreviousClick();
      if (e.key === "ArrowRight") handleNextClick();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePreviousClick, handleNextClick]);

  const id = useId();

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[500px] sm:w-[70vmin] sm:max-w-none aspect-square mx-auto"
      aria-labelledby={`carousel-heading-${id}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <ul
        className="absolute inset-0 flex sm:mx-[-4vmin] transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${current * 100}%)`,
        }}
      >
        {slides.map((slide, index) => (
          <Slide
            key={index}
            slide={slide}
            index={index}
            current={current}
            handleSlideClick={handleSlideClick}
          />
        ))}
      </ul>

      {/* Controls */}
      <div className="absolute flex justify-center w-full top-[calc(100%+1rem)]">
        <CarouselControl
          type="previous"
          title="Go to previous slide"
          handleClick={handlePreviousClick}
        />

        {/* Dot indicators */}
        <div className="flex items-center gap-2 mx-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 h-2 bg-[#E07A3A]"
                  : "w-2 h-2 bg-neutral-400 dark:bg-neutral-600 hover:bg-neutral-500"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <CarouselControl
          type="next"
          title="Go to next slide"
          handleClick={handleNextClick}
        />
      </div>

      {/* Swipe hint on mobile */}
      <p className="sm:hidden absolute top-[calc(100%+3.5rem)] w-full text-center font-sans text-xs text-text-muted">
        Swipe to explore
      </p>
    </div>
  );
}
