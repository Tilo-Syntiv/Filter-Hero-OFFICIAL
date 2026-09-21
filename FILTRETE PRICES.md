# FILTRETE PRICES

Confirmed retail tickets Filter Hero **charges**. Shopper price source: `shared/pricing/engine.ts` (`FILTRETE_1INCH_QTY1`, `FILTRETE_PACKS`).

Do not use Filter King website sale, API `unit_price`, or FilterBuy undercut as the customer price. Multi-packs: `FILTRETE_PACKS` only — do not invent pack prices.

- **Written:** 2026-09-20
- **Last aligned:** 2026-09-20 (operating law: Filtrete tickets only)

Every price below is **dollars per filter**. Pack total = unit × qty.

---

# Filtrete prices

**These prices are from Filtrete** (Target / Lowe’s / Amazon / Walmart / Office Depot). They are not FilterBuy.

- **Collected:** 1-packs Aug 30, 2026 (Target). Carbon 1-pack Sep 1, 2026 (Lowe’s). Multi-packs Aug 30, 2026 (Target / Amazon / Walmart / Office Depot).
- **Rule:** Only confirmed Filtrete listings. Do not invent Filtrete 2-inch, 4-inch, or extra pack sizes.

## Filtrete coverage

| | Count |
| --- | ---: |
| 1-inch qty-1 tickets (flat, all 1-inch sizes) | 4 |
| Confirmed Filtrete multi-pack rungs | 18 |
| Sizes with at least one Filtrete multi-pack | 6 |
| 2-inch / 4-inch / 5-inch / 0.5-inch Filtrete rows | 0 |

**1-inch sizes with a confirmed Filtrete multi-pack:** 14x20x1, 16x20x1, 16x25x1, 20x20x1, 20x25x1, 20x30x1.

## Filtrete list 1 — 1-inch 1-packs (flat ticket)

Same unit on every 1-inch size. MERV 8 = MPR 700, MERV 11 = MPR 1000, MERV 13 = MPR 1900. Carbon is Filtrete Allergen Defense Odor Reduction (MPR 1200 / MERV 11). Filtrete has no MERV 8 Carbon SKU; Hero carbon qty 1 still matches this odor 1-pack.

| MERV / SKU | Filtrete name | Retailer | Date | Unit |
| --- | --- | --- | --- | ---: |
| 8 | MPR 700 | Target | 2026-08-30 | $9.99 |
| 11 | MPR 1000 | Target | 2026-08-30 | $13.49 |
| 13 | MPR 1900 | Target | 2026-08-30 | $22.99 |
| Carbon (odor) | Allergen Defense Odor Reduction | Lowe’s 20x20x1 | 2026-09-01 | $16.70 |

Examples that must hit these tickets: 16x25x1, 20x20x1, 20x25x1 — and every other 1-inch size in the shop.

## Filtrete list 2 — confirmed multi-packs

Only these size × MERV × qty rows were scraped. Any other 1-inch pack stays on Filter King × 0.90, capped at the Filtrete 1-pack from list 1.

### Filtrete 2-packs

| Size | MERV | Unit | Pack total |
| --- | ---: | ---: | ---: |
| 14x20x1 | 11 | $11.00 | $22.00 |
| 16x20x1 | 11 | $11.00 | $22.00 |
| 16x25x1 | 11 | $11.00 | $22.00 |
| 20x20x1 | 11 | $11.00 | $22.00 |
| 20x25x1 | 11 | $11.00 | $22.00 |
| 16x25x1 | 13 | $15.00 | $30.00 |
| 20x25x1 | 13 | $21.00 | $42.00 |

### Filtrete 4-packs

| Size | MERV | Unit | Pack total |
| --- | ---: | ---: | ---: |
| 16x25x1 | 8 | $10.05 | $40.20 |
| 20x20x1 | 8 | $11.50 | $46.00 |
| 20x30x1 | 8 | $11.49 | $45.96 |

### Filtrete 6-packs

| Size | MERV | Unit | Pack total |
| --- | ---: | ---: | ---: |
| 16x20x1 | 8 | $8.67 | $52.02 |
| 20x20x1 | 8 | $8.83 | $52.98 |
| 16x25x1 | 8 | $9.00 | $54.00 |
| 20x25x1 | 8 | $9.17 | $55.02 |
| 16x25x1 | 11 | $11.00 | $66.00 |
| 20x20x1 | 11 | $11.00 | $66.00 |

