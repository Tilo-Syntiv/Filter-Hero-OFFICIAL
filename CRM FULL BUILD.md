# CRM FULL BUILD

**Filter Hero — how the CRM is installed, wired, connected, and kept in sync.**

This is not a generic HubSpot clone, not a generic Supabase tutorial, and not a mailbox. It is the exact staff pipeline in this repository: one Quotes board in hosted Postgres, fail-soft intake from the contact form, fail-soft close-won from Stripe, a contractor SKU mirror, deny-by-default RLS, and a browser that never queries a CRM table.

The short staff-ops sheet is [CRM.md](./CRM.md). Postgres, Auth, and shopper accounts underneath this pipeline are [SUPABASE-AND-POSTGRES-FULL-BUILD.md](./SUPABASE-AND-POSTGRES-FULL-BUILD.md). Channel law lives in `shared/email-channels.ts`. The issue log is [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md).

**Last aligned to the live tree:** 2026-09-20.

If this file and the code disagree, the code plus `pnpm verify:crm` / `pnpm verify:supabase` win, then this file is updated.

---

## 0. The sentence that decides every later choice

The CRM is a **staff quote board**. It never emails a shopper. It never writes a Klaviyo profile. `CRM_SENDS_MAIL = false`. Resend owns transactional HTML. Klaviyo owns marketing. Stripe owns the payment receipt. Staff email shoppers from their own inbox; the deal page is a `mailto:` plus an activity note.

Postgres is the **queryable layer** on top of `leads.json` and `orders.json`. Those JSON files remain the append-only record. A CRM outage must not fail a quote submit or a paid Checkout webhook.

The browser never queries Postgres. Staff Auth is the only client-side Supabase call (`VITE_SUPABASE_ANON_KEY`, PKCE). Every CRM row goes through Express with `SUPABASE_SERVICE_ROLE_KEY` behind `requireStaff`. Tables are RLS deny-by-default: enabled, FORCE RLS, **zero policies**, grants revoked from `anon` / `authenticated` / `public`.

There is **no** HubSpot, Salesforce, or Close.com. There is **no** CRM webhook into Klaviyo. There is **no** CRM mailer. A third sender on `filterhero.net` re-opens FH-171.

---

## 1. What “CRM sync” means in this project

Filter Hero does not run a two-way CRM product. **Sync** is four one-way writes into the same Postgres project, plus staff mutations on the board.

```
Shopper quote / support form
  → appendLead (leads.json)                 MUST succeed
  → recordLeadInCrm                         fail-soft
  → syncContactToKlaviyo                    fail-soft (not CRM)
  → Resend staff alert + shopper receipt    fail-soft (not CRM)

Filter Clock reminder
  → appendLead
  → CRM skipped (FH-131)
  → Klaviyo house fields only, no list join
  → no shopper email

Paid Stripe Checkout (checkout.session.completed)
  → orders.json (idempotent on sessionId)
  → Klaviyo Placed Order                    fail-soft
  → Resend order confirmation               fail-soft
  → recordPurchaseOnAccount                 fail-soft (accounts, not CRM)
  → closeDealsOnPurchase                    fail-soft  ← CRM sync

Contractor sheet rebuild
  → pnpm sync:catalog
  → Stripe Products + Klaviyo catalog + catalog_skus

Staff at /admin
  → Bearer JWT → requireStaff → /api/crm
  → deals, notes, stage moves, contacts
```

| Direction | Trigger | Function | Result |
|---|---|---|---|
| Form → CRM | `POST /api/contact` `intent=quote` | `recordLeadInCrm` | Upsert contact. Open deal in `new`. Next action +1 day. System arrival note once. |
| Form → CRM | `intent=support` | `recordLeadInCrm` | Upsert contact. Attach a note. **No deal.** |
| Form → CRM | `intent=reminder` | `recordLeadInCrm` | `{ ok: true, skipped: true }` before any write. |
| Stripe → CRM | `checkout.session.completed` | `closeDealsOnPurchase` | Upsert contact (Stripe customer id). Every open non-lost deal → `won`. |
| Sheet → CRM mirror | `pnpm sync:catalog` | `syncSupabaseCatalog` | 293 rows in `catalog_skus`. No wholesale cost. |
| Staff → CRM | `/admin/quotes`, `/admin/deals/:id`, `/admin/contacts` | `/api/crm/*` | Stage, amount, next action, notes, manual contact/deal. |
| CRM → shopper mail | none | — | Forbidden. `verify:crm` greps `server/crm/` for mailer / Klaviyo / Resend. |
| CRM → Klaviyo | none | — | Contacts may *store* a `klaviyo_profile_id` if intake ever passed one. Nothing under `server/crm/` writes Klaviyo. |

Idempotency:

- Quote deals: partial unique index on `crm_deals.lead_id` where not null. A double submit or a retried POST reuses the original deal and does **not** log the arrival note twice (`created === true` is the gate).
- Stripe close: already-closed deals are skipped. Amount is written only when the deal has none, so one order cannot overwrite a quoted total.
- Contact email: unique + lowercase check. Insert race `23505` re-reads.

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
| Pipeline | `quotes` |
| Stages | `new` → `needs_info` → `priced` → `waiting` → `won` / `lost` |
| System actor | `system@filterhero` |
| Staff console | `https://filterhero.net/admin` (board at `/admin/quotes`) |
| Local console | `http://localhost:3000/admin` — API is `:3001` |
| SDK | `@supabase/supabase-js@^2.115.0` |

