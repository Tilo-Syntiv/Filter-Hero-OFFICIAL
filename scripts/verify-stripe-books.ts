import "dotenv/config";
import Stripe from "stripe";
import {
  SHIPPING_TAX_CODE,
  TANGIBLE_GOODS_TAX_CODE,
  ensureStripeTaxDefaults,
  productTaxCode,
  readStripeTaxReadiness,
  shouldEnableAutomaticTax,
  taxRegistrationsCollecting,
} from "../shared/stripe-tax.ts";
import { compactItemsMeta, orderFromCheckoutSession } from "../server/stripe.ts";
import { FILTER_HERO_ACCOUNT_ID } from "../shared/stripe-accounts.ts";
import { readStripeWebhookHealth } from "../server/stripe-webhooks.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

assert(productTaxCode() === TANGIBLE_GOODS_TAX_CODE, "default tax code must be tangible goods");
assert(TANGIBLE_GOODS_TAX_CODE === "txcd_99999999", "canonical Stripe General - Tangible Goods");
assert(SHIPPING_TAX_CODE === "txcd_92010001", "canonical Stripe Shipping tax code");
assert(shouldEnableAutomaticTax("active") === true, "active Tax Settings enable automatic_tax");
assert(shouldEnableAutomaticTax("pending") === false, "pending Tax Settings leave automatic_tax off");
assert(shouldEnableAutomaticTax(null) === false, "missing Tax Settings leave automatic_tax off");
assert(taxRegistrationsCollecting([{ status: "active" }]) === true, "active registration collects");
assert(
  taxRegistrationsCollecting([{ status: "expired" }, { status: "scheduled" }]) === false,
  "expired or scheduled registrations do not collect",
);

const compact = compactItemsMeta(
  Array.from({ length: 40 }, (_, i) => ({ productId: i + 1, quantity: 1 })),
);
assert(compact.length <= 490, `items metadata must fit Stripe's 500-char cap, got ${compact.length}`);

const session = {
  id: "cs_test_verify",
  amount_subtotal: 1999,
  amount_total: 2159,
  currency: "usd",
  customer: "cus_test",
  invoice: "in_test",
  payment_intent: "pi_test",
  customer_email: "buyer@example.com",
  customer_details: { email: "buyer@example.com", phone: "+15555550100" },
  shipping_details: null,
  metadata: { items: '[{"productId":1,"quantity":6}]' },
  total_details: { amount_tax: 160, amount_discount: 0, amount_shipping: 0 },
} as unknown as Stripe.Checkout.Session;

const order = orderFromCheckoutSession(session);
assert(order.sessionId === "cs_test_verify", "session id");
assert(order.amountTax === 160, "tax cents");
assert(order.customerId === "cus_test", "customer for QBO match");
assert(order.invoiceId === "in_test", "invoice for connector");
assert(order.paymentIntentId === "pi_test", "payment intent");

console.log("Stripe books mapping checks passed.");

async function checkLiveTax() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("...")) {
    console.log("Skip live Tax Settings: STRIPE_SECRET_KEY unset.");
    return;
  }

  const stripe = new Stripe(key);
  await ensureStripeTaxDefaults(stripe);
  const tax = await readStripeTaxReadiness(stripe);
  const listed = await readStripeWebhookHealth(stripe);
  console.log(
    `Tax Settings ${tax.settingsStatus ?? "unknown"} · automatic_tax ${tax.automaticTax ? "on" : "off"} · collecting ${tax.collecting ? "yes" : "no"}`,
  );
  if (tax.registrations.length) {
    console.log(
      `Registrations: ${tax.registrations
        .map((row) => `${row.country}${row.state ? `-${row.state}` : ""} (${row.status})`)
        .join(", ")}`,
    );
  }
  if (listed.accountId === FILTER_HERO_ACCOUNT_ID) {
    assert(tax.headOfficeReady && tax.settingsStatus === "active", "set a head office in Tax Settings");
    assert(tax.automaticTax, "Checkout must enable automatic_tax when Tax Settings are active");
    assert(
      tax.collecting,
      "add at least one active Tax registration or Checkout charges $0 tax",
    );
  } else {
    console.log(
      `Sandbox ${listed.accountId} Tax Settings stay pending until a head office is set — that is expected locally.`,
    );
  }
  assert(!listed.health.shop.conflict, "sandbox/test must not post checkout events to filterhero.net");
  assert(!listed.health.klaviyo.conflict, "sandbox must not host the Klaviyo native webhook");
  if (listed.health.shop.present) {
    console.log("Fulfillment webhook: https://filterhero.net/api/stripe/webhook (enabled)");
  } else if (listed.livemode && listed.accountId === FILTER_HERO_ACCOUNT_ID) {
    console.log("No enabled Dashboard webhook to /api/stripe/webhook.");
    console.log("Paid Checkout will not write orders or sync Klaviyo / CRM / accounts.");
    console.log("Run: pnpm setup:stripe-webhook");
  } else {
    console.log("No production fulfillment webhook on this test key (use stripe listen).");
  }
  if (listed.health.klaviyo.present) {
    console.log("Klaviyo Stripe webhook: https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ");
  } else if (listed.accountId === FILTER_HERO_ACCOUNT_ID) {
    console.log("No enabled Klaviyo charge/invoice webhook. Run: pnpm setup:klaviyo-stripe");
  } else {
    console.log(`Klaviyo native webhook stays on FILTER HERO ${FILTER_HERO_ACCOUNT_ID}.`);
  }
  console.log("See docs/STRIPE-BOOKS.md and docs/KLAVIYO.md");
}

void checkLiveTax();
