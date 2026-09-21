import "dotenv/config";
import { BRAND_EMAIL } from "../shared/const.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_FILTER_SIZES,
  FILTER_PRODUCT_IMAGE,
  FILTER_SIZES,
  MERV_DISPLAY_ORDER,
  MERV_TYPES,
  FULL_CATALOG,
  SELLABLE_ONLY,
  PACK_QTYS,
  PACK_TIERS,
  THICKNESSES,
  findProductVariant,
  firstSellableProduct,
  getArchivedFilterSize,
  getFilterSize,
  getSizesByThickness,
  isMervKeyOnSale,
  mervTypesForSize,
  packShotSrc,
  packTotal,
  popularSizeSlugs,
  productGalleryFor,
  unitPriceForQty,
} from "../shared/products.ts";
import {
  liveFromPrice,
  liveLadderCount,
  liveListPrice,
  liveUnitPrice,
} from "../shared/pricing/engine.ts";
import { CHANGE_GUIDE_FAQS, SITE_FAQS, buildLlmsTxt, resolveDocumentSeo, sitemapPaths } from "../shared/seo.ts";
import {
  HVAC_CLOGGED_FILTER_FAQ_ANSWER,
  HVAC_OVERDUE_HEADLINE,
  HVAC_OVERDUE_KICKER,
  HVAC_REAL_REPAIRS,
} from "../shared/hvac-overdue-costs.ts";
import { MERV_CAPACITY_NOTE, MERV_PICK_FAQ_ANSWER } from "../shared/merv-capacity.ts";
import { DEFAULT_HERO_LEDE } from "../shared/site-config.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

