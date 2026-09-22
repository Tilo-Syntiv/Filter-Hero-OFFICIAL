import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Calendar,
  Eye,
  Fan,
  Lightbulb,
  Package,
  Power,
  Wind,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import FilterPower from "@/components/FilterPower";
import FaqSection from "@/components/FaqSection";
import { getSiteUrl, useSeo } from "@/hooks/useSeo";
import { useHashScroll } from "@/hooks/useHashScroll";
import { BASE_DAYS, cadenceLabel, formatDepth } from "@/lib/filter-cadence";
import { BRAND_NAME } from "@/const";
import {
  CHANGE_GUIDE_FAQS,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildHowToChangeFilterSchema,
  buildSpeakableSchema,
  filterChangeGuideSeo,
} from "@shared/seo";
import LifeImage from "@/components/LifeImage";
import { LIFE, type LifePhoto } from "@/data/life-photos";
import { liveListPrice } from "@shared/products";
import { HVAC_WAIT_STAGES } from "@shared/hvac-overdue-costs";

const FLAGSHIP_FILTER_PRICE = liveListPrice("20x25x1", 8) ?? 9.99;

const TOC = [
  { href: "#cadence", label: "Your clock" },
  { href: "#why", label: "Why it matters" },
  { href: "#thickness", label: "By thickness" },
  { href: "#signs", label: "Signs" },
  { href: "#light-test", label: "Light test" },
  { href: "#how-to", label: "How to swap" },
  { href: "#wait", label: "If you wait" },
  { href: "#faq", label: "FAQ" },
];

const THICKNESS_LIFE = [
  {
    depth: 0.5,
    range: cadenceLabel(BASE_DAYS[0.5]),
    days: BASE_DAYS[0.5],
    note: "Shallow slot. Almost no extra media. Treat it like a 30-day chore.",
  },
  {
    depth: 1,
    range: cadenceLabel(BASE_DAYS[1]),
    days: BASE_DAYS[1],
    note: "The standard American filter. Pets and pollen pull you toward 30 days.",
  },
  {
    depth: 2,
    range: cadenceLabel(BASE_DAYS[2]),
    days: BASE_DAYS[2],
    note: "More pleats, more breathing room. A sweet spot for busy homes.",
  },
  {
    depth: 4,
    range: cadenceLabel(BASE_DAYS[4]),
    days: BASE_DAYS[4],
    note: "Media-cabinet territory. Still inspect monthly — don’t trust the calendar alone.",
  },
  {
    depth: 5,
    range: cadenceLabel(BASE_DAYS[5]),
    days: BASE_DAYS[5],
    note: "High-capacity racks. One filter can cover a heating season and a cooling season.",
  },
];

const PILLARS: {
  k: string;
  title: string;
  body: string;
  source: string;
  photo: LifePhoto;
}[] = [
  {
    k: "01",
    title: "The air you actually breathe",
    body: "Americans spend about 90% of their time indoors. A loaded filter stops capturing dust, dander, pollen, and smoke — and starts letting that mix recirculate.",
    source: "EPA indoor air guidance",
    photo: LIFE.sickCough,
  },
  {
    k: "02",
    title: "The system that moves it",
    body: `A clogged filter starves the blower. The motor, coils, and heat exchanger work harder, run hotter, and fail sooner. A $${FLAGSHIP_FILTER_PRICE.toFixed(2)} filter is cheaper than a service call.`,
    source: "HVAC maintenance reality",
    photo: LIFE.filterFurnace,
  },
  {
    k: "03",
    title: "The bill on the fridge",
    body: "The U.S. Department of Energy notes a dirty filter can lift cooling costs 5–15%. The system runs longer to hit the same setpoint. You pay for air that never arrives.",
    source: "energy.gov",
    photo: LIFE.filterClogged,
  },
];

