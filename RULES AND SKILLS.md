# RULES AND SKILLS

Filter Hero operating law. If a later change fights this file, the live code plus `docs/ISSUES-AND-FIXES.md` win — then this file is updated.

Cursor always-on rules live in `.cursor/rules/`. This document is the same law in one place, plus the catalog/API rules added for rebuild, plus which skills and tools to use.

**Last aligned:** 2026-09-24.

---

## 1. Always-on Cursor rules

These files apply to every Filter Hero session. The table is the index; each file is the law.

| File | Law |
|---|---|
| `.cursor/rules/stripe-klaviyo-email.mdc` | Live Stripe ↔ live Klaviyo only. One shopper message, one sender. |
| `.cursor/rules/issue-hygiene.mdc` | Every new or fixed bug goes in `docs/ISSUES-AND-FIXES.md` as the next `FH-XXX`. Never reuse ids. A fix is not done until that file is updated. |
| `.cursor/rules/repo-boundary.mdc` | This shop is `Tilo-Syntiv/Filter-Hero-OFFICIAL`. `Tilo-Syntiv/FILTER-HERO` is a different GitHub project. |

---

## 2. Identity

| Thing | Live value |
|---|---|
| GitHub | `Tilo-Syntiv/Filter-Hero-OFFICIAL` only. `Tilo-Syntiv/FILTER-HERO` is a different project. Do not fetch, merge, or deploy it. Railway service name `FILTER-HERO` is the host. |
| Shop | `https://filterhero.net` |
| Inbox | `info@filterhero.net` |
| Registrar | Squarespace. Do not transfer the domain. |
| DNS | Cloudflare nameservers. Apex DNS-only to Railway. `www` proxied 301 to apex. |
| Mail | Google Workspace. MX `smtp.google.com`. SPF must keep `include:_spf.google.com`. |
| Host | One Railway Express process. Volume `/data`. Not Hostinger. |
| Stripe | Live FILTER HERO `acct_1U9bqlQEENEs0Qmw`. Never sandbox on live webhooks or live Klaviyo. |
| Klaviyo | Filter Hero `VnVNmQ`. List `RiTKiS`. |
| Resend | `Filter Hero <info@filterhero.net>` on `send.filterhero.net`. Logo `https://filterhero.net/logo.png`. |
| Brand | Navy `#203868`. Burgundy `#7F2328`. |

`send.filterhero.net` is Resend. `klv.filterhero.net` is Klaviyo. Do not swap them. Do not enable Resend receiving on `@`.

---

## 3. Catalog — three layers, do not mix

| Layer | Source | Job |
|---|---|---|
| What we sell (cart) + live stock | Filter King API `GET /api/v1/get-all-parent-models` | Add-to-cart allowlist; Express auto-sync every 15 min |
| What we pay (wholesale) | Model Pricing XLS / `shared/pricing/model-pricing.csv`, else API `unit_price` | Margin floor only |
| What the shopper pays | Filtrete in `shared/pricing/engine.ts` | PDP, cart, Checkout, JSON-LD, Klaviyo item price |

### Live stock + cart

- Docs: `https://filterking.com/api/v1/documentation`
- Token: `POST https://filterking.com/oauth/token`
- Catalog: `GET https://filterking.com/api/v1/get-all-parent-models`
- Cart = parent models in the latest stock sync (`server/filterking-stock.ts`). Not the full 9,958 archive.
- Persist `parent_model` + `filterKingUrl`. Size hub / MERV PDP URL construction stays in `shared/filterking.ts`.
- **Do not scrape filterking.com.**
- **API `unit_price` is not the shopper price.** It may fill wholesale cost when the sheet has no row (server only).
- `VITE_FULL_CATALOG=false` and `FULL_CATALOG=false`. Off-stock sizes → custom quote, not Stripe.
- Env, server only, never `VITE_`: `FILTERKING_CLIENT_ID`, `FILTERKING_CLIENT_SECRET`, `FILTERKING_API_BASE=https://filterking.com`.

### Wholesale (sheet preferred)

- Only cost file: the Model Pricing XLS → `shared/pricing/model-pricing.csv`. Importer: `scripts/build-sellable-skus.ts`.
- Column **Sale Price is wholesale**, not the customer price.
- Parent Model (example `AF16x25x1-M8`) joins to Filter King `parent_model`.
- **Do not import** `fk-contractor-commerce.csv`, `FK PRICING_SHEET PS`, or the 2025 PDF.

