# Filter King pricing and size research

Complete written record of the Aug 21–23, 2026 Filter Hero pricing work: common Filter King retail coverage, the 100 most-bought residential sizes, and every line of Paul Sellaro’s 2025 wholesale sheet compared with Filter Hero sell prices. Chat and the live canvases are summaries of this file. Nothing from those three analyses is omitted.

- **Written:** 2026-08-23
- **Retail scrape:** `shared/pricing/fk-live-prices.json`, dated 2026-08-20, source `filterking-local+model`. Notes in the file: “Sale / one-time unit prices. Real scrapes preferred. estimated=true rows are filled from same-size MERV ratios or nearest same-depth area peers.”
- **Catalog counts in that file:** 19,337 scraped + 20,555 estimated = 39,892 size × MERV ladders.
- **Hero formula:** When Filtrete and Filter King both list the same size / MERV / pack, match the cheaper one at list (FH-136). 1-inch qty 1 is Filtrete ($9.99 / $13.49 / $22.99 / carbon $16.70). No Filtrete listing: Filter King sale unit × 0.90 (`UNDERCUT_RATIO`), or × 0.88 when modeled, capped at the Filtrete single. Then match a confirmed FilterBuy sale ticket if cheaper (FH-138). Files: `shared/pricing/engine.ts`, `shared/products.ts`.
- **Wholesale source:** `E:\FILTER HEROE\FK PRICING_SHEET PS (1).pdf` (5 pages, labeled 2025; extracted text in `.firecrawl/fk-wholesale-2025.txt`).
- **Wholesale contact on the sheet:** Filter King LLC, 7301 NW 36th Ct, Miami FL 33147; Paul Sellaro; 305-300-2431; paul@filterking.com.
- **Carbon / odor:** not priced on the wholesale sheet. Page 4: “Our dedicated team will quote any carbon filter size you need in just a minute!”

## Contents

