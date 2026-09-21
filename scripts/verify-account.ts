import "dotenv/config";
import fs from "node:fs";
import express from "express";
import {
  isCustomerAuthConfigured,
  requireCustomer,
  requireStaff,
} from "../server/auth.ts";
import { ordersForCustomer } from "../server/account.ts";
import { safeNextPath } from "../shared/account-paths.ts";
import { STAFF_MAGIC_LINK_PATH, staffEmailsMatch } from "../shared/staff-auth.ts";
import {
  accountDisabledReason,
  isAccountEnabled,
  isCrmEnabled,
  resetDbClient,
} from "../server/db.ts";
import type { StoredOrder } from "../server/stripe.ts";
import { resolveDocumentSeo } from "../shared/seo.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function serve(app: express.Express): { port: number; close: () => void } {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  return { port, close: () => server.close() };
}

async function main() {
  const realUrl = process.env.SUPABASE_URL;
  const realKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
  process.env.ACCOUNT_DISABLE = "1";
  resetDbClient();
  assert(!isAccountEnabled(), "ACCOUNT_DISABLE=1 must turn accounts off");
  assert(accountDisabledReason() === "ACCOUNT_DISABLE=1", "disabled reason names the flag");

  delete process.env.ACCOUNT_DISABLE;
  process.env.CRM_DISABLE = "1";
  resetDbClient();
  assert(isAccountEnabled(), "CRM_DISABLE must not turn customer accounts off");
  assert(!isCrmEnabled(), "CRM_DISABLE still turns the CRM off");

  delete process.env.CRM_DISABLE;
  resetDbClient();
  assert(isAccountEnabled(), "accounts are on when the service role is set");

  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  resetDbClient();
  assert(!isAccountEnabled(), "accounts stay off without a service role key");

  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
  resetDbClient();

  const orders: StoredOrder[] = [
    {
      id: "ord_mine",
      sessionId: "cs_test_mine",
      amountSubtotal: 4000,
      amountTax: 0,
      amountTotal: 4000,
      currency: "usd",
      customerId: null,
      invoiceId: null,
      paymentIntentId: null,
      customerEmail: "Buyer@Example.com",
      shipping: null,
      phone: null,
      items: JSON.stringify([{ productId: 1, quantity: 2 }]),
      taxStatus: "recorded",
      paidAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "ord_theirs",
      sessionId: "cs_test_theirs",
      amountSubtotal: 9000,
      amountTax: 0,
      amountTotal: 9000,
      currency: "usd",
      customerId: null,
      invoiceId: null,
      paymentIntentId: null,
      customerEmail: "other@example.com",
      shipping: null,
      phone: null,
      items: JSON.stringify([{ productId: 2, quantity: 1 }]),
      taxStatus: "recorded",
      paidAt: "2026-09-02T00:00:00.000Z",
    },
  ];

  const mine = ordersForCustomer("buyer@example.com", orders);
  assert(mine.length === 1, "history is filtered to the session email");
  assert(mine[0].id === "ord_mine", "only the matching order is returned");
  assert(
    ordersForCustomer("", orders).length === 0,
    "an empty email must not dump the order file",
  );
  assert(
    ordersForCustomer("nobody@example.com", orders).length === 0,
    "an unknown email sees no orders",
  );

  const migration = fs.readFileSync("supabase/migrations/0002_customer_accounts.sql", "utf-8");
  for (const table of ["customer_profiles", "customer_saved_filters"]) {
    assert(
      new RegExp(`alter table ${table} enable row level security`, "i").test(migration),
      `${table} has RLS enabled`,
    );
  }
  assert(
    !/create policy/i.test(migration),
    "RLS is deny-by-default: no policies, service role only",
  );

  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  assert(!isCustomerAuthConfigured(), "customer auth is off without keys");

  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "anon-test-key";
  assert(isCustomerAuthConfigured(), "customer auth does not need STAFF_EMAILS");

  const guarded = express();
  guarded.get("/api/account", requireCustomer, (_req, res) => {
    res.json({ ok: true, email: _req.customer?.email });
  });
  guarded.get("/api/crm/deals", requireStaff, (_req, res) => {
    res.json({ ok: true });
  });
  const server = serve(guarded);

  const noToken = await fetch(`http://127.0.0.1:${server.port}/api/account`);
  assert(noToken.status === 401, `no token must be 401, got ${noToken.status}`);
  const noTokenBody = (await noToken.json()) as { code?: string };
  assert(noTokenBody.code === "unauthenticated", "missing token reports unauthenticated");

  process.env.STAFF_EMAILS = "info@filterhero.net";
  const staffGate = await fetch(`http://127.0.0.1:${server.port}/api/crm/deals`);
  assert(staffGate.status === 401, "staff routes still require a token");
  server.close();

  assert(safeNextPath("/sizes/20x25x1") === "/sizes/20x25x1", "same-origin next is kept");
  assert(safeNextPath("/sizes/20x25x1?merv=8") === "/sizes/20x25x1?merv=8", "query on a shop path is kept");
  assert(safeNextPath("//evil.example") === "/account", "protocol-relative next is rejected");
  assert(safeNextPath("https://evil.example") === "/account", "absolute next is rejected");
  assert(safeNextPath("/admin") === "/account", "staff console is not a customer next");
  assert(safeNextPath("/Admin") === "/account", "staff console match is case-insensitive");
  assert(safeNextPath("/account/../admin") === "/account", "dot-dot traversal is rejected");
  assert(safeNextPath("/api/account") === "/account", "API paths are not a customer next");
  assert(safeNextPath("/login") === "/account", "login is not a customer next");
  assert(STAFF_MAGIC_LINK_PATH === "/login", "staff magic links land on an allowed Auth path");
  assert(staffEmailsMatch("Info@FilterHero.net", "info@filterhero.net"), "staff pending matches session email");
  assert(!staffEmailsMatch("info@filterhero.net", "shopper@example.com"), "staff pending does not steal a shopper session");
  assert(!staffEmailsMatch(null, "info@filterhero.net"), "empty pending is not staff");

  const adminLogin = fs.readFileSync("client/src/pages/admin/Login.tsx", "utf-8");
  assert(
    /staffMagicLinkRedirect/.test(adminLogin),
    "staff OTP uses the allowed-path magic-link redirect",
  );
  assert(
    !/emailRedirectTo:\s*`\$\{window\.location\.origin\}\/admin`/.test(adminLogin),
    "staff magic links must not target /admin (blocked on production Auth)",
  );

  for (const file of ["server/account.ts", "server/account-routes.ts"]) {
    const source = fs.readFileSync(file, "utf-8");
    assert(
      !/from\s+["'].*mailer["']/.test(source),
      `${file} must not import the mailer`,
    );
    assert(
      !/from\s+["'].*klaviyo["']/.test(source),
      `${file} must not import Klaviyo`,
    );
    assert(
      !/from\s+["']resend["']/.test(source),
      `${file} must not import Resend`,
    );
  }

  assert(resolveDocumentSeo("/login", "https://filterhero.net").noindex, "/login is noindex");
  assert(resolveDocumentSeo("/account", "https://filterhero.net").noindex, "/account is noindex");
  const robots = fs.readFileSync("client/public/robots.txt", "utf-8");
  assert(/Disallow: \/login/.test(robots), "robots.txt disallows /login");
  assert(/Disallow: \/account/.test(robots), "robots.txt disallows /account");

  if (realUrl) process.env.SUPABASE_URL = realUrl;
  if (realKey) process.env.SUPABASE_SERVICE_ROLE_KEY = realKey;

  console.log("verify:account ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
