import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CarouselDotsProps = {
  count: number;
  selected: number;
  onSelect: (index: number) => void;
  className?: string;
  /** Light dots for dark backgrounds */
  tone?: "dark" | "light";
};

const DOT_CAP = 8;

export default function CarouselDots({
  count,
  selected,
  onSelect,
  className,
  tone = "dark",
}: CarouselDotsProps) {
  if (count <= 1) return null;

  const light = tone === "light";

  if (count >= DOT_CAP) {
    const prev = (selected - 1 + count) % count;
    const next = (selected + 1) % count;
    return (
      <div
        className={cn("flex items-center justify-center gap-2", className)}
        role="group"
        aria-label="Carousel pagination"
      >
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => onSelect(prev)}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full",
            light ? "text-white" : "text-navy",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p
          className={cn(
            "min-w-16 text-center text-sm font-extrabold tabular-nums",
            light ? "text-white" : "text-navy",
          )}
          aria-live="polite"
        >
          {selected + 1} / {count}
        </p>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => onSelect(next)}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full",
            light ? "text-white" : "text-navy",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center gap-2", className)}
      role="tablist"
      aria-label="Carousel pagination"
    >
      {Array.from({ length: count }).map((_, i) => {
        const active = i === selected;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onSelect(i)}
            className={cn(
              "flex h-11 min-w-11 items-center justify-center",
            )}
          >
            <span
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                active ? "w-7" : "w-1.5 opacity-50 hover:opacity-80",
                light
                  ? active
                    ? "bg-ice"
                    : "bg-white"
                  : active
                    ? "bg-hero"
                    : "bg-navy/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