### Filtrete 12-packs

| Size | MERV | Unit | Pack total | Note |
| --- | ---: | ---: | ---: | --- |
| 20x20x1 | 8 | $5.18 | $62.16 | Walmart |
| 16x25x1 | 8 | $5.83 | $69.96 | Office Depot |

## Filtrete full grid (every confirmed Filtrete ticket)

Blank cells were **not** scraped. Hero does not invent a Filtrete price for those rungs.

| Size | MERV | Qty 1 | Qty 2 | Qty 4 | Qty 6 | Qty 12 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| All 1-inch sizes | 8 | $9.99 | | | | |
| All 1-inch sizes | 11 | $13.49 | | | | |
| All 1-inch sizes | 13 | $22.99 | | | | |
| All 1-inch sizes | Carbon | $16.70 | | | | |
| 14x20x1 | 11 | $13.49 | $11.00 | | | |
| 16x20x1 | 8 | $9.99 | | | $8.67 | |
| 16x20x1 | 11 | $13.49 | $11.00 | | | |
| 16x25x1 | 8 | $9.99 | | $10.05 | $9.00 | $5.83 |
| 16x25x1 | 11 | $13.49 | $11.00 | | $11.00 | |
| 16x25x1 | 13 | $22.99 | $15.00 | | | |
| 20x20x1 | 8 | $9.99 | | $11.50 | $8.83 | $5.18 |
| 20x20x1 | 11 | $13.49 | $11.00 | | $11.00 | |
| 20x25x1 | 8 | $9.99 | | | $9.17 | |
| 20x25x1 | 11 | $13.49 | $11.00 | | | |
| 20x25x1 | 13 | $22.99 | $21.00 | | | |
| 20x30x1 | 8 | $9.99 | | $11.49 | | |

Qty 1 in the size rows is the Filtrete list 1 flat ticket, not a second scrape.

## What the Filtrete list does not cover

- No Filtrete 2-inch, 4-inch, 5-inch, or 0.5-inch prices.
- No Filtrete carbon multi-packs.
- MERV 11 2-pack at $11.00 is only the five sizes above. Other 1-inch MERV 11 qty-2 cells stay at the $13.49 single or Filter King, whichever is cheaper.

Hero issues: FH-134 (carbon qty 1), FH-135 (pack / MERV / thick-size gaps), FH-136 (cheaper of Filtrete vs Filter King).

---

# FilterBuy prices

**These prices are from FilterBuy** (`filterbuy.com`). They are not Filtrete. They are not HDX.

- **Collected:** Sep 1, 2026 from filterbuy.com.
- **Sale:** FilterBuy 10% sale in effect on that date; sale ended Sep 7, 2026.
- **Rule:** Only confirmed cheaper FilterBuy rungs. Do not stamp FilterBuy across sizes or MERVs we did not scrape. Do not undercut FilterBuy another 10%. Not HDX.

Hero matches these tickets only where FilterBuy beat the existing Filtrete / Filter King price (FH-138). 6-packs that already beat FilterBuy stay on Filter King.

## FilterBuy coverage

| | Count |
| --- | ---: |
| Confirmed FilterBuy rungs | 30 |
| Sizes | 5 |
| Depths | 2-inch and 4-inch only |
| 1-inch FilterBuy rows | 0 |
| Carbon FilterBuy rows | 0 |

**Sizes with a confirmed FilterBuy ticket:** 16x20x2, 16x25x2, 16x25x4, 20x25x2, 20x25x4.

Not cheaper on FilterBuy (not in this table): 16x25x2 MERV 13, 16x20x2 MERV 13, 20x25x4 MERV 13 qty 1.

## FilterBuy list — confirmed cheaper rungs

### FilterBuy 1-packs