The project ref is not a secret. The **service role JWT** is. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable, `site-config.json`, the browser bundle, or this document.

Do not mint a second project “for staging.” Local and Railway share `mayxuwlygchatgeqyhyt`. Stripe sandbox is a Stripe concept; there is no Supabase sandbox in this repo.

---

## 3. What is installed (and what is not)

### Installed

A HubSpot **subset**: contacts, companies, deals, one pipeline, notes/tasks, audit. Fixed typed columns plus one `properties` jsonb escape hatch. Plain FKs (`deals.contact_id`, `activities.deal_id`). No association type ids.

| Surface | Who | How |
|---|---|---|
| `/admin/login` | Staff | Magic link + 6-digit OTP. No password. |
| `/admin/quotes` | Staff | Quotes board. One column per stage. Overdue / unscheduled flags. |
| `/admin/deals/:id` | Staff | Contact panel, stage, amount, next action, timeline, close won/lost. |
| `/admin/contacts` | Staff | CRM contacts + `leads.json` form history. Manual contact/deal. |
| `/api/crm/*` | Staff | `crmLimiter` (60/min) then `requireStaff` then service role. |
| Contact form | System | Save JSON first, then `recordLeadInCrm` in its own try/catch. |
| Stripe webhook | System | `closeDealsOnPurchase` in its own try/catch. |

### Not installed

- Dynamic property definitions, custom objects, workflows, sequences, tickets, quote line-items, a CMS.
- CRM as a mailbox. No Resend, no Klaviyo write, no “send from deal.”
- Browser PostgREST. `from("crm_contacts")` in client code is forbidden.
- Local `supabase start`, `DATABASE_URL`, `pg` / `postgres.js`.
- RLS **policies**. Policies would *open* rows. Isolation is Express `requireStaff` plus a `where`.
- A Klaviyo replica CDP. That spec is [KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md). Do not follow it to install this shop.

---

## 4. File map

### Schema

| File | Job |
|---|---|
| `supabase/migrations/0001_crm.sql` | Pipelines, stages, companies, contacts, deals, activities, audit, Quotes seed, RLS on, zero policies |
| `supabase/migrations/0003_crm_fk_indexes.sql` | `crm_deals(pipeline_id)`, `crm_deals(company_id)` |
| `supabase/migrations/0004_lock_browser_grants.sql` | FORCE RLS + revoke `anon` / `authenticated` / `public` (CRM **and** account tables) |
| `supabase/migrations/0005_catalog_skus.sql` | Contractor SKU mirror. No wholesale cost |

`0002_customer_accounts.sql` is shopper login, not the pipeline. Accounts share the project and the service-role client. `CRM_DISABLE` does not turn them off.

### Server coding

| File | Job |
|---|---|
| `server/db.ts` | Service-role client. `isCrmEnabled`, `getDb`, `crmHealth`, `logCrmBoot`, `crmDisabledReason` |
| `server/auth.ts` | `requireStaff`. `auth.getUser(token)`, never a local JWT decode. `STAFF_EMAILS` |
| `server/crm/schema.ts` | Stages, Zod, `INTENT_TO_STAGE`, `SYSTEM_ACTOR`, row types, `CrmResult` |
| `server/crm/intake.ts` | Quote → deal. Support → note. Reminder → nothing. Pay → won |
| `server/crm/contacts.ts` | Email upsert, fill-blanks, unique-index race (`23505`) |
| `server/crm/deals.ts` | Create / list / patch / close-on-pay. `lead_id` idempotency |
| `server/crm/activities.ts` | Notes, tasks, stage_change, system |
| `server/crm/audit.ts` | Best-effort `crm_audit_log` insert |
| `server/crm/routes.ts` | `/api/crm/*` behind `crmLimiter` + `requireStaff` |
| `server/contact.ts` | `appendLead` then fail-soft `recordLeadInCrm` |
| `server/stripe.ts` | After pay: fail-soft `closeDealsOnPurchase` |
| `server/index.ts` | `app.use("/api/crm", crmRouter())`; `logCrmBoot()` on listen |
| `server/security.ts` | `crmLimiter` 60 / minute, code `rate_limited_crm` |
| `server/admin/data.ts` | Overview pipeline snapshot, contact list, audit |
| `shared/email-channels.ts` | `CRM_SENDS_MAIL = false` |

### Staff UI

| File | Job |
|---|---|
| `client/src/lib/admin-api.ts` | Auth-only Supabase client. `crmFetch` / `authedFetch`. Deal helpers |
| `client/src/pages/admin/Board.tsx` | `/admin/quotes` Kanban |
| `client/src/pages/admin/DealDetail.tsx` | `/admin/deals/:id`. `mailto:` only — no mailer |
| `client/src/pages/admin/Contacts.tsx` | Contacts + leads.json + manual create |
| `client/src/pages/admin/Overview.tsx` | Open / overdue / unscheduled counts |
| `client/src/pages/admin/Login.tsx` | Staff OTP |
| `client/src/pages/admin/AdminShell.tsx` | Session gate (convenience). Real auth is the API |
| `client/src/pages/admin/nav.ts` | Quotes href `/admin/quotes`; deal URLs count as Quotes |
| `client/src/App.tsx` | `/admin/login` and `/admin/deals/:id` **above** `/admin` |

### Install + verify

