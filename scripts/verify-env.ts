import "dotenv/config";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { BRAND_EMAIL, BRAND_NAME } from "../shared/const.ts";
import { renderBrandedEmail } from "../shared/email-brand.ts";
import { accountDisabledReason, crmDisabledReason, resetDbClient } from "../server/db.ts";
import { FILTER_HERO_ACCOUNT_ID } from "../shared/stripe-accounts.ts";
import { readStripeWebhookHealth } from "../server/stripe-webhooks.ts";

type Status = "ok" | "fail" | "skip";

type Check = {
  name: string;
  status: Status;
  detail: string;
};

const checks: Check[] = [];
let failed = 0;

function add(name: string, status: Status, detail: string) {
  checks.push({ name, status, detail });
  if (status === "fail") failed += 1;
}

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function present(name: string): boolean {
  const value = env(name);
  return Boolean(value) && !value.includes("...") && !value.includes("<project-ref>");
}

function starts(name: string, prefixes: string[]): boolean {
  const value = env(name);
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function assertFormat(name: string, prefixes: string[], required = true) {
  if (!present(name)) {
    add(name, required ? "fail" : "skip", required ? "missing or placeholder" : "unset");
    return false;
  }
  if (prefixes.length && !starts(name, prefixes)) {
    add(name, "fail", `unexpected format (want ${prefixes.join(" | ")})`);
    return false;
  }
  add(name, "ok", `set (${env(name).length} chars)`);
  return true;
}

function assertEquals(name: string, expected: string, required = true) {
  const value = env(name);
  if (!value) {
    add(name, required ? "fail" : "skip", required ? "missing" : "unset");
    return false;
  }
  if (value !== expected) {
    add(name, "fail", `expected ${expected}`);
    return false;
  }
  add(name, "ok", expected);
  return true;
}

async function jsonGet(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, { headers });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { status: res.status, body };
}

