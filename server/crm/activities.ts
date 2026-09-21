import { getDb } from "../db";
import { recordAudit } from "./audit";
import {
  crmFailure,
  type ActivityInput,
  type CrmActivityRow,
  type CrmActor,
  type CrmResult,
} from "./schema";

const COLUMNS =
  "id, type, deal_id, contact_id, owner_id, subject, body, status, due_at, occurred_at, created_at";

export async function logActivity(
  input: ActivityInput,
  actor: CrmActor,
): Promise<CrmResult<CrmActivityRow>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");

  const { data, error } = await db
    .from("crm_activities")
    .insert({
      type: input.type,
      deal_id: input.dealId ?? null,
      contact_id: input.contactId ?? null,
      owner_id: actor.id ?? null,
      subject: input.subject ?? null,
      body: input.body ?? null,
      // Only tasks carry a status; notes and system entries leave it null so
      // the open-task index stays small.
      status: input.type === "task" ? "NOT_STARTED" : null,
      due_at: input.dueAt ?? null,
    })
    .select(COLUMNS)
    .single();
  if (error) return crmFailure(error.message, "insert_failed");

  const activity = data as CrmActivityRow;
  await recordAudit({
    actor,
    action: `activity.${input.type}`,
    entity: "activity",
    entityId: activity.id,
    after: activity,
  });
  return { ok: true, data: activity };
}

export async function listActivitiesForDeal(
  dealId: string,
  limit = 100,
): Promise<CrmResult<CrmActivityRow[]>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  const { data, error } = await db
    .from("crm_activities")
    .select(COLUMNS)
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) return crmFailure(error.message, "query_failed");
  return { ok: true, data: (data ?? []) as CrmActivityRow[] };
}

export async function completeTask(
  id: string,
  actor: CrmActor,
): Promise<CrmResult<CrmActivityRow>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  const { data, error } = await db
    .from("crm_activities")
    .update({ status: "COMPLETED" })
    .eq("id", id)
    .eq("type", "task")
    .select(COLUMNS)
    .single();
  if (error) return crmFailure(error.message, "update_failed");
  const activity = data as CrmActivityRow;
  await recordAudit({
    actor,
    action: "activity.complete",
    entity: "activity",
    entityId: id,
    after: activity,
  });
  return { ok: true, data: activity };
}
