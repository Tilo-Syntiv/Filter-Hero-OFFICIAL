import FK_LIVE from "./fk-live-prices.json";

/** Undercut scraped FilterKing sale units by 10%. */
export const UNDERCUT_RATIO = 0.9;
/**
 * Extra cushion on estimated (modeled) ladders so we stay under FilterKing
 * even when the model is a bit high.
 */
export const ESTIMATED_UNDERCUT_RATIO = 0.88;

/**
 * Target / Lowe’s Filtrete 1-pack, 1-inch only. Same ticket across sizes.
 * MERV 8 = MPR 700, MERV 11 = MPR 1000, MERV 13 = MPR 1900.
 * Carbon = Filtrete Allergen Defense Odor Reduction (MPR 1200 / MERV 11),
 * Lowe’s 20x20x1 1-pack $16.70 (Sep 1, 2026). Filtrete has no MERV 8 Carbon.
 * 8 / 11 / 13 collected Aug 30, 2026 (Target).
 */
export const FILTRETE_1INCH_QTY1: Record<"8" | "11" | "13" | "carbon", number> = {
  "8": 9.99,
  "11": 13.49,
  "13": 22.99,
  carbon: 16.7,
};

export type MervPriceKey = "8" | "11" | "13" | "carbon";

export type QtyKey = "q1" | "q2" | "q4" | "q6" | "q12";

/**
 * FilterBuy factory-direct sale units, only where they beat current Hero.
 * Scraped Sep 1, 2026 from filterbuy.com. 10% sale ends Sep 7, 2026.
 * Do not stamp these onto sizes or MERVs we did not scrape. Not HDX.
 */
const FILTERBUY_PACKS: Array<{
  size: string;
  merv: "8" | "11" | "13";
  key: QtyKey;
  unit: number;
}> = [
  { size: "20x25x4", merv: "8", key: "q1", unit: 30.59 },
  { size: "20x25x4", merv: "8", key: "q12", unit: 13.35 },
  { size: "20x25x4", merv: "11", key: "q1", unit: 36.89 },
  { size: "20x25x4", merv: "11", key: "q2", unit: 22.49 },
  { size: "20x25x4", merv: "11", key: "q12", unit: 17.85 },
  { size: "20x25x2", merv: "8", key: "q1", unit: 24.29 },
  { size: "20x25x2", merv: "11", key: "q1", unit: 29.69 },
  { size: "20x25x2", merv: "11", key: "q6", unit: 12 },
  { size: "20x25x2", merv: "11", key: "q12", unit: 11.24 },
  { size: "20x25x2", merv: "13", key: "q1", unit: 35.09 },
  { size: "16x25x4", merv: "8", key: "q1", unit: 30.59 },
  { size: "16x25x4", merv: "8", key: "q6", unit: 14.39 },
  { size: "16x25x4", merv: "8", key: "q12", unit: 13.57 },
  { size: "16x25x4", merv: "11", key: "q1", unit: 34.19 },
  { size: "16x25x4", merv: "11", key: "q2", unit: 21.59 },
  { size: "16x25x4", merv: "11", key: "q4", unit: 17.09 },
  { size: "16x25x4", merv: "11", key: "q6", unit: 15.74 },
  { size: "16x25x4", merv: "11", key: "q12", unit: 15.67 },
  { size: "16x25x2", merv: "8", key: "q1", unit: 28.79 },
  { size: "16x25x2", merv: "11", key: "q1", unit: 34.19 },
  { size: "16x25x2", merv: "11", key: "q2", unit: 17.99 },
  { size: "16x25x2", merv: "11", key: "q6", unit: 12 },
  { size: "16x25x2", merv: "11", key: "q12", unit: 9.75 },
  { size: "16x20x2", merv: "8", key: "q1", unit: 22.49 },
  { size: "16x20x2", merv: "8", key: "q2", unit: 13.49 },
  { size: "16x20x2", merv: "11", key: "q1", unit: 27.89 },
  { size: "16x20x2", merv: "11", key: "q2", unit: 15.74 },
  { size: "16x20x2", merv: "11", key: "q4", unit: 13.49 },
  { size: "16x20x2", merv: "11", key: "q6", unit: 11.24 },
  { size: "16x20x2", merv: "11", key: "q12", unit: 10.12 },
];

/**
 * Confirmed Filtrete multi-pack units (not invented). When we also have a
 * Filter King unit on the same rung, Hero matches the cheaper of the two
 * at list — no extra 10% undercut on that rung. Qty 1 stays in
 * FILTRETE_1INCH_QTY1. Target / Amazon / Walmart / Office Depot, Aug 30 2026.
 */
