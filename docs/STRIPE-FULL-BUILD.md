# STRIPE FULL BUILD

Filter Hero’s definitive Stripe install: how money is taken, how tax is calculated, how fulfillment is wired, how Klaviyo is *not* mixed into Checkout events, and every issue that taught this shape.

This is not a generic Stripe tutorial. It is the exact architecture in this repository as of 2026-09-20. Books mapping lives in [STRIPE-BOOKS.md](./STRIPE-BOOKS.md). Marketing email ownership lives in [KLAVIYO.md](./KLAVIYO.md) and `shared/email-channels.ts`. Bugs live in [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). If those files and this one disagree, the code in `server/stripe.ts` and `shared/stripe-accounts.ts` wins.

---

## 1. What this shop actually is

Filter Hero sells HVAC pleated filters. Shoppers pick a size and MERV on the site, add a pack to the cart, and pay on **Stripe-hosted Checkout**. There is no Stripe.js Payment Element, no PaymentIntent created by the browser, no subscription, no Connect marketplace, no Terminal.

Stripe’s job in this project is narrow:

| Stripe does | Stripe does not |
|---|---|
| Hosted Checkout Session (`mode: payment`) | Embedded card form |
| Collect US shipping + phone | Freight calculation (rate is `$0` today) |
| Stripe Tax on the hosted page | Recalculate tax in QuickBooks |
| Create/reuse a Customer | Own the shopper login |
| Create an Invoice on pay (for QBO) | Be the packing list of record |
| Send the **payment receipt** | Send the branded order confirmation |
| Dashboard webhook → Filter Hero fulfillment | Post Checkout events into Klaviyo’s native app |
| Charge/invoice webhook → Klaviyo native app | Trigger welcome / abandon / replenish / a second receipt |

One shopper message, one sender (`shared/email-channels.ts`):

- **Stripe** = payment receipt
- **Resend** (`Filter Hero <info@filterhero.net>`) = branded order confirmation + quote/support receipts
- **Klaviyo** (`VnVNmQ`, sending domain `klv.filterhero.net`) = welcome, abandoned checkout, post-purchase nurture, replenish, win-back, campaigns
- **CRM** = staff pipeline in Postgres. Never mail. Never a Klaviyo write.

Do not add a Klaviyo order-confirmation or quote-receipt flow. Do not trigger welcome, abandon, replenish, or a receipt from **Successfully Paid**.

---

## 2. Accounts — the invariant that everything else hangs on

There are two Stripe accounts. They must never share webhooks.

| Name | Account id | Role |
|---|---|---|
| **FILTER HERO** (live) | `acct_1U9bqlQEENEs0Qmw` | Production Checkout. Shop fulfillment webhook. Klaviyo OAuth. Real cards. |
| **FILTER HERO sandbox** | `acct_1U9bqs790NnFGDLv` | Local `.env` only. `stripe listen`. Never points at `filterhero.net`. Never OAuths to live Klaviyo. |

Canonical source: `shared/stripe-accounts.ts`.

```ts
export const FILTER_HERO_ACCOUNT_ID = "acct_1U9bqlQEENEs0Qmw";
export const FILTER_HERO_SANDBOX_ACCOUNT_ID = "acct_1U9bqs790NnFGDLv";

export const SHOP_FULFILLMENT_WEBHOOK_URL = "https://filterhero.net/api/stripe/webhook";
export const SHOP_FULFILLMENT_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
] as const;
```

Rules, in order:

1. Production fulfillment (`https://filterhero.net/api/stripe/webhook`) is allowed **only** when the key is FILTER HERO **and** `livemode === true`.
2. Local sandbox uses `stripe listen --forward-to localhost:3001/api/stripe/webhook`. That CLI signing secret stays in local `.env`. It is never copied onto Railway.
3. Klaviyo’s native Stripe app OAuths **FILTER HERO only**. Stripe Sandboxes cannot connect to live Klaviyo.
4. Native Klaviyo destination is charge + invoice events only. Checkout session events stay on the shop webhook.
5. The webhook handler drops live events on a test key and test events on a live key.

`pnpm setup:stripe-webhook` **scrubs** any shop or Klaviyo endpoint that violates those rules. That is how FH-294 was closed.

Open production gap: **FH-305**. Railway still holds FILTER HERO **sandbox test** keys (`sk_test_` / `pk_test_`). Real cards cannot pay until Railway gets FILTER HERO **live** `sk_live_` / `pk_live_` and a rebuild (Vite bakes `VITE_`). Do **not** copy local `STRIPE_SECRET_KEY` onto Railway.

---

## 3. File map

### Core

| File | Job |
|---|---|
| `server/stripe.ts` | Stripe client, Checkout Session create, webhook handler, order log, success lookup |
| `server/stripe-webhooks.ts` | Account context, conflict scrub, health |
| `shared/stripe-accounts.ts` | Account ids, webhook URL classification, ownership rules |
| `shared/stripe-tax.ts` | Tax codes, Tax Settings gate, registrations |
| `shared/stripe-catalog.ts` | Mapping file written by `pnpm sync:catalog` |
| `shared/stripe-catalog.json` | `productId → prod_fh_{id}` (mode-matched) |
| `shared/klaviyo-stripe.ts` | Native Klaviyo URL + charge/invoice event list |
| `server/klaviyo-stripe.ts` | Create/repair the native Klaviyo endpoint |
| `shared/email-channels.ts` | Who may send which shopper message |
| `shared/products.ts` | Catalog, `unitPriceForQty`, `catalogStripeProductId` |

### HTTP + UI

