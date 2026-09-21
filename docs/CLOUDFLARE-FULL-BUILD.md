# cloudflare FULL BUILD

**Filter Hero — how Cloudflare is installed, wired, connected, and kept.**

This is not a generic Cloudflare Workers / Pages / WAF tutorial. It is the exact architecture of this repository: a **Squarespace-registered domain** whose **nameservers** are Cloudflare, a **grey-cloud apex** that still belongs to Railway TLS, an **orange-cloud `www`** that only exists to 301 onto that apex, and **Turnstile** in the Express/React contact path. If a later change fights this document, the live zone plus [ISSUES-AND-FIXES.md](ISSUES-AND-FIXES.md) win — then this file must be updated.

**Canonical issue log:** every `FH-XXX` with full **Do / Do NOT / Files / Verify** lives in `docs/ISSUES-AND-FIXES.md`. This guide includes the complete index, every Cloudflare-touching ticket in full, and the DNS / Turnstile laws those tickets produced. Next unused id is **FH-307**. There is no FH-036 (never assigned). FH-001–FH-030 were never logged.

**Live snapshot:** 2026-09-20. `filterhero.net` NS are `ganz` / `marjory`. Apex A is Railway `69.46.46.70` (`Server: railway-hikari`). `https://www.filterhero.net/` 301s to `https://filterhero.net/` (`Server: cloudflare`, `CF-RAY` present). Health is `{"ok":true,"brand":"Filter Hero"}`.

**Zone record snapshot (copy/paste rows):** [CLOUDFLARE-NAMESERVERS.md](./CLOUDFLARE-NAMESERVERS.md).  
**Origin that actually serves the shop:** [RAILWAY-FULL-BUILD.md](./RAILWAY-FULL-BUILD.md).

Do not paste Cloudflare API tokens, Turnstile secrets, or site keys into git, chat, or this file. Names, hostnames, and IDs only.

---

## 1. What “Cloudflare” is in this project

Cloudflare is **not** the app host. Filter Hero is one Express process on Railway. Cloudflare is the **authoritative DNS** for `filterhero.net`, the **www redirect**, and the **bot check** on quote/support forms.

Three Cloudflare products are live. Nothing else in the Cloudflare catalog is installed.

| Product | Role in this shop | What it is not |
|---|---|---|
| **DNS** (zone `filterhero.net`) | Authoritative nameservers. Holds Railway, Google MX, Resend, Klaviyo, and `_railway-verify` | Not a domain registrar. The domain stays at Squarespace |
| **Proxy + Single Redirect** on `www` only | Orange-cloud `www` so a Cloudflare 301 can run. Shoppers never stay on `www` | Not a CDN in front of the shop. Apex is DNS-only |
| **Turnstile** | Widget on contact/quote. `siteverify` from Express | Not a WAF challenge on every request. Not on Filter Clock `intent=reminder` |

There is **no** `wrangler.toml`, no Workers, no Pages, no Functions, no KV, no D1, no R2, no Queues, no Durable Objects, no Tunnel, no Zaraz, no Images, no Stream, and no custom WAF ruleset in this repo. Do not add one “because we already have Cloudflare.” The origin is Railway. The browser talks to Railway on the apex. Cloudflare only answers DNS and the `www` hop.

```
Shopper
  │
  ├─ https://www.filterhero.net
  │     Cloudflare anycast (orange cloud)
  │     Single Redirect 301  →  https://filterhero.net/$1
  │     Server: cloudflare
  │
  └─ https://filterhero.net
        DNS only (grey cloud) → Railway A 69.46.46.70
        Railway Hikari TLS  →  FILTER-HERO :$PORT
        Server: railway-hikari
        Express sets CSP / HSTS / nosniff  (Cloudflare cannot; it is not on this hop)
             │
             ├─ GET  /                 SPA + SEO-injected HTML
             ├─ GET  /api/health       { ok, brand: "Filter Hero" }
             ├─ POST /api/contact      Turnstile siteverify + honeypot + limiter
             ├─ POST /api/checkout     Stripe
             └─ POST /api/stripe/webhook  raw body, FILTER HERO live only

Browser (quote / support form, near viewport)
  └─ https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit
       widget mints a token  →  POST /api/contact { turnstileToken }
       Express POSTs that token to siteverify with TURNSTILE_SECRET_KEY + remoteip
```

Squarespace is the **registrar**. Cloudflare is the **DNS**. Railway is the **origin**. Google is **mail**. Resend is **transactional mail**. Klaviyo is **marketing mail** on `klv.filterhero.net`. Mixing any two of those hosts is how the zone breaks.

---

## 2. Live identity (do not recreate these)

| Layer | Value |
|---|---|
| Registrar | Squarespace. Domain **stays** there. Do not transfer |
| Old Squarespace NS (retired) | `nsc1`–`nsc4.squarespacedns.com` |
| Cloudflare NS (live at registrar **and** on the public internet) | `ganz.ns.cloudflare.com`, `marjory.ns.cloudflare.com` |
| SOA primary | `ganz` |
| Zone name | `filterhero.net` |
| Plan | Free zone. Enough for DNS + one Single Redirect + Turnstile |
| Apex observed A | `69.46.46.70` (Railway). No AAAA |
| Railway CNAME target (what the dashboard lists) | `ckury9c8.up.railway.app` |
| Railway service hostname (not the shopper URL) | `filter-hero-production.up.railway.app` |
| Railway custom domain slot | **one** — `filterhero.net` only (FH-181) |
| `www` anycast (proxied) | `104.21.41.176`, `172.67.149.19` |
| Turnstile hosts that must be allowed | `localhost`, `127.0.0.1`, `filterhero.net` |
| Klaviyo site verification | TXT `klaviyo-site-verification=VnVNmQ` |
| Klaviyo sending host | `klv.filterhero.net` → `3840918940202419532.klaviyodns.com` |
| Resend sending host | `send.filterhero.net` → `send.forge.rmta.net` |
| Google MX | `smtp.google.com` priority 1 |

`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` live in **local `.env` only**. They are for `pnpm verify:env` (token verify + zone read). They are **not** required to serve the site. They must **not** be on Railway. They must **not** be committed. They must **not** use a `VITE_` prefix.

---

## 3. Source-of-truth files

| Path | Why it exists for Cloudflare |
|---|---|
| `docs/CLOUDFLARE-NAMESERVERS.md` | Zone rows to copy. Cutover checklist. NS names |
| `docs/cloudflare FULL BUILD.md` | This file. Topology, Turnstile code, laws, tickets |
| `server/security.ts` | `verifyTurnstile`, `shouldEnforceTurnstile`, `contactLimiter`, `trust proxy` comment, headers |
| `server/contact.ts` | Honeypot, Turnstile gate, lead save |
| `server/index.ts` | `trust proxy 1`, `applySecurityHeaders`, `POST /api/contact` → `bot_check_failed` |
| `shared/security-headers.ts` | CSP allows `challenges.cloudflare.com`. Apex is DNS-only, so Express **must** set HSTS |
| `client/src/components/TurnstileField.tsx` | Explicit widget, IntersectionObserver, reset after send |
| `client/src/components/ContactForm.tsx` | `action="contact"`, client token required when site key is set |
| `client/src/components/CustomQuoteForm.tsx` | `action="quote"`, same token contract |
| `client/src/components/FilterPower.tsx` | Filter Clock POST `intent: "reminder"` — **no widget** |
| `vite.config.ts` | Dev server sends the same header map (no HSTS on localhost) |
| `.env.example` | `TURNSTILE_*` and `CLOUDFLARE_*` placeholders |
| `scripts/verify-env.ts` | Format + live ping Turnstile siteverify and Cloudflare token/zone |
| `scripts/verify-security.ts` | CSP Turnstile hosts, fail-closed production, reminder skip |
| `scripts/smoke-site.ts` | Missing token → `400 bot_check_failed` or `429 rate_limited_contact` |
| `scripts/verify-resend.ts` | Unsets Turnstile only inside `submitContact` QA (FH-291) |
| `server/admin/data.ts` | Staff Security page: secret / site key present, production enforce flag |
| `client/src/pages/admin/Security.tsx` | Renders those dots |
| `client/src/vite-env.d.ts` | `VITE_TURNSTILE_SITE_KEY` |

