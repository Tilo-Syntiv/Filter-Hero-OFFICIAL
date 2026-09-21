# books, seo and catalog FULL BUILD

**Filter Hero — how books, SEO, and catalog sync are installed, wired, connected, and kept.**

This is not a generic Stripe Tax tutorial, not a generic schema.org cheatsheet, and not a generic “sync products to Klaviyo” recipe. It is the exact architecture in this repository: **sellable** SKUs from `E:\FILTER HEROE\IMPORTANT PAPERS\Model Pricing - Contractor Commerce.xlsx`, **full catalog + Filter King page links** from `GET https://filterking.com/api/v1/get-all-parent-models`, three outbound mirrors (Stripe Products, Klaviyo custom catalog, Supabase `catalog_skus`), two SEO writers (Express HTML inject + SPA `useSeo`), and a books split where Stripe charges the shopper and QuickBooks Online records the sale. Shopper tickets are the Filtrete prices in `shared/pricing/engine.ts`, not Excel Sale Price and not Filter King API `unit_price`.

If a later change fights this document, the live code plus [ISSUES-AND-FIXES.md](ISSUES-AND-FIXES.md) win — then this file must be updated.

**Canonical issue log:** every `FH-XXX` with full **Do / Do NOT / Files / Verify** lives in `docs/ISSUES-AND-FIXES.md`. This guide includes the complete books / SEO / catalog index, every open item in this area in full, and the laws those tickets produced. Next unused id is **FH-308**. There is no FH-036 (never assigned). FH-001–FH-030 were never logged.

Related deep dives (do not duplicate their payment/email internals here):

| Doc | Owns |
|---|---|
| [STRIPE-FULL-BUILD.md](./STRIPE-FULL-BUILD.md) | Accounts, Checkout payload, dual webhooks, fulfillment handler |
| [STRIPE-BOOKS.md](./STRIPE-BOOKS.md) | Short books map: Stripe Tax on the hosted page, QBO as ledger |
| [INTUIT-OAUTH.md](./INTUIT-OAUTH.md) | Staff QuickBooks Connect — expired tokens, `invalid_grant`, CSRF |
| [INTUIT-OAUTH-DISCOVERY.md](./INTUIT-OAUTH-DISCOVERY.md) | Intuit OAuth/OpenID discovery URLs |
| [KLAVIYO-FULL-BUILD.md](./KLAVIYO-FULL-BUILD.md) | Flows, metrics, onsite, catalog feed URL |
| [SUPABASE-AND-POSTGRES-FULL-BUILD.md](./SUPABASE-AND-POSTGRES-FULL-BUILD.md) | `catalog_skus` table, RLS, accounts |
| [2 CATALOG.md](./2%20CATALOG.md) | Model Pricing XLS, Filter King API catalog + page links, Filtrete shopper tickets |
| [UI FULL BUILD.md](./UI%20FULL%20BUILD.md) | SPA chrome, `useSeo` mount points |

---

## 1. What these three systems are in this project

They are not three products. They are **one catalog** described three ways.

```
shared/sellable-skus.json          ← shop list (Model Pricing XLS rows)
Filter King API parent models      ← full stock catalog + filterKingUrl
shared/products.ts                 ← prices, pack rungs, ids, FULL_CATALOG switch
        │
        ├── shop UI / Checkout     (XLS allowlist only; Filtrete tickets)
        ├── size PDP               (links matching filterking.com URL)
        ├── shared/seo.ts          (titles, FAQ, JSON-LD, sitemap, llms)
        └── pnpm sync:catalog      (Stripe + Klaviyo + Postgres mirrors)
                    │
                    ├── Stripe Products prod_fh_{id}   → Checkout line + QBO connector
                    ├── Klaviyo custom catalog         → email product blocks
                    └── Supabase catalog_skus          → staff SQL / CRM mirror
```

**Books** means: the shopper pays Stripe; Stripe Tax adds the tax line on the hosted page; QuickBooks Online is the ledger via the Stripe Connector. Staff can also OAuth a QBO company from `/admin/settings`. That OAuth is a QBO app, not a second checkout.

**SEO** means: crawlers get unique title / canonical / robots / Open Graph / JSON-LD on first HTML paint from Express. Shoppers who click around the SPA get the same document rewritten by `useSeo`. Machine briefs (`/llms.txt`, `/llms-full.txt`, `/ai.txt`, `/sitemap.xml`, `/robots.txt`) are generated from the same `shared/seo.ts` module.

**Catalog sync** means: `pnpm sync:catalog` pushes the Model Pricing XLS allowlist to those three mirrors. Checkout still prices with `price_data` (Filtrete pack-qty unit amounts). The synced Stripe Product is attached so the connector and Dashboard have a stable SKU. Wholesale **cost** never leaves the XLS / `model-pricing.csv`.

Do **not** invent a fourth catalog in Postgres, Klaviyo, or Stripe and then try to keep the shop in sync with it. Checkout is the Model Pricing XLS. The finder archive is Filter King `GET /api/v1/get-all-parent-models`. Do not scrape filterking.com.

---

## 2. Install — how this actually boots

### 2.1 Commands

```bash
pnpm install
cp .env.example .env

pnpm exec tsx scripts/build-sellable-skus.ts   # rebuild allowlist from Model Pricing XLS / model-pricing.csv
pnpm sync:catalog                              # Stripe + Klaviyo + catalog_skus
pnpm sync:catalog --stripe                     # one mirror
pnpm sync:catalog --klaviyo
pnpm sync:catalog --supabase

pnpm verify:store          # catalog / pricing / SEO copy invariants
pnpm verify:json           # JSON-LD graphs stringify and match live prices
pnpm verify:stripe-books   # tax codes, 490-char meta, Tax Settings, webhook health
pnpm verify:intuit-oauth   # expired access/refresh, invalid_grant, CSRF
pnpm verify:intuit-discovery
pnpm verify:klaviyo
pnpm verify:supabase
pnpm smoke                 # sitemap, llms, size SSR JSON-LD, catalog.json count
pnpm debug:stripe-checkout
pnpm setup:stripe-webhook
pnpm setup:klaviyo-stripe
pnpm setup:intuit-live     # Production Intuit keys onto Railway
pnpm connect:intuit
```

No extra npm packages for SEO. Stripe SDK is already a runtime dep. Catalog sync uses `@supabase/supabase-js` (service role) and `stripe` from scripts.

### 2.2 Environment

Vite `envDir` is the **repo root**. Only `VITE_*` keys are baked into the browser bundle.

| Variable | Who reads it | Law |
|---|---|---|
| `VITE_FULL_CATALOG` / `FULL_CATALOG` | `shared/products.ts` | Must stay **`false`** on the Model Pricing shop (FH-217 / FH-303). `true` sells the archive. |
| `VITE_SITE_URL` / `SITE_URL` / `CLIENT_URL` | SEO + catalog URLs | Canonical origin `https://filterhero.net`. Vite bakes `VITE_`. |
| `STRIPE_SECRET_KEY` | Checkout + `syncStripeCatalog` | Live FILTER HERO `sk_live_` on Railway (`acct_1U9bqlQEENEs0Qmw`). Local `.env` may stay sandbox. |
| `STRIPE_TAX_CODE` | optional | Default `txcd_99999999` (General - Tangible Goods). Do not invent a code. |
| `STRIPE_WEBHOOK_SECRET` | fulfillment | Dashboard endpoint secret on Railway. Local is `stripe listen`. |
| `KLAVIYO_PRIVATE_API_KEY` | `syncKlaviyoCatalog` | Server only. Never `VITE_`. |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | `syncSupabaseCatalog` | Service role never `VITE_`. |
| `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET` | staff QBO Connect | Local = Development/sandbox. Railway = Production. Never `VITE_`. |
| `INTUIT_ENVIRONMENT` | `sandbox` \| `production` | |
| `INTUIT_REDIRECT_URI` | OAuth callback | Local `http://localhost:3001/api/intuit/oauth/callback`. Live `https://filterhero.net/api/intuit/oauth/callback`. |
| `FILTERKING_CLIENT_ID` / `FILTERKING_CLIENT_SECRET` | `GET /api/v1/get-all-parent-models` | Server only. Never `VITE_`. `unit_price` is not the shopper ticket. |
| `FILTERKING_API_BASE` | Filter King API | `https://filterking.com` |

`pnpm sync:catalog` against a sandbox key writes `shared/stripe-catalog.json` with `livemode: false`. Checkout **ignores** that mapping when the current secret is `sk_live_` (FH-223 livemode guard). Before go-live, run sync with FILTER HERO live `sk_live_`. The sync already warns if the account is not `acct_1U9bqlQEENEs0Qmw`.

Open production gaps that books/catalog depend on: Railway still has sandbox Stripe keys (FH-305) and `FULL_CATALOG=true` (FH-303). Live JSON feed is still 299 SKUs (FH-300). Do not point Klaviyo’s catalog **source URL** at the live feed until that deploy.

### 2.3 Accounts that must not mix

| System | Live identity | Must not |
|---|---|---|
| Stripe shop | FILTER HERO `acct_1U9bqlQEENEs0Qmw` | Sandbox `acct_1U9bqs790NnFGDLv` posting to `filterhero.net` (FH-294) |
| Klaviyo | Filter Hero `VnVNmQ` | Native Stripe app on sandbox |
| QBO | Real company via Stripe Connector + optional staff OAuth | Production Intuit keys from localhost (FH-226) |
| Filter King API | `https://filterking.com/api/v1` | Scrape HTML; put `unit_price` on Checkout |

---

## 3. Directory map

