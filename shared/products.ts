import FILTER_CATALOG from "./filter-catalog.json";
import SELLABLE_FILE from "./sellable-skus.json";
import { filterKingPdpUrl } from "./filterking";
import {
  FILTRETE_1INCH_QTY1,
  liveFromPrice,
  liveListPrice,
  liveUnitPrice,
  type Priceable,
} from "./pricing/engine";

export {
  FILTRETE_1INCH_QTY1,
  filtreteBeatUnit,
  filtreteQty1,
  filterbuyUnit,
  liveFromPrice,
  liveListPrice,
  liveUnitPrice,
  liveLadderCount,
  liveScrapedCount,
  UNDERCUT_RATIO,
  ESTIMATED_UNDERCUT_RATIO,
  type Priceable,
} from "./pricing/engine";

export type MervRating = 8 | 11 | 13;

/** Bump when pack-shot files change so browsers do not keep a stale photo. */
const PACK_SHOT_REV = "fh244";

function productMedia(path: string): string {
  return `${path}?v=${PACK_SHOT_REV}`;
}

export function mervMediaKey(merv: MervRating, isCarbon = false): "8" | "11" | "13" | "carbon" {
  return isCarbon ? "carbon" : (String(merv) as "8" | "11" | "13");
}

const OFFICIAL_PACKSHOT: ReadonlySet<string> = new Set(["8", "11", "13", "carbon"]);

export function packShotSrc(merv: MervRating, isCarbon = false): string {
  const key = mervMediaKey(merv, isCarbon);
  if (OFFICIAL_PACKSHOT.has(key)) {
    return productMedia(`/products/merv-${key}-packshot.png`);
  }
  return productMedia(`/products/merv-${key}-thin-rectangle-6pack.png`);
}

export type ProductShot = {
  src: string;
  alt: string;
};

/** Pack and detail shots for one MERV line. Printed MERV on the photo matches the rating. */
export function productGalleryFor(merv: MervRating, isCarbon = false): ProductShot[] {
  const key = mervMediaKey(merv, isCarbon);
  const name = isCarbon ? "MERV 8 Carbon" : `MERV ${merv}`;
  const pack: ProductShot = {
    src: packShotSrc(merv, isCarbon),
    alt: `${name} pleated HVAC air filter`,
  };
  if (OFFICIAL_PACKSHOT.has(key)) {
    return [
      pack,
      {
        src: productMedia("/products/merv-8-macro.png"),
        alt: "Close-up of pleated media, mesh, and support lattice",
      },
      {
        src: productMedia(`/products/merv-${key}-layers.png`),
        alt: `Exploded view of ${name} frame, filter media, and metal mesh`,
      },
    ];
  }
  return [
    pack,
    {
      src: productMedia(`/products/merv-${key}-thin-rectangle-no-labels.png`),
      alt: `Single ${name} pleated air filter, three-quarter view`,
    },
    {
      src: productMedia("/products/merv-8-macro.png"),
      alt: "Close-up of pleated media, mesh, and support lattice",
    },
    {
      src: productMedia(`/products/merv-${key}-layers.png`),
      alt: `Exploded view of ${name} frame, filter media, and metal mesh`,
    },
  ];
}

/** Default pack shot (MERV 8). Prefer packShotSrc / productGalleryFor for a specific rating. */
export const FILTER_PRODUCT_IMAGE = packShotSrc(8);

export const FILTER_PRODUCT_GALLERY = productGalleryFor(8);

export type FilterSize = {
  /** Nominal size slug used in URLs, e.g. 20x25x1 */
  slug: string;
  width: number;
  length: number;
  depth: number;
  /** Actual (exact) dimensions printed for fit reassurance */
  actualWidth: number;
  actualLength: number;
  actualDepth: number;
};

