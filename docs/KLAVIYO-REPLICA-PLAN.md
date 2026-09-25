# Filter Hero — Klaviyo replica plan

**Status:** spec  
**Scope:** single-store CDP + send engine for Filter Hero  
**Not in scope:** a multi-tenant Klaviyo competitor  
**Last updated:** 2026-09-01

Build a Filter Hero CDP, not a Klaviyo clone. Same primitives (profiles, events, segments, flows, catalog, send, attribution). Different surface: five hardcoded journeys, Stripe instead of Shopify, **purchase-triggered replenish** (Filter Clock only computes the interval), Supabase as the system of record, Airtable as the operator console.

No SMS, no visual builder, no 350 integrations.

**Invariant (FH-131):** Replenish / Filter Clock emails send only after `Placed Order`. Checking the clock, saving a house profile, or typing an email on the clock **must not** enroll a send. The clock is a calculator (and optional calendar). The order is the trigger.

Existing inputs this plan promotes:

- `server/data/leads.json` via `server/contact.ts`
- `server/data/orders.json` via `server/stripe.ts`
- Filter Clock cadence (`client/src/lib/filter-cadence.ts`, `FilterPower.tsx`)
- Resend (already used for lead alerts)
- Stripe Checkout
- Catalog in `shared/products.ts`

---

## 1. What “Klaviyo for this project” means

| Klaviyo feature | Needed? | Implementation |
|---|---|---|
| Profiles + custom properties | Yes | Supabase `profiles.properties` jsonb |
| Events + metrics | Yes | Supabase `events` (append-only) |
| Identity (anon → email) | Yes | `identities` + `fh_aid` cookie |
| Catalog | Yes | Sync from `getProductById` + pgvector |
| Lists | Yes | Two lists: `reminders`, `marketing` |
| Segments | Yes | 8 SQL segments, materialized hourly |
| Flows | Yes | 5 hardcoded graphs, `pg_cron` + Edge Function |
| Campaigns (blast to a segment) | Yes | Airtable “Send” row → queue |
| Templates + personalization | Yes | Repo HTML + Airtable copy overrides |
| Forms | Already have | Filter Clock + ContactForm, write events |
| Consent + suppression | Yes | `consent` + `suppressions` |
| Email send / opens / clicks | Yes | Resend + click redirect + webhooks |
| Revenue attribution | Yes | Last-click, 5-day window |
| Product recommendations | Yes | pgvector on catalog + house profiles |
| Sign-up popups SDK | No | Existing on-page forms |
| SMS / WhatsApp / push | No | Later |
| Visual flow canvas | No | Code |
| Predictive CLV / churn | No | Optional later |
| Reviews / ads / K:AI agents | No | Out of scope |
| Multi-tenant / Shopify app | No | Single store, Stripe |

---

## 2. System map

```
Shopper (Vite)
  JS tracker ──POST──► Express (server/index.ts)
  Filter Clock / Contact / Cart
  Stripe Checkout ──webhook──► Express ──service_role──► Supabase

Supabase (system of record)
  Postgres     profiles, identities, consent, events, carts,
               lists, segments, journeys, messages, suppressions,
               catalog, templates
  pgvector     catalog.embedding, house_profile.embedding
  pgmq         send_jobs, embed_jobs, airtable_sync
  pg_cron      journey tick (1 min), replenish scan (daily),
               segment refresh (hourly), embeddings, Airtable pull
  Edge Fns     journeys, send, embed, resend-webhook, airtable-sync
  Vault        RESEND_API_KEY, AIRTABLE_TOKEN, SITE_URL

Airtable (operator UI — not the CDP)
  Quotes       human follow-up (quote / support / wholesale)
  Campaigns    draft → scheduled → sent
  Copy         subject / preheader / body blocks
  Pulse        segment counts, last 20 sends (no event firehose)

Resend
  transactional:  current CONTACT / order path
  marketing:      reminders@ (separate From, after DNS auth)
```

**Hard rule:** events, consent, and journey state never live in Airtable. Airtable can create a campaign and display a quote. Supabase decides who is sendable and records every send.

**Hard rule:** the browser never talks to Supabase with a service key. Express and Edge Functions use `service_role`. Shoppers are not Auth users. RLS on `public` stays locked (no anon policies on PII tables).

---

## 3. Where each tool is allowed

### 3.1 Supabase Postgres — source of truth

