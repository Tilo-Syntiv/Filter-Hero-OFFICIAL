# KLAVIYO FULL BUILD

**Filter Hero’s definitive Klaviyo install.** This is how Klaviyo is wired, connected, and installed in *this* repository — not a generic Klaviyo Shopify guide.

The short live-ops sheet is [KLAVIYO.md](./KLAVIYO.md). The in-house CDP spec at [KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md) is **not** what the app runs. Issues and fixes in this file come from [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md).

**Last verified against the repo:** 2026-09-20.

---

## 0. The sentence that decides every later choice

Live **FILTER HERO** Stripe (`acct_1U9bqlQEENEs0Qmw`) OAuths to live Klaviyo **Filter Hero** (`VnVNmQ`). Never connect **FILTER HERO sandbox**. Native Klaviyo webhook is charge/invoice only: `https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ`. Shop **Placed Order** stays on `https://filterhero.net/api/stripe/webhook`.

Klaviyo sends welcome, abandoned checkout, post-purchase nurture, replenish, win-back, and campaigns from `klv.filterhero.net`. Stripe sends the payment receipt. Resend sends the branded order confirmation and quote/support receipts from `Filter Hero <info@filterhero.net>` using `https://filterhero.net/logo.png`. One shopper message, one sender — `shared/email-channels.ts`.

Do not add a Klaviyo order-confirmation or quote-receipt flow. Do not trigger welcome, abandon, replenish, or a receipt from **Successfully Paid**. Navy `#203868` / burgundy `#7F2328` belong on Stripe Branding, Klaviyo brand-library email defaults, and Resend HTML (`shared/email-brand.ts`). Do not click **Save** on Klaviyo’s “Review your brand” wizard — it overwrites those defaults with a generic theme.

That paragraph is also `.cursor/rules/stripe-klaviyo-email.mdc`. If code and this document disagree, the code plus `pnpm verify:klaviyo` win, then this file is updated.

---

## 1. What is installed (and what is not)

### Installed

A **live Klaviyo account** named **Filter Hero**, public / site ID `VnVNmQ`, marketing list **Email List** `RiTKiS`. The Express shop writes profiles and events through Klaviyo’s JSON:API (`revision 2026-07-15`). The browser loads `onsite.js`. Seven Filter Hero flows are **Live**. Custom catalog items match the Model Pricing XLS. A separate Stripe endpoint posts charge + invoice events into Klaviyo’s native Stripe app.

### Not installed

- Shopify, Magento, WooCommerce, or any storefront plugin.
- A Klaviyo order-confirmation flow.
- A Klaviyo quote-receipt / “we got your quote” flow.
- Replenish, welcome, abandon, or a second receipt triggered by **Successfully Paid**.
- Filter Clock as a mailing list. Clock is a calculator.
- SMS / WhatsApp / push.
- Klaviyo as the transactional MTA. That is Resend (`send.filterhero.net`).
- CRM as a mailbox or a Klaviyo writer. CRM is a staff board in Postgres.

### Replica plan is a different product

`docs/KLAVIYO-REPLICA-PLAN.md` describes a future Filter Hero CDP on Supabase. It is a spec. Do not follow it to install Klaviyo. The live path is this document.

---

## 2. Accounts, keys, and the two Stripe worlds

| System | Live identity | Local / do not |
|---|---|---|
| Klaviyo | Account **Filter Hero**, company / site ID `VnVNmQ` | Never a second welcome list. Never a sandbox Klaviyo OAuth. |
| Marketing list | `RiTKiS` (**Email List**) | Do not create **Filter Hero Marketing** if `RiTKiS` exists (FH-293). |
| Stripe OAuth target | **FILTER HERO** `acct_1U9bqlQEENEs0Qmw` (created Aug 28) | Never **FILTER HERO sandbox** `acct_1U9bqs790NnFGDLv`. Stripe Sandboxes cannot OAuth to live Klaviyo (FH-229). |
| Shop fulfillment | `https://filterhero.net/api/stripe/webhook` — `checkout.session.completed` + `checkout.session.expired` | Live FILTER HERO only. Sandbox and FILTER HERO **test mode** must not post Checkout events at production (FH-294). |
| Native Klaviyo Stripe app | `https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ` — all `charge.*` and `invoice.*` | No Checkout session events on this URL (FH-228). |
| Native test-mode destination on FILTER HERO | `we_1UGgz8QEENEs0QmwgI31tz6f` | Sandbox copy `we_1UGWbF790NnFGDLvIVtyg0bK` returns HTTP 200 and records **zero** metrics. |
| Local `.env` Stripe | FILTER HERO sandbox test keys + `stripe listen` | Correct. Do not copy local `STRIPE_SECRET_KEY` onto Railway (FH-305). |
| Railway Stripe (open) | Must be FILTER HERO **live** `sk_live_` / `pk_live_` | Open: Railway still has sandbox test keys (FH-305). |
| Sending domain | `klv.filterhero.net` (marketing) | Never `send.filterhero.net` (Resend, FH-172 / FH-201). |
| From on flow drafts | `info@filterhero.net` | Same as Resend From. The *host* that actually sends marketing is `klv`. |

Public site ID `VnVNmQ` is not a secret. The private key is. Never put `KLAVIYO_PRIVATE_API_KEY` in a `VITE_` variable, `site-config.json`, the browser bundle, or this document.

---

## 3. Environment

| Variable | Where it lives | Role |
|---|---|---|
| `KLAVIYO_PRIVATE_API_KEY` | Server `.env` / Railway. Format `pk_…`. | JSON:API. Profile import, events, lists, catalog jobs, setup scripts. |
| `KLAVIYO_PUBLIC_API_KEY` | Same. Six-character site ID. Expected: `VnVNmQ`. | Loads `onsite.js`. Builds the native Stripe webhook query `?c=`. |
| `KLAVIYO_LIST_ID` | Same. Expected: `RiTKiS`. | Welcome trigger list. If empty, `resolveMarketingListId()` prefers `RiTKiS` / **Email List** / **Filter Hero Marketing**, then the first list. It must not mint a second welcome list. |
| `KLAVIYO_DISABLE=1` | Scripts / local tests. | `isKlaviyoEnabled()` returns false. `pnpm verify:klaviyo` sets this for payload asserts, then unsets it for the live ping. |
| `KLAVIYO_REVISION` | Optional override. | Default `2026-07-15`. Sending-domain endpoints use `2026-07-15.pre`. |
| `VITE_KLAVIYO_PUBLIC_API_KEY` | Fallback only. | `klaviyoPublicKey()` reads private-env public key first. Do not rely on Vite for the private key. |

`.env.example`:

