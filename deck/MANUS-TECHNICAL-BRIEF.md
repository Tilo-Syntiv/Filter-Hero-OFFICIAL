# Filter Hero — Technical Source Brief for Manus

**Purpose:** Raw project data only. Use this to build any deliverable (video, deck, one-pager) yourself. Do not invent numbers. Do not invent competitors, prices, or features not listed here.

**Date of facts:** September 2026  
**Live site:** https://filterhero.net  
**Contact:** info@filterhero.net

---

## 1. Entity and ask

| Field | Value |
|---|---|
| Product brand | Filter Hero |
| Live URL | https://filterhero.net |
| Ask amount | $60,000 |
| Instrument | Zero-interest loan, principal only |
| Related company (owner-operated) | Freezing Point AC (South Florida HVAC service) |
| Freezing Point AC financials | Do not disclose / not provided |
| Operator | Solo. Marketing, AI, automation, website, software all built and run by the owner |
| Paid ads | None. Organic only |
| Agency / contractor / employee spend | $0 |
| Fixed overhead | ~$300/month (AI tooling only) |
| Annual fixed overhead | $3,600 |

---

## 2. Business model

| Field | Value |
|---|---|
| Product | HVAC air filters (pleated, private-label Filter Hero) |
| Fulfillment | Dropship via Filter King (Filter King LLC, Miami) |
| Inventory owned | None |
| Warehouse | None |
| Employees | None |
| Lease | None |
| Delivery promise (shopper copy) | 2–3 day delivery, contiguous US |
| Free-shipping promise | Forbidden — do not say free shipping |
| 30-day guarantee | Forbidden — do not say it |
| Checkout | Stripe Hosted Checkout only |
| Tax | QuickBooks / Stripe books path; do not invent freight amounts |

---

## 3. Catalog and pricing architecture

Three layers (do not mix):

| Layer | Source | Role |
|---|---|---|
| Sellable SKUs + wholesale cost | Model Pricing XLS / `shared/pricing/model-pricing.csv` | Add-to-cart + cost |
| Full size archive + Filter King links | Filter King API + `shared/filter-catalog.json` | Finder, SEO, quote routing |
| Shopper retail price | `shared/pricing/engine.ts` (Filtrete / FK / FilterBuy logic) | PDP, cart, Checkout, Klaviyo |

### Sellable catalog (checkout allowlist)

| Metric | Value |
|---|---:|
| Sellable SKUs | 293 |
| Unique sizes | 153 |
| MERV 8 SKUs | 153 |
| MERV 11 SKUs | 64 |
| MERV 13 SKUs | 67 |
| Carbon SKUs | 9 |
| Full finder archive sizes | 9,958 |
| HVAC brands in finder | 38 |
| OEM model codes | 166 |
| Stripe products synced | 293 |

Depth mix (sellable): 1″ 204 · 2″ 49 · 4″ 23 · 5″ 13 · 0.5″ 4

Wholesale cost range (`Sale Price` column): $2.50–$24.72 · avg ~$6.67

Off-sheet sizes → custom quote, not Stripe.

### Shopper retail (1″ qty 1 — Filtrete anchors)

| Rating | Retail |
|---|---:|
| MERV 8 | $9.99 |
| MERV 11 | $13.49 |
| MERV 13 | $22.99 |
| Carbon (odor) | $16.70 |

### Pricing rule (engine)

`liveUnitPrice` / `liveListPrice` in `shared/pricing/engine.ts`:

- Match the **cheaper** of Filtrete and Filter King at list when both exist
- Then match a confirmed FilterBuy ticket if that ticket is cheaper
- Non-Filtrete ladders can use Filter King × 0.90 (or × 0.88 if estimated)
- Do not invent pack prices

**Pitch-safe framing:** priced at the market floor (whoever is cheapest on that size/rating); then delivered in 2–3 days. Do not invent freight cost. Do not say free shipping.

### Flagship unit economics (20×25×1)

| MERV | Wholesale | Retail | Gross margin |
|---|---:|---:|---:|
| 8 | $4.82 | $9.99 | 51.8% |
| 11 | $6.05 | $13.49 | 55.2% |
| 13 | $6.20 | $22.99 | 73.0% |

| Metric | Value |
|---|---|
| Avg gross margin (199 costed 1″ SKUs) | 58.5% |
| Contribution margin used in projections | **53%** (after fulfillment + payment fees) |

---

## 4. Problem framing (repair cost comparison)

Source logic: `shared/hvac-overdue-costs.ts` / storefront overdue panels.

| Item | Cost |
|---|---|
| Replacement filter | $9.99 |
| Coil cleaning after neglect | $150–$400 |
| Blower motor failure | $450–$1,200 |
| Compressor replacement | $1,800–$3,000+ |

Context: South Florida systems often run ~11 months/year. Filters typically replace every 30–90 days.