---

## 4. Install — how this zone was actually built

Squarespace has **no public DNS API**. Railway, Resend, and Klaviyo all need records we cannot script from Squarespace DNS. That is why nameservers moved to Cloudflare. The domain did **not** move.

Do these steps in this order. Skipping “copy the zone first” is how you lose Google mail.

### 4.1 Mint a token that can create a zone (FH-183)

1. Cloudflare dashboard → My Profile → API Tokens.
2. Create a token that can **edit zone DNS** for `filterhero.net` (or create zones + edit DNS).
3. Put it in local `.env` as `CLOUDFLARE_API_TOKEN`. Optional: `CLOUDFLARE_ACCOUNT_ID`.
4. Never commit it. Never paste it into chat. Never put it in a `VITE_` var. Never put it on Railway.

The first token in this project returned Cloudflare `1000 Invalid API Token`. There was **no** `filterhero.net` zone. The cutover could not be scripted until a valid token created the zone and copied records. That is FH-183.

`pnpm verify:env` is the check:

```
GET https://api.cloudflare.com/client/v4/user/tokens/verify
Authorization: Bearer $CLOUDFLARE_API_TOKEN

GET https://api.cloudflare.com/client/v4/zones?name=filterhero.net
```

Expect `CLOUDFLARE_TOKEN` ok (`status=active`) and `CLOUDFLARE_ZONE` ok (`filterhero.net` found). A valid token that cannot read the zone is still a fail.

### 4.2 Create the zone before touching Squarespace NS

Create a free Cloudflare zone named `filterhero.net`. **Do not** change Squarespace nameservers yet. Public DNS must keep answering Squarespace until every row below is in Cloudflare.

### 4.3 Enter every record, then the www redirect

Proxy status: **DNS only** except `www`.

Add a Cloudflare **Single Redirect**:

```
www.filterhero.net/*  →  https://filterhero.net/$1    301
```

`www` **must be proxied** (orange cloud) for that rule to run. Railway trial cannot attach `www` (FH-181). The redirect is Cloudflare’s job.

Compare the Cloudflare zone against live Squarespace DNS until they match **except** the www redirect (Squarespace never had that 301).

### 4.4 Flip nameservers at the registrar only

Squarespace → domain → nameservers. Replace `nsc1`–`nsc4.squarespacedns.com` with:

```
ganz.ns.cloudflare.com
marjory.ns.cloudflare.com
```

Leave the domain registered at Squarespace. Wait until public NS are only Cloudflare:

```powershell
nslookup -type=NS filterhero.net 8.8.8.8
```

Gate that actually happened: **2026-09-07 01:58 EDT**. Google, `1.1.1.1`, and SOA showed only `ganz` / `marjory`. Apex shop, Google MX, SPF, Klaviyo, Resend, and Railway verify were live on Cloudflare immediately. `www` took hours because of leftover Railway CNAME cache (FH-184, FH-185). Recheck **2026-09-20**: default `https://www.filterhero.net/` 301s without `--resolve`.

### 4.5 Confirm site, mail, and both senders

| Check | Expect |
|---|---|
| Apex health | `{"ok":true,"brand":"Filter Hero"}` |
| Apex `Server` | `railway-hikari` |
| Apex HSTS | `max-age=15552000; includeSubDomains` (Express, not Cloudflare) |
| `www` HTTPS | `301 Location: https://filterhero.net/` (or path-preserving `$1`) `Server: cloudflare` |
| MX | `smtp.google.com` |
| Klaviyo | sending domain `klv.filterhero.net` **active** |
| Resend | `filterhero.net` verified, sending enabled, From `info@filterhero.net` |
| Gmail | still arrives at Google Workspace |

---

## 5. The proxy law (orange vs grey)

Cloudflare’s orange cloud terminates TLS on Cloudflare, then origin-fetches. Grey cloud (DNS only) is a DNS answer and nothing else.

| Host | Proxy | Why |
|---|---|---|
| `@` (apex) | **DNS only** | Orange-clouding `@` would put Cloudflare TLS in front of Railway’s cert and break the one custom-domain slot |
| `www` | **Proxied** | Single Redirect only runs on proxied hostnames |
| MX `@` | DNS only (MX is never proxied) | Google Workspace |
| `resend._domainkey`, `rsend`, `send` | **DNS only** | Resend DKIM / bounce / sending. Orange-cloud breaks mail auth |
| `klv`, `mtd1._domainkey`, `mtd2._domainkey` | **DNS only** | Klaviyo sending + DKIM |
| `_railway-verify` | **DNS only** | Railway custom-domain proof |
| `_dmarc` | **DNS only** | TXT |
| SPF / Klaviyo site-verification TXT on `@` | **DNS only** | Two separate TXT records. Do not merge them |

**Never orange-cloud mail, DKIM, or verification hosts.** That sentence is in FH-181, FH-202, Resend FULL BUILD, and Klaviyo FULL BUILD because every one of those teams will try to “just proxy it.”

---

## 6. Live zone — records to keep

Cloudflare names omit `.filterhero.net`. `@` is the root. Recopy DKIM `p=` from the provider dashboard if they rotate keys; the snapshot below is what was live on 2026-09-07 and still matches public CNAME targets on 2026-09-20.

### 6.1 Site (Railway)

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `ckury9c8.up.railway.app` | DNS only |
| A (observed, not typed by hand) | `@` | `69.46.46.70` | DNS only |
| A | `www` | Cloudflare anycast (proxied CNAME flattening) | **Proxied** |
| TXT | `_railway-verify` | `railway-verify=9c1c72eeb007b5e41f10616349a1ac7f2b23a3ce6c054fe65848b0a552fb52d1` | DNS only |

Railway still lists that CNAME target for the apex custom domain. The clickable service hostname is `filter-hero-production.up.railway.app`. Do not point `@` at the service hostname unless Railway’s domain status page changes.

`www` may appear in the dashboard as a CNAME to the Railway target **or** as flattened A records to Cloudflare anycast. Either is correct **if** it is proxied and the Single Redirect is on. Public resolvers on 2026-09-20 return the anycast A pair.

### 6.2 Google Workspace mail

| Type | Name | Content | Proxy |
|---|---|---|---|
| MX | `@` | `smtp.google.com` (priority 1) | DNS only |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | DNS only |

