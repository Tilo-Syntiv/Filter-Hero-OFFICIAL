import { z } from "zod";
import { getProductById } from "../shared/products";
import type { CustomerActor } from "./auth";
import { getAccountDb, isAccountEnabled } from "./db";
import { listOrdersForEmail, type StoredOrder } from "./stripe";

/**
 * Customer account store.
 *
 * Isolation is requireCustomer plus "this row belongs to this auth user".
 * The browser never queries Postgres. orders.json stays the append-only
 * purchase log — history is filtered by the verified session email, never
 * by a caller-supplied address.
 */

export type AccountResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

export type CustomerProfile = {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedFilter = {
  id: string;
  profile_id: string;
  product_id: number;
  size: string;
  merv: number;
  name: string | null;
  notes: string | null;
  source: "manual" | "purchase";
  created_at: string;
};

export type AccountOrderItem = {
  productId: number;
  quantity: number;
  size: string | null;
  name: string | null;
};

export type AccountOrder = {
  id: string;
  paidAt: string;
  amountTotal: number | null;
  currency: string | null;
  items: AccountOrderItem[];
};

export type AccountSnapshot = {
  profile: CustomerProfile;
  filters: SavedFilter[];
  orders: AccountOrder[];
};

const PROFILE_COLUMNS =
  "id, auth_user_id, email, first_name, last_name, phone, address_line1, address_line2, city, region, postal_code, created_at, updated_at";

const FILTER_COLUMNS =
  "id, profile_id, product_id, size, merv, name, notes, source, created_at";

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  addressLine1: z.string().trim().max(120).optional(),
  addressLine2: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(40).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

export const saveFilterSchema = z.object({
  productId: z.number().int().positive(),
  notes: z.string().trim().max(240).optional(),
});

function failure(error: string, code: string): AccountResult<never> {
  return { ok: false, error, code };
}

function parseOrderItems(raw: string): AccountOrderItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items: AccountOrderItem[] = [];
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

export function ordersForCustomer(email: string, orders: StoredOrder[]): AccountOrder[] {
  const needle = email.trim().toLowerCase();
  if (!needle) return [];
  return orders
    .filter((order) => (order.customerEmail || "").toLowerCase() === needle)
    .sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))
    .map((order) => ({
      id: order.id,
      paidAt: order.paidAt,
      amountTotal: order.amountTotal,
      currency: order.currency,
      items: parseOrderItems(order.items),
    }));
}

async function loadProfile(actor: CustomerActor): Promise<AccountResult<CustomerProfile>> {
  const db = getAccountDb();
  if (!db) return failure("Customer accounts are not configured.", "account_disabled");

  const email = actor.email.trim().toLowerCase();
  const { data: existing, error: lookupError } = await db
    .from("customer_profiles")
    .select(PROFILE_COLUMNS)
    .eq("auth_user_id", actor.id)
    .maybeSingle();
  if (lookupError) return failure(lookupError.message, "query_failed");
  if (existing) return { ok: true, data: existing as CustomerProfile };

  const { data, error } = await db
    .from("customer_profiles")
    .upsert(
      { auth_user_id: actor.id, email, updated_at: new Date().toISOString() },
      { onConflict: "auth_user_id" },
    )
    .select(PROFILE_COLUMNS)
    .single();
  if (error) return failure(error.message, "upsert_failed");
  return { ok: true, data: data as CustomerProfile };
}

async function listSavedFilters(profileId: string): Promise<AccountResult<SavedFilter[]>> {
  const db = getAccountDb();
  if (!db) return failure("Customer accounts are not configured.", "account_disabled");
  const { data, error } = await db
    .from("customer_saved_filters")
    .select(FILTER_COLUMNS)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) return failure(error.message, "query_failed");
  return { ok: true, data: (data as SavedFilter[]) ?? [] };
}

async function syncPurchasedFilters(profile: CustomerProfile): Promise<void> {
  const db = getAccountDb();
  if (!db) return;
  const orders = ordersForCustomer(profile.email, listOrdersForEmail(profile.email));
  for (const order of orders) {
    for (const item of order.items) {
      const product = getProductById(item.productId);
      if (!product) continue;
      await db.from("customer_saved_filters").upsert(
        {
          profile_id: profile.id,
          product_id: product.id,
          size: product.size,
          merv: product.merv,
          name: product.isCarbon ? `${product.name} (Carbon)` : product.name,
          source: "purchase",
        },
        { onConflict: "profile_id,product_id", ignoreDuplicates: true },
      );
    }
  }
}

export async function getAccount(actor: CustomerActor): Promise<AccountResult<AccountSnapshot>> {
  if (!isAccountEnabled()) {
    return failure("Customer accounts are not configured.", "account_disabled");
  }
  const profile = await loadProfile(actor);
  if (!profile.ok) return profile;
  try {
    await syncPurchasedFilters(profile.data);
  } catch (err) {
    console.error("[account] purchase backfill failed", err);
  }
  const filters = await listSavedFilters(profile.data.id);
  if (!filters.ok) return filters;
  return {
    ok: true,
    data: {
      profile: profile.data,
      filters: filters.data,
      orders: ordersForCustomer(actor.email, listOrdersForEmail(actor.email)),
    },
  };
}

