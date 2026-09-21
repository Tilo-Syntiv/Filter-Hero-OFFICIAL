# Cloudflare nameservers (live — apex 100%, www cache still draining)

**Summary:** Keep `filterhero.net` registered at Squarespace. When we want a DNS API, point **nameservers only** at Cloudflare. Copy every record into Cloudflare first. Do not transfer the domain.

**Why this file exists:** Squarespace has no public DNS API. Railway, Resend, and Klaviyo all need records we cannot script today. This is the cutover checklist.

**Gate (2026-09-07 01:58 EDT):** Squarespace NS click is done. Google, Cloudflare (`1.1.1.1`), and SOA show only `ganz` / `marjory`. Apex shop, Google MX, SPF, Klaviyo, Resend, and Railway verify are live on Cloudflare. `www` A is orange-cloud (`104.21.41.176`, `172.67.149.19`). HTTP `www` already 301s to `https://filterhero.net` + path. HTTPS `www` is not ready: Cloudflare Universal SSL handshake fails; some clients still follow a cached Railway CNAME and get the old TLS / 404 (FH-181).

**Last snapshot:** 2026-09-07 02:20 EDT (live copy matches shop).

**Debug 2026-09-07 02:08 EDT:** Apex shop is 100% — health, 22 routes, sitemap (10006 URLs), assets, HTTP→HTTPS, custom domain ACTIVE. Authoritative Cloudflare `www` HTTPS **301s** to apex. Default `www` on this PC and Google DoH still follow cached CNAME `ckury9c8.up.railway.app` (TTL 14400) and fail TLS (FH-185).

**Live 2026-09-07 02:20 EDT:** Railway `98fd8aed` SUCCESS. FAQ, meta, `/llms.txt`, size pages, and custom-quote FAQ all say free shipping on every order. No `$50` (FH-186).

## Live check 2026-09-07 01:58 EDT (after NS change)

| Check | Result |
|---|---|
| NS | Cloudflare `ganz.ns.cloudflare.com`, `marjory.ns.cloudflare.com` on Google and `1.1.1.1`. SOA primary `ganz` |
| Apex A | `69.46.46.70` (Railway, DNS only). No AAAA |
| `https://filterhero.net/api/health` | `{"ok":true,"brand":"Filter Hero"}` |
| `https://filterhero.net/` | 200 |
| `/sizes/20x25x1`, `/sitemap.xml` | 200 |
| MX | `smtp.google.com` priority 1 |
| TXT `@` | Google SPF + `klaviyo-site-verification=VnVNmQ` |
| `_railway-verify` | present |
| `resend._domainkey` / `rsend` / `send` | present, Resend targets |
| `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@filterhero.net` |
| `klv` / `mtd1._domainkey` / `mtd2._domainkey` | present, Klaviyo targets |
| `www` A | Cloudflare `104.21.41.176`, `172.67.149.19` (proxied) |
| `www` leftover | Some resolvers still cache CNAME `ckury9c8.up.railway.app` (~3–4h TTL) |
| `http://www.filterhero.net/...` via CF | **301** to `https://filterhero.net/...` (path + query kept) |
| `https://www.filterhero.net/` via CF | **FAIL** — TLS handshake abort (Universal SSL not issued yet) |
| default `https://www` | **FAIL** — `SEC_E_WRONG_PRINCIPAL`, then Railway `404` (cached Railway path) |
| Service host | `https://filter-hero-production.up.railway.app/api/health` 200 |

Apex shoppers and mail are fine. Do not transfer the domain. Wait for Cloudflare to finish the `www` certificate. Do not attach `www` on Railway.

## Do not

