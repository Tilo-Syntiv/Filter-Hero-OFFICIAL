import fs from "node:fs";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { catalogStripeProductId, getProductById, unitPriceForQty } from "../shared/products";
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
import { closeDealsOnPurchase } from "./crm/intake";
import { dataFile } from "./data-store";
import {
  parseCheckoutItems,
  syncCheckoutExpired,
  syncPlacedOrder,
  syncStartedCheckout,
} from "./klaviyo";
import { sendOrderConfirmation } from "./mailer";

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
const META_MAX = 490;
const stripeProductCache = new Map<number, string | null>();

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

export type CheckoutItem = { productId: number; quantity: number };

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
  const raw = JSON.stringify(items);
  if (raw.length <= META_MAX) return raw;
  return JSON.stringify(items.slice(0, 8));
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
  };
}

function lineLabel(
  product: NonNullable<ReturnType<typeof getProductById>>,
): string {
  return product.isCarbon
    ? `${product.name} (Carbon) — ${product.size}`
    : `${product.name} — ${product.size} MERV ${product.merv}`;
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

export async function createCheckoutSession(
  items: CheckoutItem[],
  clientUrl: string,
  shopper?: { email?: string; marketingConsent?: boolean },
) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env");
  }

  const taxCode = productTaxCode();
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) throw new Error(`Unknown product: ${item.productId}`);
    if (!product.inStock) throw new Error(`Out of stock: ${product.size}`);
    if (item.quantity < 1 || item.quantity > 50) {
      throw new Error(`Invalid quantity for product ${item.productId}`);
    }

    const unit = unitPriceForQty(product.price, item.quantity, product);
    const catalogProductId = await existingCatalogProductId(stripe, product.id);

    line_items.push({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(unit * 100),
        tax_behavior: "exclusive",
        ...(catalogProductId
          ? { product: catalogProductId }
          : {
              product_data: {
                name: lineLabel(product),
                description: "HVAC pleated filter",
                tax_code: taxCode,
                metadata: {
                  productId: String(product.id),
                  size: product.size,
                  merv: String(product.merv),
                },
              },
            }),
      },
    });
  }

  if (line_items.length === 0) throw new Error("Cart is empty");

  const itemsMeta = compactItemsMeta(items);
  const email = shopper?.email?.trim().toLowerCase();
  const customerId = email ? await findCustomerIdByEmail(stripe, email) : null;
  const tax = await readStripeTaxReadiness(stripe);
  if (tax.automaticTax && !tax.collecting) {
    console.warn(
      "[checkout] Stripe Tax is on, but there is no active registration. Checkout will charge $0 tax until one is added.",
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/checkout/cancel`,
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "Shipping",
          tax_behavior: "exclusive",
          tax_code: SHIPPING_TAX_CODE,
        },
      },
    ],
    phone_number_collection: { enabled: true },
    invoice_creation: { enabled: true },
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
          customer_creation: "always",
          ...(email ? { customer_email: email } : {}),
        }),
    metadata: {
      items: itemsMeta,
      ...(email ? { email } : {}),
      ...(shopper?.marketingConsent ? { marketingConsent: "1" } : {}),
    },
    payment_intent_data: {
      metadata: { items: itemsMeta },
    },
  });

  if (email && session.url) {
    try {
      await syncStartedCheckout({
        email,
        sessionId: session.id,
        checkoutUrl: session.url,
        items,
        marketingConsent: shopper?.marketingConsent,
      });
    } catch (err) {
      console.error("[checkout] klaviyo Started Checkout failed", err);
    }
  }

  return session;
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
    ensureOrdersFile();
    const orders = JSON.parse(fs.readFileSync(ordersPath(), "utf-8")) as StoredOrder[];
    const existing = orders.find((order) => order.sessionId === session.id);
    const stored: StoredOrder = existing ?? {
      id: nanoid(),
      ...orderFromCheckoutSession(session),
    };
    if (!existing) {
      orders.push(stored);
      writeOrders(orders);
    }
    try {
      await syncPlacedOrder(stored);
    } catch (err) {
      console.error("[stripe webhook] klaviyo Placed Order failed", err);
    }
    try {
      if (!stored.confirmationSentAt) {
        const mail = await sendOrderConfirmation(stored);
        if (mail.sent) {
          stored.confirmationSentAt = new Date().toISOString();
          writeOrders(orders);
        }
      }
    } catch (err) {
      console.error("[stripe webhook] resend order confirmation failed", err);
    }
    try {
      await recordPurchaseOnAccount(stored);
    } catch (err) {
      console.error("[stripe webhook] account attach failed", err);
    }
    if (stored.customerEmail) {
      try {
        await closeDealsOnPurchase({
          email: stored.customerEmail,
          amount:
            stored.amountTotal !== null ? stored.amountTotal / 100 : undefined,
          stripeCustomerId: stored.customerId ?? undefined,
        });
      } catch (err) {
        console.error("[stripe webhook] crm close failed", err);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const expired = event.data.object as Stripe.Checkout.Session;
    const email =
      expired.customer_details?.email ??
      expired.customer_email ??
      expired.metadata?.email ??
      null;
    try {
      await syncCheckoutExpired({
        email,
        sessionId: expired.id,
        items: parseCheckoutItems(expired.metadata?.items),
      });
    } catch (err) {
      console.error("[stripe webhook] klaviyo Checkout Expired failed", err);
    }
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
  };
}
