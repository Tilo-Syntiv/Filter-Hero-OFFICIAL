# Filter Hero — build from scratch

Copy everything below the line into a new chat.

---

## BUILD FILTER HERO FROM ZERO (copy from here)

Build Filter Hero in eight phases, in this order. A later phase started early will fight you. Phases 1–4 are the first live paid order. 5–8 make it this shop.

Do not skip a phase. Do not mix the three catalog layers.

| Layer | Source | Job |
|---|---|---|
| What we sell + what we pay | `E:\FILTER HEROE\IMPORTANT PAPERS\Model Pricing - Contractor Commerce.xlsx` | Add-to-cart SKUs and wholesale cost |
| Full catalog + Filter King page links | Filter King API `GET /api/v1/get-all-parent-models` | Finder archive and `filterking.com` URL on the matching Filter Hero page |
| What the shopper pays | Filtrete tickets in `shared/pricing/engine.ts` | PDP, cart, Checkout, JSON-LD, Klaviyo item price |

Excel Sale Price and Filter King API `unit_price` are never the shopper ticket.

---

## PHASE 1 — Identity and inbox

### Build

1. Keep `filterhero.net` registered at Squarespace. Do not transfer it.
2. Open Google Workspace. Inbox is `info@filterhero.net`. MX `smtp.google.com`. SPF includes `include:_spf.google.com`.
3. Create a Cloudflare zone. Paste every record **before** changing nameservers.
4. Apex A is DNS-only to the host. Mail, DKIM, and verify hosts are DNS-only. Only `www` is proxied, with a 301 to `https://filterhero.net/$1`.
5. Open a GitHub repo.
6. Have this file on disk: `E:\FILTER HEROE\IMPORTANT PAPERS\Model Pricing - Contractor Commerce.xlsx`.

### Leave out

Do not transfer the domain. Do not orange-cloud apex, MX, or DKIM. Do not point `send.filterhero.net` at Klaviyo. Do not enable Resend receiving on `@` (that steals Google MX).

### Done when

NS are Squarespace or Cloudflare. MX is `smtp.google.com`. You can receive mail at `info@filterhero.net`. The Model Pricing XLS is on disk.

---

## PHASE 2 — Catalog and price math

### Sellable + wholesale (required)

The only sellable list and the only wholesale file:

`E:\FILTER HEROE\IMPORTANT PAPERS\Model Pricing - Contractor Commerce.xlsx`

Fallback (same workbook, not another sheet):

`E:\FILTER HEROE\Model Pricing - Contractor Commerce - Sheet1.csv`

Columns: Parent Model, Size, Actual Size, MERV, Thickness, Sale Price.

- Sale Price = what Filter Hero pays. Not the customer price.
- Parent Model (example `AF16x25x1-M8`) = join key to Filter King API `parent_model`.
- Do not import `fk-contractor-commerce.csv`, `FK PRICING_SHEET PS`, or the 2025 PDF.

Copy the XLS into `shared/pricing/model-pricing.csv`. Point `scripts/build-sellable-skus.ts` at that file. Run `pnpm exec tsx scripts/build-sellable-skus.ts`. Cost may live on `sellable-skus.json` for margin math only.

### Filter King API (required)

Docs: `https://filterking.com/api/v1/documentation`  
Apply: `https://filterking.com/api-onboarding`  
Token: `POST https://filterking.com/oauth/token`  
Catalog: `GET https://filterking.com/api/v1/get-all-parent-models` with `Authorization: Bearer {token}`

Use `sku_items[]` as the full stock catalog (finder / quote routing). Persist `parent_model` + `filterKingUrl` on every Filter Hero size × MERV.

Links:

- Size hub: `https://filterking.com/air-filter-sizes/{size}`
- MERV PDP: `https://filterking.com/air-filter-sizes-{size}-merv-{8|11|13}`
- Example: `https://filterhero.net/sizes/20x25x1` ↔ `https://filterking.com/air-filter-sizes-20x25x1-merv-8`

If the API later returns a URL field, use that. Do not scrape filterking.com. API `unit_price` is not the shopper price. Off-XLS sizes may use `POST /api/v1/build-custom-filter` for quotes; they are not add-to-cart until they are on the XLS.