All Klaviyo objects. Express already owns `/api/contact`, `/api/checkout`, `/api/stripe/webhook`. Those handlers stop writing only to `server/data/*.json` and start upserting here. Keep JSON as a one-week shadow log during cutover.

### 3.2 Supabase pgvector — only two jobs

Klaviyo’s “product block” and “people like you,” not a second segment engine.

1. **Catalog embeddings.** One row per sellable SKU. Input text like `20x25x1 MERV 13 pleated HVAC filter, allergy, in stock`. Used in replenish / abandon emails: “same size, one MERV up” and “year pack.”
2. **House-profile embeddings.** Built from Filter Clock `CadenceInput` + `houseType`. Used as: “homes like The Pack House usually buy a 6-pack of MERV 11.”

Do **not** embed every `Active on Site` event. Segments stay SQL (`preferred_merv`, `next_change_date`, `last_order_at`).

Use `halfvec(1536)` + HNSW cosine, and the automatic-embedding pattern (trigger → `pgmq` → Edge Function). See [Supabase automatic embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings).

Use the **same embedding model** for every row.

### 3.3 Airtable — human ops

| Base / table | Purpose | Sync |
|---|---|---|
| **Quotes** | New `Requested Quote` / `Support` | Supabase → Airtable on insert |
| **Campaigns** | Name, `segment_key`, `template_key`, Send at | Airtable → Supabase when Status = `queued` |
| **Copy** | Subject, preheader, CTA, body HTML per `template_key` | Airtable → Supabase hourly; repo templates are fallback |
| **Pulse** | Segment headcount, last send, bounce rate | Supabase → Airtable nightly |

Airtable is the admin UI. It is a bad event database.

---

## 4. Data model (Supabase)

Schema `public` for tables, schema `private` for `security definer` functions (journey tick, send). Enable `citext`, `pgcrypto`, `vector`, `pgmq`, `pg_cron`, `pg_net`.

```sql
profiles (
  id uuid pk,
  email citext unique,
  phone text,
  stripe_customer_id text unique,
  first_name text,
  properties jsonb default '{}',
  created_at, updated_at
)

identities (
  profile_id, kind in ('anon','email','phone','stripe'), value,
  unique(kind, value)
)

consent (
  profile_id, channel in ('email','sms'),
  status in ('subscribed','unsubscribed','never'),
  source,           -- filter-clock | checkout | contact-quote | campaign
  source_copy,
  occurred_at,
  unique(profile_id, channel)
)

events (
  id, profile_id, metric, unique_key, value numeric, properties jsonb, occurred_at
  unique(metric, unique_key)
)

carts (
  profile_id, stripe_session_id unique, items jsonb, value,
  checkout_url, status in ('open','converted','expired')
)

lists (key text pk)                    -- 'reminders', 'marketing'
list_members (list_key, profile_id, added_at, unique)

segments (key text pk, sql_key text, definition jsonb)
segment_members (segment_key, profile_id, computed_at, unique)

catalog_items (
  product_id int pk,                   -- same id as shared/products.ts
  size, merv, is_carbon, name, price, in_stock,
  embedding halfvec(1536)
)

house_profiles (
  profile_id pk,
  house_type, depth, pets, occupants, allergies, ...
  embedding halfvec(1536)
)

templates (key pk, subject, preheader, html, updated_from_airtable_at)
campaigns (
  id, airtable_record_id unique, segment_key, template_key,
  status, scheduled_at, started_at
)

journey_states (
  profile_id, flow_key, step_key,
  status in ('active','exited','completed'),
  wake_at, context jsonb,
  unique(profile_id, flow_key)
)

messages (
  profile_id, flow_key, step_key, campaign_id,
  template_key, provider_id, status,
  click_token unique,
  unique(profile_id, flow_key, step_key)  -- plus a period column for replenish cycles
)

suppressions (email citext pk, reason, created_at)
message_events (message_id, kind in ('open','click','unsubscribe'), url, occurred_at)
```

### 4.1 `profiles.properties` contract

Write these keys. Do not invent parallel columns.

```json
{
  "filter_sizes": ["20x25x1"],
  "preferred_merv": "13",
  "depth": 1,
  "change_interval_days": 90,
  "next_change_date": "2026-12-01",
  "house_type": "pet",
  "pack_qty": 4,
  "pets": "one",
  "allergies": true,
  "last_order_at": "2026-09-01T16:12:00Z",
  "last_order_value": 47.96,
  "last_order_sizes": ["20x25x1"],
  "winback_last_exited_at": null
}
```