```
# Klaviyo (marketing). Private key is server-only — never prefix with VITE_.
# KLAVIYO_PRIVATE_API_KEY=pk_...
# KLAVIYO_PUBLIC_API_KEY=VnVNmQ
# KLAVIYO_LIST_ID=RiTKiS
# KLAVIYO_DISABLE=1
```

`pnpm connect:klaviyo` writes public key + list id into `.env` after a successful account ping. It also upserts a wire-check profile `klaviyo-wire-check@filterhero.net`.

Enabled rule (`server/klaviyo.ts`):

```ts
export function isKlaviyoEnabled(): boolean {
  if (process.env.KLAVIYO_DISABLE === "1") return false;
  const key = process.env.KLAVIYO_PRIVATE_API_KEY?.trim();
  return Boolean(key && !key.includes("..."));
}
```

Placeholder keys that still contain `...` are treated as missing.

---

## 4. DNS — marketing host, not transactional host

Nameservers are Cloudflare (`ganz` / `marjory`). Full zone: [CLOUDFLARE-NAMESERVERS.md](./CLOUDFLARE-NAMESERVERS.md). Mail MX stays Google. Resend keeps `send` / `rsend` / `resend._domainkey`.

| Type | Host | Value | Proxy |
|---|---|---|---|
| CNAME | `klv` | `3840918940202419532.klaviyodns.com` | DNS only |
| CNAME | `mtd1._domainkey` | `mtd1._domainkey.3840918940202419532.klaviyodns.com` | DNS only |
| CNAME | `mtd2._domainkey` | `mtd2._domainkey.3840918940202419532.klaviyodns.com` | DNS only |
| TXT | `@` | `klaviyo-site-verification=VnVNmQ` | DNS only |

Keep the existing Google SPF TXT on `@`. Add a **second** TXT for Klaviyo site verification. Do not replace SPF. Do not orange-cloud DKIM or verification hosts. Do not point `send` at Klaviyo.

`pnpm setup:klaviyo` calls sending-domain verify + activate on `klv.filterhero.net` (`purpose: marketing`, `configuration: static`). If it finds `send.filterhero.net` on the Klaviyo account, it **deletes** that sending domain so Resend keeps the host.

Flows go Live only after the sending domain status is `active`.

---

## 5. One shopper message, one sender

Canonical ownership is `shared/email-channels.ts`. `pnpm verify:klaviyo` and `pnpm verify:resend` both assert it. `server/klaviyo.ts` must not import the mailer, Resend, or CRM.

| Message | Owner | Not |
|---|---|---|
| Staff lead alert (quote / support / clock save) | Resend → `CONTACT_TO` | Klaviyo, CRM |
| Quote / support confirmation to the shopper | Resend | Klaviyo welcome or “we got your quote” flow, CRM |
| Filter Clock cadence save | **No shopper email** | Resend receipt, Klaviyo list, replenish (`next_change_date`), CRM deal |
| Order confirmation | Resend branded HTML (`server/mailer.ts`) | Klaviyo “Order confirmed” flow, CRM |
| Stripe payment receipt | Stripe | Klaviyo, Resend |
| Welcome, abandoned checkout, install/review, replenish, win-back, campaigns | Klaviyo (`klv.filterhero.net`) | `server/mailer.ts`, CRM |
| Quote follow-up board | CRM (staff only) | Resend, Klaviyo |

Helpers that encode the clock invariant (FH-131):

```ts
export const REPLENISH_DATE_PROPERTY = "next_change_date";
export const CLOCK_NEXT_CHANGE_PROPERTY = "clock_next_change_date";

export function klaviyoMaySubscribe(input: {
  intent: ContactIntent;
  marketingConsent?: boolean;
}): boolean {
  if (input.intent === "reminder") return false;
  return input.marketingConsent === true;
}

export function klaviyoMetricForIntent(intent: ContactIntent): string {
  if (intent === "reminder") return "Signed Up Reminder";
  if (intent === "support") return "Requested Support";
  return "Requested Quote";
}
```

Clock never subscribes, even if someone checks a marketing box. Replenish starts on **Placed Order** only.

---

## 6. Architecture

```
Shopper (Vite)
  App.tsx ── bootKlaviyo()
       │        GET /api/klaviyo/config  → publicKey VnVNmQ
       │        patchKlaviyoHttpsClient()  (HTTP localhost only)
       │        <script src="https://static.klaviyo.com/onsite/js/VnVNmQ/klaviyo.js">
       │
       ├── identifyShopper()  → onsite identify + POST /api/identify
       ├── trackMetric()      → onsite track   + POST /api/track  (client metrics only)
       ├── SizeDetail         → Viewed Size / Viewed Product / Selected MERV
       ├── CartContext        → Added to Cart
       ├── CartDrawer         → identify on cart email
       └── Contact / Clock / Quote → identify + POST /api/contact

Express (server/index.ts)
  POST /api/identify          → upsertKlaviyoProfile  (allowlisted properties)
  POST /api/track             → trackKlaviyoEvent     (CLIENT_METRICS only)
  POST /api/contact           → syncContactToKlaviyo  then Resend (never from Klaviyo)
  POST /api/checkout          → Stripe session + syncStartedCheckout
  POST /api/stripe/webhook    → Placed Order / Ordered Product / Checkout Expired
                                + Resend order confirmation
                                + account + CRM close
  GET  /api/klaviyo/config    → public key only
  GET  /api/klaviyo/catalog.json
  GET  /api/klaviyo/health    → staff
  GET  /api/health/detail     → staff (includes klaviyo)

Stripe Dashboard (FILTER HERO acct_1U9bqlQEENEs0Qmw)
  Endpoint A  https://filterhero.net/api/stripe/webhook
              checkout.session.completed | checkout.session.expired
  Endpoint B  https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ
              charge.* | invoice.*
              signing secret pasted into Klaviyo → Stripe → Verify webhooks

Klaviyo account VnVNmQ
  Profiles / metrics / Email List RiTKiS
  Custom catalog ($custom:::$default:::{productId})
  Flows (7 live) + segment FH Lapsed 120 (TfSLjM)
  Mapped metrics: revenue = Placed Order, refunded_sales = Refunded Payment
  Native Stripe metrics: Successfully Paid / Failed Payment / Refunded Payment / Issued Invoice
  Sending domain klv.filterhero.net
  Brand library logo = https://filterhero.net/logo.png
```

Two write paths exist on purpose. Onsite JS is extra. `/api/identify` and `/api/track` are the source of truth when the browser is on HTTP, the script 301s, or CORS fails (FH-209 / FH-212 / FH-231). Do not drop the server fallback.

Klaviyo never sends transactional mail from this codebase. `server/klaviyo.ts` posts JSON:API. Flows in the Klaviyo UI send the marketing mail.

---

