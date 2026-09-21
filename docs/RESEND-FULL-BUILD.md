# RESEND FULL BUILD

**Filter Hero — the definitive install, wiring, code, and issue log for Resend.**

This is how Resend is actually installed in this repository. Not a generic Resend tutorial. If a new shop, a new server, or a new engineer has to recreate transactional mail, this file is the spec. The short owner table lives in [RESEND.md](./RESEND.md). Channel law lives in `shared/email-channels.ts`. The issue log is [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md).

**Last aligned to the live tree:** 2026-09-20.

---

## 1. What Resend is here (and what it is not)

Filter Hero has four mailboxes that look like one brand. Each owns a job. Crossing them duplicates mail and re-opens the bugs in this file.

| System | Job | Domain | From / identity |
|---|---|---|---|
| **Resend** | Transactional HTML we author | `filterhero.net` / `send.filterhero.net` | `Filter Hero <info@filterhero.net>` |
| **Stripe** | Payment receipt only | Stripe’s mail | Stripe Branding (navy / burgundy) |
| **Klaviyo** | Welcome, abandon, post-purchase nurture, replenish, win-back, campaigns | `klv.filterhero.net` | Brand library defaults |
| **CRM (Supabase)** | Staff quote board | none | **Never sends. Never writes Klaviyo.** |

One shopper message, one sender. That sentence is the whole architecture.

Resend sends:

1. Staff lead alert (quote, support, **and** Filter Clock save) → `CONTACT_TO` (`info@filterhero.net`)
2. Quote receipt to the shopper
3. Support receipt to the shopper
4. Branded order confirmation after paid Checkout

Resend does **not** send:

- Welcome
- Abandoned checkout
- Post-purchase nurture / install / review
- Replenish (“time to change your filter”)
- Win-back
- Campaigns
- A second payment receipt (Stripe already does)
- Any shopper email on a Filter Clock cadence save
- Anything from `server/crm/` or `server/admin/`

There is **no** Resend inbound webhook, **no** Resend receiving on `@`, **no** React Email package, **no** Resend Audiences/Broadcasts, **no** marketing From. HTML is a table shell in `shared/email-brand.ts`. Sends go through `server/mailer.ts` only.

---

## 2. Live identity — copy these exactly

| Token | Value |
|---|---|
| Brand | Filter Hero |
| Shop origin | `https://filterhero.net` |
| From | `Filter Hero <info@filterhero.net>` |
| Staff inbox | `info@filterhero.net` |
| Logo | `https://filterhero.net/logo.png` (200×141 shop lockup) |
| Navy | `#203868` |
| Burgundy | `#7F2328` |
| Ice | `#8EB0D8` (footer accent only — never a text wordmark) |
| Body / canvas | `#141E30` / `#F6F7F9` |
| SDK | `resend@6.26.0` (`package.json`: `"resend": "^6.26.0"`) |
| API | `https://api.resend.com` |
| Safe test inbox | `delivered@resend.dev` |
| Dashboard emails | `https://resend.com/emails` |
| Sending domain | `filterhero.net` (verified, sending enabled) |
| Bounce / tracking host | `send.filterhero.net` |
| Google MX | `smtp.google.com` (untouched) |
| DMARC | `p=none` at `_dmarc.filterhero.net` |

Do not invent a second From (`hello@`, `orders@`, `onboarding@resend.dev`). Do not point `send.filterhero.net` at Klaviyo. Klaviyo already owns `klv.filterhero.net`.

---

## 3. Install from zero (this project’s order)

Do these steps in this order. Skipping DNS and jumping to code is how FH-202 happened: a verified domain with a sandbox From that could not deliver to `info@filterhero.net`.

### 3.1 Resend account