Keys come from `CadenceInput` / `CadenceResult` in `client/src/lib/filter-cadence.ts`, and Stripe line items hydrated with `getProductById`.

### 4.2 Idempotency

Stripe already dedupes by `sessionId` in `orders.json`. Mirror that:

`events.unique_key = 'placed_order:' || session.id`

Webhook replay must not enroll post-purchase twice.

### 4.3 JSON import

- Each `leads.json` row → profile + `Requested Quote` / `Requested Support` / `Signed Up Reminder`. Reminder rows may lack structured cadence; backfill `next_change_date` only when parseable.
- Each `orders.json` row → profile + `Placed Order`. Parse `items` through `getProductById`.

---

## 5. Event dictionary (closed set)

Past-tense verb + noun. Money events are server-only.

| Metric | Writer | Idempotency key |
|---|---|---|
| `Active on Site` | JS | none |
| `Viewed Size` | `SizeDetail.tsx` | none |
| `Viewed Product` | PDP | none |
| `Selected MERV` | `setPreferredMerv` | none |
| `Added to Cart` | `CartContext.addItem` | none |
| `Checkout Started` | `POST /api/checkout` after email known | `checkout:{session.id}` |
| `Checkout Expired` | Stripe `checkout.session.expired` | `expired:{session.id}` |
| `Placed Order` | Stripe `checkout.session.completed` | `placed_order:{session.id}` |
| `Ordered Product` | same, one per line | `ordered:{session.id}:{productId}` |
| `Signed Up Reminder` | Filter Clock (structured) | `reminder:{email}:{next_change_date}` |
| `Requested Quote` | ContactForm | none |
| `Requested Support` | ContactForm | none |
| `Replacement Due` | daily replenish job | `due:{profile_id}:{date}` |
| `Unsubscribed` | `/unsubscribe` + Resend | none |
| `Clicked Email` | `/r/:click_token` | none |
| `Opened Email` | Resend webhook (weak) | none |

### 5.1 Identify

```http
POST /api/identify
{ "anonymous_id": "<cookie>", "email": "a@b.com", "phone?": "+1...", "properties?": {} }
```

Merge on email. Attach anon identity. Flush 14-day localStorage buffer.

Cookie: `fh_aid` (anonymous id), 1 year, first-party. Do not put email in the cookie.

### 5.2 `Signed Up Reminder` payload

Stop stuffing cadence into `message`. Post the Filter Clock result:

```ts
{
  next_change_date: result.nextIso,
  change_interval_days: result.days,
  house_type: result.house.id,
  recommended_merv: result.recommendedMerv,
  selected_merv: input.merv,
  depth: input.depth,
  pack_qty: result.packQty,
  pets: input.pets,
  occupants: input.occupants,
  allergies: input.allergies,
  smoking: input.smoking
}
```

On write, set `change_interval_days`, `preferred_merv`, `pack_qty`, `house_type`. You may store a *suggested* `next_change_date` from the clock for the house profile, but **do not enroll `replenish` and do not send mail**. The sendable `next_change_date` is set only on `Placed Order` (`paid_at + interval`).

### 5.3 Checkout gap

`CartDrawer` today posts `{ items }` with no email. Abandoned checkout is impossible until email is collected in the drawer and passed as Stripe `customer_email`. Persist `carts` + `checkout_url`. Fallback: `checkout.session.expired` only recovers people who typed an email on Stripe.

---

## 6. The eight segments

Materialize into `segment_members` hourly via `private.refresh_segments()`. Airtable Pulse shows counts.

| Key | Rule |
|---|---|
| `reminders_due_14d` | Has at least one `Placed Order`, `next_change_date` within 14 days, no order in 14d |
| `clock_never_bought` | Used Filter Clock (has house profile), never `Placed Order` — **do not email** from replenish. Campaigns only if marketing consent. |
| `buyers_merv8` | Last order MERV 8, not carbon |
| `buyers_merv13` | Has ordered MERV 13 |
| `viewed_merv13_bought_8` | Viewed/selected MERV 13, last buy was 8 |
| `abandoned_open` | `carts.status = open` older than 1h, not converted |
| `lapsed_120` | `last_order_at < now()-120d`, marketing subscribed, not in due-14d |
| `wholesale_quote` | `Requested Quote` + wholesale hint or property flag |

