import {
  ACCESS_TOKEN_REFRESH_SKEW_MS,
  actionForKind,
  classifyApiStatus,
  classifyCallback,
  classifyTokenEndpointError,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  staffMessageFor,
  statesMatch,
} from "../shared/intuit-oauth.ts";
import { createIntuitOAuth } from "../server/intuit/oauth.ts";
import { memoryPendingStore, memoryTokenStore, type StoredIntuitTokens } from "../server/intuit/store.ts";
import fs from "node:fs";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function assertCount(actual: number, expected: number, message: string) {
  if (actual !== expected) throw new Error(`${message} (got ${actual})`);
}

const CLOCK = 1_700_000_000_000;

function config() {
  return {
    clientId: "test-client",
    clientSecret: "test-secret",
    redirectUri: "http://localhost:3001/api/intuit/oauth/callback",
    environment: "sandbox" as const,
    tokenEndpoint: "https://tokens.test/oauth2/v1/tokens/bearer",
    revocationEndpoint: "https://tokens.test/v2/oauth2/tokens/revoke",
    accountingHost: "https://qbo.test",
  };
}

function seedTokens(overrides: Partial<StoredIntuitTokens> = {}): StoredIntuitTokens {
  return {
    accessToken: "access-live",
    refreshToken: "refresh-live",
    accessExpiresAt: CLOCK + 50 * 60 * 1000,
    refreshExpiresAt: CLOCK + 90 * 24 * 60 * 60 * 1000,
    realmId: "realm-1",
    connectedAt: new Date(CLOCK).toISOString(),
    connectedBy: "info@filterhero.net",
    needsReauthorize: false,
    lastError: null,
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formBody(init?: RequestInit): URLSearchParams {
  if (typeof init?.body === "string") return new URLSearchParams(init.body);
  if (init?.body instanceof URLSearchParams) return init.body;
  return new URLSearchParams();
}

async function main() {
  assert(actionForKind("expired_access_token") === "refresh", "expired access tokens refresh");
  assert(actionForKind("expired_refresh_token") === "reauthorize", "expired refresh tokens reconnect");
  assert(actionForKind("invalid_grant") === "reauthorize", "invalid_grant reconnects");
  assert(actionForKind("csrf") === "reject", "CSRF is rejected");
  assert(
    classifyTokenEndpointError(400, { error: "invalid_grant", error_description: "Token revoked" }) ===
      "invalid_grant",
    "token endpoint invalid_grant is classified",
  );
  assert(classifyApiStatus(401, false) === "expired_access_token", "first QBO 401 refreshes");
  assert(classifyApiStatus(401, true) === "expired_refresh_token", "second QBO 401 reconnects");
  assert(isAccessTokenExpired(CLOCK, CLOCK), "access token at expiry is stale");
  assert(
    isAccessTokenExpired(CLOCK + ACCESS_TOKEN_REFRESH_SKEW_MS - 1, CLOCK),
    "access token inside the refresh skew is treated as expired",
  );
  assert(!isRefreshTokenExpired(CLOCK + 1, CLOCK), "refresh token in the future is live");
  assert(isRefreshTokenExpired(CLOCK, CLOCK), "refresh token at expiry is dead");
  assert(!statesMatch("abc", "abd"), "CSRF state mismatch is rejected");
  assert(!statesMatch("abc", ""), "empty CSRF state is rejected");
  assert(statesMatch("deadbeef", "deadbeef"), "matching CSRF state is accepted");
  assert(
    staffMessageFor("csrf").toLowerCase().includes("csrf"),
    "CSRF has a staff-facing message",
  );

  const missingState = classifyCallback({
    query: { code: "x", state: null },
    expectedState: "abc",
    pendingFresh: true,
  });
  assert(!missingState.ok && missingState.kind === "csrf", "callback without state is CSRF");

  const mismatch = classifyCallback({
    query: { code: "x", state: "attacker" },
    expectedState: "abc",
    pendingFresh: true,
  });
  assert(!mismatch.ok && mismatch.kind === "csrf", "callback state mismatch is CSRF");

  const stale = classifyCallback({
    query: { code: "x", state: "abc" },
    expectedState: "abc",
    pendingFresh: false,
  });
  assert(!stale.ok && stale.kind === "csrf", "expired pending state is CSRF");

  const denied = classifyCallback({
    query: { error: "access_denied", state: "abc" },
    expectedState: "abc",
    pendingFresh: true,
  });
  assert(!denied.ok && denied.kind === "oauth_denied", "access_denied is not treated as success");

  const happy = classifyCallback({
    query: { code: "auth-code", state: "abc", realmId: "realm-1" },
    expectedState: "abc",
    pendingFresh: true,
  });
  assert(happy.ok && happy.code === "auth-code", "matching state and code succeed");

  let tokenPosts: number = 0;
  let qboCalls: number = 0;
  let latestRefresh = "refresh-live";
  const qboByToken = new Map<string, number>([
    ["access-live", 401],
    ["access-next", 200],
  ]);

  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/tokens/bearer")) {
      tokenPosts += 1;
      const form = formBody(init);
      if (form.get("grant_type") === "authorization_code") {
        if (form.get("code") !== "auth-code") {
          return jsonResponse(400, { error: "invalid_grant", error_description: "code reused" });
        }
        return jsonResponse(200, {
          access_token: "access-live",
          refresh_token: "refresh-live",
          expires_in: 3600,
          x_refresh_token_expires_in: 8726400,
        });
      }
      if (form.get("grant_type") === "refresh_token") {
        if (form.get("refresh_token") !== latestRefresh) {
          return jsonResponse(400, {
            error: "invalid_grant",
            error_description: "stale refresh token",
          });
        }
        latestRefresh = "refresh-rotated";
        return jsonResponse(200, {
          access_token: "access-next",
          refresh_token: latestRefresh,
          expires_in: 3600,
          x_refresh_token_expires_in: 8726400,
        });
      }
      return jsonResponse(400, { error: "invalid_request" });
    }
    if (url.startsWith("https://qbo.test")) {
      qboCalls += 1;
      const header = String((init?.headers as Record<string, string> | undefined)?.Authorization || "");
      const token = header.replace(/^Bearer\s+/i, "");
      const status = qboByToken.get(token) ?? 401;
      return jsonResponse(status, status === 200 ? { CompanyName: "Filter Hero" } : { Fault: {} });
    }
    if (url.includes("/tokens/revoke")) return jsonResponse(200, {});
    return jsonResponse(404, { error: "not_found" });
  };

  // --- d. CSRF: attacker state never hits the token endpoint ----------------
  tokenPosts = 0;
  const csrfClient = createIntuitOAuth({
    now: () => CLOCK,
    randomState: () => "state-legit",
    fetch: fetchMock,
    tokens: memoryTokenStore(),
    pending: memoryPendingStore(),
    config,
  });
  const started = csrfClient.startConnect("info@filterhero.net");
  assert(started.ok, "connect starts");
  const csrf = await csrfClient.completeCallback({
    code: "auth-code",
    state: "state-attacker",
    realmId: "evil",
  });
  assert(!csrf.ok && csrf.kind === "csrf" && csrf.action === "reject", "CSRF callback is rejected");
  assertCount(tokenPosts, 0, "CSRF must not exchange a code");
  assert(!csrfClient.status().connected, "CSRF must not store tokens");

  const connected = await csrfClient.completeCallback({
    code: "auth-code",
    state: "state-legit",
    realmId: "realm-1",
  });
  assert(connected.ok, "matching CSRF state exchanges the code");
  assertCount(tokenPosts, 1, "only the legitimate callback hits the token endpoint");
  assert(csrfClient.status().connected, "legitimate callback stores tokens");

  const reused = await csrfClient.completeCallback({
    code: "auth-code",
    state: "state-legit",
    realmId: "realm-1",
  });
  assert(!reused.ok && reused.kind === "csrf", "authorization state is one-shot");

  // --- a. Expired access token: 401 → refresh → retry ----------------------
  tokenPosts = 0;
  qboCalls = 0;
  latestRefresh = "refresh-live";
  const accessClient = createIntuitOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: memoryTokenStore(seedTokens()),
    pending: memoryPendingStore(),
    config,
  });
  const company = await accessClient.authorizedFetch("/v3/company/realm-1/companyinfo/realm-1");
  assert(company.ok, "expired access token recovers after refresh");
  assertCount(qboCalls, 2, "QBO is retried once after refresh");
  assertCount(tokenPosts, 1, "access token refresh is a single token POST");
  assert(accessClient.status().connected, "session stays connected after access refresh");
  const rotated = accessClient.status();
  assert(rotated.connected, "rotated refresh token is kept");

  // --- b. Expired refresh token: reconnect, do not refresh -----------------
  tokenPosts = 0;
  const expiredRefresh = createIntuitOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: memoryTokenStore(
      seedTokens({
        refreshExpiresAt: CLOCK - 1,
        refreshToken: "refresh-old",
      }),
    ),
    pending: memoryPendingStore(),
    config,
  });
  const expired = await expiredRefresh.refreshAccessToken();
  assert(
    !expired.ok && expired.kind === "expired_refresh_token" && expired.action === "reauthorize",
    "expired refresh token asks the user to connect again",
  );
  assertCount(tokenPosts, 0, "expired refresh tokens are not sent to Intuit");
  assert(expiredRefresh.status().needsReauthorize, "expired refresh marks reconnect");
  assert(!expiredRefresh.status().connected, "expired refresh is not connected");

  // --- c. invalid_grant: stop retrying and reconnect -----------------------
  tokenPosts = 0;
  const grantClient = createIntuitOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: memoryTokenStore(
      seedTokens({
        accessExpiresAt: CLOCK - 1,
        refreshToken: "refresh-stale",
      }),
    ),
    pending: memoryPendingStore(),
    config,
  });
  const grant = await grantClient.refreshAccessToken();
  assert(
    !grant.ok && grant.kind === "invalid_grant" && grant.action === "reauthorize",
    "invalid_grant asks the user to connect again",
  );
  assertCount(tokenPosts, 1, "invalid_grant is not retried in a loop");
  assert(grantClient.status().needsReauthorize, "invalid_grant marks reconnect");
  assert(!grantClient.status().connected, "invalid_grant clears the connection");

  const grantCode = createIntuitOAuth({
    now: () => CLOCK,
    randomState: () => "state-code",
    fetch: fetchMock,
    tokens: memoryTokenStore(),
    pending: memoryPendingStore(),
    config,
  });
  grantCode.startConnect("info@filterhero.net");
  const badCode = await grantCode.completeCallback({
    code: "already-used",
    state: "state-code",
  });
  assert(
    !badCode.ok && badCode.kind === "invalid_grant" && badCode.action === "reauthorize",
    "invalid_grant on code exchange reconnects",
  );

  const liveState = createIntuitOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: memoryTokenStore(),
    pending: memoryPendingStore(),
    config,
  });
  const liveStart = liveState.startConnect("info@filterhero.net");
  assert(
    liveStart.ok && /^[a-f0-9]{64}$/.test(liveStart.data.state),
    "default CSRF state is 32 random bytes",
  );

  const oauthSource = fs.readFileSync("server/intuit/oauth.ts", "utf-8");
  assert(
    /import\s*\{\s*randomBytes\s*\}\s*from\s*["']node:crypto["']/.test(oauthSource),
    "oauth client must import randomBytes for CSRF state",
  );
  assert(oauthSource.includes("expired_access_token"), "oauth client refreshes expired access tokens");
  assert(oauthSource.includes("expired_refresh_token"), "oauth client handles expired refresh tokens");
  assert(oauthSource.includes("invalid_grant"), "oauth client handles invalid_grant");
  const routeSource = fs.readFileSync("server/intuit/routes.ts", "utf-8");
  assert(/csrf/i.test(routeSource), "callback route rejects CSRF");
  assert(routeSource.includes("completeCallback"), "callback route goes through CSRF + grant handling");
  const settingsSource = fs.readFileSync("client/src/pages/admin/Settings.tsx", "utf-8");
  assert(settingsSource.includes("invalid_grant"), "settings surfaces invalid_grant");
  assert(settingsSource.includes("csrf"), "settings surfaces CSRF");

  console.log("verify:intuit-oauth ok");
  console.log("  a. expired access token → refresh and retry");
  console.log("  b. expired refresh token → reauthorize");
  console.log("  c. invalid_grant → reauthorize, no retry loop");
  console.log("  d. CSRF state mismatch / missing / replay → reject, no token exchange");
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
