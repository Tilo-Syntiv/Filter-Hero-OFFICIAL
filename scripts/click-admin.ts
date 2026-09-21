import "dotenv/config";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page } from "playwright";

/**
 * Signs into the staff console and clicks every sidebar module.
 * Mints a one-time OTP via the service role and never prints tokens.
 */

const BASE = (process.env.BROWSE_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = process.env.BROWSE_OUT || path.resolve("tmp/browser");
const headed = process.env.BROWSE_HEADED === "1";

const MODULES: { href: string; heading: string }[] = [
  { href: "/admin", heading: "Overview" },
  { href: "/admin/quotes", heading: "Quotes" },
  { href: "/admin/contacts", heading: "Contacts" },
  { href: "/admin/orders", heading: "Orders" },
  { href: "/admin/customers", heading: "Customers" },
  { href: "/admin/catalog", heading: "Products" },
  { href: "/admin/content", heading: "Content" },
  { href: "/admin/analytics", heading: "Analytics" },
  { href: "/admin/tracking", heading: "Tracking" },
  { href: "/admin/users", heading: "Admin" },
  { href: "/admin/security", heading: "Security" },
  { href: "/admin/settings", heading: "Settings" },
  { href: "/admin/maintenance", heading: "Maintenance" },
];

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function staffCreds(): { url: string; service: string; email: string } {
  const url = (process.env.SUPABASE_URL || "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const email = (process.env.STAFF_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)[0];
  assert(url && service && email, "Need Supabase URL, service role, and STAFF_EMAILS");
  return { url, service, email };
}

async function mintOtp(): Promise<{ email: string; token: string }> {
  const { url, service, email } = staffCreds();
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  assert(!error && data?.properties?.email_otp, error?.message || "Could not mint a staff OTP");
  return { email, token: data.properties.email_otp };
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT, `admin-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function pageFailed(text: string): string | null {
  const lowered = text.toLowerCase();
  if (lowered.includes("vite_supabase_url")) return "missing Vite Supabase env";
  if (lowered.includes("admin access is not configured")) return "auth not configured";
  if (lowered.includes("not authorized")) return "forbidden";
  if (lowered.includes("sign in required")) return "signed out";
  if (lowered.includes("load failed")) return "load failed";
  if (lowered.includes("request failed")) return "request failed";
  if (lowered.includes("could not load")) return "could not load";
  return null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { email, token } = await mintOtp();

  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const steps: { step: string; url: string; file: string }[] = [];
  const record = async (step: string) => {
    steps.push({
      step,
      url: page.url(),
      file: await shot(page, `${String(steps.length + 1).padStart(2, "0")}-${step}`),
    });
  };

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /admin sign in/i }).waitFor({ timeout: 15000 });
  const loginCopy = (await page.locator("body").innerText()).toLowerCase();
  assert(!loginCopy.includes("vite_supabase_url"), "Admin is missing Vite Supabase env");

  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "I already have a code" }).click();
  await page.getByLabel("6-digit code").fill(token);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Overview" }).waitFor({ timeout: 20000 });
  await page.getByText("Loading…").first().waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
  await record("overview");

  for (const mod of MODULES) {
    await page.locator("aside").getByRole("link", { name: mod.heading, exact: true }).click();
    await page.waitForURL(
      mod.href === "/admin" ? /\/admin\/?$/ : new RegExp(`${mod.href.replaceAll("/", "\\/")}/?$`),
      { timeout: 15000 },
    );
    await page.getByRole("heading", { name: mod.heading, exact: true }).waitFor({ timeout: 15000 });
    await page.getByText("Loading…").first().waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
    const main = await page.locator("main").innerText();
    const failure = pageFailed(main);
    assert(!failure, `${mod.heading} (${mod.href}): ${failure}`);
    if (mod.href === "/admin/catalog") {
      assert(/Showing \d+ of \d+/.test(main), "catalog must show SKU counts");
      const shown = main.match(/Showing (\d+) of (\d+)/);
      assert(shown, "catalog footer missing");
      assert(Number(shown[1]) === Number(shown[2]), `catalog truncated ${shown[1]} of ${shown[2]}`);
      assert(Number(shown[2]) > 0, "catalog is empty");
    }
    if (mod.href === "/admin/quotes") {
      const quoteLink = page.locator("main a[href^='/admin/deals/']").first();
      if (await quoteLink.count()) {
        await quoteLink.click();
        await page.waitForURL(/\/admin\/deals\//, { timeout: 10000 });
        await page.getByText("Loading…").first().waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
        const detail = await page.locator("main").innerText();
        const failure = pageFailed(detail);
        assert(!failure, `Deal detail: ${failure}`);
        await record("deal");
        await page.locator("aside").getByRole("link", { name: "Quotes", exact: true }).click();
        await page.waitForURL(/\/admin\/quotes\/?$/, { timeout: 10000 });
      }
    }
    await record(mod.heading.toLowerCase().replace(/\s+/g, "-"));
  }

  await browser.close();

  const uniqueErrors = [...new Set(consoleErrors)].filter(
    (line) =>
      !line.includes("favicon") &&
      !line.includes("Download the React DevTools") &&
      !line.includes("a.klaviyo.com"),
  );

  console.log(
    JSON.stringify(
      {
        ok: uniqueErrors.length === 0,
        base: BASE,
        headed,
        out: OUT,
        steps,
        consoleErrors: uniqueErrors,
      },
      null,
      2,
    ),
  );
  if (uniqueErrors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