Do not replace that SPF with a Resend-only SPF. Never drop `include:_spf.google.com`. Do not enable Resend **Receiving** on `@` — that steals Google MX (FH-202).

### 6.3 Resend (transactional)

| Type | Name | Content | Proxy |
|---|---|---|---|
| TXT | `resend._domainkey` | DKIM `p=…` (copy current from Resend if rotated) | DNS only |
| CNAME | `rsend` | `rsend.forge.rmta.net` | DNS only |
| CNAME | `send` | `send.forge.rmta.net` | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@filterhero.net` | DNS only |

DMARC stays `p=none` until reports look clean. Do not jump to `p=reject` on day one. Do not point `send` at Klaviyo.

### 6.4 Klaviyo (marketing)

| Type | Name | Content | Proxy |
|---|---|---|---|
| TXT | `@` | `klaviyo-site-verification=VnVNmQ` | DNS only |
| CNAME | `klv` | `3840918940202419532.klaviyodns.com` | DNS only |
| CNAME | `mtd1._domainkey` | `mtd1._domainkey.3840918940202419532.klaviyodns.com` | DNS only |
| CNAME | `mtd2._domainkey` | `mtd2._domainkey.3840918940202419532.klaviyodns.com` | DNS only |

This is a **second** TXT on `@`, next to SPF. Do not replace SPF. `pnpm setup:klaviyo` verifies and activates `klv.filterhero.net` (`purpose: marketing`). If it finds `send.filterhero.net` on the Klaviyo account, it **deletes** that sending domain so Resend keeps the host (FH-196, FH-201).

---

## 7. `www` — why Cloudflare owns it and Railway must not

Railway trial / this workspace allows **one** custom domain. That slot is `filterhero.net`. Attaching `www` would require deleting the apex slot. Do not do that (FH-181).

Shopper-facing URL is always `https://filterhero.net`. `www` exists so a typed `www.filterhero.net` does not 404 or present the wrong certificate.

### 7.1 How the 301 is supposed to work

1. Resolver asks for `www.filterhero.net`.
2. Cloudflare answers anycast A (`104.21.41.176`, `172.67.149.19`) because the record is proxied.
3. Client TLS is Cloudflare Universal SSL for `www.filterhero.net`.
4. Single Redirect: `www.filterhero.net/*` → `https://filterhero.net/$1` (301). Path and query stay.
5. Browser loads the apex. Railway Hikari presents the apex cert. Express serves the shop.

Turnstile never runs on `www`. The widget is in the SPA after the 301. The Turnstile hostname list therefore needs `filterhero.net` and local hosts, not `www`.

### 7.2 What broke during cutover

| When | What public DNS did | Ticket |
|---|---|---|
| 2026-09-07 01:58 | Apex 100%. HTTP `www` via Cloudflare already 301d. HTTPS `www` handshake aborted — Universal SSL not issued yet. Some resolvers still cached Railway CNAME `ckury9c8.up.railway.app` (TTL 14400) and failed `SEC_E_WRONG_PRINCIPAL` then Railway 404 | FH-181 |
| 2026-09-07 02:02 | Apex live from Google / Cloudflare / Quad9 / OpenDNS. NS not yet unanimous on every resolver | FH-184 |
| 2026-09-07 02:08 | Authoritative Cloudflare `www` HTTPS **301s**. Default `www` on this PC and Google DoH still followed the old Railway CNAME | FH-185 |
| 2026-09-20 | Default `https://www.filterhero.net/` 301s to apex. `Server: cloudflare`. Apex A still `69.46.46.70` | FH-181 recheck |

FH-181 stays **mitigated**, not closed, because the invariant is “do not attach `www` on Railway,” not “www is still broken.” The shopper path works. The constraint does not go away if the trial plan changes later — still do not steal the apex slot.

---

## 8. Apex TLS and headers — Cloudflare is absent on this hop

Apex is grey-cloud. Cloudflare does **not** add HSTS, CSP, or `Server: cloudflare` on `https://filterhero.net`. Express must.

```ts
// server/index.ts
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(applySecurityHeaders);
```

`trust proxy 1` is for **Railway Hikari**, which terminates TLS and forwards `X-Forwarded-*`. Rate limiters and Turnstile `remoteip` use `req.ip` after that setting. Do not parse `X-Forwarded-For[0]` yourself (FH-205) — a client can put any IP first and skip the limiter.

```ts
// server/security.ts
function clientIp(req: Request): string {
  // req.ip honors `trust proxy`. Do not read X-Forwarded-For[0] ourselves —
  // a client can put a random IP first and skip the limiter.
  return req.ip || req.socket.remoteAddress || "unknown";
}
```

`req.secure` is true behind that proxy, so production HTTPS responses get:

```
Strict-Transport-Security: max-age=15552000; includeSubDomains
```

Localhost must **not** pin HSTS. `shared/security-headers.ts` only sets HSTS when `production && req.secure`. Vite’s dev server uses `securityHeaderMap({ production: false, hsts: false })`.

---

## 9. Turnstile — the only Cloudflare code in the app

Turnstile is a **form bot check**, not an edge firewall. It is mounted on quote/support. It is skipped on Filter Clock reminders. Production fails closed if the secret is missing (except `intent=reminder`).

### 9.1 Keys

| Variable | Where | Prefix | Role |
|---|---|---|---|
| `TURNSTILE_SECRET_KEY` | Server `.env` and Railway | `0x` | `siteverify`. Fail-closed in production |
| `VITE_TURNSTILE_SITE_KEY` | Vite envDir = **repo root**. Baked into the SPA at `vite build` | `0x` | Widget `sitekey` |

Changing `VITE_TURNSTILE_SITE_KEY` on Railway does nothing until a **rebuild**. Dashboard hostname list must include `localhost`, `127.0.0.1`, and `filterhero.net`.

Never put the secret in a `VITE_` var. `pnpm verify:env` already fails Intuit keys that use `VITE_`; the same law applies to Turnstile secrets and Cloudflare tokens (FH-191).

### 9.2 Widget — `TurnstileField`

`client/src/components/TurnstileField.tsx` is the only browser integration.

Laws that file encodes (FH-247, FH-197):

1. **No site key → render nothing.** Local smoke can POST `/api/contact` without a widget.
2. **Do not `render` until near the viewport.** `IntersectionObserver` with `rootMargin: "200px 0px"`. The homepage footer must not start a Cloudflare challenge (and the hidden `challenges.cloudflare.com` `NaN` console probe) on every landing.
3. **Explicit render only.** Script is `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`. Do not call `turnstile.ready()` with `async` + explicit — that combination is how FH-247 logged `NaN`.
4. **One script tag.** `data-fh-turnstile` on `document.head`. Reuse it.
5. **Widget options:** `theme: "light"`, `size: "flexible"`, `appearance: "always"`, `retry: "auto"`. `action` is `"contact"` or `"quote"`.
6. **Tokens are single-use.** Expire / timeout callbacks clear the token and `reset`. After a successful send, parents bump `resetSignal`.
7. **`error-callback` must be set** and return `true` so Cloudflare does not retry into a console storm. Surface “Security check failed. Refresh…”
8. **Unmount removes the widget** and the script `load` listener (FH-197).
9. **Submit reads `turnstile.getResponse(widgetId)`** via `readTurnstileToken()` as a fallback if React state missed the callback.