| File | Job |
|---|---|
| `scripts/setup-crm.ts` | Fetch service_role + anon via Management API; PATCH Auth redirects |
| `scripts/verify-crm.ts` | Kill switch, stages, reminder rule, staff gate, no-mailer import |
| `scripts/verify-supabase.ts` | Live tables, RLS, quote → New → Won probe |
| `scripts/lib/catalog-sync.ts` | `syncSupabaseCatalog()` |
| `.env.example` | Variable names (never real secrets) |

---

## 5. Environment variables

From `.env.example`. Values are never committed.

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | Server | `https://mayxuwlygchatgeqyhyt.supabase.co`. `pnpm verify:env` pins this host. |
| `VITE_SUPABASE_URL` | Vite build | Same URL. Baked at `pnpm build`. Changing Railway’s `VITE_` without a rebuild does nothing. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | JWT `eyJ…` with role `service_role`. Bypasses RLS. **Never** `VITE_`. |
| `SUPABASE_ANON_KEY` | Server | JWT used by `auth.getUser` in `server/auth.ts`. |
| `VITE_SUPABASE_ANON_KEY` | Vite build | Browser Auth only. Publishable or legacy JWT. |
| `STAFF_EMAILS` | Server | Comma-separated. Must include `info@filterhero.net`. A valid token is not enough. |
| `CRM_DISABLE=1` | Optional | Turns the pipeline off. Quotes still save to `leads.json`. Does **not** turn accounts off. |
| `SUPABASE_ACCESS_TOKEN` | Setup scripts | From `npx supabase login`. Lets `setup:crm` write keys without printing them. |

A missing URL, a missing service role, or a key that still contains `...` (the `.env.example` placeholder) is unconfigured. The shop keeps selling. Boot log is loud:

```
[crm] off — SUPABASE_SERVICE_ROLE_KEY is empty. Quotes still save to leads.json.
```

When the key is present:

```
[crm] on — staff console at /admin
```

`getDb()` returns the memoized service-role client only when CRM is on. `getAccountDb()` returns the **same** object when accounts are on. Two kill switches, one socket. `resetDbClient()` exists so tests can flip env without restarting Node.

---

## 6. Install from zero (this project’s order)

Do these steps in this order. Skipping RLS and jumping to a browser `from("crm_contacts")` is how you reopen FH-188 / FH-205.

### 6.1 Use the existing project (do not mint a second)