## 7. JSON:API — how every server call is shaped

```
POST https://a.klaviyo.com/api/...
Authorization: Klaviyo-API-Key {KLAVIYO_PRIVATE_API_KEY}
accept: application/vnd.api+json
revision: 2026-07-15
content-type: application/vnd.api+json   (when there is a body)
```

`klaviyoApi()` / `klaviyoRequest()` in `server/klaviyo.ts` is the only HTTP client the shop uses. Sending-domain jobs in `scripts/setup-klaviyo-account.ts` use the same host with revision `2026-07-15.pre`.

Do not send `page[size]` on `/api/metrics`. Revision `2026-07-15` rejects it (`'page_size' is not a valid field for the resource 'metric'`). Paginate with `links.next` (FH-230).

### Profile upsert

`POST /api/profile-import`

```json
{
  "data": {
    "type": "profile",
    "attributes": {
      "email": "buyer@example.com",
      "phone_number": "+15551234567",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "anonymous_id": "<fh_aid uuid>",
      "properties": { "preferred_merv": "13" }
    }
  }
}
```

Email is lowercased. Phone is E.164 via `toE164()` (10-digit US → `+1…`; junk is omitted). Names that match `/^filter clock/i` are dropped so clock saves do not create a person named “Filter Clock reminder”.

### Event create

`POST /api/events`

```json
{
  "data": {
    "type": "event",
    "attributes": {
      "properties": {},
      "value": 21.59,
      "value_currency": "USD",
      "unique_id": "placed_order:cs_test_…",
      "time": "2026-09-04T16:00:00.000Z",
      "metric": { "data": { "type": "metric", "attributes": { "name": "Placed Order" } } },
      "profile": { "data": { "type": "profile", "attributes": { "email": "…", "properties": {} } } }
    }
  }
}
```

Idempotency is `unique_id`. Stripe webhook retries must not enroll post-purchase twice.

### Marketing subscribe

`POST /api/profile-subscription-bulk-create-jobs` with `relationships.list` = `RiTKiS` when resolved. Consent is `email.marketing.consent = SUBSCRIBED`. `custom_source` is `contact-quote`, `contact-support`, `checkout`, or `account-setup`.

Clock (`intent: reminder`) never reaches this function.

---

## 8. File map

| File | Job |
|---|---|
| `shared/email-channels.ts` | Ownership. Clock vs replenish property names. Subscribe rules. |
| `shared/email-brand.ts` | Navy / burgundy / lockup. Shared with Resend and Stripe Branding. |
| `shared/klaviyo-onsite.ts` | Rewrite `http://*.klaviyo.com` → HTTPS before CORS preflight. |
| `shared/klaviyo-stripe.ts` | Native webhook URL + charge/invoice event list + OAuth account id. |
| `shared/stripe-accounts.ts` | Which Stripe account may host which webhook. |
| `shared/security-headers.ts` | CSP `connect-src` / `script-src` for onsite. |
| `server/klaviyo.ts` | Profiles, events, catalog JSON, contact/checkout/order sync. **No mail.** |
| `server/klaviyo-stripe.ts` | Create / inspect native Stripe endpoint. Refuse sandbox keys. |
| `server/stripe.ts` | `Started Checkout`, `Placed Order`, `Checkout Expired`. Resend confirmation is separate. |
| `server/stripe-webhooks.ts` | Scrub conflicting shop/Klaviyo endpoints off the wrong account. |
| `server/contact.ts` | After lead save: CRM, then Klaviyo, then Resend. Klaviyo failure does not fail the lead. |
| `server/index.ts` | Public routes. Identify/track rate limits. Catalog feed. |
| `server/security.ts` | Identify allowlist (no `next_change_date`). Track sanitizer. Limiters. |
| `server/admin/routes.ts` | Staff health + `POST /api/admin/klaviyo-stripe/connect`. |
| `client/src/lib/klaviyo.ts` | Boot, HTTPS patch, identify, track, viewed item, add-to-cart. |
| `client/src/App.tsx` | `bootKlaviyo()` on mount. |
| `scripts/setup-klaviyo-account.ts` | Idempotent account build: seed metrics, templates, catalog, flows, domain, go-live, mapped metrics. |
| `scripts/setup-klaviyo-stripe.ts` | Native charge/invoice webhook. |
| `scripts/map-klaviyo-metrics.ts` | Ecommerce metric mapping including refunds. |
| `scripts/connect-klaviyo.ts` | Write public key + list id; wire-check event. |
| `scripts/verify-klaviyo.ts` | Payload + live account invariants. |
| `scripts/inspect-klaviyo-account.ts` | Print live objects. |
| `scripts/check-klaviyo-stripe.ts` | Native metrics + `oauthAccountMatch`. |
| `scripts/lib/catalog-sync.ts` | Custom catalog create / update / delete jobs. |
| `.cursor/rules/stripe-klaviyo-email.mdc` | Always-on agent rule. |

Admin and CRM **read** `klaviyo_profile_id`. They must not send mail or write Klaviyo (FH-213).

---

## 9. Client install (onsite)

### Boot

`App.tsx` calls `bootKlaviyo()` once.

1. `patchKlaviyoHttpsClient()` — no-op on HTTPS. On `http://localhost` it wraps `fetch`, `XMLHttpRequest.open`, and `sendBeacon` so any URL whose host is `klaviyo.com` is upgraded to HTTPS (FH-231). Klaviyo.js follows the page scheme; `http://a.klaviyo.com` 301s to HTTPS; Chrome then blocks the CORS preflight (“Redirect is not allowed for a preflight request”).
2. Ensure `localStorage.fh_aid` (anonymous id, 1 year, first-party). Email is **not** in that cookie. Remembered email is `fh_klaviyo_email`.
3. `GET /api/klaviyo/config` up to 6 times with backoff. `booted` is set only after a 200 (FH-192). Empty public key → stop. Do not load the script.
4. Inject `https://static.klaviyo.com/onsite/js/{publicKey}/klaviyo.js`.
5. If a remembered email exists, `identifyShopper`.

Queue before the script arrives:

```ts
window._klOnsite = window._klOnsite || [];
window.klaviyo = { push(args) { window._klOnsite.push(args); } };
```

### Identify (dual write)

```ts
callOnsite("identify", { email, $anonymous: getAnonymousId(), … });
POST /api/identify { email, phone, firstName, lastName, anonymousId, properties }
```

Identify properties that survive the server allowlist: `house_type`, `change_interval_days`, `preferred_merv` only. A client cannot write `next_change_date` through `/api/identify`. That is how Filter Clock cannot enroll replenish from the browser.

Call sites:

- Cart drawer — email field before Stripe.
- Contact form / custom quote — after submit.
- Filter Clock — house traits only; `marketingConsent: false` on the contact POST.