```ts
widgetId.current = window.turnstile.render(host.current, {
  sitekey: siteKey,
  action,
  theme: "light",
  size: "flexible",
  appearance: "always",
  retry: "auto",
  callback: (token) => {
    setStatus("ok");
    callback.current(token);
  },
  "expired-callback": () => { /* clear + reset */ },
  "timeout-callback": () => { /* clear + reset */ },
  "error-callback": () => {
    setStatus("error");
    clearToken();
    return true;
  },
});
```

### 9.3 Forms that mount it, and the one that must not

| Surface | Component | Turnstile | `intent` |
|---|---|---|---|
| Homepage `#contact`, support | `ContactForm` | yes, `action="contact"` | `quote` or `support` |
| `/custom-air-filters` | `CustomQuoteForm` | yes, `action="quote"` | `quote` |
| Filter Clock save | `FilterPower` | **no** | `reminder` |

Client gate when the site key is set:

```ts
const token = values.turnstileToken?.trim() || readTurnstileToken();
if (turnstileSiteKey() && !token) {
  toast.error("Complete the security check first.");
  return;
}
```

After success: reset `website` + `turnstileToken`, bump `resetSignal` (FH-197). Honeypot is an off-screen `website` field. Filled honeypot is `id: "ignored"` and never a lead.

Clock POST is widget-free on purpose (FH-131, FH-190):

```ts
body: JSON.stringify({
  name: "Filter Clock reminder",
  email,
  message: `Clock cadence saved (no email until purchase). …`,
  intent: "reminder",
  marketingConsent: false,
  cadence: { /* … */ },
})
```

### 9.4 Server gate

`POST /api/contact` is limited **5 / 15 min / IP**, then `submitContact`:

```ts
// server/index.ts
app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const result = await submitContact(req.body, req.ip);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Could not verify that form.") {
      res.status(400).json({ error: err.message, code: "bot_check_failed" });
      return;
    }
    // publicError → contact_failed
  }
});
```

Limiter 429 body is `{ code: "rate_limited_contact" }`. Smoke must treat that as the limiter, **not** a Turnstile miss (FH-200, then again FH-301).

```ts
// server/contact.ts
if (isHoneypotTripped(parsed.website)) {
  return { ok: true, id: "ignored", emailed: false };
}
if (shouldEnforceTurnstile(parsed.intent)) {
  const human = await verifyTurnstile(parsed.turnstileToken || undefined, ip);
  if (!human.ok) {
    throw new Error("Could not verify that form.");
  }
}
```

```ts
// server/security.ts
export async function verifyTurnstile(token: string | undefined, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    // Local forms can run without a widget. Production must fail closed.
    return { ok: process.env.NODE_ENV !== "production" };
  }
  if (!token?.trim()) return { ok: false };
  const body = new URLSearchParams({ secret, response: token.trim() });
  if (ip?.trim()) body.set("remoteip", ip.trim());
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as { success?: boolean };
  return { ok: Boolean(data.success) };
}

export function shouldEnforceTurnstile(intent: string): boolean {
  if (intent === "reminder") return false;
  if (process.env.NODE_ENV === "production") return true;
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}
```

Truth table:

| `NODE_ENV` | Secret set | `intent` | Enforce? | Missing token |
|---|---|---|---|---|
| development | no | quote/support | no | allowed (local smoke) |
| development | yes | quote/support | **yes** | `bot_check_failed` |
| production | no | quote/support | **yes** (fail closed) | `bot_check_failed` |
| production | yes | quote/support | **yes** | `bot_check_failed` |
| any | any | `reminder` | **no** | clock still posts |

Siteverify network failure returns `{ ok: false }`. Do not fail open.

### 9.5 CSP — the widget cannot load without these hosts

Apex is DNS-only, so Cloudflare’s dashboard CSP is irrelevant. Express (prod) and Vite (dev) send:

```
script-src … https://challenges.cloudflare.com …
connect-src … https://challenges.cloudflare.com …
frame-src https://challenges.cloudflare.com
```

`pnpm verify:security` asserts those substrings on the production header map. Removing them is how the widget becomes a silent blank box.

Klaviyo onsite CSP is a sibling (FH-209, FH-212). Do not “clean” `challenges.cloudflare.com` while editing those directives.

### 9.6 Staff console

`/admin/security` shows:

- Turnstile secret present
- Turnstile site key present
- `enforcedInProduction` when `NODE_ENV=production`
- Contact limiter **5 / 15 min**

It does **not** show token values. Presence only (`server/admin/data.ts` `securitySnapshot`).

---

## 10. Environment contract

### 10.1 Local `.env`

```
# Cloudflare Turnstile (bot check on /api/contact)
# TURNSTILE_SECRET_KEY=0x...
# VITE_TURNSTILE_SITE_KEY=0x...
# CLOUDFLARE_ACCOUNT_ID=
# CLOUDFLARE_API_TOKEN=
```

Local `NODE_ENV=development`. A configured secret still enforces quote/support (see truth table). Clock reminders never need the widget.

### 10.2 Railway FILTER-HERO

Must be set (shop will fail closed without the secret):

| Variable | Notes |
|---|---|
| `TURNSTILE_SECRET_KEY` | Server. Production fail-closed if missing |
| `VITE_TURNSTILE_SITE_KEY` | Baked at `pnpm build`. Needs a rebuild to change |

Must stay **unset** on Railway:

| Variable | Why |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Local DNS scripts / `verify:env` only |
| `CLOUDFLARE_ACCOUNT_ID` | Same |
| `VITE_TURNSTILE_SECRET_KEY` | Forbidden shape. Secret is not a Vite key |

Copying `.env` onto Railway is how Stripe sandbox keys landed on production (FH-305). Do not copy Cloudflare tokens that way either.

---

## 11. Verify — commands that prove this install

```bash
pnpm verify:env        # formats + live ping Turnstile siteverify + Cloudflare token/zone
pnpm verify:security   # CSP Turnstile hosts, fail-closed production, reminder skip, headers
pnpm smoke             # missing token 400 bot_check_failed, or 429 rate_limited_contact
pnpm verify:resend     # unsets Turnstile only inside submitContact QA, then restores
```

### 11.1 `verify:env` Turnstile ping

Posts a dummy token to `siteverify`. A real secret must **reject** it as `invalid-input-response` (or `success: false`). `invalid-input-secret` is a dead key.

### 11.2 `verify:env` Cloudflare ping

Bearer token → `/user/tokens/verify` then `/zones?name=filterhero.net`. Do not print the token.

### 11.3 `verify:security` Turnstile unit

```ts
delete process.env.TURNSTILE_SECRET_KEY;
process.env.NODE_ENV = "development";
assert((await verifyTurnstile(undefined)).ok, "local Turnstile can be skipped");
assert(!shouldEnforceTurnstile("reminder"), "Filter Clock reminders never need Turnstile");

process.env.NODE_ENV = "production";
assert(!(await verifyTurnstile(undefined)).ok, "production without a secret fails closed");
assert(shouldEnforceTurnstile("quote"), "production quotes always check Turnstile");
```

### 11.4 `verify:resend` must not die on Turnstile (FH-291)

The script sends branded templates, then calls `submitContact`. A local secret (or `NODE_ENV=production`) would throw `Could not verify that form` and look like a dead Resend key. The QA block:

