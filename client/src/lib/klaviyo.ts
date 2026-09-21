import { getSiteUrl } from "@/hooks/useSeo";
import { getProductById, packShotSrc, type Product } from "@shared/products";
import { BRAND_NAME } from "@/const";

type CartLike = {
  productId: number;
  size: string;
  merv: number;
  price: number;
  name: string;
  qty: number;
};

const AID_KEY = "fh_aid";
const EMAIL_KEY = "fh_klaviyo_email";

type KlaviyoFn = {
  identify?: (profile: Record<string, unknown>) => unknown;
  track?: (metric: string, properties?: Record<string, unknown>) => unknown;
  trackViewedItem?: (item: Record<string, unknown>) => unknown;
  push?: (args: unknown[]) => unknown;
};

declare global {
  interface Window {
    klaviyo?: KlaviyoFn;
    _klOnsite?: unknown[];
  }
}

let booted = false;
let publicKey = "";
let httpsClientPatched = false;

function klaviyoHttpsUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.href);
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "klaviyo.com" || parsed.hostname.endsWith(".klaviyo.com"))
    ) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}

/** Klaviyo.js follows the page scheme. On HTTP localhost that is http://a.klaviyo.com, which 301s and CORS-fails. */
function patchKlaviyoHttpsClient() {
  if (httpsClientPatched || typeof window === "undefined") return;
  if (window.location.protocol === "https:") return;
  httpsClientPatched = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") return origFetch(klaviyoHttpsUrl(input), init);
    if (input instanceof URL) return origFetch(klaviyoHttpsUrl(input.href), init);
    if (input instanceof Request) {
      const next = klaviyoHttpsUrl(input.url);
      if (next !== input.url) return origFetch(new Request(next, input), init);
    }
    return origFetch(input as RequestInfo, init);
  }) as typeof fetch;

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const next = typeof url === "string" ? klaviyoHttpsUrl(url) : klaviyoHttpsUrl(url.href);
    return origOpen.call(this, method, next, async ?? true, username, password);
  };

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) =>
      origBeacon(
        typeof url === "string" ? klaviyoHttpsUrl(url) : klaviyoHttpsUrl(url.href),
        data,
      );
  }
}

export function getAnonymousId(): string {
  try {
    const existing = localStorage.getItem(AID_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(AID_KEY, next);
    return next;
  } catch {
    return "anon";
  }
}

export function rememberedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function rememberEmail(email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* private mode */
  }
}

function callOnsite(method: string, ...args: unknown[]) {
  const api = window.klaviyo;
  const fn = api?.[method as keyof KlaviyoFn];
  if (typeof fn === "function") {
    (fn as (...fnArgs: unknown[]) => unknown)(...args);
    return;
  }
  window._klOnsite = window._klOnsite || [];
  window._klOnsite.push([method, ...args]);
}

function productCategories(product: Product): string[] {
  return [
    product.isCarbon ? "MERV 8 Carbon" : `MERV ${product.merv}`,
    product.size,
  ];
}

function productPageUrl(product: Product): string {
  const merv = product.isCarbon ? "carbon" : String(product.merv);
  return `${getSiteUrl()}/sizes/${encodeURIComponent(product.size)}?merv=${merv}`;
}

function productImage(product: Product): string {
  return `${getSiteUrl()}${packShotSrc(product.merv, Boolean(product.isCarbon))}`;
}

function productName(product: Product): string {
  return product.isCarbon
    ? `${product.name} (Carbon) — ${product.size}`
    : `${product.name} — ${product.size} MERV ${product.merv}`;
}

function cartLines(items: CartLike[]) {
  return items.map((item) => {
    const product = getProductById(item.productId);
    const carbon = Boolean(product?.isCarbon);
    const merv = product?.merv ?? 8;
    return {
      ProductID: String(item.productId),
      SKU: `${item.size}-${carbon ? "carbon" : merv}`,
      ProductName: `${item.name} — ${item.size}`,
      Quantity: item.qty,
      ItemPrice: item.price,
      RowTotal: Math.round(item.price * item.qty * 100) / 100,
      ProductURL: `${getSiteUrl()}/sizes/${encodeURIComponent(item.size)}`,
      ImageURL: `${getSiteUrl()}${packShotSrc(merv, carbon)}`,
      ProductCategories: product ? productCategories(product) : [`MERV ${item.merv}`, item.size],
      Brand: BRAND_NAME,
    };
  });
}