### Track (dual write, client metrics only)

Onsite `track` always fires. Server `POST /api/track` fires only when a remembered email exists. Unknown metrics return `400 unknown_metric`. Allowed:

```ts
export const CLIENT_METRICS = [
  "Viewed Product",
  "Viewed Size",
  "Added to Cart",
  "Selected MERV",
  "Active on Site",
] as const;
```

**Placed Order**, **Started Checkout**, **Checkout Expired**, quote/support/clock metrics are server-only. The browser cannot mint them.

### Viewed Product

Also calls `trackViewedItem` for Klaviyo’s recently-viewed block. Carbon SKUs use the `carbon` suffix and the carbon pack shot — do not cast cart `merv` to `8 | 11 | 13` (FH-193).

### Added to Cart

Fires from `CartContext.addItem`. Abandon-from-cart still needs an identified profile (cart email). `$value` is the cart total.

### CSP

Production `connect-src` / `script-src` allow `https://*.klaviyo.com` and `https://static.klaviyo.com`. Production must **not** allow `http://*.klaviyo.com` (upgrade-insecure-requests is on).

Development also allows `http://*.klaviyo.com` **and** `http://a.klaviyo.com`. Chrome drops the wildcard for that host, so the named host is required (FH-209, FH-212). Restart Vite after changing headers.

---

## 10. Public HTTP surface

| Method | Path | Auth | What |
|---|---|---|---|
| GET | `/api/klaviyo/config` | public | `{ enabled, publicKey }` — no secrets |
| GET | `/api/klaviyo/catalog.json` | public | Contractor-sheet feed. Local must be **293** SKUs. Live feed is still 299 until FH-300 deploys. |
| GET | `/api/klaviyo/health` | staff | Account ping |
| GET | `/api/health` | public | `{ ok, brand }` — no Klaviyo |
| GET | `/api/health/detail` | staff | Includes `klaviyo` |
| POST | `/api/identify` | public, 20/min | Profile import |
| POST | `/api/track` | public, 40/min | Client metrics only |
| POST | `/api/contact` | public, contact limiter | Lead + optional Klaviyo |
| POST | `/api/checkout` | public, 10/15min | Stripe + Started Checkout |
| POST | `/api/stripe/webhook` | Stripe signature | Placed Order / Checkout Expired |
| POST | `/api/admin/klaviyo-stripe/connect` | staff | `ensureKlaviyoStripeWebhook()` |

Identify / track / contact / checkout failures return **fixed** public error strings. Raw Zod / API text stays in the server log.

Klaviyo errors after a successful lead or order are logged (`[contact] klaviyo failed after save`, `[stripe webhook] klaviyo Placed Order failed`) and **do not** roll back the lead or the order.

---

## 11. Event dictionary (closed set)

Past-tense verb + noun. Money events are server-only.

| Metric | Writer | Unique id | Notes |
|---|---|---|---|
| Active on Site | onsite.js | none | After public key loads |
| Viewed Product | SizeDetail + `/api/track` | none | Plus `trackViewedItem` |
| Viewed Size | SizeDetail | none | `{ Size }` |
| Selected MERV | MERV chips | none | Profile + event |
| Added to Cart | CartContext | none | Needs identified profile for abandon-from-cart |
| Started Checkout | `POST /api/checkout` after Stripe session | `checkout:{session.id}` | Requires cart email. Includes `CheckoutURL`. Optional list subscribe if marketing box |
| Checkout Expired | Stripe `checkout.session.expired` | `expired:{session.id}` | Email from Stripe customer_details / customer_email / metadata |
| Placed Order | Stripe `checkout.session.completed` | `placed_order:{session.id}` | Sets sendable `next_change_date`. **Revenue mapping.** |
| Ordered Product | same, one per line | `ordered:{session.id}:{productId}` | Segments only. Do not trigger a flow on this |
| Successfully Paid | Native Stripe app | Stripe’s | Charge succeeded. **Not** a second Placed Order. **Must not** trigger a flow |
| Failed Payment | Native Stripe app | Stripe’s | |
| Refunded Payment | Native Stripe app | Stripe’s | Mapped to `refunded_sales` (`TvC7dY`) |
| Issued Invoice | Native Stripe app | Stripe’s | |
| Requested Quote | Contact | `quote:{lead.id}` | Subscribe only if marketing box |
| Requested Support | Contact | `support:{lead.id}` | Same |
| Signed Up Reminder | Filter Clock save | `reminder:{email}:{clock_next_change_date\|lead.id}` | Profile properties only. **No list. No replenish.** |

`pnpm verify:klaviyo` fails if Successfully Paid, Requested Quote, Requested Support, or Signed Up Reminder trigger any flow.

### Line-item shape (`KlaviyoLine`)

Used on cart, checkout, and order events:

```
ProductID, SKU, ProductName, Quantity, ItemPrice, RowTotal,
ProductURL, ImageURL, ProductCategories, Categories, Brand, Size, MERV
```

SKU is `{size}-{merv}` or `{size}-carbon`. URLs are `https://filterhero.net/sizes/{size}?merv=…` and pack-shot paths. Brand is always `Filter Hero`. Qty is clamped 1–50. Unit price uses `unitPriceForQty` (same qty-tier as Checkout).

### Placed Order profile properties

Written only in `orderProfileProperties()`:

```
last_order_at, last_order_value, last_order_sizes, filter_sizes,
preferred_merv, next_change_date, change_interval_days, stripe_customer_id
```

`next_change_date` = UTC date of `paidAt + intervalDays`. Interval is saved clock interval if present, else depth table, else 90:

| Depth | Days |
|---|---|
| 0.5 | 30 |
| 1 | 90 |
| 2 | 120 |
| 4 | 270 |
| 5 | 330 |

A later purchase **resets** the date. They must not get a due email the week after they restocked.

### Clock cadence properties

`cadenceProperties()` copies house traits. If the payload includes `next_change_date`, it is **rewritten** to `clock_next_change_date`. Replenish flows trigger on `next_change_date` only. That is FH-131 in code.

---

## 12. Native Stripe app (the second webhook)

Filter Hero already posts **Placed Order** from Checkout. The native app is extra: refunds, failed charges, invoices, Successfully Paid activity.

Event list (`shared/klaviyo-stripe.ts`) — **no** `checkout.session.*`:

```
charge.captured, charge.expired, charge.failed, charge.pending,
charge.refunded, charge.succeeded, charge.updated,
invoice.created, invoice.deleted, invoice.finalized,
invoice.marked_uncollectible, invoice.payment_action_required,
invoice.payment_failed, invoice.payment_succeeded, invoice.sent,
invoice.upcoming, invoice.updated, invoice.voided
```

