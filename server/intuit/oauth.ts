/**
 * Intuit OAuth 2.0 — authorization code, refresh, revoke.
 * Development keys locally (localhost). Production keys cannot use localhost.
 */
import { randomBytes } from "node:crypto";
import {
  INTUIT_REVOCATION_ENDPOINT,
  INTUIT_TOKEN_ENDPOINT,
  actionForKind,
  buildAuthorizeUrl,
  classifyApiStatus,
  classifyCallback,
  classifyTokenEndpointError,
  isAccessTokenExpired,
  isPendingStateFresh,
  isRefreshTokenExpired,
  parseTokenResponse,
  staffMessageFor,
  type OauthAction,
  type OauthErrorKind,
  type TokenEndpointBody,
} from "../../shared/intuit-oauth";
import {
  filePendingStore,
  fileTokenStore,
  type PendingStore,
  type StoredIntuitTokens,
  type TokenStore,
} from "./store";

export type IntuitConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
  tokenEndpoint: string;
  revocationEndpoint: string;
  accountingHost: string;
};

export type OauthResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: OauthErrorKind;
      action: OauthAction;
      message: string;
      status: number;
    };

export type IntuitStatus = {
  configured: boolean;
  connected: boolean;
  needsReauthorize: boolean;
  environment: "sandbox" | "production" | null;
  realmId: string | null;
  connectedAt: string | null;
  accessExpiresAt: number | null;
  refreshExpiresAt: number | null;
  lastError: string | null;
};

export type IntuitOAuthDeps = {
  now?: () => number;
  randomState?: () => string;
  fetch?: typeof fetch;
  tokens?: TokenStore;
  pending?: PendingStore;
  config?: () => IntuitConfig | null;
};

const ACCOUNTING_HOST = {
  sandbox: "https://sandbox-quickbooks.api.intuit.com",
  production: "https://quickbooks.api.intuit.com",
} as const;

function fail(
  kind: OauthErrorKind,
  status = 401,
  message?: string,
): OauthResult<never> {
  return {
    ok: false,
    kind,
    action: actionForKind(kind),
    message: message || staffMessageFor(kind),
    status: kind === "csrf" ? 403 : status,
  };
}

