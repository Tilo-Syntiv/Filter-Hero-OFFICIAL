/**
 * Constant Contact OAuth 2.0 — Authorization Code flow.
 * The client secret stays on the server. Tokens stay in DATA_DIR.
 */

export const CC_AUTHORIZE_ENDPOINT =
  "https://authz.constantcontact.com/oauth2/default/v1/authorize";
export const CC_TOKEN_ENDPOINT =
  "https://authz.constantcontact.com/oauth2/default/v1/token";
export const CC_API_BASE = "https://api.cc.email/v3";

/** Space-delimited on the authorize request. offline_access is required for a refresh token. */
export const CC_SCOPES = ["account_read", "contact_data", "campaign_data", "offline_access"] as const;

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
/** Docs: an unused refresh token expires after 180 days. Each rotation starts a new one. */
export const REFRESH_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export const ACCESS_SKEW_MS = 60 * 1000;

export type OauthErrorKind =
  | "expired_access_token"
  | "expired_refresh_token"
  | "invalid_grant"
  | "invalid_client"
  | "csrf"
  | "oauth_denied"
  | "other";

export type TokenEndpointBody = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export type ParsedTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  scope: string | null;
};

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: CC_SCOPES.join(" "),
    state: input.state,
    prompt: "login",
  });
  return `${CC_AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

export function parseTokenResponse(body: TokenEndpointBody, now: number): ParsedTokens | null {
  if (!body.access_token || !body.refresh_token) return null;
  const expiresIn = Number(body.expires_in);
  const accessMs = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 60 * 60 * 1000;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    accessExpiresAt: now + accessMs,
    refreshExpiresAt: now + REFRESH_LIFETIME_MS,
    scope: body.scope ?? null,
  };
}

export function isAccessTokenExpired(accessExpiresAt: number, now: number): boolean {
  return now + ACCESS_SKEW_MS >= accessExpiresAt;
}

export function isRefreshTokenExpired(refreshExpiresAt: number, now: number): boolean {
  return now >= refreshExpiresAt;
}

export function classifyTokenError(status: number, body: TokenEndpointBody): OauthErrorKind {
  const error = (body.error || "").toLowerCase();
  if (error === "invalid_client" || status === 401) return "invalid_client";
  if (error === "invalid_grant") return "invalid_grant";
  return "other";
}

export function staffMessageFor(kind: OauthErrorKind): string {
  switch (kind) {
    case "expired_access_token":
      return "The Constant Contact access token expired. Refresh it and retry.";
    case "expired_refresh_token":
      return "The Constant Contact connection expired. Connect again from Settings.";
    case "invalid_grant":
      return "Constant Contact rejected the login or the saved refresh token. Connect again from Settings.";
    case "invalid_client":
      return "Constant Contact rejected the API key or client secret.";
    case "csrf":
      return "That Constant Contact login did not match the one this browser started. Connect again.";
    case "oauth_denied":
      return "Constant Contact login was cancelled.";
    default:
      return "Constant Contact could not complete that request.";
  }
}