URL builder:

```ts
`https://a.klaviyo.com/api/webhook/integration/stripe?c=${encodeURIComponent(companyId)}`
```

`ensureKlaviyoStripeWebhook()`:

1. Scrubs conflicting endpoints via `scrubConflictingStripeWebhooks`.
2. Throws if the Stripe key is not FILTER HERO (`acct_1U9bqlQEENEs0Qmw`). Sandboxes cannot OAuth to live Klaviyo.
3. Creates or updates the endpoint with the charge/invoice list.
4. Returns the signing secret **only on create**. Re-run with `--rotate` to mint a new secret.

Staff Settings → Klaviyo + Stripe → Connect calls the same function. Dots:

- Shop events (Placed Order via Filter Hero webhook) — always conceptually true; fulfillment lives on the shop URL.
- Native charge and invoice webhook — enabled **and** on FILTER HERO.
- OAuth account match — Stripe key account id === `acct_1U9bqlQEENEs0Qmw`.
- No fulfillment conflict / no native conflict — sandbox must not host either production URL.

HTTP 200 on the Klaviyo URL is **not** a recorded metric (FH-229). Confirm Successfully Paid activity > 0 after a paid FILTER HERO invoice. Test emails: Mailinator, not `@filterhero.net`.

Do **not** run `pnpm setup:klaviyo-stripe` against local sandbox keys and expect native metrics. Local `STRIPE_SECRET_KEY` remaining sandbox is expected until Railway uses `sk_live_`.

---

## 13. Catalog

JSON feed:

- Live: `https://filterhero.net/api/klaviyo/catalog.json`
- Local: `http://localhost:3001/api/klaviyo/catalog.json`

Built from `sellableSheetProducts()` — Model Pricing SKUs when `FULL_CATALOG=false`. Each item:

```
id, title, link, description, image_link, price, inventory_quantity, categories
```

`$schema` is draft-07. `inStock` true → inventory 999, else 0. Links are PDPs. Wholesale cost is **never** on the feed, Stripe Products, or `catalog_skus` (FH-223).

`pnpm sync:catalog` (`scripts/lib/catalog-sync.ts`) upserts:

1. Stripe Products `prod_fh_{id}`
2. Klaviyo custom catalog via bulk create / update / delete jobs
3. Supabase `catalog_skus` (`klaviyo_external_id`)

Klaviyo item ids are `$custom:::$default:::{externalId}`. Setup used to skip catalog jobs when existing count ≥ sheet count; that left the old mix. Sync always diffs create / update / delete.

**Open:** live JSON feed is still 299 (FH-300) because production is an older image and Railway `FULL_CATALOG=true` (FH-303). Do not point Klaviyo’s custom catalog **source URL** at the live JSON feed until that deploy. The API catalog (what email product blocks use) is already 293.

---

## 14. Brand (email defaults and templates)

One kit (`shared/email-brand.ts`):

| Token | Value |
|---|---|
| Navy | `#203868` |
| Burgundy | `#7F2328` |
| Ice | `#8EB0D8` |
| Deep | `#141E30` |
| Canvas | `#F6F7F9` |
| Logo | `https://filterhero.net/logo.png` |
| Logo box | ~200×141 (library may be 240×170). Never 240×566 (FH-236). |

Live Klaviyo defaults (`VnVNmQ`): logo id `6540539` (links to filterhero.net), primary button `6540565` Shop Now `#7F2328`, headings/links/footer navy, body `#141E30`, canvas `#F6F7F9`, footer links ice `#8EB0D8`. Header links are live shop URLs (`/sizes`, `/how-often-to-change-air-filter`) — not `/shop` or `/measure`.

Twelve CODE templates named `FH Welcome D0` … `FH Winback D14` embed `/logo.png`. They are **not** receipts. Copy says replacement reminders start after purchase.

**Live clones:** when a flow is Live, Klaviyo copies the library template onto a new `template_id`. `PATCH /api/templates/{cloneId}` 404s even though GET works (FH-237). The fix is `PATCH /api/flow-actions/{actionId}` pointing `message.template_id` at the branded library id. Klaviyo clones again. `pnpm setup:klaviyo --templates-only` remounts any live send missing `/logo.png`.

Do not send ice wordmark text (`color:#8eb0d8;font-weight:800;font-size:20px`) in place of the lockup (FH-234 / FH-236). Do not click **Save** on “Review your brand”.

---

## 15. Flows, segment, mapped metrics (live account)

Sending domain `klv.filterhero.net` is active. These seven flows must stay **Live**. `pnpm verify:klaviyo` fails on extras (they would collide with Resend/Stripe).

| Flow | Id | Trigger | Graph |
|---|---|---|---|
| FH Welcome | `UMtCJP` | Added to list `RiTKiS` | D0 now → wait 1d → D1 → wait 2d → D3 |
| FH Abandoned checkout | `SN8epW` | Started Checkout `VEnspC`. Profile filter: Placed Order count since flow-start = 0 | wait 1h → Abandon 1h → wait 23h → Abandon 24h |
| FH Post-purchase nurture | `WVmMG9` | Placed Order `TeVwgw` | wait 2d → Install → wait 8d → Review. **Not a receipt.** |
| FH Replenish T-7 | `WPU3gW` | Profile date `next_change_date` 7 days before, 09:00 profile TZ, never recur | target-date → email |
| FH Replenish T-2 | `RZ2b2J` | same, 2 days before | target-date → email |
| FH Replenish due | `TaqZUA` | same, 0 days | target-date → email |
| FH Win-back | `UkEkSf` | Segment **FH Lapsed 120** `TfSLjM` | D0 now → wait 14d → D14 |

**FH Lapsed 120:** at least one Placed Order all-time, zero Placed Order in last 120 days, email marketing subscribed.

Replenish triggers are date-only. They must **not** also trigger on Signed Up Reminder. They must **not** use `clock_next_change_date`.

Mapped metrics:

| Mapping | Metric | Live id (when known) |
|---|---|---|
| `revenue` | Placed Order | `TeVwgw` |
| `ordered_product` | Ordered Product | |
| `started_checkout` | Started Checkout | `VEnspC` |
| `added_to_cart` | Added to Cart | |
| `viewed_product` | Viewed Product | |
| `refunded_sales` | Refunded Payment | `TvC7dY` |

Leave **cancelled_sales** unmapped — Checkout Expired is not a cancelled sale. Do **not** map revenue to Successfully Paid.

Native Stripe metric ids (exist even when activity is 0): Successfully Paid `XHuURz`, Failed Payment `RHcdHv`, Refunded Payment `TvC7dY`, Issued Invoice `Vi3YJt`.

