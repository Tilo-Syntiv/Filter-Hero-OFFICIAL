import fs from "node:fs";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import {
  AUTO_DELIVERY_INTERVALS,
  deliveryLabel,
  isAutoDeliveryInterval,
  parseDeliveryMode,
  type DeliveryMode,
} from "../shared/delivery";
import {
  catalogStripeProductId,
  getProductById,
  shopperUnitPrice,
} from "../shared/products";
import {
  mappedStripeProductId,
  stripeKeyIsLive,
} from "../shared/stripe-catalog";
import {
  productTaxCode,
  readStripeTaxReadiness,
  SHIPPING_TAX_CODE,
} from "../shared/stripe-tax";
import { recordPurchaseOnAccount } from "./account";
import { attachKlaviyoProfileId } from "./crm/contacts";
import { closeDealsOnPurchase } from "./crm/intake";
import { dataFile } from "./data-store";
import { sendOrderConfirmation } from "./mailer";
import { parseCheckoutItems, syncCheckoutExpired, syncPlacedOrder, syncStartedCheckout } from "./klaviyo";
import { storeIdentityBundle } from "./non-customers";
import { stripeCheckoutBrandingSettings } from "../shared/stripe-checkout-brand";

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
const META_MAX = 490;
const stripeProductCache = new Map<number, string | null>();

const GROUP_ORDER: DeliveryMode[] = ["once", ...AUTO_DELIVERY_INTERVALS];

function ordersPath() {
  return dataFile("orders.json");
}

function ensureOrdersFile() {
  const file = ordersPath();
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf-8");
}

function writeOrders(orders: StoredOrder[]) {
  fs.writeFileSync(ordersPath(), JSON.stringify(orders, null, 2), "utf-8");
}

export function isCheckoutSessionId(sessionId: string): boolean {
  return SESSION_ID.test(sessionId);
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("...")) return null;
  return new Stripe(key);
}

export type CheckoutItem = {
  productId: number;
  quantity: number;
  /** once | 30 | 60 | 90 — default once */
  delivery?: DeliveryMode;
};

export type StoredOrder = {
  id: string;
  sessionId: string;
  amountSubtotal: number | null;
  amountTax: number | null;
  amountTotal: number | null;
  currency: string | null;
  customerId: string | null;
  invoiceId: string | null;
  paymentIntentId: string | null;
  customerEmail: string | null;
  shipping: Stripe.Checkout.Session.ShippingDetails | null;
  phone: string | null;
  items: string;
  taxStatus: string | null;
  paidAt: string;
  confirmationSentAt?: string | null;
  /** True when this charge is automatic delivery (first or renewal). */
  autoDelivery?: boolean;
  deliveryDays?: number | null;
  subscriptionId?: string | null;
};

export function listAllOrders(): StoredOrder[] {
  ensureOrdersFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(ordersPath(), "utf-8")) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

export function listOrdersForEmail(email: string): StoredOrder[] {
  const needle = email.trim().toLowerCase();
  if (!needle) return [];
  return listAllOrders().filter(
    (order) => (order.customerEmail || "").toLowerCase() === needle,
  );
}

export function compactItemsMeta(items: CheckoutItem[]): string {
  const normalized = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    delivery: parseDeliveryMode(item.delivery),
  }));
  const raw = JSON.stringify(normalized);
  if (raw.length <= META_MAX) return raw;
  return JSON.stringify(normalized.slice(0, 8));
}

export function orderFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Omit<StoredOrder, "id"> {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const invoiceId =
    typeof session.invoice === "string"
      ? session.invoice
      : session.invoice?.id ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const delivery = parseDeliveryMode(session.metadata?.delivery);
  const autoDelivery = session.metadata?.autoDelivery === "1" || delivery !== "once";
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  return {
    sessionId: session.id,
    amountSubtotal: session.amount_subtotal ?? null,
    amountTax: session.total_details?.amount_tax ?? null,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    customerId,
    invoiceId,
    paymentIntentId,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    shipping: session.shipping_details ?? null,
    phone: session.customer_details?.phone ?? null,
    items: session.metadata?.items ?? "[]",
    taxStatus: session.total_details?.amount_tax != null ? "recorded" : null,
    paidAt: new Date().toISOString(),
    autoDelivery,
    deliveryDays: isAutoDeliveryInterval(delivery) ? delivery : null,
    subscriptionId,
  };
}

