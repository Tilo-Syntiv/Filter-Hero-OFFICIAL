import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { CHANGE_GUIDE_PATH } from "@shared/seo";
import { liveListPrice } from "@shared/products";
import {
  HVAC_DIRTY_FILTER_ENERGY,
  HVAC_OVERDUE_HEADLINE,
  HVAC_OVERDUE_KICKER,
  HVAC_OVERDUE_SUB,
  HVAC_REAL_REPAIRS,
  HVAC_WAIT_STAGES,
} from "@shared/hvac-overdue-costs";
import { cn } from "@/lib/utils";

const FLAGSHIP_FILTER_PRICE = liveListPrice("20x25x1", 8) ?? 9.99;
const FILTER_PRICE_LABEL = `$${FLAGSHIP_FILTER_PRICE.toFixed(2)}`;
/** Highest sticker shock on the board — compressor / exchanger tier. */
const WORST_REPAIR = HVAC_REAL_REPAIRS[3];

/**
 * Home brand-band: skip-a-change repair costs.
 * Same shared copy as size PDP / change guide — filter price is the hero.
 */
export default function OverdueCostsBand() {
  return (
    <section
      id="overdue-costs"
      className="brand-band overdue-band relative overflow-hidden py-16 md:py-24"
      aria-labelledby="overdue-costs-heading"
    >
      <div className="overdue-band-glow" aria-hidden />
      <div className="container relative">
        <div className="mb-8 max-w-3xl md:mb-10">
          <span className="section-label">{HVAC_OVERDUE_KICKER}</span>
          <h2
            id="overdue-costs-heading"
            className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-[2.75rem]"
          >
            {HVAC_OVERDUE_HEADLINE}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-white/65 md:text-lg">
            {HVAC_OVERDUE_SUB}
          </p>
        </div>

        <div className="overdue-band-hero">
          <div className="overdue-band-hero-filter">
            <p className="overdue-band-hero-kicker">One Filter Hero filter</p>
            <p className="overdue-band-hero-price">{FILTER_PRICE_LABEL}</p>
            <p className="overdue-band-hero-tag">Typical 20×25×1 MERV 8 list</p>
          </div>

          <div className="overdue-band-hero-vs" aria-hidden>
            <span>VS</span>
          </div>

          <div className="overdue-band-hero-repair">
            <p className="overdue-band-hero-kicker overdue-band-hero-kicker-warn">
              One skipped change can become
            </p>
            <p className="overdue-band-hero-price overdue-band-hero-price-warn">
              {WORST_REPAIR.price}
            </p>
            <p className="overdue-band-hero-tag">{WORST_REPAIR.name}</p>
          </div>
        </div>

        <p className="overdue-band-punch">
          A <span>{FILTER_PRICE_LABEL}</span> filter is cheaper than any line
          below.
        </p>

        <ul className="overdue-band-repairs">
          {HVAC_REAL_REPAIRS.map((row) => (
            <li key={row.name}>
              <div>
                <p className="overdue-band-repair-name">{row.name}</p>
                <p className="overdue-band-repair-note">{row.note}</p>
              </div>
              <p className="overdue-band-repair-price">{row.price}</p>
            </li>
          ))}
        </ul>

        <p className="overdue-band-doe">
          Dirty filter → cooling costs up {HVAC_DIRTY_FILTER_ENERGY} (U.S. DOE)
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HVAC_WAIT_STAGES.map((stage, i) => (
            <article
              key={stage.when}
              className={cn(
                "rounded-2xl border border-white/15 px-4 py-4 text-white",
                i === 3
                  ? "bg-hero/90"
                  : i === 2
                    ? "bg-navy/80"
                    : "bg-deep/70",
              )}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                {stage.when}
              </p>
              <p className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">
                {stage.cost}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/80">{stage.what}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/#finder"
            className="hero-shop-btn hero-shop-btn-glow inline-flex h-12 items-center justify-center px-7 text-base text-white"
          >
            Shop a filter that fits
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={CHANGE_GUIDE_PATH} className="section-link">
            Full overdue curve <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
