---
name: filter-hero-email
description: Enforces one shopper message, one sender for Filter Hero Resend and Stripe. Klaviyo is parked in archive/klaviyo. Use when changing contact mail, order confirmation, or email-channels / email-brand / mailer.
---

# Filter Hero email

Load `shared/email-channels.ts` before adding a send.

- Stripe = payment receipt
- Resend = order confirmation, quote/support receipt, staff lead alert. From `Filter Hero <info@filterhero.net>` via `server/mailer.ts` + `shared/email-brand.ts`
- Welcome, abandon, nurture, replenish, win-back, and campaigns have no sender. The previous Klaviyo wiring is in `archive/klaviyo` (FH-369)
- CRM never emails (`CRM_SENDS_MAIL = false`)
- Clock `intent=reminder` is staff-only

Do not send those marketing messages from Resend. Do not fire marketing from Successfully Paid. Do not import mailer from `server/crm/`.