function lineLabel(
  product: NonNullable<ReturnType<typeof getProductById>>,
  delivery: DeliveryMode,
): string {
  const base = product.isCarbon
    ? `${product.name} (Carbon) — ${product.size}`
    : `${product.name} — ${product.size} MERV ${product.merv}`;
  if (delivery === "once") return base;
  return `${base} · ${deliveryLabel(delivery)}`;
}

export async function findCustomerIdByEmail(
  stripe: Stripe,
  email: string,
): Promise<string | null> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  return existing.data[0]?.id ?? null;
}

async function existingCatalogProductId(
  stripe: Stripe,
  productId: number,
): Promise<string | null> {
  if (stripeProductCache.has(productId)) return stripeProductCache.get(productId)!;
  const candidates = [
    catalogStripeProductId(productId),
    mappedStripeProductId(productId, stripeKeyIsLive()),
  ].filter((id, index, all): id is string => Boolean(id) && all.indexOf(id) === index);
  for (const id of candidates) {
    try {
      const product = await stripe.products.retrieve(id);
      if (product && product.active !== false) {
        stripeProductCache.set(productId, product.id);
        return product.id;
      }
    } catch {
      // catalog SKU not in this Stripe account yet
    }
  }
  stripeProductCache.set(productId, null);
  return null;
}

export function normalizeCheckoutItems(items: CheckoutItem[]): CheckoutItem[] {
  const byKey = new Map<string, CheckoutItem>();
  for (const item of items) {
    const delivery = parseDeliveryMode(item.delivery);
    if (item.quantity < 1 || item.quantity > 50) {
      throw new Error(`Invalid quantity for product ${item.productId}`);
    }
    const product = getProductById(item.productId);
    if (!product) throw new Error(`Unknown product: ${item.productId}`);
    if (!product.inStock) throw new Error(`Out of stock: ${product.size}`);
    // Parent may be the sheet's exact cut while stock collapsed to undersize (or vice versa).
    // Live allowlist is the size×MERV stock key via product.inStock.
    const key = `${item.productId}:${delivery}`;
    const prev = byKey.get(key);
    byKey.set(key, {
      productId: item.productId,
      delivery,
      quantity: Math.min(50, (prev?.quantity ?? 0) + item.quantity),
    });
  }
  return Array.from(byKey.values());
}

export function splitCheckoutGroups(items: CheckoutItem[]): {
  current: CheckoutItem[];
  remaining: CheckoutItem[];
  delivery: DeliveryMode;
} {
  const normalized = normalizeCheckoutItems(items);
  for (const delivery of GROUP_ORDER) {
    const current = normalized.filter(
      (item) => parseDeliveryMode(item.delivery) === delivery,
    );
    if (current.length === 0) continue;
    const remaining = normalized.filter(
      (item) => parseDeliveryMode(item.delivery) !== delivery,
    );
    return { current, remaining, delivery };
  }
  throw new Error("Cart is empty");
}

function shippingOptions(): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: 0, currency: "usd" },
        display_name: "Shipping",
        tax_behavior: "exclusive",
        tax_code: SHIPPING_TAX_CODE,
      },
    },
  ];
}