| File | Job |
|---|---|
| `server/index.ts` | Raw webhook route **before** JSON parser; `POST /api/checkout`; `GET /api/checkout/session` |
| `client/src/components/CartDrawer.tsx` | Email + consent → redirect to Stripe |
| `client/src/pages/CheckoutSuccess.tsx` | Verify `paid` before clearing the cart |
| `client/src/pages/CheckoutCancel.tsx` | Cart kept; quote instead → `/#contact` |
| `client/src/pages/admin/Settings.tsx` | Tax + webhook + Klaviyo Connect status |
| `server/admin/routes.ts` | Settings snapshot + `POST /klaviyo-stripe/connect` |
| `server/admin/config.ts` | `maintenanceMode` pauses Checkout |

### Downstream of a paid session

| File | Job |
|---|---|
| `server/klaviyo.ts` | Started Checkout / Checkout Expired / Placed Order / Ordered Product |
| `server/mailer.ts` | Branded Resend confirmation (`order-confirmation/{sessionId}`) |
| `server/account.ts` | Attach purchased SKUs to a customer profile |
| `server/crm/intake.ts` | Close open deals on purchase |
| `server/data-store.ts` | `orders.json` lives in `DATA_DIR` or `<cwd>/server/data` |

### Install + verify

| File | Job |
|---|---|
| `scripts/setup-stripe-webhook.ts` | Live: create shop webhook. Sandbox: delete conflicts. Enable Google Pay on the default PMC. |
| `scripts/setup-klaviyo-stripe.ts` | Create/repair native charge/invoice webhook |
| `scripts/sync-catalog.ts` + `scripts/lib/catalog-sync.ts` | Upsert Stripe Products `prod_fh_{id}` |
| `scripts/debug-stripe-checkout.ts` | Webhook QA + live session create + customer reuse |
| `scripts/verify-stripe-books.ts` | Tax codes, metadata cap, Tax Settings, webhook health |
| `scripts/verify-env.ts` | Key format + live ping + webhook ownership |
| `scripts/check-klaviyo-stripe.ts` | Native metrics + oauth account match |
| `.env.example` | Variable names (never real secrets) |

SDK: `stripe` `^17.7.0` (`package.json`). Client: `new Stripe(process.env.STRIPE_SECRET_KEY)`. Do not set a global `stripe.api_key`.

---

## 4. Environment variables

From `.env.example`. Values are never committed.

| Variable | Where | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | Server only | `sk_test_…` locally (sandbox). `sk_live_…` on Railway (FILTER HERO live). |
| `STRIPE_WEBHOOK_SECRET` | Server only | Local = `stripe listen` `whsec_`. Railway = Dashboard endpoint secret for `/api/stripe/webhook`. They are different. |
| `STRIPE_TAX_CODE` | Optional | Override product tax code. Default `txcd_99999999`. |
| `STRIPE_PUBLISHABLE_KEY` | Unused today | Hosted Checkout does not need it. Kept for a future embedded form. Never put `sk_` in a `VITE_` var. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Vite build | Same as publishable. Baked at `pnpm build`. Changing Railway’s `VITE_` without a rebuild does nothing. |
| `CLIENT_URL` | Server | Success/cancel origin. Local `http://localhost:3000`. Production = site origin. |
| `SITE_URL` / `VITE_SITE_URL` | SEO + redirects | `https://filterhero.net` |
| `DATA_DIR` | Optional | Override `server/data` so production orders survive redeploys (FH-122). |
| `KLAVIYO_PUBLIC_API_KEY` | Klaviyo company | `VnVNmQ` — used to build the native webhook URL. |
| `KLAVIYO_PRIVATE_API_KEY` | Server only | Track Placed Order. Never `VITE_`. |

`getStripe()` treats a missing key **or** a key containing `...` as unconfigured (the `.env.example` placeholder). Checkout then throws `Stripe is not configured. Set STRIPE_SECRET_KEY in .env`.

---

## 5. Shopper flow (end to end)

```
Cart drawer
  email required (abandon / Started Checkout)
  marketing checkbox optional
  POST /api/checkout  { items, email, marketingConsent }
        │
        ▼
  createCheckoutSession()
    lookup Stripe Customer by email
    attach catalog Product if it exists in this account
    price_data with qty-tier unit_amount (exclusive)
    automatic_tax only if Tax Settings status === "active"
    redirect URL returned
        │
        ▼
  window.location = session.url     (Stripe-hosted page)
    US shipping address
    phone
    tax line after address (only in registered states)
    pay
        │
        ├─ success → /checkout/success?session_id={CHECKOUT_SESSION_ID}
        │              GET /api/checkout/session
        │              clear cart ONLY if payment_status === "paid"
        │
        ├─ cancel  → /checkout/cancel
        │              cart kept
        │
        └─ Stripe Dashboard (live FILTER HERO) POSTs signed event
              checkout.session.completed
                write orders.json (idempotent on sessionId)
                Klaviyo Placed Order + Ordered Product
                Resend confirmation (stamp confirmationSentAt)
                attach SKUs to /account profile
                close CRM deals
              checkout.session.expired
                Klaviyo Checkout Expired
```

A **second** Stripe webhook, on the same FILTER HERO account, posts charge/invoice events to Klaviyo’s native app. That is **not** this handler. It never sees `checkout.session.*`.

---

## 6. Client wiring

Checkout is a **server-created redirect**. The browser never talks to Stripe.

### Cart → session

`client/src/components/CartDrawer.tsx`

1. Email is required (`you@email.com` shape). Copy: *Enter your email so we can save the cart if checkout is left open.*
2. `identifyShopper({ email })` is fire-and-forget so Klaviyo onsite can see the address before redirect.
3. Body:

```json
{
  "items": [{ "productId": 2105, "quantity": 6 }],
  "email": "you@email.com",
  "marketingConsent": false
}
```