Env (server only, never `VITE_`): `FILTERKING_CLIENT_ID`, `FILTERKING_CLIENT_SECRET`, `FILTERKING_API_BASE=https://filterking.com`.

### Customer prices (required)

Source: `shared/pricing/engine.ts`

1-inch qty 1, same ticket across sizes:

- MERV 8 = `$9.99`
- MERV 11 = `$13.49`
- MERV 13 = `$22.99`
- Carbon = `$16.70`

Multi-packs: `FILTRETE_PACKS` in that file only. Do not invent pack prices.

Checkout `price_data`, PDP, cart, JSON-LD Offer, and Klaviyo item price all use Filtrete tickets.

`VITE_FULL_CATALOG=false` and `FULL_CATALOG=false` for checkout. Cart = XLS. Finder may show API sizes; off-XLS → custom quote, not Stripe.

HVAC brand maps stay in `shared/hvac-brands.json` (finder only). Leave `pnpm sync:catalog` for phase 7.

### Leave out

`fk-contractor-commerce.csv`. Scraping filterking.com. API `unit_price` or Filter King website sale as shopper price. FilterBuy undercut as shopper price. Add-to-cart for API-only SKUs. Wholesale cost on Stripe, Klaviyo, Postgres, sitemap, or `/llms.txt`.

### Done when

Every XLS size × MERV is sellable. Finder archive comes from the API. Each `/sizes` page links the matching filterking.com PDP. A 1-inch MERV 8 qty 1 checkout unit is `$9.99`. `pnpm verify:store` would pass.

---

## PHASE 3 — Express + disk

### Build

One Node process (Express 4). No Next.js, no second frontend service in production.

- `GET /api/health`
- `GET /api/products`
- `POST /api/contact` — save `leads.json` first, then fail-soft everything else
- `DATA_DIR` files: `leads.json`, `orders.json`, `site-config.json` (later `intuit-oauth.json`)
- Security headers, CSP, HSTS behind `trust proxy` 1, JSON error shaping, contact rate limit 5 / 15 min, honeypot
- Pause-checkout flag in `site-config.json`

### Leave out

Redis. S3. Second frontend service. `DATABASE_URL` / `pg` pool. Local `supabase start`. Helmet / cors / morgan packages.

### Done when

Local API returns health. A quote POST writes a lead even if every vendor is down.

---

## PHASE 4 — Stripe Checkout, then host it

### Build

1. Live FILTER HERO Stripe only (`acct_1U9bqlQEENEs0Qmw`). Hosted Checkout redirect. US shipping + phone. Stripe Tax when Tax Settings are `active`. Customer + Invoice on pay.
2. Webhook `https://filterhero.net/api/stripe/webhook` writes `orders.json`. Events: `checkout.session.completed` + `checkout.session.expired`.
3. One Railway service, Railpack `pnpm build` then `pnpm start`, volume at `/data` (`DATA_DIR=/data`).
4. Cut nameservers to Cloudflare. Apex DNS-only to Railway. Proxied `www` 301 to apex. Do not attach `www` on Railway.
5. Cloudflare Turnstile on quote/support. Clock `intent=reminder` skips Turnstile. Production fails closed if the secret is missing (except reminder).

### Leave out

Embedded card form. FILTER HERO sandbox webhook on the live URL. Second Railway region. Hostinger. Orange-cloud apex.

### Done when

A test SKU pays on `https://filterhero.net`. `orders.json` gets a row. Tax is whatever Stripe collected.

---

## PHASE 5 — Mail channels

### Build

One shopper message, one sender.

- Stripe = payment receipt
- Resend on `send.filterhero.net` from `Filter Hero <info@filterhero.net>` = branded order confirmation, quote/support receipts, staff lead alerts. Logo `https://filterhero.net/logo.png`. Brand navy `#203868` / burgundy `#7F2328`.
- Klaviyo Filter Hero `VnVNmQ` = welcome, abandoned checkout, post-purchase nurture, replenish, win-back, campaigns (`klv.filterhero.net`)
- Native Klaviyo Stripe webhook is charge/invoice only: `https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ`. Connect live FILTER HERO, never sandbox.
- Shop Placed Order stays on `https://filterhero.net/api/stripe/webhook`

### Leave out

Klaviyo order-confirmation or quote-receipt flow. Welcome / abandon / replenish / receipt from Successfully Paid. CRM sending mail. Third sender on `filterhero.net`. Clicking Save on Klaviyo “Review your brand”. Pointing `send.` at Klaviyo.