1. [Part 1 — Common Filter King retail prices](#part-1--common-filter-king-retail-prices)
2. [Part 2 — 100 most-bought residential sizes](#part-2--100-most-bought-residential-sizes)
3. [Part 3 — Wholesale sheet vs Filter Hero sell prices](#part-3--wholesale-sheet-vs-filter-hero-sell-prices)

---

## Part 1 — Common Filter King retail prices

Question answered: Filter Hero does not have a complete live scrape of Filter King’s ~40k size × MERV catalog, but **the SKUs people actually buy have live Filter King ladders.** Every Filter Hero shortcut size, every industry-common residential size, and every size on Filter King’s own “popular” homepage lists has a qty 1/2/4/6/12 price. The remaining catalog gap is the long tail (odd custom sizes), not 16x25x1 / 20x25x1 and friends.

### Headline coverage

- **46 / 52** Hero shortcut ladders live-scraped (13 sizes × MERV 8 / 11 / 13 / carbon). **6** modeled. **0** missing.
- **30 / 30** industry-common sizes have a live MERV 8 ladder. **84 / 90** of those sizes × MERV 8/11/13 are live.
- **0** common sizes with no price at all.
- Full catalog: **19,337 live scrapes vs 20,555 modeled fills** = 39,892 ladders (**about 48% live-scraped**).

| Common list | Live scrape ladders | Modeled fill ladders | Missing |
| --- | --- | --- | --- |
| Hero shortcuts (13 sizes × 4 MERV lines = 52) | 46 | 6 | 0 |
| Industry common (30 sizes × MERV 8/11/13 = 90) | 84 | 6 | 0 |
| FK homepage popular MERV 8 | 25 | 5 | 0 |
| FK homepage popular MERV 11 | 28 | 2 | 0 |
| FK homepage popular MERV 13 | 22 | 8 | 0 |
| FK homepage popular carbon | 18 | 12 | 0 |

Hero shortcuts come from `popularSizeSlugs()` in `shared/products.ts`: 16x25x1, 20x25x1, 20x20x1, 16x20x1, 14x25x1, 16x25x2, 20x25x2, 12x24x1, 18x24x1, 20x30x1, 16x20x2, 16x25x4, 20x25x4.

Flagship 1-inch SKUs (16x25x1, 20x25x1, 20x20x1, 16x20x1, 14x25x1) are live-scraped on every MERV line, including carbon.

### Filter Hero shortcut sizes (13 × 4 MERV lines)

| Size | MERV 8 | MERV 11 | MERV 13 | Carbon |
| --- | --- | --- | --- | --- |
| 16x25x1 | Live scrape | Live scrape | Live scrape | Live scrape |
| 20x25x1 | Live scrape | Live scrape | Live scrape | Live scrape |
| 20x20x1 | Live scrape | Live scrape | Live scrape | Live scrape |
| 16x20x1 | Live scrape | Live scrape | Live scrape | Live scrape |
| 14x25x1 | Live scrape | Live scrape | Live scrape | Live scrape |
| 16x25x2 | Live scrape | Live scrape | Live scrape | Live scrape |
| 16x20x2 | Live scrape | Live scrape | Live scrape | Live scrape |
| 16x25x4 | Live scrape | Live scrape | Live scrape | Live scrape |
| 20x25x2 | Live scrape | Modeled | Live scrape | Live scrape |
| 12x24x1 | Live scrape | Modeled | Live scrape | Live scrape |
| 18x24x1 | Live scrape | Live scrape | Modeled | Live scrape |
| 20x25x4 | Live scrape | Live scrape | Live scrape | Modeled |
| 20x30x1 | Live scrape | Live scrape | Modeled | Modeled |

### Modeled leftovers on common SKUs

Still priced. Filled from same-size MERV ratios or nearest same-depth peers, then undercut **12% instead of 10%**.

| Size | Line | Why it matters |
| --- | --- | --- |
| 20x25x2 | MERV 11 | Hero shortcut + industry common |
| 12x24x1 | MERV 11 | Hero shortcut + industry common |
| 18x24x1 | MERV 13 | Hero shortcut + industry common |
| 20x30x1 | MERV 13 | Hero shortcut + industry common |
| 20x30x1 | Carbon | Hero shortcut + industry common |
| 20x25x4 | Carbon | Hero shortcut |
| 10x20x1 | MERV 13 | Industry common |
| 18x20x1 | MERV 13 | Industry common |

### Filter King homepage “popular” lists

Their own popular lists by MERV. Zero missing. Modeled SKUs are mostly oddball 6-inch, half-inch, and carbon variants — not the retail 16×25 / 20×25 pack.

| List | Live scrape | Modeled | Missing |
| --- | --- | --- | --- |
| MERV 8 popular (30 sizes) | 25 | 5 | 0 |
| MERV 11 popular (30 sizes) | 28 | 2 | 0 |
| MERV 13 popular (30 sizes) | 22 | 8 | 0 |
| Carbon popular (30 sizes) | 18 | 12 | 0 |

**Thickness popular (125 sizes):** 121 have at least one live scrape. Only 9.75x23.75x0.5, 6x14x1, 6x30x1, and 30x32x4 are modeled-only. None are missing.

### Industry-common residential sizes (30 faces)

Sizes that dominate retail HVAC (1/2/4/5 inch). Every size has a live MERV 8 ladder.

| Size | MERV 8 | MERV 11 | MERV 13 | Carbon |
| --- | --- | --- | --- | --- |
| 16x20x1 | Live | Live | Live | Live |
| 16x25x1 | Live | Live | Live | Live |
| 20x20x1 | Live | Live | Live | Live |
| 20x25x1 | Live | Live | Live | Live |
| 14x20x1 | Live | Live | Live | Live |
| 14x25x1 | Live | Live | Live | Live |
| 16x20x2 | Live | Live | Live | Live |
| 16x25x2 | Live | Live | Live | Live |
| 20x20x2 | Live | Live | Live | Live |
| 14x25x2 | Live | Live | Live | Live |
| 16x25x4 | Live | Live | Live | Live |
| 20x20x4 | Live | Live | Live | Live |
| 16x20x4 | Live | Live | Live | Live |
| 16x25x5 | Live | Live | Live | Live |
| 20x20x5 | Live | Live | Live | Live |
| 14x14x1 | Live | Live | Live | Live |
| 12x12x1 | Live | Live | Live | Live |
| 16x16x1 | Live | Live | Live | Live |
| 16x24x1 | Live | Live | Live | Live |
| 24x24x1 | Live | Live | Live | Modeled |
| 20x25x4 | Live | Live | Live | Modeled |
| 20x25x5 | Live | Live | Live | Modeled |
| 20x24x1 | Live | Live | Live | Modeled |
| 24x30x1 | Live | Live | Live | Modeled |
| 20x25x2 | Live | Modeled | Live | Live |
| 12x24x1 | Live | Modeled | Live | Live |
| 18x20x1 | Live | Live | Modeled | Live |
| 18x24x1 | Live | Live | Modeled | Live |
| 10x20x1 | Live | Live | Modeled | Modeled |
| 20x30x1 | Live | Live | Modeled | Modeled |

### What we still do not have (retail)

A complete live scrape of Filter King’s ~40k size × MERV catalog. About half of those ladders are modeled. That gap is custom and low-volume sizes, not the filters that show up in a typical residential order.

---

## Part 2 — 100 most-bought residential sizes

US homes, nominal W×L×D in inches. Synthesized Aug 22–23, 2026 from live Amazon Best Sellers, FilterBuy manufacturing claims, Atomic Filters order data, Home Depot / Lowe’s merchandising, Remember The Filter, Filter King popular lists, and OEM media-cabinet SKUs.

**There is no public Nielsen-style unit-sales file that ranks all 100 sizes.** Ranks 1–20 are high-signal (multiple independent sales or order sources). Ranks 21–50 are well-attested standard residential sizes. Ranks 51–100 are catalog-inferred from what big-box and DTC vendors actually stock as “popular,” plus OEM 4–5″ cabinets.

### Core Four (~60–70% of homes)

20x20x1, 16x25x1, 20x25x1, and 16x20x1. There is **no single undisputed #1**:

- **FilterBuy** (Jul 2026, manufacturer): 20x20x1, then 16x25x1, 16x20x1, 20x25x1. FilterBuy also calls 16x25x1 the most common furnace slot — square 20x20 wins more return grilles.
- **Atomic Filters** (order data): 20x20x1 is #1 bestseller. Atomic: popular sizes cover ~80% of systems.
- **Remember The Filter:** 16x25x1 is “MOST ORDERED / Top US size.”
- **Amazon Best Sellers** (furnace filters, live Aug 22, 2026) currently leads with 20x20x1 products.
- **whatairfilter.com:** Core Four cover 60–70% of homes.
- **American Lung Association:** the default residential filter is still 1-inch. Amazon mix matches that (~70% of top-50 SKUs are 1-inch).

### Amazon Best Sellers size mix

Count of furnace-filter SKUs in Amazon’s live top 50 (Aug 22, 2026). This is product rank, not unique households — 20x25x4 is inflated by AprilAire / Filtrete / Filterbuy SKU competition. Source: amazon.com/Best-Sellers-Furnace-Filters/zgbs/hi/13399891

| Nominal size | SKUs in Amazon top 50 (Aug 22, 2026) |
| --- | --- |
| 20x20x1 | 9 |
| 20x25x4 | 8 |
| 20x25x1 | 7 |
| 16x20x1 | 6 |
| 16x25x1 | 4 |
| 20x25x5 | 4 |
| 20x20x2 | 2 |
| 12x12x1 | 2 |
| Other sizes (remaining 8 of 50) | 8 |

| Depth | SKUs in Amazon top 50 |
| --- | --- |
| 1 inch | 35 (70%) |
| 4 inch | 8 |
| 5 inch | 4 |
| 2 inch | 2 |

### Ranks 1–10 (high evidence, Aug 2026)

1. 20x20x1 — FilterBuy manufacturing #1, Atomic order #1, Amazon bestseller #1
2. 16x25x1 — most common furnace slot; Remember The Filter most ordered
3. 20x25x1 — Amazon BSR #2; larger air handler / whole-house return
4. 16x20x1 — FilterBuy #3; Amazon BSR #4
5. 20x25x4 — AprilAire / Honeywell / Lennox media cabinets; 8 of Amazon top-50 SKUs
6. 14x25x1 — compact furnace slot
7. 14x20x1 — compact furnace / townhome
8. 20x30x1 — large return grille
9. 16x25x4 — Honeywell / AprilAire 16x25 cabinets
10. 20x25x5 — Lennox X6673/X6675, AprilAire 213, Air Bear

Next merchandising adds after the Core Four and those media sizes: **20x25x5, 16x25x5, 16x20x4, 20x20x4, and 20x20x2.**

### Full ranked 100

Confidence: **High** = two or more independent sales/order sources. **Medium** = merchandised as popular plus at least one retailer bestseller or OEM cabinet. **Inferred** = catalog-inferred from FilterBuy / Filter King / OEM lists.

Bands: Core (the four faces that cover most homes), Next (must-stock after Core), Standard (well-attested residential), Media (4–5 inch cabinets), Long-tail (OEM odd faces, thin grilles, extra-large returns).

Ranks 51–80 are the same faces as the 1-inch staples in thicker slots. Stocked as “most popular” by FilterBuy; lower unit volume than 1-inch because fewer homes have 2/4-inch racks.

Ranks 81–100 are still bought in volume nationally, but each SKU serves a smaller slice of housing stock. Lennox / Carrier / Air Bear cabinets matter for Filter Hero because they are recurring 6–12 month replacements.

| # | Size | Depth | Band | Confidence | Typical use | Why it ranks here |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 20x20x1 | 1" | Core | High | Most common US face; return grille + furnace | FilterBuy Jul 2026 #1; Atomic orders #1; Amazon BSR #1/#3/#8 |
| 2 | 16x25x1 | 1" | Core | High | Most common furnace slot | Remember The Filter MOST ORDERED; FilterBuy #2; Home Depot first listed |
| 3 | 20x25x1 | 1" | Core | High | Larger air handler / whole-house return | Amazon BSR #2; ASInsight ~10k/mo Apr 2026; Home Depot |
| 4 | 16x20x1 | 1" | Core | High | Smaller furnace / return grille | FilterBuy #3; Amazon BSR #4; Lowe's featured |
| 5 | 20x25x4 | 4" | Media | High | AprilAire / Honeywell / Lennox media cabinets | 8 of Amazon top-50 SKUs; Honeywell FC100A1037 |
| 6 | 14x25x1 | 1" | Next | High | Compact furnace slot | Remember The Filter top 1" set; Atomic orders; Walmart Filtrete bestseller |
| 7 | 14x20x1 | 1" | Next | High | Compact furnace / townhome | Atomic top-sellers; Lowe's common; Quality Home Air Care |
| 8 | 20x30x1 | 1" | Next | High | Large return grille | Amazon BSR #9 Filtrete; FilterBuy; Lowe's |
| 9 | 16x25x4 | 4" | Media | High | Honeywell / AprilAire 16x25 cabinets | Home Depot popular; Honeywell FC100A1029; Remember The Filter |
| 10 | 20x25x5 | 5" | Media | High | Lennox X6673/X6675, AprilAire 213, Air Bear | 4 Amazon top-50 SKUs; OEM cabinets |
| 11 | 18x20x1 | 1" | Next | Medium | Return grille | Atomic top-sellers; Walmart Filtrete bestseller |
| 12 | 24x24x1 | 1" | Next | Medium | Large return / light commercial in homes | Atomic top-sellers; Lowe's; FilterBuy |
| 13 | 16x24x1 | 1" | Next | Medium | Return grille | Home Depot popular sizes; Lowe's |
| 14 | 12x24x1 | 1" | Next | Medium | Narrow return grille | Home Depot popular; Filter King; FilterBuy |
| 15 | 18x24x1 | 1" | Next | Medium | Return grille | Amazon BSR #34; Filter King; FilterBuy |
| 16 | 20x20x2 | 2" | Next | High | Most common 2" residential | Remember The Filter; 2 Amazon top-50 SKUs |
| 17 | 20x25x2 | 2" | Next | Medium | Deeper air-handler slot | FilterBuy; Filter King popular 2" |
| 18 | 16x25x2 | 2" | Next | Medium | Deeper furnace slot | FilterBuy; Filter King popular 2" |
| 19 | 16x20x4 | 4" | Media | Medium | Honeywell FC100A1003 cabinets | Honeywell OEM; FilterBuy 4" |
| 20 | 20x20x4 | 4" | Media | Medium | Square media cabinet | Lowe's merchandised; Honeywell FC100A1011 |
| 21 | 12x20x1 | 1" | Standard | Medium | Small return | Home Depot popular; Lowe's; FilterBuy |
| 22 | 16x16x1 | 1" | Standard | Medium | Small return | Home Depot popular; Lowe's |
| 23 | 14x24x1 | 1" | Standard | Medium | Return grille | Amazon BSR #46; Lowe's |
| 24 | 18x18x1 | 1" | Standard | Medium | Square return | Amazon BSR #43; Lowe's |
| 25 | 16x25x5 | 5" | Media | High | AprilAire 201/2200/2400, Lennox X6670/X6672 | OEM cabinets; FilterBuy; Remember The Filter |
| 26 | 16x20x2 | 2" | Standard | Medium | Deeper 16x20 slot | FilterBuy; Filter King |
| 27 | 14x14x1 | 1" | Standard | Medium | Small return | Lowe's featured; FilterBuy |
| 28 | 12x12x1 | 1" | Standard | Medium | Compact return / apartment | 2 Amazon top-50 SKUs; Lowe's |
| 29 | 20x24x1 | 1" | Standard | Medium | Air handler | Lowe's; FilterBuy |
| 30 | 18x30x1 | 1" | Standard | Medium | Large return | Amazon BSR #17; Lowe's |
| 31 | 16x30x1 | 1" | Standard | Medium | Large return | Home Depot popular; Lowe's |
| 32 | 14x30x1 | 1" | Standard | Medium | Large return | Atomic chart; Lowe's |
| 33 | 20x22x1 | 1" | Standard | Medium | Air handler | FilterBuy |
| 34 | 24x30x1 | 1" | Standard | Medium | Large return | Lowe's; FilterBuy |
| 35 | 16x20x5 | 5" | Media | Medium | Lennox Healthy Climate / Carrier FILXXFNC0017 | OEM; Remember The Filter |
| 36 | 20x20x5 | 5" | Media | Medium | Goodman P102-2020, Lennox X7935 | OEM |
| 37 | 12x30x1 | 1" | Standard | Medium | Narrow large return | Lowe's; FilterBuy |
| 38 | 25x25x1 | 1" | Standard | Medium | Large square return | FilterBuy; Filter King |
| 39 | 14x25x4 | 4" | Media | Medium | Compact media cabinet | FilterBuy 4" |
| 40 | 14x25x2 | 2" | Standard | Medium | Deeper compact furnace | FilterBuy 2" |
| 41 | 15x20x1 | 1" | Standard | Medium | Return grille | Amazon BSR #47; FilterBuy |
| 42 | 14x18x1 | 1" | Standard | Inferred | Return grille | FilterBuy standard 1" chart |
| 43 | 10x20x1 | 1" | Standard | Inferred | Small return | FilterBuy; Filter King |
| 44 | 20x24x4 | 4" | Media | Inferred | Media cabinet | FilterBuy 4" |
| 45 | 16x24x4 | 4" | Media | Inferred | Media cabinet | FilterBuy 4" |
| 46 | 18x24x2 | 2" | Standard | Inferred | Deeper return | FilterBuy 2" |
| 47 | 20x30x2 | 2" | Standard | Inferred | Deeper large return | FilterBuy 2" |
| 48 | 16x24x2 | 2" | Standard | Inferred | Deeper return | FilterBuy 2" |
| 49 | 18x20x2 | 2" | Standard | Inferred | Deeper return | FilterBuy 2" |
| 50 | 14x20x4 | 4" | Media | Inferred | Compact media cabinet | FilterBuy most-popular catalog |
| 51 | 12x24x4 | 4" | Media | Inferred | Narrow media cabinet | FilterBuy 4" |
| 52 | 20x22x4 | 4" | Media | Inferred | Air-handler cabinet | FilterBuy most-popular catalog |
| 53 | 24x24x2 | 2" | Standard | Medium | Large 2" / light commercial in homes | FilterBuy; Remember The Filter commercial overlap |
| 54 | 20x30x4 | 4" | Media | Inferred | Large media cabinet | FilterBuy most-popular catalog |
| 55 | 18x20x4 | 4" | Media | Inferred | Media cabinet | FilterBuy most-popular catalog |
| 56 | 14x20x2 | 2" | Standard | Inferred | Deeper compact furnace | FilterBuy 2" |
| 57 | 12x20x2 | 2" | Standard | Inferred | Deeper small return | FilterBuy most-popular catalog |
| 58 | 12x24x2 | 2" | Standard | Inferred | Deeper narrow return | FilterBuy 2" |
| 59 | 16x16x4 | 4" | Media | Inferred | Small square cabinet | FilterBuy most-popular catalog |
| 60 | 16x16x2 | 2" | Standard | Inferred | Deeper small return | FilterBuy most-popular catalog |
| 61 | 18x18x2 | 2" | Standard | Inferred | Deeper square return | FilterBuy most-popular catalog |
| 62 | 18x18x4 | 4" | Media | Inferred | Square media cabinet | FilterBuy most-popular catalog |
| 63 | 14x14x2 | 2" | Standard | Inferred | Deeper small return | FilterBuy most-popular catalog |
| 64 | 14x14x4 | 4" | Media | Inferred | Small media cabinet | FilterBuy most-popular catalog |
| 65 | 12x12x2 | 2" | Standard | Inferred | Deeper compact return | FilterBuy most-popular catalog |
| 66 | 12x12x4 | 4" | Media | Inferred | Compact cabinet | FilterBuy most-popular catalog |
| 67 | 24x24x4 | 4" | Media | Medium | Large media / light commercial | FilterBuy 4"; Remember The Filter |
| 68 | 14x24x2 | 2" | Standard | Inferred | Deeper return | FilterBuy most-popular catalog |
| 69 | 14x24x4 | 4" | Media | Inferred | Media cabinet | FilterBuy most-popular catalog |
| 70 | 12x20x4 | 4" | Media | Inferred | Narrow media cabinet | FilterBuy most-popular catalog |
| 71 | 18x24x4 | 4" | Media | Inferred | Media cabinet | FilterBuy most-popular catalog |
| 72 | 24x30x2 | 2" | Standard | Inferred | Large 2" return | FilterBuy 2" |
| 73 | 24x30x4 | 4" | Media | Inferred | Large media cabinet | FilterBuy most-popular catalog |
| 74 | 14x30x2 | 2" | Standard | Inferred | Deeper large return | FilterBuy most-popular catalog |
| 75 | 14x30x4 | 4" | Media | Inferred | Media cabinet | FilterBuy most-popular catalog |
| 76 | 16x30x2 | 2" | Standard | Inferred | Deeper large return | FilterBuy most-popular catalog |
| 77 | 16x30x4 | 4" | Media | Inferred | Media cabinet | FilterBuy most-popular catalog |
| 78 | 12x30x2 | 2" | Standard | Inferred | Deeper narrow return | FilterBuy most-popular catalog |
| 79 | 12x30x4 | 4" | Media | Inferred | Narrow media cabinet | FilterBuy most-popular catalog |
| 80 | 18x30x2 | 2" | Standard | Inferred | Deeper large return | FilterBuy most-popular catalog |
| 81 | 18x30x4 | 4" | Long-tail | Inferred | Large media cabinet | FilterBuy most-popular catalog |
| 82 | 20x22x2 | 2" | Long-tail | Inferred | Deeper air handler | FilterBuy 2" |
| 83 | 25x25x2 | 2" | Long-tail | Inferred | Large square 2" | FilterBuy 2" |
| 84 | 25x25x4 | 4" | Long-tail | Inferred | Large square cabinet | FilterBuy most-popular catalog |
| 85 | 10x10x1 | 1" | Long-tail | Medium | Very small return | FilterBuy popular list; Filter King |
| 86 | 12x36x1 | 1" | Long-tail | Medium | Narrow extra-long return | Lowe's shop-by-common-size |
| 87 | 10x24x1 | 1" | Long-tail | Inferred | Narrow return | Filter King popular; Remember The Filter catalog |
| 88 | 10x30x1 | 1" | Long-tail | Inferred | Narrow large return | Filter King; Remember The Filter |
| 89 | 20x21x1 | 1" | Long-tail | Inferred | Air handler odd face | Filter King popular 1" |
| 90 | 20x23x1 | 1" | Long-tail | Inferred | Air handler odd face | Filter King popular 1" |
| 91 | 19x20x5 | 5" | Long-tail | Medium | Trion Air Bear / Payne / Day & Night cabinets | Filter King 5" popular; OEM |
| 92 | 24x25x5 | 5" | Long-tail | Medium | Carrier FILXXCAR0024 | Carrier OEM |
| 93 | 20x26x5 | 5" | Long-tail | Medium | Lennox X8788 | Lennox OEM |
| 94 | 16x26x5 | 5" | Long-tail | Medium | Lennox X8789 | Lennox OEM |
| 95 | 17x26x4 | 4" | Long-tail | Medium | Lennox X6666 Healthy Climate | Lennox OEM |
| 96 | 21x26x4 | 4" | Long-tail | Medium | Lennox X6669 | Lennox OEM |
| 97 | 20x25x0.5 | 0.5" | Long-tail | Medium | Thin return grille | Filter King popular 0.5"; verified FK ladder |
| 98 | 16x25x0.5 | 0.5" | Long-tail | Inferred | Thin return grille | Filter King popular 0.5" |
| 99 | 8x14x1 | 1" | Long-tail | Inferred | Narrow slot / older equipment | Filter King popular 1" narrow |
| 100 | 30x30x1 | 1" | Long-tail | Inferred | Very large return | Filter King popular 1" wide |

### What this means for Filter Hero merchandising

All 13 Filter Hero shortcut sizes sit inside ranks 1–26. The Core Four plus 14x25x1, 20x30x1, 16x25x4, 20x25x4, 16x25x2, 20x25x2, 16x20x2, 12x24x1, and 18x24x1 are the SKUs a residential store must price from live Filter King ladders — and those ladders are already scraped (see Part 1).

Add merchandising weight for 20x25x5, 16x25x5, 16x20x4, 20x20x4, and 20x20x2. Those are the next media-cabinet and 2-inch sizes people actually search on Amazon and OEM lists.

### Sources (Aug 2026)

- Amazon Best Sellers — Furnace Filters, live Aug 22, 2026 (`amazon.com/Best-Sellers-Furnace-Filters/zgbs/hi/13399891`).
- FilterBuy size chart and manufacturing claim, dated July 2026.
- Atomic Filters size chart / order bestsellers, 2025–2026.
- Home Depot air-filter buying guide.
- Lowe’s shop-by-common-size.
- Remember The Filter homepage (“MOST ORDERED 16x25x1”) and common-size FAQ.
- Filter King homepage popular lists.
- Honeywell FC100A, Lennox X66xx/X87xx, AprilAire 201/213, Carrier FILXXCAR, Goodman P102, Trion Air Bear.
- American Lung Association: default residential filter is 1-inch.
- whatairfilter.com: Core Four cover 60–70% of homes.
- Atomic: popular sizes cover ~80% of systems.
- ASInsight ~10k/mo Apr 2026 on 20x25x1 (cited in rank 3).

Research tooling notes: Firecrawl CLI was out of credits (0/1000). Tavily CLI was not authenticated. This ranking used web search and page fetches, not those CLIs.

---

## Part 3 — Wholesale sheet vs Filter Hero sell prices

2025 dealer cost sheet from Paul Sellaro (Filter King LLC) vs Filter King public sale ladders scraped Aug 20, 2026. Filter Hero still sells at 10% under those public ladders (12% under when the ladder was modeled).

### How to read the three prices

| Column | What it is |
| --- | --- |
| Your cost | Dealer unit cost from Paul’s 2025 sheet, dollars per filter |
| FK 1 / 2 / 4 / 6 / 12 | Filter King’s public website unit price at that quantity (what we scraped them selling at) |
| Hero 1 / 2 / 4 / 6 / 12 | What Filter Hero charges today = FK public unit × 0.90 (or × 0.88 if that ladder was modeled) |
| Hero $ / % | Hero sell minus your cost, as dollars and as a percent of the Hero sell price |

Filter King’s public 1-filter prices (~$28–$31 on common 1-inch sizes) are not your cost. Your cost on those SKUs is about $3.76–$5.96. Hero’s 10% undercut is versus their public sale ladder, not versus wholesale.

When the sheet listed both a nominal SKU and an `A` / `N` actual-size SKU for the same face, the comparison uses the **nominal (no suffix) SKU** if one exists; otherwise the cheaper listed cost. Matching: regex `FK` + size, strip trailing A/N; prefer non-A/N when both exist. Alternate SKUs are in the last column of the full table and in the duplicate-SKU appendix.

The sheet is dated **2025**. Retail ladders were scraped **2026-08-20**. If dealer cost has increased since the PDF, 12-pack 1-inch bestsellers go underwater first.

### Headline results

- Sheet line items parsed: **313**
- Unique size × MERV combos: **299**
- Matched to a Filter King retail ladder (and therefore to a Hero sell price): **299**
- Unmatched (on the sheet, no retail ladder): **0**
- Selling below cost at any pack size: **0**
- 6-pack Hero margin under $1.00: **1**
- 12-pack Hero margin under $1.00: **2**
- 6-pack Hero margin under 20%: **1**
- 12-pack Hero margin under 20%: **9**
- Unique sizes on sheet by MERV: MERV 8 **165**, MERV 11 **68**, MERV 13 **66**

### Average and median Hero margin, all matched SKUs

| Pack | Avg Hero margin $ | Avg Hero margin % | Median Hero margin $ | Median Hero margin % |
| --- | --- | --- | --- | --- |
| 1-filter | $28.53 | 82.9% | $28.36 | 83.7% |
| 2-pack | $14.87 | 71.4% | $14.29 | 73.4% |
| 4-pack | $8.25 | 57.3% | $8.19 | 58.2% |
| 6-pack | $6.62 | 51.0% | $6.82 | 53.5% |
| 12-pack | $5.82 | 47.3% | $5.79 | 48.7% |

### Average 6-pack and 12-pack margin by MERV

| MERV | Matched unique sizes | Sheet line items | Avg Hero 6-pack % | Avg Hero 12-pack % | Avg wholesale cost |
| --- | --- | --- | --- | --- | --- |
| MERV 8 | 165 | 173 | 53.1% | 49.7% | $5.24 |
| MERV 11 | 68 | 71 | 48.7% | 44.9% | $6.52 |
| MERV 13 | 66 | 69 | 48.0% | 43.6% | $7.06 |

Matched SKUs by filter depth:

- **0.5 in:** 6
- **1 in:** 218
- **2 in:** 57
- **4 in:** 12
- **5 in:** 6

At 6-packs you still keep about $2–$3 per common 1-inch filter. At 12-packs that drops to about $1–$2 on the Core Four. Thicker filters have more dollars of margin even when the percent looks similar. 5-inch media is about $5–$8 per filter at Hero’s 6-pack.

---

### Core Four (highest-volume residential 1-inch)

These four faces are the sizes US homes actually buy most. Numbers below are the full pack ladder.

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16x25x1 | 8 | FK16x25x1 | $4.21 | $28.30 | $25.47 | $21.26 | 83.5% | $14.69 | $13.22 | $9.01 | 68.2% | $8.57 | $7.71 | $3.50 | 45.4% | $7.49 | $6.74 | $2.53 | 37.5% | $6.03 | $5.43 | $1.22 | 22.5% | Live scrape | — |
| 16x25x1 | 11 | FK16x25x1 | $4.68 | $31.13 | $28.02 | $23.34 | 83.3% | $16.65 | $14.99 | $10.31 | 68.8% | $9.79 | $8.81 | $4.13 | 46.9% | $7.55 | $6.80 | $2.12 | 31.2% | $7.48 | $6.73 | $2.05 | 30.5% | Live scrape | — |
| 16x25x1 | 13 | FK16x25x1 | $5.15 | $31.76 | $28.58 | $23.43 | 82.0% | $16.99 | $15.29 | $10.14 | 66.3% | $9.37 | $8.43 | $3.28 | 38.9% | $6.70 | $6.03 | $0.88 | 14.6% | $6.87 | $6.18 | $1.03 | 16.7% | Live scrape | — |
| 20x25x1 | 8 | FK20x25x1 | $4.76 | $31.10 | $27.99 | $23.23 | 83.0% | $14.69 | $13.22 | $8.46 | 64.0% | $9.30 | $8.37 | $3.61 | 43.1% | $7.49 | $6.74 | $1.98 | 29.4% | $6.53 | $5.88 | $1.12 | 19.0% | Live scrape | — |
| 20x25x1 | 11 | FK20x25x1 | $5.42 | $33.33 | $30.00 | $24.58 | 81.9% | $17.22 | $15.50 | $10.08 | 65.0% | $9.57 | $8.61 | $3.19 | 37.0% | $9.47 | $8.52 | $3.10 | 36.4% | $9.21 | $8.29 | $2.87 | 34.6% | Live scrape | — |
| 20x25x1 | 13 | FK20x25x1 | $5.96 | $30.18 | $27.16 | $21.20 | 78.1% | $17.76 | $15.98 | $10.02 | 62.7% | $12.04 | $10.84 | $4.88 | 45.0% | $9.36 | $8.42 | $2.46 | 29.2% | $8.21 | $7.39 | $1.43 | 19.4% | Live scrape | — |
| 20x20x1 | 8 | FK20x20x1 | $4.38 | $28.30 | $25.47 | $21.09 | 82.8% | $15.55 | $14.00 | $9.62 | 68.7% | $7.34 | $6.61 | $2.23 | 33.7% | $6.65 | $5.99 | $1.61 | 26.9% | $5.83 | $5.25 | $0.87 | 16.6% | Live scrape | — |
| 20x20x1 | 11 | FK20x20x1 | $4.82 | $31.13 | $28.02 | $23.20 | 82.8% | $18.33 | $16.50 | $11.68 | 70.8% | $8.49 | $7.64 | $2.82 | 36.9% | $7.55 | $6.80 | $1.98 | 29.1% | $6.61 | $5.95 | $1.13 | 19.0% | Live scrape | — |
| 20x20x1 | 13 | FK20x20x1 | $5.31 | $31.76 | $28.58 | $23.27 | 81.4% | $18.89 | $17.00 | $11.69 | 68.8% | $9.55 | $8.60 | $3.29 | 38.3% | $7.79 | $7.01 | $1.70 | 24.3% | $7.22 | $6.50 | $1.19 | 18.3% | Live scrape | — |
| 16x20x1 | 8 | FK16x20x1 | $3.76 | $28.30 | $25.47 | $21.71 | 85.2% | $14.99 | $13.49 | $9.73 | 72.1% | $8.32 | $7.49 | $3.73 | 49.8% | $7.49 | $6.74 | $2.98 | 44.2% | $6.12 | $5.51 | $1.75 | 31.8% | Live scrape | — |
| 16x20x1 | 11 | FK16x20x1 | $4.09 | $31.13 | $28.02 | $23.93 | 85.4% | $18.33 | $16.50 | $12.41 | 75.2% | $8.49 | $7.64 | $3.55 | 46.5% | $7.88 | $7.09 | $3.00 | 42.3% | $7.48 | $6.73 | $2.64 | 39.2% | Live scrape | — |
| 16x20x1 | 13 | FK16x20x1 | $4.49 | $31.76 | $28.58 | $24.09 | 84.3% | $18.89 | $17.00 | $12.51 | 73.6% | $9.99 | $8.99 | $4.50 | 50.1% | $8.32 | $7.49 | $3.00 | 40.1% | $8.02 | $7.22 | $2.73 | 37.8% | Live scrape | — |

#### Core Four in words

- **16x25x1 MERV 8:** cost $4.21. Filter King 1-filter $28.30 / 2-pack $14.69 / 4-pack $8.57 / 6-pack $7.49 / 12-pack $6.03. Hero 1-filter $25.47 / 2-pack $13.22 / 4-pack $7.71 / 6-pack $6.74 / 12-pack $5.43. Margin 6-pack $2.53 (37.5%), 12-pack $1.22 (22.5%).
- **16x25x1 MERV 11:** cost $4.68. Filter King 1-filter $31.13 / 2-pack $16.65 / 4-pack $9.79 / 6-pack $7.55 / 12-pack $7.48. Hero 1-filter $28.02 / 2-pack $14.99 / 4-pack $8.81 / 6-pack $6.80 / 12-pack $6.73. Margin 6-pack $2.12 (31.2%), 12-pack $2.05 (30.5%).
- **16x25x1 MERV 13:** cost $5.15. Filter King 1-filter $31.76 / 2-pack $16.99 / 4-pack $9.37 / 6-pack $6.70 / 12-pack $6.87. Hero 1-filter $28.58 / 2-pack $15.29 / 4-pack $8.43 / 6-pack $6.03 / 12-pack $6.18. Margin 6-pack $0.88 (14.6%), 12-pack $1.03 (16.7%). Tightest common 6-pack.
- **20x25x1 MERV 8:** cost $4.76. Filter King 1-filter $31.10 / 2-pack $14.69 / 4-pack $9.30 / 6-pack $7.49 / 12-pack $6.53. Hero 1-filter $27.99 / 2-pack $13.22 / 4-pack $8.37 / 6-pack $6.74 / 12-pack $5.88. Margin 6-pack $1.98 (29.4%), 12-pack $1.12 (19.0%).
- **20x25x1 MERV 11:** cost $5.42. Filter King 1-filter $33.33 / 2-pack $17.22 / 4-pack $9.57 / 6-pack $9.47 / 12-pack $9.21. Hero 1-filter $30.00 / 2-pack $15.50 / 4-pack $8.61 / 6-pack $8.52 / 12-pack $8.29. Margin 6-pack $3.10 (36.4%), 12-pack $2.87 (34.6%).
- **20x25x1 MERV 13:** cost $5.96. Filter King 1-filter $30.18 / 2-pack $17.76 / 4-pack $12.04 / 6-pack $9.36 / 12-pack $8.21. Hero 1-filter $27.16 / 2-pack $15.98 / 4-pack $10.84 / 6-pack $8.42 / 12-pack $7.39. Margin 6-pack $2.46 (29.2%), 12-pack $1.43 (19.4%).
- **20x20x1 MERV 8:** cost $4.38. Filter King 1-filter $28.30 / 2-pack $15.55 / 4-pack $7.34 / 6-pack $6.65 / 12-pack $5.83. Hero 1-filter $25.47 / 2-pack $14.00 / 4-pack $6.61 / 6-pack $5.99 / 12-pack $5.25. Margin 6-pack $1.61 (26.9%), 12-pack $0.87 (16.6%). One of the two 12-packs to watch.
- **20x20x1 MERV 11:** cost $4.82. Filter King 1-filter $31.13 / 2-pack $18.33 / 4-pack $8.49 / 6-pack $7.55 / 12-pack $6.61. Hero 1-filter $28.02 / 2-pack $16.50 / 4-pack $7.64 / 6-pack $6.80 / 12-pack $5.95. Margin 6-pack $1.98 (29.1%), 12-pack $1.13 (19.0%).
- **20x20x1 MERV 13:** cost $5.31. Filter King 1-filter $31.76 / 2-pack $18.89 / 4-pack $9.55 / 6-pack $7.79 / 12-pack $7.22. Hero 1-filter $28.58 / 2-pack $17.00 / 4-pack $8.60 / 6-pack $7.01 / 12-pack $6.50. Margin 6-pack $1.70 (24.3%), 12-pack $1.19 (18.3%).
- **16x20x1 MERV 8:** cost $3.76. Filter King 1-filter $28.30 / 2-pack $14.99 / 4-pack $8.32 / 6-pack $7.49 / 12-pack $6.12. Hero 1-filter $25.47 / 2-pack $13.49 / 4-pack $7.49 / 6-pack $6.74 / 12-pack $5.51. Margin 6-pack $2.98 (44.2%), 12-pack $1.75 (31.8%). Widest Core Four 1-inch 6-pack.
- **16x20x1 MERV 11:** cost $4.09. Filter King 1-filter $31.13 / 2-pack $18.33 / 4-pack $8.49 / 6-pack $7.88 / 12-pack $7.48. Hero 1-filter $28.02 / 2-pack $16.50 / 4-pack $7.64 / 6-pack $7.09 / 12-pack $6.73. Margin 6-pack $3.00 (42.3%), 12-pack $2.64 (39.2%).
- **16x20x1 MERV 13:** cost $4.49. Filter King 1-filter $31.76 / 2-pack $18.89 / 4-pack $9.99 / 6-pack $8.32 / 12-pack $8.02. Hero 1-filter $28.58 / 2-pack $17.00 / 4-pack $8.99 / 6-pack $7.49 / 12-pack $7.22. Margin 6-pack $3.00 (40.1%), 12-pack $2.73 (37.8%).

---

### Tightest SKUs (watch list)

Shipping is extra. Anything under ~20% at 12-pack is the first place a cost increase or a freight bill wipes the margin. 16x25x1 MERV 13 and 20x20x1 MERV 8 12-packs are the ones to watch on the Core Four. 24x24x1 MERV 8 12-pack is the thinnest in the whole sheet.

#### 6-pack Hero margin under $1.00

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16x25x1 | 13 | FK16x25x1 | $5.15 | $31.76 | $28.58 | $23.43 | 82.0% | $16.99 | $15.29 | $10.14 | 66.3% | $9.37 | $8.43 | $3.28 | 38.9% | $6.70 | $6.03 | $0.88 | 14.6% | $6.87 | $6.18 | $1.03 | 16.7% | Live scrape | — |

#### 12-pack Hero margin under $1.00

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24x24x1 | 8 | FK24x24x1 | $5.31 | $29.27 | $26.34 | $21.03 | 79.8% | $16.68 | $15.01 | $9.70 | 64.6% | $10.28 | $9.25 | $3.94 | 42.6% | $7.49 | $6.74 | $1.43 | 21.2% | $6.66 | $5.99 | $0.68 | 11.4% | Live scrape | — |
| 20x20x1 | 8 | FK20x20x1 | $4.38 | $28.30 | $25.47 | $21.09 | 82.8% | $15.55 | $14.00 | $9.62 | 68.7% | $7.34 | $6.61 | $2.23 | 33.7% | $6.65 | $5.99 | $1.61 | 26.9% | $5.83 | $5.25 | $0.87 | 16.6% | Live scrape | — |

#### All SKUs with 12-pack Hero margin under 20%

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24x24x1 | 8 | FK24x24x1 | $5.31 | $29.27 | $26.34 | $21.03 | 79.8% | $16.68 | $15.01 | $9.70 | 64.6% | $10.28 | $9.25 | $3.94 | 42.6% | $7.49 | $6.74 | $1.43 | 21.2% | $6.66 | $5.99 | $0.68 | 11.4% | Live scrape | — |
| 20x30x1 | 13 | FK20x30x1 | $6.49 | $39.56 | $34.81 | $28.32 | 81.4% | $18.77 | $16.52 | $10.03 | 60.7% | $14.16 | $12.46 | $5.97 | 47.9% | $9.63 | $8.47 | $1.98 | 23.4% | $8.57 | $7.54 | $1.05 | 13.9% | Modeled | — |
| 20x20x1 | 8 | FK20x20x1 | $4.38 | $28.30 | $25.47 | $21.09 | 82.8% | $15.55 | $14.00 | $9.62 | 68.7% | $7.34 | $6.61 | $2.23 | 33.7% | $6.65 | $5.99 | $1.61 | 26.9% | $5.83 | $5.25 | $0.87 | 16.6% | Live scrape | — |
| 16x25x1 | 13 | FK16x25x1 | $5.15 | $31.76 | $28.58 | $23.43 | 82.0% | $16.99 | $15.29 | $10.14 | 66.3% | $9.37 | $8.43 | $3.28 | 38.9% | $6.70 | $6.03 | $0.88 | 14.6% | $6.87 | $6.18 | $1.03 | 16.7% | Live scrape | — |
| 20x20x1 | 13 | FK20x20x1 | $5.31 | $31.76 | $28.58 | $23.27 | 81.4% | $18.89 | $17.00 | $11.69 | 68.8% | $9.55 | $8.60 | $3.29 | 38.3% | $7.79 | $7.01 | $1.70 | 24.3% | $7.22 | $6.50 | $1.19 | 18.3% | Live scrape | — |
| 6.88x15.88x2 | 13 | FK6.88x15.88x2a | $9.58 | $33.42 | $29.41 | $19.83 | 67.4% | $21.13 | $18.59 | $9.01 | 48.5% | $20.77 | $18.28 | $8.70 | 47.6% | $17.47 | $15.37 | $5.79 | 37.7% | $13.37 | $11.77 | $2.19 | 18.6% | Modeled | — |
| 20x20x1 | 11 | FK20x20x1 | $4.82 | $31.13 | $28.02 | $23.20 | 82.8% | $18.33 | $16.50 | $11.68 | 70.8% | $8.49 | $7.64 | $2.82 | 36.9% | $7.55 | $6.80 | $1.98 | 29.1% | $6.61 | $5.95 | $1.13 | 19.0% | Live scrape | — |
| 20x25x1 | 8 | FK20x25x1 | $4.76 | $31.10 | $27.99 | $23.23 | 83.0% | $14.69 | $13.22 | $8.46 | 64.0% | $9.30 | $8.37 | $3.61 | 43.1% | $7.49 | $6.74 | $1.98 | 29.4% | $6.53 | $5.88 | $1.12 | 19.0% | Live scrape | — |
| 20x25x1 | 13 | FK20x25x1 | $5.96 | $30.18 | $27.16 | $21.20 | 78.1% | $17.76 | $15.98 | $10.02 | 62.7% | $12.04 | $10.84 | $4.88 | 45.0% | $9.36 | $8.42 | $2.46 | 29.2% | $8.21 | $7.39 | $1.43 | 19.4% | Live scrape | — |

#### All SKUs with 6-pack Hero margin under 20%

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16x25x1 | 13 | FK16x25x1 | $5.15 | $31.76 | $28.58 | $23.43 | 82.0% | $16.99 | $15.29 | $10.14 | 66.3% | $9.37 | $8.43 | $3.28 | 38.9% | $6.70 | $6.03 | $0.88 | 14.6% | $6.87 | $6.18 | $1.03 | 16.7% | Live scrape | — |

#### Lowest 12-pack margin $ (15 SKUs)

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24x24x1 | 8 | FK24x24x1 | $5.31 | $29.27 | $26.34 | $21.03 | 79.8% | $16.68 | $15.01 | $9.70 | 64.6% | $10.28 | $9.25 | $3.94 | 42.6% | $7.49 | $6.74 | $1.43 | 21.2% | $6.66 | $5.99 | $0.68 | 11.4% | Live scrape | — |
| 20x20x1 | 8 | FK20x20x1 | $4.38 | $28.30 | $25.47 | $21.09 | 82.8% | $15.55 | $14.00 | $9.62 | 68.7% | $7.34 | $6.61 | $2.23 | 33.7% | $6.65 | $5.99 | $1.61 | 26.9% | $5.83 | $5.25 | $0.87 | 16.6% | Live scrape | — |
| 16x25x1 | 13 | FK16x25x1 | $5.15 | $31.76 | $28.58 | $23.43 | 82.0% | $16.99 | $15.29 | $10.14 | 66.3% | $9.37 | $8.43 | $3.28 | 38.9% | $6.70 | $6.03 | $0.88 | 14.6% | $6.87 | $6.18 | $1.03 | 16.7% | Live scrape | — |
| 20x30x1 | 13 | FK20x30x1 | $6.49 | $39.56 | $34.81 | $28.32 | 81.4% | $18.77 | $16.52 | $10.03 | 60.7% | $14.16 | $12.46 | $5.97 | 47.9% | $9.63 | $8.47 | $1.98 | 23.4% | $8.57 | $7.54 | $1.05 | 13.9% | Modeled | — |
| 20x25x1 | 8 | FK20x25x1 | $4.76 | $31.10 | $27.99 | $23.23 | 83.0% | $14.69 | $13.22 | $8.46 | 64.0% | $9.30 | $8.37 | $3.61 | 43.1% | $7.49 | $6.74 | $1.98 | 29.4% | $6.53 | $5.88 | $1.12 | 19.0% | Live scrape | — |
| 20x20x1 | 11 | FK20x20x1 | $4.82 | $31.13 | $28.02 | $23.20 | 82.8% | $18.33 | $16.50 | $11.68 | 70.8% | $8.49 | $7.64 | $2.82 | 36.9% | $7.55 | $6.80 | $1.98 | 29.1% | $6.61 | $5.95 | $1.13 | 19.0% | Live scrape | — |
| 20x20x1 | 13 | FK20x20x1 | $5.31 | $31.76 | $28.58 | $23.27 | 81.4% | $18.89 | $17.00 | $11.69 | 68.8% | $9.55 | $8.60 | $3.29 | 38.3% | $7.79 | $7.01 | $1.70 | 24.3% | $7.22 | $6.50 | $1.19 | 18.3% | Live scrape | — |
| 16x25x1 | 8 | FK16x25x1 | $4.21 | $28.30 | $25.47 | $21.26 | 83.5% | $14.69 | $13.22 | $9.01 | 68.2% | $8.57 | $7.71 | $3.50 | 45.4% | $7.49 | $6.74 | $2.53 | 37.5% | $6.03 | $5.43 | $1.22 | 22.5% | Live scrape | — |
| 20x24x1 | 8 | FK20x24x1 | $4.70 | $30.28 | $27.25 | $22.55 | 82.8% | $17.23 | $15.51 | $10.81 | 69.7% | $9.79 | $8.81 | $4.11 | 46.7% | $7.49 | $6.74 | $2.04 | 30.3% | $6.74 | $6.07 | $1.37 | 22.6% | Live scrape | — |
| 20x30x1 | 8 | FK20x30x1 | $5.07 | $37.78 | $34.00 | $28.93 | 85.1% | $17.63 | $15.87 | $10.80 | 68.1% | $11.02 | $9.92 | $4.85 | 48.9% | $8.09 | $7.28 | $2.21 | 30.4% | $7.20 | $6.48 | $1.41 | 21.8% | Live scrape | — |
| 20x25x1 | 13 | FK20x25x1 | $5.96 | $30.18 | $27.16 | $21.20 | 78.1% | $17.76 | $15.98 | $10.02 | 62.7% | $12.04 | $10.84 | $4.88 | 45.0% | $9.36 | $8.42 | $2.46 | 29.2% | $8.21 | $7.39 | $1.43 | 19.4% | Live scrape | — |
| 16x24x1 | 8 | FK16x24x1 | $4.19 | $28.30 | $25.47 | $21.28 | 83.5% | $15.67 | $14.10 | $9.91 | 70.3% | $9.30 | $8.37 | $4.18 | 49.9% | $7.49 | $6.74 | $2.55 | 37.8% | $6.30 | $5.67 | $1.48 | 26.1% | Live scrape | — |
| 16x16x1 | 13 | FK16x16x1 | $4.18 | $31.76 | $28.58 | $24.40 | 85.4% | $19.63 | $17.67 | $13.49 | 76.3% | $9.63 | $8.67 | $4.49 | 51.8% | $7.62 | $6.86 | $2.68 | 39.1% | $6.32 | $5.69 | $1.51 | 26.5% | Live scrape | — |
| 14x25x1 | 8 | FK14x25x1 | $4.33 | $28.30 | $25.47 | $21.14 | 83.0% | $16.10 | $14.49 | $10.16 | 70.1% | $8.57 | $7.71 | $3.38 | 43.8% | $7.49 | $6.74 | $2.41 | 35.8% | $6.61 | $5.95 | $1.62 | 27.2% | Live scrape | — |
| 25x25x1 | 8 | FK25x25x1 | $5.19 | $36.67 | $33.00 | $27.81 | 84.3% | $19.59 | $17.63 | $12.44 | 70.6% | $11.75 | $10.58 | $5.39 | 50.9% | $7.49 | $6.74 | $1.55 | 23.0% | $7.65 | $6.89 | $1.70 | 24.7% | Live scrape | — |

#### Highest 6-pack margin $ (15 SKUs)

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20x35x2 | 13 | FK20x35x2 | $9.72 | $56.66 | $50.99 | $41.27 | 80.9% | $38.53 | $34.68 | $24.96 | 72.0% | $33.65 | $30.29 | $20.57 | 67.9% | $32.32 | $29.09 | $19.37 | 66.6% | $31.99 | $28.79 | $19.07 | 66.2% | Live scrape | — |
| 20x35x2 | 11 | FK20x35x2 | $8.84 | $57.20 | $51.48 | $42.64 | 82.8% | $36.58 | $32.92 | $24.08 | 73.1% | $32.27 | $29.04 | $20.20 | 69.6% | $29.05 | $26.15 | $17.31 | 66.2% | $27.97 | $25.17 | $16.33 | 64.9% | Live scrape | — |
| 12x36x0.5 | 13 | FK12x36x0.5 | $5.09 | $45.99 | $41.39 | $36.30 | 87.7% | $32.20 | $28.98 | $23.89 | 82.4% | $27.58 | $24.82 | $19.73 | 79.5% | $24.83 | $22.35 | $17.26 | 77.2% | $23.91 | $21.52 | $16.43 | 76.3% | Live scrape | — |
| 12x36x0.5 | 11 | FK12x36x0.5 | $4.63 | $51.12 | $46.01 | $41.38 | 89.9% | $33.30 | $29.97 | $25.34 | 84.6% | $26.20 | $23.58 | $18.95 | 80.4% | $23.58 | $21.22 | $16.59 | 78.2% | $22.70 | $20.43 | $15.80 | 77.3% | Live scrape | — |
| 12x15x0.5 | 13 | FK12x15x0.5 | $7.13 | $49.08 | $44.17 | $37.04 | 83.9% | $32.20 | $28.98 | $21.85 | 75.4% | $27.58 | $24.82 | $17.69 | 71.3% | $24.83 | $22.35 | $15.22 | 68.1% | $23.91 | $21.52 | $14.39 | 66.9% | Live scrape | — |
| 10x36x1 | 11 | FK10x36x1 | $4.41 | $39.64 | $35.68 | $31.27 | 87.6% | $28.88 | $25.99 | $21.58 | 83.0% | $13.34 | $12.01 | $7.60 | 63.3% | $21.72 | $19.55 | $15.14 | 77.4% | $12.77 | $11.49 | $7.08 | 61.6% | Live scrape | — |
| 12x15x0.5 | 11 | FK12x15x0.5 | $6.48 | $54.98 | $49.48 | $43.00 | 86.9% | $36.01 | $32.41 | $25.93 | 80.0% | $26.20 | $23.58 | $17.10 | 72.5% | $23.58 | $21.22 | $14.74 | 69.5% | $22.70 | $20.43 | $13.95 | 68.3% | Live scrape | — |
| 12x36x0.5 | 8 | FK12x36x0.5 | $3.93 | $46.47 | $41.82 | $37.89 | 90.6% | $30.26 | $27.23 | $23.30 | 85.6% | $20.87 | $18.78 | $14.85 | 79.1% | $18.98 | $17.08 | $13.15 | 77.0% | $18.27 | $16.44 | $12.51 | 76.1% | Live scrape | — |
| 16x24x4 | 8 | FK16x24x4 | $6.29 | $53.33 | $48.00 | $41.71 | 86.9% | $24.49 | $22.04 | $15.75 | 71.5% | $20.83 | $18.75 | $12.46 | 66.5% | $21.01 | $18.91 | $12.62 | 66.7% | $19.66 | $17.69 | $11.40 | 64.4% | Live scrape | — |
| 16x20x4 | 11 | FK16x20x4 | $7.78 | $49.99 | $44.99 | $37.21 | 82.7% | $31.10 | $27.99 | $20.21 | 72.2% | $24.24 | $21.82 | $14.04 | 64.3% | $22.62 | $20.36 | $12.58 | 61.8% | $21.36 | $19.22 | $11.44 | 59.5% | Live scrape | — |
| 15x30x2 | 13 | FK15x30x2 | $9.31 | $47.23 | $42.51 | $33.20 | 78.1% | $29.74 | $26.77 | $17.46 | 65.2% | $26.55 | $23.90 | $14.59 | 61.0% | $24.26 | $21.83 | $12.52 | 57.4% | $22.97 | $20.67 | $11.36 | 55.0% | Live scrape | — |
| 6x6x1 | 8 | FK6x6x1A | $6.06 | $53.98 | $48.58 | $42.52 | 87.5% | $42.36 | $38.12 | $32.06 | 84.1% | $22.69 | $20.42 | $14.36 | 70.3% | $20.63 | $18.57 | $12.51 | 67.4% | $19.86 | $17.87 | $11.81 | 66.1% | Live scrape | — |
| 10x36x1 | 13 | FK10x36x1 | $4.85 | $42.87 | $38.58 | $33.73 | 87.4% | $31.24 | $28.12 | $23.27 | 82.8% | $14.04 | $12.64 | $7.79 | 61.6% | $19.27 | $17.34 | $12.49 | 72.0% | $19.14 | $17.23 | $12.38 | 71.9% | Live scrape | — |
| 15x30x2 | 11 | FK15x30x2 | $8.46 | $46.67 | $42.00 | $33.54 | 79.9% | $28.88 | $25.99 | $17.53 | 67.4% | $25.57 | $23.01 | $14.55 | 63.2% | $23.16 | $20.84 | $12.38 | 59.4% | $21.72 | $19.55 | $11.09 | 56.7% | Live scrape | — |
| 14x30x2 | 11 | FK14x30x2 | $8.46 | $44.44 | $40.00 | $31.54 | 78.8% | $27.77 | $24.99 | $16.53 | 66.1% | $24.76 | $22.28 | $13.82 | 62.0% | $22.62 | $20.36 | $11.90 | 58.4% | $21.09 | $18.98 | $10.52 | 55.4% | Live scrape | — |

---

### Popular residential sizes vs this sheet

Cross-check against the sizes US homes actually order (Core Four plus the next-most-common 1/2/4/5-inch faces from Part 2).

#### On the sheet

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16x25x1 | 8 | FK16x25x1 | $4.21 | $28.30 | $25.47 | $21.26 | 83.5% | $14.69 | $13.22 | $9.01 | 68.2% | $8.57 | $7.71 | $3.50 | 45.4% | $7.49 | $6.74 | $2.53 | 37.5% | $6.03 | $5.43 | $1.22 | 22.5% | Live scrape | — |
| 16x25x1 | 11 | FK16x25x1 | $4.68 | $31.13 | $28.02 | $23.34 | 83.3% | $16.65 | $14.99 | $10.31 | 68.8% | $9.79 | $8.81 | $4.13 | 46.9% | $7.55 | $6.80 | $2.12 | 31.2% | $7.48 | $6.73 | $2.05 | 30.5% | Live scrape | — |
| 16x25x1 | 13 | FK16x25x1 | $5.15 | $31.76 | $28.58 | $23.43 | 82.0% | $16.99 | $15.29 | $10.14 | 66.3% | $9.37 | $8.43 | $3.28 | 38.9% | $6.70 | $6.03 | $0.88 | 14.6% | $6.87 | $6.18 | $1.03 | 16.7% | Live scrape | — |
| 20x25x1 | 8 | FK20x25x1 | $4.76 | $31.10 | $27.99 | $23.23 | 83.0% | $14.69 | $13.22 | $8.46 | 64.0% | $9.30 | $8.37 | $3.61 | 43.1% | $7.49 | $6.74 | $1.98 | 29.4% | $6.53 | $5.88 | $1.12 | 19.0% | Live scrape | — |
| 20x25x1 | 11 | FK20x25x1 | $5.42 | $33.33 | $30.00 | $24.58 | 81.9% | $17.22 | $15.50 | $10.08 | 65.0% | $9.57 | $8.61 | $3.19 | 37.0% | $9.47 | $8.52 | $3.10 | 36.4% | $9.21 | $8.29 | $2.87 | 34.6% | Live scrape | — |
| 20x25x1 | 13 | FK20x25x1 | $5.96 | $30.18 | $27.16 | $21.20 | 78.1% | $17.76 | $15.98 | $10.02 | 62.7% | $12.04 | $10.84 | $4.88 | 45.0% | $9.36 | $8.42 | $2.46 | 29.2% | $8.21 | $7.39 | $1.43 | 19.4% | Live scrape | — |
| 20x20x1 | 8 | FK20x20x1 | $4.38 | $28.30 | $25.47 | $21.09 | 82.8% | $15.55 | $14.00 | $9.62 | 68.7% | $7.34 | $6.61 | $2.23 | 33.7% | $6.65 | $5.99 | $1.61 | 26.9% | $5.83 | $5.25 | $0.87 | 16.6% | Live scrape | — |
| 20x20x1 | 11 | FK20x20x1 | $4.82 | $31.13 | $28.02 | $23.20 | 82.8% | $18.33 | $16.50 | $11.68 | 70.8% | $8.49 | $7.64 | $2.82 | 36.9% | $7.55 | $6.80 | $1.98 | 29.1% | $6.61 | $5.95 | $1.13 | 19.0% | Live scrape | — |
| 20x20x1 | 13 | FK20x20x1 | $5.31 | $31.76 | $28.58 | $23.27 | 81.4% | $18.89 | $17.00 | $11.69 | 68.8% | $9.55 | $8.60 | $3.29 | 38.3% | $7.79 | $7.01 | $1.70 | 24.3% | $7.22 | $6.50 | $1.19 | 18.3% | Live scrape | — |
| 16x20x1 | 8 | FK16x20x1 | $3.76 | $28.30 | $25.47 | $21.71 | 85.2% | $14.99 | $13.49 | $9.73 | 72.1% | $8.32 | $7.49 | $3.73 | 49.8% | $7.49 | $6.74 | $2.98 | 44.2% | $6.12 | $5.51 | $1.75 | 31.8% | Live scrape | — |
| 16x20x1 | 11 | FK16x20x1 | $4.09 | $31.13 | $28.02 | $23.93 | 85.4% | $18.33 | $16.50 | $12.41 | 75.2% | $8.49 | $7.64 | $3.55 | 46.5% | $7.88 | $7.09 | $3.00 | 42.3% | $7.48 | $6.73 | $2.64 | 39.2% | Live scrape | — |
| 16x20x1 | 13 | FK16x20x1 | $4.49 | $31.76 | $28.58 | $24.09 | 84.3% | $18.89 | $17.00 | $12.51 | 73.6% | $9.99 | $8.99 | $4.50 | 50.1% | $8.32 | $7.49 | $3.00 | 40.1% | $8.02 | $7.22 | $2.73 | 37.8% | Live scrape | — |
| 14x25x1 | 8 | FK14x25x1 | $4.33 | $28.30 | $25.47 | $21.14 | 83.0% | $16.10 | $14.49 | $10.16 | 70.1% | $8.57 | $7.71 | $3.38 | 43.8% | $7.49 | $6.74 | $2.41 | 35.8% | $6.61 | $5.95 | $1.62 | 27.2% | Live scrape | — |
| 16x25x2 | 8 | FK16x25x2 | $5.17 | $34.44 | $31.00 | $25.83 | 83.3% | $18.88 | $16.99 | $11.82 | 69.6% | $12.14 | $10.93 | $5.76 | 52.7% | $9.89 | $8.90 | $3.73 | 41.9% | $8.07 | $7.26 | $2.09 | 28.8% | Live scrape | — |
| 16x25x2 | 11 | FK16x25x2 | $6.26 | $39.99 | $35.99 | $29.73 | 82.6% | $22.22 | $20.00 | $13.74 | 68.7% | $15.67 | $14.10 | $7.84 | 55.6% | $13.37 | $12.03 | $5.77 | 48.0% | $11.66 | $10.49 | $4.23 | 40.3% | Live scrape | — |
| 16x25x2 | 13 | FK16x25x2 | $6.89 | $40.43 | $36.39 | $29.50 | 81.1% | $23.14 | $20.83 | $13.94 | 66.9% | $16.02 | $14.42 | $7.53 | 52.2% | $15.26 | $13.73 | $6.84 | 49.8% | $13.73 | $12.36 | $5.47 | 44.3% | Live scrape | — |
| 20x25x2 | 8 | FK20x25x2 | $5.58 | $33.97 | $30.57 | $24.99 | 81.7% | $16.65 | $14.99 | $9.41 | 62.8% | $12.24 | $11.02 | $5.44 | 49.4% | $9.89 | $8.90 | $3.32 | 37.3% | $9.16 | $8.24 | $2.66 | 32.3% | Live scrape | — |
| 20x25x2 | 11 | FK20x25x2 | $7.02 | $37.65 | $33.13 | $26.11 | 78.8% | $18.35 | $16.15 | $9.13 | 56.5% | $14.94 | $13.15 | $6.13 | 46.6% | $11.17 | $9.83 | $2.81 | 28.6% | $10.35 | $9.11 | $2.09 | 22.9% | Modeled | — |
| 20x25x2 | 13 | FK20x25x2 | $7.72 | $40.43 | $36.39 | $28.67 | 78.8% | $21.72 | $19.55 | $11.83 | 60.5% | $18.31 | $16.48 | $8.76 | 53.2% | $15.13 | $13.62 | $5.90 | 43.3% | $15.26 | $13.73 | $6.01 | 43.8% | Live scrape | — |
| 12x24x1 | 8 | FK12x24x1 | $3.74 | $28.30 | $25.47 | $21.73 | 85.3% | $13.71 | $12.34 | $8.60 | 69.7% | $8.81 | $7.93 | $4.19 | 52.8% | $7.49 | $6.74 | $3.00 | 44.5% | $6.20 | $5.58 | $1.84 | 33.0% | Live scrape | — |
| 12x24x1 | 11 | FK12x24x1 | $4.01 | $31.37 | $27.61 | $23.60 | 85.5% | $15.11 | $13.30 | $9.29 | 69.8% | $10.75 | $9.46 | $5.45 | 57.6% | $8.46 | $7.44 | $3.43 | 46.1% | $7.01 | $6.17 | $2.16 | 35.0% | Modeled | FK12x24x1N |
| 12x24x1 | 13 | FK12x24x1 | $4.42 | $31.76 | $28.58 | $24.16 | 84.5% | $20.82 | $18.74 | $14.32 | 76.4% | $10.40 | $9.36 | $4.94 | 52.8% | $8.70 | $7.83 | $3.41 | 43.6% | $8.32 | $7.49 | $3.07 | 41.0% | Live scrape | FK12x24x1N |
| 18x24x1 | 8 | FK18x24x1 | $4.38 | $29.99 | $26.99 | $22.61 | 83.8% | $16.97 | $15.27 | $10.89 | 71.3% | $10.20 | $9.18 | $4.80 | 52.3% | $7.88 | $7.09 | $2.71 | 38.2% | $7.03 | $6.33 | $1.95 | 30.8% | Live scrape | — |
| 18x24x1 | 11 | FK18x24x1 | $4.86 | $33.33 | $30.00 | $25.14 | 83.8% | $19.99 | $17.99 | $13.13 | 73.0% | $11.75 | $10.58 | $5.72 | 54.1% | $8.97 | $8.07 | $3.21 | 39.8% | $7.88 | $7.09 | $2.23 | 31.5% | Live scrape | — |
| 18x24x1 | 13 | FK18x24x1 | $5.35 | $31.40 | $27.63 | $22.28 | 80.6% | $18.07 | $15.90 | $10.55 | 66.4% | $13.11 | $11.54 | $6.19 | 53.6% | $9.38 | $8.25 | $2.90 | 35.2% | $8.37 | $7.37 | $2.02 | 27.4% | Modeled | — |
| 20x30x1 | 8 | FK20x30x1 | $5.07 | $37.78 | $34.00 | $28.93 | 85.1% | $17.63 | $15.87 | $10.80 | 68.1% | $11.02 | $9.92 | $4.85 | 48.9% | $8.09 | $7.28 | $2.21 | 30.4% | $7.20 | $6.48 | $1.41 | 21.8% | Live scrape | — |
| 20x30x1 | 11 | FK20x30x1 | $5.90 | $39.99 | $35.99 | $30.09 | 83.6% | $20.55 | $18.50 | $12.60 | 68.1% | $10.63 | $9.57 | $3.67 | 38.3% | $9.96 | $8.96 | $3.06 | 34.2% | $9.43 | $8.49 | $2.59 | 30.5% | Live scrape | — |
| 20x30x1 | 13 | FK20x30x1 | $6.49 | $39.56 | $34.81 | $28.32 | 81.4% | $18.77 | $16.52 | $10.03 | 60.7% | $14.16 | $12.46 | $5.97 | 47.9% | $9.63 | $8.47 | $1.98 | 23.4% | $8.57 | $7.54 | $1.05 | 13.9% | Modeled | — |
| 16x20x2 | 8 | FK16x20x2 | $4.21 | $31.92 | $28.73 | $24.52 | 85.3% | $15.65 | $14.09 | $9.88 | 70.1% | $11.16 | $10.04 | $5.83 | 58.1% | $8.95 | $8.06 | $3.85 | 47.8% | $8.07 | $7.26 | $3.05 | 42.0% | Live scrape | — |
| 16x20x2 | 11 | FK16x20x2 | $5.06 | $37.37 | $33.63 | $28.57 | 85.0% | $19.44 | $17.50 | $12.44 | 71.1% | $15.35 | $13.82 | $8.76 | 63.4% | $12.92 | $11.63 | $6.57 | 56.5% | $12.11 | $10.90 | $5.84 | 53.6% | Live scrape | — |
| 16x20x2 | 13 | FK16x20x2 | $5.56 | $40.43 | $36.39 | $30.83 | 84.7% | $18.89 | $17.00 | $11.44 | 67.3% | $16.02 | $14.42 | $8.86 | 61.4% | $14.20 | $12.78 | $7.22 | 56.5% | $13.81 | $12.43 | $6.87 | 55.3% | Live scrape | — |
| 16x25x4 | 11 | FK16x25x4 | $8.98 | $43.66 | $39.29 | $30.31 | 77.1% | $25.55 | $23.00 | $14.02 | 61.0% | $20.46 | $18.41 | $9.43 | 51.2% | $18.85 | $16.97 | $7.99 | 47.1% | $18.76 | $16.88 | $7.90 | 46.8% | Live scrape | — |
| 16x25x4 | 13 | FK16x25x4 | $9.88 | $47.23 | $42.51 | $32.63 | 76.8% | $27.06 | $24.35 | $14.47 | 59.4% | $22.90 | $20.61 | $10.73 | 52.1% | $18.20 | $16.38 | $6.50 | 39.7% | $20.44 | $18.40 | $8.52 | 46.3% | Live scrape | — |
| 16x25x5 | 8 | FK16x25x5 | $18.50 | $39.69 | $35.72 | $17.22 | 48.2% | $34.24 | $30.82 | $12.32 | 40.0% | $26.63 | $23.97 | $5.47 | 22.8% | $26.63 | $23.97 | $5.47 | 22.8% | $26.63 | $23.97 | $5.47 | 22.8% | Live scrape | — |
| 16x25x5 | 11 | FK16x25x5 | $19.00 | $47.63 | $42.87 | $23.87 | 55.7% | $28.34 | $25.51 | $6.51 | 25.5% | $34.25 | $30.83 | $11.83 | 38.4% | $34.25 | $30.83 | $11.83 | 38.4% | $34.25 | $30.83 | $11.83 | 38.4% | Live scrape | — |
| 16x25x5 | 13 | FK16x25x5 | $19.50 | $43.33 | $39.00 | $19.50 | 50.0% | $37.15 | $33.44 | $13.94 | 41.7% | $34.54 | $31.09 | $11.59 | 37.3% | $34.54 | $31.09 | $11.59 | 37.3% | $34.54 | $31.09 | $11.59 | 37.3% | Live scrape | — |
| 20x25x5 | 8 | FK20x25x5 | $18.50 | $39.69 | $35.72 | $17.22 | 48.2% | $23.61 | $21.25 | $2.75 | 12.9% | $23.14 | $20.83 | $2.33 | 11.2% | $26.07 | $23.46 | $4.96 | 21.1% | $26.07 | $23.46 | $4.96 | 21.1% | Live scrape | — |
| 20x25x5 | 11 | FK20x25x5 | $19.00 | $47.63 | $42.87 | $23.87 | 55.7% | $38.09 | $34.28 | $15.28 | 44.6% | $28.62 | $25.76 | $6.76 | 26.2% | $28.62 | $25.76 | $6.76 | 26.2% | $28.62 | $25.76 | $6.76 | 26.2% | Live scrape | — |
| 20x25x5 | 13 | FK20x25x5 | $19.50 | $43.33 | $39.00 | $19.50 | 50.0% | $45.37 | $40.83 | $21.33 | 52.2% | $30.35 | $27.32 | $7.82 | 28.6% | $30.35 | $27.32 | $7.82 | 28.6% | $30.35 | $27.32 | $7.82 | 28.6% | Live scrape | — |
| 14x20x1 | 8 | FK14x20x1 | $3.74 | $28.30 | $25.47 | $21.73 | 85.3% | $14.54 | $13.09 | $9.35 | 71.4% | $8.57 | $7.71 | $3.97 | 51.5% | $7.49 | $6.74 | $3.00 | 44.5% | $6.23 | $5.61 | $1.87 | 33.3% | Live scrape | — |
| 14x20x1 | 11 | FK14x20x1 | $3.92 | $31.13 | $28.02 | $24.10 | 86.0% | $16.65 | $14.99 | $11.07 | 73.8% | $8.49 | $7.64 | $3.72 | 48.7% | $7.08 | $6.37 | $2.45 | 38.5% | $7.26 | $6.53 | $2.61 | 40.0% | Live scrape | — |
| 14x20x1 | 13 | FK14x20x1 | $4.32 | $31.76 | $28.58 | $24.26 | 84.9% | $16.52 | $14.87 | $10.55 | 70.9% | $9.27 | $8.34 | $4.02 | 48.2% | $6.70 | $6.03 | $1.71 | 28.4% | $6.87 | $6.18 | $1.86 | 30.1% | Live scrape | — |
| 24x24x1 | 8 | FK24x24x1 | $5.31 | $29.27 | $26.34 | $21.03 | 79.8% | $16.68 | $15.01 | $9.70 | 64.6% | $10.28 | $9.25 | $3.94 | 42.6% | $7.49 | $6.74 | $1.43 | 21.2% | $6.66 | $5.99 | $0.68 | 11.4% | Live scrape | — |
| 24x24x1 | 11 | FK24x24x1 | $6.16 | $33.69 | $30.32 | $24.16 | 79.7% | $23.54 | $21.19 | $15.03 | 70.9% | $10.63 | $9.57 | $3.41 | 35.6% | $11.01 | $9.91 | $3.75 | 37.8% | $9.22 | $8.30 | $2.14 | 25.8% | Live scrape | — |
| 24x24x1 | 13 | FK24x24x1 | $6.77 | $33.43 | $30.09 | $23.32 | 77.5% | $21.57 | $19.41 | $12.64 | 65.1% | $14.57 | $13.11 | $6.34 | 48.4% | $10.71 | $9.64 | $2.87 | 29.8% | $10.75 | $9.68 | $2.91 | 30.1% | Live scrape | — |
| 20x20x2 | 8 | FK20x20x2 | $4.86 | $33.97 | $30.57 | $25.71 | 84.1% | $19.44 | $17.50 | $12.64 | 72.2% | $11.47 | $10.32 | $5.46 | 52.9% | $9.89 | $8.90 | $4.04 | 45.4% | $8.07 | $7.26 | $2.40 | 33.1% | Live scrape | — |
| 20x20x2 | 11 | FK20x20x2 | $5.96 | $37.37 | $33.63 | $27.67 | 82.3% | $21.10 | $18.99 | $13.03 | 68.6% | $13.60 | $12.24 | $6.28 | 51.3% | $11.47 | $10.32 | $4.36 | 42.2% | $11.21 | $10.09 | $4.13 | 40.9% | Live scrape | — |
| 20x20x2 | 13 | FK20x20x2 | $6.55 | $40.43 | $36.39 | $29.84 | 82.0% | $21.24 | $19.12 | $12.57 | 65.7% | $13.05 | $11.75 | $5.20 | 44.3% | $11.33 | $10.20 | $3.65 | 35.8% | $11.82 | $10.64 | $4.09 | 38.4% | Live scrape | — |
| 16x20x4 | 8 | FK16x20x4 | $5.96 | $48.89 | $44.00 | $38.04 | 86.5% | $24.02 | $21.62 | $15.66 | 72.4% | $18.89 | $17.00 | $11.04 | 64.9% | $15.60 | $14.04 | $8.08 | 57.5% | $14.28 | $12.85 | $6.89 | 53.6% | Live scrape | — |
| 16x20x4 | 11 | FK16x20x4 | $7.78 | $49.99 | $44.99 | $37.21 | 82.7% | $31.10 | $27.99 | $20.21 | 72.2% | $24.24 | $21.82 | $14.04 | 64.3% | $22.62 | $20.36 | $12.58 | 61.8% | $21.36 | $19.22 | $11.44 | 59.5% | Live scrape | — |
| 16x20x4 | 13 | FK16x20x4 | $8.55 | $46.27 | $41.64 | $33.09 | 79.5% | $27.39 | $24.65 | $16.10 | 65.3% | $21.73 | $19.56 | $11.01 | 56.3% | $20.13 | $18.12 | $9.57 | 52.8% | $20.06 | $18.05 | $9.50 | 52.6% | Live scrape | — |
| 20x20x4 | 11 | FK20x20x4 | $8.96 | $44.44 | $40.00 | $31.04 | 77.6% | $30.55 | $27.50 | $18.54 | 67.4% | $21.54 | $19.39 | $10.43 | 53.8% | $17.95 | $16.16 | $7.20 | 44.6% | $17.95 | $16.16 | $7.20 | 44.6% | Live scrape | — |
| 20x20x4 | 13 | FK20x20x4 | $9.86 | $43.33 | $39.00 | $29.14 | 74.7% | $28.33 | $25.50 | $15.64 | 61.3% | $22.88 | $20.59 | $10.73 | 52.1% | $22.58 | $20.32 | $10.46 | 51.5% | $20.67 | $18.60 | $8.74 | 47.0% | Live scrape | — |

#### Popular size × MERV **not** on the wholesale sheet

- 14x25x1 MERV 11
- 14x25x1 MERV 13
- 16x25x4 MERV 8
- 20x25x4 MERV 8
- 20x25x4 MERV 11
- 20x25x4 MERV 13
- 20x20x4 MERV 8

Ask Paul for these if you intend to stock them from Filter King:

- **20x25x4 MERV 8 / 11 / 13** — top-10 residential media-cabinet size (AprilAire / Honeywell / Lennox). Not on the PDF at all.
- **16x25x4 MERV 8** — MERV 11 and MERV 13 are listed; MERV 8 is not.
- **14x25x1 MERV 11 and MERV 13** — MERV 8 is on the sheet; 11 and 13 are not.
- **20x20x4 MERV 8** — MERV 11 and MERV 13 are listed; MERV 8 is not.
- **16x20x4 MERV 8** — MERV 11 and MERV 13 are listed; MERV 8 is not.
- **Carbon / odor filters** — quote-only per page 4.
- MERV 11 and 13 lists are much shorter than MERV 8. Oddball actual-size (`A`) 1-inch SKUs are almost all MERV 8-only.

---

### Duplicate SKUs on the sheet (nominal vs A/N)

Some faces appear twice: a nominal SKU and an actual-size `A` or `N` SKU. The comparison table uses the nominal SKU when it exists.

#### Same size, same price, extra suffix (5)

| Size | MERV | SKUs | Cost |
| --- | --- | --- | --- |
| 12x24x1 | 11 | FK12x24x1 (nominal), FK12x24x1N (N) | $4.01 |
| 12x24x1 | 13 | FK12x24x1 (nominal), FK12x24x1N (N) | $4.42 |
| 18x36x1 | 11 | FK18x36x1 (nominal), FK18x36x1A (A) | $6.23 |
| 18x36x1 | 13 | FK18x36x1 (nominal), FK18x36x1A (A) | $6.85 |
| 22x24x1 | 8 | FK22x24x1 (nominal), FK22x24x1A (A) | $4.99 |

#### Same size, **different** costs (9) — do not mix these up

| Size | MERV | SKU | Suffix | Cost |
| --- | --- | --- | --- | --- |
| 20x23x1 | 8 | FK20x23x1 | nominal | $4.76 |
| 20x23x1 | 8 | FK20x23x1A | A | $4.38 |
| 21x21x1 | 8 | FK21x21x1 | nominal | $4.80 |
| 21x21x1 | 8 | FK21x21x1A | A | $4.84 |
| 22x22x1 | 8 | FK22x22x1 | nominal | $4.80 |
| 22x22x1 | 8 | FK22x22x1A | A | $4.92 |
| 22x24x1 | 11 | FK22x24x1 | nominal | $5.44 |
| 22x24x1 | 11 | FK22x24x1A | A | $5.69 |
| 22x24x1 | 13 | FK22x24x1 | nominal | $5.98 |
| 22x24x1 | 13 | FK22x24x1A | A | $6.26 |
| 24x36x1 | 8 | FK24x36x1 | nominal | $6.08 |
| 24x36x1 | 8 | FK24x36x1A | A | $6.19 |
| 25x32x1 | 8 | FK25x32x1 | nominal | $5.80 |
| 25x32x1 | 8 | FK25x32x1A | A | $5.84 |
| 6x12x1 | 8 | FK6x12x1 | nominal | $6.08 |
| 6x12x1 | 8 | FK6x12x1A | A | $5.84 |
| 6x14x1 | 8 | FK6x14x1 | nominal | $6.31 |
| 6x14x1 | 8 | FK6x14x1A | A | $2.89 |

Material gaps in that list (from the sheet):

- **6x14x1** MERV 8: `FK6x14x1` vs `FK6x14x1A` — different costs. The comparison uses the nominal SKU.
- **20x23x1** MERV 8: `FK20x23x1` vs `FK20x23x1A` — different costs.
- **6x12x1** MERV 8: `FK6x12x1` vs `FK6x12x1A` — different costs.
- **22x24x1** MERV 11 and 13: nominal vs `A` have different costs.
- **18x36x1** MERV 11 and 13: check the table — some duals are same price, some are not.

---

### Full match table — every size × MERV on the sheet

299 rows. Sorted by depth, then size, then MERV. This is the complete comparison.

| Size | MERV | Wholesale SKU used | Your cost | FK 1 | Hero 1 | Hero 1 $ | Hero 1 % | FK 2 | Hero 2 | Hero 2 $ | Hero 2 % | FK 4 | Hero 4 | Hero 4 $ | Hero 4 % | FK 6 | Hero 6 | Hero 6 $ | Hero 6 % | FK 12 | Hero 12 | Hero 12 $ | Hero 12 % | Retail source | Other sheet SKUs for this size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12x15x0.5 | 11 | FK12x15x0.5 | $6.48 | $54.98 | $49.48 | $43.00 | 86.9% | $36.01 | $32.41 | $25.93 | 80.0% | $26.20 | $23.58 | $17.10 | 72.5% | $23.58 | $21.22 | $14.74 | 69.5% | $22.70 | $20.43 | $13.95 | 68.3% | Live scrape | — |
| 12x15x0.5 | 13 | FK12x15x0.5 | $7.13 | $49.08 | $44.17 | $37.04 | 83.9% | $32.20 | $28.98 | $21.85 | 75.4% | $27.58 | $24.82 | $17.69 | 71.3% | $24.83 | $22.35 | $15.22 | 68.1% | $23.91 | $21.52 | $14.39 | 66.9% | Live scrape | — |
| 12x36x0.5 | 8 | FK12x36x0.5 | $3.93 | $46.47 | $41.82 | $37.89 | 90.6% | $30.26 | $27.23 | $23.30 | 85.6% | $20.87 | $18.78 | $14.85 | 79.1% | $18.98 | $17.08 | $13.15 | 77.0% | $18.27 | $16.44 | $12.51 | 76.1% | Live scrape | — |
| 12x36x0.5 | 11 | FK12x36x0.5 | $4.63 | $51.12 | $46.01 | $41.38 | 89.9% | $33.30 | $29.97 | $25.34 | 84.6% | $26.20 | $23.58 | $18.95 | 80.4% | $23.58 | $21.22 | $16.59 | 78.2% | $22.70 | $20.43 | $15.80 | 77.3% | Live scrape | — |
| 12x36x0.5 | 13 | FK12x36x0.5 | $5.09 | $45.99 | $41.39 | $36.30 | 87.7% | $32.20 | $28.98 | $23.89 | 82.4% | $27.58 | $24.82 | $19.73 | 79.5% | $24.83 | $22.35 | $17.26 | 77.2% | $23.91 | $21.52 | $16.43 | 76.3% | Live scrape | — |
| 24x30x0.5 | 8 | FK24x30x0.5 | $5.35 | $46.47 | $41.82 | $36.47 | 87.2% | $30.26 | $27.23 | $21.88 | 80.4% | $20.87 | $18.78 | $13.43 | 71.5% | $18.98 | $17.08 | $11.73 | 68.7% | $18.27 | $16.44 | $11.09 | 67.5% | Live scrape | — |
| 10x10x1 | 8 | FK10x10x1 | $2.81 | $28.30 | $25.47 | $22.66 | 89.0% | $14.98 | $13.48 | $10.67 | 79.2% | $7.34 | $6.61 | $3.80 | 57.5% | $7.49 | $6.74 | $3.93 | 58.3% | $5.82 | $5.24 | $2.43 | 46.4% | Live scrape | — |
| 10x30x1 | 8 | FK10x30x1N | $3.87 | $32.22 | $29.00 | $25.13 | 86.7% | $18.61 | $16.75 | $12.88 | 76.9% | $10.76 | $9.68 | $5.81 | 60.0% | $9.15 | $8.24 | $4.37 | 53.0% | $8.32 | $7.49 | $3.62 | 48.3% | Live scrape | — |
| 10x36x1 | 8 | FK10x36x1 | $4.07 | $36.03 | $32.43 | $28.36 | 87.4% | $24.22 | $21.80 | $17.73 | 81.3% | $11.24 | $10.12 | $6.05 | 59.8% | $10.60 | $9.54 | $5.47 | 57.3% | $9.60 | $8.64 | $4.57 | 52.9% | Live scrape | — |
| 10x36x1 | 11 | FK10x36x1 | $4.41 | $39.64 | $35.68 | $31.27 | 87.6% | $28.88 | $25.99 | $21.58 | 83.0% | $13.34 | $12.01 | $7.60 | 63.3% | $21.72 | $19.55 | $15.14 | 77.4% | $12.77 | $11.49 | $7.08 | 61.6% | Live scrape | — |
| 10x36x1 | 13 | FK10x36x1 | $4.85 | $42.87 | $38.58 | $33.73 | 87.4% | $31.24 | $28.12 | $23.27 | 82.8% | $14.04 | $12.64 | $7.79 | 61.6% | $19.27 | $17.34 | $12.49 | 72.0% | $19.14 | $17.23 | $12.38 | 71.9% | Live scrape | — |
| 12.5x24.25x1 | 8 | FK12.5x24.25x1A | $3.74 | $35.13 | $31.62 | $27.88 | 88.2% | $22.32 | $20.09 | $16.35 | 81.4% | $14.28 | $12.85 | $9.11 | 70.9% | $12.85 | $11.57 | $7.83 | 67.7% | $12.38 | $11.14 | $7.40 | 66.4% | Live scrape | — |
| 12x12x1 | 8 | FK12x12x1 | $2.95 | $26.60 | $23.94 | $20.99 | 87.7% | $14.98 | $13.48 | $10.53 | 78.1% | $7.08 | $6.37 | $3.42 | 53.7% | $7.49 | $6.74 | $3.79 | 56.2% | $5.51 | $4.96 | $2.01 | 40.5% | Live scrape | — |
| 12x12x1 | 11 | FK12x12x1 | $2.88 | $30.06 | $27.05 | $24.17 | 89.4% | $18.06 | $16.25 | $13.37 | 82.3% | $9.44 | $8.50 | $5.62 | 66.1% | $8.02 | $7.22 | $4.34 | 60.1% | $8.79 | $7.91 | $5.03 | 63.6% | Live scrape | — |
| 12x12x1 | 13 | FK12x12x1 | $3.17 | $31.65 | $28.49 | $25.32 | 88.9% | $19.01 | $17.11 | $13.94 | 81.5% | $9.04 | $8.14 | $4.97 | 61.1% | $7.62 | $6.86 | $3.69 | 53.8% | $7.22 | $6.50 | $3.33 | 51.2% | Live scrape | — |
| 12x18x1 | 8 | FK12x18x1A | $2.50 | $28.30 | $25.47 | $22.97 | 90.2% | $14.99 | $13.49 | $10.99 | 81.5% | $9.79 | $8.81 | $6.31 | 71.6% | $8.16 | $7.34 | $4.84 | 65.9% | $8.23 | $7.41 | $4.91 | 66.3% | Live scrape | — |
| 12x20x1 | 8 | FK12x20x1 | $3.48 | $31.10 | $27.99 | $24.51 | 87.6% | $14.69 | $13.22 | $9.74 | 73.7% | $9.30 | $8.37 | $4.89 | 58.4% | $7.49 | $6.74 | $3.26 | 48.4% | $5.97 | $5.37 | $1.89 | 35.2% | Live scrape | — |
| 12x24x1 | 8 | FK12x24x1 | $3.74 | $28.30 | $25.47 | $21.73 | 85.3% | $13.71 | $12.34 | $8.60 | 69.7% | $8.81 | $7.93 | $4.19 | 52.8% | $7.49 | $6.74 | $3.00 | 44.5% | $6.20 | $5.58 | $1.84 | 33.0% | Live scrape | — |
| 12x24x1 | 11 | FK12x24x1 | $4.01 | $31.37 | $27.61 | $23.60 | 85.5% | $15.11 | $13.30 | $9.29 | 69.8% | $10.75 | $9.46 | $5.45 | 57.6% | $8.46 | $7.44 | $3.43 | 46.1% | $7.01 | $6.17 | $2.16 | 35.0% | Modeled | FK12x24x1N |
| 12x24x1 | 13 | FK12x24x1 | $4.42 | $31.76 | $28.58 | $24.16 | 84.5% | $20.82 | $18.74 | $14.32 | 76.4% | $10.40 | $9.36 | $4.94 | 52.8% | $8.70 | $7.83 | $3.41 | 43.6% | $8.32 | $7.49 | $3.07 | 41.0% | Live scrape | FK12x24x1N |
| 12x36x1 | 8 | FK12x36x1 | $4.50 | $41.10 | $36.99 | $32.49 | 87.8% | $19.59 | $17.63 | $13.13 | 74.5% | $11.02 | $9.92 | $5.42 | 54.6% | $10.76 | $9.68 | $5.18 | 53.5% | $9.29 | $8.36 | $3.86 | 46.2% | Live scrape | — |
| 13x13x1 | 8 | FK13x13x1 | $4.01 | $31.17 | $28.05 | $24.04 | 85.7% | $19.55 | $17.60 | $13.59 | 77.2% | $11.89 | $10.70 | $6.69 | 62.5% | $10.70 | $9.63 | $5.62 | 58.4% | $10.30 | $9.27 | $5.26 | 56.7% | Live scrape | — |
| 13x21.5x1 | 8 | FK13x21.5x1A | $4.03 | $26.60 | $23.94 | $19.91 | 83.2% | $17.14 | $15.43 | $11.40 | 73.9% | $11.33 | $10.20 | $6.17 | 60.5% | $10.63 | $9.57 | $5.54 | 57.9% | $9.53 | $8.58 | $4.55 | 53.0% | Live scrape | — |
| 13x21x1 | 8 | FK13x21x1A | $3.70 | $31.10 | $27.99 | $24.29 | 86.8% | $19.44 | $17.50 | $13.80 | 78.9% | $11.61 | $10.45 | $6.75 | 64.6% | $12.11 | $10.90 | $7.20 | 66.1% | $11.65 | $10.49 | $6.79 | 64.7% | Live scrape | — |
| 14x14x1 | 8 | FK14x14x1 | $3.36 | $28.30 | $25.47 | $22.11 | 86.8% | $14.44 | $13.00 | $9.64 | 74.2% | $7.83 | $7.05 | $3.69 | 52.3% | $7.49 | $6.74 | $3.38 | 50.1% | $5.74 | $5.17 | $1.81 | 35.0% | Live scrape | — |
| 14x14x1 | 11 | FK14x14x1 | $3.22 | $31.13 | $28.02 | $24.80 | 88.5% | $17.22 | $15.50 | $12.28 | 79.2% | $8.97 | $8.07 | $4.85 | 60.1% | $7.55 | $6.80 | $3.58 | 52.6% | $7.26 | $6.53 | $3.31 | 50.7% | Live scrape | — |
| 14x14x1 | 13 | FK14x14x1 | $3.54 | $31.76 | $28.58 | $25.04 | 87.6% | $18.45 | $16.61 | $13.07 | 78.7% | $9.92 | $8.93 | $5.39 | 60.4% | $7.75 | $6.98 | $3.44 | 49.3% | $7.57 | $6.81 | $3.27 | 48.0% | Live scrape | — |
| 14x18x1 | 8 | FK14x18x1 | $3.62 | $28.30 | $25.47 | $21.85 | 85.8% | $14.69 | $13.22 | $9.60 | 72.6% | $8.57 | $7.71 | $4.09 | 53.0% | $7.49 | $6.74 | $3.12 | 46.3% | $7.34 | $6.61 | $2.99 | 45.2% | Live scrape | — |
| 14x20x1 | 8 | FK14x20x1 | $3.74 | $28.30 | $25.47 | $21.73 | 85.3% | $14.54 | $13.09 | $9.35 | 71.4% | $8.57 | $7.71 | $3.97 | 51.5% | $7.49 | $6.74 | $3.00 | 44.5% | $6.23 | $5.61 | $1.87 | 33.3% | Live scrape | — |
| 14x20x1 | 11 | FK14x20x1 | $3.92 | $31.13 | $28.02 | $24.10 | 86.0% | $16.65 | $14.99 | $11.07 | 73.8% | $8.49 | $7.64 | $3.72 | 48.7% | $7.08 | $6.37 | $2.45 | 38.5% | $7.26 | $6.53 | $2.61 | 40.0% | Live scrape | — |
| 14x20x1 | 13 | FK14x20x1 | $4.32 | $31.76 | $28.58 | $24.26 | 84.9% | $16.52 | $14.87 | $10.55 | 70.9% | $9.27 | $8.34 | $4.02 | 48.2% | $6.70 | $6.03 | $1.71 | 28.4% | $6.87 | $6.18 | $1.86 | 30.1% | Live scrape | — |
| 14x22x1 | 8 | FK14x22x1 | $3.91 | $31.67 | $28.50 | $24.59 | 86.3% | $19.89 | $17.90 | $13.99 | 78.2% | $12.92 | $11.63 | $7.72 | 66.4% | $10.97 | $9.87 | $5.96 | 60.4% | $10.57 | $9.51 | $5.60 | 58.9% | Live scrape | — |
| 14x24x1 | 8 | FK14x24x1 | $3.91 | $28.30 | $25.47 | $21.56 | 84.6% | $14.54 | $13.09 | $9.18 | 70.1% | $8.57 | $7.71 | $3.80 | 49.3% | $6.53 | $5.88 | $1.97 | 33.5% | $6.30 | $5.67 | $1.76 | 31.0% | Live scrape | — |
| 14x24x1 | 11 | FK14x24x1 | $4.27 | $33.33 | $30.00 | $25.73 | 85.8% | $19.44 | $17.50 | $13.23 | 75.6% | $8.49 | $7.64 | $3.37 | 44.1% | $7.08 | $6.37 | $2.10 | 33.0% | $7.18 | $6.46 | $2.19 | 33.9% | Live scrape | — |
| 14x24x1 | 13 | FK14x24x1 | $4.69 | $35.30 | $31.77 | $27.08 | 85.2% | $20.82 | $18.74 | $14.05 | 75.0% | $10.40 | $9.36 | $4.67 | 49.9% | $8.02 | $7.22 | $2.53 | 35.0% | $7.76 | $6.98 | $2.29 | 32.8% | Live scrape | — |
| 14x25x1 | 8 | FK14x25x1 | $4.33 | $28.30 | $25.47 | $21.14 | 83.0% | $16.10 | $14.49 | $10.16 | 70.1% | $8.57 | $7.71 | $3.38 | 43.8% | $7.49 | $6.74 | $2.41 | 35.8% | $6.61 | $5.95 | $1.62 | 27.2% | Live scrape | — |
| 14x30x1 | 8 | FK14x30x1 | $4.78 | $31.10 | $27.99 | $23.21 | 82.9% | $18.88 | $16.99 | $12.21 | 71.9% | $9.79 | $8.81 | $4.03 | 45.7% | $7.49 | $6.74 | $1.96 | 29.1% | $7.88 | $7.09 | $2.31 | 32.6% | Live scrape | — |
| 14x30x1 | 11 | FK14x30x1 | $5.20 | $33.42 | $30.08 | $24.88 | 82.7% | $18.79 | $16.91 | $11.71 | 69.2% | $12.14 | $10.93 | $5.73 | 52.4% | $10.11 | $9.10 | $3.90 | 42.9% | $9.63 | $8.67 | $3.47 | 40.0% | Live scrape | — |
| 14x30x1 | 13 | FK14x30x1 | $5.72 | $37.65 | $33.89 | $28.17 | 83.1% | $21.41 | $19.27 | $13.55 | 70.3% | $14.05 | $12.65 | $6.93 | 54.8% | $12.72 | $11.45 | $5.73 | 50.0% | $9.67 | $8.70 | $2.98 | 34.3% | Live scrape | — |
| 15x15x1 | 8 | FK15x15x1A | $3.68 | $31.10 | $27.99 | $24.31 | 86.9% | $18.12 | $16.31 | $12.63 | 77.4% | $11.99 | $10.79 | $7.11 | 65.9% | $9.77 | $8.79 | $5.11 | 58.1% | $8.23 | $7.41 | $3.73 | 50.3% | Live scrape | — |
| 15x20x1 | 8 | FK15x20x1 | $3.91 | $31.10 | $27.99 | $24.08 | 86.0% | $18.33 | $16.50 | $12.59 | 76.3% | $10.77 | $9.69 | $5.78 | 59.6% | $8.25 | $7.43 | $3.52 | 47.4% | $7.18 | $6.46 | $2.55 | 39.5% | Live scrape | — |
| 15x24x1 | 8 | FK15x24x1 | $3.95 | $38.62 | $34.76 | $30.81 | 88.6% | $24.76 | $22.28 | $18.33 | 82.3% | $16.37 | $14.73 | $10.78 | 73.2% | $14.73 | $13.26 | $9.31 | 70.2% | $14.19 | $12.77 | $8.82 | 69.1% | Live scrape | — |
| 16x16x1 | 8 | FK16x16x1 | $3.62 | $28.30 | $25.47 | $21.85 | 85.8% | $14.98 | $13.48 | $9.86 | 73.1% | $8.57 | $7.71 | $4.09 | 53.0% | $7.49 | $6.74 | $3.12 | 46.3% | $6.13 | $5.52 | $1.90 | 34.4% | Live scrape | — |
| 16x16x1 | 11 | FK16x16x1 | $3.80 | $31.13 | $28.02 | $24.22 | 86.4% | $18.33 | $16.50 | $12.70 | 77.0% | $8.02 | $7.22 | $3.42 | 47.4% | $7.49 | $6.74 | $2.94 | 43.6% | $7.29 | $6.56 | $2.76 | 42.1% | Live scrape | — |
| 16x16x1 | 13 | FK16x16x1 | $4.18 | $31.76 | $28.58 | $24.40 | 85.4% | $19.63 | $17.67 | $13.49 | 76.3% | $9.63 | $8.67 | $4.49 | 51.8% | $7.62 | $6.86 | $2.68 | 39.1% | $6.32 | $5.69 | $1.51 | 26.5% | Live scrape | — |
| 16x19x1 | 8 | FK16x19x1 | $3.83 | $33.64 | $30.28 | $26.45 | 87.4% | $19.45 | $17.51 | $13.68 | 78.1% | $12.27 | $11.04 | $7.21 | 65.3% | $10.37 | $9.33 | $5.50 | 58.9% | $8.72 | $7.85 | $4.02 | 51.2% | Live scrape | — |
| 16x19x1 | 11 | FK16x19x1 | $4.28 | $36.54 | $32.89 | $28.61 | 87.0% | $23.32 | $20.99 | $16.71 | 79.6% | $14.97 | $13.47 | $9.19 | 68.2% | $13.47 | $12.12 | $7.84 | 64.7% | $12.98 | $11.68 | $7.40 | 63.4% | Live scrape | — |
| 16x19x1 | 13 | FK16x19x1 | $4.71 | $32.03 | $28.83 | $24.12 | 83.7% | $20.59 | $18.53 | $13.82 | 74.6% | $13.91 | $12.52 | $7.81 | 62.4% | $14.88 | $13.39 | $8.68 | 64.8% | $14.95 | $13.46 | $8.75 | 65.0% | Live scrape | — |
| 16x20x1 | 8 | FK16x20x1 | $3.76 | $28.30 | $25.47 | $21.71 | 85.2% | $14.99 | $13.49 | $9.73 | 72.1% | $8.32 | $7.49 | $3.73 | 49.8% | $7.49 | $6.74 | $2.98 | 44.2% | $6.12 | $5.51 | $1.75 | 31.8% | Live scrape | — |
| 16x20x1 | 11 | FK16x20x1 | $4.09 | $31.13 | $28.02 | $23.93 | 85.4% | $18.33 | $16.50 | $12.41 | 75.2% | $8.49 | $7.64 | $3.55 | 46.5% | $7.88 | $7.09 | $3.00 | 42.3% | $7.48 | $6.73 | $2.64 | 39.2% | Live scrape | — |
| 16x20x1 | 13 | FK16x20x1 | $4.49 | $31.76 | $28.58 | $24.09 | 84.3% | $18.89 | $17.00 | $12.51 | 73.6% | $9.99 | $8.99 | $4.50 | 50.1% | $8.32 | $7.49 | $3.00 | 40.1% | $8.02 | $7.22 | $2.73 | 37.8% | Live scrape | — |
| 16x21x1 | 8 | FK16x21x1A | $3.99 | $30.19 | $27.17 | $23.18 | 85.3% | $18.86 | $16.97 | $12.98 | 76.5% | $9.79 | $8.81 | $4.82 | 54.7% | $10.18 | $9.16 | $5.17 | 56.4% | $9.80 | $8.82 | $4.83 | 54.8% | Live scrape | — |
| 16x22x1 | 8 | FK16x22x1A | $4.38 | $34.83 | $30.65 | $26.27 | 85.7% | $30.28 | $26.65 | $22.27 | 83.6% | $8.83 | $7.77 | $3.39 | 43.6% | $13.31 | $11.71 | $7.33 | 62.6% | $11.61 | $10.22 | $5.84 | 57.1% | Modeled | — |
| 16x24x1 | 8 | FK16x24x1 | $4.19 | $28.30 | $25.47 | $21.28 | 83.5% | $15.67 | $14.10 | $9.91 | 70.3% | $9.30 | $8.37 | $4.18 | 49.9% | $7.49 | $6.74 | $2.55 | 37.8% | $6.30 | $5.67 | $1.48 | 26.1% | Live scrape | — |
| 16x25x1 | 8 | FK16x25x1 | $4.21 | $28.30 | $25.47 | $21.26 | 83.5% | $14.69 | $13.22 | $9.01 | 68.2% | $8.57 | $7.71 | $3.50 | 45.4% | $7.49 | $6.74 | $2.53 | 37.5% | $6.03 | $5.43 | $1.22 | 22.5% | Live scrape | — |
| 16x25x1 | 11 | FK16x25x1 | $4.68 | $31.13 | $28.02 | $23.34 | 83.3% | $16.65 | $14.99 | $10.31 | 68.8% | $9.79 | $8.81 | $4.13 | 46.9% | $7.55 | $6.80 | $2.12 | 31.2% | $7.48 | $6.73 | $2.05 | 30.5% | Live scrape | — |
| 16x25x1 | 13 | FK16x25x1 | $5.15 | $31.76 | $28.58 | $23.43 | 82.0% | $16.99 | $15.29 | $10.14 | 66.3% | $9.37 | $8.43 | $3.28 | 38.9% | $6.70 | $6.03 | $0.88 | 14.6% | $6.87 | $6.18 | $1.03 | 16.7% | Live scrape | — |
| 16x30x1 | 8 | FK16x30x1 | $4.54 | $34.44 | $31.00 | $26.46 | 85.4% | $17.63 | $15.87 | $11.33 | 71.4% | $12.14 | $10.93 | $6.39 | 58.5% | $9.44 | $8.50 | $3.96 | 46.6% | $7.46 | $6.71 | $2.17 | 32.3% | Live scrape | — |
| 17.5x21x1 | 8 | FK17.5x21x1A | $4.84 | $44.92 | $40.43 | $35.59 | 88.0% | $28.19 | $25.37 | $20.53 | 80.9% | $14.16 | $12.74 | $7.90 | 62.0% | $11.34 | $10.21 | $5.37 | 52.6% | $10.19 | $9.17 | $4.33 | 47.2% | Live scrape | — |
| 17.5x22x1 | 8 | FK17.5x22x1A | $4.64 | $43.87 | $39.48 | $34.84 | 88.2% | $18.89 | $17.00 | $12.36 | 72.7% | $14.16 | $12.74 | $8.10 | 63.6% | $12.11 | $10.90 | $6.26 | 57.4% | $12.67 | $11.40 | $6.76 | 59.3% | Live scrape | — |
| 17.5x22x1 | 11 | FK17.5x22x1A | $4.99 | $51.33 | $46.20 | $41.21 | 89.2% | $32.24 | $29.02 | $24.03 | 82.8% | $19.83 | $17.85 | $12.86 | 72.0% | $16.53 | $14.88 | $9.89 | 66.5% | $12.69 | $11.42 | $6.43 | 56.3% | Live scrape | — |
| 17.5x22x1 | 13 | FK17.5x22x1A | $5.48 | $54.37 | $48.93 | $43.45 | 88.8% | $34.53 | $31.08 | $25.60 | 82.4% | $19.27 | $17.34 | $11.86 | 68.4% | $17.66 | $15.89 | $10.41 | 65.5% | $14.59 | $13.13 | $7.65 | 58.3% | Live scrape | — |
| 17x17x1 | 8 | FK17x17x1A | $3.97 | $28.19 | $25.37 | $21.40 | 84.4% | $18.42 | $16.58 | $12.61 | 76.1% | $13.46 | $12.11 | $8.14 | 67.2% | $11.18 | $10.06 | $6.09 | 60.5% | $9.79 | $8.81 | $4.84 | 54.9% | Live scrape | — |
| 17x20x1 | 8 | FK17x20x1 | $4.03 | $33.33 | $30.00 | $25.97 | 86.6% | $19.10 | $17.19 | $13.16 | 76.6% | $14.73 | $13.26 | $9.23 | 69.6% | $11.47 | $10.32 | $6.29 | 60.9% | $11.26 | $10.13 | $6.10 | 60.2% | Live scrape | — |
| 17x21x1 | 8 | FK17x21x1A | $4.07 | $32.14 | $28.93 | $24.86 | 85.9% | $17.14 | $15.43 | $11.36 | 73.6% | $9.79 | $8.81 | $4.74 | 53.8% | $8.18 | $7.36 | $3.29 | 44.7% | $9.39 | $8.45 | $4.38 | 51.8% | Live scrape | — |
| 17x21x1 | 11 | FK17x21x1A | $4.43 | $37.14 | $33.43 | $29.00 | 86.7% | $23.73 | $21.36 | $16.93 | 79.3% | $14.64 | $13.18 | $8.75 | 66.4% | $13.92 | $12.53 | $8.10 | 64.6% | $13.35 | $12.02 | $7.59 | 63.1% | Live scrape | — |
| 17x21x1 | 13 | FK17x21x1A | $4.87 | $32.61 | $29.35 | $24.48 | 83.4% | $21.00 | $18.90 | $14.03 | 74.2% | $19.27 | $17.34 | $12.47 | 71.9% | $13.97 | $12.57 | $7.70 | 61.3% | $11.29 | $10.16 | $5.29 | 52.1% | Live scrape | — |
| 17x22x1 | 8 | FK17x22x1 | $4.11 | $28.30 | $25.47 | $21.36 | 83.9% | $16.65 | $14.99 | $10.88 | 72.6% | $9.79 | $8.81 | $4.70 | 53.3% | $7.88 | $7.09 | $2.98 | 42.0% | $7.34 | $6.61 | $2.50 | 37.8% | Live scrape | — |
| 18x18x1 | 8 | FK18x18x1 | $3.89 | $32.61 | $29.35 | $25.46 | 86.7% | $14.69 | $13.22 | $9.33 | 70.6% | $8.57 | $7.71 | $3.82 | 49.5% | $7.49 | $6.74 | $2.85 | 42.3% | $6.74 | $6.07 | $2.18 | 35.9% | Live scrape | — |
| 18x18x1 | 11 | FK18x18x1 | $4.19 | $36.14 | $31.80 | $27.61 | 86.8% | $16.19 | $14.25 | $10.06 | 70.6% | $10.46 | $9.20 | $5.01 | 54.5% | $8.46 | $7.44 | $3.25 | 43.7% | $7.62 | $6.71 | $2.52 | 37.6% | Modeled | — |
| 18x18x1 | 13 | FK18x18x1 | $4.61 | $38.79 | $34.91 | $30.30 | 86.8% | $27.84 | $25.06 | $20.45 | 81.6% | $9.37 | $8.43 | $3.82 | 45.3% | $7.63 | $6.87 | $2.26 | 32.9% | $7.56 | $6.80 | $2.19 | 32.2% | Live scrape | — |
| 18x20x1 | 8 | FK18x20x1 | $4.09 | $29.99 | $26.99 | $22.90 | 84.8% | $16.16 | $14.54 | $10.45 | 71.9% | $8.57 | $7.71 | $3.62 | 47.0% | $7.49 | $6.74 | $2.65 | 39.3% | $6.53 | $5.88 | $1.79 | 30.4% | Live scrape | — |
| 18x20x1 | 11 | FK18x20x1 | $4.43 | $34.44 | $31.00 | $26.57 | 85.7% | $21.10 | $18.99 | $14.56 | 76.7% | $8.49 | $7.64 | $3.21 | 42.0% | $7.23 | $6.51 | $2.08 | 32.0% | $7.00 | $6.30 | $1.87 | 29.7% | Live scrape | — |
| 18x20x1 | 13 | FK18x20x1 | $4.87 | $31.40 | $27.63 | $22.76 | 82.4% | $17.21 | $15.14 | $10.27 | 67.8% | $11.02 | $9.70 | $4.83 | 49.8% | $8.91 | $7.84 | $2.97 | 37.9% | $7.77 | $6.84 | $1.97 | 28.8% | Modeled | — |
| 18x22x1 | 8 | FK18x22x1 | $4.09 | $34.44 | $31.00 | $26.91 | 86.8% | $19.59 | $17.63 | $13.54 | 76.8% | $11.75 | $10.58 | $6.49 | 61.3% | $8.65 | $7.79 | $3.70 | 47.5% | $8.57 | $7.71 | $3.62 | 47.0% | Live scrape | — |
| 18x24x1 | 8 | FK18x24x1 | $4.38 | $29.99 | $26.99 | $22.61 | 83.8% | $16.97 | $15.27 | $10.89 | 71.3% | $10.20 | $9.18 | $4.80 | 52.3% | $7.88 | $7.09 | $2.71 | 38.2% | $7.03 | $6.33 | $1.95 | 30.8% | Live scrape | — |
| 18x24x1 | 11 | FK18x24x1 | $4.86 | $33.33 | $30.00 | $25.14 | 83.8% | $19.99 | $17.99 | $13.13 | 73.0% | $11.75 | $10.58 | $5.72 | 54.1% | $8.97 | $8.07 | $3.21 | 39.8% | $7.88 | $7.09 | $2.23 | 31.5% | Live scrape | — |
| 18x24x1 | 13 | FK18x24x1 | $5.35 | $31.40 | $27.63 | $22.28 | 80.6% | $18.07 | $15.90 | $10.55 | 66.4% | $13.11 | $11.54 | $6.19 | 53.6% | $9.38 | $8.25 | $2.90 | 35.2% | $8.37 | $7.37 | $2.02 | 27.4% | Modeled | — |
| 18x25x1 | 8 | FK18x25x1 | $4.03 | $37.08 | $32.63 | $28.60 | 87.6% | $23.18 | $20.40 | $16.37 | 80.2% | $13.05 | $11.48 | $7.45 | 64.9% | $16.05 | $14.12 | $10.09 | 71.5% | $14.02 | $12.34 | $8.31 | 67.3% | Modeled | — |
| 18x30x1 | 8 | FK18x30x1 | $5.03 | $35.55 | $32.00 | $26.97 | 84.3% | $19.59 | $17.63 | $12.60 | 71.5% | $11.89 | $10.70 | $5.67 | 53.0% | $8.32 | $7.49 | $2.46 | 32.8% | $8.29 | $7.46 | $2.43 | 32.6% | Live scrape | — |
| 18x30x1 | 11 | FK18x30x1 | $5.67 | $39.40 | $34.67 | $29.00 | 83.6% | $21.59 | $19.00 | $13.33 | 70.2% | $14.51 | $12.77 | $7.10 | 55.6% | $9.40 | $8.27 | $2.60 | 31.4% | $9.37 | $8.25 | $2.58 | 31.3% | Modeled | — |
| 18x30x1 | 13 | FK18x30x1 | $6.24 | $41.19 | $37.07 | $30.83 | 83.2% | $23.78 | $21.40 | $15.16 | 70.8% | $18.06 | $16.25 | $10.01 | 61.6% | $16.06 | $14.45 | $8.21 | 56.8% | $15.33 | $13.80 | $7.56 | 54.8% | Live scrape | — |
| 18x36x1 | 8 | FK18x36x1 | $5.49 | $47.81 | $42.07 | $36.58 | 87.0% | $25.28 | $22.25 | $16.76 | 75.3% | $18.33 | $16.13 | $10.64 | 66.0% | $14.61 | $12.86 | $7.37 | 57.3% | $16.40 | $14.43 | $8.94 | 62.0% | Modeled | — |
| 18x36x1 | 11 | FK18x36x1 | $6.23 | $54.44 | $49.00 | $42.77 | 87.3% | $28.88 | $25.99 | $19.76 | 76.0% | $21.25 | $19.13 | $12.90 | 67.4% | $18.89 | $17.00 | $10.77 | 63.4% | $15.45 | $13.91 | $7.68 | 55.2% | Live scrape | FK18x36x1A |
| 18x36x1 | 13 | FK18x36x1 | $6.85 | $50.06 | $45.05 | $38.20 | 84.8% | $26.92 | $24.23 | $17.38 | 71.7% | $23.56 | $21.20 | $14.35 | 67.7% | $17.39 | $15.65 | $8.80 | 56.2% | $19.52 | $17.57 | $10.72 | 61.0% | Live scrape | FK18x36x1A |
| 19.25x23.25x1 | 8 | FK19.25x23.25x1A | $4.56 | $33.33 | $30.00 | $25.44 | 84.8% | $21.10 | $18.99 | $14.43 | 76.0% | $17.71 | $15.94 | $11.38 | 71.4% | $14.32 | $12.89 | $8.33 | 64.6% | $13.54 | $12.19 | $7.63 | 62.6% | Live scrape | — |
| 19.5x21x1 | 8 | FK19.5x21x1A | $4.64 | $31.33 | $28.20 | $23.56 | 83.5% | $19.84 | $17.86 | $13.22 | 74.0% | $16.77 | $15.09 | $10.45 | 69.3% | $14.16 | $12.74 | $8.10 | 63.6% | $12.97 | $11.67 | $7.03 | 60.2% | Live scrape | — |
| 19.75x21.5x1 | 8 | FK19.75x21.5x1A | $4.54 | $29.04 | $26.14 | $21.60 | 82.6% | $28.20 | $25.38 | $20.84 | 82.1% | $10.63 | $9.57 | $5.03 | 52.6% | $8.65 | $7.79 | $3.25 | 41.7% | $15.20 | $13.68 | $9.14 | 66.8% | Live scrape | — |
| 19.88x21.5x1 | 8 | FK19.88x21.5x1A | $4.60 | $26.60 | $23.94 | $19.34 | 80.8% | $17.14 | $15.43 | $10.83 | 70.2% | $11.35 | $10.22 | $5.62 | 55.0% | $8.65 | $7.79 | $3.19 | 40.9% | $8.43 | $7.59 | $2.99 | 39.4% | Live scrape | — |
| 19x19x1 | 8 | FK19x19x1A | $4.40 | $34.46 | $31.01 | $26.61 | 85.8% | $20.89 | $18.80 | $14.40 | 76.6% | $13.93 | $12.54 | $8.14 | 64.9% | $12.36 | $11.12 | $6.72 | 60.4% | $8.80 | $7.92 | $3.52 | 44.4% | Live scrape | — |
| 19x19x1 | 11 | FK19x19x1A | $4.68 | $36.68 | $33.01 | $28.33 | 85.8% | $22.91 | $20.62 | $15.94 | 77.3% | $19.97 | $17.97 | $13.29 | 74.0% | $18.01 | $16.21 | $11.53 | 71.1% | $16.09 | $14.48 | $9.80 | 67.7% | Live scrape | — |
| 19x19x1 | 13 | FK19x19x1A | $5.15 | $36.08 | $31.75 | $26.60 | 83.8% | $22.25 | $19.58 | $14.43 | 73.7% | $17.91 | $15.76 | $10.61 | 67.3% | $14.71 | $12.94 | $7.79 | 60.2% | $10.47 | $9.21 | $4.06 | 44.1% | Modeled | — |
| 19x20x1 | 8 | FK19x20x1A | $4.46 | $43.87 | $39.48 | $35.02 | 88.7% | $18.89 | $17.00 | $12.54 | 73.8% | $14.88 | $13.39 | $8.93 | 66.7% | $12.60 | $11.34 | $6.88 | 60.7% | $11.65 | $10.49 | $6.03 | 57.5% | Live scrape | — |
| 19x21x1 | 8 | FK19x21x1 | $4.33 | $37.83 | $34.05 | $29.72 | 87.3% | $19.52 | $17.57 | $13.24 | 75.4% | $14.16 | $12.74 | $8.41 | 66.0% | $12.55 | $11.30 | $6.97 | 61.7% | $11.78 | $10.60 | $6.27 | 59.2% | Live scrape | — |
| 19x22x1 | 8 | FK19x22x1A | $4.38 | $39.69 | $34.93 | $30.55 | 87.5% | $24.39 | $21.46 | $17.08 | 79.6% | $16.52 | $14.54 | $10.16 | 69.9% | $15.63 | $13.75 | $9.37 | 68.1% | $11.04 | $9.72 | $5.34 | 54.9% | Modeled | — |
| 19x22x1 | 11 | FK19x22x1A | $4.75 | $34.24 | $30.82 | $26.07 | 84.6% | $21.38 | $19.24 | $14.49 | 75.3% | $17.88 | $16.09 | $11.34 | 70.5% | $15.58 | $14.02 | $9.27 | 66.1% | $14.78 | $13.30 | $8.55 | 64.3% | Live scrape | — |
| 19x22x1 | 13 | FK19x22x1A | $5.23 | $41.56 | $37.40 | $32.17 | 86.0% | $25.97 | $23.37 | $18.14 | 77.6% | $21.23 | $19.11 | $13.88 | 72.6% | $18.60 | $16.74 | $11.51 | 68.8% | $13.14 | $11.83 | $6.60 | 55.8% | Live scrape | — |
| 19x23x1 | 8 | FK19x23x1A | $4.60 | $31.33 | $28.20 | $23.60 | 83.7% | $19.84 | $17.86 | $13.26 | 74.2% | $15.82 | $14.24 | $9.64 | 67.7% | $12.90 | $11.61 | $7.01 | 60.4% | $11.52 | $10.37 | $5.77 | 55.6% | Live scrape | — |
| 19x23x1 | 11 | FK19x23x1A | $5.00 | $34.44 | $31.00 | $26.00 | 83.9% | $21.66 | $19.49 | $14.49 | 74.3% | $16.30 | $14.67 | $9.67 | 65.9% | $12.54 | $11.29 | $6.29 | 55.7% | $12.29 | $11.06 | $6.06 | 54.8% | Live scrape | — |
| 19x23x1 | 13 | FK19x23x1A | $5.50 | $39.67 | $35.70 | $30.20 | 84.6% | $25.02 | $22.52 | $17.02 | 75.6% | $22.19 | $19.97 | $14.47 | 72.5% | $15.26 | $13.73 | $8.23 | 59.9% | $12.40 | $11.16 | $5.66 | 50.7% | Live scrape | — |
| 19x25x1 | 8 | FK19x25x1 | $4.97 | $35.97 | $32.37 | $27.40 | 84.6% | $23.35 | $21.02 | $16.05 | 76.4% | $13.55 | $12.20 | $7.23 | 59.3% | $14.09 | $12.68 | $7.71 | 60.8% | $14.02 | $12.62 | $7.65 | 60.6% | Live scrape | — |
| 19x26x1 | 8 | FK19x26x1 | $5.35 | $40.98 | $36.06 | $30.71 | 85.2% | $26.48 | $23.30 | $17.95 | 77.0% | $16.88 | $14.85 | $9.50 | 64.0% | $16.40 | $14.43 | $9.08 | 62.9% | $15.80 | $13.90 | $8.55 | 61.5% | Modeled | — |
| 19x27x1 | 8 | FK19x27x1A | $4.92 | $37.86 | $33.32 | $28.40 | 85.2% | $23.48 | $20.66 | $15.74 | 76.2% | $9.57 | $8.42 | $3.50 | 41.6% | $16.92 | $14.89 | $9.97 | 67.0% | $16.03 | $14.11 | $9.19 | 65.1% | Modeled | — |
| 20x20x1 | 8 | FK20x20x1 | $4.38 | $28.30 | $25.47 | $21.09 | 82.8% | $15.55 | $14.00 | $9.62 | 68.7% | $7.34 | $6.61 | $2.23 | 33.7% | $6.65 | $5.99 | $1.61 | 26.9% | $5.83 | $5.25 | $0.87 | 16.6% | Live scrape | — |
| 20x20x1 | 11 | FK20x20x1 | $4.82 | $31.13 | $28.02 | $23.20 | 82.8% | $18.33 | $16.50 | $11.68 | 70.8% | $8.49 | $7.64 | $2.82 | 36.9% | $7.55 | $6.80 | $1.98 | 29.1% | $6.61 | $5.95 | $1.13 | 19.0% | Live scrape | — |
| 20x20x1 | 13 | FK20x20x1 | $5.31 | $31.76 | $28.58 | $23.27 | 81.4% | $18.89 | $17.00 | $11.69 | 68.8% | $9.55 | $8.60 | $3.29 | 38.3% | $7.79 | $7.01 | $1.70 | 24.3% | $7.22 | $6.50 | $1.19 | 18.3% | Live scrape | — |
| 20x21x1 | 8 | FK20x21x1A | $4.82 | $32.09 | $28.88 | $24.06 | 83.3% | $16.62 | $14.96 | $10.14 | 67.8% | $11.21 | $10.09 | $5.27 | 52.2% | $9.75 | $8.78 | $3.96 | 45.1% | $9.72 | $8.75 | $3.93 | 44.9% | Live scrape | — |
| 20x21x1 | 11 | FK20x21x1A | $5.20 | $46.44 | $41.80 | $36.60 | 87.6% | $30.23 | $27.21 | $22.01 | 80.9% | $18.37 | $16.53 | $11.33 | 68.5% | $15.91 | $14.32 | $9.12 | 63.7% | $14.41 | $12.97 | $7.77 | 59.9% | Live scrape | — |
| 20x21x1 | 13 | FK20x21x1A | $5.72 | $41.52 | $37.37 | $31.65 | 84.7% | $27.23 | $24.51 | $18.79 | 76.7% | $20.88 | $18.79 | $13.07 | 69.6% | $17.66 | $15.89 | $10.17 | 64.0% | $16.74 | $15.07 | $9.35 | 62.0% | Live scrape | — |
| 20x22x1 | 8 | FK20x22x1 | $4.52 | $29.99 | $26.99 | $22.47 | 83.3% | $16.65 | $14.99 | $10.47 | 69.8% | $11.26 | $10.13 | $5.61 | 55.4% | $7.49 | $6.74 | $2.22 | 32.9% | $7.65 | $6.89 | $2.37 | 34.4% | Live scrape | — |
| 20x23x1 | 8 | FK20x23x1 | $4.76 | $40.57 | $35.70 | $30.94 | 86.7% | $21.26 | $18.71 | $13.95 | 74.6% | $7.36 | $6.48 | $1.72 | 26.5% | $8.97 | $7.89 | $3.13 | 39.7% | $8.66 | $7.62 | $2.86 | 37.5% | Modeled | FK20x23x1A |
| 20x23x1 | 11 | FK20x23x1A | $4.73 | $41.10 | $36.99 | $32.26 | 87.2% | $21.66 | $19.49 | $14.76 | 75.7% | $12.27 | $11.04 | $6.31 | 57.2% | $9.86 | $8.87 | $4.14 | 46.7% | $9.71 | $8.74 | $4.01 | 45.9% | Live scrape | — |
| 20x23x1 | 13 | FK20x23x1A | $5.21 | $42.48 | $37.38 | $32.17 | 86.1% | $22.63 | $19.91 | $14.70 | 73.8% | $9.46 | $8.32 | $3.11 | 37.4% | $10.67 | $9.39 | $4.18 | 44.5% | $10.30 | $9.06 | $3.85 | 42.5% | Modeled | — |
| 20x24x1 | 8 | FK20x24x1 | $4.70 | $30.28 | $27.25 | $22.55 | 82.8% | $17.23 | $15.51 | $10.81 | 69.7% | $9.79 | $8.81 | $4.11 | 46.7% | $7.49 | $6.74 | $2.04 | 30.3% | $6.74 | $6.07 | $1.37 | 22.6% | Live scrape | — |
| 20x24x1 | 11 | FK20x24x1 | $5.35 | $35.55 | $32.00 | $26.65 | 83.3% | $19.44 | $17.50 | $12.15 | 69.4% | $11.68 | $10.51 | $5.16 | 49.1% | $9.96 | $8.96 | $3.61 | 40.3% | $9.29 | $8.36 | $3.01 | 36.0% | Live scrape | — |
| 20x24x1 | 13 | FK20x24x1 | $5.88 | $37.65 | $33.89 | $28.01 | 82.6% | $20.82 | $18.74 | $12.86 | 68.6% | $14.05 | $12.65 | $6.77 | 53.5% | $11.29 | $10.16 | $4.28 | 42.1% | $10.27 | $9.24 | $3.36 | 36.4% | Live scrape | — |
| 20x25x1 | 8 | FK20x25x1 | $4.76 | $31.10 | $27.99 | $23.23 | 83.0% | $14.69 | $13.22 | $8.46 | 64.0% | $9.30 | $8.37 | $3.61 | 43.1% | $7.49 | $6.74 | $1.98 | 29.4% | $6.53 | $5.88 | $1.12 | 19.0% | Live scrape | — |
| 20x25x1 | 11 | FK20x25x1 | $5.42 | $33.33 | $30.00 | $24.58 | 81.9% | $17.22 | $15.50 | $10.08 | 65.0% | $9.57 | $8.61 | $3.19 | 37.0% | $9.47 | $8.52 | $3.10 | 36.4% | $9.21 | $8.29 | $2.87 | 34.6% | Live scrape | — |
| 20x25x1 | 13 | FK20x25x1 | $5.96 | $30.18 | $27.16 | $21.20 | 78.1% | $17.76 | $15.98 | $10.02 | 62.7% | $12.04 | $10.84 | $4.88 | 45.0% | $9.36 | $8.42 | $2.46 | 29.2% | $8.21 | $7.39 | $1.43 | 19.4% | Live scrape | — |
| 20x26x1 | 8 | FK20x26x1A | $4.95 | $40.50 | $36.45 | $31.50 | 86.4% | $26.08 | $23.47 | $18.52 | 78.9% | $17.32 | $15.59 | $10.64 | 68.2% | $15.74 | $14.17 | $9.22 | 65.1% | $15.16 | $13.64 | $8.69 | 63.7% | Live scrape | — |
| 20x30x1 | 8 | FK20x30x1 | $5.07 | $37.78 | $34.00 | $28.93 | 85.1% | $17.63 | $15.87 | $10.80 | 68.1% | $11.02 | $9.92 | $4.85 | 48.9% | $8.09 | $7.28 | $2.21 | 30.4% | $7.20 | $6.48 | $1.41 | 21.8% | Live scrape | — |
| 20x30x1 | 11 | FK20x30x1 | $5.90 | $39.99 | $35.99 | $30.09 | 83.6% | $20.55 | $18.50 | $12.60 | 68.1% | $10.63 | $9.57 | $3.67 | 38.3% | $9.96 | $8.96 | $3.06 | 34.2% | $9.43 | $8.49 | $2.59 | 30.5% | Live scrape | — |
| 20x30x1 | 13 | FK20x30x1 | $6.49 | $39.56 | $34.81 | $28.32 | 81.4% | $18.77 | $16.52 | $10.03 | 60.7% | $14.16 | $12.46 | $5.97 | 47.9% | $9.63 | $8.47 | $1.98 | 23.4% | $8.57 | $7.54 | $1.05 | 13.9% | Modeled | — |
| 20x36x1 | 8 | FK20x36x1 | $5.54 | $41.77 | $37.59 | $32.05 | 85.3% | $26.10 | $23.49 | $17.95 | 76.4% | $18.89 | $17.00 | $11.46 | 67.4% | $14.16 | $12.74 | $7.20 | 56.5% | $14.61 | $13.15 | $7.61 | 57.9% | Live scrape | — |
| 20x40x1 | 8 | FK20x40x1 | $5.88 | $43.57 | $39.21 | $33.33 | 85.0% | $31.46 | $28.31 | $22.43 | 79.2% | $17.72 | $15.95 | $10.07 | 63.1% | $16.88 | $15.19 | $9.31 | 61.3% | $12.74 | $11.47 | $5.59 | 48.7% | Live scrape | — |
| 20x40x1 | 11 | FK20x40x1 | $7.07 | $48.29 | $42.50 | $35.43 | 83.4% | $34.67 | $30.51 | $23.44 | 76.8% | $21.63 | $19.03 | $11.96 | 62.8% | $19.07 | $16.78 | $9.71 | 57.9% | $14.40 | $12.67 | $5.60 | 44.2% | Modeled | — |
| 20x40x1 | 13 | FK20x40x1 | $7.78 | $51.85 | $46.67 | $38.89 | 83.3% | $37.43 | $33.69 | $25.91 | 76.9% | $17.53 | $15.78 | $8.00 | 50.7% | $15.07 | $13.56 | $5.78 | 42.6% | $15.08 | $13.57 | $5.79 | 42.7% | Live scrape | — |
| 21.5x23.25x1 | 8 | FK21.5x23.25x1A | $5.17 | $34.44 | $31.00 | $25.83 | 83.3% | $19.59 | $17.63 | $12.46 | 70.7% | $13.71 | $12.34 | $7.17 | 58.1% | $11.07 | $9.96 | $4.79 | 48.1% | $10.50 | $9.45 | $4.28 | 45.3% | Live scrape | — |
| 21x21x1 | 8 | FK21x21x1 | $4.80 | $32.22 | $29.00 | $24.20 | 83.4% | $19.59 | $17.63 | $12.83 | 72.8% | $12.24 | $11.02 | $6.22 | 56.4% | $8.49 | $7.64 | $2.84 | 37.2% | $9.50 | $8.55 | $3.75 | 43.9% | Live scrape | FK21x21x1A |
| 21x21x1 | 11 | FK21x21x1A | $5.22 | $36.67 | $33.00 | $27.78 | 84.2% | $22.22 | $20.00 | $14.78 | 73.9% | $13.33 | $12.00 | $6.78 | 56.5% | $9.79 | $8.81 | $3.59 | 40.7% | $9.79 | $8.81 | $3.59 | 40.7% | Live scrape | — |
| 21x21x1 | 13 | FK21x21x1A | $5.74 | $38.82 | $34.94 | $29.20 | 83.6% | $23.78 | $21.40 | $15.66 | 73.2% | $17.07 | $15.36 | $9.62 | 62.6% | $14.18 | $12.76 | $7.02 | 55.0% | $9.96 | $8.96 | $3.22 | 35.9% | Live scrape | — |
| 21x23x1 | 8 | FK21x23x1A | $4.97 | $33.33 | $30.00 | $25.03 | 83.4% | $18.12 | $16.31 | $11.34 | 69.5% | $14.16 | $12.74 | $7.77 | 61.0% | $10.38 | $9.34 | $4.37 | 46.8% | $10.31 | $9.28 | $4.31 | 46.4% | Live scrape | — |
| 21x23x1 | 11 | FK21x23x1A | $5.40 | $34.15 | $30.74 | $25.34 | 82.4% | $21.33 | $19.20 | $13.80 | 71.9% | $18.59 | $16.73 | $11.33 | 67.7% | $16.53 | $14.88 | $9.48 | 63.7% | $15.60 | $14.04 | $8.64 | 61.5% | Live scrape | — |
| 21x23x1 | 13 | FK21x23x1A | $5.94 | $41.56 | $37.40 | $31.46 | 84.1% | $25.97 | $23.37 | $17.43 | 74.6% | $20.07 | $18.06 | $12.12 | 67.1% | $19.55 | $17.60 | $11.66 | 66.2% | $11.16 | $10.04 | $4.10 | 40.8% | Live scrape | — |
| 21x24x1 | 8 | FK21x24x1A | $4.86 | $31.62 | $28.46 | $23.60 | 82.9% | $20.01 | $18.01 | $13.15 | 73.0% | $11.68 | $10.51 | $5.65 | 53.8% | $11.32 | $10.19 | $5.33 | 52.3% | $10.91 | $9.82 | $4.96 | 50.5% | Live scrape | — |
| 22x22x1 | 8 | FK22x22x1 | $4.80 | $41.77 | $37.59 | $32.79 | 87.2% | $18.88 | $16.99 | $12.19 | 71.7% | $12.14 | $10.93 | $6.13 | 56.1% | $10.46 | $9.41 | $4.61 | 49.0% | $10.26 | $9.23 | $4.43 | 48.0% | Live scrape | FK22x22x1A |
| 22x24x1 | 8 | FK22x24x1 | $4.99 | $38.78 | $34.13 | $29.14 | 85.4% | $23.50 | $20.68 | $15.69 | 75.9% | $15.61 | $13.74 | $8.75 | 63.7% | $14.61 | $12.86 | $7.87 | 61.2% | $11.37 | $10.01 | $5.02 | 50.1% | Modeled | FK22x24x1A |
| 22x24x1 | 11 | FK22x24x1 | $5.44 | $42.99 | $37.83 | $32.39 | 85.6% | $25.90 | $22.79 | $17.35 | 76.1% | $19.06 | $16.77 | $11.33 | 67.6% | $16.51 | $14.53 | $9.09 | 62.6% | $12.85 | $11.31 | $5.87 | 51.9% | Modeled | FK22x24x1A |
| 22x24x1 | 13 | FK22x24x1 | $5.98 | $40.61 | $36.55 | $30.57 | 83.6% | $25.02 | $22.52 | $16.54 | 73.4% | $20.07 | $18.06 | $12.08 | 66.9% | $17.39 | $15.65 | $9.67 | 61.8% | $13.53 | $12.18 | $6.20 | 50.9% | Live scrape | FK22x24x1A |
| 23x23x1 | 8 | FK23x23x1A | $5.31 | $35.96 | $31.64 | $26.33 | 83.2% | $20.11 | $17.70 | $12.39 | 70.0% | $15.30 | $13.46 | $8.15 | 60.5% | $11.76 | $10.35 | $5.04 | 48.7% | $10.73 | $9.44 | $4.13 | 43.8% | Modeled | — |
| 24x24x1 | 8 | FK24x24x1 | $5.31 | $29.27 | $26.34 | $21.03 | 79.8% | $16.68 | $15.01 | $9.70 | 64.6% | $10.28 | $9.25 | $3.94 | 42.6% | $7.49 | $6.74 | $1.43 | 21.2% | $6.66 | $5.99 | $0.68 | 11.4% | Live scrape | — |
| 24x24x1 | 11 | FK24x24x1 | $6.16 | $33.69 | $30.32 | $24.16 | 79.7% | $23.54 | $21.19 | $15.03 | 70.9% | $10.63 | $9.57 | $3.41 | 35.6% | $11.01 | $9.91 | $3.75 | 37.8% | $9.22 | $8.30 | $2.14 | 25.8% | Live scrape | — |
| 24x24x1 | 13 | FK24x24x1 | $6.77 | $33.43 | $30.09 | $23.32 | 77.5% | $21.57 | $19.41 | $12.64 | 65.1% | $14.57 | $13.11 | $6.34 | 48.4% | $10.71 | $9.64 | $2.87 | 29.8% | $10.75 | $9.68 | $2.91 | 30.1% | Live scrape | — |
| 24x30x1 | 8 | FK24x30x1 | $5.49 | $35.55 | $32.00 | $26.51 | 82.8% | $19.59 | $17.63 | $12.14 | 68.9% | $11.80 | $10.62 | $5.13 | 48.3% | $9.66 | $8.69 | $3.20 | 36.8% | $9.50 | $8.55 | $3.06 | 35.8% | Live scrape | — |
| 24x30x1 | 11 | FK24x30x1 | $6.61 | $35.51 | $31.96 | $25.35 | 79.3% | $21.92 | $19.73 | $13.12 | 66.5% | $15.35 | $13.82 | $7.21 | 52.2% | $11.43 | $10.29 | $3.68 | 35.8% | $11.43 | $10.29 | $3.68 | 35.8% | Live scrape | — |
| 24x30x1 | 13 | FK24x30x1 | $7.27 | $37.61 | $33.85 | $26.58 | 78.5% | $23.49 | $21.14 | $13.87 | 65.6% | $17.70 | $15.93 | $8.66 | 54.4% | $14.05 | $12.65 | $5.38 | 42.5% | $13.98 | $12.58 | $5.31 | 42.2% | Live scrape | — |
| 24x36x1 | 8 | FK24x36x1 | $6.08 | $44.92 | $40.43 | $34.35 | 85.0% | $23.21 | $20.89 | $14.81 | 70.9% | $14.68 | $13.21 | $7.13 | 54.0% | $12.48 | $11.23 | $5.15 | 45.9% | $12.48 | $11.23 | $5.15 | 45.9% | Live scrape | FK24x36x1A |
| 24x36x1 | 11 | FK24x36x1 | $7.49 | $49.79 | $43.82 | $36.33 | 82.9% | $25.58 | $22.51 | $15.02 | 66.7% | $17.92 | $15.77 | $8.28 | 52.5% | $14.10 | $12.41 | $4.92 | 39.6% | $14.10 | $12.41 | $4.92 | 39.6% | Modeled | — |
| 24x36x1 | 13 | FK24x36x1 | $8.24 | $50.06 | $45.05 | $36.81 | 81.7% | $30.22 | $27.20 | $18.96 | 69.7% | $22.07 | $19.86 | $11.62 | 58.5% | $15.03 | $13.53 | $5.29 | 39.1% | $15.10 | $13.59 | $5.35 | 39.4% | Live scrape | — |
| 25x25x1 | 8 | FK25x25x1 | $5.19 | $36.67 | $33.00 | $27.81 | 84.3% | $19.59 | $17.63 | $12.44 | 70.6% | $11.75 | $10.58 | $5.39 | 50.9% | $7.49 | $6.74 | $1.55 | 23.0% | $7.65 | $6.89 | $1.70 | 24.7% | Live scrape | — |
| 25x30x1 | 8 | FK25x30x1 | $5.60 | $38.11 | $34.30 | $28.70 | 83.7% | $25.76 | $23.18 | $17.58 | 75.8% | $16.07 | $14.46 | $8.86 | 61.3% | $14.46 | $13.01 | $7.41 | 57.0% | $13.92 | $12.53 | $6.93 | 55.3% | Live scrape | — |
| 25x30x1 | 11 | FK25x30x1 | $6.75 | $42.24 | $37.17 | $30.42 | 81.8% | $28.39 | $24.98 | $18.23 | 73.0% | $19.61 | $17.26 | $10.51 | 60.9% | $16.34 | $14.38 | $7.63 | 53.1% | $15.73 | $13.84 | $7.09 | 51.2% | Modeled | — |
| 25x30x1 | 13 | FK25x30x1 | $7.43 | $39.90 | $35.11 | $27.68 | 78.8% | $27.43 | $24.14 | $16.71 | 69.2% | $20.66 | $18.18 | $10.75 | 59.1% | $17.21 | $15.14 | $7.71 | 50.9% | $16.56 | $14.57 | $7.14 | 49.0% | Modeled | — |
| 25x32x1 | 8 | FK25x32x1 | $5.80 | $54.44 | $49.00 | $43.20 | 88.2% | $24.56 | $22.10 | $16.30 | 73.8% | $13.91 | $12.52 | $6.72 | 53.7% | $11.96 | $10.76 | $4.96 | 46.1% | $12.33 | $11.10 | $5.30 | 47.7% | Live scrape | FK25x32x1A |
| 25x32x1 | 11 | FK25x32x1 | $7.11 | $60.34 | $53.10 | $45.99 | 86.6% | $27.07 | $23.82 | $16.71 | 70.2% | $16.98 | $14.94 | $7.83 | 52.4% | $13.51 | $11.89 | $4.78 | 40.2% | $13.93 | $12.26 | $5.15 | 42.0% | Modeled | — |
| 25x32x1 | 13 | FK25x32x1 | $7.82 | $57.00 | $50.16 | $42.34 | 84.4% | $26.15 | $23.01 | $15.19 | 66.0% | $17.88 | $15.73 | $7.91 | 50.3% | $14.23 | $12.52 | $4.70 | 37.5% | $14.67 | $12.91 | $5.09 | 39.4% | Modeled | — |
| 30x30x1 | 11 | FK30x30x1 | $7.96 | $58.89 | $53.00 | $45.04 | 85.0% | $37.22 | $33.50 | $25.54 | 76.2% | $25.57 | $23.01 | $15.05 | 65.4% | $16.53 | $14.88 | $6.92 | 46.5% | $16.89 | $15.20 | $7.24 | 47.6% | Live scrape | — |
| 30x30x1 | 13 | FK30x30x1 | $8.75 | $57.00 | $50.16 | $41.41 | 82.6% | $29.26 | $25.75 | $17.00 | 66.0% | $26.02 | $22.90 | $14.15 | 61.8% | $17.64 | $15.52 | $6.77 | 43.6% | $15.58 | $13.71 | $4.96 | 36.2% | Modeled | — |
| 4.5x11.5x1 | 8 | FK4.5x11.5x1A | $6.08 | $41.29 | $36.34 | $30.26 | 83.3% | $26.63 | $23.43 | $17.35 | 74.1% | $16.47 | $14.49 | $8.41 | 58.0% | $16.18 | $14.24 | $8.16 | 57.3% | $15.58 | $13.71 | $7.63 | 55.7% | Modeled | — |
| 4.5x11x1 | 8 | FK4.5x11x1A | $6.06 | $41.29 | $36.34 | $30.28 | 83.3% | $26.63 | $23.43 | $17.37 | 74.1% | $16.47 | $14.49 | $8.43 | 58.2% | $16.18 | $14.24 | $8.18 | 57.4% | $15.58 | $13.71 | $7.65 | 55.8% | Modeled | — |
| 4.5x12x1 | 8 | FK4.5x12x1A | $5.84 | $41.29 | $36.34 | $30.50 | 83.9% | $26.63 | $23.43 | $17.59 | 75.1% | $16.64 | $14.64 | $8.80 | 60.1% | $16.18 | $14.24 | $8.40 | 59.0% | $15.58 | $13.71 | $7.87 | 57.4% | Modeled | — |
| 4.5x13.5x1 | 8 | FK4.5x13.5x1A | $6.31 | $41.29 | $37.16 | $30.85 | 83.0% | $26.63 | $23.97 | $17.66 | 73.7% | $17.97 | $16.17 | $9.86 | 61.0% | $16.18 | $14.56 | $8.25 | 56.7% | $15.58 | $14.02 | $7.71 | 55.0% | Live scrape | — |
| 4.5x18x1 | 8 | FK4.5x18x1A | $5.84 | $41.29 | $37.16 | $31.32 | 84.3% | $26.63 | $23.97 | $18.13 | 75.6% | $17.97 | $16.17 | $10.33 | 63.9% | $16.18 | $14.56 | $8.72 | 59.9% | $15.58 | $14.02 | $8.18 | 58.3% | Live scrape | — |
| 4.5x19.5x1 | 8 | FK4.5x19.5x1A | $6.37 | $44.38 | $39.94 | $33.57 | 84.1% | $28.79 | $25.91 | $19.54 | 75.4% | $19.62 | $17.66 | $11.29 | 63.9% | $17.84 | $16.06 | $9.69 | 60.3% | $17.18 | $15.46 | $9.09 | 58.8% | Live scrape | — |
| 4.5x6x1 | 8 | FK4.5x6x1A | $6.06 | $41.29 | $37.16 | $31.10 | 83.7% | $26.63 | $23.97 | $17.91 | 74.7% | $14.98 | $13.48 | $7.42 | 55.0% | $16.18 | $14.56 | $8.50 | 58.4% | $15.58 | $14.02 | $7.96 | 56.8% | Live scrape | — |
| 4.5x8x1 | 8 | FK4.5x8x1A | $6.17 | $41.29 | $37.16 | $30.99 | 83.4% | $26.63 | $23.97 | $17.80 | 74.3% | $17.79 | $16.01 | $9.84 | 61.5% | $16.18 | $14.56 | $8.39 | 57.6% | $15.58 | $14.02 | $7.85 | 56.0% | Live scrape | — |
| 4.5x9.5x1 | 8 | FK4.5x9.5x1A | $6.00 | $41.29 | $37.16 | $31.16 | 83.9% | $26.63 | $23.97 | $17.97 | 75.0% | $17.97 | $16.17 | $10.17 | 62.9% | $16.18 | $14.56 | $8.56 | 58.8% | $15.58 | $14.02 | $8.02 | 57.2% | Live scrape | — |
| 4.5x9x1 | 8 | FK4.5x9x1A | $6.06 | $41.29 | $37.16 | $31.10 | 83.7% | $26.63 | $23.97 | $17.91 | 74.7% | $16.64 | $14.98 | $8.92 | 59.5% | $16.18 | $14.56 | $8.50 | 58.4% | $15.58 | $14.02 | $7.96 | 56.8% | Live scrape | — |
| 4x11.5x1 | 8 | FK4x11.5x1A | $6.08 | $41.29 | $37.16 | $31.08 | 83.6% | $26.63 | $23.97 | $17.89 | 74.6% | $16.64 | $14.98 | $8.90 | 59.4% | $16.18 | $14.56 | $8.48 | 58.2% | $15.58 | $14.02 | $7.94 | 56.6% | Live scrape | — |
| 4x11x1 | 8 | FK4x11x1A | $6.06 | $41.29 | $37.16 | $31.10 | 83.7% | $26.63 | $23.97 | $17.91 | 74.7% | $16.64 | $14.98 | $8.92 | 59.5% | $16.18 | $14.56 | $8.50 | 58.4% | $15.58 | $14.02 | $7.96 | 56.8% | Live scrape | — |
| 4x12x1 | 8 | FK4x12x1A | $5.84 | $41.05 | $36.12 | $30.28 | 83.8% | $26.47 | $23.29 | $17.45 | 74.9% | $16.47 | $14.49 | $8.65 | 59.7% | $16.05 | $14.12 | $8.28 | 58.6% | $15.45 | $13.60 | $7.76 | 57.1% | Modeled | — |
| 4x13.5x1 | 8 | FK4x13.5x1A | $6.31 | $41.29 | $37.16 | $30.85 | 83.0% | $26.63 | $23.97 | $17.66 | 73.7% | $16.64 | $14.98 | $8.67 | 57.9% | $16.18 | $14.56 | $8.25 | 56.7% | $15.58 | $14.02 | $7.71 | 55.0% | Live scrape | — |
| 4x18x1 | 8 | FK4x18x1A | $5.84 | $41.29 | $37.16 | $31.32 | 84.3% | $26.63 | $23.97 | $18.13 | 75.6% | $16.47 | $14.82 | $8.98 | 60.6% | $16.18 | $14.56 | $8.72 | 59.9% | $15.58 | $14.02 | $8.18 | 58.3% | Live scrape | — |
| 4x19.5x1 | 8 | FK4x19.5x1A | $6.37 | $41.29 | $37.16 | $30.79 | 82.9% | $26.63 | $23.97 | $17.60 | 73.4% | $16.64 | $14.98 | $8.61 | 57.5% | $16.18 | $14.56 | $8.19 | 56.2% | $15.58 | $14.02 | $7.65 | 54.6% | Live scrape | — |
| 4x24x1 | 8 | FK4x24x1A | $6.17 | $41.29 | $37.16 | $30.99 | 83.4% | $26.63 | $23.97 | $17.80 | 74.3% | $16.47 | $14.82 | $8.65 | 58.4% | $16.18 | $14.56 | $8.39 | 57.6% | $15.58 | $14.02 | $7.85 | 56.0% | Live scrape | — |
| 4x6x1 | 8 | FK4x6x1A | $6.06 | $38.30 | $34.47 | $28.41 | 82.4% | $24.54 | $22.09 | $16.03 | 72.6% | $14.83 | $13.35 | $7.29 | 54.6% | $14.56 | $13.10 | $7.04 | 53.7% | $14.02 | $12.62 | $6.56 | 52.0% | Live scrape | — |
| 4x8x1 | 8 | FK4x8x1A | $5.82 | $44.38 | $39.94 | $34.12 | 85.4% | $28.79 | $25.91 | $20.09 | 77.5% | $14.87 | $13.38 | $7.56 | 56.5% | $17.84 | $16.06 | $10.24 | 63.8% | $17.18 | $15.46 | $9.64 | 62.4% | Live scrape | — |
| 4x9.5x1 | 8 | FK4x9.5x1A | $6.00 | $41.29 | $37.16 | $31.16 | 83.9% | $26.63 | $23.97 | $17.97 | 75.0% | $16.47 | $14.82 | $8.82 | 59.5% | $16.18 | $14.56 | $8.56 | 58.8% | $15.58 | $14.02 | $8.02 | 57.2% | Live scrape | — |
| 4x9x1 | 8 | FK4x9x1A | $6.06 | $41.30 | $37.17 | $31.11 | 83.7% | $26.63 | $23.97 | $17.91 | 74.7% | $17.79 | $16.01 | $9.95 | 62.1% | $16.18 | $14.56 | $8.50 | 58.4% | $15.58 | $14.02 | $7.96 | 56.8% | Live scrape | — |
| 5.5x12x1 | 8 | FK5.5x12x1A | $5.84 | $41.29 | $37.16 | $31.32 | 84.3% | $26.63 | $23.97 | $18.13 | 75.6% | $16.64 | $14.98 | $9.14 | 61.0% | $16.18 | $14.56 | $8.72 | 59.9% | $15.58 | $14.02 | $8.18 | 58.3% | Live scrape | — |
| 5.5x13.5x1 | 8 | FK5.5x13.5x1A | $6.31 | $41.29 | $36.34 | $30.03 | 82.6% | $26.63 | $23.43 | $17.12 | 73.1% | $16.64 | $14.64 | $8.33 | 56.9% | $16.18 | $14.24 | $7.93 | 55.7% | $15.58 | $13.71 | $7.40 | 54.0% | Modeled | — |
| 5.5x18x1 | 8 | FK5.5x18x1A | $5.84 | $41.29 | $36.34 | $30.50 | 83.9% | $26.63 | $23.43 | $17.59 | 75.1% | $16.47 | $14.49 | $8.65 | 59.7% | $16.18 | $14.24 | $8.40 | 59.0% | $15.58 | $13.71 | $7.87 | 57.4% | Modeled | — |
| 5.5x19.5x1 | 8 | FK5.5x19.5x1A | $6.37 | $41.29 | $36.34 | $29.97 | 82.5% | $26.63 | $23.43 | $17.06 | 72.8% | $16.52 | $14.54 | $8.17 | 56.2% | $16.18 | $14.24 | $7.87 | 55.3% | $15.58 | $13.71 | $7.34 | 53.5% | Modeled | — |
| 5.5x6x1 | 8 | FK5.5x6x1A | $6.06 | $41.29 | $37.16 | $31.10 | 83.7% | $26.63 | $23.97 | $17.91 | 74.7% | $16.64 | $14.98 | $8.92 | 59.5% | $16.18 | $14.56 | $8.50 | 58.4% | $15.58 | $14.02 | $7.96 | 56.8% | Live scrape | — |
| 5.5x8x1 | 8 | FK5.5x8x1A | $6.17 | $41.05 | $36.12 | $29.95 | 82.9% | $26.47 | $23.29 | $17.12 | 73.5% | $16.64 | $14.64 | $8.47 | 57.9% | $16.05 | $14.12 | $7.95 | 56.3% | $15.45 | $13.60 | $7.43 | 54.6% | Modeled | — |
| 5x11.5x1 | 8 | FK5x11.5x1A | $6.08 | $41.05 | $36.12 | $30.04 | 83.2% | $26.47 | $23.29 | $17.21 | 73.9% | $16.51 | $14.53 | $8.45 | 58.2% | $16.05 | $14.12 | $8.04 | 56.9% | $15.45 | $13.60 | $7.52 | 55.3% | Modeled | — |
| 5x12x1 | 8 | FK5x12x1A | $5.84 | $41.05 | $36.12 | $30.28 | 83.8% | $26.47 | $23.29 | $17.45 | 74.9% | $16.47 | $14.49 | $8.65 | 59.7% | $16.05 | $14.12 | $8.28 | 58.6% | $15.45 | $13.60 | $7.76 | 57.1% | Modeled | — |
| 5x13.5x1 | 8 | FK5x13.5x1A | $6.31 | $41.05 | $36.12 | $29.81 | 82.5% | $26.47 | $23.29 | $16.98 | 72.9% | $16.47 | $14.49 | $8.18 | 56.5% | $16.05 | $14.12 | $7.81 | 55.3% | $15.45 | $13.60 | $7.29 | 53.6% | Modeled | — |
| 5x18x1 | 8 | FK5x18x1A | $5.84 | $41.29 | $37.16 | $31.32 | 84.3% | $26.63 | $23.97 | $18.13 | 75.6% | $16.64 | $14.98 | $9.14 | 61.0% | $16.18 | $14.56 | $8.72 | 59.9% | $15.58 | $14.02 | $8.18 | 58.3% | Live scrape | — |
| 5x19.5x1 | 8 | FK5x19.5x1A | $6.37 | $41.29 | $37.16 | $30.79 | 82.9% | $26.63 | $23.97 | $17.60 | 73.4% | $16.64 | $14.98 | $8.61 | 57.5% | $16.18 | $14.56 | $8.19 | 56.2% | $15.58 | $14.02 | $7.65 | 54.6% | Live scrape | — |
| 5x6x1 | 8 | FK5x6x1A | $6.06 | $41.29 | $37.16 | $31.10 | 83.7% | $26.63 | $23.97 | $17.91 | 74.7% | $16.64 | $14.98 | $8.92 | 59.5% | $16.18 | $14.56 | $8.50 | 58.4% | $15.58 | $14.02 | $7.96 | 56.8% | Live scrape | — |
| 5x8x1 | 8 | FK5x8x1A | $6.17 | $41.29 | $37.16 | $30.99 | 83.4% | $26.63 | $23.97 | $17.80 | 74.3% | $17.97 | $16.17 | $10.00 | 61.8% | $16.18 | $14.56 | $8.39 | 57.6% | $15.58 | $14.02 | $7.85 | 56.0% | Live scrape | — |
| 6.5x13.5x1 | 8 | FK6.5x13.5x1A | $6.31 | $44.29 | $39.86 | $33.55 | 84.2% | $28.74 | $25.87 | $19.56 | 75.6% | $16.32 | $14.69 | $8.38 | 57.0% | $17.80 | $16.02 | $9.71 | 60.6% | $17.14 | $15.43 | $9.12 | 59.1% | Live scrape | — |
| 6.5x8x1 | 8 | FK6.5x8x1A | $6.17 | $41.29 | $37.16 | $30.99 | 83.4% | $26.63 | $23.97 | $17.80 | 74.3% | $16.47 | $14.82 | $8.65 | 58.4% | $16.18 | $14.56 | $8.39 | 57.6% | $15.58 | $14.02 | $7.85 | 56.0% | Live scrape | — |
| 6x12x1 | 8 | FK6x12x1 | $6.08 | $31.16 | $28.04 | $21.96 | 78.3% | $20.54 | $18.49 | $12.41 | 67.1% | $12.60 | $11.34 | $5.26 | 46.4% | $10.70 | $9.63 | $3.55 | 36.9% | $10.30 | $9.27 | $3.19 | 34.4% | Live scrape | FK6x12x1A |
| 6x13.5x1 | 8 | FK6x13.5x1A | $6.31 | $41.29 | $36.34 | $30.03 | 82.6% | $26.63 | $23.43 | $17.12 | 73.1% | $16.47 | $14.49 | $8.18 | 56.5% | $16.18 | $14.24 | $7.93 | 55.7% | $15.58 | $13.71 | $7.40 | 54.0% | Modeled | — |
| 6x14x1 | 8 | FK6x14x1 | $6.31 | $41.29 | $36.34 | $30.03 | 82.6% | $26.63 | $23.43 | $17.12 | 73.1% | $16.52 | $14.54 | $8.23 | 56.6% | $16.18 | $14.24 | $7.93 | 55.7% | $15.58 | $13.71 | $7.40 | 54.0% | Modeled | FK6x14x1A |
| 6x18x1 | 8 | FK6x18x1A | $5.84 | $41.29 | $36.34 | $30.50 | 83.9% | $26.63 | $23.43 | $17.59 | 75.1% | $16.52 | $14.54 | $8.70 | 59.8% | $16.18 | $14.24 | $8.40 | 59.0% | $15.58 | $13.71 | $7.87 | 57.4% | Modeled | — |
| 6x6.5x1 | 8 | FK6x6.5x1A | $6.06 | $41.05 | $36.95 | $30.89 | 83.6% | $26.47 | $23.82 | $17.76 | 74.6% | $16.34 | $14.71 | $8.65 | 58.8% | $16.05 | $14.45 | $8.39 | 58.1% | $15.45 | $13.91 | $7.85 | 56.4% | Live scrape | — |
| 6x6x1 | 8 | FK6x6x1A | $6.06 | $53.98 | $48.58 | $42.52 | 87.5% | $42.36 | $38.12 | $32.06 | 84.1% | $22.69 | $20.42 | $14.36 | 70.3% | $20.63 | $18.57 | $12.51 | 67.4% | $19.86 | $17.87 | $11.81 | 66.1% | Live scrape | — |
| 6x7x1 | 8 | FK6x7x1A | $6.06 | $44.10 | $39.69 | $33.63 | 84.7% | $28.60 | $25.74 | $19.68 | 76.5% | $19.67 | $17.70 | $11.64 | 65.8% | $17.69 | $15.92 | $9.86 | 61.9% | $17.04 | $15.34 | $9.28 | 60.5% | Live scrape | — |
| 6x8x1 | 8 | FK6x8x1A | $6.17 | $41.05 | $36.12 | $29.95 | 82.9% | $26.47 | $23.29 | $17.12 | 73.5% | $16.47 | $14.49 | $8.32 | 57.4% | $16.05 | $14.12 | $7.95 | 56.3% | $15.45 | $13.60 | $7.43 | 54.6% | Modeled | — |
| 7.5x8x1 | 8 | FK7.5x8x1A | $6.17 | $44.10 | $39.69 | $33.52 | 84.5% | $28.60 | $25.74 | $19.57 | 76.0% | $19.48 | $17.53 | $11.36 | 64.8% | $17.69 | $15.92 | $9.75 | 61.2% | $17.04 | $15.34 | $9.17 | 59.8% | Live scrape | — |
| 7x8x1 | 8 | FK7x8x1A | $6.17 | $41.29 | $37.16 | $30.99 | 83.4% | $26.63 | $23.97 | $17.80 | 74.3% | $16.47 | $14.82 | $8.65 | 58.4% | $16.18 | $14.56 | $8.39 | 57.6% | $15.58 | $14.02 | $7.85 | 56.0% | Live scrape | — |
| 8x10.5x1 | 8 | FK8x10.5x1A | $6.17 | $41.05 | $36.95 | $30.78 | 83.3% | $26.47 | $23.82 | $17.65 | 74.1% | $17.83 | $16.05 | $9.88 | 61.6% | $16.05 | $14.45 | $8.28 | 57.3% | $15.45 | $13.91 | $7.74 | 55.6% | Live scrape | — |
| 8x10x1 | 8 | FK8x10x1A | $6.17 | $44.03 | $39.63 | $33.46 | 84.4% | $28.57 | $25.71 | $19.54 | 76.0% | $16.19 | $14.57 | $8.40 | 57.7% | $17.66 | $15.89 | $9.72 | 61.2% | $17.00 | $15.30 | $9.13 | 59.7% | Live scrape | — |
| 8x11.5x1 | 8 | FK8x11.5x1A | $6.17 | $41.05 | $36.95 | $30.78 | 83.3% | $26.47 | $23.82 | $17.65 | 74.1% | $16.34 | $14.71 | $8.54 | 58.1% | $16.05 | $14.45 | $8.28 | 57.3% | $15.45 | $13.91 | $7.74 | 55.6% | Live scrape | — |
| 8x11x1 | 8 | FK8x11x1A | $6.17 | $44.03 | $39.63 | $33.46 | 84.4% | $28.57 | $25.71 | $19.54 | 76.0% | $17.99 | $16.19 | $10.02 | 61.9% | $17.66 | $15.89 | $9.72 | 61.2% | $17.00 | $15.30 | $9.13 | 59.7% | Live scrape | — |
| 8x12x1 | 8 | FK8x12x1A | $6.17 | $30.22 | $27.20 | $21.03 | 77.3% | $19.83 | $17.85 | $11.68 | 65.4% | $11.21 | $10.09 | $3.92 | 38.9% | $10.20 | $9.18 | $3.01 | 32.8% | $9.82 | $8.84 | $2.67 | 30.2% | Live scrape | — |
| 8x14x1 | 8 | FK8x14x1A | $3.72 | $32.24 | $29.02 | $25.30 | 87.2% | $16.00 | $14.40 | $10.68 | 74.2% | $11.26 | $10.13 | $6.41 | 63.3% | $9.44 | $8.50 | $4.78 | 56.2% | $9.37 | $8.43 | $4.71 | 55.9% | Live scrape | — |
| 8x24x1 | 8 | FK8x24x1A | $3.09 | $29.24 | $26.32 | $23.23 | 88.3% | $18.27 | $16.44 | $13.35 | 81.2% | $12.34 | $11.11 | $8.02 | 72.2% | $10.32 | $9.29 | $6.20 | 66.7% | $10.31 | $9.28 | $6.19 | 66.7% | Live scrape | — |
| 8x24x1 | 11 | FK8x24x1A | $3.22 | $32.41 | $28.52 | $25.30 | 88.7% | $20.14 | $17.72 | $14.50 | 81.8% | $15.06 | $13.25 | $10.03 | 75.7% | $11.66 | $10.26 | $7.04 | 68.6% | $11.65 | $10.25 | $7.03 | 68.6% | Modeled | — |
| 8x24x1 | 13 | FK8x24x1A | $3.54 | $39.67 | $35.70 | $32.16 | 90.1% | $24.55 | $22.10 | $18.56 | 84.0% | $19.78 | $17.80 | $14.26 | 80.1% | $15.68 | $14.11 | $10.57 | 74.9% | $12.55 | $11.30 | $7.76 | 68.7% | Live scrape | — |
| 8x30x1 | 8 | FK8x30x1 | $3.76 | $32.38 | $29.14 | $25.38 | 87.1% | $17.14 | $15.43 | $11.67 | 75.6% | $14.45 | $13.01 | $9.25 | 71.1% | $11.80 | $10.62 | $6.86 | 64.6% | $11.10 | $9.99 | $6.23 | 62.4% | Live scrape | — |
| 8x7.5x1 | 8 | FK8x7.5x1A | $6.17 | $41.05 | $36.95 | $30.78 | 83.3% | $26.47 | $23.82 | $17.65 | 74.1% | $17.65 | $15.89 | $9.72 | 61.2% | $16.05 | $14.45 | $8.28 | 57.3% | $15.45 | $13.91 | $7.74 | 55.6% | Live scrape | — |
| 8x7x1 | 8 | FK8x7x1A | $6.17 | $41.06 | $36.13 | $29.96 | 82.9% | $26.63 | $23.43 | $17.26 | 73.7% | $16.35 | $14.39 | $8.22 | 57.1% | $16.06 | $14.13 | $7.96 | 56.3% | $15.45 | $13.60 | $7.43 | 54.6% | Modeled | — |
| 8x8.5x1 | 8 | FK8x8.5x1A | $6.17 | $41.05 | $36.95 | $30.78 | 83.3% | $26.47 | $23.82 | $17.65 | 74.1% | $16.51 | $14.86 | $8.69 | 58.5% | $16.05 | $14.45 | $8.28 | 57.3% | $15.45 | $13.91 | $7.74 | 55.6% | Live scrape | — |
| 8x8x1 | 8 | FK8x8x1A | $2.46 | $36.12 | $32.51 | $30.05 | 92.4% | $23.03 | $20.73 | $18.27 | 88.1% | $14.84 | $13.36 | $10.90 | 81.6% | $13.38 | $12.04 | $9.58 | 79.6% | $12.88 | $11.59 | $9.13 | 78.8% | Live scrape | — |
| 8x8x1 | 11 | FK8x8x1A | $3.60 | $39.33 | $35.40 | $31.80 | 89.8% | $25.26 | $22.73 | $19.13 | 84.2% | $16.79 | $15.11 | $11.51 | 76.2% | $15.12 | $13.61 | $10.01 | 73.5% | $14.56 | $13.10 | $9.50 | 72.5% | Live scrape | — |
| 8x8x1 | 13 | FK8x8x1A | $3.96 | $36.24 | $32.62 | $28.66 | 87.9% | $23.53 | $21.18 | $17.22 | 81.3% | $17.69 | $15.92 | $11.96 | 75.1% | $15.93 | $14.34 | $10.38 | 72.4% | $15.34 | $13.81 | $9.85 | 71.3% | Live scrape | — |
| 8x9.5x1 | 8 | FK8x9.5x1A | $6.17 | $41.05 | $36.95 | $30.78 | 83.3% | $26.47 | $23.82 | $17.65 | 74.1% | $17.65 | $15.89 | $9.72 | 61.2% | $16.05 | $14.45 | $8.28 | 57.3% | $15.45 | $13.91 | $7.74 | 55.6% | Live scrape | — |
| 8x9x1 | 8 | FK8x9x1A | $6.17 | $44.10 | $39.69 | $33.52 | 84.5% | $28.60 | $25.74 | $19.57 | 76.0% | $19.48 | $17.53 | $11.36 | 64.8% | $17.69 | $15.92 | $9.75 | 61.2% | $17.04 | $15.34 | $9.17 | 59.8% | Live scrape | — |
| 9x11.38x1 | 8 | FK9x11.38x1A | $3.05 | $34.25 | $30.83 | $27.78 | 90.1% | $21.71 | $19.54 | $16.49 | 84.4% | $13.62 | $12.26 | $9.21 | 75.1% | $12.38 | $11.14 | $8.09 | 72.6% | $11.91 | $10.72 | $7.67 | 71.5% | Live scrape | — |
| 9x11x1 | 8 | FK9x11x1A | $2.91 | $29.85 | $26.87 | $23.96 | 89.2% | $18.76 | $16.88 | $13.97 | 82.8% | $10.15 | $9.14 | $6.23 | 68.2% | $10.57 | $9.51 | $6.60 | 69.4% | $10.53 | $9.48 | $6.57 | 69.3% | Live scrape | — |
| 10x10x2 | 8 | FK10x10x2 | $3.64 | $31.92 | $28.73 | $25.09 | 87.3% | $14.09 | $12.68 | $9.04 | 71.3% | $11.89 | $10.70 | $7.06 | 66.0% | $9.68 | $8.71 | $5.07 | 58.2% | $8.41 | $7.57 | $3.93 | 51.9% | Live scrape | — |
| 10x10x2 | 11 | FK10x10x2 | $8.71 | $37.37 | $33.63 | $24.92 | 74.1% | $19.44 | $17.50 | $8.79 | 50.2% | $16.70 | $15.03 | $6.32 | 42.0% | $15.07 | $13.56 | $4.85 | 35.8% | $13.82 | $12.44 | $3.73 | 30.0% | Live scrape | — |
| 10x25x2 | 11 | FK10x25x2 | $7.81 | $37.65 | $33.13 | $25.32 | 76.4% | $18.35 | $16.15 | $8.34 | 51.6% | $14.94 | $13.15 | $5.34 | 40.6% | $13.05 | $11.48 | $3.67 | 32.0% | $12.36 | $10.88 | $3.07 | 28.2% | Modeled | — |
| 10x25x2 | 13 | FK10x25x2 | $8.59 | $35.57 | $31.30 | $22.71 | 72.6% | $17.73 | $15.60 | $7.01 | 44.9% | $15.73 | $13.84 | $5.25 | 37.9% | $13.75 | $12.10 | $3.51 | 29.0% | $13.02 | $11.46 | $2.87 | 25.0% | Modeled | — |
| 12x20x2 | 11 | FK12x20x2n | $8.84 | $37.37 | $33.63 | $24.79 | 73.7% | $20.77 | $18.69 | $9.85 | 52.7% | $16.98 | $15.28 | $6.44 | 42.1% | $13.51 | $12.16 | $3.32 | 27.3% | $13.06 | $11.75 | $2.91 | 24.8% | Live scrape | — |
| 12x20x2 | 13 | FK12x20x2n | $9.72 | $40.43 | $36.39 | $26.67 | 73.3% | $20.97 | $18.87 | $9.15 | 48.5% | $18.72 | $16.85 | $7.13 | 42.3% | $16.64 | $14.98 | $5.26 | 35.1% | $16.40 | $14.76 | $5.04 | 34.1% | Live scrape | — |
| 12x24x2 | 8 | FK12x24x2 | $4.97 | $33.97 | $30.57 | $25.60 | 83.7% | $20.06 | $18.05 | $13.08 | 72.5% | $11.22 | $10.10 | $5.13 | 50.8% | $9.44 | $8.50 | $3.53 | 41.5% | $8.35 | $7.52 | $2.55 | 33.9% | Live scrape | — |
| 12x24x2 | 11 | FK12x24x2n | $7.09 | $37.37 | $33.63 | $26.54 | 78.9% | $22.91 | $20.62 | $13.53 | 65.6% | $16.22 | $14.60 | $7.51 | 51.4% | $14.59 | $13.13 | $6.04 | 46.0% | $14.05 | $12.65 | $5.56 | 44.0% | Live scrape | — |
| 12x24x2 | 13 | FK12x24x2n | $7.80 | $40.43 | $36.39 | $28.59 | 78.6% | $22.54 | $20.29 | $12.49 | 61.6% | $15.64 | $14.08 | $6.28 | 44.6% | $14.08 | $12.67 | $4.87 | 38.4% | $13.55 | $12.20 | $4.40 | 36.1% | Live scrape | — |
| 12x30x2 | 11 | FK12x30x2 | $8.46 | $39.99 | $35.99 | $27.53 | 76.5% | $24.99 | $22.49 | $14.03 | 62.4% | $21.81 | $19.63 | $11.17 | 56.9% | $19.56 | $17.60 | $9.14 | 51.9% | $18.31 | $16.48 | $8.02 | 48.7% | Live scrape | — |
| 12x30x2 | 13 | FK12x30x2 | $9.31 | $41.56 | $37.40 | $28.09 | 75.1% | $25.97 | $23.37 | $14.06 | 60.2% | $23.34 | $21.01 | $11.70 | 55.7% | $21.05 | $18.95 | $9.64 | 50.9% | $19.99 | $17.99 | $8.68 | 48.2% | Live scrape | — |
| 14x20x2 | 8 | FK14x20x2 | $5.86 | $33.97 | $30.57 | $24.71 | 80.8% | $18.33 | $16.50 | $10.64 | 64.5% | $12.98 | $11.68 | $5.82 | 49.8% | $10.71 | $9.64 | $3.78 | 39.2% | $9.96 | $8.96 | $3.10 | 34.6% | Live scrape | — |
| 14x25x2 | 8 | FK14x25x2 | $4.70 | $33.97 | $30.57 | $25.87 | 84.6% | $17.77 | $15.99 | $11.29 | 70.6% | $12.48 | $11.23 | $6.53 | 58.1% | $9.89 | $8.90 | $4.20 | 47.2% | $9.07 | $8.16 | $3.46 | 42.4% | Live scrape | — |
| 14x30x2 | 11 | FK14x30x2 | $8.46 | $44.44 | $40.00 | $31.54 | 78.8% | $27.77 | $24.99 | $16.53 | 66.1% | $24.76 | $22.28 | $13.82 | 62.0% | $22.62 | $20.36 | $11.90 | 58.4% | $21.09 | $18.98 | $10.52 | 55.4% | Live scrape | — |
| 14x30x2 | 13 | FK14x30x2 | $9.31 | $46.27 | $41.64 | $32.33 | 77.6% | $28.80 | $25.92 | $16.61 | 64.1% | $25.86 | $23.27 | $13.96 | 60.0% | $23.50 | $21.15 | $11.84 | 56.0% | $22.42 | $20.18 | $10.87 | 53.9% | Live scrape | — |
| 15x30x2 | 11 | FK15x30x2 | $8.46 | $46.67 | $42.00 | $33.54 | 79.9% | $28.88 | $25.99 | $17.53 | 67.4% | $25.57 | $23.01 | $14.55 | 63.2% | $23.16 | $20.84 | $12.38 | 59.4% | $21.72 | $19.55 | $11.09 | 56.7% | Live scrape | — |
| 15x30x2 | 13 | FK15x30x2 | $9.31 | $47.23 | $42.51 | $33.20 | 78.1% | $29.74 | $26.77 | $17.46 | 65.2% | $26.55 | $23.90 | $14.59 | 61.0% | $24.26 | $21.83 | $12.52 | 57.4% | $22.97 | $20.67 | $11.36 | 55.0% | Live scrape | — |
| 16x16x2 | 8 | FK16x16x2 | $4.15 | $38.61 | $33.98 | $29.83 | 87.8% | $19.49 | $17.15 | $13.00 | 75.8% | $14.24 | $12.53 | $8.38 | 66.9% | $13.85 | $12.19 | $8.04 | 66.0% | $13.14 | $11.56 | $7.41 | 64.1% | Modeled | — |
| 16x20x2 | 8 | FK16x20x2 | $4.21 | $31.92 | $28.73 | $24.52 | 85.3% | $15.65 | $14.09 | $9.88 | 70.1% | $11.16 | $10.04 | $5.83 | 58.1% | $8.95 | $8.06 | $3.85 | 47.8% | $8.07 | $7.26 | $3.05 | 42.0% | Live scrape | — |
| 16x20x2 | 11 | FK16x20x2 | $5.06 | $37.37 | $33.63 | $28.57 | 85.0% | $19.44 | $17.50 | $12.44 | 71.1% | $15.35 | $13.82 | $8.76 | 63.4% | $12.92 | $11.63 | $6.57 | 56.5% | $12.11 | $10.90 | $5.84 | 53.6% | Live scrape | — |
| 16x20x2 | 13 | FK16x20x2 | $5.56 | $40.43 | $36.39 | $30.83 | 84.7% | $18.89 | $17.00 | $11.44 | 67.3% | $16.02 | $14.42 | $8.86 | 61.4% | $14.20 | $12.78 | $7.22 | 56.5% | $13.81 | $12.43 | $6.87 | 55.3% | Live scrape | — |
| 16x24x2 | 8 | FK16x24x2 | $5.41 | $33.97 | $30.57 | $25.16 | 82.3% | $16.65 | $14.99 | $9.58 | 63.9% | $12.75 | $11.48 | $6.07 | 52.9% | $11.01 | $9.91 | $4.50 | 45.4% | $9.45 | $8.51 | $3.10 | 36.4% | Live scrape | — |
| 16x25x2 | 8 | FK16x25x2 | $5.17 | $34.44 | $31.00 | $25.83 | 83.3% | $18.88 | $16.99 | $11.82 | 69.6% | $12.14 | $10.93 | $5.76 | 52.7% | $9.89 | $8.90 | $3.73 | 41.9% | $8.07 | $7.26 | $2.09 | 28.8% | Live scrape | — |
| 16x25x2 | 11 | FK16x25x2 | $6.26 | $39.99 | $35.99 | $29.73 | 82.6% | $22.22 | $20.00 | $13.74 | 68.7% | $15.67 | $14.10 | $7.84 | 55.6% | $13.37 | $12.03 | $5.77 | 48.0% | $11.66 | $10.49 | $4.23 | 40.3% | Live scrape | — |
| 16x25x2 | 13 | FK16x25x2 | $6.89 | $40.43 | $36.39 | $29.50 | 81.1% | $23.14 | $20.83 | $13.94 | 66.9% | $16.02 | $14.42 | $7.53 | 52.2% | $15.26 | $13.73 | $6.84 | 49.8% | $13.73 | $12.36 | $5.47 | 44.3% | Live scrape | — |
| 16x30x2 | 8 | FK16x30x2 | $6.00 | $39.68 | $35.71 | $29.71 | 83.2% | $24.02 | $21.62 | $15.62 | 72.2% | $19.59 | $17.63 | $11.63 | 66.0% | $14.64 | $13.18 | $7.18 | 54.5% | $14.07 | $12.66 | $6.66 | 52.6% | Live scrape | — |
| 18x18x2 | 8 | FK18x18x2 | $5.70 | $31.92 | $28.73 | $23.03 | 80.2% | $18.79 | $16.91 | $11.21 | 66.3% | $13.45 | $12.11 | $6.41 | 52.9% | $11.12 | $10.01 | $4.31 | 43.1% | $9.79 | $8.81 | $3.11 | 35.3% | Live scrape | — |
| 18x24x2 | 8 | FK18x24x2 | $5.35 | $31.92 | $28.73 | $23.38 | 81.4% | $17.74 | $15.97 | $10.62 | 66.5% | $13.91 | $12.52 | $7.17 | 57.3% | $10.82 | $9.74 | $4.39 | 45.1% | $8.83 | $7.95 | $2.60 | 32.7% | Live scrape | — |
| 20x20x2 | 8 | FK20x20x2 | $4.86 | $33.97 | $30.57 | $25.71 | 84.1% | $19.44 | $17.50 | $12.64 | 72.2% | $11.47 | $10.32 | $5.46 | 52.9% | $9.89 | $8.90 | $4.04 | 45.4% | $8.07 | $7.26 | $2.40 | 33.1% | Live scrape | — |
| 20x20x2 | 11 | FK20x20x2 | $5.96 | $37.37 | $33.63 | $27.67 | 82.3% | $21.10 | $18.99 | $13.03 | 68.6% | $13.60 | $12.24 | $6.28 | 51.3% | $11.47 | $10.32 | $4.36 | 42.2% | $11.21 | $10.09 | $4.13 | 40.9% | Live scrape | — |
| 20x20x2 | 13 | FK20x20x2 | $6.55 | $40.43 | $36.39 | $29.84 | 82.0% | $21.24 | $19.12 | $12.57 | 65.7% | $13.05 | $11.75 | $5.20 | 44.3% | $11.33 | $10.20 | $3.65 | 35.8% | $11.82 | $10.64 | $4.09 | 38.4% | Live scrape | — |
| 20x22x2 | 8 | FK20x22x2 | $5.05 | $34.44 | $31.00 | $25.95 | 83.7% | $21.10 | $18.99 | $13.94 | 73.4% | $15.82 | $14.24 | $9.19 | 64.5% | $12.96 | $11.66 | $6.61 | 56.7% | $12.84 | $11.56 | $6.51 | 56.3% | Live scrape | — |
| 20x24x2 | 8 | FK20x24x2 | $5.35 | $36.67 | $33.00 | $27.65 | 83.8% | $20.55 | $18.50 | $13.15 | 71.1% | $11.93 | $10.74 | $5.39 | 50.2% | $9.16 | $8.24 | $2.89 | 35.1% | $9.12 | $8.21 | $2.86 | 34.8% | Live scrape | — |
| 20x24x2 | 11 | FK20x24x2 | $8.08 | $41.10 | $36.99 | $28.91 | 78.2% | $22.22 | $20.00 | $11.92 | 59.6% | $17.23 | $15.51 | $7.43 | 47.9% | $14.54 | $13.09 | $5.01 | 38.3% | $13.37 | $12.03 | $3.95 | 32.8% | Live scrape | — |
| 20x24x2 | 13 | FK20x24x2 | $8.89 | $40.43 | $36.39 | $27.50 | 75.6% | $23.60 | $21.24 | $12.35 | 58.1% | $18.98 | $17.08 | $8.19 | 48.0% | $16.63 | $14.97 | $6.08 | 40.6% | $15.64 | $14.08 | $5.19 | 36.9% | Live scrape | — |
| 20x25x2 | 8 | FK20x25x2 | $5.58 | $33.97 | $30.57 | $24.99 | 81.7% | $16.65 | $14.99 | $9.41 | 62.8% | $12.24 | $11.02 | $5.44 | 49.4% | $9.89 | $8.90 | $3.32 | 37.3% | $9.16 | $8.24 | $2.66 | 32.3% | Live scrape | — |
| 20x25x2 | 11 | FK20x25x2 | $7.02 | $37.65 | $33.13 | $26.11 | 78.8% | $18.35 | $16.15 | $9.13 | 56.5% | $14.94 | $13.15 | $6.13 | 46.6% | $11.17 | $9.83 | $2.81 | 28.6% | $10.35 | $9.11 | $2.09 | 22.9% | Modeled | — |
| 20x25x2 | 13 | FK20x25x2 | $7.72 | $40.43 | $36.39 | $28.67 | 78.8% | $21.72 | $19.55 | $11.83 | 60.5% | $18.31 | $16.48 | $8.76 | 53.2% | $15.13 | $13.62 | $5.90 | 43.3% | $15.26 | $13.73 | $6.01 | 43.8% | Live scrape | — |
| 20x30x2 | 8 | FK20x30x2 | $5.92 | $44.44 | $40.00 | $34.08 | 85.2% | $24.99 | $22.49 | $16.57 | 73.7% | $17.50 | $15.75 | $9.83 | 62.4% | $14.58 | $13.12 | $7.20 | 54.9% | $12.83 | $11.55 | $5.63 | 48.7% | Live scrape | — |
| 20x30x2 | 11 | FK20x30x2 | $7.67 | $49.26 | $43.35 | $35.68 | 82.3% | $27.54 | $24.24 | $16.57 | 68.4% | $21.36 | $18.80 | $11.13 | 59.2% | $16.47 | $14.49 | $6.82 | 47.1% | $14.50 | $12.76 | $5.09 | 39.9% | Modeled | — |
| 20x30x2 | 13 | FK20x30x2 | $8.43 | $50.58 | $45.52 | $37.09 | 81.5% | $30.10 | $27.09 | $18.66 | 68.9% | $25.18 | $22.66 | $14.23 | 62.8% | $20.95 | $18.86 | $10.43 | 55.3% | $19.42 | $17.48 | $9.05 | 51.8% | Live scrape | — |
| 20x35x2 | 11 | FK20x35x2 | $8.84 | $57.20 | $51.48 | $42.64 | 82.8% | $36.58 | $32.92 | $24.08 | 73.1% | $32.27 | $29.04 | $20.20 | 69.6% | $29.05 | $26.15 | $17.31 | 66.2% | $27.97 | $25.17 | $16.33 | 64.9% | Live scrape | — |
| 20x35x2 | 13 | FK20x35x2 | $9.72 | $56.66 | $50.99 | $41.27 | 80.9% | $38.53 | $34.68 | $24.96 | 72.0% | $33.65 | $30.29 | $20.57 | 67.9% | $32.32 | $29.09 | $19.37 | 66.6% | $31.99 | $28.79 | $19.07 | 66.2% | Live scrape | — |
| 24x24x2 | 8 | FK24x24x2 | $5.86 | $37.24 | $33.52 | $27.66 | 82.5% | $21.64 | $19.48 | $13.62 | 69.9% | $14.62 | $13.16 | $7.30 | 55.5% | $11.11 | $10.00 | $4.14 | 41.4% | $10.24 | $9.22 | $3.36 | 36.4% | Live scrape | — |
| 24x24x2 | 11 | FK24x24x2 | $7.63 | $41.28 | $36.33 | $28.70 | 79.0% | $23.85 | $20.99 | $13.36 | 63.6% | $17.84 | $15.70 | $8.07 | 51.4% | $12.55 | $11.04 | $3.41 | 30.9% | $11.57 | $10.18 | $2.55 | 25.0% | Modeled | — |
| 24x24x2 | 13 | FK24x24x2 | $8.40 | $47.23 | $42.51 | $34.11 | 80.2% | $27.39 | $24.65 | $16.25 | 65.9% | $23.79 | $21.41 | $13.01 | 60.8% | $19.69 | $17.72 | $9.32 | 52.6% | $18.69 | $16.82 | $8.42 | 50.1% | Live scrape | — |
| 25x25x2 | 8 | FK25x25x2 | $6.27 | $41.01 | $36.91 | $30.64 | 83.0% | $26.44 | $23.80 | $17.53 | 73.7% | $17.39 | $15.65 | $9.38 | 59.9% | $14.49 | $13.04 | $6.77 | 51.9% | $13.54 | $12.19 | $5.92 | 48.6% | Live scrape | — |
| 30x30x2 | 11 | FK30x30x2 | $8.21 | $40.51 | $35.65 | $27.44 | 77.0% | $25.89 | $22.78 | $14.57 | 64.0% | $23.39 | $20.58 | $12.37 | 60.1% | $19.59 | $17.24 | $9.03 | 52.4% | $17.40 | $15.31 | $7.10 | 46.4% | Modeled | — |
| 30x30x2 | 13 | FK30x30x2 | $9.03 | $38.27 | $33.68 | $24.65 | 73.2% | $25.01 | $22.01 | $12.98 | 59.0% | $24.63 | $21.67 | $12.64 | 58.3% | $20.64 | $18.16 | $9.13 | 50.3% | $18.32 | $16.12 | $7.09 | 44.0% | Modeled | — |
| 6.88x15.88x2 | 11 | FK6.88x15.88x2a | $8.71 | $35.38 | $31.13 | $22.42 | 72.0% | $21.87 | $19.25 | $10.54 | 54.8% | $19.72 | $17.35 | $8.64 | 49.8% | $16.59 | $14.60 | $5.89 | 40.3% | $12.70 | $11.18 | $2.47 | 22.1% | Modeled | — |
| 6.88x15.88x2 | 13 | FK6.88x15.88x2a | $9.58 | $33.42 | $29.41 | $19.83 | 67.4% | $21.13 | $18.59 | $9.01 | 48.5% | $20.77 | $18.28 | $8.70 | 47.6% | $17.47 | $15.37 | $5.79 | 37.7% | $13.37 | $11.77 | $2.19 | 18.6% | Modeled | — |
| 8x16x2 | 11 | FK8x16x2 | $6.73 | $35.38 | $31.13 | $24.40 | 78.4% | $21.87 | $19.25 | $12.52 | 65.0% | $19.72 | $17.35 | $10.62 | 61.2% | $15.47 | $13.61 | $6.88 | 50.6% | $12.29 | $10.82 | $4.09 | 37.8% | Modeled | — |
| 8x16x2 | 13 | FK8x16x2 | $7.41 | $33.42 | $29.41 | $22.00 | 74.8% | $21.13 | $18.59 | $11.18 | 60.1% | $20.77 | $18.28 | $10.87 | 59.5% | $16.29 | $14.34 | $6.93 | 48.3% | $12.95 | $11.40 | $3.99 | 35.0% | Modeled | — |
| 8x30x2 | 11 | FK8x30x2 | $8.17 | $37.65 | $33.13 | $24.96 | 75.3% | $22.65 | $19.93 | $11.76 | 59.0% | $21.14 | $18.60 | $10.43 | 56.1% | $17.65 | $15.53 | $7.36 | 47.4% | $16.01 | $14.09 | $5.92 | 42.0% | Modeled | — |
| 8x30x2 | 13 | FK8x30x2 | $8.99 | $35.57 | $31.30 | $22.31 | 71.3% | $21.88 | $19.25 | $10.26 | 53.3% | $22.26 | $19.59 | $10.60 | 54.1% | $18.59 | $16.36 | $7.37 | 45.0% | $16.86 | $14.84 | $5.85 | 39.4% | Modeled | — |
| 9.75x23.75x2 | 11 | FK9.75x23.75x2a | $8.15 | $37.65 | $33.13 | $24.98 | 75.4% | $23.26 | $20.47 | $12.32 | 60.2% | $19.72 | $17.35 | $9.20 | 53.0% | $16.34 | $14.38 | $6.23 | 43.3% | $16.22 | $14.27 | $6.12 | 42.9% | Modeled | — |
| 9.75x23.75x2 | 13 | FK9.75x23.75x2a | $8.97 | $35.57 | $31.30 | $22.33 | 71.3% | $22.47 | $19.77 | $10.80 | 54.6% | $20.77 | $18.28 | $9.31 | 50.9% | $17.21 | $15.14 | $6.17 | 40.8% | $17.08 | $15.03 | $6.06 | 40.3% | Modeled | — |
| 10x20x4 | 11 | FK10x20x4 | $8.87 | $43.99 | $38.71 | $29.84 | 77.1% | $26.32 | $23.16 | $14.29 | 61.7% | $25.30 | $22.26 | $13.39 | 60.2% | $20.89 | $18.38 | $9.51 | 51.7% | $19.27 | $16.96 | $8.09 | 47.7% | Modeled | — |
| 16x20x4 | 8 | FK16x20x4 | $5.96 | $48.89 | $44.00 | $38.04 | 86.5% | $24.02 | $21.62 | $15.66 | 72.4% | $18.89 | $17.00 | $11.04 | 64.9% | $15.60 | $14.04 | $8.08 | 57.5% | $14.28 | $12.85 | $6.89 | 53.6% | Live scrape | — |
| 16x20x4 | 11 | FK16x20x4 | $7.78 | $49.99 | $44.99 | $37.21 | 82.7% | $31.10 | $27.99 | $20.21 | 72.2% | $24.24 | $21.82 | $14.04 | 64.3% | $22.62 | $20.36 | $12.58 | 61.8% | $21.36 | $19.22 | $11.44 | 59.5% | Live scrape | — |
| 16x20x4 | 13 | FK16x20x4 | $8.55 | $46.27 | $41.64 | $33.09 | 79.5% | $27.39 | $24.65 | $16.10 | 65.3% | $21.73 | $19.56 | $11.01 | 56.3% | $20.13 | $18.12 | $9.57 | 52.8% | $20.06 | $18.05 | $9.50 | 52.6% | Live scrape | — |
| 16x24x4 | 8 | FK16x24x4 | $6.29 | $53.33 | $48.00 | $41.71 | 86.9% | $24.49 | $22.04 | $15.75 | 71.5% | $20.83 | $18.75 | $12.46 | 66.5% | $21.01 | $18.91 | $12.62 | 66.7% | $19.66 | $17.69 | $11.40 | 64.4% | Live scrape | — |
| 16x25x4 | 11 | FK16x25x4 | $8.98 | $43.66 | $39.29 | $30.31 | 77.1% | $25.55 | $23.00 | $14.02 | 61.0% | $20.46 | $18.41 | $9.43 | 51.2% | $18.85 | $16.97 | $7.99 | 47.1% | $18.76 | $16.88 | $7.90 | 46.8% | Live scrape | — |
| 16x25x4 | 13 | FK16x25x4 | $9.88 | $47.23 | $42.51 | $32.63 | 76.8% | $27.06 | $24.35 | $14.47 | 59.4% | $22.90 | $20.61 | $10.73 | 52.1% | $18.20 | $16.38 | $6.50 | 39.7% | $20.44 | $18.40 | $8.52 | 46.3% | Live scrape | — |
| 20x20x4 | 11 | FK20x20x4 | $8.96 | $44.44 | $40.00 | $31.04 | 77.6% | $30.55 | $27.50 | $18.54 | 67.4% | $21.54 | $19.39 | $10.43 | 53.8% | $17.95 | $16.16 | $7.20 | 44.6% | $17.95 | $16.16 | $7.20 | 44.6% | Live scrape | — |
| 20x20x4 | 13 | FK20x20x4 | $9.86 | $43.33 | $39.00 | $29.14 | 74.7% | $28.33 | $25.50 | $15.64 | 61.3% | $22.88 | $20.59 | $10.73 | 52.1% | $22.58 | $20.32 | $10.46 | 51.5% | $20.67 | $18.60 | $8.74 | 47.0% | Live scrape | — |
| 20x24x4 | 8 | FK20x24x4 | $6.00 | $38.64 | $34.78 | $28.78 | 82.7% | $24.49 | $22.04 | $16.04 | 72.8% | $20.08 | $18.07 | $12.07 | 66.8% | $18.21 | $16.39 | $10.39 | 63.4% | $16.79 | $15.11 | $9.11 | 60.3% | Live scrape | — |
| 8x16x4 | 11 | FK8x16x4 | $8.23 | $43.99 | $38.71 | $30.48 | 78.7% | $25.71 | $22.62 | $14.39 | 63.6% | $24.33 | $21.41 | $13.18 | 61.6% | $20.08 | $17.67 | $9.44 | 53.4% | $18.45 | $16.24 | $8.01 | 49.3% | Modeled | — |
| 8x16x4 | 13 | FK8x16x4 | $9.05 | $41.56 | $36.57 | $27.52 | 75.3% | $24.84 | $21.86 | $12.81 | 58.6% | $25.62 | $22.55 | $13.50 | 59.9% | $21.15 | $18.61 | $9.56 | 51.4% | $19.43 | $17.10 | $8.05 | 47.1% | Modeled | — |
| 16x25x5 | 8 | FK16x25x5 | $18.50 | $39.69 | $35.72 | $17.22 | 48.2% | $34.24 | $30.82 | $12.32 | 40.0% | $26.63 | $23.97 | $5.47 | 22.8% | $26.63 | $23.97 | $5.47 | 22.8% | $26.63 | $23.97 | $5.47 | 22.8% | Live scrape | — |
| 16x25x5 | 11 | FK16x25x5 | $19.00 | $47.63 | $42.87 | $23.87 | 55.7% | $28.34 | $25.51 | $6.51 | 25.5% | $34.25 | $30.83 | $11.83 | 38.4% | $34.25 | $30.83 | $11.83 | 38.4% | $34.25 | $30.83 | $11.83 | 38.4% | Live scrape | — |
| 16x25x5 | 13 | FK16x25x5 | $19.50 | $43.33 | $39.00 | $19.50 | 50.0% | $37.15 | $33.44 | $13.94 | 41.7% | $34.54 | $31.09 | $11.59 | 37.3% | $34.54 | $31.09 | $11.59 | 37.3% | $34.54 | $31.09 | $11.59 | 37.3% | Live scrape | — |
| 20x25x5 | 8 | FK20x25x5 | $18.50 | $39.69 | $35.72 | $17.22 | 48.2% | $23.61 | $21.25 | $2.75 | 12.9% | $23.14 | $20.83 | $2.33 | 11.2% | $26.07 | $23.46 | $4.96 | 21.1% | $26.07 | $23.46 | $4.96 | 21.1% | Live scrape | — |
| 20x25x5 | 11 | FK20x25x5 | $19.00 | $47.63 | $42.87 | $23.87 | 55.7% | $38.09 | $34.28 | $15.28 | 44.6% | $28.62 | $25.76 | $6.76 | 26.2% | $28.62 | $25.76 | $6.76 | 26.2% | $28.62 | $25.76 | $6.76 | 26.2% | Live scrape | — |
| 20x25x5 | 13 | FK20x25x5 | $19.50 | $43.33 | $39.00 | $19.50 | 50.0% | $45.37 | $40.83 | $21.33 | 52.2% | $30.35 | $27.32 | $7.82 | 28.6% | $30.35 | $27.32 | $7.82 | 28.6% | $30.35 | $27.32 | $7.82 | 28.6% | Live scrape | — |

---

### Complete wholesale sheet transcription

Every line item from the PDF, grouped the way the sheet is grouped. Prices are per filter.

#### MERV 8 (173 line items)

| SKU as printed | Normalized size | Suffix | Cost |
| --- | --- | --- | --- |
| FK10x10x1 | 10x10x1 | — | $2.81 |
| FK10x10x2 | 10x10x2 | — | $3.64 |
| FK10x30x1N | 10x30x1 | N | $3.87 |
| FK10x36x1 | 10x36x1 | — | $4.07 |
| FK12.5x24.25x1A | 12.5x24.25x1 | A | $3.74 |
| FK12x12x1 | 12x12x1 | — | $2.95 |
| FK12x18x1A | 12x18x1 | A | $2.50 |
| FK12x20x1 | 12x20x1 | — | $3.48 |
| FK12x24x1 | 12x24x1 | — | $3.74 |
| FK12x24x2 | 12x24x2 | — | $4.97 |
| FK12x36x0.5 | 12x36x0.5 | — | $3.93 |
| FK12x36x1 | 12x36x1 | — | $4.50 |
| FK13x13x1 | 13x13x1 | — | $4.01 |
| FK13x21.5x1A | 13x21.5x1 | A | $4.03 |
| FK13x21x1A | 13x21x1 | A | $3.70 |
| FK14x14x1 | 14x14x1 | — | $3.36 |
| FK14x18x1 | 14x18x1 | — | $3.62 |
| FK14x20x1 | 14x20x1 | — | $3.74 |
| FK14x20x2 | 14x20x2 | — | $5.86 |
| FK14x22x1 | 14x22x1 | — | $3.91 |
| FK14x24x1 | 14x24x1 | — | $3.91 |
| FK14x25x1 | 14x25x1 | — | $4.33 |
| FK14x25x2 | 14x25x2 | — | $4.70 |
| FK14x30x1 | 14x30x1 | — | $4.78 |
| FK15x15x1A | 15x15x1 | A | $3.68 |
| FK15x20x1 | 15x20x1 | — | $3.91 |
| FK15x24x1 | 15x24x1 | — | $3.95 |
| FK16x16x1 | 16x16x1 | — | $3.62 |
| FK16x16x2 | 16x16x2 | — | $4.15 |
| FK16x19x1 | 16x19x1 | — | $3.83 |
| FK16x20x1 | 16x20x1 | — | $3.76 |
| FK16x20x2 | 16x20x2 | — | $4.21 |
| FK16x20x4 | 16x20x4 | — | $5.96 |
| FK16x21x1A | 16x21x1 | A | $3.99 |
| FK16x22x1A | 16x22x1 | A | $4.38 |
| FK16x24x1 | 16x24x1 | — | $4.19 |
| FK16x24x2 | 16x24x2 | — | $5.41 |
| FK16x24x4 | 16x24x4 | — | $6.29 |
| FK16x25x1 | 16x25x1 | — | $4.21 |
| FK16x25x2 | 16x25x2 | — | $5.17 |
| FK16x30x1 | 16x30x1 | — | $4.54 |
| FK16x30x2 | 16x30x2 | — | $6.00 |
| FK17.5x21x1A | 17.5x21x1 | A | $4.84 |
| FK17.5x22x1A | 17.5x22x1 | A | $4.64 |
| FK17x17x1A | 17x17x1 | A | $3.97 |
| FK17x20x1 | 17x20x1 | — | $4.03 |
| FK17x21x1A | 17x21x1 | A | $4.07 |
| FK17x22x1 | 17x22x1 | — | $4.11 |
| FK18x18x1 | 18x18x1 | — | $3.89 |
| FK18x18x2 | 18x18x2 | — | $5.70 |
| FK18x20x1 | 18x20x1 | — | $4.09 |
| FK18x22x1 | 18x22x1 | — | $4.09 |
| FK18x24x1 | 18x24x1 | — | $4.38 |
| FK18x24x2 | 18x24x2 | — | $5.35 |
| FK18x25x1 | 18x25x1 | — | $4.03 |
| FK18x30x1 | 18x30x1 | — | $5.03 |
| FK18x36x1 | 18x36x1 | — | $5.49 |
| FK19.25x23.25x1A | 19.25x23.25x1 | A | $4.56 |
| FK19.5x21x1A | 19.5x21x1 | A | $4.64 |
| FK19.75x21.5x1A | 19.75x21.5x1 | A | $4.54 |
| FK19.88x21.5x1A | 19.88x21.5x1 | A | $4.60 |
| FK19x19x1A | 19x19x1 | A | $4.40 |
| FK19x20x1A | 19x20x1 | A | $4.46 |
| FK19x21x1 | 19x21x1 | — | $4.33 |
| FK19x22x1A | 19x22x1 | A | $4.38 |
| FK19x23x1A | 19x23x1 | A | $4.60 |
| FK19x25x1 | 19x25x1 | — | $4.97 |
| FK19x26x1 | 19x26x1 | — | $5.35 |
| FK19x27x1A | 19x27x1 | A | $4.92 |
| FK20x20x1 | 20x20x1 | — | $4.38 |
| FK20x20x2 | 20x20x2 | — | $4.86 |
| FK20x21x1A | 20x21x1 | A | $4.82 |
| FK20x22x1 | 20x22x1 | — | $4.52 |
| FK20x22x2 | 20x22x2 | — | $5.05 |
| FK20x23x1 | 20x23x1 | — | $4.76 |
| FK20x23x1A | 20x23x1 | A | $4.38 |
| FK20x24x1 | 20x24x1 | — | $4.70 |
| FK20x24x2 | 20x24x2 | — | $5.35 |
| FK20x24x4 | 20x24x4 | — | $6.00 |
| FK20x25x1 | 20x25x1 | — | $4.76 |
| FK20x25x2 | 20x25x2 | — | $5.58 |
| FK20x26x1A | 20x26x1 | A | $4.95 |
| FK20x30x1 | 20x30x1 | — | $5.07 |
| FK20x30x2 | 20x30x2 | — | $5.92 |
| FK20x36x1 | 20x36x1 | — | $5.54 |
| FK20x40x1 | 20x40x1 | — | $5.88 |
| FK21.5x23.25x1A | 21.5x23.25x1 | A | $5.17 |
| FK21x21x1 | 21x21x1 | — | $4.80 |
| FK21x21x1A | 21x21x1 | A | $4.84 |
| FK21x23x1A | 21x23x1 | A | $4.97 |
| FK21x24x1A | 21x24x1 | A | $4.86 |
| FK22x22x1 | 22x22x1 | — | $4.80 |
| FK22x22x1A | 22x22x1 | A | $4.92 |
| FK22x24x1 | 22x24x1 | — | $4.99 |
| FK22x24x1A | 22x24x1 | A | $4.99 |
| FK23x23x1A | 23x23x1 | A | $5.31 |
| FK24x24x1 | 24x24x1 | — | $5.31 |
| FK24x24x2 | 24x24x2 | — | $5.86 |
| FK24x30x0.5 | 24x30x0.5 | — | $5.35 |
| FK24x30x1 | 24x30x1 | — | $5.49 |
| FK24x36x1 | 24x36x1 | — | $6.08 |
| FK24x36x1A | 24x36x1 | A | $6.19 |
| FK25x25x1 | 25x25x1 | — | $5.19 |
| FK25x25x2 | 25x25x2 | — | $6.27 |
| FK25x30x1 | 25x30x1 | — | $5.60 |
| FK25x32x1 | 25x32x1 | — | $5.80 |
| FK25x32x1A | 25x32x1 | A | $5.84 |
| FK4.5x11.5x1A | 4.5x11.5x1 | A | $6.08 |
| FK4.5x11x1A | 4.5x11x1 | A | $6.06 |
| FK4.5x12x1A | 4.5x12x1 | A | $5.84 |
| FK4.5x13.5x1A | 4.5x13.5x1 | A | $6.31 |
| FK4.5x18x1A | 4.5x18x1 | A | $5.84 |
| FK4.5x19.5x1A | 4.5x19.5x1 | A | $6.37 |
| FK4.5x6x1A | 4.5x6x1 | A | $6.06 |
| FK4.5x8x1A | 4.5x8x1 | A | $6.17 |
| FK4.5x9.5x1A | 4.5x9.5x1 | A | $6.00 |
| FK4.5x9x1A | 4.5x9x1 | A | $6.06 |
| FK4x11.5x1A | 4x11.5x1 | A | $6.08 |
| FK4x11x1A | 4x11x1 | A | $6.06 |
| FK4x12x1A | 4x12x1 | A | $5.84 |
| FK4x13.5x1A | 4x13.5x1 | A | $6.31 |
| FK4x18x1A | 4x18x1 | A | $5.84 |
| FK4x19.5x1A | 4x19.5x1 | A | $6.37 |
| FK4x24x1A | 4x24x1 | A | $6.17 |
| FK4x6x1A | 4x6x1 | A | $6.06 |
| FK4x8x1A | 4x8x1 | A | $5.82 |
| FK4x9.5x1A | 4x9.5x1 | A | $6.00 |
| FK4x9x1A | 4x9x1 | A | $6.06 |
| FK5.5x12x1A | 5.5x12x1 | A | $5.84 |
| FK5.5x13.5x1A | 5.5x13.5x1 | A | $6.31 |
| FK5.5x18x1A | 5.5x18x1 | A | $5.84 |
| FK5.5x19.5x1A | 5.5x19.5x1 | A | $6.37 |
| FK5.5x6x1A | 5.5x6x1 | A | $6.06 |
| FK5.5x8x1A | 5.5x8x1 | A | $6.17 |
| FK5x11.5x1A | 5x11.5x1 | A | $6.08 |
| FK5x12x1A | 5x12x1 | A | $5.84 |
| FK5x13.5x1A | 5x13.5x1 | A | $6.31 |
| FK5x18x1A | 5x18x1 | A | $5.84 |
| FK5x19.5x1A | 5x19.5x1 | A | $6.37 |
| FK5x6x1A | 5x6x1 | A | $6.06 |
| FK5x8x1A | 5x8x1 | A | $6.17 |
| FK6.5x13.5x1A | 6.5x13.5x1 | A | $6.31 |
| FK6.5x8x1A | 6.5x8x1 | A | $6.17 |
| FK6x12x1 | 6x12x1 | — | $6.08 |
| FK6x12x1A | 6x12x1 | A | $5.84 |
| FK6x13.5x1A | 6x13.5x1 | A | $6.31 |
| FK6x14x1 | 6x14x1 | — | $6.31 |
| FK6x14x1A | 6x14x1 | A | $2.89 |
| FK6x18x1A | 6x18x1 | A | $5.84 |
| FK6x6.5x1A | 6x6.5x1 | A | $6.06 |
| FK6x6x1A | 6x6x1 | A | $6.06 |
| FK6x7x1A | 6x7x1 | A | $6.06 |
| FK6x8x1A | 6x8x1 | A | $6.17 |
| FK7.5x8x1A | 7.5x8x1 | A | $6.17 |
| FK7x8x1A | 7x8x1 | A | $6.17 |
| FK8x10.5x1A | 8x10.5x1 | A | $6.17 |
| FK8x10x1A | 8x10x1 | A | $6.17 |
| FK8x11.5x1A | 8x11.5x1 | A | $6.17 |
| FK8x11x1A | 8x11x1 | A | $6.17 |
| FK8x12x1A | 8x12x1 | A | $6.17 |
| FK8x14x1A | 8x14x1 | A | $3.72 |
| FK8x24x1A | 8x24x1 | A | $3.09 |
| FK8x30x1 | 8x30x1 | — | $3.76 |
| FK8x7.5x1A | 8x7.5x1 | A | $6.17 |
| FK8x7x1A | 8x7x1 | A | $6.17 |
| FK8x8.5x1A | 8x8.5x1 | A | $6.17 |
| FK8x8x1A | 8x8x1 | A | $2.46 |
| FK8x9.5x1A | 8x9.5x1 | A | $6.17 |
| FK8x9x1A | 8x9x1 | A | $6.17 |
| FK9x11.38x1A | 9x11.38x1 | A | $3.05 |
| FK9x11x1A | 9x11x1 | A | $2.91 |
| FK16x25x5 | 16x25x5 | — | $18.50 |
| FK20x25x5 | 20x25x5 | — | $18.50 |

#### MERV 11 (71 line items)

| SKU as printed | Normalized size | Suffix | Cost |
| --- | --- | --- | --- |
| FK10x10x2 | 10x10x2 | — | $8.71 |
| FK10x20x4 | 10x20x4 | — | $8.87 |
| FK10x25x2 | 10x25x2 | — | $7.81 |
| FK10x36x1 | 10x36x1 | — | $4.41 |
| FK12x12x1 | 12x12x1 | — | $2.88 |
| FK12x15x0.5 | 12x15x0.5 | — | $6.48 |
| FK12x20x2n | 12x20x2 | N | $8.84 |
| FK12x24x1 | 12x24x1 | — | $4.01 |
| FK12x24x1N | 12x24x1 | N | $4.01 |
| FK12x24x2n | 12x24x2 | N | $7.09 |
| FK12x30x2 | 12x30x2 | — | $8.46 |
| FK12x36x0.5 | 12x36x0.5 | — | $4.63 |
| FK14x14x1 | 14x14x1 | — | $3.22 |
| FK14x20x1 | 14x20x1 | — | $3.92 |
| FK14x24x1 | 14x24x1 | — | $4.27 |
| FK14x30x1 | 14x30x1 | — | $5.20 |
| FK14x30x2 | 14x30x2 | — | $8.46 |
| FK15x30x2 | 15x30x2 | — | $8.46 |
| FK16x16x1 | 16x16x1 | — | $3.80 |
| FK16x19x1 | 16x19x1 | — | $4.28 |
| FK16x20x1 | 16x20x1 | — | $4.09 |
| FK16x20x2 | 16x20x2 | — | $5.06 |
| FK16x20x4 | 16x20x4 | — | $7.78 |
| FK16x25x1 | 16x25x1 | — | $4.68 |
| FK16x25x2 | 16x25x2 | — | $6.26 |
| FK16x25x4 | 16x25x4 | — | $8.98 |
| FK17.5x22x1A | 17.5x22x1 | A | $4.99 |
| FK17x21x1A | 17x21x1 | A | $4.43 |
| FK18x18x1 | 18x18x1 | — | $4.19 |
| FK18x20x1 | 18x20x1 | — | $4.43 |
| FK18x24x1 | 18x24x1 | — | $4.86 |
| FK18x30x1 | 18x30x1 | — | $5.67 |
| FK18x36x1 | 18x36x1 | — | $6.23 |
| FK18x36x1A | 18x36x1 | A | $6.23 |
| FK19x19x1A | 19x19x1 | A | $4.68 |
| FK19x22x1A | 19x22x1 | A | $4.75 |
| FK19x23x1A | 19x23x1 | A | $5.00 |
| FK20x20x1 | 20x20x1 | — | $4.82 |
| FK20x20x2 | 20x20x2 | — | $5.96 |
| FK20x20x4 | 20x20x4 | — | $8.96 |
| FK20x21x1A | 20x21x1 | A | $5.20 |
| FK20x23x1A | 20x23x1 | A | $4.73 |
| FK20x24x1 | 20x24x1 | — | $5.35 |
| FK20x24x2 | 20x24x2 | — | $8.08 |
| FK20x25x1 | 20x25x1 | — | $5.42 |
| FK20x25x2 | 20x25x2 | — | $7.02 |
| FK20x30x1 | 20x30x1 | — | $5.90 |
| FK20x30x2 | 20x30x2 | — | $7.67 |
| FK20x35x2 | 20x35x2 | — | $8.84 |
| FK20x40x1 | 20x40x1 | — | $7.07 |
| FK21x21x1A | 21x21x1 | A | $5.22 |
| FK21x23x1A | 21x23x1 | A | $5.40 |
| FK22x24x1 | 22x24x1 | — | $5.44 |
| FK22x24x1A | 22x24x1 | A | $5.69 |
| FK24x24x1 | 24x24x1 | — | $6.16 |
| FK24x24x2 | 24x24x2 | — | $7.63 |
| FK24x30x1 | 24x30x1 | — | $6.61 |
| FK24x36x1 | 24x36x1 | — | $7.49 |
| FK25x30x1 | 25x30x1 | — | $6.75 |
| FK25x32x1 | 25x32x1 | — | $7.11 |
| FK30x30x1 | 30x30x1 | — | $7.96 |
| FK30x30x2 | 30x30x2 | — | $8.21 |
| FK6.88x15.88x2a | 6.88x15.88x2 | A | $8.71 |
| FK8x16x2 | 8x16x2 | — | $6.73 |
| FK8x16x4 | 8x16x4 | — | $8.23 |
| FK8x24x1A | 8x24x1 | A | $3.22 |
| FK8x30x2 | 8x30x2 | — | $8.17 |
| FK8x8x1A | 8x8x1 | A | $3.60 |
| FK9.75x23.75x2a | 9.75x23.75x2 | A | $8.15 |
| FK16x25x5 | 16x25x5 | — | $19.00 |
| FK20x25x5 | 20x25x5 | — | $19.00 |

#### MERV 13 (69 line items)

| SKU as printed | Normalized size | Suffix | Cost |
| --- | --- | --- | --- |
| FK10x25x2 | 10x25x2 | — | $8.59 |
| FK10x36x1 | 10x36x1 | — | $4.85 |
| FK12x12x1 | 12x12x1 | — | $3.17 |
| FK12x15x0.5 | 12x15x0.5 | — | $7.13 |
| FK12x20x2n | 12x20x2 | N | $9.72 |
| FK12x24x1 | 12x24x1 | — | $4.42 |
| FK12x24x1N | 12x24x1 | N | $4.42 |
| FK12x24x2n | 12x24x2 | N | $7.80 |
| FK12x30x2 | 12x30x2 | — | $9.31 |
| FK12x36x0.5 | 12x36x0.5 | — | $5.09 |
| FK14x14x1 | 14x14x1 | — | $3.54 |
| FK14x20x1 | 14x20x1 | — | $4.32 |
| FK14x24x1 | 14x24x1 | — | $4.69 |
| FK14x30x1 | 14x30x1 | — | $5.72 |
| FK14x30x2 | 14x30x2 | — | $9.31 |
| FK15x30x2 | 15x30x2 | — | $9.31 |
| FK16x16x1 | 16x16x1 | — | $4.18 |
| FK16x19x1 | 16x19x1 | — | $4.71 |
| FK16x20x1 | 16x20x1 | — | $4.49 |
| FK16x20x2 | 16x20x2 | — | $5.56 |
| FK16x20x4 | 16x20x4 | — | $8.55 |
| FK16x25x1 | 16x25x1 | — | $5.15 |
| FK16x25x2 | 16x25x2 | — | $6.89 |
| FK16x25x4 | 16x25x4 | — | $9.88 |
| FK17.5x22x1A | 17.5x22x1 | A | $5.48 |
| FK17x21x1A | 17x21x1 | A | $4.87 |
| FK18x18x1 | 18x18x1 | — | $4.61 |
| FK18x20x1 | 18x20x1 | — | $4.87 |
| FK18x24x1 | 18x24x1 | — | $5.35 |
| FK18x30x1 | 18x30x1 | — | $6.24 |
| FK18x36x1 | 18x36x1 | — | $6.85 |
| FK18x36x1A | 18x36x1 | A | $6.85 |
| FK19x19x1A | 19x19x1 | A | $5.15 |
| FK19x22x1A | 19x22x1 | A | $5.23 |
| FK19x23x1A | 19x23x1 | A | $5.50 |
| FK20x20x1 | 20x20x1 | — | $5.31 |
| FK20x20x2 | 20x20x2 | — | $6.55 |
| FK20x20x4 | 20x20x4 | — | $9.86 |
| FK20x21x1A | 20x21x1 | A | $5.72 |
| FK20x23x1A | 20x23x1 | A | $5.21 |
| FK20x24x1 | 20x24x1 | — | $5.88 |
| FK20x24x2 | 20x24x2 | — | $8.89 |
| FK20x25x1 | 20x25x1 | — | $5.96 |
| FK20x25x2 | 20x25x2 | — | $7.72 |
| FK20x30x1 | 20x30x1 | — | $6.49 |
| FK20x30x2 | 20x30x2 | — | $8.43 |
| FK20x35x2 | 20x35x2 | — | $9.72 |
| FK20x40x1 | 20x40x1 | — | $7.78 |
| FK21x21x1A | 21x21x1 | A | $5.74 |
| FK21x23x1A | 21x23x1 | A | $5.94 |
| FK22x24x1 | 22x24x1 | — | $5.98 |
| FK22x24x1A | 22x24x1 | A | $6.26 |
| FK24x24x1 | 24x24x1 | — | $6.77 |
| FK24x24x2 | 24x24x2 | — | $8.40 |
| FK24x30x1 | 24x30x1 | — | $7.27 |
| FK24x36x1 | 24x36x1 | — | $8.24 |
| FK25x30x1 | 25x30x1 | — | $7.43 |
| FK25x32x1 | 25x32x1 | — | $7.82 |
| FK30x30x1 | 30x30x1 | — | $8.75 |
| FK30x30x2 | 30x30x2 | — | $9.03 |
| FK6.88x15.88x2a | 6.88x15.88x2 | A | $9.58 |
| FK8x16x2 | 8x16x2 | — | $7.41 |
| FK8x16x4 | 8x16x4 | — | $9.05 |
| FK8x24x1A | 8x24x1 | A | $3.54 |
| FK8x30x2 | 8x30x2 | — | $8.99 |
| FK8x8x1A | 8x8x1 | A | $3.96 |
| FK9.75x23.75x2a | 9.75x23.75x2 | A | $8.97 |
| FK16x25x5 | 16x25x5 | — | $19.50 |
| FK20x25x5 | 20x25x5 | — | $19.50 |

#### Page 4 of the PDF (no prices)

Filter King LLC  
7301 NW 36th Ct, Miami FL 33147  
Paul Sellaro  
305-300-2431  
paul@filterking.com  

“Our dedicated team will quote any carbon filter size you need in just a minute!”

Page 5 is blank besides the 2025 label.

---

### Pricing engine notes (how Hero gets to the sell price)

- `UNDERCUT_RATIO` = 0.9 (live Filter King sale unit × 0.90)
- `ESTIMATED_UNDERCUT_RATIO` = 0.88 (modeled ladder × 0.88, extra cushion)
- Qty breaks used: 1, 2, 4, 6+, 12+ (`q1`, `q2`, `q4`, `q6`, `q12`)
- Live ladders prefer a scraped row over an estimated row when both exist
- Files: `shared/pricing/engine.ts`, `shared/pricing/fk-live-prices.json`, `shared/products.ts` (`unitPriceForQty`)
- Catalog-wide live file (2026-08-20): 19337 scraped ladders + 20555 estimated = 39892 size × MERV rows. This wholesale sheet only covers 299 of those.
- Fallback pack multipliers in `PACK_TIERS` apply only if no live ladder exists.

### What this document does not contain

- Shipping, freight, tax, payment processing, returns, or payment terms from Paul
- Carbon filter costs (quote-only)
- Any 2026 updated dealer sheet (this PDF is 2025)
- Filter King’s subscribe-and-save extra 5% (Hero does not use that ladder)

Working files used to build Part 3: `.firecrawl/fk-wholesale-2025.txt`, `.firecrawl/compare_wholesale.py`, `.firecrawl/fk-wholesale-vs-hero.json`, `.firecrawl/write_wholesale_doc.py`.

