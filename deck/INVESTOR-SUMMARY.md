# Filter Hero — Investor Summary

**Request:** $60,000 · zero interest · principal only
**Company:** Filter Hero — https://filterhero.net
**Model:** Direct-to-consumer and commercial HVAC air filters, dropship fulfilled
**Date:** September 2026

---

## Executive summary

Filter Hero is a finished, live e-commerce business selling HVAC air filters. The storefront is built, the payment rail is live, the catalog is priced, and the fulfillment partner is contracted. Nothing in this request pays for construction.

What makes it unusual is that the customer list already exists. I own Freezing Point AC, a South Florida air conditioning service company, and its customer database holds **8,497 homeowners** — every one of them with a verified email address and street address, 99.7% of them in Florida, and all of them people who have already paid me for work inside their homes.

Air filters are the single most predictable consumable in that customer's life. They are replaced every 30 to 90 days, forever, and the same technician who services the system is the person who tells them which filter to buy. I am already in the house.

The $60,000 converts that existing relationship into a recurring product business. It funds outreach, not overhead.

**Capital is released in three $20,000 tranches gated on performance milestones, so the downside case never draws the full amount.**

---

## Why this is a low-risk loan

| Structural fact | Consequence for the lender |
|---|---|
| Dropship fulfillment — no inventory purchased | No capital is trapped in unsold stock |
| No warehouse, no lease | No fixed facility obligation |
| No employees | No payroll that must be met before repayment |
| Fixed overhead is ~$300/month, entirely AI tooling | Annual fixed cost is $3,600; the business cannot bleed out |
| Contribution margin is 53% after product cost, fulfillment, and payment fees | Every $100 of revenue returns $53 toward repayment |
| Operator builds all marketing, AI, automation, and software in-house | Zero agency, developer, or contractor spend |
| Freezing Point AC continues operating as separate income | An independent source backs the monthly payment floor |
| Capital released in 3 gated tranches | Exposure capped at $20,000 until milestones are proven |

---

## The asset: verified customer list

Source file: `FILTER HERO CONTACT LIST.csv` (cleaned and deduplicated export from Freezing Point AC). The raw platform export contains 10,459 records; the cleaned working list is the figure used throughout.

| Metric | Count | Share |
|---|---:|---:|
| Total contacts | 8,497 | 100% |
| With email address | 8,497 | 100% |
| Unique email addresses | 7,380 | 86.9% |
| With phone number | 8,496 | 99.99% |
| With full street address | 8,497 | 100% |
| Located in Florida | 8,472 | 99.7% |
| Notifications enabled | 8,490 | 99.9% |
| Flagged do-not-service | 0 | 0% |

Because 100% of records carry a physical street address, this list is reachable by direct mail as well as email — which matters, since a postcard showing the exact filter size for that specific home is the highest-converting asset available.

### Geographic concentration

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

The footprint runs from Boca Raton to Homestead across both coasts of South Florida, which is the same territory covered by the building-manager and maintenance-supervisor network described below.

---

## The three channels

### 1. Reactivated house list
8,497 warm homeowners contacted by direct mail and email. These are not cold leads; they have transacted with me before.

### 2. Commercial accounts via the building-manager network
Over years of AC service work I have built direct relationships with building managers, maintenance supervisors, and property staff throughout South Florida. They already call Freezing Point AC when a unit fails. Asking them to route filter orders through Filter Hero is a request to an existing contact, not a cold sales call. A single property converts one-off consumer orders into standing quarterly volume.

### 3. Organic search and content
The storefront ships with a 9,958-size finder archive, 38 HVAC brand pages, JSON-LD structured data, and a sitemap already indexed. All marketing is organic and produced in-house.

---

## Unit economics

### Priced at the market floor

Retail is not a markup I chose. The pricing engine matches whoever is cheapest on that size and rating — Filtrete, Filter King, or FilterBuy — automatically. `liveUnitPrice` in `shared/pricing/engine.ts` takes the cheaper of the Filtrete and Filter King listing at list price, then matches a confirmed FilterBuy ticket if that one is lower.

The practical effect is that a shopper comparing prices finds no cheaper option, and a competitor cannot undercut a price that is already the floor. Orders then deliver in 2–3 days, where the cheapest listing in this market is frequently a retail shelf rather than a delivered product.