```
FILTER HERO/
├── shared/
│   ├── products.ts              # FULL_CATALOG, ids, sellableSheetProducts()
│   ├── sellable-skus.json       # Model Pricing XLS lines (shop list)
│   ├── filter-catalog.json      # archived size universe
│   ├── seo.ts                   # titles, FAQ, JSON-LD, sitemap, llms, HTML inject
│   ├── stripe-catalog.ts        # read/write stripe-catalog.json + livemode guard
│   ├── stripe-catalog.json      # mapping shop id → Stripe Product id (generated)
│   ├── stripe-tax.ts            # txcd_*, Tax Settings gate
│   ├── stripe-accounts.ts       # FILTER HERO vs sandbox webhook ownership
│   ├── intuit-oauth.ts          # CSRF, error copy, scopes
│   ├── merv-capacity.ts         # MERV FAQ / llms answer (FH-284)
│   ├── hvac-overdue-costs.ts    # clogged-filter FAQ (FH-286 / FH-290)
│   └── pricing/model-pricing.csv   # copy of Model Pricing XLS (not fk-contractor-commerce.csv)
├── scripts/
│   ├── sync-catalog.ts          # CLI: --stripe --klaviyo --supabase
│   ├── lib/catalog-sync.ts      # the three upserts
│   ├── build-sellable-skus.ts   # CSV → sellable-skus.json
│   ├── verify-stripe-books.ts
│   ├── verify-store.ts
│   ├── verify-json.ts
│   ├── verify-intuit-oauth.ts
│   ├── setup-stripe-webhook.ts
│   ├── setup-klaviyo-account.ts # also calls syncKlaviyoCatalog()
│   └── smoke-site.ts
├── server/
│   ├── index.ts                 # sitemap/robots/llms + injectSeoIntoHtml
│   ├── stripe.ts                # Checkout + webhook + orderFromCheckoutSession
│   ├── stripe-webhooks.ts       # Dashboard endpoint health / conflict scrub
│   ├── klaviyo.ts               # buildKlaviyoCatalog, productUrl
│   ├── admin/data.ts            # catalogSnapshot for /admin
│   ├── intuit/oauth.ts
│   ├── intuit/routes.ts         # GET /api/intuit/oauth/callback
│   └── data/orders.json         # packing log (not the ledger)
├── supabase/migrations/0005_catalog_skus.sql
├── client/
│   ├── index.html               # default homepage meta (overwritten per route)
│   ├── public/robots.txt        # static copy — Express wins in prod (FH-130)
│   ├── public/llms.txt          # static copy — keep aligned
│   └── src/
│       ├── hooks/useSeo.ts
│       └── pages/*.tsx          # each public page calls useSeo
└── docs/ISSUES-AND-FIXES.md
```

Aliases (must match `tsconfig.json` and `vite.config.ts`):

```
@/*        → client/src/*
@shared/*  → shared/*
```

---

## 4. Catalog truth — the spine everything else copies

### 4.1 Two JSON files, one switch

| File | Role |
|---|---|
| `E:\FILTER HEROE\IMPORTANT PAPERS\Model Pricing - Contractor Commerce.xlsx` | **Sellable source.** Product list **and** wholesale cost. Sale Price is dealer cost, never the shopper ticket. |
| Filter King `GET /api/v1/get-all-parent-models` | **Full stock catalog.** `parent_model`, size, actual_size, MERV. Persist `filterKingUrl` on the Filter Hero page. `unit_price` is not the shopper ticket. |
| `shared/pricing/model-pricing.csv` | Shop copy of the XLS. `build-sellable-skus.ts` reads this file, not `fk-contractor-commerce.csv`. |
| `shared/sellable-skus.json` | Compiled checkout allowlist. Rebuild with `scripts/build-sellable-skus.ts`. |
| `shared/filter-catalog.json` | Replaced by the API sync. Keep only until the first successful parent-model pull. |

`shared/products.ts`:

```ts
export const FULL_CATALOG = envFlag("VITE_FULL_CATALOG", "FULL_CATALOG") === true;
export const SELLABLE_ONLY = !FULL_CATALOG;
```

When `FULL_CATALOG` is false (the live shop):

- `FILTER_SIZES` = sizes that appear on the sheet (153).
- Sellable MERV per size is whatever the sheet listed. `/sizes/20x25x1` has 8 / Carbon / 11 / 13. `/sizes/14x25x1` has MERV 8 only (FH-217 / FH-250).
- Off-sheet sizes stay in the archive and route to `/custom-air-filters` (FH-043, FH-140).
- Checkout and cart refuse `inStock: false`.

When `FULL_CATALOG` is true: every archived size × MERV, including carbon, is for sale. That is an emergency / archive mode, not production (FH-133, FH-303).

Coverage of the Model Pricing XLS ([2 CATALOG.md](./2%20CATALOG.md)):

| | Count |
|---|---:|
| Unique size × MERV | **293** |
| Unique sizes | 153 |
| MERV 8 | 153 |
| MERV 11 | 64 |
| MERV 13 | 67 |
| Carbon / odor | 9 |

The old 299-SKU mix is dead in this branch (FH-217). Production’s public JSON feed is still 299 until FH-300 ships.

### 4.2 Stable identifiers

Shop `product.id` is the integer in `filter-catalog.json`. Everything else is derived:

| Id | Function | Example |
|---|---|---|
| Shop product id | `product.id` | `42` |
| Stripe Product | `catalogStripeProductId(id)` → `prod_fh_{id}` | `prod_fh_42` |
| Mapped Stripe id | `mappedStripeProductId(id, livemode)` from `stripe-catalog.json` | Stripe-assigned if custom id was rejected |
| Klaviyo external_id | `catalogExternalId(id)` → `String(id)` | `42` |
| Klaviyo item id | `$custom:::$default:::{externalId}` | `$custom:::$default:::42` |
| Qty-1 Price lookup | `fh_{id}_q1` | `fh_42_q1` |
| Wholesale SKU | `wholesaleSkuFor(size, merv, carbon)` from the sheet | Filter King dealer sku |

Wholesale **cost** is on the CSV and in `sellable-skus.json` for staff math. It is **never** written to Stripe metadata, Klaviyo items, or `catalog_skus` (FH-223). Stripe metadata carries the sku **string** only.

### 4.3 `sellableSheetProducts()`

This is the iterator every mirror uses. It walks `SELLABLE_ROWS` and resolves each line through `findProductVariant`. Klaviyo’s public JSON feed, Stripe sync, Supabase sync, and the staff catalog table all call it. Do not build a second “items for Klaviyo” list.

```ts
export function sellableSheetProducts(): Product[] {
  const products: Product[] = [];
  for (const row of SELLABLE_ROWS) {
    const product = findProductVariant(row.size, row.merv, Boolean(row.isCarbon));
    if (product) products.push(product);
  }
  return products;
}
```

Staff `/admin` catalog (`catalogSnapshot` in `server/admin/data.ts`) also uses this list. Mode chip is `SELLABLE_ONLY ? "Sheet" : "Full"`.

### 4.4 How to grow the shop list

1. Add the size × MERV (and actuals) to the Model Pricing XLS, then export into `shared/pricing/model-pricing.csv`.
2. `pnpm exec tsx scripts/build-sellable-skus.ts`.
3. `pnpm verify:store` — size pages, sitemap count, live tickets.
4. `pnpm sync:catalog` — Stripe / Klaviyo / `catalog_skus`.
5. If crawlers need a new **route**, add a branch in `resolveDocumentSeo` and a `useSeo` call on the page. New sizes on existing `/sizes/:slug` are automatic.

Do not skip step 4 after a sheet rebuild (FH-223).

---

## 5. Catalog sync — exact wire

Entry: `scripts/sync-catalog.ts`.

- No argv → all three mirrors.
- `--stripe` / `--klaviyo` / `--supabase` (or the bare names) select a subset.
- Prints a JSON report. Any mirror with `error` exits 1.
- Missing keys skip that mirror (`skipped: true`, reason string). That is not a failure.

`scripts/setup-klaviyo-account.ts` also calls `syncKlaviyoCatalog()`. It used to skip catalog jobs when existing count ≥ sheet count; that left the old mix. Sync always diffs create / update / delete (FH-223).

### 5.1 Stripe — `syncStripeCatalog()`

File: `scripts/lib/catalog-sync.ts`.

Managed product = `metadata.source === "filterhero-catalog"` **or** id starts with `prod_fh_`.

For each `sellableSheetProducts()` row:

1. Find an existing product by metadata `productId`, then `prod_fh_{id}`, then the livemode mapping file, then retrieve.
2. **Update:** name (`{size} MERV {n}` or `{size} MERV 8 Carbon`), description, pack-shot `images`, PDP `url` (`/sizes/{size}?merv=`), `tax_code`, `shippable: true`, metadata, `active: true`. Ensure qty-1 exclusive Price with lookup `fh_{id}_q1`.
3. **Create:** prefer custom id `prod_fh_{id}`. If Stripe rejects the id, create without it. If it already exists, update. Default Price is qty-1 exclusive cents.
4. After the loop, archive (`active: false`) managed products that are no longer on the sheet.

Then:

- `stripe.accounts.retrieve()` — warn if not FILTER HERO live.
- Write `shared/stripe-catalog.json`:

```json
{
  "syncedAt": "ISO-8601",
  "account": "acct_…",
  "livemode": false,
  "count": 293,
  "products": { "42": "prod_fh_42" }
}
```

`mappedStripeProductId(productId, livemode)` returns nothing when `file.livemode !== current key mode`. A test sync cannot attach to a live Checkout Session.

Checkout (`server/stripe.ts` `existingCatalogProductId`) tries `prod_fh_{id}` then the mapping. Cache is in-process. Missing catalog SKU is not a hard fail — the line falls back to inline `product_data`.

