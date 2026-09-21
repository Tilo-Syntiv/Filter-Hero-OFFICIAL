import { getDb } from "../db";
import { recordAudit } from "./audit";
import { logActivity } from "./activities";
import {
  CLOSED_LOST_STAGE,
  CLOSED_WON_STAGE,
  PIPELINE_ID,
  crmFailure,
  isClosedStage,
  type CrmActor,
  type CrmDealRow,
  type CrmResult,
  type CrmStageRow,
  type DealInput,
  type DealUpdate,
  type StageId,
} from "./schema";

const COLUMNS =
  "id, name, pipeline_id, stage_id, contact_id, company_id, owner_id, amount, next_action_at, closed_at, lost_reason, source, lead_id, properties, created_at, updated_at";

export async function listStages(): Promise<CrmResult<CrmStageRow[]>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  const { data, error } = await db
    .from("crm_stages")
    .select("id, pipeline_id, label, display_order, closed_won, closed_lost")
    .eq("pipeline_id", PIPELINE_ID)
    .order("display_order", { ascending: true });
  if (error) return crmFailure(error.message, "query_failed");
  return { ok: true, data: (data ?? []) as CrmStageRow[] };
}

export async function findDealByLeadId(
  leadId: string,
): Promise<CrmResult<CrmDealRow | null>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  const { data, error } = await db
    .from("crm_deals")
    .select(COLUMNS)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) return crmFailure(error.message, "query_failed");
  return { ok: true, data: (data as CrmDealRow | null) ?? null };
}

/**
 * Create a deal, or return the existing one when `leadId` has already been
 * seen. Intake is retried by the browser and by Stripe, so this has to be safe
 * to call twice with the same lead.
 *
 * `created` tells the caller whether this call was the one that inserted, so
 * intake can log the arrival note exactly once.
 */
export async function createDeal(
  input: DealInput,
  actor: CrmActor,
): Promise<CrmResult<{ deal: CrmDealRow; created: boolean }>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");

  if (input.leadId) {
    const existing = await findDealByLeadId(input.leadId);
    if (existing.ok && existing.data) {
      return { ok: true, data: { deal: existing.data, created: false } };
    }
  }

  const { data, error } = await db
    .from("crm_deals")
    .insert({
      name: input.name,
      pipeline_id: PIPELINE_ID,
      stage_id: input.stageId,
      contact_id: input.contactId ?? null,
      company_id: input.companyId ?? null,
      amount: input.amount ?? null,
      next_action_at: input.nextActionAt ?? null,
      source: input.source,
      lead_id: input.leadId ?? null,
      properties: input.properties ?? {},
    })
    .select(COLUMNS)
    .single();

  if (error) {
    // Concurrent submits can both miss the lookup above; the partial unique
    // index on lead_id decides, and the loser re-reads.
    if (error.code === "23505" && input.leadId) {
      const retry = await findDealByLeadId(input.leadId);
      if (retry.ok && retry.data) {
        return { ok: true, data: { deal: retry.data, created: false } };
      }
    }
    return crmFailure(error.message, "insert_failed");
  }

  const deal = data as CrmDealRow;
  await recordAudit({
    actor,
    action: "deal.create",
    entity: "deal",
    entityId: deal.id,
    after: deal,
  });
  return { ok: true, data: { deal, created: true } };
}

export async function getDeal(id: string): Promise<CrmResult<CrmDealRow | null>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  const { data, error } = await db
    .from("crm_deals")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) return crmFailure(error.message, "query_failed");
  return { ok: true, data: (data as CrmDealRow | null) ?? null };
}

export async function listDeals(opts: {
  stageId?: StageId;
  open?: boolean;
  limit?: number;
}): Promise<CrmResult<CrmDealRow[]>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");
  let query = db.from("crm_deals").select(COLUMNS).eq("pipeline_id", PIPELINE_ID);
  if (opts.stageId) query = query.eq("stage_id", opts.stageId);
  if (opts.open) query = query.is("closed_at", null);
  const { data, error } = await query
    // Nulls last so deals with no next action sink to the bottom of the column
    // instead of masquerading as the most urgent.
    .order("next_action_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (error) return crmFailure(error.message, "query_failed");
  return { ok: true, data: (data ?? []) as CrmDealRow[] };
}

/**
 * Update a deal and keep `closed_at` consistent with the stage.
 *
 * Moving into won/lost stamps the close time; moving back out clears it, along
 * with any lost reason. Otherwise a reopened deal keeps reporting as closed.
 */
export async function updateDeal(
  id: string,
  patch: DealUpdate,
  actor: CrmActor,
): Promise<CrmResult<CrmDealRow>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");

  const before = await getDeal(id);
  if (!before.ok) return before;
  if (!before.data) return crmFailure("Deal not found", "not_found");

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.nextActionAt !== undefined) row.next_action_at = patch.nextActionAt;
  if (patch.ownerId !== undefined) row.owner_id = patch.ownerId;
  if (patch.lostReason !== undefined) row.lost_reason = patch.lostReason;

  const previousStage = before.data.stage_id;
  if (patch.stageId !== undefined && patch.stageId !== previousStage) {
    row.stage_id = patch.stageId;
    if (isClosedStage(patch.stageId)) {
      row.closed_at = new Date().toISOString();
      if (patch.stageId === CLOSED_WON_STAGE) row.lost_reason = null;
      // A closed deal needs no next action; leaving one makes it show as
      // overdue forever on the board.
      row.next_action_at = null;
    } else {
      row.closed_at = null;
      row.lost_reason = null;
    }
  }

  const { data, error } = await db
    .from("crm_deals")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) return crmFailure(error.message, "update_failed");

  const deal = data as CrmDealRow;
  await recordAudit({
    actor,
    action: "deal.update",
    entity: "deal",
    entityId: id,
    before: before.data,
    after: deal,
  });

  if (row.stage_id) {
    await logActivity(
      {
        type: "stage_change",
        dealId: id,
        subject: `Stage ${previousStage} → ${deal.stage_id}`,
        body: patch.lostReason ?? undefined,
      },
      actor,
    );
  }

  return { ok: true, data: deal };
}

/**
 * Close every open deal for a contact as won. Called from the Stripe webhook,
 * where the shopper paying is the only close signal that matters.
 */
export async function closeOpenDealsForContact(
  contactId: string,
  actor: CrmActor,
  opts: { amount?: number } = {},
): Promise<CrmResult<number>> {
  const db = getDb();
  if (!db) return crmFailure("CRM is disabled", "crm_disabled");

  const { data, error } = await db
    .from("crm_deals")
    .select(COLUMNS)
    .eq("contact_id", contactId)
    .is("closed_at", null);
  if (error) return crmFailure(error.message, "query_failed");

  const open = ((data ?? []) as CrmDealRow[]).filter(
    (deal) => deal.stage_id !== CLOSED_LOST_STAGE,
  );
  let closed = 0;
  for (const deal of open) {
    const result = await updateDeal(
      deal.id,
      {
        stageId: CLOSED_WON_STAGE,
        // Only set the amount when the deal has none. An overwrite would
        // replace a quoted total with whatever a single order happened to be.
        ...(opts.amount !== undefined && deal.amount === null
          ? { amount: opts.amount }
          : {}),
      },
      actor,
    );
    if (result.ok) closed += 1;
  }
  return { ok: true, data: closed };
}
