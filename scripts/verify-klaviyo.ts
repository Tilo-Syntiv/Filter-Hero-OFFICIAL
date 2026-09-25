import "dotenv/config";
import fs from "node:fs";
import {
  CLOCK_NEXT_CHANGE_PROPERTY,
  CRM_SENDS_MAIL,
  EMAIL_OWNER,
  klaviyoMaySubscribe,
  klaviyoMetricForIntent,
  REPLENISH_DATE_PROPERTY,
} from "../shared/email-channels.ts";
import { findProductVariant } from "../shared/products.ts";
import {
  buildKlaviyoCatalog,
  cadenceProperties,
  CLIENT_METRICS,
  depthFromSize,
  intervalDaysForSize,
  isClientMetric,
  getKlaviyoAccount,
  isKlaviyoEnabled,
  klaviyoLineFromProduct,
  klaviyoPublicConfig,
  linesFromCheckoutItems,
  nextChangeDateIso,
  orderProfileProperties,
  parseCheckoutItems,
  shouldSubscribeFromLead,
  splitPersonName,
  toE164,
} from "../server/klaviyo.ts";
import type { StoredOrder } from "../server/stripe.ts";
import {
  KLAVIYO_STRIPE_EVENTS,
  KLAVIYO_STRIPE_OAUTH_ACCOUNT_ID,
  isKlaviyoStripeWebhookUrl,
  klaviyoStripeWebhookUrl,
} from "../shared/klaviyo-stripe.ts";
import {
  FILTER_HERO_ACCOUNT_ID,
  FILTER_HERO_SANDBOX_ACCOUNT_ID,
  shopFulfillmentWebhookAllowed,
  stripeWebhookHealth,
} from "../shared/stripe-accounts.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

process.env.KLAVIYO_DISABLE = "1";

assert(!isKlaviyoEnabled(), "KLAVIYO_DISABLE must turn Klaviyo off");
assert(isClientMetric("Viewed Product"), "Viewed Product is a client metric");
assert(isClientMetric("Added to Cart"), "Added to Cart is a client metric");
assert(!isClientMetric("Placed Order"), "Placed Order is server-only");
assert(!isClientMetric("Started Checkout"), "Started Checkout is server-only");
assert(CLIENT_METRICS.includes("Selected MERV"), "Selected MERV is tracked");

assert(EMAIL_OWNER.welcome === "klaviyo", "welcome is Klaviyo");
assert(EMAIL_OWNER.order_confirmation === "resend", "Klaviyo must not send the order confirmation");
assert(CRM_SENDS_MAIL === false, "CRM is not a sender");
assert(
  !Object.values(EMAIL_OWNER).includes("crm" as never),
  "EMAIL_OWNER must never list the CRM as a mailbox",
);
assert(klaviyoMetricForIntent("reminder") === "Signed Up Reminder", "clock metric");
assert(klaviyoMetricForIntent("quote") === "Requested Quote", "quote metric");
assert(!klaviyoMaySubscribe({ intent: "reminder", marketingConsent: true }), "channels block clock subscribe");
assert(!shouldSubscribeFromLead({ intent: "reminder" }), "clock save must not subscribe");
assert(
  !shouldSubscribeFromLead({ intent: "reminder", marketingConsent: true }),
  "clock cannot opt into marketing",
);
assert(!shouldSubscribeFromLead({ intent: "quote" }), "quote without box does not subscribe");
assert(
  shouldSubscribeFromLead({ intent: "quote", marketingConsent: true }),
  "quote + box subscribes",
);
assert(
  shouldSubscribeFromLead({ intent: "support", marketingConsent: true }),
  "support + box subscribes",
);

assert(splitPersonName("Ada Lovelace").firstName === "Ada", "split first name");
assert(splitPersonName("Ada Lovelace").lastName === "Lovelace", "split last name");
assert(!splitPersonName("Filter Clock reminder").firstName, "clock name is not a person");
assert(toE164("5551234567") === "+15551234567", "10-digit US to E.164");
assert(toE164("1-555-123-4567") === "+15551234567", "11-digit US to E.164");
assert(!toE164("not-a-phone"), "junk phone is omitted");