4. On `{ url }` → `window.location.href = data.url`.
5. Maintenance (`site-config.json` `maintenanceMode`) disables the button and the API returns `503 maintenance`.

Cart subtotal is exclusive. Shipping line is **At checkout**, not Free (FH-253).

### Success

`client/src/pages/CheckoutSuccess.tsx`

- `noindex`.
- Reads `session_id` from the query.
- `GET /api/checkout/session?session_id=`
- Clears the cart **only** when Stripe says `paid` (FH-121).
- Shows subtotal / tax / total in cents from the session.
- Copy: Filter Hero emails the confirmation; Stripe emails the payment receipt.

### Cancel

`client/src/pages/CheckoutCancel.tsx`

- Cart stays.
- “Request a quote instead” is `window.location.href = "/#contact"` so Home mounts with a hash (FH-127).

`/checkout/` is disallowed in `robots.txt`. Success and cancel are `noindex`.

---

## 7. Express routes — order of registration matters

`server/index.ts`

The webhook **must** be registered before `express.json()`. Stripe signs the raw bytes. A parsed body will fail `constructEvent`.

```ts
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const result = await handleStripeWebhook(
        req.body as Buffer,
        req.headers["stripe-signature"] as string | undefined,
      );
      res.json(result);
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "webhook_failed", message: "Webhook rejected." },
        "[stripe webhook]",
      );
      res.status(status).json(body);
    }
  },
);

app.use(express.json({ limit: "1mb" }));
```

Then:

- `POST /api/checkout` — `checkoutLimiter` (10 / 15 min). Zod body. `isCheckoutPaused()` → 503. Returns `{ url }` only.
- `GET /api/checkout/session` — validates `cs_(test|live)_…`. Returns `{ paid, status, amountSubtotal, amountTax, amountTotal, currency }`. Failures use a fixed `session_lookup_failed` code and `paid: false`. Never leak Stripe error text (FH-200, FH-205).

Checkout body schema:

```ts
{
  items: { productId: int > 0, quantity: 1–50 }[]  // 1–50 lines
  email?: email | ""
  marketingConsent?: boolean
}
```

Empty cart is `400 { code: "checkout_failed" }`. Unsigned webhook is `400 { code: "webhook_failed" }`. Smoke asserts the body does not contain `stripe-signature` or `whsec_`.

---

## 8. Creating the Checkout Session — the actual code

All of this is `createCheckoutSession` in `server/stripe.ts`.

### 8.1 Client

```ts
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("...")) return null;
  return new Stripe(key);
}
```

No `apiVersion` pin in this repo. No `payment_method_types`. Payment methods come from the Dashboard Payment Method Configuration (Google Pay is forced `on` by `setup:stripe-webhook`). Omitting `payment_method_types` is required so Stripe can show dynamic methods.

### 8.2 Line items

For each cart line:

1. Resolve the shop product. Refuse unknown ids and `inStock: false`.
2. Quantity 1–50.
3. Unit price = `unitPriceForQty(product.price, quantity, product)` — live qty-tier tickets (1 / 2 / 4 / 6+ / 12+), then `Math.round(unit * 100)` cents.
4. Try to attach an existing Stripe Product:
   - `prod_fh_{shopProductId}` (`catalogStripeProductId`)
   - else mapped id from `shared/stripe-catalog.json` **only if** that file’s `livemode` matches the current key (`stripeKeyIsLive()` = key starts with `sk_live`)
5. Always send `price_data` (not a stored Price id) because pack quantity changes the unit amount. Catalog Product is attached when found; otherwise inline `product_data`.

```ts
line_items.push({
  quantity: item.quantity,
  price_data: {
    currency: "usd",
    unit_amount: Math.round(unit * 100),
    tax_behavior: "exclusive",
    ...(catalogProductId
      ? { product: catalogProductId }
      : {
          product_data: {
            name: lineLabel(product),
            description: "HVAC pleated filter",
            tax_code: taxCode,          // txcd_99999999
            metadata: {
              productId: String(product.id),
              size: product.size,
              merv: String(product.merv),
            },
          },
        }),
  },
});
```

Wholesale cost is **never** sent to Stripe (FH-223).

Items metadata is JSON, capped at 490 characters (Stripe metadata is 500). Large carts truncate to the first 8 lines.

### 8.3 Customer reuse (FH-204)

```ts
const customerId = email ? await findCustomerIdByEmail(stripe, email) : null;
```

- Existing Customer → `customer` + `customer_update: { name, address, shipping: "auto" }`. Do **not** also send `customer_email`.
- New email → `customer_creation: "always"` and `customer_email` if present.

QBO’s Stripe Connector needs one Customer per person. Creating a new Customer on every checkout broke that.

### 8.4 Tax gate (FH-139, FH-132, FH-211, FH-251)

```ts
const tax = await readStripeTaxReadiness(stripe);
// automaticTax === true only when Tax Settings status === "active"
automatic_tax: { enabled: tax.automaticTax },
```

If settings are `pending` (no head office), forcing `automatic_tax: true` 400s every cart: *You must have a valid head office address to enable automatic tax calculation.*

If settings are `active` but there is **no active registration** for the ship-to state, Checkout still succeeds and charges **$0 tax** with no error. The code warns. Registrations are a Dashboard action, not a deploy.

FH-211 turned tax **off** to avoid Stripe’s tax-calculation fee and book tax in QBO. That meant shoppers never paid tax. **FH-251 superseded it:** collect Stripe Tax at Checkout; QBO records the line Stripe already collected. Do not let QBO Automated Sales Tax recalculate the same sale.

### 8.5 Session create payload (complete)