async function main() {
  assertEquals("CLIENT_URL", "http://localhost:3000");
  assertEquals("SITE_URL", "https://filterhero.net");
  assertEquals("VITE_SITE_URL", "https://filterhero.net");
  assertEquals("PORT", "3001");
  assertEquals("NODE_ENV", "development");
  assertEquals("CONTACT_TO", BRAND_EMAIL);
  assertEquals("RESEND_FROM", `${BRAND_NAME} <${BRAND_EMAIL}>`);
  assertEquals("VITE_FULL_CATALOG", "false");
  assertEquals("FULL_CATALOG", "false");
  assertEquals("SUPABASE_URL", "https://mayxuwlygchatgeqyhyt.supabase.co");
  assertEquals("VITE_SUPABASE_URL", "https://mayxuwlygchatgeqyhyt.supabase.co");

  const staff = env("STAFF_EMAILS");
  if (staff.toLowerCase().includes("info@filterhero.net")) {
    add("STAFF_EMAILS", "ok", "includes info@filterhero.net");
  } else {
    add("STAFF_EMAILS", "fail", "must include info@filterhero.net");
  }

  assertFormat("STRIPE_SECRET_KEY", ["sk_test_", "sk_live_"]);
  assertFormat("STRIPE_WEBHOOK_SECRET", ["whsec_"]);
  assertFormat("STRIPE_PUBLISHABLE_KEY", ["pk_test_", "pk_live_"], false);
  assertFormat("VITE_STRIPE_PUBLISHABLE_KEY", ["pk_test_", "pk_live_"], false);
  if (present("STRIPE_PUBLISHABLE_KEY") && present("VITE_STRIPE_PUBLISHABLE_KEY")) {
    if (env("STRIPE_PUBLISHABLE_KEY") === env("VITE_STRIPE_PUBLISHABLE_KEY")) {
      add("STRIPE_PUBLISHABLE_PAIR", "ok", "client and server publishable keys match");
    } else {
      add("STRIPE_PUBLISHABLE_PAIR", "fail", "publishable keys differ");
    }
  }
  if (starts("STRIPE_SECRET_KEY", ["sk_test_"]) && starts("STRIPE_PUBLISHABLE_KEY", ["pk_test_"])) {
    add("STRIPE_MODE", "ok", "local .env is Stripe test mode");
  } else if (starts("STRIPE_SECRET_KEY", ["sk_live_"])) {
    add("STRIPE_MODE", "ok", "Stripe live mode");
  }

  assertFormat("RESEND_API_KEY", ["re_"]);

  assertFormat("SUPABASE_SERVICE_ROLE_KEY", ["eyJ"]);
  assertFormat("SUPABASE_ANON_KEY", ["eyJ"]);
  assertFormat("VITE_SUPABASE_ANON_KEY", ["sb_publishable_", "eyJ"]);

  assertFormat("TURNSTILE_SECRET_KEY", ["0x"]);
  assertFormat("VITE_TURNSTILE_SITE_KEY", ["0x"]);
  assertFormat("CLOUDFLARE_ACCOUNT_ID", [], false);
  assertFormat("CLOUDFLARE_API_TOKEN", [], false);

  assertFormat("FILTERKING_CLIENT_ID", [], false);
  assertFormat("FILTERKING_CLIENT_SECRET", [], false);
  if (present("FILTERKING_API_BASE") && env("FILTERKING_API_BASE") !== "https://filterking.com") {
    add("FILTERKING_API_BASE", "fail", "expected https://filterking.com");
  } else if (present("FILTERKING_API_BASE")) {
    add("FILTERKING_API_BASE", "ok", env("FILTERKING_API_BASE"));
  }
  assertFormat("RAILWAY_PROJECT_ID", [], false);
  assertFormat("RAILWAY_SERVICE_ID", [], false);
  assertFormat("RAILWAY_ENVIRONMENT_ID", [], false);
  assertFormat("HF_TOKEN", ["hf_"], false);
  assertFormat("GEMINI_API_KEY", ["AIza"], false);
  assertFormat("GOOGLE_CLOUD_PROJECT", [], false);

  if (env("CRM_DISABLE") === "1") add("CRM_DISABLE", "fail", "CRM is forced off");
  else add("CRM_DISABLE", "ok", "unset (CRM on)");
  if (env("ACCOUNT_DISABLE") === "1") add("ACCOUNT_DISABLE", "fail", "accounts are forced off");
  else add("ACCOUNT_DISABLE", "ok", "unset (accounts on)");

  resetDbClient();
  const crmOff = crmDisabledReason();
  const accountOff = accountDisabledReason();
  add("CRM_READY", crmOff ? "fail" : "ok", crmOff || "service role + URL ready");
  add("ACCOUNT_READY", accountOff ? "fail" : "ok", accountOff || "service role + URL ready");

  if (present("STRIPE_SECRET_KEY")) {
    try {
      const stripe = new Stripe(env("STRIPE_SECRET_KEY"));
      const account = await stripe.accounts.retrieve();
      const balance = await stripe.balance.retrieve();
      add(
        "STRIPE_LIVE",
        account.details_submitted || !balance.livemode ? "ok" : "fail",
        `${account.id} ${account.charges_enabled ? "charges on" : "charges off (test ok)"} ${balance.livemode ? "live" : "test"}`,
      );
      const listed = await readStripeWebhookHealth(stripe);
      if (listed.health.shop.conflict) {
        add(
          "STRIPE_WEBHOOK",
          "fail",
          `${listed.accountId} must not post checkout events to filterhero.net — run pnpm setup:stripe-webhook`,
        );
      } else if (listed.livemode && listed.accountId === FILTER_HERO_ACCOUNT_ID && !listed.health.shop.present) {
        add("STRIPE_WEBHOOK", "fail", "no Dashboard endpoint for /api/stripe/webhook");
      } else if (!listed.livemode) {
        add("STRIPE_WEBHOOK", "ok", "test key uses stripe listen, not filterhero.net");
      } else {
        add("STRIPE_WEBHOOK", "ok", "https://filterhero.net/api/stripe/webhook enabled");
      }
      if (listed.health.klaviyo.conflict) {
        add(
          "STRIPE_KLAVIYO",
          "fail",
          `${listed.accountId} must not host a Klaviyo webhook — live FILTER HERO only`,
        );
      } else if (listed.health.klaviyo.present) {
        add("STRIPE_KLAVIYO", "ok", "charge/invoice webhook is on live FILTER HERO");
      } else {
        add("STRIPE_KLAVIYO", "ok", "Klaviyo charge/invoice webhook is not connected yet");
      }
    } catch (err) {
      add("STRIPE_LIVE", "fail", err instanceof Error ? err.message : "Stripe API failed");
    }
  }

  if (present("RESEND_API_KEY")) {
    try {
      const resend = new Resend(env("RESEND_API_KEY"));
      const domainsRes = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}` },
      });
      const domainsBody = (await domainsRes.json()) as {
        data?: Array<{ name?: string; status?: string }>;
        message?: string;
        name?: string;
      };
      if (domainsRes.status === 401 || domainsRes.status === 403) {
        add("RESEND_DOMAINS", "ok", "sending-only key (cannot list domains)");
      } else if (domainsRes.status !== 200) {
        add("RESEND_DOMAINS", "fail", domainsBody.message || `HTTP ${domainsRes.status}`);
      } else {
        const hero = (domainsBody.data || []).find((row) => row.name === "filterhero.net");
        if (!hero) add("RESEND_DOMAINS", "fail", "filterhero.net not on this account");
        else if (hero.status !== "verified") add("RESEND_DOMAINS", "fail", `status ${hero.status}`);
        else add("RESEND_DOMAINS", "ok", "filterhero.net verified");
      }

      const probe = await resend.emails.send(
        {
          from: env("RESEND_FROM") || `${BRAND_NAME} <${BRAND_EMAIL}>`,
          to: ["delivered@resend.dev"],
          subject: `[${BRAND_NAME}] env verify`,
          html: renderBrandedEmail({
            title: "Env verify",
            bodyHtml: "<p>Filter Hero .env Resend probe. Safe test address delivered@resend.dev.</p>",
            ctaHref: "https://filterhero.net",
            ctaLabel: "Open Filter Hero",
          }),
          text: "Filter Hero .env Resend probe. Safe test address delivered@resend.dev.",
        },
        { idempotencyKey: `verify-env/${Date.now()}` },
      );
      if (probe.error) add("RESEND_SEND", "fail", probe.error.message);
      else add("RESEND_SEND", "ok", `probe ${probe.data?.id || "sent"}`);
    } catch (err) {
      add("RESEND_SEND", "fail", err instanceof Error ? err.message : "Resend send failed");
    }
  }

  if (present("SUPABASE_URL") && present("SUPABASE_SERVICE_ROLE_KEY")) {
    try {
      const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await admin.from("customer_profiles").select("id", { count: "exact", head: true });
      if (error) add("SUPABASE_LIVE", "fail", error.message);
      else {
        const { error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
        add(
          "SUPABASE_LIVE",
          authError ? "fail" : "ok",
          authError ? authError.message : "CRM table + Auth admin reachable",
        );
      }
    } catch (err) {
      add("SUPABASE_LIVE", "fail", err instanceof Error ? err.message : "Supabase failed");
    }
  }

  if (present("TURNSTILE_SECRET_KEY")) {
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env("TURNSTILE_SECRET_KEY"),
          response: "env-verify-dummy-token",
        }),
      });
      const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
      const codes = data["error-codes"] || [];
      if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
        add("TURNSTILE_LIVE", "fail", codes.join(", "));
      } else if (codes.includes("invalid-input-response") || data.success === false) {
        add("TURNSTILE_LIVE", "ok", "secret accepted (dummy token rejected as expected)");
      } else {
        add("TURNSTILE_LIVE", "fail", `unexpected siteverify: ${codes.join(", ") || "no error-codes"}`);
      }
    } catch (err) {
      add("TURNSTILE_LIVE", "fail", err instanceof Error ? err.message : "Turnstile failed");
    }
  }

  if (present("CLOUDFLARE_API_TOKEN")) {
    const { status, body } = await jsonGet("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      Authorization: `Bearer ${env("CLOUDFLARE_API_TOKEN")}`,
    });
    const ok = body.success === true;
    const result = (body.result || {}) as { status?: string; id?: string };
    if (status === 200 && ok) {
      add("CLOUDFLARE_TOKEN", "ok", `token ${result.status || "active"}`);
      const zones = await jsonGet(
        "https://api.cloudflare.com/client/v4/zones?name=filterhero.net",
        { Authorization: `Bearer ${env("CLOUDFLARE_API_TOKEN")}` },
      );
      const zoneRows = ((zones.body.result as Array<{ name?: string; status?: string }> | undefined) || []);
      const zone = zoneRows.find((row) => row.name === "filterhero.net");
      if (zone) add("CLOUDFLARE_ZONE", "ok", `filterhero.net ${zone.status || "found"}`);
      else add("CLOUDFLARE_ZONE", "fail", "token valid but cannot read filterhero.net zone");
    } else {
      const err = Array.isArray(body.errors)
        ? (body.errors as Array<{ message?: string }>).map((row) => row.message).join("; ")
        : `HTTP ${status}`;
      add("CLOUDFLARE_TOKEN", "fail", err || "invalid token");
    }
  }

  if (present("HF_TOKEN")) {
    const { status, body } = await jsonGet("https://huggingface.co/api/whoami-v2", {
      Authorization: `Bearer ${env("HF_TOKEN")}`,
    });
    if (status === 200 && typeof body.name === "string") {
      add("HF_TOKEN_LIVE", "ok", `Hugging Face ${body.name} (unused by shop)`);
    } else {
      add("HF_TOKEN_LIVE", "fail", `HTTP ${status}`);
    }
  }

  if (present("GEMINI_API_KEY")) {
    const { status, body } = await jsonGet(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(env("GEMINI_API_KEY"))}&pageSize=1`,
    );
    if (status === 200) add("GEMINI_LIVE", "ok", "Gemini key accepted (unused by shop)");
    else {
      const err = (body.error as { message?: string } | undefined)?.message || `HTTP ${status}`;
      add("GEMINI_LIVE", "fail", err);
    }
  }

  const width = Math.max(...checks.map((row) => row.name.length));
  for (const row of checks) {
    const mark = row.status === "ok" ? "ok  " : row.status === "skip" ? "skip" : "FAIL";
    console.log(`${mark}  ${row.name.padEnd(width)}  ${row.detail}`);
  }
  console.log("");
  console.log(
    `verify:env ${failed === 0 ? "ok" : "FAILED"}  ${checks.filter((row) => row.status === "ok").length} passed, ${failed} failed, ${checks.filter((row) => row.status === "skip").length} skipped`,
  );
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