async function buildLineItems(
  stripe: Stripe,
  items: CheckoutItem[],
  delivery: DeliveryMode,
): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  const taxCode = productTaxCode();
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) throw new Error(`Unknown product: ${item.productId}`);
    const unit = shopperUnitPrice(product.price, item.quantity, product, delivery);
    const catalogProductId = await existingCatalogProductId(stripe, product.id);
    const recurring =
      delivery === "once"
        ? undefined
        : ({
            interval: "day" as const,
            interval_count: delivery,
          } satisfies Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring);

    line_items.push({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(unit * 100),
        tax_behavior: "exclusive",
        ...(recurring ? { recurring } : {}),
        ...(catalogProductId
          ? { product: catalogProductId }
          : {
              product_data: {
                name: lineLabel(product, delivery),
                description:
                  delivery === "once"
                    ? "HVAC pleated filter"
                    : `HVAC pleated filter · automatic delivery every ${delivery} days`,
                tax_code: taxCode,
                metadata: {
                  productId: String(product.id),
                  size: product.size,
                  merv: String(product.merv),
                  delivery: String(delivery),
                },
              },
            }),
      },
    });
  }

  if (line_items.length === 0) throw new Error("Cart is empty");
  return line_items;
}

export type CheckoutStartResult = {
  url: string;
  sessionId: string;
  remainingItems: CheckoutItem[];
  groupLabel: string;
  groupCount: number;
  groupsRemaining: number;
};

/**
 * Starts Checkout for the first delivery group in the cart (once → 30 → 60 → 90).
 * Remaining groups are returned so the client can chain sessions after success.
 */