From on flow emails: `Filter Hero <info@filterhero.net>`, smart sending on, transactional **false**, add tracking params on. Drafts are created as `status: draft` then patched to `live` after the sending domain is active.

---

## 16. Install from zero (exactly this project)

Do this in order. Skip a step and you will recreate an FH-xxx.

### A. Keys

1. Klaviyo → Settings → API keys. Create a **private** key. Copy the **public / site ID** (`VnVNmQ`).
2. Put them in server env. `KLAVIYO_LIST_ID=RiTKiS` once Email List exists.
3. Never prefix the private key with `VITE_`.
4. Railway gets the same three vars. Local may use `KLAVIYO_DISABLE=1` for tests.

### B. DNS

1. Copy the four Klaviyo rows in §4 into Cloudflare. DNS only.
2. Do not touch `send` / `rsend` / `resend._domainkey`.
3. Keep Google SPF. Add the Klaviyo verification TXT beside it.
4. In Klaviyo, sending domain `klv.filterhero.net` should verify. `pnpm setup:klaviyo` will try verify + activate.

### C. Wire the shop

1. Code already in this repo. Deploy it. FH-196 / FH-201 were “keys in env, no routes on the live image.”
2. Confirm `GET /api/klaviyo/config` returns `{ "enabled": true, "publicKey": "VnVNmQ" }`.
3. Confirm homepage Network: `/api/klaviyo/config` then `static.klaviyo.com/onsite/js/VnVNmQ/klaviyo.js`.
4. `pnpm connect:klaviyo` once to stamp `.env` and prove profile-import + a Viewed Product seed.

### D. Account objects

```
pnpm setup:klaviyo
```

Idempotent. It:

1. Pings the account.
2. Resolves / prefers list `RiTKiS`.
3. Subscribes `klaviyo-wire-check@filterhero.net`.
4. Seeds every shop metric on that profile (so flow triggers have metric ids).
5. Upserts the twelve CODE templates with `/logo.png`.
6. Remounts live send-email actions onto those templates.
7. Syncs the custom catalog to the Model Pricing list.
8. Creates missing flows (skips if the name already exists — it does not rewrite a live graph).
9. Ensures `klv.filterhero.net`, deletes `send.filterhero.net` if Klaviyo claimed it.
10. Sets the seven known flow ids to `live` when the domain is active.
11. Maps ecommerce metrics (setup’s list originally omitted refunds; run `pnpm map:klaviyo-metrics` for `refunded_sales`).

Refresh templates only:

```
pnpm setup:klaviyo --templates-only
```

Catalog / Stripe / Supabase without touching flows:

```
pnpm sync:catalog
```

### E. Metric mapping

```
pnpm map:klaviyo-metrics
```

Must show `refunded_sales` → Refunded Payment. Revenue stays Placed Order.

### F. Native Stripe (FILTER HERO account only)

1. Stripe Dashboard → **FILTER HERO** (`acct_1U9bqlQEENEs0Qmw`), not sandbox.
2. Klaviyo → Integrations → Stripe → **Connect to Stripe**. OAuth that same account.
3. With a FILTER HERO key (test or live on **that** account):

   ```
   pnpm setup:klaviyo-stripe
   ```

   Or staff Settings → Connect. Paste the returned signing secret into Klaviyo webhook verification.
4. Confirm Dashboard lists `https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ` enabled, charge + invoice events only.
5. Shop webhook remains `https://filterhero.net/api/stripe/webhook` with Checkout events only, **live** FILTER HERO, secret in `STRIPE_WEBHOOK_SECRET`.
6. Pay a Mailinator test invoice on FILTER HERO. Successfully Paid activity must increment. Do not treat webhook 200 as success.

Local sandbox: use `pnpm setup:stripe-webhook` + `stripe listen` for **shop** events. Do not expect native Klaviyo metrics from sandbox. `oauthAccountMatch` will be false; that is correct until the key is FILTER HERO.

### G. Brand library (UI, once)

1. Media & brand → logo = shop lockup at `/logo.png`, aspect ~200×141.
2. Email defaults: white header + logo, navy footer, burgundy Shop Now, header links to live shop URLs.
3. Do **not** Save the “Review your brand” wizard.

### H. Prove it

```
pnpm verify:klaviyo
pnpm inspect:klaviyo
pnpm exec tsx scripts/check-klaviyo-stripe.ts
pnpm verify:env
pnpm verify:security
pnpm smoke
```

Live ping asserts: seven flows, no extras, Welcome on `RiTKiS`, Abandon on Started Checkout, Post-purchase on Placed Order, Win-back on `TfSLjM`, replenish on `next_change_date`, every live send HTML contains `/logo.png`, no ice wordmark, email defaults have a logo, header links are not `/shop` or `/measure`, revenue = Placed Order, refunded_sales = Refunded Payment, forbidden metrics trigger zero flows.

---

## 17. Scripts cheat sheet

| Command | Purpose |
|---|---|
| `pnpm setup:klaviyo` | Full account build (idempotent) |
| `pnpm setup:klaviyo --templates-only` | Library templates + remount live clones |
| `pnpm setup:klaviyo-stripe` | Native charge/invoice webhook (`--rotate` mints a new secret) |
| `pnpm map:klaviyo-metrics` | Ecommerce + refund mapping |
| `pnpm connect:klaviyo` | Stamp `.env`, wire-check profile/event |
| `pnpm inspect:klaviyo` | Dump metrics, flows, templates, lists, catalog, domains |
| `pnpm verify:klaviyo` | Payload + live invariants |
| `pnpm sync:catalog` | Stripe + Klaviyo + Supabase SKUs |
| `pnpm exec tsx scripts/check-klaviyo-stripe.ts` | Native metrics + oauth match |
| `pnpm exec tsx scripts/test-klaviyo-stripe.ts` | Do **not** run against sandbox keys expecting native metrics |
| `pnpm exec tsx scripts/retry-klaviyo-stripe-event.ts` | Retry a Stripe event into the native app |
| `pnpm exec tsx scripts/inspect-klaviyo-stripe-events.ts` | Inspect native events |
| `pnpm exec tsx scripts/wait-klaviyo-stripe-events.ts` | Wait until native metrics appear |
| `pnpm exec tsx scripts/lookup-klaviyo-test-profile.ts` | Find a test profile |
| `pnpm exec tsx scripts/test-shop-klaviyo.ts` | Shop event path |

---

## 18. Hard invariants (the “do not” list)

