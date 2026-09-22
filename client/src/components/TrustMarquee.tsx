import { Truck, ShieldCheck, Crosshair, MessageCircle, Sparkles, Hammer, type LucideIcon } from "lucide-react";

const FEATURED = {
  icon: Truck,
  label: "2–3 DAY DELIVERY",
  hint: "Contiguous US",
};

const ITEMS = [
  { icon: ShieldCheck, label: "Exact-fit catalog sizes" },
  { icon: Crosshair, label: "All Sizes Available" },
  { icon: Hammer, label: "Built To Last" },
  { icon: Sparkles, label: "MERV 8 · MERV 8 Carbon · MERV 11 · MERV 13" },
  { icon: MessageCircle, label: "Real HVAC support" },
];

function ShipChip() {
  const Icon = FEATURED.icon;
  return (
    <span className="trust-ship-chip">
      <span className="trust-chip-icon trust-chip-icon-hero">
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="flex flex-col leading-none">
        <span>{FEATURED.label}</span>
        <span className="mt-0.5 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/80">
          {FEATURED.hint}
        </span>
      </span>
    </span>
  );
}

function TrustChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="trust-chip">
      <span className="trust-chip-icon trust-chip-icon-ice">
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </span>
      {label}
    </span>
  );
}

function MarqueeSequence() {
  return (
    <>
      <ShipChip />
      {ITEMS.slice(0, 2).map((item) => (
        <TrustChip key={item.label} {...item} />
      ))}
      <ShipChip />
      {ITEMS.slice(2).map((item) => (
        <TrustChip key={item.label} {...item} />
      ))}
    </>
  );
}

export default function TrustMarquee() {
  return (
    <div className="trust-marquee" aria-label="Trust highlights">
      <p className="sr-only">
        {FEATURED.label} in the {FEATURED.hint}. {ITEMS.map((item) => item.label).join(". ")}.
      </p>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-deep-fill to-transparent md:w-16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-mesh to-transparent md:w-16"
        aria-hidden
      />

      <div className="marquee-track trust-marquee-track flex w-max items-center py-3.5 md:py-5">
        <div className="flex items-center gap-4 pr-4 md:gap-6 md:pr-6" aria-hidden>
          <MarqueeSequence />
        </div>
        <div className="marquee-dup flex items-center gap-4 pr-4 md:gap-6 md:pr-6" aria-hidden>
          <MarqueeSequence />
        </div>
      </div>
    </div>
  );
}