```ts
await stripe.checkout.sessions.create({
  mode: "payment",
  line_items,
  success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${clientUrl}/checkout/cancel`,
  shipping_address_collection: { allowed_countries: ["US"] },
  shipping_options: [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: 0, currency: "usd" },
        display_name: "Shipping",          // never "Free shipping" (FH-253)
        tax_behavior: "exclusive",
        tax_code: "txcd_92010001",         // Shipping
      },
    },
  ],
  phone_number_collection: { enabled: true },
  invoice_creation: { enabled: true },
  automatic_tax: { enabled: tax.automaticTax },
  // customer OR customer_creation — never both
  metadata: { items, email?, marketingConsent?: "1" },
  payment_intent_data: { metadata: { items } },
});
```

Why each field exists:

| Field | Why |
|---|---|
| `mode: payment` | One-time filter sale. No subscriptions. |
| `success_url` with `{CHECKOUT_SESSION_ID}` | Success page can ask Stripe if it is actually paid. |
| `shipping_address_collection` US | Cannot ship without a deliverable address (FH-120). Checkout requires a shipping rate when this is on. |
| `$0` `shipping_rate_data` labeled **Shipping** | Contiguous-US fulfillment. Stripe still prints **Free** next to a zero amount (FH-254, open). |
| `phone_number_collection` | Packing + CRM. |
| `invoice_creation` | QBO Stripe Connector has an Invoice to attach. |
| `automatic_tax` gated | Avoid FH-139 400; collect tax when ready (FH-251). |
| Session + PaymentIntent metadata `items` | Webhook and Klaviyo can rebuild the cart after pay / expire. |

After create, if email + `session.url` exist, `syncStartedCheckout` fires (Klaviyo metric **Started Checkout**, unique id `checkout:{sessionId}`). Failure is logged; Checkout URL is still returned.

---

## 9. Stripe Tax — codes, settings, registrations

`shared/stripe-tax.ts`

| Code | Meaning | Used on |
|---|---|---|
| `txcd_99999999` | General - Tangible Goods | Filter line items + Tax Settings default |
| `txcd_92010001` | Shipping (with a sale of goods) | Checkout shipping option |

`ensureStripeTaxDefaults` (verify + debug scripts) sets Tax Settings defaults to exclusive + tangible goods when they drifted.

Readiness:

```
configured          → API reachable
settingsStatus      → "active" | "pending"
automaticTax        → status === "active"
collecting          → at least one registration.status === "active"
headOfficeReady     → settings.head_office set
registrations[]     → country / US state / status
```

Dashboard work (not code):

1. [Tax settings](https://dashboard.stripe.com/settings/tax) — head office so status is `active`.
2. [Tax registrations](https://dashboard.stripe.com/tax/registrations) — each state **already** registered to collect. Adding a Stripe row does not register you with the state.
3. Tax → Integrations automatic collection on invoices and Payment Links can stay **off**. Shop Checkout sets `automatic_tax` itself.
4. Stripe bills a tax-calculation fee on completed **live** Checkouts and finalized invoices.

Staff `/admin/settings` shows head office, automatic tax, and collecting registrations.

---

## 10. Catalog sync — Stripe Products without using stored Prices at Checkout

`pnpm sync:catalog` → `scripts/lib/catalog-sync.ts` `syncStripeCatalog()`.

- Sellable Model Pricing XLS (shop copy: `shared/pricing/model-pricing.csv`).
- Stripe Product id `prod_fh_{shopProductId}` when Stripe allows a custom id; otherwise Stripe assigns an id and the mapping file stores it.
- `metadata.source = filterhero-catalog`, plus `productId`, `size`, `merv`, `carbon`, `wholesaleSku` (sku string only — **not cost**).
- `tax_code`, `shippable: true`, `type: good`, `unit_label: filter`, shop URL + pack-shot image.
- Default Price is qty-1 exclusive cents, lookup key `fh_{id}_q1`. Checkout **does not use that Price** for the session; it uses `price_data` so 6-packs and 12-packs get the right unit amount.
- Products no longer on the sheet are archived (`active: false`).
- Writes `shared/stripe-catalog.json` with `account`, `livemode`, `products`. Checkout ignores the mapping if `livemode` does not match the current secret key — a test sync cannot attach to a live session.

Local `stripe-catalog.json` currently points at sandbox `acct_1U9bqs790NnFGDLv`, `livemode: false`. Before go-live, run `pnpm sync:catalog` against FILTER HERO **live** `sk_live_`. The sync already warns if the account is not `acct_1U9bqlQEENEs0Qmw`.

---

## 11. Two webhooks, two jobs

### 11.1 Shop fulfillment (this app)

| | |
|---|---|
| URL | `https://filterhero.net/api/stripe/webhook` |
| Account | FILTER HERO live only |
| Events | `checkout.session.completed`, `checkout.session.expired` |
| Secret | Railway `STRIPE_WEBHOOK_SECRET` |
| Creates | `pnpm setup:stripe-webhook` with the **live** key |

Local: `stripe listen --forward-to localhost:3001/api/stripe/webhook` → paste CLI `whsec_` into local `.env`.

### 11.2 Klaviyo native Stripe app

| | |
|---|---|
| URL | `https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ` |
| Account | FILTER HERO (`acct_1U9bqlQEENEs0Qmw`) — test mode or live, never sandbox |
| Events | Charge + invoice list in `KLAVIYO_STRIPE_EVENTS` (`shared/klaviyo-stripe.ts`) |
| Connect UI | `https://www.klaviyo.com/integration/stripe` |
| Creates | `pnpm setup:klaviyo-stripe` or staff Settings → Connect |

Events include `charge.succeeded`, `charge.failed`, `charge.refunded`, `invoice.payment_succeeded`, `invoice.payment_failed`, and the rest of the charge/invoice set. They do **not** include `checkout.session.completed`.