const SIGNS = [
  {
    title: "The media went gray",
    body: "White when new. Storm-cloud when done. If you can’t see the original color, swap it.",
  },
  {
    title: "No light through the pleats",
    body: "Hold it to a lamp. If the glow dies, the filter is a wall, not a sieve.",
  },
  {
    title: "Vents feel weak",
    body: "Rooms that used to throw cold air now whisper. Restricted return air is a classic clog.",
  },
  {
    title: "Rooms don’t match",
    body: "Upstairs sauna, downstairs cave. Uneven temps often start at a packed filter.",
  },
  {
    title: "Short cycling",
    body: "The system slams on and off. It’s fighting for airflow it no longer has.",
  },
  {
    title: "A whistle at the slot",
    body: "Air screaming through a blocked media sounds like a kettle. Time’s up.",
  },
  {
    title: "Dust on everything",
    body: "Furniture films over in a week. The filter isn’t catching — or air is bypassing it.",
  },
  {
    title: "Allergies flare at home",
    body: "Symptoms that ease outdoors and spike indoors are a filter problem until proven otherwise.",
  },
  {
    title: "The bill jumped",
    body: "No new thermostat habits, same weather, higher kWh. Check the filter before you blame the utility.",
  },
  {
    title: "The house smells stale",
    body: "Musty return air means saturated media. Carbon helps odors — but only while the carbon is fresh.",
  },
];

const STEPS: { num: string; title: string; body: string; icon: ReactNode }[] = [
  {
    num: "01",
    title: "Kill the system",
    body: "Set the thermostat to off. You’re about to open the lungs of the house — don’t let the blower pull while the slot is empty.",
    icon: <Power className="h-5 w-5" />,
  },
  {
    num: "02",
    title: "Find the slot",
    body: "Wall or ceiling return grille, or a rack on the furnace / air handler. Big homes often have more than one. Change every filter, not just the obvious one.",
    icon: <Eye className="h-5 w-5" />,
  },
  {
    num: "03",
    title: "Read the frame",
    body: "Size is printed as Width × Length × Depth. Photograph it. Note the airflow arrow — it points toward the equipment, not toward the room.",
    icon: <Package className="h-5 w-5" />,
  },
  {
    num: "04",
    title: "Light-test the old one",
    body: "Slide it out. Hold it to a lamp. Gray, torn, wet, or opaque? It does not go back in.",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    num: "05",
    title: "Seat the new one",
    body: "Arrow toward the furnace. Snug in the rack, no bent cardboard, no gaps at the edges. Restore power. Feel a vent — the house should exhale again.",
    icon: <Fan className="h-5 w-5" />,
  },
];

