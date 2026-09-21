# CRM

A staff tool for quote follow-up. One pipeline, six stages, backed by Supabase Postgres.

## The rule that matters most

**The CRM never emails a shopper, and never writes Klaviyo.**

Resend owns transactional mail, Klaviyo owns marketing, the CRM owns the staff
pipeline, and those boundaries are enforced by
[`shared/email-channels.ts`](../shared/email-channels.ts). A third sender on
`filterhero.net` would need its own subdomain, DKIM, and warmup, splitting the
sending reputation that order confirmations depend on — and double-sending is
already a logged failure (FH-171). `pnpm verify:crm` asserts that nothing under
`server/crm/` imports the mailer or Klaviyo. Staff email shoppers from their
own inbox. The CRM records that it happened.

## What this is, and what it is not

Taken from HubSpot's object model: contacts, companies, deals, pipelines and
stages, engagements (notes and tasks), owners.

Deliberately left out:

- **Dynamic property definitions.** Fixed typed columns plus one `properties`
  jsonb escape hatch.
- **A generic association graph.** Plain foreign keys: `deals.contact_id`,
  `activities.deal_id`. No association type ids, no labels.
- **Custom objects, workflows, sequences, forms, CMS, tickets, quote and
  line-item objects.** Stripe owns money, Klaviyo owns marketing, Postgres owns
  SQL.

`leads.json` and `orders.json` remain the append-only record. Postgres is the
queryable layer on top, not a replacement.

## Pipeline

One pipeline, `quotes`, with six stages:

`new` → `needs_info` → `priced` → `waiting` → `won` (closed won) / `lost` (closed lost)

The load-bearing column is `next_action_at`. A deal with a next action in the
past shows red on the board; a deal with none shows amber. Quotes died in an
inbox because nothing tracked whose turn it was (FH-176), so the board's job is
to make that visible rather than to look like a Kanban.

Moving into `won` or `lost` stamps `closed_at` and clears `next_action_at`.
Moving back out clears both `closed_at` and any lost reason.

## Intake

[`server/contact.ts`](../server/contact.ts) keeps its save-first, fail-soft
shape. After `appendLead`, `recordLeadInCrm` runs in its own try/catch — a CRM
outage can never fail a shopper's submission.

| Intent | Result |
| --- | --- |
| `quote` | Upsert contact, open a deal in `new`, next action one day out, log a `system` activity |
| `support` | Upsert contact and attach a note. No deal — there is nothing to sell |
| `reminder` | Nothing at all |

`reminder` is the FH-131 rule seen from the pipeline side. Checking the Filter
Clock is not a purchase signal, so a cadence save must not put someone who asked
for nothing into a sales pipeline.

Intake is idempotent on `lead_id` via a partial unique index on `crm_deals`, so
a double submit or a retried request reuses the original deal and does not log
the arrival note twice.

On `checkout.session.completed`, [`server/stripe.ts`](../server/stripe.ts)
closes every open deal for that email as won. Paying is the only close signal
that counts. Stripe retries webhooks, so closing an already-closed deal is a
no-op.

## Security

The CRM is the reason the public API got hardened first (FH-175). A customer
list is worth stealing in a way that a static catalog is not.

- **RLS deny-by-default.** Every `crm_*` table has row level security enabled
  and zero policies. `0004_lock_browser_grants.sql` also FORCE RLS and revokes
  `anon` / `authenticated` grants. The browser never queries Postgres; the
  Express server holds `SUPABASE_SERVICE_ROLE_KEY` and is the only caller.
- **`requireStaff`** ([`server/auth.ts`](../server/auth.ts)) verifies the token
  against Supabase — not a local decode, which would accept a revoked session —
  and checks the email against `STAFF_EMAILS`. A valid token only proves the
  holder controls some inbox. An unconfigured gate returns 503, never open.
- **Magic-link login.** No passwords to leak or rotate.
- **Audit log.** Every mutation writes to `crm_audit_log` with the actor, the
  before, and the after. Intake writes are attributed to the system actor.
- **`/admin` is noindex** in [`shared/seo.ts`](../shared/seo.ts) and disallowed
  in `robots.txt`.

## Environment

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=      # server only, NEVER prefixed with VITE_
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=         # browser, login only
STAFF_EMAILS=info@filterhero.net
CRM_DISABLE=1                   # optional kill switch
```

`CRM_DISABLE=1`, or a missing URL or service role key, turns the CRM off. Intake
then skips silently and the rest of the site is unaffected.

## Schema

[`supabase/migrations/0001_crm.sql`](../supabase/migrations/0001_crm.sql) creates
`crm_pipelines`, `crm_stages`, `crm_companies`, `crm_contacts`, `crm_deals`,
`crm_activities`, and `crm_audit_log`, then seeds the Quotes pipeline.

Applying it to a new project:

```
supabase link --project-ref <ref>
supabase db push
```

## API

All routes are under `/api/crm`, all behind `requireStaff` and a rate limit.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/stages` | Pipeline stages in display order |
| GET | `/deals` | Deals, filterable by `stageId` and `open` |
| POST | `/deals` | Create a deal |
| GET | `/deals/:id` | Deal, contact, and activity timeline |
| PATCH | `/deals/:id` | Stage, amount, next action, owner, lost reason |
| POST | `/activities` | Add a note or task |
| POST | `/activities/:id/complete` | Mark a task done |
| POST | `/contacts` | Upsert a contact by email |
| GET | `/health` | Enabled, reachable, stage count |

## Admin UI

- `/admin/login` — magic link
- `/admin` — the Quotes board, one column per stage, overdue flagged
- `/admin/deals/:id` — contact panel, stage control, amount, next action,
  activity timeline, close won/lost

Built from the existing Radix and Tailwind components. No new UI kit.

## Verify

```
pnpm setup:crm
pnpm verify:crm
```

`pnpm setup:crm` writes `SUPABASE_SERVICE_ROLE_KEY` when `SUPABASE_ACCESS_TOKEN`
is set (`npx supabase login`), and otherwise prints the dashboard URL to copy
the key from. The CRM stays off until that key is in `.env`.

Covers the disable flag, the six stages, lead intent to stage mapping, the
reminder no-deal rule, `lead_id` idempotency, RLS being on with no policies,
`requireStaff` rejecting missing and forged tokens, the unconfigured gate
failing closed, the contact rate limit tripping at five, honeypot and Turnstile
behaviour, the identify property allowlist dropping `next_change_date`, error
messages not leaking, `/admin` being noindex, and the CRM never importing the
mailer or Klaviyo.