export type Product = {
  id: number;
  size: string;
  merv: MervRating;
  isCarbon?: boolean;
  /** Qty-1 unit price (Filtrete tickets; depth fallback for non-1-inch) */
  price: number;
  inStock: boolean;
  name: string;
  description: string;
  parentModel?: string;
  filterKingUrl?: string;
};

export type PackTier = {
  minQty: number;
  label: string;
  /** Multiplier applied to unit list price (1 = full price) */
  multiplier: number;
};

/** Qty buttons. Multipliers are fallback only; live SKUs use FilterKing ladders. */
export const PACK_TIERS: PackTier[] = [
  { minQty: 1, label: "1", multiplier: 1 },
  { minQty: 2, label: "2", multiplier: 0.54 },
  { minQty: 4, label: "4", multiplier: 0.3 },
  { minQty: 6, label: "6+", multiplier: 0.28 },
  { minQty: 12, label: "12+", multiplier: 0.21 },
];

/** Size-page quantity picker. Volume breaks stay in PACK_TIERS / live ladders. */
export const PACK_QTYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type PackQty = (typeof PACK_QTYS)[number];

export function isPackQty(n: number): n is PackQty {
  return Number.isInteger(n) && n >= PACK_QTYS[0] && n <= PACK_QTYS[PACK_QTYS.length - 1];
}

function fallbackUnitPrice(listPrice: number, qty: number): number {
  let tier = PACK_TIERS[0];
  for (const t of PACK_TIERS) {
    if (qty >= t.minQty) tier = t;
  }
  return Math.round(listPrice * tier.multiplier * 100) / 100;
}

/**
 * Pack unit price. When Filtrete and Filter King both list the same rung,
 * match the cheaper one. Otherwise 1-inch qty 1 is Filtrete; other rungs
 * are Filter King × 0.90, capped at the Filtrete single. Then match a
 * confirmed FilterBuy ticket if that ticket is cheaper. No ladder:
 * PACK_TIERS on listPrice.
 */
export function unitPriceForQty(
  listPrice: number,
  qty: number,
  product?: Priceable,
): number {
  if (product) {
    const live = liveUnitPrice(product, qty);
    if (live !== undefined) return live;
  }
  return fallbackUnitPrice(listPrice, qty);
}

export function packTotal(
  listPrice: number,
  qty: number,
  product?: Priceable,
): number {
  return Math.round(unitPriceForQty(listPrice, qty, product) * qty * 100) / 100;
}

function actualFromNominal(w: number, l: number, d: number) {
  // Typical HVAC: actual is ~0.5" under on face dims; depth slightly under
  const depthMap: Record<number, number> = {
    0.5: 0.38,
    1: 0.75,
    2: 1.75,
    4: 3.75,
    5: 4.75,
  };
  return {
    actualWidth: Math.round((w - 0.5) * 100) / 100,
    actualLength: Math.round((l - 0.5) * 100) / 100,
    actualDepth: depthMap[d] ?? Math.round((d - 0.25) * 100) / 100,
  };
}

function size(w: number, l: number, d: number): FilterSize {
  const slug = `${w}x${l}x${d}`;
  return { slug, width: w, length: l, depth: d, ...actualFromNominal(w, l, d) };
}

function uniqueSizes(list: FilterSize[]): FilterSize[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    if (seen.has(s.slug)) return false;
    seen.add(s.slug);
    return true;
  });
}

function envFlag(...keys: string[]): boolean | undefined {
  const values: unknown[] = [];
  if (typeof process !== "undefined" && process.env) {
    for (const key of keys) values.push(process.env[key]);
  }
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  if (viteEnv) {
    for (const key of keys) values.push(viteEnv[key]);
  }
  for (const raw of values) {
    if (raw == null || raw === "") continue;
    const v = String(raw).trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  }
  return undefined;
}

/**
 * Checkout allowlist. Must stay false: cart = Model Pricing XLS.
 * Finder still uses the archived size universe; off-XLS sizes quote, not Stripe.
 */