1. Saves `TURNSTILE_SECRET_KEY` and `NODE_ENV`.
2. Deletes the secret.
3. If `NODE_ENV === "production"`, sets it to `"test"`.
4. Runs honeypot / quote / clock `submitContact`.
5. Restores both.

Do **not** disable Turnstile in production contact to make verify green.

### 11.5 Live DNS / HTTP (PowerShell)

```powershell
nslookup -type=NS filterhero.net 8.8.8.8
nslookup filterhero.net 8.8.8.8
nslookup www.filterhero.net 8.8.8.8
nslookup -type=MX filterhero.net 8.8.8.8
curl.exe -s https://filterhero.net/api/health
curl.exe -sI https://filterhero.net/
curl.exe -sI https://www.filterhero.net/
```

Expect:

- NS only `ganz` / `marjory` (not Squarespace `nsc*` or `198.185.159.*`)
- Apex A `69.46.46.70`, `Server: railway-hikari`, HSTS from Express
- `www` A Cloudflare anycast, `HTTP/1.1 301`, `Location: https://filterhero.net/`, `Server: cloudflare`
- MX `smtp.google.com`
- health `{"ok":true,"brand":"Filter Hero"}`

Cloudflare DoH if `nslookup` to `8.8.8.8` times out:

```
https://cloudflare-dns.com/dns-query?name=filterhero.net&type=NS
```

---

## 12. Recreate from zero (do not skip rows)

If the zone is destroyed, this is the rebuild. Domain stays at Squarespace the whole time.

1. Mint a valid API token. `pnpm verify:env` until `CLOUDFLARE_TOKEN` is ok.
2. Create zone `filterhero.net`. Do **not** change nameservers yet.
3. Enter §6 rows. Proxy: DNS only except `www`.
4. Single Redirect `www.filterhero.net/*` → `https://filterhero.net/$1` (301). Orange-cloud `www`.
5. Diff against live DNS (or this file + [CLOUDFLARE-NAMESERVERS.md](./CLOUDFLARE-NAMESERVERS.md)) until they match except the www redirect.
6. Squarespace nameservers → `ganz` / `marjory`.
7. Wait for public NS. Confirm apex health, www 301, Gmail, Resend, Klaviyo.
8. Turnstile dashboard: hostnames `localhost`, `127.0.0.1`, `filterhero.net`. Put keys in local `.env` and Railway (secret + `VITE_` site key). Rebuild Railway after the site key changes.
9. `pnpm verify:env`, `pnpm verify:security`, `pnpm smoke`.
10. Do not attach `www` on Railway. Do not orange-cloud `@`. Do not transfer the domain.

---

## 13. Do / Do NOT (the laws this install settled)

**Do**

- Keep the domain at Squarespace. Point **nameservers only** at Cloudflare.
- Copy every record into Cloudflare **before** the NS click.
- Apex DNS-only to Railway. `www` proxied + Single Redirect 301 to apex.
- Grey-cloud mail, DKIM, `_railway-verify`, `_dmarc`, SPF, Klaviyo verification.
- Keep Google MX and `include:_spf.google.com`. Add Klaviyo TXT as a **second** `@` TXT.
- Keep `send.filterhero.net` on Resend. Keep `klv.filterhero.net` on Klaviyo.
- Express sets security headers and HSTS on the apex. Turnstile fail-closed in production.
- Lazy-mount the widget near the viewport. Reset after send. Skip it on `intent=reminder`.
- Treat contact `429` as `rate_limited_contact`. Treat missing token `400` as `bot_check_failed`.
- Keep Cloudflare tokens in local `.env` only.

**Do NOT**

- Transfer `filterhero.net` off Squarespace.
- Change nameservers before the zone matches live DNS plus the www redirect.
- Attach `www` on Railway. Do not delete the apex custom domain to free the slot.
- Orange-cloud `@`, MX, DKIM, or verification hosts.
- Enable Resend receiving on `@`.
- Point `send` at Klaviyo or `klv` at Resend.
- Replace Google SPF with a Resend-only SPF.
- Commit a Cloudflare API token. Do not put tokens or Turnstile secrets in `VITE_` vars. Do not put the token on Railway.
- Add Workers, Pages, or a second Cloudflare “frontend.”
- Call `turnstile.render` on every homepage view. Do not skip `shouldEnforceTurnstile` because the body omitted `turnstileToken`.
- Require Turnstile on Filter Clock reminders.
- Disable production Turnstile to make `verify:resend` green.
- Raise the contact limiter to make smoke green.
- Scale Railway to a second region to “help” DNS (FH-182). DNS is not Railway’s problem.
- Treat leftover resolver cache as a failed NS click (FH-184, FH-185).

---

## 14. What this project is not (Cloudflare catalog)

| Cloudflare product | Status here |
|---|---|
| Workers / Pages / Functions | Not installed. Origin is Railway Express |
| Wrangler / Miniflare | No config in repo |
| KV / D1 / R2 / Queues / DO | Not used. JSON is `/data` on Railway. Postgres is Supabase |
| Tunnel | Not used |
| Custom WAF / Bot Fight on the apex | Apex is grey-cloud; those products would not see apex traffic unless you orange-cloud `@` (forbidden) |
| Turnstile | **Installed** on quote/support only |
| Email Routing | Not used. Google MX stays |
| Cloudflare Images / Stream | Not used. Assets ship in `client/public` |
| Zaraz | Not used. Klaviyo onsite is first-party script tags |

Filter King (the competitor scrape) sits behind **their** Cloudflare. Direct fetches 403’d leftover size×MERV pages (FH-051). That is not this zone. Do not “open our WAF” to fix a scrape of someone else’s shop.

---

## 15. Cloudflare-touching issues — full tickets

Canonical text is `docs/ISSUES-AND-FIXES.md`. Copied here so this file stands alone for DNS and Turnstile.

### FH-183 — Cloudflare API token cannot create the filterhero.net zone

- **Status:** fixed
- **Area:** other
- **Symptom:** `CLOUDFLARE_API_TOKEN` returns Cloudflare `1000 Invalid API Token`. No `filterhero.net` zone exists. The nameserver cutover in `docs/CLOUDFLARE-NAMESERVERS.md` cannot be scripted until a valid token creates the zone and copies records.
- **Do NOT:** Point Squarespace nameservers at Cloudflare before the zone exists and matches live DNS. Do not commit a Cloudflare token. Do not paste the token into chat after this.
- **Do:** Keep the working user token in local `.env` only. Zone `filterhero.net` is created. All checklist records plus the FH-181 www redirect are in the zone. Public NS are now Cloudflare (`ganz` / `marjory`) as of 2026-09-07 01:58 EDT.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`
- **Verify:** Token verify `status=active`. Zone exists. `nslookup -type=NS filterhero.net 8.8.8.8` shows only `ganz` / `marjory`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-181 — www.filterhero.net does not load the shop

- **Status:** mitigated
- **Area:** seo
- **Symptom:** Railway trial allows one custom domain (`filterhero.net` only). `www` cannot be attached. After the Squarespace → Cloudflare NS click, some resolvers return Cloudflare anycast for `www`; others still cache Railway `69.46.46.70`. Recheck 2026-09-07 02:08: HTTPS to `104.21.41.176` completes and **301s** to apex (path + query kept). Default `https://www` on this PC still hits cached CNAME `ckury9c8.up.railway.app` (TTL 14400) and fails `SEC_E_WRONG_PRINCIPAL`. Apex stays 200. See FH-185.
- **Do NOT:** Expect the www CNAME alone to serve the app. Do not delete the apex custom domain to free the slot. Do not orange-cloud mail, DKIM, or verify hosts. Do not attach `www` on Railway.
- **Do:** Keep apex on Railway, DNS only. Keep `www` proxied. Leave the Single Redirect `www.filterhero.net/*` → `https://filterhero.net/$1` (301). Wait for Cloudflare to issue the `www` cert. Old Railway CNAME cache can take a few hours.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`
- **Verify:** `curl.exe -sI --resolve www.filterhero.net:80:104.21.41.176 http://www.filterhero.net/sizes/20x25x1` → 301 `https://filterhero.net/sizes/20x25x1`. Done when `curl.exe -sI https://www.filterhero.net/` → 301 to `https://filterhero.net/` with a valid cert.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07
- **Recheck:** 2026-09-20 — default `https://www.filterhero.net/` 301s to `https://filterhero.net/` via Cloudflare (`Server: cloudflare`). Apex A remains Railway `69.46.46.70`. Do not attach `www` on Railway.