---

## 5. Freezing Point AC house list (verified)

Source: cleaned `FILTER HERO CONTACT LIST.csv` (from Freezing Point AC export).  
Raw platform export: 10,459 records. **Use 8,497** as the working number.

| Metric | Count |
|---|---:|
| Total contacts | 8,497 |
| With email | 8,497 (100%) |
| Unique emails | 7,380 |
| With phone | 8,496 |
| With street address | 8,497 (100%) |
| Florida | 8,472 (99.7%) |
| Notifications enabled | 8,490 |
| Do-not-service | 0 |
| Customer type | homeowner (all) |

### Top cities

| City | Contacts |
|---|---:|
| Miami | 3,157 |
| Fort Lauderdale | 735 |
| Hollywood | 625 |
| Homestead | 509 |
| Pembroke Pines | 272 |
| Hialeah | 219 |
| Miami Beach | 211 |
| Miramar | 193 |
| Cutler Bay | 130 |
| Plantation | 128 |
| North Miami Beach | 128 |
| Pompano Beach | 125 |
| Miami Gardens | 124 |
| Coral Gables | 123 |
| Sunrise | 111 |
| Davie | 106 |
| Boca Raton | 105 |

Service footprint for B2B network: Boca Raton → Florida City, east and west coasts of South Florida. Building managers / maintenance supervisors already contact Freezing Point AC for repairs; same contacts can route filter volume.

### Commercial illustration (one building)

| Line | Value |
|---|---|
| Units | 80 |
| Changes/year | 4 |
| Filters/year | 320 |
| Blended bulk ticket | ~$11.25 |
| Annual revenue / building | ~$3,600 |
| Typical multi-property relationship | ~$7,000–$10,000/year |

---

## 6. What is live in production

### Shopper features

- Size finder (archive 9,958 sizes)
- Size / MERV / pack PDP + cart
- Stripe Hosted Checkout (US shipping + phone)
- Shopper accounts (saved filters, order history, reorder)
- Filter Clock (cadence tool; reminder intent → staff only, not marketing subscribe)
- Custom / off-catalog quote form
- 38 brand pages + OEM mapping
- Overdue repair-cost persuasion panels
- SEO: sitemap, robots, JSON-LD, llms.txt

### Staff

- Admin CRM quote board: stages `new` → `needs_info` → `priced` → `waiting` → `won` / `lost`
- Contacts, companies, deals, notes/tasks
- Orders log, catalog admin, content, settings
- Staff auth: Supabase magic link + OTP, `STAFF_EMAILS`

### Integrations (live)

| System | Role |
|---|---|
| Stripe | Live acct `acct_1U9bqlQEENEs0Qmw` — Checkout + webhooks |
| Klaviyo | Account `VnVNmQ`, list `RiTKiS` — marketing only |
| Resend | Transactional from `Filter Hero <info@filterhero.net>` via `send.filterhero.net` |
| Supabase | Auth + CRM Postgres; service-role Express only; RLS deny-by-default |
| Railway | One Express process, volume `/data` |
| QuickBooks / Intuit | Books / OAuth path |
| Cloudflare Turnstile | Contact forms (fail-closed in prod) |
| Filter King API | Catalog sync / fulfillment partner |

### Stack

React 19 · Vite 7 · Tailwind 4 · Express 4 · TypeScript · pnpm · single production process

### Email channel law (do not violate in copy)

| Message | Owner |
|---|---|
| Payment receipt | Stripe |
| Order confirmation / quote receipt / staff lead alert | Resend |
| Welcome / abandon / replenish / campaigns | Klaviyo |
| CRM notes / stage changes | None — CRM does not email |

---

## 7. Loan structure

### Use of funds ($60,000)

| Allocation | Amount |
|---|---:|
| Direct mail to house list (3 drops; postcard with home’s filter size) | $18,000 |
| Working capital (net-30 commercial float) | $15,000 |
| Organic amplification + email scaling | $9,000 |
| B2B seeding kits (50 properties) | $7,500 |
| Business setup (insurance, entity, accounting, processor reserve) | $5,500 |
| Repayment reserve (covers monthly floor during ramp) | $5,000 |
| **Total** | **$60,000** |

### Tranches

| Tranche | Amount | Gate |
|---|---:|---|
| 1 | $20,000 | Signing |
| 2 | $20,000 | 100 paid orders + 3 signed commercial accounts |
| 3 | $20,000 | 300 cumulative paid orders + 8 commercial accounts + one profitable month |

If tranche 1 fails milestones, tranches 2–3 do not release. Worst-case exposure = $20,000 drawn.

### Repayment

| Term | Value |
|---|---|
| Interest | None |
| Monthly payment | Greater of $750 or 50% of monthly net profit |
| First payment | Month 1 (reserve backs floor during ramp) |
| Ends | When cumulative payments = amount actually drawn |
| Reporting | Monthly from Stripe + QuickBooks |