export const FULL_CATALOG = envFlag("VITE_FULL_CATALOG", "FULL_CATALOG") === true;

/**
 * When true, the shop only lists size × MERV lines on the contractor sheet.
 * Inverse of FULL_CATALOG. Do not delete filter-catalog.json or sellable-skus.json.
 */
export const SELLABLE_ONLY = !FULL_CATALOG;

type SellableSkuRow = {
  size: string;
  merv: 8 | 11 | 13;
  isCarbon?: boolean;
  wholesaleSku: string;
  parentModel?: string;
  filterKingUrl?: string;
  cost: number;
  actualWidth?: number;
  actualLength?: number;
  actualDepth?: number;
};

function sellableKey(size: string, merv: MervRating, isCarbon = false): string {
  return `${size.toLowerCase()}|${isCarbon ? "carbon" : merv}`;
}

/** Stable Stripe Product id for this catalog SKU. Unique per Stripe account. */
export function catalogStripeProductId(productId: number): string {
  return `prod_fh_${productId}`;
}

/** Klaviyo custom-catalog external_id. Same as the shop product id. */
export function catalogExternalId(productId: number): string {
  return String(productId);
}

const SELLABLE_ROWS = SELLABLE_FILE.skus as SellableSkuRow[];
const SELLABLE_SKU_KEYS = new Set(
  SELLABLE_ROWS.map((row) => sellableKey(row.size, row.merv, Boolean(row.isCarbon))),
);
const WHOLESALE_SKU_BY_KEY = new Map(
  SELLABLE_ROWS.map((row) => [
    sellableKey(row.size, row.merv, Boolean(row.isCarbon)),
    row.parentModel || row.wholesaleSku,
  ]),
);
const FILTER_KING_URL_BY_KEY = new Map(
  SELLABLE_ROWS.map((row) => [
    sellableKey(row.size, row.merv, Boolean(row.isCarbon)),
    row.filterKingUrl || filterKingPdpUrl(row.size, row.merv, Boolean(row.isCarbon)),
  ]),
);
const SELLABLE_SIZE_KEYS = new Set(SELLABLE_ROWS.map((row) => row.size.toLowerCase()));
const SELLABLE_MERV_KEYS = new Set<MervTypeKey>(
  SELLABLE_ROWS.map((row) => (row.isCarbon ? "carbon" : (String(row.merv) as MervTypeKey))),
);
const SIZE_ACTUALS = new Map<string, Pick<FilterSize, "actualWidth" | "actualLength" | "actualDepth">>();
for (const row of SELLABLE_ROWS) {
  const key = row.size.toLowerCase();
  if (
    SIZE_ACTUALS.has(key) ||
    row.actualWidth == null ||
    row.actualLength == null ||
    row.actualDepth == null
  ) {
    continue;
  }
  SIZE_ACTUALS.set(key, {
    actualWidth: row.actualWidth,
    actualLength: row.actualLength,
    actualDepth: row.actualDepth,
  });
}

export function isSkuSellable(
  size: string,
  merv: MervRating,
  isCarbon = false,
): boolean {
  if (!SELLABLE_ONLY) return true;
  return SELLABLE_SKU_KEYS.has(sellableKey(size, merv, isCarbon));
}

export function wholesaleSkuFor(
  size: string,
  merv: MervRating,
  isCarbon = false,
): string | undefined {
  return WHOLESALE_SKU_BY_KEY.get(sellableKey(size, merv, isCarbon));
}

export function parentModelFor(
  size: string,
  merv: MervRating,
  isCarbon = false,
): string | undefined {
  return wholesaleSkuFor(size, merv, isCarbon);
}

export function filterKingUrlFor(
  size: string,
  merv: MervRating,
  isCarbon = false,
): string {
  return (
    FILTER_KING_URL_BY_KEY.get(sellableKey(size, merv, isCarbon)) ||
    filterKingPdpUrl(size, merv, isCarbon)
  );
}