Klaviyo metrics the native app records: Successfully Paid (`XHuURz`), Failed Payment (`RHcdHv`), Refunded Payment (`TvC7dY`), Issued Invoice (`Vi3YJt`). Revenue mapping: Placed Order is shop revenue; `refunded_sales` → Refunded Payment. **Successfully Paid must not** trigger welcome, abandon, replenish, or a receipt (FH-228, FH-229, FH-293).

HTTP 200 on the Klaviyo URL is not proof a metric recorded (FH-229). Sandbox Connect cannot populate live Klaviyo. Finish Connect in the Klaviyo UI and paste **that** endpoint’s signing secret into Klaviyo.

### 11.3 Conflict scrub

`scrubConflictingStripeWebhooks`:

- Shop URL on a non-live-FILTER-HERO key → delete.
- Klaviyo URL on any account other than FILTER HERO → delete.

`handleStripeWebhook` also ignores livemode/key mismatches so a leftover signed event cannot fulfill the wrong environment.

---

## 12. Fulfillment handler — `checkout.session.completed`

`handleStripeWebhook` in `server/stripe.ts`.

1. Require `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (not placeholders).
2. Require `stripe-signature`.
3. `stripe.webhooks.constructEvent(rawBody, signature, secret)`.
4. Drop live/test mismatches.
5. On `checkout.session.completed`:
   - Retrieve the session from the API (fresher than the event payload). `resource_missing` is ignored; other retrieve errors fall back to the event object.
   - Load `orders.json`. If `sessionId` already exists, **do not insert a second row** (FH-123). Reuse that row so a failed Resend can still retry (FH-292).
   - Else append `orderFromCheckoutSession` with a `nanoid` id.
   - Persist shipping, phone, subtotal, tax, total, customer, invoice, payment intent, items metadata.
6. Side effects, each in its own try/catch so one failure does not skip the rest:

| Step | Function | Idempotency |
|---|---|---|
| Klaviyo Placed Order + Ordered Product | `syncPlacedOrder` | `placed_order:{sessionId}` / `ordered:{sessionId}:{ProductID}` |
| Resend confirmation | `sendOrderConfirmation` | Persist `confirmationSentAt` only after Resend accepts. Unique key `order-confirmation/{sessionId}`. Stripe retries 3 days; Resend keys last 24h — the stamp is the real guard (FH-292). |
| Customer account | `recordPurchaseOnAccount` | Upsert saved filters `onConflict profile_id,product_id`. Fail-soft if no profile. |
| CRM | `closeDealsOnPurchase` | Close open deals for that email; store `stripeCustomerId`. |

7. On `checkout.session.expired` → `syncCheckoutExpired` (email from details, customer_email, or metadata). Unique id `expired:{sessionId}`. This is **not** `cancelled_sales` in Klaviyo.

Always return `{ received: true }` after a valid signature so Stripe stops retrying for handler bugs that were already logged. Signature failures throw and the route returns 400.

### Order record

```ts
type StoredOrder = {
  id: string;
  sessionId: string;
  amountSubtotal: number | null;   // cents
  amountTax: number | null;
  amountTotal: number | null;
  currency: string | null;
  customerId: string | null;
  invoiceId: string | null;
  paymentIntentId: string | null;
  customerEmail: string | null;
  shipping: Stripe.Checkout.Session.ShippingDetails | null;
  phone: string | null;
  items: string;                   // JSON CheckoutItem[]
  taxStatus: string | null;
  paidAt: string;
  confirmationSentAt?: string | null;
};
```

Path: `dataFile("orders.json")` → `DATA_DIR` or `<cwd>/server/data/orders.json`. Never `__dirname` (production `dist/index.js` would write `dist/data/` and a redeploy would wipe it — FH-122).

`orders.json` is the packing log. It is **not** the ledger. QBO is.

---

## 13. Klaviyo events this app sends itself

These are Filter Hero metrics, not the native Stripe app.

| When | Metric | Unique id |
|---|---|---|
| Session created (email present) | Started Checkout | `checkout:{sessionId}` |
| Session expired | Checkout Expired | `expired:{sessionId}` |
| Paid | Placed Order | `placed_order:{sessionId}` |
| Paid, per line | Ordered Product | `ordered:{sessionId}:{ProductID}` |

`Placed Order` also writes profile properties: `last_order_at`, `last_order_value`, `last_order_sizes`, `filter_sizes`, `preferred_merv`, `next_change_date` (replenish — **not** Filter Clock’s `clock_next_change_date`), `change_interval_days`, `stripe_customer_id`.

Marketing list join from Checkout happens only when `marketingConsent` is true (`subscribeMarketingEmail(..., "checkout")`). Clock save never enrolls replenish (FH-131).

---

## 14. Local install (sandbox)

Local `.env` **should** be FILTER HERO sandbox. That is correct.

```bash
pnpm install
cp .env.example .env
# STRIPE_SECRET_KEY=sk_test_…   (sandbox acct_1U9bqs790NnFGDLv)
# CLIENT_URL=http://localhost:3000
```

Terminal 1 — Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Paste the printed `whsec_…` into `.env` as `STRIPE_WEBHOOK_SECRET`. Restart the API.

Terminal 2:

```bash
pnpm dev
```

- Client http://localhost:3000 (Vite proxies `/api` → :3001)
- API http://localhost:3001

Pay with Stripe test cards. `pnpm setup:stripe-webhook` on this key must **not** create a filterhero.net endpoint; it deletes one if it finds it, then enables Google Pay on the default PMC.

Verify:

```bash
pnpm verify:env
pnpm verify:stripe-books
pnpm debug:stripe-checkout
pnpm smoke
```

Sandbox Tax Settings often stay `pending`. That is expected locally. Checkout still creates. Automatic tax stays off until a head office exists.

Do not run `pnpm setup:klaviyo-stripe` against sandbox keys.

---

## 15. Production install (FILTER HERO live)

Do this on **FILTER HERO** live keys. Never copy local sandbox secrets.

1. Dashboard → FILTER HERO live (`acct_1U9bqlQEENEs0Qmw`).
2. Put on Railway (then **rebuild** because Vite bakes `VITE_`):
   - `STRIPE_SECRET_KEY=sk_live_…`
   - `STRIPE_PUBLISHABLE_KEY=pk_live_…`
   - `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_…`
   - `CLIENT_URL=https://filterhero.net`