export const FILTRETE_PACKS: Array<{
  size: string;
  merv: "8" | "11" | "13";
  key: QtyKey;
  unit: number;
}> = [
  { size: "14x20x1", merv: "11", key: "q2", unit: 11 },
  { size: "16x20x1", merv: "11", key: "q2", unit: 11 },
  { size: "16x25x1", merv: "11", key: "q2", unit: 11 },
  { size: "20x20x1", merv: "11", key: "q2", unit: 11 },
  { size: "20x25x1", merv: "11", key: "q2", unit: 11 },
  { size: "16x25x1", merv: "13", key: "q2", unit: 15 },
  { size: "20x25x1", merv: "13", key: "q2", unit: 21 },
  { size: "16x25x1", merv: "8", key: "q4", unit: 10.05 },
  { size: "20x20x1", merv: "8", key: "q4", unit: 11.5 },
  { size: "20x30x1", merv: "8", key: "q4", unit: 11.49 },
  { size: "16x20x1", merv: "8", key: "q6", unit: 8.67 },
  { size: "20x20x1", merv: "8", key: "q6", unit: 8.83 },
  { size: "16x25x1", merv: "8", key: "q6", unit: 9 },
  { size: "20x25x1", merv: "8", key: "q6", unit: 9.17 },
  { size: "16x25x1", merv: "11", key: "q6", unit: 11 },
  { size: "20x20x1", merv: "11", key: "q6", unit: 11 },
  { size: "20x20x1", merv: "8", key: "q12", unit: 5.18 },
  { size: "16x25x1", merv: "8", key: "q12", unit: 5.83 },
];

export type Priceable = {
  size: string;
  merv: 8 | 11 | 13;
  isCarbon?: boolean;
};

export type FkLadder = Partial<Record<QtyKey, number>> & {
  size: string;
  merv: string;
  sku?: string;
  estimated?: boolean;
};

const QTY_STEPS: Array<{ minQty: number; key: QtyKey }> = [
  { minQty: 1, key: "q1" },
  { minQty: 2, key: "q2" },
  { minQty: 4, key: "q4" },
  { minQty: 6, key: "q6" },
  { minQty: 12, key: "q12" },
];

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeSize(size: string): string {
  return size.toLowerCase().replace(/\s/g, "").replace(/[an]$/i, "");
}

function sizeDepth(size: string): number | undefined {
  const parts = normalizeSize(size).split("x");
  if (parts.length < 3) return undefined;
  const depth = Number(parts[parts.length - 1]);
  return Number.isFinite(depth) ? depth : undefined;
}

/** Filtrete 1-pack when we sell the same 1-inch rating (carbon uses their odor SKU). */
export function filtreteQty1(
  size: string,
  merv: 8 | 11 | 13,
  isCarbon?: boolean,
): number | undefined {
  if (sizeDepth(size) !== 1) return undefined;
  if (isCarbon) return FILTRETE_1INCH_QTY1.carbon;
  return FILTRETE_1INCH_QTY1[String(merv) as "8" | "11" | "13"];
}

export function mervPriceKey(merv: 8 | 11 | 13, isCarbon?: boolean): MervPriceKey {
  if (isCarbon) return "carbon";
  return String(merv) as MervPriceKey;
}

function normalizeFkMerv(raw: string): MervPriceKey | null {
  const v = raw.toLowerCase().trim();
  if (v === "8" || v === "merv-8" || v === "merv8") return "8";
  if (v === "11" || v === "merv-11" || v === "merv11") return "11";
  if (v === "13" || v === "merv-13" || v === "merv13") return "13";
  if (v === "carbon" || v === "odor" || v === "merv-8-carbon") return "carbon";
  return null;
}

function ladderKey(size: string, merv: MervPriceKey): string {
  return `${normalizeSize(size)}|${merv}`;
}

function buildLadderMap(products: FkLadder[]): Map<string, FkLadder> {
  const map = new Map<string, FkLadder>();
  for (const row of products) {
    const merv = normalizeFkMerv(row.merv);
    if (!merv || !row.size) continue;
    const filled = QTY_STEPS.filter((s) => typeof row[s.key] === "number").length;
    if (filled < 3) continue;
    const key = ladderKey(row.size, merv);
    const prev = map.get(key);
    const prevFilled = prev
      ? QTY_STEPS.filter((s) => typeof prev[s.key] === "number").length
      : 0;
    // Prefer scraped over estimated; then richer ladders.
    if (prev && !prev.estimated && row.estimated) continue;
    if (prev && prev.estimated && !row.estimated) {
      map.set(key, { ...row, size: normalizeSize(row.size), merv });
      continue;
    }
    if (!prev || filled >= prevFilled) {
      map.set(key, { ...row, size: normalizeSize(row.size), merv });
    }
  }
  return map;
}