| Size | MERV | Unit | Source |
| --- | ---: | ---: | --- |
| 16x20x2 | 8 | $22.49 | FilterBuy |
| 16x20x2 | 11 | $27.89 | FilterBuy |
| 16x25x2 | 8 | $28.79 | FilterBuy |
| 16x25x2 | 11 | $34.19 | FilterBuy |
| 20x25x2 | 8 | $24.29 | FilterBuy |
| 20x25x2 | 11 | $29.69 | FilterBuy |
| 20x25x2 | 13 | $35.09 | FilterBuy |
| 16x25x4 | 8 | $30.59 | FilterBuy |
| 16x25x4 | 11 | $34.19 | FilterBuy |
| 20x25x4 | 8 | $30.59 | FilterBuy |
| 20x25x4 | 11 | $36.89 | FilterBuy |

### FilterBuy 2-packs

| Size | MERV | Unit | Pack total | Source |
| --- | ---: | ---: | ---: | --- |
| 16x20x2 | 8 | $13.49 | $26.98 | FilterBuy |
| 16x20x2 | 11 | $15.74 | $31.48 | FilterBuy |
| 16x25x2 | 11 | $17.99 | $35.98 | FilterBuy |
| 16x25x4 | 11 | $21.59 | $43.18 | FilterBuy |
| 20x25x4 | 11 | $22.49 | $44.98 | FilterBuy |

### FilterBuy 4-packs

| Size | MERV | Unit | Pack total | Source |
| --- | ---: | ---: | ---: | --- |
| 16x20x2 | 11 | $13.49 | $53.96 | FilterBuy |
| 16x25x4 | 11 | $17.09 | $68.36 | FilterBuy |

### FilterBuy 6-packs

| Size | MERV | Unit | Pack total | Source |
| --- | ---: | ---: | ---: | --- |
| 16x20x2 | 11 | $11.24 | $67.44 | FilterBuy |
| 16x25x2 | 11 | $12.00 | $72.00 | FilterBuy |
| 20x25x2 | 11 | $12.00 | $72.00 | FilterBuy |
| 16x25x4 | 8 | $14.39 | $86.34 | FilterBuy |
| 16x25x4 | 11 | $15.74 | $94.44 | FilterBuy |

### FilterBuy 12-packs

| Size | MERV | Unit | Pack total | Source |
| --- | ---: | ---: | ---: | --- |
| 16x20x2 | 11 | $10.12 | $121.44 | FilterBuy |
| 16x25x2 | 11 | $9.75 | $117.00 | FilterBuy |
| 20x25x2 | 11 | $11.24 | $134.88 | FilterBuy |
| 16x25x4 | 8 | $13.57 | $162.84 | FilterBuy |
| 16x25x4 | 11 | $15.67 | $188.04 | FilterBuy |
| 20x25x4 | 8 | $13.35 | $160.20 | FilterBuy |
| 20x25x4 | 11 | $17.85 | $214.20 | FilterBuy |

## FilterBuy full grid (every confirmed FilterBuy ticket)

Blank cells were **not** scraped from FilterBuy. Hero does not invent a FilterBuy price for those rungs.

| Size | MERV | Qty 1 | Qty 2 | Qty 4 | Qty 6 | Qty 12 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 16x20x2 | 8 | $22.49 | $13.49 | | | |
| 16x20x2 | 11 | $27.89 | $15.74 | $13.49 | $11.24 | $10.12 |
| 16x25x2 | 8 | $28.79 | | | | |
| 16x25x2 | 11 | $34.19 | $17.99 | | $12.00 | $9.75 |
| 20x25x2 | 8 | $24.29 | | | | |
| 20x25x2 | 11 | $29.69 | | | $12.00 | $11.24 |
| 20x25x2 | 13 | $35.09 | | | | |
| 16x25x4 | 8 | $30.59 | | | $14.39 | $13.57 |
| 16x25x4 | 11 | $34.19 | $21.59 | $17.09 | $15.74 | $15.67 |
| 20x25x4 | 8 | $30.59 | | | | $13.35 |
| 20x25x4 | 11 | $36.89 | $22.49 | | | $17.85 |

## What the FilterBuy list does not cover

- These are FilterBuy prices, not Filtrete.
- No 1-inch FilterBuy rows (1-inch is the Filtrete table above).
- No carbon FilterBuy rows.
- No HDX (Home Depot store brand).
- Do not copy a FilterBuy ticket onto a size or MERV that is blank in the grid.

Hero issues: FH-137 (Filtrete-gap rungs; cheapest peer is FilterBuy), FH-138 (match FilterBuy on confirmed cheaper 2-inch / 4-inch rungs).
