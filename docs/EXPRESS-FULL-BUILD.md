# EXPRESS+ FULL BUILD

**Filter Hero’s definitive Express install — how the Node process is wired, connected, and kept.**

This is not a generic Express tutorial. It is the exact architecture of this repository: the files that mount the API, the order middleware boots, the contracts every handler honors, and the issues that settled those contracts. If a later change fights this document, the live code plus [ISSUES-AND-FIXES.md](ISSUES-AND-FIXES.md) win — then this file must be updated.

Sister installs: [UI FULL BUILD.md](./UI%20FULL%20BUILD.md) (the SPA Express serves), [RAILWAY-FULL-BUILD.md](./RAILWAY-FULL-BUILD.md) (the host), [STRIPE-FULL-BUILD.md](./STRIPE-FULL-BUILD.md), [KLAVIYO-FULL-BUILD.md](./KLAVIYO-FULL-BUILD.md), [RESEND-FULL-BUILD.md](./RESEND-FULL-BUILD.md), [SUPABASE-AND-POSTGRES-FULL-BUILD.md](./SUPABASE-AND-POSTGRES-FULL-BUILD.md).

**Canonical issue log:** every `FH-XXX` with full **Do / Do NOT / Files / Verify** lives in `docs/ISSUES-AND-FIXES.md`. This guide includes the Express laws those tickets produced, every open item that touches the process, and the complete index. Next unused id is **FH-307**. There is no FH-036 (never assigned). FH-001–FH-030 were never logged.

**Last aligned to the live tree:** 2026-09-20.

---

## 1. What Express is in this project

Express is **the only Node HTTP server**. There is no Next.js, no Remix, no Fastify, no Nest, no Koa, no `http.createServer` handler besides the one wrapping this `app`. There is no separate frontend process in production.

Two topologies, one codebase:

| Mode | Shopper origin | Express | Who serves HTML |
|---|---|---|---|
| `pnpm dev` | Vite `:3000` | `:3001` (`PORT` or 3001) | Vite for the SPA. Express still injects SEO HTML on `:3001` for crawlers / `pnpm smoke` (FH-198). Vite **proxies** `/api`, sitemap, robots, llms, ai.txt to Express. |
| `pnpm start` | Express `PORT` or 3000 | same process | Express static `dist/public` + per-route `injectSeoIntoHtml`. React hydrates after. |

Live `https://filterhero.net` is that production process on Railway. Hikari terminates TLS and forwards `X-Forwarded-*`. Express sets `trust proxy` to `1` so `req.ip` and `req.secure` are the shopper, not the proxy (FH-205). Apex is DNS-only, so **Express must set CSP / HSTS** — Cloudflare does not.

Express’s job is narrow and load-bearing:

| Express does | Express does not |
|---|---|
| Host every `/api/*` route | Query Postgres from the browser |
| Verify Stripe webhook signatures on a **raw** body | Recalculate tax |
| Inject per-path SEO into `index.html` | Own the client router (that is wouter) |
| Gate `/api/crm`, `/api/admin`, `/api/intuit` with `requireStaff` | Trust `AdminShell` as authorization |
| Gate `/api/account` with `requireCustomer` | Decode JWTs locally |
| Persist leads / orders / Intuit tokens / staff config JSON | Replace Supabase as the queryable CRM |
| Set security headers on every response | Use `helmet`, `cors`, or `morgan` |
| Rate-limit public POSTs in memory | Use Redis / `express-rate-limit` |
| Fail-closed Turnstile in production | Skip the bot gate when the secret is missing (except Filter Clock `intent=reminder`) |

One shopper message, one sender (`shared/email-channels.ts`) — Express only **calls** those owners; it is not a fourth mailbox:

- **Stripe** = payment receipt
- **Resend** = branded order confirmation + quote/support receipts
- **Klaviyo** = welcome, abandon, nurture, replenish, win-back, campaigns
- **CRM** = staff pipeline in Postgres. Never mail.

Do not add a Klaviyo order-confirmation or quote-receipt flow. Do not trigger welcome, abandon, replenish, or a receipt from **Successfully Paid**.

---

## 2. Install — the kit that is live

### 2.1 Dependencies (from `package.json`)

**Runtime that is Express**

- `express` `^4.21.2` — Express 4. Not 5.
- `@types/express` `4.17.21` (dev) — pin stays on 4 while the runtime is 4.

**Runtime Express imports**

- `dotenv` — `import "dotenv/config"` is the first line of `server/index.ts`
- `zod` — every public body and several query strings
- `nanoid` — lead ids, order ids
- `@supabase/supabase-js` — Auth `getUser` + service-role Postgres (`server/db.ts`, `server/auth.ts`)
- `stripe` — Checkout + webhook `constructEvent`
- `resend` — via `server/mailer.ts`, not from the router file

**Build that produces the process**

```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
"start": "cross-env NODE_ENV=production node dist/index.js"
```

- `tsx` — `pnpm dev:server` = `tsx watch server/index.ts`
- `esbuild` — bundles **our** `server/` + `shared/` into `dist/index.js`
- `--packages=external` — `express`, `stripe`, `@supabase/supabase-js`, `resend`, `zod`, `dotenv` stay in `node_modules` at runtime. Do not drop this flag or the image must vendor those packages into the bundle.
- `"type": "module"` — ESM. `import express from "express"`. No `require("express")` in app code.
- `cross-env NODE_ENV=production` — Windows-safe. Railway still gets `NODE_ENV=production` from this script.

**Not installed (do not add “just in case”)**

| Package | Why it is absent |
|---|---|
| `express@5` | This tree is 4. `app.get("*")` and `req.path` semantics stay 4. |
| `helmet` | Headers live in `shared/security-headers.ts` + `applySecurityHeaders` (FH-205). |
| `cors` | Production is same-origin. Dev is the Vite proxy. |
| `cookie-parser` | Intuit OAuth parses `Cookie` by hand in `server/intuit/routes.ts`. |
| `express-session` / `passport` | Sessions are Supabase JWTs on `Authorization: Bearer`. |
| `morgan` / `compression` / `multer` | Not used. JSON bodies only, 1 mb cap. |
| `body-parser` as a direct dep | Express 4 still depends on it; **we never import it**. `express.json` / `express.raw` are the public API. |
| `express-rate-limit` | In-process `makeLimiter` in `server/security.ts`. One replica (FH-182). |
| `http-proxy-middleware` | Vite owns the dev proxy. |
| `@types/express` v5 | Would lie about a v4 runtime. |

`pnpm` is the package manager (`packageManager` pinned). `npm install express` is not how this shop is installed.

### 2.2 Commands

```bash
pnpm install          # lockfile is pnpm. packageManager is pinned.
pnpm dev              # concurrently: API 3001 + Vite 3000
pnpm dev:server       # tsx watch server/index.ts
pnpm dev:client       # Vite only --host
pnpm build            # vite → dist/public  AND  esbuild → dist/index.js
pnpm start            # NODE_ENV=production node dist/index.js  (PORT or 3000)
pnpm check            # tsc --noEmit (includes server/**)
pnpm smoke            # Playwright/fetch storefront invariants against Vite + Express
pnpm verify:security  # headers, JSON errors, Turnstile fail-closed, limiters, staff 503
pnpm verify:crm       # staff gate + CRM pipeline
pnpm verify:account   # shopper isolation
pnpm verify:admin     # staff console API
pnpm verify:env       # required names, no VITE_ service role
```

Local shoppers use **http://127.0.0.1:3000**. Do not debug the shop by opening `:3001` in the browser except when checking crawler HTML (FH-198) or `/api/health`.

### 2.3 TypeScript

One `tsconfig.json` covers `client/src`, `shared`, `server`, and `scripts`. `noEmit: true`. Paths:

```
@/*        → client/src/*
@shared/*  → shared/*
```

Server files import `../shared/...` with relative paths, not `@shared`, because esbuild’s entry is `server/index.ts` and the Vite alias is a client concern. FH-042: do **not** put `baseUrl` back.

`tsconfig.node.json` is **only** `vite.config.ts`. It is not the Express compile.

---

## 3. Directory map