**Checkout still does not use the stored Price.** Pack qty 2 / 4 / 6 / 12 have different unit amounts (`unitPriceForQty`). The session always sends `price_data.unit_amount`. The synced Product is the SKU handle for tax, invoices, and QBO.

```ts
line_items.push({
  quantity: item.quantity,
  price_data: {
    currency: "usd",
    unit_amount: Math.round(unit * 100),
    tax_behavior: "exclusive",
    ...(catalogProductId
      ? { product: catalogProductId }
      : { product_data: { name, description, tax_code, metadata } }),
  },
});
```

### 5.2 Klaviyo — `syncKlaviyoCatalog()`

Waits for in-flight bulk jobs (create / update / delete), up to 30s.

Builds `buildKlaviyoCatalog(https://filterhero.net)`:

```
id, title, link, description, image_link, price, inventory_quantity, categories
```

`$schema` is JSON Schema draft-07. `inStock` true → inventory 999, else 0. Link is the PDP with `?merv=`. Image is the pack shot on the canonical origin. Wholesale cost is not a field.

Then:

1. Page `/api/catalog-items?page[size]=100` (cap 40 pages).
2. Diff by `external_id`.
3. Bulk jobs in chunks of 100. Wait until status is not `processing` (120s budget per wait).
4. Throttle retry: sleep 1.5s and GET again.

Klaviyo item ids are `$custom:::$default:::{externalId}`.

Public JSON feed (what a later feed pull would import):

```
GET /api/klaviyo/catalog.json
```

Local: `http://127.0.0.1:3001/api/klaviyo/catalog.json`. Live must be 293 (FH-300). `pnpm smoke` fails if local is not 293.

Do not point Klaviyo’s custom catalog **source URL** at the live JSON feed while production is the 299 mix.

### 5.3 Supabase — `syncSupabaseCatalog()`

Migration `supabase/migrations/0005_catalog_skus.sql` (FH-223):

```sql
create table if not exists catalog_skus (
  product_id integer primary key,
  size text not null,
  merv integer not null,
  is_carbon boolean not null default false,
  name text not null,
  wholesale_sku text not null,
  list_price numeric(10, 2) not null,
  in_stock boolean not null default true,
  stripe_product_id text,
  klaviyo_external_id text not null,
  updated_at timestamptz not null default now(),
  constraint catalog_skus_merv_check check (merv in (8, 11, 13))
);
```

RLS on + forced. `anon` / `authenticated` / `public` revoked. Staff SQL uses the service role. **No cost column.**

Upsert on `product_id`. Delete rows whose `product_id` is no longer on the sheet. `stripe_product_id` is the mapping if livemode matches, else `prod_fh_{id}`.

This table is a mirror for CRM / accounts queries. The shopper PDP never reads it. Browser never queries Postgres (see the Supabase full build).

---

## 6. Books — Stripe charges, QuickBooks records

Short map: [STRIPE-BOOKS.md](./STRIPE-BOOKS.md). This section is the install of that map in code.

### 6.1 The law (do not invert it)

| Do | Do not |
|---|---|
| Collect payment on Stripe Checkout | Move payment into QuickBooks or an ERP |
| Calculate sales tax on the hosted page with **Stripe Tax** when Tax Settings are `active` | Let QBO Automated Sales Tax recalculate the same sale |
| Create a Stripe Customer + Invoice so the connector has someone to attach | Drop `invoice_creation` or `customer_creation` |
| Record Filter King dealer invoices as QBO Bills (AP / COGS) | Put wholesale on Stripe |
| Treat `orders.json`, Klaviyo, and Resend as packing / marketing / receipts | Treat them as the ledger |

Stripe Tax bills a tax-calculation fee on completed **live** Checkouts and finalized invoices. That is accepted as of FH-251 (which **supersedes** FH-211). FH-211 had turned `automatic_tax` off so QBO AST could own tax; shoppers then paid $0 tax. Do not revive FH-211.

### 6.2 Tax gate in code

`shared/stripe-tax.ts`:

| Constant | Value | Use |
|---|---|---|
| `TANGIBLE_GOODS_TAX_CODE` | `txcd_99999999` | Filters. Overridable with `STRIPE_TAX_CODE`. |
| `SHIPPING_TAX_CODE` | `txcd_92010001` | Checkout `shipping_options`. |

```ts
shouldEnableAutomaticTax(status) === (status === "active")
```

`createCheckoutSession` calls `readStripeTaxReadiness(stripe)` then:

```ts
automatic_tax: { enabled: tax.automaticTax }
```

If settings are `pending` (no head office), tax stays **off**. Forcing `true` 400s every cart: “You must have a valid head office address…” (FH-139).

If settings are `active` but there is no **active registration** for the ship-to state, Stripe charges **$0 tax and does not error**. Staff `/admin/settings` shows head office, automatic tax, and collecting registrations. `pnpm verify:stripe-books` on FILTER HERO live asserts head office + at least one active registration.

Dashboard work (not code):

