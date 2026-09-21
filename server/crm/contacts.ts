import { getDb } from "../db";
import { recordAudit } from "./audit";
import {
  crmFailure,
  type ContactInput,
  type CrmActor,
  type CrmContactRow,
  type CrmResult,
} from "./schema";

const COLUMNS =
  "id, email, first_name, last_name, phone, company_id, klaviyo_profile_id, stripe_customer_id, properties, created_at, updated_at";

export async function findContactByEmail(
  email: string,
): Promise<CrmResult<CrmContactRow | null>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  const { data, error } = await db
    .from("crm_contacts")
    .select(COLUMNS)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) return crmFailure(error.message, "query_failed");
  return { ok: true, data: (data as CrmContactRow | null) ?? null };
}

/**
 * Upsert on email.
 *
 * Only fills blanks — a later form submission that omits a phone number must
 * not erase the one already on file. The caller sends what it knows, not the
 * whole record.
 */
export async function upsertContact(
  input: ContactInput,
  actor: CrmActor,
): Promise<CrmResult<CrmContactRow>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");

  const email = input.email.trim().toLowerCase();
  const existing = await findContactByEmail(email);
  if (!existing.ok) return existing;

  const patch: Record<string, unknown> = {};
  const assignIfNew = (column: string, value: unknown, current: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (current !== null && current !== undefined && current !== "") return;
    patch[column] = value;
  };

  if (existing.data) {
    const row = existing.data;
    assignIfNew("first_name", input.firstName, row.first_name);
    assignIfNew("last_name", input.lastName, row.last_name);
    assignIfNew("phone", input.phone, row.phone);
    assignIfNew("company_id", input.companyId, row.company_id);
    // Identity links are the exception: a newer id from Klaviyo or Stripe is
    // more correct than a stale one.
    if (input.klaviyoProfileId) patch.klaviyo_profile_id = input.klaviyoProfileId;
    if (input.stripeCustomerId) patch.stripe_customer_id = input.stripeCustomerId;
    if (input.properties && Object.keys(input.properties).length > 0) {
      patch.properties = { ...row.properties, ...input.properties };
    }

    if (Object.keys(patch).length === 0) return { ok: true, data: row };

    const { data, error } = await db
      .from("crm_contacts")
      .update(patch)
      .eq("id", row.id)
      .select(COLUMNS)
      .single();
    if (error) return crmFailure(error.message, "update_failed");
    await recordAudit({
      actor,
      action: "contact.update",
      entity: "contact",
      entityId: row.id,
      before: row,
      after: data,
    });
    return { ok: true, data: data as CrmContactRow };
  }

  const { data, error } = await db
    .from("crm_contacts")
    .insert({
      email,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      phone: input.phone ?? null,
      company_id: input.companyId ?? null,
      klaviyo_profile_id: input.klaviyoProfileId ?? null,
      stripe_customer_id: input.stripeCustomerId ?? null,
      properties: input.properties ?? {},
    })
    .select(COLUMNS)
    .single();

  if (error) {
    // Two submissions in the same instant can both miss the lookup and race to
    // insert. The unique index settles it; re-read instead of failing.
    if (error.code === "23505") {
      const retry = await findContactByEmail(email);
      if (retry.ok && retry.data) return { ok: true, data: retry.data };
    }
    return crmFailure(error.message, "insert_failed");
  }

  await recordAudit({
    actor,
    action: "contact.create",
    entity: "contact",
    entityId: (data as CrmContactRow).id,
    after: data,
  });
  return { ok: true, data: data as CrmContactRow };
}

export async function getContact(id: string): Promise<CrmResult<CrmContactRow | null>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  const { data, error } = await db
    .from("crm_contacts")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) return crmFailure(error.message, "query_failed");
  return { ok: true, data: (data as CrmContactRow | null) ?? null };
}