```
FILTER HERO/
├── server/
│   ├── index.ts              # THE process: middleware order, public routes, listen
│   ├── security.ts           # headers, limiters, Turnstile, publicError, jsonBodyError
│   ├── auth.ts               # requireStaff / requireCustomer (Bearer → Supabase getUser)
│   ├── db.ts                 # service-role client; crmHealth / accountHealth / boot log
│   ├── data-store.ts         # DATA_DIR or <cwd>/server/data  (FH-122)
│   ├── contact.ts            # POST /api/contact implementation
│   ├── stripe.ts             # Checkout Session + webhook + orders.json
│   ├── stripe-webhooks.ts    # account context / scrub / health (scripts + admin)
│   ├── klaviyo.ts            # identify/track/catalog/health — no shopper mail
│   ├── klaviyo-stripe.ts     # native Klaviyo Stripe app (charge/invoice only)
│   ├── mailer.ts             # Resend
│   ├── account.ts            # shopper profile / saved filters / purchase attach
│   ├── account-routes.ts     # /api/account router
│   ├── admin/
│   │   ├── routes.ts         # /api/admin router
│   │   ├── config.ts         # site-config.json
│   │   └── data.ts           # overview snapshots (reads JSON + Postgres)
│   ├── crm/
│   │   ├── routes.ts         # /api/crm router
│   │   ├── schema.ts         # zod + result types
│   │   ├── contacts.ts / deals.ts / activities.ts / audit.ts / intake.ts
│   └── intuit/
│       ├── routes.ts         # GET /api/intuit/oauth/callback (public redirect)
│       ├── oauth.ts          # connect/status/disconnect used by admin
│       └── store.ts          # intuit-oauth.json on DATA_DIR
├── shared/                   # catalog, SEO, CSP, email-channels, site-config
│   ├── seo.ts                # sitemapPaths, resolveDocumentSeo, injectSeoIntoHtml
│   ├── security-headers.ts   # CSP / HSTS map used by Express AND Vite
│   └── email-channels.ts     # who may send which shopper message
├── client/                   # Vite SPA (not this document’s install)
├── dist/                     # build output — never a source of DATA_DIR (FH-122)
│   ├── index.js              # production Express
│   └── public/               # SPA assets; Express serves with index: false
├── server/data/              # local JSON (leads, orders, site-config, intuit)
├── vite.config.ts            # :3000 + proxy → :3001
├── package.json
└── docs/ISSUES-AND-FIXES.md
```

---

## 4. The boot sequence (exact order — this is the install)

`startServer()` in `server/index.ts` is the wiring. Reordering it re-opens tickets.

```
dotenv/config
express()
  disable("x-powered-by")
  set("trust proxy", 1)
  use(applySecurityHeaders)
http.createServer(app)

POST /api/stripe/webhook   express.raw({ type: "application/json" })   ← BEFORE json()
use(express.json({ limit: "1mb" }))
use(jsonBodyError)

GET  /sitemap.xml  /robots.txt  /llms.txt  /llms-full.txt  /ai.txt
GET  /api/health
GET  /api/health/detail          requireStaff
GET  /api/site-config
GET  /api/products
GET  /api/checkout/session
POST /api/checkout               checkoutLimiter
POST /api/contact                contactLimiter
GET  /api/klaviyo/config
GET  /api/klaviyo/health         requireStaff
GET  /api/klaviyo/catalog.json
POST /api/identify               identifyLimiter
POST /api/track                  trackLimiter

use("/api/crm",     crmRouter())       crmLimiter + requireStaff
use("/api/account", accountRouter())   accountLimiter + requireCustomer
use("/api/admin",   adminRouter())     adminLimiter + requireStaff
use("/api/intuit",  intuitRouter())    public OAuth callback only

prod:  express.static(dist/public, { index: false })
       GET *  → sendDocument(index.html)
dev:   GET *  → sendDocument(client/index.html) unless /api

use(unexpectedError)
listen(PORT || prod 3000 || 3001)   EADDRINUSE retry × 8
logCrmBoot()
```

### 4.1 Why this order is load-bearing

1. **`x-powered-by` off, then headers.** Express 4 still adds `X-Powered-By: Express` unless disabled. `applySecurityHeaders` also `removeHeader("X-Powered-By")`. FH-205. Live `filterhero.net` sending that header meant the old `main` build was still up (FH-187).
2. **`trust proxy 1` before any limiter.** Rate limits key on `req.ip`. Without trust proxy, every Railway shopper is the Hikari hop. With a homemade `X-Forwarded-For[0]` parse, a client puts a random IP first and skips the limiter. FH-205: use `req.ip` only.
3. **Webhook raw body before `express.json`.** `stripe.webhooks.constructEvent` needs the exact bytes. If `express.json` runs first, `req.body` is an object and the signature fails. Comment in source: “Stripe webhook needs raw body — register before json parser.”
4. **`jsonBodyError` immediately after `express.json`.** Malformed JSON used to dump a body-parser HTML stack. Now `{ error: "Invalid JSON.", code: "invalid_json" }`. Oversize is `413` / `payload_too_large`. FH-205, `pnpm smoke`.
5. **Crawler documents before the SPA catch-all.** `/robots.txt` and `/llms.txt` are generated here so they cannot lag `client/public` copies (FH-130). Vite proxies those paths in dev.
6. **Routers after public JSON routes.** A greedy `GET *` must not swallow `/api`. The prod catch-all is after static. The dev catch-all skips `req.path.startsWith("/api")`.
7. **`unexpectedError` last.** Four-argument Express error middleware. Fixed body `{ error: "Something went wrong.", code: "internal_error" }`. If headers already went out, it `next(err)`s.
8. **Listen retries.** `http.Server` `'error'` on `EADDRINUSE` retries 8 times, 400 ms apart, then `process.exit(1)`. `tsx watch` restarts can hit a still-bound port.

### 4.2 `sendDocument`

```ts
const sendDocument = (req, res, indexPath) => {
  const html = fs.readFileSync(indexPath, "utf8");
  const seo = resolveDocumentSeo(req.path, siteUrl);
  res.type("html").send(injectSeoIntoHtml(html, seo));
};
```

Production: `staticPath = path.resolve(__dirname, "public")` next to `dist/index.js` → `dist/public`. `{ index: false }` so `/` goes through inject, not a raw `index.html`.

Development: `client/index.html`. Without this, `pnpm smoke` hitting `:3001/sizes/20x25x1` was 404 (`size SSR 404`) even though Vite was 200 (FH-198). Vite does **not** inject `jsonld-ssr`. Smoke must hit Express for size JSON-LD.

`siteUrl` is `SITE_URL` || `VITE_SITE_URL` || `https://filterhero.net`. `clientUrl` (Stripe success/cancel redirects) is `CLIENT_URL` || (prod `siteUrl` || `http://localhost:3000`).

---

## 5. Two topologies — how Express is connected

```
LOCAL
  browser  →  Vite :3000
                │  proxy /api, /sitemap.xml, /robots.txt, /llms.txt, /llms-full.txt, /ai.txt
                ▼
              Express :3001
                │
                ├─ Stripe CLI  stripe listen → localhost:3001/api/stripe/webhook
                ├─ Supabase    service role + Auth getUser
                ├─ Klaviyo     private key (server)
                ├─ Resend      transactional
                └─ server/data/*.json

PRODUCTION
  https://www.filterhero.net  →  Cloudflare 301 → https://filterhero.net/$1
  https://filterhero.net      →  Railway TLS → FILTER-HERO :$PORT  (Express)
                │
                ├─ GET /              static + SEO-injected index.html
                ├─ GET /api/health    { ok, brand: "Filter Hero" }
                ├─ POST /api/stripe/webhook   raw body, FILTER HERO live only
                ├─ volume /data       DATA_DIR
                ├─ Supabase / Stripe / Klaviyo / Resend
                └─ one replica us-east4-eqdc4a  (FH-182)
```

Vite proxy (`vite.config.ts`):

```ts
proxy: {
  "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
  "/sitemap.xml": { target: "http://127.0.0.1:3001", changeOrigin: true },
  "/robots.txt":  { target: "http://127.0.0.1:3001", changeOrigin: true },
  "/llms.txt":    { target: "http://127.0.0.1:3001", changeOrigin: true },
  "/llms-full.txt": { target: "http://127.0.0.1:3001", changeOrigin: true },
  "/ai.txt":      { target: "http://127.0.0.1:3001", changeOrigin: true },
}
```