1. Do not connect Klaviyo to **FILTER HERO sandbox**.
2. Do not add Checkout session events to the Klaviyo Stripe endpoint.
3. Do not point the Filter Hero shop webhook at Klaviyo.
4. Do not point sandbox or FILTER HERO **test mode** at `https://filterhero.net/api/stripe/webhook`.
5. Do not treat a sandbox copy of the Klaviyo URL as `oauthAccountMatch`.
6. Do not trigger welcome, abandon, replenish, or a receipt from **Successfully Paid**.
7. Do not add an order-confirmation or quote-receipt flow.
8. Do not write `next_change_date` from Filter Clock, `/api/identify`, or Signed Up Reminder.
9. Do not subscribe clock saves to Email List.
10. Do not map revenue to Successfully Paid. Do not leave `refunded_sales` unmapped.
11. Do not create a second welcome list named Filter Hero Marketing when `RiTKiS` exists.
12. Do not point `send.filterhero.net` at Klaviyo.
13. Do not PATCH live flow template clones; remount the flow-action.
14. Do not send ice wordmark text instead of `/logo.png`.
15. Do not Save Klaviyo’s “Review your brand” wizard.
16. Do not put wholesale cost on Klaviyo items.
17. Do not skip `pnpm sync:catalog` after a sheet rebuild. Do not skip catalog jobs because count ≥ sheet count.
18. Do not put the private key in `VITE_`.
19. Do not import mailer / Resend / CRM from `server/klaviyo.ts`, or Klaviyo from `server/crm/` / `server/mailer.ts`.
20. Do not drop `/api/identify` because onsite exists.
21. Do not open plaintext Klaviyo in the **production** CSP.
22. Do not use `@filterhero.net` as the Stripe test email for native metrics.
23. Do not let `server/admin/` send mail or write Klaviyo.

---

## 19. Open issues that still touch Klaviyo

Logged in [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). Status as of 2026-09-20.

### FH-305 — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO

**Open.** Live Checkout uses Railway `sk_test_` from sandbox `acct_1U9bqs790NnFGDLv`. Shop fulfillment and Klaviyo OAuth belong on live FILTER HERO. Real cards cannot pay. Do not copy local sandbox `STRIPE_SECRET_KEY` onto Railway. Do not connect Klaviyo to sandbox.

### FH-303 — Railway `FULL_CATALOG=true` conflicts with the Model Pricing shop

**Open.** Next rebuild with current Railway vars would expand the Klaviyo JSON feed (and the shop) to the archived universe. Set both flags `false`, then rebuild from `main`.

### FH-300 — Production Klaviyo JSON feed still serves a 299-SKU mix

**Open.** Local feed and the Klaviyo **API** catalog are 293. Live `https://filterhero.net/api/klaviyo/catalog.json` is still 299 (88 ids not on the current sheet). Do not point Klaviyo’s custom catalog at that live URL until deploy. `pnpm smoke` fails if local catalog.json is not 293.

### FH-302 — Add to cart leaves focus on a button Radix then marks aria-hidden

**Open.** Cart still opens. Klaviyo **Added to Cart** still fires. A11y warning only.

### FH-294 — Sandbox Stripe webhooks impersonated live FILTER HERO

**Fixed** in code; keep the invariant. Sandbox must not host production shop or Klaviyo URLs. `verify:env` must not treat a sandbox copy of the Klaviyo URL as success.

---

## 20. Complete Klaviyo issue and fix log

Every item below is copied from `docs/ISSUES-AND-FIXES.md` where Klaviyo was the subject or a named invariant. Chat is not the log; this section is the Klaviyo-shaped index.

### FH-131 — Filter Clock must not send replacement emails before a purchase

- **Status:** mitigated
- **Symptom:** Clock copy promised “we’ll email you before {date}” when someone only checked or saved a cadence.
- **Do NOT:** Enroll replenish from Filter Clock check, house-profile save, or Signed Up Reminder without Placed Order.
- **Do:** Clock is a calculator. Store cadence. Set sendable `next_change_date` only on Placed Order (`paid_at + interval`). Copy says emails start after checkout.
- **Code:** `cadenceProperties()` remaps the clock date to `clock_next_change_date`. `/api/identify` allowlist cannot write `next_change_date`. Replenish flows trigger on `next_change_date` only. `klaviyoMaySubscribe` is false for `reminder`.

### FH-171 — Sign-in vanished after switching to family-section-blue *(CRM mailbox invariant)*

Named in `email-channels.ts`: CRM is never a sender — a third mailbox re-opens FH-171. Admin/CRM must not send mail or write Klaviyo.

### FH-192 — Klaviyo onsite never loaded if config fetch failed once

- **Status:** fixed
- **Symptom:** `bootKlaviyo()` set `booted = true` before `/api/klaviyo/config`. A refused proxy left `publicKey` empty for the tab.
- **Do:** Retry config. Set `booted` only after 200.

### FH-193 — Cart Klaviyo pack shots used an unsafe MERV cast

- **Status:** fixed
- **Symptom:** Carbon cart lines sent MERV 8 pack shot and SKU `size-8`.
- **Do:** Resolve `getProductById`. Pass `product.merv` + `product.isCarbon`. Carbon suffix `carbon`.

### FH-196 — This branch had Klaviyo keys and DNS but no live integration

- **Status:** fixed
- **Symptom:** Env and Cloudflare were ready. No `server/klaviyo.ts`, no onsite, no events. Shoppers never reached Email List or the seven flows.
- **Do:** Server tracks quote / support / clock / checkout / Placed Order. Marketing list join needs the checkbox. Clock stores `clock_next_change_date` only.

### FH-201 — Production shop had Klaviyo keys but no live routes

- **Status:** fixed
- **Symptom:** Railway had the three Klaviyo vars. Live image was pre-Klaviyo. `/api/klaviyo/config` 404ed. Onsite never loaded.
- **Do:** Deploy the integration. Keep `klv.filterhero.net`. Do not point `send.filterhero.net` at Klaviyo.

### FH-209 — Local CSP blocked Klaviyo onsite identify

- **Status:** fixed
- **Symptom:** Dev CSP allowed HTTPS Klaviyo only. On `http://localhost` onsite posts to `http://a.klaviyo.com`.
- **Do:** Dev `connect-src` includes `http://*.klaviyo.com`. Production stays HTTPS + `upgrade-insecure-requests`.

### FH-212 — Local CSP still blocked Klaviyo identify after FH-209

- **Status:** fixed
- **Symptom:** Chrome drops `http://*.klaviyo.com` as a source for that host.
- **Do:** Also name `http://a.klaviyo.com` in **development** CSP. Never add it to production.

### FH-214 — Admin console bugs after the first landing *(Klaviyo health)*

- **Status:** fixed
- **Symptom:** A Klaviyo health outage blanked the whole systems card.
- **Do:** Load CRM / account / Klaviyo in parallel. Keep the page up if Klaviyo throws.

### FH-223 — Stripe, Klaviyo, CRM, and accounts still had the old catalog

