import { getDb } from "../db";
import type { CrmActor } from "./schema";

/**
 * Every CRM mutation lands here with the actor that caused it.
 *
 * Writes are best-effort: a failed audit insert logs and returns rather than
 * throwing, because losing the record of a change is better than losing the
 * change. The failure is loud in the server log either way.
 */
export async function recordAudit(input: {
  actor: CrmActor;
  action: string;
  entity: "contact" | "company" | "deal" | "activity";
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  const db = getDb();
  if (!db) return;
  const { error } = await db.from("crm_audit_log").insert({
    actor_id: input.actor.id ?? null,
    actor_email: input.actor.email,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
  });
  if (error) console.error("[crm] audit write failed", input.action, error.message);
}
