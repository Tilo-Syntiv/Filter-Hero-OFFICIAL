import "dotenv/config";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import { requireStaff } from "../server/auth.ts";
import { publicSiteConfig, saveSiteConfig } from "../server/admin/config.ts";
import {
  DEFAULT_SITE_CONFIG,
  featuredSizesFromConfig,
  toPublicSiteConfig,
} from "../shared/site-config.ts";
import { popularSizeSlugs } from "../shared/products.ts";
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
  process.env.STAFF_EMAILS = "info@filterhero.net";
  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "anon-test-key";

  const guarded = express();
  guarded.get("/api/admin/overview", requireStaff, (_req, res) => {
    res.json({ ok: true });
  });
  const server = serve(guarded);
  const noToken = await fetch(`http://127.0.0.1:${server.port}/api/admin/overview`);
  assert(noToken.status === 401, `admin without a token must be 401, got ${noToken.status}`);
  server.close();

  const publicConfig = publicSiteConfig();
  const blob = JSON.stringify(publicConfig);
  assert(!/sk_live|sk_test|service_role|STAFF_EMAILS/i.test(blob), "public site-config must not leak secrets");
  assert("heroLede" in publicConfig, "public config includes storefront copy");
  assert(!("updatedBy" in publicConfig), "public config hides the staff editor");

  const parsed = toPublicSiteConfig(DEFAULT_SITE_CONFIG);
  assert(parsed.maintenanceMode === false, "checkout starts open");
  assert(
    JSON.stringify(featuredSizesFromConfig([], 8)) === JSON.stringify(popularSizeSlugs(8)),
    "empty featured sizes must match the header defaults",
  );
  assert(
    JSON.stringify(featuredSizesFromConfig([], 16)) === JSON.stringify(popularSizeSlugs(16)),
    "empty featured sizes must match the carousel defaults",
  );

  const previous = process.env.DATA_DIR;
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "fh-admin-config-"));
  const saved = saveSiteConfig(
    { announcementEnabled: true, announcement: "Test banner", tagline: "" },
    "info@filterhero.net",
  );
  assert(saved.announcement === "Test banner", "site-config persists announcement");
  assert(saved.updatedBy === "info@filterhero.net", "site-config records the editor");
  assert(saved.tagline === DEFAULT_SITE_CONFIG.tagline, "blank tagline keeps the default");
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  if (previous) process.env.DATA_DIR = previous;
  else delete process.env.DATA_DIR;

  for (const file of ["server/admin/routes.ts", "server/admin/config.ts", "server/admin/data.ts"]) {
    const source = fs.readFileSync(file, "utf-8");
    assert(
      !/from\s+["']resend["']/.test(source),
      `${file} must not import Resend`,
    );
    assert(
      !/from\s+["'].*mailer["']/.test(source),
      `${file} must not import the mailer`,
    );
    assert(
      !/\bsyncContactToKlaviyo\b|\btrackKlaviyoEvent\b|\bupsertKlaviyoProfile\b/.test(source),
      `${file} must not write Klaviyo`,
    );
  }
  const adminRoutes = fs.readFileSync("server/admin/routes.ts", "utf-8");
  assert(
    adminRoutes.includes("/klaviyo-stripe/connect"),
    "staff settings can create the Klaviyo Stripe webhook",
  );
  assert(adminRoutes.includes("stripeTax:"), "staff settings expose Stripe Tax readiness");

  for (const pathName of [
    "/admin",
    "/admin/quotes",
    "/admin/orders",
    "/admin/content",
    "/admin/security",
    "/admin/maintenance",
  ]) {
    assert(resolveDocumentSeo(pathName, "https://filterhero.net").noindex, `${pathName} is noindex`);
  }

  const robots = fs.readFileSync("client/public/robots.txt", "utf-8");
  assert(/Disallow: \/admin/.test(robots), "robots.txt disallows /admin");

  const appSource = fs.readFileSync("client/src/App.tsx", "utf-8");
  assert(appSource.includes('path="/admin/quotes"'), "quotes board is at /admin/quotes");
  assert(appSource.includes('path="/admin" component={AdminOverview}'), "overview is the admin home");

  const header = fs.readFileSync("client/src/components/SiteHeader.tsx", "utf-8");
  assert(
    /featuredSizesFromConfig\([^,]+,\s*8\)/.test(header),
    "header popular chips use the 8-size default, not a slice of 16",
  );

  const toaster = fs.readFileSync("client/src/components/ui/sonner.tsx", "utf-8");
  assert(!/from\s+["']next-themes["']/.test(toaster), "toaster must use the Vite ThemeProvider");
  assert(
    /from\s+["']@\/contexts\/ThemeContext["']/.test(toaster),
    "toaster reads theme from ThemeContext",
  );
  assert(/createPortal/.test(toaster), "toaster portals onto document.body so drawers cannot hide it");

  const adminLogin = fs.readFileSync("client/src/pages/admin/Login.tsx", "utf-8");
  assert(/I already have a code/.test(adminLogin), "staff can enter an OTP without sending again");

  console.log("verify:admin ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
