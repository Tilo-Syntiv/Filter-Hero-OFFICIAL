import {
  ACCESS_SKEW_MS,
  CC_SCOPES,
  buildAuthorizeUrl,
  classifyTokenError,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  parseTokenResponse,
  staffMessageFor,
} from "../shared/constant-contact-oauth.ts";
import {
  constantContactLiveCheck,
  phoneForConstantContact,
  recordConstantContactOptIn,
  splitPersonName,
} from "../server/constant-contact/contacts.ts";
import { createConstantContactOAuth } from "../server/constant-contact/oauth.ts";
import { constantContactMayRecord } from "../shared/email-channels.ts";
import type { PendingOauth, PendingStore, StoredConstantContactTokens, TokenStore } from "../server/constant-contact/store.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const CLOCK = 1_700_000_000_000;

function config() {
  return {
    clientId: "test-client",
    clientSecret: "test-secret",
    redirectUri: "https://filterhero.net/api/constant-contact/oauth/callback",
  };
}

function seed(overrides: Partial<StoredConstantContactTokens> = {}): StoredConstantContactTokens {
  return {
    accessToken: "access-live",
    refreshToken: "refresh-live",
    accessExpiresAt: CLOCK + 50 * 60 * 1000,
    refreshExpiresAt: CLOCK + 90 * 24 * 60 * 60 * 1000,
    scope: CC_SCOPES.join(" "),
    organizationName: "Filter Hero",
    contactEmail: "info@filterhero.net",
    connectedAt: new Date(CLOCK).toISOString(),
    connectedBy: "info@filterhero.net",
    needsReauthorize: false,
    lastError: null,
    ...overrides,
  };
}

function memoryTokens(initial: StoredConstantContactTokens | null = null): TokenStore & { current(): StoredConstantContactTokens | null } {
  let value = initial;
  return {
    load: () => value,
    save: (tokens) => {
      value = tokens;
    },
    clear: () => {
      value = null;
    },
    current: () => value,
  };
}

