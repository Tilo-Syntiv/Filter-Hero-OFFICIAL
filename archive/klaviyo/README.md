# Klaviyo — parked 2026-09-24 (FH-369)

Marketing events, flows, the onsite SDK, the catalog feed, and the Stripe charge/invoice webhook helper are **not** part of the running shop. This folder is the restore snapshot. Do not import it from `server/`, `client/`, or `shared/`.

Live senders stay Stripe (payment receipt) and Resend (order confirmation, quote/support receipt, staff lead alert). Welcome, abandon, post-purchase, replenish, win-back, and campaigns have **no sender** until this archive is restored. Constant Contact is a separate admin OAuth connect. It does not replace these flows.

The Klaviyo company, list `RiTKiS`, and DNS `klv.filterhero.net` are outside this repo. The shop must not keep `KLAVIYO_*` env vars or a Stripe endpoint at `a.klaviyo.com`. `scrubConflictingStripeWebhooks` deletes that URL on any Stripe key. Do not run the archived setup scripts unless you are restoring.

## What is here

| Path | Was |
|---|---|
| `code/server/klaviyo.ts` | Events, profiles, list subscribe, catalog JSON |
| `code/server/klaviyo-stripe.ts` | Native charge/invoice webhook create |
| `code/shared/klaviyo-stripe.ts` | Webhook URL + event list |
| `code/shared/email-channels.ts` | Owners when Klaviyo was on (`welcome` etc. = `klaviyo`) |
| `code/shared/const.ts` | `VnVNmQ` / `RiTKiS` |
| `code/client/klaviyo.ts` | Onsite boot, identify, Added to Cart |
| `scripts/*` | `verify:klaviyo`, `setup:klaviyo`, `connect:klaviyo`, `inspect:klaviyo`, `map:klaviyo-metrics`, `setup:klaviyo-stripe`, `check-klaviyo-stripe` |
| `scripts/catalog-sync.ts` | `syncKlaviyoCatalog()` as it lived inside `scripts/lib/catalog-sync.ts` |
| `docs/` | `KLAVIYO.md`, `KLAVIYO-FULL-BUILD.md`, `KLAVIYO-REPLICA-PLAN.md` |
| `rules/` | Email rule + skill as of the park |
| `ISSUES.md` | Issue ids that mention this integration |

`crm_contacts.klaviyo_profile_id` was dropped (FH-370). Do not add it back unless you are restoring the archive.

## Wiring that was removed

- `POST /api/identify`, `POST /api/track`, `GET /api/klaviyo/config`, `/health`, `/catalog.json`
- `POST /api/admin/klaviyo-stripe/connect` and the Settings “Klaviyo + Stripe” panel
- Contact → `syncContactToKlaviyo`
- Checkout → Started Checkout; paid order → Placed Order; expired session → Checkout Expired
- Client `bootKlaviyo` and onsite identify / view / add-to-cart
- `pnpm sync:catalog` no longer pushes catalog items
- CSP no longer allows `klaviyo.com`
- `EMAIL_OWNER` for welcome, abandon, nurture, replenish, and win-back is `none`

Cart email still prefills from `localStorage` key `fh_klaviyo_email`. That key is only a remembered checkout address.

## Restore

1. Copy `code/server/*` back to `server/`, `code/shared/klaviyo-stripe.ts` to `shared/`, `code/client/klaviyo.ts` to `client/src/lib/klaviyo.ts`, and `scripts/*` (except `catalog-sync.ts`) back to `scripts/`.
2. Put `syncKlaviyoCatalog` from `scripts/catalog-sync.ts` back into `scripts/lib/catalog-sync.ts` and call it from `scripts/sync-catalog.ts`.
3. Restore `EMAIL_OWNER` marketing rows from `code/shared/email-channels.ts`. Restore `klaviyoMaySubscribe` and `klaviyoMetricForIntent`.
4. Re-apply the call sites listed above. CSP hosts are in `rules/stripe-klaviyo-email.mdc` era `shared/security-headers.ts` (production `https://*.klaviyo.com` and `https://static.klaviyo.com`; development also `http://a.klaviyo.com`).
5. Put the package.json scripts back: `verify:klaviyo`, `setup:klaviyo`, `setup:klaviyo-stripe`, `inspect:klaviyo`, `map:klaviyo-metrics`, `connect:klaviyo`.
6. Set `KLAVIYO_PRIVATE_API_KEY`, `KLAVIYO_PUBLIC_API_KEY=VnVNmQ`, `KLAVIYO_LIST_ID=RiTKiS`. Leave `KLAVIYO_DISABLE` unset.
7. Run `pnpm verify:klaviyo`. Do not point sandbox Stripe at the Klaviyo webhook. Do not add a Klaviyo order-confirmation flow.

Issue log: `ISSUES.md` and `docs/ISSUES-AND-FIXES.md` (FH-369).