export function isSizeShoppable(slug: string): boolean {
  if (!SELLABLE_ONLY) return true;
  return SELLABLE_SIZE_KEYS.has(slug.toLowerCase());
}

export function isMervKeyOnSale(key: MervTypeKey): boolean {
  if (!SELLABLE_ONLY) return true;
  return SELLABLE_MERV_KEYS.has(key);
}

function withSheetActuals(meta: FilterSize): FilterSize {
  const actuals = SIZE_ACTUALS.get(meta.slug.toLowerCase());
  return actuals ? { ...meta, ...actuals } : meta;
}

/** Archived Filter King size universe. Keep this for when more wholesale lands. */
export const ALL_FILTER_SIZES: FilterSize[] = uniqueSizes(
  (FILTER_CATALOG as Array<[number, number, number]>).map(([w, l, d]) => size(w, l, d)),
).map(withSheetActuals);

/** Live shop catalog. Each slug maps to `/sizes/{slug}`. */
export const FILTER_SIZES: FilterSize[] = SELLABLE_ONLY
  ? ALL_FILTER_SIZES.filter((s) => isSizeShoppable(s.slug))
  : ALL_FILTER_SIZES;

const ALL_SIZE_INDEX = new Map(
  ALL_FILTER_SIZES.map((s, i) => [s.slug.toLowerCase(), i]),
);

function widthsFrom(list: FilterSize[]): number[] {
  return Array.from(new Set(list.map((s) => s.width))).sort((a, b) => a - b);
}

function lengthsFrom(list: FilterSize[]): number[] {
  return Array.from(new Set(list.map((s) => s.length))).sort((a, b) => a - b);
}

export function catalogWidths(): number[] {
  return widthsFrom(FILTER_SIZES);
}

export function catalogWidthsForDepth(depth: number): number[] {
  return Array.from(
    new Set(FILTER_SIZES.filter((s) => s.depth === depth).map((s) => s.width)),
  ).sort((a, b) => a - b);
}

export function catalogLengths(): number[] {
  return lengthsFrom(FILTER_SIZES);
}

/** Finder dropdowns keep the archived dimension universe so unsold sizes still route to quote. */
export function finderWidths(): number[] {
  return widthsFrom(ALL_FILTER_SIZES);
}

export function finderLengths(): number[] {
  return lengthsFrom(ALL_FILTER_SIZES);
}

export const THICKNESSES = [0.5, 1, 2, 4, 5] as const;

export type MervTypeKey = "8" | "11" | "13" | "carbon";

export type MervTypeInfo = {
  key: MervTypeKey;
  merv: MervRating;
  isCarbon: boolean;
  name: string;
  shortLabel: string;
  description: string;
  fromPrice: number;
  badgeColor: string;
};

function depthFromSlug(slug: string): number {
  const depth = Number(slug.toLowerCase().split("x")[2]);
  return Number.isFinite(depth) ? depth : 1;
}

function listPriceFor(depth: number, merv: MervRating, isCarbon: boolean): number {
  if (depth === 1 && isCarbon) return FILTRETE_1INCH_QTY1.carbon;
  if (depth === 1) return FILTRETE_1INCH_QTY1[String(merv) as "8" | "11" | "13"];
  const depthBase: Record<number, number> = {
    0.5: 10.99,
    1: 14.99,
    2: 22.99,
    4: 34.99,
    5: 39.99,
  };
  let base = depthBase[depth] ?? 14.99;
  if (merv === 11) base += 3;
  if (merv === 13) base += 5;
  if (isCarbon) base += 6;
  return Math.round(base * 100) / 100;
}

