import {
  getProductById,
  packShotSrc,
  sellableSheetProducts,
  unitPriceForQty,
  type Product,
} from "../shared/products";
import { BRAND_NAME } from "../shared/const";
import {
  CLOCK_NEXT_CHANGE_PROPERTY,
  klaviyoMaySubscribe,
  klaviyoMetricForIntent,
  REPLENISH_DATE_PROPERTY,
} from "../shared/email-channels";
import { siteOrigin } from "../shared/seo";
import type { CheckoutItem, StoredOrder } from "./stripe";

/** Events and consent only. Do not send mail here — Resend owns receipts. See shared/email-channels.ts. */
export const KLAVIYO_REVISION = "2026-07-15";
export const KLAVIYO_API = "https://a.klaviyo.com";

export const CLIENT_METRICS = [
  "Viewed Product",
  "Viewed Size",
  "Added to Cart",
  "Selected MERV",
  "Active on Site",
] as const;

export type ClientMetric = (typeof CLIENT_METRICS)[number];

const CLIENT_METRIC_SET = new Set<string>(CLIENT_METRICS);

const BASE_DAYS: Record<string, number> = {
  "0.5": 30,
  "1": 90,
  "2": 120,
  "4": 270,
  "5": 330,
};

const MARKETING_LIST_NAME = "Filter Hero Marketing";

export type KlaviyoProfileInput = {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  anonymousId?: string;
  properties?: Record<string, unknown>;
};

export type KlaviyoEventInput = {
  metric: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  anonymousId?: string;
  properties?: Record<string, unknown>;
  profileProperties?: Record<string, unknown>;
  value?: number;
  uniqueId?: string;
  time?: string;
};

export type ContactKlaviyoLead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  filterSize?: string;
  message: string;
  intent: "quote" | "support" | "reminder";
  cartSummary?: string;
  marketingConsent?: boolean;
  cadence?: Record<string, unknown>;
};

export type KlaviyoLine = {
  ProductID: string;
  SKU: string;
  ProductName: string;
  Quantity: number;
  ItemPrice: number;
  RowTotal: number;
  ProductURL: string;
  ImageURL: string;
  ProductCategories: string[];
  Categories: string[];
  Brand: string;
  Size: string;
  MERV: string;
};

type KlaviyoErrorBody = {
  errors?: Array<{ title?: string; detail?: string }>;
};

let cachedListId: string | null | undefined;

export function isKlaviyoEnabled(): boolean {
  if (process.env.KLAVIYO_DISABLE === "1") return false;
  const key = process.env.KLAVIYO_PRIVATE_API_KEY?.trim();
  return Boolean(key && !key.includes("..."));
}

export function klaviyoPublicKey(): string {
  return (
    process.env.KLAVIYO_PUBLIC_API_KEY?.trim() ||
    process.env.VITE_KLAVIYO_PUBLIC_API_KEY?.trim() ||
    ""
  );
}

export function isClientMetric(metric: string): metric is ClientMetric {
  return CLIENT_METRIC_SET.has(metric);
}

export function shouldSubscribeFromLead(lead: {
  intent: ContactKlaviyoLead["intent"];
  marketingConsent?: boolean;
}): boolean {
  return klaviyoMaySubscribe(lead);
}

