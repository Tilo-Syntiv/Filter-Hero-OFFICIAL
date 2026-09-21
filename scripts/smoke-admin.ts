import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

/**
 * Live staff-console smoke against the running API.
 * Mints a one-time OTP via the service role, never prints tokens, restores
 * site-config if maintenance mode is toggled.
 */

const API = (process.env.ADMIN_SMOKE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function staffToken(): Promise<string> {
  const url = (process.env.SUPABASE_URL || "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anon = (process.env.SUPABASE_ANON_KEY || "").trim();
  const email = (process.env.STAFF_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)[0];
  assert(url && service && anon && email, "Need Supabase URL, service role, anon, and STAFF_EMAILS");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  assert(!error && data?.properties?.email_otp, error?.message || "Could not mint a staff OTP");

  const browser = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await browser.auth.verifyOtp({
    email,
    token: data.properties.email_otp,
    type: "email",
  });
  const token = verified.data.session?.access_token;
  assert(token, verified.error?.message || "OTP verify did not return a session");
  return token;
}

async function call(
  token: string | null,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

async function main() {
  const locked = await call(null, "/api/admin/overview");
  assert(locked.status === 401, `/api/admin/overview must be 401 signed out, got ${locked.status}`);

  const publicConfig = await call(null, "/api/site-config");
  assert(publicConfig.status === 200 && publicConfig.body.ok === true, "public site-config 200");
  const publicBlob = JSON.stringify(publicConfig.body);
  assert(!/sk_live|service_role|eyJhbGciOi/.test(publicBlob), "public site-config leaked a secret");

  const token = await staffToken();

  const paths = [
    "/api/admin/overview",
    "/api/admin/orders",
    "/api/admin/leads",
    "/api/admin/customers",
    "/api/admin/contacts",
    "/api/admin/audit",
    "/api/admin/catalog",
    "/api/admin/analytics",
    "/api/admin/tracking",
    "/api/admin/health",
    "/api/admin/security",
    "/api/admin/staff",
    "/api/admin/settings",
    "/api/admin/maintenance",
    "/api/admin/config",
    "/api/crm/stages",
    "/api/crm/deals?limit=20",
  ];

  for (const path of paths) {
    const result = await call(token, path);
    assert(result.status === 200 && result.body.ok !== false, `${path} failed (${result.status})`);
  }

  const overview = await call(token, "/api/admin/overview");
  const data = overview.body.data as { catalog?: { skus?: number }; pipeline?: { enabled?: boolean } };
  assert((data.catalog?.skus ?? 0) > 0, "overview catalog has SKUs");

  const stages = await call(token, "/api/crm/stages");
  const stageRows = stages.body.data as { id: string }[];
  assert(Array.isArray(stageRows) && stageRows.length === 6, "quotes pipeline still has six stages");

  const before = await call(token, "/api/admin/config");
  const original = before.body.data as Record<string, unknown>;
  try {
    const paused = await call(token, "/api/admin/config", {
      method: "PATCH",
      body: JSON.stringify({
        maintenanceMode: true,
        maintenanceMessage: "Smoke test pause",
      }),
    });
    assert(paused.status === 200, "maintenance patch failed");
    const checkout = await call(null, "/api/checkout", {
      method: "POST",
      body: JSON.stringify({ items: [{ productId: 1, quantity: 1 }] }),
    });
    assert(checkout.status === 503 && checkout.body.code === "maintenance", "checkout must pause in maintenance");
    const banner = await call(null, "/api/site-config");
    const site = banner.body.data as { maintenanceMode?: boolean };
    assert(site.maintenanceMode === true, "public site-config should show maintenance");
  } finally {
    await call(token, "/api/admin/config", {
      method: "PATCH",
      body: JSON.stringify({
        maintenanceMode: original.maintenanceMode ?? false,
        maintenanceMessage: original.maintenanceMessage,
        announcementEnabled: original.announcementEnabled,
        announcement: original.announcement,
        tagline: original.tagline,
        heroKicker: original.heroKicker,
        heroLede: original.heroLede,
        featuredSizeSlugs: original.featuredSizeSlugs,
        faqs: original.faqs,
      }),
    });
  }

  const restored = await call(null, "/api/checkout", {
    method: "POST",
    body: JSON.stringify({ items: [] }),
  });
  assert(restored.status === 400, `checkout should be open again (400 invalid body), got ${restored.status}`);

  console.log("smoke:admin ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
