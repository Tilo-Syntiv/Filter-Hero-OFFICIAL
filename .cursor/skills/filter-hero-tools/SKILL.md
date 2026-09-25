---
name: filter-hero-tools
description: Routes Filter Hero work to the correct MCP and skill. Use when touching Stripe, Klaviyo, Railway, Supabase, Cloudflare DNS, Hostinger, Firecrawl, Tavily, or Apify.
---

# Filter Hero tools

Read the skill file before using the tool.

| Work | Use |
|---|---|
| Stripe Checkout, Tax, webhooks | Stripe skills + `user-stripe`. Live `acct_1U9bqlQEENEs0Qmw` only |
| Klaviyo | `user-klaviyo` MCP. Account `VnVNmQ` only |
| Railway | Railway skill / CLI. One service. `DATA_DIR=/data` |
| Supabase | Supabase skill + hosted MCP. No `supabase start` |
| DNS / Turnstile | `docs/CLOUDFLARE-NAMESERVERS.md` |
| Hostinger | Hostinger MCP + confirm-destructive-actions. Not this shop’s host |
| Firecrawl / Tavily | Research only. Forbidden as Filter King catalog source |
| Apify | `apify` subagent first if the user names Apify |
