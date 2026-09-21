import fs from "node:fs";
import {
  FILTER_SIZES,
  ALL_FILTER_SIZES,
  MERV_TYPES,
  SELLABLE_ONLY,
  THICKNESSES,
  catalogStripeProductId,
  getProductById,
  popularSizeSlugs,
  sellableSheetProducts,
  wholesaleSkuFor,
} from "../../shared/products";
import { mappedStripeProductId, stripeKeyIsLive } from "../../shared/stripe-catalog";
import { HVAC_BRAND_LIST } from "../../shared/hvac-brands";
import { CLIENT_METRICS } from "../klaviyo";
import { listAllLeads, type StoredLead } from "../contact";
import { dataFile } from "../data-store";
import { getAccountDb, getDb } from "../db";
import { listAllOrders, type StoredOrder } from "../stripe";
import { loadSiteConfig } from "./config";
import { intuitConfigFromEnv, intuitPublicStatus } from "../intuit/oauth";

export type AdminOrderItem = {
  productId: number;
  quantity: number;
  size: string | null;
  name: string | null;
};

export type AdminOrder = {
  id: string;
  sessionId: string;
  paidAt: string;
  amountSubtotal: number | null;
  amountTax: number | null;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  customerId: string | null;
  invoiceId: string | null;
  phone: string | null;
  taxStatus: string | null;
  items: AdminOrderItem[];
  shippingCity: string | null;
  shippingRegion: string | null;
};

export type AdminLead = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  filterSize: string;
  message: string;
  intent: StoredLead["intent"];
  cartSummary: string;
  marketingConsent: boolean;
};

function parseItems(raw: string): AdminOrderItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items: AdminOrderItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const productId = Number((entry as { productId?: unknown }).productId);
    const quantity = Number((entry as { quantity?: unknown }).quantity);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    const product = getProductById(productId);
    items.push({
      productId,
      quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
      size: product?.size ?? null,
      name: product
        ? product.isCarbon
          ? `${product.name} (Carbon)`
          : `${product.name} MERV ${product.merv}`
        : null,
    });
  }
  return items;
}

function presentOrder(order: StoredOrder): AdminOrder {
  const shipping = order.shipping;
  return {
    id: order.id,
    sessionId: order.sessionId,
    paidAt: order.paidAt,
    amountSubtotal: order.amountSubtotal,
    amountTax: order.amountTax,
    amountTotal: order.amountTotal,
    currency: order.currency,
    customerEmail: order.customerEmail,
    customerId: order.customerId,
    invoiceId: order.invoiceId,
    phone: order.phone,
    taxStatus: order.taxStatus,
    items: parseItems(order.items),
    shippingCity: shipping?.address?.city ?? null,
    shippingRegion: shipping?.address?.state ?? null,
  };
}

function presentLead(lead: StoredLead): AdminLead {
  return {
    id: lead.id,
    createdAt: lead.createdAt,
    name: lead.name,
    email: lead.email,
    phone: lead.phone || "",
    filterSize: lead.filterSize || "",
    message: lead.message,
    intent: lead.intent,
    cartSummary: lead.cartSummary || "",
    marketingConsent: Boolean(lead.marketingConsent),
  };
}

function newestFirst<T extends { paidAt?: string; createdAt?: string }>(
  rows: T[],
  key: "paidAt" | "createdAt",
): T[] {
  return [...rows].sort((a, b) => String(b[key] ?? "").localeCompare(String(a[key] ?? "")));
}