Dashboard: [filter-hero](https://supabase.com/dashboard/project/mayxuwlygchatgeqyhyt).

### 6.2 Copy keys into `.env`

From Settings → API:

1. Project URL → `SUPABASE_URL` **and** `VITE_SUPABASE_URL` (same string).
2. `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` only.
3. `anon` / publishable → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`.
4. `STAFF_EMAILS=info@filterhero.net`.

Or, if you have a Management API token:

```bash
npx supabase login
# Windows PowerShell:
# $env:SUPABASE_ACCESS_TOKEN = (Get-Content "$env:APPDATA\supabase\access-token")
pnpm setup:crm
```

`setup:crm` writes the service role and anon key into `.env` without printing them, then PATCHes Auth config (Site URL `https://filterhero.net` plus the redirect allowlist). If the token is missing it prints the dashboard URL to copy from. Exit 1 if CRM is still unreachable.

### 6.3 Auth URL configuration (staff magic links)

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

Staff magic links **land on `/login`**, then hop to `/admin` via `sessionStorage` key `fh-staff-after-auth` only for the same inbox. `/admin` as `emailRedirectTo` is how production OTP fell through to localhost.

### 6.4 Push migrations

```bash
npx supabase link --project-ref mayxuwlygchatgeqyhyt
npx supabase db push
```

Order is the filename order. `0001` seeds Quotes. `0003` indexes FKs. `0004` FORCE RLS + revoke. `0005` creates `catalog_skus` empty — fill it with `pnpm sync:catalog`.

Do not `CREATE POLICY` after this. Do not `GRANT SELECT ON crm_contacts TO anon`. `pnpm verify:supabase` inserts with the anon key and asserts that insert **fails**.

### 6.5 Sync the contractor catalog (CRM mirror)

```bash
pnpm sync:catalog
```

That upserts Stripe Products, Klaviyo custom-catalog items, **and** 293 rows into `catalog_skus`. Quote deals still store `filter_size` as text on `properties`. The table is the SKU list staff SQL and saved-filter joins use. Admin Catalog UI still reads `shared/sellable-skus.json`. Missing service role → `{ skipped: true }`, so Stripe/Klaviyo sync can still run.

Never put wholesale cost on this table (FH-223).

### 6.6 Mount in Express (already in this repo)

`server/index.ts` already does:

```ts
app.use("/api/crm", crmRouter());
```

Every CRM route then runs `crmLimiter` then `requireStaff`. On listen:

```ts
logCrmBoot();
```

Do not remount `/api/crm` without the limiter and the staff gate. Do not put CRM health on public `/api/health` — that ping stays `{ ok, brand }` so a prober cannot learn whether the customer list is online (FH-175 era hardening). Staff see health on `/api/crm/health` and `/api/admin`.

### 6.7 Railway

Same CRM variables as local, plus `STAFF_EMAILS`. Vite bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at **build** time. Service role is runtime — Express reads it on boot.

Do not copy a placeholder `...` key onto Railway. Do not put the service role in a `VITE_` Railway variable (FH-188, FH-191, FH-210). Do not `railway up` a dirty branch while GitHub autodeploy owns `main` (FH-304).

### 6.8 Prove it

```bash
pnpm verify:env
pnpm verify:supabase
pnpm verify:crm
pnpm verify:account
pnpm verify:security
```

Unsigned `GET /api/crm/health` is **401**. `/admin` is 200 HTML (SPA) and noindex. A quote with CRM on appears in `new` on `/admin/quotes`. A paid email closes that deal as won if a matching contact exists.

---

## 7. How the server actually talks to Postgres

Nothing in this repo opens port 5432. There is no `DATABASE_URL`. The CRM is reached through Supabase’s HTTPS Data API, which `supabase-js` wraps.

```ts
// server/db.ts
client = createClient(
  process.env.SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

`persistSession: false` because this is a Node process, not a browser. Health is `from("crm_stages").select("id", { count: "exact", head: true })` — expects 6.

Token verification is a **network call**:

```ts
// server/auth.ts
const { data, error } = await client.auth.getUser(token);
```

A local `jwt.decode` would accept a revoked session. Failures: 503 `auth_unavailable`, 401 `unauthenticated`, 403 `forbidden`. Unconfigured gate is 503 `auth_not_configured`, never open. The 403 body is identical for “bad token” and “not staff” so a prober cannot enumerate `STAFF_EMAILS`.

The only browser client (`client/src/lib/admin-api.ts`) is for `supabase.auth.*`. CRM reads go through `authedFetch("/api/crm", ...)`. The file header is the invariant:

> Supabase is used for authentication only. … The browser never queries Postgres.

CSP must allow Auth HTTPS + websocket or PKCE refresh dies:

```
connect-src 'self' https://*.supabase.co wss://*.supabase.co …
```

(`shared/security-headers.ts`.) Do not add `http://*.supabase.co` to production.

---

## 8. Schema — the Quotes pipeline

Apply with `supabase db push`. Do not invent a migration that adds `CREATE POLICY`.

### 8.1 Tables (`0001_crm.sql`)

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

### 8.2 `0003_crm_fk_indexes.sql`

Advisor flagged unindexed FKs:

```sql
create index if not exists crm_deals_pipeline_idx on crm_deals (pipeline_id);
create index if not exists crm_deals_company_idx on crm_deals (company_id);
```

`pipeline_id` is always `quotes` today. Keep the index anyway.

### 8.3 `0004_lock_browser_grants.sql` (FH-205)

The migration header comment says “FH-201”. The issue that shipped this file is **FH-205**. Do not treat the comment as the id.

For every CRM + account table:

1. `alter table … force row level security`
2. `revoke all on table … from anon, authenticated, public`

Then default privileges in `public` revoke tables/sequences/functions from those roles.

### 8.4 `0005_catalog_skus.sql` (FH-223)

293 contractor SKUs. `merv in (8, 11, 13)`. Columns include `stripe_product_id` and `klaviyo_external_id`. **No** `cost_dollars`. FORCE RLS + revoke, same as the others. Fill with `pnpm sync:catalog`. `verify:supabase` asserts count `=== 293`.

---

## 9. Coding — how a quote becomes a row

### 9.1 Channel law

```ts
// shared/email-channels.ts
export const CRM_SENDS_MAIL = false;
```

`EMAIL_OWNER.clock_cadence === "none"`. `pnpm verify:crm` asserts `CRM_SENDS_MAIL === false` and greps every file under `server/crm/` for `mailer`, `klaviyo`, `resend`, `sendEmail`, `sendLeadAlert`, `sendContactReceipt`, `sendOrderConfirmation`, `syncContactToKlaviyo`, `subscribeMarketingEmail`.

### 9.2 Intake is fail-soft (FH-124)

`server/contact.ts` saves the lead to `leads.json` first. Then, in its own try/catch:

```ts
const crm = await recordLeadInCrm(lead);
if (!crm.ok && !crm.skipped) {
  console.error("[contact] crm failed after save", crm.error);
}
```

A downed Supabase cannot fail the shopper’s submission. Honeypot filled → `{ ok: true, id: "ignored" }` and **no** Resend, CRM, or Klaviyo. Turnstile is required for quote/support when configured; `intent=reminder` skips it (FH-131 / FH-190). Contact limiter is 5 posts / 15 minutes.

Order after a real save: JSON → CRM → Klaviyo → Resend. Mail failure still returns `{ ok: true, id, emailed: false }`.

### 9.3 Intent map (FH-131)

```ts
export const INTENT_TO_STAGE = {
  quote: "new",
  support: null,   // contact + note, no deal
  reminder: null,  // skipped entirely
};
```

A Filter Clock cadence save is not a purchase signal. Creating a deal for it would put someone who asked for nothing into a sales pipeline. `reminder` returns `{ ok: true, skipped: true }` **before** `isCrmEnabled` even matters for writes — the function still short-circuits on intent after the disable check.

Quote path:

1. Split name. Names matching `/^filter clock/i` are not split into first/last.
2. `upsertContact` (lowercase email, fill-blanks).
3. `createDeal` in `new` with `next_action_at` = now + 1 day (`FIRST_TOUCH_DAYS`).
4. `lead_id` = the nanoid from `leads.json`.
5. `properties.filter_size` and `properties.cart_summary`.
6. Log a `system` arrival note **only if** `deal.data.created === true`.

Deal `source`:

| Condition | `source` |
|---|---|
| `cartSummary` set | `cart_quote` |
| no `filterSize` | `custom_quote` |
| otherwise | `quote_form` |
| staff `/admin/contacts` | `manual` |

Support: upsert contact, log a `note` with the message, no deal.

Disabled CRM: `{ ok: false, skipped: true, error: "crm_disabled" }` — contact.ts treats skip as non-fatal.

### 9.4 Contact upsert

`upsertContact` looks up by lowercased email.

- Existing row: only fill empty columns. A later form that omits a phone must not erase the one on file.
- Exception: `klaviyo_profile_id` and `stripe_customer_id` **overwrite**, because a newer id is more correct than a stale one.
- Insert race on unique email (`23505`) re-reads instead of failing.
- Every create/update writes `crm_audit_log` (`contact.create` / `contact.update`).

### 9.5 Deal create, list, patch, close

`createDeal` with a `leadId` first `findDealByLeadId`. Hit → `{ created: false }`. Miss → insert. Concurrent insert `23505` re-reads.

List: pipeline `quotes`, optional `stageId` / `open` (`closed_at is null`), `next_action_at` ascending **nulls last**, then `created_at` desc. A deal with no next action sinks. A deal with a past next action is red on the board; none is amber. That is the inbox-death failure mode the board exists to make visible (code comments on `Board.tsx` / `isUnscheduled`).

Patch (`updateDeal`):

- Moving into `won` or `lost` stamps `closed_at`, clears `next_action_at` (otherwise the board shows it overdue forever), clears `lost_reason` on won.
- Moving back out clears `closed_at` and lost reason.
- Stage change writes a `stage_change` activity.

`closeOpenDealsForContact` (Stripe pay): every open deal for that contact whose stage is not already `lost` becomes `won`. Amount is written only when the deal has none. Closing an already-closed deal is a no-op (Stripe retries). Called as:

```ts
await closeDealsOnPurchase({
  email: stored.customerEmail,
  amount: stored.amountTotal !== null ? stored.amountTotal / 100 : undefined,
  stripeCustomerId: stored.customerId ?? undefined,
});
```

Stripe amounts are cents; CRM `amount` is dollars.

### 9.6 Activities and audit

`logActivity`: tasks get `status: NOT_STARTED`; notes/system leave status null so the open-task index stays small.

`completeTask`: `eq type task` so you cannot complete a note by guessing a UUID.

`recordAudit`: failure logs and returns. Losing the record of a change is better than rolling back the change. Intake writes use `SYSTEM_ACTOR` `{ id: null, email: "system@filterhero" }`. Staff mutations use `req.staff`.

### 9.7 HTTP envelope

`/api/crm` uses `crmLimiter` (60 / minute, `rate_limited_crm`) then `requireStaff`. JSON `{ ok, data }` or `{ ok: false, error, code }`. Database failures are 502 with a **fixed** string (`The CRM could not complete that.`) — the detail stays in the server log. Zod failures go through `publicError`. Disabled CRM is 503 `crm_disabled`. Missing row is 404.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | enabled, reachable, stage count |
| GET | `/stages` | display order |
| GET | `/deals` | `stageId`, `open`, `limit` (max 200, default 200) |
| POST | `/deals` | create (staff; source defaults `manual`) |
| GET | `/deals/:id` | deal + contact + timeline |
| PATCH | `/deals/:id` | stage, amount, next action, owner, lost reason |
| POST | `/activities` | note or task |
| POST | `/activities/:id/complete` | mark task done |
| POST | `/contacts` | upsert by email |

There is no public GET of contacts. Overview/Contacts pages that list people go through `/api/admin` (same staff gate, service role).

---

## 10. Staff UI — how the board is wired

`AdminShell` hiding a page is convenience. Authorization is `requireStaff` on `/api/crm` and `/api/admin`. `/admin` is noindex in SSR **and** `robots.txt`.

Routes in `App.tsx` (order matters — FH-189):

1. `/admin/login`
2. `/admin/deals/:id`
3. `/admin/quotes` (board)
4. …other modules…
5. `/admin` (overview)

A prefix matcher that listed `/admin` first would swallow login and deal URLs.

Browser calls:

```ts
crmFetch("/stages")
crmFetch("/deals?limit=200")
crmFetch(`/deals/${id}`)
crmFetch(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
crmFetch("/activities", { method: "POST", body: JSON.stringify({ type: "note", dealId, body }) })
crmFetch("/contacts", { method: "POST", body })  // Contacts page
```

`authedFetch` attaches `Authorization: Bearer ${access_token}` from the PKCE session. No token → `ApiError` 401 before the request.

Board flags (`admin-api.ts`):

- `isOverdue`: open + `next_action_at` in the past.
- `isUnscheduled`: open + no `next_action_at`.

Deal page: stage `<select>`, amount, next action, Close won / Close lost (lost prompts a reason), activity timeline, contact `mailto:`. Copy on the aside: “Email the shopper from your own inbox. The CRM never sends mail.” `verify:crm` asserts `mailto:` exists and the page does not call `/api/contact`, `/api/klaviyo`, `sendEmail`, or `resend`.

Contacts page: CRM rows from `/api/admin` plus `leads.json` history (quote / support / reminder filter). Manual save can also `POST /api/crm/deals` with `source: "manual"`. Search is debounced (`useAdminLoad`) so Contacts cannot burn the 60/min limiter (FH-214).

Overview pipeline snapshot (`server/admin/data.ts`) reads up to 2000 deals for open / overdue / unscheduled / by-stage counts. Health card loads CRM, account, and Klaviyo in parallel so a Klaviyo outage cannot blank the page (FH-214).

---

## 11. Security that is part of this install

1. **Deny-by-default RLS + FORCE + revoke.** Do not `CREATE POLICY`. Do not `GRANT` CRM tables to `anon` or `authenticated`.
2. **Service role never in the bundle.** `VITE_` is public. FH-188 / FH-191 / FH-210.
3. **`getUser`, not decode.** Revoked sessions die.
4. **`STAFF_EMAILS` is a second factor.** Signup is open. A token only proves inbox control.
5. **Unconfigured gates fail closed** (503), never open.
6. **Staff 403 body is identical** for bad token and non-staff.
7. **Rate limits.** CRM 60/min. Contact 5 / 15 min.
8. **Public errors are codes.** No PostgREST text to the browser (FH-205).
9. **Turnstile** on quote/support. `reminder` skips it.
10. **Webhook and contact CRM writes are fail-soft.**
11. **CRM imports neither mailer nor Klaviyo.** Enforced by `verify:crm`.
12. **`/admin` is noindex.**
13. **Identify property allowlist** (checked in `verify:crm`) drops `next_change_date` from the browser so a quote form cannot enroll replenish (FH-131 / FH-175-era public API).

---

## 12. Scripts (copy these, do not invent new ones)

| Command | What it proves / does |
|---|---|
| `pnpm setup:crm` | Write service_role + anon when `SUPABASE_ACCESS_TOKEN` is set. Patch Auth redirects. Print dashboard URLs otherwise. Exit 1 if CRM still unreachable. |
| `pnpm verify:crm` | Kill switch, six stages, reminder no-deal, `lead_id` unique index in SQL, RLS-on-no-policies, `requireStaff` reject, unconfigured fail-closed, contact limiter, honeypot/Turnstile, identify allowlist, `/admin` noindex, **no mailer/Klaviyo import**. |
| `pnpm verify:supabase` | Live project. Six stages. Anon cannot read or write. Probe quote → New → Won, cleaned up. `catalog_skus === 293`. |
| `pnpm verify:account` | `CRM_DISABLE` does not kill accounts. |
| `pnpm verify:env` | URL pin, JWT prefixes, live ping. |
| `pnpm verify:security` | Migration 0004 present, CSP includes `*.supabase.co`. |
| `pnpm sync:catalog` | Stripe + Klaviyo + `catalog_skus`. |
| `pnpm smoke:admin` | Anon client cannot read staff tables. |

---

## 13. Replicating this install on another Filter Hero-class shop

Do these in this order. Skipping RLS recreates FH-188 / FH-205.

1. One hosted Supabase project. Pin the URL in `verify:env`.
2. Env: URL ×2, service role (server), anon ×2, `STAFF_EMAILS`. No `DATABASE_URL`. No `VITE_` on the service role.
3. Migrations `0001` + `0003` + `0004` (+ `0005` if you want the SKU mirror). RLS on, FORCE, zero policies, revoke.
4. `createClient` service role in Express with `persistSession: false`. Browser client is Auth-only, PKCE.
5. `requireStaff` calls `auth.getUser`. Unconfigured = 503.
6. Staff: OTP, magic link lands on `/login`, hop to `/admin`.
7. Auth allowlist: localhost + production `/login` `/account` `/admin` `/admin/login`. Site URL is the production origin.
8. Contact: save JSON first, then CRM. Reminder creates no deal.
9. Stripe pay: fail-soft close deals. Do not fail the webhook.
10. `leads.json` / `orders.json` remain append-only.
11. CRM never imports mailer or Klaviyo. `CRM_SENDS_MAIL = false`.
12. Board sorts by `next_action_at` nulls last. Closed stages clear next action.
13. `lead_id` intake is idempotent. Stripe pay close is idempotent.
14. Verify scripts that fail if anon can read a row, if stage count ≠ 6, or if `server/crm/` imports a sender.

---

## 14. Issues and fixes (complete CRM log)

Source of truth remains [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). This section is every item that taught this pipeline, newest first among CRM-shaped ids, with status. Chat is not the log.

### The install itself

**FH-188 — Supabase CRM and accounts were half-wired on this branch** (fixed 2026-09-07)  
Live `filter-hero` already had tables, RLS, and keys. This branch only had `0002_customer_accounts.sql`. `/admin` 404ed, `/api/crm` was missing, quotes never opened a deal, paid webhooks never attached SKUs. Do **not** ship login without the CRM schema, staff routes, and webhook attach. Do not put the service role in a `VITE_` var. Do not add RLS policies that let the browser query Postgres. Do: deny-by-default RLS, Express service role, `/login` + `/api/account`, `/admin` + `/api/crm` behind `STAFF_EMAILS`, Auth redirects for localhost and `filterhero.net`. Verify: `pnpm verify:supabase`, `verify:account`, `verify:crm`.

**FH-192 — Do not import `closeDealsOnPurchase` twice** (fixed 2026-09-07)  
A mid-merge `App.tsx` also declared `AdminBoard` twice. Stripe must import `closeDealsOnPurchase` once. Verify: `pnpm check`.

**FH-189 — `pnpm check` failed and Vite env was incomplete** (fixed 2026-09-07)  
Smoke skipped `/login`, `/account`, `/admin`. Do not list `/admin` after `/admin/login` in a prefix matcher — more specific routes must win. Do not put service-role keys in `VITE_` vars.

**FH-191 — Local `.env` had no live verifier** (fixed 2026-09-07)  
Keys (including Supabase) lived in `.env` with nothing asserting formats. Do not print secrets. Do not put service-role in `VITE_`. Do: `pnpm verify:env`. URL pinned to `mayxuwlygchatgeqyhyt`.

**FH-171 — Sign-in vanished after switching to family-section-blue** (fixed 2026-09-06)  
`/login` 404ed. Adjacent to CRM because staff and shoppers share one Auth project. Do: email + password on `/login`. Staff still need `STAFF_EMAILS`. A third mailbox from the CRM still re-opens this id’s mailer cousin (see FH-202).

### RLS, grants, and the public API

**FH-205 — Public API had no headers, leaked parser text, and left browser grants on Postgres** (fixed 2026-09-07)  
Anon/authenticated still had table grants; RLS was the only gate. `/login?next=/account/../admin` could leave the site. Do **not** `CREATE POLICY` on CRM/account tables. Do not `GRANT` those tables to `anon` / `authenticated`. Do: migration `0004_lock_browser_grants.sql` FORCE RLS + revoke. `safeNextPath` rejects `..`, `/admin`, `/api`, `/login`. Express CSP includes `https://*.supabase.co`. Verify: `pnpm verify:security`, `verify:supabase`, `verify:crm`.

**FH-190 — Quote intake had no bot gate, and CRM routes imported a missing security module** (fixed 2026-09-07)  
`server/crm/routes.ts` and `pnpm verify:crm` imported `crmLimiter` / `publicError` from `server/security.ts`, which did not exist. `/api/contact` had no rate limit or honeypot. Do **not** require Turnstile on `intent=reminder`. Do not let the CRM send mail. Do not skip `requireStaff` on `/api/crm`. Do: `server/security.ts` as the public-API gate. Contact 5 / 15 min. Paid checkout still closes CRM deals fail-soft. Verify: `GET /api/crm/health` is 401 without a staff session.

### Auth redirects and staff login

**FH-208 — Production staff magic links could not land on /admin** (fixed 2026-09-11)  
Auth allowed `https://filterhero.net/login` and `/account`, not `/admin`. Staff OTP used `emailRedirectTo` `/admin`, so the production magic link fell back to Site URL `http://localhost:3000`. Do **not** point staff `emailRedirectTo` at `/admin` until that exact URL is on the allowlist **and** Site URL is `https://filterhero.net`. Do: staff magic links land on `/login`. `sessionStorage` stores the staff email; after PKCE, only that email goes to `/admin`.

**FH-215 — Toasts never mounted; staff OTP hidden until a second send** (fixed 2026-09-16)  
Staff login hid the 6-digit field until “Send link” ran. Do: `/admin` has “I already have a code”. Verify: `pnpm verify:admin`.

### Catalog in Postgres (CRM mirror)

**FH-223 — Stripe, Klaviyo, CRM, and accounts still had the old catalog** (fixed 2026-09-16)  
FH-217 restricted the shop to 293 contractor SKUs, but Supabase had no SKU table and `/account` would pin off-sheet sizes. Do **not** skip `pnpm sync:catalog` after a sheet rebuild. Do not put wholesale cost on `catalog_skus`. Do: `0005_catalog_skus.sql` + `syncSupabaseCatalog()`. Saved filters must be in-stock sheet SKUs. Verify: `pnpm verify:supabase` count 293.

Related (not a CRM code bug, still breaks the mirror): **FH-303** Railway `FULL_CATALOG=true` would sell the archive on next rebuild — open. **FH-217** shop = contractor list.

### Staff console on top of the pipeline

**FH-213 — Staff console was quotes-only** (fixed 2026-09-16)  
`/admin` was a quotes Kanban. Do **not** let the browser query Postgres. Do not send mail or write Klaviyo from `server/admin/` or `server/crm/`. Do not store Stripe/Resend secrets in `site-config.json`. Do not make `/admin` indexable. Do: modules behind `requireStaff` at `/api/admin/*`. Quotes stay `/admin/quotes`. `STAFF_EMAILS` remains the allowlist.

**FH-214 — Admin console bugs after the first landing** (fixed 2026-09-16)  
Contacts search fired two API calls per keystroke and could 429 (`rate_limited_crm` / admin limiter). A Klaviyo health outage blanked the whole systems card. Do: debounce + stale-response guard. Health loads CRM/account/Klaviyo in parallel and keeps the page up if Klaviyo throws.

### Production had the schema locally and not on the origin

**FH-210 — Production still ran an older main build** (fixed 2026-09-11)  
Local had CRM, accounts, Klaviyo, Turnstile, security headers. `filterhero.net` was Railway `main` without them. Do **not** `railway up` this branch while `main` is behind. Do not put service-role keys in `VITE_` vars. Do: merge the shop/CRM/Klaviyo/security stack to `main`. Verify: live `/login` and `/admin` 200. CRM and account 401 when signed out.

**FH-187** (fixed 2026-09-07) is the same class of deploy drift for photos. A `railway up` of a dirty branch still threatens to ship or roll back CRM with it (see open FH-304).

### Intake rules the CRM must keep

**FH-131 — Filter Clock must not send replacement emails before a purchase** (mitigated 2026-09-01)  
Clock is a calculator. `INTENT_TO_STAGE.reminder` is absent on purpose. CRM must not open a deal. Klaviyo must not subscribe. Resend must not send a shopper receipt. Replenish starts on Placed Order. `verify:crm` asserts reminder intake stops before any write.

**FH-124 — Contact email failure returned 400 after the lead was saved** (mitigated 2026-08-31)  
Save-first, fail-soft. CRM intake follows the same shape: JSON is written, then Postgres, then Klaviyo, then Resend. Later failures log; the shopper still gets `{ ok: true, id }`.

**FH-247** — Turnstile on quote/support, not on every homepage view, not on clock reminder.

**FH-291** — `verify:resend` quote QA must disable Turnstile (or CRM/Klaviyo) the same way; a local `TURNSTILE_SECRET_KEY` is not a CRM failure.

### JSON vs Postgres (why both exist)

**FH-122 — Production leads and orders wrote into `dist/data`** (mitigated 2026-08-31)  
Bundled `__dirname/data` is wiped on redeploy. Postgres does not replace these files. Do: `DATA_DIR` or `<cwd>/server/data`.

**FH-123 — Stripe webhook wrote duplicate orders on retry** (mitigated 2026-08-31)  
Idempotent `orders.json` on `sessionId`. CRM `lead_id` unique index is the same idea on the quote side. Closing an already-won deal is a no-op.

**FH-203 — Stripe Dashboard had no fulfillment webhook** (fixed 2026-09-07)  
Paid sessions never wrote orders, so CRM close and account attach never ran. Fix is the Stripe webhook at `https://filterhero.net/api/stripe/webhook`, not a Postgres trigger.

### Mailer boundary (CRM must not cross it)

**FH-202** — Production From is `Filter Hero <info@filterhero.net>`. CRM still never sends. A third From on `filterhero.net` splits sending reputation.

**FH-171 (mailer reading)** — `CRM_SENDS_MAIL = false`. `verify:crm` blocks mailer imports under `server/crm/`.

### Open items that can still break this install

**FH-304 — GitHub autodeploy and `railway up` both own FILTER-HERO** (open 2026-09-20)  
A dirty `railway up` can ship or roll back the CRM stack. Pin `source.branch=main`. Do not `railway up` this branch while GitHub watches the repo.

**FH-306 — Railway has no HTTP healthcheck** (open 2026-09-20)  
`/api/health` exists. Railway does not wait for Express. A deploy marked SUCCESS before boot means `logCrmBoot()` has not run yet.

**FH-303 — Railway `FULL_CATALOG=true`** (open 2026-09-20)  
Next rebuild would sell the archive. `catalog_skus` and the JSON sheet would diverge from the live storefront until vars are `false`.

**FH-305** is Stripe keys on Railway, not Supabase. Local `.env` pointing at live Supabase + sandbox Stripe is the intended split. CRM close still runs on whatever account the shop webhook receives.

---

## 15. Invariants (read these before changing a line)

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
13. Emails are stored lowercase. Unique indexes assume that.
14. `lead_id` intake is idempotent. Stripe pay close is idempotent.
15. `next_action_at` is the load-bearing board column. Closed stages clear it.
16. `catalog_skus` has no wholesale cost. Count is 293 contractor SKUs.
17. Quote → `new`. Support → note, no deal. Pay → `won`.
18. `pnpm verify:crm` is the proof, not a dashboard screenshot.

---

## 16. Quick reference — dashboard clicks

| Need | Where |
|---|---|
| Rotate service role | Settings → API → `service_role` → reset. Put the new value on local `.env` **and** Railway. Restart Express. Rebuild not required. |
| Rotate anon / publishable | Same page. Update `SUPABASE_ANON_KEY` + `VITE_SUPABASE_ANON_KEY`. **Rebuild** the SPA (Vite bake). |
| Redirect URLs | Authentication → URL configuration. Or `pnpm setup:crm` / `pnpm setup:auth-redirects`. |
| Confirm Site URL is production | Same page. Must be `https://filterhero.net`. |
| Users | Authentication → Users. Staff are ordinary users on `STAFF_EMAILS`. |
| Table editor | Table Editor → `public`. You will see rows because you are the dashboard role. The anon key still sees none. |
| SQL | SQL Editor. Prefer a new migration file in `supabase/migrations/` over a one-off that production will forget. |
| Quotes board | `https://filterhero.net/admin/quotes` after staff OTP. |
| Kill switch | Railway / `.env` `CRM_DISABLE=1`. Quotes still save to `leads.json`. |

---

## 17. Related installs

| File | Owns |
|---|---|
| [CRM.md](./CRM.md) | Short staff-ops sheet |
| [SUPABASE-AND-POSTGRES-FULL-BUILD.md](./SUPABASE-AND-POSTGRES-FULL-BUILD.md) | Auth, accounts, RLS, hosted project |
| [CUSTOMER-ACCOUNTS.md](./CUSTOMER-ACCOUNTS.md) | Shopper `/login` |
| [EXPRESS+ FULL BUILD.md](./EXPRESS+%20FULL%20BUILD.md) | Middleware order, `/api/crm` mount |
| [RESEND-FULL-BUILD.md](./RESEND-FULL-BUILD.md) | Why CRM never mails |
| [KLAVIYO-FULL-BUILD.md](./KLAVIYO-FULL-BUILD.md) | Why CRM never writes Klaviyo |
| [STRIPE-FULL-BUILD.md](./STRIPE-FULL-BUILD.md) | Webhook that closes deals |
| [books, seo and catalog FULL BUILD.md](./books,%20seo%20and%20catalog%20FULL%20BUILD.md) | `catalog_skus` sync |
| [RAILWAY-FULL-BUILD.md](./RAILWAY-FULL-BUILD.md) | Host env for the service role |
| [UI FULL BUILD.md](./UI%20FULL%20BUILD.md) | `/admin` SPA |
| [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md) | Canonical `FH-XXX` log |
| `shared/email-channels.ts` | `CRM_SENDS_MAIL = false` |

That is how the CRM is installed in this project. Anything else is a new ticket, and it gets the next `FH-XXX`.