3. `pnpm sync:catalog` with that live key so Products exist on the live account.
4. Tax: head office + registrations for states already collecting.
5. Branding: navy `#203868`, burgundy `#7F2328`, logo `https://filterhero.net/logo.png` (same kit as Resend / Klaviyo). Do not click Save on Klaviyo’s “Review your brand” wizard — it overwrites email defaults.
6. `pnpm setup:stripe-webhook` with the **live** key:
   - Creates `https://filterhero.net/api/stripe/webhook` for the two Checkout events.
   - Tries `railway variable set STRIPE_WEBHOOK_SECRET` from the new endpoint secret.
   - If Railway CLI is not logged in, paste the secret from Dashboard → Webhooks → reveal.
7. `pnpm setup:klaviyo-stripe` with the **same live FILTER HERO key** (or FILTER HERO test mode — still that account, not sandbox). Finish Connect in Klaviyo. Paste the native endpoint signing secret into Klaviyo.
8. QBO: Stripe Connector on the **same** live account. Map Stripe Tax → Sales tax payable. Do not enable QBO Automated Sales Tax on top of Stripe Tax.

Proof:

- Railway `STRIPE_SECRET_KEY` starts with `sk_live_`.
- A Checkout Session is `livemode: true`.
- Dashboard → Webhooks shows the shop URL enabled on FILTER HERO live.
- Dashboard → Webhooks shows the Klaviyo URL on FILTER HERO, not sandbox.
- `pnpm verify:env` / `pnpm verify:stripe-books` / `pnpm exec tsx scripts/check-klaviyo-stripe.ts`.

Until FH-305 is closed, live `filterhero.net` is still charging with sandbox **test** keys. Real cards fail.

---

## 16. Scripts (copy these, do not invent new ones)

| Command | What it proves / does |
|---|---|
| `pnpm setup:stripe-webhook` | Live FILTER HERO: create/repair shop webhook, optionally `--rotate`. Sandbox: scrub conflicts. Google Pay on. |
| `pnpm setup:klaviyo-stripe` | Create/repair native Klaviyo URL. `--rotate` mints a new signing secret. |
| `pnpm sync:catalog` | Stripe Products + Klaviyo catalog + Supabase `catalog_skus` |
| `pnpm debug:stripe-checkout` | Metadata cap, webhook signature QA, duplicate-order guard, Tax Settings, live session create, customer reuse, expire |
| `pnpm verify:stripe-books` | Tax code constants, 490-char meta, order mapping, live Tax + webhook health |
| `pnpm verify:env` | `sk_` / `whsec_` / `pk_` prefixes, account ping, shop/Klaviyo ownership |
| `pnpm verify:klaviyo` | Native URL, FILTER HERO owns shop webhook, Checkout events are **not** on the Klaviyo endpoint |
| `pnpm verify:resend` | `confirmationSentAt` guard + branded order template |
| `pnpm smoke` | Unsigned webhook 400 `webhook_failed`; empty checkout `checkout_failed` |
| `pnpm check` | TypeScript |

---

## 17. Security that is part of the Stripe install

- Raw body for webhooks.
- `constructEvent` — unsigned or wrong secret is 400.
- Rate limit checkout 10 / 15 minutes (`rate_limited_checkout`).
- `publicError` on checkout, session lookup, and webhook — no Zod dumps, no Stripe messages, no `whsec_` leakage.
- Session id regex `^cs_(test|live)_[A-Za-z0-9]+$` before retrieve.
- Success page does not trust the URL.
- `sk_` never in `VITE_` vars.
- Staff Settings shows presence of keys, not values.
- CRM/account attach is fail-soft so a downed Supabase cannot fail a paid webhook.

---

## 18. QuickBooks (beside Stripe, not instead of it)

Checkout stays on Stripe. QBO is the ledger.

1. Chart of accounts: Stripe Clearing (Bank), Stripe fees (Expense), Sales tax payable (Liability), Filter sales (Income), Inventory / COGS, Filter King (AP).
2. App store: **Stripe Connector by QuickBooks**. Same account as `STRIPE_SECRET_KEY`.
3. Map: charges → Filter sales; **Stripe Tax line → Sales tax payable**; fees → Stripe fees; payouts → Clearing → checking.
4. Filter King wholesale bills are QBO supplier bills. Stripe never sees wholesale.

`invoice_creation` + Customer reuse exist so the connector has a person and an invoice.

---

## 19. Replicating this install on another Filter Hero-class shop

Do these in this order. Skipping ownership (step 1) recreates FH-294 / FH-305.

1. Two Stripe accounts: live shop vs local sandbox. Encode the live account id. Refuse to put the production webhook URL on any other account.
2. Hosted Checkout Sessions, `mode: payment`. No `payment_method_types`.
3. Register `/api/stripe/webhook` with `express.raw` **before** JSON.
4. Local `stripe listen`. Production Dashboard endpoint. Two different `whsec_` values.
5. Gate `automatic_tax` on Tax Settings `active`. Registrations in the Dashboard.
6. Exclusive `price_data` + qty-tier unit amounts. Optional catalog Product attach. Never wholesale cost.
7. Reuse Customer by email. Always create Customer + Invoice.
8. US shipping + phone. Shipping option labeled without promising “free shipping” unless that is the policy.
9. Idempotent `orders.json` (or a DB unique on `sessionId`).
10. Split email: Stripe receipt, Resend confirmation with a persisted sent-at stamp, Klaviyo marketing from **Placed Order**, not Successfully Paid.
11. Second webhook to Klaviyo for charge/invoice only, on the live account.
12. Verify scripts that fail if sandbox hosts the live URL.

