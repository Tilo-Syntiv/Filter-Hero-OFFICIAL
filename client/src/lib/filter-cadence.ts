export type Thickness = 0.5 | 1 | 2 | 4 | 5;
export type MervKey = "8" | "11" | "13" | "carbon";
export type Pets = "none" | "one" | "pack";
export type Occupants = "quiet" | "family" | "full";
export type SqftBand = "small" | "medium" | "large";

export type CadenceInput = {
  depth: Thickness;
  merv: MervKey;
  pets: Pets;
  occupants: Occupants;
  kids: boolean;
  sqft: SqftBand;
  allergies: boolean;
  smoking: boolean;
  fanOn: boolean;
  dusty: boolean;
  smokeSeason: boolean;
  renovation: boolean;
};

export type CadenceHit = {
  label: string;
  detail: string;
  /** Percentage effect on runtime: negative drains power, positive is a bonus. */
  impactPct: number;
};

export type HouseType = {
  id: string;
  name: string;
  line: string;
};

export type CadenceResult = {
  days: number;
  label: string;
  nextDate: string;
  nextShort: string;
  nextIso: string;
  recommendedMerv: MervKey;
  recommendedMervName: string;
  inspectDays: number;
  hits: CadenceHit[];
  loadHint: string;
  house: HouseType;
  yearCount: number;
  packQty: number;
  packHeadline: string;
  packDetail: string;
  /** 0-100. How much of this thickness's max runtime you're keeping, after every drain/bonus. */
  capacityPct: number;
};

export const YEAR_PACKS = [1, 2, 4, 6, 12] as const;

/** Quiet-house full-charge days for each thickness. Clock and copy both use this. */
export const BASE_DAYS: Record<Thickness, number> = {
  0.5: 30,
  1: 90,
  2: 120,
  4: 270,
  5: 330,
};

const MERV_NAME: Record<MervKey, string> = {
  "8": "MERV 8",
  "11": "MERV 11",
  "13": "MERV 13",
  carbon: "MERV 8 Carbon",
};

export const DEFAULT_CADENCE: CadenceInput = {
  depth: 1,
  merv: "8",
  pets: "none",
  occupants: "quiet",
  kids: false,
  sqft: "medium",
  allergies: false,
  smoking: false,
  fanOn: false,
  dusty: false,
  smokeSeason: false,
  renovation: false,
};

export const SQFT_BANDS: { id: SqftBand; label: string; hint: string }[] = [
  { id: "small", label: "Under 1,200 sq ft", hint: "Cozy home or condo" },
  { id: "medium", label: "1,200–2,500 sq ft", hint: "Typical single family" },
  { id: "large", label: "2,500+ sq ft", hint: "Larger footprint, bigger system" },
];

function roundCadence(days: number, depth: Thickness): number {
  const min = depth === 0.5 ? 21 : 30;
  const max = BASE_DAYS[depth];
  const clamped = Math.min(max, Math.max(min, days));
  // An undrained filter keeps the thickness baseline (½" stays 30, not 28).
  if (clamped >= max - 0.001) return max;
  const step = clamped < 50 ? 7 : 15;
  const rounded = Math.round(clamped / step) * step;
  return Math.min(max, Math.max(min, rounded));
}

/** Always the engine number — never a month bucket that disagrees with the calendar. */
export function cadenceLabel(days: number): string {
  return `Every ${days} days`;
}

/** Days until upcoming change `index` (0 = next swap). Matches the calendar list. */
export function swapWaitDays(cadenceDays: number, index: number): number {
  return cadenceDays * (index + 1);
}

export function recommendMerv(input: CadenceInput): MervKey {
  if (input.smoking) return "carbon";
  if (input.allergies || input.smokeSeason) return "13";
  if (input.pets !== "none" || input.dusty || input.renovation) return "11";
  return "8";
}

export function yearFilterCount(days: number): number {
  return Math.max(1, Math.round(365 / days));
}

export function suggestedPackQty(days: number): number {
  const need = yearFilterCount(days);
  return YEAR_PACKS.find((n) => n >= need) ?? 12;
}

