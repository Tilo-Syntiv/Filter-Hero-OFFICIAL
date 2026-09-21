# SUPABASE AND POSTGRES FULL BUILD

**Filter Hero’s definitive Supabase + Postgres install.** This is how the database is wired, connected, and installed in *this* repository — not a generic Supabase Next.js tutorial.

Short ops sheets: [CRM.md](./CRM.md) (staff pipeline) and [CUSTOMER-ACCOUNTS.md](./CUSTOMER-ACCOUNTS.md) (shopper login). CRM pipeline install: [CRM FULL BUILD.md](./CRM%20FULL%20BUILD.md). Channel law lives in `shared/email-channels.ts`. The issue log is [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). The in-house CDP spec at [KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md) is **not** what the app runs.

**Last aligned to the live tree:** 2026-09-20.

If this file and the code disagree, the code plus `pnpm verify:supabase` / `pnpm verify:crm` / `pnpm verify:account` win, then this file is updated.

---

## 0. The sentence that decides every later choice

The browser never queries Postgres. Supabase Auth is the only thing the client talks to (`VITE_SUPABASE_ANON_KEY`, PKCE). Every CRM row, every customer profile, every saved filter, and every `catalog_skus` write goes through Express with `SUPABASE_SERVICE_ROLE_KEY`. Tables are RLS deny-by-default: enabled, FORCE RLS, **zero policies**, grants revoked from `anon` / `authenticated` / `public`. Isolation is `requireStaff` / `requireCustomer` plus a `where` on the actor, not a Postgres policy.

Postgres is the queryable layer on top of `leads.json` and `orders.json`. It is not a replacement for those files, not a mailbox, and not a Klaviyo writer. CRM never emails a shopper. A third sender on `filterhero.net` re-opens FH-171.

There is **no** `DATABASE_URL`. There is **no** `pg` / `postgres.js` pool. There is **no** local `supabase start`. The shop talks to hosted Postgres the only way this repo ever has: `@supabase/supabase-js` over HTTPS to project `mayxuwlygchatgeqyhyt`.

---

## 1. What is installed (and what is not)

### Installed

A **live hosted Supabase project** named **filter-hero**, ref `mayxuwlygchatgeqyhyt`, URL `https://mayxuwlygchatgeqyhyt.supabase.co`. Auth (GoTrue) plus Postgres in the `public` schema. Five SQL migrations in `supabase/migrations/`. One service-role client in `server/db.ts`. One browser Auth client in `client/src/lib/admin-api.ts`. Staff console at `/admin`. Shopper accounts at `/login` + `/account`. Catalog mirror table `catalog_skus` (Model Pricing SKUs).

| Surface | Who | How |
|---|---|---|
| `/login` | Shopper | Email + password (`signInWithPassword` / `signUp`). Recovery email for forgotten passwords. |
| `/admin/login` | Staff | Magic link + 6-digit OTP (`signInWithOtp`). No password. |
| `/api/crm/*` | Staff | Bearer JWT → `auth.getUser` → `STAFF_EMAILS` → service role |
| `/api/account/*` | Shopper | Bearer JWT → `auth.getUser` → service role scoped to that `auth_user_id` |
| `/api/admin/*` | Staff | Same staff gate; reads CRM + profiles + `orders.json` |
| Stripe webhook | System | Fail-soft: close deals, attach SKUs to an existing profile |
| Contact form | System | Fail-soft: `appendLead` first, then `recordLeadInCrm` |

SDK: `@supabase/supabase-js` `^2.115.0` (`package.json`). Client construction is `createClient(url, key, { auth: … })`. Do not add `@supabase/ssr`. This is Vite + Express, not Next.js cookies.

### Not installed

- Local Supabase CLI stack (`supabase/config.toml`, Docker, `supabase start`).
- Direct Postgres wire (`DATABASE_URL`, `postgres://`, `pg`, `postgres.js`, PgBouncer in app code).
- Row Level Security **policies**. RLS is on so the Data API returns nothing to the browser. Policies would *open* rows.
- Browser PostgREST. `from("crm_contacts")` in client code is forbidden.
- Supabase Storage, Realtime subscriptions, Edge Functions, Vectors, Cron, Queues, pgmq.
- Auth providers other than email (Google, Apple, phone).
- A Klaviyo replica CDP. That spec is [KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md). Do not follow it to install this shop.
- CRM as a mailbox. `CRM_SENDS_MAIL = false`.

---

## 2. Live identity — copy these exactly

| Token | Value |
|---|---|
| Project name | `filter-hero` |
| Project ref | `mayxuwlygchatgeqyhyt` |
| API URL | `https://mayxuwlygchatgeqyhyt.supabase.co` |
| Dashboard | `https://supabase.com/dashboard/project/mayxuwlygchatgeqyhyt` |
| API keys | `https://supabase.com/dashboard/project/mayxuwlygchatgeqyhyt/settings/api` |
| Auth URLs | `https://supabase.com/dashboard/project/mayxuwlygchatgeqyhyt/auth/url-configuration` |
| Site URL | `https://filterhero.net` |
| Staff allowlist | `STAFF_EMAILS=info@filterhero.net` |
| Shop origin | `https://filterhero.net` |
| Local origin | `http://localhost:3000` (Vite). API is `:3001`. |
| SDK | `@supabase/supabase-js@^2.115.0` |

The project ref is not a secret. The **service role JWT** is. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable, `site-config.json`, the browser bundle, or this document. `pnpm verify:env` asserts the key starts with `eyJ` and pings `customer_profiles` + Auth admin without printing the value.

Anon / publishable keys are allowed in the browser. They prove nothing except “this request is from our project.” They cannot read CRM or account tables.

---

## 3. File map

### Core