Sitting at the market floor while still clearing 53% is the core of the model.

Retail prices are set in `shared/pricing/engine.ts`. Wholesale costs come from the contractor pricing sheet in `shared/pricing/model-pricing.csv`.

| Product | Retail | Wholesale | Gross margin |
|---|---:|---:|---:|
| 1" MERV 8 (20x25x1) | $9.99 | $4.82 | 51.8% |
| 1" MERV 11 (20x25x1) | $13.49 | $6.05 | 55.2% |
| 1" MERV 13 (20x25x1) | $22.99 | $6.20 | 73.0% |
| Average across 199 costed 1" SKUs | — | — | **58.5%** |

After fulfillment and payment processing, **contribution margin is 53%**. That is the figure used in every projection below.

Catalog scope: **293 sellable SKUs** across **153 sizes**, with a **9,958-size** archive powering the finder and off-catalog quote routing.

---

## Model assumptions

Every projected number traces back to this table. Change an input here and the scenarios move with it.

| Input | Value | Derivation |
|---|---|---|
| House list size | 8,497 | Verified row count, cleaned CSV export |
| Average order value | $68 | 4-pack mix at 50% MERV 8 / 35% MERV 11 / 15% MERV 13 = $52.66, times a 1.3 uplift for homes with multiple return grilles or larger packs |
| Contribution margin | 53% | 58.5% average gross, less fulfillment and payment fees |
| Fixed overhead | $300/month | AI tooling only; no payroll, rent, or inventory |
| B2B account value | $4,800 – $9,600/year | 80-unit property, 1 filter per unit, 4 changes/year, ~$11.25 blended bulk ticket = ~$3,600/year per building; accounts typically span more than one building |
| Revenue ramp | 6 months | Linear ramp to steady state, reflecting mail drop timing and B2B sales cycles |
| Repayment | 50% of monthly net profit, $750/month floor | Floor covered by the $5,000 repayment reserve during ramp |

---

## Three scenarios — first 12 months

### Worst case
Direct mail underperforms, the building-manager network yields only a few accounts, and organic traffic stays small. **Tranche 1 milestones are missed, so tranches 2 and 3 never release and only $20,000 is ever drawn.**

| Line | Value |
|---|---:|
| House list conversion | 2% → 170 customers |
| Orders per customer per year | 2 |
| Residential revenue | $23,120 |
| B2B accounts | 3 at $4,800 |
| B2B revenue | $14,400 |
| Organic revenue | $9,000 |
| **Total revenue** | **$46,520** |
| Contribution at 53% | $24,656 |
| Less overhead ($3,600) | — |
| **Annual net profit** | **$21,056** |
| **Amount drawn** | **$20,000** |
| **Full repayment** | **Month 24** |

### Base case
Direct mail performs to industry norms for a warm list, and the network converts a reasonable share of known properties.

| Line | Value |
|---|---:|
| House list conversion | 5% → 425 customers |
| Orders per customer per year | 3 |
| Residential revenue | $86,700 |
| B2B accounts | 10 at $7,200 |
| B2B revenue | $72,000 |
| Organic revenue | $28,000 |
| **Total revenue** | **$186,700** |
| Contribution at 53% | $98,951 |
| Less overhead ($3,600) | — |
| **Annual net profit** | **$95,351** |
| **Amount drawn** | **$60,000** |
| **Full repayment** | **Month 19** |

### Best case
The warm list converts at the rate a serviced customer relationship should produce, and the building-manager network opens at scale.

| Line | Value |
|---|---:|
| House list conversion | 10% → 850 customers |
| Orders per customer per year | 3.5 |
| Residential revenue | $202,300 |
| B2B accounts | 25 at $9,600 |
| B2B revenue | $240,000 |
| Organic revenue | $70,000 |
| **Total revenue** | **$512,300** |
| Contribution at 53% | $271,519 |
| Less overhead ($3,600) | — |
| **Annual net profit** | **$267,919** |
| **Amount drawn** | **$60,000** |
| **Full repayment** | **Month 9** |

---

## Use of funds