---

## 20. Issues and fixes (complete Stripe log)

Source of truth remains [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). This section is every Stripe-touching item, newest first, with status. **FH-211 is superseded by FH-251.** **FH-177 / FH-178 / FH-186 are superseded by FH-253.**

### Open

**FH-305 — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO** (2026-09-20)  
Live `filterhero.net` Checkout uses Railway `sk_test_` / `pk_test_` from sandbox `acct_1U9bqs790NnFGDLv`. Real cards cannot pay. Local sandbox `.env` is correct. Do not copy local `STRIPE_SECRET_KEY` onto Railway. Do: live `sk_live_` + `pk_live_` + `VITE_STRIPE_PUBLISHABLE_KEY` on Railway, rebuild, `pnpm setup:stripe-webhook` against that live key.

**FH-254 — Stripe Checkout still prints Free next to a $0 shipping option** (2026-09-18)  
`display_name` is Shipping. Stripe still labels a `$0` rate Free. Do not put “Free shipping” back in `display_name`. Do not drop `shipping_options` while address collection is on. Fix is a paid `fixed_amount` once freight is known.

### Ownership and webhooks

**FH-294 — Sandbox Stripe webhooks impersonated live FILTER HERO** (fixed 2026-09-20)  
Sandbox Dashboard endpoints pointed at `filterhero.net` and the live Klaviyo URL. Test Checkout could POST signed events at production. Fix: `shared/stripe-accounts.ts`, scrub in `setup:stripe-webhook`, handler ignores livemode/key mismatch.

**FH-229 — Native Klaviyo Stripe app accepts webhooks but does not record metrics** (fixed 2026-09-16)  
Sandbox `we_1UGWbF…` returned 200; Successfully Paid stayed at 0. Stripe Sandboxes cannot OAuth live Klaviyo. Connect FILTER HERO `acct_1U9bqlQEENEs0Qmw`. Do not add Checkout events to the Klaviyo endpoint. Do not use `@filterhero.net` as the Stripe test email.

**FH-228 — Klaviyo had no native Stripe charge/invoice webhook** (fixed 2026-09-16)  
Shop already posted Placed Order. Klaviyo’s Stripe app had no charge/invoice feed. Fix: `pnpm setup:klaviyo-stripe` for charge + invoice only.

**FH-230 — Klaviyo Stripe checker treated metrics as missing** (fixed 2026-09-16)  
`/api/metrics?page[size]=` 400ed on revision `2026-07-15`. Filter `equals(integration.name,"Stripe")` with no page size. Fail if the four native metric ids are missing.

**FH-203 — Stripe Dashboard had no fulfillment webhook** (fixed 2026-09-07)  
Zero Dashboard endpoints. Paid sessions never wrote orders. Fix: `pnpm setup:stripe-webhook`. Railway secret is the Dashboard `whsec_`, not `stripe listen`.

### Tax (read in order: 132 → 139 → 211 → 251)

**FH-132 — Checkout collected no sales tax and no Stripe customer** (mitigated 2026-09-01)  
No `automatic_tax`, no tax code, no Customer/Invoice. QBO had nothing to attach. Do: exclusive tax_behavior, `txcd_99999999`, Customer + Invoice, persist tax cents on orders.

**FH-139 — Checkout 400 when Stripe Tax had no head office** (mitigated 2026-09-01)  
`automatic_tax.enabled=true` while Tax Settings `pending` 400s every cart. Do: read settings first; enable only when `active`.

**FH-211 — Stripe Tax was calculating (and billing) at Checkout** (fixed 2026-09-11, **superseded by FH-251**)  
Turned `automatic_tax` hard-off so QBO would book tax. Shoppers then paid no tax.

**FH-251 — Checkout collected no sales tax (Stripe Tax was off)** (fixed 2026-09-17)  
Re-enable `automatic_tax` when Tax Settings are `active`. Keep exclusive prices + Customer + Invoice. Registrations in the Dashboard. QBO records what Stripe collected — do not double-tax.

### Checkout session shape

**FH-120 — Stripe Checkout did not collect a shipping address** (mitigated 2026-08-31)  
Line items only. Could charge with no US address. Do: `shipping_address_collection` + phone; store on the order.

**FH-204 — Checkout created a new Stripe Customer on every email** (fixed 2026-09-07)  
Always `customer_creation: always` + `customer_email`. Repeat buyers became a second Customer. Do: `customers.list({ email })` and reuse with `customer_update`.

**FH-253 — Free shipping was still promised on the shop** (fixed 2026-09-18)  
Marquee, cart, Stripe `display_name`, FAQ, JSON-LD all said free shipping. Do: 2–3 day contiguous-US copy. Cart: Shipping at checkout. Checkout option labeled Shipping. Supersedes FH-177, FH-178, FH-186.

**FH-223 — Stripe, Klaviyo, CRM, and accounts still had the old catalog** (fixed 2026-09-16)  
Checkout used ad-hoc `product_data` only. Do: `pnpm sync:catalog` → `prod_fh_{id}`. Attach Product; still use qty-tier `price_data`. Never put wholesale cost on Stripe.

### Fulfillment, mail, and success page

**FH-121 — Success page cleared the cart without verifying payment** (mitigated 2026-08-31)  
`/checkout/success` with no `session_id` still `clearCart()` and said paid. Do: retrieve session; clear only when `paid`.