Dev CSP on the Vite server comes from the **same** `securityHeaderMap({ production: false, hsts: false })` Express uses. FH-209 / FH-212: localhost HTTP shop must allow `http://a.klaviyo.com` (Chrome drops `http://*.klaviyo.com` as a source). Production CSP must **not** allow plaintext Klaviyo; it sends `upgrade-insecure-requests`.

Railway injects `PORT`. It is **not** a dashboard variable and must not be hardcoded to `3001` on the live service. Local `.env` is `PORT=3001`. `verify:env` asserts that for `.env`, not for Railway.

There is **no** Dockerfile, Procfile, `railway.toml`, or Nixpacks config. Railpack runs `pnpm build` then `pnpm start`. See [RAILWAY-FULL-BUILD.md](./RAILWAY-FULL-BUILD.md).

---

## 6. Route table — every path Express owns

### 6.1 Crawler / document (no `/api` prefix)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/sitemap.xml` | public | `sitemapPaths()` + `SITE_URL` |
| GET | `/robots.txt` | public | Allow `/`; Disallow checkout, admin, login, account, `/api/`. AI bots allowed (FH-130). |
| GET | `/llms.txt` | public | `buildLlmsTxt` |
| GET | `/llms-full.txt` | public | `buildLlmsFullTxt` |
| GET | `/ai.txt` | public | `buildAiTxt` |
| GET | `*` (non-API) | public | SEO-injected SPA. `/admin`, `/login`, `/account` are `noindex` via `resolveDocumentSeo`. |

Prefer these Express generators in production over `client/public` copies (FH-130).

### 6.2 Public API (`server/index.ts`)

| Method | Path | Limiter | Body | Success |
|---|---|---|---|---|
| GET | `/api/health` | — | — | `{ ok: true, brand: "Filter Hero" }` — **the** liveness probe (FH-306). Do not healthcheck `/`. |
| GET | `/api/site-config` | — | — | `{ ok, data: publicSiteConfig() }` — FAQs, featured sizes, maintenance copy |
| GET | `/api/products` | — | — | size counts, thicknesses, MERV keys — not the full SKU dump |
| GET | `/api/checkout/session` | — | `?session_id=` | paid / unpaid for the success page (FH-121) |
| POST | `/api/checkout` | 10 / 15 min | `{ items, email?, marketingConsent? }` | `{ url }` Stripe Checkout. `503` + `maintenance` when paused. |
| POST | `/api/contact` | 5 / 15 min | `contactSchema` | `{ ok, id, emailed }` even when mail fails (FH-124) |
| GET | `/api/klaviyo/config` | — | — | public site id + onsite flags |
| GET | `/api/klaviyo/catalog.json` | — | — | contractor feed (293 SKUs — FH-300 live still 299) |
| POST | `/api/identify` | 20 / min | email + optional profile | `{ ok, error }` — never raw Zod (FH-205) |
| POST | `/api/track` | 40 / min | metric allowlist | unknown metric → `400 unknown_metric` |
| POST | `/api/stripe/webhook` | — | **raw JSON** | `{ received: true }` |

Checkout body (zod): 1–50 line items, `productId` positive int, `quantity` 1–50, optional email, optional marketingConsent.

Track metrics the browser may fire (`CLIENT_METRICS` in `server/klaviyo.ts`):

```
Viewed Product | Viewed Size | Added to Cart | Selected MERV | Active on Site
```

Identify properties whitelist: `house_type`, `change_interval_days`, `preferred_merv`. Everything else is dropped. Event sanitizer: max 40 keys, 8 KB, depth 3, blocks `__proto__` / `$email`, keeps `$value`.

### 6.3 Staff-only (not a router)

| Method | Path | Gate |
|---|---|---|
| GET | `/api/health/detail` | `requireStaff` — crm + account + klaviyo |
| GET | `/api/klaviyo/health` | `requireStaff` |

### 6.4 `/api/account` — `accountRouter()`

Every route: `accountLimiter` (60 / min) then `requireCustomer`.

| Method | Path |
|---|---|
| GET | `/health` |
| GET | `/` |
| PATCH | `/` |
| POST | `/filters` |
| DELETE | `/filters/:id` |

The session email is the only identity used to load orders. A request body cannot ask for someone else’s history.

### 6.5 `/api/crm` — `crmRouter()`

Every route: `crmLimiter` (60 / min) then `requireStaff`. **Nothing here sends email.**

| Method | Path |
|---|---|
| GET | `/health` `/stages` `/deals` `/deals/:id` |
| POST | `/deals` `/activities` `/activities/:id/complete` `/contacts` |
| PATCH | `/deals/:id` |

Disabled CRM is `503` `crm_disabled`. Missing row is `404`. Database failure is `502` with a **fixed** string (not Postgres text). Quotes still save to `leads.json` if CRM is off.

### 6.6 `/api/admin` — `adminRouter()`

Every route: `adminLimiter` (80 / min) then `requireStaff`. Reads `orders.json`, `leads.json`, `site-config.json`, and Postgres. Does not send mail. Does not write Klaviyo except the explicit `POST /klaviyo-stripe/connect`.

| Method | Path |
|---|---|
| GET | `/overview` `/orders` `/orders/:id` `/leads` `/customers` `/customers/:id` `/contacts` `/audit` `/catalog` `/analytics` `/tracking` `/health` `/security` `/staff` `/settings` `/maintenance` `/config` |
| PATCH | `/config` |
| POST | `/klaviyo-stripe/connect` `/intuit/connect` `/intuit/disconnect` |
| GET | `/intuit/status` |

`POST /intuit/connect` sets cookie `fh_intuit_oauth_state` (`HttpOnly`, `SameSite=Lax`, `Max-Age=600`, `Secure` in production) and returns `{ url }`. Staff Connect errors stay JSON on the page (FH-225) — they must not fall through as an uncaught `internal_error`.

### 6.7 `/api/intuit` — `intuitRouter()`

Public **GET** `/oauth/callback` only. Staff connect/status/disconnect live on `/api/admin/intuit/*`. Callback compares cookie state vs query `state`, clears the cookie, redirects to `{origin}/admin/settings?intuit=…`.

Local `INTUIT_REDIRECT_URI=http://localhost:3001/api/intuit/oauth/callback` (Express, not Vite). Live: `https://filterhero.net/api/intuit/oauth/callback`.

---

## 7. Security — how hardening is installed

There is no `helmet()`. One map, two servers:

```
shared/security-headers.ts   securityHeaderMap({ production, hsts })
        │
        ├─ server/security.ts  applySecurityHeaders   (every Express response)
        └─ vite.config.ts      server.headers         (dev SPA)
```

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera/microphone/geolocation/payment/usb `()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Content-Security-Policy` | `buildContentSecurityPolicy(mode)` |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` **only** when `production && req.secure` |
| `X-Powered-By` | **absent** |

CSP connect-src always includes `'self'`, `https://*.supabase.co`, `wss://*.supabase.co`, Turnstile, `https://*.klaviyo.com`, `https://static.klaviyo.com`. Development adds localhost + `http://a.klaviyo.com`. Production adds `upgrade-insecure-requests` and must not list plaintext Klaviyo. `form-action` allows `'self'` and `https://checkout.stripe.com`. `frame-src` is Turnstile only. `frame-ancestors 'none'`.

### 7.1 Error bodies are fixed strings

`publicError(err, { code, message })`:

- `ZodError` → `400` + the **fallback** message (never Zod’s path dump — FH-200, FH-205).
- Other `Error` → same fallback. `"not configured"` in the message becomes `503`.
- Optional `log` argument `console.error`s the real error server-side.

`verify:security` asserts a fake `sk_live_` in `Error.message` never reaches the JSON body.

### 7.2 Limiters

In-memory `Map<ip, timestamps[]>`. One replica, so this is enough. A second region would split the counters and was already forbidden for deploy reasons (FH-182).

| Limiter | Window | Max | Code |
|---|---|---|---|
| `contactLimiter` | 15 min | 5 | `rate_limited_contact` |
| `identifyLimiter` | 1 min | 20 | `rate_limited_identify` |
| `trackLimiter` | 1 min | 40 | `rate_limited_track` |
| `checkoutLimiter` | 15 min | 10 | `rate_limited_checkout` |
| `accountLimiter` | 1 min | 60 | `rate_limited_account` |
| `crmLimiter` | 1 min | 60 | `rate_limited_crm` |
| `adminLimiter` | 1 min | 80 | `rate_limited_admin` |