| File | Job |
|---|---|
| `server/db.ts` | Service-role client, kill switches, health, boot log |
| `server/auth.ts` | `requireStaff` / `requireCustomer`. `getUser(token)`, never a local JWT decode |
| `supabase/migrations/0001_crm.sql` | Pipelines, stages, companies, contacts, deals, activities, audit, Quotes seed |
| `supabase/migrations/0002_customer_accounts.sql` | `customer_profiles`, `customer_saved_filters` |
| `supabase/migrations/0003_crm_fk_indexes.sql` | `crm_deals(pipeline_id)`, `crm_deals(company_id)` |
| `supabase/migrations/0004_lock_browser_grants.sql` | FORCE RLS + revoke `anon` / `authenticated` / `public` |
| `supabase/migrations/0005_catalog_skus.sql` | Contractor SKU mirror. No wholesale cost column |

### CRM (staff pipeline)

| File | Job |
|---|---|
| `server/crm/schema.ts` | Stages, Zod, `INTENT_TO_STAGE`, `SYSTEM_ACTOR` |
| `server/crm/intake.ts` | Quote → deal. Support → note. Reminder → nothing. Pay → won |
| `server/crm/contacts.ts` | Email upsert, fill-blanks, unique-index race (`23505`) |
| `server/crm/deals.ts` | Create / list / patch / close-on-pay. `lead_id` idempotency |
| `server/crm/activities.ts` | Notes, tasks, stage_change, system |
| `server/crm/audit.ts` | Best-effort `crm_audit_log` insert |
| `server/crm/routes.ts` | `/api/crm/*` behind `crmLimiter` + `requireStaff` |

### Customer accounts

| File | Job |
|---|---|
| `server/account.ts` | Profile upsert, saved filters, order join, purchase attach |
| `server/account-routes.ts` | `/api/account/*` behind `accountLimiter` + `requireCustomer` |
| `shared/account-paths.ts` | `safeNextPath` — no `..`, `/admin`, `/api`, `/login` |
| `shared/staff-auth.ts` | Staff magic links land on `/login`, then hop to `/admin` |
| `client/src/lib/staff-auth.ts` | `sessionStorage` pending-staff email |

### Auth UI + HTTP

| File | Job |
|---|---|
| `client/src/lib/admin-api.ts` | Browser Auth client (PKCE). `authedFetch` for crm/account/admin |
| `client/src/contexts/AccountContext.tsx` | Session + PKCE `exchangeCodeForSession` |
| `client/src/pages/account/Login.tsx` | Shopper email + password |
| `client/src/pages/account/Account.tsx` | Profile, filters, orders |
| `client/src/pages/admin/Login.tsx` | Staff OTP |
| `client/src/pages/admin/AdminShell.tsx` | Staff session gate |
| `server/index.ts` | Mounts `/api/crm` and `/api/account`; `logCrmBoot()` |
| `shared/security-headers.ts` | CSP `connect-src` allows `https://*.supabase.co` and `wss://*.supabase.co` |

### Downstream

| File | Job |
|---|---|
| `server/contact.ts` | `appendLead` then fail-soft `recordLeadInCrm` |
| `server/stripe.ts` | After pay: Resend, `recordPurchaseOnAccount`, `closeDealsOnPurchase` |
| `server/admin/data.ts` | Staff overview: CRM counts, customer list, audit |
| `scripts/lib/catalog-sync.ts` | `syncSupabaseCatalog()` upserts 293 rows into `catalog_skus` |
| `shared/email-channels.ts` | `CRM_SENDS_MAIL = false` |

### Install + verify

| File | Job |
|---|---|
| `scripts/setup-crm.ts` | Fetch service_role + anon via Management API; patch Auth redirects |
| `scripts/setup-auth-redirects.ts` | Merge `/login` `/account` `/admin` into `uri_allow_list` |
| `scripts/check-auth-redirects.ts` | Probe magic-link `redirectTo`; evil URL must be blocked |
| `scripts/verify-supabase.ts` | Live tables, RLS, Auth admin, quote → New → Won |
| `scripts/verify-crm.ts` | Kill switch, stages, reminder rule, staff gate, no-mailer import |
| `scripts/verify-account.ts` | Isolation, `safeNextPath`, CRM_DISABLE does not kill accounts |
| `scripts/verify-env.ts` | URL pin, JWT prefixes, live ping |
| `scripts/smoke-admin.ts` | Anon cannot read CRM tables |
| `.env.example` | Variable names (never real secrets) |

There is no `supabase/config.toml`. Migrations are SQL files applied to the **hosted** project (`supabase link --project-ref mayxuwlygchatgeqyhyt` then `supabase db push`), not a local Docker Postgres.

---

## 4. Environment variables

From `.env.example`. Values are never committed.

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | Server | `https://mayxuwlygchatgeqyhyt.supabase.co`. `pnpm verify:env` pins this exact host. |
| `VITE_SUPABASE_URL` | Vite build | Same URL. Baked at `pnpm build`. Changing Railway’s `VITE_` without a rebuild does nothing. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | JWT `eyJ…` with role `service_role`. Bypasses RLS. **Never** `VITE_`. |
| `SUPABASE_ANON_KEY` | Server | JWT anon key used by `auth.getUser(token)` in `server/auth.ts`. |
| `VITE_SUPABASE_ANON_KEY` | Vite build | Browser Auth. Publishable (`sb_publishable_…`) or legacy JWT (`eyJ…`). |
| `STAFF_EMAILS` | Server | Comma-separated. Must include `info@filterhero.net`. A valid token is not enough. |
| `CRM_DISABLE=1` | Optional | Turns CRM off. Quotes still save to `leads.json`. Does **not** turn accounts off. |
| `ACCOUNT_DISABLE=1` | Optional | Turns shopper accounts off. Guest checkout still runs. Does **not** turn CRM off. |
| `SUPABASE_ACCESS_TOKEN` | Setup scripts | From `npx supabase login`. Lets `setup:crm` write keys without printing them. |

A missing URL, a missing service role, or a key that still contains `...` (the `.env.example` placeholder) is treated as unconfigured. The shop keeps selling. Boot log is loud:

```
[crm] off — SUPABASE_SERVICE_ROLE_KEY is empty. Quotes still save to leads.json.
[account] off — SUPABASE_SERVICE_ROLE_KEY is empty. Shoppers can still check out as guests.
```

`getDb()` and `getAccountDb()` share one memoized client. Kill switches are independent. `resetDbClient()` exists so tests can flip env without restarting Node.

