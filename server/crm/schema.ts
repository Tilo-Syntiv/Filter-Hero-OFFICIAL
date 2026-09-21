import { z } from "zod";

/**
 * CRM types and validation.
 *
 * Fixed typed columns, not HubSpot's runtime property definitions. Anything
 * that does not deserve a column goes in `properties`, and nothing reads it
 * except the deal detail view.
 */

export const PIPELINE_ID = "quotes";

export const STAGE_IDS = [
  "new",
  "needs_info",
  "priced",
  "waiting",
  "won",
  "lost",
] as const;

export type StageId = (typeof STAGE_IDS)[number];

export const CLOSED_WON_STAGE: StageId = "won";
export const CLOSED_LOST_STAGE: StageId = "lost";

export function isClosedStage(stage: string): boolean {
  return stage === CLOSED_WON_STAGE || stage === CLOSED_LOST_STAGE;
}

export const DEAL_SOURCES = [
  "quote_form",
  "custom_quote",
  "cart_quote",
  "manual",
] as const;

export type DealSource = (typeof DEAL_SOURCES)[number];

export const ACTIVITY_TYPES = ["note", "task", "stage_change", "system"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Where a contact-form intent lands in the pipeline. `reminder` is absent on
 *  purpose: a Filter Clock cadence save is not a sales opportunity, and giving
 *  it a deal would re-open FH-131 from the pipeline side. */
export const INTENT_TO_STAGE: Record<string, StageId | null> = {
  quote: "new",
  support: null,
  reminder: null,
};

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(200)
  .transform((value) => value.toLowerCase());

export const contactInputSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  companyId: z.string().uuid().optional(),
  klaviyoProfileId: z.string().trim().max(80).optional(),
  stripeCustomerId: z.string().trim().max(80).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export const dealInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  stageId: z.enum(STAGE_IDS).default("new"),
  source: z.enum(DEAL_SOURCES).default("manual"),
  amount: z.number().min(0).max(10_000_000).optional(),
  nextActionAt: z.string().datetime().optional(),
  leadId: z.string().trim().max(60).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export type DealInput = z.infer<typeof dealInputSchema>;

export const dealUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    stageId: z.enum(STAGE_IDS).optional(),
    amount: z.number().min(0).max(10_000_000).nullable().optional(),
    nextActionAt: z.string().datetime().nullable().optional(),
    ownerId: z.string().uuid().nullable().optional(),
    lostReason: z.string().trim().max(400).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type DealUpdate = z.infer<typeof dealUpdateSchema>;

export const activityInputSchema = z.object({
  type: z.enum(ACTIVITY_TYPES).default("note"),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().max(8000).optional(),
  dueAt: z.string().datetime().optional(),
});

export type ActivityInput = z.infer<typeof activityInputSchema>;

export const dealListQuerySchema = z.object({
  stageId: z.enum(STAGE_IDS).optional(),
  open: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
});

/** Every CRM call answers with this shape. Callers in the intake path run
 *  inside a try/catch that must never fail a shopper's submission, so the
 *  modules return errors rather than throwing them. */
export type CrmResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function crmFailure(error: string, code?: string): { ok: false; error: string; code?: string } {
  return { ok: false, error, code };
}

// --- Row shapes -------------------------------------------------------------

export type CrmContactRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_id: string | null;
  klaviyo_profile_id: string | null;
  stripe_customer_id: string | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CrmDealRow = {
  id: string;
  name: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string | null;
  company_id: string | null;
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

export type CrmActivityRow = {
  id: string;
  type: string;
  deal_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  subject: string | null;
  body: string | null;
  status: string | null;
  due_at: string | null;
  occurred_at: string;
  created_at: string;
};

export type CrmStageRow = {
  id: string;
  pipeline_id: string;
  label: string;
  display_order: number;
  closed_won: boolean;
  closed_lost: boolean;
};

/** The staff member behind a mutation, or the system for intake writes. */
export type CrmActor = { id?: string | null; email: string };

export const SYSTEM_ACTOR: CrmActor = { id: null, email: "system@filterhero" };