### FH-184 — Recheck 2026-09-07 02:02: apex shop is live; NS and www are not unanimous

- **Status:** mitigated
- **Area:** seo
- **Symptom:** Apex `https://filterhero.net` loads Filter Hero from this PC and from Google / Cloudflare / Quad9 / OpenDNS (all A `69.46.46.70`, health ok, `Server: railway-hikari`). Recheck 02:08: Google / Cloudflare / Quad9 NS are only `ganz` / `marjory`. Leftover is `www` CNAME cache (FH-185).
- **Do NOT:** Treat Google's leftover `nsc*` NS as proof the Squarespace click failed. Do not attach `www` on Railway. Do not change apex off Railway.
- **Do:** Wait for NS and `www` cache to die. Keep using `https://filterhero.net`. FH-181 stays the www ticket until default `https://www.filterhero.net` 301s without `--resolve`.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`
- **Verify:** `nslookup -type=NS filterhero.net 8.8.8.8` is only `ganz` / `marjory`. `nslookup www.filterhero.net 8.8.8.8` has no `69.46.46.70`. `curl.exe -sI https://www.filterhero.net/` is 301 to the apex.
- **Added:** 2026-09-07

### FH-185 — Debug 2026-09-07 02:08: apex shop is 100%; www default and live $50 FAQ are not

- **Status:** mitigated
- **Area:** seo
- **Symptom:** Full resolver + route pass. Apex `https://filterhero.net` is Railway `69.46.46.70`, health ok, title Filter Hero. All 22 shop routes 200 with the SPA shell. **Not 100%:** this PC and Google DoH still cache `www` CNAME `ckury9c8.up.railway.app` (TTL 14400) so default `https://www` fails `SEC_E_WRONG_PRINCIPAL`. Live `$50` shipping copy is fixed (FH-186).
- **Do NOT:** Attach `www` on Railway trial. Do not treat the leftover Railway CNAME as a failed NS click. Do not redeploy the design branch to production just to clear DNS cache.
- **Do:** Share `https://filterhero.net`. Wait out the 4h `www` CNAME.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`, `shared/seo.ts`
- **Verify:** `curl.exe -sI https://www.filterhero.net/` → 301 without `--resolve`. `curl.exe -s https://filterhero.net/llms.txt` has no `$50` (done).
- **Added:** 2026-09-07

### FH-247 — Turnstile loaded on every homepage view and skipped a missing token

- **Status:** fixed
- **Area:** contact
- **Symptom:** Contact and quote forms mounted Cloudflare Turnstile immediately, so `/` logged hidden `challenges.cloudflare.com` `NaN` errors before the shopper reached the form. Local `/api/contact` with a configured secret still accepted a missing token. After a successful send the widget was not reset, so the next submit reused a spent token.
- **Do NOT:** Call `render` before the field is near the viewport. Do not skip `shouldEnforceTurnstile` when a secret is set just because the body omitted `turnstileToken`. Do not require Turnstile on `intent=reminder`. Do not leave `error-callback` unset.
- **Do:** Mount the explicit widget only when the host is near the viewport. Always-visible flexible light widget, expire/timeout reset, handled `error-callback`. Do not call `turnstile.ready()` with `api.js?render=explicit` + `async`. Client blocks send without a token when the site key is set, and reads `turnstile.getResponse()` on submit. Server verifies whenever a secret is configured (or production) and sends `remoteip`. Reset the widget after a successful send.
- **Files:** `client/src/components/TurnstileField.tsx`, `client/src/components/ContactForm.tsx`, `client/src/components/CustomQuoteForm.tsx`, `server/security.ts`, `server/contact.ts`, `server/index.ts`, `scripts/verify-security.ts`, `scripts/smoke-site.ts`
- **Verify:** `/` — no Turnstile script until `#contact` is near. `/#contact` and `/custom-air-filters` show the widget and mint a token. POST `/api/contact` without a token is `400 bot_check_failed`. Filter Clock reminder still posts. `pnpm verify:security`. `pnpm smoke`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

### FH-190 — Quote intake had no bot gate, and CRM routes imported a missing security module

- **Status:** fixed
- **Area:** contact
- **Symptom:** `server/crm/routes.ts` and `pnpm verify:crm` imported `crmLimiter` / `publicError` / Turnstile helpers from `server/security.ts`, which did not exist. `/api/contact` had no rate limit or honeypot. Production Turnstile keys sat unused. Filter Clock reminders must still post without a widget (FH-131).
- **Do NOT:** Require Turnstile on `intent=reminder`. Do not let the CRM send mail. Do not skip `requireStaff` on `/api/crm`.
- **Do:** Keep `server/security.ts` as the public-API gate. Contact limiter is 5 per 15 minutes. Quote/support forms send a honeypot + Turnstile token. `reminder` skips Turnstile. Paid checkout still closes CRM deals fail-soft.
- **Files:** `server/security.ts`, `shared/email-channels.ts`, `server/index.ts`, `server/contact.ts`, `client/src/components/ContactForm.tsx`, `client/src/components/CustomQuoteForm.tsx`, `client/src/components/TurnstileField.tsx`
- **Verify:** `pnpm verify:crm`. Local `GET /api/crm/health` is 401 without a staff session. Local `GET /admin` 200.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-205 — Public API had no headers, leaked parser text, and left browser grants on Postgres