| Allocation | Amount | Purpose |
|---|---:|---|
| Direct mail to house list | $18,000 | Three drops across 8,497 verified addresses, each postcard printed with that home's filter size |
| Working capital for commercial accounts | $15,000 | Order float covering net-30 terms that property managers expect |
| Organic amplification and email scaling | $9,000 | Klaviyo sending tiers, content production, landing pages, retargeting tests |
| B2B seeding kits | $7,500 | Sample boxes and in-person materials for 50 target properties |
| Business setup | $5,500 | Insurance, entity, accounting, payment processor reserve |
| Repayment reserve | $5,000 | Held back to guarantee the monthly floor through the ramp period |
| **Total** | **$60,000** | |

---

## Tranche schedule

Capital releases in three stages. Each tranche unlocks only when the prior one has produced measurable results.

| Tranche | Amount | Released on | Cumulative exposure |
|---|---:|---|---:|
| 1 | $20,000 | Signing | $20,000 |
| 2 | $20,000 | 100 paid orders and 3 signed commercial accounts | $40,000 |
| 3 | $20,000 | 300 cumulative paid orders, 8 commercial accounts, and a positive net profit month | $60,000 |

If tranche 1 fails to produce, the remaining $40,000 is never advanced. This is the primary protection in the structure: **the downside scenario is a $20,000 exposure, not a $60,000 exposure.**

---

## Repayment terms

- **Principal:** $60,000, drawn in tranches
- **Interest:** none
- **Payment:** the greater of $750 per month or 50% of monthly net profit
- **First payment:** month 1, with the $5,000 reserve covering the floor during ramp
- **Termination:** the obligation ends when cumulative payments reach the amount actually drawn
- **Reporting:** monthly statement showing orders, revenue, net profit, and the running repayment balance, drawn directly from Stripe and QuickBooks records

Projected payoff: **month 9** best case, **month 19** base case, **month 24** worst case on a $20,000 draw.

---

## Risk and mitigation

**The real risk:** unlike inventory, marketing spend cannot be liquidated. If the direct mail campaign and the B2B outreach both underperform, roughly $27,000 of the plan is spent on outreach that cannot be resold.

Three things contain that risk.

1. **Tranche gating.** Most of the outreach budget sits in tranches 2 and 3, which only release after the first wave has produced paying customers. A failed campaign stops the spend before it repeats.
2. **A cost structure that cannot fail.** Fixed overhead is $300 per month. There is no payroll, no lease, and no inventory to service. The business can operate indefinitely at low volume and continue repaying rather than collapsing and defaulting.
3. **An independent backstop.** Freezing Point AC continues to operate as a separate business and supports the $750 monthly floor regardless of Filter Hero's performance.

---

## What is already built

No part of this request funds development. The following is live in production today.

**Storefront** — size finder across 9,958 sizes, product pages with MERV and pack selection, cart, Stripe Hosted Checkout, customer accounts with saved filters and reorder, the Filter Clock replacement-cadence tool, 38 HVAC brand pages, and a custom-quote flow for off-catalog sizes.

**Staff systems** — CRM quote board with a six-stage pipeline, contacts, companies, deals and activity logging, customer profiles, order log, catalog admin, and site content controls.

**Production integrations** — Stripe (live), Klaviyo, Resend, Supabase, Railway, QuickBooks Online, Cloudflare Turnstile, and the Filter King fulfillment API.

**Stack** — React 19, Vite 7, Tailwind 4, Express 4, deployed as a single process on Railway behind Cloudflare.

---

## Source files

| Claim | Source |
|---|---|
| 8,497 contacts and list quality metrics | `E:\FILTER HEROE\IMPORTANT PAPERS\FILTER HERO CONTACT LIST.csv` |
| Raw 10,459-record export | `E:\FILTER HEROE\IMPORTANT PAPERS\FreezingPointAC_customer_export\` |
| Retail pricing | `shared/pricing/engine.ts` |
| Wholesale cost | `shared/pricing/model-pricing.csv` |
| 293 sellable SKUs | `shared/sellable-skus.json` |
| 9,958-size archive | `shared/filter-catalog.json` |
| 38 HVAC brands | `shared/hvac-brands.json` |
| Repair-cost comparison | `shared/hvac-overdue-costs.ts` |

All figures in this document are reproducible from the files above.
