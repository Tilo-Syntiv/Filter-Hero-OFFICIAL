import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LIFE } from "../client/src/data/life-photos.ts";
import { HVAC_BRAND_LIST, catalogSizeForSlug } from "../shared/hvac-brands.ts";
import {
  FILTER_SIZES,
  THICKNESSES,
  findProductVariant,
  getFilterSize,
  packShotSrc,
  popularSizeSlugs,
  productGalleryFor,
  sellableSheetProducts,
} from "../shared/products.ts";
import { sitemapPaths } from "../shared/seo.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "client", "public");
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";
const API = process.env.SMOKE_API || "http://127.0.0.1:3001";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function publicFile(urlPath: string) {
  return path.join(PUBLIC, urlPath.replace(/^\//, "").split("?")[0]);
}

async function get(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { res, text, json };
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { res, text, json };
}

const missing: string[] = [];
for (const photo of Object.values(LIFE)) {
  if (!fs.existsSync(publicFile(photo.src))) missing.push(photo.src);
}
for (const brand of HVAC_BRAND_LIST) {
  const src = `/brands/${brand.slug}.svg`;
  if (!fs.existsSync(publicFile(src))) missing.push(src);
}
for (const asset of [
  "/logo.png",
  "/logo-checkout.png",
  "/favicon.png",
  "/hero/pack-merv8.png",
  "/hero/pack-merv11.png",
  "/hero/pack-merv13.png",
  "/hero/showcase-carbon.png",
  "/hero/character-fly-still.png",
  "/hero/lockup-mascot.png",
  "/products/merv-8-layers.png",
]) {
  if (!fs.existsSync(publicFile(asset))) missing.push(asset);
}
for (const [merv, carbon] of [
  [8, false],
  [11, false],
  [13, false],
  [8, true],
] as const) {
  for (const shot of productGalleryFor(merv, carbon)) {
    if (!fs.existsSync(publicFile(shot.src))) missing.push(shot.src);
  }
  if (!fs.existsSync(publicFile(packShotSrc(merv, carbon)))) {
    missing.push(packShotSrc(merv, carbon));
  }
}
assert(missing.length === 0, `missing public assets:\n${missing.join("\n")}`);

const uncataloguedBrandSizes = new Set<string>();
for (const brand of HVAC_BRAND_LIST) {
  for (const size of brand.sizes) {
    if (!getFilterSize(size)) uncataloguedBrandSizes.add(`${brand.slug}:${size}`);
  }
  for (const row of [...brand.models, ...brand.oemParts]) {
    if (!getFilterSize(row.size)) uncataloguedBrandSizes.add(`${brand.slug}:${row.size}`);
  }
}

for (const slug of popularSizeSlugs(12)) {
  assert(getFilterSize(slug), `popular slug missing from shop: ${slug}`);
}

async function main() {
const health = await get(`${API}/api/health`);
assert(health.res.ok, `health ${health.res.status}`);
assert((health.json as { ok?: boolean })?.ok === true, "health.ok");
assert(!health.res.headers.get("x-powered-by"), "API must not send X-Powered-By");
assert(health.res.headers.get("x-content-type-options") === "nosniff", "API nosniff");
assert(health.res.headers.get("x-frame-options") === "DENY", "API deny framing");
assert(
  (health.res.headers.get("content-security-policy") || "").includes("default-src 'self'"),
  "API must send CSP",
);

const unknownApiGet = await get(`${API}/api/does-not-exist`);
assert(unknownApiGet.res.status === 404, `unknown API GET should 404, got ${unknownApiGet.res.status}`);
assert(
  (unknownApiGet.json as { code?: string })?.code === "not_found",
  "unknown API GET must name not_found",
);
assert(!/cannot get|<!doctype html/i.test(unknownApiGet.text), "unknown API GET must not be HTML");
const unknownApiPost = await post(`${API}/api/does-not-exist`, {});
assert(unknownApiPost.res.status === 404, `unknown API POST should 404, got ${unknownApiPost.res.status}`);
assert(
  (unknownApiPost.json as { code?: string })?.code === "not_found",
  "unknown API POST must name not_found",
);
assert(!/cannot post|<!doctype html/i.test(unknownApiPost.text), "unknown API POST must not be HTML");

const products = await get(`${API}/api/products`);
assert(products.res.ok, `products ${products.res.status}`);
const meta = products.json as { sizeCount?: number };
assert(meta.sizeCount === FILTER_SIZES.length, `API sizeCount ${meta.sizeCount} != ${FILTER_SIZES.length}`);

const klaviyoConfig = await get(`${API}/api/klaviyo/config`);
assert(klaviyoConfig.res.ok, `klaviyo config ${klaviyoConfig.res.status}`);
assert(
  typeof (klaviyoConfig.json as { publicKey?: unknown })?.publicKey === "string",
  "klaviyo config must be JSON with publicKey",
);

const klaviyoCatalog = await get(`${API}/api/klaviyo/catalog.json`);
assert(klaviyoCatalog.res.ok, `klaviyo catalog ${klaviyoCatalog.res.status}`);
const feed = klaviyoCatalog.json as { items?: unknown[] };
assert(Array.isArray(feed.items) && feed.items.length > 0, "klaviyo catalog.json must list items");
if (!/^https:\/\/filterhero\.net/i.test(API)) {
  const live = sellableSheetProducts().length;
  assert(
    feed.items.length === live,
    `local catalog.json must match live stock (${live}), got ${feed.items.length}`,
  );
}

const sizeSsr = await get(`${API}/sizes/20x25x1`);
assert(sizeSsr.res.ok, `size SSR ${sizeSsr.res.status}`);
assert(sizeSsr.text.includes("application/ld+json"), "size page must ship JSON-LD");
assert(sizeSsr.text.includes("OfferShippingDetails"), "size JSON-LD must include free-shipping offer");
assert(
  sizeSsr.text.includes("https://filterhero.net/sizes/20x25x1"),
  "size speakable/product JSON-LD must use the size URL",
);

const sitemap = await get(`${API}/sitemap.xml`);
assert(sitemap.res.ok, `sitemap ${sitemap.res.status}`);
assert(sitemap.text.includes("<urlset"), "sitemap missing urlset");
assert(sitemap.text.includes("/sizes/20x25x1"), "sitemap missing 20x25x1");

const robots = await get(`${API}/robots.txt`);
assert(robots.res.ok && robots.text.includes("Sitemap:"), "robots");
assert(/Disallow: \/admin/.test(robots.text), "robots must disallow /admin");
assert(/Disallow: \/login/.test(robots.text), "robots must disallow /login");
assert(/Disallow: \/account/.test(robots.text), "robots must disallow /account");

const llms = await get(`${API}/llms.txt`);
assert(llms.res.ok && llms.text.toLowerCase().includes("filter hero"), "llms.txt");
assert(/2–3 day|2-3 day/i.test(llms.text) && !/free shipping/i.test(llms.text), "llms.txt must say 2–3 day delivery, not free shipping");
assert(!/filter king/i.test(llms.text), "llms.txt must not name Filter King");

const siteConfig = await get(`${API}/api/site-config`);
assert(siteConfig.res.ok, "site-config");
const heroLede = String(
  ((siteConfig.json as { data?: { heroLede?: string } })?.data?.heroLede) || "",
);
assert(heroLede.length > 0, "site-config hero lede");
assert(!/filter king/i.test(heroLede), "site-config hero lede must not name Filter King");

const pages = [
  "/",
  "/sizes",
  "/sizes/20x25x1",
  "/sizes/20x25x1?merv=carbon",
  "/sizes/20x25x4",
  "/sizes/not-a-real-size",
  "/filters/1-inch",
  "/filters/0.5-inch",
  "/filters/2-inch",
  "/filters/4-inch",
  "/filters/5-inch",
  "/filters/3-inch",
  "/brands",
  "/brands/carrier",
  "/brands/not-a-brand",
  "/custom-air-filters",
  "/custom-air-filters?size=19.5x23.5x1",
  "/how-often-to-change-air-filter",
  "/checkout/success",
  "/checkout/cancel",
  "/login",
  "/account",
  "/admin",
  "/admin/login",
  "/404",
  "/this-route-does-not-exist",
];
for (const page of pages) {
  const hit = await get(`${BASE}${page}`);
  assert(hit.res.ok, `${page} returned ${hit.res.status}`);
  assert(hit.text.includes("<div id=\"root\">") || hit.text.includes("id=\"root\""), `${page} is not the SPA shell`);
}

const badContact = await post(`${API}/api/contact`, { name: "", email: "nope", message: "" });
if (badContact.res.status === 429) {
  const code = (badContact.json as { code?: string })?.code;
  assert(code === "rate_limited_contact", `contact 429 should name the limiter, got ${badContact.text}`);
} else {
  assert(badContact.res.status === 400, `invalid contact should 400, got ${badContact.res.status}`);
}

const trapped = await post(`${API}/api/contact`, {
  name: "Smoke Bot",
  email: "smoke-bot@example.com",
  message: "honeypot",
  intent: "support",
  website: "http://spam.example",
});
if (trapped.res.status === 429) {
  const code = (trapped.json as { code?: string })?.code;
  assert(code === "rate_limited_contact", `contact 429 should name the limiter, got ${trapped.text}`);
} else {
  assert(trapped.res.ok, `honeypot contact failed ${trapped.res.status} ${trapped.text}`);
  assert((trapped.json as { id?: string })?.id === "ignored", "filled honeypot must not create a lead");
}

const crmGate = await get(`${API}/api/crm/health`);
assert(crmGate.res.status === 401, `CRM health must require a session, got ${crmGate.res.status}`);
const accountGate = await get(`${API}/api/account/health`);
assert(
  accountGate.res.status === 401,
  `account health must require a session, got ${accountGate.res.status}`,
);
const detailGate = await get(`${API}/api/health/detail`);
assert(detailGate.res.status === 401, `health detail must require staff, got ${detailGate.res.status}`);

const badIdentify = await post(`${API}/api/identify`, { email: "nope" });
assert(badIdentify.res.status === 400, `invalid identify should 400, got ${badIdentify.res.status}`);
assert(
  (badIdentify.json as { code?: string })?.code === "identify_failed",
  "identify errors must use a fixed code",
);
assert(!/expected|invalid_type|Zod/i.test(badIdentify.text), "identify must not leak Zod");

const badTrack = await post(`${API}/api/track`, {});
assert(badTrack.res.status === 400, `invalid track should 400, got ${badTrack.res.status}`);
assert((badTrack.json as { code?: string })?.code === "track_failed", "track errors must use a fixed code");
assert(!/expected|invalid_type|Zod/i.test(badTrack.text), "track must not leak Zod");

const badJson = await fetch(`${API}/api/identify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{not-json",
});
const badJsonText = await badJson.text();
assert(badJson.status === 400, `malformed JSON should 400, got ${badJson.status}`);
assert(/invalid_json/.test(badJsonText), "malformed JSON must name invalid_json");
assert(!/SyntaxError|body-parser/i.test(badJsonText), "malformed JSON must not dump a stack");

const webhook = await post(`${API}/api/stripe/webhook`, {});
assert(webhook.res.status === 400, `unsigned webhook should 400, got ${webhook.res.status}`);
assert((webhook.json as { code?: string })?.code === "webhook_failed", "webhook errors must use a fixed code");
assert(!/stripe-signature|whsec_/i.test(webhook.text), "webhook must not leak signature details");

const variant = findProductVariant("20x25x1", 8);
assert(variant, "20x25x1 MERV 8");
const SAMPLE_SHIP_TO = {
  line1: "123 Main St",
  city: "Miami",
  state: "FL",
  postalCode: "33130",
  country: "US",
};

const checkout = await post(`${API}/api/checkout`, {
  items: [{ productId: variant.id, quantity: 1 }],
  shipTo: SAMPLE_SHIP_TO,
});
if (checkout.res.status === 503) {
  console.warn("Checkout skipped — Stripe is not configured.");
} else if (checkout.res.status === 429) {
  const code = (checkout.json as { code?: string })?.code;
  assert(code === "rate_limited_checkout", `checkout 429 should name the limiter, got ${checkout.text}`);
} else {
  assert(checkout.res.ok, `checkout failed ${checkout.res.status} ${checkout.text}`);
  const url = (checkout.json as { url?: string }).url || "";
  assert(url.includes("checkout.stripe.com") || url.includes("stripe.com"), `unexpected checkout url: ${url}`);
}

const shippingQuote = await post(`${API}/api/shipping/quote`, {
  items: [{ productId: variant.id, quantity: 1 }],
  shipTo: SAMPLE_SHIP_TO,
});
if (shippingQuote.res.status === 429) {
  const code = (shippingQuote.json as { code?: string })?.code;
  assert(
    code === "rate_limited_shipping_quote" || code === "rate_limited_checkout",
    `shipping quote 429 should name the shipping limiter, got ${shippingQuote.text}`,
  );
} else {
  assert(shippingQuote.res.ok, `shipping quote failed ${shippingQuote.res.status} ${shippingQuote.text}`);
  const amount = (shippingQuote.json as { amountCents?: number }).amountCents;
  assert(typeof amount === "number" && amount >= 0, `shipping quote amountCents missing: ${shippingQuote.text}`);
}

const badCheckout = await post(`${API}/api/checkout`, { items: [] });
if (badCheckout.res.status === 429) {
  const code = (badCheckout.json as { code?: string })?.code;
  assert(code === "rate_limited_checkout", `checkout 429 should name the limiter, got ${badCheckout.text}`);
} else {
  assert(badCheckout.res.status === 400, `empty cart checkout should 400, got ${badCheckout.res.status}`);
}

const missingSession = await get(`${API}/api/checkout/session?session_id=not-a-session`);
assert(missingSession.res.status === 400, `bad session should 400, got ${missingSession.res.status}`);

const quoteOrShop = (size: string) =>
  catalogSizeForSlug(size) ? `/sizes/${encodeURIComponent(size)}` : `/custom-air-filters?size=${encodeURIComponent(size)}`;
assert(quoteOrShop("20x25x1").startsWith("/sizes/"), "shoppable size must go to PDP");

console.log("Smoke site checks passed.");
console.log(
  JSON.stringify(
    {
      base: BASE,
      api: API,
      pages: pages.length,
      brands: HVAC_BRAND_LIST.length,
      sizes: FILTER_SIZES.length,
      thicknesses: THICKNESSES.join(","),
      uncataloguedBrandSizes: uncataloguedBrandSizes.size,
      checkout: checkout.res.status,
    },
    null,
    2,
  ),
);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