---

## 8. Scenario model (locked assumptions)

| Input | Value |
|---|---|
| House list | 8,497 |
| AOV | $68 |
| Contribution margin | 53% |
| Overhead | $300/month |
| Ramp | 6 months linear to steady state |
| Repayment rule | max($750, 50% of monthly net) |

### 12-month outcomes

| | Worst | Base | Best |
|---|---:|---:|---:|
| List conversion | 2% → 170 | 5% → 425 | 10% → 850 |
| Orders / customer / year | 2 | 3 | 3.5 |
| Residential revenue | $23,120 | $86,700 | $202,300 |
| B2B accounts | 3 @ $4,800 | 10 @ $7,200 | 25 @ $9,600 |
| B2B revenue | $14,400 | $72,000 | $240,000 |
| Organic revenue | $9,000 | $28,000 | $70,000 |
| **Total revenue** | **$46,520** | **$186,700** | **$512,300** |
| Contribution @ 53% | $24,656 | $98,951 | $271,519 |
| Net profit (less $3,600 OH) | $21,056 | $95,351 | $267,919 |
| Amount drawn | **$20,000** | $60,000 | $60,000 |
| Full repayment | **Month 24** | **Month 19** | **Month 9** |

---

## 9. Honest risk (required if discussing downside)

Marketing spend is not liquidatable like inventory. If mail + commercial outreach both fail, ~$27,000 of planned outreach spend has no salvage value.

Containments:

1. Tranche gating (most spend behind milestones)
2. $300/month fixed cost structure
3. Freezing Point AC continues as independent income backing the $750 floor

---

## 10. Brand tokens (optional for visual work)

| Token | Hex |
|---|---|
| Navy | `#203868` |
| Burgundy | `#7F2328` |
| Ice | `#8EB0D8` |
| Mesh | `#3A66A3` |
| Deep text | `#141E30` |
| Canvas | `#F6F7F9` |

Fonts in use on site: Plus Jakarta Sans (headings), Manrope (body).  
Logo: `https://filterhero.net/logo.png` (navy/burgundy wordmark — needs light plate on dark backgrounds).

### Local media paths (repo)

| Asset | Path |
|---|---|
| Logo | `client/public/logo.png` |
| MERV 11 pack | `client/public/hero/pack-merv11.png` |
| MERV 8/11/13 packshots | `client/public/products/merv-*-packshot.png` |
| Clogged filter | `client/public/life/filter-clogged.jpg` |
| Tech / install | `client/public/life/filter-tech.jpg` |
| Shipping warehouse | `client/public/life/shipping-warehouse.png` |

Pack shots are Filter Hero branded. Do not put a Filter King wordmark on the stack.

---

## 11. Existing artifacts in this repo (reference only)

| File | What it is |
|---|---|
| `deck/filter-hero-investor-deck.html` | 10-slide carousel (local) |
| `deck/Filter-Hero-Investor-Deck.pdf` | 10-page 16:9 PDF |
| `deck/INVESTOR-SUMMARY.md` | Long-form assumptions + derivations |
| `deck/GAMMA-PROMPT.md` | Paste-in for Gamma (not required for Manus) |

---

## 12. Hard constraints for any Manus output

1. Do not invent SKUs, prices, margins, list sizes, or scenario figures.
2. Do not disclose Freezing Point AC revenue or financials.
3. Do not promise free shipping or a 30-day guarantee.
4. Do not say delivery is “2-day” only — say **2–3 day**.
5. Do not describe freight cost unless given a settled amount (currently unset).
6. Stripe automatic delivery (Checkout `mode: subscription`, 30/60/90 days, 10% off) is built — do not claim a property-manager portal (not built).
7. Do not claim CRM sends email.
8. Capital funds demand / outreach — not building the storefront (already live).
9. Recommended explainer video length for full coverage: **~3 minutes** (not a requirement; decide yourself).

---

## 13. Source file map (audit)

| Claim | Source |
|---|---|
| 8,497 list quality | `E:\FILTER HEROE\IMPORTANT PAPERS\FILTER HERO CONTACT LIST.csv` |
| Raw 10,459 export | `E:\FILTER HEROE\IMPORTANT PAPERS\FreezingPointAC_customer_export\` |
| Retail engine | `shared/pricing/engine.ts` |
| Wholesale | `shared/pricing/model-pricing.csv` |
| Sellable SKUs | `shared/sellable-skus.json` |
| Size archive | `shared/filter-catalog.json` |
| Brands | `shared/hvac-brands.json` |
| Repair costs | `shared/hvac-overdue-costs.ts` |
| Identity / ops law | `.cursor/rules/identity.mdc`, `catalog.mdc`, `shopper-copy.mdc`, `stripe-klaviyo-email.mdc` |
