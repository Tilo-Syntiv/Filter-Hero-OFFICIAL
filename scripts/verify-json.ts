import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HVAC_BRAND_LIST, catalogSizeForSlug } from "../shared/hvac-brands.ts";
import {
  FILTER_SIZES,
  firstSellableProduct,
  getArchivedFilterSize,
  getFilterSize,
  liveUnitPrice,
  unitPriceForQty,
} from "../shared/products.ts";
import {
  CHANGE_GUIDE_PATH,
  CUSTOM_FAQS,
  SITE_FAQS,
  injectSeoIntoHtml,
  resolveDocumentSeo,
  sitemapPaths,
} from "../shared/seo.ts";
import { buildKlaviyoCatalog } from "../server/klaviyo.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://filterhero.net";

type Check = {
  id: string;
  ok: boolean;
  detail?: string;
};

const checks: Check[] = [];

function record(id: string, ok: boolean, detail?: string) {
  checks.push({ id, ok, detail });
}

function readJson(rel: string): unknown {
  const file = path.join(ROOT, rel);
  const raw = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${rel} is not valid JSON: ${err instanceof Error ? err.message : err}`);
  }
}

function walkLd(node: unknown, visit: (obj: Record<string, unknown>) => void) {
  if (Array.isArray(node)) {
    for (const item of node) walkLd(item, visit);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  visit(obj);
  for (const value of Object.values(obj)) walkLd(value, visit);
}

function aliasSize(size: string): string {
  return size.toLowerCase().replace(/\s/g, "").replace(/[an]$/i, "");
}

function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    blocks.push(JSON.parse(match[1]));
  }
  return blocks;
}

const configFiles = [
  "package.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "components.json",
  ".railway/config.json",
  "shared/filter-catalog.json",
  "shared/sellable-skus.json",
  "shared/hvac-brands.json",
  "shared/featured-sizes.json",
  "shared/pricing/fk-live-prices.json",
  "server/data/leads.json",
];

for (const rel of configFiles) {
  const parsed = readJson(rel);
  record(`parse:${rel}`, parsed !== null && parsed !== undefined, "parsed");
}

const catalog = readJson("shared/filter-catalog.json") as Array<[number, number, number]>;
record("catalog:array", Array.isArray(catalog), `rows=${catalog.length}`);
const slugs = new Set<string>();
let badTuple = 0;
for (const row of catalog) {
  if (!Array.isArray(row) || row.length !== 3 || row.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
    badTuple += 1;
    continue;
  }
  slugs.add(`${row[0]}x${row[1]}x${row[2]}`);
}
record("catalog:tuples", badTuple === 0, `bad=${badTuple} unique=${slugs.size}`);

const sellable = readJson("shared/sellable-skus.json") as {
  count: number;
  skus: Array<{ size: string; merv: number; cost: number }>;
};
record(
  "sellable:count",
  sellable.count === sellable.skus.length,
  `count=${sellable.count} rows=${sellable.skus.length}`,
);
{
  const keys = sellable.skus.map(
    (s) => `${s.size.toLowerCase()}|${(s as { isCarbon?: boolean }).isCarbon ? "carbon" : s.merv}`,
  );
  record(
    "sellable:unique-size-merv",
    new Set(keys).size === keys.length,
    `keys=${keys.length} unique=${new Set(keys).size}`,
  );
}
const missingSellable = sellable.skus.filter((sku) => !getFilterSize(sku.size));
record(
  "sellable:sizes-in-catalog",
  missingSellable.length === 0,
  missingSellable.length ? missingSellable.slice(0, 8).map((s) => s.size).join(",") : "all present",
);

const featured = readJson("shared/featured-sizes.json") as Record<string, string[]>;
const featuredMissing: string[] = [];
for (const [depth, sizes] of Object.entries(featured)) {
  record(`featured:${depth}:array`, Array.isArray(sizes), `${sizes?.length ?? 0}`);
  for (const slug of sizes ?? []) {
    if (!getArchivedFilterSize(slug)) featuredMissing.push(slug);
  }
}
record(
  "featured:sizes-in-catalog",
  featuredMissing.length === 0,
  featuredMissing.length ? featuredMissing.slice(0, 8).join(",") : "all present",
);

const brands = readJson("shared/hvac-brands.json") as Array<{
  slug: string;
  name: string;
  sizes: string[];
  models: Array<{ code: string; size: string }>;
  oemParts: Array<{ code: string; size: string }>;
}>;
record("brands:count", brands.length === HVAC_BRAND_LIST.length, `${brands.length}`);
const brandMissing = new Set<string>();
for (const brand of brands) {
  for (const size of brand.sizes) {
    if (!catalogSizeForSlug(size)) brandMissing.add(`${brand.slug}:${size}`);
  }
  for (const row of [...brand.models, ...brand.oemParts]) {
    if (!catalogSizeForSlug(row.size)) brandMissing.add(`${brand.slug}:${row.size}`);
  }
}
record(
  "brands:sizes-in-catalog",
  brandMissing.size === 0,
  brandMissing.size ? [...brandMissing].slice(0, 12).join(",") : "all present",
);

const prices = readJson("shared/pricing/fk-live-prices.json") as {
  counts: { total: number };
  products: Array<{ size: string; q1: number; estimated?: boolean; merv?: string }>;
};
record(
  "prices:count",
  prices.counts.total === prices.products.length,
  `total=${prices.counts.total} rows=${prices.products.length}`,
);
const nAliasRows = prices.products.filter((p) => /[an]$/i.test(p.size));
const priceMissing = prices.products.filter((p) => !getArchivedFilterSize(aliasSize(p.size)));
record(
  "prices:sizes-in-catalog",
  priceMissing.length === 0,
  priceMissing.length
    ? `missing=${priceMissing.length} sample=${[...new Set(priceMissing.map((p) => p.size))].slice(0, 8).join(",")}`
    : `all present aliases=${nAliasRows.length}`,
);
record(
  "prices:q1-finite",
  prices.products.every((p) => typeof p.q1 === "number" && Number.isFinite(p.q1) && p.q1 > 0),
  "all q1 > 0",
);
const scrapedHalf = liveUnitPrice({ size: "10x30x0.5", merv: 11 }, 1);
record(
  "prices:n-alias-scraped",
  scrapedHalf === 49.48,
  `10x30x0.5 MERV 11 must use scraped n-ladder $49.48, got ${scrapedHalf}`,
);

const leads = readJson("server/data/leads.json") as unknown[];
record("leads:array", Array.isArray(leads), `${leads.length}`);

const routes = [
  "/",
  "/sizes",
  "/sizes/20x25x1",
  "/filters/1-inch",
  "/brands",
  "/brands/carrier",
  "/custom-air-filters",
  CHANGE_GUIDE_PATH,
  "/login",
  "/admin",
  "/checkout",
  "/sizes/not-a-real-size",
];

for (const route of routes) {
  const doc = resolveDocumentSeo(route, SITE);
  const payload = JSON.stringify(doc.jsonLd.length === 1 ? doc.jsonLd[0] : doc.jsonLd);
  JSON.parse(payload);
  record(`jsonld:stringify:${route}`, true, `${doc.jsonLd.length} nodes`);

  const html = injectSeoIntoHtml(
    "<html><head><title>x</title><meta name=\"description\" content=\"d\" /><link rel=\"canonical\" href=\"https://example.com/\" /></head><body></body></html>",
    doc,
  );
  const extracted = extractJsonLd(html);
  if (doc.jsonLd.length === 0) {
    record(`jsonld:ssr:${route}`, extracted.length === 0, "noindex empty");
    continue;
  }
  record(`jsonld:ssr:${route}`, extracted.length === 1, `blocks=${extracted.length}`);
  record(`jsonld:escaped:${route}`, !html.includes("</script></script>") && !payload.includes("</script>"), "safe");

  const types = new Set<string>();
  walkLd(extracted, (obj) => {
    if (typeof obj["@type"] === "string") types.add(obj["@type"]);
  });

  if (route === "/") {
    record("jsonld:home:types", ["Organization", "OnlineStore", "WebSite", "FAQPage", "HowTo", "WebPage", "BreadcrumbList"].every((t) => types.has(t)), [...types].join(","));
    const blob = JSON.stringify(extracted);
    record("jsonld:home:shipping", /2–3 day|2-3 day/i.test(blob) && !/free shipping/i.test(blob), "delivery");
  }

  if (route === "/sizes/20x25x1") {
    record("jsonld:size:product", types.has("Product") && types.has("Offer"), [...types].join(","));
    let offerPrice = "";
    let speakableUrl = "";
    walkLd(extracted, (obj) => {
      if (obj["@type"] === "Offer" && typeof obj.price === "string") offerPrice = obj.price;
      if (obj["@type"] === "WebPage" && typeof obj.url === "string") speakableUrl = obj.url;
    });
    const variant = firstSellableProduct("20x25x1");
    const live = variant ? unitPriceForQty(variant.price, 1, variant) : 0;
    record("jsonld:size:price", offerPrice === live.toFixed(2), `schema=${offerPrice} live=${live.toFixed(2)}`);
    record(
      "jsonld:size:speakable-url",
      speakableUrl === `${SITE}/sizes/20x25x1`,
      speakableUrl || "missing",
    );
    record("jsonld:size:shipping-offer", JSON.stringify(extracted).includes("OfferShippingDetails"), "shippingDetails");
  }

  if (route === CHANGE_GUIDE_PATH) {
    let speakableUrl = "";
    walkLd(extracted, (obj) => {
      if (obj["@type"] === "WebPage" && typeof obj.url === "string") speakableUrl = obj.url;
    });
    record(
      "jsonld:guide:speakable-url",
      speakableUrl === `${SITE}${CHANGE_GUIDE_PATH}`,
      speakableUrl || "missing",
    );
  }

  if (route === "/custom-air-filters") {
    const blob = JSON.stringify(extracted);
    record("jsonld:custom:faq", types.has("FAQPage") && /contiguous/i.test(blob), [...types].join(","));
    let speakableUrl = "";
    walkLd(extracted, (obj) => {
      if (obj["@type"] === "WebPage" && typeof obj.url === "string") speakableUrl = obj.url;
    });
    record(
      "jsonld:custom:speakable-url",
      speakableUrl === `${SITE}/custom-air-filters`,
      speakableUrl || "missing",
    );
  }
}

for (const rel of [
  "client/src/pages/SizeDetail.tsx",
  "client/src/pages/CustomAirFilters.tsx",
  "client/src/pages/FilterChangeGuide.tsx",
  "client/src/pages/BrandBrowse.tsx",
  "client/src/pages/Home.tsx",
]) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  record(
    `jsonld:spa-speakable-path:${rel}`,
    /buildSpeakableSchema\([\s\S]{0,500}path:\s/.test(src),
    "SPA speakable must pass page.path",
  );
}

const faqBlob = JSON.stringify([...SITE_FAQS, ...CUSTOM_FAQS]);
record("faqs:no-50-minimum", !/\$50/.test(faqBlob) && /contiguous|2–3 day|2-3 day/i.test(faqBlob), "copy");

const catalogFeed = buildKlaviyoCatalog(SITE);
record("klaviyo:schema", catalogFeed.$schema.includes("json-schema"), catalogFeed.$schema);
record("klaviyo:items", catalogFeed.items.length > 0, `${catalogFeed.items.length}`);
const badFeed = catalogFeed.items.filter(
  (item) => !item.id || !item.link.startsWith(SITE) || typeof item.price !== "number" || item.price <= 0,
);
record("klaviyo:item-fields", badFeed.length === 0, `bad=${badFeed.length}`);

const sizePages = sitemapPaths().filter((p) => p.path.startsWith("/sizes/")).length;
record("sitemap:sizes", sizePages === FILTER_SIZES.length, `${sizePages}/${FILTER_SIZES.length}`);

const sample = firstSellableProduct("20x25x1");
record("live:20x25x1", Boolean(sample), sample?.price.toFixed(2));
if (sample) {
  const live = liveUnitPrice({ size: "20x25x1", merv: sample.merv, isCarbon: sample.isCarbon }, 1);
  record("live:price-match", live === sample.price, `live=${live} list=${sample.price}`);
}

const report = {
  ok: checks.every((c) => c.ok),
  checked: checks.length,
  failed: checks.filter((c) => !c.ok).map((c) => c.id),
  checks,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
