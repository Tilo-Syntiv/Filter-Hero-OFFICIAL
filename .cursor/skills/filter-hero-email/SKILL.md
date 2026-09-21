---
name: filter-hero-email
description: Enforces one shopper message, one sender for Filter Hero Resend, Stripe, and Klaviyo. Use when changing contact mail, order confirmation, Klaviyo flows, or email-channels / email-brand / mailer.
---

# Filter Hero email

Load `shared/email-channels.ts` before adding a send.

- Stripe = payment receipt
- Resend = order confirmation, quote/support receipt, staff lead alert. From `Filter Hero <info@filterhero.net>` via `server/mailer.ts` + `shared/email-brand.ts`
- Klaviyo = welcome, abandon, nurture, replenish, win-back, campaigns
- CRM never emails (`CRM_SENDS_MAIL = false`)
- Clock `intent=reminder` is staff-only; do not subscribe to list `RiTKiS`

Do not add a Klaviyo confirmation flow. Do not fire marketing from Successfully Paid. Do not import mailer from `server/crm/`.
