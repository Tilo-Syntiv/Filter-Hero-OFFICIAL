/**
 * Fetch Intuit OAuth 2.0 / OpenID Connect discovery documents.
 * https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-openid-discovery-doc
 */

const PRODUCTION_DISCOVERY = "https://developer.api.intuit.com/.well-known/openid_configuration";
const SANDBOX_DISCOVERY = "https://developer.api.intuit.com/.well-known/openid_sandbox_configuration";

const REQUIRED_STRINGS = [
  "issuer",
  "authorization_endpoint",
  "token_endpoint",
  "userinfo_endpoint",
  "revocation_endpoint",
  "jwks_uri",
] as const;

type Discovery = Record<string, unknown>;

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function getJson(url: string): Promise<{ status: number; body: Discovery }> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  let body: Discovery = {};
  try {
    body = (await res.json()) as Discovery;
  } catch {
    body = {};
  }
  return { status: res.status, body };
}

function requireString(doc: Discovery, key: string, label: string): string {
  const value = doc[key];
  assert(typeof value === "string" && value.startsWith("https://"), `${label}.${key} must be an https URL`);
  return value;
}

function requireStringArray(doc: Discovery, key: string, label: string, expected: string[]): string[] {
  const value = doc[key];
  assert(Array.isArray(value) && value.every((item) => typeof item === "string"), `${label}.${key} must be a string array`);
  const list = value as string[];
  for (const item of expected) {
    assert(list.includes(item), `${label}.${key} missing ${item}`);
  }
  return list;
}

async function loadDiscovery(url: string, label: string): Promise<Discovery> {
  const { status, body } = await getJson(url);
  assert(status === 200, `${label} discovery HTTP ${status}`);
  for (const key of REQUIRED_STRINGS) {
    requireString(body, key, label);
  }
  requireStringArray(body, "response_types_supported", label, ["code"]);
  requireStringArray(body, "id_token_signing_alg_values_supported", label, ["RS256"]);
  requireStringArray(body, "scopes_supported", label, ["openid", "email", "profile"]);
  requireStringArray(body, "token_endpoint_auth_methods_supported", label, [
    "client_secret_post",
    "client_secret_basic",
  ]);
  requireStringArray(body, "claims_supported", label, ["aud", "exp", "iat", "iss", "sub"]);
  const claims = body.claims_supported as string[];
  assert(
    claims.includes("realmid") || claims.includes("realmId"),
    `${label}.claims_supported must include realmid`,
  );
  return body;
}

async function confirmJwks(jwksUri: string): Promise<number> {
  const { status, body } = await getJson(jwksUri);
  assert(status === 200, `jwks HTTP ${status}`);
  const keys = body.keys;
  assert(Array.isArray(keys) && keys.length > 0, "jwks.keys must be a non-empty array");
  return keys.length;
}

function printDoc(label: string, doc: Discovery) {
  console.log(`\n${label}`);
  for (const key of REQUIRED_STRINGS) {
    console.log(`  ${key}: ${String(doc[key])}`);
  }
}

async function main() {
  const production = await loadDiscovery(PRODUCTION_DISCOVERY, "production");
  const sandbox = await loadDiscovery(SANDBOX_DISCOVERY, "sandbox");

  assert(
    production.issuer === sandbox.issuer,
    "sandbox issuer should match production",
  );
  assert(
    production.authorization_endpoint === sandbox.authorization_endpoint,
    "sandbox authorization_endpoint should match production",
  );
  assert(
    production.token_endpoint === sandbox.token_endpoint,
    "sandbox token_endpoint should match production",
  );
  assert(
    production.jwks_uri === sandbox.jwks_uri,
    "sandbox jwks_uri should match production",
  );
  assert(
    String(sandbox.userinfo_endpoint).includes("sandbox-accounts"),
    "sandbox userinfo_endpoint must use sandbox-accounts host",
  );
  assert(
    !String(production.userinfo_endpoint).includes("sandbox-accounts"),
    "production userinfo_endpoint must not use sandbox-accounts host",
  );

  const keyCount = await confirmJwks(String(production.jwks_uri));

  printDoc("Production", production);
  printDoc("Sandbox", sandbox);
  console.log(`\nJWKS: ${keyCount} public key(s) at jwks_uri (material not printed).`);
  console.log("Intuit OAuth discovery checks passed.");
  console.log("See docs/INTUIT-OAUTH-DISCOVERY.md");
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