1. [Tax settings](https://dashboard.stripe.com/settings/tax) — set a head office so status is `active`. Defaults stay exclusive + `txcd_99999999`. `ensureStripeTaxDefaults()` will patch exclusive + that code if they drifted.
2. [Tax registrations](https://dashboard.stripe.com/tax/registrations) — each state you are **already** registered to collect. A Stripe row does not register you with the state.
3. Tax → Integrations automatic collection on invoices and Payment Links can stay **off**. Shop Checkout sets `automatic_tax` itself.

Catalog prices stay exclusive. The hosted page adds tax after the shopper enters a US shipping address in a registered state.

### 6.3 Checkout session — books-facing fields

`server/stripe.ts` `createCheckoutSession`:

| Field | Why books needs it |
|---|---|
| `shipping_address_collection.allowed_countries: ["US"]` | FH-120. Tax needs a ship-to. Packing needs an address. |
| `shipping_options` $0, `display_name: "Shipping"`, `txcd_92010001` | Checkout requires a rate when address collection is on. Label is Shipping, not Free shipping (FH-253). Stripe still prints **Free** next to $0 (FH-254, open). |
| `phone_number_collection` | Packing. |
| `invoice_creation.enabled` | Stripe Connector attaches the sale. |
| `automatic_tax` | FH-251 / FH-139 gate. |
| Reused `customer` + `customer_update` | FH-204. Repeat email must not mint a second Customer. |
| Else `customer_creation: "always"` | First-time email. Never pass both `customer` and `customer_email`. |
| `metadata.items` ≤ 490 chars | Stripe 500-char cap. `compactItemsMeta` truncates to 8 lines if needed. |

Line items: exclusive `tax_behavior`, attach synced Product when present.

### 6.4 Fulfillment is not the ledger, but the connector reads Stripe

Shop webhook: `https://filterhero.net/api/stripe/webhook` on FILTER HERO **live** only. Events: `checkout.session.completed`, `checkout.session.expired`. Local: `stripe listen`. Sandbox must not host that URL (FH-294).

On completed:

1. Dedupe by `sessionId` (FH-123).
2. Persist `orderFromCheckoutSession`: subtotal, **tax**, total, customer id, invoice id, payment intent, shipping, phone, items JSON. Path is `dataFile("orders.json")` — never `__dirname` (FH-122).
3. Side effects (each fail-soft): Klaviyo Placed Order, Resend confirmation, `recordPurchaseOnAccount`, `closeDealsOnPurchase`.

Klaviyo’s **native** Stripe app is a second webhook (`https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ`) on FILTER HERO only, charge/invoice events, **not** `checkout.session.completed`. Successfully Paid must not trigger welcome / abandon / replenish / a receipt.

QBO never sees `orders.json`. The Stripe Connector reads Stripe Charges / Invoices / Payouts / fees.

### 6.5 QuickBooks Online + Stripe Connector (Dashboard)

1. Create QBO (Simple Start is enough).
2. Chart of accounts: **Stripe Clearing** (Bank), **Stripe fees** (Expense), **Sales tax payable** (Liability), **Filter sales** (Income), **Inventory / COGS**, **Filter King** (Accounts payable).
3. App store: **Stripe Connector by QuickBooks** (free). Same Stripe account as `STRIPE_SECRET_KEY`.
4. Map: charges → Filter sales; **Stripe Tax line → Sales tax payable**; fees → Stripe fees; payouts → transfer Stripe Clearing → checking. If fees/payouts do not match the bank, switch to Acodei.
5. Connect the **real bank**. Match Stripe payout deposits to Clearing transfers.

Filter King bills never hit Stripe. In QBO: Supplier **Filter King LLC**, enter each dealer invoice as a Bill, pay from checking. That is COGS / inventory.

### 6.6 Intuit OAuth — staff Connect, not checkout

This is a QBO **app** so staff can Connect from `/admin/settings`. It is **not** a replacement for the Stripe Connector and it does **not** collect payment.

Routes:

| Method | Path | Gate |
|---|---|---|
| POST | `/api/admin/intuit/connect` | Staff. Returns authorize URL, sets CSRF cookie `fh_intuit_oauth_state`. |
| GET | `/api/admin/intuit/status` | Staff. |
| POST | `/api/admin/intuit/disconnect` | Staff. Revokes refresh when possible. |
| GET | `/api/intuit/oauth/callback` | Public Intuit redirect. CSRF `state` required. 302 → `/admin/settings?intuit=…`. |

Scopes: `com.intuit.quickbooks.accounting openid profile email` (`shared/intuit-oauth.ts`).

Questionnaire item 6 (FH-224) — this app answers **Yes**:

| Case | Behavior |
|---|---|
| Expired access token (~60 min) | On local expiry or QBO `401`, refresh once with the latest refresh token and retry. |
| Expired refresh token (~100 days unused) | Do not call Intuit. Clear tokens. Staff Connects again. |
| `invalid_grant` | Stop retrying. Mark reconnect. Never reuse a rotated refresh token. |
| CSRF | 32-byte `state`, stored 10 minutes + HttpOnly cookie. Callback rejects missing / mismatched / stale / replayed `state` and never exchanges the code. |

Production keys cannot use localhost (FH-226). Live Connect was sandbox-only until Railway got Production keys + `/api/intuit` (FH-227). Tokens persist in `server/data/intuit-oauth.json` (gitignored); on Railway that is `DATA_DIR=/data`. Always persist the **new** refresh token Intuit returns.

`pnpm setup:intuit-live` copies `INTUIT_PRODUCTION_CLIENT_ID` / `SECRET` onto Railway as `INTUIT_CLIENT_ID` / `SECRET`, sets `INTUIT_ENVIRONMENT=production`, uses the production redirect URI.

Settings Connect must not throw into the generic 500 page (FH-225) — `defaultState()` needs the `randomBytes` import.

### 6.7 `pnpm verify:stripe-books`

Offline asserts, then a live ping when `STRIPE_SECRET_KEY` is set:

- Default tax code is tangible goods; shipping code is `txcd_92010001`.
- `automatic_tax` on only when settings status is `active`.
- Compacted 40-line cart metadata ≤ 490 chars.
- `orderFromCheckoutSession` copies tax cents, customer, invoice, payment intent.
- Live FILTER HERO: head office ready, automatic tax on, at least one collecting registration, no sandbox conflict webhooks.
- Sandbox: pending Tax Settings are expected.

---

## 7. SEO — two writers, one document

There is **no Next.js Metadata API**. There is one HTML file (`client/index.html`) and two writers that must agree.

### 7.1 First paint (crawlers)

`server/index.ts` `sendDocument`:

1. Read `index.html` (prod: `dist/public/index.html`; dev: `client/index.html`).
2. `resolveDocumentSeo(req.path, siteUrl)`.
3. `injectSeoIntoHtml(html, seo)`.
4. Send HTML.

Production serves `dist/public` with `index: false`, then the catch-all injects. Dev used to 404 size-page SSR because inject was prod-only; smoke fetches `:3001/sizes/20x25x1` for `jsonld-ssr` (FH-198). Vite on `:3000` does **not** inject JSON-LD — do not point crawler checks at Vite.

`injectSeoIntoHtml` (`shared/seo.ts`):

- Replaces `<title>`, description, robots, og:title/description/url/type, twitter title/description, canonical.
- `og:type` is `product` \| `article` \| `website` from `DocumentSeo.type`.
- Robots: `noindex, nofollow` or `index, follow, max-image-preview:large`.
- JSON-LD: one `<script type="application/ld+json" id="jsonld-ssr">`. Payload is a single node or an array. `<` is escaped as `\u003c` so `</script>` cannot break out (FH-194).

### 7.2 SPA navigations (shoppers)

Every public page calls `useSeo` (`client/src/hooks/useSeo.ts`).

| Page | SEO helper | `type` |
|---|---|---|
| `Home.tsx` | `homeSeo` | website |
| `SizeBrowse.tsx` All sizes | `allSizesSeo` | website |
| `SizeBrowse.tsx` thickness | `thicknessSeo` | website |
| `SizeDetail.tsx` | `sizeSeo` | product (noindex if off-catalog) |
| `BrandBrowse.tsx` index | `allBrandsSeo` | website |
| `BrandBrowse.tsx` brand | `brandSeo` | website (noindex if unknown) |
| `CustomAirFilters.tsx` | `customAirFiltersSeo` | website |
| `FilterChangeGuide.tsx` | `filterChangeGuideSeo` | **article** (FH-129) |
| Checkout success/cancel | inline | website, **noindex** |
| Login / account | inline | website, **noindex** |
| `NotFound.tsx` | inline | website, **noindex** |
| `/admin/*` | `AdminShell` sets `robots=noindex,nofollow` | SSR also noindex |

`useSeo`:

- Origin: `VITE_SITE_URL`, else `window.location.origin` when not localhost, else `https://filterhero.net`.
- Writes title, description, robots, canonical, OG, Twitter, `link[rel=alternate]` → `/llms.txt`.
- **Removes `#jsonld-ssr`**, then writes `#jsonld-page`. The client block replaces the server block so they cannot double.
- `og:type=article` must survive client nav (FH-129). Mapping only `product` vs everything-else-as-website brings that back.

Inner pages must pass `{ path, name }` into `buildSpeakableSchema` the same way `resolveDocumentSeo` does. As of FH-307 that third argument is missing on Size, Custom, Change Guide, and Brand after SPA nav, so speakable `WebPage.url` falls back to `/`. Crawler first paint is still correct.

### 7.3 `resolveDocumentSeo` — the route table

Canonical origin helper:

```ts
export const DEFAULT_SITE_URL = "https://filterhero.net";
export function siteOrigin(): string {
  return (process.env.SITE_URL || process.env.VITE_SITE_URL || process.env.CLIENT_URL || DEFAULT_SITE_URL)
    .replace(/\/$/, "");
}
```

| Path | Title pattern | JSON-LD |
|---|---|---|
| `/` | `Filter Hero \| Exact-Fit HVAC & Furnace Air Filters` | Organization, OnlineStore, WebSite (SearchAction → `/sizes/{search_term_string}`), FAQPage (`SITE_FAQS`), HowTo measure, Speakable, Breadcrumb |
| `/sizes` | All HVAC Air Filter Sizes | Breadcrumb + ItemList (cap 50) |
| `/filters/{d}-inch` | `{d}" Air Filters` | Breadcrumb + ItemList. Unknown depth → noindex |
| `/sizes/{slug}` | `{slug} Air Filter \| HVAC & Furnace` | Breadcrumb, fit FAQ, Speakable, Product+Offer (qty-1 live ticket). Unknown slug → noindex |
| `/brands` | Shop HVAC Filters by Brand | Breadcrumb |
| `/brands/{slug}` | `{name} Air Filters` | Breadcrumb. Unknown → noindex |
| `/custom-air-filters` | Custom Air Filters | Breadcrumb, `CUSTOM_FAQS`, Speakable |
| `/how-often-to-change-air-filter` | How Often to Change… | Breadcrumb, Article, HowTo change, `CHANGE_GUIDE_FAQS`, Speakable. `og:type=article` |
| `/admin`, `/login`, `/account`, `/checkout*` | staff / account / checkout | **noindex**, empty jsonLd |
| anything else | Page not found | **noindex** |

Product Offer fields today: `price`, `priceCurrency`, `availability=InStock`, `itemCondition=NewCondition`, `seller`. **No** `OfferShippingDetails` (removed FH-253 — must not advertise a $0 shipping offer). **No** `MerchantReturnPolicy` / `merchantReturnDays: 30` (removed FH-282). FH-194 added both; later tickets took them out. `pnpm verify:json` and `pnpm smoke` assert they stay gone. Speakable URL on SSR size pages must still be the size URL, not `/` (the part of FH-194 that remains).

Size Product `image` is `packShotSrc(merv, isCarbon)` — branded Filter Hero packs, not Filter King lockups (FH-239–FH-243).

### 7.4 Copy that SEO must share with the shop

These strings are the AEO / assistant surface. Changing a FAQ in a component local without changing `shared/seo.ts` (and often `server/data/site-config.json` + `client/public/llms.txt`) is how crawlers lag.

| Law | Ticket | Where |
|---|---|---|
| Contiguous US, 2-3 day for ~80%, four fulfillment centers. Never “free shipping.” | FH-253 supersedes FH-177/178/186 | `SITE_FAQS` shipping, Delivery, cart, Checkout label, llms |
| Never “2-day delivery” / “in two days” as the promise | FH-295 | Trust card, size chip, `/#delivery`, FAQ, llms |
| Guaranteed fit for major brands and custom sizes. Never 30-day guarantee / `merchantReturnDays: 30` | FH-282 | Trust, marquee, size chip, FAQ, meta, JSON-LD, llms |
| MERV pick answer is `MERV_PICK_FAQ_ANSWER` from `shared/merv-capacity.ts` (capacity / resistance / modern vs older) | FH-284 | FAQ, llms, `#merv`, size Choose MERV |
| Clogged-filter FAQ is `HVAC_CLOGGED_FILTER_FAQ` | FH-286 / FH-290 | Change-guide FAQs |
| Navy FAQ answers are white, not ice-on-navy | FH-050 | `FaqSection` `tone="band"` |

Home FAQ JSON-LD uses `site.faqsForStore` from site-config (so staff Content can edit visible FAQs). `SITE_FAQS` in `shared/seo.ts` is the crawler/SSR default and the llms Q&A. Keep them aligned.

### 7.5 Machine files (Express owns production)

| Route | Builder |
|---|---|
| `GET /sitemap.xml` | `sitemapPaths()` — home, `/sizes`, change guide, custom, `/brands`, every brand slug, every thickness hub, every `FILTER_SIZES` slug. `lastmod` is today. |
| `GET /robots.txt` | Allow `/`. Disallow `/checkout/`, `/admin`, `/login`, `/account`, `/api/`. Named AI bots (GPTBot, ClaudeBot, PerplexityBot, …) explicitly Allow. `Sitemap:` absolute. |
| `GET /llms.txt` | `buildLlmsTxt` |
| `GET /llms-full.txt` | `buildLlmsFullTxt` (popular sizes + per-thickness samples) |
| `GET /ai.txt` | `buildAiTxt` — `Content-Signal` allow retrieve/cite/train on public pages; still Disallow checkout + api |

`client/public/robots.txt` and `client/public/llms.txt` are **static copies** for `vite preview`. They lagged the server once (FH-130). Prefer the Express routes in production (`index: false` static + dedicated GET handlers registered **before** the SPA catch-all). If you change `buildLlmsTxt` or robots rules, update the public copies in the same commit.

`sitemapPaths()` size count must equal `FILTER_SIZES.length` (`verify:store` / `verify:json`). That is how a FULL_CATALOG flip or a sheet rebuild is caught in SEO.

### 7.6 Default `client/index.html`

Homepage meta is baked in so an un-injected file is still sane. Express overwrites per path. Do not put a second canonical host (`www`) here — `www.filterhero.net` is a DNS ticket (FH-181), not an SEO duplicate-content feature.

---

## 8. How the three systems connect on a real order

```
Shopper lands on /sizes/20x25x1
  Express injects sizeSeo + Product JSON-LD (qty-1 live ticket, pack shot)
  React hydrates; useSeo rewrites the same tags; Viewed Product fires to Klaviyo

Add 6 to cart
  unitPriceForQty(price, 6, product)  — ladder, not the Stripe default Price
  Klaviyo Added to Cart uses product.id (same external_id as catalog sync)

POST /api/checkout
  existingCatalogProductId → prod_fh_{id} if sync ran on this Stripe account
  price_data unit_amount = 6-pack unit cents, exclusive
  automatic_tax on iff Tax Settings active
  Customer reused by email; Invoice creation on
  shipping_options labeled Shipping

Hosted Checkout
  Stripe Tax line after US ship-to in a registered state
  Shopper pays; Stripe sends the payment receipt

checkout.session.completed → /api/stripe/webhook
  orders.json (tax + customer + invoice)     packing, not books
  Klaviyo Placed Order / Ordered Product     marketing (catalog item id)
  Resend branded confirmation                receipt (not Klaviyo)
  recordPurchaseOnAccount                    saved filters must be sheet SKUs
  closeDealsOnPurchase                       CRM

Stripe Connector (QBO)
  Charge → Filter sales
  Stripe Tax line → Sales tax payable
  Fees → Stripe fees
  Payout → Stripe Clearing → bank
```

If `pnpm sync:catalog` was never run on this Stripe account, Checkout still works (inline `product_data`). QBO then sees ad-hoc product names instead of `prod_fh_*`. Run sync before go-live.

If Railway `FULL_CATALOG=true` ships, the shop, sitemap, JSON-LD ItemLists, and `/api/klaviyo/catalog.json` all swell to the archive together — that is the FH-303 blast radius.

---

## 9. Staff surfaces

| Screen | What it shows |
|---|---|
| `/admin` → Products | `catalogSnapshot`: 293 SKUs, 153 sizes, archive size count, Sheet/Full mode, featured slugs, search. Footer: “Stripe / Klaviyo / Supabase update with `pnpm sync:catalog`.” |
| `/admin/settings` | Stripe Tax: head office, automatic tax, collecting registrations. QuickBooks Online: Connect / Connect again / Disconnect. Copy: QBO should record tax Stripe already collected; do not let AST recalculate. |
| `/admin/content` | Featured sizes + FAQ copy that Home JSON-LD may read via `faqsForStore`. |

The staff gate in `AdminShell` is convenience. Real authorization is `requireStaff` on `/api/admin`, `/api/crm`, `/api/intuit` admin routes. `/admin` is noindex in SSR **and** `robots.txt`.

---

## 10. How to change these systems the Filter Hero way

### New size × MERV on the Model Pricing XLS

CSV → `build-sellable-skus.ts` → `verify:store` → `sync:catalog`. No new React page. Sitemap and size JSON-LD pick it up because they iterate `FILTER_SIZES` / `firstSellableProduct`.

### New public URL

1. Page in `client/src/pages/` with `SiteHeader` + `CartDrawer` + `useSeo`.
2. Route in `App.tsx` **above** the catch-all.
3. Branch in `resolveDocumentSeo` with the same title/description/type/jsonLd.
4. If it should be indexed: add to `sitemapPaths()`. If not: `noindex: true` and a `Disallow` in robots if it is a whole prefix (`/checkout/`, `/admin`, `/account`).
5. Pass `{ path, name }` into `buildSpeakableSchema` on **both** writers.
6. `pnpm verify:json` and `pnpm smoke`.

### New FAQ answer

Put the canonical string in `shared/` (`seo.ts`, `merv-capacity.ts`, or `hvac-overdue-costs.ts`). Import it on the page, in `SITE_FAQS` / `CHANGE_GUIDE_FAQS` / `CUSTOM_FAQS`, in site-config if Home reads it, and in llms. `verify:store` should lock the phrase (FH-284 / FH-290).

### Tax / books

Do not hard-code `automatic_tax.enabled`. Do not force it on while settings are `pending`. Do not turn it off to “save the Stripe Tax fee” (FH-211 is superseded). Add Dashboard registrations; do not invent `txcd_` values.

### Catalog mirrors

Never put cost on a mirror. Never skip delete/archive for SKUs that left the sheet. Never let `setup:klaviyo` skip jobs because Klaviyo already has “enough” items.

---

## 11. Laws (the short list)

**Catalog**

- Shop list = `sellable-skus.json` when `FULL_CATALOG=false`. Archive stays in `filter-catalog.json`.
- Railway and `.env.example` must not flip `VITE_FULL_CATALOG=true` for the Model Pricing shop.
- `pnpm sync:catalog` after every sheet rebuild.
- Wholesale cost never on Stripe, Klaviyo, or `catalog_skus`.
- Checkout uses `price_data` for pack qty; synced Product is the handle.
- `stripe-catalog.json` livemode must match the secret key or the mapping is ignored.

**Books**

- Checkout on Stripe. Ledger in QBO. Connector maps Stripe Tax → Sales tax payable.
- `automatic_tax` follows Tax Settings `active`. Pending = off (FH-139). Active + no registration = $0 tax, no error.
- Customer reused by email (FH-204). Invoice always created.
- FILTER HERO live owns `filterhero.net` webhooks. Sandbox uses `stripe listen`.
- Intuit staff OAuth is optional QBO access, not a second payment rail. Production keys never from localhost.

**SEO**

- One module: `shared/seo.ts`. Two writers: Express inject + `useSeo`. They must emit the same type, canonical, and JSON-LD.
- Escape `<` in JSON-LD. Remove `#jsonld-ssr` when the client writes `#jsonld-page`.
- `og:type=article` on the change guide after SPA nav.
- Speakable `WebPage.url` is the current path, not `/`, on inner routes.
- No free-shipping claim, no `$0` OfferShippingDetails, no 30-day return schema, no “2-day” promise.
- Express `/robots.txt` and `/llms.txt` win over `client/public` copies.
- `/admin`, `/login`, `/account`, `/checkout` are noindex.

---

## 12. Issues and fixes — this area

Canonical write-up for every id is [ISSUES-AND-FIXES.md](ISSUES-AND-FIXES.md). This section is the books / SEO / catalog subset: open items in full, then the index, then the law tickets in full.

### 12.1 Open items (full)

#### FH-307 — SPA JSON-LD speakable URL falls back to the homepage

- **Status:** open
- **Area:** seo
- **Symptom:** Crawler HTML from `resolveDocumentSeo` sets speakable `WebPage.url` to the current size, custom, brand, or change-guide path (FH-194). After client navigation, `useSeo` removes `#jsonld-ssr` and replaces it with page JSON-LD that calls `buildSpeakableSchema(siteUrl, selectors)` with no `{ path, name }`, so the speakable page is `https://filterhero.net/` again.
- **Do NOT:** Point speakable `WebPage.url` at `/` on inner routes. Do not keep two JSON-LD graphs (SSR vs SPA) that disagree on `url`.
- **Do:** Pass `{ path, name }` into every `buildSpeakableSchema` call the same way `resolveDocumentSeo` does. Home may omit it only because the default path is `/`.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/pages/CustomAirFilters.tsx`, `client/src/pages/FilterChangeGuide.tsx`, `client/src/pages/BrandBrowse.tsx`, `shared/seo.ts`
- **Verify:** Open `/sizes/20x25x1`, then client-navigate from Home. Document `#jsonld-page` speakable URL is `https://filterhero.net/sizes/20x25x1`, not the homepage. `pnpm verify:json` still covers SSR.
- **Added:** 2026-09-20

#### FH-305 — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO

- **Status:** open
- **Area:** other
- **Symptom:** Live `filterhero.net` Checkout uses Railway `sk_test_` / `pk_test_` from **FILTER HERO sandbox** (`acct_1U9bqs790NnFGDLv`). Shop fulfillment and Klaviyo OAuth belong on live **FILTER HERO** (`acct_1U9bqlQEENEs0Qmw`). Real cards cannot pay. Local `.env` staying sandbox is correct.
- **Do NOT:** Copy local `STRIPE_SECRET_KEY` onto Railway. Do not point sandbox or FILTER HERO test-mode Dashboard endpoints at `https://filterhero.net/api/stripe/webhook`. Do not connect Klaviyo to sandbox.
- **Do:** Put FILTER HERO **live** `sk_live_` + `pk_live_` + `VITE_STRIPE_PUBLISHABLE_KEY` on Railway, then rebuild. Run `pnpm setup:stripe-webhook` against that live key. Keep local `.env` on sandbox + `stripe listen`.
- **Files:** `shared/stripe-accounts.ts`, `scripts/setup-stripe-webhook.ts`, README Production
- **Verify:** Railway `STRIPE_SECRET_KEY` starts with `sk_live_`. Dashboard → FILTER HERO live → Webhooks shows `https://filterhero.net/api/stripe/webhook` enabled. A live Checkout session is `livemode: true`.
- **Added:** 2026-09-20

#### FH-303 — Railway FULL_CATALOG=true conflicts with the Model Pricing shop

- **Status:** open
- **Area:** catalog
- **Symptom:** Local `.env` and `.env.example` are `FULL_CATALOG=false` / `VITE_FULL_CATALOG=false` (Model Pricing SKUs). Railway has both set to `true` (archived size universe). Live `GET /api/klaviyo/catalog.json` is still 299 because the 2026-09-17 CLI image baked the old allowlist. The next rebuild with current Railway vars would sell every archived size × MERV.
- **Do NOT:** Leave Railway `VITE_FULL_CATALOG=true`. Do not `railway up` to “fix” the feed while this branch is dirty.
- **Do:** `railway variable set FULL_CATALOG=false VITE_FULL_CATALOG=false --service FILTER-HERO --skip-deploys`, then rebuild from `main` so Vite bakes `false`.
- **Files:** `.env.example`, [2 CATALOG.md](./2%20CATALOG.md)
- **Verify:** `railway variable list --service FILTER-HERO` shows both flags `false`. After rebuild, live catalog.json is the Model Pricing allowlist, not the archive.
- **Added:** 2026-09-20

#### FH-300 — Production Klaviyo JSON feed still serves a 299-SKU mix

- **Status:** open
- **Area:** other
- **Symptom:** Local `GET /api/klaviyo/catalog.json` and the Klaviyo custom catalog are Model Pricing SKUs. Live `https://filterhero.net/api/klaviyo/catalog.json` still returns 299 items (88 ids not on the current sheet). Email product blocks use the API catalog, but a later feed pull from the live URL would re-import extras.
- **Do NOT:** Point Klaviyo’s custom catalog at the live JSON feed while production is on the old mix. Do not map those extras into Stripe or `catalog_skus`.
- **Do:** Deploy the current shop so the public feed is 293. `pnpm smoke` fails if local catalog.json is not 293.
- **Files:** `scripts/smoke-site.ts`, `server/klaviyo.ts`
- **Verify:** Local `/api/klaviyo/catalog.json` is 293. After deploy, live feed is 293. `pnpm inspect:klaviyo` catalogItemCount stays 293.
- **Added:** 2026-09-20

#### FH-254 — Stripe Checkout still prints Free next to a $0 shipping option

- **Status:** open
- **Area:** cart
- **Symptom:** Shop copy no longer says free shipping (FH-253). Hosted Checkout still shows the rate as **Shipping** with price **Free**, because `shipping_options` is a `$0` fixed amount. Stripe labels a zero-dollar shipping rate Free.
- **Do NOT:** Put “Free shipping” back in `display_name`. Do not invent a freight charge. Do not drop `shipping_options` while `shipping_address_collection` is on — Checkout requires a rate.
- **Do:** Keep the option labeled Shipping. To stop Stripe from printing Free, set a paid `fixed_amount` once freight is known.
- **Files:** `server/stripe.ts`, `scripts/debug-stripe-checkout.ts`, `scripts/click-ui.ts`
- **Verify:** Start checkout from the cart. Order summary: Shipping / Free. Cart drawer: Shipping At checkout.
- **Added:** 2026-09-18

#### FH-227 — QuickBooks Connect was sandbox-only

- **Status:** mitigated
- **Area:** other
- **Symptom:** Local OAuth reached Sandbox Company US d6fd. `filterhero.net` had no `/api/intuit` routes and no Intuit env, so live books could not connect.
- **Do NOT:** Connect Production keys from localhost. Do not put Intuit secrets in `VITE_` vars.
- **Do:** Railway `INTUIT_CLIENT_ID` / `SECRET` are the Production keys, `INTUIT_ENVIRONMENT=production`, `INTUIT_REDIRECT_URI=https://filterhero.net/api/intuit/oauth/callback`. Persist tokens in `DATA_DIR=/data`. Staff Connect on `https://filterhero.net/admin/settings`. Local `.env` stays Development / sandbox.
- **Files:** `scripts/setup-intuit-live.ts`, `server/intuit/`, `shared/intuit-oauth.ts`, `client/src/pages/admin/Settings.tsx`
- **Verify:** Live callback `GET /api/intuit/oauth/callback` 302s to `/admin/settings?intuit=csrf` (not SPA HTML). Intuit Production Redirect URIs lists that callback. Staff Settings → Connect authorizes the real company.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

### 12.2 Index — every books / SEO / catalog ticket

Status is as logged. **Superseded** means a later ticket reversed the Do-line; keep the history, follow the later id.

| Id | Status | Area | Title |
|---|---|---|---|
| FH-043 | mitigated | catalog | Shop listed SKUs with no wholesale cost (299-SKU ancestor of FH-217) |
| FH-050 | mitigated | seo | Navy FAQ answers were too close to the background |
| FH-120 | mitigated | other | Stripe Checkout did not collect a shipping address |
| FH-122 | mitigated | other | Production leads and orders wrote into `dist/data` |
| FH-123 | mitigated | other | Stripe webhook wrote duplicate orders on retry |
| FH-129 | mitigated | seo | SPA navigation dropped `og:type=article` |
| FH-130 | mitigated | seo | Stale public robots.txt and llms.txt lagged the server |
| FH-132 | mitigated | cart | Checkout collected no sales tax and no Stripe customer |
| FH-133 | mitigated | catalog | Full Filter King catalog stayed behind a hardcoded `SELLABLE_ONLY` |
| FH-139 | mitigated | cart | Checkout 400 when Stripe Tax had no head office |
| FH-177 | fixed | seo | FAQ said free shipping only over $50 → **superseded by FH-253** |
| FH-178 | fixed | seo | Free shipping was missing on delivery, cart, and checkout → **superseded by FH-253** |
| FH-181 | mitigated | seo | www.filterhero.net does not load the shop |
| FH-184 | mitigated | seo | Recheck: apex shop is live; NS and www are not unanimous |
| FH-185 | mitigated | seo | Debug: apex 100%; www default and live $50 FAQ are not |
| FH-186 | fixed | seo | Live FAQ and crawler copy still said shipping over $50 → **superseded by FH-253** |
| FH-194 | fixed | seo | Size JSON-LD spoke as the homepage and omitted Offer fields (speakable URL remains; $0 shipping / 30-day return later removed) |
| FH-195 | fixed | catalog | Filter King `n` size keys in live-price JSON never matched the catalog |
| FH-198 | fixed | seo | Local API 404ed size-page SSR that smoke now requires |
| FH-203 | fixed | other | Stripe Dashboard had no fulfillment webhook |
| FH-204 | fixed | other | Checkout created a new Stripe Customer on every email |
| FH-211 | fixed | other | Stripe Tax was calculating at Checkout → **superseded by FH-251** (tax is on again) |
| FH-217 | fixed | catalog | Shop sold the archive instead of the Model Pricing list |
| FH-223 | fixed | catalog | Stripe, Klaviyo, CRM, and accounts still had the old catalog |
| FH-224 | fixed | other | Intuit OAuth questionnaire item 6 was not implemented |
| FH-225 | fixed | other | Settings Connect crashed with Something went wrong |
| FH-226 | mitigated | other | Intuit rejected Filter Hero redirect_uri |
| FH-227 | mitigated | other | QuickBooks Connect was sandbox-only |
| FH-251 | fixed | cart | Checkout collected no sales tax (Stripe Tax was off). Supersedes FH-211 |
| FH-253 | fixed | cart | Free shipping was still promised on the shop. Supersedes FH-177/178/186 |
| FH-254 | open | cart | Stripe Checkout still prints Free next to a $0 shipping option |
| FH-282 | fixed | other | Shop still promised a 30-day guarantee (schema + copy) |
| FH-284 | fixed | other | MERV pick copy skipped capacity / resistance |
| FH-286 | fixed | other | Overdue-filter costs were vague buckets, not named repairs |
| FH-290 | fixed | other | Verify overdue-cost + how-to invariants in store checks |
| FH-294 | fixed | other | Sandbox Stripe webhooks impersonated live FILTER HERO |
| FH-295 | fixed | other | Delivery promise said 2-day instead of 2-3 day |
| FH-300 | open | other | Production Klaviyo JSON feed still serves a 299-SKU mix |
| FH-303 | open | catalog | Railway FULL_CATALOG=true conflicts with the Model Pricing shop |
| FH-305 | open | other | Railway Stripe keys are sandbox test, not live FILTER HERO |
| FH-307 | open | seo | SPA JSON-LD speakable URL falls back to the homepage |

Pack-shot tickets that feed Product `image` / Klaviyo `image_link` (not duplicated in full here): FH-044–FH-049, FH-239–FH-243.

DNS / www that affect canonical `filterhero.net`: FH-181, FH-184, FH-185. Zone creation: FH-183.

### 12.3 Law tickets (full) — catalog

#### FH-217 — Shop sold the archive instead of the Model Pricing list

- **Status:** fixed
- **Area:** catalog \| pricing
- **Symptom:** Storefront listed the 9,000+ archived Filter King sizes. The Model Pricing XLS is the product list and the wholesale cost source.
- **Do NOT:** Hardcode `SELLABLE_ONLY = false`. Do not drop carbon rows from `sellable-skus.json`. Do not delete `shared/filter-catalog.json`. Do not import `fk-contractor-commerce.csv`.
- **Do:** Import `E:\FILTER HEROE\IMPORTANT PAPERS\Model Pricing - Contractor Commerce.xlsx` (shop copy: `shared/pricing/model-pricing.csv`) with `scripts/build-sellable-skus.ts`. Shop = that allowlist when `VITE_FULL_CATALOG=false`. Carbon on the sheet is sellable. Off-list sizes stay in the archive and route to quote. Shopper tickets stay Filtrete (`shared/pricing/engine.ts`).
- **Files:** `shared/pricing/model-pricing.csv`, `shared/sellable-skus.json`, `scripts/build-sellable-skus.ts`, `shared/products.ts`, [2 CATALOG.md](./2%20CATALOG.md), `.env`, `.env.example`
- **Verify:** `pnpm verify:store`. `pnpm verify:json`. `/sizes` shows Model Pricing sizes. `/sizes/20x25x1` offers MERV 8, Carbon, 11, and 13. `/sizes/14x25x1` offers MERV 8 only.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

#### FH-223 — Stripe, Klaviyo, CRM, and accounts still had the old catalog

- **Status:** fixed
- **Area:** catalog \| pricing
- **Symptom:** FH-217 restricted the shop to Model Pricing SKUs, but Stripe had no Product catalog (Checkout used ad-hoc `price_data`), Klaviyo `setup:klaviyo` skipped catalog jobs when the old feed was larger, Supabase had no SKU table, and `/account` would pin off-sheet sizes.
- **Do NOT:** Skip `pnpm sync:catalog` after a sheet rebuild. Do not put wholesale cost on Stripe Products, Klaviyo items, or `catalog_skus`. Do not let `setup:klaviyo` skip when existing catalog count ≥ sheet count.
- **Do:** `scripts/sync-catalog.ts` upserts Stripe Products (`prod_fh_{id}`), Klaviyo custom-catalog items (create / update / delete), and `catalog_skus`. Checkout attaches the synced Product when it exists and still uses qty-tier `price_data`. Saved filters must be in-stock sheet SKUs.
- **Files:** `scripts/sync-catalog.ts`, `scripts/lib/catalog-sync.ts`, `shared/stripe-catalog.ts`, `shared/products.ts`, `server/stripe.ts`, `server/account.ts`, `supabase/migrations/0005_catalog_skus.sql`, `scripts/setup-klaviyo-account.ts`
- **Verify:** `pnpm sync:catalog`. `pnpm verify:store`. `pnpm verify:klaviyo`. `pnpm verify:supabase`. Admin `/admin` catalog shows Model Pricing SKUs. Stripe Dashboard → Products is the Model Pricing list.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

#### FH-133 — Full Filter King catalog stayed behind a code flag the .env did not read

- **Status:** mitigated
- **Area:** catalog
- **Symptom:** `.env` already had `VITE_FULL_CATALOG=true`, but the shop still sold only the wholesale-sheet SKUs. `SELLABLE_ONLY` was hardcoded `true`.
- **Do NOT:** Hardcode `SELLABLE_ONLY = true`. Do not ignore `VITE_FULL_CATALOG` / `FULL_CATALOG`. Do not delete `shared/filter-catalog.json` or `shared/sellable-skus.json`.
- **Do:** `VITE_FULL_CATALOG=true` (and `FULL_CATALOG=true` for the API) sells every archived size × MERV, including carbon. `false` restores the Model Pricing allowlist. Checkout still refuses `inStock: false`.
- **Files:** `shared/products.ts`, `.env.example`, `scripts/verify-store.ts`, `shared/seo.ts`, `client/public/llms.txt`, [2 CATALOG.md](./2%20CATALOG.md)
- **Added:** 2026-09-01

### 12.4 Law tickets (full) — books

#### FH-251 — Checkout collected no sales tax (Stripe Tax was off)

- **Status:** fixed
- **Area:** cart
- **Symptom:** Hosted Checkout charged the exclusive catalog price. `automatic_tax` was hard-off (FH-211) so QuickBooks could only book tax after the charge. Shoppers never paid sales tax.
- **Do NOT:** Hard-code `automatic_tax.enabled=false`. Do not force it on while Tax Settings are `pending` (FH-139 400). Do not let QBO Automated Sales Tax recalculate a sale Stripe already taxed. Do not invent a `txcd_` — filters stay `txcd_99999999`, shipping `txcd_92010001`.
- **Do:** Enable `automatic_tax` when Tax Settings are `active`. Keep Customer + Invoice + exclusive prices. Add Dashboard registrations for each state already registered to collect. Staff `/admin/settings` shows head office, automatic tax, and collecting registrations.
- **Files:** `server/stripe.ts`, `shared/stripe-tax.ts`, `server/admin/routes.ts`, `client/src/pages/admin/Settings.tsx`, `scripts/debug-stripe-checkout.ts`, `scripts/verify-stripe-books.ts`, `docs/STRIPE-BOOKS.md`, `README.md`
- **Verify:** `pnpm verify:stripe-books`. `pnpm debug:stripe-checkout` — session `automatic_tax.enabled` is true once Tax Settings are active. Start checkout, enter a ship-to in a registered state, confirm the Tax line before pay.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17
- **Supersedes:** FH-211

#### FH-139 — Checkout 400 when Stripe Tax had no head office

- **Status:** mitigated
- **Area:** cart
- **Symptom:** `checkout.sessions.create` with `automatic_tax.enabled=true` returned 400: “You must have a valid head office address to enable automatic tax calculation.” Cart checkout failed for every shopper.
- **Do NOT:** Force `automatic_tax.enabled=true` while Tax Settings `status` is `pending`.
- **Do:** Read Tax Settings first. Enable automatic tax only when status is `active`. Checkout still creates Customer + Invoice. After the Dashboard head office is set, the next session turns tax on with no deploy.
- **Files:** `server/stripe.ts`, `scripts/debug-stripe-checkout.ts`, `docs/STRIPE-BOOKS.md`
- **Verify:** `pnpm exec tsx scripts/debug-stripe-checkout.ts` — session creates; `automatic_tax` is off until head office exists.
- **Added:** 2026-09-01

#### FH-132 — Checkout collected no sales tax and no Stripe customer

- **Status:** mitigated
- **Area:** cart
- **Symptom:** Payment-mode Checkout had line items and a US address but no `automatic_tax`, no product tax code, and no Customer/Invoice. QBO/Stripe Connector had nothing to attach; catalog prices never grew tax.
- **Do NOT:** Drop `customer_creation: "always"`, `invoice_creation`, exclusive `tax_behavior`, or `txcd_99999999` on filter line items. Do not invent a different `txcd_` without Stripe’s tax-code list. Do not force `automatic_tax` on while Tax Settings are pending (FH-139).
- **Do:** Enable `automatic_tax` when Tax Settings are `active`. Persist subtotal/tax/customer/invoice/payment_intent on `orders.json`. Head office + registrations still happen in the Dashboard.
- **Files:** `server/stripe.ts`, `shared/stripe-tax.ts`, `client/src/pages/CheckoutSuccess.tsx`, `docs/STRIPE-BOOKS.md`, `scripts/verify-stripe-books.ts`
- **Added:** 2026-09-01

#### FH-204 — Checkout created a new Stripe Customer on every email

- **Status:** fixed
- **Area:** other
- **Symptom:** `createCheckoutSession` always passed `customer_creation: always` + `customer_email`. A repeat buyer became a second Stripe Customer, so invoices and the QBO connector could not attach to one person.
- **Do NOT:** Pass both `customer` and `customer_email`. Do not skip `customer_update` when reusing a customer and collecting shipping.
- **Do:** Look up `customers.list({ email })`. Reuse that id with `customer_update` name/address/shipping `auto`. First-time emails still use `customer_creation: always`.
- **Files:** `server/stripe.ts`, `scripts/debug-stripe-checkout.ts`
- **Verify:** `pnpm debug:stripe-checkout` — reuse session customer id matches the existing customer.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

#### FH-224 — Intuit OAuth questionnaire item 6 was not implemented

- **Status:** fixed
- **Area:** other
- **Symptom:** The Intuit Developer form asks whether the app handles expired access tokens, expired refresh tokens, `invalid_grant`, and CSRF. Discovery URLs existed; none of those four cases did.
- **Do NOT:** Exchange an authorization `code` before matching `state`. Do not retry `invalid_grant`. Do not keep using a rotated refresh token. Do not put Intuit secrets in `VITE_` vars.
- **Do:** On QBO `401` or access expiry, refresh once and retry. On expired refresh or `invalid_grant`, clear tokens and require Connect again. Issue a one-shot `state`, reject mismatch/missing/stale/replay, and never hit the token endpoint on CSRF.
- **Files:** `shared/intuit-oauth.ts`, `server/intuit/oauth.ts`, `server/intuit/routes.ts`, `server/intuit/store.ts`, `client/src/pages/admin/Settings.tsx`, `scripts/verify-intuit-oauth.ts`, `docs/INTUIT-OAUTH.md`
- **Verify:** `pnpm verify:intuit-oauth`. Staff `/admin/settings` → QuickBooks Online → Connect. Bad callback `state` lands on `?intuit=csrf`.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

#### FH-226 — Intuit rejected Filter Hero redirect_uri

- **Status:** mitigated
- **Area:** other
- **Symptom:** Connect opened Intuit, then: “The redirect_uri query parameter value is invalid.” First keys were **Production**; localhost is not allowed on that set.
- **Do NOT:** Register `localhost:3000`, `https://localhost`, a trailing slash, or put localhost on **Production** keys. Do not Connect locally with production Client ID/Secret.
- **Do:** Local `.env` uses **Development** keys, `INTUIT_ENVIRONMENT=sandbox`, and `http://localhost:3001/api/intuit/oauth/callback` on Keys & OAuth → **Development**. Production keys stay for Railway + `https://filterhero.net/api/intuit/oauth/callback`.
- **Files:** `server/admin/data.ts`, `client/src/pages/admin/Settings.tsx`, `client/src/lib/admin-api.ts`
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

#### FH-225 — Settings Connect crashed with Something went wrong

- **Status:** fixed
- **Area:** other
- **Symptom:** Staff `/admin/settings` showed Client ID on, then Connect printed **Something went wrong.** and never opened Intuit.
- **Do NOT:** Remove `import { randomBytes } from "node:crypto"` from `server/intuit/oauth.ts`. Do not let Connect throw into the generic 500 handler.
- **Do:** `defaultState()` must call imported `randomBytes`. Connect catches throws and returns `intuit_connect_failed`.
- **Files:** `server/intuit/oauth.ts`, `server/admin/routes.ts`, `scripts/verify-intuit-oauth.ts`
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

#### FH-294 — Sandbox Stripe webhooks impersonated live FILTER HERO

- **Status:** fixed
- **Area:** other
- **Symptom:** Local sandbox had Dashboard endpoints to `https://filterhero.net/api/stripe/webhook` and the Klaviyo native URL. Test Checkout could POST signed sandbox events at production.
- **Do NOT:** Point sandbox or FILTER HERO test-mode endpoints at filterhero.net. Do not run `pnpm setup:klaviyo-stripe` against sandbox keys.
- **Do:** Shop fulfillment webhook only on FILTER HERO live. Local uses `stripe listen`. Native charge/invoice webhook only on FILTER HERO. `pnpm setup:stripe-webhook` scrubs the wrong endpoints. Handler ignores livemode/key mismatches. Invariant: `shared/stripe-accounts.ts`.
- **Files:** `shared/stripe-accounts.ts`, `server/stripe-webhooks.ts`, `server/stripe.ts`, `scripts/setup-stripe-webhook.ts`, `scripts/verify-stripe-books.ts`, `docs/STRIPE-BOOKS.md`
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

#### FH-123 — Stripe webhook wrote duplicate orders on retry

- **Status:** mitigated
- **Do NOT:** Push an order when that `sessionId` already exists.
- **Do:** Skip duplicates. Persist shipping + phone from the session.
- **Files:** `server/stripe.ts`
- **Added:** 2026-08-31

#### FH-120 — Stripe Checkout did not collect a shipping address

- **Status:** mitigated
- **Do NOT:** Create payment-mode sessions without `shipping_address_collection`.
- **Do:** Collect US shipping addresses and phone. Store them on the webhook order.
- **Files:** `server/stripe.ts`
- **Added:** 2026-08-31

### 12.5 Law tickets (full) — SEO

#### FH-194 — Size JSON-LD spoke as the homepage and omitted free-shipping Offer fields

- **Status:** fixed (partially superseded)
- **Area:** seo
- **Symptom:** `buildSpeakableSchema` always set `url` to `/`, so inner routes told Google the speakable WebPage was the homepage. Product Offers had price but no `shippingDetails` / return policy. JSON-LD did not escape `<`.
- **Still do:** Pass `{ path, name }` into `buildSpeakableSchema`. Escape `<` as `\u003c` in SSR and `useSeo`.
- **Later reversed:** `$0` `OfferShippingDetails` (FH-253) and `MerchantReturnPolicy` / 30-day returns (FH-282). Verify suites now **forbid** those nodes.
- **Files:** `shared/seo.ts`, `client/src/hooks/useSeo.ts`, `scripts/verify-json.ts`, `scripts/smoke-site.ts`
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

#### FH-253 — Free shipping was still promised on the shop

- **Status:** fixed
- **Area:** cart
- **Symptom:** Marquee, trust tiles, delivery copy, size-page chips, footer, cart, Stripe Checkout, FAQ, meta, JSON-LD, and `/llms.txt` all said free shipping.
- **Do NOT:** Put “free shipping” back on any shopper surface, including Stripe `display_name`, OfferShippingDetails `$0`, FAQ, or the FREE DELIVERY truck graphic.
- **Do:** Talk about 2-3 day delivery and contiguous-US fulfillment only. Cart says Shipping at checkout. Checkout shipping option is labeled Shipping. Size Offers omit a `$0` shipping rate.
- **Files:** `shared/seo.ts`, `client/index.html`, trust/delivery/cart components, `server/stripe.ts`, `docs/STRIPE-BOOKS.md`
- **Verify:** Homepage, `/#delivery`, `/sizes/20x25x1`, cart, `/custom-air-filters` FAQ. `pnpm verify:store`. `pnpm verify:json`.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-177, FH-178, FH-186

#### FH-282 — Shop still promised a 30-day guarantee

- **Status:** fixed
- **Area:** other
- **Symptom:** Why Filter Hero card, marquee, size-page chip, FAQ, meta, and `/llms.txt` said “30-day guarantee” with a refund-in-30-days line. JSON-LD advertised `merchantReturnDays: 30`.
- **Do NOT:** Put a 30-day guarantee or `merchantReturnDays: 30` back on any shopper surface.
- **Do:** Talk about a guaranteed fit for major brands and custom sizes. Omit MerchantReturnPolicy until a real policy is published.
- **Files:** Trust components, `shared/seo.ts`, `client/index.html`, `client/public/llms.txt`, `scripts/verify-store.ts`, `scripts/verify-json.ts`
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

#### FH-129 — SPA navigation dropped `og:type=article`

- **Status:** mitigated
- **Area:** seo
- **Symptom:** Filter Change Guide is an article in SSR, but client `useSeo` always set `og:type` to `website` unless the page was a product.
- **Do NOT:** Map only `product` vs everything-else-as-website.
- **Do:** Pass through `article` as `og:type=article`.
- **Files:** `client/src/hooks/useSeo.ts`
- **Verify:** `/how-often-to-change-air-filter` — document head `og:type` is `article`.
- **Added:** 2026-08-31

#### FH-130 — Stale public robots.txt and llms.txt lagged the server

- **Status:** mitigated
- **Area:** seo
- **Symptom:** `client/public/robots.txt` omitted AI crawler rules the Express route already allowed. Static `llms.txt` lagged live copy.
- **Do NOT:** Let the copied public files contradict `shared/seo.ts` / `server/index.ts`.
- **Do:** Keep static copies aligned with the server generators. Prefer the Express routes in production.
- **Files:** `client/public/robots.txt`, `client/public/llms.txt`, `server/index.ts`, `shared/seo.ts`
- **Added:** 2026-08-31

#### FH-198 — Local API 404ed size-page SSR that smoke now requires

- **Status:** fixed
- **Area:** seo
- **Symptom:** `pnpm smoke` fetched `http://127.0.0.1:3001/sizes/20x25x1` for crawler JSON-LD. Express only injected SEO HTML when `NODE_ENV=production`, so local returned 404 even though Vite on :3000 was 200.
- **Do NOT:** Keep document HTML behind the prod-only static block. Do not point smoke at Vite for JSON-LD — Vite does not inject `jsonld-ssr`.
- **Do:** In dev, serve `client/index.html` through `injectSeoIntoHtml` for non-`/api` GETs. Production still serves `dist/public`.
- **Files:** `server/index.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm smoke`. `curl.exe http://127.0.0.1:3001/sizes/20x25x1` includes `application/ld+json`. (Do **not** expect `OfferShippingDetails` — that node was removed in FH-253; the original verify line on this ticket is stale.)
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

#### FH-284 — MERV pick copy skipped capacity / resistance

- **Status:** fixed
- **Do:** Import `MERV_CAPACITY_NOTE`, `MERV_CAPACITY_SHORT`, and `MERV_PICK_FAQ_ANSWER` from `shared/merv-capacity.ts` on FAQ, SEO/llms, `#merv`, size Choose MERV, Filter Clock, family stories, and brand heroes.
- **Files:** `shared/merv-capacity.ts`, `shared/seo.ts`, `server/data/site-config.json`, `client/public/llms.txt`, `scripts/verify-store.ts`
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

#### FH-295 — Delivery promise said 2-day instead of 2-3 day

- **Status:** fixed
- **Do NOT:** Put “2-day delivery” or “in two days” back as the shopper promise.
- **Do:** Say 2-3 day delivery on the trust card, size chip, `/#delivery` heading, shipping FAQ, and llms copy.
- **Files:** Trust/delivery components, `shared/seo.ts`, `client/public/llms.txt`
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

#### FH-050 — Navy FAQ answers were too close to the background

- **Status:** mitigated
- **Do NOT:** Put `text-ice` on FAQ body copy or action links when `tone="band"`.
- **Do:** Band FAQ answers, links, subtitle, and help copy stay near-white.
- **Files:** `client/src/components/FaqSection.tsx`, `client/src/index.css`, `client/src/pages/SizeDetail.tsx`
- **Added:** 2026-08-26

---

## 13. File cheat sheet

| Concern | File |
|---|---|
| Shop list + ids | `shared/products.ts`, `shared/sellable-skus.json` |
| Allowlist rebuild | `scripts/build-sellable-skus.ts` |
| Three-way sync | `scripts/sync-catalog.ts`, `scripts/lib/catalog-sync.ts` |
| Stripe id map | `shared/stripe-catalog.ts`, `shared/stripe-catalog.json` |
| Tax codes + settings gate | `shared/stripe-tax.ts` |
| Checkout + order log | `server/stripe.ts` |
| Webhook ownership | `shared/stripe-accounts.ts`, `server/stripe-webhooks.ts` |
| Klaviyo feed + PDP URLs | `server/klaviyo.ts` |
| Postgres mirror | `supabase/migrations/0005_catalog_skus.sql` |
| SEO copy + JSON-LD + HTML inject | `shared/seo.ts` |
| SPA head | `client/src/hooks/useSeo.ts` |
| Crawler HTML + machine files | `server/index.ts` |
| QBO staff OAuth | `server/intuit/*`, `shared/intuit-oauth.ts` |
| Staff catalog table | `server/admin/data.ts` `catalogSnapshot`, `client/src/pages/admin/Catalog.tsx` |
| Books verify | `scripts/verify-stripe-books.ts` |
| SEO verify | `scripts/verify-json.ts`, `scripts/verify-store.ts`, `scripts/smoke-site.ts` |
| Issue log | `docs/ISSUES-AND-FIXES.md` |
