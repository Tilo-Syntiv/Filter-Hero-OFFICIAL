# Intuit OAuth / OpenID discovery

Filter Hero checkout stays on Stripe. Books stay in QuickBooks Online. This file is the Intuit Developer **authorization discovery document** for a QBO app: how to fetch the current OAuth 2.0 and OpenID Connect URLs, and the live values pulled on **2026-09-16**.

Do not hard-code the sample URLs from Intuit’s HTML docs. Call discovery and use what comes back.

Source: [Authorization discovery documents](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-openid-discovery-doc)

Related: [OpenID Connect](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/openid-connect) · [App settings (geolocation / IP)](https://developer.intuit.com/app/developer/qbo/docs/get-started/app-settings) · [Stripe + books](./STRIPE-BOOKS.md)

Re-fetch: `pnpm verify:intuit-discovery`

## 1. What discovery is

If you set up OAuth 2.0 or OpenID Connect, you need current URLs for:

- authorization requests
- access tokens
- user info
- public keys (JWKS)
- token revoke
- supported scopes, response types, and claims

Intuit publishes those as JSON at well-known endpoints. SDKs call this for you. A manual HTTPS client does a GET.

## 2. Endpoints to GET

| Environment | Discovery URL |
|---|---|
| Production | `https://developer.api.intuit.com/.well-known/openid_configuration` |
| Sandbox / testing | `https://developer.api.intuit.com/.well-known/openid_sandbox_configuration` |

Request:

```http
GET https://developer.api.intuit.com/.well-known/openid_configuration HTTP/1.1
Accept: application/json
```

This call does **not** need a Client ID, Client Secret, or access token.

## 3. Live results (2026-09-16)

Executed from this machine (`Accept: application/json`). Both documents returned HTTP 200. `jwks_uri` returned **2** public keys (key material is not stored here). Re-run: `pnpm verify:intuit-discovery`.

### Production

```json
{
  "issuer": "https://oauth.platform.intuit.com/op/v1",
  "authorization_endpoint": "https://appcenter.intuit.com/connect/oauth2",
  "token_endpoint": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  "userinfo_endpoint": "https://accounts.platform.intuit.com/v1/openid_connect/userinfo",
  "revocation_endpoint": "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
  "jwks_uri": "https://oauth.platform.intuit.com/op/v1/jwks",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "email", "profile", "address", "phone"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
  "claims_supported": ["aud", "exp", "iat", "iss", "realmid", "sub"]
}
```

### Sandbox

Same as production except:

| Field | Production | Sandbox |
|---|---|---|
| `userinfo_endpoint` | `https://accounts.platform.intuit.com/v1/openid_connect/userinfo` | `https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo` |

Authorization, token, revoke, issuer, and JWKS are shared.

### Docs sample vs live

Intuit’s HTML sample is stale in three places. Use live discovery.

| Field | Docs sample | Live 2026-09-16 |
|---|---|---|
| `userinfo_endpoint` | `https://accounts.intuit.com/v1/openid_connect/userinfo` | `https://accounts.platform.intuit.com/v1/openid_connect/userinfo` |
| `revocation_endpoint` | `https://developer.API.intuit.com/v2/oauth2/tokens/revoke` | `https://developer.api.intuit.com/v2/oauth2/tokens/revoke` |
| `claims_supported` | `realmId` | `realmid` |

## 4. What each URL is for

| Field | Use |
|---|---|
| `issuer` | OpenID issuer. ID-token `iss` must match this. |
| `authorization_endpoint` | Browser redirect. User signs in and consents. Response type is `code` only. |
| `token_endpoint` | Exchange the auth code for tokens, or refresh. Auth methods: `client_secret_basic` or `client_secret_post`. |
| `userinfo_endpoint` | GET with `Authorization: Bearer {access_token}` after OpenID scopes. |
| `revocation_endpoint` | POST to revoke access or refresh tokens. |
| `jwks_uri` | Public keys to verify ID-token signatures (`RS256`). |
| `scopes_supported` | OpenID claims scopes only. QBO Accounting uses additional scopes such as `com.intuit.quickbooks.accounting` (see [Learn about scopes](https://developer.intuit.com/app/developer/qbo/docs/learn/scopes)). |
| `claims_supported` | ID-token claims. `realmid` is the QuickBooks company id. |

Accounting API hosts are **not** in the OpenID discovery document:

| Environment | QBO Accounting API |
|---|---|
| Production | `https://quickbooks.api.intuit.com` |
| Sandbox | `https://sandbox-quickbooks.api.intuit.com` |

## 5. SDK vs manual GET

From Intuit’s page. Filter Hero has no Intuit SDK yet; the verify script uses the manual GET.

| SDK | Discovery |
|---|---|
| .NET | `OAuth2Client` loads `DiscoveryDoc` |
| Java | `new DiscoveryAPIClient().callDiscoveryAPI(Environment.SANDBOX)` — switch enum to `PRODUCTION` |
| PHP / Node.js / Python / Ruby | Client stores the URLs; no extra call |

## 6. Filter Hero — what this is not

Checkout, tax-at-payment, and the ledger are unchanged:

- Pay on Stripe. Do not move payment into QBO.
- Sales tax is QBO Automated Sales Tax + the Stripe Connector. See `docs/STRIPE-BOOKS.md`.
- Discovery is only for an Intuit Developer app (OAuth / OpenID). It is not a replacement for the Stripe Connector.

Intuit’s optional **Geolocation** app-settings field asked for a hosted IP. The public IP of this workstation on 2026-09-16 was `23.94.155.123`. That field is not a firewall allowlist of Intuit’s servers. If the app later runs on Railway / another host, send **that** host’s egress IP instead.

## 7. Client keys and connect

Keys live in `.env` as `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET` (gitignored, never `VITE_`). Redirect URI for local sandbox:

`http://localhost:3001/api/intuit/oauth/callback`

That exact URI must be saved on the Intuit app ([redirect URIs](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/set-redirect-uri)). Production cannot use localhost.

Prove URLs: `pnpm verify:intuit-discovery`  
Prove error handling: `pnpm verify:intuit-oauth`  
Prove keys + print authorize URL: `pnpm connect:intuit`  
Staff UI: `/admin/settings` → QuickBooks Online → Connect

See [INTUIT-OAUTH.md](./INTUIT-OAUTH.md).