async function postJson(path: string, body: Record<string, unknown>) {
  try {
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* tracking must never block checkout */
  }
}

export async function bootKlaviyo() {
  if (booted || typeof window === "undefined") return;
  patchKlaviyoHttpsClient();
  getAnonymousId();
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch("/api/klaviyo/config");
      if (!res.ok) throw new Error(`config ${res.status}`);
      const data = (await res.json()) as { publicKey?: string };
      publicKey = data.publicKey?.trim() || "";
      booted = true;
      break;
    } catch {
      if (attempt === 5) return;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  if (!publicKey) return;
  if (document.getElementById("fh-klaviyo-js")) return;

  window._klOnsite = window._klOnsite || [];
  if (!window.klaviyo) {
    window.klaviyo = {
      push(args) {
        window._klOnsite = window._klOnsite || [];
        window._klOnsite.push(args);
      },
    };
  }

  const script = document.createElement("script");
  script.id = "fh-klaviyo-js";
  script.async = true;
  script.src = `https://static.klaviyo.com/onsite/js/${encodeURIComponent(publicKey)}/klaviyo.js`;
  document.head.appendChild(script);

  const email = rememberedEmail();
  if (email) identifyShopper({ email });
}

export function identifyShopper(input: {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  properties?: Record<string, unknown>;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  rememberEmail(email);
  const profile: Record<string, unknown> = {
    email,
    $anonymous: getAnonymousId(),
  };
  if (input.phone) profile.phone_number = input.phone;
  if (input.firstName) profile.first_name = input.firstName;
  if (input.lastName) profile.last_name = input.lastName;
  if (input.properties) Object.assign(profile, input.properties);
  callOnsite("identify", profile);
  void postJson("/api/identify", {
    email,
    phone: input.phone,
    firstName: input.firstName,
    lastName: input.lastName,
    anonymousId: getAnonymousId(),
    properties: input.properties,
  });
}

export function trackMetric(
  metric: string,
  properties: Record<string, unknown> = {},
  value?: number,
) {
  callOnsite("track", metric, properties);
  const email = rememberedEmail();
  if (!email) return;
  void postJson("/api/track", {
    metric,
    email,
    anonymousId: getAnonymousId(),
    properties,
    value,
  });
}

export function trackViewedProduct(product: Product) {
  const item = {
    ProductName: productName(product),
    ProductID: String(product.id),
    SKU: `${product.size}-${product.isCarbon ? "carbon" : product.merv}`,
    Categories: productCategories(product),
    ImageURL: productImage(product),
    URL: productPageUrl(product),
    Brand: BRAND_NAME,
    Price: product.price,
    Size: product.size,
    MERV: product.isCarbon ? "carbon" : String(product.merv),
  };
  trackMetric("Viewed Product", item);
  callOnsite("trackViewedItem", {
    Title: item.ProductName,
    ItemId: item.ProductID,
    Categories: item.Categories,
    ImageUrl: item.ImageURL,
    Url: item.URL,
    Metadata: { Brand: BRAND_NAME, Price: product.price },
  });
}

export function trackViewedSize(size: string) {
  trackMetric("Viewed Size", { Size: size });
}

export function trackSelectedMerv(merv: string) {
  trackMetric("Selected MERV", { MERV: merv });
}

export function trackAddedToCart(product: Product, qty: number, cart: CartLike[]) {
  const lines = cartLines(cart);
  const value = lines.reduce((sum, line) => sum + line.RowTotal, 0);
  trackMetric(
    "Added to Cart",
    {
      $value: value,
      AddedItemProductName: productName(product),
      AddedItemProductID: String(product.id),
      AddedItemSKU: `${product.size}-${product.isCarbon ? "carbon" : product.merv}`,
      AddedItemCategories: productCategories(product),
      AddedItemImageURL: productImage(product),
      AddedItemURL: productPageUrl(product),
      AddedItemPrice: product.price,
      AddedItemQuantity: qty,
      ItemNames: lines.map((line) => line.ProductName),
      Items: lines,
    },
    value,
  );
}
