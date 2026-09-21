# 2. Catalog and price math

Copy everything below the line into a new chat.

---

## PHASE 2 — CATALOG (copy from here)

Build the Filter Hero catalog next. Follow these rules exactly. Do not invent a second product list or a second price list.

There are **three layers**. Do not mix them.

| Layer | File / system | Job |
|---|---|---|
| What we sell + what we pay | Model Pricing XLS | Sellable SKUs and wholesale cost |
| Full catalog + Filter King page links | Filter King API | Every stock parent model, actual size, and the filterking.com URL on the matching Filter Hero page |
| What the shopper pays | Filtrete tickets in `shared/pricing/engine.ts` | Checkout, PDP, cart, JSON-LD, Klaviyo item price |

### Source file (required) — sellable + wholesale

The only **sellable** product list and the only **wholesale cost** file is this workbook:

`E:\FILTER HEROE\IMPORTANT PAPERS\Model Pricing - Contractor Commerce.xlsx`

If the `.xlsx` cannot be opened, use the export of **that same workbook** — not any other sheet:

`E:\FILTER HEROE\Model Pricing - Contractor Commerce - Sheet1.csv`

Columns: Parent Model, Size, Actual Size, MERV, Thickness, Sale Price.

- Every row is a SKU Filter Hero can add to cart (size × MERV, including carbon/odor).
- **Sale Price is wholesale.** It is what Filter Hero pays. It is **not** the customer price.
- Parent Model is the wholesale SKU (example: `AF16x25x1-M8`). Same key as Filter King API `parent_model`.
- Actual Size is the true cut. Nominal Size is what the shopper searches.

Do not use `FK PRICING_SHEET PS`, the 2025 PDF, or `shared/pricing/fk-contractor-commerce.csv` as input. Those files are retired.

### Filter King API (required) — full catalog + page links

Connect Filter Hero to Filter King’s reseller API. Docs: `https://filterking.com/api/v1/documentation`. Apply: `https://filterking.com/api-onboarding`. Token: `POST https://filterking.com/oauth/token`.

**Full catalog**

`GET https://filterking.com/api/v1/get-all-parent-models`  
Header: `Authorization: Bearer {access_token}`

Each `sku_items[]` row has `parent_model`, `size`, `actual_size`, `merv`, `thickness`, `unit_price`. Use this payload as the **full stock catalog** (size archive / finder / quote routing). Replace the static scrape in `shared/filter-catalog.json` with a sync from this endpoint. Join to Filter Hero SKUs on `parent_model` = Excel Parent Model.

**Link their page to our page**

Every Filter Hero size / MERV page must store and render the matching Filter King product URL so the two catalogs stay linked.

- Size hub: `https://filterking.com/air-filter-sizes/{size}` (example: `https://filterking.com/air-filter-sizes/20x25x1`)
- MERV PDP: `https://filterking.com/air-filter-sizes-{size}-merv-{8|11|13}` (example: `https://filterhero.net/sizes/20x25x1` ↔ `https://filterking.com/air-filter-sizes-20x25x1-merv-8`)
- Carbon: same pattern with the carbon slug from Filter King, not a guessed MERV 8 URL.

If the API later returns a canonical URL field, use that field and stop constructing slugs. Until then, build the URL from `size` + `merv` as above and persist it on the Filter Hero product (`filterKingUrl`).

**API `unit_price` is not the shopper price.** It is Filter King’s dealer unit. Do not put it on the PDP, cart, Checkout `price_data`, JSON-LD Offer, or Klaviyo. Wholesale for **sellable** SKUs stays the Excel Sale Price unless you later choose to refresh cost from the API into `model-pricing.csv` only.

**Do not scrape filterking.com.** The API is the catalog. The public PDP URL is a link, not a price source.

Env (server only, never `VITE_`): `FILTERKING_CLIENT_ID`, `FILTERKING_CLIENT_SECRET`, `FILTERKING_API_BASE=https://filterking.com`.

Off-list / custom sizes: Filter King `POST /api/v1/build-custom-filter` may quote them. They are not add-to-cart on Filter Hero until they exist on the Model Pricing XLS.