function cardFromPrice(key: MervTypeKey, fallback: number): number {
  if (!SELLABLE_ONLY) return liveFromPrice(key) ?? fallback;
  let min: number | undefined;
  for (const row of SELLABLE_ROWS) {
    const isCarbon = Boolean(row.isCarbon);
    if (key === "carbon" ? !isCarbon : isCarbon || String(row.merv) !== key) continue;
    const list =
      liveListPrice(row.size, row.merv, isCarbon) ??
      listPriceFor(depthFromSlug(row.size), row.merv, isCarbon);
    const product = { size: row.size, merv: row.merv, isCarbon };
    for (const qty of [1, 2, 4, 6, 12]) {
      const unit = unitPriceForQty(list, qty, product);
      if (min === undefined || unit < min) min = unit;
    }
  }
  return min ?? fallback;
}

export const MERV_TYPES: MervTypeInfo[] = [
  {
    key: "8",
    merv: 8,
    isCarbon: false,
    name: "MERV 8",
    shortLabel: "Standard",
    description: "Everyday dust and pollen for typical homes",
    fromPrice: cardFromPrice("8", 11.99),
    badgeColor: "#3a66a3",
  },
  {
    key: "11",
    merv: 11,
    isCarbon: false,
    name: "MERV 11",
    shortLabel: "Advanced",
    description: "Enhanced protection for pets and mild allergies",
    fromPrice: cardFromPrice("11", 15.99),
    badgeColor: "#d21b22",
  },
  {
    key: "13",
    merv: 13,
    isCarbon: false,
    name: "MERV 13",
    shortLabel: "Ultimate",
    description: "Superior filtration for asthma and sensitivities",
    fromPrice: cardFromPrice("13", 16.99),
    badgeColor: "#ee9e10",
  },
  {
    key: "carbon",
    merv: 8,
    isCarbon: true,
    name: "MERV 8 Carbon",
    shortLabel: "Odor Eliminator",
    description: "Everyday filtration plus activated carbon for odors",
    fromPrice: cardFromPrice("carbon", 19.99),
    badgeColor: "#111111",
  },
];

export function mervTypeFor(merv: MervRating, isCarbon?: boolean): MervTypeInfo {
  const key: MervTypeKey = isCarbon ? "carbon" : (String(merv) as MervTypeKey);
  return MERV_TYPES.find((t) => t.key === key) ?? MERV_TYPES[0];
}

/** Visual order: MERV 8 sits beside MERV 8 Carbon. Product IDs still follow MERV_TYPES. */
export const MERV_DISPLAY_ORDER: MervTypeKey[] = ["8", "carbon", "11", "13"];

export function mervTypesForDisplay(): MervTypeInfo[] {
  return MERV_DISPLAY_ORDER.map(
    (key) => MERV_TYPES.find((t) => t.key === key) ?? MERV_TYPES[0],
  );
}

/** MERV chips a shopper can buy for this size. Off-sheet ratings stay in MERV_TYPES when SELLABLE_ONLY. */
export function mervTypesForSize(slug: string): MervTypeInfo[] {
  return mervTypesForDisplay().filter((t) => isSkuSellable(slug, t.merv, t.isCarbon));
}

export function sellableMervPhrase(slug: string): string {
  const types = mervTypesForSize(slug);
  if (!types.length) return "MERV 8, 11, or 13";
  if (types.length === 1) return types[0].name;
  if (types.length === 2) return `${types[0].name} or ${types[1].name}`;
  const last = types[types.length - 1];
  return `${types.slice(0, -1).map((t) => t.name).join(", ")}, or ${last.name}`;
}

function productName(t: MervTypeInfo): string {
  if (t.isCarbon) return "Odor Eliminator";
  if (t.merv === 8) return "Standard Pleated";
  if (t.merv === 11) return "Allergy Plus";
  return "Precision High MERV";
}