### Done when

Pay once → Stripe receipt + one Resend confirmation. Quote → Resend to shopper and staff. Abandon is Klaviyo only.

---

## PHASE 6 — Supabase Auth, CRM, accounts

### Build

Hosted project. No local Docker Postgres. Browser never queries tables.

- Five SQL migrations. RLS on, zero policies, FORCE RLS, grants revoked from `anon` / `authenticated` / `public`.
- Express uses `SUPABASE_SERVICE_ROLE_KEY`. Never `VITE_`.
- Staff: magic link + OTP, `STAFF_EMAILS`. Shopper: email + password on `/login`.
- Quote → deal in `new`. Support → note, no deal. Reminder → nothing. Paid checkout → close won.
- Profiles + saved filters. Guest checkout still works. CRM never emails.

### Leave out

`supabase start`. RLS policies. Browser `from("crm_contacts")`. Google / Apple / phone login. `CRM_DISABLE` killing accounts. A Klaviyo replica CDP.

### Done when

Unsigned `/api/crm` is 401. A quote appears on the board. A paid email attaches SKUs if a profile exists.

Definitive CRM install: [CRM FULL BUILD.md](./CRM%20FULL%20BUILD.md).

---

## PHASE 7 — Books, SEO, catalog sync

### Build

1. QuickBooks Online + Stripe Connector. Filter King supplier bills in QBO (AP / COGS). Chart: Stripe Clearing, Stripe fees, Sales tax payable, Filter sales.
2. Intuit OAuth from `/admin/settings`: connect, refresh, `invalid_grant`, CSRF. It does not post invoices.
3. Express serves `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/ai.txt`, and injects JSON-LD into HTML. Disallow `/checkout/`, `/admin`, `/login`, `/account`, `/api/`.
4. `pnpm sync:catalog` → Stripe Products, Klaviyo catalog, `catalog_skus`. Copy identity (id, size, MERV, image, Filter Hero URL, Filter King URL). Never copy wholesale cost or API `unit_price`.
5. Staff admin APIs. Verify scripts: `verify:store`, `verify:crm`, `verify:account`, `verify:supabase`, `verify:security`, `verify:env`.

### Leave out

QBO Automated Sales Tax on top of Stripe Tax. Payment inside QuickBooks. Crawlers indexing `/login`, `/account`, `/admin`, `/api`. Wholesale cost on any mirror.

### Done when

Payout mapping matches Stripe. Sitemap lists sellable size and brand URLs. Each synced SKU has a Filter King URL and no cost column.

---

## PHASE 8 — Storefront and staff UI last

### Build

Size finder, PDPs (`/sizes/{slug}` with Filter King link), cart, quote form, Filter Clock, brand pages, custom quote. `/login` `/account` `/admin`. Official MERV pack shots with Filter King wordmarks stripped. Higgsfield only for identity stills you do not already have (GPT Image 2, then Seedance 2.0, batch 1).

### Leave out

UI before phase 3. Free-shipping promise. 30-day guarantee. Regenerating clips that already passed. Filter King lockup on pack shots.

### Done when

A shopper can find a size, open the linked Filter King page, pay Filtrete tickets, see the order on `/account`, and staff can work the quote on `/admin`.

---

## Leave out for the whole project

Hostinger. Extra VPS. Second Railway region. Redis. S3. Supabase Storage / Realtime / Edge. Local Docker Postgres. RLS policies. ShipStation / EasyPost. GA / GTM / Posthog. GitHub Actions. Klaviyo replica CDP. CRM as a mailbox. Klaviyo order confirmation. QBO tax on top of Stripe Tax. Second mail sender. Domain transfer. Sandbox Stripe into live Klaviyo. Scraping filterking.com for catalog. `fk-contractor-commerce.csv` as input. Privacy / terms routes (this shop did not ship them).

---

## Order that matters

1 → 2 → 3 → 4 (first paid order) → 5 → 6 → 7 → 8.

Do not start Stripe with no XLS. Do not start Klaviyo with no webhook. Do not start UI with no API. Do not sell API-only SKUs. Do not print wholesale as a shopper price.

## BUILD FILTER HERO FROM ZERO (stop copy)
