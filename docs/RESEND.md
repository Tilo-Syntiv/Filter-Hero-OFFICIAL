# Resend

**Summary:** Filter Hero transactional mail. One shopper message, one sender.

**Sources:** `RESEND-FULL-BUILD.md`, `shared/email-channels.ts`, `server/mailer.ts`

**Last updated:** 2026-09-20

| System | Job | Domain / From |
|---|---|---|
| **Resend** | Staff lead alert, quote/support receipt, order confirmation | `Filter Hero <info@filterhero.net>` via `send.filterhero.net` |
| **Stripe** | Payment receipt only | Stripe Branding |
| **Klaviyo** | Welcome, abandon, nurture, replenish, win-back, campaigns | `klv.filterhero.net` |
| **CRM** | Staff quote board | Never sends |

| Token | Value |
|---|---|
| From | `Filter Hero <info@filterhero.net>` |
| Staff inbox | `info@filterhero.net` |
| Logo | `https://filterhero.net/logo.png` |
| Navy / burgundy | `#203868` / `#7F2328` |
| SDK | `resend@6.26.0` |
| Safe probe | `delivered@resend.dev` |

Env (server only, never `VITE_`):

```
CONTACT_TO=info@filterhero.net
RESEND_API_KEY=
RESEND_FROM=Filter Hero <info@filterhero.net>
SITE_URL=https://filterhero.net
```

Sends go through `server/mailer.ts` only. HTML is `shared/email-brand.ts`. Channel lock is `shared/email-channels.ts`.

Do not enable Resend receiving on `@`. Do not send from `onboarding@resend.dev`. Do not add welcome / abandon / replenish to the mailer. Do not email the shopper on Filter Clock save. Proof: `pnpm verify:resend`.

Full install: [RESEND-FULL-BUILD.md](./RESEND-FULL-BUILD.md)