### Customer prices (required)

Customer prices are the **Filtrete tickets already set on this website**, not the Excel and not the Filter King API.

Source of truth: `FILTER HERO/shared/pricing/engine.ts`

1-inch qty 1 (same ticket across sizes):

- MERV 8 = `$9.99` (`FILTRETE_1INCH_QTY1["8"]`)
- MERV 11 = `$13.49` (`FILTRETE_1INCH_QTY1["11"]`)
- MERV 13 = `$22.99` (`FILTRETE_1INCH_QTY1["13"]`)
- Carbon = `$16.70` (`FILTRETE_1INCH_QTY1.carbon`)

Multi-pack customer units are `FILTRETE_PACKS` in that same file. Use those for qty 2 / 4 / 6 / 12 when a row exists. Do not invent pack prices. Do not stamp Excel Sale Price or API `unit_price` onto a pack rung.

Checkout `price_data`, PDP, cart, JSON-LD Offer, and Klaviyo item price must all use these Filtrete tickets.

### Hard laws

1. Model Pricing XLS = **what we sell** + **what we pay**.
2. Filter King API = **full stock catalog** + **filterking.com URL on the matching Filter Hero page**.
3. Filtrete engine = **what the shopper pays**.
4. Never put wholesale cost or API `unit_price` on the storefront, Stripe Product price, Klaviyo catalog, Supabase `catalog_skus`, sitemap, or `/llms.txt`.
5. `VITE_FULL_CATALOG=false` and `FULL_CATALOG=false` for **checkout**. The cart is the XLS. The finder may show API sizes; off-XLS sizes route to custom quote, not Stripe.
6. Do not use Filter King website sale, FilterBuy sale, or a 10% undercut as the customer price.
7. When a new size × MERV is added to what we sell, add it to the Model Pricing XLS first, export CSV, rebuild `sellable-skus.json`, then confirm the API row and Filter King URL exist. Do not hand-edit `sellable-skus.json`.

### What to build

1. Read the Model Pricing XLS (or its Sheet1 CSV export). Write that data into the new shop as `shared/pricing/model-pricing.csv`. Point `scripts/build-sellable-skus.ts` at **that** file, not at `fk-contractor-commerce.csv`.
2. Run `pnpm exec tsx scripts/build-sellable-skus.ts` so `shared/sellable-skus.json` matches the XLS (cost stays in that JSON for margin math only).
3. OAuth to Filter King. Sync `GET /api/v1/get-all-parent-models` into the size archive. Persist `parent_model` + `filterKingUrl` on every Filter Hero size × MERV.
4. On `/sizes/{slug}`, show or link the Filter King URL for that size × selected MERV.
5. Wire shopper unit price from `filtreteQty1` / `FILTRETE_PACKS` in `shared/pricing/engine.ts`.
6. Keep HVAC brand → size → OEM maps in `shared/hvac-brands.json` (finder only, not a second catalog).
7. Leave `pnpm sync:catalog` for a later phase. When it runs, copy SKU identity (id, size, MERV, image, Filter Hero URL, Filter King URL) but **must not** copy wholesale cost or API `unit_price`.

### Done when

- Every Model Pricing XLS size × MERV is sellable; nothing off that workbook is in the cart.
- `GET /api/v1/get-all-parent-models` populates the finder archive. A Filter Hero size page has the matching `filterking.com` product link.
- A 1-inch MERV 8 qty 1 checkout unit is `$9.99`, not Excel Sale Price and not API `unit_price`.
- The importer does not read `fk-contractor-commerce.csv`. No Filter King HTML scrape feeds the catalog.
- `pnpm verify:store` passes.
- Stripe / Klaviyo / Postgres still have no dealer cost column.

### Leave out

`fk-contractor-commerce.csv` as input. Scraping filterking.com. Filter King API `unit_price` or website sale as shopper price. FilterBuy undercut as shopper price. Add-to-cart for API-only SKUs. A second catalog in Postgres. Wholesale cost in any customer-facing or synced system.

## PHASE 2 — CATALOG (stop copy)