- **Status:** fixed
- **Symptom:** Shop restricted to 293 SKUs, but Klaviyo `setup:klaviyo` skipped catalog jobs when the old feed was larger.
- **Do:** `pnpm sync:catalog` create / update / delete. Never skip because existing count ≥ sheet count. No wholesale cost on Klaviyo items.

### FH-228 — Klaviyo had no native Stripe charge/invoice webhook

- **Status:** fixed
- **Symptom:** Placed Order existed. Successfully Paid / Failed Payment / Refunded Payment stayed empty.
- **Do:** Second Stripe endpoint to Klaviyo for charge + invoice only. Finish Connect to Stripe in the UI. Paste signing secret.

### FH-229 — Native Klaviyo Stripe app accepts webhooks but does not record metrics

- **Status:** fixed (procedure)
- **Symptom:** Sandbox webhook `we_1UGWbF790NnFGDLvIVtyg0bK` returned 200; Successfully Paid stayed at 0. Historical import also 0.
- **Do NOT:** Treat HTTP 200 as a recorded metric. Do not OAuth sandbox. Do not add Checkout events to the Klaviyo endpoint.
- **Do:** Connect FILTER HERO `acct_1U9bqlQEENEs0Qmw`. Native test destination `we_1UGgz8QEENEs0QmwgI31tz6f`. Pay a Mailinator invoice on that account.

### FH-230 — Klaviyo Stripe checker treated metrics as missing

- **Status:** fixed
- **Symptom:** Checker printed Successfully Paid etc. as `id: null` because `/api/metrics?page[size]=` 400s on revision `2026-07-15`.
- **Do:** Paginate with `links.next`. Never `page[size]` on metrics.

### FH-231 — Local Klaviyo onsite CORS failed on HTTP→HTTPS redirect

- **Status:** fixed
- **Symptom:** Klaviyo.js posted HTTP; 301 to HTTPS; Chrome blocked preflight. `/api/identify` still wrote the profile.
- **Do:** Rewrite `http://*.klaviyo.com` fetch/XHR/beacon to HTTPS on HTTP shops. Keep server identify/track.

### FH-234 — Klaviyo emails used text wordmark instead of the Filter Hero logo

- **Status:** fixed
- **Do:** Brand library logo is `/logo.png`. All twelve FH CODE templates embed it. `pnpm setup:klaviyo --templates-only`.

### FH-236 — Live Klaviyo flows still sent the ice wordmark

- **Status:** fixed
- **Symptom:** Library templates had the logo; live clones still had ice “Filter Hero” text. Logo `6540539` was stretched 240×566.
- **Do:** Remount live sends (FH-237). Logo aspect ~200×141 / 240×170.

### FH-237 — Live Klaviyo flow clones reject template PATCH

- **Status:** fixed
- **Symptom:** `PATCH /api/templates/{cloneId}` 404 “Template with id does not exist” even though GET returned HTML.
- **Do:** `PATCH /api/flow-actions/{id}` with the library `template_id`. Klaviyo clones onto a new id.

### FH-293 — Klaviyo refunds unmapped and welcome-list fallback could split Email List

- **Status:** fixed
- **Symptom:** `refunded_sales` had no metric, so revenue would not subtract Refunded Payment. `resolveMarketingListId` could create **Filter Hero Marketing** if `KLAVIYO_LIST_ID` was empty. Inspect 400ed `/api/brand-logos` on revision `2026-07-15`.
- **Do:** Map `refunded_sales` → Refunded Payment `TvC7dY`. Prefer `RiTKiS` / Email List. Verify fails if an extra flow appears, if replenish uses `clock_next_change_date`, or if Successfully Paid / quote / clock metrics trigger a flow.

### FH-300 / FH-303 — Catalog mix on production

See §19. Local 293. Live JSON feed 299 until deploy. Railway `FULL_CATALOG` must be false.

### Adjacent issues (Klaviyo mentioned, not the root)

| Id | Why it is here |
|---|---|
| FH-191 | `.env.example` omitted Klaviyo list/site IDs; `verify:env` now pings the account |
| FH-210 | Production image lagged local Klaviyo routes |
| FH-213 | Staff console must not send mail or write Klaviyo |
| FH-235 | Resend HTML must match Klaviyo/Stripe brand (logo, navy, burgundy) |
| FH-246 / FH-291 | Resend verify; CRM and Klaviyo already off during those QA paths |
| FH-294 | Sandbox webhooks at production + sandbox copy of the Klaviyo URL |
| FH-302 | Added to Cart still fires through the a11y bug |
| FH-305 | Live keys vs sandbox; do not connect Klaviyo to sandbox |

---

## 21. How a shopper actually moves through it

1. **Land.** `bootKlaviyo` loads onsite. Active on Site if the script is up.
2. **Size page.** Viewed Size + Viewed Product. MERV chip → Selected MERV.
3. **Add to cart.** Added to Cart (onsite always; server if email already remembered).
4. **Type email in the cart.** Identify (onsite + `/api/identify`). Optional marketing checkbox travels to Checkout metadata.
5. **Start Checkout.** Stripe session. If email present: Started Checkout with `CheckoutURL` and line items. If marketing box: subscribe to `RiTKiS` → **FH Welcome**.
6. **Leave Stripe.** Abandon flow waits 1 hour, exits if Placed Order happens. If the session expires and Stripe has an email: Checkout Expired (not cancelled_sales).
7. **Pay.** Shop webhook: Placed Order + Ordered Product, profile `next_change_date`, Resend order confirmation, Stripe receipt, account attach, CRM close. Native webhook: Successfully Paid (no flow). Post-purchase nurture waits 2 days (install, not a receipt). Replenish date triggers T-7 / T-2 / due.
8. **Quote with marketing box.** Requested Quote + subscribe → Welcome. Quote receipt is Resend. No Klaviyo “we got your quote.”
9. **Filter Clock save.** Signed Up Reminder + `clock_next_change_date`. Staff alert only. No list. No replenish. No shopper email.
10. **120 days after last order.** Segment FH Lapsed 120 → Win-back, if still subscribed.

That is the whole product. Anything else is a regression.

---

## 22. Related docs

- [KLAVIYO.md](./KLAVIYO.md) — short live-ops sheet
- [KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md) — future CDP spec, not this install
- [RESEND.md](./RESEND.md) — transactional mailbox; do not overlap
- [CLOUDFLARE-NAMESERVERS.md](./CLOUDFLARE-NAMESERVERS.md) — `klv` + DKIM + site verification
- [STRIPE-BOOKS.md](./STRIPE-BOOKS.md) — webhook ownership vs sandbox
- [CRM.md](./CRM.md) — staff board; never a Klaviyo writer
- [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md) — canonical FH-xxx log