function LightTest() {
  const [load, setLoad] = useState(28);
  const verdict =
    load < 35
      ? { title: "Still breathing", body: "Light still punches through. Keep it — and check again next month." }
      : load < 70
        ? { title: "Swap this week", body: "The glow is fading. Order now so you’re not hunting a size on a hot Saturday." }
        : { title: "Change tonight", body: "That’s a wall. The system is lifting weights it was never meant to lift." };

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
      <div className="relative overflow-hidden rounded-3xl bg-deep-fill lg:col-span-7">
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 50% 18%, rgba(255,244,214,${0.55 - load / 220}) 0%, transparent 42%)`,
          }}
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <p className="mb-6 text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-ice">
            Hold it to the light
          </p>
          <div className="mx-auto max-w-md">
            <div className="light-test-frame relative mx-auto aspect-[16/10] overflow-hidden rounded-md border border-white/20 bg-[#f4f1ea]">
              <div className="absolute inset-0 light-test-pleats" />
              <div
                className="absolute inset-0 transition-[background] duration-200"
                style={{
                  background: `linear-gradient(180deg, rgba(45,40,32,${load / 135}), rgba(20,18,14,${load / 110}))`,
                }}
              />
              <div
                className="absolute inset-0 mix-blend-screen transition-opacity duration-200"
                style={{
                  opacity: Math.max(0, 0.55 - load / 160),
                  background:
                    "radial-gradient(ellipse at 50% 0%, rgba(255,236,180,0.9), transparent 55%)",
                }}
              />
            </div>
          </div>
          <label className="mt-8 block">
            <span className="mb-2 block text-center text-xs font-bold uppercase tracking-[0.14em] text-white/70">
              Drag the dirt
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={load}
              onChange={(e) => setLoad(Number(e.target.value))}
              className="light-test-slider w-full"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={load}
              aria-label="Filter dirt level"
            />
          </label>
        </div>
      </div>
      <div className="lg:col-span-5">
        <span className="section-label">The 10-second test</span>
        <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
          If light can’t get through, air can’t either.
        </h2>
        <p className="mb-6 max-w-md text-muted-foreground leading-relaxed">
          Pull the filter. Stand under a lamp. A living filter still glows between
          the pleats. A dead one is a silhouette. No app required.
        </p>
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-hero">
            Verdict
          </p>
          <p className="mt-1 text-xl font-extrabold tracking-tight">{verdict.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {verdict.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FilterChangeGuidePage() {
  const siteUrl = getSiteUrl();
  const seo = filterChangeGuideSeo(siteUrl);
  const [activeDepth, setActiveDepth] = useState(1);
  useHashScroll();

  useSeo({
    ...seo,
    type: "article",
    jsonLd: [
      buildBreadcrumbSchema(siteUrl, [
        { name: "Home", path: "/" },
        { name: "When to change your filter", path: seo.path },
      ]),
      buildArticleSchema(siteUrl, seo),
      buildHowToChangeFilterSchema(siteUrl),
      buildFaqSchema(CHANGE_GUIDE_FAQS),
      buildSpeakableSchema(siteUrl, [
        ".seo-answer",
        ".seo-speakable-q",
        ".seo-speakable-a",
      ], { path: seo.path, name: seo.title }),
    ],
  });

  const activeLife =
    THICKNESS_LIFE.find((t) => t.depth === activeDepth) ?? THICKNESS_LIFE[1];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="brand-band page-hero">
          <div className="page-hero-glow" aria-hidden />
          <div className="container relative py-12 md:py-16">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/60">
              <Link href="/" className="hover:text-white">
                Home
              </Link>{" "}
              / When to change
            </nav>
            <div className="mb-2 grid items-start gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
            <span className="section-label !text-ice">Filter Clock</span>
            <h1 className="mb-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Every filter runs on a charge.
            </h1>
            <p className="seo-answer mb-8 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
              Most homes should change a 1-inch HVAC filter every 30 to 90 days.
              Pets, allergies, dust, and a system that runs hard pull you toward
              30. A 2-inch filter often lasts 120 days; 4-inch media lasts 270
              days and 5-inch media lasts 330 days in a quiet house. Inspect
              monthly either way — the calendar is a guess, the filter is the
              evidence.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#cadence" className="hero-shop-btn text-white">
                Get your number
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/#finder" className="hero-ghost-btn">
                Shop your size
              </Link>
            </div>
              </div>
              <div className="hidden gap-2 lg:col-span-5 lg:grid grid-cols-2">
                <LifeImage
                  photo={LIFE.sickCough}
                  className="col-span-2 h-40 rounded-2xl"
                  sizes="400px"
                />
                <LifeImage
                  photo={LIFE.petsSleep}
                  className="h-28 rounded-2xl"
                  sizes="200px"
                />
                <LifeImage
                  photo={LIFE.filterCleanDirty}
                  className="h-28 rounded-2xl"
                  sizes="200px"
                />
              </div>
            </div>
            <nav
              aria-label="On this page"
              className="mt-10 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TOC.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full border border-white/20 bg-white/8 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-ice hover:border-ice hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section id="cadence" className="sheet-section scroll-mt-28 py-12 md:py-16">
          <div className="container">
            <div className="mb-8 grid items-end gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <span className="section-label">Tell us about your home</span>
                <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                  When's your next filter change?
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Thickness sets the baseline. Pets, people, allergies, dust, and a
                  fan that never shuts off pull the date closer. Flip the drums to
                  see every change date this year — not a brochure average.
                </p>
              </div>
              <div className="hidden gap-2 sm:flex lg:col-span-5 lg:justify-end">
                <LifeImage
                  photo={LIFE.womanDog}
                  className="h-24 w-36 rounded-2xl"
                  sizes="150px"
                />
                <LifeImage
                  photo={LIFE.asthmaInhaler}
                  className="h-24 w-36 rounded-2xl"
                  sizes="150px"
                />
              </div>
            </div>
            <FilterPower />
          </div>
        </section>

        <section id="why" className="sheet-section scroll-mt-28 py-16 md:py-24">
          <div className="container">
            <span className="section-label">Three jobs, one rectangle</span>
            <h2 className="mb-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              A dirty filter doesn’t just look bad. It taxes the whole house.
            </h2>
            <p className="mb-10 max-w-2xl text-muted-foreground leading-relaxed">
              Replacement isn’t a personality trait. It’s indoor air, equipment
              life, and the power bill — in that order.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {PILLARS.map((p) => (
                <article
                  key={p.k}
                  className="relative min-h-[17rem] overflow-hidden rounded-2xl bg-navy-fill p-6 text-white"
                >
                  <img
                    src={p.photo.src}
                    alt=""
                    width={p.photo.width}
                    height={p.photo.height}
                    className="pillar-photo"
                    style={
                      p.photo.position
                        ? { objectPosition: p.photo.position }
                        : undefined
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-fill/95 via-navy-fill/65 to-navy-fill/25" />
                  <span className="absolute right-4 top-3 z-[1] text-4xl font-extrabold text-white/10">
                    {p.k}
                  </span>
                  <h3 className="relative z-[1] mb-3 text-xl font-bold tracking-tight">
                    {p.title}
                  </h3>
                  <p className="relative z-[1] text-sm leading-relaxed text-white/80">
                    {p.body}
                  </p>
                  <p className="relative z-[1] mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-ice">
                    {p.source}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="thickness" className="scroll-mt-28 py-16 md:py-24">
          <div className="container">
            <span className="section-label">Media depth</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Thicker filters live longer. That’s physics, not marketing.
            </h2>
            <p className="mb-10 max-w-2xl text-muted-foreground leading-relaxed">
              Extra inches mean extra pleat area. Particles have more places to
              land before the filter becomes a dam. Tap a thickness — the bar is
              lifespan, not price.
            </p>
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-7">
                {THICKNESS_LIFE.map((t) => {
                  const on = t.depth === activeDepth;
                  return (
                    <button
                      key={t.depth}
                      type="button"
                      onClick={() => setActiveDepth(t.depth)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${
                        on
                          ? "border-ice bg-white shadow-md ring-2 ring-ice/40"
                          : "border-border/80 bg-white/80 hover:border-ice/50"
                      }`}
                    >
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="text-lg font-extrabold tracking-tight">
                          {formatDepth(t.depth)}
                        </span>
                        <span className="text-sm font-bold text-primary">{t.range}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#264478,#8eb0d8)] transition-all duration-500"
                          style={{ width: `${(t.days / 365) * 100}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              <aside className="rounded-3xl bg-[linear-gradient(135deg,#264478_0%,#8eb0d8_140%)] p-6 text-white lg:col-span-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/80">
                  {formatDepth(activeLife.depth)} baseline
                </p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight">
                  {activeLife.range}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/90">
                  {activeLife.note}
                </p>
                <Link
                  href={`/filters/${activeLife.depth}-inch`}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-white hover:underline"
                >
                  Shop {formatDepth(activeLife.depth)} filters
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section id="signs" className="scroll-mt-28 py-16 md:py-24">
          <div className="container">
            <span className="section-label">The house will tell you</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Ten signs the power already ran out.
            </h2>
            <p className="mb-10 max-w-2xl text-muted-foreground leading-relaxed">
              Ignore the calendar if the house is already complaining. Any one of
              these is enough to pull the filter today.
            </p>
            <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                LIFE.filterGlove,
                LIFE.filterHold,
                LIFE.filterWrecked,
                LIFE.filterMonths,
              ].map((photo) => (
                <LifeImage
                  key={photo.src}
                  photo={photo}
                  className="h-28 rounded-2xl sm:h-32"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {SIGNS.map((sign, i) => (
                <article
                  key={sign.title}
                  className="rounded-2xl border border-border/80 bg-white/85 p-4 transition-shadow hover:shadow-md"
                >
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-hero">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mb-2 text-base font-bold tracking-tight">{sign.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {sign.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="light-test" className="scroll-mt-28 py-16 md:py-24">
          <div className="container">
            <LightTest />
          </div>
        </section>

        <section id="how-to" className="scroll-mt-28 py-16 md:py-24">
          <div className="container">
            <span className="section-label">The swap</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Five minutes. No tools. Arrow toward the unit.
            </h2>
            <p className="mb-10 max-w-2xl text-muted-foreground leading-relaxed">
              Changing a filter is the cheapest HVAC skill you can learn. Do it
              once the right way and you’ll never install one backwards again.
            </p>
            <div className="mb-8 grid gap-2 sm:grid-cols-3">
              <LifeImage
                photo={LIFE.installWall}
                className="h-36 rounded-2xl"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <LifeImage
                photo={LIFE.filterSwap}
                className="h-36 rounded-2xl"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <LifeImage
                photo={LIFE.installCeiling}
                className="h-36 rounded-2xl"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {STEPS.map((step) => (
                <article
                  key={step.num}
                  className="relative rounded-2xl border border-border/80 bg-white/85 p-5"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-deep-fill text-ice">
                    {step.icon}
                  </div>
                  <span className="absolute right-4 top-4 text-3xl font-extrabold leading-none text-muted/80">
                    {step.num}
                  </span>
                  <h3 className="mb-2 text-base font-bold tracking-tight">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="wait" className="scroll-mt-28 py-16 md:py-24">
          <div className="container">
            <span className="section-label">The overdue curve</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Waiting doesn’t save money. It relocates the invoice.
            </h2>
            <p className="mb-10 max-w-2xl text-muted-foreground leading-relaxed">
              A late filter is quiet at first. Then it’s the energy bill. Then
              it’s a technician. Repair ranges below are typical residential
              ballparks — your house may be kinder, or meaner.
            </p>
            <LifeImage
              photo={LIFE.filterMonths}
              className="mb-8 h-36 rounded-2xl sm:h-44"
              imgClassName="object-contain bg-white"
              sizes="(max-width: 1200px) 100vw, 1120px"
            />
            <div className="grid gap-3 md:grid-cols-4">
              {HVAC_WAIT_STAGES.map((stage, i) => (
                <article
                  key={stage.when}
                  className={`overdue-stage-card p-5 ${
                    i === 3
                      ? "overdue-stage-card-late"
                      : i === 2
                        ? "overdue-stage-card-mid"
                        : ""
                  }`}
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                    {stage.when}
                  </p>
                  <p className="mt-2 text-lg font-extrabold tracking-tight">{stage.cost}</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/85">{stage.what}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sheet-section py-16 md:py-24">
          <div className="container">
            <span className="section-label">Stay on it</span>
            <h2 className="mb-10 text-3xl font-bold tracking-tight md:text-4xl">
              Make the next change inevitable.
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-border/80 bg-white/85 p-6">
                <Calendar className="mb-4 h-6 w-6 text-primary" />
                <h3 className="mb-2 text-lg font-bold tracking-tight">First-of-month peek</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  One recurring phone alert. You don’t have to change it every
                  time — you only have to look. The light test decides.
                </p>
              </article>
              <article className="rounded-2xl border border-border/80 bg-white/85 p-6">
                <Package className="mb-4 h-6 w-6 text-primary" />
                <h3 className="mb-2 text-lg font-bold tracking-tight">Keep a spare in the house</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Bulk packs exist so the next filter is already in the closet
                  when the current one dies. {BRAND_NAME} prices drop as the
                  quantity goes up.
                </p>
              </article>
              <article className="rounded-2xl border border-border/80 bg-white/85 p-6">
                <Wind className="mb-4 h-6 w-6 text-primary" />
                <h3 className="mb-2 text-lg font-bold tracking-tight">Go thicker if you can</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  If the rack allows 2" or 4", you buy back months of life.
                  Don’t force a thick filter into a 1" slot — measure, then shop.
                </p>
              </article>
            </div>
          </div>
        </section>

        <div className="sheet-section">
          <FaqSection
            faqs={CHANGE_GUIDE_FAQS}
            title="Filter-change questions"
            subtitle="Straight answers on timing, MERV, pets, and what happens if you wait."
          />
        </div>

        <section className="brand-band py-20 md:py-28 relative overflow-hidden">
          <div className="container relative text-center">
            <span className="section-label">Know the date. Know the size.</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Find the filter that keeps the power on.
            </h2>
            <p className="text-base md:text-lg text-white/70 mb-8 max-w-xl mx-auto leading-relaxed">
              Exact Width × Length × Depth. MERV 8, 11, or 13. A spare in
              the closet beats a clogged filter on a 95° day.
            </p>
            <Link
              href="/#finder"
              className="hero-shop-btn inline-flex h-12 items-center justify-center px-8 text-white"
            >
              Find your size
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer pt-8 mt-4">
        <div className="container flex flex-col gap-4 text-sm sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {BRAND_NAME}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="section-link !text-ice hover:!text-white">
              Home
            </Link>
            <Link href="/sizes" className="section-link !text-ice hover:!text-white">
              All sizes
            </Link>
          </div>
        </div>
      </footer>
      <CartDrawer
        onRequestQuote={() => {
          window.location.href = "/#contact";
        }}
      />
    </div>
  );
}