export async function updateProfile(
  actor: CustomerActor,
  input: z.infer<typeof profileUpdateSchema>,
): Promise<AccountResult<CustomerProfile>> {
  const profile = await loadProfile(actor);
  if (!profile.ok) return profile;
  const db = getAccountDb();
  if (!db) return failure("Customer accounts are not configured.", "account_disabled");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.firstName !== undefined) patch.first_name = input.firstName || null;
  if (input.lastName !== undefined) patch.last_name = input.lastName || null;
  if (input.phone !== undefined) patch.phone = input.phone || null;
  if (input.addressLine1 !== undefined) patch.address_line1 = input.addressLine1 || null;
  if (input.addressLine2 !== undefined) patch.address_line2 = input.addressLine2 || null;
  if (input.city !== undefined) patch.city = input.city || null;
  if (input.region !== undefined) patch.region = input.region || null;
  if (input.postalCode !== undefined) patch.postal_code = input.postalCode || null;

  const { data, error } = await db
    .from("customer_profiles")
    .update(patch)
    .eq("id", profile.data.id)
    .eq("auth_user_id", actor.id)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) return failure(error.message, "update_failed");
  return { ok: true, data: data as CustomerProfile };
}

export async function saveFilter(
  actor: CustomerActor,
  input: z.infer<typeof saveFilterSchema>,
  source: "manual" | "purchase" = "manual",
): Promise<AccountResult<SavedFilter>> {
  const product = getProductById(input.productId);
  if (!product) return failure("Unknown product.", "unknown_product");

  const profile = await loadProfile(actor);
  if (!profile.ok) return profile;
  const db = getAccountDb();
  if (!db) return failure("Customer accounts are not configured.", "account_disabled");

  const row = {
    profile_id: profile.data.id,
    product_id: product.id,
    size: product.size,
    merv: product.merv,
    name: product.isCarbon ? `${product.name} (Carbon)` : product.name,
    notes: input.notes || null,
    source,
  };

  const { data, error } = await db
    .from("customer_saved_filters")
    .upsert(row, { onConflict: "profile_id,product_id" })
    .select(FILTER_COLUMNS)
    .single();
  if (error) return failure(error.message, "upsert_failed");
  return { ok: true, data: data as SavedFilter };
}

export async function removeFilter(
  actor: CustomerActor,
  filterId: string,
): Promise<AccountResult<{ id: string }>> {
  if (!z.string().uuid().safeParse(filterId).success) {
    return failure("Unknown filter.", "not_found");
  }
  const profile = await loadProfile(actor);
  if (!profile.ok) return profile;
  const db = getAccountDb();
  if (!db) return failure("Customer accounts are not configured.", "account_disabled");

  const { data, error } = await db
    .from("customer_saved_filters")
    .delete()
    .eq("id", filterId)
    .eq("profile_id", profile.data.id)
    .select("id")
    .maybeSingle();
  if (error) return failure(error.message, "delete_failed");
  if (!data) return failure("Unknown filter.", "not_found");
  return { ok: true, data: { id: data.id as string } };
}

/**
 * After a paid order, attach purchased SKUs to the matching profile.
 * Fail-soft: a missing profile or a downed table must never fail the webhook.
 */
export async function recordPurchaseOnAccount(order: StoredOrder): Promise<void> {
  if (!isAccountEnabled() || !order.customerEmail) return;
  const db = getAccountDb();
  if (!db) return;

  const email = order.customerEmail.trim().toLowerCase();
  const { data: profile, error } = await db
    .from("customer_profiles")
    .select("id, auth_user_id, first_name, last_name, phone, address_line1, city, region, postal_code")
    .eq("email", email)
    .maybeSingle();
  if (error || !profile) return;

  const shipping = order.shipping?.address;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const assignIfBlank = (column: string, value: string | null | undefined, current: unknown) => {
    if (!value) return;
    if (current) return;
    patch[column] = value;
  };
  const name = order.shipping?.name?.trim() || "";
  const [firstName, ...rest] = name.split(/\s+/);
  assignIfBlank("first_name", firstName, profile.first_name);
  assignIfBlank("last_name", rest.join(" ") || null, profile.last_name);
  assignIfBlank("phone", order.phone, profile.phone);
  assignIfBlank("address_line1", shipping?.line1, profile.address_line1);
  assignIfBlank("city", shipping?.city, profile.city);
  assignIfBlank("region", shipping?.state, profile.region);
  assignIfBlank("postal_code", shipping?.postal_code, profile.postal_code);
  if (Object.keys(patch).length > 1) {
    await db.from("customer_profiles").update(patch).eq("id", profile.id);
  }

  const items = parseOrderItems(order.items);
  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) continue;
    await db.from("customer_saved_filters").upsert(
      {
        profile_id: profile.id,
        product_id: product.id,
        size: product.size,
        merv: product.merv,
        name: product.isCarbon ? `${product.name} (Carbon)` : product.name,
        source: "purchase",
      },
      { onConflict: "profile_id,product_id", ignoreDuplicates: true },
    );
  }
}