function makeProduct(sizeMeta: FilterSize, type: MervTypeInfo, sizeIndex: number): Product {
  const mervIndex = MERV_TYPES.findIndex((t) => t.key === type.key);
  return {
    id: sizeIndex * MERV_TYPES.length + mervIndex + 1,
    size: sizeMeta.slug,
    merv: type.merv,
    isCarbon: type.isCarbon,
    price:
      liveListPrice(sizeMeta.slug, type.merv, type.isCarbon) ??
      listPriceFor(sizeMeta.depth, type.merv, type.isCarbon),
    inStock: isSkuSellable(sizeMeta.slug, type.merv, type.isCarbon),
    name: productName(type),
    description: type.description,
    parentModel: parentModelFor(sizeMeta.slug, type.merv, type.isCarbon),
    filterKingUrl: filterKingUrlFor(sizeMeta.slug, type.merv, type.isCarbon),
  };
}

export function getArchivedFilterSize(slug: string): FilterSize | undefined {
  const normalized = slug.toLowerCase().replace(/\s/g, "");
  const idx = ALL_SIZE_INDEX.get(normalized);
  return idx === undefined ? undefined : ALL_FILTER_SIZES[idx];
}

export function getFilterSize(slug: string): FilterSize | undefined {
  const size = getArchivedFilterSize(slug);
  if (!size || !isSizeShoppable(size.slug)) return undefined;
  return size;
}

export function compareFilterSizes(a: FilterSize, b: FilterSize): number {
  return a.width - b.width || a.length - b.length || a.depth - b.depth;
}

export function getSizesByThickness(depth: number): FilterSize[] {
  return FILTER_SIZES.filter((s) => s.depth === depth).sort(compareFilterSizes);
}

export function getProductById(id: number): Product | undefined {
  if (id < 1) return undefined;
  const idx = id - 1;
  const sizeIndex = Math.floor(idx / MERV_TYPES.length);
  const mervIndex = idx % MERV_TYPES.length;
  const sizeMeta = ALL_FILTER_SIZES[sizeIndex];
  const type = MERV_TYPES[mervIndex];
  if (!sizeMeta || !type) return undefined;
  return makeProduct(sizeMeta, type, sizeIndex);
}

export function findProductsBySize(size: string): Product[] {
  const sizeMeta = getArchivedFilterSize(size);
  if (!sizeMeta) return [];
  const sizeIndex = ALL_SIZE_INDEX.get(sizeMeta.slug.toLowerCase()) ?? 0;
  return MERV_TYPES.map((t) => makeProduct(sizeMeta, t, sizeIndex));
}

export function firstSellableProduct(size: string): Product | undefined {
  return findProductsBySize(size).find((p) => p.inStock);
}

export function findProductVariant(
  size: string,
  merv: MervRating,
  isCarbon = false,
): Product | undefined {
  return findProductsBySize(size).find(
    (p) => p.merv === merv && Boolean(p.isCarbon) === isCarbon,
  );
}

/** Contractor-sheet SKUs for the Klaviyo catalog feed (not the full archive). */
export function sellableSheetProducts(): Product[] {
  const products: Product[] = [];
  for (const row of SELLABLE_ROWS) {
    const product = findProductVariant(row.size, row.merv, Boolean(row.isCarbon));
    if (product) products.push(product);
  }
  return products;
}

/** Popular sizes shown as shortcuts — must exist in the scraped catalog. */
export function popularSizeSlugs(limit = 12): string[] {
  const preferred = [
    "16x25x1",
    "20x25x1",
    "20x20x1",
    "16x20x1",
    "14x25x1",
    "16x25x2",
    "20x25x2",
    "12x24x1",
    "18x24x1",
    "20x30x1",
    "16x20x2",
    "16x25x4",
    "20x25x4",
  ];
  return preferred
    .map((slug) => getFilterSize(slug))
    .filter((size): size is FilterSize => Boolean(size))
    .slice(0, limit)
    .sort(compareFilterSizes)
    .map((size) => size.slug);
}

/** Legacy alias used by MERV guide cards */
export { MERV_TYPES as MERV_GUIDE };
