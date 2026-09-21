# Intuit OAuth error handling

Filter Hero’s QuickBooks Online app must answer **Yes** to Intuit’s questionnaire item 6. This file is the implementation of those four cases. Checkout still stays on Stripe. Discovery URLs stay in [INTUIT-OAUTH-DISCOVERY.md](./INTUIT-OAUTH-DISCOVERY.md).

Prove it: `pnpm verify:intuit-oauth`

## Questionnaire

| # | Scenario | What the app does |
|---|---|---|
| a | Expired access token | Access tokens last 60 minutes. On local expiry, or on a QBO `401`, refresh once with the latest refresh token and retry the API call. |
| b | Expired refresh token | Refresh tokens last 100 days unused. If `refreshExpiresAt` is past, do **not** call Intuit. Clear tokens and ask staff to Connect again. |
| c | `invalid_grant` | Returned when a code is reused, a refresh token was rotated/revoked, or credentials do not match. Stop retrying. Mark reconnect. Staff Connects again. |
| d | CSRF | Connect issues a 32-byte `state`, stores it for 10 minutes, and sets `fh_intuit_oauth_state`. The callback rejects a missing, mismatched, stale, or replayed `state` and never exchanges the code. |

## Routes

| Method | Path | Gate |
|---|---|---|
| POST | `/api/admin/intuit/connect` | Staff. Returns Intuit authorize URL and sets the CSRF cookie. |
| GET | `/api/admin/intuit/status` | Staff. |
| POST | `/api/admin/intuit/disconnect` | Staff. Revokes the refresh token when possible. |
| GET | `/api/intuit/oauth/callback` | Public (Intuit redirect). CSRF `state` required. Redirects to `/admin/settings?intuit=…`. |

Redirect URI defaults:

- Production: `https://filterhero.net/api/intuit/oauth/callback`
- Local: `http://localhost:3001/api/intuit/oauth/callback`

Override with `INTUIT_REDIRECT_URI`. Production keys cannot use localhost.

Live (filterhero.net): `pnpm setup:intuit-live` copies `INTUIT_PRODUCTION_CLIENT_ID` / `INTUIT_PRODUCTION_CLIENT_SECRET` onto Railway as `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET`, sets `INTUIT_ENVIRONMENT=production`, and uses the production redirect URI. Tokens persist on the Railway volume (`DATA_DIR=/data`). Connect from `https://filterhero.net/admin/settings` after that URI is listed on Intuit **Keys & OAuth → Production**.

## Env

```
INTUIT_CLIENT_ID=
INTUIT_CLIENT_SECRET=
INTUIT_ENVIRONMENT=sandbox
INTUIT_REDIRECT_URI=http://localhost:3001/api/intuit/oauth/callback
```

Never prefix these with `VITE_`. Tokens are stored in `server/data/intuit-oauth.json` (gitignored). Always persist the **new** refresh token Intuit returns; using the previous value is `invalid_grant`.

`pnpm connect:intuit` checks that Intuit accepts the client (a dummy refresh returns `invalid_grant`, not `invalid_client`) and prints the authorize URL.

## Staff UI

`/admin/settings` → QuickBooks Online. Connect / Connect again / Disconnect. Callback errors (`csrf`, `invalid_grant`, `expired_refresh_token`, …) show the same copy as `staffMessageFor`.