export async function createCheckoutSession(
  items: CheckoutItem[],
  clientUrl: string,
  shopper?: { email?: string; marketingConsent?: boolean },
): Promise<CheckoutStartResult> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env");
  }

  const { current, remaining, delivery } = splitCheckoutGroups(items);
  const line_items = await buildLineItems(stripe, current, delivery);
  const itemsMeta = compactItemsMeta(current);
  const email = shopper?.email?.trim().toLowerCase();
  const customerId = email ? await findCustomerIdByEmail(stripe, email) : null;
  const tax = await readStripeTaxReadiness(stripe);
  if (tax.automaticTax && !tax.collecting) {
    console.warn(
      "[checkout] Stripe Tax is on, but there is no active registration. Checkout will charge $0 tax until one is added.",
    );
  }

  const autoDelivery = delivery !== "once";
  const mode = autoDelivery ? "subscription" : "payment";
  const groupLabel = deliveryLabel(delivery);
  const remainingGroupCount = GROUP_ORDER.filter((d) =>
    remaining.some((item) => parseDeliveryMode(item.delivery) === d),
  ).length;

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items,
    success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/checkout/cancel`,
    branding_settings: stripeCheckoutBrandingSettings(),
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: shippingOptions(),
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: tax.automaticTax },
    ...(customerId
      ? {
          customer: customerId,
          customer_update: {
            name: "auto",
            address: "auto",
            shipping: "auto",
          },
        }
      : {
          ...(mode === "payment" ? { customer_creation: "always" as const } : {}),
          ...(email ? { customer_email: email } : {}),
        }),
    metadata: {
      items: itemsMeta,
      delivery: String(delivery),
      ...(autoDelivery ? { autoDelivery: "1" } : {}),
      ...(email ? { email } : {}),
      ...(shopper?.marketingConsent ? { marketingConsent: "1" } : {}),
    },
    ...(mode === "payment"
      ? {
          invoice_creation: { enabled: true },
          payment_intent_data: {
            metadata: {
              items: itemsMeta,
              delivery: String(delivery),
            },
          },
        }
      : {
          subscription_data: {
            metadata: {
              items: itemsMeta,
              delivery: String(delivery),
              autoDelivery: "1",
            },
          },
        }),
  } as unknown as Stripe.Checkout.SessionCreateParams);

  if (!session.url) throw new Error("No checkout URL returned");

  if (email) {
    try {
      const synced = await syncStartedCheckout({
        email,
        sessionId: session.id,
        checkoutUrl: session.url,
        items: current,
        marketingConsent: shopper?.marketingConsent,
      });
      if (synced.profileId) await attachKlaviyoProfileId(email, synced.profileId);
    } catch (err) {
      console.error("[checkout] klaviyo Started Checkout failed", err);
    }
  }

  return {
    url: session.url,
    sessionId: session.id,
    remainingItems: remaining,
    groupLabel,
    groupCount: 1 + remainingGroupCount,
    groupsRemaining: remainingGroupCount,
  };
}

async function persistPaidOrder(stored: StoredOrder): Promise<void> {
  ensureOrdersFile();
  const orders = JSON.parse(fs.readFileSync(ordersPath(), "utf-8")) as StoredOrder[];
  const existing = orders.find(
    (order) =>
      order.sessionId === stored.sessionId ||
      (stored.invoiceId && order.invoiceId === stored.invoiceId),
  );
  const row: StoredOrder = existing
    ? Object.assign(existing, stored, { id: existing.id })
    : stored;
  if (!existing) orders.push(row);
  writeOrders(orders);

  try {
    if (!row.confirmationSentAt) {
      const mail = await sendOrderConfirmation(row);
      if (mail.sent) {
        row.confirmationSentAt = new Date().toISOString();
        writeOrders(orders);
      }
    }
  } catch (err) {
    console.error("[stripe webhook] resend order confirmation failed", err);
  }
  try {
    await recordPurchaseOnAccount(row);
  } catch (err) {
    console.error("[stripe webhook] account attach failed", err);
  }
  try {
    const shipping = row.shipping?.address;
    const fullName = row.shipping?.name?.trim() || "";
    await storeIdentityBundle({
      email: row.customerEmail || "",
      fullName,
      phone: row.phone || undefined,
      addressLine1: shipping?.line1 || undefined,
      addressLine2: shipping?.line2 || undefined,
      city: shipping?.city || undefined,
      region: shipping?.state || undefined,
      postalCode: shipping?.postal_code || undefined,
      country: shipping?.country || undefined,
      source: "checkout",
      properties: {
        stripe_customer_id: row.customerId,
        last_session_id: row.sessionId,
      },
    });
  } catch (err) {
    console.error("[stripe webhook] non_customers identity save failed", err);
  }
  if (row.customerEmail) {
    try {
      await closeDealsOnPurchase({
        email: row.customerEmail,
        amount: row.amountTotal !== null ? row.amountTotal / 100 : undefined,
        stripeCustomerId: row.customerId ?? undefined,
      });
    } catch (err) {
      console.error("[stripe webhook] crm close failed", err);
    }
  }
}

async function orderFromSubscriptionInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<StoredOrder | null> {
  const subscriptionRef = invoice.subscription;
  const subscriptionId =
    typeof subscriptionRef === "string"
      ? subscriptionRef
      : subscriptionRef && typeof subscriptionRef === "object" && "id" in subscriptionRef
        ? String((subscriptionRef as { id: string }).id)
        : null;
  if (!subscriptionId) return null;

  let itemsMeta = invoice.subscription_details?.metadata?.items
    ?? invoice.metadata?.items
    ?? "";
  let deliveryRaw =
    invoice.subscription_details?.metadata?.delivery
    ?? invoice.metadata?.delivery
    ?? "90";

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    itemsMeta = sub.metadata?.items || itemsMeta;
    deliveryRaw = sub.metadata?.delivery || deliveryRaw;
  } catch (err) {
    console.warn("[stripe webhook] subscription retrieve failed", err);
  }

  const delivery = parseDeliveryMode(deliveryRaw);
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  let customerEmail: string | null = invoice.customer_email ?? null;
  let phone: string | null = null;
  let shipping: Stripe.Checkout.Session.ShippingDetails | null = null;

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !("deleted" in customer && customer.deleted)) {
        customerEmail = customer.email ?? customerEmail;
        phone = customer.phone ?? null;
        if (customer.shipping) {
          shipping = {
            name: customer.shipping.name ?? undefined,
            phone: customer.shipping.phone ?? undefined,
            address: customer.shipping.address
              ? {
                  line1: customer.shipping.address.line1 ?? undefined,
                  line2: customer.shipping.address.line2 ?? undefined,
                  city: customer.shipping.address.city ?? undefined,
                  state: customer.shipping.address.state ?? undefined,
                  postal_code: customer.shipping.address.postal_code ?? undefined,
                  country: customer.shipping.address.country ?? undefined,
                }
              : undefined,
          } as Stripe.Checkout.Session.ShippingDetails;
        }
      }
    } catch {
      // keep invoice email
    }
  }

  return {
    id: nanoid(),
    sessionId: `inv_${invoice.id}`,
    amountSubtotal: invoice.subtotal ?? null,
    amountTax: invoice.tax ?? null,
    amountTotal: invoice.amount_paid ?? invoice.total ?? null,
    currency: invoice.currency ?? null,
    customerId,
    invoiceId: invoice.id,
    paymentIntentId:
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id ?? null,
    customerEmail,
    shipping,
    phone,
    items: itemsMeta || "[]",
    taxStatus: invoice.tax != null ? "recorded" : null,
    paidAt: new Date((invoice.status_transitions?.paid_at ?? Date.now() / 1000) * 1000).toISOString(),
    autoDelivery: true,
    deliveryDays: isAutoDeliveryInterval(delivery) ? delivery : null,
    subscriptionId,
  };
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined,
): Promise<{ received: true }> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || secret.includes("...")) {
    throw new Error("Stripe webhook is not configured");
  }
  if (!signature) throw new Error("Missing stripe-signature header");

  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  if (Boolean(event.livemode) !== stripeKeyIsLive()) {
    console.info("[stripe webhook] ignore livemode mismatch", event.id, event.type);
    return { received: true };
  }

  if (event.type === "checkout.session.completed") {
    const completed = event.data.object as Stripe.Checkout.Session;
    let session = completed;
    try {
      session = await stripe.checkout.sessions.retrieve(completed.id);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err ? String(err.code) : "";
      if (code !== "resource_missing") {
        console.warn("[stripe webhook] session retrieve failed; using event payload", err);
      }
    }
    const stored: StoredOrder = {
      id: nanoid(),
      ...orderFromCheckoutSession(session),
    };
    await persistPaidOrder(stored);
    try {
      const synced = await syncPlacedOrder(stored);
      if (synced.profileId && stored.customerEmail) {
        await attachKlaviyoProfileId(stored.customerEmail, synced.profileId);
      }
    } catch (err) {
      console.error("[stripe webhook] klaviyo Placed Order failed", err);
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    // First subscription invoice is already recorded via checkout.session.completed.
    if (invoice.billing_reason !== "subscription_cycle") {
      return { received: true };
    }
    try {
      const stored = await orderFromSubscriptionInvoice(stripe, invoice);
      if (stored) {
        await persistPaidOrder(stored);
      }
    } catch (err) {
      console.error("[stripe webhook] subscription renewal order failed", err);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    console.info("[stripe webhook] subscription canceled", sub.id);
  }

  if (event.type === "checkout.session.expired") {
    const expired = event.data.object as Stripe.Checkout.Session;
    const email = expired.customer_email || expired.customer_details?.email || expired.metadata?.email;
    try {
      await syncCheckoutExpired({
        email: email ?? null,
        sessionId: expired.id,
        items: parseCheckoutItems(expired.metadata?.items),
      });
    } catch (err) {
      console.error("[stripe webhook] klaviyo Checkout Expired failed", err);
    }
    return { received: true };
  }

  return { received: true };
}

export async function getCheckoutSessionStatus(sessionId: string) {
  if (!isCheckoutSessionId(sessionId)) {
    throw new Error("Invalid checkout session");
  }
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === "paid",
    status: session.payment_status,
    amountSubtotal: session.amount_subtotal,
    amountTax: session.total_details?.amount_tax ?? 0,
    amountTotal: session.amount_total,
    currency: session.currency,
    autoDelivery: session.metadata?.autoDelivery === "1",
    delivery: parseDeliveryMode(session.metadata?.delivery),
  };
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  if (!session.url) throw new Error("No portal URL returned");
  return { url: session.url };
}

export async function createBillingPortalForEmail(
  email: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const customerId = await findCustomerIdByEmail(stripe, email.trim().toLowerCase());
  if (!customerId) {
    throw new Error("No Stripe customer found for this account yet. Place an order first.");
  }
  return createBillingPortalSession(customerId, returnUrl);
}