assert(depthFromSize("20x25x1") === 1, "depth from size");
assert(intervalDaysForSize("20x25x1") === 90, "1-inch interval is 90");
assert(intervalDaysForSize("20x25x4") === 270, "4-inch interval is 270");
assert(intervalDaysForSize("20x25x1", 45) === 45, "saved clock interval wins");
assert(nextChangeDateIso("2026-09-04T12:00:00.000Z", 90) === "2026-12-03", "paid + 90 days");

const cadence = cadenceProperties({
  next_change_date: "2026-12-01",
  change_interval_days: 90,
  house_type: "pet",
  selected_merv: "13",
  extra_ignored: true,
});
assert(cadence.preferred_merv === "13", "selected merch becomes preferred_merv");
assert(cadence.house_type === "pet", "house type stored");
assert(cadence.extra_ignored === undefined, "unknown cadence keys dropped");
assert(
  cadence[REPLENISH_DATE_PROPERTY] === undefined,
  "clock cadence must not write the sendable replenish date",
);
assert(
  cadence[CLOCK_NEXT_CHANGE_PROPERTY] === "2026-12-01",
  "clock date is stored under clock_next_change_date",
);

const klaviyoSource = fs.readFileSync("server/klaviyo.ts", "utf-8");
assert(
  !/from\s+["'].*\/mailer["']/.test(klaviyoSource),
  "Klaviyo must not import the mailer — catalog URLs live in shared/seo",
);
assert(
  !/from\s+["'].*\/crm/.test(klaviyoSource),
  "Klaviyo must not import the CRM",
);
assert(klaviyoSource.includes("profileId"), "profile import must return the Klaviyo profile id");
assert(
  fs.readFileSync("server/contact.ts", "utf-8").includes("attachKlaviyoProfileId"),
  "contact saves the Klaviyo profile id onto the CRM contact",
);
assert(
  fs.readFileSync("server/stripe.ts", "utf-8").includes("attachKlaviyoProfileId"),
  "checkout and paid orders save the Klaviyo profile id",
);
assert(
  fs.readFileSync("server/index.ts", "utf-8").includes("attachKlaviyoProfileId"),
  "identify saves the Klaviyo profile id when a CRM contact already exists",
);
assert(!/from\s+["']resend["']/.test(klaviyoSource), "Klaviyo must not import Resend");
assert(
  !klaviyoSource.includes("constant-contact"),
  "Klaviyo must not import Constant Contact",
);
const stripeSource = fs.readFileSync("server/stripe.ts", "utf-8");
assert(
  !stripeSource.includes("constant-contact"),
  "Checkout must not also enroll Constant Contact",
);
const contactSource = fs.readFileSync("server/contact.ts", "utf-8");
assert(
  !contactSource.includes("constant-contact"),
  "Contact must not also enroll Constant Contact",
);
const mailerSource = fs.readFileSync("server/mailer.ts", "utf-8");
assert(!mailerSource.includes("klaviyo"), "Resend must not import Klaviyo");
assert(!mailerSource.includes("constant-contact"), "Resend must not import Constant Contact");
assert(
  !/\bsendEmail\b|\bsendLeadAlert\b|\bsendContactReceipt\b|\bsendOrderConfirmation\b/.test(
    klaviyoSource,
  ),
  "Klaviyo tracks events; it does not send mail",
);

const variant = findProductVariant("20x25x1", 8);
assert(variant, "20x25x1 MERV 8");
const line = klaviyoLineFromProduct(variant, 6, "https://filterhero.net");
assert(line.ProductID === String(variant.id), "line product id");
assert(line.Quantity === 6, "line qty");
assert(line.ProductURL.includes("/sizes/20x25x1"), "line PDP url");
assert(line.ImageURL.includes("/products/"), "line image url");
assert(line.Brand === "Filter Hero", "line brand");

const items = [{ productId: variant.id, quantity: 6 }];
const lines = linesFromCheckoutItems(items, "https://filterhero.net");
assert(lines.length === 1, "one checkout line");
assert(parseCheckoutItems(JSON.stringify(items)).length === 1, "parse items json");
assert(parseCheckoutItems("not-json").length === 0, "bad items json is empty");

const order: StoredOrder = {
  id: "ord_verify",
  sessionId: "cs_test_verify",
  amountSubtotal: 1999,
  amountTax: 160,
  amountTotal: 2159,
  currency: "usd",
  customerId: "cus_verify",
  invoiceId: null,
  paymentIntentId: null,
  customerEmail: "buyer@example.com",
  shipping: null,
  phone: "+15555550199",
  items: JSON.stringify(items),
  taxStatus: "recorded",
  paidAt: "2026-09-04T16:00:00.000Z",
};
const props = orderProfileProperties(order);
assert(props.last_order_sizes, "order sizes stored");
assert(props[REPLENISH_DATE_PROPERTY] === "2026-12-03", "purchase sets sendable next_change_date");
assert(props.change_interval_days === 90, "purchase interval from depth");

const autoOrder = {
  ...order,
  id: "ord_auto",
  sessionId: "cs_test_auto",
  autoDelivery: true,
  deliveryDays: 90 as const,
  items: JSON.stringify([{ productId: items[0]?.productId, quantity: 1, delivery: 90 }]),
};
const autoProps = orderProfileProperties(autoOrder);
assert(
  !(REPLENISH_DATE_PROPERTY in autoProps),
  "auto-delivery must not set sendable next_change_date",
);
assert(autoProps.auto_delivery === true, "auto-delivery flag on profile");

const catalog = buildKlaviyoCatalog("https://filterhero.net");
assert(catalog.items.length > 0, "catalog has SKUs");
assert(catalog.items.length <= 400, `catalog is the wholesale sheet, not full archive (${catalog.items.length})`);
assert(
  catalog.items.every((row) => row.link.startsWith("https://filterhero.net/sizes/")),
  "catalog links are PDPs",
);
assert(
  catalog.items.some((row) => row.id === String(variant.id)),
  "20x25x1 MERV 8 is in the catalog",
);

const config = klaviyoPublicConfig();
assert(typeof config.enabled === "boolean", "public config shape");
assert(typeof config.publicKey === "string", "public key is a string");

assert(
  klaviyoStripeWebhookUrl("VnVNmQ") ===
    "https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ",
  "native Stripe webhook URL uses the Klaviyo company id",
);
assert(isKlaviyoStripeWebhookUrl(klaviyoStripeWebhookUrl("VnVNmQ")), "native URL is recognized");
assert(!isKlaviyoStripeWebhookUrl("https://filterhero.net/api/stripe/webhook"), "shop webhook is not native");
assert(KLAVIYO_STRIPE_EVENTS.includes("charge.succeeded"), "charges sync");
assert(KLAVIYO_STRIPE_EVENTS.includes("invoice.payment_succeeded"), "invoices sync");
assert(
  KLAVIYO_STRIPE_OAUTH_ACCOUNT_ID === FILTER_HERO_ACCOUNT_ID,
  "Klaviyo OAuth targets FILTER HERO, not sandbox",
);
assert(
  !shopFulfillmentWebhookAllowed({
    accountId: FILTER_HERO_SANDBOX_ACCOUNT_ID,
    livemode: false,
  }),
  "sandbox must not post checkout events to filterhero.net",
);
assert(
  !shopFulfillmentWebhookAllowed({ accountId: FILTER_HERO_ACCOUNT_ID, livemode: false }),
  "FILTER HERO test mode must not post checkout events to filterhero.net",
);
assert(
  shopFulfillmentWebhookAllowed({ accountId: FILTER_HERO_ACCOUNT_ID, livemode: true }),
  "FILTER HERO live owns the shop fulfillment webhook",
);
assert(
  stripeWebhookHealth({
    accountId: FILTER_HERO_SANDBOX_ACCOUNT_ID,
    livemode: false,
    hooks: [{ url: "https://filterhero.net/api/stripe/webhook", status: "enabled" }],
  }).shop.conflict,
  "sandbox shop webhook is a conflict",
);

async function livePing() {
  delete process.env.KLAVIYO_DISABLE;
  if (!isKlaviyoEnabled()) {
    console.log("Klaviyo payload checks passed. No private key — skipped live account ping.");
    return;
  }
  let account = await getKlaviyoAccount();
  if (!account.ok && /throttled/i.test(account.error || "")) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    account = await getKlaviyoAccount();
  }
  assert(account.ok, `live Klaviyo account failed: ${account.error || "unknown"}`);
  console.log(`Klaviyo payload checks passed. Live account ${account.accountId} ok.`);
}

livePing().catch((err) => {
  console.error(err);
  process.exit(1);
});