Smoke: a 429 on contact is **not** a Turnstile miss (FH-301, FH-200). Do not raise the limiter to make smoke green.

### 7.3 Turnstile

`verifyTurnstile` posts to Cloudflare `siteverify` with the shopper IP (`req.ip` after trust proxy).

| Context | Behavior |
|---|---|
| `NODE_ENV !== production` and no secret | skip (local smoke can post) |
| production, secret missing | **fail closed** (FH-205) |
| secret configured, token missing | fail |
| `intent === "reminder"` | never required (FH-131 — Clock must not mail before a purchase; the reminder form stays widget-free) |

`POST /api/contact` maps a failed check to `400` `{ error: "Could not verify that form.", code: "bot_check_failed" }`. Honeypot field `website`: non-empty returns `{ ok: true, id: "ignored" }` so bots think they won.

Contact save order (FH-124): append `leads.json` **first**, then CRM (fail-soft), then Klaviyo (fail-soft), then Resend. Mail failure still returns `{ ok: true, id, emailed: false }`.

---

## 8. Auth — how the gates are connected

`server/auth.ts` extends `Express.Request` with `staff?` and `customer?`.

```
Authorization: Bearer <access_token>
        │
        ▼
createClient(url, anonKey) → auth.getUser(token)     // live verify, not a local JWT decode
        │
        ├─ requireCustomer  → req.customer = { id, email }
        └─ requireStaff     → same, AND email ∈ STAFF_EMAILS
```

Rules:

1. A valid token only proves the holder controls **some** inbox. Staff is the allowlist (`STAFF_EMAILS=info@filterhero.net`).
2. Unconfigured staff gate is `503 auth_not_configured` — fail closed, never an open door.
3. Missing bearer: `401 unauthenticated`.
4. Bad token **or** not on the allowlist: same `403 forbidden` body. A prober learns nothing about who is staff.
5. Auth outage: `503 auth_unavailable`.
6. Shopper login is email + password. Staff login is magic link / OTP. Different pages, same JWT shape on the API.
7. `SUPABASE_SERVICE_ROLE_KEY` never goes in a `VITE_` var. The browser never talks to PostgREST. Isolation is Express + `where` on the actor, not a Postgres policy (RLS deny-by-default, zero policies, grants revoked — FH-205, `0004_lock_browser_grants.sql`).

`isAuthConfigured()` needs URL + anon key + a non-empty staff list. `isCustomerAuthConfigured()` needs URL + anon key only.

---

## 9. Persistence — JSON that must survive the process

```ts
// server/data-store.ts
export function dataFile(name: string): string {
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), "server", "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}
```

FH-122: the first production paths used `__dirname/data`. `dist/index.js` wrote `dist/data/`, which a redeploy wipes. **Do not** resolve lead/order files from the bundled file’s directory.

| File | Writer | Reader |
|---|---|---|
| `leads.json` | `contact.ts` | admin leads, CRM intake already copied to Postgres |
| `orders.json` | Stripe webhook (`sessionId` unique — FH-123) | success lookup, admin, shopper account |
| `site-config.json` | `PATCH /api/admin/config` | `GET /api/site-config`, checkout pause |
| `intuit-oauth.json` | Intuit OAuth | admin Connect |

Local: `DATA_DIR` unset → `<cwd>/server/data`. Railway: `DATA_DIR=/data` on volume `filter-hero-volume`. Catalog SKUs and prices ship in git (`shared/`). The volume is for **writes after boot**.

Webhook order insert skips when `sessionId` already exists (FH-123). Resend confirmation stamps `confirmationSentAt` so retries do not send a second branded mail (FH-292). Klaviyo **Placed Order** is the shop webhook’s job; native Klaviyo Stripe is charge/invoice only.

---

## 10. Environment Express reads

Vite `envDir` is the repo root. Only `VITE_*` is baked into the browser. Express reads `process.env` at **request time** (except anything the client already bundled).

| Variable | Role for Express |
|---|---|
| `PORT` | listen. Local 3001. Railway injected. |
| `NODE_ENV` | `production` → static SPA, Turnstile fail-closed, HSTS when `req.secure`, `clientUrl` defaults to `SITE_URL` |
| `SITE_URL` / `VITE_SITE_URL` | canonical origin for sitemap, robots, JSON-LD, Klaviyo catalog links |
| `CLIENT_URL` | Stripe success/cancel + Intuit settings redirect in dev |
| `DATA_DIR` | JSON root. Railway `/data`. |
| `STRIPE_SECRET_KEY` | Checkout + webhook verify |
| `STRIPE_WEBHOOK_SECRET` | `constructEvent`. Local = `stripe listen`. Railway = Dashboard endpoint. Never mix (FH-294). |
| `CONTACT_TO` / `RESEND_*` | mailer |
| `KLAVIYO_PRIVATE_API_KEY` | server only |
| `KLAVIYO_PUBLIC_API_KEY` | onsite config payload |
| `KLAVIYO_LIST_ID` | `RiTKiS` |
| `TURNSTILE_SECRET_KEY` | `siteverify` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth verify (falls back to `VITE_` twins) |
| `SUPABASE_SERVICE_ROLE_KEY` | Postgres. Never `VITE_`. |
| `STAFF_EMAILS` | staff gate |
| `CRM_DISABLE` / `ACCOUNT_DISABLE` | `1` turns the service-role path off; JSON leads still save |
| `FULL_CATALOG` | API catalog universe. Must match `VITE_FULL_CATALOG` (FH-303). |
| `INTUIT_*` | OAuth. Redirect hits **this** process. |

Do not put secrets in this file, in git, or in `VITE_` keys.

Open production gap: **FH-305**. Railway still holds FILTER HERO **sandbox test** keys. Real cards cannot pay until Railway gets FILTER HERO **live** `sk_live_` / `pk_live_` and a rebuild. Do **not** copy local `STRIPE_SECRET_KEY` onto Railway.

---

## 11. How to add a route the Filter Hero way

1. Decide the surface: public in `server/index.ts`, or a gated router (`crm` / `account` / `admin`).
2. Put the limiter on the route **before** the handler. Public POSTs always get one.
3. Parse with zod. Catch with `publicError` / `invalidRequest`. Never `res.json(err)` or `err.message`.
4. Staff mutations take `req.staff` into the audit log. Shopper reads filter on `req.customer`.
5. Do not send mail from CRM or admin. Call `mailer.ts` or Klaviyo from the existing owners (`contact.ts`, `stripe.ts` webhook).
6. If the body must be raw (signatures), register the route **above** `express.json`.
7. If the response is HTML for a crawler, go through `sendDocument` / `injectSeoIntoHtml`, not a second template engine.
8. Add a `pnpm verify:*` or `pnpm smoke` assertion. A route without a probe will drift.
9. Log the ticket in `docs/ISSUES-AND-FIXES.md` with the next `FH-XXX`. Update this file if the boot order or a contract changed.

Do not add `app.use(cors())`. Do not add `app.use(express.json())` a second time. Do not mount a second Express app. Do not listen on a second port in production.

---

## 12. Verify before calling Express done

```bash
pnpm check
pnpm verify:security
pnpm verify:crm
pnpm verify:account
pnpm verify:admin
pnpm smoke
curl.exe -sI http://127.0.0.1:3001/api/health
```

Health headers must include `nosniff` and must **not** include `X-Powered-By`. Empty identify is `{"code":"identify_failed"}` (or the limiter code). Malformed JSON is `invalid_json`, not a SyntaxError page. `GET http://127.0.0.1:3001/sizes/20x25x1` includes `application/ld+json`.

Production: `https://filterhero.net/api/health` → `{"ok":true,"brand":"Filter Hero"}`. Desired Railway `deploy.healthcheckPath=/api/health` is still **unset** (FH-306).

---

## 13. Issues and fixes

**Canonical full text (Do / Do NOT / Files / Verify / dates):** [ISSUES-AND-FIXES.md](ISSUES-AND-FIXES.md).

Ids: **FH-031 … FH-306** (277 tickets). Gap: **FH-036**. Prefix never reused. Next: **FH-307**.

Statuses used: `open` | `fixed` | `mitigated` | `wontfix` | `superseded`.

This section is the complete catalog. Express-shaped tickets are called out in §13.1–13.2 so the process cannot be “simplified” back into the bugs those ids paid for.

### 13.1 Open (full entries that touch this process)

#### FH-031 — Filter Clock days must be 30 / 60 / 90 / 180 only