export function intuitConfigFromEnv(): IntuitConfig | null {
  const clientId = (process.env.INTUIT_CLIENT_ID || "").trim();
  const clientSecret = (process.env.INTUIT_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return null;
  const environment =
    (process.env.INTUIT_ENVIRONMENT || "sandbox").trim().toLowerCase() === "production"
      ? "production"
      : "sandbox";
  const explicit = (process.env.INTUIT_REDIRECT_URI || "").trim();
  const site = (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    "https://filterhero.net"
  ).replace(/\/$/, "");
  const port = process.env.PORT || "3001";
  const redirectUri =
    explicit ||
    (process.env.NODE_ENV === "production"
      ? `${site}/api/intuit/oauth/callback`
      : `http://localhost:${port}/api/intuit/oauth/callback`);
  return {
    clientId,
    clientSecret,
    redirectUri,
    environment,
    tokenEndpoint: (process.env.INTUIT_TOKEN_ENDPOINT || "").trim() || INTUIT_TOKEN_ENDPOINT,
    revocationEndpoint:
      (process.env.INTUIT_REVOCATION_ENDPOINT || "").trim() || INTUIT_REVOCATION_ENDPOINT,
    accountingHost: ACCOUNTING_HOST[environment],
  };
}

function defaultState(): string {
  return randomBytes(32).toString("hex");
}

export function createIntuitOAuth(deps: IntuitOAuthDeps = {}) {
  const now = deps.now ?? Date.now;
  const randomState = deps.randomState ?? defaultState;
  const doFetch = deps.fetch ?? fetch;
  const tokens = deps.tokens ?? fileTokenStore();
  const pending = deps.pending ?? filePendingStore();
  const readConfig = deps.config ?? intuitConfigFromEnv;

  let refreshChain: Promise<unknown> = Promise.resolve();

  function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
    const run = refreshChain.then(work, work);
    refreshChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function basicAuth(config: IntuitConfig): string {
    return Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  }

  async function postForm(
    url: string,
    config: IntuitConfig,
    body: URLSearchParams,
  ): Promise<{ status: number; json: TokenEndpointBody }> {
    const res = await doFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(config)}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as TokenEndpointBody;
    return { status: res.status, json };
  }

  function persistTokens(
    parsed: NonNullable<ReturnType<typeof parseTokenResponse>>,
    previous: StoredIntuitTokens | null,
    staffEmail?: string | null,
  ): StoredIntuitTokens {
    const next: StoredIntuitTokens = {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      accessExpiresAt: parsed.accessExpiresAt,
      refreshExpiresAt: parsed.refreshExpiresAt,
      realmId: parsed.realmId ?? previous?.realmId ?? null,
      connectedAt: previous?.connectedAt ?? new Date(now()).toISOString(),
      connectedBy: staffEmail ?? previous?.connectedBy ?? null,
      needsReauthorize: false,
      lastError: null,
    };
    tokens.save(next);
    return next;
  }

  function markReconnect(kind: OauthErrorKind): OauthResult<never> {
    const current = tokens.load();
    if (current) {
      tokens.save({
        ...current,
        accessToken: "",
        refreshToken: "",
        needsReauthorize: true,
        lastError: kind,
      });
    } else {
      tokens.clear();
    }
    return fail(kind, 401);
  }

  const api = {
    status(): IntuitStatus {
      const config = readConfig();
      const stored = tokens.load();
      const clock = now();
      const refreshDead = stored
        ? !stored.refreshToken ||
          stored.needsReauthorize ||
          isRefreshTokenExpired(stored.refreshExpiresAt, clock)
        : true;
      return {
        configured: Boolean(config),
        connected: Boolean(stored?.refreshToken) && !refreshDead,
        needsReauthorize: Boolean(stored && refreshDead),
        environment: config?.environment ?? null,
        realmId: stored?.realmId ?? null,
        connectedAt: stored?.connectedAt ?? null,
        accessExpiresAt: stored?.accessExpiresAt ?? null,
        refreshExpiresAt: stored?.refreshExpiresAt ?? null,
        lastError: stored?.lastError ?? null,
      };
    },

    startConnect(staffEmail?: string | null): OauthResult<{ url: string; state: string }> {
      const config = readConfig();
      if (!config) {
        return {
          ok: false,
          kind: "other",
          action: "none",
          message: "Set INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET, then restart.",
          status: 503,
        };
      }
      const state = randomState();
      pending.put({ state, createdAt: now(), staffEmail: staffEmail ?? null });
      return {
        ok: true,
        data: {
          state,
          url: buildAuthorizeUrl({
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            state,
          }),
        },
      };
    },

    async completeCallback(query: {
      code?: string | null;
      state?: string | null;
      error?: string | null;
      error_description?: string | null;
      realmId?: string | null;
    }): Promise<OauthResult<{ realmId: string | null }>> {
      const clock = now();
      const pendingRecord = query.state ? pending.take(query.state, clock) : null;
      const checked = classifyCallback({
        query,
        expectedState: pendingRecord?.state,
        pendingFresh: Boolean(
          pendingRecord && isPendingStateFresh(pendingRecord.createdAt, clock),
        ),
      });
      if (!checked.ok) {
        return fail(checked.kind, checked.kind === "csrf" ? 403 : 401, checked.message);
      }
      const config = readConfig();
      if (!config) {
        return {
          ok: false,
          kind: "other",
          action: "none",
          message: "Intuit keys are not configured.",
          status: 503,
        };
      }
      const { status, json } = await postForm(
        config.tokenEndpoint,
        config,
        new URLSearchParams({
          grant_type: "authorization_code",
          code: checked.code,
          redirect_uri: config.redirectUri,
        }),
      );
      if (status >= 400) {
        const kind = classifyTokenEndpointError(status, json);
        if (kind === "invalid_grant" || kind === "expired_refresh_token") {
          return markReconnect(kind);
        }
        return fail(kind, status);
      }
      const parsed = parseTokenResponse(json, clock, checked.realmId);
      if (!parsed) {
        return fail("invalid_grant", 401, "QuickBooks did not return tokens.");
      }
      persistTokens(parsed, tokens.load(), pendingRecord?.staffEmail);
      return { ok: true, data: { realmId: parsed.realmId } };
    },

    async refreshAccessToken(): Promise<OauthResult<StoredIntuitTokens>> {
      return withRefreshLock(async () => {
        const config = readConfig();
        const stored = tokens.load();
        if (!config) {
          return {
            ok: false,
            kind: "other",
            action: "none",
            message: "Intuit keys are not configured.",
            status: 503,
          };
        }
        if (!stored?.refreshToken) {
          return markReconnect("expired_refresh_token");
        }
        const clock = now();
        if (isRefreshTokenExpired(stored.refreshExpiresAt, clock)) {
          return markReconnect("expired_refresh_token");
        }
        if (
          stored.accessToken &&
          !isAccessTokenExpired(stored.accessExpiresAt, clock)
        ) {
          return { ok: true, data: stored };
        }
        const { status, json } = await postForm(
          config.tokenEndpoint,
          config,
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: stored.refreshToken,
          }),
        );
        if (status >= 400) {
          const kind = classifyTokenEndpointError(status, json);
          if (kind === "invalid_grant" || kind === "expired_refresh_token") {
            return markReconnect(kind === "invalid_grant" ? "invalid_grant" : "expired_refresh_token");
          }
          return fail(kind, status);
        }
        const parsed = parseTokenResponse(json, now(), stored.realmId);
        if (!parsed) {
          return markReconnect("invalid_grant");
        }
        return { ok: true, data: persistTokens(parsed, stored) };
      });
    },

    async authorizedFetch(
      path: string,
      init: RequestInit = {},
    ): Promise<OauthResult<{ status: number; body: unknown }>> {
      const config = readConfig();
      if (!config) {
        return {
          ok: false,
          kind: "other",
          action: "none",
          message: "Intuit keys are not configured.",
          status: 503,
        };
      }

      const send = async (accessToken: string) => {
        const url = path.startsWith("http") ? path : `${config.accountingHost}${path}`;
        const res = await doFetch(url, {
          ...init,
          headers: {
            Accept: "application/json",
            ...init.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, body };
      };

      const first = await api.refreshAccessToken();
      if (!first.ok) return first;
      const firstRes = await send(first.data.accessToken);
      const firstKind = classifyApiStatus(firstRes.status, false);
      if (!firstKind) {
        return { ok: true, data: firstRes };
      }
      if (firstKind !== "expired_access_token") {
        return markReconnect(firstKind);
      }

      const stored = tokens.load();
      if (stored) {
        tokens.save({ ...stored, accessExpiresAt: now() - 1 });
      }
      const retry = await api.refreshAccessToken();
      if (!retry.ok) return retry;
      const secondRes = await send(retry.data.accessToken);
      const secondKind = classifyApiStatus(secondRes.status, true);
      if (secondKind) {
        return markReconnect(secondKind);
      }
      return { ok: true, data: secondRes };
    },

    async disconnect(): Promise<void> {
      const config = readConfig();
      const stored = tokens.load();
      if (config && stored?.refreshToken) {
        try {
          await postForm(
            config.revocationEndpoint,
            config,
            new URLSearchParams({
              token: stored.refreshToken,
              token_type_hint: "refresh_token",
            }),
          );
        } catch (err) {
          console.error("[intuit] revoke failed", err);
        }
      }
      tokens.clear();
    },
  };
  return api;
}

export const intuitOAuth = createIntuitOAuth();

export function intuitPublicStatus(): IntuitStatus {
  return intuitOAuth.status();
}
