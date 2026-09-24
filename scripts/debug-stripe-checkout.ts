import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Stripe from "stripe";
import { firstSellableProduct } from "../shared/products.ts";
import { FILTER_HERO_ACCOUNT_ID } from "../shared/stripe-accounts.ts";
import {
  SHIPPING_TAX_CODE,
  TANGIBLE_GOODS_TAX_CODE,
  ensureStripeTaxDefaults,
  readStripeTaxReadiness,
} from "../shared/stripe-tax.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fh-orders-"));
  process.env.DATA_DIR = tmp;
  if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.includes("...")) {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_debug_filter_hero_test";
  }

  const {
    compactItemsMeta,
    createCheckoutSession,
    findCustomerIdByEmail,
    getCheckoutSessionStatus,
    getStripe,
    handleStripeWebhook,
    isCheckoutSessionId,
    orderFromCheckoutSession,
  } = await import("../server/stripe.ts");

  const failures: string[] = [];
  function check(cond: unknown, message: string) {
    if (!cond) {
      failures.push(message);
      console.error(`FAIL: ${message}`);
    } else {
      console.log(`ok  ${message}`);
    }
  }

  check(compactItemsMeta([{ productId: 1, quantity: 1 }]).includes("productId"), "compact meta encodes items");
  check(
    compactItemsMeta(Array.from({ length: 40 }, (_, i) => ({ productId: i + 1, quantity: 1 }))).length <=
      490,
    "large cart metadata stays under Stripe 500-char cap",
  );
  check(isCheckoutSessionId("cs_test_abc123"), "accepts cs_test_ ids");
  check(isCheckoutSessionId("cs_live_abc123"), "accepts cs_live_ ids");
  check(!isCheckoutSessionId("cs_abc"), "rejects short ids");
  check(!isCheckoutSessionId("pi_test_abc"), "rejects payment intents");
  check(!isCheckoutSessionId("cs_test_abc-def"), "rejects hyphens");

  const mapped = orderFromCheckoutSession({
    id: "cs_test_map",
    amount_subtotal: 1000,
    amount_total: 1080,
    currency: "usd",
    customer: "cus_map",
    invoice: "in_map",
    payment_intent: "pi_map",
    customer_details: { email: "a@b.c", phone: "+15555550100" },
    metadata: { items: "[]" },
    total_details: { amount_tax: 80, amount_discount: 0, amount_shipping: 0 },
  } as unknown as Stripe.Checkout.Session);
  check(mapped.amountTax === 80, "maps tax cents");
  check(mapped.customerId === "cus_map", "maps customer id");
  check(mapped.invoiceId === "in_map", "maps invoice id");

  const stripe = getStripe();
  assert(stripe, "STRIPE_SECRET_KEY must be set to debug Checkout");
  await ensureStripeTaxDefaults(stripe);
  const tax = await readStripeTaxReadiness(stripe);
  const account = await stripe.accounts.retrieve();
  if (account.id === FILTER_HERO_ACCOUNT_ID) {
    check(
      tax.settingsStatus === "active" && tax.headOfficeReady,
      `Tax Settings ${tax.settingsStatus ?? "unknown"} (head office required)`,
    );
    check(
      tax.collecting,
      "at least one active Tax registration (otherwise Checkout charges $0 tax)",
    );
  } else {
    check(
      true,
      `Sandbox ${account.id} Tax Settings ${tax.settingsStatus ?? "pending"} is expected locally`,
    );
  }

  const payloadObj = {
    id: "evt_debug_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_debugwebhook1",
        object: "checkout.session",
        amount_subtotal: 2500,
        amount_total: 2500,
        currency: "usd",
        customer: "cus_debug",
        invoice: "in_debug",
        payment_intent: "pi_debug",
        customer_email: "debug@filterhero.net",
        customer_details: { email: "debug@filterhero.net", phone: "+15555550199" },
        shipping_details: {
          name: "Debug Buyer",
          address: {
            line1: "1 Main St",
            city: "Miami",
            state: "FL",
            postal_code: "33101",
            country: "US",
          },
        },
        metadata: { items: '[{"productId":1,"quantity":1}]' },
        total_details: { amount_tax: 0, amount_discount: 0, amount_shipping: 0 },
        payment_status: "paid",
      },
    },
  };
  const payload = JSON.stringify(payloadObj);
  const secret = process.env.STRIPE_WEBHOOK_SECRET as string;
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

  const prevResend = process.env.RESEND_API_KEY;
  const prevCrm = process.env.CRM_DISABLE;
  const prevAccount = process.env.ACCOUNT_DISABLE;
  delete process.env.RESEND_API_KEY;
  process.env.CRM_DISABLE = "1";
  process.env.ACCOUNT_DISABLE = "1";
  try {
    await handleStripeWebhook(Buffer.from(payload), header);
    await handleStripeWebhook(Buffer.from(payload), header);
  } finally {
    if (prevResend) process.env.RESEND_API_KEY = prevResend;
    else delete process.env.RESEND_API_KEY;
    if (prevCrm === undefined) delete process.env.CRM_DISABLE;
    else process.env.CRM_DISABLE = prevCrm;
    if (prevAccount === undefined) delete process.env.ACCOUNT_DISABLE;
    else process.env.ACCOUNT_DISABLE = prevAccount;
  }
  const orders = JSON.parse(fs.readFileSync(path.join(tmp, "orders.json"), "utf-8")) as Array<{
    sessionId: string;
    customerId: string;
  }>;
  check(orders.length === 1, `webhook writes one order on retry (got ${orders.length})`);
  check(orders[0]?.sessionId === "cs_test_debugwebhook1", "webhook stores session id");
  check(orders[0]?.customerId === "cus_debug", "webhook stores customer id");

  try {
    await handleStripeWebhook(Buffer.from(payload), undefined);
    check(false, "webhook rejects missing signature");
  } catch (err) {
    check(
      err instanceof Error && /signature/i.test(err.message),
      "webhook rejects missing signature",
    );
  }

  try {
    await handleStripeWebhook(Buffer.from(payload), "t=1,v1=deadbeef");
    check(false, "webhook rejects bad signature");
  } catch {
    check(true, "webhook rejects bad signature");
  }

  try {
    await getCheckoutSessionStatus("not-a-session");
    check(false, "session status rejects junk ids");
  } catch (err) {
    check(
      err instanceof Error && err.message.includes("Invalid"),
      "session status rejects junk ids",
    );
  }

  const product = firstSellableProduct("20x25x1");
  assert(product, "sellable 20x25x1 exists");
  check(product.inStock, "20x25x1 is in stock");

  console.log(`Creating Checkout Session for ${product.size} MERV ${product.merv} id=${product.id}…`);
  let started: Awaited<ReturnType<typeof createCheckoutSession>>;
  try {
    started = await createCheckoutSession(
      [{ productId: product.id, quantity: 1 }],
      process.env.CLIENT_URL || "http://localhost:3000",
    );
  } catch (err) {
    console.error("Checkout Session create failed:", err);
    throw err;
  }

  const session = await stripe.checkout.sessions.retrieve(started.sessionId);
  check(Boolean(session.id) && isCheckoutSessionId(session.id), `session id ${session.id}`);
  check(Boolean(started.url) && Boolean(session.url), "session has hosted url");
  check(session.mode === "payment", "mode=payment");
  check(
    session.automatic_tax?.enabled === tax.automaticTax,
    `automatic_tax.enabled=${String(session.automatic_tax?.enabled)} matches Tax Settings`,
  );
  check(
    session.customer_creation === "always" || Boolean(session.customer),
    `customer_creation=${session.customer_creation} customer=${typeof session.customer === "string" ? session.customer : "none"}`,
  );
  check(session.invoice_creation?.enabled === true, "invoice_creation enabled");
  check(
    session.shipping_address_collection?.allowed_countries?.includes("US") === true,
    "US shipping collected",
  );
  check(
    session.shipping_options?.some(
      (opt) => opt.shipping_amount === 0 && opt.shipping_rate,
    ) === true,
    "checkout includes a shipping option",
  );
  const shippingRateId =
    typeof session.shipping_options?.[0]?.shipping_rate === "string"
      ? session.shipping_options[0].shipping_rate
      : session.shipping_options?.[0]?.shipping_rate?.id;
  if (shippingRateId) {
    const rate = await stripe.shippingRates.retrieve(shippingRateId);
    check(rate.tax_behavior === "exclusive", `shipping tax_behavior=${rate.tax_behavior}`);
    check(rate.tax_code === SHIPPING_TAX_CODE, `shipping tax_code=${rate.tax_code}`);
    check(!/free/i.test(rate.display_name ?? ""), `shipping display_name=${rate.display_name}`);
  } else {
    check(false, "shipping rate id missing");
  }
  check(session.phone_number_collection?.enabled === true, "phone collected");
  check(session.metadata?.items?.includes(String(product.id)) === true, "items metadata on session");
  const branded = session as Stripe.Checkout.Session & {
    branding_settings?: {
      display_name?: string | null;
      font_family?: string | null;
      background_color?: string | null;
      button_color?: string | null;
      logo?: { type?: string; url?: string | null } | null;
    };
  };
  const brand = branded.branding_settings;
  check(brand?.display_name === "Filter Hero", `branding display_name=${brand?.display_name}`);
  check(brand?.font_family === "nunito", `branding font_family=${brand?.font_family}`);
  check(
    brand?.background_color?.toLowerCase() === "#f6f7f9",
    `branding background_color=${brand?.background_color}`,
  );
  check(
    brand?.button_color?.toLowerCase() === "#7f2328",
    `branding button_color=${brand?.button_color}`,
  );
  check(
    Boolean(brand?.logo?.url?.includes("/hero/lockup-mascot.png")),
    `branding logo=${brand?.logo?.url}`,
  );

  const expanded = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product"],
  });
  const line = expanded.line_items?.data[0];
  const price = line?.price;
  const taxBehavior = price?.tax_behavior;
  check(taxBehavior === "exclusive" || taxBehavior == null, `tax_behavior=${taxBehavior}`);

  const productObj = price?.product;
  let taxCodeId: string | null = null;
  if (productObj && typeof productObj !== "string" && !productObj.deleted) {
    const code = productObj.tax_code;
    taxCodeId = typeof code === "string" ? code : null;
  }
  check(
    taxCodeId === TANGIBLE_GOODS_TAX_CODE || taxCodeId == null,
    `line tax_code=${taxCodeId}`,
  );

  const unpaid = await getCheckoutSessionStatus(session.id);
  check(unpaid.paid === false, `unpaid session paid=${unpaid.paid}`);
  check(unpaid.amountTotal != null && unpaid.amountTotal > 0, `amountTotal=${unpaid.amountTotal}`);

  await stripe.checkout.sessions.expire(session.id);
  const expired = await stripe.checkout.sessions.retrieve(session.id);
  check(expired.status === "expired", "probe session expired");

  const reuseEmail = "stripe-reuse@filterhero.net";
  const reuseCustomer = await stripe.customers.create({
    email: reuseEmail,
    metadata: { probe: "filter-hero-debug" },
  });
  const foundId = await findCustomerIdByEmail(stripe, reuseEmail);
  check(foundId === reuseCustomer.id, "findCustomerIdByEmail returns existing customer");
  const reuseStarted = await createCheckoutSession(
    [{ productId: product.id, quantity: 1 }],
    process.env.CLIENT_URL || "http://localhost:3000",
    { email: reuseEmail },
  );
  const reuseSession = await stripe.checkout.sessions.retrieve(reuseStarted.sessionId);
  const reuseCustomerId =
    typeof reuseSession.customer === "string"
      ? reuseSession.customer
      : reuseSession.customer?.id;
  check(reuseCustomerId === reuseCustomer.id, "checkout reuses Stripe customer by email");
  await stripe.checkout.sessions.expire(reuseSession.id);

  try {
    const intent = await stripe.paymentIntents.create({
      amount: 100,
      currency: "usd",
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { probe: "filter-hero-debug" },
    });
    check(intent.status === "succeeded", `test charge status=${intent.status}`);
    if (typeof intent.latest_charge === "string") {
      await stripe.refunds.create({ charge: intent.latest_charge });
    }
  } catch (err) {
    check(false, `test charge failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const { readStripeWebhookHealth } = await import("../server/stripe-webhooks.ts");
  const listed = await readStripeWebhookHealth(stripe);
  check(!listed.health.shop.conflict, "test/sandbox key does not post checkout events to filterhero.net");
  check(!listed.health.klaviyo.present, "this Stripe key does not host a Klaviyo webhook");
  if (listed.livemode) {
    check(
      listed.health.shop.present,
      "live FILTER HERO has a Dashboard webhook to /api/stripe/webhook",
    );
  } else {
    check(true, "test key uses stripe listen for Checkout fulfillment");
  }

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed`);
    process.exitCode = 1;
    return;
  }
  console.log("\nAll Stripe checkout debug checks passed.");
  console.log(`Temp orders dir ${tmp} (safe to delete).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
