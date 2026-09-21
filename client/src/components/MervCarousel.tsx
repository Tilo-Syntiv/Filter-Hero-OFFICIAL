import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Circle,
  X,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { MERV_TYPES, isMervKeyOnSale, mervTypesForDisplay, type MervTypeInfo } from "@shared/products";
import { scrollToHashTarget } from "@/hooks/useHashScroll";
import { MERV_GUIDE } from "@/lib/merv-guide";
import {
  setPreferredMerv,
  type PreferredMerv,
} from "@/lib/merv-pref";
import { cn } from "@/lib/utils";
import CaptureDots from "@/components/CaptureDots";
import MervBadge from "@/components/MervBadge";
import LifeImage from "@/components/LifeImage";
import { LIFE } from "@/data/life-photos";

type CaptureLevel = "yes" | "some" | "no";

const CARDS = mervTypesForDisplay();
const GUIDE = MERV_GUIDE;

const HOME_PICKS: {
  key: PreferredMerv;
  title: string;
  blurb: string;
  photo?: (typeof LIFE)[keyof typeof LIFE];
}[] = [
  { key: "8", title: "Everyday dust", blurb: "Pollen, lint, household dust", photo: LIFE.pollenSneeze },
  { key: "carbon", title: "Cooking smells", blurb: "Odors and smoke smell", photo: LIFE.familyCooking },
  { key: "11", title: "Pets", blurb: "Fur, dander, extra dust", photo: LIFE.petsDoorway },
  { key: "13", title: "Allergies", blurb: "Smoke, fine particles, asthma", photo: LIFE.ladyAsthma },
];

const COMPARE: { label: string; levels: Record<PreferredMerv, CaptureLevel> }[] =
  [
    {
      label: "Dust & lint",
      levels: { "8": "yes", "11": "yes", "13": "yes", carbon: "yes" },
    },
    {
      label: "Pollen",
      levels: { "8": "yes", "11": "yes", "13": "yes", carbon: "yes" },
    },
    {
      label: "Pet dander",
      levels: { "8": "some", "11": "yes", "13": "yes", carbon: "some" },
    },
    {
      label: "Mold spores",
      levels: { "8": "some", "11": "yes", "13": "yes", carbon: "some" },
    },
    {
      label: "Smoke & fine particles",
      levels: { "8": "no", "11": "some", "13": "yes", carbon: "no" },
    },
    {
      label: "Odors & VOCs",
      levels: { "8": "no", "11": "no", "13": "no", carbon: "yes" },
    },
  ];

function shopThisRating(key: PreferredMerv) {
  if (!isMervKeyOnSale(key)) {
    window.location.assign("/custom-air-filters");
    return;
  }
  setPreferredMerv(key);
  const onHome =
    window.location.pathname === "/" || window.location.pathname === "";
  if (onHome) {
    window.history.replaceState(null, "", "/#finder");
    scrollToHashTarget("finder");
    return;
  }
  window.location.assign("/#finder");
}

function LevelMark({
  level,
  color,
  legend,
}: {
  level: CaptureLevel;
  color: string;
  legend?: boolean;
}) {
  const mark =
    level === "yes" ? (
      <Check
        className={legend ? "h-3.5 w-3.5" : "h-4 w-4"}
        style={{ color }}
        strokeWidth={2.75}
      />
    ) : level === "some" ? (
      <Circle
        className="h-2.5 w-2.5"
        color={color}
        fill={color}
        strokeWidth={0}
      />
    ) : (
      <X
        className="h-3.5 w-3.5"
        style={{ color, opacity: legend ? 0.7 : 0.5 }}
        strokeWidth={2.5}
      />
    );

  return (
    <span
      className={legend ? "inline-flex items-center" : "mx-auto inline-flex"}
      aria-label={
        level === "yes"
          ? "Stops it well"
          : level === "some"
            ? "Catches some"
            : "Doesn't stop this"
      }
    >
      {mark}
    </span>
  );
}