- **Status:** fixed
- **Area:** other
- **Symptom:** Local and Railway origin sent `X-Powered-By: Express` and no CSP / nosniff / frame-deny / HSTS. `POST /api/identify` and `/api/track` returned raw Zod JSON. Malformed JSON dumped a body-parser HTML stack. Identify, track, and checkout had no rate limit. `X-Forwarded-For[0]` could skip limiters. Production Turnstile failed open if the secret was missing. Anon/authenticated still had table grants (RLS was the only gate). `/login?next=/account/../admin` could leave the site path.
- **Do NOT:** Re-enable `X-Powered-By`. Do not return `err.message` or Zod text from identify, track, webhook, or session lookup. Do not parse `X-Forwarded-For` yourself. Do not skip Turnstile in production when the secret is unset (except `intent=reminder`). Do not `CREATE POLICY` on CRM/account tables. Do not `GRANT` those tables to `anon` / `authenticated`.
- **Do:** Express (and Vite in dev) send nosniff, DENY framing, CSP, Referrer-Policy, Permissions-Policy, COOP; HSTS only on HTTPS production. JSON parse errors are `{code:invalid_json}`. Identify 20/min, track 40/min, checkout 10/15min. `req.ip` after `trust proxy 1`. Migration `0004_lock_browser_grants.sql` FORCE RLS + revoke browser grants. `safeNextPath` rejects `..`, `/admin`, `/api`, `/login`.
- **Files:** `server/security.ts`, `server/index.ts`, `server/contact.ts`, `shared/security-headers.ts`, `shared/account-paths.ts`, `vite.config.ts`, `supabase/migrations/0004_lock_browser_grants.sql`, `scripts/verify-security.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm verify:security`. `pnpm verify:crm`. `pnpm verify:account`. `pnpm verify:supabase`. `pnpm smoke`. `curl.exe -sI http://127.0.0.1:3001/api/health` has nosniff and no `X-Powered-By`. Empty identify is `{"code":"identify_failed"}`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-197 — Custom quote honeypot and form reset were not live JS

- **Status:** fixed
- **Area:** contact
- **Symptom:** The custom-quote honeypot used an undeclared or unregistered `website` input, so Vite could fail the module and bots filling "website" still created leads. After a successful contact send, `website` and `turnstileToken` stayed on the form. Turnstile `load` listeners were not removed.
- **Do NOT:** Reference `websiteRef` without declaring it. Do not leave the honeypot as a bare `name="website"` input. Do not skip reset of `website` / `turnstileToken`.
- **Do:** Register the honeypot and POST `website`. Reset both fields after a successful send. Remove the Turnstile script `load` listener on unmount.
- **Files:** `client/src/components/CustomQuoteForm.tsx`, `client/src/components/ContactForm.tsx`, `client/src/components/TurnstileField.tsx`
- **Verify:** `pnpm check`. `pnpm smoke`. POST `/api/contact` with `website` set returns `id: ignored`. Open `/custom-air-filters`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-191 — Local `.env` had no live verifier and `.env.example` omitted live keys

- **Status:** fixed
- **Area:** other
- **Symptom:** Shop keys lived in `.env` (Stripe, Resend, Klaviyo, Supabase, Turnstile, Cloudflare) but nothing asserted formats or pinged the APIs in one pass. `.env.example` omitted Klaviyo list/site IDs and Turnstile/Cloudflare placeholders. A send-only Resend key looked like a domain-list failure if you called `/domains`.
- **Do NOT:** Print secret values. Do not put service-role, Resend, Stripe `sk_`, or Cloudflare tokens in `VITE_` vars. Do not treat a Resend 401 on `/domains` as a dead key when send to `delivered@resend.dev` works.
- **Do:** Keep `SITE_URL` / `VITE_SITE_URL=https://filterhero.net`. Run `pnpm verify:env` after changing `.env`. Local Stripe stays `sk_test_` / `pk_test_`. Klaviyo public site ID is `VnVNmQ`, list `RiTKiS`. Turnstile hostnames include localhost and filterhero.net.
- **Files:** `scripts/verify-env.ts`, `.env.example`, `package.json`, `README.md`
- **Verify:** `pnpm verify:env`. `pnpm verify:supabase`. `pnpm debug:stripe-checkout`. `pnpm check`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-291 — Resend verify died on Turnstile

- **Status:** fixed
- **Area:** contact
- **Symptom:** `pnpm verify:resend` sent the branded templates, then `submitContact` quote QA threw `Could not verify that form` because a local `TURNSTILE_SECRET_KEY` (or `NODE_ENV=production`) enforces the widget. CRM and Klaviyo were already off; Turnstile was not.
- **Do NOT:** Disable Turnstile in production contact. Do not skip `shouldEnforceTurnstile` on quote/support. Do not treat a failed verify as a dead Resend key.
- **Do:** Unset `TURNSTILE_SECRET_KEY` and force a non-production `NODE_ENV` only inside the `submitContact` QA block, then restore both. Clock reminders stay widget-free.
- **Files:** `scripts/verify-resend.ts`, `docs/RESEND.md`, `docs/RESEND-FULL-BUILD.md`
- **Verify:** `pnpm verify:resend` with a real Turnstile secret in `.env`. Output includes send ids for staff, quote, support, and order, plus `submitContact` quote/clock ids.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

### FH-200 — Smoke died on a hot contact limiter, and empty checkout leaked Zod

- **Status:** fixed
- **Area:** contact
- **Symptom:** After earlier quote posts, `pnpm smoke` POSTed `/api/contact` and treated `429 rate_limited_contact` as a total failure. Empty `POST /api/checkout` logged a Zod stack and returned `err.message`. Production staff magic links to `https://filterhero.net/admin` are still not on the Auth allowlist (Site URL fallback is localhost).
- **Do NOT:** Require a successful contact send for smoke. Do not return raw Zod text from checkout. Do not treat a 429 with `rate_limited_contact` as a broken shop.
- **Do:** Smoke proves invalid contact 400, honeypot ignore-or-429, CRM/account 401, and Stripe checkout. Empty cart is `400 checkout_failed`. Add `https://filterhero.net/admin` in Auth → URL configuration before production staff links.
- **Files:** `scripts/smoke-site.ts`, `server/index.ts`, `scripts/verify-supabase.ts`
- **Verify:** `pnpm smoke`. `pnpm verify:supabase`. `pnpm check`. Empty checkout is `{"code":"checkout_failed"}`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-301 — Smoke treated a rate-limited contact post as a Turnstile miss

- **Status:** fixed
- **Area:** contact
- **Symptom:** `pnpm smoke` failed with `invalid contact should 400, got 429` (and then `contact without Turnstile should 400, got 429`) after earlier local posts filled the 5/15-minute contact limiter. The shop was blocking correctly; the suite expected only 400 / `bot_check_failed`.
- **Do NOT:** Raise the contact limiter to make smoke green. Do not skip the Turnstile assertion when the response is 400.
- **Do:** A 429 on the invalid-contact or missing-Turnstile post must be `rate_limited_contact`. A 400 on missing Turnstile must still be `bot_check_failed`. Honeypot already followed this split.
- **Files:** `scripts/smoke-site.ts`
- **Verify:** `pnpm smoke` after five contact posts in the window still passes. Fresh server: missing Turnstile is 400 `bot_check_failed`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

### FH-202 — Lead mail still used the Resend sandbox From

- **Status:** fixed
- **Area:** contact
- **Symptom:** `filterhero.net` was verified on Resend with sending enabled, but local and Railway `RESEND_FROM` was `Filter Hero <onboarding@resend.dev>`. That sandbox identity can only deliver to the Resend account email, so quote/support alerts to `info@filterhero.net` fail or never look like Filter Hero mail.
- **Do NOT:** Send production mail from `onboarding@resend.dev`. Do not enable Resend receiving on `@` (that steals Google MX). Do not replace the Google SPF. Do not orange-cloud `resend._domainkey`, `rsend`, or `send`.
- **Do:** `RESEND_FROM=Filter Hero <info@filterhero.net>`. Default in code is the same if the env is unset. Contact sends use idempotency key `lead-email/{id}`. DMARC is `p=none` at `_dmarc.filterhero.net`. SDK is `resend` 6.x.
- **Files:** `server/contact.ts`, `.env.example`, `scripts/verify-resend.ts`, `docs/CLOUDFLARE-NAMESERVERS.md`, `docs/RESEND-FULL-BUILD.md`
- **Verify:** `pnpm verify:resend` sends to `delivered@resend.dev` from `info@filterhero.net`. Railway `RESEND_FROM` matches.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-196 — This branch had Klaviyo keys and DNS but no live integration

