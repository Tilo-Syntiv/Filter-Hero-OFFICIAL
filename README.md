# Filter Hero

This repository is [Tilo-Syntiv/Filter-Hero-OFFICIAL](https://github.com/Tilo-Syntiv/Filter-Hero-OFFICIAL). [Tilo-Syntiv/FILTER-HERO](https://github.com/Tilo-Syntiv/FILTER-HERO) is a different GitHub project. Shop work, deploys, and `git push` stay on Official `main`.

HVAC filter storefront: size finder, catalog, cart, Stripe Checkout, and quote/contact form.

## Stack

- React 19 + Vite 7 + Tailwind 4 + wouter
- Express API (checkout, webhook, contact, products)
- Stripe Checkout (Customer, Invoice) + optional Resend email for leads. Sales tax is QuickBooks Online, not Stripe Tax.
- Books: QuickBooks Online beside Stripe — see `docs/STRIPE-BOOKS.md`. Intuit OAuth discovery: `docs/INTUIT-OAUTH-DISCOVERY.md`. Intuit OAuth errors: `docs/INTUIT-OAUTH.md`.

## Setup

```bash
pnpm install
cp .env.example .env
```

Edit `.env`:

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `3001`) |
| `CLIENT_URL` | Frontend origin for Stripe redirects (`http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` / `sk_live_…`) — required for Checkout |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_…`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Same publishable key for the Vite client |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_TAX_CODE` | Optional product tax code (default `txcd_99999999`) |
| `SITE_URL` / `VITE_SITE_URL` | Canonical origin (`https://filterhero.net`). Vite bakes `VITE_` in at build time |
| `CONTACT_TO` | Inbox for lead emails |
| `RESEND_API_KEY` | Optional — if unset, leads save to `server/data/leads.json` only |
| `RESEND_FROM` | Verified Resend from address (`Filter Hero <info@filterhero.net>`) |
| `VITE_FULL_CATALOG` / `FULL_CATALOG` | `false` sells Paul’s contractor product list; `true` sells the archived size universe |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Supabase project URL for `/login` and `/admin` |
| `VITE_SUPABASE_ANON_KEY` | Browser auth key (publishable or JWT anon) |
| `SUPABASE_ANON_KEY` | Server JWT anon key used to verify sessions |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Never prefix with `VITE_` |
| `STAFF_EMAILS` | Comma-separated inboxes allowed into `/admin` |
| `KLAVIYO_PRIVATE_API_KEY` | Klaviyo private key. Server only |
| `KLAVIYO_PUBLIC_API_KEY` | Six-character site ID for `onsite.js` |
| `KLAVIYO_LIST_ID` | Marketing list (`RiTKiS`) |
| `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile on contact/quote |

## Develop

```bash
pnpm dev
```

- Client: http://localhost:3000 (proxies `/api` → API)
- API: http://localhost:3001

### Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Paste the CLI signing secret into `.env` as `STRIPE_WEBHOOK_SECRET`.

Production needs a Dashboard endpoint at `https://filterhero.net/api/stripe/webhook` (`checkout.session.completed` + `checkout.session.expired`). Create or repair it with `pnpm setup:stripe-webhook`, then put that endpoint's signing secret on Railway — it is not the `stripe listen` secret.

## Production

```bash
pnpm build
pnpm start
```

Serves the SPA and API from the Express server (`NODE_ENV=production`).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | API + Vite concurrently |
| `pnpm build` | Client + server bundle → `dist/` |
| `pnpm start` | Run production server |
| `pnpm check` | TypeScript check |
| `pnpm smoke` | Hit local Vite + API routes |
| `pnpm verify:store` | Catalog / pricing invariants |
| `pnpm verify:crm` | CRM pipeline, staff gate, rate limits, no-mail invariant |
| `pnpm verify:security` | Headers, CSP, JSON error shaping, Turnstile fail-closed, public POST limiters |
| `pnpm setup:crm` | Write service role key + Auth redirects when `SUPABASE_ACCESS_TOKEN` is set |
| `pnpm verify:account` | Customer account isolation + `/login` noindex |
| `pnpm verify:supabase` | Live CRM + account tables, RLS, Auth admin |
| `pnpm verify:stripe-books` | Mapping checks + live Tax Settings + webhook endpoint |
| `pnpm verify:intuit-discovery` | GET Intuit OAuth/OpenID discovery (prod + sandbox) |
| `pnpm connect:intuit` | Check Intuit client keys and print the authorize URL |
| `pnpm setup:intuit-live` | Put Production Intuit keys on Railway |
| `pnpm verify:intuit-oauth` | Expired access/refresh, `invalid_grant`, and CSRF handling |
| `pnpm verify:env` | Load `.env`, check formats, live-ping Stripe / Resend / Klaviyo / Supabase / Turnstile / Cloudflare |
| `pnpm verify:resend` | Channel law, branded templates, `submitContact` QA, webhook `confirmationSentAt` stamp, sends to `delivered@resend.dev` |
| `pnpm debug:stripe-checkout` | Webhook + live Checkout Session + test charge probe |
| `pnpm setup:stripe-webhook` | Create/repair the production Checkout webhook endpoint |
| `pnpm sync:catalog` | Push the contractor sheet to Stripe Products, Klaviyo catalog, and Supabase `catalog_skus` |