function memoryPending(): PendingStore {
  const states: PendingOauth[] = [];
  return {
    put(record) {
      const next = states.filter((entry) => entry.state !== record.state);
      next.push(record);
      states.splice(0, states.length, ...next);
    },
    take(state, now) {
      const index = states.findIndex((entry) => entry.state === state && now - entry.createdAt <= 10 * 60 * 1000);
      if (index < 0) return null;
      const [found] = states.splice(index, 1);
      return found;
    },
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
  assert(CC_SCOPES.includes("offline_access"), "offline_access is requested so Constant Contact returns a refresh token");
  assert(CC_SCOPES.includes("account_read"), "account_read is requested");
  assert(CC_SCOPES.includes("contact_data"), "contact_data is requested");
  assert(CC_SCOPES.includes("campaign_data"), "campaign_data is requested");
  const authorize = new URL(buildAuthorizeUrl({ clientId: "abc", redirectUri: config().redirectUri, state: "state-1" }));
  assert(authorize.origin + authorize.pathname === "https://authz.constantcontact.com/oauth2/default/v1/authorize", "authorize host is Constant Contact");
  assert(authorize.searchParams.get("redirect_uri") === config().redirectUri, "redirect uri is passed through");
  assert(authorize.searchParams.get("scope")?.includes("offline_access"), "authorize scope includes offline_access");
  assert(parseTokenResponse({ access_token: "a" }, CLOCK) === null, "a response without a refresh token is rejected");
  assert(classifyTokenError(401, { error: "invalid_client" }) === "invalid_client", "invalid_client is classified");
  assert(classifyTokenError(400, { error: "invalid_grant" }) === "invalid_grant", "invalid_grant is classified");
  assert(isAccessTokenExpired(CLOCK, CLOCK), "access token at expiry is stale");
  assert(isAccessTokenExpired(CLOCK + ACCESS_SKEW_MS - 1, CLOCK), "access token inside the skew is stale");
  assert(!isRefreshTokenExpired(CLOCK + 1, CLOCK), "future refresh token is live");
  assert(staffMessageFor("oauth_denied").toLowerCase().includes("cancelled"), "denied login has a staff message");

  let tokenPosts = 0;
  let accountReads = 0;
  let latestRefresh = "refresh-live";

  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/oauth2/default/v1/token")) {
      tokenPosts += 1;
      const form = formBody(init);
      const basic = String((init?.headers as Record<string, string> | undefined)?.Authorization || "");
      assert(basic.startsWith("Basic "), "token calls use the client secret as basic auth");
      if (form.get("grant_type") === "authorization_code") {
        if (form.get("code") !== "auth-code" || form.get("redirect_uri") !== config().redirectUri) {
          return jsonResponse(400, { error: "invalid_grant" });
        }
        return jsonResponse(200, {
          access_token: "access-live",
          refresh_token: "refresh-live",
          expires_in: 3600,
          scope: CC_SCOPES.join(" "),
        });
      }
      if (form.get("grant_type") === "refresh_token") {
        if (form.get("refresh_token") !== latestRefresh) {
          return jsonResponse(400, { error: "invalid_grant" });
        }
        latestRefresh = "refresh-rotated";
        return jsonResponse(200, {
          access_token: "access-next",
          refresh_token: latestRefresh,
          expires_in: 3600,
          scope: CC_SCOPES.join(" "),
        });
      }
      return jsonResponse(400, { error: "invalid_request" });
    }
    if (url.endsWith("/account/summary")) {
      accountReads += 1;
      const header = String((init?.headers as Record<string, string> | undefined)?.Authorization || "");
      if (header !== "Bearer access-live" && header !== "Bearer access-next") {
        return jsonResponse(401, { error: "unauthorized" });
      }
      return jsonResponse(200, {
        organization_name: "Filter Hero",
        contact_email: "info@filterhero.net",
      });
    }
    return jsonResponse(404, { error: "not_found" });
  };

  tokenPosts = 0;
  const csrfClient = createConstantContactOAuth({
    now: () => CLOCK,
    randomState: () => "state-legit",
    fetch: fetchMock,
    tokens: memoryTokens(),
    pending: memoryPending(),
    config,
  });
  const started = csrfClient.startConnect("info@filterhero.net");
  assert(started.ok, "connect starts when the API key is set");
  const csrf = await csrfClient.completeCallback({ code: "auth-code", state: "state-attacker", error: null });
  assert(!csrf.ok && csrf.kind === "csrf", "a mismatched state is rejected");
  assert(tokenPosts === 0, "a mismatched state does not call the token endpoint");
  assert(!csrfClient.status().connected, "a mismatched state stores no tokens");

  const connected = await csrfClient.completeCallback({ code: "auth-code", state: "state-legit", error: null });
  assert(connected.ok, "the matching state exchanges the code");
  assert(tokenPosts === 1, "only the legitimate callback hits the token endpoint");
  assert(accountReads === 1, "a new connection reads the account summary");
  const status = csrfClient.status();
  assert(status.connected, "the account is connected");
  assert(status.organizationName === "Filter Hero", "organization name is stored");
  assert(status.contactEmail === "info@filterhero.net", "account email is stored");
  assert(!status.needsReauthorize, "a fresh connection does not need reauthorize");

  const reused = await csrfClient.completeCallback({ code: "auth-code", state: "state-legit", error: null });
  assert(!reused.ok && reused.kind === "csrf", "the login state is one-shot");

  const denied = createConstantContactOAuth({
    now: () => CLOCK,
    randomState: () => "state-denied",
    fetch: fetchMock,
    tokens: memoryTokens(),
    pending: memoryPending(),
    config,
  });
  denied.startConnect("info@filterhero.net");
  const beforeDeny = tokenPosts;
  const denial = await denied.completeCallback({ code: null, state: "state-denied", error: "access_denied" });
  assert(!denial.ok && denial.kind === "oauth_denied", "a cancelled login is not a connection");
  assert(tokenPosts === beforeDeny, "a cancelled login does not exchange a code");

  tokenPosts = 0;
  latestRefresh = "refresh-live";
  const refreshStore = memoryTokens(seed({ accessExpiresAt: CLOCK }));
  const refreshClient = createConstantContactOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: refreshStore,
    pending: memoryPending(),
    config,
  });
  const refreshed = await refreshClient.accessToken();
  assert(refreshed.ok && refreshed.data.accessToken === "access-next", "an expired access token refreshes");
  assert(tokenPosts === 1, "refresh is a single token call");
  assert(refreshStore.current()?.refreshToken === "refresh-rotated", "the rotated refresh token is saved");
  assert(refreshClient.status().connected, "the account stays connected after refresh");
  assert(refreshClient.status().organizationName === "Filter Hero", "refresh keeps the organization name");

  tokenPosts = 0;
  const expired = createConstantContactOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: memoryTokens(seed({ refreshExpiresAt: CLOCK - 1 })),
    pending: memoryPending(),
    config,
  });
  const dead = await expired.accessToken();
  assert(!dead.ok && dead.kind === "expired_refresh_token", "an expired refresh token asks for Connect again");
  assert(tokenPosts === 0, "an expired refresh token is not sent to Constant Contact");
  assert(expired.status().needsReauthorize && !expired.status().connected, "an expired refresh token is disconnected");

  tokenPosts = 0;
  latestRefresh = "refresh-other";
  const rejected = createConstantContactOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: memoryTokens(seed({ accessExpiresAt: CLOCK, refreshToken: "refresh-stale" })),
    pending: memoryPending(),
    config,
  });
  const grant = await rejected.accessToken();
  assert(!grant.ok && grant.kind === "invalid_grant", "invalid_grant stops and asks for Connect again");
  assert(rejected.status().needsReauthorize, "invalid_grant marks reconnect");
  assert(!rejected.status().connected, "invalid_grant is not connected");

  const missing = createConstantContactOAuth({
    now: () => CLOCK,
    fetch: fetchMock,
    tokens: memoryTokens(),
    pending: memoryPending(),
    config: () => null,
  });
  const unconfigured = missing.startConnect("info@filterhero.net");
  assert(!unconfigured.ok && unconfigured.status === 503, "missing API keys do not start a login");

  assert(!constantContactMayRecord({ intent: "reminder", marketingConsent: true }), "clock saves stay off the list");
  assert(!constantContactMayRecord({ marketingConsent: false }), "a missing opt-in is not recorded");
  assert(constantContactMayRecord({ intent: "quote", marketingConsent: true }), "a quote opt-in is recorded");
  assert(splitPersonName("Ada Lovelace").lastName === "Lovelace", "last name is kept");
  assert(phoneForConstantContact("555-1212") === undefined, "a short phone is omitted");
  assert(phoneForConstantContact("+1 (404) 555-1212") === "4045551212", "a US phone is kept");

  let signupBody = "";
  const optIn = await recordConstantContactOptIn(
    { email: "ada@filterhero.net", name: "Ada Lovelace", phone: "4045551212", marketingConsent: true, intent: "quote" },
    {
      accessToken: async () => ({ ok: true, data: { accessToken: "access-live" } }),
      readList: () => ({ listId: "list-1", name: "Filter Hero" }),
      saveList: () => undefined,
      listIdFromEnv: () => "",
      fetch: async (input, init) => {
        const url = String(input);
        if (url.includes("/contacts/sign_up_form")) {
          signupBody = String(init?.body || "");
          return jsonResponse(201, { action: "created" });
        }
        return jsonResponse(404, {});
      },
    },
  );
  assert(optIn.ok && !optIn.skipped && optIn.action === "created", "an explicit opt-in is created");
  assert(signupBody.includes("ada@filterhero.net"), "the opt-in posts the shopper email");
  assert(signupBody.includes("list-1"), "the opt-in joins the Filter Hero list");

  const clock = await recordConstantContactOptIn(
    { email: "ada@filterhero.net", marketingConsent: true, intent: "reminder" },
    { accessToken: async () => { throw new Error("clock must not call Constant Contact"); } },
  );
  assert(clock.ok && clock.skipped, "a clock save does not call Constant Contact");

  const live = await constantContactLiveCheck({
    accessToken: async () => ({ ok: true, data: { accessToken: "access-live" } }),
    readList: () => ({ listId: "list-1", name: "Filter Hero" }),
    saveList: () => undefined,
    listIdFromEnv: () => "list-1",
    fetch: async (input) => {
      if (String(input).includes("/account/summary")) {
        return jsonResponse(200, { organization_name: "Filter Hero", contact_email: "info@filterhero.net" });
      }
      return jsonResponse(404, {});
    },
  });
  assert(live.ok && live.organizationName === "Filter Hero" && live.listId === "list-1", "a live check reads the account and list");

  console.log("Constant Contact OAuth checks passed.");
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
