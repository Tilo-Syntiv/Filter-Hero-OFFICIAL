import "dotenv/config";
import fs from "node:fs";
import express from "express";
import { isStaffEmail, requireStaff, staffEmails } from "../server/auth.ts";
import { crmDisabledReason, isCrmEnabled, resetDbClient } from "../server/db.ts";
import {
  contactLimiter,
  isHoneypotTripped,
  publicError,
  sanitizeEventProperties,
  sanitizeIdentifyProperties,
  verifyTurnstile,
} from "../server/security.ts";
import {
  CLOSED_LOST_STAGE,
  CLOSED_WON_STAGE,
  INTENT_TO_STAGE,
  isClosedStage,
  PIPELINE_ID,
  STAGE_IDS,
} from "../server/crm/schema.ts";
import { recordLeadInCrm } from "../server/crm/intake.ts";
import { CRM_SENDS_MAIL, EMAIL_OWNER } from "../shared/email-channels.ts";
import { resolveDocumentSeo } from "../shared/seo.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

/** Bind to an ephemeral port and hand back the port plus a closer. */
function serve(app: express.Express): { port: number; close: () => void } {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  return { port, close: () => server.close() };
}

async function main() {
  const realUrl = process.env.SUPABASE_URL;
  const realKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // --- The disable flag -----------------------------------------------------

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
  process.env.CRM_DISABLE = "1";
  resetDbClient();
  assert(!isCrmEnabled(), "CRM_DISABLE=1 must turn the CRM off");
  assert(crmDisabledReason() === "CRM_DISABLE=1", "disabled reason names the flag");

  delete process.env.CRM_DISABLE;
  resetDbClient();
  assert(isCrmEnabled(), "CRM is on when URL and service role key are set");

  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  resetDbClient();
  assert(!isCrmEnabled(), "CRM stays off without a service role key");

  // A disabled CRM must fail soft, not throw — server/contact.ts calls this
  // after the lead is already saved.
  process.env.CRM_DISABLE = "1";
  resetDbClient();
  const disabled = await recordLeadInCrm({
    id: "lead_disabled",
    name: "Test Person",
    email: "disabled@example.com",
    message: "Need a quote",
    intent: "quote",
  });
  assert(!disabled.ok && disabled.skipped, "a disabled CRM skips rather than throws");

  // --- Pipeline shape -------------------------------------------------------

  assert(PIPELINE_ID === "quotes", "one pipeline, named quotes");
  assert(STAGE_IDS.length === 6, "six stages");
  for (const stage of ["new", "needs_info", "priced", "waiting", "won", "lost"]) {
    assert(STAGE_IDS.includes(stage as never), `stage ${stage} exists`);
  }
  assert(isClosedStage(CLOSED_WON_STAGE), "won is a closed stage");
  assert(isClosedStage(CLOSED_LOST_STAGE), "lost is a closed stage");
  assert(!isClosedStage("new"), "new is open");
  assert(!isClosedStage("waiting"), "waiting is open");

  // --- Lead intent to stage -------------------------------------------------

  assert(INTENT_TO_STAGE.quote === "new", "a quote opens in the new stage");
  assert(INTENT_TO_STAGE.support === null, "support gets a note, not a deal");
  // FH-131: checking the Filter Clock is not a purchase signal and not an
  // opportunity. Giving it a deal would put a shopper who asked for nothing
  // into the sales pipeline.
  assert(INTENT_TO_STAGE.reminder === null, "a reminder must never create a deal");

  // The reminder rule has to hold through the intake path, not just the table.
  delete process.env.CRM_DISABLE;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
  resetDbClient();
  assert(isCrmEnabled(), "the reminder check must run with the CRM enabled");
  const reminder = await recordLeadInCrm({
    id: "lead_reminder",
    name: "Filter Clock reminder",
    email: "clock@example.com",
    message: "Clock cadence saved",
    intent: "reminder",
  });
  assert(reminder.ok && reminder.skipped, "reminder intake stops before any write");
  assert(!reminder.dealId, "reminder intake creates no deal");

  // --- Schema guarantees ----------------------------------------------------

  const migration = fs.readFileSync("supabase/migrations/0001_crm.sql", "utf-8");
  assert(
    /create unique index[\s\S]*crm_deals_lead_id_key[\s\S]*on crm_deals \(lead_id\)[\s\S]*where lead_id is not null/i.test(
      migration,
    ),
    "a partial unique index on lead_id makes intake idempotent",
  );
  for (const table of [
    "crm_pipelines",
    "crm_stages",
    "crm_companies",
    "crm_contacts",
    "crm_deals",
    "crm_activities",
    "crm_audit_log",
  ]) {
    assert(
      new RegExp(`alter table ${table} enable row level security`, "i").test(migration),
      `${table} has RLS enabled`,
    );
  }
  assert(
    !/create policy/i.test(migration),
    "RLS is deny-by-default: no policies, service role only",
  );

  // --- requireStaff ---------------------------------------------------------

  process.env.STAFF_EMAILS = "info@filterhero.net, Owner@FilterHero.net";
  assert(staffEmails().length === 2, "STAFF_EMAILS splits on commas");
  assert(isStaffEmail("INFO@filterhero.net"), "staff match is case-insensitive");
  assert(!isStaffEmail("attacker@example.com"), "a stranger is not staff");
  assert(!isStaffEmail(undefined), "a missing email is not staff");

  process.env.STAFF_EMAILS = "";
  assert(!isStaffEmail("info@filterhero.net"), "an empty allowlist admits nobody");
  process.env.STAFF_EMAILS = "info@filterhero.net";

  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "anon-test-key";

  const guarded = express();
  guarded.get("/api/crm/deals", requireStaff, (_req, res) => {
    res.json({ ok: true });
  });
  const guardedServer = serve(guarded);

  const noToken = await fetch(`http://127.0.0.1:${guardedServer.port}/api/crm/deals`);
  assert(noToken.status === 401, `no token must be 401, got ${noToken.status}`);
  const noTokenBody = (await noToken.json()) as { code?: string };
  assert(noTokenBody.code === "unauthenticated", "missing token reports unauthenticated");

  const badToken = await fetch(`http://127.0.0.1:${guardedServer.port}/api/crm/deals`, {
    headers: { Authorization: "Bearer not-a-real-token" },
  });
  assert(
    badToken.status === 403 || badToken.status === 503,
    `a forged token must not be accepted, got ${badToken.status}`,
  );
  guardedServer.close();

  // An unconfigured gate must fail closed rather than open.
  const savedStaff = process.env.STAFF_EMAILS;
  process.env.STAFF_EMAILS = "";
  const unconfigured = express();
  unconfigured.get("/x", requireStaff, (_req, res) => {
    res.json({ ok: true });
  });
  const unconfiguredServer = serve(unconfigured);
  const unconfiguredRes = await fetch(`http://127.0.0.1:${unconfiguredServer.port}/x`, {
    headers: { Authorization: "Bearer anything" },
  });
  assert(
    unconfiguredRes.status === 503,
    `an unconfigured gate must fail closed, got ${unconfiguredRes.status}`,
  );
  unconfiguredServer.close();
  process.env.STAFF_EMAILS = savedStaff;

  // --- Rate limits ----------------------------------------------------------

  const limited = express();
  limited.set("trust proxy", 1);
  limited.post("/api/contact", contactLimiter, (_req, res) => {
    res.json({ ok: true });
  });
  const limitedServer = serve(limited);

  let sawTooMany = false;
  let allowed = 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch(`http://127.0.0.1:${limitedServer.port}/api/contact`, {
      method: "POST",
    });
    if (res.status === 429) {
      sawTooMany = true;
      const body = (await res.json()) as { code?: string };
      assert(body.code === "rate_limited_contact", "429 carries a machine-readable code");
      break;
    }
    allowed += 1;
  }
  assert(sawTooMany, "the contact limiter must trip");
  assert(allowed === 5, `contact allows 5 per window, allowed ${allowed}`);
  limitedServer.close();

  // --- Bot checks -----------------------------------------------------------

  assert(isHoneypotTripped("http://spam.example"), "a filled honeypot is a bot");
  assert(!isHoneypotTripped(""), "an empty honeypot is a person");
  assert(!isHoneypotTripped(undefined), "an absent honeypot is a person");

  delete process.env.TURNSTILE_SECRET_KEY;
  const skipped = await verifyTurnstile(undefined);
  assert(skipped.ok, "Turnstile is skipped when unconfigured, for local dev");

  process.env.TURNSTILE_SECRET_KEY = "0x_test_secret";
  const missing = await verifyTurnstile(undefined);
  assert(!missing.ok, "a configured Turnstile rejects a missing token");
  delete process.env.TURNSTILE_SECRET_KEY;

  // --- Property allowlists (FH-175) ----------------------------------------

  const poisoned = sanitizeIdentifyProperties({
    house_type: "suburban",
    change_interval_days: 90,
    preferred_merv: "13",
    // The attack: set a replenish trigger on someone else's profile.
    next_change_date: "2026-01-01",
    $email: "victim@example.com",
  }) as Record<string, unknown> | undefined;
  assert(poisoned, "legitimate identify properties survive");
  assert(
    !("next_change_date" in poisoned!),
    "next_change_date must never come from the browser",
  );
  assert(!("$email" in poisoned!), "unknown identify properties are dropped");
  assert(
    Object.keys(poisoned!).length === 3,
    "exactly the three allowlisted identify properties remain",
  );
  assert(
    sanitizeIdentifyProperties({ next_change_date: "2026-01-01" }) === undefined,
    "a payload of only forbidden keys yields nothing",
  );
  assert(sanitizeIdentifyProperties("nope") === undefined, "non-objects are dropped");

  assert(
    sanitizeEventProperties({ SKU: "20x25x1-13", Quantity: 6 }),
    "ordinary event properties pass",
  );
  const tooManyKeys = Object.fromEntries(
    Array.from({ length: 60 }, (_, index) => [`k${index}`, index]),
  );
  assert(sanitizeEventProperties(tooManyKeys) === undefined, "key count is bounded");
  assert(
    sanitizeEventProperties({ blob: "x".repeat(20_000) }) === undefined,
    "payload size is bounded",
  );
  const cartEvent = sanitizeEventProperties(
    JSON.parse(
      '{"$value":19.99,"$email":"victim@example.com","SKU":"20x25x1-13","__proto__":{"admin":true}}',
    ),
  ) as Record<string, unknown> | undefined;
  assert(cartEvent && cartEvent.$value === 19.99, "Klaviyo $value is kept");
  assert(cartEvent && cartEvent.SKU === "20x25x1-13", "ordinary event keys survive");
  assert(cartEvent && !("$email" in cartEvent), "event $email is dropped");
  assert(cartEvent && !("admin" in cartEvent), "prototype keys cannot land on the payload");

  // --- Error shaping --------------------------------------------------------

  const leaky = publicError(new Error("Stripe key sk_live_abc is invalid"), {
    code: "checkout_failed",
    message: "Checkout could not start.",
  });
  assert(leaky.status === 400, "an unknown error keeps the fallback status");
  assert(
    !leaky.body.error.includes("sk_live"),
    "raw error text must never reach the caller",
  );
  const notConfigured = publicError(new Error("Stripe is not configured"), {
    code: "checkout_failed",
    message: "Checkout could not start.",
  });
  assert(notConfigured.status === 503, "an unconfigured service is 503");

  // --- The CRM never emails a shopper, and never writes Klaviyo ------------

  assert(CRM_SENDS_MAIL === false, "CRM is not a sender");
  assert(EMAIL_OWNER.order_confirmation === "resend", "Resend owns the receipt");
  assert(EMAIL_OWNER.welcome === "klaviyo", "Klaviyo owns marketing");
  assert(EMAIL_OWNER.replenish === "klaviyo", "Klaviyo owns replenish");
  assert(EMAIL_OWNER.clock_cadence === "none", "clock save is not a CRM or mailer event");
  for (const file of [
    "server/crm/routes.ts",
    "server/crm/deals.ts",
    "server/crm/contacts.ts",
    "server/crm/activities.ts",
    "server/crm/intake.ts",
    "server/crm/audit.ts",
    "server/crm/schema.ts",
  ]) {
    const source = fs.readFileSync(file, "utf-8");
    assert(
      !/from\s+["'].*mailer["']/.test(source),
      `${file} must not import the mailer — a third sender re-opens FH-171`,
    );
    assert(
      !/from\s+["'].*klaviyo["']/.test(source),
      `${file} must not import Klaviyo — events stay in server/klaviyo.ts`,
    );
    assert(
      !/from\s+["']resend["']/.test(source),
      `${file} must not import Resend`,
    );
    assert(
      !/\bsendEmail\b|\bsendLeadAlert\b|\bsendContactReceipt\b|\bsendOrderConfirmation\b|\bsyncContactToKlaviyo\b|\bsubscribeMarketingEmail\b/.test(
        source,
      ),
      `${file} must not send mail or Klaviyo events`,
    );
  }

  const dealDetail = fs.readFileSync("client/src/pages/admin/DealDetail.tsx", "utf-8");
  assert(/mailto:/.test(dealDetail), "staff email shoppers from their own inbox");
  assert(
    !/\/api\/(contact|klaviyo)|sendEmail|from ["']resend["']/.test(dealDetail),
    "the deal page must not call a shopper mailbox",
  );

  // --- /admin stays out of the index ---------------------------------------

  assert(resolveDocumentSeo("/admin", "https://filterhero.net").noindex, "/admin is noindex");
  assert(
    resolveDocumentSeo("/admin/deals/abc", "https://filterhero.net").noindex,
    "/admin subpages are noindex",
  );
  const robots = fs.readFileSync("client/public/robots.txt", "utf-8");
  assert(/Disallow: \/admin/.test(robots), "robots.txt disallows /admin");

  if (realUrl) process.env.SUPABASE_URL = realUrl;
  if (realKey) process.env.SUPABASE_SERVICE_ROLE_KEY = realKey;

  console.log("verify:crm ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