1. Sign in at [resend.com](https://resend.com).
2. Use the **production Filter Hero** account — the same one that already has `filterhero.net` verified. Do not create a second team “for staging” and send shop mail from it.
3. Do **not** enable **Receiving** on `@filterhero.net`. That steals Google Workspace MX. Staff mail stays in Gmail.

### 3.2 Add the sending domain

In Resend → Domains → add `filterhero.net`.

Resend will ask for DNS. Copy **their current DKIM `p=`** if they rotated it; the snapshot below is what was live on Cloudflare on 2026-09-07. Status must become **verified** with **sending enabled**.

A sending-only API key cannot list domains (`GET /domains` → 401/403). That is not a dead key (FH-191, FH-246). Dashboard verification is the source of truth for domain status when the key is send-only.

### 3.3 Cloudflare DNS (DNS only — never orange-cloud)

Domain stays registered at Squarespace. Nameservers are Cloudflare (`ganz` / `marjory`). Full zone: [CLOUDFLARE-NAMESERVERS.md](./CLOUDFLARE-NAMESERVERS.md).

Resend rows:

| Type | Name | Content | Proxy |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDY0W7t8ajkqaBCLXw2hZewiuzDcM6kwa2lr/9LaJpxRCFTonmmcigVp7oqwhQJN7SjYE1BoVnWCVLxd06C8sudInqcGkp+/Lbi7+QaznZ2G8rYLQm4yoJ+GV04ig19JgGX2EXUHQkX1RfsCWTRIlQ2Oa3XRxCpfXTPe26ghUsMSQIDAQAB` | DNS only |
| CNAME | `rsend` | `rsend.forge.rmta.net` | DNS only |
| CNAME | `send` | `send.forge.rmta.net` | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@filterhero.net` | DNS only |

Keep these **with** Resend, not instead of them:

| Type | Name | Content |
|---|---|---|
| MX | `@` | `smtp.google.com` (priority 1) |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |
| TXT | `@` | `klaviyo-site-verification=VnVNmQ` (second TXT, do not replace SPF) |
| CNAME | `klv` | Klaviyo sending host |

Hard DNS rules:

- Do not orange-cloud `resend._domainkey`, `rsend`, or `send`.
- Do not replace Google SPF with a Resend-only SPF. Never drop `include:_spf.google.com`.
- Do not point `send` at Klaviyo.
- Do not jump DMARC from `p=none` to `p=reject` on day one.
- Re-copy the DKIM `p=` from live DNS if Resend rotated keys.

### 3.4 API key

Resend → API Keys → create a **sending** key.

- Prefix: `re_`
- Server only. Never `VITE_RESEND_*`. Never `site-config.json`. Never the browser.
- A send-only key is enough. `pnpm verify:resend` and `pnpm verify:env` treat 401/403 on `GET /domains` and `emails.get` as “sending-only,” not failure.
- Do not print the secret. Do not commit `.env`.

### 3.5 Environment — local `.env` and Railway, same values

From `.env.example`:

```
CONTACT_TO=info@filterhero.net
RESEND_API_KEY=
RESEND_FROM=Filter Hero <info@filterhero.net>
```

Also required for branded HTML (logo URL, footer, CTAs):

```
SITE_URL=https://filterhero.net
VITE_SITE_URL=https://filterhero.net
```

`emailFromAddress()` in `shared/email-brand.ts` falls back to `Filter Hero <info@filterhero.net>` if `RESEND_FROM` is empty. `pnpm verify:env` still requires the env to equal that string exactly. Railway must match (FH-202).

If `RESEND_API_KEY` is unset, leads and orders still save. Mail is skipped. Contact still returns `{ ok: true, emailed: false }` (FH-124). That is intentional for a laptop without a key — it is not how production runs.

Related flags the Resend verifier temporarily flips (never leave these on in production to “fix mail”):

| Variable | Production | What it does |
|---|---|---|
| `CRM_DISABLE=1` | unset | Skip CRM writes |
| `KLAVIYO_DISABLE=1` | unset | Skip Klaviyo writes |
| `ACCOUNT_DISABLE=1` | unset | Skip account attach |
| `TURNSTILE_SECRET_KEY` | set | Enforces the widget on quote/support |
| `DATA_DIR` | unset (`<cwd>/server/data`) | Where `leads.json` / `orders.json` live |
| `NODE_ENV=production` | production | Turnstile fail-closed even without a secret |

### 3.6 Package

```bash
pnpm add resend
```

This repo pins `resend@^6.26.0` (lockfile `6.26.0`). Import is ESM:

```ts
import { Resend } from "resend";
```

`package.json` scripts:

```json
"verify:resend": "tsx scripts/verify-resend.ts",
"verify:env": "tsx scripts/verify-env.ts"
```

`tsx` runs the verifier with top-level await. `tsconfig.json` `compilerOptions.target` must be `ES2022` or `pnpm check` dies (FH-189).

### 3.7 Code modules that must exist (do not invent a second mailer)

| File | Role |
|---|---|
| `shared/const.ts` | `BRAND_NAME`, `BRAND_EMAIL`, `BRAND_TAGLINE` |
| `shared/seo.ts` | `DEFAULT_SITE_URL = "https://filterhero.net"` |
| `shared/email-brand.ts` | Tokens + `renderBrandedEmail` + `emailFromAddress` |
| `shared/email-channels.ts` | `EMAIL_OWNER` + `resendSendsShopperReceipt` |
| `server/mailer.ts` | Only place that calls `resend.emails.send` |
| `server/contact.ts` | Persist lead, then staff alert + optional shopper receipt |
| `server/stripe.ts` | Persist order, then confirmation gated on `confirmationSentAt` |
| `server/security.ts` | Honeypot, Turnstile, contact limiter |
| `server/index.ts` | `POST /api/contact` |
| `scripts/verify-resend.ts` | The contract test |
| `scripts/verify-env.ts` | Key format + live probe |
| `client/src/components/ContactForm.tsx` | Quote/support UI |
| `client/src/components/CustomQuoteForm.tsx` | Custom-size quote UI |
| `client/src/components/FilterPower.tsx` | Clock save, `intent: "reminder"` |
| `client/src/components/TurnstileField.tsx` | Widget on quote/support |
| `server/admin/data.ts` | Staff sees “Resend configured” + From |
| `.cursor/rules/stripe-klaviyo-email.mdc` | Always-applied owner rule |

**Forbidden imports**

- `server/crm/**` must not import `mailer` or Klaviyo (`pnpm verify:crm`).
- `server/admin/**` must not import `mailer`.
- `server/mailer.ts` must not import Klaviyo.
- `server/contact.ts` must not `import { Resend } from "resend"` — it goes through the mailer.
- Klaviyo code must not import Resend (`pnpm verify:klaviyo`).

---

## 4. Channel law — `shared/email-channels.ts`

This file is the lock. Verifiers assert it. Do not “just add a welcome email” to the mailer.

```ts
export const EMAIL_OWNER: Record<ShopperMessage, EmailChannel> = {
  staff_lead_alert: "resend",
  lead_alert: "resend",
  quote_receipt: "resend",
  support_receipt: "resend",
  clock_cadence: "none",
  order_confirmation: "resend",
  stripe_receipt: "stripe",
  welcome: "klaviyo",
  abandoned_checkout: "klaviyo",
  post_purchase_nurture: "klaviyo",
  replenish: "klaviyo",
  winback: "klaviyo",
};

export const CRM_SENDS_MAIL = false;

export function resendSendsShopperReceipt(intent: ContactIntent): boolean {
  return intent === "quote" || intent === "support";
}
```

`intent === "reminder"` (Filter Clock) still gets a **staff** lead alert. It does not get a shopper receipt. Replenish date `next_change_date` is written only on Stripe **Placed Order**, not on a clock save (`CLOCK_NEXT_CHANGE_PROPERTY` is the clock-only field so a cadence cannot enroll replenish — FH-131).

Klaviyo UI rule (same as `.cursor/rules/stripe-klaviyo-email.mdc`): do not add an order-confirmation or quote-receipt flow. Do not trigger welcome / abandon / replenish / a receipt from **Successfully Paid**. Shop Placed Order stays on `https://filterhero.net/api/stripe/webhook`. Native Klaviyo Stripe webhook is charge/invoice only.

---

## 5. Brand kit — `shared/email-brand.ts`

Stripe Branding, Klaviyo email defaults, and Resend HTML all use this object. Changing navy here without changing Stripe/Klaviyo splits the inbox.

```ts
export const EMAIL_BRAND = {
  navy: "#203868",
  burgundy: "#7F2328",
  ice: "#8EB0D8",
  mesh: "#3A66A3",
  deep: "#141e30",
  canvas: "#f6f7f9",
  white: "#ffffff",
  muted: "#5b6475",
  logoPath: "/logo.png",
  logoWidth: 200,
  logoHeight: 141,
} as const;
```

Functions:

| Function | Job |
|---|---|
| `emailOrigin()` | Strip trailing slash; default `https://filterhero.net` |
| `emailLogoUrl()` | `https://filterhero.net/logo.png` |
| `emailFromAddress()` | `RESEND_FROM` or `Filter Hero <info@filterhero.net>` |
| `escapeEmailHtml()` | `& < > " '` — names and messages are untrusted |
| `renderBrandedEmail()` | Table shell: white card, logo, 4px navy rule, burgundy CTA |
| `transactionalFooterNote()` | `Filter Hero · tagline · filterhero.net · info@filterhero.net` |

HTML rules that verifiers enforce:

- Logo `<img>` with `alt="Filter Hero"`, not ice `#8EB0D8` wordmark text.
- Navy on the H1 and links.
- Burgundy on the CTA button.
- `escapeEmailHtml` on title, preview, CTA href/label, and all lead fields (`nl2br` escapes first).
- Doctype + table layout (no CSS-in-JS, no React Email).

FH-235 existed because Resend used to send a plain-text staff alert only. Quote receipts and order confirmations were documented and never sent. The kit exists so that cannot happen again.

---

## 6. The mailer — `server/mailer.ts`

This is the only `new Resend(apiKey)` on the request path. Three public senders, three builders, one `sendBuilt`.

### 6.1 Client and From

```ts
function resendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function contactInbox(): string {
  return (process.env.CONTACT_TO || "").trim() || BRAND_EMAIL;
}
```

No key → log `[mailer] RESEND_API_KEY not set — skip send` → `{ sent: false }`. Never throw.

### 6.2 Send shape (this is the Resend API as we use it)

```ts
async function sendBuilt(mail: BuiltMail, idempotencyKey: string): Promise<MailResult> {
  const resend = resendClient();
  if (!resend) {
    console.info("[mailer] RESEND_API_KEY not set — skip send", mail.subject);
    return { sent: false };
  }
  const { data, error } = await resend.emails.send(
    {
      from: emailFromAddress(),
      to: [mail.to],
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    },
    { idempotencyKey },
  );
  if (error) {
    console.error("[mailer] resend", error);
    return { sent: false };
  }
  return { sent: true, id: data?.id };
}
```

Every send has **both** `html` and `text`. `to` is always an array of one address. `from` is never hardcoded in the mailer — it goes through `emailFromAddress()`.

### 6.3 Idempotency keys (required)

Resend idempotency keys last **24 hours**. Stripe retries webhooks for up to **3 days**. That mismatch is FH-292. Keys still matter for same-day retries; they are not enough for late retries.

| Send | Function | Idempotency key | To | Reply-To |
|---|---|---|---|---|
| Staff lead alert | `sendLeadAlert` | `lead-email/{lead.id}` | `CONTACT_TO` | shopper email |
| Quote / support receipt | `sendContactReceipt` | `lead-receipt/{lead.id}` | shopper email | `info@filterhero.net` |
| Order confirmation | `sendOrderConfirmation` | `order-confirmation/{sessionId}` | shopper email | `info@filterhero.net` |
| Env probe | `verify-env.ts` | `verify-env/{Date.now()}` | `delivered@resend.dev` | — |
| Brand probe | `verify-resend.ts` | `verify-resend/{Date.now()}` | `delivered@resend.dev` | — |

Clock / reminder: `sendContactReceipt` returns `{ sent: false }` without calling Resend (`buildContactReceipt` returns `null`). Staff alert still sends with `lead-email/{id}`.

### 6.4 Staff alert — `buildLeadAlert`

- Subject: `[Filter Hero] Quote — {name}` (or Support / Filter Reminder)
- Body: definition table (Lead ID, Intent, Name, Email, Phone, Filter size, Cart) + escaped message
- CTA: Open Filter Hero → shop origin
- Always sent for every saved lead, including clock

### 6.5 Shopper receipt — `buildContactReceipt`

- Quote subject: `We got your Filter Hero quote request`
- Support subject: `We got your Filter Hero message`
- Copy says this is a receipt, not marketing, and Stripe still sends the payment receipt when they buy
- CTA: Shop filters
- Size line only if `filterSize` is set
- Returns `null` for `intent === "reminder"`

### 6.6 Order confirmation — `buildOrderConfirmation`

- Subject: `Your Filter Hero order is confirmed`
- Returns `null` if `customerEmail` is missing or blank (whitespace counts as blank)
- Lines parsed from `order.items` JSON `[{ productId, quantity }]`
- Pack shot: `{origin}{packShotSrc(merv, isCarbon)}` (e.g. `/products/merv-8-packshot.png`)
- Subtotal always; **Tax line only if `amountTax > 0`** (FH-246 — $0 tax is omitted)
- Ship-to block from session shipping
- CTA: `/how-often-to-change-air-filter`
- Preview text: Stripe will send the payment receipt separately

`sendOrderConfirmation` uses `sessionId`, not `order.id`, in the idempotency key so Stripe retries of the same Checkout session collapse.

---

## 7. Contact path — how a form becomes Resend mail

### 7.1 Browser

Quote/support: `ContactForm.tsx` / `CustomQuoteForm.tsx` POST JSON to `/api/contact` with `name`, `email`, `message`, `intent`, optional `filterSize` / `cartSummary` / `marketingConsent`, honeypot `website`, and `turnstileToken`.

Filter Clock: `FilterPower.tsx` posts `intent: "reminder"`, `marketingConsent: false`, a cadence object, **no Turnstile**. Copy in the message says “no email until purchase.”

### 7.2 Express

`POST /api/contact` behind `contactLimiter`: **5 posts per IP per 15 minutes**. Turnstile failure is `400 { error: "Could not verify that form.", code: "bot_check_failed" }`. Zod / other errors are shaped by `publicError` (no raw stack, no keys).

### 7.3 `submitContact` order (do not reorder)

1. Parse with `contactSchema` (`intent` default `"quote"`).
2. Honeypot `website` filled → `{ ok: true, id: "ignored", emailed: false }` and **no** Resend, CRM, or Klaviyo.
3. `shouldEnforceTurnstile(intent)`:
   - `reminder` → never
   - `NODE_ENV === "production"` → always
   - else → only if `TURNSTILE_SECRET_KEY` is set
4. `appendLead` to `DATA_DIR`/`server/data/leads.json` **before** any side effect.
5. CRM `recordLeadInCrm` — catch and log.
6. `syncContactToKlaviyo` — catch and log. Clock does not subscribe (`klaviyoMaySubscribe` is false for reminder).
7. `sendLeadEmail`:
   - `sendLeadAlert` (staff)
   - if `resendSendsShopperReceipt` → `sendContactReceipt` (shopper); receipt errors are logged, they do not fail the request
8. Mail throw → `{ ok: true, id, emailed: false }` (FH-124). Shopper must never retry into a duplicate lead because Resend was down.

`emailed` is **staff-alert success**, not “every template sent.” A quote can email staff and still drop the shopper receipt; the API still says ok.

### 7.4 Why verify unsets Turnstile

`pnpm verify:resend` must call `submitContact` for quote + clock. A local `TURNSTILE_SECRET_KEY` (or `NODE_ENV=production`) would throw `Could not verify that form` and look like a dead Resend key (FH-291). The verifier **temporarily** deletes `TURNSTILE_SECRET_KEY` and forces a non-production `NODE_ENV` inside that block, then restores both. Production contact still enforces the widget. Clock stays widget-free.

---

## 8. Stripe path — how a paid Checkout becomes a confirmation

Webhook: `https://filterhero.net/api/stripe/webhook` (shop events). Klaviyo’s native Stripe URL is **not** this path.

On `checkout.session.completed`:

1. Verify `stripe-signature`. Ignore live events on a test key and test events on a live key.
2. Retrieve the session (fall back to the event payload on `resource_missing`).
3. Upsert `orders.json` **by `sessionId`** (FH-123). Same event twice = one row.
4. `syncPlacedOrder` → Klaviyo (marketing events, not a confirmation email).
5. If `!stored.confirmationSentAt`:
   - `sendOrderConfirmation(stored)`
   - **only if `mail.sent`**: set `confirmationSentAt = new Date().toISOString()` and write the file
6. Attach SKUs to the customer account.
7. Close CRM deals.

That stamp is the 3-day Stripe retry fix (FH-292):

- Resend down on first delivery → no stamp → retry sends.
- Resend accepts → stamp lands → later retries skip.
- Do **not** skip the send merely because the order row exists. A first-send failure still needs the retry.
- Do **not** rely on Resend idempotency alone (24h vs 3 days).

If `customerEmail` is missing, `buildOrderConfirmation` returns null, `sent` is false, no stamp. Next retry tries again (in case retrieve later has the email).

---

## 9. Persistence (mail is not the source of truth)

| Store | Path | Who writes | Resend field |
|---|---|---|---|
| Leads | `server/data/leads.json` (or `DATA_DIR`) | `appendLead` | none — id is the idempotency suffix |
| Orders | `server/data/orders.json` | Stripe webhook | `confirmationSentAt` |

FH-122: never resolve these from `__dirname` next to `dist/index.js`. Production used to write `dist/data/` and a redeploy wiped it. Use `dataFile()` in `server/data-store.ts`.

Admin Settings (`/admin`) only shows whether `RESEND_API_KEY` is present and the `RESEND_FROM` / `CONTACT_TO` strings. It does not send mail and does not store secrets in `site-config.json` (FH-213).

---

## 10. Verify — the contract

### 10.1 `pnpm verify:resend`

This is the install test. A green run means the domain, From, HTML, four live templates, contact pipeline, and webhook stamp all match this document.

It asserts, in order:

1. `RESEND_API_KEY` starts with `re_`
2. `RESEND_FROM` is exactly `Filter Hero <info@filterhero.net>` (not `onboarding@resend.dev`)
3. `CONTACT_TO` is `@filterhero.net`
4. `EMAIL_OWNER` table (Resend / Stripe / Klaviyo / none)
5. Mailer source has the brand kit, logo path, no Klaviyo import, no welcome/abandon/replenish
6. Contact source calls `sendLeadAlert` + `sendContactReceipt`, still has `shouldEnforceTurnstile`, does not import Resend
7. Stripe source has `sendOrderConfirmation`, `confirmationSentAt`, and `if (!stored.confirmationSentAt)`
8. Built HTML: logo URL, alt, navy, burgundy, no ice wordmark
9. XSS: `<script>` and `<img onerror>` escape in the staff alert
10. Zero tax omitted; recorded tax shown
11. Blank / null customer email → no confirmation
12. Clock intent → no shopper receipt
13. `GET /domains`: verified `filterhero.net` **or** 401/403 sending-only
14. Live sends to `delivered@resend.dev`: probe, staff, quote, support, order; clock receipt must not send
15. `emails.get` only when the key can list domains
16. `submitContact` honeypot / quote / clock with CRM, Klaviyo, Turnstile off
17. Signed `checkout.session.completed` three times: Resend off (order, no stamp) → Resend on (stamp) → again (stamp unchanged)

Never point verify at `info@filterhero.net`. Never treat a probe-only send as proof the templates work (FH-246).

### 10.2 `pnpm verify:env`

Format check: `RESEND_API_KEY` is `re_`, `RESEND_FROM` equals the brand From. Live: domain list or sending-only, then a branded probe to `delivered@resend.dev`.

### 10.3 Neighbors

| Command | Resend-related invariant |
|---|---|
| `pnpm verify:klaviyo` | `EMAIL_OWNER.order_confirmation === "resend"`; Klaviyo source does not import Resend or call mailer senders |
| `pnpm verify:crm` | CRM files do not import mailer |
| `pnpm verify:admin` | Admin files do not import mailer |
| `pnpm verify:account` | Account files do not import mailer |
| `pnpm verify:security` | Turnstile fail-closed in production; contact limiter |

---

## 11. Reproduce on a new machine (checklist)

1. Cloudflare already has the Resend + Google + Klaviyo rows above. Do not enable Resend receiving.
2. Resend dashboard: `filterhero.net` **verified**, sending **enabled**.
3. Create a `re_` sending key.
4. Local `.env`: `RESEND_API_KEY`, `RESEND_FROM=Filter Hero <info@filterhero.net>`, `CONTACT_TO=info@filterhero.net`, `SITE_URL` / `VITE_SITE_URL=https://filterhero.net`.
5. Railway Variables: the same three Resend/contact keys. Never the sandbox From.
6. `pnpm install` (pulls `resend@6.26.0`).
7. Confirm `server/mailer.ts`, `shared/email-brand.ts`, `shared/email-channels.ts` exist and CRM/admin do not import them.
8. `pnpm verify:env`
9. `pnpm verify:resend`
10. Manual: submit a quote on the shop → staff Gmail thread from `info@filterhero.net` with Reply-To = shopper; shopper inbox gets the quote receipt with `/logo.png`.
11. Manual: pay Checkout on live FILTER HERO → Resend confirmation **and** Stripe payment receipt. Klaviyo must not send a third “order confirmed.”
12. Staff `/admin` → Integrations → Resend green, From shows `Filter Hero <info@filterhero.net>`.

---

## 12. Hard no’s (the regressions)

Copy these into any new work. They are the `Do NOT` lines from the issue log.

- Do not send from `onboarding@resend.dev`.
- Do not send Resend mail as text-only.
- Do not use ice wordmark text instead of `https://filterhero.net/logo.png`.
- Do not add welcome / abandon / replenish / win-back to `server/mailer.ts`.
- Do not add a Klaviyo order-confirmation or quote-receipt flow.
- Do not trigger those from Stripe **Successfully Paid**.
- Do not email the shopper on Filter Clock save.
- Do not import the mailer from `server/crm/` or `server/admin/`.
- Do not `import { Resend }` from `server/contact.ts`.
- Do not put the API key in `VITE_` or `site-config.json`.
- Do not enable Resend receiving on `@`.
- Do not orange-cloud `resend._domainkey` / `rsend` / `send`.
- Do not replace Google SPF.
- Do not point `send.filterhero.net` at Klaviyo.
- Do not treat `GET /domains` 401 as a dead sending key.
- Do not call `emails.get` with a send-only key and call it a failure.
- Do not email `info@filterhero.net` from verify — use `delivered@resend.dev`.
- Do not skip the order confirmation because the order row already exists.
- Do not stamp `confirmationSentAt` before Resend accepts.
- Do not return HTTP 400 after a lead is saved because mail failed.
- Do not disable production Turnstile to make verify pass.
- Do not require Turnstile on `intent=reminder`.
- Do not write leads/orders under `dist/data`.

---

## 13. Issues and fixes (every Resend-touching FH)

Canonical entries: [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). Below is the Resend subset plus the adjacent mail-path bugs you will re-open if you rewire this.

### Direct Resend / mailer

#### FH-292 — Stripe webhook could send a second Resend confirmation

- **Status:** fixed (2026-09-20)
- **Area:** contact
- **Symptom:** `checkout.session.completed` always called `sendOrderConfirmation`. Resend idempotency keys last 24 hours; Stripe retries for up to 3 days, so a late retry could mail a second branded confirmation.
- **Do NOT:** Skip the send whenever the order row already exists — a first-send failure still needs the retry. Do not rely on Resend idempotency alone.
- **Do:** Persist `confirmationSentAt` on the order only after Resend accepts the send. Retries keep trying until that stamp lands, then stop.
- **Files:** `server/stripe.ts`, `scripts/verify-resend.ts`, `docs/RESEND.md`
- **Verify:** `pnpm verify:resend`. Webhook QA: no stamp when Resend is down, stamp after retry, unchanged on a second retry.

#### FH-291 — Resend verify died on Turnstile

- **Status:** fixed (2026-09-20)
- **Area:** contact
- **Symptom:** `pnpm verify:resend` sent the branded templates, then `submitContact` quote QA threw `Could not verify that form` because a local `TURNSTILE_SECRET_KEY` (or `NODE_ENV=production`) enforces the widget. CRM and Klaviyo were already off; Turnstile was not.
- **Do NOT:** Disable Turnstile in production contact. Do not skip `shouldEnforceTurnstile` on quote/support. Do not treat a failed verify as a dead Resend key.
- **Do:** Unset `TURNSTILE_SECRET_KEY` and force a non-production `NODE_ENV` only inside the `submitContact` QA block, then restore both. Clock reminders stay widget-free.
- **Files:** `scripts/verify-resend.ts`, `docs/RESEND.md`
- **Verify:** `pnpm verify:resend` with a real Turnstile secret in `.env`.

#### FH-246 — Resend verify never sent the real templates

- **Status:** fixed (2026-09-17)
- **Area:** contact
- **Symptom:** `pnpm verify:resend` only probed a generic HTML email. A broken quote receipt, support receipt, or order confirmation could still pass. A sending-only API key 401ed on `emails.get` and looked like a failure.
- **Do NOT:** Treat a probe-only send as proof the mailer works. Do not call `emails.get` with a send-only key. Do not email `info@filterhero.net` from verify.
- **Do:** Send staff alert, quote receipt, support receipt, and order confirmation to `delivered@resend.dev`. `submitContact` honeypot / quote / clock runs with CRM and Klaviyo off. Skip GET when `/domains` is 401. Markup in names/messages is escaped. $0 tax is omitted; recorded tax is shown.
- **Files:** `scripts/verify-resend.ts`, `server/mailer.ts`
- **Verify:** `pnpm verify:resend`. Output includes send ids for staff, quote, support, and order.

#### FH-235 — Resend mail was unbranded plain text

- **Status:** fixed (2026-09-17)
- **Area:** contact
- **Symptom:** Resend only sent a plain-text staff lead alert. Quote/support receipts and the order confirmation were documented as Filter Hero mail but never left as branded HTML, so the inbox did not match Klaviyo/Stripe (logo, navy `#203868`, burgundy `#7F2328`).
- **Do NOT:** Send Resend mail as text-only. Do not use ice wordmark text instead of `/logo.png`. Do not send from `onboarding@resend.dev`. Do not add welcome / abandon / replenish to `server/mailer.ts`.
- **Do:** `shared/email-brand.ts` is the kit. `server/mailer.ts` sends the staff alert, quote/support receipt, and order confirmation with the shop lockup. From is `Filter Hero <info@filterhero.net>`. Clock saves stay staff-only.
- **Files:** `shared/email-brand.ts`, `server/mailer.ts`, `server/contact.ts`, `server/stripe.ts`, `scripts/verify-resend.ts`, `docs/RESEND.md`
- **Verify:** `pnpm verify:resend`. HTML includes `https://filterhero.net/logo.png`, `#203868`, and `#7F2328`.

#### FH-202 — Lead mail still used the Resend sandbox From

- **Status:** fixed (2026-09-07)
- **Area:** contact
- **Symptom:** `filterhero.net` was verified on Resend with sending enabled, but local and Railway `RESEND_FROM` was `Filter Hero <onboarding@resend.dev>`. That sandbox identity can only deliver to the Resend account email, so quote/support alerts to `info@filterhero.net` fail or never look like Filter Hero mail.
- **Do NOT:** Send production mail from `onboarding@resend.dev`. Do not enable Resend receiving on `@` (that steals Google MX). Do not replace the Google SPF. Do not orange-cloud `resend._domainkey`, `rsend`, or `send`.
- **Do:** `RESEND_FROM=Filter Hero <info@filterhero.net>`. Default in code is the same if the env is unset. Contact sends use idempotency key `lead-email/{id}`. DMARC is `p=none` at `_dmarc.filterhero.net`. SDK is `resend` 6.x.
- **Files:** `server/contact.ts`, `.env.example`, `scripts/verify-resend.ts`, `docs/CLOUDFLARE-NAMESERVERS.md`
- **Verify:** `pnpm verify:resend` sends to `delivered@resend.dev` from `info@filterhero.net`. Railway `RESEND_FROM` matches.

#### FH-124 — Contact email failure returned 400 after the lead was saved

- **Status:** mitigated (2026-08-31)
- **Area:** contact
- **Symptom:** `appendLead()` ran, then Resend threw or returned `{ error }`. The API answered 400, so the shopper retried and duplicated the lead.
- **Do NOT:** Treat a saved lead as a failed submit just because email delivery failed.
- **Do:** Return `{ ok: true, emailed: false }` after a successful save. Log the Resend error.
- **Files:** `server/contact.ts`
- **Verify:** POST `/api/contact` with no `RESEND_API_KEY` still returns `{ ok: true }`.

### Adjacent — env, Stripe retries, clock, Turnstile, persistence, brand

#### FH-191 — Local `.env` had no live verifier and `.env.example` omitted live keys

- **Status:** fixed (2026-09-07)
- **Symptom:** Nothing asserted key formats or pinged Stripe / Resend / Klaviyo in one pass. A send-only Resend key looked like a domain-list failure if you called `/domains`.
- **Do NOT:** Print secret values. Do not put Resend (or Stripe `sk_`, service-role, Cloudflare) in `VITE_` vars. Do not treat a Resend 401 on `/domains` as a dead key when send to `delivered@resend.dev` works.
- **Do:** `pnpm verify:env` after changing `.env`.
- **Files:** `scripts/verify-env.ts`, `.env.example`, `package.json`, `README.md`

#### FH-189 — `pnpm check` failed and Vite env was incomplete

- **Status:** fixed (2026-09-07)
- **Symptom:** `tsc --noEmit` died on top-level await in `scripts/verify-resend.ts` because `tsconfig.json` had no `target`.
- **Do:** Keep `compilerOptions.target` at `ES2022`.

#### FH-123 — Stripe webhook wrote duplicate orders on retry

- **Status:** mitigated (2026-08-31)
- **Symptom:** Every `checkout.session.completed` appended to `orders.json`. Stripe retries created duplicate rows for the same `session.id`.
- **Do:** Upsert by `sessionId`. FH-292’s stamp lives on that single row.

#### FH-122 — Production leads and orders wrote into `dist/data`

- **Status:** mitigated (2026-08-31)
- **Symptom:** Production `dist/index.js` wrote `dist/data/`, which a redeploy wipes — including `confirmationSentAt` and leads that Resend already mailed.
- **Do:** `DATA_DIR` or `<cwd>/server/data` via `server/data-store.ts`.

#### FH-131 — Filter Clock must not send replacement emails before a purchase

- **Status:** mitigated (2026-09-01)
- **Symptom:** Clock copy promised email before a date when someone only saved a cadence. Replenish must not start until they buy.
- **Do:** Clock save = staff Resend alert only. Shopper replenish is Klaviyo on **Placed Order**. `resendSendsShopperReceipt("reminder") === false`.

#### FH-190 — Quote intake had no bot gate

- **Status:** fixed (2026-09-07)
- **Symptom:** `/api/contact` had no rate limit or honeypot. Production Turnstile keys sat unused.
- **Do NOT:** Require Turnstile on `intent=reminder`. Do not let the CRM send mail.
- **Do:** Contact limiter 5 / 15 minutes. Quote/support send honeypot + Turnstile. Reminder skips the widget.

#### FH-213 — Staff console was quotes-only (secrets / no mail from admin)

- **Status:** fixed
- **Do NOT:** Send mail or write Klaviyo from `server/admin/` or `server/crm/`. Do not store Stripe/Resend secrets in `site-config.json`.

#### FH-234 / FH-236 — Klaviyo used the ice text wordmark

- **Status:** fixed (2026-09-17)
- **Why it belongs here:** Same brand kit as Resend. Ice `#8EB0D8` is a footer accent, not a logo. Resend verify rejects the old ice wordmark CSS.

### Not this stack

[KLAVIYO-REPLICA-PLAN.md](./KLAVIYO-REPLICA-PLAN.md) describes an in-house CDP that would send marketing through Resend. **The app does not run that.** Marketing stays in Klaviyo. Do not implement `resend-webhook` journeys from that plan against this shop.

---

## 14. Sequence (what actually happens)

```
Quote / support form
  → Turnstile + honeypot
  → POST /api/contact
  → leads.json
  → CRM deal (fail-soft)
  → Klaviyo profile/event if consent (fail-soft)
  → Resend staff alert (lead-email/{id})
  → Resend shopper receipt (lead-receipt/{id})

Filter Clock save
  → POST /api/contact intent=reminder (no Turnstile)
  → leads.json
  → CRM / Klaviyo house fields only (no list join)
  → Resend staff alert
  → no shopper Resend

Paid Stripe Checkout
  → POST /api/stripe/webhook  checkout.session.completed
  → orders.json upsert by sessionId
  → Klaviyo Placed Order (replenish date, not a receipt)
  → Resend order confirmation unless confirmationSentAt
  → stamp confirmationSentAt
  → Stripe (separately) emails the payment receipt
```

Three messages a buyer may see after pay: **Resend confirmation**, **Stripe receipt**, **Klaviyo post-purchase nurture** (install/review — not “order confirmed”). If they also get a Klaviyo “Your order is confirmed,” a flow was added in the Klaviyo UI and must be deleted.

---

## 15. Related files

| Doc / rule | Why |
|---|---|
| [RESEND.md](./RESEND.md) | One-page owner table |
| [KLAVIYO.md](./KLAVIYO.md) | Do-not-overlap table |
| [CLOUDFLARE-NAMESERVERS.md](./CLOUDFLARE-NAMESERVERS.md) | Live DNS including Resend rows |
| [CRM.md](./CRM.md) | CRM never mails |
| [CUSTOMER-ACCOUNTS.md](./CUSTOMER-ACCOUNTS.md) | Accounts are not a second sender |
| [STRIPE-BOOKS.md](./STRIPE-BOOKS.md) | Resend is not the ledger |
| [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md) | Canonical FH log |
| `.cursor/rules/stripe-klaviyo-email.mdc` | Always-applied owner rule |
| `shared/email-channels.ts` | Code lock |
| `shared/email-brand.ts` | Visual lock |
| `server/mailer.ts` | Send lock |
| `scripts/verify-resend.ts` | Proof |