export function houseType(input: CadenceInput): HouseType {
  if (input.renovation) {
    return {
      id: "reno",
      name: "Reno Dust",
      line: "Drywall and sawdust clog a filter fast. Keep a spare in the closet.",
    };
  }
  if (input.smokeSeason) {
    return {
      id: "wildfire",
      name: "Wildfire Week",
      line: "Inspect weekly until the air clears.",
    };
  }
  if (input.smoking) {
    return {
      id: "smoke",
      name: "Smoke House",
      line: "Fine particles saturate media. Carbon earns its keep.",
    };
  }
  if (input.pets === "pack") {
    return {
      id: "pack",
      name: "The Pack House",
      line: "Pack shedding cuts life almost in half.",
    };
  }
  if (input.allergies) {
    return {
      id: "allergy",
      name: "Allergy Watch",
      line: "Swap earlier so capture stays high.",
    };
  }
  if (input.pets === "one") {
    return {
      id: "pet",
      name: "One-Pet House",
      line: "Hair and dander load the pleats faster.",
    };
  }
  if (input.kids) {
    return {
      id: "kids",
      name: "Kids in the House",
      line: "Little hands, open doors, extra dust in the mix.",
    };
  }
  if (input.fanOn) {
    return {
      id: "fan",
      name: "Fan Always On",
      line: "Air hits the filter around the clock.",
    };
  }
  if (input.dusty) {
    return {
      id: "dust",
      name: "Dust Belt",
      line: "Outdoor grit rides in on every cycle.",
    };
  }
  if (input.occupants === "full") {
    return {
      id: "busy",
      name: "Busy House",
      line: "Five or more people accelerate soiling.",
    };
  }
  if (input.occupants === "family") {
    return {
      id: "family",
      name: "Family House",
      line: "More bodies, more indoor dust.",
    };
  }
  if (input.depth >= 4) {
    return {
      id: "thick",
      name: "Thick Media",
      line: "One filter can cover a season. Still peek monthly.",
    };
  }
  return {
    id: "quiet",
    name: "The Quiet Two",
    line: "A typical cadence. Inspect on the first of each month.",
  };
}

function mervLoad(input: CadenceInput): number {
  const thick = input.depth >= 4;
  if (input.merv === "13") return thick ? 0.94 : 0.85;
  if (input.merv === "11") return thick ? 0.97 : 0.92;
  if (input.merv === "carbon") return 0.9;
  return 1;
}

export function computeCadence(input: CadenceInput, from = new Date()): CadenceResult {
  const hits: CadenceHit[] = [
    {
      label: `${formatDepth(input.depth)} media`,
      detail: `${BASE_DAYS[input.depth]}-day full-charge baseline`,
      impactPct: 0,
    },
  ];

  let life = BASE_DAYS[input.depth];

  const apply = (multiplier: number, label: string, detail: string) => {
    if (Math.abs(multiplier - 1) < 0.01) return;
    life *= multiplier;
    hits.push({
      label,
      detail,
      impactPct: Math.round((multiplier - 1) * 100),
    });
  };

  if (input.pets === "one") apply(0.75, "One pet", "Hair and dander load the pleats faster");
  if (input.pets === "pack") apply(0.55, "Multiple pets", "Pack shedding cuts life almost in half");
  if (input.occupants === "family") apply(0.85, "Family of 3–4", "More bodies, more indoor dust");
  if (input.occupants === "full") apply(0.7, "Busy house", "Five or more people accelerate soiling");
  if (input.kids) apply(0.85, "Kids at home", "More hands, more doors, more dust tracked in");
  if (input.sqft === "large") apply(0.9, "2,500+ sq ft", "A bigger system moves more air through the media");
  if (input.sqft === "small") apply(1.08, "Under 1,200 sq ft", "Smaller system, lighter duty cycle");
  if (input.allergies) apply(0.75, "Allergies / asthma", "Swap earlier so capture stays high");
  if (input.smoking) apply(0.65, "Indoor smoke", "Fine particles and odors saturate media");
  if (input.fanOn) apply(0.8, "Fan always on", "Air hits the filter around the clock");
  if (input.dusty) apply(0.7, "Dusty or dry climate", "Outdoor grit rides in on every cycle");
  if (input.smokeSeason) apply(0.6, "Smoke / wildfire season", "Inspect weekly until the air clears");
  if (input.renovation) apply(0.55, "Construction dust", "Drywall and sawdust clog a filter fast");

  const mervFactor = mervLoad(input);
  if (mervFactor < 0.99) {
    apply(
      mervFactor,
      MERV_NAME[input.merv],
      input.depth >= 4
        ? "Higher MERV on thick media still lasts"
        : "Tighter pleats load a little sooner",
    );
  }

  const days = roundCadence(life, input.depth);
  const next = addLocalDays(from, days);

  const rec = recommendMerv(input);
  const house = houseType(input);
  const yearCount = yearFilterCount(days);
  const packQty = suggestedPackQty(days);
  const capacityPct = Math.min(
    100,
    Math.max(4, Math.round((life / BASE_DAYS[input.depth]) * 100)),
  );
  const loadHint =
    days <= 45
      ? "This home runs hot. Keep a spare in the closet."
      : days <= 90
        ? "A typical cadence. Inspect on the first of each month."
        : "Thick media is doing the work. Still peek at it monthly.";

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");

  return {
    days,
    label: cadenceLabel(days),
    nextDate: new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(next),
    nextShort: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(next),
    nextIso: `${y}${m}${d}`,
    recommendedMerv: rec,
    recommendedMervName: MERV_NAME[rec],
    inspectDays: days <= 45 ? 14 : 30,
    hits,
    loadHint,
    house,
    yearCount,
    packQty,
    packHeadline: `Every ${days} days.`,
    packDetail:
      yearCount === 1
        ? `That's ${days} days per filter — about one a year. Still inspect monthly.`
        : packQty === yearCount
          ? `${yearCount} changes a year at ${days} days each. Shop a ${packQty}-pack.`
          : `${yearCount} changes a year at ${days} days each. A ${packQty}-pack covers you with a spare.`,
    capacityPct,
  };
}