export function splitPersonName(name?: string): {
  firstName?: string;
  lastName?: string;
} {
  const trimmed = (name || "").trim();
  if (!trimmed || /^filter clock/i.test(trimmed)) return {};
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

export function toE164(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.trim().startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return undefined;
}

export function depthFromSize(size?: string): number | undefined {
  if (!size) return undefined;
  const match = size.toLowerCase().match(/x(\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  const depth = Number(match[1]);
  return Number.isFinite(depth) ? depth : undefined;
}

export function intervalDaysForSize(
  size?: string,
  existing?: number,
): number {
  if (typeof existing === "number" && existing > 0) return existing;
  const depth = depthFromSize(size);
  if (depth == null) return 90;
  return BASE_DAYS[String(depth)] ?? 90;
}

export function nextChangeDateIso(paidAt: string, intervalDays: number): string {
  const date = new Date(paidAt);
  date.setUTCDate(date.getUTCDate() + intervalDays);
  return date.toISOString().slice(0, 10);
}

function privateKey(): string {
  return process.env.KLAVIYO_PRIVATE_API_KEY?.trim() || "";
}

function klaviyoHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Klaviyo-API-Key ${privateKey()}`,
    accept: "application/vnd.api+json",
    revision: process.env.KLAVIYO_REVISION?.trim() || KLAVIYO_REVISION,
  };
  if (json) headers["content-type"] = "application/vnd.api+json";
  return headers;
}

export async function klaviyoApi<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  return klaviyoRequest<T>(method, path, body);
}

async function klaviyoRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (!isKlaviyoEnabled()) {
    return { ok: false, status: 0, data: null, error: "klaviyo_disabled" };
  }
  const res = await fetch(`${KLAVIYO_API}${path}`, {
    method,
    headers: klaviyoHeaders(body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: T | KlaviyoErrorBody | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const err = parsed as KlaviyoErrorBody | null;
    const detail =
      err?.errors?.map((e) => e.detail || e.title).filter(Boolean).join("; ") ||
      text.slice(0, 240) ||
      `HTTP ${res.status}`;
    return { ok: false, status: res.status, data: null, error: detail };
  }
  return { ok: true, status: res.status, data: parsed as T };
}

export function mervKeyForProduct(product: Product): string {
  return product.isCarbon ? "carbon" : String(product.merv);
}

export function productUrl(product: Product, origin = siteOrigin()): string {
  return `${origin.replace(/\/$/, "")}/sizes/${encodeURIComponent(product.size)}?merv=${mervKeyForProduct(product)}`;
}

export function productImageUrl(product: Product, origin = siteOrigin()): string {
  return `${origin.replace(/\/$/, "")}${packShotSrc(product.merv, Boolean(product.isCarbon))}`;
}

export function categoriesForProduct(product: Product): string[] {
  const cats = [
    product.isCarbon ? "MERV 8 Carbon" : `MERV ${product.merv}`,
    `${product.size}`,
    `${depthFromSize(product.size) ?? 1}-inch`,
  ];
  return cats;
}

export function klaviyoLineFromProduct(
  product: Product,
  quantity: number,
  origin = siteOrigin(),
): KlaviyoLine {
  const qty = Math.min(50, Math.max(1, quantity));
  const unit = unitPriceForQty(product.price, qty, product);
  const cats = categoriesForProduct(product);
  return {
    ProductID: String(product.id),
    SKU: `${product.size}-${mervKeyForProduct(product)}`,
    ProductName: product.isCarbon
      ? `${product.name} (Carbon) — ${product.size}`
      : `${product.name} — ${product.size} MERV ${product.merv}`,
    Quantity: qty,
    ItemPrice: unit,
    RowTotal: Math.round(unit * qty * 100) / 100,
    ProductURL: productUrl(product, origin),
    ImageURL: productImageUrl(product, origin),
    ProductCategories: cats,
    Categories: cats,
    Brand: BRAND_NAME,
    Size: product.size,
    MERV: mervKeyForProduct(product),
  };
}

export function linesFromCheckoutItems(
  items: CheckoutItem[],
  origin = siteOrigin(),
): KlaviyoLine[] {
  const lines: KlaviyoLine[] = [];
  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) continue;
    lines.push(klaviyoLineFromProduct(product, item.quantity, origin));
  }
  return lines;
}

export function parseCheckoutItems(raw: string | undefined): CheckoutItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const rec = row as { productId?: unknown; quantity?: unknown };
        const productId = Number(rec.productId);
        const quantity = Number(rec.quantity);
        if (!Number.isInteger(productId) || productId < 1) return null;
        if (!Number.isInteger(quantity) || quantity < 1) return null;
        return { productId, quantity };
      })
      .filter((row): row is CheckoutItem => row !== null);
  } catch {
    return [];
  }
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

function profileAttributes(input: KlaviyoProfileInput): Record<string, unknown> {
  const attrs: Record<string, unknown> = {
    email: input.email.trim().toLowerCase(),
  };
  const phone = toE164(input.phone);
  if (phone) attrs.phone_number = phone;
  if (input.firstName) attrs.first_name = input.firstName;
  if (input.lastName) attrs.last_name = input.lastName;
  if (input.anonymousId) attrs.anonymous_id = input.anonymousId;
  if (input.properties && Object.keys(input.properties).length > 0) {
    attrs.properties = input.properties;
  }
  return attrs;
}

export async function upsertKlaviyoProfile(
  input: KlaviyoProfileInput,
): Promise<{ ok: boolean; error?: string }> {
  const result = await klaviyoRequest("POST", "/api/profile-import", {
    data: {
      type: "profile",
      attributes: profileAttributes(input),
    },
  });
  if (!result.ok && result.error !== "klaviyo_disabled") {
    console.error("[klaviyo] profile-import", result.error);
  }
  return { ok: result.ok, error: result.error };
}

export async function trackKlaviyoEvent(
  input: KlaviyoEventInput,
): Promise<{ ok: boolean; error?: string }> {
  const profile: Record<string, unknown> = {
    email: input.email.trim().toLowerCase(),
  };
  const phone = toE164(input.phone);
  if (phone) profile.phone_number = phone;
  if (input.firstName) profile.first_name = input.firstName;
  if (input.lastName) profile.last_name = input.lastName;
  if (input.anonymousId) profile.anonymous_id = input.anonymousId;
  if (input.profileProperties && Object.keys(input.profileProperties).length > 0) {
    profile.properties = input.profileProperties;
  }

  const attributes: Record<string, unknown> = {
    properties: input.properties ?? {},
    metric: {
      data: {
        type: "metric",
        attributes: { name: input.metric },
      },
    },
    profile: {
      data: {
        type: "profile",
        attributes: profile,
      },
    },
  };
  if (typeof input.value === "number") {
    attributes.value = input.value;
    attributes.value_currency = "USD";
  }
  if (input.uniqueId) attributes.unique_id = input.uniqueId;
  if (input.time) attributes.time = input.time;

  const result = await klaviyoRequest("POST", "/api/events", {
    data: { type: "event", attributes },
  });
  if (!result.ok && result.error !== "klaviyo_disabled") {
    console.error("[klaviyo] event", input.metric, result.error);
  }
  return { ok: result.ok, error: result.error };
}

export async function resolveMarketingListId(): Promise<string | null> {
  if (cachedListId !== undefined) return cachedListId;
  const fromEnv = process.env.KLAVIYO_LIST_ID?.trim();
  if (fromEnv && !fromEnv.includes("...")) {
    cachedListId = fromEnv;
    return cachedListId;
  }
  const listed = await klaviyoRequest<{
    data?: Array<{ id?: string; attributes?: { name?: string } }>;
  }>("GET", "/api/lists");
  if (listed.ok && listed.data?.data?.length) {
    const match =
      listed.data.data.find((row) => row.attributes?.name === MARKETING_LIST_NAME) ||
      listed.data.data[0];
    if (match?.id) {
      cachedListId = match.id;
      return cachedListId;
    }
  }
  const created = await klaviyoRequest<{ data?: { id?: string } }>("POST", "/api/lists", {
    data: {
      type: "list",
      attributes: { name: MARKETING_LIST_NAME },
    },
  });
  cachedListId = created.data?.data?.id ?? null;
  if (!cachedListId) {
    console.error("[klaviyo] could not resolve marketing list", created.error);
  }
  return cachedListId;
}

export async function subscribeMarketingEmail(
  email: string,
  source: string,
): Promise<{ ok: boolean; error?: string }> {
  const listId = await resolveMarketingListId();
  const body: Record<string, unknown> = {
    data: {
      type: "profile-subscription-bulk-create-job",
      attributes: {
        custom_source: source,
        profiles: {
          data: [
            {
              type: "profile",
              attributes: {
                email: email.trim().toLowerCase(),
                subscriptions: {
                  email: { marketing: { consent: "SUBSCRIBED" } },
                },
              },
            },
          ],
        },
      },
      ...(listId
        ? {
            relationships: {
              list: { data: { type: "list", id: listId } },
            },
          }
        : {}),
    },
  };
  const result = await klaviyoRequest(
    "POST",
    "/api/profile-subscription-bulk-create-jobs",
    body,
  );
  if (!result.ok && result.error !== "klaviyo_disabled") {
    console.error("[klaviyo] subscribe", result.error);
  }
  return { ok: result.ok, error: result.error };
}

export async function getKlaviyoAccount(): Promise<{
  ok: boolean;
  test?: boolean;
  accountId?: string;
  publicKey?: string;
  organization?: string;
  error?: string;
}> {
  const fields =
    "fields[account]=public_api_key,test_account,contact_information.organization_name";
  const result = await klaviyoRequest<{
    data?: Array<{
      id?: string;
      attributes?: {
        test_account?: boolean;
        public_api_key?: string;
        contact_information?: { organization_name?: string };
      };
    }>;
  }>("GET", `/api/accounts?${fields}`);
  if (!result.ok) return { ok: false, error: result.error };
  const account = result.data?.data?.[0];
  return {
    ok: true,
    test: account?.attributes?.test_account,
    accountId: account?.id,
    publicKey: account?.attributes?.public_api_key,
    organization: account?.attributes?.contact_information?.organization_name,
  };
}

export function cadenceProperties(
  cadence: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!cadence) return {};
  const out: Record<string, unknown> = {};
  const keys = [
    "change_interval_days",
    "house_type",
    "recommended_merv",
    "selected_merv",
    "depth",
    "pack_qty",
    "pets",
    "occupants",
    "allergies",
    "smoking",
    "kids",
    "sqft",
  ] as const;
  for (const key of keys) {
    if (cadence[key] !== undefined) out[key] = cadence[key];
  }
  // Clock date must not reuse the replenish trigger property (FH-131 / FH-178).
  if (cadence[REPLENISH_DATE_PROPERTY] !== undefined) {
    out[CLOCK_NEXT_CHANGE_PROPERTY] = cadence[REPLENISH_DATE_PROPERTY];
  } else if (cadence[CLOCK_NEXT_CHANGE_PROPERTY] !== undefined) {
    out[CLOCK_NEXT_CHANGE_PROPERTY] = cadence[CLOCK_NEXT_CHANGE_PROPERTY];
  }
  if (typeof cadence.selected_merv === "string") {
    out.preferred_merv = cadence.selected_merv;
  }
  return out;
}

export async function syncContactToKlaviyo(lead: ContactKlaviyoLead): Promise<void> {
  if (!isKlaviyoEnabled()) return;
  const { firstName, lastName } = splitPersonName(lead.name);
  const cadence = cadenceProperties(lead.cadence);
  const properties: Record<string, unknown> = {
    ...cadence,
    last_intent: lead.intent,
  };
  if (lead.filterSize) {
    properties.filter_size = lead.filterSize;
    properties.filter_sizes = [lead.filterSize];
  }
  if (lead.cartSummary) properties.cart_summary = lead.cartSummary;

  const metric = klaviyoMetricForIntent(lead.intent);

  await trackKlaviyoEvent({
    metric,
    email: lead.email,
    phone: lead.phone,
    firstName,
    lastName,
    uniqueId:
      lead.intent === "reminder"
        ? `reminder:${lead.email.toLowerCase()}:${String(cadence[CLOCK_NEXT_CHANGE_PROPERTY] || lead.id)}`
        : `${lead.intent}:${lead.id}`,
    properties: {
      Intent: lead.intent,
      FilterSize: lead.filterSize || "",
      Message: lead.message.slice(0, 500),
      ...cadence,
    },
    profileProperties: properties,
  });

  if (shouldSubscribeFromLead(lead)) {
    await subscribeMarketingEmail(
      lead.email,
      lead.intent === "support" ? "contact-support" : "contact-quote",
    );
  }
}

export async function syncStartedCheckout(input: {
  email: string;
  sessionId: string;
  checkoutUrl: string;
  items: CheckoutItem[];
  marketingConsent?: boolean;
}): Promise<void> {
  if (!isKlaviyoEnabled()) return;
  const lines = linesFromCheckoutItems(input.items);
  const value = lines.reduce((sum, line) => sum + line.RowTotal, 0);
  await trackKlaviyoEvent({
    metric: "Started Checkout",
    email: input.email,
    uniqueId: `checkout:${input.sessionId}`,
    value: Math.round(value * 100) / 100,
    properties: {
      $event_id: input.sessionId,
      $value: Math.round(value * 100) / 100,
      ItemNames: lines.map((line) => line.ProductName),
      CheckoutURL: input.checkoutUrl,
      Categories: uniqueStrings(lines.flatMap((line) => line.Categories)),
      Items: lines,
    },
  });
  if (input.marketingConsent) {
    await subscribeMarketingEmail(input.email, "checkout");
  }
}

export async function syncCheckoutExpired(input: {
  email: string | null;
  sessionId: string;
  items: CheckoutItem[];
}): Promise<void> {
  if (!isKlaviyoEnabled() || !input.email) return;
  const lines = linesFromCheckoutItems(input.items);
  await trackKlaviyoEvent({
    metric: "Checkout Expired",
    email: input.email,
    uniqueId: `expired:${input.sessionId}`,
    properties: {
      CheckoutSessionId: input.sessionId,
      ItemNames: lines.map((line) => line.ProductName),
      Items: lines,
    },
  });
}

export function orderProfileProperties(order: StoredOrder): Record<string, unknown> {
  const items = parseCheckoutItems(order.items);
  const products = items
    .map((item) => getProductById(item.productId))
    .filter((product): product is Product => Boolean(product));
  const sizes = uniqueStrings(products.map((product) => product.size));
  const interval = intervalDaysForSize(sizes[0]);
  const paidAt = order.paidAt || new Date().toISOString();
  return {
    last_order_at: paidAt,
    last_order_value: order.amountTotal != null ? order.amountTotal / 100 : undefined,
    last_order_sizes: sizes,
    filter_sizes: sizes,
    preferred_merv: products[0] ? mervKeyForProduct(products[0]) : undefined,
    [REPLENISH_DATE_PROPERTY]: nextChangeDateIso(paidAt, interval),
    change_interval_days: interval,
    stripe_customer_id: order.customerId,
  };
}

export async function syncPlacedOrder(order: StoredOrder): Promise<void> {
  if (!isKlaviyoEnabled() || !order.customerEmail) return;
  const items = parseCheckoutItems(order.items);
  const lines = linesFromCheckoutItems(items);
  const value =
    order.amountTotal != null
      ? order.amountTotal / 100
      : lines.reduce((sum, line) => sum + line.RowTotal, 0);
  const ship = order.shipping;
  const properties = {
    OrderId: order.id,
    CheckoutSessionId: order.sessionId,
    Categories: uniqueStrings(lines.flatMap((line) => line.Categories)),
    ItemNames: lines.map((line) => line.ProductName),
    Brands: [BRAND_NAME],
    Items: lines,
    BillingAddress: ship
      ? {
          FirstName: ship.name?.split(/\s+/)[0] || "",
          Address1: ship.address?.line1 || "",
          City: ship.address?.city || "",
          RegionCode: ship.address?.state || "",
          CountryCode: "US",
          Zip: ship.address?.postal_code || "",
          Phone: order.phone || "",
        }
      : undefined,
    ShippingAddress: ship
      ? {
          Address1: ship.address?.line1 || "",
          City: ship.address?.city || "",
          RegionCode: ship.address?.state || "",
          CountryCode: "US",
          Zip: ship.address?.postal_code || "",
        }
      : undefined,
  };

  await trackKlaviyoEvent({
    metric: "Placed Order",
    email: order.customerEmail,
    phone: order.phone || undefined,
    uniqueId: `placed_order:${order.sessionId}`,
    time: order.paidAt,
    value: Math.round(value * 100) / 100,
    properties,
    profileProperties: orderProfileProperties(order),
  });

  await Promise.all(
    lines.map((line) =>
      trackKlaviyoEvent({
        metric: "Ordered Product",
        email: order.customerEmail as string,
        phone: order.phone || undefined,
        uniqueId: `ordered:${order.sessionId}:${line.ProductID}`,
        time: order.paidAt,
        value: line.RowTotal,
        properties: line,
      }),
    ),
  );
}

export type KlaviyoCatalogItem = {
  id: string;
  title: string;
  link: string;
  description: string;
  image_link: string;
  price: number;
  inventory_quantity: number;
  categories: string[];
};

export function sellableCatalogProducts(): Product[] {
  return sellableSheetProducts();
}

export function buildKlaviyoCatalog(origin = siteOrigin()): {
  $schema: string;
  items: KlaviyoCatalogItem[];
} {
  const items = sellableCatalogProducts().map((product) => ({
    id: String(product.id),
    title: product.isCarbon
      ? `${product.size} MERV 8 Carbon`
      : `${product.size} MERV ${product.merv}`,
    link: productUrl(product, origin),
    description: product.description || `${BRAND_NAME} ${product.size} HVAC filter`,
    image_link: productImageUrl(product, origin),
    price: product.price,
    inventory_quantity: product.inStock ? 999 : 0,
    categories: categoriesForProduct(product),
  }));
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    items,
  };
}

export function klaviyoPublicConfig(): {
  enabled: boolean;
  publicKey: string;
} {
  return {
    enabled: isKlaviyoEnabled() || Boolean(klaviyoPublicKey()),
    publicKey: klaviyoPublicKey(),
  };
}

export async function klaviyoHealth(): Promise<{
  enabled: boolean;
  publicKey: boolean;
  listConfigured: boolean;
  account?: string;
  error?: string;
}> {
  const publicKey = Boolean(klaviyoPublicKey());
  if (!isKlaviyoEnabled()) {
    return {
      enabled: false,
      publicKey,
      listConfigured: Boolean(process.env.KLAVIYO_LIST_ID?.trim()),
    };
  }
  const account = await getKlaviyoAccount();
  const listId = await resolveMarketingListId();
  return {
    enabled: account.ok,
    publicKey,
    listConfigured: Boolean(listId),
    account: account.accountId,
    error: account.error,
  };
}