### Filtrete shopper tickets

Source: `shared/pricing/engine.ts`. 1-inch qty 1, same ticket across sizes:

- MERV 8 = `$9.99`
- MERV 11 = `$13.49`
- MERV 13 = `$22.99`
- Carbon = `$16.70`

Multi-packs: `FILTRETE_PACKS` only. Do not invent pack prices. Do not use Filter King website sale or FilterBuy undercut as the customer price.

`pnpm sync:catalog` copies identity (id, size, MERV, image, Filter Hero URL, Filter King URL). Never copies wholesale cost or API `unit_price`.

---

## 4. Email — one shopper message, one sender

Code: `shared/email-channels.ts`.

| Message | Owner |
|---|---|
| Payment receipt | Stripe |
| Order confirmation, quote receipt, support receipt, staff lead alert | Resend |
| Welcome, abandoned checkout, post-purchase nurture, replenish, win-back, campaigns | Klaviyo |
| Filter Clock cadence save | None (staff inbox only) |
| CRM notes / stage changes | None. `CRM_SENDS_MAIL = false` |

### Do not

- Add a Klaviyo order-confirmation or quote-receipt flow.
- Trigger welcome, abandon, replenish, or a receipt from **Successfully Paid**.
- Connect FILTER HERO sandbox to live Klaviyo.
- Import mailer or Klaviyo from `server/crm/`.
- Click **Save** on Klaviyo “Review your brand” (overwrites navy/burgundy defaults).
- Subscribe Filter Clock `intent=reminder` to the marketing list. Replenish uses `next_change_date` from Placed Order only (`clock_next_change_date` is the calculator).

Native Klaviyo Stripe webhook is charge/invoice only: `https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ`. Shop Placed Order stays on `https://filterhero.net/api/stripe/webhook`.

Brand colors belong on Stripe Branding, Klaviyo brand-library email defaults, and Resend HTML (`shared/email-brand.ts`).

---

## 5. Stripe, tax, books

- Hosted Checkout only. No embedded card form.
- US shipping + phone. Stripe Tax when Tax Settings are `active`.
- Webhook: `checkout.session.completed` + `checkout.session.expired` → `orders.json`.
- Sandbox must not post to the live shop URL.
- QBO records tax Stripe already collected. Do not let QBO Automated Sales Tax recalculate.
- Filter King dealer invoices are QBO bills (AP / COGS), not Checkout events.
- Intuit OAuth from `/admin/settings` is connect / refresh / CSRF / `invalid_grant` only. It does not post invoices.

---

## 6. Supabase, CRM, accounts