No free-form segment builder in v1. A ninth segment is a SQL file + a row in `segments`.

---

## 7. The five flows

Worker: `pg_cron` every minute → `net.http_post` → Edge Function `journeys` → `private.due_journeys()` → `pgmq.send('send_jobs')`.

Shared guards before every **marketing** send:

1. Profile has email
2. Consent matches the flow
3. Email not in `suppressions`
4. No marketing send in the last 18 hours
5. Unique `(profile, flow, step, period)`

Every marketing link: `https://filterhero.net/r/{click_token}?to=/filters/20x25x1`. Redirect writes `Clicked Email`, then 302s.

### A. Welcome — `welcome`

Trigger: first `list_members` insert on `marketing` (optional checkbox at quote or checkout). Filter Clock by itself does **not** enroll welcome or replenish.

| Step | Wait | Exit if | Send |
|---|---|---|---|
| `d0` | 0 | — | You’re on the list + size/MERV |
| `d1` | 1 day | `Placed Order` since enroll | How to read the size label |
| `d3` | 3 days | `Placed Order` since enroll | Suggested pack |

### B. Abandon — `abandon`

Trigger: `Checkout Started`. Exit on `Placed Order` / cart converted.

| Step | Wait | Send |
|---|---|---|
| `1h` | 1 hour | Cart contents + `checkout_url` |
| `24h` | 23 hours | Short reminder, same URL |

### C. Post-purchase — `post-purchase`

Trigger: `Placed Order` from `checkout.session.completed` in `server/stripe.ts`.

Also reset:

```
next_change_date = paidAt + change_interval_days
  or paidAt + BASE_DAYS[depth]
  or 90 days if depth unknown
```

Enroll/refresh `replenish`.

| Step | Wait | Channel | Send |
|---|---|---|---|
| `receipt` | 0 | transactional | Optional branded receipt (skip in v1 if Stripe email is enough) |
| `install` | 2 days | marketing | How to seat the filter |
| `review` | 10 days | marketing | Review ask |

Never trigger a flow on `Ordered Product`. Use it for segments only.

### D. Replenish — `replenish` (the product)

**Trigger: `Placed Order` only.** Checking the Filter Clock, submitting the clock email field, or creating a `Signed Up Reminder` / house-profile event must **not** enroll this flow and must **not** send mail.

On `Placed Order`:

```
interval = existing profiles.properties.change_interval_days
        (if this email already used the clock)
        or BASE_DAYS[purchased depth]
        or 90 days
next_change_date = paid_at + interval
```

Then enroll/refresh `replenish`. A later purchase resets the date from that order (they must not get a due email the week after they restocked).

Daily 13:00 UTC scan — only profiles with `journey_states.flow_key = replenish` (i.e. buyers).

| Step | When | Exit if | Send |
|---|---|---|---|
| `t-7d` | 7 days before | `Placed Order` in last 14 days | Size due + pack CTA + PDP link |
| `t-2d` | 2 days before | `Placed Order` since `t-7d` | Short nudge |
| `due` | on the date | same | Emit `Replacement Due`, roll `next_change_date += interval` |

Filter Clock’s job is **cadence**, not mail: it can store house traits on the anon cookie / profile so the first purchase uses a smarter interval. Live UI must not say “we’ll email you before {date}” unless they have already bought (or the copy is clearly “add to cart / checkout to get reminders”).

Consent: a paid order is enough to send replacement reminders for the SKUs they bought (service-like). Still include unsubscribe. Welcome / win-back / campaigns still need an explicit marketing checkbox.

### E. Win-back — `winback`

Nightly: segment `lapsed_120` minus active replenish window.

| Step | Wait | Then |
|---|---|---|
| `d0` | 0 | Still {size}? |
| `d14` | 14 days | Last try, then `completed`. Cooldown 180 days via `winback_last_exited_at` |

---

## 8. Campaigns

Airtable **Campaigns** fields: Name, Segment, Template, Scheduled, Status (`draft` / `queued` / `sending` / `sent` / `failed`).

`pg_cron` every minute: Edge Function pulls `queued` rows with `Scheduled <= now()`, inserts `campaigns`, fans out `send_jobs` for each `segment_members` row that passes suppression. Writes Status back to `sent` with count.

---

## 9. Templates and personalization

Repo templates (versioned):

