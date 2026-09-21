---
name: filter-hero-catalog
description: Enforces Filter Hero's three catalog layers — Model Pricing XLS sellable/wholesale, Filter King API archive + page links, Filtrete shopper tickets. Use when changing SKUs, prices, sellable-skus, Filter King URLs, FULL_CATALOG, or pnpm sync:catalog.
---

# Filter Hero catalog

Three layers. Do not mix.

1. **Sellable + wholesale** — `shared/pricing/model-pricing.csv` from the Model Pricing XLS. Sale Price is wholesale. Importer: `scripts/build-sellable-skus.ts`.
2. **Archive + links** — Filter King API `GET /api/v1/get-all-parent-models`. Persist `parent_model` + `filterKingUrl`. Do not scrape filterking.com. API `unit_price` is not the shopper price.
3. **Shopper price** — `FILTRETE_1INCH_QTY1` and `FILTRETE_PACKS` in `shared/pricing/engine.ts`. Do not invent pack prices. Do not use Filter King sale or FilterBuy undercut.

`VITE_FULL_CATALOG=false`. Cart = XLS. Off-XLS → custom quote. `pnpm sync:catalog` copies identity only, never cost.
