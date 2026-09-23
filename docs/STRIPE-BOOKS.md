# Stripe + books (Filter Hero)

Checkout stays on Stripe. Books and ledger sit in **QuickBooks Online**. Payment and sales tax calculation stay on Stripe. We use Stripe's Tax system (`automatic_tax`) for calculating and collecting taxes on Checkout, **not** QuickBooks Online (QBO).

Intuit Developer OAuth/OpenID URLs: [INTUIT-OAUTH-DISCOVERY.md](./INTUIT-OAUTH-DISCOVERY.md) (`pnpm verify:intuit-discovery`). OAuth error handling (expired tokens, `invalid_grant`, CSRF): [INTUIT-OAUTH.md](./INTUIT-OAUTH.md) (`pnpm verify:intuit-oauth`). That connects QBO to the Filter Hero admin for sync and books reconciliation.

A Dashboard webhook to `https://filterhero.net/api/stripe/webhook` is required for fulfillment and order recording.

Stripe Tax calculates and collects sales tax at checkout (`automatic_tax.enabled` when Tax Settings are active). QuickBooks Online Automated Sales Tax is NOT used for calculation — QBO simply records the sale, invoice, and tax already collected by Stripe.

## 1. Stripe Tax for calculation (not QBO)

Stripe Tax is configured via [Tax settings](https://dashboard.stripe.com/settings/tax) and [Tax registrations](https://dashboard.stripe.com/tax/registrations).

1. Tax Settings head office must be set (`active` status).
2. Active tax registrations for jurisdictions where Filter Hero collects tax.
3. Checkout automatically enables `automatic_tax: { enabled: true }` when Tax Settings are active.
4. Physical filters use `txcd_99999999` (General Tangible Goods). Shipping uses `txcd_92010001` (Shipping).
5. Catalog prices stay exclusive of tax; Stripe Tax calculates and adds the tax line at checkout before payment.

## 2. QuickBooks Online + Stripe (books & sync)

1. Connect QuickBooks Online via the Filter Hero Admin console (`/admin/settings` → QuickBooks Online → Connect) using Intuit OAuth 2.0.
2. In QBO, connect the Stripe account via **Stripe Connector by QuickBooks** or Acodei.
3. Chart of accounts: **Stripe Clearing** (Bank), **Stripe fees** (Expense), **Sales tax payable** (Liability), **Filter sales** (Income), **Inventory / COGS**, **Filter King** (Accounts payable).
4. Map charges → Filter sales; fees → Stripe fees; payouts → transfer Stripe Clearing → checking.
5. In QBO: Sales tax collected by Stripe is recorded to **Sales tax payable**. QBO Automated Sales Tax must NOT recalculate sales tax on imported Stripe transactions.
6. Connect the **real bank** in QBO. Match Stripe payout deposits to Clearing transfers.

Checkout creates a Stripe **Customer** and a Stripe **Invoice** on payment so the connector has someone to attach the sale to.

## 3. Filter King bills (not Stripe)

Stripe never sees wholesale. In QBO: Supplier **Filter King LLC**, enter each dealer invoice as a Bill (AP). Pay it from checking. That is COGS / inventory — not a Checkout event.

## 4. What the app already does

| Piece | Where |
|---|---|
| Hosted Checkout | `server/stripe.ts` |
| US shipping + phone | Checkout Session |
| Free shipping ($0 rate) | Checkout Session `shipping_options` |
| Stripe Tax calculation | `server/stripe.ts` (`automatic_tax` enabled via `shared/stripe-tax.ts`) |
| Tangible Goods tax code | `txcd_99999999` on products |
| Shipping tax code | `txcd_92010001` on shipping |
| Customer + invoice on pay | `customer_creation`, `invoice_creation` |
| Order log for packing | `server/data/orders.json` (subtotal, tax, customer, invoice, payment intent) |
| Reuse Stripe Customer | Lookup by email before `checkout.sessions.create` |
| Production webhook | Dashboard → `https://filterhero.net/api/stripe/webhook` (`pnpm setup:stripe-webhook`) |
| Product catalog | `pnpm sync:catalog` writes 293 contractor SKUs as Stripe Products (`prod_fh_{id}`). Checkout attaches those products and still uses `price_data` for pack-qty unit prices. |
| QBO OAuth 2.0 connection | `server/intuit/oauth.ts`, `server/intuit/routes.ts`, `/admin/settings` |

Klaviyo / Resend / `orders.json` are not the ledger.