- **Status:** fixed
- **Area:** contact
- **Symptom:** `.env` already had the Filter Hero Klaviyo site ID / list, and Cloudflare already served `klv` + DKIM + site verification. This branch had no `server/klaviyo.ts`, no onsite boot, and no events from contact / clock / cart / Stripe. Shoppers never reached the marketing list or the seven Filter Hero flows.
- **Do NOT:** Send a second order confirmation or quote receipt from a Klaviyo flow. Do not write `next_change_date` from Filter Clock or `/api/identify`. Do not point `send.filterhero.net` at Klaviyo.
- **Do:** Server tracks quote / support / clock / checkout / Placed Order. Marketing list join needs the checkbox. Clock save stores `clock_next_change_date` only. Replenish starts on `Placed Order`. Catalog feed is `/api/klaviyo/catalog.json`. Sending domain `klv.filterhero.net` stays the marketing host.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-201 — Production shop had Klaviyo keys but no live routes

- **Status:** fixed
- **Area:** contact
- **Symptom:** Railway already had Klaviyo keys. The live shop still served the pre-Klaviyo build, so `/api/klaviyo/config` and catalog 404ed and onsite never loaded.
- **Do NOT:** Point `send.filterhero.net` at Klaviyo. Do not write `next_change_date` from Filter Clock or `/api/identify`. Do not add an order-confirmation flow.
- **Do:** Keep the three Klaviyo vars on Railway. Sending domain `klv.filterhero.net` stays active.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-182 — Railway trial deploy failed when a second region was set

- **Status:** fixed
- **Area:** other
- **Symptom:** Deploy failed with “Your plan can only deploy to a single region.” Not a Cloudflare bug. Logged here because the nameserver cutover doc forbids scaling a second region “to help DNS.”
- **Do NOT:** Add Amsterdam, `eu-west`, or a second region while the workspace is on trial.
- **Do:** Keep one replica in `us-east4-eqdc4a`. DNS stays Cloudflare’s job.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

### FH-131 — Filter Clock must not send replacement emails before a purchase

- **Status:** mitigated
- **Area:** clock
- **Symptom:** Clock copy promised “we’ll email you before {date}” when someone only checked or saved a cadence. Replenish mail must not start until they buy. This is why Turnstile is skipped on `intent=reminder` — the clock is a calculator POST, not a public quote form.
- **Do NOT:** Enroll `replenish` from Filter Clock check, house-profile save, or `Signed Up Reminder` / `intent: "reminder"` without `Placed Order`. Do not hang a Turnstile widget on the clock.
- **Do:** Clock is a calculator. Store cadence on the profile if they save it. Set the sendable `next_change_date` and enroll replenish only on `Placed Order`.
- **Added:** 2026-09-01

### FH-051 — Leftover Filter King ladders were modeled, not live

- **Status:** mitigated
- **Area:** pricing
- **Symptom:** About 19,540 leftover Filter King size×MERV pages had only estimated ladders. Direct fetches hit **Filter King’s** Cloudflare 403. Not this zone.
- **Do NOT:** Re-scrape those leftover MERV URLs one credit each. Do not change Filter Hero’s Cloudflare settings to “fix” a competitor scrape.
- **Added:** 2026-08-29

---

## 16. Adjacent issues that shaped the same files

These are not DNS tickets. They share `server/security.ts`, CSP, contact, or the live hostname.

| Id | Status | Why it sits next to Cloudflare |
|---|---|---|
| FH-186 | fixed | Live FAQ still said `$50` during the NS cutover window; do not redeploy the design branch to clear DNS cache |
| FH-187 / FH-210 / FH-304 | fixed / open | `railway up` vs GitHub autodeploy. DNS was fine; origin code was not |
| FH-188 / FH-189 | fixed | CRM/accounts + Vite env, including `VITE_TURNSTILE_SITE_KEY` typing |
| FH-209 / FH-212 / FH-231 | fixed | CSP / CORS for Klaviyo onsite. Same header map as Turnstile |
| FH-246 | fixed | `verify:resend` real templates; later needed FH-291 so Turnstile did not abort it |
| FH-306 | open | Railway healthcheck. Hit `/api/health` on the apex, not Cloudflare |

---

## 17. Complete issue index (FH-031 – FH-306)

Every Filter Hero ticket, including ones that never touched Cloudflare. Canonical **Do / Do NOT / Files / Verify** is still [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md). There is no FH-036.

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

FH-177 and FH-178 were logged twice in the source file; they are one fix each.

---

## 18. Related docs

| File | Topic |
|---|---|
| [ISSUES-AND-FIXES.md](./ISSUES-AND-FIXES.md) | Canonical bug log. Never reuse ids |
| [CLOUDFLARE-NAMESERVERS.md](./CLOUDFLARE-NAMESERVERS.md) | Zone rows, NS names, cutover checklist |
| [RAILWAY-FULL-BUILD.md](./RAILWAY-FULL-BUILD.md) | Origin, TLS, custom domain slot, `trust proxy` |
| [RESEND-FULL-BUILD.md](./RESEND-FULL-BUILD.md) | `send` / DKIM / DMARC — DNS only |
| [KLAVIYO-FULL-BUILD.md](./KLAVIYO-FULL-BUILD.md) | `klv` + DKIM + site verification — DNS only |
| [UI FULL BUILD.md](./UI%20FULL%20BUILD.md) | `TurnstileField` in the shop UI |
| [CRM.md](./CRM.md) | Contact limiter, honeypot, Turnstile on quote/support |

---

## 19. File checklist — the Cloudflare install in one glance

| Role | Path |
|---|---|
| Zone rows | `docs/CLOUDFLARE-NAMESERVERS.md` |
| This guide | `docs/cloudflare FULL BUILD.md` |
| Token / siteverify ping | `scripts/verify-env.ts` |
| Fail-closed + CSP tests | `scripts/verify-security.ts` |
| Missing-token smoke | `scripts/smoke-site.ts` |
| Verify must not disable prod Turnstile | `scripts/verify-resend.ts` |
| Widget | `client/src/components/TurnstileField.tsx` |
| Quote / support mount | `ContactForm.tsx`, `CustomQuoteForm.tsx` |
| Clock skip | `client/src/components/FilterPower.tsx` |
| siteverify + limiter | `server/security.ts` |
| Contact gate | `server/contact.ts`, `server/index.ts` |
| CSP / HSTS | `shared/security-headers.ts` |
| Dev headers | `vite.config.ts` |
| Env placeholders | `.env.example` |
| Staff dots | `server/admin/data.ts`, `client/src/pages/admin/Security.tsx` |
| Issue log | `docs/ISSUES-AND-FIXES.md` |

That is how Cloudflare is installed in this project. Anything else is a new ticket, and it gets the next `FH-XXX`.