**FH-123 — Stripe webhook wrote duplicate orders on retry** (mitigated 2026-08-31)  
Every `checkout.session.completed` appended. Do: skip insert when `sessionId` exists.

**FH-122 — Production leads and orders wrote into `dist/data`** (mitigated 2026-08-31)  
`__dirname/data` under the bundled file. Redeploy wiped orders. Do: `DATA_DIR` or `<cwd>/server/data`.

**FH-292 — Stripe webhook could send a second Resend confirmation** (fixed 2026-09-20)  
Handler always called `sendOrderConfirmation`. Stripe retries 3 days; Resend idempotency is 24h. Do: persist `confirmationSentAt` only after Resend accepts; retries until that stamp.

**FH-127 — Checkout cancel “quote instead” raced Home paint** (mitigated 2026-08-31)  
Client route then timed scroll missed `#contact`. Do: `window.location.href = "/#contact"`.

**FH-200 — Smoke died on a hot contact limiter, and empty checkout leaked Zod** (fixed 2026-09-07)  
Empty `POST /api/checkout` returned `err.message`. Do: `400 checkout_failed` with a fixed code.

**FH-205 — Public API had no headers, leaked parser text…** (fixed 2026-09-07)  
Checkout 10/15min limiter. Webhook/session lookup never return Stripe/Zod text.

**FH-188 — Supabase CRM and accounts were half-wired** (fixed 2026-09-07)  
Paid webhook never attached SKUs. Do: `recordPurchaseOnAccount` on completed Checkout. Fail-soft.

### Klaviyo / email channel (Stripe-adjacent)

**FH-196 — This branch had Klaviyo keys and DNS but no live integration** (fixed 2026-09-07)  
Stripe paid events never reached Klaviyo. Do: server tracks Started Checkout / Placed Order from the shop webhook. No second confirmation from a Klaviyo flow.

**FH-201 — Production shop had Klaviyo keys but no live routes** (fixed 2026-09-07)  
Map Placed Order → revenue. Do not add an order-confirmation flow.

**FH-131 — Filter Clock must not send replacement emails before a purchase** (mitigated 2026-09-01)  
Replenish enrolls only on Placed Order (`next_change_date` = paid_at + interval). Clock stores `clock_next_change_date` only.

**FH-293 — Klaviyo refunds unmapped…** (fixed 2026-09-20)  
`refunded_sales` → Refunded Payment (`TvC7dY`). Do not map revenue or a flow to Successfully Paid.

**FH-235 — Resend mail was unbranded plain text** (fixed 2026-09-17)  
Order confirmation must match Stripe/Klaviyo brand (logo, navy `#203868`, burgundy `#7F2328`).

**FH-209 — Local CSP blocked Klaviyo onsite identify** (fixed 2026-09-11)  
Checkout still reached Stripe; Klaviyo never saw the localhost email. Dev CSP allows `http://*.klaviyo.com`.

### Shipping copy history (superseded)

**FH-177 / FH-178 / FH-186** promised or omitted free shipping, including Stripe `$0` as “Free shipping”. Replaced by FH-253 (no free-shipping promise) and left FH-254 (Stripe still prints Free on a zero rate).

---

## 21. Do NOT (the whole list, condensed)

- Copy local sandbox `STRIPE_SECRET_KEY` onto Railway.
- Point sandbox or FILTER HERO **test-mode** Dashboard endpoints at `https://filterhero.net/api/stripe/webhook`.
- Connect Klaviyo to **FILTER HERO sandbox**.
- Add `checkout.session.*` to the Klaviyo native webhook.
- Trigger welcome, abandon, replenish, or a receipt from Successfully Paid.
- Add a Klaviyo order-confirmation or quote-receipt flow.
- Put `sk_` in a `VITE_` variable.
- Put the `stripe listen` `whsec_` on Railway.
- Register the webhook **after** `express.json()`.
- Force `automatic_tax.enabled=true` while Tax Settings are `pending`.
- Hard-code `automatic_tax.enabled=false` after FH-251.
- Let QBO Automated Sales Tax recalculate a sale Stripe already taxed.
- Invent a `txcd_` — filters `txcd_99999999`, shipping `txcd_92010001`.
- Pass both `customer` and `customer_email`.
- Send `payment_method_types` (except Terminal, which this shop is not).
- Put wholesale cost on Stripe Products or Checkout metadata.
- Attach a test-mode catalog mapping to a live Checkout Session.
- Clear the cart because the success URL loaded.
- Insert a second `orders.json` row for the same `sessionId`.
- Skip Resend just because the order row already exists (first send may have failed).
- Promise “free shipping” in Stripe `display_name` or shop copy.
- Drop `shipping_options` while collecting a shipping address.
- Write orders next to `dist/index.js`.
- Return Stripe or Zod error text from checkout / webhook / session lookup.

---

## 22. Current production truth (2026-09-20)

| Check | State |
|---|---|
| Code path | Hosted Checkout + dual webhooks + Stripe Tax gate + Customer reuse + catalog Products + Resend stamp |
| Local `.env` | Sandbox test keys + `stripe listen` — **correct** |
| Railway keys | Sandbox test keys — **FH-305, not correct for live cards** |
| Shop webhook on sandbox | Must be absent (FH-294 scrub) |
| Shop webhook on FILTER HERO live | Required before live pay |
| Klaviyo native on FILTER HERO | Required; never on sandbox |
| Tax | On when Tax Settings `active` + registrations exist |
| Shipping | `$0` labeled Shipping; Stripe UI still says Free (FH-254) |

When FH-305 is closed, this document’s production install section is the go-live checklist. Do not treat a green local `debug:stripe-checkout` as proof that `filterhero.net` can charge a real card.
