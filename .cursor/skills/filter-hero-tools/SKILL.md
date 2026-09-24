---
name: filter-hero-tools
description: Routes Filter Hero work to the correct MCP and skill. Use when touching Stripe, Railway, Supabase, Cloudflare DNS, Hostinger, Firecrawl, Tavily, or Apify. Klaviyo is parked in archive/klaviyo.
---

# Filter Hero tools

Read the skill file before using the tool.

| Work | Use |
|---|---|
| Stripe Checkout, Tax, webhooks | Stripe skills + `user-stripe`. Live `acct_1U9bqlQEENEs0Qmw` only |
| Klaviyo | Parked in `archive/klaviyo` (FH-369). Do not call `user-klaviyo` unless restoring |
| Railway | Railway skill / CLI. One service. `DATA_DIR=/data` |
| Supabase | Supabase skill + hosted MCP. No `supabase start` |
| DNS / Turnstile | `docs/CLOUDFLARE-NAMESERVERS.md` |
| Hostinger | Hostinger MCP + confirm-destructive-actions. Not this shop’s host |
| Firecrawl / Tavily | Research only. Forbidden as Filter King catalog source |
| Apify | `apify` subagent first if the user names Apify |