const LADDERS = buildLadderMap((FK_LIVE as { products: FkLadder[] }).products);

export function fkLadderFor(
  size: string,
  merv: 8 | 11 | 13,
  isCarbon?: boolean,
): FkLadder | undefined {
  return LADDERS.get(ladderKey(size, mervPriceKey(merv, isCarbon)));
}

/** FilterKing unit × undercut ratio (deeper when estimated). */
export function heroFromFk(fkUnit: number, estimated = false): number {
  const ratio = estimated ? ESTIMATED_UNDERCUT_RATIO : UNDERCUT_RATIO;
  return money(fkUnit * ratio);
}

function fkUnitForQty(ladder: FkLadder, qty: number): number | undefined {
  let unit: number | undefined;
  for (const step of QTY_STEPS) {
    const price = ladder[step.key];
    if (qty >= step.minQty && typeof price === "number") unit = price;
  }
  return unit;
}

function qtyKeyFor(qty: number): QtyKey {
  let key: QtyKey = "q1";
  for (const step of QTY_STEPS) {
    if (qty >= step.minQty) key = step.key;
  }
  return key;
}

/** Confirmed Filtrete multi-pack unit, if we scraped one. */
export function filtreteBeatUnit(
  size: string,
  merv: 8 | 11 | 13,
  qty: number,
  isCarbon?: boolean,
): number | undefined {
  if (isCarbon) return undefined;
  if (qty <= 1) return undefined;
  const key = qtyKeyFor(qty);
  const want = `${normalizeSize(size)}|${merv}|${key}`;
  const hit = FILTRETE_PACKS.find(
    (row) => `${normalizeSize(row.size)}|${row.merv}|${row.key}` === want,
  );
  return hit?.unit;
}

function filtreteUnitFor(
  size: string,
  merv: 8 | 11 | 13,
  qty: number,
  isCarbon?: boolean,
): number | undefined {
  if (qty <= 1) return filtreteQty1(size, merv, isCarbon);
  return filtreteBeatUnit(size, merv, qty, isCarbon);
}

/** Confirmed FilterBuy unit, only on rungs they undercut us. */
export function filterbuyUnit(
  size: string,
  merv: 8 | 11 | 13,
  qty: number,
  isCarbon?: boolean,
): number | undefined {
  if (isCarbon) return undefined;
  const key = qtyKeyFor(qty);
  const want = `${normalizeSize(size)}|${merv}|${key}`;
  const hit = FILTERBUY_PACKS.find(
    (row) => `${normalizeSize(row.size)}|${row.merv}|${row.key}` === want,
  );
  return hit?.unit;
}

/** Qty-1 Filter Hero list: Filtrete tickets only. */
export function liveListPrice(
  size: string,
  merv: 8 | 11 | 13,
  isCarbon?: boolean,
): number | undefined {
  return liveUnitPrice({ size, merv, isCarbon }, 1);
}

/**
 * Shopper unit. 1-inch qty 1 is FILTRETE_1INCH_QTY1. Multi-packs are
 * FILTRETE_PACKS only — missing rungs stay on the qty-1 ticket (no invented
 * pack price, no Filter King sale, no FilterBuy undercut).
 */
export function liveUnitPrice(product: Priceable, qty: number): number | undefined {
  const filtrete = filtreteUnitFor(product.size, product.merv, qty, product.isCarbon);
  if (filtrete != null) return money(filtrete);
  if (qty > 1) {
    const single = filtreteQty1(product.size, product.merv, product.isCarbon);
    if (single != null) return money(single);
  }
  return undefined;
}

function sizesForFromPrice(key: MervPriceKey): Set<string> {
  const sizes = new Set<string>(["20x25x1"]);
  if (key === "carbon") return sizes;
  for (const row of FILTRETE_PACKS) {
    if (row.merv === key) sizes.add(normalizeSize(row.size));
  }
  return sizes;
}

/** Cheapest live unit a shopper can pay — same ticket as the size page. */
export function liveFromPrice(key: MervPriceKey): number | undefined {
  const merv = key === "carbon" ? 8 : (Number(key) as 8 | 11 | 13);
  const isCarbon = key === "carbon";
  let min: number | undefined;
  for (const size of Array.from(sizesForFromPrice(key))) {
    for (const step of QTY_STEPS) {
      const unit = liveUnitPrice({ size, merv, isCarbon }, step.minQty);
      if (typeof unit !== "number") continue;
      if (min === undefined || unit < min) min = unit;
    }
  }
  return min;
}

export function liveLadderCount(): number {
  return LADDERS.size;
}

export function liveScrapedCount(): number {
  let n = 0;
  for (const row of Array.from(LADDERS.values())) {
    if (!row.estimated) n += 1;
  }
  return n;
}
