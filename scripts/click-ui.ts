import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE = process.env.BROWSE_BASE || "http://127.0.0.1:3000";
const OUT = process.env.BROWSE_OUT || path.resolve("tmp/browser");
const headed = process.env.BROWSE_HEADED === "1";

mkdirSync(OUT, { recursive: true });

async function shot(page: Page, name: string) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const steps: { step: string; url: string; file: string }[] = [];
  const record = async (step: string) => {
    steps.push({ step, url: page.url(), file: await shot(page, String(steps.length + 1).padStart(2, "0") + "-" + step) });
  };

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByText("Filter Hero", { exact: false }).first().waitFor({ timeout: 20000 });
  const homeCopy = (await page.locator("body").innerText()).toLowerCase();
  if (homeCopy.includes("free shipping")) {
    throw new Error("Home must not promise free shipping");
  }
  await page.getByRole("heading", { name: /built to last/i }).waitFor({ timeout: 10000 });
  await page.getByText(/a dirty filter costs more than the filter/i).first().waitFor();
  await page.locator('img[src*="pack-merv11.png"]').first().waitFor();
  await record("home");

  const findMySize = page.getByRole("button", { name: "Find my size" });
  await findMySize.scrollIntoViewIfNeeded();
  await findMySize.waitFor({ state: "visible" });
  await record("finder");

  await findMySize.click();
  await page.waitForURL(/\/sizes\//, { timeout: 15000 });
  await page.getByRole("button", { name: /add \d+ to cart/i }).first().waitFor();
  await record("size");

  await page.getByRole("button", { name: /add \d+ to cart/i }).first().click();
  await page.getByRole("heading", { name: /your cart/i }).waitFor({ timeout: 8000 });
  await record("added-to-cart");

  const cartBtn = page.getByRole("button", { name: /cart/i }).first();
  if (await cartBtn.count()) {
    await cartBtn.click();
    await page.waitForTimeout(400);
  }
  await record("cart");

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /sign in/i }).waitFor({ timeout: 10000 });
  await record("login");

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByText(/staff|quotes|sign in|work email/i).first().waitFor({ timeout: 10000 });
  await record("admin");

  await page.goto(`${BASE}/brands/carrier`, { waitUntil: "domcontentloaded" });
  await page.getByText(/carrier/i).first().waitFor({ timeout: 10000 });
  await record("brand");

  await browser.close();

  const uniqueErrors = [...new Set(consoleErrors)].filter(
    (line) =>
      !line.includes("favicon") &&
      !line.includes("Download the React DevTools") &&
      !line.includes("font-size:0;color:transparent") &&
      // HTTP localhost: onsite SDK posts to http://a.klaviyo.com, which 301s to HTTPS and CORS-fails. Dual-write /api/identify still works.
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