- `welcome.d0`, `welcome.d1`, `welcome.d3`
- `abandon.1h`, `abandon.24h`
- `post.install`, `post.review`
- `replenish.t7`, `replenish.t2`, `replenish.due`
- `winback.d0`, `winback.d14`
- `campaign.generic` (body from Airtable)

Tokens: `{{first_name}}`, `{{size}}`, `{{merv}}`, `{{pack_qty}}`, `{{next_change_date}}`, `{{checkout_url}}`, `{{pdp_url}}`, `{{recs}}`.

`{{recs}}`: nearest `catalog_items` to last size/MERV, `in_stock`, prefer same size then MERV-up. Two SKUs max. Fallback: `firstSellableProduct(size)` from `shared/products.ts`. Never block a send on embeddings.

Airtable **Copy** overrides subject / preheader / CTA only. HTML stays in git.

Every marketing mail:

- Physical postal address (CAN-SPAM)
- `List-Unsubscribe` + `List-Unsubscribe-Post`
- Click wrapper `/r/{click_token}?to=`
- Marketing From: `Filter Hero <reminders@filterhero.net>` after SPF/DKIM/DMARC
- Transactional From stays on the current Resend identity in `server/contact.ts`

---

## 10. Attribution

On `Placed Order`:

1. This profile’s `Clicked Email` in the last 5 days
2. Else `Opened Email` in the last 5 days (weak)
3. Write `attributed_message_id` and `attributed_flow_key` on the event

Pulse: sends, unique clicks, attributed `$`, unsub rate, bounce rate — per flow and per campaign.

If campaign complaint rate exceeds ~0.3%, mark `failed` and stop the queue.

---

## 11. Consent matrix

| Source | Replenish | Abandon | Receipt | Welcome / Win-back / Campaigns |
|---|---|---|---|---|
| Filter Clock check or email save (no purchase) | **No** | No | No | **No** |
| Quote form + marketing box | No (until they buy) | If they check out | Yes | Yes |
| Quote form, no box | No | If they check out | Yes | No |
| Stripe / `Placed Order` | **Yes** | Yes (if they abandoned first) | Yes | Only if marketing box checked |

`/unsubscribe` exits marketing + win-back + welcome + campaigns + replenish. Receipt stays.

---

## 12. Security

- RLS on every `public` table. **Zero** anon/authenticated policies on profiles, events, consent, messages.
- Express and Edge Functions use `service_role` on the server only.
- `security definer` functions live in `private`, not `public`.
- Views: `WITH (security_invoker = true)` or keep them in `private`.
- Secrets in Vault / Edge secrets, never `VITE_`.
- Cookie holds `fh_aid` only.

Shoppers do not need Supabase Auth. Airtable is staff UI for v1.

---

## 13. Repo file map

| File | Change |
|---|---|
| `server/index.ts` | `/api/identify`, `/api/track`, `/unsubscribe`, `/r/:token`; keep Stripe raw-body webhook |
| `server/contact.ts` | Upsert profile + event; structured reminder; Airtable Quotes create |
| `server/stripe.ts` | `Placed Order` / `Ordered Product`; enroll post-purchase; reset clock; `checkout.session.expired` |
| `client/src/components/FilterPower.tsx` | POST cadence JSON; copy must not promise email before a purchase |
| `client/src/components/CartDrawer.tsx` | Email field before Stripe |
| `client/src/contexts/CartContext.tsx` | `track('Added to Cart')` |
| `client/src/pages/SizeDetail.tsx` | `Viewed Size` / `Viewed Product` |
| `client/src/lib/merv-pref.ts` | `Selected MERV` |
| `client/src/lib/tracker.ts` | **new** — cookie, buffer, identify, track |
| `server/supabase.ts` | **new** — service client |
| `supabase/migrations/*` | **new** — schema |
| `supabase/functions/journeys` | **new** — wake + advance |
| `supabase/functions/send` | **new** — render + Resend + suppress |
| `supabase/functions/embed` | **new** — catalog + house vectors |
| `supabase/functions/resend-webhook` | **new** — bounce / complaint / open |
| `supabase/functions/airtable-sync` | **new** — both directions |
| `docs/ISSUES-AND-FIXES.md` | Log bugs as you ship (workspace rule) |

Keep the existing Express + Vite app. Do not rewrite as Next.js.

---

## 14. Phased build