function matchesQuery(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

export function listAdminOrders(opts: { q?: string; limit?: number } = {}): AdminOrder[] {
  const needle = (opts.q ?? "").trim().toLowerCase();
  const limit = opts.limit ?? 200;
  return newestFirst(listAllOrders(), "paidAt")
    .map(presentOrder)
    .filter((order) =>
      matchesQuery(
        `${order.customerEmail ?? ""} ${order.id} ${order.sessionId} ${order.items.map((item) => item.size ?? "").join(" ")}`,
        needle,
      ),
    )
    .slice(0, limit);
}

export function getAdminOrder(id: string): AdminOrder | null {
  const order = listAllOrders().find((row) => row.id === id || row.sessionId === id);
  return order ? presentOrder(order) : null;
}

export function listAdminLeads(opts: { q?: string; intent?: string; limit?: number } = {}): AdminLead[] {
  const needle = (opts.q ?? "").trim().toLowerCase();
  const limit = opts.limit ?? 200;
  return newestFirst(listAllLeads(), "createdAt")
    .map(presentLead)
    .filter((lead) => (opts.intent ? lead.intent === opts.intent : true))
    .filter((lead) =>
      matchesQuery(
        `${lead.name} ${lead.email} ${lead.filterSize} ${lead.message} ${lead.intent}`,
        needle,
      ),
    )
    .slice(0, limit);
}

function cents(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

function inLastDays(iso: string, days: number): boolean {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return false;
  return Date.now() - then <= days * 24 * 60 * 60 * 1000;
}

export async function buildOverview() {
  const orders = newestFirst(listAllOrders(), "paidAt").map(presentOrder);
  const leads = newestFirst(listAllLeads(), "createdAt").map(presentLead);
  const revenueAll = orders.reduce((sum, order) => sum + cents(order.amountTotal), 0);
  const revenue30 = orders
    .filter((order) => inLastDays(order.paidAt, 30))
    .reduce((sum, order) => sum + cents(order.amountTotal), 0);
  const revenue7 = orders
    .filter((order) => inLastDays(order.paidAt, 7))
    .reduce((sum, order) => sum + cents(order.amountTotal), 0);

  const pipeline = await pipelineSnapshot();
  const customers = await customerCount();

  return {
    revenue: {
      all: revenueAll,
      last30: revenue30,
      last7: revenue7,
      currency: "usd",
    },
    orders: {
      count: orders.length,
      last30: orders.filter((order) => inLastDays(order.paidAt, 30)).length,
      last7: orders.filter((order) => inLastDays(order.paidAt, 7)).length,
    },
    leads: {
      count: leads.length,
      last7: leads.filter((lead) => inLastDays(lead.createdAt, 7)).length,
      quotes: leads.filter((lead) => lead.intent === "quote").length,
      support: leads.filter((lead) => lead.intent === "support").length,
      reminders: leads.filter((lead) => lead.intent === "reminder").length,
    },
    pipeline,
    customers: { count: customers },
    catalog: {
      sellableSizes: FILTER_SIZES.length,
      archivedSizes: ALL_FILTER_SIZES.length,
      sellableOnly: SELLABLE_ONLY,
      skus: sellableSheetProducts().length,
      brands: HVAC_BRAND_LIST.length,
    },
    recentOrders: orders.slice(0, 8),
    recentLeads: leads.slice(0, 8),
  };
}

async function pipelineSnapshot() {
  const db = getDb();
  if (!db) {
    return { enabled: false, open: 0, overdue: 0, unscheduled: 0, byStage: [] as { id: string; count: number }[] };
  }
  const [{ data: deals, error: dealError }, { data: stages, error: stageError }] = await Promise.all([
    db
      .from("crm_deals")
      .select("id, stage_id, next_action_at, closed_at")
      .eq("pipeline_id", "quotes")
      .limit(2000),
    db
      .from("crm_stages")
      .select("id, label, display_order")
      .eq("pipeline_id", "quotes")
      .order("display_order", { ascending: true }),
  ]);
  if (dealError || stageError) {
    return { enabled: true, open: 0, overdue: 0, unscheduled: 0, byStage: [] as { id: string; count: number }[] };
  }
  const rows = (deals ?? []) as {
    id: string;
    stage_id: string;
    next_action_at: string | null;
    closed_at: string | null;
  }[];
  const now = Date.now();
  const open = rows.filter((deal) => !deal.closed_at);
  const overdue = open.filter(
    (deal) => deal.next_action_at && new Date(deal.next_action_at).getTime() < now,
  ).length;
  const unscheduled = open.filter((deal) => !deal.next_action_at).length;
  const counts = new Map<string, number>();
  for (const deal of rows) {
    counts.set(deal.stage_id, (counts.get(deal.stage_id) ?? 0) + 1);
  }
  return {
    enabled: true,
    open: open.length,
    overdue,
    unscheduled,
    byStage: ((stages ?? []) as { id: string; label: string }[]).map((stage) => ({
      id: stage.id,
      label: stage.label,
      count: counts.get(stage.id) ?? 0,
    })),
  };
}

async function customerCount(): Promise<number> {
  const db = getAccountDb();
  if (!db) return 0;
  const { count, error } = await db
    .from("customer_profiles")
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function listAdminCustomers(opts: { q?: string; limit?: number } = {}) {
  const db = getAccountDb();
  if (!db) return { enabled: false as const, rows: [] as AdminCustomer[] };
  const { data, error } = await db
    .from("customer_profiles")
    .select(
      "id, email, first_name, last_name, phone, city, region, postal_code, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (error) throw new Error(error.message);
  const needle = (opts.q ?? "").trim().toLowerCase();
  const orders = listAllOrders();
  const rows = ((data ?? []) as AdminCustomerRow[]).map((row) => {
    const email = row.email.toLowerCase();
    const theirs = orders.filter((order) => (order.customerEmail || "").toLowerCase() === email);
    const spent = theirs.reduce((sum, order) => sum + cents(order.amountTotal), 0);
    return {
      ...row,
      orderCount: theirs.length,
      spent,
    };
  });
  return {
    enabled: true as const,
    rows: rows.filter((row) =>
      matchesQuery(
        `${row.email} ${row.first_name ?? ""} ${row.last_name ?? ""} ${row.phone ?? ""}`,
        needle,
      ),
    ),
  };
}

type AdminCustomerRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminCustomer = AdminCustomerRow & { orderCount: number; spent: number };

export async function getAdminCustomer(id: string) {
  const db = getAccountDb();
  if (!db) return null;
  const { data, error } = await db
    .from("customer_profiles")
    .select(
      "id, auth_user_id, email, first_name, last_name, phone, address_line1, address_line2, city, region, postal_code, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const profile = data as AdminCustomerRow & {
    auth_user_id: string;
    address_line1: string | null;
    address_line2: string | null;
  };
  const { data: filters, error: filterError } = await db
    .from("customer_saved_filters")
    .select("id, product_id, size, merv, name, notes, source, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });
  if (filterError) throw new Error(filterError.message);
  const orders = listAdminOrders({ q: profile.email, limit: 50 }).filter(
    (order) => (order.customerEmail || "").toLowerCase() === profile.email.toLowerCase(),
  );
  return { profile, filters: filters ?? [], orders };
}

export async function listAdminContacts(opts: { q?: string; limit?: number } = {}) {
  const db = getDb();
  if (!db) return { enabled: false as const, rows: [] as AdminContact[] };
  const { data, error } = await db
    .from("crm_contacts")
    .select(
      "id, email, first_name, last_name, phone, klaviyo_profile_id, stripe_customer_id, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (error) throw new Error(error.message);
  const needle = (opts.q ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as AdminContact[]).filter((row) =>
    matchesQuery(`${row.email} ${row.first_name ?? ""} ${row.last_name ?? ""} ${row.phone ?? ""}`, needle),
  );
  return { enabled: true as const, rows };
}

export type AdminContact = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  klaviyo_profile_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function listAdminAudit(limit = 80) {
  const db = getDb();
  if (!db) return { enabled: false as const, rows: [] as AdminAudit[] };
  const { data, error } = await db
    .from("crm_audit_log")
    .select("id, actor_email, action, entity, entity_id, at")
    .order("at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return { enabled: true as const, rows: (data ?? []) as AdminAudit[] };
}

export type AdminAudit = {
  id: number;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  at: string;
};

export function catalogSnapshot(opts: { q?: string; limit?: number } = {}) {
  const products = sellableSheetProducts();
  const needle = (opts.q ?? "").trim().toLowerCase();
  const matched = needle
    ? products.filter(
        (product) =>
          product.size.toLowerCase().includes(needle) ||
          product.name.toLowerCase().includes(needle) ||
          String(product.merv) === needle ||
          String(product.id) === needle,
      )
    : products;
  const limit = opts.limit ?? 80;
  return {
    sellableOnly: SELLABLE_ONLY,
    sizeCount: FILTER_SIZES.length,
    archivedSizeCount: ALL_FILTER_SIZES.length,
    skuCount: products.length,
    thicknesses: [...THICKNESSES],
    merv: MERV_TYPES.map((type) => ({
      key: type.key,
      label: type.name,
    })),
    featuredSizes: loadSiteConfig().featuredSizeSlugs,
    defaultFeaturedSizes: popularSizeSlugs(12),
    products: matched.slice(0, limit).map((product) => ({
      id: product.id,
      size: product.size,
      merv: product.merv,
      isCarbon: Boolean(product.isCarbon),
      price: product.price,
      inStock: product.inStock,
      name: product.name,
      wholesaleSku: wholesaleSkuFor(product.size, product.merv, Boolean(product.isCarbon)) || null,
      stripeProductId:
        mappedStripeProductId(product.id, stripeKeyIsLive()) ||
        catalogStripeProductId(product.id),
    })),
    matched: matched.length,
  };
}

export function analyticsSnapshot() {
  const orders = newestFirst(listAllOrders(), "paidAt").map(presentOrder);
  const leads = newestFirst(listAllLeads(), "createdAt").map(presentLead);
  const days = lastNDayKeys(30);
  const revenueByDay = days.map((day) => ({
    day,
    revenue: orders
      .filter((order) => dayKey(order.paidAt) === day)
      .reduce((sum, order) => sum + cents(order.amountTotal), 0),
    orders: orders.filter((order) => dayKey(order.paidAt) === day).length,
  }));
  const leadsByDay = days.map((day) => ({
    day,
    quotes: leads.filter((lead) => dayKey(lead.createdAt) === day && lead.intent === "quote").length,
    support: leads.filter((lead) => dayKey(lead.createdAt) === day && lead.intent === "support").length,
    reminders: leads.filter((lead) => dayKey(lead.createdAt) === day && lead.intent === "reminder")
      .length,
  }));
  const skuCounts = new Map<string, { size: string; quantity: number; revenue: number }>();
  for (const order of orders) {
    const share =
      order.items.reduce((sum, item) => sum + item.quantity, 0) || order.items.length || 1;
    for (const item of order.items) {
      const key = item.size || `#${item.productId}`;
      const current = skuCounts.get(key) ?? { size: key, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Math.round(cents(order.amountTotal) * (item.quantity / share));
      skuCounts.set(key, current);
    }
  }
  const topSizes = [...skuCounts.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 12);
  const paid = orders.filter((order) => cents(order.amountTotal) > 0);
  const aov = paid.length ? Math.round(paid.reduce((sum, order) => sum + cents(order.amountTotal), 0) / paid.length) : 0;
  return {
    revenueByDay,
    leadsByDay,
    topSizes,
    aov,
    orderCount: orders.length,
    leadCount: leads.length,
    intent: {
      quote: leads.filter((lead) => lead.intent === "quote").length,
      support: leads.filter((lead) => lead.intent === "support").length,
      reminder: leads.filter((lead) => lead.intent === "reminder").length,
    },
  };
}

function fileStat(name: string) {
  const file = dataFile(name);
  if (!fs.existsSync(file)) {
    return { name, exists: false, bytes: 0, records: 0, updatedAt: null as string | null };
  }
  const stat = fs.statSync(file);
  let records = 0;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as unknown;
    records = Array.isArray(parsed) ? parsed.length : parsed && typeof parsed === "object" ? 1 : 0;
  } catch {
    records = 0;
  }
  return {
    name,
    exists: true,
    bytes: stat.size,
    records,
    updatedAt: stat.mtime.toISOString(),
  };
}

function present(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return Boolean(trimmed) && !trimmed.includes("...");
}

export function securitySnapshot() {
  const production = process.env.NODE_ENV === "production";
  return {
    production,
    auth: {
      supabaseUrl: present(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      anonKey: present(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      serviceRole: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      staffAllowlist: (process.env.STAFF_EMAILS || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean).length,
    },
    turnstile: {
      secret: present(process.env.TURNSTILE_SECRET_KEY),
      siteKey: present(process.env.VITE_TURNSTILE_SITE_KEY),
      enforcedInProduction: production,
    },
    headers: [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
      "Content-Security-Policy",
    ],
    hsts: production,
    rateLimits: [
      { name: "Contact", window: "15 min", max: 5 },
      { name: "Checkout", window: "15 min", max: 10 },
      { name: "Identify", window: "1 min", max: 20 },
      { name: "Track", window: "1 min", max: 40 },
      { name: "CRM", window: "1 min", max: 60 },
      { name: "Admin", window: "1 min", max: 80 },
    ],
    rls: "deny-by-default — browser never queries Postgres",
    notes: [
      "Staff access is STAFF_EMAILS plus a verified Supabase session.",
      "The CRM never sends email and never writes Klaviyo.",
      "Adding staff means editing STAFF_EMAILS and restarting the server.",
    ],
  };
}

export function settingsSnapshot() {
  const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || "").trim();
  return {
    siteUrl: siteUrl || "https://filterhero.net",
    clientUrl: (process.env.CLIENT_URL || "").trim() || "http://localhost:3000",
    catalog: {
      fullCatalog: process.env.VITE_FULL_CATALOG === "true" || process.env.FULL_CATALOG === "true",
      sellableOnly: SELLABLE_ONLY,
    },
    flags: {
      crmDisable: process.env.CRM_DISABLE === "1",
      accountDisable: process.env.ACCOUNT_DISABLE === "1",
    },
    integrations: {
      stripe: present(process.env.STRIPE_SECRET_KEY),
      stripePublishable: present(
        process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY,
      ),
      stripeWebhook: present(process.env.STRIPE_WEBHOOK_SECRET),
      klaviyoPrivate: present(process.env.KLAVIYO_PRIVATE_API_KEY),
      klaviyoPublic: present(process.env.KLAVIYO_PUBLIC_API_KEY),
      klaviyoList: present(process.env.KLAVIYO_LIST_ID),
      resend: present(process.env.RESEND_API_KEY),
      resendFrom: (process.env.RESEND_FROM || "").trim() || null,
      contactTo: (process.env.CONTACT_TO || "").trim() || null,
      supabase: present(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      turnstile: present(process.env.TURNSTILE_SECRET_KEY),
      intuit: present(process.env.INTUIT_CLIENT_ID) && present(process.env.INTUIT_CLIENT_SECRET),
    },
    intuit: {
      ...intuitPublicStatus(),
      redirectUri: intuitConfigFromEnv()?.redirectUri ?? null,
    },
    links: {
      stripe: "https://dashboard.stripe.com",
      stripeTax: "https://dashboard.stripe.com/tax/registrations",
      stripeTaxSettings: "https://dashboard.stripe.com/settings/tax",
      klaviyo: "https://www.klaviyo.com/dashboard",
      resend: "https://resend.com/emails",
      supabase: (process.env.SUPABASE_URL || "").replace(/\/$/, "") + "/project/default",
    },
  };
}

export function staffSnapshot() {
  const emails = (process.env.STAFF_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return {
    source: "STAFF_EMAILS",
    emails,
    note: "Staff is an env allowlist, not a database role. Add an inbox there and restart. The CRM never emails shoppers — staff write from their own mailbox.",
  };
}

export function trackingSnapshot() {
  return {
    clientMetrics: [...CLIENT_METRICS],
    serverEvents: [
      "Started Checkout",
      "Checkout Expired",
      "Placed Order",
      "Ordered Product",
      "Requested Quote",
      "Requested Support",
      "Signed Up Reminder",
    ],
    identifyPath: "/api/identify",
    trackPath: "/api/track",
    catalogFeed: "/api/klaviyo/catalog.json",
    channels: {
      resend: "Branded transactional receipts and staff lead alerts",
      klaviyo: "Marketing profiles, flows, and shopper events",
      stripe: "Payment receipts",
      crm: "Staff pipeline only — never mail, never Klaviyo writes",
    },
  };
}

export function maintenanceSnapshot() {
  const config = loadSiteConfig();
  return {
    maintenanceMode: config.maintenanceMode,
    maintenanceMessage: config.maintenanceMessage,
    checkoutPaused: config.maintenanceMode,
    flags: {
      crmDisable: process.env.CRM_DISABLE === "1",
      accountDisable: process.env.ACCOUNT_DISABLE === "1",
      nodeEnv: process.env.NODE_ENV || "development",
      dataDir: process.env.DATA_DIR || "server/data",
    },
    files: [
      fileStat("orders.json"),
      fileStat("leads.json"),
      fileStat("site-config.json"),
    ],
  };
}
