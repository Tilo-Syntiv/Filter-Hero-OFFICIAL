# Customer accounts

Shoppers sign in with a magic link, keep a household filter list, and see
every paid order on that email. Guest checkout still works. Signing in is
optional.

## What this is

- **Login.** Same Supabase Auth project as `/admin`. Shoppers use email and
  password on `/login`. Staff still need `STAFF_EMAILS` for the CRM; a shopper
  session cannot open `/admin`.
- **Profile.** Name, phone, and shipping address on `customer_profiles`.
- **Saved filters.** SKUs the shopper pinned, plus SKUs from paid orders.
- **Order history.** Read from `orders.json` filtered by the verified session
  email. The request cannot ask for a different address.

`orders.json` stays the append-only purchase record. Postgres stores the
profile and the filter list. History is joined at read time.

## What this is not

- A second sender. Resend still owns transactional mail, Klaviyo still owns
  marketing. The account module must not import either.
- A replacement for Stripe Checkout. Payment stays on Stripe. The account
  only remembers who bought what.
- Staff CRM. Contacts and deals stay on the `/admin` board.

## Security

- **RLS deny-by-default.** `customer_profiles` and `customer_saved_filters`
  have row level security on, zero policies, FORCE RLS, and no `anon` /
  `authenticated` grants. The browser never queries Postgres.
- **`requireCustomer`** verifies the token against Supabase, then every query
  is scoped to that `auth_user_id` / email. An unconfigured gate returns 503.
- **Order isolation.** `ordersForCustomer` drops every row whose email does
  not match the session. An empty email returns nothing.
- **`safeNextPath`.** Post-login redirects stay on-site. `//`, absolute URLs,
  `..`, `/admin`, `/api`, and `/login` fall back to `/account`.
- **`/login` and `/account` are noindex** and disallowed in `robots.txt`.

## Environment

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=
SUPABASE_ANON_KEY=
ACCOUNT_DISABLE=1                   # optional kill switch
```

Auth redirect URLs live at
[URL configuration](https://supabase.com/dashboard/project/mayxuwlygchatgeqyhyt/auth/url-configuration).
Required entries:

- `http://localhost:3000/login`
- `http://localhost:3000/account`
- `http://localhost:3000/admin`
- `http://localhost:3000/admin/login`
- `https://filterhero.net/login`
- `https://filterhero.net/account`
- `https://filterhero.net/admin`
- `https://filterhero.net/admin/login`

`pnpm setup:auth-redirects` writes them through the Management API when
`SUPABASE_ACCESS_TOKEN` is set.

`ACCOUNT_DISABLE=1`, or a missing URL or service role key, turns accounts
off. Checkout still runs as a guest. `CRM_DISABLE` does not turn accounts
off — the two features share a database, not a kill switch.

## Schema

[`supabase/migrations/0002_customer_accounts.sql`](../supabase/migrations/0002_customer_accounts.sql)
creates `customer_profiles` and `customer_saved_filters`.

```
supabase db push
```

## API

All routes are under `/api/account`, all behind `requireCustomer` and a
rate limit.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Profile, saved filters, order history |
| PATCH | `/` | Update profile fields |
| POST | `/filters` | Save a catalog product |
| DELETE | `/filters/:id` | Remove a saved filter |
| GET | `/health` | Enabled and reachable |

A paid `checkout.session.completed` webhook fills blank profile address
fields and adds purchased SKUs to the filter list when a profile already
exists for that email. A guest who later signs in with the same email sees
the orders immediately; the filter list fills on the next paid order after
the profile exists.

## UI

- Header user icon → `/login` or `/account`
- `/login` — magic link + 6-digit code
- `/account` — profile, saved filters, order history
- Product page — **Save to my filters**
- Cart — email prefilled when signed in

## Verify

```
pnpm verify:account
pnpm verify:supabase
```
