# RAILWAY FULL BUILD

**Filter Hero production is this Railway install.** Not a generic Railway tutorial. This file is how `filterhero.net` is wired, connected, built, started, stored, and DNS-fronted in *this* repo — including every production issue that shaped the install, and the full Filter Hero issue catalog.

**Canonical live origin:** `https://filterhero.net`  
**Dashboard:** [FILTER-HERO on Railway](https://railway.com/project/9e90c440-beba-417a-a984-97e328749e16/service/113b8bcc-544b-43b5-8037-7eacea3976f2?environmentId=8a19cb99-81b8-4690-9ec1-15e018d58507)  
**Issue log:** [`docs/ISSUES-AND-FIXES.md`](./ISSUES-AND-FIXES.md) (next id FH-307)  
**Snapshot of live Railway state:** 2026-09-20

Do not paste Railway variable *values* into git, chat, or this file. Names, prefixes, and IDs only.

---

## 1. What is installed

Filter Hero is **one Express process** that serves both the Vite SPA and the API. There is no separate frontend service, no Railway Postgres, no Redis, no object bucket. Postgres lives on **Supabase**. Marketing lives on **Klaviyo**. Payments live on **Stripe**. Transactional mail lives on **Resend**. DNS for the apex is **Railway**; `www` is **Cloudflare** redirecting to the apex.

That single process is Railway service **FILTER-HERO**. Railway’s Railpack builder runs `pnpm build`, then `pnpm start`. Express listens on Railway’s injected `PORT`. Persistent JSON (leads, orders, Intuit tokens, staff site-config overrides) is on a volume mounted at `/data`.

Local development is the opposite topology: Vite on `:3000` proxies `/api` to Express on `:3001`. Production collapses both into `dist/index.js` + `dist/public`.

```
Shopper
  │
  ├─ https://www.filterhero.net  → Cloudflare 301 → https://filterhero.net/$1
  │
  └─ https://filterhero.net      → Railway TLS (Hikari) → FILTER-HERO :$PORT
       │
       ├─ GET  /                  Express static + SEO-injected index.html
       ├─ GET  /api/health        liveness { ok, brand: "Filter Hero" }
       ├─ POST /api/checkout      Stripe Checkout Session
       ├─ POST /api/stripe/webhook  raw body, FILTER HERO live only
       ├─ POST /api/contact       Turnstile + Resend + CRM
       ├─ GET  /api/klaviyo/*     onsite config + catalog.json
       ├─ /api/crm  /api/account /api/admin /api/intuit
       │
       ├─ volume /data            DATA_DIR (JSON that must survive redeploy)
       ├─ Supabase                CRM + Auth + accounts
       ├─ Stripe                  Checkout + Tax + receipt
       ├─ Klaviyo                 marketing events + flows (klv.filterhero.net)
       └─ Resend                  branded confirmation / quote / support
```

---

## 2. Live topology (do not recreate these IDs)

| Layer | Value |
|---|---|
| Workspace | `TILO DOMINGUEZ's Projects` (`1b920b1b-55e8-4c83-b10f-a21d6d902d70`) |
| Project | `superb-expression` (`9e90c440-beba-417a-a984-97e328749e16`) |
| Environment | `production` (`8a19cb99-81b8-4690-9ec1-15e018d58507`) — **the only environment** |
| Service | `FILTER-HERO` (`113b8bcc-544b-43b5-8037-7eacea3976f2`) |
| Private network name | `filter-hero` (unused; there is no second Railway service to talk to) |
| Volume | `filter-hero-volume` (`19d6aec9-1ef4-4f27-882b-549d65f06992`) |
| Volume instance | `e14b643d-fdd4-42d9-9fa2-88e7cbc6af0d` |
| Volume mount | `/data` in `us-east4-eqdc4a`, 500 MB, ~32 MB used, state `READY` |
| Region | **one replica** `us-east4-eqdc4a` (FH-182) |
| Custom domain | `filterhero.net` (`f19b2965-e2e8-4ec4-adc1-e1187482c7f9`) `ACTIVE` |
| Service hostname | `filter-hero-production.up.railway.app` (`ACTIVE`) |
| Railway CNAME target | `ckury9c8.up.railway.app` |
| Apex A (observed) | `69.46.46.70` |
| GitHub source | `Tilo-Syntiv/Filter-Hero-OFFICIAL` `main` (FH-351, FH-367). `Tilo-Syntiv/FILTER-HERO` is a different GitHub project. |
| Latest SUCCESS (as of snapshot) | deploy `53f7af54-dc5b-4d5e-ac06-417e1f14d628` (2026-09-17 03:29 UTC), Cursor `railway up`, **no commit SHA** |
| Builder | **Railpack** `V3` (not Nixpacks, not Dockerfile) |
| Runtime | `V2` |
| Restart | `ON_FAILURE`, max 10 |
| Sleep | off |
| Healthcheck path | **unset** (FH-306) |
| Source branch | **unset** (FH-304) |
| `www` on Railway | **must not exist** (FH-181) |
| Buckets | none |

Repo copies of the three IDs (not tokens):

```json
{
  "projectId": "9e90c440-beba-417a-a984-97e328749e16",
  "serviceId": "113b8bcc-544b-43b5-8037-7eacea3976f2",
  "environmentId": "8a19cb99-81b8-4690-9ec1-15e018d58507"
}
```

That file is `.railway/config.json`. `pnpm verify:json` parses it. Local `.env` repeats the same three as `RAILWAY_PROJECT_ID` / `RAILWAY_SERVICE_ID` / `RAILWAY_ENVIRONMENT_ID` so `railway` CLI in this directory is already linked. `verify:env` treats those as optional format checks.

There is **no** `railway.json`, `railway.toml`, `nixpacks.toml`, `Dockerfile`, `Procfile`, or `.railwayignore`. The install is: GitHub-connected service + Railpack defaults + dashboard/CLI variables + one volume + one custom domain.

---

## 3. Source-of-truth files in this repo

| Path | Why it exists for Railway |
|---|---|
| `.railway/config.json` | Linked project / service / environment IDs |
| `package.json` `packageManager` | `pnpm@10.4.1…` — Railpack uses pnpm, not npm |
| `package.json` `build` / `start` | Exact production commands Railway infers |
| `vite.config.ts` | Client `root` is `client/`; `outDir` is `dist/public` |
| `server/index.ts` | `PORT`, `trust proxy 1`, static SPA, `/api/health`, webhook raw body |
| `server/data-store.ts` | `DATA_DIR` so JSON does not land in `dist/` (FH-122) |
| `server/security.ts` | Headers, Turnstile fail-closed, `req.ip` after trust proxy |
| `shared/security-headers.ts` | CSP / HSTS. Apex is DNS-only, so Express must set them |
| `shared/stripe-accounts.ts` | Live FILTER HERO vs sandbox ownership |
| `shared/email-channels.ts` | Resend / Klaviyo / Stripe / CRM split |
| `scripts/setup-stripe-webhook.ts` | Creates live webhook, writes `STRIPE_WEBHOOK_SECRET` to Railway |
| `scripts/setup-intuit-live.ts` | Copies Production Intuit keys onto Railway |
| `.env.example` | Local vs live contract (no secrets) |
| `docs/CLOUDFLARE-NAMESERVERS.md` | Apex A/CNAME, `_railway-verify`, www redirect |

---

## 4. How the process is built and started

### 4.1 Local (not Railway)

```bash
pnpm install
cp .env.example .env   # then fill sandbox Stripe + localhost Intuit
pnpm dev               # concurrently: tsx watch server/index.ts  +  vite --host
```

- Client: `http://localhost:3000` (Vite). Proxies `/api`, sitemap, robots, llms, ai.txt → `127.0.0.1:3001`.
- API: `http://localhost:3001`. `PORT=3001`, `NODE_ENV=development`.
- Stripe webhooks: `stripe listen --forward-to localhost:3001/api/stripe/webhook`. That CLI `whsec_` stays in local `.env`. It is **never** the Railway secret (FH-203, FH-294).

### 4.2 Production commands Railway actually runs

`package.json`:

```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
"start": "cross-env NODE_ENV=production node dist/index.js"
```

Live service config has `buildCommand: null` and `startCommand: null`. Railpack therefore:

1. Detects Node from `package.json`.
2. Detects **pnpm** from `"packageManager": "pnpm@10.4.1+sha512.…"`.
3. Installs with pnpm (lockfile `pnpm-lock.yaml`).
4. Runs the `build` script.
5. Starts the `start` script.

Vite writes the SPA to `dist/public`. esbuild writes the API bundle to `dist/index.js`. In production Express serves `dist/public` and injects per-route SEO into `index.html`.

`VITE_*` variables are **baked into the client at `vite build`**. Changing `VITE_FULL_CATALOG` or `VITE_STRIPE_PUBLISHABLE_KEY` on Railway does nothing until a **rebuild**. Server-only vars (`STRIPE_SECRET_KEY`, `DATA_DIR`, `INTUIT_*`) apply on the next restart.

### 4.3 Port, listen, proxy

```ts
const port = Number(process.env.PORT) || (isProd ? 3000 : 3001);
server.listen(port, () => {
  console.log(`API server running on http://localhost:${port}/`);
});
```

Railway injects `PORT`. It is **not** in the service variable list and must not be hardcoded to `3001` on the live service. `verify:env` asserts local `PORT=3001`; that check is for `.env`, not Railway.

Express sets `trust proxy` to `1` because Railway Hikari terminates TLS and forwards `X-Forwarded-*`. Rate limiters use `req.ip` after that setting. Do not parse `X-Forwarded-For[0]` yourself (FH-205) — a client can put any IP first and skip the limiter.

`req.secure` is true behind that proxy, so production HTTPS responses get HSTS (`max-age=15552000; includeSubDomains`). Apex is DNS-only to Railway, so Cloudflare does not add those headers — Express must.

### 4.4 Health

```
GET /api/health        → { "ok": true, "brand": "Filter Hero" }   public
GET /api/health/detail → crm / account / klaviyo                 staff only
```

Do not healthcheck `/` (that is the SPA). Do not add a second region to “enable” healthchecks (FH-182). Desired Railway deploy config, still **unset** on the live service (FH-306):

```
deploy.healthcheckPath=/api/health
deploy.healthcheckTimeout=30
```

---

## 5. Volume — why `/data` exists

Redeploys replace the container filesystem. FH-122: the first production paths used `__dirname/data`, so `dist/index.js` wrote `dist/data/`, which vanished on the next build.

```ts
export function dataFile(name: string): string {
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), "server", "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}
```

| Environment | `DATA_DIR` | Files |
|---|---|---|
| Local | unset → `<cwd>/server/data` | `leads.json`, `orders.json`, `intuit-oauth.json`, `site-config.json` |
| Railway | `/data` | same names on volume `filter-hero-volume` |

Catalog SKUs, prices, and most homepage copy **ship in git** (`shared/*.json`, `server/data/site-config.json` in the image). The volume is for writes after boot: leads, orders, Intuit tokens, staff content edits.

`pnpm setup:intuit-live` assumes this volume. If `/data` is missing, a reconnect after deploy is `invalid_grant`.

---

## 6. GitHub autodeploy vs `railway up`

Production GitHub source is `Tilo-Syntiv/Filter-Hero-OFFICIAL`, branch `main` (FH-351, FH-367). `Tilo-Syntiv/FILTER-HERO` is a different repository. Do not connect it to this service.

Two deploy paths can still overwrite each other:

- A push to any connected branch can replace production.
- `railway up` from a dirty local tree (the 2026-09-17 SUCCESS `53f7af54`) ships the working directory **with no commit SHA**. GitHub can then roll it back or forward without anyone noticing.
- Branches such as `design/family-section-blue` live on `Tilo-Syntiv/FILTER-HERO`. They are not branches of this shop.

**The rule that survived every rollback:**

1. Pin `source.branch=main`.
2. Production deploys only from `main` (`git push origin main` autodeploy, or `railway redeploy --from-source`).
3. Do **not** `railway up` a feature branch while GitHub is watching the repo (FH-187, FH-201, FH-210, FH-304).
4. Merge the shop to `main` first; then let autodeploy take it.

CLI that writes variables should use `--skip-deploys` when the goal is config-only (FH-303), then rebuild from `main`.

---

## 7. Domain, DNS, TLS

Railway trial / this workspace allows **one** custom domain. That slot is `filterhero.net`. `www` is not attached and must not be (FH-181).

### 7.1 What Railway owns

| Host | Role |
|---|---|
| `filterhero.net` | Custom domain, `ACTIVE`, TLS on Railway Hikari (`Server: railway-hikari`) |
| `filter-hero-production.up.railway.app` | Always-on service hostname. Health 200. Not the shopper URL |
| `ckury9c8.up.railway.app` | CNAME target Railway lists for the custom domain |

Do not point `@` at `filter-hero-production.up.railway.app` unless Railway’s domain status page changes. Use the CNAME target Railway shows.

### 7.2 What Cloudflare owns

Domain stays registered at **Squarespace**. Nameservers are Cloudflare:

```
ganz.ns.cloudflare.com
marjory.ns.cloudflare.com
```

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `ckury9c8.up.railway.app` | **DNS only** |
| TXT | `_railway-verify` | `railway-verify=9c1c72eeb007b5e41f10616349a1ac7f2b23a3ce6c054fe65848b0a552fb52d1` | DNS only |
| A (observed) | `@` | `69.46.46.70` | DNS only |
| A | `www` | Cloudflare anycast | **Proxied** |
| Redirect | `www.filterhero.net/*` | `https://filterhero.net/$1` 301 | needs orange cloud |

Apex stays **DNS only**. Orange-clouding `@` would put Cloudflare TLS in front of Railway’s cert and break the custom-domain slot. Mail, DKIM, and verify hosts stay DNS only.

Recheck 2026-09-20: `https://www.filterhero.net/` 301s to `https://filterhero.net/` via Cloudflare. Apex A remains Railway `69.46.46.70`. Full record set: [`CLOUDFLARE-NAMESERVERS.md`](./CLOUDFLARE-NAMESERVERS.md).

### 7.3 Verify

```powershell
nslookup -type=NS filterhero.net 8.8.8.8
nslookup filterhero.net 8.8.8.8
curl.exe -s https://filterhero.net/api/health
curl.exe -sI https://www.filterhero.net/
curl.exe -s https://filter-hero-production.up.railway.app/api/health
```

Expect Cloudflare NS only, apex on Railway (not Squarespace `198.185.159.*`), health `{"ok":true,"brand":"Filter Hero"}`, www a 301 to the apex.

---

## 8. Environment contract

Local `.env` is **sandbox / Development**. Railway is **production**. Copying `.env` onto Railway is how FH-305 happened. Never do that.

### 8.1 Railway injects (do not set)

| Variable | Meaning |
|---|---|
| `PORT` | Public listen port. Express reads it. |
| `RAILWAY_*` runtime | Platform metadata. The three IDs in local `.env` are for the CLI, not the Node process. |

### 8.2 Must be on FILTER-HERO

Values shown are the **intended production contract**, not a dump of live secrets. Prefixes are how you verify without revealing keys.

| Variable | Intended live value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Turns on SPA static, HSTS, Turnstile fail-closed |
| `CLIENT_URL` | `https://filterhero.net` | Stripe success/cancel origin. Local is `http://localhost:3000` |
| `SITE_URL` | `https://filterhero.net` | Sitemap, robots, JSON-LD |
| `VITE_SITE_URL` | `https://filterhero.net` | Baked into the client |
| `DATA_DIR` | `/data` | Volume mount |
| `CONTACT_TO` | `info@filterhero.net` | Staff lead alerts |
| `RESEND_FROM` | `Filter Hero <info@filterhero.net>` | Never `onboarding@resend.dev` (FH-202) |
| `RESEND_API_KEY` | `re_…` | Server only |
| `FULL_CATALOG` | `false` | Contractor 293 SKUs. Live was `true` (FH-303) |
| `VITE_FULL_CATALOG` | `false` | Must match. Vite bakes this. Rebuild after change |
| `STRIPE_SECRET_KEY` | `sk_live_…` on FILTER HERO `acct_1U9bqlQEENEs0Qmw` | Live was `sk_test_…` sandbox (FH-305) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_…` same account | Unused until embedded Checkout; keep in sync |
| `VITE_STRIPE_PUBLISHABLE_KEY` | same `pk_live_…` | Baked at build |
| `STRIPE_WEBHOOK_SECRET` | Dashboard endpoint `whsec_…` | **Not** `stripe listen` |
| `KLAVIYO_PRIVATE_API_KEY` | `pk_…` | Server only. Never `VITE_` |
| `KLAVIYO_PUBLIC_API_KEY` | `VnVNmQ` | Onsite site ID |
| `KLAVIYO_LIST_ID` | `RiTKiS` | Email List. Do not create a second welcome list |
| `SUPABASE_URL` | `https://mayxuwlygchatgeqyhyt.supabase.co` | Project `filter-hero` |
| `VITE_SUPABASE_URL` | same | Client Auth |
| `SUPABASE_ANON_KEY` | JWT anon `eyJ…` | Server `getUser` |
| `VITE_SUPABASE_ANON_KEY` | publishable or JWT anon | Browser Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT | Server only. Never `VITE_` |
| `STAFF_EMAILS` | must include `info@filterhero.net` | Comma-separated `/admin` allowlist |
| `TURNSTILE_SECRET_KEY` | `0x…` | Production fail-closed if missing |
| `VITE_TURNSTILE_SITE_KEY` | `0x…` | Widget, baked at build |
| `INTUIT_CLIENT_ID` | Production client | From `INTUIT_PRODUCTION_CLIENT_ID` via `pnpm setup:intuit-live` |
| `INTUIT_CLIENT_SECRET` | Production secret | Same. Never `VITE_` |
| `INTUIT_ENVIRONMENT` | `production` | Local is `sandbox` |
| `INTUIT_REDIRECT_URI` | `https://filterhero.net/api/intuit/oauth/callback` | Exact, no trailing slash |

### 8.3 Must stay unset on Railway

| Variable | Why |
|---|---|
| `CRM_DISABLE` / `ACCOUNT_DISABLE` / `KLAVIYO_DISABLE` | Kill switches. Live shop needs all three on |
| `INTUIT_PRODUCTION_*` | Local-only staging names. Live uses `INTUIT_CLIENT_*` |
| `HF_*` / `GEMINI_*` / `GOOGLE_CLOUD_PROJECT` | Media tooling. Not the shop |
| `CLOUDFLARE_API_TOKEN` | Local DNS scripts. Not required to serve the site |
| `VITE_INTUIT_*` | Forbidden. `verify:env` fails if present |
| `VITE_` + service-role / private Klaviyo / Stripe `sk_` | Would leak in the SPA |

### 8.4 Local vs live (the split that must stay)

| Concern | Local `.env` | Railway FILTER-HERO |
|---|---|---|
| Stripe | FILTER HERO **sandbox** `sk_test_` `acct_1U9bqs790NnFGDLv` | FILTER HERO **live** `sk_live_` `acct_1U9bqlQEENEs0Qmw` |
| Stripe webhook | `stripe listen` `whsec_` | Dashboard `https://filterhero.net/api/stripe/webhook` |
| Intuit | Development keys, `sandbox`, `http://localhost:3001/api/intuit/oauth/callback` | Production keys, `production`, live callback |
| Catalog flags | `false` / `false` | `false` / `false` |
| `CLIENT_URL` | `http://localhost:3000` | `https://filterhero.net` |
| `NODE_ENV` | `development` | `production` |
| `DATA_DIR` | unset | `/data` |

`pnpm verify:env` is a **local** verifier. It expects sandbox Stripe and localhost Intuit. A green local verify does not mean Railway is live-mode.

---

## 9. How each integration is wired through Railway

### 9.1 Stripe Checkout + shop webhook

Invariant: `shared/stripe-accounts.ts`.

- Shop **Placed Order** / **Checkout Expired** → `POST https://filterhero.net/api/stripe/webhook` on FILTER HERO **live** only (`checkout.session.completed`, `checkout.session.expired`).
- Express mounts that route with `express.raw({ type: "application/json" })` **before** `express.json`. A JSON parser here would break Stripe signatures.
- `pnpm setup:stripe-webhook` (run with the **live** key) creates/repairs that endpoint and `railway variable set STRIPE_WEBHOOK_SECRET --stdin`. Sandbox keys make the script **delete** conflicting endpoints instead of pointing them at production (FH-294).
- Do not put the CLI listen secret on Railway. Do not point sandbox Dashboard endpoints at `filterhero.net`.

### 9.2 Klaviyo

Railway already holds the three Klaviyo vars. The app exposes:

| Path | Role |
|---|---|
| `GET /api/klaviyo/config` | Public site ID for `onsite.js` |
| `GET /api/klaviyo/catalog.json` | Custom catalog feed |
| `POST /api/identify` `/api/track` | Profile + client metrics |

Native Stripe→Klaviyo charge/invoice webhook is **not** on Railway:

`https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ`

Connect that OAuth on FILTER HERO live, never sandbox. Do not add Checkout events there. Do not trigger welcome / abandon / replenish / a receipt from **Successfully Paid**. Sending domain is `klv.filterhero.net`. Do not point `send.filterhero.net` at Klaviyo — that host is Resend.

### 9.3 Resend

`RESEND_FROM=Filter Hero <info@filterhero.net>`. Logo `https://filterhero.net/logo.png`. Navy `#203868`, burgundy `#7F2328`. Order confirmation is Resend; Stripe still sends the payment receipt. Idempotency + `confirmationSentAt` stop a second mail on webhook retry (FH-292).

### 9.4 Supabase (CRM + accounts)

Not hosted on Railway. The Node process uses `SUPABASE_URL` + service role for CRM/account writes, and the JWT anon key to verify sessions. Browser uses `VITE_SUPABASE_*`. RLS deny-by-default; no `anon`/`authenticated` table grants (FH-205). Staff magic links must land on `/login` (FH-208) — `/admin` is not on the Auth allowlist.

### 9.5 Intuit / QuickBooks

`pnpm setup:intuit-live` writes four Railway variables from local `INTUIT_PRODUCTION_*`. Callback `GET /api/intuit/oauth/callback` must 302 to `/admin/settings?intuit=…`, not SPA HTML. Tokens in `/data/intuit-oauth.json`. Production keys cannot use localhost (FH-226).

### 9.6 Turnstile

Widget hostnames: `localhost`, `127.0.0.1`, `filterhero.net`. Production with a missing secret **fails closed** except Filter Clock `intent=reminder`.

---

## 10. Repo scripts that talk to Railway

These spawn the `railway` CLI. They need the linked `.railway/config.json` and an authenticated `railway whoami`.

| Script | Command | What it sets |
|---|---|---|
| `scripts/setup-stripe-webhook.ts` | `pnpm setup:stripe-webhook` | `STRIPE_WEBHOOK_SECRET` via stdin, only when the key is FILTER HERO live |
| `scripts/setup-intuit-live.ts` | `pnpm setup:intuit-live` | `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, `INTUIT_ENVIRONMENT=production`, `INTUIT_REDIRECT_URI` |

Manual equivalents:

```bash
railway status --json
railway environment config --json
railway variable list --service FILTER-HERO
railway domain list --service FILTER-HERO --json
railway logs --service FILTER-HERO --lines 200
railway deployment list --service FILTER-HERO --json
```

Set a variable without immediately shipping a dirty tree:

```bash
railway variable set FULL_CATALOG=false VITE_FULL_CATALOG=false --service FILTER-HERO --skip-deploys
```

Then rebuild from `main`.

---

## 11. Reproduce this install from zero

Do this only for a **new** Filter Hero. The live shop already exists; creating a second project splits Stripe webhooks and DNS.

1. **Account.** `railway login` as `info@filterhero.net`. Workspace is the personal “TILO DOMINGUEZ's Projects” workspace.
2. **Project.** One project. Live name is the generated `superb-expression`. One environment: `production`.
3. **Service.** Empty service named `FILTER-HERO`. Connect GitHub `Tilo-Syntiv/Filter-Hero-OFFICIAL`. **Pin branch `main`.** Root directory empty (repo root). Do not connect `Tilo-Syntiv/FILTER-HERO`.
4. **Builder.** Leave Railpack. No Dockerfile. No custom start command. `package.json` `build` / `start` are the contract.
5. **Scale.** `railway scale us-east=1` → only `us-east4-eqdc4a`, one replica. Never add `ams` / `eu-west` on this plan (FH-182).
6. **Volume.** Create `filter-hero-volume`, 500 MB, mount `/data`, same region as the replica. Set `DATA_DIR=/data`.
7. **Variables.** Set the table in §8.2. Live Stripe `sk_live_` / `pk_live_`. Catalog flags `false`. Intuit production via `pnpm setup:intuit-live`. Do not upload local `.env`.
8. **Healthcheck.** `healthcheckPath=/api/health`, timeout 30s.
9. **Domain.** Attach **only** `filterhero.net`. Put `_railway-verify` TXT + apex CNAME to the target Railway shows. Wait until custom domain is `ACTIVE`.
10. **www.** Cloudflare proxied A + Single Redirect. Do not attach `www` on Railway.
11. **Stripe.** With the **live** key: `pnpm setup:stripe-webhook`. Confirm Dashboard endpoint URL and that Railway `STRIPE_WEBHOOK_SECRET` last4 matches that endpoint, not `stripe listen`.
12. **Klaviyo native webhook.** `pnpm setup:klaviyo-stripe` against FILTER HERO (not sandbox). Connect OAuth in Klaviyo UI.
13. **Verify.** `https://filterhero.net/api/health` → `{"ok":true,"brand":"Filter Hero"}`. Headers: nosniff, DENY, CSP, HSTS, no `X-Powered-By`. `/api/intuit/oauth/callback` 302s. Unsigned `POST /api/stripe/webhook` is 400.
14. **Deploy ownership.** After the first SUCCESS from `main`, do not `railway up` from a feature branch.

A deploy is not live until `railway deployment list` shows `status=SUCCESS` **and** health returns 200. `railway up --detach` only means queued (FH-306 makes that even weaker today).

---

## 12. Forbidden operations (the scars)

| Do not | Why |
|---|---|
| `railway up` this working tree while GitHub watches the repo | Rolls feature/scrape files onto live, then `main` can roll them back (FH-304, FH-187) |
| Copy local `STRIPE_SECRET_KEY` onto Railway | Local is sandbox. Live Checkout becomes `livemode: false` (FH-305) |
| Point sandbox / test-mode Stripe endpoints at `filterhero.net` | Test cards fulfill or pollute production (FH-294) |
| Put `stripe listen` `whsec_` on Railway | Signatures never match Dashboard events (FH-203) |
| Attach `www` on Railway | Trial has one custom-domain slot; apex would drop (FH-181) |
| Scale a second region | Trial: “plan can only deploy to a single region” (FH-182) |
| Orange-cloud apex, MX, DKIM, `_railway-verify` | Breaks Railway TLS / mail / verify |
| Set `VITE_FULL_CATALOG=true` on Railway | Next rebuild sells the archive (FH-303, FH-217) |
| Prefix Intuit, service-role, or Klaviyo private keys with `VITE_` | Secrets in the SPA |
| Healthcheck `/` | SPA HTML is not a ready probe |
| Enable Resend receiving on `@` | Steals Google MX |
| Point `send.filterhero.net` at Klaviyo | Resend’s host |
| Trigger Klaviyo welcome/abandon/replenish from Successfully Paid | Wrong metric; shop Placed Order is the shop webhook |
| Click Save on Klaviyo “Review your brand” | Overwrites navy/burgundy defaults |

---

## 13. Live state as of 2026-09-20

Observed with `railway status --json` and `railway environment config --json` (values not copied here):

| Check | State |
|---|---|
| Service | Online, replica RUNNING |
| Latest deploy | `53f7af54` SUCCESS, Cursor CLI, no `commitHash` |
| GitHub `source.branch` | unset — **FH-304 open** |
| `healthcheckPath` | null — **FH-306 open** |
| Region | `us-east4-eqdc4a` × 1 — FH-182 held |
| Volume `/data` | READY — FH-122 held |
| Custom domain | `filterhero.net` ACTIVE — FH-181 www still off Railway |
| `NODE_ENV` / `CLIENT_URL` / `DATA_DIR` / `RESEND_FROM` | production contract — correct |
| Intuit | production + live redirect — FH-227 mitigated |
| Klaviyo three vars | present — FH-201 was the missing *routes*, later shipped |
| Stripe keys | `sk_test_` / `pk_test_` sandbox — **FH-305 open** |
| `FULL_CATALOG` + `VITE_FULL_CATALOG` | `true` — **FH-303 open** |
| Live `GET /api/klaviyo/catalog.json` | still the old 299 mix until a `main` rebuild with flags `false` — **FH-300 open** |

Fix order when you are ready to touch production (do not `railway up` a dirty branch):

1. Pin `source.branch=main`.
2. `FULL_CATALOG=false` `VITE_FULL_CATALOG=false` with `--skip-deploys`.
3. Put FILTER HERO **live** Stripe keys on Railway (not the local sandbox pair).
4. `pnpm setup:stripe-webhook` against that live key.
5. Set `healthcheckPath=/api/health`.
6. Merge current shop to `main` and let GitHub autodeploy (or `railway redeploy --from-source`).
7. Confirm health, `livemode: true` Checkout, catalog.json = 293, webhook last4.

---

## 14. Railway / production issues and fixes

Copied from [`ISSUES-AND-FIXES.md`](./ISSUES-AND-FIXES.md) so this file stands alone. Status words are the log’s. Full Do/Do-not/Verify text lives in that file; this section is the install-relevant set.

### Open — this install is not finished

**FH-306 — Railway has no HTTP healthcheck**  
FILTER-HERO is Online and `/api/health` returns 200, but `deploy.healthcheckPath` is unset. Railway will mark a deploy SUCCESS before Express is listening. Do not add a second region. Do not healthcheck `/`. Set `healthcheckPath=/api/health` and `healthcheckTimeout=30`. Keep one replica in `us-east4-eqdc4a`.

**FH-305 — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO**  
Live `filterhero.net` Checkout uses Railway `sk_test_` / `pk_test_` from FILTER HERO sandbox (`acct_1U9bqs790NnFGDLv`). Fulfillment and Klaviyo OAuth belong on live FILTER HERO (`acct_1U9bqlQEENEs0Qmw`). Real cards cannot pay. Local `.env` staying sandbox is correct. Do not copy local `STRIPE_SECRET_KEY` onto Railway. Do not point sandbox endpoints at `/api/stripe/webhook`. Put `sk_live_` + `pk_live_` + `VITE_STRIPE_PUBLISHABLE_KEY` on Railway, rebuild so Vite bakes `VITE_`, then `pnpm setup:stripe-webhook` against the live key.

**FH-304 — GitHub autodeploy and `railway up` both own FILTER-HERO** (mitigated; source corrected by FH-351 / FH-367)  
Production source is `Tilo-Syntiv/Filter-Hero-OFFICIAL` `main`. `Tilo-Syntiv/FILTER-HERO` is a different GitHub project. Do not `railway up` a dirty feature branch. Deploy production only from Official `main`.

**FH-303 — Railway FULL_CATALOG=true conflicts with the Model Pricing shop**  
Local flags are `false` (Model Pricing SKUs). Railway has both `true` (archived size universe). Live catalog.json is still 299 because the 2026-09-17 CLI image baked the old allowlist. The next rebuild with current Railway vars would sell every archived size × MERV (FH-216 / FH-217 / FH-300). Set both flags `false` with `--skip-deploys`, then rebuild from `main`.

**FH-300 — Production Klaviyo JSON feed still serves a 299-SKU mix**  
Local feed is 293. Live `https://filterhero.net/api/klaviyo/catalog.json` is 299. Deploy the current shop so the public feed is 293. Do not point Klaviyo’s custom catalog at the live JSON while production is on the old mix.

### Domain, region, volume

**FH-182 — Railway trial deploy failed when a second region was set** (fixed)  
Deploy `1fb6e2a6` failed: “Your plan can only deploy to a single region.” `ams` and `us-east4-eqdc4a` were both at 1 replica. Keep `{"regions":{"us-east4-eqdc4a":{"numReplicas":1}}}`. Later SUCCESS `499083eb` already runs that way.

**FH-181 — www.filterhero.net does not load the shop** (mitigated)  
Railway allows one custom domain (`filterhero.net` only). `www` cannot be attached. Recheck 2026-09-20: default `https://www.filterhero.net/` 301s to apex via Cloudflare. Apex A remains Railway `69.46.46.70`. Do not attach `www` on Railway. Do not delete the apex custom domain to free the slot.

**FH-185 / FH-184** (mitigated)  
Apex shop 100% on `69.46.46.70`, `Server: railway-hikari`. Early leftover was cached `www` CNAME `ckury9c8.up.railway.app` (TTL 14400) causing `SEC_E_WRONG_PRINCIPAL`. Do not treat leftover Railway CNAME cache as a failed NS click. Do not change apex off Railway.

**FH-183 — Cloudflare API token cannot create the filterhero.net zone** (fixed)  
Token was invalid; zone did not exist. Zone now exists; public NS are `ganz` / `marjory`. Do not commit a Cloudflare token.

**FH-122 — Production leads and orders wrote into `dist/data`** (mitigated)  
`__dirname/data` under the esbuild bundle vanished on redeploy. Write to `DATA_DIR` or `<cwd>/server/data`. Railway: `DATA_DIR=/data` on the volume.

### Deploy ownership and stale `main`

**FH-187 — Live site still showed the old main build, not the local shop** (fixed)  
`filterhero.net` was Railway `main` (shipping-copy only) while local `design/family-section-blue` had the family band and new life photos. Deploy the branch so live matches, then keep `main` on the same commit so autodeploy does not roll the look back. Railway `ea335b33` SUCCESS. PR #4 merged to `main`.

**FH-186 — Live FAQ and crawler copy still said shipping over $50** (fixed)  
Production `main` was `27aac84`. Railway deploy `98fd8aed` from PR #3 (`fix/live-shop-shipping`).

**FH-210 — Production still ran an older main build** (fixed)  
Local had CRM, accounts, Klaviyo, Turnstile, and security headers. Live was Railway `main` without them (`X-Powered-By: Express`, no CSP). A `railway up` of the feature branch would be rolled back by GitHub autodeploy. Ship via merge to `main`. Railway `771641a8` SUCCESS from `20c53e8` (PR #5).

**FH-201 — Production shop had Klaviyo keys but no live routes** (fixed)  
Railway already had the three Klaviyo vars; the image was pre-Klaviyo so `/api/klaviyo/config` 404ed. Keep the vars. Deploy the integration. A later GitHub autodeploy from `main` can roll a CLI snapshot back until `main` has the same code.

### Stripe / Resend / Intuit on the live origin

**FH-294 — Sandbox Stripe webhooks impersonated live FILTER HERO** (fixed)  
Sandbox account had Dashboard endpoints to `filterhero.net` and the Klaviyo native URL. `verify:env` treated both as success. Shop fulfillment webhook only on FILTER HERO live. Local uses `stripe listen`. `pnpm setup:stripe-webhook` scrubs the wrong endpoints. Handler ignores livemode/key mismatches.

**FH-203 — Stripe Dashboard had no fulfillment webhook** (fixed)  
`/api/stripe/webhook` was live (unsigned POST 400) but Stripe listed zero endpoints, so `checkout.session.completed` never wrote orders. Create the Dashboard endpoint; put *that* signing secret on Railway.

**FH-202 — Lead mail still used the Resend sandbox From** (fixed)  
Railway `RESEND_FROM` was `Filter Hero <onboarding@resend.dev>`. Set `Filter Hero <info@filterhero.net>`. Do not enable Resend receiving on `@`.

**FH-227 — QuickBooks Connect was sandbox-only** (mitigated)  
`filterhero.net` had no `/api/intuit` routes and no Intuit env. Railway gets Production keys + live redirect; tokens in `DATA_DIR=/data`. Do not `railway up` a branch while `main` lacks the Intuit routes. Do not put Intuit secrets in `VITE_` vars.

**FH-226 — Intuit rejected Filter Hero redirect_uri** (mitigated)  
Production keys cannot use localhost. Local Development callback is `http://localhost:3001/api/intuit/oauth/callback`. Production stays `https://filterhero.net/api/intuit/oauth/callback`.

**FH-208 — Production staff magic links could not land on /admin** (fixed)  
Supabase Auth allowed `/login` and `/account`, not `/admin`. Staff OTP `emailRedirectTo` `/admin` fell back to Site URL `http://localhost:3000`. Staff links land on `/login`; `sessionStorage` then sends that email to `/admin`.

**FH-205 — Public API had no headers, leaked parser text, and left browser grants on Postgres** (fixed)  
Local and Railway origin sent `X-Powered-By: Express` and no CSP / nosniff / frame-deny / HSTS. `X-Forwarded-For[0]` could skip limiters. Production Turnstile failed open if the secret was missing. Express (and Vite in dev) now send the header set; `trust proxy 1`; Turnstile fail-closed in production; FORCE RLS + revoke browser grants.

### Related production-adjacent (not Railway platform, but live origin)

**FH-292** Stripe webhook could send a second Resend confirmation — persist `confirmationSentAt` after Resend accepts.  
**FH-191** Local `.env` had no live verifier — `pnpm verify:env` exists; it still verifies *local* sandbox, not Railway.  
**FH-133 / FH-217** Catalog flag must be read from env; the Model Pricing list is the shop. Railway `true` reopens this.

---

## 15. How to operate after this file

```bash
# linked context
railway status --json

# is the newest deploy actually up?
railway deployment list --service FILTER-HERO --json

# runtime
curl.exe -s https://filterhero.net/api/health
curl.exe -sI https://filterhero.net/api/health
```

Expect health JSON plus nosniff, `X-Frame-Options: DENY`, CSP, HSTS, no `X-Powered-By`.

Logs: `railway logs --service FILTER-HERO --lines 200`.  
Metrics: `railway metrics --service FILTER-HERO --since 1h --json`.

Variable changes that include `VITE_*` need a **rebuild**, not a restart.

---

## 16. Related docs

| File | Topic |
|---|---|
| [`ISSUES-AND-FIXES.md`](./ISSUES-AND-FIXES.md) | Canonical bug log. Never reuse ids |
| [`CLOUDFLARE-NAMESERVERS.md`](./CLOUDFLARE-NAMESERVERS.md) | Apex / www / mail / DKIM / `_railway-verify` |
| [`STRIPE-BOOKS.md`](./STRIPE-BOOKS.md) | Checkout, Tax, QBO connector, webhook URL |
| [`KLAVIYO.md`](./KLAVIYO.md) | Metrics, native Stripe app, catalog feed |
| [`RESEND.md`](./RESEND.md) | Transactional From, brand kit |
| [`INTUIT-OAUTH.md`](./INTUIT-OAUTH.md) | Live vs sandbox keys, `/data` tokens |
| [`CRM.md`](./CRM.md) / [`CUSTOMER-ACCOUNTS.md`](./CUSTOMER-ACCOUNTS.md) | Supabase, not Railway |
| `README.md` Production | `pnpm build` / `pnpm start` |

---

## Appendix A — Full Filter Hero issue catalog

Every id in `docs/ISSUES-AND-FIXES.md` as of 2026-09-20 (277 headings; FH-177 / FH-178 appear twice in that file). **Railway-shaped opens are FH-306, FH-305, FH-304, FH-303, FH-300.** Write-ups for all others stay in the issue log. Do not reuse ids. Next id is **FH-307**.

### open (9)

- **FH-306** — Railway has no HTTP healthcheck
- **FH-305** — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO
- **FH-304** — GitHub autodeploy and `railway up` both own FILTER-HERO
- **FH-303** — Railway FULL_CATALOG=true conflicts with the Model Pricing shop
- **FH-302** — Add to cart leaves focus on a button Radix then marks aria-hidden
- **FH-300** — Production Klaviyo JSON feed still serves a 299-SKU mix
- **FH-254** — Stripe Checkout still prints Free next to a $0 shipping option
- **FH-135** — Full-catalog Filtrete match still leaves pack, MERV, and thick-size gaps
- **FH-031** — Filter Clock days must be 30 / 60 / 90 / 180 only

### mitigated (137)

- **FH-229** — Native Klaviyo Stripe app accepts webhooks but does not record metrics
- **FH-228** — Klaviyo had no native Stripe charge/invoice webhook
- **FH-227** — QuickBooks Connect was sandbox-only
- **FH-226** — Intuit rejected Filter Hero redirect_uri
- **FH-185** — Debug 2026-09-07 02:08: apex shop is 100%; www default and live $50 FAQ are not
- **FH-184** — Recheck 2026-09-07 02:02: apex shop is live; NS and www are not unanimous
- **FH-181** — www.filterhero.net does not load the shop
- **FH-165** — Delivery map sat in a solid blue square
- **FH-164** — Capture dots were smaller than MERV 13
- **FH-163** — Catch-card photos were not one size
- **FH-162** — MERV 8 Carbon cooking photo cropped the pot out
- **FH-161** — MERV 8 Carbon catch card used the pizza-topping kitchen photo
- **FH-160** — Flyer grew off-screen; last pose was not the logo
- **FH-159** — Fly clip still read as a boxed plate inside the lineup
- **FH-158** — Scaled fly plate showed a square in the navy
- **FH-157** — Hero flyer still a tad large after FH-156
- **FH-156** — Hero flyer still a tad large after FH-154
- **FH-155** — Hero fly plate was 720p on a full-bleed stage
- **FH-154** — Hero flyer read a notch too large on the full-bleed plate
- **FH-153** — Hero fly plate sat in a boxed slot
- **FH-152** — Hero fly clip had a ghost second cape and locked-pose motion
- **FH-151** — Hero flyer still a touch large after FH-150
- **FH-150** — Hero flyer sat too large in the middle lane
- **FH-149** — Hero fly clip used the old sheet and baked-in particle effects
- **FH-148** — MERV 8 Carbon catch card had no cooking photo
- **FH-147** — Hero flyer vanished after the pose-machine swap
- **FH-146** — Hero flyer was still one locked pose on a path
- **FH-145** — Hero stage used a darker blue than the rest of the site
- **FH-144** — MERV 8 Carbon catch card showed the woman-with-pets photo
- **FH-143** — MERV 11 catch card used the sleeping cat-and-dog photo
- **FH-142** — Hero flyer looked dragged because the pose never flew
- **FH-141** — Hero character sat planted instead of flying the sky
- **FH-140** — Brand model/OEM search always opened /sizes, even off-catalog
- **FH-139** — Checkout 400 when Stripe Tax had no head office
- **FH-138** — Match FilterBuy on confirmed cheaper 2-inch / 4-inch rungs
- **FH-137** — Filtrete-gap rungs: cheapest peer is FilterBuy; HDX undercuts MERV 8 store-brand
- **FH-136** — Match the cheaper of Filtrete and Filter King on compared rungs
- **FH-134** — 1-inch carbon qty 1 did not match Filtrete odor
- **FH-133** — Full Filter King catalog stayed behind a code flag the .env did not read
- **FH-132** — Checkout collected no sales tax and no Stripe customer
- **FH-131** — Filter Clock must not send replacement emails before a purchase
- **FH-130** — Stale public robots.txt and llms.txt lagged the server
- **FH-129** — SPA navigation dropped `og:type=article`
- **FH-128** — Unsellable cart lines vanished on reload with no notice
- **FH-127** — Checkout cancel “quote instead” raced Home paint
- **FH-126** — Filter Clock reminder stored MERV as “filter size”
- **FH-125** — Carbon carousel showed a “from $” price while quote-only
- **FH-124** — Contact email failure returned 400 after the lead was saved
- **FH-123** — Stripe webhook wrote duplicate orders on retry
- **FH-122** — Production leads and orders wrote into `dist/data`
- **FH-121** — Success page cleared the cart without verifying payment
- **FH-120** — Stripe Checkout did not collect a shipping address
- **FH-119** — Hash scroll only ran on first mount
- **FH-118** — Hero pack tiles ignored the selected MERV
- **FH-117** — Cart quote handoff was cleared before the destination page could read it
- **FH-116** — Hero video used invalid React `defaultMuted` prop
- **FH-115** — Hero brand strip did not mention custom sizes
- **FH-114** — Hero claim line named Trane, Carrier, Rheem + 30 more
- **FH-113** — Hero character used a warped still instead of a real flight clip
- **FH-112** — Hero CTAs mixed a pill with the site slant
- **FH-111** — Trust marquee chips sat too small after the hero lift
- **FH-110** — Hero brand row sat low and only showed three marks
- **FH-109** — Hero Filter King packs still sat a little low
- **FH-108** — Hero Filter King packs sat too low
- **FH-107** — Hero Filter King packs sat too close together
- **FH-106** — Hero character needed a flight loop in his exact form
- **FH-105** — Hero character sat behind the packs instead of the middle lane
- **FH-104** — Giant outlined HERO sat where the mascot belongs
- **FH-103** — Hero foreground sat too far right of the mascot
- **FH-102** — Hero character sat too far right of the lockup
- **FH-101** — Hero character sat too far forward
- **FH-100** — Hero character sat under the headline
- **FH-099** — Dual-logo claim lost its fade
- **FH-098** — Dual-logo claim sat in a darker navy strip
- **FH-097** — Hero character was a frozen still again
- **FH-096** — Dual-logo tag said FROM, which implied Filter Hero makes Filter King
- **FH-095** — Dual-logo tag sat on a white plate
- **FH-094** — Hero tag now uses both brand marks
- **FH-093** — Hero Filter King pill was not a statement
- **FH-092** — Hero captions redesigned off the pill
- **FH-091** — Hero captions did not match catch bubbles
- **FH-090** — Hero packs sat still after the lineup
- **FH-089** — Hero MERV 13 used the older pack shot
- **FH-088** — Hero packs sat in a small overlapping fan
- **FH-087** — Header CTAs drifted from the shop buttons
- **FH-086** — Header lockup left the 8:09 shopper bar
- **FH-085** — Trust marquee sat below the first screen
- **FH-084** — Home hid everything below the hero
- **FH-083** — Filter King claim sat under the packs
- **FH-082** — Hero type and packs read too small
- **FH-081** — Leftover hero line overlays stayed on
- **FH-080** — Hero graph-paper grid came off
- **FH-079** — Hero looked like two different backgrounds
- **FH-078** — Hero stage wash no longer matched the preview
- **FH-077** — Hero background hugged the left crop
- **FH-076** — Hero character sat too far forward
- **FH-075** — Header character icon looked blank after the public swap
- **FH-074** — Hero restaged left, header stays on the first screen
- **FH-073** — Hero character was a frozen still
- **FH-072** — Hero brand fit claim was easy to miss
- **FH-071** — Carbon and MERV 13 hero captions duplicated the boxes
- **FH-070** — Hero character sat too low under the filters
- **FH-069** — Hero filters needed a guarantee line above them
- **FH-068** — Hero filters sat too close to the character
- **FH-067** — Hero cast needed another nudge right
- **FH-066** — Hero cast sat too far left over the copy
- **FH-065** — Logo font change was not visible in the hero
- **FH-064** — Hero headline did not use the logo font
- **FH-063** — Hero filters and brands sat in separate corners
- **FH-062** — Hero character crowded out the filter shots
- **FH-061** — Home hero felt like a static catalog row
- **FH-060** — MERV 13 hero cutout must keep the original product
- **FH-058** — Hero product showcase uses clean pack shots
- **FH-057** — Home hero was a tall scroll region
- **FH-056** — Hero used a chopped crop instead of the solo character
- **FH-055** — Home hero is character only
- **FH-054** — Hero filters were trapped in a glass tray
- **FH-053** — Hero art was a pile of overlapping cutouts
- **FH-052** — Home hero rebuilt as a live stage, not a painted banner
- **FH-051** — Leftover Filter King ladders were modeled, not live
- **FH-050** — Navy FAQ answers were too close to the background
- **FH-049** — Official MERV 11 pack shot for every size and pack
- **FH-048** — Official MERV 13 pack shot for every size and pack
- **FH-047** — Official MERV 8 pack shot for every size and pack
- **FH-046** — Every MERV 8 size used the raw Filter King 6-pack
- **FH-045** — Pack shots had a vertical MERV plate on the stack
- **FH-044** — Pack shot said MERV 8 on every size page
- **FH-043** — Shop listed SKUs with no wholesale cost
- **FH-042** — tsconfig `baseUrl` flagged as an error
- **FH-041** — Carbon Capture dots read as black on white
- **FH-040** — Size-page MERV note uses catch-page Capture
- **FH-039** — MERV chips span their column
- **FH-038** — Size-page MERV picker matches catch-section columns
- **FH-037** — FAQ heading collage
- **FH-032** — How to Measure chip belongs with Shop / Brands / Clock / Contact
- **FH-033** — Clock nav still says Clock, not FILTER CLOCK
- **FH-035** — Tape-measure diagram missing from product pages

### fixed (128)

- **FH-301** — Smoke treated a rate-limited contact post as a Turnstile miss
- **FH-299** — Built to last card was taller than the other trust photos
- **FH-298** — Built to last layers crop clipped the diagram and labels
- **FH-297** — Built to last layers graphic did not fill the trust card
- **FH-296** — Why Filter Hero fit card should say Built to last
- **FH-295** — Delivery promise said 2-day instead of 2-3 day
- **FH-294** — Sandbox Stripe webhooks impersonated live FILTER HERO
- **FH-293** — Klaviyo refunds unmapped and welcome-list fallback could split Email List
- **FH-292** — Stripe webhook could send a second Resend confirmation
- **FH-291** — Resend verify died on Turnstile
- **FH-290** — Verify overdue-cost + how-to invariants in store checks
- **FH-289** — Home overdue band buried the filter-vs-repair punchline
- **FH-288** — Home popular-sizes band replaced with overdue repair costs
- **FH-287** — Size PDP overdue panel used off-brand burgundy wash
- **FH-286** — Overdue-filter costs were vague buckets, not named repairs
- **FH-285** — Size PDP left navy column empty under trust chips
- **FH-284** — MERV pick copy skipped capacity / resistance
- **FH-283** — Size pages had no how-to-replace section
- **FH-282** — Shop still promised a 30-day guarantee
- **FH-281** — 2-day delivery card used a wall-install photo
- **FH-280** — Lockup mascot sat a hair high
- **FH-279** — Revert lockup mascot back to sign height
- **FH-277** — Header needed one more tad shorter
- **FH-276** — Header needed another tad shorter
- **FH-275** — Header bar was crowding the hero lockup
- **FH-274** — Copy-column padding made the hero navy feel bigger
- **FH-273** — FILTER HERO lockup clip was a filter box, not type size
- **FH-271** — Lockup mascot was not the same size as FILTER HERO
- **FH-270** — Hero stage used a different navy than the brand bands
- **FH-269** — Putting the mascot back in the sky shifted the hero
- **FH-268** — Revert the mascot off the HERO lockup
- **FH-267** — Revert the brighter FILTER HERO lockup glow
- **FH-266** — Hero FILTER HERO lockup and mascot were hard to read
- **FH-265** — Hero mascot sat in the headline gap instead of right of HERO
- **FH-264** — Hero mascot needed another quarter-inch left nudge
- **FH-263** — Hero mascot sat a quarter inch too far right
- **FH-262** — Hero mascot did not match the header lockup
- **FH-261** — Hero mascot lost its white outline on navy
- **FH-260** — Hero mascot still had an opaque plate
- **FH-259** — Hero MERV packs needed another quarter-inch drop
- **FH-258** — Hero 30+ brand strip sat a quarter inch too low
- **FH-257** — Hero MERV packs needed a quarter-inch drop after FH-256
- **FH-256** — Hero MERV packs sat about an inch too low
- **FH-255** — Header custom tab shortened to Custom below 2xl
- **FH-253** — Free shipping was still promised on the shop
- **FH-252** — Size page only sold 1, 2, 4, 6, or 12 filters
- **FH-251** — Checkout collected no sales tax (Stripe Tax was off)
- **FH-250** — One-rating size pages left the MERV chip in a four-column hole
- **FH-249** — Capture note stayed gray after a MERV chip was chosen
- **FH-248** — MERV picker chips sat on white instead of their rating color
- **FH-247** — Turnstile loaded on every homepage view and skipped a missing token
- **FH-246** — Resend verify never sent the real templates
- **FH-245** — Switching MERV left the gallery on the previous rating's thumb
- **FH-244** — Size page ignored `?merv=13` after another rating
- **FH-243** — MERV 8 pack shots still used the branded Filter Hero lockup
- **FH-242** — MERV 13 pack shots still said Filter King
- **FH-241** — MERV 11 pack shots still said Filter King
- **FH-240** — Carbon pack shots still said Filter King
- **FH-239** — MERV 8 pack shots still said Filter King
- **FH-238** — Retired hero flight stacks and unused shadcn kit still shipped
- **FH-237** — Live Klaviyo flow clones reject template PATCH
- **FH-236** — Live Klaviyo flows still sent the ice wordmark
- **FH-235** — Resend mail was unbranded plain text
- **FH-234** — Klaviyo emails used text wordmark instead of the Filter Hero logo
- **FH-233** — Remove Filter King now-at lockup from the hero
- **FH-232** — Measure diagram logged non-animatable opacity
- **FH-231** — Local Klaviyo onsite CORS failed on HTTP→HTTPS redirect
- **FH-230** — Klaviyo Stripe checker treated metrics as missing
- **FH-225** — Settings Connect crashed with Something went wrong
- **FH-224** — Intuit OAuth questionnaire item 6 was not implemented
- **FH-223** — Stripe, Klaviyo, CRM, and accounts still had the old catalog
- **FH-222** — Hero still rebuilt from the official character sheet
- **FH-221** — Hero still was flat `#203868` over chrome navy
- **FH-220** — Hero sky was Seedance navy, not site chrome
- **FH-219** — Hero still blended into the navy sky
- **FH-218** — Hero still was too small to read
- **FH-217** — Shop sold the archive instead of the Model Pricing list
- **FH-216** — Homepage hero looped a background flight video
- **FH-215** — Toasts never mounted; staff OTP hidden until a second send
- **FH-214** — Admin console bugs after the first landing
- **FH-213** — Staff console was quotes-only
- **FH-212** — Local CSP still blocked Klaviyo identify after FH-209
- **FH-211** — Stripe Tax was calculating (and billing) at Checkout
- **FH-210** — Production still ran an older main build
- **FH-209** — Local CSP blocked Klaviyo onsite identify
- **FH-208** — Production staff magic links could not land on /admin
- **FH-207** — Hash jumps landed under the two-row phone header
- **FH-206** — Phone header was 308px and crushed the first screen
- **FH-205** — Public API had no headers, leaked parser text, and left browser grants on Postgres
- **FH-204** — Checkout created a new Stripe Customer on every email
- **FH-203** — Stripe Dashboard had no fulfillment webhook
- **FH-202** — Lead mail still used the Resend sandbox From
- **FH-201** — Production shop had Klaviyo keys but no live routes
- **FH-200** — Smoke died on a hot contact limiter, and empty checkout leaked Zod
- **FH-199** — Python tooling crashed on cwd, imports, and wholesale print
- **FH-198** — Local API 404ed size-page SSR that smoke now requires
- **FH-197** — Custom quote honeypot and form reset were not live JS
- **FH-196** — This branch had Klaviyo keys and DNS but no live integration
- **FH-195** — Filter King `n` size keys in live-price JSON never matched the catalog
- **FH-194** — Size JSON-LD spoke as the homepage and omitted free-shipping Offer fields
- **FH-193** — Cart Klaviyo pack shots used an unsafe MERV cast
- **FH-192** — Klaviyo onsite never loaded if config fetch failed once
- **FH-191** — Local `.env` had no live verifier and `.env.example` omitted live keys
- **FH-190** — Quote intake had no bot gate, and CRM routes imported a missing security module
- **FH-189** — `pnpm check` failed and Vite env was incomplete
- **FH-188** — Supabase CRM and accounts were half-wired on this branch
- **FH-187** — Live site still showed the old main build, not the local shop
- **FH-186** — Live FAQ and crawler copy still said shipping over $50
- **FH-183** — Cloudflare API token cannot create the filterhero.net zone
- **FH-182** — Railway trial deploy failed when a second region was set
- **FH-180** — Size-page sticky Add to cart leaked onto desktop
- **FH-179** — Header Measure chip was too short to tap
- **FH-178** — Free shipping was missing on delivery, cart, and checkout
- **FH-177** — FAQ said free shipping only over $50
- **FH-176** — `pnpm check` died on NodeList spread in hero sky flight
- **FH-175** — Site-wide product prices must be live tickets
- **FH-174** — Header account and cart icons did not label on hover
- **FH-173** — MERV 13 catch card still used the child nebulizer photo
- **FH-172** — MERV deck “from $” used Filter King undercut, not shop tickets
- **FH-171** — Sign-in vanished after switching to family-section-blue
- **FH-170** — Pets card inset was the woman with dog and cat
- **FH-169** — Header Filter Clock on the home page did not scroll
- **FH-168** — Header How to Measure chip squeezed Width / Length numbers
- **FH-167** — Everyday Home card still used the girl-and-dog photo
- **FH-166** — Who you're protecting sat on a white sheet
- **FH-178** — Free shipping was missing on delivery, cart, and checkout
- **FH-177** — FAQ said free shipping only over $50
- **FH-034** — Custom CTA should read Need a custom size

### superseded (2)

- **FH-278** — Lockup mascot needed a hair smaller
- **FH-272** — FILTER HERO lockup and mascot were clipped

### wontfix (1)

- **FH-059** — Home is a single locked hero screen


