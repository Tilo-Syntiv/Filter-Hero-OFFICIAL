/**
 * Non-customers: guests and Filter Clock saves who have no account.
 *
 * status is always `not_an_actual_customer`. Never put these in crm_contacts
 * (FH-131 / FH-387 — clock is not a sales opportunity). When the email already
 * belongs to a customer_profiles row, attach cadence / PII there instead.
 *
 * Any capture of full name + address + email + phone must land in Supabase:
 * customer_profiles if they have an account, else non_customers.
 */
import { z } from "zod";
import { getAccountDb, isAccountEnabled } from "./db";

export const NON_CUSTOMER_STATUS = "not_an_actual_customer" as const;

export const NON_CUSTOMER_SOURCES = [
  "filter_clock",
  "checkout",
  "contact",
  "stock_alert",
  "other",
] as const;

export type NonCustomerSource = (typeof NON_CUSTOMER_SOURCES)[number];

export type PersonCapture = {
  email: string;
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  source: NonCustomerSource;
  leadId?: string;
  cadence?: Record<string, unknown>;
  properties?: Record<string, unknown>;
};

export type StorePersonResult =
  | { ok: true; kind: "customer" | "non_customer"; id: string }
  | { ok: false; skipped?: boolean; error: string };

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(200)
  .transform((value) => value.toLowerCase());

function blankToNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mergeJson(
  existing: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!next || Object.keys(next).length === 0) return existing || {};
  return { ...(existing || {}), ...next };
}

function splitFullName(fullName: string | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  const trimmed = fullName?.trim() || "";
  if (!trimmed || /^filter clock/i.test(trimmed)) {
    return { firstName: null, lastName: null };
  }
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

/** True when the capture has the four identity fields the shop must keep. */
export function hasIdentityBundle(input: {
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
}): boolean {
  return Boolean(
    input.email?.trim() &&
      input.fullName?.trim() &&
      input.phone?.trim() &&
      input.addressLine1?.trim(),
  );
}

async function findCustomerProfileId(email: string): Promise<string | null> {
  const db = getAccountDb();
  if (!db) return null;
  const { data, error } = await db
    .from("customer_profiles")
    .select("id, properties")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.error("[non-customers] customer lookup failed", error.message);
    return null;
  }
  return data?.id ?? null;
}

async function attachToCustomer(
  profileId: string,
  input: PersonCapture,
): Promise<StorePersonResult> {
  const db = getAccountDb();
  if (!db) return { ok: false, skipped: true, error: "account_disabled" };

  const { data: existing, error: readError } = await db
    .from("customer_profiles")
    .select(
      "id, first_name, last_name, phone, address_line1, address_line2, city, region, postal_code, properties",
    )
    .eq("id", profileId)
    .single();
  if (readError || !existing) {
    return { ok: false, error: readError?.message || "customer_not_found" };
  }

  const { firstName, lastName } = splitFullName(input.fullName);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    properties: mergeJson(
      (existing.properties as Record<string, unknown> | null) || {},
      {
        ...(input.properties || {}),
        ...(input.cadence ? { cadence: input.cadence } : {}),
        last_capture_source: input.source,
        ...(input.leadId ? { last_lead_id: input.leadId } : {}),
      },
    ),
  };
  const assignIfBlank = (column: string, value: string | null, current: unknown) => {
    if (!value) return;
    if (current) return;
    patch[column] = value;
  };
  assignIfBlank("first_name", firstName, existing.first_name);
  assignIfBlank("last_name", lastName, existing.last_name);
  assignIfBlank("phone", blankToNull(input.phone), existing.phone);
  assignIfBlank("address_line1", blankToNull(input.addressLine1), existing.address_line1);
  assignIfBlank("address_line2", blankToNull(input.addressLine2), existing.address_line2);
  assignIfBlank("city", blankToNull(input.city), existing.city);
  assignIfBlank("region", blankToNull(input.region), existing.region);
  assignIfBlank("postal_code", blankToNull(input.postalCode), existing.postal_code);

  const { error } = await db.from("customer_profiles").update(patch).eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "customer", id: profileId };
}

async function upsertNonCustomer(input: PersonCapture, email: string): Promise<StorePersonResult> {
  const db = getAccountDb();
  if (!db) return { ok: false, skipped: true, error: "account_disabled" };

  const { data: existing } = await db
    .from("non_customers")
    .select("id, full_name, phone, address_line1, address_line2, city, region, postal_code, country, cadence, properties, lead_id")
    .eq("email", email)
    .maybeSingle();

  const row = {
    email,
    full_name:
      blankToNull(input.fullName) && !/^filter clock/i.test(input.fullName!.trim())
        ? blankToNull(input.fullName)
        : existing?.full_name ?? null,
    phone: blankToNull(input.phone) || existing?.phone || null,
    address_line1: blankToNull(input.addressLine1) || existing?.address_line1 || null,
    address_line2: blankToNull(input.addressLine2) || existing?.address_line2 || null,
    city: blankToNull(input.city) || existing?.city || null,
    region: blankToNull(input.region) || existing?.region || null,
    postal_code: blankToNull(input.postalCode) || existing?.postal_code || null,
    country: blankToNull(input.country) || existing?.country || null,
    status: NON_CUSTOMER_STATUS,
    source: input.source,
    lead_id: blankToNull(input.leadId) || existing?.lead_id || null,
    cadence: mergeJson(
      (existing?.cadence as Record<string, unknown> | null) || {},
      input.cadence,
    ),
    properties: mergeJson(
      (existing?.properties as Record<string, unknown> | null) || {},
      input.properties,
    ),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("non_customers")
    .upsert(row, { onConflict: "email" })
    .select("id")
    .single();
  if (error || !data?.id) {
    return { ok: false, error: error?.message || "upsert_failed" };
  }
  return { ok: true, kind: "non_customer", id: data.id };
}

/**
 * Store a person capture in Supabase.
 * - Existing customer_profiles email → attach there (they are a customer).
 * - Otherwise → non_customers with status not_an_actual_customer.
 */
export async function storePersonCapture(input: PersonCapture): Promise<StorePersonResult> {
  if (!isAccountEnabled()) {
    return { ok: false, skipped: true, error: "account_disabled" };
  }
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) {
    return { ok: false, error: "invalid_email" };
  }
  const email = parsed.data;

  const customerId = await findCustomerProfileId(email);
  if (customerId) {
    return attachToCustomer(customerId, { ...input, email });
  }
  return upsertNonCustomer({ ...input, email }, email);
}

/** Filter Clock cadence save — always persist; never create a CRM contact. */
export async function storeFilterClockCapture(input: {
  email: string;
  leadId: string;
  cadence?: Record<string, unknown>;
  message?: string;
}): Promise<StorePersonResult> {
  return storePersonCapture({
    email: input.email,
    source: "filter_clock",
    leadId: input.leadId,
    cadence: input.cadence,
    properties: input.message ? { last_message: input.message.slice(0, 500) } : undefined,
  });
}

/**
 * When a capture has full name + address + email + phone, write it to Supabase.
 * Guests land in non_customers; account holders update customer_profiles.
 */
export async function storeIdentityBundle(input: PersonCapture): Promise<StorePersonResult> {
  if (
    !hasIdentityBundle({
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      addressLine1: input.addressLine1,
    })
  ) {
    return { ok: false, skipped: true, error: "incomplete_identity_bundle" };
  }
  return storePersonCapture(input);
}
