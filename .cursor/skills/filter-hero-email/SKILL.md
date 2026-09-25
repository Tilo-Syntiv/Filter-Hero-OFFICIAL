---
name: filter-hero-email
description: Enforces one shopper message, one sender for Filter Hero Resend, Stripe, and Klaviyo. Constant Contact is account connect only. Use when changing contact mail, order confirmation, or email-channels / email-brand / mailer.
---

# Filter Hero email

Load `shared/email-channels.ts` before adding a send.

- Stripe = payment receipt
- Resend = order confirmation, quote/support receipt, staff lead alert, one-shot back-in-stock alert. From `Filter Hero <info@filterhero.net>` via `server/mailer.ts` + `shared/email-brand.ts`
- Welcome, abandon, nurture, replenish, and win-back are Klaviyo (FH-380). Constant Contact has no shopper wiring. The shop token asks only `account_read` and `offline_access`. Dashboard integrations Klaviyo does not run stay in Constant Contact.
- CRM never emails (`CRM_SENDS_MAIL = false`)
- Clock `intent=reminder` is staff-only

Do not send those marketing messages from Resend. Do not fire marketing from Successfully Paid. Do not import mailer from `server/crm/`. Back-in-stock is one email per signup when the SKU returns — not a series.
