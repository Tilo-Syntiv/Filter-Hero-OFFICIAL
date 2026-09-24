import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Resend } from "resend";
import Stripe from "stripe";
import { BRAND_EMAIL, BRAND_NAME } from "../shared/const.ts";
import { EMAIL_BRAND, emailFromAddress, renderBrandedEmail } from "../shared/email-brand.ts";
import { CRM_SENDS_MAIL, EMAIL_OWNER, resendSendsShopperReceipt } from "../shared/email-channels.ts";
import { stripeKeyIsLive } from "../shared/stripe-catalog.ts";
import { submitContact } from "../server/contact.ts";
import {
  buildContactReceipt,
  buildLeadAlert,
  buildOrderConfirmation,
  sendContactReceipt,
  sendLeadAlert,
  sendOrderConfirmation,
} from "../server/mailer.ts";
import { findProductVariant } from "../shared/products.ts";
import { handleStripeWebhook, listAllOrders } from "../server/stripe.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function redactKey(value: string | undefined): string {
  if (!value) return "(unset)";
  if (value.startsWith("re_")) return "re_…set";
  return "(not a Resend key)";
}

function restoreEnv(saved: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

type Json = Record<string, unknown>;

const SAFE_INBOX = "delivered@resend.dev";
const verifiedFrom = `${BRAND_NAME} <${BRAND_EMAIL}>`;

const apiKey = process.env.RESEND_API_KEY;
assert(apiKey && apiKey.startsWith("re_"), `RESEND_API_KEY missing or not a Resend key (${redactKey(apiKey)})`);

const from = process.env.RESEND_FROM || "";
const to = process.env.CONTACT_TO || "";
assert(from === verifiedFrom, `RESEND_FROM must be exactly ${verifiedFrom}, got ${from || "(unset)"}`);
assert(!from.toLowerCase().includes("onboarding@resend.dev"), `RESEND_FROM is still the sandbox address`);
assert(to.toLowerCase().includes("@filterhero.net"), `CONTACT_TO should be a Filter Hero inbox, got ${to}`);
assert(emailFromAddress() === verifiedFrom, "emailFromAddress must match Filter Hero info@");
assert(EMAIL_BRAND.navy === "#203868" && EMAIL_BRAND.burgundy === "#7F2328", "email brand colors");
assert(EMAIL_BRAND.logoPath === "/logo.png", "logo path is /logo.png");
assert(CRM_SENDS_MAIL === false, "CRM never sends mail");

assert(EMAIL_OWNER.staff_lead_alert === "resend", "staff_lead_alert is Resend");
assert(EMAIL_OWNER.lead_alert === "resend", "lead_alert is Resend");
assert(EMAIL_OWNER.quote_receipt === "resend", "quote_receipt is Resend");
assert(EMAIL_OWNER.support_receipt === "resend", "support_receipt is Resend");
assert(EMAIL_OWNER.clock_cadence === "none", "clock_cadence sends nothing");
assert(EMAIL_OWNER.order_confirmation === "resend", "order_confirmation is Resend");
assert(EMAIL_OWNER.stripe_receipt === "stripe", "stripe_receipt is Stripe");
assert(EMAIL_OWNER.welcome === "none", "welcome has no sender");
assert(EMAIL_OWNER.abandoned_checkout === "none", "abandoned_checkout has no sender");
assert(EMAIL_OWNER.post_purchase_nurture === "none", "post_purchase_nurture has no sender");
assert(EMAIL_OWNER.replenish === "none", "replenish has no sender");
assert(EMAIL_OWNER.winback === "none", "winback has no sender");
assert(resendSendsShopperReceipt("quote"), "quote gets a shopper receipt");
assert(resendSendsShopperReceipt("support"), "support gets a shopper receipt");
assert(!resendSendsShopperReceipt("reminder"), "clock does not get a shopper receipt");

const mailerSource = fs.readFileSync("server/mailer.ts", "utf-8");
assert(mailerSource.includes("email-brand"), "mailer uses the brand kit");
assert(mailerSource.includes("renderBrandedEmail"), "mailer renders branded HTML");
const brandSource = fs.readFileSync("shared/email-brand.ts", "utf-8");
assert(brandSource.includes("/logo.png"), "brand kit uses the shop lockup");
assert(!/from\s+["'].*klaviyo["']/.test(mailerSource), "mailer must not import Klaviyo");
assert(!/\bwelcome\b|\babandon|\breplenish\b|\bwin-?back\b/.test(mailerSource), "mailer is not a marketing sender");
assert(mailerSource.includes("sendLeadAlert"), "mailer sends staff alerts");
assert(mailerSource.includes("sendContactReceipt"), "mailer sends quote/support receipts");
assert(mailerSource.includes("sendOrderConfirmation"), "mailer sends order confirmations");

const contactSource = fs.readFileSync("server/contact.ts", "utf-8");
assert(contactSource.includes("sendLeadAlert"), "contact calls sendLeadAlert");
assert(contactSource.includes("sendContactReceipt"), "contact calls sendContactReceipt");
assert(contactSource.includes("shouldEnforceTurnstile"), "contact still gates Turnstile");
assert(!/from\s+["']resend["']/.test(contactSource), "contact must not import Resend");

const stripeSource = fs.readFileSync("server/stripe.ts", "utf-8");
assert(stripeSource.includes("sendOrderConfirmation"), "stripe webhook sends the confirmation");
assert(stripeSource.includes("confirmationSentAt"), "stripe persists confirmationSentAt");
assert(stripeSource.includes("if (!stored.confirmationSentAt)"), "stripe retries until the stamp lands");

const branded = renderBrandedEmail({
  title: "Probe",
  bodyHtml: "<p>ok</p>",
  ctaHref: "https://filterhero.net",
  ctaLabel: "Shop",
});
assert(branded.includes("https://filterhero.net/logo.png"), "branded HTML uses the live logo URL");
assert(branded.includes('alt="Filter Hero"'), "branded HTML uses the shop lockup alt");
assert(branded.includes("#203868"), "branded HTML uses navy");
assert(branded.includes("#7F2328"), "branded HTML uses burgundy");
assert(!branded.includes("#8EB0D8"), "branded HTML has no ice wordmark");

const xssLead = buildLeadAlert({
  id: "xss",
  name: `<script>alert(1)</script><img onerror="alert(1)" src=x>`,
  email: SAFE_INBOX,
  message: `<script>alert(1)</script><img onerror="alert(1)" src=x>`,
  intent: "quote",
});
assert(!xssLead.html.includes("<script>"), "staff alert escapes script tags");
assert(!xssLead.html.includes("<img onerror"), "staff alert escapes onerror images");
assert(xssLead.html.includes("&lt;script&gt;"), "staff alert HTML-encodes markup");

const merv8 = findProductVariant("20x25x1", 8);
assert(merv8, "20x25x1 MERV 8 exists for confirmation HTML");
const carbon = findProductVariant("20x25x1", 8, true);

const orderBase = {
  sessionId: "cs_test_verifyhtml",
  items: JSON.stringify([{ productId: merv8.id, quantity: 2 }]),
  amountSubtotal: 1999,
  amountTotal: 1999,
  shipping: null,
};

const zeroTax = buildOrderConfirmation({ ...orderBase, customerEmail: SAFE_INBOX, amountTax: 0 });
assert(zeroTax, "order with an email builds");
assert(!zeroTax.html.includes("Tax:"), "zero tax is omitted");
assert(zeroTax.html.includes("2 × 20x25x1 MERV 8"), "confirmation names the size and MERV");
assert(zeroTax.text.includes("2 × 20x25x1 MERV 8"), "plain-text confirmation names the size and MERV");
assert(zeroTax.html.includes("merv-8-packshot"), "confirmation uses the MERV 8 pack shot");
assert(!zeroTax.html.includes(`product ${merv8.id}`), "confirmation does not print raw product ids");

if (carbon) {
  const carbonMail = buildOrderConfirmation({
    ...orderBase,
    items: JSON.stringify([{ productId: carbon.id, quantity: 1 }]),
    customerEmail: SAFE_INBOX,
    amountTax: 0,
  });
  assert(carbonMail, "carbon order builds");
  assert(carbonMail.html.includes("1 × 20x25x1 Carbon"), "carbon confirmation names Carbon");
  assert(carbonMail.html.includes("merv-carbon-packshot"), "carbon confirmation uses the carbon pack shot");
}

const taxed = buildOrderConfirmation({ ...orderBase, customerEmail: SAFE_INBOX, amountTax: 160, amountTotal: 2159 });
assert(taxed, "taxed order builds");
assert(taxed.html.includes("Tax: $1.60"), "recorded tax is shown");

assert(buildOrderConfirmation({ ...orderBase, customerEmail: null, amountTax: 0 }) === null, "null email skips confirmation");
assert(buildOrderConfirmation({ ...orderBase, customerEmail: "   ", amountTax: 0 }) === null, "blank email skips confirmation");

assert(
  buildContactReceipt({
    id: "clock",
    name: "Filter Clock reminder",
    email: SAFE_INBOX,
    message: "Clock cadence saved (no email until purchase).",
    intent: "reminder",
  }) === null,
  "clock intent has no shopper receipt",
);

async function resendGet(path: string): Promise<{ status: number; body: Json }> {
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = (await res.json()) as Json;
  return { status: res.status, body };
}

const { status: domainStatus, body: domainsBody } = await resendGet("/domains");
let canReadEmails = false;
if (domainStatus === 200) {
  const domains = (domainsBody.data as Json[] | undefined) ?? [];
  const hero = domains.find((d) => d.name === "filterhero.net");
  assert(hero, "filterhero.net is not on this Resend account");
  assert(hero.status === "verified", `filterhero.net status is ${hero.status}, expected verified`);
  const sending = (hero as { capabilities?: { sending?: string } }).capabilities?.sending;
  if (sending) {
    assert(sending === "enabled", `filterhero.net sending is ${sending}`);
  }
  canReadEmails = true;
  console.log(`Domain filterhero.net: ${hero.status} / region ${hero.region ?? "n/a"}`);
} else if (domainStatus === 401 || domainStatus === 403) {
  console.log("API key is sending-only (cannot list domains). Dashboard already shows filterhero.net verified.");
} else {
  throw new Error(`/domains returned ${domainStatus}: ${JSON.stringify(domainsBody)}`);
}

console.log(`API key: ${redactKey(apiKey)}`);
console.log(`RESEND_FROM: ${from}`);
console.log(`CONTACT_TO: ${to}`);

const savedContactTo = process.env.CONTACT_TO;
process.env.CONTACT_TO = SAFE_INBOX;

const resend = new Resend(apiKey);
const stamp = Date.now();

const probe = await resend.emails.send(
  {
    from,
    to: [SAFE_INBOX],
    subject: `[${BRAND_NAME}] Resend verify`,
    html: branded,
    text: "Filter Hero Resend probe. Safe test address delivered@resend.dev.",
  },
  { idempotencyKey: `verify-resend/${stamp}` },
);
if (probe.error) throw new Error(`probe send failed: ${probe.error.message}`);
assert(probe.data?.id, "probe returned no email id");
console.log(`Probe sent to ${SAFE_INBOX} id=${probe.data.id}`);

const staff = await sendLeadAlert({
  id: `verify-staff-${stamp}`,
  name: "Verify Staff",
  email: SAFE_INBOX,
  message: "Staff lead alert template check.",
  intent: "quote",
  filterSize: "20x25x1",
});
assert(staff.sent && staff.id, "staff alert must send");
console.log(`Staff alert id=${staff.id}`);

const quote = await sendContactReceipt({
  id: `verify-quote-${stamp}`,
  name: "Verify Quote",
  email: SAFE_INBOX,
  message: "Quote receipt template check.",
  intent: "quote",
  filterSize: "20x25x1",
});
assert(quote.sent && quote.id, "quote receipt must send");
console.log(`Quote receipt id=${quote.id}`);

const support = await sendContactReceipt({
  id: `verify-support-${stamp}`,
  name: "Verify Support",
  email: SAFE_INBOX,
  message: "Support receipt template check.",
  intent: "support",
});
assert(support.sent && support.id, "support receipt must send");
console.log(`Support receipt id=${support.id}`);

const order = await sendOrderConfirmation({
  sessionId: `cs_test_verify${stamp}`,
  customerEmail: SAFE_INBOX,
  amountSubtotal: 1999,
  amountTax: 160,
  amountTotal: 2159,
  items: JSON.stringify([{ productId: merv8.id, quantity: 1 }]),
  shipping: {
    name: "Verify Shopper",
    address: { line1: "1 Verify St", city: "Miami", state: "FL", postal_code: "33101" },
  },
});
assert(order.sent && order.id, "order confirmation must send");
console.log(`Order confirmation id=${order.id}`);

const clockReceipt = await sendContactReceipt({
  id: `verify-clock-${stamp}`,
  name: "Filter Clock reminder",
  email: SAFE_INBOX,
  message: "Clock cadence saved (no email until purchase).",
  intent: "reminder",
});
assert(!clockReceipt.sent, "clock receipt must not send");
console.log("Clock shopper receipt skipped.");

if (canReadEmails && probe.data?.id) {
  const got = await resend.emails.get(probe.data.id);
  if (got.error) {
    console.log(`emails.get skipped (${got.error.message})`);
  } else {
    console.log(`emails.get ok id=${got.data?.id || probe.data.id}`);
  }
} else {
  console.log("emails.get skipped (sending-only key).");
}

const savedPipeline = {
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  NODE_ENV: process.env.NODE_ENV,
  CRM_DISABLE: process.env.CRM_DISABLE,
  ACCOUNT_DISABLE: process.env.ACCOUNT_DISABLE,
  DATA_DIR: process.env.DATA_DIR,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
};

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fh-verify-resend-"));
process.env.DATA_DIR = dataDir;
process.env.CRM_DISABLE = "1";
process.env.ACCOUNT_DISABLE = "1";
delete process.env.TURNSTILE_SECRET_KEY;
if (process.env.NODE_ENV === "production") process.env.NODE_ENV = "test";

try {
  const honey = await submitContact({
    name: "Honeypot",
    email: SAFE_INBOX,
    message: "Should be ignored.",
    intent: "quote",
    website: "https://spam.example",
  });
  assert(honey.ok && honey.id === "ignored" && honey.emailed === false, "honeypot must not email");

  const quoteLead = await submitContact({
    name: "Verify Quote Pipeline",
    email: SAFE_INBOX,
    message: "Quote pipeline check.",
    intent: "quote",
    filterSize: "20x25x1",
  });
  assert(quoteLead.ok && quoteLead.id !== "ignored", "quote submitContact must save");
  console.log(`submitContact quote id=${quoteLead.id} emailed=${quoteLead.emailed}`);

  const clockLead = await submitContact({
    name: "Filter Clock reminder",
    email: SAFE_INBOX,
    message: "Clock cadence saved (no email until purchase).",
    intent: "reminder",
    marketingConsent: false,
    cadence: { change_interval_days: 90 },
  });
  assert(clockLead.ok && clockLead.id !== "ignored", "clock submitContact must save");
  console.log(`submitContact clock id=${clockLead.id} emailed=${clockLead.emailed}`);

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  assert(webhookSecret && webhookSecret.startsWith("whsec_"), "STRIPE_WEBHOOK_SECRET required for confirmation stamp QA");

  const sessionId = `cs_test_fhresend${stamp}`;
  const session = {
    id: sessionId,
    object: "checkout.session",
    livemode: stripeKeyIsLive(),
    amount_subtotal: 1999,
    amount_total: 1999,
    currency: "usd",
    customer_email: SAFE_INBOX,
    customer_details: { email: SAFE_INBOX, phone: "+15555550199" },
    metadata: { items: JSON.stringify([{ productId: merv8.id, quantity: 1 }]) },
    total_details: { amount_tax: 0 },
    shipping_details: null,
    payment_intent: null,
    invoice: null,
    customer: null,
  };

  function signedPayload(eventId: string) {
    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      type: "checkout.session.completed",
      livemode: stripeKeyIsLive(),
      data: { object: session },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret!,
    });
    return { payload: Buffer.from(payload), header };
  }

  function readStamp() {
    const row = listAllOrders().find((order) => order.sessionId === sessionId);
    return row?.confirmationSentAt;
  }

  process.env.RESEND_API_KEY = "";
  const first = signedPayload(`evt_verify_off_${stamp}`);
  await handleStripeWebhook(first.payload, first.header);
  const afterOff = readStamp();
  assert(!afterOff, "Resend down: order saved, no confirmation stamp");
  console.log("Webhook QA: Resend off → order, no stamp.");

  process.env.RESEND_API_KEY = savedPipeline.RESEND_API_KEY;
  const second = signedPayload(`evt_verify_on_${stamp}`);
  await handleStripeWebhook(second.payload, second.header);
  const afterOn = readStamp();
  assert(afterOn, "Resend on: confirmation stamp lands");
  console.log(`Webhook QA: Resend on → stamp ${afterOn}`);

  const third = signedPayload(`evt_verify_retry_${stamp}`);
  await handleStripeWebhook(third.payload, third.header);
  const afterRetry = readStamp();
  assert(afterRetry === afterOn, "second retry must not change confirmationSentAt");
  console.log("Webhook QA: retry → stamp unchanged.");
} finally {
  restoreEnv({ ...savedPipeline, CONTACT_TO: savedContactTo });
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log("Resend checks passed.");
