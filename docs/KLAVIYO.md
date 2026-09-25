# Filter Hero — live Klaviyo

This is the **Klaviyo account** integration. Shopper profiles, ecommerce metrics, marketing consent, and the catalog feed go to Klaviyo’s API. Flows, campaigns, and segments are built in the Klaviyo UI.

The in-house CDP write-up stays at [KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md) for later. It is not what the app runs.

## Resend vs Klaviyo vs CRM (do not overlap)

Ownership is in `shared/email-channels.ts`. One shopper message, one sender.
The CRM is a staff board — it never sends and never writes a Klaviyo profile.

| Message | Sender | Not |
|---|---|---|
| Staff lead alert (quote / support / clock save) | Resend → `CONTACT_TO` | Klaviyo, CRM |
| Quote / support confirmation to the shopper | Resend | Klaviyo welcome or “we got your quote” flow, CRM |
| Filter Clock cadence save | **No shopper email** | Resend receipt, Klaviyo list, replenish (`next_change_date`), CRM deal |
| Order confirmation | Resend (branded) + Stripe payment receipt | Klaviyo “Order confirmed” / receipt flow, CRM |
| Welcome, abandoned checkout, install/review, replenish, win-back, campaigns | Klaviyo | `server/mailer.ts`, CRM |
| Quote follow-up board | CRM (staff only) | Resend, Klaviyo |

In the Klaviyo UI, **do not** add a flow that sends another order confirmation or quote receipt. Post-purchase should be install / review only. Replenish triggers on **Placed Order** only.

## Env

| Variable | Where |
|---|---|
| `KLAVIYO_PRIVATE_API_KEY` | Klaviyo → Settings → API keys → Private. Server only. |
| `KLAVIYO_PUBLIC_API_KEY` | Same page, six-character public / site ID. Loads `onsite.js`. |
| `KLAVIYO_LIST_ID` | Optional. If empty, the API reuses or creates **Filter Hero Marketing**. |
| `KLAVIYO_DISABLE=1` | Scripts and local tests. |

Never put the private key in a `VITE_` variable.

## What the app sends

| Metric | Source | Notes |
|---|---|---|
| Active on Site | `onsite.js` | After the public key is set |
| Viewed Product / Viewed Size | Size page | Also `trackViewedItem` for recently viewed |
| Selected MERV | MERV chips | Profile + event |
| Added to Cart | Cart add | Needs an identified profile for abandon-from-cart |
| Started Checkout | `POST /api/checkout` | Requires the cart email field. Includes `CheckoutURL` |
| Checkout Expired | Stripe `checkout.session.expired` | People who typed an email on Stripe or in the drawer |
| Placed Order + Ordered Product | Stripe `checkout.session.completed` | Idempotent on session id. Sets `next_change_date` |
| Requested Quote / Requested Support | Contact + custom quote | Subscribe only if the marketing box is checked |
| Signed Up Reminder | Filter Clock save | Profile properties only, date stored as `clock_next_change_date`. **No list subscribe. Does not set `next_change_date`.** |

Filter Clock does not enroll replenish. In Klaviyo, trigger replacement / restock flows on **Placed Order** only (FH-131).

## Catalog

JSON feed for a custom catalog in Klaviyo:

`https://filterhero.net/api/klaviyo/catalog.json`

Local: `http://localhost:3001/api/klaviyo/catalog.json`

## Live account (VnVNmQ)

Account **Filter Hero**. Public / site ID `VnVNmQ`. Marketing list is `RiTKiS` (Klaviyo name: **Email List**). From-address on draft flows: `info@filterhero.net`.

`pnpm setup:klaviyo` is idempotent. `pnpm inspect:klaviyo` prints the live objects.

### Flows (Live — sending domain `klv.filterhero.net` is active)

| Flow | Id | Trigger |
|---|---|---|
| FH Welcome | `UMtCJP` | Added to `RiTKiS` |
| FH Abandoned checkout | `SN8epW` | Started Checkout. Exits if Placed Order happens after entry |
| FH Post-purchase nurture | `WVmMG9` | Placed Order — install + review only, **not** a receipt |
| FH Replenish T-7 / T-2 / due | `WPU3gW` / `RZ2b2J` / `TaqZUA` | Profile date `next_change_date` |
| FH Win-back | `UkEkSf` | Segment **FH Lapsed 120** (`TfSLjM`) |

Do **not** add an order-confirmation or quote-receipt flow. Resend + Stripe already send those.

Mapped metrics (API, 2026-09-07): **Placed Order** → revenue (`TeVwgw`), **Ordered Product** → ordered_product, **Started Checkout** → started_checkout, **Added to Cart** → added_to_cart, **Viewed Product** → viewed_product.

### Sending domain

Klaviyo marketing uses **`klv.filterhero.net`**. Resend already uses `send.filterhero.net` for transactional mail — do not point `send` at Klaviyo.

Nameservers are Cloudflare (`ganz` / `marjory`). Records are in `docs/CLOUDFLARE-NAMESERVERS.md`. After Klaviyo shows the domain as verified, turn the Draft flows **Live**.

| Type | Host | Value |
|---|---|---|
| CNAME | `klv` | `3840918940202419532.klaviyodns.com` |
| CNAME | `mtd1._domainkey` | `mtd1._domainkey.3840918940202419532.klaviyodns.com` |
| CNAME | `mtd2._domainkey` | `mtd2._domainkey.3840918940202419532.klaviyodns.com` |
| TXT | `@` | `klaviyo-site-verification=VnVNmQ` |

Keep the existing Google SPF TXT on `@`. Add a second TXT for the Klaviyo site verification — do not replace SPF. Leave `send` / `rsend` / `resend._domainkey` for Resend.

## Recommended flows (Klaviyo UI)

The objects above are in the account, the sending domain is **active**, the seven Filter Hero flows are **Live**, and ecommerce metric mapping is set. Do **not** trigger replenish on Signed Up Reminder (FH-131).

## Health

- `GET /api/health` is a bare `{ ok: true }` liveness probe
- `GET /api/health/detail` includes `klaviyo: true|false` — **staff only** (FH-175)
- `GET /api/klaviyo/health` pings the account (no secrets) — **staff only**
- `GET /api/klaviyo/catalog.json` is the 299-SKU wholesale sheet
- `pnpm verify:klaviyo` checks payloads and, when a private key is set, the live account
- `pnpm inspect:klaviyo` lists metrics, flows, templates, catalog, sending domain