- **Status:** open · **Area:** clock
- **Symptom:** Clock and calendar can show other intervals (120 / 270 / 330 bases).
- **Do NOT:** Keep those bases or that rounding. Do not have Express mail a replacement before a purchase (FH-131).
- **Do:** Snap every day count to 30, 60, 90, or 180. Reminder posts skip Turnstile (`intent=reminder`).
- **Added:** 2026-08-20

#### FH-135 — Full-catalog Filtrete match still leaves pack, MERV, and thick-size gaps

- **Status:** open · **Area:** pricing
- **Do NOT:** Pretend the Model Pricing allowlist is a full Filtrete match, or flip Railway `FULL_CATALOG=true` to “fill gaps” (FH-303).
- **Added:** 2026-08-29

#### FH-254 — Stripe Checkout still prints Free next to a $0 shipping option

- **Status:** open · **Area:** cart
- **Symptom:** Shop copy no longer promises free shipping, but hosted Checkout can still render “Free.”
- **Do NOT:** Put “free shipping” back on the shop (FH-253) or special-case it in `/api/checkout`.
- **Do:** Fix the Checkout shipping option label in Stripe.
- **Files:** `server/stripe.ts` / Stripe Dashboard shipping
- **Added:** 2026-09-20

#### FH-300 — Production Klaviyo JSON feed still serves a 299-SKU mix

- **Status:** open · **Area:** other
- **Symptom:** Local `GET /api/klaviyo/catalog.json` is Model Pricing SKUs. Live `https://filterhero.net/api/klaviyo/catalog.json` is still 299.
- **Do NOT:** Point Klaviyo’s custom catalog at the live JSON feed while production is on the old mix.
- **Do:** Deploy the current shop so the public Express feed is 293. `pnpm smoke` fails if local catalog.json is not 293.
- **Files:** `scripts/smoke-site.ts`, `server/klaviyo.ts`, `server/index.ts`
- **Added:** 2026-09-20

#### FH-302 — Add to cart leaves focus on a button Radix then marks aria-hidden

- **Status:** open · **Area:** cart (UI; Express already recorded **Added to Cart** if the client posted `/api/track`)
- **Added:** 2026-09-20

#### FH-303 — Railway FULL_CATALOG=true conflicts with the Model Pricing shop

- **Status:** open · **Area:** catalog
- **Symptom:** Local flags are `false` (293 SKUs). Railway has both `true`. The next rebuild would sell the archive through `/api/checkout` and `/api/klaviyo/catalog.json`.
- **Do NOT:** Leave Railway `VITE_FULL_CATALOG=true`. Do not `railway up` a dirty branch to “fix” the feed.
- **Do:** Set both flags `false` on FILTER-HERO, rebuild from `main`.
- **Added:** 2026-09-20

#### FH-304 — GitHub autodeploy and `railway up` both own FILTER-HERO

- **Status:** open · **Area:** other
- **Do NOT:** `railway up` a feature branch while GitHub watches the repo. That ships a different Express image than `main`.
- **Do:** Pin `source.branch=main`. Production deploys from `main` only.
- **Added:** 2026-09-20

#### FH-305 — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO

- **Status:** open · **Area:** other
- **Do NOT:** Copy local `STRIPE_SECRET_KEY` onto Railway. Do not point sandbox webhooks at `https://filterhero.net/api/stripe/webhook`.
- **Do:** Live `sk_live_` / `pk_live_` on Railway; webhook secret from `pnpm setup:stripe-webhook` against that live key. Raw-body route stays FILTER HERO live only.
- **Added:** 2026-09-20

#### FH-306 — Railway has no HTTP healthcheck

- **Status:** open · **Area:** other
- **Symptom:** FILTER-HERO is Online and `/api/health` returns 200, but `deploy.healthcheckPath` is unset. Railway will mark a deploy SUCCESS before Express is listening.
- **Do NOT:** Add a second region to attach healthchecks (FH-182). Do not healthcheck `/`.
- **Do:** `deploy.healthcheckPath=/api/health` and `healthcheckTimeout=30`. Keep one replica in `us-east4-eqdc4a`.
- **Files:** `.railway/config.json`
- **Verify:** `https://filterhero.net/api/health` is `{"ok":true,"brand":"Filter Hero"}`.
- **Added:** 2026-09-20

### 13.2 Express law extracted from the log (do not regress)

These are the invariants the tickets paid for. Re-opening the old server is how the bug comes back.

**Process / boot**

- One Express process. Production serves `dist/public` with `index: false` and injects SEO on `GET *` (FH-198).
- Dev Express still injects `client/index.html` so smoke/crawlers see JSON-LD on `:3001`.
- `express` 4, ESM, esbuild `--packages=external`. No Express 5, no second HTTP framework.
- Listen on Railway `PORT`. Local `PORT=3001`. EADDRINUSE retries, then exit.
- `logCrmBoot()` after listen so a missing service role is not silent (FH-188).

**Middleware order**

- Disable `x-powered-by`. `trust proxy 1`. Headers. **Raw webhook. Then JSON. Then jsonBodyError.** Then routes. Then SPA. Then `unexpectedError` (FH-205, Stripe signature).
- Do not parse `X-Forwarded-For[0]` yourself.

**Bodies and errors**

- JSON limit 1 mb. Invalid JSON `invalid_json`. Oversize `payload_too_large`. Uncaught `internal_error`.
- Public handlers use `publicError` fallback strings. Zod text and `sk_live_` never leave the process (FH-200, FH-205).
- Checkout empty body is a shaped 400, not a Zod stack in the logs-as-response.

**Rate limits / bots**

- Identify 20/min, track 40/min, checkout 10/15min, contact 5/15min (FH-190, FH-205).
- Contact 429 is `rate_limited_contact`. Missing Turnstile is `bot_check_failed`. Smoke must accept both (FH-200, FH-301).
- Production Turnstile fail-closed. Reminders skip the widget (FH-131, FH-247).
- Honeypot + lead-saved-even-if-mail-fails (FH-124, FH-197).

**Auth / data plane**

- Bearer → `getUser`. Staff = allowlist. Unconfigured = 503 (FH-188, FH-205).
- Browser never queries Postgres. Service role only behind these gates. No `CREATE POLICY` / `GRANT` to `anon` (FH-205).
- `safeNextPath` rejects `..`, `/admin`, `/api`, `/login`.

**JSON files**

- `DATA_DIR` or `<cwd>/server/data`. Never `__dirname/data` (FH-122).
- Webhook orders unique on `sessionId` (FH-123). Confirmation stamped `confirmationSentAt` (FH-292).
- Success page asks `GET /api/checkout/session` before clearing the cart (FH-121).

**Webhooks / Stripe**

- Shop fulfillment: `https://filterhero.net/api/stripe/webhook` on FILTER HERO **live** only. Events: `checkout.session.completed`, `checkout.session.expired` (FH-203, FH-294).
- Drop live events on a test key and test events on a live key.
- Native Klaviyo Stripe is charge/invoice, not Checkout session events.
- Checkout collects US shipping + phone (FH-120). Tax is Stripe Tax (FH-132, FH-139, FH-211, FH-251) — Express does not invent a tax line.

**SEO / crawlers**

- Express generators for robots / llms / sitemap / ai.txt (FH-130). AI bots allowed. Carbon quote-only in llms.
- Size JSON-LD is the product, not the homepage (FH-194). `og:type=article` on SPA nav is a **client** follow-up (FH-129); first paint is Express inject.
- `www` is not on Railway (FH-181). Apex Express is the shop.

**Staff / Intuit**

- Full admin console, not quotes-only (FH-213). Connect errors stay on the page (FH-225).
- Intuit callback is this process. Tokens on `DATA_DIR`. Production keys on Railway, sandbox in local `.env` (FH-226, FH-227).
- Staff magic links must include live `/admin` redirects (FH-208).

**Klaviyo via Express**

- `/api/identify` and `/api/track` exist; onsite JS may not depend on a one-shot config fetch (FH-192, FH-201).
- Local CSP must allow HTTP Klaviyo identify; production must not (FH-209, FH-212). Client upgrades `http://a.klaviyo.com` → `https://` so CORS is not redirected (FH-231).
- Catalog.json is the Model Pricing allowlist (FH-217, FH-223, FH-300, FH-303).

**Deploy**

