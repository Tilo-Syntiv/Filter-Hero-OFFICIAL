import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared Supabase Auth client for staff (/admin) and shoppers (/login).
 *
 * Supabase is used for authentication only. CRM reads go through /api/crm/*,
 * customer reads through /api/account/*. The browser never queries Postgres,
 * which is why RLS is deny-by-default with no policies.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

export function authClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    url && anonKey
      ? createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: "pkce",
          },
        })
      : null;
  return client;
}

export function isAdminConfigured(): boolean {
  return Boolean(url && anonKey);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function accessToken(): Promise<string | null> {
  const supabase = authClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Shared by CRM, customer account, and the staff console. Same session, different API prefix. */
export async function authedFetch<T>(
  prefix: "/api/crm" | "/api/account" | "/api/admin",
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await accessToken();
  if (!token) throw new ApiError("Sign in required.", 401, "unauthenticated");

  const res = await fetch(`${prefix}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: string;
    code?: string;
  };

  if (!res.ok || payload.ok === false) {
    throw new ApiError(
      payload.error || "Request failed.",
      res.status,
      payload.code,
    );
  }
  return payload.data as T;
}

export async function crmFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return authedFetch<T>("/api/crm", path, init);
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return authedFetch<T>("/api/admin", path, init);
}

// --- Shapes returned by the API --------------------------------------------

export type Stage = {
  id: string;
  label: string;
  display_order: number;
  closed_won: boolean;
  closed_lost: boolean;
};

export type Deal = {
  id: string;
  name: string;
  stage_id: string;
  contact_id: string | null;
  owner_id: string | null;
  amount: string | number | null;
  next_action_at: string | null;
  closed_at: string | null;
  lost_reason: string | null;
  source: string;
  lead_id: string | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

export type Activity = {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  status: string | null;
  due_at: string | null;
  occurred_at: string;
};

export type DealDetail = {
  deal: Deal;
  contact: Contact | null;
  activities: Activity[];
};

export const listStages = () => crmFetch<Stage[]>("/stages");

export const listDeals = () => crmFetch<Deal[]>("/deals?limit=200");

export const getDealDetail = (id: string) => crmFetch<DealDetail>(`/deals/${id}`);

export const patchDeal = (id: string, patch: Record<string, unknown>) =>
  crmFetch<Deal>(`/deals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const addNote = (dealId: string, body: string) =>
  crmFetch<Activity>("/activities", {
    method: "POST",
    body: JSON.stringify({ type: "note", dealId, body }),
  });

// --- Display helpers --------------------------------------------------------

export function dealAmount(deal: Deal): number | null {
  if (deal.amount === null) return null;
  const value = typeof deal.amount === "string" ? Number(deal.amount) : deal.amount;
  return Number.isFinite(value) ? value : null;
}

export function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** A deal is overdue when its next action has passed and it is still open.
 *  Closed deals have their next action cleared, so they never light up. */
export function isOverdue(deal: Deal): boolean {
  if (deal.closed_at || !deal.next_action_at) return false;
  return new Date(deal.next_action_at).getTime() < Date.now();
}

/** No next action on an open deal is how quotes went quiet in the first
 *  place, so the board calls it out rather than leaving the cell blank. */
export function isUnscheduled(deal: Deal): boolean {
  return !deal.closed_at && !deal.next_action_at;
}

export function formatCents(value: number | null | undefined, currency = "usd"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return (value / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  amountTotal: number | null;
  amountSubtotal: number | null;
  amountTax: number | null;
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
  intent: "quote" | "support" | "reminder";
  cartSummary: string;
  marketingConsent: boolean;
};

export type AdminOverview = {
  revenue: { all: number; last30: number; last7: number; currency: string };
  orders: { count: number; last30: number; last7: number };
  leads: {
    count: number;
    last7: number;
    quotes: number;
    support: number;
    reminders: number;
  };
  pipeline: {
    enabled: boolean;
    open: number;
    overdue: number;
    unscheduled: number;
    byStage: { id: string; label: string; count: number }[];
  };
  customers: { count: number };
  catalog: {
    sellableSizes: number;
    archivedSizes: number;
    sellableOnly: boolean;
    skus: number;
    brands: number;
  };
  recentOrders: AdminOrder[];
  recentLeads: AdminLead[];
};

export type AdminCustomer = {
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
  orderCount: number;
  spent: number;
};

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

export type AdminAudit = {
  id: number;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  at: string;
};

export type AdminAnalytics = {
  revenueByDay: { day: string; revenue: number; orders: number }[];
  leadsByDay: { day: string; quotes: number; support: number; reminders: number }[];
  topSizes: { size: string; quantity: number; revenue: number }[];
  aov: number;
  orderCount: number;
  leadCount: number;
  intent: { quote: number; support: number; reminder: number };
};

export const getOverview = () => adminFetch<AdminOverview>("/overview");
export const listAdminOrders = (q = "") =>
  adminFetch<AdminOrder[]>(`/orders${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const getAdminOrder = (id: string) => adminFetch<AdminOrder>(`/orders/${id}`);
export const listAdminLeads = (q = "", intent = "") => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (intent) params.set("intent", intent);
  const suffix = params.toString() ? `?${params}` : "";
  return adminFetch<AdminLead[]>(`/leads${suffix}`);
};
export const listAdminCustomers = (q = "") =>
  adminFetch<{ enabled: boolean; rows: AdminCustomer[] }>(
    `/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );
export const getAdminCustomer = (id: string) =>
  adminFetch<{
    profile: AdminCustomer & { auth_user_id: string; address_line1: string | null; address_line2: string | null };
    filters: {
      id: string;
      product_id: number;
      size: string;
      merv: number;
      name: string | null;
      notes: string | null;
      source: string;
      created_at: string;
    }[];
    orders: AdminOrder[];
  }>(`/customers/${id}`);
export const listAdminContacts = (q = "") =>
  adminFetch<{ enabled: boolean; rows: AdminContact[] }>(
    `/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );
export const getAdminCatalog = (q = "") =>
  adminFetch<{
    sellableOnly: boolean;
    sizeCount: number;
    archivedSizeCount: number;
    skuCount: number;
    thicknesses: number[];
    merv: { key: string; label: string }[];
    featuredSizes: string[];
    defaultFeaturedSizes: string[];
    products: {
      id: number;
      size: string;
      merv: number;
      isCarbon: boolean;
      price: number;
      inStock: boolean;
      name: string;
      wholesaleSku: string | null;
      stripeProductId: string;
    }[];
    matched: number;
  }>(`/catalog${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const getAdminAnalytics = () => adminFetch<AdminAnalytics>("/analytics");
export const getAdminTracking = () =>
  adminFetch<{
    clientMetrics: string[];
    serverEvents: string[];
    identifyPath: string;
    trackPath: string;
    catalogFeed: string;
    channels: Record<string, string>;
  }>("/tracking");
export const getAdminHealth = () =>
  adminFetch<{
    crm: { enabled: boolean; reachable: boolean; stages: number; error?: string };
    account: { enabled: boolean; reachable: boolean; error?: string };
    klaviyo: {
      enabled: boolean;
      publicKey: boolean;
      listConfigured: boolean;
      account?: string;
      error?: string;
    };
    stripe: { configured: boolean };
    resend: { configured: boolean };
  }>("/health");
export const getAdminSecurity = () =>
  adminFetch<{
    production: boolean;
    auth: {
      supabaseUrl: boolean;
      anonKey: boolean;
      serviceRole: boolean;
      staffAllowlist: number;
    };
    turnstile: { secret: boolean; siteKey: boolean; enforcedInProduction: boolean };
    headers: string[];
    hsts: boolean;
    rateLimits: { name: string; window: string; max: number }[];
    rls: string;
    notes: string[];
    audit: { enabled: boolean; rows: AdminAudit[] };
  }>("/security");
export const getAdminStaff = () =>
  adminFetch<{ source: string; emails: string[]; note: string }>("/staff");
export const getAdminSettings = () =>
  adminFetch<{
    siteUrl: string;
    clientUrl: string;
    catalog: { fullCatalog: boolean; sellableOnly: boolean };
    flags: { crmDisable: boolean; accountDisable: boolean };
    integrations: Record<string, boolean | string | null>;
    intuit: {
      configured: boolean;
      connected: boolean;
      needsReauthorize: boolean;
      environment: "sandbox" | "production" | null;
      realmId: string | null;
      connectedAt: string | null;
      accessExpiresAt: number | null;
      refreshExpiresAt: number | null;
      lastError: string | null;
      redirectUri: string | null;
    };
    links: Record<string, string>;
    stripeTax?: {
      configured: boolean;
      settingsStatus: "active" | "pending" | null;
      automaticTax: boolean;
      collecting: boolean;
      headOfficeReady: boolean;
      registrations: { country: string; state: string | null; status: string }[];
    };
    klaviyoStripe: {
      shopEvents: boolean;
      configured: boolean;
      nativeWebhook: boolean;
      fulfillmentConflict: boolean;
      nativeConflict: boolean;
      url: string | null;
      connectUrl: string;
      companyId: string;
      stripeAccountId: string | null;
      stripeAccountName: string | null;
      webhookId: string | null;
      oauthAccountMatch: boolean;
    };
  }>("/settings");
export const connectKlaviyoStripe = () =>
  adminFetch<{
    id: string;
    url: string;
    created: boolean;
    secret: string | null;
    secretLast4: string | null;
    connectUrl: string;
  }>("/klaviyo-stripe/connect", { method: "POST" });
export const startIntuitConnect = () =>
  adminFetch<{ url: string }>("/intuit/connect", { method: "POST" });
export const disconnectIntuit = () =>
  adminFetch<{ connected: boolean }>("/intuit/disconnect", { method: "POST" });
export const getAdminMaintenance = () =>
  adminFetch<{
    maintenanceMode: boolean;
    maintenanceMessage: string;
    checkoutPaused: boolean;
    flags: {
      crmDisable: boolean;
      accountDisable: boolean;
      nodeEnv: string;
      dataDir: string;
    };
    files: {
      name: string;
      exists: boolean;
      bytes: number;
      records: number;
      updatedAt: string | null;
    }[];
  }>("/maintenance");
export const getAdminConfig = () => adminFetch<import("@shared/site-config").SiteConfig>("/config");
export const patchAdminConfig = (patch: Record<string, unknown>) =>
  adminFetch<import("@shared/site-config").SiteConfig>("/config", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const createContact = (input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) =>
  crmFetch<AdminContact>("/contacts", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const createDeal = (input: {
  name: string;
  contactId?: string;
  amount?: number;
  nextActionAt?: string;
}) =>
  crmFetch<Deal>("/deals", {
    method: "POST",
    body: JSON.stringify({ ...input, source: "manual" }),
  });