- Hosted project only. No `DATABASE_URL`, no `pg` pool, no `supabase start`.
- Browser never queries Postgres. Service-role Express only. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` var.
- RLS on, zero policies, FORCE RLS, grants revoked from `anon` / `authenticated` / `public`.
- Staff: magic link + OTP, `STAFF_EMAILS`. Shopper: email + password. Guest checkout still works.
- Quote → deal in `new`. Support → note, no deal. Reminder → nothing. Paid checkout → won.
- Contact saves `leads.json` first, then fail-soft CRM. CRM never emails.
- `CRM_DISABLE` must not kill accounts.

---

## 7. Express, security, DNS

- One Express 4 process serves API + production SPA. `trust proxy` = 1. Apex is DNS-only, so Express sets CSP / HSTS.
- Contact: 5 posts / 15 min, honeypot, Turnstile fail-closed in production except `intent=reminder`.
- Error JSON is a fixed string. Do not leak SQL, keys, or emails.
- `robots.txt` disallows `/checkout/`, `/admin`, `/login`, `/account`, `/api/`.
- No Redis, S3, Helmet, cors, morgan, or second frontend service.

---

## 8. Shopper copy

- No free-shipping promise.
- No 30-day guarantee.
- Delivery is 2–3 day.
- Pack shots are Filter Hero branded. No Filter King wordmark on the stack.

---

## 9. Higgsfield media

- Images: GPT Image 2 (`gpt_image_2`) only. One still, 16:9, 1K, batch 1. Quality medium unless print.
- Video: Seedance 2.0 only. 720p, 16:9, up to 15s. Audio only when the shot needs it.
- One identity still, then one test clip. Stop if that clip fails.
- Batch 1. No 4-up, no 1080p/4K, no Seedance 2.5, no Kling/Veo/Soul unless named.
- One retry per failed request. Do not regenerate a clip that already passed.

---

## 10. Issue hygiene

Search `docs/ISSUES-AND-FIXES.md` first. New bugs take the next `FH-XXX`. Never reuse ids. A fix is not done until that file has **Do / Do NOT / Files / Verify**.

---

## 11. Build order

1. Identity and inbox
2. Catalog and price math
3. Express + disk
4. Stripe Checkout, then host it (first paid order)
5. Mail channels
6. Supabase Auth, CRM, accounts
7. Books, SEO, catalog sync
8. Storefront and staff UI last

Do not start Stripe with no XLS. Do not start Klaviyo with no webhook. Do not start UI with no API. Full sequence: `FROM SCRATCH.md`.

---

## 12. Never install

Hostinger (this shop is Railway). Extra VPS. Second Railway region. Redis. S3. Supabase Storage / Realtime / Edge. Local Docker Postgres. RLS policies. ShipStation. GA / GTM / Posthog. GitHub Actions. Klaviyo replica CDP. CRM as a mailbox. Second mail sender. Domain transfer.

---

## 13. Skills — what to load, and when

Read the skill file **before** using the tool. Do not substitute a different model, host, or API.

| When the work is | Load / use |
|---|---|
| Stripe Checkout, Tax, webhooks, Connect, invoices | Stripe skills (`stripe-best-practices`, `stripe-docs`) and `user-stripe` MCP. Live FILTER HERO account only. |
| Klaviyo flows, profiles, catalog, metrics | `user-klaviyo` MCP. Account `VnVNmQ` only. |
| Railway deploy, env, volume, logs | Railway skill / Railway CLI. One service. `DATA_DIR=/data`. |
| Supabase tables, RLS, Auth redirects | Supabase skill + hosted project MCP. No `supabase start`. |
| DNS, `www` redirect, Turnstile | `docs/CLOUDFLARE-NAMESERVERS.md`. Filter Hero production is not Hostinger. |
| Hostinger products | Hostinger MCP + confirm-destructive-actions. Not this shop’s host. |
| Higgsfield stills / clips | Higgsfield skill + `user-higgsfield` MCP. GPT Image 2 / Seedance 2.0 only. |
| Storefront / admin UI check | Playwright. Click the flow; do not stop at a screenshot. |
| Firecrawl / Tavily | Allowed for research. **Forbidden** as the Filter King catalog source — use the API. |
| Apify | `apify` subagent first if the user names Apify. Not the Filter King catalog path. |
| Quantitative / architecture briefs | Cursor Canvas skill. |
| Bug / security review of a PR | Bugbot / security-review only when the user asks. |

### Verify skills (this repo)

Run the matching script instead of inventing a new check:

`pnpm verify:store` · `verify:crm` · `verify:account` · `verify:supabase` · `verify:security` · `verify:env` · `verify:resend` · `verify:stripe-books` · `verify:intuit-oauth` · `pnpm smoke`

Secrets never go in `VITE_` vars except publishable keys the browser must have (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SITE_URL`, `VITE_FULL_CATALOG`).

---

## 14. Related briefs

| File | Owns |
|---|---|
| `FROM SCRATCH.md` | Eight-phase rebuild, copy-paste |
| `2 CATALOG.md` | Catalog layers in full |
| `FILTRETE PRICES.md` | Confirmed Filtrete tickets |
| `docs/ISSUES-AND-FIXES.md` | Every `FH-XXX` |
| `shared/email-channels.ts` | Sender ownership in code |
| `docs/STRIPE-FULL-BUILD.md` | Checkout + webhooks |
| `archive/klaviyo/` | Parked marketing code (FH-369) |
| `docs/RESEND-FULL-BUILD.md` | Transactional HTML |
| `CRM FULL BUILD.md` | Staff Quotes pipeline, CRM sync, every CRM issue |
| `docs/SUPABASE-AND-POSTGRES-FULL-BUILD.md` | Auth, CRM, RLS |
| `docs/RAILWAY-FULL-BUILD.md` | Host |
| `docs/CLOUDFLARE-NAMESERVERS.md` | DNS |
| `docs/UI FULL BUILD.md` | SPA |
