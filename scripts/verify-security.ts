import "dotenv/config";
import fs from "node:fs";
import express from "express";
import { z } from "zod";
import { requireStaff } from "../server/auth.ts";
import {
  apiNotFound,
  applySecurityHeaders,
  checkoutLimiter,
  identifyLimiter,
  isApiPath,
  jsonBodyError,
  publicError,
  sanitizeEventProperties,
  shouldEnforceTurnstile,
  unexpectedError,
  verifyTurnstile,
} from "../server/security.ts";
import { safeNextPath } from "../shared/account-paths.ts";
import {
  REQUIRED_SECURITY_HEADERS,
  securityHeaderMap,
} from "../shared/security-headers.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function serve(app: express.Express): { port: number; close: () => void } {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  return { port, close: () => server.close() };
}

async function main() {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedTurnstile = process.env.TURNSTILE_SECRET_KEY;

  // --- Headers --------------------------------------------------------------

  const prodHeaders = securityHeaderMap({ production: true, hsts: true });
  for (const name of REQUIRED_SECURITY_HEADERS) {
    assert(prodHeaders[name], `${name} must be set in production`);
  }
  assert(prodHeaders["X-Content-Type-Options"] === "nosniff", "nosniff");
  assert(prodHeaders["X-Frame-Options"] === "DENY", "clickjacking is denied");
  assert(
    prodHeaders["Content-Security-Policy"].includes("frame-ancestors 'none'"),
    "CSP forbids framing",
  );
  assert(
    prodHeaders["Content-Security-Policy"].includes("upgrade-insecure-requests"),
    "production CSP upgrades HTTP",
  );
  assert(
    prodHeaders["Strict-Transport-Security"]?.includes("max-age="),
    "HSTS is on when requested",
  );
  const devHeaders = securityHeaderMap({ production: false, hsts: false });
  assert(!devHeaders["Strict-Transport-Security"], "localhost must not pin HSTS");
  assert(
    !devHeaders["Content-Security-Policy"].includes("upgrade-insecure-requests"),
    "dev CSP does not upgrade localhost",
  );
  assert(
    prodHeaders["Content-Security-Policy"].includes("https://*.klaviyo.com"),
    "production allows HTTPS Klaviyo",
  );
  assert(
    !prodHeaders["Content-Security-Policy"].includes("http://*.klaviyo.com"),
    "production must not allow plaintext Klaviyo",
  );
  assert(
    devHeaders["Content-Security-Policy"].includes("http://*.klaviyo.com"),
    "localhost HTTP shop must allow Klaviyo onsite identify",
  );
  assert(
    devHeaders["Content-Security-Policy"].includes("http://a.klaviyo.com"),
    "localhost CSP must name http://a.klaviyo.com (Chrome drops the wildcard)",
  );

  const headed = express();
  headed.disable("x-powered-by");
  headed.use(applySecurityHeaders);
  headed.get("/ping", (_req, res) => res.json({ ok: true }));
  const headedServer = serve(headed);
  const ping = await fetch(`http://127.0.0.1:${headedServer.port}/ping`);
  assert(ping.ok, `header probe failed ${ping.status}`);
  assert(!ping.headers.get("x-powered-by"), "X-Powered-By must be stripped");
  assert(ping.headers.get("x-content-type-options") === "nosniff", "live nosniff");
  assert(ping.headers.get("x-frame-options") === "DENY", "live deny framing");
  assert(ping.headers.get("content-security-policy")?.includes("default-src 'self'"), "live CSP");
  headedServer.close();

  // --- Unmatched /api stays JSON, never SPA HTML or Express "Cannot GET" ----

  assert(isApiPath("/api"), "/api is an API path");
  assert(isApiPath("/api/does-not-exist"), "nested /api paths are API paths");
  assert(!isApiPath("/apitest"), "/apitest is not an API path");
  assert(!isApiPath("/admin"), "/admin is the staff SPA, not the API");

  const apiApp = express();
  apiApp.disable("x-powered-by");
  apiApp.use(applySecurityHeaders);
  apiApp.get("/api/health", (_req, res) => res.json({ ok: true, brand: "Filter Hero" }));
  apiApp.use("/api", apiNotFound);
  apiApp.get("*", (_req, res) => {
    res.type("html").send('<!doctype html><div id="root"></div>');
  });
  const apiServer = serve(apiApp);
  const apiHealth = await fetch(`http://127.0.0.1:${apiServer.port}/api/health`);
  assert(apiHealth.ok, "known /api/health still answers");
  const missGet = await fetch(`http://127.0.0.1:${apiServer.port}/api/does-not-exist`);
  const missGetText = await missGet.text();
  assert(missGet.status === 404, `unknown API GET should 404, got ${missGet.status}`);
  assert(!/cannot get|doctype html/i.test(missGetText), "unknown API GET must not be HTML");
  const missGetBody = JSON.parse(missGetText) as { code?: string };
  assert(missGetBody.code === "not_found", "unknown API GET names not_found");
  const missPost = await fetch(`http://127.0.0.1:${apiServer.port}/api/does-not-exist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const missPostText = await missPost.text();
  assert(missPost.status === 404, `unknown API POST should 404, got ${missPost.status}`);
  assert(!/cannot post|doctype html/i.test(missPostText), "unknown API POST must not be HTML");
  assert(
    (JSON.parse(missPostText) as { code?: string }).code === "not_found",
    "unknown API POST names not_found",
  );
  const spa = await fetch(`http://127.0.0.1:${apiServer.port}/sizes/20x25x1`);
  assert(spa.ok, "non-API GET still serves the document");
  assert((await spa.text()).includes('id="root"'), "non-API GET is the SPA shell");
  apiServer.close();

  // --- JSON body errors must not dump a stack -------------------------------

  const jsonApp = express();
  jsonApp.disable("x-powered-by");
  jsonApp.use(express.json({ limit: "1kb" }));
  jsonApp.use(jsonBodyError);
  jsonApp.post("/echo", (req, res) => res.json(req.body));
  jsonApp.use(unexpectedError);
  const jsonServer = serve(jsonApp);

  const badJson = await fetch(`http://127.0.0.1:${jsonServer.port}/echo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });
  assert(badJson.status === 400, `invalid JSON should 400, got ${badJson.status}`);
  const badJsonBody = (await badJson.json()) as { code?: string; error?: string };
  assert(badJsonBody.code === "invalid_json", "invalid JSON has a machine code");
  assert(!String(badJsonBody.error).includes("SyntaxError"), "JSON errors must not leak stacks");

  const huge = await fetch(`http://127.0.0.1:${jsonServer.port}/echo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blob: "x".repeat(5000) }),
  });
  assert(huge.status === 413, `oversize JSON should 413, got ${huge.status}`);
  const hugeBody = (await huge.json()) as { code?: string };
  assert(hugeBody.code === "payload_too_large", "oversize JSON has a machine code");
  jsonServer.close();

  // --- Error shaping --------------------------------------------------------

  const leaky = publicError(new Error("Stripe key sk_live_abc is invalid"), {
    code: "checkout_failed",
    message: "Checkout could not start.",
  });
  assert(!leaky.body.error.includes("sk_live"), "raw secrets must never reach the caller");
  const zodFail = (() => {
    try {
      z.object({ email: z.string().email() }).parse({ email: "nope" });
      return null;
    } catch (err) {
      return publicError(err, { code: "identify_failed", message: "Could not save that." });
    }
  })();
  assert(zodFail, "Zod parse must throw");
  assert(zodFail.body.error === "Could not save that.", "Zod text stays internal");
  assert(zodFail.body.code === "identify_failed", "Zod failures keep the fallback code");

  // --- Turnstile fail-closed in production ----------------------------------

  delete process.env.TURNSTILE_SECRET_KEY;
  process.env.NODE_ENV = "development";
  assert((await verifyTurnstile(undefined)).ok, "local Turnstile can be skipped");
  assert(
    !shouldEnforceTurnstile("quote", undefined),
    "local quotes without a token skip the widget",
  );
  assert(
    !shouldEnforceTurnstile("reminder", "token"),
    "Filter Clock reminders never need Turnstile",
  );

  process.env.NODE_ENV = "production";
  assert(!(await verifyTurnstile(undefined)).ok, "production without a secret fails closed");
  assert(shouldEnforceTurnstile("quote", undefined), "production quotes always check Turnstile");
  assert(
    !shouldEnforceTurnstile("reminder", undefined),
    "reminders stay widget-free in production",
  );
  process.env.TURNSTILE_SECRET_KEY = "0x_test_secret";
  assert(!(await verifyTurnstile(undefined)).ok, "a configured Turnstile rejects a missing token");
  process.env.NODE_ENV = "development";
  assert(
    shouldEnforceTurnstile("quote", undefined),
    "local secret enforces even without a token",
  );
  assert(
    shouldEnforceTurnstile("quote", "tok"),
    "dev with a secret and token enforces Turnstile",
  );

  process.env.NODE_ENV = savedNodeEnv;
  if (savedTurnstile === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = savedTurnstile;

  // --- Public POST limiters -------------------------------------------------

  const limited = express();
  limited.set("trust proxy", 1);
  limited.post("/identify", identifyLimiter, (_req, res) => res.json({ ok: true }));
  limited.post("/checkout", checkoutLimiter, (_req, res) => res.json({ ok: true }));
  const limitedServer = serve(limited);

  let identifyAllowed = 0;
  let identifyBlocked = false;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const res = await fetch(`http://127.0.0.1:${limitedServer.port}/identify`, {
      method: "POST",
    });
    if (res.status === 429) {
      identifyBlocked = true;
      const body = (await res.json()) as { code?: string };
      assert(body.code === "rate_limited_identify", "identify 429 names the limiter");
      break;
    }
    identifyAllowed += 1;
  }
  assert(identifyBlocked, "identify limiter must trip");
  assert(identifyAllowed === 20, `identify allows 20 per window, allowed ${identifyAllowed}`);

  let checkoutAllowed = 0;
  let checkoutBlocked = false;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const res = await fetch(`http://127.0.0.1:${limitedServer.port}/checkout`, {
      method: "POST",
    });
    if (res.status === 429) {
      checkoutBlocked = true;
      const body = (await res.json()) as { code?: string };
      assert(body.code === "rate_limited_checkout", "checkout 429 names the limiter");
      break;
    }
    checkoutAllowed += 1;
  }
  assert(checkoutBlocked, "checkout limiter must trip");
  assert(checkoutAllowed === 10, `checkout allows 10 per window, allowed ${checkoutAllowed}`);
  limitedServer.close();

  // --- Staff gate still fail-closed -----------------------------------------

  process.env.STAFF_EMAILS = "";
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const closed = express();
  closed.get("/secret", requireStaff, (_req, res) => res.json({ ok: true }));
  const closedServer = serve(closed);
  const closedRes = await fetch(`http://127.0.0.1:${closedServer.port}/secret`, {
    headers: { Authorization: "Bearer anything" },
  });
  assert(closedRes.status === 503, `unconfigured staff gate must be 503, got ${closedRes.status}`);
  closedServer.close();

  // --- Redirect + event sanitizers ------------------------------------------

  assert(safeNextPath("/account/../admin") === "/account", "next path cannot traverse");
  assert(
    sanitizeEventProperties({ $email: "victim@example.com", $value: 1 })?.$value === 1,
    "event $value survives",
  );
  assert(
    !("$email" in (sanitizeEventProperties({ $email: "victim@example.com", $value: 1 }) || {})),
    "event $email is dropped",
  );

  // --- Schema lock file -----------------------------------------------------

  const lock = fs.readFileSync("supabase/migrations/0004_lock_browser_grants.sql", "utf-8");
  assert(/force row level security/i.test(lock), "0003 forces RLS on shop tables");
  assert(/revoke all on table customer_profiles/i.test(lock), "0003 revokes browser grants");
  assert(!/^\s*create policy/im.test(lock), "0003 must not add a browser policy");

  const crm = fs.readFileSync("supabase/migrations/0001_crm.sql", "utf-8");
  const accounts = fs.readFileSync("supabase/migrations/0002_customer_accounts.sql", "utf-8");
  assert(!/^\s*create policy/im.test(crm), "CRM RLS stays deny-by-default");
  assert(!/^\s*create policy/im.test(accounts), "account RLS stays deny-by-default");

  const catalogIdentity = fs.readFileSync(
    "supabase/migrations/0006_catalog_skus_identity.sql",
    "utf-8",
  );
  const catalogCreate =
    catalogIdentity.match(/create table if not exists catalog_skus \(([\s\S]*?)\);/i)?.[1] || "";
  assert(
    /filter_hero_url text not null/i.test(catalogCreate),
    "0006 must keep catalog_skus identity columns",
  );
  assert(
    !/list_price|wholesale_sku|cost_dollars|unit_price/i.test(catalogCreate),
    "0006 must not put price columns on catalog_skus",
  );
  assert(!/^\s*create policy/im.test(catalogIdentity), "0006 must not add a browser policy");
  assert(
    /revoke all on table catalog_skus from anon, authenticated, public/i.test(catalogIdentity),
    "0006 must revoke catalog_skus from the browser roles",
  );

  const envExample = fs.readFileSync(".env.example", "utf-8");
  assert(!/SERVICE_ROLE/.test(envExample) || !/^VITE_.*SERVICE_ROLE/m.test(envExample), "no VITE service role");
  assert(!/VITE_.*sk_live_/i.test(envExample), "no live Stripe secret in VITE_");

  const turnstileSrc = fs.readFileSync("client/src/components/TurnstileField.tsx", "utf-8");
  assert(
    turnstileSrc.includes("IntersectionObserver"),
    "Turnstile must wait until the field is near the viewport (FH-247 / FH-330)",
  );
  assert(
    turnstileSrc.includes("resetSignal") && turnstileSrc.includes("error-callback"),
    "Turnstile must reset after send and handle error-callback (FH-247 / FH-330)",
  );
  const turnstileServer = fs.readFileSync("server/security.ts", "utf-8");
  assert(
    turnstileServer.includes('body.set("remoteip"') || turnstileServer.includes("body.set('remoteip'"),
    "siteverify must send remoteip from req.ip (FH-247 / FH-338)",
  );
  const contactRoute = fs.readFileSync("server/index.ts", "utf-8");
  assert(
    contactRoute.includes("submitContact(req.body, req.ip)"),
    "POST /api/contact must pass req.ip into siteverify",
  );
  const csp = fs.readFileSync("shared/security-headers.ts", "utf-8");
  assert(
    csp.includes("https://challenges.cloudflare.com"),
    "CSP must allow the Turnstile script and frame hosts",
  );

  console.log("verify:security ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
