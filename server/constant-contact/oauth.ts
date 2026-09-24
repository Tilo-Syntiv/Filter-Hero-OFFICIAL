/**
 * Constant Contact Authorization Code flow.
 * Rotating refresh tokens: persist the new refresh token before the next call.
 */
import { randomBytes } from "node:crypto";
import {
  CC_API_BASE,
  CC_TOKEN_ENDPOINT,
  buildAuthorizeUrl,
  classifyTokenError,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  parseTokenResponse,
  staffMessageFor,
  type OauthErrorKind,
  type TokenEndpointBody,
} from "../../shared/constant-contact-oauth";
import {
  filePendingStore,
  fileTokenStore,
  type PendingStore,
  type StoredConstantContactTokens,
  type TokenStore,
} from "./store";

export type ConstantContactConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type OauthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; kind: OauthErrorKind; message: string; status: number };

export type ConstantContactStatus = {
  configured: boolean;
  connected: boolean;
  needsReauthorize: boolean;
  organizationName: string | null;
  contactEmail: string | null;
  connectedAt: string | null;
  scope: string | null;
  lastError: string | null;
};

export type CallbackQuery = {
  code: string | null;
  state: string | null;
  error: string | null;
};

type Deps = {
  now?: () => number;
  randomState?: () => string;
  fetch?: typeof fetch;
  tokens?: TokenStore;
  pending?: PendingStore;
  config?: () => ConstantContactConfig | null;
};

function fail(kind: OauthErrorKind, status = 401, message?: string): OauthResult<never> {
  return {
    ok: false,
    kind,
    message: message || staffMessageFor(kind),
    status: kind === "csrf" ? 403 : status,
  };
}

export function constantContactConfigFromEnv(): ConstantContactConfig | null {
  const clientId = (process.env.CONSTANT_CONTACT_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CONSTANT_CONTACT_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return null;
  const explicit = (process.env.CONSTANT_CONTACT_REDIRECT_URI || "").trim();
  const site = (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    "https://filterhero.net"
  ).replace(/\/$/, "");
  const port = process.env.PORT || "3001";
  const redirectUri =
    explicit ||
    (process.env.NODE_ENV === "production"
      ? `${site}/api/constant-contact/oauth/callback`
      : `http://localhost:${port}/api/constant-contact/oauth/callback`);
  return { clientId, clientSecret, redirectUri };
}

export function constantContactPublicStatus(): ConstantContactStatus {
  return createConstantContactOAuth().status();
}

export function createConstantContactOAuth(deps: Deps = {}) {
  const now = deps.now ?? Date.now;
  const randomState = deps.randomState ?? (() => randomBytes(32).toString("hex"));
  const doFetch = deps.fetch ?? fetch;
  const tokens = deps.tokens ?? fileTokenStore();
  const pending = deps.pending ?? filePendingStore();
  const readConfig = deps.config ?? constantContactConfigFromEnv;

  let refreshChain: Promise<unknown> = Promise.resolve();

  function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
    const run = refreshChain.then(work, work);
    refreshChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function basicAuth(config: ConstantContactConfig): string {
    return Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  }

  async function postToken(
    config: ConstantContactConfig,
    body: URLSearchParams,
  ): Promise<{ status: number; json: TokenEndpointBody }> {
    const res = await doFetch(CC_TOKEN_ENDPOINT, {
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
    previous: StoredConstantContactTokens | null,
    staffEmail?: string | null,
    account?: { organizationName: string | null; contactEmail: string | null },
  ): StoredConstantContactTokens {
    const next: StoredConstantContactTokens = {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      accessExpiresAt: parsed.accessExpiresAt,
      refreshExpiresAt: parsed.refreshExpiresAt,
      scope: parsed.scope ?? previous?.scope ?? null,
      organizationName: account?.organizationName ?? previous?.organizationName ?? null,
      contactEmail: account?.contactEmail ?? previous?.contactEmail ?? null,
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

  async function readAccount(
    accessToken: string,
  ): Promise<{ organizationName: string | null; contactEmail: string | null }> {
    const res = await doFetch(`${CC_API_BASE}/account/summary`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) return { organizationName: null, contactEmail: null };
    const body = (await res.json().catch(() => ({}))) as {
      organization_name?: string;
      contact_email?: string;
    };
    return {
      organizationName: body.organization_name?.trim() || null,
      contactEmail: body.contact_email?.trim() || null,
    };
  }

  const api = {
    status(): ConstantContactStatus {
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
        organizationName: stored?.organizationName ?? null,
        contactEmail: stored?.contactEmail ?? null,
        connectedAt: stored?.connectedAt ?? null,
        scope: stored?.scope ?? null,
        lastError: stored?.lastError ?? null,
      };
    },

    startConnect(staffEmail?: string | null): OauthResult<{ url: string; state: string }> {
      const config = readConfig();
      if (!config) {
        return {
          ok: false,
          kind: "other",
          message: "Set CONSTANT_CONTACT_CLIENT_ID and CONSTANT_CONTACT_CLIENT_SECRET, then restart.",
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

    async completeCallback(
      query: CallbackQuery,
    ): Promise<OauthResult<{ organizationName: string | null }>> {
      if (query.error) return fail("oauth_denied", 400);
      if (!query.code || !query.state) return fail("csrf");
      const pendingRecord = pending.take(query.state, now());
      if (!pendingRecord) return fail("csrf");
      const config = readConfig();
      if (!config) return fail("invalid_client", 503);

      const exchanged = await postToken(
        config,
        new URLSearchParams({
          grant_type: "authorization_code",
          code: query.code,
          redirect_uri: config.redirectUri,
        }),
      );
      const parsed = parseTokenResponse(exchanged.json, now());
      if (!parsed) {
        return fail(classifyTokenError(exchanged.status, exchanged.json), exchanged.status);
      }
      const account = await readAccount(parsed.accessToken);
      persistTokens(parsed, tokens.load(), pendingRecord.staffEmail, account);
      return { ok: true, data: { organizationName: account.organizationName } };
    },

    async accessToken(): Promise<OauthResult<{ accessToken: string }>> {
      return withRefreshLock(async () => {
        const config = readConfig();
        if (!config) return fail("invalid_client", 503);
        const stored = tokens.load();
        if (!stored?.refreshToken || stored.needsReauthorize) return fail("expired_refresh_token");
        if (isRefreshTokenExpired(stored.refreshExpiresAt, now())) {
          return markReconnect("expired_refresh_token");
        }
        if (stored.accessToken && !isAccessTokenExpired(stored.accessExpiresAt, now())) {
          return { ok: true, data: { accessToken: stored.accessToken } };
        }
        const refreshed = await postToken(
          config,
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: stored.refreshToken,
          }),
        );
        const parsed = parseTokenResponse(refreshed.json, now());
        if (!parsed) {
          const kind = classifyTokenError(refreshed.status, refreshed.json);
          if (kind === "invalid_grant" || kind === "invalid_client") return markReconnect(kind);
          return fail(kind, refreshed.status);
        }
        const saved = persistTokens(parsed, stored);
        return { ok: true, data: { accessToken: saved.accessToken } };
      });
    },

    disconnect(): void {
      tokens.clear();
    },
  };

  return api;
}

export const constantContactOAuth = createConstantContactOAuth();