- One replica `us-east4-eqdc4a` (FH-182). Healthcheck `/api/health` (FH-306, still open).
- Do not `railway up` a dirty Express tree while GitHub autodeploys `main` (FH-187, FH-201, FH-210, FH-304).

### 13.3 Complete index (FH-031 – FH-306)

| Id | Status | Area | Title |
|---|---|---|---|
| FH-031 | open | clock | Filter Clock days must be 30 / 60 / 90 / 180 only |
| FH-032 | mitigated | header | How to Measure chip belongs with Shop / Brands / Clock / Contact |
| FH-033 | mitigated | header | Clock nav still says Clock, not FILTER CLOCK |
| FH-034 | fixed | header | Custom CTA should read Need a custom size |
| FH-035 | mitigated | measure | Tape-measure diagram missing from product pages |
| FH-037 | mitigated | photos | FAQ heading collage |
| FH-038 | mitigated | catalog | Size-page MERV picker matches catch-section columns |
| FH-039 | mitigated | catalog | MERV chips span their column |
| FH-040 | mitigated | catalog | Size-page MERV note uses catch-page Capture |
| FH-041 | mitigated | catalog | Carbon Capture dots read as black on white |
| FH-042 | mitigated | other | tsconfig `baseUrl` flagged as an error |
| FH-043 | mitigated | catalog | Shop listed SKUs with no wholesale cost |
| FH-044 | mitigated | photos | Pack shot said MERV 8 on every size page |
| FH-045 | mitigated | photos | Pack shots had a vertical MERV plate on the stack |
| FH-046 | mitigated | photos | Every MERV 8 size used the raw Filter King 6-pack |
| FH-047 | mitigated | photos | Official MERV 8 pack shot for every size and pack |
| FH-048 | mitigated | photos | Official MERV 13 pack shot for every size and pack |
| FH-049 | mitigated | photos | Official MERV 11 pack shot for every size and pack |
| FH-050 | mitigated | seo | Navy FAQ answers were too close to the background |
| FH-051 | mitigated | pricing | Leftover Filter King ladders were modeled, not live |
| FH-052 | mitigated | photos | Home hero rebuilt as a live stage, not a painted banner |
| FH-053 | mitigated | photos | Hero art was a pile of overlapping cutouts |
| FH-054 | mitigated | photos | Hero filters were trapped in a glass tray |
| FH-055 | mitigated | photos | Home hero is character only |
| FH-056 | mitigated | photos | Hero used a chopped crop instead of the solo character |
| FH-057 | mitigated | photos | Home hero was a tall scroll region |
| FH-058 | mitigated | photos | Hero product showcase uses clean pack shots |
| FH-059 | wontfix | photos | Home is a single locked hero screen |
| FH-060 | mitigated | photos | MERV 13 hero cutout must keep the original product |
| FH-061 | mitigated | photos | Home hero felt like a static catalog row |
| FH-062 | mitigated | photos | Hero character crowded out the filter shots |
| FH-063 | mitigated | photos | Hero filters and brands sat in separate corners |
| FH-064 | mitigated | photos | Hero headline did not use the logo font |
| FH-065 | mitigated | photos | Logo font change was not visible in the hero |
| FH-066 | mitigated | photos | Hero cast sat too far left over the copy |
| FH-067 | mitigated | photos | Hero cast needed another nudge right |
| FH-068 | mitigated | photos | Hero filters sat too close to the character |
| FH-069 | mitigated | photos | Hero filters needed a guarantee line above them |
| FH-070 | mitigated | photos | Hero character sat too low under the filters |
| FH-071 | mitigated | photos | Carbon and MERV 13 hero captions duplicated the boxes |
| FH-072 | mitigated | photos | Hero brand fit claim was easy to miss |
| FH-073 | mitigated | photos | Hero character was a frozen still |
| FH-074 | mitigated | photos | Hero restaged left, header stays on the first screen |
| FH-075 | mitigated | header | Header character icon looked blank after the public swap |
| FH-076 | mitigated | photos | Hero character sat too far forward |
| FH-077 | mitigated | photos | Hero background hugged the left crop |
| FH-078 | mitigated | photos | Hero stage wash no longer matched the preview |
| FH-079 | mitigated | photos | Hero looked like two different backgrounds |
| FH-080 | mitigated | photos | Hero graph-paper grid came off |
| FH-081 | mitigated | photos | Leftover hero line overlays stayed on |
| FH-082 | mitigated | photos | Hero type and packs read too small |
| FH-083 | mitigated | photos | Filter King claim sat under the packs |
| FH-084 | mitigated | other | Home hid everything below the hero |
| FH-085 | mitigated | other | Trust marquee sat below the first screen |
| FH-086 | mitigated | header | Header lockup left the 8:09 shopper bar |
| FH-087 | mitigated | header | Header CTAs drifted from the shop buttons |
| FH-088 | mitigated | photos | Hero packs sat in a small overlapping fan |
| FH-089 | mitigated | photos | Hero MERV 13 used the older pack shot |
| FH-090 | mitigated | photos | Hero packs sat still after the lineup |
| FH-091 | mitigated | photos | Hero captions did not match catch bubbles |
| FH-092 | mitigated | photos | Hero captions redesigned off the pill |
| FH-093 | mitigated | photos | Hero Filter King pill was not a statement |
| FH-094 | mitigated | photos | Hero tag now uses both brand marks |
| FH-095 | mitigated | photos | Dual-logo tag sat on a white plate |
| FH-096 | mitigated | photos | Dual-logo tag said FROM, which implied Filter Hero makes Filter King |
| FH-097 | mitigated | photos | Hero character was a frozen still again |
| FH-098 | mitigated | photos | Dual-logo claim sat in a darker navy strip |
| FH-099 | mitigated | photos | Dual-logo claim lost its fade |
| FH-100 | mitigated | photos | Hero character sat under the headline |
| FH-101 | mitigated | photos | Hero character sat too far forward |
| FH-102 | mitigated | photos | Hero character sat too far right of the lockup |
| FH-103 | mitigated | photos | Hero foreground sat too far right of the mascot |
| FH-104 | mitigated | photos | Giant outlined HERO sat where the mascot belongs |
| FH-105 | mitigated | photos | Hero character sat behind the packs instead of the middle lane |
| FH-106 | mitigated | photos | Hero character needed a flight loop in his exact form |
| FH-107 | mitigated | photos | Hero Filter King packs sat too close together |
| FH-108 | mitigated | photos | Hero Filter King packs sat too low |
| FH-109 | mitigated | photos | Hero Filter King packs still sat a little low |
| FH-110 | mitigated | brands | Hero brand row sat low and only showed three marks |
| FH-111 | mitigated | other | Trust marquee chips sat too small after the hero lift |
| FH-112 | mitigated | other | Hero CTAs mixed a pill with the site slant |
| FH-113 | mitigated | photos | Hero character used a warped still instead of a real flight clip |
| FH-114 | mitigated | other | Hero claim line named Trane, Carrier, Rheem + 30 more |
| FH-115 | mitigated | brands | Hero brand strip did not mention custom sizes |
| FH-116 | mitigated | photos | Hero video used invalid React `defaultMuted` prop |
| FH-117 | mitigated | cart | Cart quote handoff was cleared before the destination page could read it |
| FH-118 | mitigated | photos | Hero pack tiles ignored the selected MERV |
| FH-119 | mitigated | other | Hash scroll only ran on first mount |
| FH-120 | mitigated | other | Stripe Checkout did not collect a shipping address |
| FH-121 | mitigated | cart | Success page cleared the cart without verifying payment |
| FH-122 | mitigated | other | Production leads and orders wrote into `dist/data` |
| FH-123 | mitigated | other | Stripe webhook wrote duplicate orders on retry |
| FH-124 | mitigated | contact | Contact email failure returned 400 after the lead was saved |
| FH-125 | mitigated | pricing | Carbon carousel showed a “from $” price while quote-only |
| FH-126 | mitigated | clock | Filter Clock reminder stored MERV as “filter size” |
| FH-127 | mitigated | cart | Checkout cancel “quote instead” raced Home paint |
| FH-128 | mitigated | cart | Unsellable cart lines vanished on reload with no notice |
| FH-129 | mitigated | seo | SPA navigation dropped `og:type=article` |
| FH-130 | mitigated | seo | Stale public robots.txt and llms.txt lagged the server |
| FH-131 | mitigated | clock | Filter Clock must not send replacement emails before a purchase |
| FH-132 | mitigated | cart | Checkout collected no sales tax and no Stripe customer |
| FH-133 | mitigated | catalog | Full Filter King catalog stayed behind a code flag the .env did not read |
| FH-134 | mitigated | pricing | 1-inch carbon qty 1 did not match Filtrete odor |
| FH-135 | open | pricing | Full-catalog Filtrete match still leaves pack, MERV, and thick-size gaps |
| FH-136 | mitigated | pricing | Match the cheaper of Filtrete and Filter King on compared rungs |
| FH-137 | mitigated | pricing | Filtrete-gap rungs: cheapest peer is FilterBuy; HDX undercuts MERV 8 store-brand |
| FH-138 | mitigated | pricing | Match FilterBuy on confirmed cheaper 2-inch / 4-inch rungs |
| FH-139 | mitigated | cart | Checkout 400 when Stripe Tax had no head office |
| FH-140 | mitigated | brands | Brand model/OEM search always opened /sizes, even off-catalog |
| FH-141 | mitigated | other | Hero character sat planted instead of flying the sky |
| FH-142 | mitigated | other | Hero flyer looked dragged because the pose never flew |
| FH-143 | mitigated | photos | MERV 11 catch card used the sleeping cat-and-dog photo |
| FH-144 | mitigated | photos | MERV 8 Carbon catch card showed the woman-with-pets photo |
| FH-145 | mitigated | photos | Hero stage used a darker blue than the rest of the site |
| FH-146 | mitigated | other | Hero flyer was still one locked pose on a path |
| FH-147 | mitigated | other | Hero flyer vanished after the pose-machine swap |
| FH-148 | mitigated | photos | MERV 8 Carbon catch card had no cooking photo |
| FH-149 | mitigated | photos | Hero fly clip used the old sheet and baked-in particle effects |
| FH-150 | mitigated | photos | Hero flyer sat too large in the middle lane |
| FH-151 | mitigated | photos | Hero flyer still a touch large after FH-150 |
| FH-152 | mitigated | photos | Hero fly clip had a ghost second cape and locked-pose motion |
| FH-153 | mitigated | photos | Hero fly plate sat in a boxed slot |
| FH-154 | mitigated | photos | Hero flyer read a notch too large on the full-bleed plate |
| FH-155 | mitigated | photos | Hero fly plate was 720p on a full-bleed stage |
| FH-156 | mitigated | photos | Hero flyer still a tad large after FH-154 |
| FH-157 | mitigated | photos | Hero flyer still a tad large after FH-156 |
| FH-158 | mitigated | photos | Scaled fly plate showed a square in the navy |
| FH-159 | mitigated | photos | Fly clip still read as a boxed plate inside the lineup |
| FH-160 | mitigated | photos | Flyer grew off-screen; last pose was not the logo |
| FH-161 | mitigated | photos | MERV 8 Carbon catch card used the pizza-topping kitchen photo |
| FH-162 | mitigated | photos | MERV 8 Carbon cooking photo cropped the pot out |
| FH-163 | mitigated | photos | Catch-card photos were not one size |
| FH-164 | mitigated | photos | Capture dots were smaller than MERV 13 |
| FH-165 | mitigated | photos | Delivery map sat in a solid blue square |
| FH-166 | fixed | photos | Who you're protecting sat on a white sheet |
| FH-167 | fixed | photos | Everyday Home card still used the girl-and-dog photo |
| FH-168 | fixed | header | Header How to Measure chip squeezed Width / Length numbers |
| FH-169 | fixed | header | Header Filter Clock on the home page did not scroll |
| FH-170 | fixed | photos | Pets card inset was the woman with dog and cat |
| FH-171 | fixed | other | Sign-in vanished after switching to family-section-blue |
| FH-172 | fixed | pricing | MERV deck “from $” used Filter King undercut, not shop tickets |
| FH-173 | fixed | photos | MERV 13 catch card still used the child nebulizer photo |
| FH-174 | fixed | header | Header account and cart icons did not label on hover |
| FH-175 | fixed | pricing | Site-wide product prices must be live tickets |
| FH-176 | fixed | other | `pnpm check` died on NodeList spread in hero sky flight |
| FH-177 | fixed | seo | FAQ said free shipping only over $50 |
| FH-178 | fixed | other | Free shipping was missing on delivery, cart, and checkout |
| FH-179 | fixed | header | Header Measure chip was too short to tap |
| FH-180 | fixed | cart | Size-page sticky Add to cart leaked onto desktop |
| FH-181 | mitigated | seo | www.filterhero.net does not load the shop |
| FH-182 | fixed | other | Railway trial deploy failed when a second region was set |
| FH-183 | fixed | other | Cloudflare API token cannot create the filterhero.net zone |
| FH-184 | mitigated | seo | Recheck 2026-09-07 02:02: apex shop is live; NS and www are not unanimous |
| FH-185 | mitigated | seo | Debug 2026-09-07 02:08: apex shop is 100%; www default and live $50 FAQ are not |
| FH-186 | fixed | seo | Live FAQ and crawler copy still said shipping over $50 |
| FH-187 | fixed | photos | Live site still showed the old main build, not the local shop |
| FH-188 | fixed | other | Supabase CRM and accounts were half-wired on this branch |
| FH-189 | fixed | other | `pnpm check` failed and Vite env was incomplete |
| FH-190 | fixed | contact | Quote intake had no bot gate, and CRM routes imported a missing security module |
| FH-191 | fixed | other | Local `.env` had no live verifier and `.env.example` omitted live keys |
| FH-192 | fixed | other | Klaviyo onsite never loaded if config fetch failed once |
| FH-193 | fixed | other | Cart Klaviyo pack shots used an unsafe MERV cast |
| FH-194 | fixed | seo | Size JSON-LD spoke as the homepage and omitted free-shipping Offer fields |
| FH-195 | fixed | pricing | Filter King `n` size keys in live-price JSON never matched the catalog |
| FH-196 | fixed | contact | This branch had Klaviyo keys and DNS but no live integration |
| FH-197 | fixed | contact | Custom quote honeypot and form reset were not live JS |
| FH-198 | fixed | seo | Local API 404ed size-page SSR that smoke now requires |
| FH-199 | fixed | other | Python tooling crashed on cwd, imports, and wholesale print |
| FH-200 | fixed | contact | Smoke died on a hot contact limiter, and empty checkout leaked Zod |
| FH-201 | fixed | contact | Production shop had Klaviyo keys but no live routes |
| FH-202 | fixed | contact | Lead mail still used the Resend sandbox From |
| FH-203 | fixed | other | Stripe Dashboard had no fulfillment webhook |
| FH-204 | fixed | other | Checkout created a new Stripe Customer on every email |
| FH-205 | fixed | other | Public API had no headers, leaked parser text, and left browser grants on Postgres |
| FH-206 | fixed | header | Phone header was 308px and crushed the first screen |
| FH-207 | fixed | header | Hash jumps landed under the two-row phone header |
| FH-208 | fixed | other | Production staff magic links could not land on /admin |
| FH-209 | fixed | other | Local CSP blocked Klaviyo onsite identify |
| FH-210 | fixed | other | Production still ran an older main build |
| FH-211 | fixed | other | Stripe Tax was calculating (and billing) at Checkout |
| FH-212 | fixed | other | Local CSP still blocked Klaviyo identify after FH-209 |
| FH-213 | fixed | other | Staff console was quotes-only |
| FH-214 | fixed | other | Admin console bugs after the first landing |
| FH-215 | fixed | cart | Toasts never mounted; staff OTP hidden until a second send |
| FH-216 | fixed | other | Homepage hero looped a background flight video |
| FH-217 | fixed | catalog | Shop sold the archive instead of the Model Pricing list |
| FH-218 | fixed | photos | Hero still was too small to read |
| FH-219 | fixed | photos | Hero still blended into the navy sky |
| FH-220 | fixed | photos | Hero sky was Seedance navy, not site chrome |
| FH-221 | fixed | photos | Hero still was flat `#203868` over chrome navy |
| FH-222 | fixed | photos | Hero still rebuilt from the official character sheet |
| FH-223 | fixed | catalog | Stripe, Klaviyo, CRM, and accounts still had the old catalog |
| FH-224 | fixed | other | Intuit OAuth questionnaire item 6 was not implemented |
| FH-225 | fixed | other | Settings Connect crashed with Something went wrong |
| FH-226 | mitigated | other | Intuit rejected Filter Hero redirect_uri |
| FH-227 | mitigated | other | QuickBooks Connect was sandbox-only |
| FH-228 | mitigated | other | Klaviyo had no native Stripe charge/invoice webhook |
| FH-229 | mitigated | other | Native Klaviyo Stripe app accepts webhooks but does not record metrics |
| FH-230 | fixed | other | Klaviyo Stripe checker treated metrics as missing |
| FH-231 | fixed | other | Local Klaviyo onsite CORS failed on HTTP→HTTPS redirect |
| FH-232 | fixed | measure | Measure diagram logged non-animatable opacity |
| FH-233 | fixed | other | Remove Filter King now-at lockup from the hero |
| FH-234 | fixed | other | Klaviyo emails used text wordmark instead of the Filter Hero logo |
| FH-235 | fixed | contact | Resend mail was unbranded plain text |
| FH-236 | fixed | other | Live Klaviyo flows still sent the ice wordmark |
| FH-237 | fixed | other | Live Klaviyo flow clones reject template PATCH |
| FH-238 | fixed | other | Retired hero flight stacks and unused shadcn kit still shipped |
| FH-239 | fixed | photos | MERV 8 pack shots still said Filter King |
| FH-240 | fixed | photos | Carbon pack shots still said Filter King |
| FH-241 | fixed | photos | MERV 11 pack shots still said Filter King |
| FH-242 | fixed | photos | MERV 13 pack shots still said Filter King |
| FH-243 | fixed | photos | MERV 8 pack shots still used the branded Filter Hero lockup |
| FH-244 | fixed | photos | Size page ignored `?merv=13` after another rating |
| FH-245 | fixed | photos | Switching MERV left the gallery on the previous rating's thumb |
| FH-246 | fixed | contact | Resend verify never sent the real templates |
| FH-247 | fixed | contact | Turnstile loaded on every homepage view and skipped a missing token |
| FH-248 | fixed | catalog | MERV picker chips sat on white instead of their rating color |
| FH-249 | fixed | catalog | Capture note stayed gray after a MERV chip was chosen |
| FH-250 | fixed | catalog | One-rating size pages left the MERV chip in a four-column hole |
| FH-251 | fixed | cart | Checkout collected no sales tax (Stripe Tax was off) |
| FH-252 | fixed | catalog | Size page only sold 1, 2, 4, 6, or 12 filters |
| FH-253 | fixed | cart | Free shipping was still promised on the shop |
| FH-254 | open | cart | Stripe Checkout still prints Free next to a $0 shipping option |
| FH-255 | fixed | header | Header custom tab shortened to Custom below 2xl |
| FH-256 | fixed | photos | Hero MERV packs sat about an inch too low |
| FH-257 | fixed | photos | Hero MERV packs needed a quarter-inch drop after FH-256 |
| FH-258 | fixed | brands | Hero 30+ brand strip sat a quarter inch too low |
| FH-259 | fixed | photos | Hero MERV packs needed another quarter-inch drop |
| FH-260 | fixed | photos | Hero mascot still had an opaque plate |
| FH-261 | fixed | photos | Hero mascot lost its white outline on navy |
| FH-262 | fixed | photos | Hero mascot did not match the header lockup |
| FH-263 | fixed | photos | Hero mascot sat a quarter inch too far right |
| FH-264 | fixed | photos | Hero mascot needed another quarter-inch left nudge |
| FH-265 | fixed | photos | Hero mascot sat in the headline gap instead of right of HERO |
| FH-266 | fixed | photos | Hero FILTER HERO lockup and mascot were hard to read |
| FH-267 | fixed | photos | Revert the brighter FILTER HERO lockup glow |
| FH-268 | fixed | photos | Revert the mascot off the HERO lockup |
| FH-269 | fixed | photos | Putting the mascot back in the sky shifted the hero |
| FH-270 | fixed | photos | Hero stage used a different navy than the brand bands |
| FH-271 | fixed | photos | Lockup mascot was not the same size as FILTER HERO |
| FH-272 | superseded | photos | FILTER HERO lockup and mascot were clipped |
| FH-273 | fixed | photos | FILTER HERO lockup clip was a filter box, not type size |
| FH-274 | fixed | photos | Copy-column padding made the hero navy feel bigger |
| FH-275 | fixed | header | Header bar was crowding the hero lockup |
| FH-276 | fixed | header | Header needed another tad shorter |
| FH-277 | fixed | header | Header needed one more tad shorter |
| FH-278 | superseded | photos | Lockup mascot needed a hair smaller |
| FH-279 | fixed | photos | Revert lockup mascot back to sign height |
| FH-280 | fixed | photos | Lockup mascot sat a hair high |
| FH-281 | fixed | photos | 2-day delivery card used a wall-install photo |
| FH-282 | fixed | other | Shop still promised a 30-day guarantee |
| FH-283 | fixed | other | Size pages had no how-to-replace section |
| FH-284 | fixed | other | MERV pick copy skipped capacity / resistance |
| FH-285 | fixed | other | Size PDP left navy column empty under trust chips |
| FH-286 | fixed | other | Overdue-filter costs were vague buckets, not named repairs |
| FH-287 | fixed | photos | Size PDP overdue panel used off-brand burgundy wash |
| FH-288 | fixed | other | Home popular-sizes band replaced with overdue repair costs |
| FH-289 | fixed | other | Home overdue band buried the filter-vs-repair punchline |
| FH-290 | fixed | other | Verify overdue-cost + how-to invariants in store checks |
| FH-291 | fixed | contact | Resend verify died on Turnstile |
| FH-292 | fixed | contact | Stripe webhook could send a second Resend confirmation |
| FH-293 | fixed | other | Klaviyo refunds unmapped and welcome-list fallback could split Email List |
| FH-294 | fixed | other | Sandbox Stripe webhooks impersonated live FILTER HERO |
| FH-295 | fixed | other | Delivery promise said 2-day instead of 2-3 day |
| FH-296 | fixed | photos | Why Filter Hero fit card should say Built to last |
| FH-297 | fixed | photos | Built to last layers graphic did not fill the trust card |
| FH-298 | fixed | photos | Built to last layers crop clipped the diagram and labels |
| FH-299 | fixed | photos | Built to last card was taller than the other trust photos |
| FH-300 | open | other | Production Klaviyo JSON feed still serves a 299-SKU mix |
| FH-301 | fixed | contact | Smoke treated a rate-limited contact post as a Turnstile miss |
| FH-302 | open | cart | Add to cart leaves focus on a button Radix then marks aria-hidden |
| FH-303 | open | catalog | Railway FULL_CATALOG=true conflicts with the Model Pricing shop |
| FH-304 | open | other | GitHub autodeploy and `railway up` both own FILTER-HERO |
| FH-305 | open | other | Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO |
| FH-306 | open | other | Railway has no HTTP healthcheck |