export function formatDepth(depth: number): string {
  return depth === 0.5 ? '½"' : `${depth}"`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole local calendar days from `from` to `target`. DST-safe. */
export function calendarDaysUntil(target: Date, from = new Date()): number {
  const ms = startOfLocalDay(target).getTime() - startOfLocalDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsStamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function isoDate(date: Date): string {
  const local = startOfLocalDay(date);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function isoDash(date: Date): string {
  const local = startOfLocalDay(date);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function endOfEvent(date: Date): Date {
  return addLocalDays(date, 1);
}

/** Next N swap dates, evenly spaced `result.days` apart, for the calendar view. */
export function upcomingSwapDates(result: CadenceResult, count = 6, from = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => addLocalDays(from, result.days * (i + 1)));
}

export type CalendarEvent = {
  title: string;
  details: string;
  date: Date;
  siteUrl: string;
};

export function calendarEventFromResult(
  result: CadenceResult,
  date: Date,
  siteUrl: string,
): CalendarEvent {
  const when = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(startOfLocalDay(date));
  return {
    title: `Change HVAC filter — ${result.house.name}`,
    details: `${when}. ${result.days}-day cadence. ${result.house.line} ${result.packHeadline} ${result.packDetail}`,
    date: startOfLocalDay(date),
    siteUrl,
  };
}

export function calendarDestinations(event: CalendarEvent) {
  const end = endOfEvent(event.date);
  const startCompact = isoDate(event.date);
  const endCompact = isoDate(end);
  const startDash = isoDash(event.date);
  const endDash = isoDash(end);
  const outlook = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.details,
    startdt: `${startDash}T00:00:00`,
    enddt: `${endDash}T00:00:00`,
    allday: "true",
  });

  return {
    google: `https://calendar.google.com/calendar/render?${new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      details: event.details,
      dates: `${startCompact}/${endCompact}`,
    }).toString()}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlook.toString()}`,
    office: `https://outlook.office.com/calendar/0/deeplink/compose?${outlook.toString()}`,
    yahoo: `https://calendar.yahoo.com/?${new URLSearchParams({
      v: "60",
      title: event.title,
      desc: event.details,
      st: `${startCompact}T000000`,
      et: `${endCompact}T000000`,
      dur: "allday",
    }).toString()}`,
  };
}

export function eventIcs(event: CalendarEvent): string {
  const start = isoDate(event.date);
  const end = isoDate(endOfEvent(event.date));
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//Filter Hero//Filter Clock//EN",
    "BEGIN:VEVENT",
    `UID:filter-clock-${start}@filterhero.net`,
    `DTSTAMP:${icsStamp()}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape(event.details)}`,
    `URL:${event.siteUrl}/#clock`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