Each phase is shippable. Do not start Airtable campaigns before replenish actually sends.

### Phase 0 — Foundation (days 1–2)

Create Supabase project. Enable extensions. Migrations + RLS. `server/supabase.ts`. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Shadow-write from contact + Stripe. Import `leads.json` / `orders.json`.

**Done when:** a test checkout and a Filter Clock submit both produce a profile + event.

### Phase 1 — Identity + structured clock (days 3–4)

`fh_aid`, `/api/identify`, `/api/track`. Filter Clock posts `CadenceInput` + `CadenceResult` as a house profile only. **No consent, no list join, no journey enroll** from the clock. SPF/DKIM/DMARC `p=none`. Second Resend From.

**Done when:** a clock save writes house traits and `change_interval_days`, and `journey_states` for `replenish` stays empty.

### Phase 2 — Send primitive (days 5–6)

`suppressions`, `messages`, `/unsubscribe`, `/r/:token`, Resend webhook. `queue_send()` checks consent + suppression. One test template to yourself.

**Done when:** unsubscribe stops a second send; bounce adds suppression.

### Phase 3 — Replenish (days 7–9)

`journey_states` + `journeys` + `send`. Enroll **only** from `Placed Order` (same Stripe handler as post-purchase). `pg_cron` minute tick + daily due scan. Templates `t-7d` / `t-2d` / `due`.

**Done when:** a **paid** test order with `next_change_date` tomorrow gets `t-2d` and a click writes `Clicked Email`. A clock-only profile with the same date gets **zero** messages.

Ship replenish after Stripe can create `Placed Order`. It is a post-purchase product, not a clock signup product.

### Phase 4 — Stripe journeys (days 10–12)

Cart email field. `Checkout Started` + `carts`. Abandon 1h/24h. Post-purchase install/review. Reset clock on pay.

**Done when:** an unpaid session emails once, and a paid order cancels abandon and moves `next_change_date`.

### Phase 5 — Welcome + win-back + segments (days 13–14)

Marketing checkbox on quote form. Eight SQL segments. Welcome and win-back enroll from those.

### Phase 6 — Vectors (days 15–16)

`catalog_items` sync from sellable SKUs. Embed Edge Function. `house_profiles` on Filter Clock submit. `{{recs}}` in replenish + abandon.

### Phase 7 — Airtable (days 17–19)

Quotes mirror. Copy overrides. Campaigns `queued` → send. Pulse counts.

### Phase 8 — Attribution + hygiene (day 20)

Last-click on `Placed Order`. Pulse metrics. Auto-pause on complaint spike. Delete JSON shadow after a clean week.

---

## 15. Out of scope

- SMS / 10DLC
- Visual flow or segment builder
- Predicting LTV / churn
- Embedding browse events
- Shopper login
- Running your own MTA
- Kafka / ClickHouse
- Multi-store / white-label
- Replacing Resend
- A Klaviyo admin SPA (Airtable is the admin)

---

## 16. Acceptance tests

The replica is done when all of these pass:

1. Using Filter Clock (with or without saving an email) sends **no** replenish / Filter Clock email.
2. After `Placed Order`, emails arrive 7 days and 2 days before the purchase-based `next_change_date`, with the correct size / MERV / pack. A later purchase resets the date; they do not get a due email the week after they restocked.
3. Cart + email → leave Stripe → 1h email with a working `checkout_url`.
4. Completing pay exits abandon and starts post-purchase.
5. Unsubscribe from any marketing mail stops Welcome, Win-back, Campaigns, and Replenish.
6. A hard bounce never gets a second marketing mail.
7. An Airtable `queued` campaign sends only to that SQL segment, minus suppressions.
8. Replenish email includes a rec SKU when embeddings exist, and still sends when they don’t.
9. `Placed Order` stores `attributed_flow_key` if they clicked a mail in 5 days.
10. Existing `leads.json` / `orders.json` people exist as profiles; no duplicate emails.

---

## 17. Cost / ops

- Supabase Pro is enough: Postgres + Edge Functions + cron.
- Resend: warmup marketing from tens/day, then hundreds. Separate From from transactional.
- Airtable: one workspace, four tables.
- Vectors: hundreds of catalog SKUs + reminder house profiles, not millions.

---

## 18. First implementation slice

**Phase 0:** Supabase project, migrations, RLS, and shadow-write from `server/contact.ts` + `server/stripe.ts`.