FH-177 and FH-178 were logged twice in the source file; they are one fix each. For **Do / Do NOT / Files / Verify** on any row, open that heading in `docs/ISSUES-AND-FIXES.md`.

---

## 14. File checklist — the Express install in one glance

| Role | Path |
|---|---|
| Process entry | `server/index.ts` |
| Security | `server/security.ts` + `shared/security-headers.ts` |
| Auth gates | `server/auth.ts` |
| Service-role DB | `server/db.ts` |
| JSON paths | `server/data-store.ts` |
| Contact | `server/contact.ts` |
| Stripe + webhook | `server/stripe.ts` |
| Klaviyo | `server/klaviyo.ts` |
| Mail | `server/mailer.ts` |
| Account router | `server/account-routes.ts` + `server/account.ts` |
| CRM router | `server/crm/routes.ts` |
| Admin router | `server/admin/routes.ts` |
| Site config | `server/admin/config.ts` |
| Intuit callback | `server/intuit/routes.ts` |
| SEO inject | `shared/seo.ts` |
| Channel law | `shared/email-channels.ts` |
| Dev proxy | `vite.config.ts` |
| Build / start | `package.json` `build` + `start` |
| Env contract | `.env.example` |
| Security probe | `scripts/verify-security.ts` |
| Issue log | `docs/ISSUES-AND-FIXES.md` |

That is how Express is installed in this project. Anything else is a new ticket, and it gets the next `FH-XXX`.