- Transfer the domain off Squarespace.
- Change nameservers until the Cloudflare zone already has every row in [Records to copy](#records-to-copy) plus the www redirect.
- Delete Google MX or the Google SPF TXT.
- Point `send.filterhero.net` at Klaviyo. That host is Resend.
- Orange-cloud (proxy) mail, DKIM, or verification hosts. Those must be **DNS only**.
- Orange-cloud `@` on day one. Apex stays DNS-only to Railway.
- Enable Resend receiving on `@` (that steals Google MX).
- Replace the Google SPF with a Resend-only SPF. Never drop `include:_spf.google.com`.
- Commit a Cloudflare API token.
- Scale Railway to a second region on the trial plan (FH-182).

## Do

1. Mint a valid Cloudflare API token (FH-183). Create a free Cloudflare zone for `filterhero.net`. Do not change Squarespace NS yet.
2. Enter every record below. Proxy status: **DNS only** except `www`.
3. Add a Cloudflare Single Redirect: `www.filterhero.net/*` → `https://filterhero.net/$1` (301). `www` must be **proxied** for that rule to run. Railway trial cannot attach `www` (FH-181).
4. Compare Cloudflare’s zone against live Squarespace DNS until they match (except the www redirect).
5. In Squarespace → domain → nameservers, replace `nsc1`–`nsc4.squarespacedns.com` with the two Cloudflare nameservers. Leave the domain at Squarespace.
6. Wait until `nslookup -type=NS filterhero.net 8.8.8.8` shows only Cloudflare.
7. Confirm site (apex and www), Gmail, Resend, and Klaviyo.

## Current nameservers (live at Cloudflare)

```
ganz.ns.cloudflare.com
marjory.ns.cloudflare.com
```

## Cloudflare nameservers (already pasted at Squarespace)

```
ganz.ns.cloudflare.com
marjory.ns.cloudflare.com
```

## Records to copy

Cloudflare names omit `.filterhero.net`. `@` is the root.

### Site (Railway)

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `ckury9c8.up.railway.app` | DNS only |
| CNAME | `www` | `ckury9c8.up.railway.app` | **Proxied** (redirect only; see Do §3) |
| TXT | `_railway-verify` | `railway-verify=9c1c72eeb007b5e41f10616349a1ac7f2b23a3ce6c054fe65848b0a552fb52d1` | DNS only |

Railway still lists that CNAME target for the apex custom domain. The clickable service hostname is `filter-hero-production.up.railway.app`. Do not point `@` at the service hostname unless Railway’s domain status page changes.

### Google Workspace mail

| Type | Name | Content | Proxy |
|---|---|---|---|
| MX | `@` | `smtp.google.com` (priority 1) | DNS only |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | DNS only |

### Resend (transactional)

| Type | Name | Content | Proxy |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDY0W7t8ajkqaBCLXw2hZewiuzDcM6kwa2lr/9LaJpxRCFTonmmcigVp7oqwhQJN7SjYE1BoVnWCVLxd06C8sudInqcGkp+/Lbi7+QaznZ2G8rYLQm4yoJ+GV04ig19JgGX2EXUHQkX1RfsCWTRIlQ2Oa3XRxCpfXTPe26ghUsMSQIDAQAB` | DNS only |
| CNAME | `rsend` | `rsend.forge.rmta.net` | DNS only |
| CNAME | `send` | `send.forge.rmta.net` | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@filterhero.net` | DNS only |

Re-copy the DKIM `p=` from live DNS if Resend rotated it. DMARC stays `p=none` until reports look clean. Do not jump to `p=reject` on day one.

### Klaviyo (marketing)

| Type | Name | Content | Proxy |
|---|---|---|---|
| TXT | `@` | `klaviyo-site-verification=VnVNmQ` | DNS only |
| CNAME | `klv` | `3840918940202419532.klaviyodns.com` | DNS only |
| CNAME | `mtd1._domainkey` | `mtd1._domainkey.3840918940202419532.klaviyodns.com` | DNS only |
| CNAME | `mtd2._domainkey` | `mtd2._domainkey.3840918940202419532.klaviyodns.com` | DNS only |

## Verify after the NS change

```powershell
nslookup -type=NS filterhero.net 8.8.8.8
nslookup filterhero.net 8.8.8.8
nslookup www.filterhero.net 8.8.8.8
nslookup -type=MX filterhero.net 8.8.8.8
curl.exe -s https://filterhero.net/api/health
curl.exe -sI https://www.filterhero.net/
```

Expect Cloudflare NS only, apex on Railway (not `198.185.159.*`), MX `smtp.google.com`, health `{"ok":true,"brand":"Filter Hero"}`, and www a 301/308 to `https://filterhero.net/`.

## Related

- FH-181, FH-182, FH-183 in `docs/ISSUES-AND-FIXES.md`
- Railway service `FILTER-HERO` on project `9e90c440-beba-417a-a984-97e328749e16`
