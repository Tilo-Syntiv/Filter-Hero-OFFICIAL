# Stripe + books (Filter Hero)

Checkout stays on Stripe. Books and sales tax sit in **QuickBooks Online**. Do not move payment into QuickBooks or an ERP. Do not turn on Stripe Tax — Stripe bills a calculation fee on live checkouts and invoices.

Intuit Developer OAuth/OpenID URLs: [INTUIT-OAUTH-DISCOVERY.md](./INTUIT-OAUTH-DISCOVERY.md) (`pnpm verify:intuit-discovery`). OAuth error handling (expired tokens, `invalid_grant`, CSRF): [INTUIT-OAUTH.md](./INTUIT-OAUTH.md) (`pnpm verify:intuit-oauth`). That is for a QBO app, not a replacement for the Stripe Connector.

Sandbox account seen 2026-09-07: Checkout Sessions create. A Dashboard webhook to `https://filterhero.net/api/stripe/webhook` is required for fulfillment.

`automatic_tax` stays **off**. QuickBooks Online Automated Sales Tax (the Online Tax app) is the tax engine. The Stripe Connector posts the paid sale into QBO; QBO applies or records tax there. Checkout does not add a Stripe Tax line, so there is no Stripe Tax fee.

## 1. Do not use Stripe Tax

Leave [Tax settings](https://dashboard.stripe.com/settings/tax) and [Tax registrations](https://dashboard.stripe.com/tax/registrations) unused for calculation.

1. Tax → Integrations: **Use automatic tax collection** off (invoices and Payment Links).
2. Do not add registrations just to “turn tax on” in Stripe.
3. If Stripe already billed a Tax fee, that is from a completed Checkout or finalized invoice with `automatic_tax` on. New sessions from this app send `automatic_tax.enabled=false`.

Catalog prices stay exclusive. The hosted Checkout page will not add sales tax.

## 2. QuickBooks Online + Stripe (tax + books)

1. Create QBO (Simple Start is enough).
2. Turn on **Automated Sales Tax** (Sales Tax / Online Tax in QBO).
3. Chart of accounts: **Stripe Clearing** (Bank), **Stripe fees** (Expense), **Sales tax payable** (Liability), **Filter sales** (Income), **Inventory / COGS**, **Filter King** (Accounts payable).
4. App store: **Stripe Connector by QuickBooks** (free). Connect the same Stripe account as `STRIPE_SECRET_KEY`.
5. Map: charges → Filter sales; fees → Stripe fees; payouts → transfer Stripe Clearing → checking. If fees/payouts don’t match the bank, switch to [Acodei](https://www.acodei.com/) (~$12/mo).
6. Connect the **real bank** in QBO. Match Stripe payout deposits to Clearing transfers.

Checkout still creates a Stripe **Customer** and a Stripe **Invoice** on payment so the connector has someone to attach the sale to.

QBO cannot inject tax onto the Stripe-hosted payment page. Tax is handled in QBO after the charge, not by Stripe at checkout. Confirm the mapping with your bookkeeper so Sales tax payable is correct.

## 3. Filter King bills (not Stripe)

Stripe never sees wholesale. In QBO: Supplier **Filter King LLC**, enter each dealer invoice as a Bill (AP). Pay it from checking. That is COGS / inventory — not a Checkout event.

## 4. What the app already does

| Piece | Where |
|---|---|
| Hosted Checkout | `server/stripe.ts` |
| US shipping + phone | Checkout Session |
| Free shipping ($0 rate) | Checkout Session `shipping_options` |
| Stripe Tax | **Off** — no calculation fee |
| Customer + invoice on pay | `customer_creation`, `invoice_creation` |
| Order log for packing | `server/data/orders.json` (subtotal, tax, customer, invoice, payment intent) |
| Reuse Stripe Customer | Lookup by email before `checkout.sessions.create` |
| Production webhook | Dashboard → `https://filterhero.net/api/stripe/webhook` (`pnpm setup:stripe-webhook`) |
| Product catalog | `pnpm sync:catalog` writes 293 contractor SKUs as Stripe Products (`prod_fh_{id}`). Checkout attaches those products and still uses `price_data` for pack-qty unit prices. |

Klaviyo / Resend / `orders.json` are not the ledger.