assert(BRAND_EMAIL === "info@filterhero.net", `brand email should be info@, got ${BRAND_EMAIL}`);
const shippingFaq = SITE_FAQS.find((f) => f.question.toLowerCase().includes("how fast"));
assert(shippingFaq, "homepage FAQ must ask how fast filters ship");
assert(
  /2–3 day|2-3 day/i.test(shippingFaq.answer) && !/free shipping/i.test(shippingFaq.answer),
  `shipping FAQ must be 2–3 day with no free-shipping promise, got: ${shippingFaq.answer}`,
);
const sizeDoc = resolveDocumentSeo("/sizes/20x25x1", "https://filterhero.net");
assert(
  /2–3 day/i.test(sizeDoc.description) && !/free shipping/i.test(sizeDoc.description),
  `size SEO must mention 2–3 day delivery, got: ${sizeDoc.description}`,
);
const sizeJson = JSON.stringify(sizeDoc.jsonLd ?? []);
assert(sizeJson.includes("9.99"), "20x25x1 JSON-LD must use live qty-1 $9.99");
const homeDoc = resolveDocumentSeo("/", "https://filterhero.net");
assert(
  /2–3 day/i.test(JSON.stringify(homeDoc.jsonLd ?? [])) &&
    !/free shipping/i.test(JSON.stringify(homeDoc.jsonLd ?? [])),
  "homepage FAQ JSON-LD must say 2–3 day delivery, not free shipping",
);
assert(!FULL_CATALOG, "VITE_FULL_CATALOG / FULL_CATALOG must be false — checkout is the XLS");
assert(SELLABLE_ONLY, "checkout allowlist is SELLABLE_ONLY");
assert(
  ALL_FILTER_SIZES.length > 9000,
  `archived catalog should stay intact, got ${ALL_FILTER_SIZES.length}`,
);
assert(
  FILTER_SIZES.length < ALL_FILTER_SIZES.length,
  `shop catalog is the XLS (${FILTER_SIZES.length}), not the full archive (${ALL_FILTER_SIZES.length})`,
);
assert(
  THICKNESSES.join(",") === "0.5,1,2,4,5",
  `thicknesses drifted: ${THICKNESSES.join(",")}`,
);
assert(
  MERV_TYPES.every((t) => /^#[0-9a-f]{6}$/i.test(t.badgeColor)),
  "every MERV type needs a badge color",
);
assert(
  MERV_DISPLAY_ORDER.join(",") === "8,carbon,11,13",
  `MERV display order must be 8, Carbon, 11, 13, got ${MERV_DISPLAY_ORDER.join(",")}`,
);
assert(
  MERV_TYPES.find((t) => t.key === "carbon")?.badgeColor === "#111111",
  "MERV 8 Carbon badge must stay black",
);
assert(packShotSrc(8) === FILTER_PRODUCT_IMAGE, "default pack shot is MERV 8");
assert(packShotSrc(8).includes("merv-8-packshot"), "every MERV 8 pack uses the official single-filter pack shot");
assert(productGalleryFor(8)[0].src === packShotSrc(8), "MERV 8 gallery hero is the official pack shot");
assert(packShotSrc(11).includes("merv-11-packshot"), "every MERV 11 pack uses the official single-filter pack shot");
assert(productGalleryFor(11)[0].src === packShotSrc(11), "MERV 11 gallery hero is the official pack shot");
assert(
  !productGalleryFor(11).some((shot) => shot.src.includes("6pack") || shot.src.includes("thin-rectangle")),
  "MERV 11 gallery must not use the stamped 6-pack",
);
assert(packShotSrc(13).includes("merv-13-packshot"), "every MERV 13 pack uses the official single-filter pack shot");
assert(productGalleryFor(13)[0].src === packShotSrc(13), "MERV 13 gallery hero is the official pack shot");
assert(
  !productGalleryFor(13).some((shot) => shot.src.includes("6pack") || shot.src.includes("thin-rectangle")),
  "MERV 13 gallery must not use the stamped 6-pack",
);
assert(packShotSrc(8, true).includes("merv-carbon-packshot"), "carbon uses the official Filter Hero pack shot");
assert(
  !productGalleryFor(8, true).some((shot) => shot.src.includes("6pack") || shot.src.includes("thin-rectangle")),
  "carbon gallery must not use the stamped 6-pack",
);
const productsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client/public/products");
for (const key of ["8", "11", "13", "carbon"] as const) {
  for (const suffix of ["thin-rectangle-6pack", "thin-rectangle-no-labels", "layers"] as const) {
    const file = path.join(productsDir, `merv-${key}-${suffix}.png`);
    assert(fs.existsSync(file), `missing pack shot ${file}`);
  }
}
assert(fs.existsSync(path.join(productsDir, "merv-8-macro.png")), "shared macro shot missing");
for (const key of ["8", "11", "13", "carbon"] as const) {
  const label = key === "carbon" ? "carbon" : `MERV ${key}`;
  assert(fs.existsSync(path.join(productsDir, `merv-${key}-packshot.png`)), `official ${label} pack shot missing`);
  assert(
    fs.existsSync(path.join(productsDir, "source", `merv-${key}-packshot.png`)),
    `official ${label} pack shot source missing`,
  );
}
assert(fs.existsSync(path.join(productsDir, "source", "merv-8-thin-rectangle-6pack.png")), "MERV 8 source 6-pack missing");
assert(
  !productGalleryFor(13).some((shot) => shot.src.includes("merv-8-thin")),
  "MERV 13 gallery must not reuse MERV 8 pack photos",
);
const popularSlugs = popularSizeSlugs(8);
assert(popularSlugs.includes("16x25x2") && popularSlugs.includes("20x25x2"), "popular chips must include 16x25x2 and 20x25x2");
assert(getFilterSize("20x25x4"), "20x25x4 is on the Model Pricing XLS and must be shoppable");

const popular = getFilterSize("20x25x1");
assert(popular, "20x25x1 must exist");
assert(popular.depth === 1 && popular.width === 20 && popular.length === 25, "20x25x1 dims");
assert(PACK_QTYS.length === 12 && PACK_QTYS[0] === 1 && PACK_QTYS[11] === 12, "size page qty is 1–12");
assert(
  PACK_TIERS.map((t) => t.minQty).join(",") === "1,2,4,6,12",
  "volume ladder rungs stay 1 / 2 / 4 / 6+ / 12+",
);

for (const type of mervTypesForSize("20x25x1")) {
  const variant = findProductVariant("20x25x1", type.merv, type.isCarbon);
  assert(variant, `missing 20x25x1 ${type.name}`);
  assert(variant.inStock, `${type.name} 20x25x1 should be in stock`);
  const unit1 = unitPriceForQty(variant.price, 1, variant);
  const unit6 = unitPriceForQty(variant.price, 6, variant);
  assert(unit1 > 0 && unit6 > 0, `${type.name} prices must be positive`);
  assert(unit6 <= unit1, `${type.name} 6-pack unit should not exceed 1-pack (${unit6} vs ${unit1})`);
  const total6 = packTotal(variant.price, 6, variant);
  assert(Math.abs(total6 - unit6 * 6) < 0.02, `${type.name} pack total mismatch`);
}

assert(getFilterSize("20x25x4"), "20x25x4 must be shoppable on the XLS");
assert(getArchivedFilterSize("20x25x4"), "20x25x4 must stay in the archived catalog");
const fourteen = findProductVariant("14x25x1", 8);
assert(fourteen?.inStock, "14x25x1 MERV 8 is on the Model Pricing XLS");
assert(!findProductVariant("14x25x1", 11)?.inStock, "14x25x1 MERV 11 is off-XLS — quote, not Stripe");
assert(findProductVariant("16x25x4", 8)?.inStock, "16x25x4 MERV 8 is on the XLS");
assert(
  mervTypesForSize("14x25x1").map((t) => t.key).join(",") === "8",
  "14x25x1 XLS line is MERV 8 only",
);

let sellableCount = 0;
for (const size of FILTER_SIZES) {
  for (const type of mervTypesForSize(size.slug)) {
    const variant = findProductVariant(size.slug, type.merv, type.isCarbon);
    if (!variant?.inStock) continue;
    sellableCount += 1;
    assert(variant.filterKingUrl?.includes("filterking.com"), `${size.slug} needs a Filter King URL`);
    const list = variant.price;
    assert(list > 0, `${size.slug} ${type.name} list must be positive`);
    let previous = list;
    for (const qty of [1, 2, 4, 6, 12]) {
      const unit = unitPriceForQty(list, qty, variant);
      assert(unit > 0, `missing unit for ${size.slug} ${type.name} qty ${qty}`);
      assert(
        unit <= previous,
        `${size.slug} ${type.name} qty ${qty} unit $${unit} must not exceed the previous rung $${previous}`,
      );
      previous = unit;
    }
  }
}
assert(liveFromPrice("8") === 9.99, "MERV 8 card must be Filtrete qty-1 $9.99");
assert(liveFromPrice("11") === 13.49, "MERV 11 card must be Filtrete qty-1 $13.49");
assert(liveFromPrice("13") === 22.99, "MERV 13 card must be Filtrete qty-1 $22.99");
assert(liveFromPrice("carbon") === 16.7, "Carbon card must be Filtrete odor qty-1 $16.70");
for (const type of MERV_TYPES) {
  if (!isMervKeyOnSale(type.key)) continue;
  const live = liveFromPrice(type.key);
  assert(
    type.fromPrice === live,
    `${type.shortLabel} card from $${type.fromPrice.toFixed(2)} must match Filtrete liveFromPrice $${live?.toFixed(2)}`,
  );
}
assert(sellableCount > 200, `XLS sellable SKUs too small: ${sellableCount}`);

const sizePages = sitemapPaths().filter((p) => p.path.startsWith("/sizes/")).length;
assert(sizePages === FILTER_SIZES.length, `sitemap size pages ${sizePages} must match shop catalog`);

const ladders = liveLadderCount();
assert(ladders > 50, `live ladder table looks empty: ${ladders}`);
const live = liveListPrice("20x25x1", 8);
assert(live === 9.99, `20x25x1 MERV 8 qty 1 must match Filtrete $9.99, got ${live}`);
for (const slug of popularSizeSlugs(13)) {
  const variant = firstSellableProduct(slug);
  assert(variant, `popular size ${slug} needs a sellable variant`);
  const schema = unitPriceForQty(variant.price, 1, variant);
  const liveQty1 = liveUnitPrice(
    { size: slug, merv: variant.merv, isCarbon: variant.isCarbon },
    1,
  );
  if (liveQty1 != null) {
    assert(
      schema === liveQty1,
      `${slug} schema/cart qty 1 $${schema} must be live $${liveQty1}`,
    );
  } else {
    assert(schema > 0, `${slug} still needs a shopper unit`);
  }
}
assert(liveListPrice("20x20x1", 8) === 9.99, "20x20x1 MERV 8 qty 1 must match Filtrete $9.99");
assert(liveListPrice("16x25x1", 8) === 9.99, "16x25x1 MERV 8 qty 1 must match Filtrete $9.99");
assert(liveListPrice("20x20x1", 11) === 13.49, "20x20x1 MERV 11 qty 1 must match Filtrete $13.49");
assert(liveListPrice("20x25x1", 13) === 22.99, "20x25x1 MERV 13 qty 1 must match Filtrete $22.99");
assert(
  liveListPrice("20x25x1", 8, true) === 16.7,
  `20x25x1 MERV 8 Carbon qty 1 must match Filtrete odor $16.70, got ${liveListPrice("20x25x1", 8, true)}`,
);
assert(liveListPrice("20x20x1", 8, true) === 16.7, "20x20x1 carbon qty 1 must match Filtrete odor $16.70");
assert(
  typeof liveUnitPrice({ size: "20x25x1", merv: 8, isCarbon: true }, 6) === "number" &&
    (liveUnitPrice({ size: "20x25x1", merv: 8, isCarbon: true }, 6) as number) <= 16.7,
  "carbon 6-pack must not exceed the Filtrete odor single",
);
const live2 = liveUnitPrice({ size: "20x20x1", merv: 8 }, 2);
assert(typeof live2 === "number" && live2 <= 9.99, `20x20x1 MERV 8 qty 2 must not exceed the Filtrete single (${live2})`);
assert(liveUnitPrice({ size: "20x20x1", merv: 11 }, 2) === 11, "20x20x1 MERV 11 qty 2 must match Filtrete $11.00");
assert(liveUnitPrice({ size: "16x25x1", merv: 11 }, 2) === 11, "16x25x1 MERV 11 qty 2 must match Filtrete $11.00");
assert(liveUnitPrice({ size: "16x25x1", merv: 13 }, 2) === 15, "16x25x1 MERV 13 qty 2 must match Filtrete $15.00");
assert(liveUnitPrice({ size: "20x25x1", merv: 13 }, 2) === 21, "20x25x1 MERV 13 qty 2 must match Filtrete $21.00");
assert(liveUnitPrice({ size: "20x20x1", merv: 8 }, 12) === 5.18, "20x20x1 MERV 8 qty 12 must match Filtrete Walmart $5.18");
assert(liveUnitPrice({ size: "16x25x1", merv: 8 }, 12) === 5.83, "16x25x1 MERV 8 qty 12 must match Filtrete $5.83");
assert(liveUnitPrice({ size: "20x25x1", merv: 8 }, 6) === 9.17, "20x25x1 MERV 8 qty 6 must match Filtrete $9.17");
assert(
  liveUnitPrice({ size: "20x25x1", merv: 8 }, 12) === 9.17,
  "20x25x1 MERV 8 qty 12 keeps the $9.17 6-pack — no Filtrete 12-pack, do not jump back to $9.99",
);
assert(
  liveUnitPrice({ size: "20x25x1", merv: 11 }, 6) === 11,
  "20x25x1 MERV 11 qty 6 keeps the $11 2-pack when no Filtrete 6-pack exists",
);
assert(liveUnitPrice({ size: "16x25x1", merv: 8 }, 4) === 9.99, "16x25x1 MERV 8 qty 4 caps at the $9.99 single — Filtrete 4-pack $10.05 is worse");
assert(liveUnitPrice({ size: "20x20x1", merv: 8 }, 4) === 9.99, "20x20x1 MERV 8 qty 4 caps at the $9.99 single — Filtrete 4-pack $11.50 is worse");
assert(liveUnitPrice({ size: "20x30x1", merv: 8 }, 4) === 9.99, "20x30x1 MERV 8 qty 4 caps at the $9.99 single — Filtrete 4-pack $11.49 is worse");
assert(liveUnitPrice({ size: "16x25x1", merv: 11 }, 6) === 11, "16x25x1 MERV 11 qty 6 must match Filtrete $11.00");
assert(liveUnitPrice({ size: "14x25x1", merv: 11 }, 2) === 13.49, "14x25x1 MERV 11 qty 2 stays at the Filtrete single — no invented 2-pack");
const live6 = liveUnitPrice({ size: "20x25x1", merv: 8 }, 6);
assert(typeof live6 === "number" && live6 <= (live as number), "live 6-pack should undercut or match list");
assert(liveListPrice("20x25x4", 8) === undefined, "thick sizes have no Filtrete ticket — depth fallback is products.ts");
const thick = findProductVariant("16x25x4", 11);
assert(thick && thick.price > 22.99, `4-inch qty 1 is still above the 1-inch Filtrete 13 ticket, got ${thick?.price}`);

const inch = getSizesByThickness(1);
assert(inch.length > 20, `1" catalog too small: ${inch.length}`);
const halfWidths = inch.filter((s) => s.width % 1 !== 0);
assert(halfWidths.length > 0, "expected some half-inch widths in the 1\" catalog");
const sample = halfWidths[0];
const whole = Math.floor(sample.width);
const matched = inch.filter((s) => Math.floor(s.width) === whole);
assert(
  matched.some((s) => s.slug === sample.slug),
  `width chip ${whole}" must include ${sample.slug}`,
);
assert(
  matched.every((s) => s.depth === 1),
  "width filter must stay on the selected depth",
);

const odd = getFilterSize("20.5x25x1") ?? inch.find((s) => s.width % 1 !== 0);
assert(odd, "need a fractional-width size to prove the directory filter");

const clogged = CHANGE_GUIDE_FAQS.find((f) =>
  f.question.toLowerCase().includes("change my air filter") &&
  f.question.toLowerCase().includes("happen"),
);
assert(clogged, "change-guide FAQ must ask what happens if you skip a change");
assert(
  clogged.answer === HVAC_CLOGGED_FILTER_FAQ_ANSWER,
  "clogged-filter FAQ must use named HVAC repairs",
);
assert(HVAC_REAL_REPAIRS.length === 5, `expected 5 named repairs, got ${HVAC_REAL_REPAIRS.length}`);
assert(
  HVAC_OVERDUE_KICKER === "Skip a change?",
  `overdue kicker must stay Skip a change?, got: ${HVAC_OVERDUE_KICKER}`,
);
assert(
  HVAC_OVERDUE_HEADLINE === "A dirty filter costs more than the filter.",
  `overdue headline must sell the filter-vs-repair math, got: ${HVAC_OVERDUE_HEADLINE}`,
);
{
  const prices = HVAC_REAL_REPAIRS.map((r) => r.price).join("|");
  assert(
    prices === "$150–$450|$350–$900|$600–$2,500|$1,200–$3,000|$1,000–$3,000",
    `named repair prices drifted: ${prices}`,
  );
}
assert(MERV_PICK_FAQ_ANSWER.toLowerCase().includes("resistance"), "MERV pick FAQ must mention resistance");
assert(MERV_CAPACITY_NOTE.toLowerCase().includes("capacity"), "MERV capacity note must mention capacity");

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const heroSrc = fs.readFileSync(path.join(srcRoot, "client/src/components/Hero.tsx"), "utf8");
assert(!heroSrc.includes("character-fly-natural"), "hero must not remount the flight video");
assert(!heroSrc.includes("character-fly-still"), "hero must not park the flyer behind the packs");
assert(!heroSrc.includes("hero-sky-fill"), "hero must not mount the receded sky still");
assert(!heroSrc.includes("fh-sells-fk"), "hero must not restore the Filter King now-at lockup");
assert(heroSrc.includes("pack-merv11.png"), "hero MERV 11 uses pack-merv11.png");
assert(heroSrc.includes("?v=fh244"), "hero pack cache-bust matches Filter Hero branded shots");
assert(heroSrc.includes("hero-lockup-mascot"), "mascot sits on the word Hero");
assert(heroSrc.includes("lockup-mascot.png?v=fh249"), "lockup mascot cache-bust includes the full-foot flyer");
assert(!heroSrc.includes("useKnockoutLogo"), "hero lockup uses the pre-cut flyer, not a boxed logo.png crop");
assert(
  !/hero-lockup-mascot[\s\S]{0,400}character-fly-still/.test(heroSrc),
  "lockup mascot must not use the 16:9 fly plate",
);
const cssSrc = fs.readFileSync(path.join(srcRoot, "client/src/index.css"), "utf8");
assert(cssSrc.includes("translateY(0.09em)"), "lockup mascot sits another hair lower than the FILTER HERO cap line");
assert(cssSrc.includes("--brand-band-fill"), "hero and Who you're protecting share one navy fill");
assert(
  cssSrc.includes("linear-gradient(90deg, #1a3058 0%, #2a4d82 48%, #3a66a3 100%)"),
  "brand-band fill is the chrome 90deg navy",
);
const headerSrc = fs.readFileSync(path.join(srcRoot, "client/src/components/SiteHeader.tsx"), "utf8");
assert(headerSrc.includes("md:py-1\""), "shopper header padding stays a tad shorter than md:py-1.5");
assert(!headerSrc.includes("md:py-1.5"), "shopper header must not grow back to md:py-1.5");
assert(!headerSrc.includes("md:py-2\""), "shopper header must not grow back to md:py-2");
assert(!headerSrc.includes("md:py-2.5"), "shopper header must not grow back to md:py-2.5");
assert(!headerSrc.includes("md:py-3"), "shopper header must not grow back to md:py-3");
assert(headerSrc.includes('["shop", "Shop"]'), "primary nav still starts with Shop");
assert(headerSrc.includes('["howto", "How-to"]'), "How-to sits next to Shop in the primary nav");
assert(!headerSrc.includes('["brands", "Brands"]'), "Brands is not a top-level nav tab");
assert(headerSrc.includes('desktopMenu === "howto"'), "How-to opens the how-to mega");
assert(!headerSrc.includes('desktopMenu === "brands"'), "Brands mega must not come back as its own tab");
{
  const shopMega = headerSrc.slice(
    headerSrc.indexOf('desktopMenu === "shop"'),
    headerSrc.indexOf('desktopMenu === "howto"'),
  );
  assert(shopMega.includes("All sizes"), "Shop mega still has All sizes");
  assert(shopMega.includes("ShopBrandsFold"), "Brands live inside the Shop mega");
  assert(
    shopMega.indexOf("All sizes") < shopMega.indexOf("ShopBrandsFold"),
    "Brands sit under the All sizes link in Shop",
  );
}
assert(headerSrc.includes("header-brands-toggle"), "Shop Brands fold is a disclosure");
assert(headerSrc.includes("shopBrandsOpen"), "Shop Brands starts collapsed until opened");
const homeSrc = fs.readFileSync(path.join(srcRoot, "client/src/pages/Home.tsx"), "utf8");
assert(homeSrc.includes("OverdueCostsBand"), "home popular-sizes band is the overdue repair band");
assert(!homeSrc.includes("PopularSizesCarousel"), "home must not mount popular sizes above the directory");
const sizeSrc = fs.readFileSync(path.join(srcRoot, "client/src/pages/SizeDetail.tsx"), "utf8");
assert(sizeSrc.includes("HowToReplaceGuide"), "size pages need how-to-replace");
assert(sizeSrc.includes("ProductOverduePanel"), "size PDP overdue panel is navy named repairs");
assert(sizeSrc.includes("HVAC_REAL_REPAIRS") === false, "size PDP pulls named repairs from ProductOverduePanel");
assert(!sizeSrc.includes("pdp-overdue"), "size PDP must not restore the iced-coil rewrite panel");
assert(
  !sizeSrc.includes("HVAC_FILTER_VS_REPAIR"),
  "size PDP must not restore the iced-coil punch",
);
assert(sizeSrc.includes("pdp-qty-ladder"), "size qty shows Qty / Each / Savings ladder");
assert(sizeSrc.includes("Increase pack quantity"), "pack stepper must not collide with cart ± labels");
assert(sizeSrc.includes("Most popular"), "6+ stays Most popular");
assert(sizeSrc.includes("Best value"), "12+ stays Best value");
const overduePanelSrc = fs.readFileSync(
  path.join(srcRoot, "client/src/components/ProductOverduePanel.tsx"),
  "utf8",
);
assert(overduePanelSrc.includes("HVAC_REAL_REPAIRS"), "product overdue panel lists the five named repairs");
assert(overduePanelSrc.includes("product-overdue"), "product overdue panel uses the navy named-repair card");
assert(!overduePanelSrc.includes("pdp-overdue"), "product overdue panel must not restore the iced-coil rewrite");
const sizeBrowseSrc = fs.readFileSync(path.join(srcRoot, "client/src/pages/SizeBrowse.tsx"), "utf8");
assert(sizeBrowseSrc.includes("ProductOverduePanel"), "size catalog and thickness hubs carry the named-repair card");
assert(!sizeSrc.includes("Filter King"), "PDP must not name Filter King");
assert(!sizeSrc.includes("filterking.com"), "PDP must not link filterking.com");
assert(!sizeSrc.includes("Matching Filter King"), "PDP must not restore the Filter King page link");
assert(!sizeBrowseSrc.includes("Filter King"), "size catalog must not name Filter King");
assert(!DEFAULT_HERO_LEDE.includes("Filter King"), "default hero lede must not name Filter King");
{
  const siteConfigJson = fs.readFileSync(
    path.join(srcRoot, "server/data/site-config.json"),
    "utf8",
  );
  assert(!siteConfigJson.includes("Filter King"), "saved hero copy must not name Filter King");
  const llms = buildLlmsTxt("https://filterhero.net");
  assert(!llms.includes("Filter King"), "/llms.txt must not name Filter King");
  assert(
    !SITE_FAQS.some((f) => /filter king/i.test(`${f.question} ${f.answer}`)),
    "FAQs must not name Filter King",
  );
  const shopperRoot = path.join(srcRoot, "client/src");
  const stack = [shopperRoot];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!/\.(tsx?|jsx?)$/.test(name)) continue;
      const text = fs.readFileSync(full, "utf8");
      assert(
        !/Filter King/i.test(text) && !/filterking\.com/i.test(text),
        `${path.relative(srcRoot, full)} must not mention Filter King`,
      );
    }
  }
}
const brandBrowseSrc = fs.readFileSync(path.join(srcRoot, "client/src/pages/BrandBrowse.tsx"), "utf8");
assert(brandBrowseSrc.includes("ProductOverduePanel"), "brand product pages carry the named-repair card");
const customSrc = fs.readFileSync(path.join(srcRoot, "client/src/pages/CustomAirFilters.tsx"), "utf8");
assert(customSrc.includes("ProductOverduePanel"), "custom quote page carries the named-repair card");
const overdueBandSrc = fs.readFileSync(
  path.join(srcRoot, "client/src/components/OverdueCostsBand.tsx"),
  "utf8",
);
assert(overdueBandSrc.includes("HVAC_REAL_REPAIRS"), "home overdue band lists the five named repairs");
assert(
  !overdueBandSrc.includes("The expensive filter is the late one"),
  "home overdue band must not restore the late-one kicker",
);
const guideSrc = fs.readFileSync(
  path.join(srcRoot, "client/src/pages/FilterChangeGuide.tsx"),
  "utf8",
);
assert(guideSrc.includes("HVAC_WAIT_STAGES"), "change-guide overdue curve uses shared wait stages");
assert(!guideSrc.includes("$150–$500"), "change-guide must not restore iced-coil $150–$500");
assert(
  !guideSrc.includes("Iced evaporator coils"),
  "change-guide must not restore the iced-coil wait-stage line",
);
const trustSrc = fs.readFileSync(path.join(srcRoot, "client/src/components/TrustSection.tsx"), "utf8");
assert(trustSrc.includes("Built to last"), "Why Filter Hero card 2 is Built to last");
assert(trustSrc.includes("merv-8-layers.png"), "Built to last uses the layers diagram");
const captureSrc = fs.readFileSync(path.join(srcRoot, "client/src/components/CaptureDots.tsx"), "utf8");
assert(captureSrc.includes("#111111"), "Carbon Capture dots are black, not silver");

console.log("Shop / catalog / pricing checks passed.");
console.log(
  JSON.stringify(
    {
      sizes: FILTER_SIZES.length,
      archivedSizes: ALL_FILTER_SIZES.length,
      sellableSkus: sellableCount,
      liveLadders: ladders,
      list20x25x1: live,
      pack6_20x25x1: live6,
      inchSizes: inch.length,
      widthChipIncludes: sample.slug,
      email: BRAND_EMAIL,
    },
    null,
    2,
  ),
);

