/**
 * Intuit OAuth 2.0 error handling for the developer questionnaire:
 * expired access tokens, expired refresh tokens, invalid_grant, CSRF.
 *
 * Pure functions so verify:intuit-oauth can prove each case without keys.
 */

export const INTUIT_AUTHORIZATION_ENDPOINT =
  "https://appcenter.intuit.com/connect/oauth2";
export const INTUIT_TOKEN_ENDPOINT =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const INTUIT_REVOCATION_ENDPOINT =
  "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

export const INTUIT_SCOPE =
  "com.intuit.quickbooks.accounting openid profile email";

/** Access tokens last 60 minutes. Refresh 60s early so a slow request still works. */
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
export const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000;
/** Unused refresh tokens last 100 days. */
export const REFRESH_TOKEN_TTL_MS = 100 * 24 * 60 * 60 * 1000;
/** Authorization `state` is one-shot and short-lived. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type OauthErrorKind =
  | "expired_access_token"
  | "expired_refresh_token"
  | "invalid_grant"
  | "csrf"
  | "oauth_denied"
  | "other";

export type OauthAction = "refresh" | "reauthorize" | "reject" | "none";

export type OauthCallbackQuery = {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  error_description?: string | null;
  realmId?: string | null;
};

export type CallbackOk = {
  ok: true;
  code: string;
  realmId: string | null;
  state: string;
};

export type CallbackFail = {
  ok: false;
  kind: OauthErrorKind;
  action: OauthAction;
  message: string;
};

export type TokenEndpointBody = {
  error?: unknown;
  error_description?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  x_refresh_token_expires_in?: unknown;
  token_type?: unknown;
};

export function timingSafeEqual(left: string, right: string): boolean {
  const max = Math.max(left.length, right.length, 1);
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < max; i++) {
    mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return mismatch === 0 && left.length === right.length && left.length > 0;
}

export function statesMatch(
  expected: string | null | undefined,
  received: string | null | undefined,
): boolean {
  if (!expected || !received) return false;
  return timingSafeEqual(expected, received);
}

export function isPendingStateFresh(createdAt: number, now: number): boolean {
  return now - createdAt >= 0 && now - createdAt <= OAUTH_STATE_TTL_MS;
}

export function isAccessTokenExpired(expiresAt: number, now: number): boolean {
  return now >= expiresAt - ACCESS_TOKEN_REFRESH_SKEW_MS;
}

export function isRefreshTokenExpired(refreshExpiresAt: number, now: number): boolean {
  return now >= refreshExpiresAt;
}

export function actionForKind(kind: OauthErrorKind): OauthAction {
  if (kind === "expired_access_token") return "refresh";
  if (kind === "expired_refresh_token" || kind === "invalid_grant") return "reauthorize";
  if (kind === "csrf" || kind === "oauth_denied") return "reject";
  return "none";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function classifyTokenEndpointError(
  status: number,
  body: TokenEndpointBody | string | null | undefined,
): OauthErrorKind {
  const blob =
    typeof body === "string"
      ? body
      : `${asText(body?.error)} ${asText(body?.error_description)}`.trim();
  const lower = blob.toLowerCase();

  if (lower.includes("invalid_grant") || status === 400 && lower.includes("grant")) {
    return "invalid_grant";
  }
  if (
    lower.includes("refresh token") &&
    (lower.includes("expir") || lower.includes("invalid") || lower.includes("revok"))
  ) {
    return "expired_refresh_token";
  }
  if (status === 400 && lower.includes("invalid_grant")) return "invalid_grant";
  if (lower.includes("invalid_grant")) return "invalid_grant";
  if (status === 401 && (lower.includes("access token") || lower.includes("expired"))) {
    return "expired_access_token";
  }
  if (status === 401) return "expired_access_token";
  return "other";
}

/**
 * QBO Accounting returns 401 when the access token is stale.
 * After one refresh+retry, a second 401 means reconnect.
 */
export function classifyApiStatus(
  status: number,
  alreadyRefreshed: boolean,
): OauthErrorKind | null {
  if (status !== 401) return null;
  return alreadyRefreshed ? "expired_refresh_token" : "expired_access_token";
}

export function handleApiUnauthorized(alreadyRefreshed: boolean): OauthAction {
  return alreadyRefreshed ? "reauthorize" : "refresh";
}

export function classifyCallback(input: {
  query: OauthCallbackQuery;
  expectedState: string | null | undefined;
  pendingFresh: boolean;
}): CallbackOk | CallbackFail {
  const state = input.query.state?.trim() || "";
  const oauthError = input.query.error?.trim() || "";
  const description = input.query.error_description?.trim() || oauthError;

  if (!state || !input.expectedState || !input.pendingFresh) {
    return fail("csrf", "That sign-in was missing or expired. Start it again from this site.");
  }
  if (!statesMatch(input.expectedState, state)) {
    return fail("csrf", "That sign-in did not match the request we sent. Start it again.");
  }
  if (oauthError) {
    const lower = `${oauthError} ${description}`.toLowerCase();
    if (lower.includes("access_denied") || lower.includes("denied")) {
      return fail("oauth_denied", "QuickBooks access was declined.");
    }
    if (lower.includes("invalid_grant")) {
      return fail("invalid_grant", "QuickBooks rejected that grant. Connect again.");
    }
    return fail("other", description || "QuickBooks returned an error.");
  }
  const code = input.query.code?.trim() || "";
  if (!code) {
    return fail("csrf", "That sign-in had no authorization code. Start it again.");
  }
  return {
    ok: true,
    code,
    realmId: input.query.realmId?.trim() || null,
    state,
  };
}

function fail(kind: OauthErrorKind, message: string): CallbackFail {
  return { ok: false, kind, action: actionForKind(kind), message };
}

export function staffMessageFor(kind: OauthErrorKind): string {
  switch (kind) {
    case "expired_access_token":
      return "The QuickBooks access token expired. We will refresh it and retry.";
    case "expired_refresh_token":
      return "The QuickBooks refresh token expired. Connect QuickBooks again.";
    case "invalid_grant":
      return "QuickBooks rejected the grant. Connect again — the previous tokens are no longer valid.";
    case "csrf":
      return "That QuickBooks sign-in failed a CSRF check. Start connect from this site, not from a forwarded link.";
    case "oauth_denied":
      return "QuickBooks access was declined.";
    default:
      return "QuickBooks could not complete that request.";
  }
}

export function buildAuthorizeUrl(input: {
  authorizationEndpoint?: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const url = new URL(input.authorizationEndpoint || INTUIT_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.scope || INTUIT_SCOPE);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export function parseTokenResponse(
  body: TokenEndpointBody,
  now: number,
  realmId: string | null,
): {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  realmId: string | null;
} | null {
  const accessToken = asText(body.access_token).trim();
  const refreshToken = asText(body.refresh_token).trim();
  if (!accessToken || !refreshToken) return null;
  const expiresIn =
    typeof body.expires_in === "number" && body.expires_in > 0
      ? body.expires_in
      : ACCESS_TOKEN_TTL_MS / 1000;
  const refreshExpiresIn =
    typeof body.x_refresh_token_expires_in === "number" && body.x_refresh_token_expires_in > 0
      ? body.x_refresh_token_expires_in
      : REFRESH_TOKEN_TTL_MS / 1000;
  return {
    accessToken,
    refreshToken,
    accessExpiresAt: now + expiresIn * 1000,
    refreshExpiresAt: now + refreshExpiresIn * 1000,
    realmId,
  };
}
