---
name: filter-hero-catalog
description: Enforces Filter Hero's three catalog layers — live Filter King stock cart, Model Pricing wholesale, Filtrete shopper tickets. Use when changing SKUs, prices, sellable-skus, Filter King URLs, FULL_CATALOG, stock sync, or pnpm sync:catalog.
---

# Filter Hero catalog

Three layers. Do not mix.

1. **Cart + live stock** — Filter King `GET /api/v1/get-all-parent-models`. Express auto-syncs every 15 min to `DATA_DIR/filterking-stock.json`. `inStock` = parent model present in that set. Bootstrap: `shared/filterking-catalog.json` (no `unit_price`).
2. **Wholesale** — `shared/pricing/model-pricing.csv` Sale Price first; API `unit_price` only as server-side cost fallback for margin. Never shopper-facing.
3. **Shopper price** — `FILTRETE_1INCH_QTY1` and `FILTRETE_PACKS` in `shared/pricing/engine.ts`. Do not invent pack prices. Do not use Filter King sale or FilterBuy undercut.

`VITE_FULL_CATALOG=false`. Cart = live API stock, not the sheet alone and not the 9,958 archive. Off-stock → custom quote. `pnpm sync:catalog` copies identity only, never cost.