function MervCard({
  type,
  selected,
  onSelect,
}: {
  type: MervTypeInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const guide = GUIDE[type.key];
  const Icon = guide.icon;
  const photo = HOME_PICKS.find((p) => p.key === type.key)?.photo;

  return (
    <article
      className={cn(
        "merv-tile flex h-full flex-col p-5 md:p-6",
        selected && "merv-tile-active",
      )}
      style={{ "--merv-wash": type.badgeColor } as CSSProperties}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col text-left"
      >
        {photo ? (
          <LifeImage
            photo={photo}
            className="mb-5 aspect-[4/3] rounded-xl"
            sizes="(max-width: 1024px) 80vw, 280px"
          />
        ) : null}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: `${guide.accent}22`, color: guide.accent }}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-white/50">
              {type.shortLabel}
            </p>
            <p className="mt-1 text-xs font-semibold text-ice">
              {isMervKeyOnSale(type.key)
                ? `from $${type.fromPrice.toFixed(2)}`
                : "Quote only"}
            </p>
          </div>
        </div>

        <MervBadge type={type} className="mb-4" />

        <h3 className="text-2xl font-bold tracking-tight text-white">
          {type.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-white/70">{guide.bestFor}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          {type.description}
        </p>

        <div className="mt-5">
          <p className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-white/40">
            Capture
          </p>
          <CaptureDots merv={type.key} />
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            {guide.efficiency}
          </p>
        </div>

        <ul className="mt-5 space-y-1.5">
          {guide.catches.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-white/80"
            >
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                style={{ color: guide.accent }}
                strokeWidth={2.75}
              />
              {item}
            </li>
          ))}
        </ul>
      </button>

      <button
        type="button"
        onClick={() => shopThisRating(type.key)}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-ice transition-colors hover:text-white"
      >
        {isMervKeyOnSale(type.key) ? "Shop this rating" : "Request a quote"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

export default function MervCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState<PreferredMerv>("11");
  const selectedType = MERV_TYPES.find((t) => t.key === selected)!;
  const selectedGuide = GUIDE[selected];

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const type = CARDS[api.selectedScrollSnap()];
      if (type) setSelected(type.key);
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const index = CARDS.findIndex((t) => t.key === selected);
    if (index >= 0 && api.selectedScrollSnap() !== index) api.scrollTo(index);
  }, [api, selected]);

  return (
    <section
      id="merv"
      className="brand-band scroll-mt-28 py-16 md:py-24"
      aria-labelledby="merv-heading"
    >
      <div className="container">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="section-label">What it catches</span>
            <h2
              id="merv-heading"
              className="text-3xl font-bold tracking-tight text-white md:text-4xl"
            >
              What should your filter catch?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
              Think of the filter as a screen. A tighter screen catches smaller
              stuff. Pick the one that matches your house — the MERV number on
              the box is just the rating name.
            </p>
          </div>
          <Link href="/how-often-to-change-air-filter" className="section-link">
            When to change it <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="lg:hidden">
          <Carousel
            setApi={setApi}
            opts={{ align: "start", loop: false }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {CARDS.map((type) => (
                <CarouselItem
                  key={type.key}
                  className="pl-4 basis-[88%] sm:basis-[48%]"
                >
                  <MervCard
                    type={type}
                    selected={type.key === selected}
                    onSelect={() => setSelected(type.key)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="band-arrow -left-3 hidden sm:flex disabled:opacity-30" />
            <CarouselNext className="band-arrow -right-3 hidden sm:flex disabled:opacity-30" />
          </Carousel>
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-4">
          {CARDS.map((type, i) => (
            <motion.div
              key={type.key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <MervCard
                type={type}
                selected={type.key === selected}
                onSelect={() => setSelected(type.key)}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] lg:items-stretch">
          <div
            className="merv-tile p-6 md:p-7"
            style={{ "--merv-wash": selectedType.badgeColor } as CSSProperties}
          >
            <MervBadge type={selectedType} className="mb-4" />
            <p
              className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em]"
              style={{ color: selectedGuide.accent }}
            >
              Why {selectedType.name}
            </p>
            <p className="mt-3 text-lg font-bold tracking-tight text-white">
              {selectedGuide.bestFor}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              {selectedGuide.note}
            </p>
            <button
              type="button"
              onClick={() => shopThisRating(selected)}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: selectedType.badgeColor }}
            >
              {isMervKeyOnSale(selected) ? "Find your size" : "Request a quote"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-xs leading-relaxed text-white/45">
              Size first. Your chosen rating will be waiting on the product page.
            </p>
          </div>

          <div
            className="merv-tile overflow-x-auto p-5 md:p-6"
            style={{ "--merv-wash": selectedType.badgeColor } as CSSProperties}
          >
            <p className="mb-3 text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-white/45">
              What it stops
            </p>
            <p className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.72rem] text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <LevelMark level="yes" color="#8eb0d8" legend />
                Stops it well
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LevelMark level="some" color="#8eb0d8" legend />
                Catches some
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LevelMark level="no" color="#8eb0d8" legend />
                Doesn't stop this
              </span>
            </p>
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-3 pr-3 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-white/40">
                    Particle
                  </th>
                  {CARDS.map((type) => (
                    <th key={type.key} className="pb-3 text-center">
                      <span
                        className="inline-flex w-full items-center justify-center rounded px-1.5 py-1 text-[0.62rem] font-extrabold italic leading-none text-white"
                        style={{ backgroundColor: type.badgeColor }}
                      >
                        {type.key === "carbon"
                          ? "8 Carbon"
                          : type.name.replace("MERV ", "")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.label} className="border-t border-white/10">
                    <td className="py-2.5 pr-3 text-white/75">{row.label}</td>
                    {CARDS.map((type) => (
                      <td
                        key={type.key}
                        className="py-2.5 text-center"
                        style={
                          type.key === selected
                            ? { backgroundColor: `${GUIDE[type.key].accent}22` }
                            : undefined
                        }
                      >
                        <LevelMark
                          level={row.levels[type.key]}
                          color={GUIDE[type.key].accent}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs leading-relaxed text-white/40">
              If the furnace is older, start with Everyday dust or Pets unless
              the manual says a tighter filter is OK.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