---

## 5. Install from zero (this project’s order)

Do these steps in this order. Skipping RLS and jumping to a browser `from("crm_contacts")` is how you reopen FH-188 / FH-205.

### 5.1 Use the existing project (do not mint a second)

Filter Hero already has **one** live project: `mayxuwlygchatgeqyhyt`. Do not create “filter-hero-staging” and point production at it. Local and Railway share this project. Sandbox for Stripe is a Stripe concept; there is no Supabase sandbox in this repo.

Dashboard: [filter-hero](https://supabase.com/dashboard/project/mayxuwlygchatgeqyhyt).

### 5.2 Copy keys into `.env`

From Settings → API:

1. Project URL → `SUPABASE_URL` **and** `VITE_SUPABASE_URL` (same string).
2. `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` only.
3. `anon` / publishable → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`.
4. `STAFF_EMAILS=info@filterhero.net`.

Or, if you have a Management API token:

```bash
npx supabase login
# Windows PowerShell: $env:SUPABASE_ACCESS_TOKEN = (Get-Content "$env:APPDATA\supabase\access-token")
pnpm setup:crm
```

`setup:crm` writes the service role and anon key into `.env` without printing them, then PATCHes Auth config (Site URL `https://filterhero.net` plus the redirect allowlist in §5.3). If the token is missing it prints the dashboard URL to copy from.

### 5.3 Auth URL configuration

Required Redirect URLs:

- `http://localhost:3000/login`
- `http://localhost:3000/account`
- `http://localhost:3000/admin`
- `http://localhost:3000/admin/login`
- `https://filterhero.net/login`
- `https://filterhero.net/account`
- `https://filterhero.net/admin`
- `https://filterhero.net/admin/login`

`pnpm setup:crm` also sends wildcards (`http://localhost:3000/**`, `https://filterhero.net/**`) plus `http://127.0.0.1:3000/**`. Site URL must be `https://filterhero.net`, not localhost — otherwise production magic links fall back to `http://localhost:3000` (FH-208).

`pnpm setup:auth-redirects` GETs the current list, merges the eight required URLs, PATCHes. It does not wipe extras.

`enable_confirmations: true`, `mailer_autoconfirm: false`. Shoppers must confirm email on signup.

### 5.4 Push migrations

```bash
npx supabase link --project-ref mayxuwlygchatgeqyhyt
npx supabase db push
```

Order is the filename order. `0001` seeds the Quotes pipeline. `0004` FORCE RLS + revoke. `0005` creates `catalog_skus` empty — fill it with `pnpm sync:catalog`.

Do not `CREATE POLICY` after this. Do not `GRANT SELECT ON crm_contacts TO anon`. `pnpm verify:supabase` inserts with the anon key and asserts that insert **fails**.

### 5.5 Sync the Model Pricing catalog

```bash
pnpm sync:catalog
```

That upserts Stripe Products, Klaviyo custom-catalog items, **and** 293 rows into `catalog_skus`. Admin catalog UI still reads `shared/sellable-skus.json` via `sellableSheetProducts()`. Postgres is the SQL copy staff can query. Source of truth for what is for sale remains the sheet.

### 5.6 Railway

Same five variables as local, plus `STAFF_EMAILS`. Vite bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at **build** time. Changing them on Railway without a rebuild leaves the old Auth client in the SPA. Service role is runtime — Express reads it on boot.

Do not copy a placeholder `...` key onto Railway. Do not put the service role in a `VITE_` Railway variable (FH-188, FH-191, FH-210).

### 5.7 Prove it

```bash
pnpm verify:env
pnpm verify:supabase
pnpm verify:crm
pnpm verify:account
pnpm verify:security
```

`verify:supabase` talks to the live project. It creates a probe profile and a probe quote deal, closes it as won, then deletes both. A green run means tables, RLS, Auth admin, and intake are the same as this document.

---

## 6. How Postgres is actually reached

This is the part people get wrong when they import a generic “connect Postgres” guide.

### 6.1 No wire protocol

Nothing in this repo opens port 5432. There is no connection string. `Grep` for `DATABASE_URL` / `postgres://` / `postgresql://` returns nothing. The database is reached through Supabase’s HTTPS Data API (`/rest/v1/...`) and Auth API (`/auth/v1/...`), which `supabase-js` wraps.

Why: Railway Express is one process. A pooled `pg` client would need the database password, IPv6/IPv4 add-on, and a second secret to rotate. The service role JWT already bypasses RLS. One client, one secret, one audit path.

### 6.2 The only server client

```ts
// server/db.ts
client = createClient(
  process.env.SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

`persistSession: false` because this is a Node process, not a browser. Memoized in module scope. `getDb()` returns it when CRM is on; `getAccountDb()` returns the **same** object when accounts are on. Two kill switches, one socket.

Health:

- CRM: `from("crm_stages").select("id", { count: "exact", head: true })` — expects 6.
- Accounts: `from("customer_profiles").select("id", { count: "exact", head: true })`.

### 6.3 The only browser client

```ts
// client/src/lib/admin-api.ts
createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
```

This client is for `supabase.auth.*` only. CRM reads go through `authedFetch("/api/crm", ...)`. Account reads through `authedFetch("/api/account", ...)`. The comment at the top of the file is the invariant:

> Supabase is used for authentication only. … The browser never queries Postgres.

CSP must allow the Auth HTTPS + websocket endpoints or PKCE refresh dies in the browser:

```
connect-src 'self' https://*.supabase.co wss://*.supabase.co …
```

(`shared/security-headers.ts`.) Do not add `http://*.supabase.co` to production.

### 6.4 Token verification is a network call

```ts
// server/auth.ts
const { data, error } = await client.auth.getUser(token);
```

A local `jwt.decode` would accept a revoked or already-signed-out session. The anon-key client is constructed **per request** with `Authorization: Bearer ${token}` and `persistSession: false`. Failures: 503 `auth_unavailable` (Auth down), 401 `unauthenticated` (no/bad token), 403 `forbidden` (valid token, not on `STAFF_EMAILS`). Unconfigured gate is 503 `auth_not_configured`, never open.

Staff and shopper share one Auth project. A shopper session cannot open `/admin` because `requireStaff` also checks `STAFF_EMAILS`. The 403 body is identical for “bad token” and “not staff” so a prober cannot enumerate the allowlist.

---

## 7. Two logins, one Auth project

| | Shopper `/login` | Staff `/admin/login` |
|---|---|---|
| Factor | Email + password (min 8). Signup sends a confirm-email link. | Magic link + 6-digit email OTP. `shouldCreateUser: true`. |
| Redirect | `emailRedirectTo` = origin + `safeNextPath(?next)` | `emailRedirectTo` = origin + `/login` (`STAFF_MAGIC_LINK_PATH`) |
| After session | `consumeStaffAuthPending` may send matching staff to `/admin`; else `?next` or `/account` | `AdminShell` `onAuthStateChange` |
| Why not magic for shoppers | Passwords survive an Auth allowlist miss. FH-171 restored email+password on `/login`. | No password to leak or rotate. |
| Why not `/admin` as magic landing | Production allowlist historically omitted `/admin`. Link fell back to Site URL localhost (FH-208). | Code still works if the link cannot. |

PKCE exchange lives in `AccountContext`: if the URL has `?code=` and the path is not `/admin`, `exchangeCodeForSession(code)` then strip the code from the address bar. Staff pending email is `sessionStorage` key `fh-staff-after-auth`. Only the **same** inbox is sent to `/admin`.

`safeNextPath` is the shopper redirect sanitizer. Anything with `..`, `//`, a scheme, `/admin`, `/api`, or `/login` becomes `/account`. `/login?next=/account/../admin` cannot leave the site (FH-205).

`/login`, `/account`, and `/admin` are `noindex` and disallowed in `robots.txt`.

---

## 8. Schema — five migrations, in order

Apply with `supabase db push`. Do not invent a sixth that adds `CREATE POLICY`.

### 8.1 `0001_crm.sql` — staff pipeline

HubSpot subset: contacts, companies, deals, one pipeline, notes/tasks, audit. No dynamic properties, no association graph, no marketing objects.

**Tables**

| Table | Keys / constraints that matter |
|---|---|
| `crm_pipelines` | `id text` PK. Seed: `quotes`. |
| `crm_stages` | FK pipeline. `closed_won` / `closed_lost` cannot both be true. Seed: `new`, `needs_info`, `priced`, `waiting`, `won`, `lost`. |
| `crm_companies` | `domain text unique`. `properties jsonb`. |
| `crm_contacts` | `email text unique` **and** `email = lower(email)`. Optional `klaviyo_profile_id`, `stripe_customer_id`. |
| `crm_deals` | `source in ('quote_form','custom_quote','cart_quote','manual')`. Partial unique index on `lead_id` where not null. `next_action_at` is the anti-ghosting column. |
| `crm_activities` | `type in ('note','task','stage_change','system')`. Task status `NOT_STARTED` / `COMPLETED`. |
| `crm_audit_log` | Identity PK. Actor, action, entity, before/after jsonb. |

**Indexes:** stages by pipeline+order; contacts by company; deals by stage, contact, and partial `next_action_at` where `closed_at is null`; activities by deal/contact time and open tasks; audit by entity+id+time.

**Trigger:** `crm_touch_updated_at()` with `set search_path = ''` on companies, contacts, deals.

**RLS:** `enable row level security` on every table. Zero policies.

**Seed:** pipeline `quotes`. Six stages in display order. `on conflict (id) do nothing` so re-push is safe.

### 8.2 `0002_customer_accounts.sql`

| Table | Keys / constraints |
|---|---|
| `customer_profiles` | `auth_user_id uuid unique`, `email unique` + lowercase check. Address columns. `properties jsonb`. |
| `customer_saved_filters` | FK profile cascade. `unique (profile_id, product_id)`. `source in ('manual','purchase')`. |

Orders are **not** copied here. `orders.json` stays the append-only purchase log. History is joined by verified session email at read time.

RLS enabled, zero policies.

### 8.3 `0003_crm_fk_indexes.sql`

Advisor flagged unindexed FKs. Cheap covers:

```sql
create index if not exists crm_deals_pipeline_idx on crm_deals (pipeline_id);
create index if not exists crm_deals_company_idx on crm_deals (company_id);
```

`pipeline_id` is always `quotes` today. Keep the index anyway.

### 8.4 `0004_lock_browser_grants.sql` (FH-205)

Defense in depth on top of deny-by-default. RLS without FORCE still lets a table owner skip policies. Grants without revoke still let a later `CREATE POLICY` open the customer list.

For every CRM + account table:

1. `alter table … force row level security`
2. `revoke all on table … from anon, authenticated, public`

Then default privileges in `public` revoke tables/sequences/functions from those roles.

The migration header comment says “FH-201”. The issue that shipped this file is **FH-205**. Do not treat the comment as the id.

### 8.5 `0005_catalog_skus.sql` (FH-223)

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

No `cost_dollars`. Stripe, Klaviyo, and this table never see dealer cost. FORCE RLS + revoke, same as the others. Fill with `pnpm sync:catalog`. `verify:supabase` asserts count `=== 293`.

---

## 9. CRM coding — how a quote becomes a row

### 9.1 Intake is fail-soft

`server/contact.ts` saves the lead to `leads.json` first. Then, in its own try/catch:

```ts
const crm = await recordLeadInCrm(lead);
```

A downed Supabase cannot fail the shopper’s submission. Same pattern on the Stripe webhook for `closeDealsOnPurchase` and `recordPurchaseOnAccount`.

### 9.2 Intent map (FH-131)

```ts
export const INTENT_TO_STAGE = {
  quote: "new",
  support: null,   // contact + note, no deal
  reminder: null,  // skipped entirely
};
```

A Filter Clock cadence save is not a purchase signal. Creating a deal for it would put someone who asked for nothing into a sales pipeline. `reminder` returns `{ ok: true, skipped: true }` before any write.

Quote: upsert contact (lowercase email, fill-blanks), create deal in `new` with `next_action_at` = now + 1 day, log a `system` arrival note **only if this call inserted** (`created === true`). Retry of the same `lead_id` hits the partial unique index, returns the original deal, does not double-note.

Support: upsert contact, log a `note`, no deal.

Names that look like “Filter Clock …” are not split into first/last.

Deal `source`: `cart_quote` if `cartSummary` is set, `custom_quote` if no filter size, else `quote_form`.

### 9.3 Contact upsert

`upsertContact` looks up by lowercased email. Existing row: only fill empty columns. Exception: `klaviyo_profile_id` and `stripe_customer_id` overwrite, because a newer id is more correct than a stale one. Insert race on unique email (`23505`) re-reads instead of failing.

### 9.4 Deal patch and close

Moving into `won` or `lost` stamps `closed_at`, clears `next_action_at` (otherwise the board shows it overdue forever), clears `lost_reason` on won. Moving back out clears `closed_at` and lost reason. Stage change writes a `stage_change` activity.

`closeOpenDealsForContact` (Stripe pay): every open deal for that contact whose stage is not already `lost` becomes `won`. Amount is written only when the deal has none — a single order must not overwrite a quoted total. Closing an already-closed deal is a no-op (Stripe retries).

List order: `next_action_at` ascending, **nulls last**, then `created_at` desc. A deal with no next action sinks. A deal with a past next action is red on the board; none is amber. That is the FH-176-era inbox death, seen from the pipeline side — the board exists to make whose-turn-it-is visible.

### 9.5 Audit

Every mutation calls `recordAudit`. Failure logs and returns. Losing the record of a change is better than rolling back the change. Intake writes use `SYSTEM_ACTOR` `{ id: null, email: "system@filterhero" }`.

### 9.6 HTTP

`/api/crm` uses `crmLimiter` (60 / minute) then `requireStaff`. JSON envelope `{ ok, data }` or `{ ok: false, error, code }`. Database failures are 502 with a **fixed** string (`The CRM could not complete that.`) — the detail stays in the server log (FH-175 / FH-205). Zod failures go through `publicError`. Disabled CRM is 503.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | enabled, reachable, stage count |
| GET | `/stages` | display order |
| GET | `/deals` | `stageId`, `open`, `limit` |
| POST | `/deals` | create |
| GET | `/deals/:id` | deal + contact + timeline |
| PATCH | `/deals/:id` | stage, amount, next action, owner, lost reason |
| POST | `/activities` | note or task |
| POST | `/activities/:id/complete` | mark task done |
| POST | `/contacts` | upsert by email |

`pnpm verify:crm` greps `server/crm/` and asserts no import of `mailer`, `klaviyo`, or `resend`.

---

## 10. Customer-account coding

### 10.1 Isolation

`requireCustomer` proves the inbox. Every query then adds `auth_user_id = actor.id` or `profile_id = this profile`. `ordersForCustomer` drops every `orders.json` row whose email does not match. Empty email returns `[]`. The request body cannot ask for a different address.

### 10.2 Profile load

Look up by `auth_user_id`. Missing → upsert `{ auth_user_id, email }` on conflict `auth_user_id`. First visit to `/account` creates the row.

### 10.3 Saved filters

`saveFilter` requires `getProductById` **and** `product.inStock`. Off-sheet / archive sizes are `not_for_sale` (FH-223). Upsert on `(profile_id, product_id)`. Delete is `eq id` **and** `eq profile_id` so you cannot delete someone else’s pin by guessing a UUID.

### 10.4 Purchase attach (fail-soft)

`recordPurchaseOnAccount` runs from `checkout.session.completed`. If there is **no** profile for that email yet, it returns. Guest checkout still works; the filter list fills on the next paid order after the profile exists, and `getAccount` also backfills from `orders.json` on read (`syncPurchasedFilters`, `ignoreDuplicates: true`). Blank profile address fields are filled from Stripe shipping; existing values are not overwritten.

### 10.5 HTTP

`/api/account` uses `accountLimiter` (60 / minute) then `requireCustomer`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | enabled, reachable |
| GET | `/` | profile + filters + orders |
| PATCH | `/` | profile fields |
| POST | `/filters` | pin a catalog SKU |
| DELETE | `/filters/:id` | unpin |

502 body is a fixed string. `unknown_product` / `not_found` are 404. Disabled is 503.

`CRM_DISABLE` does not turn this off. `ACCOUNT_DISABLE` does not turn CRM off. They share a database, not a kill switch (`verify:account` asserts this).

---

## 11. Catalog SKUs vs the shop catalog

Three copies of “what we sell.” They must stay in lockstep after a sheet rebuild.

| Copy | Owner | Used by |
|---|---|---|
| `shared/sellable-skus.json` | `scripts/build-sellable-skus.ts` from Model Pricing XLS / `model-pricing.csv` | Storefront, Stripe `price_data`, admin Catalog page |
| Stripe Products `prod_fh_{id}` | `pnpm sync:catalog` | Checkout Product attach |
| Klaviyo custom catalog | `pnpm sync:catalog` | Feeds / recommendations |
| Postgres `catalog_skus` | `syncSupabaseCatalog()` | Staff SQL, `verify:supabase` count |

Admin `/admin` catalog is `sellableSheetProducts()`, **not** a select from `catalog_skus`. The table exists so Postgres has the same 293 rows and so `/account` cannot pin an archived size (in-stock check still uses `shared/products.ts`).

`syncSupabaseCatalog` maps each sheet product to a row (list price, Stripe id if mapped, Klaviyo external id), upserts on `product_id`, deletes extras. Missing service role → `{ skipped: true }`, not a thrown error, so Stripe/Klaviyo sync can still run.

Never put wholesale cost on this table (FH-223).

---

## 12. JSON files stay. Postgres sits on top.

| File | Job | Wiped by redeploy? |
|---|---|---|
| `server/data/leads.json` | Append-only quote/support/clock saves | Yes if you write under `dist/` (FH-122). Use `DATA_DIR` or `<cwd>/server/data`. |
| `server/data/orders.json` | Append-only paid Checkout sessions | Same. Idempotent on `sessionId` (FH-123). |
| `server/data/site-config.json` | Homepage copy, featured sizes, maintenance | Not Postgres. No secrets. |

Postgres is how staff query that world: contacts, deals, profiles, audit. It is not the packing list of record and not the payment record of record. Stripe + `orders.json` own money. Resend owns the branded confirmation. Klaviyo owns marketing events.

---

## 13. Security that is part of this install

1. **Deny-by-default RLS + FORCE + revoke.** Do not `CREATE POLICY`. Do not `GRANT` CRM/account/catalog tables to `anon` or `authenticated`. `verify:supabase` selects `crm_pipelines` / `crm_stages` with the anon key and asserts zero rows, then tries an anon insert into `customer_profiles` and asserts it errors.
2. **Service role never in the bundle.** `VITE_` is public. FH-188 / FH-191 / FH-210 all say this.
3. **`getUser`, not decode.** Revoked sessions die.
4. **`STAFF_EMAILS` is a second factor.** Signup is open. A token only proves inbox control.
5. **Unconfigured gates fail closed** (503), never open.
6. **Staff 403 body is identical** for bad token and non-staff.
7. **Rate limits.** CRM and account 60/min. Contact 5 / 15 min. Checkout 10 / 15 min.
8. **Public errors are codes.** No Zod dumps, no PostgREST messages to the browser (FH-205).
9. **`safeNextPath`.** No open redirect onto `/admin`.
10. **CSP** allows Supabase HTTPS/WSS. Production adds `upgrade-insecure-requests`.
11. **Turnstile** on quote/support. `reminder` skips it (FH-131 / FH-190). Production fails closed if the secret is missing (except reminder).
12. **Webhook attach is fail-soft.** A downed Supabase cannot fail a paid Stripe event.
13. **CRM imports neither mailer nor Klaviyo.** Enforced by `verify:crm`.
14. **`/admin` is noindex.**

---

## 14. Boot and health

`server/index.ts` calls `logCrmBoot()` when the API starts. `/api/health` stays a public `{ ok, brand }` ping and does **not** leak whether CRM is on. Staff see CRM/account health on `/admin` via `/api/admin` (and `/api/crm/health`, `/api/account/health` behind their gates).

Admin systems card loads CRM, account, and Klaviyo health in parallel. A Klaviyo outage must not blank the page (FH-214).

---

## 15. Scripts (copy these, do not invent new ones)

| Command | What it proves / does |
|---|---|
| `pnpm setup:crm` | Write service_role + anon when `SUPABASE_ACCESS_TOKEN` is set. Patch Auth redirects. Print dashboard URLs otherwise. Exit 1 if CRM still unreachable. |
| `pnpm setup:auth-redirects` | Merge the eight login/account/admin URLs into Auth allowlist. |
| `pnpm exec tsx scripts/check-auth-redirects.ts` | Live `generateLink` probe. Production `/login` allowed. `https://evil.example/phish` blocked. Deletes the probe user. |
| `pnpm verify:supabase` | Pins project URL. Six stages. Ten tables readable as service role. Anon cannot read or write. Probe insert/delete. `catalog_skus === 293`. Auth admin. Quote → New → Won, cleaned up. |
| `pnpm verify:crm` | Kill switch, six stages, reminder no-deal, `lead_id` idempotency, RLS-on-no-policies, `requireStaff` reject, unconfigured fail-closed, contact limiter, honeypot/Turnstile, `/admin` noindex, **no mailer/Klaviyo import**. |
| `pnpm verify:account` | `ACCOUNT_DISABLE`, `CRM_DISABLE` independence, order isolation, `safeNextPath`, staff magic path `/login`. |
| `pnpm verify:env` | `SUPABASE_URL` exact host. Keys `eyJ` / `sb_publishable_`. Live `customer_profiles` + `auth.admin.listUsers`. |
| `pnpm verify:security` | Headers, CSP includes `*.supabase.co`, migration 0004 present, `safeNextPath`. |
| `pnpm sync:catalog` | Stripe + Klaviyo + `catalog_skus`. |
| `pnpm smoke:admin` | Anon client cannot read staff tables. |
| `pnpm check` | TypeScript. |

---

## 16. Replicating this install on another Filter Hero-class shop

Do these in this order. Skipping RLS (step 4) recreates FH-188 / FH-205.

1. One hosted Supabase project. Pin the URL in `verify:env`. Do not run local `supabase start` unless you also change every script that hard-codes `mayxuwlygchatgeqyhyt`.
2. Env: URL ×2 (`SUPABASE_` + `VITE_`), service role (server), anon ×2, `STAFF_EMAILS`. No `DATABASE_URL`.
3. `createClient` service role in Express with `persistSession: false`. Browser client is Auth-only, PKCE.
4. Migrations 0001–0005. RLS on, FORCE, zero policies, revoke browser grants.
5. `requireStaff` / `requireCustomer` call `auth.getUser`. Unconfigured = 503.
6. Shoppers: email + password on `/login`. Staff: OTP, magic link lands on `/login`, hop to `/admin` via `sessionStorage`.
7. Auth allowlist: localhost + production `/login` `/account` `/admin` `/admin/login`. Site URL is the production origin.
8. Contact: save JSON first, then CRM. Reminder creates no deal.
9. Stripe pay: fail-soft close deals + attach SKUs to an existing profile. Do not fail the webhook.
10. `orders.json` / `leads.json` remain append-only. Join by email at read time.
11. `catalog_skus` from `pnpm sync:catalog`. No wholesale cost. Saved filters must be in-stock sheet SKUs.
12. CRM never imports mailer or Klaviyo. `CRM_SENDS_MAIL = false`.
13. CSP `https://*.supabase.co` `wss://*.supabase.co`.
14. Verify scripts that fail if anon can read a row or if stage count ≠ 6.

---

## 17. What the replica plan would add (do not build it here)

[KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md) describes a future Filter Hero CDP: `profiles`, `events`, `pg_cron`, `pgmq`, pgvector, Edge Functions, Airtable as operator UI. Status: **spec**. The live path is Klaviyo (`VnVNmQ`) for marketing and this document for Postgres.

If you start that build, it is a new product with new migrations. It is not a patch on `0001_crm.sql`. Replenish still must not fire from a Filter Clock save (FH-131).

---

## 18. Issues and fixes (complete Supabase / Postgres / Auth / CRM / accounts log)

Source of truth remains [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). This section is every item that taught this database shape, newest first, with status. Chat is not the log.

### The install itself

**FH-188 — Supabase CRM and accounts were half-wired on this branch** (fixed 2026-09-07)  
Live `filter-hero` already had tables, RLS, and keys. This branch only had `0002_customer_accounts.sql`. `/admin` 404ed, `/api/crm` was missing, quotes never opened a deal, paid webhooks never attached SKUs. Do **not** ship login without the CRM schema, staff routes, and webhook attach. Do not put the service role in a `VITE_` var. Do not add RLS policies that let the browser query Postgres. Do: deny-by-default RLS, Express service role, `/login` + `/api/account`, `/admin` + `/api/crm` behind `STAFF_EMAILS`, Auth redirects for localhost and `filterhero.net`. Verify: `pnpm verify:supabase`, `verify:account`, `verify:crm`.

**FH-171 — Sign-in vanished after switching to family-section-blue** (fixed 2026-09-06)  
`/login` 404ed; header had no Sign in. Customer-account files stayed on another branch. Do **not** ship without `/login`, `AccountProvider`, and the header user icon. Do: email + password on `/login`. `/api/account` behind `requireCustomer`.

**FH-189 — `pnpm check` failed and Vite env was incomplete** (fixed 2026-09-07)  
No `compilerOptions.target`. No `SITE_URL` / `VITE_SITE_URL`. Smoke skipped `/login`, `/account`, `/admin`. Do **not** put service-role keys in `VITE_` vars. Do not list `/admin` after `/admin/login` in a prefix matcher (the more specific routes must win). Do: `target` ES2022, type Vite keys in `vite-env.d.ts`, keep `/admin/login` and `/admin/deals/:id` above `/admin`.

**FH-191 — Local `.env` had no live verifier** (fixed 2026-09-07)  
Keys (including Supabase) lived in `.env` with nothing asserting formats or pinging APIs. Do **not** print secrets. Do not put service-role in `VITE_`. Do: `pnpm verify:env` after changing `.env`. Supabase URL pinned to `mayxuwlygchatgeqyhyt`.

### RLS, grants, and the public API

**FH-205 — Public API had no headers, leaked parser text, and left browser grants on Postgres** (fixed 2026-09-07)  
Anon/authenticated still had table grants; RLS was the only gate. `/login?next=/account/../admin` could leave the site. Do **not** `CREATE POLICY` on CRM/account tables. Do not `GRANT` those tables to `anon` / `authenticated`. Do: migration `0004_lock_browser_grants.sql` FORCE RLS + revoke. `safeNextPath` rejects `..`, `/admin`, `/api`, `/login`. Express CSP includes `https://*.supabase.co`. Verify: `pnpm verify:security`, `verify:supabase`.

**FH-190 — Quote intake had no bot gate, and CRM routes imported a missing security module** (fixed 2026-09-07)  
`server/crm/routes.ts` imported `crmLimiter` from `server/security.ts`, which did not exist. `/api/contact` had no rate limit or honeypot. Do **not** require Turnstile on `intent=reminder`. Do not let the CRM send mail. Do not skip `requireStaff` on `/api/crm`. Do: `server/security.ts` as the public-API gate. Contact 5 / 15 min. Paid checkout still closes CRM deals fail-soft. Verify: `GET /api/crm/health` is 401 without a staff session.

### Auth redirects and staff login

**FH-208 — Production staff magic links could not land on /admin** (fixed 2026-09-11)  
Auth allowed `https://filterhero.net/login` and `/account`, not `/admin`. Staff OTP used `emailRedirectTo` `/admin`, so the production magic link fell back to Site URL `http://localhost:3000`. The 6-digit code still worked. Do **not** point staff `emailRedirectTo` at `/admin` until that exact URL is on the allowlist **and** Site URL is `https://filterhero.net`. Do: staff magic links land on `/login`. `sessionStorage` stores the staff email; after PKCE, only that email goes to `/admin`. Shopper sessions are not redirected. Keep `safeNextPath` rejecting `/admin`. Verify: `pnpm exec tsx scripts/check-auth-redirects.ts`.

**FH-215 — Toasts never mounted; staff OTP hidden until a second send** (fixed 2026-09-16)  
Staff login hid the 6-digit field until “Send link” ran, so an already-issued OTP could not be typed. Do: `/admin` has “I already have a code”. Verify: `pnpm verify:admin`.

### Catalog in Postgres

**FH-223 — Stripe, Klaviyo, CRM, and accounts still had the old catalog** (fixed 2026-09-16)  
FH-217 restricted the shop to Model Pricing SKUs, but Supabase had no SKU table and `/account` would pin off-sheet sizes. Do **not** skip `pnpm sync:catalog` after a sheet rebuild. Do not put wholesale cost on `catalog_skus`. Do: `0005_catalog_skus.sql` + `syncSupabaseCatalog()`. Saved filters must be in-stock sheet SKUs. Verify: `pnpm verify:supabase` count matches the XLS. Admin catalog shows the Model Pricing list (from JSON). Related: FH-217 (shop = Model Pricing list), FH-303 (Railway `FULL_CATALOG=true` would sell the archive on next rebuild — open, Railway vars, not a Postgres bug).

### Staff console on top of Postgres

**FH-213 — Staff console was quotes-only** (fixed 2026-09-16)  
`/admin` was a quotes Kanban. Do **not** let the browser query Postgres. Do not send mail or write Klaviyo from `server/admin/` or `server/crm/`. Do not store Stripe/Resend secrets in `site-config.json`. Do not make `/admin` indexable. Do: modules behind `requireStaff` at `/api/admin/*`. `STAFF_EMAILS` remains the allowlist. Catalog SKUs stay in shared JSON for the UI.

**FH-214 — Admin console bugs after the first landing** (fixed 2026-09-16)  
Contacts search fired two API calls per keystroke and could 429. A Klaviyo health outage blanked the whole systems card. Do: debounce + stale-response guard. Health loads CRM/account/Klaviyo in parallel and keeps the page up if Klaviyo throws.

### Production had the schema locally and not on the origin

**FH-210 — Production still ran an older main build** (fixed 2026-09-11)  
Local had CRM, accounts, Klaviyo, Turnstile, security headers. `filterhero.net` was Railway `main` without them. Do **not** `railway up` this branch while `main` is behind. Do not put service-role keys in `VITE_` vars. Do: merge the shop/CRM/Klaviyo/security stack to `main`. Verify: live `/login` and `/admin` 200. CRM and account 401 when signed out.

**FH-187** (fixed 2026-09-07) is the same class of deploy drift for photos, not schema. Mentioned because a `railway up` of a dirty branch still threatens to ship or roll back CRM with it (see also open FH-304).

### Intake rules that the CRM must keep

**FH-131 — Filter Clock must not send replacement emails before a purchase** (mitigated 2026-09-01)  
Clock is a calculator. `INTENT_TO_STAGE.reminder` is absent on purpose. CRM must not open a deal. Klaviyo must not subscribe. Resend must not send a shopper receipt. Replenish starts on Placed Order.

**FH-124 — Contact email failure returned 400 after the lead was saved** (mitigated 2026-08-31)  
Save-first, fail-soft. CRM intake follows the same shape: JSON is written, then Postgres, then Klaviyo, then Resend. Later failures log; the shopper still gets `{ ok: true, id }`.

### JSON vs Postgres (why both exist)

**FH-122 — Production leads and orders wrote into `dist/data`** (mitigated 2026-08-31)  
Bundled `__dirname/data` is wiped on redeploy. Postgres does not replace these files. Do: `DATA_DIR` or `<cwd>/server/data`. Account order history reads that file.

**FH-123 — Stripe webhook wrote duplicate orders on retry** (mitigated 2026-08-31)  
Idempotent `orders.json` on `sessionId`. CRM `lead_id` unique index is the same idea on the quote side. Closing an already-won deal is a no-op.

**FH-203 — Stripe Dashboard had no fulfillment webhook** (fixed 2026-09-07)  
Paid sessions never wrote orders, so CRM close and account attach never ran. Fix is the Stripe webhook, not a Postgres trigger.

### Adjacent (CSP / env / mailer boundary)

These are not schema bugs. They constrain how Auth and CRM may be wired.

**FH-209 / FH-212** — Local CSP blocked Klaviyo identify. Production CSP must keep `https://*.supabase.co` (and must **not** open plaintext Klaviyo). Restart Vite after header changes.

**FH-202 / FH-171 (mailer)** — `CRM_SENDS_MAIL = false`. A third From on `filterhero.net` splits sending reputation. `verify:crm` blocks mailer imports under `server/crm/`.

**FH-247** — Turnstile on quote/support, not on every homepage view, not on clock reminder.

### Open items that can still break this install

**FH-304 — GitHub autodeploy and `railway up` both own FILTER-HERO** (open 2026-09-20)  
A dirty `railway up` can ship or roll back the CRM stack. Pin `source.branch=main`. Do not `railway up` this branch while GitHub watches the repo.

**FH-306 — Railway has no HTTP healthcheck** (open 2026-09-20)  
`/api/health` exists. Railway does not wait for Express. Unrelated to Postgres connectivity, but a deploy marked SUCCESS before boot means `logCrmBoot()` has not run yet.

**FH-303 — Railway `FULL_CATALOG=true`** (open 2026-09-20)  
Next rebuild would sell the archive. `catalog_skus` and the JSON sheet would diverge from the live storefront until vars are `false`.

**FH-305** is Stripe keys on Railway, not Supabase. Local `.env` pointing at live Supabase + sandbox Stripe is the intended split.

---

## 19. Invariants (read these before changing a line)

1. The browser never queries Postgres.
2. RLS is deny-by-default. Zero policies. FORCE. Grants revoked.
3. Service role is server-only. Never `VITE_`.
4. `getUser(token)`, never a local JWT decode.
5. `STAFF_EMAILS` is required for `/admin` and `/api/crm`. A session is not enough.
6. Unconfigured auth is 503, not 200.
7. CRM never mails. CRM never writes Klaviyo.
8. Filter Clock `reminder` creates no deal, no marketing subscribe, no shopper email.
9. Contact and Stripe webhook are fail-soft around Postgres.
10. `leads.json` / `orders.json` remain append-only. Postgres is the queryable layer.
11. `CRM_DISABLE` and `ACCOUNT_DISABLE` are independent.
12. Staff magic links land on `/login`. Site URL is `https://filterhero.net`.
13. `safeNextPath` never returns `/admin`.
14. `catalog_skus` has no wholesale cost. Count matches the Model Pricing XLS.
15. Saved filters must be in-stock sheet products.
16. Emails are stored lowercase. Unique indexes assume that.
17. `lead_id` intake is idempotent. Stripe pay close is idempotent.
18. `pnpm verify:supabase` is the proof, not a dashboard screenshot.

---

## 20. Quick reference — dashboard clicks

| Need | Where |
|---|---|
| Rotate service role | Settings → API → `service_role` → reset. Put the new value on local `.env` **and** Railway. Restart Express. Rebuild not required. |
| Rotate anon / publishable | Same page. Update `SUPABASE_ANON_KEY` + `VITE_SUPABASE_ANON_KEY`. **Rebuild** the SPA (Vite bake). |
| Redirect URLs | Authentication → URL configuration. Or `pnpm setup:auth-redirects`. |
| Confirm Site URL is production | Same page. Must be `https://filterhero.net`. |
| Users | Authentication → Users. Staff are ordinary users on `STAFF_EMAILS`. |
| Table editor | Table Editor → `public`. You will see rows because you are the dashboard role. The anon key still sees none. |
| SQL | SQL Editor. Prefer a new migration file in `supabase/migrations/` over a one-off that production will forget. |
| Auth emails | Authentication → Email templates. Filter Hero does not customize these in-repo; GoTrue sends confirm / recovery / magic link. Resend does not send those. |
